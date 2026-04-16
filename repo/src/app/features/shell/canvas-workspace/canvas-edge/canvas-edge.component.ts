import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { Edge } from '../../../../core/models/edge.model';
import { CanvasNode } from '../../../../core/models/node.model';
import { computeEdgePath } from '../../../../core/utils/edge-utils';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[appCanvasEdge]',
  standalone: true,
  templateUrl: './canvas-edge.component.html',
  styleUrl: './canvas-edge.component.scss',
})
export class CanvasEdgeComponent {
  @Input({ required: true }) edge!: Edge;
  @Input({ required: true }) sourceNode!: CanvasNode;
  @Input({ required: true }) targetNode!: CanvasNode;
  @Input() selected = false;

  @Output() edgeMouseDown = new EventEmitter<MouseEvent>();

  get pathD(): string {
    return computeEdgePath(
      this.sourceNode, this.edge.sourcePort,
      this.targetNode, this.edge.targetPort,
      this.edge.type,
    );
  }

  get midPoint(): { x: number; y: number } | null {
    if (!this.edge.label) return null;
    const sx = this.sourceNode.position.x + this.sourceNode.size.width / 2;
    const sy = this.sourceNode.position.y + this.sourceNode.size.height / 2;
    const tx = this.targetNode.position.x + this.targetNode.size.width / 2;
    const ty = this.targetNode.position.y + this.targetNode.size.height / 2;
    return { x: (sx + tx) / 2, y: (sy + ty) / 2 };
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      event.stopPropagation();
      this.edgeMouseDown.emit(event);
    }
  }
}
