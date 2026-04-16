import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiffService, DiffResult } from '../../../core/services/diff.service';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';

@Component({
  selector: 'app-diff-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './diff-viewer.component.html',
  styleUrl: './diff-viewer.component.scss',
})
export class DiffViewerComponent {
  constructor(
    protected diffSvc: DiffService,
    protected store: CanvasStoreService,
  ) {}

  compute(): void {
    this.diffSvc.computeDraftVsPublished();
  }

  get hasPublished(): boolean {
    return !!this.store.currentCanvas()?.publishedVersionId;
  }

  get hasDiff(): boolean {
    return this.diffSvc.diffResult() !== null;
  }

  get totalChanges(): number {
    const r = this.diffSvc.diffResult();
    if (!r) return 0;
    return r.addedNodes.length + r.removedNodes.length + r.modifiedNodes.length
      + r.addedEdges.length + r.removedEdges.length + r.modifiedEdges;
  }
}
