import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../../core/services/history.service';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';

@Component({
  selector: 'app-history-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history-panel.component.html',
  styleUrl: './history-panel.component.scss',
})
export class HistoryPanelComponent {
  constructor(
    protected history: HistoryService,
    private store: CanvasStoreService,
  ) {}

  undo(): void {
    this.store.undo();
  }

  redo(): void {
    this.store.redo();
  }

  formatTime(ts: number): string {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
}
