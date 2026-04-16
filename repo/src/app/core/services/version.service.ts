import { Injectable, signal, computed } from '@angular/core';
import { Version, VersionType, CanvasSnapshot, VERSION_LIMITS } from '../models/version.model';
import { CanvasNode } from '../models/node.model';
import { Edge } from '../models/edge.model';
import { Canvas } from '../models/canvas.model';
import { IndexedDbService } from './indexed-db.service';

@Injectable({ providedIn: 'root' })
export class VersionService {
  private readonly _versions = signal<Version[]>([]);
  readonly versions = this._versions.asReadonly();

  readonly autosaveVersions = computed(() =>
    this._versions().filter(v => v.type === 'autosave'),
  );

  readonly manualVersions = computed(() =>
    this._versions().filter(v => v.type === 'manual'),
  );

  readonly publishedVersions = computed(() =>
    this._versions().filter(v => v.type === 'published'),
  );

  /** The hash of the last saved snapshot, used to detect no-change autosaves. */
  private lastSnapshotHash = '';

  constructor(private db: IndexedDbService) {}

  // ────────────────── Load ──────────────────

  async loadVersions(canvasId: string): Promise<void> {
    const all = await this.db.getAllByIndex<Version>('versions', 'canvasId', canvasId);
    this._versions.set(all.sort((a, b) => b.createdAt - a.createdAt));
    // Initialize hash from the latest autosave
    const latest = all.find(v => v.type === 'autosave');
    this.lastSnapshotHash = latest ? this.hashSnapshot(latest.snapshot) : '';
  }

  clearVersions(): void {
    this._versions.set([]);
    this.lastSnapshotHash = '';
  }

  // ────────────────── Create snapshot ──────────────────

  async createSnapshot(
    canvas: Canvas,
    nodes: CanvasNode[],
    edges: Edge[],
    type: VersionType,
    createdBy: string,
  ): Promise<Version | null> {
    const snapshot = this.buildSnapshot(canvas, nodes, edges);
    const hash = this.hashSnapshot(snapshot);

    // Skip if snapshot is identical to the last one (avoids useless duplicates)
    if (type === 'autosave' && hash === this.lastSnapshotHash) {
      return null;
    }

    const nextNumber = this.nextVersionNumber(canvas.id);

    const version: Version = {
      id: crypto.randomUUID(),
      canvasId: canvas.id,
      versionNumber: nextNumber,
      type,
      snapshot,
      createdAt: Date.now(),
      createdBy,
      reviewerConfirmation: null,
    };

    await this.db.put('versions', version);
    this._versions.update(list => [version, ...list]);

    if (type === 'autosave') {
      this.lastSnapshotHash = hash;
      await this.enforceAutosaveCap(canvas.id);
    }

    return version;
  }

  /** Update an existing version record (e.g. to add reviewer confirmation). */
  async updateVersion(version: Version): Promise<void> {
    await this.db.put('versions', version);
    this._versions.update(list =>
      list.map(v => v.id === version.id ? version : v),
    );
  }

  // ────────────────── Rolling cap ──────────────────

  private async enforceAutosaveCap(canvasId: string): Promise<void> {
    const autosaves = this._versions()
      .filter(v => v.type === 'autosave' && v.canvasId === canvasId)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (autosaves.length <= VERSION_LIMITS.MAX_AUTOSAVE_VERSIONS) return;

    const toDelete = autosaves.slice(VERSION_LIMITS.MAX_AUTOSAVE_VERSIONS);
    for (const v of toDelete) {
      await this.db.delete('versions', v.id);
    }

    const deleteIds = new Set(toDelete.map(v => v.id));
    this._versions.update(list => list.filter(v => !deleteIds.has(v.id)));
  }

  // ────────────────── Rollback ──────────────────

  /**
   * Restore a version into the live canvas. Returns the snapshot data.
   * The caller (canvas store) is responsible for actually replacing the live state.
   * Rollback also creates a new "manual" version capturing the restored state,
   * so history is preserved rather than overwritten.
   */
  async getSnapshotForRestore(versionId: string): Promise<CanvasSnapshot | null> {
    const version = this._versions().find(v => v.id === versionId);
    if (!version) return null;
    return version.snapshot;
  }

  // ────────────────── Helpers ──────────────────

  private buildSnapshot(canvas: Canvas, nodes: CanvasNode[], edges: Edge[]): CanvasSnapshot {
    return {
      canvasData: {
        name: canvas.name,
        description: canvas.description,
        settings: canvas.settings,
      },
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
    };
  }

  /**
   * Simple deterministic hash of a snapshot for deduplication.
   * Not cryptographic — just stable string comparison.
   */
  private hashSnapshot(snapshot: CanvasSnapshot): string {
    const nodeIds = (snapshot.nodes as { id: string }[]).map(n => n.id).sort().join(',');
    const edgeIds = (snapshot.edges as { id: string }[]).map(e => e.id).sort().join(',');
    const nodeData = snapshot.nodes.map(n => JSON.stringify(n)).sort().join('|');
    const edgeData = snapshot.edges.map(e => JSON.stringify(e)).sort().join('|');
    // Use a simple length + content hash
    const raw = `${nodeIds}::${edgeIds}::${nodeData.length}::${edgeData.length}::${nodeData.slice(0, 500)}::${edgeData.slice(0, 500)}`;
    let h = 0;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) - h + raw.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  private nextVersionNumber(canvasId: string): number {
    const existing = this._versions().filter(v => v.canvasId === canvasId);
    if (existing.length === 0) return 1;
    return Math.max(...existing.map(v => v.versionNumber)) + 1;
  }
}
