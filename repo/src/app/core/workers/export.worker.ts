/// <reference lib="webworker" />

/**
 * Web Worker for heavy SVG string building.
 * Receives node/edge data, returns a complete SVG string.
 */

interface NodeData {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  type: string;
  style: {
    fillColor: string;
    strokeColor: string;
    strokeWidth: number;
    borderRadius: number;
    fontSize: number;
    fontColor: string;
    opacity: number;
  };
}

interface EdgeData {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;
  targetPort: string;
  type: string;
  label: string;
  style: {
    strokeColor: string;
    strokeWidth: number;
    strokeDash: string;
    opacity: number;
  };
}

interface ExportRequest {
  nodes: NodeData[];
  edges: EdgeData[];
}

addEventListener('message', (event: MessageEvent<ExportRequest>) => {
  const { nodes, edges } = event.data;
  const svg = buildSvg(nodes, edges);
  postMessage({ svg });
});

function buildSvg(nodes: NodeData[], edges: EdgeData[]): string {
  const bounds = computeBounds(nodes);
  const pad = 40;
  const x = bounds.minX - pad;
  const y = bounds.minY - pad;
  const w = bounds.maxX - bounds.minX + pad * 2;
  const h = bounds.maxY - bounds.minY + pad * 2;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}" style="background:#0f172a">\n`;
  svg += `<style>text{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style>\n`;

  for (const edge of edges) {
    const src = nodeMap.get(edge.sourceNodeId);
    const tgt = nodeMap.get(edge.targetNodeId);
    if (!src || !tgt) continue;
    const d = computeEdgePath(src, edge.sourcePort, tgt, edge.targetPort, edge.type);
    svg += `<path d="${d}" fill="none" stroke="${esc(edge.style.strokeColor)}" stroke-width="${edge.style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${edge.style.strokeDash ? ` stroke-dasharray="${edge.style.strokeDash}"` : ''}/>\n`;
    if (edge.label) {
      const mx = (src.position.x + src.size.width / 2 + tgt.position.x + tgt.size.width / 2) / 2;
      const my = (src.position.y + src.size.height / 2 + tgt.position.y + tgt.size.height / 2) / 2;
      svg += `<text x="${mx}" y="${my - 6}" text-anchor="middle" fill="#94a3b8" font-size="11">${esc(edge.label)}</text>\n`;
    }
  }

  for (const node of nodes) {
    svg += `<rect x="${node.position.x}" y="${node.position.y}" width="${node.size.width}" height="${node.size.height}" rx="${node.style.borderRadius}" fill="${esc(node.style.fillColor)}" stroke="${esc(node.style.strokeColor)}" stroke-width="${node.style.strokeWidth}" opacity="${node.style.opacity}"/>\n`;
    const label = node.label || node.type;
    const tx = node.position.x + node.size.width / 2;
    const ty = node.position.y + node.size.height / 2;
    svg += `<text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" fill="${esc(node.style.fontColor)}" font-size="${node.style.fontSize}">${esc(label)}</text>\n`;
  }

  svg += '</svg>';
  return svg;
}

function computeBounds(nodes: NodeData[]) {
  if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + n.size.width);
    maxY = Math.max(maxY, n.position.y + n.size.height);
  }
  return { minX, minY, maxX, maxY };
}

// Minimal edge path computation (duplicated from edge-utils to avoid import issues in workers)
function getPortPos(node: NodeData, port: string) {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  switch (port) {
    case 'top':    return { x: x + w / 2, y };
    case 'right':  return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left':   return { x, y: y + h / 2 };
    default:       return { x: x + w / 2, y: y + h };
  }
}

function portDir(port: string) {
  switch (port) {
    case 'top':    return { x: 0, y: -1 };
    case 'right':  return { x: 1, y: 0 };
    case 'bottom': return { x: 0, y: 1 };
    case 'left':   return { x: -1, y: 0 };
    default:       return { x: 0, y: 1 };
  }
}

function computeEdgePath(src: NodeData, sp: string, tgt: NodeData, tp: string, type: string): string {
  const s = getPortPos(src, sp);
  const t = getPortPos(tgt, tp);
  if (type === 'straight') return `M ${s.x},${s.y} L ${t.x},${t.y}`;
  if (type === 'curved') {
    const sd = portDir(sp); const td = portDir(tp);
    const dist = Math.hypot(t.x - s.x, t.y - s.y);
    const cp = Math.max(40, dist * 0.4);
    return `M ${s.x},${s.y} C ${s.x + sd.x * cp},${s.y + sd.y * cp} ${t.x + td.x * cp},${t.y + td.y * cp} ${t.x},${t.y}`;
  }
  const STUB = 24;
  const sd = portDir(sp); const td = portDir(tp);
  const s1 = { x: s.x + sd.x * STUB, y: s.y + sd.y * STUB };
  const t1 = { x: t.x + td.x * STUB, y: t.y + td.y * STUB };
  const isVS = sp === 'top' || sp === 'bottom';
  const isVT = tp === 'top' || tp === 'bottom';
  if (isVS && isVT) {
    const midY = (s1.y + t1.y) / 2;
    return `M ${s.x},${s.y} L ${s1.x},${s1.y} L ${s1.x},${midY} L ${t1.x},${midY} L ${t1.x},${t1.y} L ${t.x},${t.y}`;
  }
  if (!isVS && !isVT) {
    const midX = (s1.x + t1.x) / 2;
    return `M ${s.x},${s.y} L ${s1.x},${s1.y} L ${midX},${s1.y} L ${midX},${t1.y} L ${t1.x},${t1.y} L ${t.x},${t.y}`;
  }
  return `M ${s.x},${s.y} L ${s1.x},${s1.y} L ${t1.x},${s1.y} L ${t1.x},${t1.y} L ${t.x},${t.y}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
