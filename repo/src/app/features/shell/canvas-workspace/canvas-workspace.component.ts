import {
  Component, ElementRef, ViewChild, NgZone,
  computed, signal, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { HistoryService } from '../../../core/services/history.service';
import { CanvasNode, NodeType, Position } from '../../../core/models/node.model';
import { Edge } from '../../../core/models/edge.model';
import { createDefaultSize } from '../../../core/utils/node-defaults';
import { PortId, closestPort, computePreviewPath, getPortPosition } from '../../../core/utils/edge-utils';
import { snapPosition, computeAlignmentGuides, AlignmentGuide } from '../../../core/utils/snap-utils';
import { ExportService } from '../../../core/services/export.service';
import { CanvasNodeComponent, PortDragEvent } from './canvas-node/canvas-node.component';
import { CanvasEdgeComponent } from './canvas-edge/canvas-edge.component';

interface DragState {
  nodeId: string;
  startMouseX: number;
  startMouseY: number;
  startNodeX: number;
  startNodeY: number;
}

interface ConnectState {
  sourceNodeId: string;
  sourcePort: PortId;
  cursorCanvas: Position;
}

interface ToolbarNodeType { type: NodeType; label: string; }

const GRID_SIZE = 8;
const CANVAS_EXTENT = 10000;

@Component({
  selector: 'app-canvas-workspace',
  standalone: true,
  imports: [CommonModule, CanvasNodeComponent, CanvasEdgeComponent],
  templateUrl: './canvas-workspace.component.html',
  styleUrl: './canvas-workspace.component.scss',
})
export class CanvasWorkspaceComponent {
  @ViewChild('svgEl', { static: false }) svgEl!: ElementRef<SVGSVGElement>;

  private dragState: DragState | null = null;
  private spaceHeld = false;
  private isPanningState = false;

  // Connector creation
  readonly connectState = signal<ConnectState | null>(null);
  readonly connectPreviewPath = computed(() => {
    const cs = this.connectState();
    if (!cs) return '';
    const srcNode = this.store.nodeById(cs.sourceNodeId);
    if (!srcNode) return '';
    return computePreviewPath(srcNode, cs.sourcePort, cs.cursorCanvas);
  });

  // Alignment guides during drag
  readonly activeGuides = signal<AlignmentGuide[]>([]);

  readonly toolbarNodes: ToolbarNodeType[] = [
    { type: 'start', label: 'Start' },
    { type: 'process', label: 'Process' },
    { type: 'decision', label: 'Decision' },
    { type: 'end', label: 'End' },
    { type: 'text', label: 'Text' },
  ];

  // Grid CSS values
  readonly gridSizePx = computed(() => GRID_SIZE * this.store.zoom());
  readonly gridOffsetX = computed(() => {
    const gs = this.gridSizePx();
    return ((this.store.panX() % gs) + gs) % gs;
  });
  readonly gridOffsetY = computed(() => {
    const gs = this.gridSizePx();
    return ((this.store.panY() % gs) + gs) % gs;
  });

  readonly viewTransform = computed(
    () => `translate(${this.store.panX()},${this.store.panY()}) scale(${this.store.zoom()})`,
  );

  readonly canvasExtent = CANVAS_EXTENT;

  constructor(
    protected store: CanvasStoreService,
    protected history: HistoryService,
    private exportSvc: ExportService,
    private ngZone: NgZone,
  ) {}

  exportJson(): void { this.exportSvc.exportJson(); }
  exportSvg(): void { this.exportSvc.exportSvg(); }
  exportPng(): void { this.exportSvc.exportPng(); }

  // ────────────────── Toolbar ──────────────────

  async addNode(type: NodeType): Promise<void> {
    const center = this.viewportCenter();
    const size = createDefaultSize(type);
    await this.store.addNode(type, {
      x: center.x - size.width / 2,
      y: center.y - size.height / 2,
    });
  }

  // ────────────────── Node drag (with snap + guides) ──────────────────

  onNodeMouseDown(event: MouseEvent, node: CanvasNode): void {
    if (node.locked) return;
    this.store.selectNode(node.id);

    const ds: DragState = {
      nodeId: node.id,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startNodeX: node.position.x,
      startNodeY: node.position.y,
    };
    this.dragState = ds;
    const zoom = this.store.zoom();

    const onMove = (e: MouseEvent) => {
      const rawX = ds.startNodeX + (e.clientX - ds.startMouseX) / zoom;
      const rawY = ds.startNodeY + (e.clientY - ds.startMouseY) / zoom;
      const snapped = snapPosition({ x: rawX, y: rawY });

      // Compute alignment guides
      const others = this.store.nodes().filter(n => n.id !== ds.nodeId);
      const guides = computeAlignmentGuides(snapped, node.size, others);

      this.ngZone.run(() => {
        this.store.updateNodeLocal(ds.nodeId, { position: snapped });
        this.activeGuides.set(guides);
      });
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.ngZone.run(() => {
        this.store.moveNodeFinish(ds.nodeId, { x: ds.startNodeX, y: ds.startNodeY });
        this.activeGuides.set([]);
        this.dragState = null;
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ────────────────── Connector creation ──────────────────

  onPortDragStart(event: PortDragEvent, node: CanvasNode): void {
    const cursor = this.screenToCanvas(event.event.clientX, event.event.clientY);
    this.connectState.set({
      sourceNodeId: node.id,
      sourcePort: event.port,
      cursorCanvas: cursor,
    });

    const onMove = (e: MouseEvent) => {
      const c = this.screenToCanvas(e.clientX, e.clientY);
      this.ngZone.run(() => {
        this.connectState.update(s => s ? { ...s, cursorCanvas: c } : null);
      });
    };

    const onUp = (e: MouseEvent) => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.ngZone.run(() => {
        this.finishConnect(e);
        this.connectState.set(null);
      });
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private finishConnect(event: MouseEvent): void {
    const cs = this.connectState();
    if (!cs) return;

    const cursor = this.screenToCanvas(event.clientX, event.clientY);
    // Find the node under the cursor
    const targetNode = this.store.nodes().find(n => {
      if (n.id === cs.sourceNodeId) return false;
      return cursor.x >= n.position.x && cursor.x <= n.position.x + n.size.width
          && cursor.y >= n.position.y && cursor.y <= n.position.y + n.size.height;
    });

    if (targetNode) {
      const targetPort = closestPort(targetNode, cursor);
      this.store.addEdge(cs.sourceNodeId, cs.sourcePort, targetNode.id, targetPort);
    }
  }

  // ────────────────── Edge selection ──────────────────

  onEdgeMouseDown(event: MouseEvent, edge: Edge): void {
    this.store.selectEdge(edge.id);
  }

  // ────────────────── Canvas pan ──────────────────

  onCanvasMouseDown(event: MouseEvent): void {
    if (event.button === 0 && !this.spaceHeld) {
      this.store.clearSelection();
      return;
    }
    if (event.button === 1 || (event.button === 0 && this.spaceHeld)) {
      event.preventDefault();
      this.startPan(event);
    }
  }

  private startPan(event: MouseEvent): void {
    this.isPanningState = true;
    let lastX = event.clientX;
    let lastY = event.clientY;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.ngZone.run(() => this.store.adjustPan(dx, dy));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.isPanningState = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // ────────────────── Zoom ──────────────────

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const rect = this.svgEl.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    this.store.zoomToward(mouseX, mouseY, event.deltaY > 0 ? 0.92 : 1.08);
  }

  // ────────────────── Keyboard ──────────────────

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !this.spaceHeld) {
      this.spaceHeld = true;
    }

    const tag = (event.target as HTMLElement)?.tagName;
    const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Delete selected element
    if ((event.code === 'Delete' || event.code === 'Backspace') && !inInput) {
      if (this.store.selectedNodeId()) {
        event.preventDefault();
        this.store.removeNode(this.store.selectedNodeId()!);
      } else if (this.store.selectedEdgeId()) {
        event.preventDefault();
        this.store.removeEdge(this.store.selectedEdgeId()!);
      }
    }

    // Undo: Ctrl+Z
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ' && !event.shiftKey && !inInput) {
      event.preventDefault();
      this.store.undo();
    }

    // Redo: Ctrl+Shift+Z or Ctrl+Y
    if ((event.ctrlKey || event.metaKey) && !inInput) {
      if ((event.shiftKey && event.code === 'KeyZ') || event.code === 'KeyY') {
        event.preventDefault();
        this.store.redo();
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') this.spaceHeld = false;
  }

  // ────────────────── Helpers ──────────────────

  private viewportCenter(): Position {
    if (!this.svgEl) return { x: 300, y: 300 };
    const rect = this.svgEl.nativeElement.getBoundingClientRect();
    const zoom = this.store.zoom();
    return {
      x: (rect.width / 2 - this.store.panX()) / zoom,
      y: (rect.height / 2 - this.store.panY()) / zoom,
    };
  }

  screenToCanvas(sx: number, sy: number): Position {
    const rect = this.svgEl.nativeElement.getBoundingClientRect();
    return {
      x: (sx - rect.left - this.store.panX()) / this.store.zoom(),
      y: (sy - rect.top - this.store.panY()) / this.store.zoom(),
    };
  }

  get isPanning(): boolean {
    return this.spaceHeld || this.isPanningState;
  }

  get isConnecting(): boolean {
    return this.connectState() !== null;
  }
}
