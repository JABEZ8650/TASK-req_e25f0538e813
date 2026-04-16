import { evaluateChecklist, isPublishReady } from './publish-checklist';
import { Canvas, CANVAS_DEFAULTS, APPROVAL_DEFAULTS } from '../models/canvas.model';
import { CanvasNode } from '../models/node.model';
import { Edge } from '../models/edge.model';

function makeCanvas(overrides: Partial<Canvas> = {}): Canvas {
  return {
    id: 'c1', name: 'Test Canvas', description: '', profileId: 'p1',
    status: 'draft', settings: { ...CANVAS_DEFAULTS },
    approval: { ...APPROVAL_DEFAULTS }, publishedVersionId: null,
    createdAt: 0, updatedAt: 0, ...overrides,
  };
}

function makeNode(id: string): CanvasNode {
  return {
    id, canvasId: 'c1', type: 'process', position: { x: 0, y: 0 },
    size: { width: 100, height: 50 }, label: 'N', notes: '',
    style: { fillColor: '#000', strokeColor: '#fff', strokeWidth: 1, borderRadius: 4, fontSize: 13, fontColor: '#fff', opacity: 1 },
    templateId: null, importId: null, metadata: [], zIndex: 0, locked: false,
    createdAt: 0, updatedAt: 0,
  };
}

function makeEdge(src: string, tgt: string): Edge {
  return {
    id: `e-${src}-${tgt}`, canvasId: 'c1', sourceNodeId: src, targetNodeId: tgt,
    sourcePort: 'bottom', targetPort: 'top', type: 'orthogonal', label: '',
    style: { strokeColor: '#fff', strokeWidth: 1, strokeDash: '', opacity: 1 },
    createdAt: 0, updatedAt: 0,
  };
}

describe('evaluateChecklist', () => {
  it('should pass with valid canvas', () => {
    const items = evaluateChecklist(makeCanvas(), [makeNode('n1')], []);
    expect(items.every(i => i.passed)).toBe(true);
  });

  it('should fail when title is empty', () => {
    const items = evaluateChecklist(makeCanvas({ name: '' }), [], []);
    expect(items.find(i => i.id === 'title')?.passed).toBe(false);
  });

  it('should fail when title is whitespace only', () => {
    const items = evaluateChecklist(makeCanvas({ name: '   ' }), [], []);
    expect(items.find(i => i.id === 'title')?.passed).toBe(false);
  });

  it('should detect dangling connectors', () => {
    const edge = makeEdge('n1', 'n-missing');
    const items = evaluateChecklist(makeCanvas(), [makeNode('n1')], [edge]);
    expect(items.find(i => i.id === 'no-dangling')?.passed).toBe(false);
  });

  it('should pass when all edges connect to existing nodes', () => {
    const items = evaluateChecklist(
      makeCanvas(),
      [makeNode('n1'), makeNode('n2')],
      [makeEdge('n1', 'n2')],
    );
    expect(items.find(i => i.id === 'no-dangling')?.passed).toBe(true);
  });
});

describe('isPublishReady', () => {
  it('should return true when all items pass', () => {
    const items = evaluateChecklist(makeCanvas(), [makeNode('n1')], []);
    expect(isPublishReady(items)).toBe(true);
  });

  it('should return false when any item fails', () => {
    const items = evaluateChecklist(makeCanvas({ name: '' }), [], []);
    expect(isPublishReady(items)).toBe(false);
  });
});
