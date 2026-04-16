/**
 * Tests for the diff worker logic. Since we can't instantiate actual Worker
 * threads in Karma, we extract and test the pure diff computation logic
 * that the worker executes.
 */

// Replicate the worker's compareNode function and diff logic for testing
function compareNode(a: any, b: any): string[] {
  const changes: string[] = [];
  if (a.label !== b.label) changes.push('label');
  if (a.notes !== b.notes) changes.push('notes');
  if (a.position.x !== b.position.x || a.position.y !== b.position.y) changes.push('position');
  if (a.size.width !== b.size.width || a.size.height !== b.size.height) changes.push('size');
  if (JSON.stringify(a.style) !== JSON.stringify(b.style)) changes.push('style');
  if (a.type !== b.type) changes.push('type');
  return changes;
}

function runDiff(publishedNodes: any[], publishedEdges: any[], currentNodes: any[], currentEdges: any[]) {
  const pubNodeMap = new Map(publishedNodes.map((n: any) => [n.id, n]));
  const curNodeMap = new Map(currentNodes.map((n: any) => [n.id, n]));
  const pubEdgeMap = new Map(publishedEdges.map((e: any) => [e.id, e]));
  const curEdgeMap = new Map(currentEdges.map((e: any) => [e.id, e]));

  const addedNodes: any[] = [], removedNodes: any[] = [];
  const modifiedNodes: any[] = [];
  let unchangedNodeCount = 0;

  for (const cur of currentNodes) {
    const pub = pubNodeMap.get(cur.id);
    if (!pub) addedNodes.push(cur);
    else {
      const changes = compareNode(pub, cur);
      if (changes.length > 0) modifiedNodes.push({ before: pub, after: cur, changes });
      else unchangedNodeCount++;
    }
  }
  for (const pub of publishedNodes) { if (!curNodeMap.has(pub.id)) removedNodes.push(pub); }

  const addedEdges: any[] = [], removedEdges: any[] = [];
  let modifiedEdges = 0, unchangedEdgeCount = 0;
  for (const cur of currentEdges) {
    const pub = pubEdgeMap.get(cur.id);
    if (!pub) addedEdges.push(cur);
    else if (JSON.stringify(pub) !== JSON.stringify(cur)) modifiedEdges++;
    else unchangedEdgeCount++;
  }
  for (const pub of publishedEdges) { if (!curEdgeMap.has(pub.id)) removedEdges.push(pub); }

  return { addedNodes, removedNodes, modifiedNodes, unchangedNodeCount, addedEdges, removedEdges, modifiedEdges, unchangedEdgeCount };
}

const mkDiffNode = (id: string, label = 'N', x = 0, y = 0) => ({
  id, label, notes: '', type: 'process',
  position: { x, y }, size: { width: 100, height: 50 },
  style: { fillColor: '#000' },
});

const mkDiffEdge = (id: string, src = 'n1', tgt = 'n2') => ({ id, sourceNodeId: src, targetNodeId: tgt });

describe('Diff Worker Logic', () => {
  it('should detect added nodes', () => {
    const result = runDiff([], [], [mkDiffNode('n1')], []);
    expect(result.addedNodes.length).toBe(1);
    expect(result.removedNodes.length).toBe(0);
  });

  it('should detect removed nodes', () => {
    const result = runDiff([mkDiffNode('n1')], [], [], []);
    expect(result.removedNodes.length).toBe(1);
    expect(result.addedNodes.length).toBe(0);
  });

  it('should detect modified nodes', () => {
    const pub = mkDiffNode('n1', 'Old Label');
    const cur = mkDiffNode('n1', 'New Label');
    const result = runDiff([pub], [], [cur], []);
    expect(result.modifiedNodes.length).toBe(1);
    expect(result.modifiedNodes[0].changes).toContain('label');
  });

  it('should detect unchanged nodes', () => {
    const node = mkDiffNode('n1');
    const result = runDiff([node], [], [{ ...node }], []);
    expect(result.unchangedNodeCount).toBe(1);
  });

  it('should detect position changes', () => {
    const pub = mkDiffNode('n1', 'N', 0, 0);
    const cur = mkDiffNode('n1', 'N', 100, 200);
    const result = runDiff([pub], [], [cur], []);
    expect(result.modifiedNodes[0].changes).toContain('position');
  });

  it('should detect added edges', () => {
    const result = runDiff([], [], [], [mkDiffEdge('e1')]);
    expect(result.addedEdges.length).toBe(1);
  });

  it('should detect removed edges', () => {
    const result = runDiff([], [mkDiffEdge('e1')], [], []);
    expect(result.removedEdges.length).toBe(1);
  });

  it('should handle complex mixed diff', () => {
    const pubNodes = [mkDiffNode('n1', 'A'), mkDiffNode('n2', 'B'), mkDiffNode('n3', 'C')];
    const curNodes = [mkDiffNode('n1', 'A'), mkDiffNode('n2', 'Modified'), mkDiffNode('n4', 'New')];
    const result = runDiff(pubNodes, [], curNodes, []);
    expect(result.unchangedNodeCount).toBe(1); // n1
    expect(result.modifiedNodes.length).toBe(1); // n2
    expect(result.addedNodes.length).toBe(1); // n4
    expect(result.removedNodes.length).toBe(1); // n3
  });
});

describe('compareNode', () => {
  it('should detect no changes for identical nodes', () => {
    const node = mkDiffNode('n1');
    expect(compareNode(node, { ...node })).toEqual([]);
  });

  it('should detect multiple changes', () => {
    const a = mkDiffNode('n1', 'A', 0, 0);
    const b = { ...mkDiffNode('n1', 'B', 10, 20), type: 'decision' };
    const changes = compareNode(a, b);
    expect(changes).toContain('label');
    expect(changes).toContain('position');
    expect(changes).toContain('type');
  });
});
