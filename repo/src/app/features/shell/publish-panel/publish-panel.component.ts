import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CanvasStoreService } from '../../../core/services/canvas-store.service';
import { PublishService } from '../../../core/services/publish.service';
import { AuthService } from '../../../core/services/auth.service';
import { VersionService } from '../../../core/services/version.service';
import { ChecklistItem } from '../../../core/utils/publish-checklist';
import { Profile } from '../../../core/models/profile.model';
import { DiffViewerComponent } from '../diff-viewer/diff-viewer.component';

@Component({
  selector: 'app-publish-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DiffViewerComponent],
  templateUrl: './publish-panel.component.html',
  styleUrl: './publish-panel.component.scss',
})
export class PublishPanelComponent {
  readonly approvalEnabled = signal(false);
  readonly reviewerComment = signal('');
  readonly publishing = signal(false);
  readonly profiles = signal<Profile[]>([]);

  constructor(
    protected store: CanvasStoreService,
    protected publishSvc: PublishService,
    protected versionSvc: VersionService,
    private auth: AuthService,
  ) {
    this.loadProfiles();
  }

  get canvas() { return this.store.currentCanvas(); }
  get isPublished() { return this.canvas?.status === 'published'; }
  get approval() { return this.canvas?.approval; }

  get checklist(): ChecklistItem[] {
    return this.publishSvc.getChecklist();
  }

  get allPassed(): boolean {
    return this.publishSvc.isReady();
  }

  get latestPublished() {
    const versions = this.versionSvc.publishedVersions();
    return versions.length > 0 ? versions[0] : null;
  }

  get isReviewer(): boolean {
    const profile = this.auth.profile();
    const canvas = this.canvas;
    if (!profile || !canvas?.approval.enabled) return false;
    return canvas.approval.reviewerProfileId === profile.id;
  }

  private async loadProfiles(): Promise<void> {
    const all = await this.auth.getProfiles();
    this.profiles.set(all);
  }

  // ── Approval settings ──

  async toggleApproval(): Promise<void> {
    const canvas = this.canvas;
    if (!canvas) return;
    await this.publishSvc.setApprovalEnabled(!canvas.approval.enabled);
  }

  async onReviewerChange(profileId: string): Promise<void> {
    await this.publishSvc.setReviewerProfile(profileId || null);
  }

  // ── Publish ──

  async publish(): Promise<void> {
    this.publishing.set(true);
    try {
      await this.publishSvc.publish();
    } finally {
      this.publishing.set(false);
    }
  }

  async approvePublish(): Promise<void> {
    this.publishing.set(true);
    try {
      await this.publishSvc.approvePublish(this.reviewerComment());
      this.reviewerComment.set('');
    } finally {
      this.publishing.set(false);
    }
  }

  denyPending(): void {
    this.publishSvc.denyPending(this.reviewerComment());
    this.reviewerComment.set('');
  }

  cancelPending(): void {
    this.publishSvc.cancelPending();
  }

  // ── Unpublish ──

  async unpublish(): Promise<void> {
    await this.publishSvc.unpublish();
  }

  async approveRollbackToDraft(): Promise<void> {
    await this.publishSvc.approveRollbackToDraft(this.reviewerComment());
    this.reviewerComment.set('');
  }

  formatTime(ts: number): string {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
