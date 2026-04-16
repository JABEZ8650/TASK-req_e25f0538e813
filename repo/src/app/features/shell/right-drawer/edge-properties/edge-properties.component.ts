import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Edge, EdgeType } from '../../../../core/models/edge.model';
import { CanvasStoreService } from '../../../../core/services/canvas-store.service';

@Component({
  selector: 'app-edge-properties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edge-properties.component.html',
  styleUrl: './edge-properties.component.scss',
})
export class EdgePropertiesComponent implements OnChanges {
  @Input({ required: true }) edge!: Edge;

  label = '';
  edgeType: EdgeType = 'orthogonal';
  strokeColor = '#64748b';

  private beforeSnapshot: Edge | null = null;

  readonly edgeTypes: EdgeType[] = ['straight', 'curved', 'orthogonal'];

  constructor(private store: CanvasStoreService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['edge'] && this.edge) {
      this.label = this.edge.label;
      this.edgeType = this.edge.type;
      this.strokeColor = this.edge.style.strokeColor;
    }
  }

  onLabelFocus(): void {
    this.beforeSnapshot = { ...this.edge };
  }

  onLabelInput(): void {
    this.store.updateEdgeLocal(this.edge.id, { label: this.label });
  }

  onLabelBlur(): void {
    if (this.beforeSnapshot) {
      this.store.persistEdgeWithHistory(this.edge.id, this.beforeSnapshot);
      this.beforeSnapshot = null;
    } else {
      this.store.persistEdge(this.edge.id);
    }
  }

  onTypeChange(): void {
    const snap = { ...this.edge };
    this.store.updateEdge(this.edge.id, { type: this.edgeType });
    this.store.persistEdgeWithHistory(this.edge.id, snap);
  }

  onStrokeColorChange(): void {
    const snap = { ...this.edge };
    this.store.updateEdge(this.edge.id, {
      style: { ...this.edge.style, strokeColor: this.strokeColor },
    });
    this.store.persistEdgeWithHistory(this.edge.id, snap);
  }

  deleteEdge(): void {
    this.store.removeEdge(this.edge.id);
  }
}
