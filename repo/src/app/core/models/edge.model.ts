export type EdgeType = 'straight' | 'curved' | 'orthogonal' | 'step';

export interface EdgeStyle {
  strokeColor: string;
  strokeWidth: number;
  strokeDash: string;     // e.g. '5,5' for dashed, '' for solid
  opacity: number;
}

export interface Edge {
  id: string;
  canvasId: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePort: string;     // e.g. 'top', 'right', 'bottom', 'left'
  targetPort: string;
  type: EdgeType;
  label: string;
  style: EdgeStyle;
  createdAt: number;
  updatedAt: number;
}
