export type TemplateFamily = 'process' | 'mind-map' | 'page-layout';

export interface TemplateNodeDef {
  relativeId: string;     // local ref within the template
  type: string;
  relativePosition: { x: number; y: number };
  size: { width: number; height: number };
  label: string;
  style: Record<string, unknown>;
}

export interface TemplateEdgeDef {
  sourceRelativeId: string;
  targetRelativeId: string;
  sourcePort: string;
  targetPort: string;
  type: string;
  label: string;
  style: Record<string, unknown>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  family: TemplateFamily;
  builtIn: boolean;
  nodes: TemplateNodeDef[];
  edges: TemplateEdgeDef[];
  thumbnail: string;      // data-URI or asset path
  createdAt: number;
  updatedAt: number;
}

export const TEMPLATE_FAMILIES: TemplateFamily[] = [
  'process',
  'mind-map',
  'page-layout',
];
