import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CanvasNode } from '../../../../core/models/node.model';
import { ALL_PORTS, getPortPosition, PortId } from '../../../../core/utils/edge-utils';

export interface PortDragEvent {
  port: PortId;
  event: MouseEvent;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: '[appCanvasNode]',
  standalone: true,
  templateUrl: './canvas-node.component.html',
  styleUrl: './canvas-node.component.scss',
})
export class CanvasNodeComponent {
  @Input({ required: true }) node!: CanvasNode;
  @Input() selected = false;
  @Input() showPorts = false;

  @Output() nodeMouseDown = new EventEmitter<MouseEvent>();
  @Output() portDragStart = new EventEmitter<PortDragEvent>();

  get displayLabel(): string {
    const label = this.node.label || this.node.type;
    const maxChars = Math.floor(this.node.size.width / 7);
    if (label.length > maxChars) {
      return label.substring(0, maxChars - 1) + '\u2026';
    }
    return label;
  }

  get textX(): number {
    return this.node.position.x + this.node.size.width / 2;
  }

  get textY(): number {
    return this.node.position.y + this.node.size.height / 2;
  }

  get ports(): { id: PortId; x: number; y: number }[] {
    return ALL_PORTS.map(p => {
      const pos = getPortPosition(this.node, p);
      return { id: p, x: pos.x, y: pos.y };
    });
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    if (event.button === 0) {
      event.stopPropagation();
      this.nodeMouseDown.emit(event);
    }
  }

  onPortMouseDown(event: MouseEvent, port: PortId): void {
    event.stopPropagation();
    event.preventDefault();
    this.portDragStart.emit({ port, event });
  }
}
