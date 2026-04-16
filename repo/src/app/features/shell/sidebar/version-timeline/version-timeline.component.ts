import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VersionService } from '../../../../core/services/version.service';
import { CanvasStoreService } from '../../../../core/services/canvas-store.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Version } from '../../../../core/models/version.model';

@Component({
  selector: 'app-version-timeline',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './version-timeline.component.html',
  styleUrl: './version-timeline.component.scss',
})
export class VersionTimelineComponent {
  /** The version ID the user is about to rollback to — requires confirmation. */
  readonly confirmingRollback = signal<string | null>(null);
  readonly restoring = signal(false);

  constructor(
    protected versionSvc: VersionService,
    protected store: CanvasStoreService,
    private auth: AuthService,
  ) {}

  formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  typeLabel(v: Version): string {
    switch (v.type) {
      case 'autosave': return 'Auto';
      case 'manual': return 'Manual';
      case 'published': return 'Published';
    }
  }

  requestRollback(versionId: string): void {
    this.confirmingRollback.set(versionId);
  }

  cancelRollback(): void {
    this.confirmingRollback.set(null);
  }

  async confirmRollbackAction(): Promise<void> {
    const versionId = this.confirmingRollback();
    if (!versionId) return;

    this.restoring.set(true);
    try {
      const snapshot = await this.versionSvc.getSnapshotForRestore(versionId);
      if (!snapshot) return;

      // Restore the snapshot into the live canvas
      await this.store.restoreFromSnapshot(snapshot);

      // Create a manual version capturing the restored state so history isn't lost
      const canvas = this.store.currentCanvas();
      const profile = this.auth.profile();
      if (canvas && profile) {
        await this.versionSvc.createSnapshot(
          canvas,
          this.store.nodes(),
          this.store.edges(),
          'manual',
          profile.id,
        );
      }
    } finally {
      this.restoring.set(false);
      this.confirmingRollback.set(null);
    }
  }

  async createManualSnapshot(): Promise<void> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return;

    await this.versionSvc.createSnapshot(
      canvas,
      this.store.nodes(),
      this.store.edges(),
      'manual',
      profile.id,
    );
  }
}
