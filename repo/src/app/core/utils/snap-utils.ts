import { CanvasNode, Position, Size } from '../models/node.model';
import { CANVAS_DEFAULTS } from '../models/canvas.model';

const GRID = CANVAS_DEFAULTS.gridSize; // 8
const GUIDE_THRESHOLD = 6; // px in canvas space

// ────────────── Snap to grid ──────────────

export function snapToGrid(value: number, gridSize: number = GRID): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPosition(pos: Position, gridSize: number = GRID): Position {
  return {
    x: snapToGrid(pos.x, gridSize),
    y: snapToGrid(pos.y, gridSize),
  };
}

// ────────────── Alignment guides ──────────────

export interface AlignmentGuide {
  axis: 'x' | 'y';
  value: number;         // coordinate of the guide line
  type: 'center' | 'edge';
}

export interface SnapResult {
  position: Position;
  guides: AlignmentGuide[];
}

/**
 * Compute alignment guides and optional snap adjustment.
 * `dragNode` is the node being dragged (with its current tentative position).
 * `others` are all other nodes on the canvas.
 */
export function computeAlignmentGuides(
  dragPos: Position,
  dragSize: Size,
  others: CanvasNode[],
): AlignmentGuide[] {
  const guides: AlignmentGuide[] = [];

  const dragCx = dragPos.x + dragSize.width / 2;
  const dragCy = dragPos.y + dragSize.height / 2;
  const dragRight = dragPos.x + dragSize.width;
  const dragBottom = dragPos.y + dragSize.height;

  for (const other of others) {
    const ox = other.position.x;
    const oy = other.position.y;
    const oCx = ox + other.size.width / 2;
    const oCy = oy + other.size.height / 2;
    const oRight = ox + other.size.width;
    const oBottom = oy + other.size.height;

    // X-axis guides (vertical lines)
    if (Math.abs(dragCx - oCx) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'x', value: oCx, type: 'center' });
    }
    if (Math.abs(dragPos.x - ox) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'x', value: ox, type: 'edge' });
    }
    if (Math.abs(dragRight - oRight) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'x', value: oRight, type: 'edge' });
    }
    if (Math.abs(dragPos.x - oRight) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'x', value: oRight, type: 'edge' });
    }
    if (Math.abs(dragRight - ox) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'x', value: ox, type: 'edge' });
    }

    // Y-axis guides (horizontal lines)
    if (Math.abs(dragCy - oCy) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'y', value: oCy, type: 'center' });
    }
    if (Math.abs(dragPos.y - oy) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'y', value: oy, type: 'edge' });
    }
    if (Math.abs(dragBottom - oBottom) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'y', value: oBottom, type: 'edge' });
    }
    if (Math.abs(dragPos.y - oBottom) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'y', value: oBottom, type: 'edge' });
    }
    if (Math.abs(dragBottom - oy) < GUIDE_THRESHOLD) {
      guides.push({ axis: 'y', value: oy, type: 'edge' });
    }
  }

  // Deduplicate guides
  const seen = new Set<string>();
  return guides.filter(g => {
    const key = `${g.axis}:${g.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
