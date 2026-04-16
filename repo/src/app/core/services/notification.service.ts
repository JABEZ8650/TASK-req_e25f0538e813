import { Injectable, signal, computed } from '@angular/core';
import {
  Notification, NotificationType, DoNotDisturbSettings,
} from '../models/notification.model';
import { IndexedDbService } from './indexed-db.service';
import { LocalStorageService } from './local-storage.service';

const DND_KEY = 'dnd_settings';
const MAX_RETRIES = 3;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<Notification[]>([]);
  readonly notifications = this._notifications.asReadonly();

  readonly unreadCount = computed(
    () => this._notifications().filter(n => !n.read && !n.dismissed).length,
  );

  private readonly _dnd = signal<DoNotDisturbSettings>({
    enabled: false, startHour: 22, endHour: 7,
  });
  readonly dndSettings = this._dnd.asReadonly();

  constructor(
    private db: IndexedDbService,
    private ls: LocalStorageService,
  ) {
    const saved = this.ls.get<DoNotDisturbSettings>(DND_KEY);
    if (saved) this._dnd.set(saved);
  }

  // ────────────────── Load ──────────────────

  async loadForProfile(profileId: string): Promise<void> {
    const all = await this.db.getAllByIndex<Notification>('notifications', 'profileId', profileId);
    this._notifications.set(all.sort((a, b) => b.createdAt - a.createdAt));
    this.retryPending();
  }

  // ────────────────── Create / Queue ──────────────────

  /**
   * Queue a notification. Template variables in `message` are resolved
   * from `templateVars` (e.g. "Canvas {{canvasName}} published").
   * If DND is active for non-critical types, the notification is still
   * created but stays in the queue until DND ends.
   */
  async send(
    profileId: string,
    type: NotificationType,
    title: string,
    message: string,
    templateVars: Record<string, string> = {},
  ): Promise<Notification> {
    const resolved = this.resolveTemplate(message, templateVars);

    const notification: Notification = {
      id: crypto.randomUUID(),
      profileId,
      type,
      title,
      message: resolved,
      templateVars,
      read: false,
      dismissed: false,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: Date.now(),
      readAt: null,
    };

    await this.db.put('notifications', notification);
    this._notifications.update(list => [notification, ...list]);
    return notification;
  }

  // ────────────────── Template resolution ──────────────────

  private resolveTemplate(message: string, vars: Record<string, string>): string {
    return message.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  // ────────────────── Read / Dismiss ──────────────────

  async markRead(id: string): Promise<void> {
    await this.updateNotification(id, { read: true, readAt: Date.now() });
  }

  async markAllRead(profileId: string): Promise<void> {
    const unread = this._notifications().filter(n => !n.read && n.profileId === profileId);
    for (const n of unread) {
      await this.updateNotification(n.id, { read: true, readAt: Date.now() });
    }
  }

  async dismiss(id: string): Promise<void> {
    await this.updateNotification(id, { dismissed: true });
  }

  private async updateNotification(id: string, changes: Partial<Notification>): Promise<void> {
    this._notifications.update(list =>
      list.map(n => n.id === id ? { ...n, ...changes } : n),
    );
    const updated = this._notifications().find(n => n.id === id);
    if (updated) await this.db.put('notifications', updated);
  }

  // ────────────────── Retry ──────────────────

  private retryPending(): void {
    // "Delivery" in a local-only app means the notification record exists and
    // is visible. Retry logic applies to notifications that failed to persist.
    // Since IndexedDB writes are synchronous from the user's perspective,
    // retries here re-attempt any that have retryCount > 0 but aren't dismissed.
    const pending = this._notifications().filter(
      n => n.retryCount > 0 && n.retryCount < n.maxRetries && !n.dismissed,
    );
    for (const n of pending) {
      this.db.put('notifications', n).catch(() => {
        // Increment retry count
        this.updateNotification(n.id, { retryCount: n.retryCount + 1 });
      });
    }
  }

  // ────────────────── Do Not Disturb ──────────────────

  isDndActive(): boolean {
    const dnd = this._dnd();
    if (!dnd.enabled) return false;
    const hour = new Date().getHours();
    if (dnd.startHour <= dnd.endHour) {
      return hour >= dnd.startHour && hour < dnd.endHour;
    }
    // Wraps midnight (e.g. 22–7)
    return hour >= dnd.startHour || hour < dnd.endHour;
  }

  /** Returns true if the notification should be shown right now. */
  shouldShow(type: NotificationType): boolean {
    if (!this.isDndActive()) return true;
    // System and approval notifications always show even during DND
    return type === 'system' || type === 'approval-request';
  }

  updateDnd(settings: DoNotDisturbSettings): void {
    this._dnd.set(settings);
    this.ls.set(DND_KEY, settings);
  }
}
