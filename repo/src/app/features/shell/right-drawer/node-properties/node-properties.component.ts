import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasNode, NODE_LIMITS } from '../../../../core/models/node.model';
import { CanvasStoreService } from '../../../../core/services/canvas-store.service';
import { NODE_TYPE_CONFIGS } from '../../../../core/utils/node-defaults';

@Component({
  selector: 'app-node-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './node-properties.component.html',
  styleUrl: './node-properties.component.scss',
})
export class NodePropertiesComponent implements OnChanges {
  @Input({ required: true }) node!: CanvasNode;

  label = '';
  notes = '';
  posX = 0;
  posY = 0;
  width = 0;
  height = 0;
  fillColor = '#1e293b';
  strokeColor = '#64748b';

  /** Snapshot captured on focus, used for history on blur. */
  private beforeSnapshot: CanvasNode | null = null;

  readonly maxLabel = NODE_LIMITS.MAX_LABEL_LENGTH;
  readonly maxNotes = NODE_LIMITS.MAX_NOTES_LENGTH;

  constructor(private store: CanvasStoreService) {}

  get typeLabel(): string {
    return NODE_TYPE_CONFIGS[this.node.type]?.label ?? this.node.type;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['node'] && this.node) {
      this.syncFromNode();
    }
  }

  private syncFromNode(): void {
    this.label = this.node.label;
    this.notes = this.node.notes;
    this.posX = Math.round(this.node.position.x);
    this.posY = Math.round(this.node.position.y);
    this.width = Math.round(this.node.size.width);
    this.height = Math.round(this.node.size.height);
    this.fillColor = this.node.style.fillColor;
    this.strokeColor = this.node.style.strokeColor;
  }

  /** Capture snapshot when user focuses a text field. */
  onTextFocus(): void {
    this.beforeSnapshot = { ...this.node };
  }

  onLabelInput(): void {
    this.store.updateNodeLocal(this.node.id, { label: this.label });
  }

  onNotesInput(): void {
    this.store.updateNodeLocal(this.node.id, { notes: this.notes });
  }

  /** Persist on blur with history recording. */
  onTextBlur(): void {
    if (this.beforeSnapshot) {
      this.store.persistNodeWithHistory(this.node.id, this.beforeSnapshot);
      this.beforeSnapshot = null;
    } else {
      this.store.persistNode(this.node.id);
    }
  }

  onPositionChange(): void {
    const snap = { ...this.node };
    this.store.updateNode(this.node.id, {
      position: { x: this.posX, y: this.posY },
    });
    this.store.persistNodeWithHistory(this.node.id, snap);
  }

  onSizeChange(): void {
    const w = Math.max(20, this.width);
    const h = Math.max(20, this.height);
    this.width = w;
    this.height = h;
    const snap = { ...this.node };
    this.store.updateNode(this.node.id, { size: { width: w, height: h } });
    this.store.persistNodeWithHistory(this.node.id, snap);
  }

  onFillColorChange(): void {
    const snap = { ...this.node };
    this.store.updateNode(this.node.id, {
      style: { ...this.node.style, fillColor: this.fillColor },
    });
    this.store.persistNodeWithHistory(this.node.id, snap);
  }

  onStrokeColorChange(): void {
    const snap = { ...this.node };
    this.store.updateNode(this.node.id, {
      style: { ...this.node.style, strokeColor: this.strokeColor },
    });
    this.store.persistNodeWithHistory(this.node.id, snap);
  }

  deleteNode(): void {
    this.store.removeNode(this.node.id);
  }
}
