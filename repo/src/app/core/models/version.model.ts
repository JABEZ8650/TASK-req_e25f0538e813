export type VersionType = 'autosave' | 'manual' | 'published';

export interface CanvasSnapshot {
  canvasData: Record<string, unknown>;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
}

export interface ReviewerConfirmation {
  reviewerProfileId: string;
  reviewerDisplayName: string;
  action: 'approve-publish' | 'approve-rollback' | 'deny';
  confirmedAt: number;
  comment: string;
}

export interface Version {
  id: string;
  canvasId: string;
  versionNumber: number;
  type: VersionType;
  snapshot: CanvasSnapshot;
  createdAt: number;
  createdBy: string;     // profileId
  reviewerConfirmation: ReviewerConfirmation | null;
}

export const VERSION_LIMITS = {
  MAX_AUTOSAVE_VERSIONS: 30,
  AUTOSAVE_INTERVAL_MS: 10_000, // 10 seconds
  MAX_UNDO_STEPS: 200,
} as const;
