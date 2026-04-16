import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { VERSION_LIMITS } from '../models/version.model';
import { CanvasStoreService } from './canvas-store.service';
import { VersionService } from './version.service';
import { AuthService } from './auth.service';
import { MultiTabService } from './multi-tab.service';

@Injectable({ providedIn: 'root' })
export class AutosaveService implements OnDestroy {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private canvasStore: CanvasStoreService,
    private versionService: VersionService,
    private auth: AuthService,
    private multiTab: MultiTabService,
    private ngZone: NgZone,
  ) {}

  /** Start the autosave interval. Should be called when a canvas is opened. */
  start(): void {
    this.stop();
    // Run outside Angular to avoid change detection on every tick
    this.ngZone.runOutsideAngular(() => {
      this.timer = setInterval(() => {
        this.tick();
      }, VERSION_LIMITS.AUTOSAVE_INTERVAL_MS);
    });
  }

  /** Stop the autosave interval. Should be called when a canvas is closed. */
  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Force an immediate autosave (e.g. before closing a canvas). */
  async saveNow(): Promise<void> {
    await this.tick();
  }

  private async tick(): Promise<void> {
    if (!this.canvasStore.isDirty()) return;

    const canvas = this.canvasStore.currentCanvas();
    const profile = this.auth.profile();
    if (!canvas || !profile) return;

    const nodes = this.canvasStore.nodes();
    const edges = this.canvasStore.edges();

    const created = await this.versionService.createSnapshot(
      canvas, nodes, edges, 'autosave', profile.id,
    );

    if (created) {
      this.ngZone.run(() => this.canvasStore.markClean());
      this.multiTab.notifySaved();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
