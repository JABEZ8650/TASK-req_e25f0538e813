import { Injectable, signal, computed } from '@angular/core';
import { Profile, SessionState, AUTH_CONSTANTS } from '../models/profile.model';
import { IndexedDbService } from './indexed-db.service';
import { LocalStorageService } from './local-storage.service';

const SESSION_KEY = 'session';
const AVATAR_COLORS = [
  '#4F46E5', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#D97706', '#16A34A', '#0891B2',
];

export type AuthResult =
  | { success: true; profile: Profile }
  | { success: false; reason: 'not-found' | 'wrong-password' | 'locked'; lockedUntil?: number };

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentProfile = signal<Profile | null>(null);
  readonly profile = this.currentProfile.asReadonly();
  readonly isAuthenticated = computed(() => this.currentProfile() !== null);

  constructor(
    private db: IndexedDbService,
    private ls: LocalStorageService,
  ) {}

  /** Restore session from LocalStorage on app startup. */
  async restoreSession(): Promise<boolean> {
    const session = this.ls.get<SessionState>(SESSION_KEY);
    if (!session) return false;

    const elapsed = Date.now() - session.lastActivity;
    if (elapsed > AUTH_CONSTANTS.INACTIVITY_TIMEOUT_MS) {
      this.ls.remove(SESSION_KEY);
      return false;
    }

    const profile = await this.db.get<Profile>('profiles', session.profileId);
    if (!profile) {
      this.ls.remove(SESSION_KEY);
      return false;
    }

    this.currentProfile.set(profile);
    this.touchActivity();
    return true;
  }

  async login(username: string, password: string): Promise<AuthResult> {
    const profiles = await this.db.getAllByIndex<Profile>('profiles', 'username', username.toLowerCase());
    const profile = profiles[0];

    if (!profile) {
      return { success: false, reason: 'not-found' };
    }

    // Check lockout
    if (profile.lockedUntil && Date.now() < profile.lockedUntil) {
      return { success: false, reason: 'locked', lockedUntil: profile.lockedUntil };
    }

    // Clear expired lockout
    if (profile.lockedUntil && Date.now() >= profile.lockedUntil) {
      profile.lockedUntil = null;
      profile.failedAttempts = 0;
    }

    const hash = await this.hashPassword(password);
    if (hash !== profile.passwordHash) {
      profile.failedAttempts++;
      if (profile.failedAttempts >= AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS) {
        profile.lockedUntil = Date.now() + AUTH_CONSTANTS.COOLDOWN_MS;
      }
      await this.db.put('profiles', profile);
      if (profile.lockedUntil) {
        return { success: false, reason: 'locked', lockedUntil: profile.lockedUntil };
      }
      return { success: false, reason: 'wrong-password' };
    }

    // Successful login
    profile.failedAttempts = 0;
    profile.lockedUntil = null;
    profile.lastLoginAt = Date.now();
    await this.db.put('profiles', profile);

    this.currentProfile.set(profile);
    this.ls.set<SessionState>(SESSION_KEY, {
      profileId: profile.id,
      lastActivity: Date.now(),
    });

    return { success: true, profile };
  }

  async register(username: string, password: string, displayName?: string): Promise<Profile> {
    const id = crypto.randomUUID();
    const hash = await this.hashPassword(password);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const profile: Profile = {
      id,
      username: username.toLowerCase(),
      displayName: displayName || username,
      passwordHash: hash,
      avatarColor: color,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    await this.db.put('profiles', profile);
    this.currentProfile.set(profile);
    this.ls.set<SessionState>(SESSION_KEY, {
      profileId: profile.id,
      lastActivity: Date.now(),
    });

    return profile;
  }

  logout(): void {
    this.currentProfile.set(null);
    this.ls.remove(SESSION_KEY);
  }

  /** Update last-activity timestamp. Called by SessionService on user interaction. */
  touchActivity(): void {
    const session = this.ls.get<SessionState>(SESSION_KEY);
    if (session) {
      session.lastActivity = Date.now();
      this.ls.set(SESSION_KEY, session);
    }
  }

  /** Check whether the session has expired due to inactivity. */
  isSessionExpired(): boolean {
    const session = this.ls.get<SessionState>(SESSION_KEY);
    if (!session) return true;
    return Date.now() - session.lastActivity > AUTH_CONSTANTS.INACTIVITY_TIMEOUT_MS;
  }

  async getProfiles(): Promise<Profile[]> {
    return this.db.getAll<Profile>('profiles');
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    const array = Array.from(new Uint8Array(buffer));
    return array.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}
