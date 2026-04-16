/**
 * Tests for the export worker's SVG building logic.
 * Replicates the pure functions from export.worker.ts.
 */

function computeBounds(nodes: any[]) {
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

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getPortPos(node: any, port: string) {
  const { x, y } = node.position;
  const { width: w, height: h } = node.size;
  switch (port) {
    case 'top': return { x: x + w / 2, y };
    case 'right': return { x: x + w, y: y + h / 2 };
    case 'bottom': return { x: x + w / 2, y: y + h };
    case 'left': return { x, y: y + h / 2 };
    default: return { x: x + w / 2, y: y + h };
  }
}

const mkExpNode = (id: string, x: number, y: number, w = 100, h = 50) => ({
  id, position: { x, y }, size: { width: w, height: h },
  label: `Node ${id}`, type: 'process',
  style: { fillColor: '#1e3a5f', strokeColor: '#3b82f6', strokeWidth: 1.5, borderRadius: 6, fontSize: 13, fontColor: '#e2e8f0', opacity: 1 },
});

describe('Export Worker Logic', () => {
  describe('computeBounds', () => {
    it('should return default bounds for empty nodes', () => {
      const b = computeBounds([]);
      expect(b).toEqual({ minX: 0, minY: 0, maxX: 400, maxY: 300 });
    });

    it('should compute tight bounds around nodes', () => {
      const nodes = [mkExpNode('a', 100, 200, 80, 40), mkExpNode('b', 300, 50, 120, 60)];
      const b = computeBounds(nodes);
      expect(b.minX).toBe(100);
      expect(b.minY).toBe(50);
      expect(b.maxX).toBe(420); // 300 + 120
      expect(b.maxY).toBe(240); // 200 + 40
    });

    it('should handle single node', () => {
      const b = computeBounds([mkExpNode('a', 10, 20, 50, 30)]);
      expect(b).toEqual({ minX: 10, minY: 20, maxX: 60, maxY: 50 });
    });
  });

  describe('esc', () => {
    it('should escape HTML entities', () => {
      expect(esc('a & b')).toBe('a &amp; b');
      expect(esc('<script>')).toBe('&lt;script&gt;');
      expect(esc('"quoted"')).toBe('&quot;quoted&quot;');
    });

    it('should pass through clean strings', () => {
      expect(esc('hello world')).toBe('hello world');
    });
  });

  describe('getPortPos', () => {
    const node = mkExpNode('n', 100, 200, 80, 40);

    it('should return top center', () => {
      expect(getPortPos(node, 'top')).toEqual({ x: 140, y: 200 });
    });

    it('should return right center', () => {
      expect(getPortPos(node, 'right')).toEqual({ x: 180, y: 220 });
    });

    it('should return bottom center', () => {
      expect(getPortPos(node, 'bottom')).toEqual({ x: 140, y: 240 });
    });

    it('should return left center', () => {
      expect(getPortPos(node, 'left')).toEqual({ x: 100, y: 220 });
    });

    it('should default to bottom for unknown port', () => {
      expect(getPortPos(node, 'unknown')).toEqual({ x: 140, y: 240 });
    });
  });
});
