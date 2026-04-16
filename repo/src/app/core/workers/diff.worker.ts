/// <reference lib="webworker" />

interface NodeLike {
  id: string;
  label: string;
  notes: string;
  type: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  style: Record<string, unknown>;
}

interface EdgeLike {
  id: string;
}

interface DiffRequest {
  publishedNodes: NodeLike[];
  publishedEdges: EdgeLike[];
  currentNodes: NodeLike[];
  currentEdges: EdgeLike[];
}

addEventListener('message', (event: MessageEvent<DiffRequest>) => {
  const { publishedNodes, publishedEdges, currentNodes, currentEdges } = event.data;

  const pubNodeMap = new Map(publishedNodes.map(n => [n.id, n]));
  const curNodeMap = new Map(currentNodes.map(n => [n.id, n]));
  const pubEdgeMap = new Map(publishedEdges.map(e => [e.id, e]));
  const curEdgeMap = new Map(currentEdges.map(e => [e.id, e]));

  const addedNodes: NodeLike[] = [];
  const removedNodes: NodeLike[] = [];
  const modifiedNodes: { before: NodeLike; after: NodeLike; changes: string[] }[] = [];
  let unchangedNodeCount = 0;

  for (const cur of currentNodes) {
    const pub = pubNodeMap.get(cur.id);
    if (!pub) {
      addedNodes.push(cur);
    } else {
      const changes = compareNode(pub, cur);
      if (changes.length > 0) {
        modifiedNodes.push({ before: pub, after: cur, changes });
      } else {
        unchangedNodeCount++;
      }
    }
  }
  for (const pub of publishedNodes) {
    if (!curNodeMap.has(pub.id)) removedNodes.push(pub);
  }

  const addedEdges: EdgeLike[] = [];
  const removedEdges: EdgeLike[] = [];
  let modifiedEdges = 0;
  let unchangedEdgeCount = 0;

  for (const cur of currentEdges) {
    const pub = pubEdgeMap.get(cur.id);
    if (!pub) {
      addedEdges.push(cur);
    } else if (JSON.stringify(pub) !== JSON.stringify(cur)) {
      modifiedEdges++;
    } else {
      unchangedEdgeCount++;
    }
  }
  for (const pub of publishedEdges) {
    if (!curEdgeMap.has(pub.id)) removedEdges.push(pub);
  }

  postMessage({
    addedNodes, removedNodes, modifiedNodes, unchangedNodeCount,
    addedEdges, removedEdges, modifiedEdges, unchangedEdgeCount,
  });
});

function compareNode(a: NodeLike, b: NodeLike): string[] {
  const changes: string[] = [];
  if (a.label !== b.label) changes.push('label');
  if (a.notes !== b.notes) changes.push('notes');
  if (a.position.x !== b.position.x || a.position.y !== b.position.y) changes.push('position');
  if (a.size.width !== b.size.width || a.size.height !== b.size.height) changes.push('size');
  if (JSON.stringify(a.style) !== JSON.stringify(b.style)) changes.push('style');
  if (a.type !== b.type) changes.push('type');
  return changes;
}
