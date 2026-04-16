import { Injectable, NgZone, signal, OnDestroy } from '@angular/core';
import { CanvasStoreService } from './canvas-store.service';
import { VersionService } from './version.service';
import { AuthService } from './auth.service';

interface TabMessage {
  type: 'canvas-editing' | 'canvas-saved' | 'heartbeat';
  tabId: string;
  canvasId: string;
  timestamp: number;
  profileId: string;
}

export interface ConflictInfo {
  otherTabId: string;
  canvasId: string;
  detectedAt: number;
}

const CHANNEL_NAME = 'diagram-studio-tabs';

@Injectable({ providedIn: 'root' })
export class MultiTabService implements OnDestroy {
  private channel: BroadcastChannel | null = null;
  private readonly tabId = crypto.randomUUID();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  private readonly _conflict = signal<ConflictInfo | null>(null);
  readonly conflict = this._conflict.asReadonly();

  private readonly _conflictResolved = signal(false);
  readonly conflictResolved = this._conflictResolved.asReadonly();

  constructor(
    private store: CanvasStoreService,
    private versionSvc: VersionService,
    private auth: AuthService,
    private ngZone: NgZone,
  ) {}

  /** Start listening for multi-tab messages. */
  start(): void {
    if (typeof BroadcastChannel === 'undefined') return; // SSR guard
    this.stop();

    this.channel = new BroadcastChannel(CHANNEL_NAME);
    this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
      this.ngZone.run(() => this.handleMessage(event.data));
    };

    // Send heartbeats every 5s
    this.ngZone.runOutsideAngular(() => {
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), 5000);
    });
  }

  stop(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /** Broadcast that this tab is editing a canvas. Called on mutations. */
  notifyEditing(): void {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile || !this.channel) return;

    this.channel.postMessage({
      type: 'canvas-editing',
      tabId: this.tabId,
      canvasId: canvas.id,
      timestamp: Date.now(),
      profileId: profile.id,
    } satisfies TabMessage);
  }

  /** Broadcast that this tab saved a version. */
  notifySaved(): void {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile || !this.channel) return;

    this.channel.postMessage({
      type: 'canvas-saved',
      tabId: this.tabId,
      canvasId: canvas.id,
      timestamp: Date.now(),
      profileId: profile.id,
    } satisfies TabMessage);
  }

  private sendHeartbeat(): void {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile || !this.channel) return;

    this.channel.postMessage({
      type: 'heartbeat',
      tabId: this.tabId,
      canvasId: canvas.id,
      timestamp: Date.now(),
      profileId: profile.id,
    } satisfies TabMessage);
  }

  private handleMessage(msg: TabMessage): void {
    // Ignore own messages
    if (msg.tabId === this.tabId) return;

    const currentCanvas = this.store.currentCanvas();
    if (!currentCanvas || msg.canvasId !== currentCanvas.id) return;

    if (msg.type === 'canvas-editing' || msg.type === 'canvas-saved') {
      this._conflict.set({
        otherTabId: msg.tabId,
        canvasId: msg.canvasId,
        detectedAt: Date.now(),
      });
      this._conflictResolved.set(false);
    }
  }

  // ────────────────── Conflict resolution ──────────────────

  /** User chooses to reload from the latest saved version (other tab's work wins). */
  async useLatestVersion(): Promise<void> {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;

    // Reload versions and pick the latest
    await this.versionSvc.loadVersions(canvas.id);
    const latest = this.versionSvc.versions()[0]; // sorted by recency
    if (latest) {
      const snapshot = await this.versionSvc.getSnapshotForRestore(latest.id);
      if (snapshot) {
        await this.store.restoreFromSnapshot(snapshot);
      }
    }

    this._conflict.set(null);
    this._conflictResolved.set(true);
  }

  /** User chooses to keep current work and save it as a new version. */
  async preserveCurrentWork(): Promise<void> {
    const canvas = this.store.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return;

    await this.versionSvc.createSnapshot(
      canvas, this.store.nodes(), this.store.edges(),
      'manual', profile.id,
    );

    this._conflict.set(null);
    this._conflictResolved.set(true);
  }

  /** Dismiss the conflict warning without action. */
  dismissConflict(): void {
    this._conflict.set(null);
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
