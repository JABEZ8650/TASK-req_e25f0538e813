import { NodeType, NodeStyle, Size } from '../models';

export interface NodeTypeConfig {
  label: string;
  defaultSize: Size;
  style: {
    fillColor: string;
    strokeColor: string;
    borderRadius: number;
  };
}

export const NODE_TYPE_CONFIGS: Record<NodeType, NodeTypeConfig> = {
  process: {
    label: 'Process',
    defaultSize: { width: 160, height: 80 },
    style: { fillColor: '#1e3a5f', strokeColor: '#3b82f6', borderRadius: 6 },
  },
  decision: {
    label: 'Decision',
    defaultSize: { width: 140, height: 80 },
    style: { fillColor: '#3b1f54', strokeColor: '#a855f7', borderRadius: 6 },
  },
  start: {
    label: 'Start',
    defaultSize: { width: 120, height: 50 },
    style: { fillColor: '#1a3a2a', strokeColor: '#22c55e', borderRadius: 20 },
  },
  end: {
    label: 'End',
    defaultSize: { width: 120, height: 50 },
    style: { fillColor: '#3b1a1a', strokeColor: '#ef4444', borderRadius: 20 },
  },
  subprocess: {
    label: 'Subprocess',
    defaultSize: { width: 160, height: 80 },
    style: { fillColor: '#1e3a5f', strokeColor: '#60a5fa', borderRadius: 6 },
  },
  data: {
    label: 'Data',
    defaultSize: { width: 140, height: 70 },
    style: { fillColor: '#2a3a1a', strokeColor: '#eab308', borderRadius: 4 },
  },
  connector: {
    label: 'Connector',
    defaultSize: { width: 40, height: 40 },
    style: { fillColor: '#1a2a3a', strokeColor: '#06b6d4', borderRadius: 20 },
  },
  text: {
    label: 'Text',
    defaultSize: { width: 160, height: 40 },
    style: { fillColor: 'transparent', strokeColor: 'transparent', borderRadius: 0 },
  },
  group: {
    label: 'Group',
    defaultSize: { width: 300, height: 200 },
    style: { fillColor: 'rgba(30,41,59,0.5)', strokeColor: '#475569', borderRadius: 8 },
  },
  custom: {
    label: 'Custom',
    defaultSize: { width: 160, height: 80 },
    style: { fillColor: '#1e293b', strokeColor: '#64748b', borderRadius: 6 },
  },
};

export function createNodeStyle(type: NodeType): NodeStyle {
  const cfg = NODE_TYPE_CONFIGS[type].style;
  return {
    fillColor: cfg.fillColor,
    strokeColor: cfg.strokeColor,
    strokeWidth: 1.5,
    borderRadius: cfg.borderRadius,
    fontSize: 13,
    fontColor: '#e2e8f0',
    opacity: 1,
  };
}

export function createDefaultSize(type: NodeType): Size {
  return { ...NODE_TYPE_CONFIGS[type].defaultSize };
}
