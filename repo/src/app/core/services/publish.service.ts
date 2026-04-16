import { Injectable, signal } from '@angular/core';
import { CanvasStoreService } from './canvas-store.service';
import { VersionService } from './version.service';
import { AuthService } from './auth.service';
import { NotificationService } from './notification.service';
import { LocalStorageService } from './local-storage.service';
import { ReviewerConfirmation, Version } from '../models/version.model';
import { Canvas } from '../models/canvas.model';
import { evaluateChecklist, isPublishReady, ChecklistItem } from '../utils/publish-checklist';

export type PendingAction = 'publish' | 'rollback-to-draft';

export interface PendingApproval {
  action: PendingAction;
  requestedBy: string;
  requestedAt: number;
  canvasId: string;
}

export interface DenialRecord {
  canvasId: string;
  action: PendingAction;
  deniedBy: string;
  deniedByDisplayName: string;
  comment: string;
  deniedAt: number;
}

const PENDING_KEY = 'pending_approval';
const DENIAL_LOG_KEY = 'denial_log';

@Injectable({ providedIn: 'root' })
export class PublishService {
  private readonly _pendingApproval = signal<PendingApproval | null>(null);
  readonly pendingApproval = this._pendingApproval.asReadonly();

  constructor(
    private store: CanvasStoreService,
    private versionSvc: VersionService,
    private auth: AuthService,
    private notifSvc: NotificationService,
    private ls: LocalStorageService,
  ) {
    // Restore persisted pending state
    const saved = this.ls.get<PendingApproval>(PENDING_KEY);
    if (saved) this._pendingApproval.set(saved);
  }

  getChecklist(): ChecklistItem[] {
    const canvas = this.store.currentCanvas();
    if (!canvas) return [];
    return evaluateChecklist(canvas, this.store.nodes(), this.store.edges());
  }

  isReady(): boolean {
    return isPublishReady(this.getChecklist());
  }

  async publish(): Promise<Version | null> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return null;
    if (!this.isReady()) return null;

    if (canvas.approval.enabled) {
      const pending: PendingApproval = {
        action: 'publish',
        requestedBy: profile.id,
        requestedAt: Date.now(),
        canvasId: canvas.id,
      };
      this._pendingApproval.set(pending);
      this.ls.set(PENDING_KEY, pending);
      return null;
    }

    return this.doPublish(canvas, profile.id, null);
  }

  async approvePublish(comment: string = ''): Promise<Version | null> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    const pending = this._pendingApproval();
    if (!canvas || !profile || !pending || pending.action !== 'publish') return null;

    const confirmation: ReviewerConfirmation = {
      reviewerProfileId: profile.id,
      reviewerDisplayName: profile.displayName,
      action: 'approve-publish',
      confirmedAt: Date.now(),
      comment,
    };

    this.clearPendingState();
    return this.doPublish(canvas, pending.requestedBy, confirmation);
  }

  denyPending(comment: string = ''): void {
    const pending = this._pendingApproval();
    const profile = this.auth.profile();

    // Store the denial record for audit trail (M-004)
    if (pending && profile) {
      const denial: DenialRecord = {
        canvasId: pending.canvasId,
        action: pending.action,
        deniedBy: profile.id,
        deniedByDisplayName: profile.displayName,
        comment,
        deniedAt: Date.now(),
      };
      const log = this.ls.get<DenialRecord[]>(DENIAL_LOG_KEY) ?? [];
      log.push(denial);
      this.ls.set(DENIAL_LOG_KEY, log);
    }

    this.clearPendingState();
  }

  private async doPublish(
    canvas: Canvas, createdBy: string, confirmation: ReviewerConfirmation | null,
  ): Promise<Version | null> {
    const version = await this.versionSvc.createSnapshot(
      canvas, this.store.nodes(), this.store.edges(), 'published', createdBy,
    );
    if (!version && confirmation === null) return null;
    const pubVersion = version ?? await this.versionSvc.createSnapshot(
      canvas, this.store.nodes(), this.store.edges(), 'published', createdBy,
    );
    if (!pubVersion) return null;

    if (confirmation) {
      pubVersion.reviewerConfirmation = confirmation;
      await this.versionSvc.updateVersion(pubVersion);
    }

    await this.store.updateCanvasFields({
      status: 'published', publishedVersionId: pubVersion.id,
    });

    this.notifSvc.send(createdBy, 'publish', 'Canvas Published',
      'Canvas "{{canvasName}}" published as v{{versionId}}.',
      { canvasName: canvas.name, versionId: String(pubVersion.versionNumber) },
    );

    return pubVersion;
  }

  async unpublish(): Promise<void> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return;

    if (canvas.approval.enabled) {
      const pending: PendingApproval = {
        action: 'rollback-to-draft',
        requestedBy: profile.id,
        requestedAt: Date.now(),
        canvasId: canvas.id,
      };
      this._pendingApproval.set(pending);
      this.ls.set(PENDING_KEY, pending);
      return;
    }

    await this.doUnpublish();
  }

  async approveRollbackToDraft(comment: string = ''): Promise<void> {
    const pending = this._pendingApproval();
    if (!pending || pending.action !== 'rollback-to-draft') return;
    this.clearPendingState();
    await this.doUnpublish();
  }

  private async doUnpublish(): Promise<void> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    await this.store.updateCanvasFields({ status: 'draft' });
    if (canvas && profile) {
      this.notifSvc.send(profile.id, 'rollback', 'Canvas Unpublished',
        'Canvas "{{canvasName}}" reverted to draft.', { canvasName: canvas.name });
    }
  }

  async setApprovalEnabled(enabled: boolean): Promise<void> {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;
    await this.store.updateCanvasFields({ approval: { ...canvas.approval, enabled } });
  }

  async setReviewerProfile(profileId: string | null): Promise<void> {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;
    await this.store.updateCanvasFields({ approval: { ...canvas.approval, reviewerProfileId: profileId } });
  }

  cancelPending(): void { this.clearPendingState(); }

  private clearPendingState(): void {
    this._pendingApproval.set(null);
    this.ls.remove(PENDING_KEY);
  }
}
