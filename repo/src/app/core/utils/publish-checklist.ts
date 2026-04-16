import { Canvas, CANVAS_LIMITS } from '../models/canvas.model';
import { CanvasNode } from '../models/node.model';
import { Edge } from '../models/edge.model';

export interface ChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

/**
 * Evaluate the pre-publish checklist for a canvas.
 * Returns an array of checklist items, each with pass/fail status.
 */
export function evaluateChecklist(
  canvas: Canvas,
  nodes: CanvasNode[],
  edges: Edge[],
): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // 1. Required title
  const hasTitle = canvas.name.trim().length > 0;
  items.push({
    id: 'title',
    label: 'Canvas has a title',
    passed: hasTitle,
    detail: hasTitle ? canvas.name : 'Title is empty.',
  });

  // 2. Within node limit
  const nodeOk = nodes.length <= CANVAS_LIMITS.MAX_NODES;
  items.push({
    id: 'node-limit',
    label: `Nodes within limit (${nodes.length}/${CANVAS_LIMITS.MAX_NODES})`,
    passed: nodeOk,
    detail: nodeOk ? `${nodes.length} nodes` : `Exceeds ${CANVAS_LIMITS.MAX_NODES} node limit.`,
  });

  // 3. Within edge limit
  const edgeOk = edges.length <= CANVAS_LIMITS.MAX_CONNECTIONS;
  items.push({
    id: 'edge-limit',
    label: `Connectors within limit (${edges.length}/${CANVAS_LIMITS.MAX_CONNECTIONS})`,
    passed: edgeOk,
    detail: edgeOk ? `${edges.length} connectors` : `Exceeds ${CANVAS_LIMITS.MAX_CONNECTIONS} connector limit.`,
  });

  // 4. No dangling connectors (source and target nodes must exist)
  const nodeIds = new Set(nodes.map(n => n.id));
  const danglingEdges = edges.filter(
    e => !nodeIds.has(e.sourceNodeId) || !nodeIds.has(e.targetNodeId),
  );
  const noDangling = danglingEdges.length === 0;
  items.push({
    id: 'no-dangling',
    label: 'No dangling connectors',
    passed: noDangling,
    detail: noDangling
      ? 'All connectors are attached to existing nodes.'
      : `${danglingEdges.length} connector(s) reference missing nodes.`,
  });

  return items;
}

/** Returns true if all checklist items pass. */
export function isPublishReady(items: ChecklistItem[]): boolean {
  return items.every(i => i.passed);
}
