import { snapToGrid, snapPosition, computeAlignmentGuides } from './snap-utils';
import { CanvasNode } from '../models/node.model';

describe('snapToGrid', () => {
  it('should snap to nearest 8px multiple', () => {
    expect(snapToGrid(0)).toBe(0);
    expect(snapToGrid(3)).toBe(0);
    expect(snapToGrid(4)).toBe(8); // Math.round(0.5) === 1 in JS
    expect(snapToGrid(12)).toBe(16);
    expect(snapToGrid(16)).toBe(16);
    expect(snapToGrid(-3)).toBe(0);
    expect(snapToGrid(-5)).toBe(-8);
  });

  it('should snap to custom grid size', () => {
    expect(snapToGrid(7, 10)).toBe(10);
    expect(snapToGrid(3, 10)).toBe(0);
  });
});

describe('snapPosition', () => {
  it('should snap both x and y', () => {
    const result = snapPosition({ x: 13, y: 27 });
    expect(result).toEqual({ x: 16, y: 24 });
  });
});

describe('computeAlignmentGuides', () => {
  function makeNode(id: string, x: number, y: number, w = 100, h = 50): CanvasNode {
    return {
      id, canvasId: 'c', type: 'process', position: { x, y }, size: { width: w, height: h },
      label: '', notes: '',
      style: { fillColor: '', strokeColor: '', strokeWidth: 1, borderRadius: 0, fontSize: 13, fontColor: '', opacity: 1 },
      templateId: null, importId: null, metadata: [], zIndex: 0, locked: false, createdAt: 0, updatedAt: 0,
    };
  }

  it('should return guides when centers align', () => {
    // dragged at x=100 (center=150), other at x=100 (center=150)
    const guides = computeAlignmentGuides({ x: 100, y: 200 }, { width: 100, height: 50 }, [makeNode('o', 100, 50)]);
    const xGuide = guides.find(g => g.axis === 'x' && g.value === 150);
    expect(xGuide).toBeTruthy();
  });

  it('should return empty when nothing aligns', () => {
    const guides = computeAlignmentGuides({ x: 0, y: 0 }, { width: 100, height: 50 }, [makeNode('o', 500, 500)]);
    expect(guides.length).toBe(0);
  });

  it('should detect left-edge to left-edge alignment', () => {
    const guides = computeAlignmentGuides({ x: 100, y: 200 }, { width: 100, height: 50 }, [makeNode('o', 102, 50)]);
    const match = guides.find(g => g.axis === 'x' && g.type === 'edge');
    expect(match).toBeTruthy();
  });

  it('should deduplicate guides at same coordinate', () => {
    const guides = computeAlignmentGuides(
      { x: 100, y: 100 }, { width: 100, height: 50 },
      [makeNode('a', 100, 0), makeNode('b', 100, 200)],
    );
    const xGuides = guides.filter(g => g.axis === 'x' && g.value === 100);
    expect(xGuides.length).toBe(1); // deduplicated
  });
});
