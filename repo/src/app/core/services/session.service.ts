import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

const ACTIVITY_CHECK_INTERVAL_MS = 60_000; // check every minute

@Injectable({ providedIn: 'root' })
export class SessionService implements OnDestroy {
  private checkTimer: ReturnType<typeof setInterval> | null = null;
  private activityListeners: (() => void)[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private ngZone: NgZone,
  ) {}

  /** Start tracking user activity and periodic session checks. */
  startTracking(): void {
    this.stopTracking();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => this.auth.touchActivity();

    for (const event of events) {
      document.addEventListener(event, handler, { passive: true });
      this.activityListeners.push(() => document.removeEventListener(event, handler));
    }

    // Run the interval outside Angular zone to avoid triggering change detection
    this.ngZone.runOutsideAngular(() => {
      this.checkTimer = setInterval(() => {
        if (this.auth.isSessionExpired()) {
          this.ngZone.run(() => this.expireSession());
        }
      }, ACTIVITY_CHECK_INTERVAL_MS);
    });
  }

  stopTracking(): void {
    for (const cleanup of this.activityListeners) {
      cleanup();
    }
    this.activityListeners = [];

    if (this.checkTimer !== null) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
  }

  private expireSession(): void {
    this.auth.logout();
    this.stopTracking();
    this.router.navigate(['/login']);
  }

  ngOnDestroy(): void {
    this.stopTracking();
  }
}
