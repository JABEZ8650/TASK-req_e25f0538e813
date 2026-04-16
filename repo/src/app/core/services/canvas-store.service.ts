import { Injectable, signal, computed } from '@angular/core';
import { Canvas, CanvasStatus, CANVAS_DEFAULTS, CANVAS_LIMITS, APPROVAL_DEFAULTS } from '../models/canvas.model';
import { CanvasNode, NodeType, Position } from '../models/node.model';
import { Edge, EdgeType } from '../models/edge.model';
import { Template } from '../models/template.model';
import { IndexedDbService } from './indexed-db.service';
import { HistoryService, StatePatch } from './history.service';
import { createNodeStyle, createDefaultSize } from '../utils/node-defaults';
import { snapPosition } from '../utils/snap-utils';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;

const DEFAULT_EDGE_STYLE = {
  strokeColor: '#64748b',
  strokeWidth: 1.5,
  strokeDash: '',
  opacity: 1,
};

@Injectable({ providedIn: 'root' })
export class CanvasStoreService {
  // ── Canvas list ──
  private readonly _canvasList = signal<Canvas[]>([]);
  readonly canvasList = this._canvasList.asReadonly();

  // ── Current canvas ──
  private readonly _currentCanvas = signal<Canvas | null>(null);
  readonly currentCanvas = this._currentCanvas.asReadonly();

  // ── Nodes & edges ──
  private readonly _nodes = signal<CanvasNode[]>([]);
  readonly nodes = this._nodes.asReadonly();

  private readonly _edges = signal<Edge[]>([]);
  readonly edges = this._edges.asReadonly();

  // ── Selection (node or edge, mutually exclusive) ──
  private readonly _selectedNodeId = signal<string | null>(null);
  readonly selectedNodeId = this._selectedNodeId.asReadonly();
  readonly selectedNode = computed(() => {
    const id = this._selectedNodeId();
    return id ? this._nodes().find(n => n.id === id) ?? null : null;
  });

  private readonly _selectedEdgeId = signal<string | null>(null);
  readonly selectedEdgeId = this._selectedEdgeId.asReadonly();
  readonly selectedEdge = computed(() => {
    const id = this._selectedEdgeId();
    return id ? this._edges().find(e => e.id === id) ?? null : null;
  });

  // ── Dirty tracking (for autosave) ──
  private readonly _dirty = signal(false);
  readonly isDirty = this._dirty.asReadonly();

  // ── Viewport ──
  private readonly _zoom = signal(1);
  readonly zoom = this._zoom.asReadonly();
  private readonly _panX = signal(0);
  readonly panX = this._panX.asReadonly();
  private readonly _panY = signal(0);
  readonly panY = this._panY.asReadonly();
  readonly zoomPercent = computed(() => Math.round(this._zoom() * 100));

  constructor(
    private db: IndexedDbService,
    private history: HistoryService,
  ) {}

  // ────────────────── Canvas list ──────────────────

  async loadCanvasList(profileId: string): Promise<void> {
    const all = await this.db.getAllByIndex<Canvas>('canvases', 'profileId', profileId);
    this._canvasList.set(all.sort((a, b) => b.updatedAt - a.updatedAt));
  }

  async createCanvas(name: string, profileId: string): Promise<Canvas> {
    const canvas: Canvas = {
      id: crypto.randomUUID(),
      name,
      description: '',
      profileId,
      status: 'draft' as CanvasStatus,
      settings: { ...CANVAS_DEFAULTS },
      approval: { ...APPROVAL_DEFAULTS },
      publishedVersionId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.db.put('canvases', canvas);
    this._canvasList.update(list => [canvas, ...list]);
    await this.openCanvas(canvas.id);
    return canvas;
  }

  /** Create a canvas pre-populated from a template. */
  async createCanvasFromTemplate(template: Template, profileId: string): Promise<Canvas> {
    const canvas: Canvas = {
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      profileId,
      status: 'draft' as CanvasStatus,
      settings: { ...CANVAS_DEFAULTS },
      approval: { ...APPROVAL_DEFAULTS },
      publishedVersionId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await this.db.put('canvases', canvas);

    // Map relative IDs to real IDs
    const idMap = new Map<string, string>();
    const nodes: CanvasNode[] = template.nodes.map(tn => {
      const id = crypto.randomUUID();
      idMap.set(tn.relativeId, id);
      return {
        id,
        canvasId: canvas.id,
        type: tn.type as NodeType,
        position: { ...tn.relativePosition },
        size: { ...tn.size },
        label: tn.label,
        notes: '',
        style: createNodeStyle(tn.type as NodeType),
        templateId: template.id,
        importId: null,
        metadata: [],
        zIndex: 0,
        locked: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
    });
    nodes.forEach((n, i) => n.zIndex = i);

    const edges: Edge[] = template.edges.map(te => ({
      id: crypto.randomUUID(),
      canvasId: canvas.id,
      sourceNodeId: idMap.get(te.sourceRelativeId) ?? '',
      targetNodeId: idMap.get(te.targetRelativeId) ?? '',
      sourcePort: te.sourcePort,
      targetPort: te.targetPort,
      type: (te.type as EdgeType) || 'orthogonal',
      label: te.label,
      style: { ...DEFAULT_EDGE_STYLE },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));

    for (const n of nodes) await this.db.put('nodes', n);
    for (const e of edges) await this.db.put('edges', e);

    this._canvasList.update(list => [canvas, ...list]);
    await this.openCanvas(canvas.id);
    return canvas;
  }

  // ────────────────── Open / close canvas ──────────────────

  async openCanvas(canvasId: string): Promise<void> {
    const canvas = await this.db.get<Canvas>('canvases', canvasId);
    if (!canvas) return;

    const nodes = await this.db.getAllByIndex<CanvasNode>('nodes', 'canvasId', canvasId);
    const edges = await this.db.getAllByIndex<Edge>('edges', 'canvasId', canvasId);

    this._currentCanvas.set(canvas);
    this._nodes.set(nodes.sort((a, b) => a.zIndex - b.zIndex));
    this._edges.set(edges);
    this.clearSelection();
    this.history.clear();

    this._zoom.set(canvas.settings.zoomLevel / 100);
    this._panX.set(0);
    this._panY.set(0);
  }

  closeCanvas(): void {
    this._currentCanvas.set(null);
    this._nodes.set([]);
    this._edges.set([]);
    this.clearSelection();
    this.history.clear();
    this._zoom.set(1);
    this._panX.set(0);
    this._panY.set(0);
  }

  // ────────────────── Node CRUD ──────────────────

  async addNode(type: NodeType, position: Position): Promise<CanvasNode | null> {
    const canvas = this._currentCanvas();
    if (!canvas) return null;
    if (this._nodes().length >= CANVAS_LIMITS.MAX_NODES) return null;

    const snapped = snapPosition(position);
    const node: CanvasNode = {
      id: crypto.randomUUID(),
      canvasId: canvas.id,
      type,
      position: snapped,
      size: createDefaultSize(type),
      label: type.charAt(0).toUpperCase() + type.slice(1),
      notes: '',
      style: createNodeStyle(type),
      templateId: null,
      importId: null,
      metadata: [],
      zIndex: this._nodes().length,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.db.put('nodes', node);
    this._nodes.update(list => [...list, node]);
    this.selectNode(node.id);
    await this.touchCanvas();

    this.history.push('add-node', `Add ${type}`, [
      { store: 'nodes', id: node.id, before: null, after: { ...node } },
    ]);

    return node;
  }

  updateNodeLocal(nodeId: string, changes: Partial<CanvasNode>): void {
    this._nodes.update(list =>
      list.map(n => n.id === nodeId ? { ...n, ...changes, updatedAt: Date.now() } : n),
    );
  }

  async persistNode(nodeId: string): Promise<void> {
    const node = this._nodes().find(n => n.id === nodeId);
    if (node) {
      await this.db.put('nodes', node);
      await this.touchCanvas();
    }
  }

  async updateNode(nodeId: string, changes: Partial<CanvasNode>): Promise<void> {
    this.updateNodeLocal(nodeId, changes);
    await this.persistNode(nodeId);
  }

  /** Persist node and record a history entry for the property change. */
  async persistNodeWithHistory(nodeId: string, beforeSnapshot: CanvasNode): Promise<void> {
    const node = this._nodes().find(n => n.id === nodeId);
    if (!node) return;
    // Only record history if something actually changed
    if (JSON.stringify(beforeSnapshot) === JSON.stringify(node)) return;
    await this.db.put('nodes', node);
    await this.touchCanvas();
    this.history.push('edit-node', `Edit ${node.label}`, [
      { store: 'nodes', id: nodeId, before: { ...beforeSnapshot }, after: { ...node } },
    ]);
  }

  /** Move node and record history (call on drag end). */
  async moveNodeFinish(nodeId: string, beforePos: Position): Promise<void> {
    const node = this._nodes().find(n => n.id === nodeId);
    if (!node) return;
    await this.persistNode(nodeId);
    this.history.push('move-node', `Move ${node.label}`, [
      {
        store: 'nodes', id: nodeId,
        before: { ...node, position: beforePos },
        after: { ...node },
      },
    ]);
  }

  async removeNode(nodeId: string): Promise<void> {
    const node = this._nodes().find(n => n.id === nodeId);
    if (!node) return;

    const connectedEdges = this._edges().filter(
      e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId,
    );

    const patches: StatePatch[] = [
      { store: 'nodes', id: nodeId, before: { ...node }, after: null },
    ];
    for (const edge of connectedEdges) {
      patches.push({ store: 'edges', id: edge.id, before: { ...edge }, after: null });
      await this.db.delete('edges', edge.id);
    }

    await this.db.delete('nodes', nodeId);
    this._nodes.update(list => list.filter(n => n.id !== nodeId));
    this._edges.update(list =>
      list.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId),
    );
    if (this._selectedNodeId() === nodeId) this.clearSelection();
    await this.touchCanvas();

    this.history.push('delete-node', `Delete ${node.label}`, patches);
  }

  // ────────────────── Edge CRUD ──────────────────

  async addEdge(
    sourceNodeId: string, sourcePort: string,
    targetNodeId: string, targetPort: string,
    type: EdgeType = 'orthogonal',
  ): Promise<Edge | null> {
    const canvas = this._currentCanvas();
    if (!canvas) return null;
    if (this._edges().length >= CANVAS_LIMITS.MAX_CONNECTIONS) return null;
    if (sourceNodeId === targetNodeId) return null;

    // Prevent duplicate connections between same ports
    const exists = this._edges().some(
      e => e.sourceNodeId === sourceNodeId && e.targetNodeId === targetNodeId
        && e.sourcePort === sourcePort && e.targetPort === targetPort,
    );
    if (exists) return null;

    const edge: Edge = {
      id: crypto.randomUUID(),
      canvasId: canvas.id,
      sourceNodeId,
      targetNodeId,
      sourcePort,
      targetPort,
      type,
      label: '',
      style: { ...DEFAULT_EDGE_STYLE },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await this.db.put('edges', edge);
    this._edges.update(list => [...list, edge]);
    this.selectEdge(edge.id);
    await this.touchCanvas();

    this.history.push('add-edge', 'Add connector', [
      { store: 'edges', id: edge.id, before: null, after: { ...edge } },
    ]);

    return edge;
  }

  updateEdgeLocal(edgeId: string, changes: Partial<Edge>): void {
    this._edges.update(list =>
      list.map(e => e.id === edgeId ? { ...e, ...changes, updatedAt: Date.now() } : e),
    );
  }

  async persistEdge(edgeId: string): Promise<void> {
    const edge = this._edges().find(e => e.id === edgeId);
    if (edge) {
      await this.db.put('edges', edge);
      await this.touchCanvas();
    }
  }

  async updateEdge(edgeId: string, changes: Partial<Edge>): Promise<void> {
    this.updateEdgeLocal(edgeId, changes);
    await this.persistEdge(edgeId);
  }

  async persistEdgeWithHistory(edgeId: string, beforeSnapshot: Edge): Promise<void> {
    const edge = this._edges().find(e => e.id === edgeId);
    if (!edge) return;
    if (JSON.stringify(beforeSnapshot) === JSON.stringify(edge)) return;
    await this.db.put('edges', edge);
    await this.touchCanvas();
    this.history.push('edit-edge', 'Edit connector', [
      { store: 'edges', id: edgeId, before: { ...beforeSnapshot }, after: { ...edge } },
    ]);
  }

  async removeEdge(edgeId: string): Promise<void> {
    const edge = this._edges().find(e => e.id === edgeId);
    if (!edge) return;

    await this.db.delete('edges', edgeId);
    this._edges.update(list => list.filter(e => e.id !== edgeId));
    if (this._selectedEdgeId() === edgeId) this.clearSelection();
    await this.touchCanvas();

    this.history.push('delete-edge', 'Delete connector', [
      { store: 'edges', id: edgeId, before: { ...edge }, after: null },
    ]);
  }

  // ────────────────── Bulk import ──────────────────

  /** Add multiple nodes from an import commit. Returns the created nodes. */
  async addImportedNodes(nodes: CanvasNode[]): Promise<CanvasNode[]> {
    const canvas = this._currentCanvas();
    if (!canvas) return [];

    const currentCount = this._nodes().length;
    const available = CANVAS_LIMITS.MAX_NODES - currentCount;
    const toAdd = nodes.slice(0, available);

    for (let i = 0; i < toAdd.length; i++) {
      toAdd[i] = { ...toAdd[i], zIndex: currentCount + i };
      await this.db.put('nodes', toAdd[i]);
    }

    this._nodes.update(list => [...list, ...toAdd]);
    await this.touchCanvas();

    const patches: StatePatch[] = toAdd.map(n => ({
      store: 'nodes' as const, id: n.id, before: null, after: { ...n },
    }));
    this.history.push('import', `Import ${toAdd.length} nodes`, patches);

    return toAdd;
  }

  // ────────────────── Selection ──────────────────

  selectNode(id: string | null): void {
    this._selectedNodeId.set(id);
    this._selectedEdgeId.set(null);
  }

  selectEdge(id: string | null): void {
    this._selectedEdgeId.set(id);
    this._selectedNodeId.set(null);
  }

  clearSelection(): void {
    this._selectedNodeId.set(null);
    this._selectedEdgeId.set(null);
  }

  // ────────────────── Undo / Redo ──────────────────

  async undo(): Promise<void> {
    const patches = this.history.undo();
    if (!patches) return;
    await this.applyPatches(patches, 'before');
  }

  async redo(): Promise<void> {
    const patches = this.history.redo();
    if (!patches) return;
    await this.applyPatches(patches, 'after');
  }

  private async applyPatches(patches: StatePatch[], direction: 'before' | 'after'): Promise<void> {
    for (const patch of patches) {
      const value = direction === 'before' ? patch.before : patch.after;
      if (value === null) {
        // Delete the record
        await this.db.delete(patch.store, patch.id);
        if (patch.store === 'nodes') {
          this._nodes.update(list => list.filter(n => n.id !== patch.id));
          if (this._selectedNodeId() === patch.id) this.clearSelection();
        } else {
          this._edges.update(list => list.filter(e => e.id !== patch.id));
          if (this._selectedEdgeId() === patch.id) this.clearSelection();
        }
      } else {
        // Upsert the record
        await this.db.put(patch.store, value);
        if (patch.store === 'nodes') {
          const node = value as CanvasNode;
          this._nodes.update(list => {
            const idx = list.findIndex(n => n.id === patch.id);
            if (idx >= 0) { const c = [...list]; c[idx] = node; return c; }
            return [...list, node];
          });
        } else {
          const edge = value as Edge;
          this._edges.update(list => {
            const idx = list.findIndex(e => e.id === patch.id);
            if (idx >= 0) { const c = [...list]; c[idx] = edge; return c; }
            return [...list, edge];
          });
        }
      }
    }
    await this.touchCanvas();
  }

  // ────────────────── Viewport ──────────────────

  setZoom(zoom: number): void { this._zoom.set(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom))); }
  zoomBy(delta: number): void { this.setZoom(this._zoom() + delta); }
  zoomIn(): void { this.zoomBy(ZOOM_STEP); }
  zoomOut(): void { this.zoomBy(-ZOOM_STEP); }
  resetZoom(): void { this._zoom.set(1); this._panX.set(0); this._panY.set(0); }
  setPan(x: number, y: number): void { this._panX.set(x); this._panY.set(y); }
  adjustPan(dx: number, dy: number): void { this._panX.update(v => v + dx); this._panY.update(v => v + dy); }

  zoomToward(screenX: number, screenY: number, factor: number): void {
    const oldZoom = this._zoom();
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, oldZoom * factor));
    const scale = newZoom / oldZoom;
    this._panX.set(screenX - (screenX - this._panX()) * scale);
    this._panY.set(screenY - (screenY - this._panY()) * scale);
    this._zoom.set(newZoom);
  }

  // ────────────────── Dirty tracking ──────────────────

  markDirty(): void { this._dirty.set(true); }
  markClean(): void { this._dirty.set(false); }

  // ────────────────── Restore from snapshot ──────────────────

  /**
   * Replace the live canvas state with a version snapshot.
   * Deletes current nodes/edges from IDB and writes snapshot data.
   */
  async restoreFromSnapshot(
    snapshot: { nodes: Record<string, unknown>[]; edges: Record<string, unknown>[] },
  ): Promise<void> {
    const canvas = this._currentCanvas();
    if (!canvas) return;

    // Atomically replace nodes and edges in IDB
    const nodes = snapshot.nodes as unknown as CanvasNode[];
    const edges = snapshot.edges as unknown as Edge[];

    const ops: { store: string; type: 'put' | 'delete'; key?: string; record?: unknown }[] = [];
    for (const node of this._nodes()) ops.push({ store: 'nodes', type: 'delete', key: node.id });
    for (const edge of this._edges()) ops.push({ store: 'edges', type: 'delete', key: edge.id });
    for (const n of nodes) ops.push({ store: 'nodes', type: 'put', record: n });
    for (const e of edges) ops.push({ store: 'edges', type: 'put', record: e });
    await this.db.transact(['nodes', 'edges'], ops);

    // Update live state
    this._nodes.set(nodes.sort((a, b) => a.zIndex - b.zIndex));
    this._edges.set(edges);
    this.clearSelection();
    this.history.clear();
    this._dirty.set(true);
    await this.touchCanvas();
  }

  // ────────────────── Canvas field updates ──────────────────

  async updateCanvasFields(changes: Partial<Canvas>): Promise<void> {
    const canvas = this._currentCanvas();
    if (!canvas) return;
    const updated = { ...canvas, ...changes, updatedAt: Date.now() };
    this._currentCanvas.set(updated);
    await this.db.put('canvases', updated);
    this._canvasList.update(list =>
      list.map(c => c.id === updated.id ? updated : c),
    );
  }

  // ────────────────── Helpers ──────────────────

  /** Get a node by ID (for edge rendering lookups). */
  nodeById(id: string): CanvasNode | undefined {
    return this._nodes().find(n => n.id === id);
  }

  private async touchCanvas(): Promise<void> {
    const canvas = this._currentCanvas();
    if (canvas) {
      const updated = { ...canvas, updatedAt: Date.now() };
      this._currentCanvas.set(updated);
      await this.db.put('canvases', updated);
      this._canvasList.update(list =>
        list.map(c => c.id === updated.id ? updated : c),
      );
      this._dirty.set(true);
    }
  }
}
