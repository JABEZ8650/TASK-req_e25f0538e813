import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  let mockAuth: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  beforeEach(() => {
    mockAuth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'restoreSession'], {
      isAuthenticated: jasmine.createSpy().and.returnValue(false),
    });
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree']);
    mockRouter.createUrlTree.and.returnValue({} as UrlTree);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuth },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  const run = () => TestBed.runInInjectionContext(() =>
    authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
  );

  it('should allow access when authenticated', async () => {
    mockAuth.isAuthenticated.and.returnValue(true);
    const result = await run();
    expect(result).toBe(true);
  });

  it('should try to restore session when not authenticated', async () => {
    mockAuth.isAuthenticated.and.returnValue(false);
    mockAuth.restoreSession.and.returnValue(Promise.resolve(true));
    const result = await run();
    expect(mockAuth.restoreSession).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('should redirect to login when session restore fails', async () => {
    mockAuth.isAuthenticated.and.returnValue(false);
    mockAuth.restoreSession.and.returnValue(Promise.resolve(false));
    const result = await run();
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/login']);
    expect(result).toEqual(jasmine.any(Object)); // UrlTree
  });
});
