import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, AuthResult } from '../../core/services/auth.service';
import { AUTH_CONSTANTS } from '../../core/models/profile.model';

type LoginMode = 'login' | 'register';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  mode = signal<LoginMode>('login');
  username = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal<string | null>(null);
  loading = signal(false);
  lockedUntilCountdown = signal<string | null>(null);
  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  readonly minPasswordLength = AUTH_CONSTANTS.MIN_PASSWORD_LENGTH;
  readonly isLogin = computed(() => this.mode() === 'login');
  readonly formValid = computed(() => {
    const name = this.username().trim();
    const pass = this.password();
    if (!name || !pass) return false;
    if (!this.isLogin() && pass !== this.confirmPassword()) return false;
    return pass.length >= AUTH_CONSTANTS.MIN_PASSWORD_LENGTH;
  });

  constructor(
    private auth: AuthService,
    private router: Router,
  ) {}

  toggleMode(): void {
    this.mode.set(this.isLogin() ? 'register' : 'login');
    this.error.set(null);
    this.clearCountdown();
  }

  async submit(): Promise<void> {
    if (!this.formValid() || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);

    try {
      if (this.isLogin()) {
        const result: AuthResult = await this.auth.login(
          this.username().trim(),
          this.password(),
        );
        if (result.success) {
          this.router.navigate(['/']);
        } else {
          this.handleLoginFailure(result);
        }
      } else {
        if (this.password() !== this.confirmPassword()) {
          this.error.set('Passwords do not match.');
          return;
        }
        await this.auth.register(this.username().trim(), this.password());
        this.router.navigate(['/']);
      }
    } catch {
      this.error.set('An unexpected error occurred. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  private handleLoginFailure(result: Extract<AuthResult, { success: false }>): void {
    switch (result.reason) {
      case 'not-found':
        this.error.set('Profile not found. Check your username or register a new profile.');
        break;
      case 'wrong-password':
        this.error.set('Incorrect password. Please try again.');
        break;
      case 'locked':
        this.startCountdown(result.lockedUntil!);
        break;
    }
  }

  private startCountdown(lockedUntil: number): void {
    this.clearCountdown();
    const update = () => {
      const remaining = lockedUntil - Date.now();
      if (remaining <= 0) {
        this.lockedUntilCountdown.set(null);
        this.error.set(null);
        this.clearCountdown();
        return;
      }
      const mins = Math.floor(remaining / 60_000);
      const secs = Math.floor((remaining % 60_000) / 1000);
      const label = `${mins}:${secs.toString().padStart(2, '0')}`;
      this.error.set(
        `Too many failed attempts. Try again in ${label}.`,
      );
      this.lockedUntilCountdown.set(label);
    };
    update();
    this.countdownTimer = setInterval(update, 1000);
  }

  private clearCountdown(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.lockedUntilCountdown.set(null);
  }

  get cooldownMinutes(): number {
    return AUTH_CONSTANTS.COOLDOWN_MS / 60_000;
  }
}
