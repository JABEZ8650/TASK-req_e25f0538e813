import { Injectable } from '@angular/core';
import { CanvasStoreService } from './canvas-store.service';
import { CanvasNode } from '../models/node.model';
import { Edge } from '../models/edge.model';
import { computeEdgePath } from '../utils/edge-utils';

@Injectable({ providedIn: 'root' })
export class ExportService {
  private worker: Worker | null = null;

  constructor(private store: CanvasStoreService) {
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../workers/export.worker', import.meta.url), { type: 'module' });
    }
  }

  exportJson(): void {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;
    const data = {
      canvas: {
        id: canvas.id, name: canvas.name, description: canvas.description,
        status: canvas.status, settings: canvas.settings,
        createdAt: canvas.createdAt, updatedAt: canvas.updatedAt,
      },
      nodes: this.store.nodes().map(n => ({ ...n, metadata: n.metadata ?? [] })),
      edges: this.store.edges(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.download(blob, `${this.sanitize(canvas.name)}.json`);
  }

  exportSvg(): void {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;
    if (this.worker) {
      this.buildSvgViaWorker().then(svg => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        this.download(blob, `${this.sanitize(canvas!.name)}.svg`);
      });
    } else {
      const svg = this.buildSvgSync(this.store.nodes(), this.store.edges());
      this.download(new Blob([svg], { type: 'image/svg+xml' }), `${this.sanitize(canvas.name)}.svg`);
    }
  }

  async exportPng(): Promise<void> {
    const canvas = this.store.currentCanvas();
    if (!canvas) return;
    const svg = this.worker
      ? await this.buildSvgViaWorker()
      : this.buildSvgSync(this.store.nodes(), this.store.edges());
    const blob = await this.svgToPngBlob(svg);
    if (blob) this.download(blob, `${this.sanitize(canvas.name)}.png`);
  }

  private buildSvgViaWorker(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.worker) { resolve(this.buildSvgSync(this.store.nodes(), this.store.edges())); return; }
      this.worker.onmessage = (e: MessageEvent<{ svg: string }>) => resolve(e.data.svg);
      this.worker.onerror = () => resolve(this.buildSvgSync(this.store.nodes(), this.store.edges()));
      this.worker.postMessage({ nodes: this.store.nodes(), edges: this.store.edges() });
    });
  }

  private buildSvgSync(nodes: CanvasNode[], edges: Edge[]): string {
    const bounds = this.computeBounds(nodes);
    const pad = 40;
    const x = bounds.minX - pad, y = bounds.minY - pad;
    const w = bounds.maxX - bounds.minX + pad * 2, h = bounds.maxY - bounds.minY + pad * 2;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" style="background:#0f172a">\n`;
    svg += `<style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style>\n`;
    for (const edge of edges) {
      const src = nodeMap.get(edge.sourceNodeId), tgt = nodeMap.get(edge.targetNodeId);
      if (!src || !tgt) continue;
      const d = computeEdgePath(src, edge.sourcePort, tgt, edge.targetPort, edge.type);
      svg += `<path d="${d}" fill="none" stroke="${this.esc(edge.style.strokeColor)}" stroke-width="${edge.style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${edge.style.strokeDash ? ` stroke-dasharray="${edge.style.strokeDash}"` : ''}/>\n`;
    }
    for (const node of nodes) {
      svg += `<rect x="${node.position.x}" y="${node.position.y}" width="${node.size.width}" height="${node.size.height}" rx="${node.style.borderRadius}" fill="${this.esc(node.style.fillColor)}" stroke="${this.esc(node.style.strokeColor)}" stroke-width="${node.style.strokeWidth}" opacity="${node.style.opacity}"/>\n`;
      const tx = node.position.x + node.size.width / 2, ty = node.position.y + node.size.height / 2;
      svg += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="${this.esc(node.style.fontColor)}" font-size="${node.style.fontSize}">${this.esc(node.label || node.type)}</text>\n`;
    }
    svg += '</svg>';
    return svg;
  }

  private computeBounds(nodes: CanvasNode[]) {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.position.x); minY = Math.min(minY, n.position.y);
      maxX = Math.max(maxX, n.position.x + n.size.width); maxY = Math.max(maxY, n.position.y + n.size.height);
    }
    return { minX, minY, maxX, maxY };
  }

  private async svgToPngBlob(svgString: string): Promise<Blob | null> {
    return new Promise((resolve) => {
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      img.onload = () => {
        const cvs = document.createElement('canvas');
        cvs.width = img.naturalWidth * 2; cvs.height = img.naturalHeight * 2;
        const ctx = cvs.getContext('2d')!;
        ctx.scale(2, 2); ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        cvs.toBlob(blob => resolve(blob), 'image/png');
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }
  private sanitize(name: string): string { return name.replace(/[^a-zA-Z0-9_\- ]/g, '').trim() || 'canvas'; }
  private esc(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}
