export type ImportSource = 'json' | 'csv' | 'html-snippet';
export type ImportStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface ImportMetadataField {
  key: string;
  value: string;
  normalized: boolean;     // false if preserved but flagged
  originalValue?: string;  // kept when normalization changes the value
}

export interface ImportRecord {
  id: string;
  canvasId: string;
  profileId: string;
  source: ImportSource;
  originalFileName: string;
  rowCount: number;
  status: ImportStatus;
  metadata: ImportMetadataField[];
  errorMessage: string | null;
  importedAt: number;
  createdAt: number;
}

export const IMPORT_LIMITS = {
  MAX_ROWS_PER_IMPORT: 1000,
} as const;
