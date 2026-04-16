export interface Profile {
  id: string;
  username: string;
  displayName: string;
  passwordHash: string;
  avatarColor: string;
  failedAttempts: number;
  lockedUntil: number | null; // epoch ms; null = not locked
  createdAt: number;
  lastLoginAt: number | null;
}

export interface SessionState {
  profileId: string;
  lastActivity: number; // epoch ms
}

export const AUTH_CONSTANTS = {
  MAX_FAILED_ATTEMPTS: 3,
  COOLDOWN_MS: 15 * 60 * 1000, // 15 minutes
  INACTIVITY_TIMEOUT_MS: 8 * 60 * 60 * 1000, // 8 hours
  MIN_PASSWORD_LENGTH: 8,
} as const;
