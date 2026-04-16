import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';
import { AUTH_CONSTANTS } from '../../core/models/profile.model';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    mockAuth = jasmine.createSpyObj('AuthService', ['login', 'register']);
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start in login mode', () => {
    expect(component.isLogin()).toBe(true);
  });

  it('should toggle between login and register', () => {
    component.toggleMode();
    expect(component.isLogin()).toBe(false);
    component.toggleMode();
    expect(component.isLogin()).toBe(true);
  });

  describe('formValid', () => {
    it('should be invalid with empty fields', () => {
      expect(component.formValid()).toBe(false);
    });

    it('should be invalid with short password', () => {
      component.username.set('user');
      component.password.set('short');
      expect(component.formValid()).toBe(false);
    });

    it('should be valid with proper username and password', () => {
      component.username.set('testuser');
      component.password.set('password123');
      expect(component.formValid()).toBe(true);
    });

    it('should require matching passwords in register mode', () => {
      component.mode.set('register');
      component.username.set('user');
      component.password.set('password123');
      component.confirmPassword.set('different');
      expect(component.formValid()).toBe(false);
    });

    it('should be valid when register passwords match', () => {
      component.mode.set('register');
      component.username.set('user');
      component.password.set('password123');
      component.confirmPassword.set('password123');
      expect(component.formValid()).toBe(true);
    });
  });

  describe('submit', () => {
    it('should not submit when form is invalid', async () => {
      await component.submit();
      expect(mockAuth.login).not.toHaveBeenCalled();
      expect(mockAuth.register).not.toHaveBeenCalled();
    });

    it('should call login and navigate on success', async () => {
      component.username.set('testuser');
      component.password.set('password123');
      mockAuth.login.and.returnValue(Promise.resolve({
        success: true,
        profile: { id: 'p1' } as any,
      }));
      await component.submit();
      expect(mockAuth.login).toHaveBeenCalledWith('testuser', 'password123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should show error on login failure', async () => {
      component.username.set('testuser');
      component.password.set('password123');
      mockAuth.login.and.returnValue(Promise.resolve({
        success: false,
        reason: 'not-found',
      }));
      await component.submit();
      expect(component.error()).toContain('not found');
    });

    it('should call register in register mode', async () => {
      component.mode.set('register');
      component.username.set('newuser');
      component.password.set('password123');
      component.confirmPassword.set('password123');
      mockAuth.register.and.returnValue(Promise.resolve({ id: 'p1' } as any));
      await component.submit();
      expect(mockAuth.register).toHaveBeenCalledWith('newuser', 'password123');
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  it('should render login form elements', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent).toContain('Diagram Studio');
    expect(el.querySelector('#username')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
    expect(el.querySelector('button[type="submit"]')).toBeTruthy();
  });

  it('should expose minPasswordLength from constants', () => {
    expect(component.minPasswordLength).toBe(AUTH_CONSTANTS.MIN_PASSWORD_LENGTH);
  });
});
