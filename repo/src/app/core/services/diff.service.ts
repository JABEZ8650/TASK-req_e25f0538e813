import { Injectable, signal } from '@angular/core';
import { CanvasNode } from '../models/node.model';
import { Edge } from '../models/edge.model';
import { CanvasStoreService } from './canvas-store.service';
import { VersionService } from './version.service';

export interface DiffResult {
  addedNodes: CanvasNode[];
  removedNodes: CanvasNode[];
  modifiedNodes: { before: CanvasNode; after: CanvasNode; changes: string[] }[];
  unchangedNodeCount: number;
  addedEdges: Edge[];
  removedEdges: Edge[];
  modifiedEdges: number;
  unchangedEdgeCount: number;
}

@Injectable({ providedIn: 'root' })
export class DiffService {
  private readonly _diffResult = signal<DiffResult | null>(null);
  readonly diffResult = this._diffResult.asReadonly();

  private readonly _comparing = signal(false);
  readonly comparing = this._comparing.asReadonly();

  private worker: Worker | null = null;

  constructor(
    private store: CanvasStoreService,
    private versionSvc: VersionService,
  ) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/diff.worker', import.meta.url), { type: 'module' });
    }
  }

  computeDraftVsPublished(): void {
    const canvas = this.store.currentCanvas();
    if (!canvas?.publishedVersionId) {
      this._diffResult.set(null);
      return;
    }

    const published = this.versionSvc.publishedVersions().find(
      v => v.id === canvas.publishedVersionId,
    );
    if (!published) {
      this._diffResult.set(null);
      return;
    }

    this._comparing.set(true);

    const pubNodes = published.snapshot.nodes as unknown as CanvasNode[];
    const pubEdges = published.snapshot.edges as unknown as Edge[];
    const curNodes = this.store.nodes();
    const curEdges = this.store.edges();

    if (this.worker) {
      this.worker.onmessage = (event: MessageEvent<DiffResult>) => {
        this._diffResult.set(event.data);
        this._comparing.set(false);
      };
      this.worker.onerror = () => {
        // Fallback to sync if worker fails
        this._diffResult.set(this.diffSync(pubNodes, pubEdges, curNodes, curEdges));
        this._comparing.set(false);
      };
      this.worker.postMessage({
        publishedNodes: pubNodes,
        publishedEdges: pubEdges,
        currentNodes: curNodes,
        currentEdges: curEdges,
      });
    } else {
      // Fallback for environments without Worker support
      this._diffResult.set(this.diffSync(pubNodes, pubEdges, curNodes, curEdges));
      this._comparing.set(false);
    }
  }

  clear(): void {
    this._diffResult.set(null);
  }

  /** Synchronous fallback diff (used when Worker is unavailable). */
  private diffSync(
    pubNodes: CanvasNode[], pubEdges: Edge[],
    curNodes: CanvasNode[], curEdges: Edge[],
  ): DiffResult {
    const pubNodeMap = new Map(pubNodes.map(n => [n.id, n]));
    const curNodeMap = new Map(curNodes.map(n => [n.id, n]));
    const pubEdgeMap = new Map(pubEdges.map(e => [e.id, e]));
    const curEdgeMap = new Map(curEdges.map(e => [e.id, e]));

    const addedNodes: CanvasNode[] = [];
    const removedNodes: CanvasNode[] = [];
    const modifiedNodes: DiffResult['modifiedNodes'] = [];
    let unchangedNodeCount = 0;

    for (const cur of curNodes) {
      const pub = pubNodeMap.get(cur.id);
      if (!pub) { addedNodes.push(cur); }
      else {
        const changes: string[] = [];
        if (pub.label !== cur.label) changes.push('label');
        if (pub.notes !== cur.notes) changes.push('notes');
        if (pub.position.x !== cur.position.x || pub.position.y !== cur.position.y) changes.push('position');
        if (pub.size.width !== cur.size.width || pub.size.height !== cur.size.height) changes.push('size');
        if (JSON.stringify(pub.style) !== JSON.stringify(cur.style)) changes.push('style');
        if (pub.type !== cur.type) changes.push('type');
        if (changes.length > 0) modifiedNodes.push({ before: pub, after: cur, changes });
        else unchangedNodeCount++;
      }
    }
    for (const pub of pubNodes) { if (!curNodeMap.has(pub.id)) removedNodes.push(pub); }

    const addedEdges: Edge[] = [];
    const removedEdges: Edge[] = [];
    let modifiedEdges = 0;
    let unchangedEdgeCount = 0;
    for (const cur of curEdges) {
      const pub = pubEdgeMap.get(cur.id);
      if (!pub) addedEdges.push(cur);
      else if (JSON.stringify(pub) !== JSON.stringify(cur)) modifiedEdges++;
      else unchangedEdgeCount++;
    }
    for (const pub of pubEdges) { if (!curEdgeMap.has(pub.id)) removedEdges.push(pub); }

    return { addedNodes, removedNodes, modifiedNodes, unchangedNodeCount, addedEdges, removedEdges, modifiedEdges, unchangedEdgeCount };
  }
}
