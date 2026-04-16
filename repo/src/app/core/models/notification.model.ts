export type NotificationType =
  | 'publish'
  | 'approval-request'
  | 'approval-granted'
  | 'approval-denied'
  | 'rollback'
  | 'import-complete'
  | 'import-error'
  | 'autosave'
  | 'system';

export interface Notification {
  id: string;
  profileId: string;
  type: NotificationType;
  title: string;
  message: string;          // supports {{variable}} template tokens
  templateVars: Record<string, string>;
  read: boolean;
  dismissed: boolean;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  readAt: number | null;
}

export interface DoNotDisturbSettings {
  enabled: boolean;
  startHour: number;   // 0–23
  endHour: number;     // 0–23
}
