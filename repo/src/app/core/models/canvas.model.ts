export type CanvasStatus = 'draft' | 'published';

export interface CanvasSettings {
  gridSize: number;       // default 8
  snapToGrid: boolean;
  zoomLevel: number;      // 25–400, default 100
  showAlignmentGuides: boolean;
}

export interface ApprovalSettings {
  enabled: boolean;
  reviewerProfileId: string | null; // the profile designated as reviewer
}

export interface Canvas {
  id: string;
  name: string;
  description: string;
  profileId: string;
  status: CanvasStatus;
  settings: CanvasSettings;
  approval: ApprovalSettings;
  publishedVersionId: string | null; // points to the published Version id
  createdAt: number;
  updatedAt: number;
}

export const CANVAS_DEFAULTS: CanvasSettings = {
  gridSize: 8,
  snapToGrid: true,
  zoomLevel: 100,
  showAlignmentGuides: true,
};

export const APPROVAL_DEFAULTS: ApprovalSettings = {
  enabled: false,
  reviewerProfileId: null,
};

export const CANVAS_LIMITS = {
  MAX_NODES: 500,
  MAX_CONNECTIONS: 1000,
} as const;
