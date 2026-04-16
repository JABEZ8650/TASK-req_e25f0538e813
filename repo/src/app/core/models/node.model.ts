export type NodeType =
  | 'process'
  | 'decision'
  | 'start'
  | 'end'
  | 'subprocess'
  | 'data'
  | 'connector'
  | 'text'
  | 'group'
  | 'custom';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface NodeStyle {
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
  fontSize: number;
  fontColor: string;
  opacity: number;
}

export interface NodeMetadataField {
  key: string;
  value: string;
  normalized: boolean;
  originalValue?: string;
  flagged?: string;
}

export interface CanvasNode {
  id: string;
  canvasId: string;
  type: NodeType;
  position: Position;
  size: Size;
  label: string;       // max 200 chars
  notes: string;        // max 1000 chars
  style: NodeStyle;
  templateId: string | null;
  importId: string | null;
  metadata: NodeMetadataField[];
  zIndex: number;
  locked: boolean;
  createdAt: number;
  updatedAt: number;
}

export const NODE_LIMITS = {
  MAX_LABEL_LENGTH: 200,
  MAX_NOTES_LENGTH: 1000,
} as const;
