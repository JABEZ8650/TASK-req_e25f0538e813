import { CanvasNode, Position } from '../models/node.model';
import { EdgeType } from '../models/edge.model';

export type PortId = 'top' | 'right' | 'bottom' | 'left';

export const ALL_PORTS: PortId[] = ['top', 'right', 'bottom', 'left'];

/** Get the absolute position of a port on a node. */
export function getPortPosition(node: CanvasNode, port: string): Position {
  const { x, y } = node.position;
  const { width, height } = node.size;
  switch (port) {
    case 'top':    return { x: x + width / 2, y };
    case 'right':  return { x: x + width, y: y + height / 2 };
    case 'bottom': return { x: x + width / 2, y: y + height };
    case 'left':   return { x, y: y + height / 2 };
    default:       return { x: x + width / 2, y: y + height };
  }
}

/** Find the closest port on a node to a given point. */
export function closestPort(node: CanvasNode, point: Position): PortId {
  let best: PortId = 'bottom';
  let bestDist = Infinity;
  for (const port of ALL_PORTS) {
    const pp = getPortPosition(node, port);
    const d = Math.hypot(pp.x - point.x, pp.y - point.y);
    if (d < bestDist) {
      bestDist = d;
      best = port;
    }
  }
  return best;
}

/** Port outward direction vector (unit). */
function portDirection(port: string): Position {
  switch (port) {
    case 'top':    return { x: 0, y: -1 };
    case 'right':  return { x: 1, y: 0 };
    case 'bottom': return { x: 0, y: 1 };
    case 'left':   return { x: -1, y: 0 };
    default:       return { x: 0, y: 1 };
  }
}

const STUB_LENGTH = 24;

/** Generate an SVG path string for an edge between two ports. */
export function computeEdgePath(
  sourceNode: CanvasNode,
  sourcePort: string,
  targetNode: CanvasNode,
  targetPort: string,
  edgeType: EdgeType,
): string {
  const sp = getPortPosition(sourceNode, sourcePort);
  const tp = getPortPosition(targetNode, targetPort);

  if (edgeType === 'straight') {
    return `M ${sp.x},${sp.y} L ${tp.x},${tp.y}`;
  }

  if (edgeType === 'curved') {
    const sd = portDirection(sourcePort);
    const td = portDirection(targetPort);
    const dist = Math.hypot(tp.x - sp.x, tp.y - sp.y);
    const cp = Math.max(40, dist * 0.4);
    const c1x = sp.x + sd.x * cp;
    const c1y = sp.y + sd.y * cp;
    const c2x = tp.x + td.x * cp;
    const c2y = tp.y + td.y * cp;
    return `M ${sp.x},${sp.y} C ${c1x},${c1y} ${c2x},${c2y} ${tp.x},${tp.y}`;
  }

  // orthogonal (default) — midpoint manhattan routing
  const sd = portDirection(sourcePort);
  const td = portDirection(targetPort);
  const s1 = { x: sp.x + sd.x * STUB_LENGTH, y: sp.y + sd.y * STUB_LENGTH };
  const t1 = { x: tp.x + td.x * STUB_LENGTH, y: tp.y + td.y * STUB_LENGTH };

  const isVerticalSource = sourcePort === 'top' || sourcePort === 'bottom';
  const isVerticalTarget = targetPort === 'top' || targetPort === 'bottom';

  if (isVerticalSource && isVerticalTarget) {
    const midY = (s1.y + t1.y) / 2;
    return `M ${sp.x},${sp.y} L ${s1.x},${s1.y} L ${s1.x},${midY} L ${t1.x},${midY} L ${t1.x},${t1.y} L ${tp.x},${tp.y}`;
  }
  if (!isVerticalSource && !isVerticalTarget) {
    const midX = (s1.x + t1.x) / 2;
    return `M ${sp.x},${sp.y} L ${s1.x},${s1.y} L ${midX},${s1.y} L ${midX},${t1.y} L ${t1.x},${t1.y} L ${tp.x},${tp.y}`;
  }
  // Mixed: vertical-source to horizontal-target (or vice versa)
  return `M ${sp.x},${sp.y} L ${s1.x},${s1.y} L ${t1.x},${s1.y} L ${t1.x},${t1.y} L ${tp.x},${tp.y}`;
}

/** Generate a preview path from a port to a free cursor position. */
export function computePreviewPath(
  sourceNode: CanvasNode,
  sourcePort: string,
  cursor: Position,
): string {
  const sp = getPortPosition(sourceNode, sourcePort);
  const sd = portDirection(sourcePort);
  const s1 = { x: sp.x + sd.x * STUB_LENGTH, y: sp.y + sd.y * STUB_LENGTH };
  return `M ${sp.x},${sp.y} L ${s1.x},${s1.y} L ${cursor.x},${cursor.y}`;
}
