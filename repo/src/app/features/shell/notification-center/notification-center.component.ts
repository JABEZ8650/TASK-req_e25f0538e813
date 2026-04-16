import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../core/services/auth.service';
import { Notification, DoNotDisturbSettings } from '../../../core/models/notification.model';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent implements OnInit {
  dndEnabled = false;
  dndStart = 22;
  dndEnd = 7;
  showSettings = false;

  constructor(
    protected notifSvc: NotificationService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    const profile = this.auth.profile();
    if (profile) {
      this.notifSvc.loadForProfile(profile.id);
    }
    const dnd = this.notifSvc.dndSettings();
    this.dndEnabled = dnd.enabled;
    this.dndStart = dnd.startHour;
    this.dndEnd = dnd.endHour;
  }

  get visibleNotifications(): Notification[] {
    return this.notifSvc.notifications().filter(n => !n.dismissed);
  }

  markRead(id: string): void {
    this.notifSvc.markRead(id);
  }

  dismiss(id: string): void {
    this.notifSvc.dismiss(id);
  }

  markAllRead(): void {
    const profile = this.auth.profile();
    if (profile) this.notifSvc.markAllRead(profile.id);
  }

  saveDnd(): void {
    this.notifSvc.updateDnd({
      enabled: this.dndEnabled,
      startHour: this.dndStart,
      endHour: this.dndEnd,
    });
  }

  formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  typeIcon(type: string): string {
    switch (type) {
      case 'publish': return '📤';
      case 'approval-request': return '🔔';
      case 'approval-granted': return '✅';
      case 'approval-denied': return '❌';
      case 'rollback': return '↩';
      case 'import-complete': return '📥';
      case 'import-error': return '⚠';
      case 'autosave': return '💾';
      default: return 'ℹ';
    }
  }
}
