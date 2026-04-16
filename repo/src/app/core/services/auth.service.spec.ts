import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { IndexedDbService } from './indexed-db.service';
import { LocalStorageService } from './local-storage.service';
import { AUTH_CONSTANTS, Profile } from '../models/profile.model';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: jasmine.SpyObj<IndexedDbService>;
  let mockLs: jasmine.SpyObj<LocalStorageService>;

  const fakeProfile: Profile = {
    id: 'p1',
    username: 'testuser',
    displayName: 'Test User',
    passwordHash: '', // will be set per test
    avatarColor: '#4F46E5',
    failedAttempts: 0,
    lockedUntil: null,
    createdAt: Date.now(),
    lastLoginAt: null,
  };

  beforeEach(() => {
    mockDb = jasmine.createSpyObj('IndexedDbService', ['get', 'getAll', 'getAllByIndex', 'put']);
    mockLs = jasmine.createSpyObj('LocalStorageService', ['get', 'set', 'remove', 'has']);

    mockDb.put.and.returnValue(Promise.resolve());
    mockLs.get.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: IndexedDbService, useValue: mockDb },
        { provide: LocalStorageService, useValue: mockLs },
      ],
    });
    service = TestBed.inject(AuthService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
    expect(service.isAuthenticated()).toBe(false);
  });

  describe('login', () => {
    it('should return not-found for unknown username', async () => {
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([]));
      const result = await service.login('nonexistent', 'pass');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('not-found');
    });

    it('should return wrong-password for incorrect password', async () => {
      const profile = { ...fakeProfile, passwordHash: 'wrong-hash', failedAttempts: 0 };
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([profile]));
      const result = await service.login('testuser', 'wrongpass');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('wrong-password');
    });

    it('should increment failedAttempts on wrong password', async () => {
      const profile = { ...fakeProfile, passwordHash: 'wrong-hash', failedAttempts: 0 };
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([profile]));
      await service.login('testuser', 'wrongpass');
      expect(mockDb.put).toHaveBeenCalledWith('profiles', jasmine.objectContaining({ failedAttempts: 1 }));
    });

    it('should lock account after MAX_FAILED_ATTEMPTS', async () => {
      const profile = {
        ...fakeProfile,
        passwordHash: 'wrong-hash',
        failedAttempts: AUTH_CONSTANTS.MAX_FAILED_ATTEMPTS - 1,
      };
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([profile]));
      const result = await service.login('testuser', 'wrongpass');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe('locked');
        expect(result.lockedUntil).toBeDefined();
      }
    });

    it('should return locked for currently-locked profile', async () => {
      const profile = { ...fakeProfile, lockedUntil: Date.now() + 60_000 };
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([profile]));
      const result = await service.login('testuser', 'anything');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('locked');
    });

    it('should clear expired lockout and allow login attempt', async () => {
      const profile = {
        ...fakeProfile,
        passwordHash: 'wrong-hash',
        failedAttempts: 3,
        lockedUntil: Date.now() - 1000, // expired
      };
      mockDb.getAllByIndex.and.returnValue(Promise.resolve([profile]));
      // Will fail on password mismatch but should NOT return 'locked'
      const result = await service.login('testuser', 'wrongpass');
      expect(result.success).toBe(false);
      if (!result.success) expect(result.reason).toBe('wrong-password');
    });
  });

  describe('register', () => {
    it('should create a profile and set authenticated', async () => {
      const profile = await service.register('newuser', 'password123');
      expect(profile.username).toBe('newuser');
      expect(profile.failedAttempts).toBe(0);
      expect(service.isAuthenticated()).toBe(true);
      expect(mockDb.put).toHaveBeenCalledWith('profiles', jasmine.objectContaining({ username: 'newuser' }));
    });

    it('should store session in localStorage', async () => {
      await service.register('newuser', 'password123');
      expect(mockLs.set).toHaveBeenCalledWith('session', jasmine.objectContaining({ profileId: jasmine.any(String) }));
    });
  });

  describe('logout', () => {
    it('should clear profile and session', async () => {
      await service.register('user', 'password123');
      expect(service.isAuthenticated()).toBe(true);
      service.logout();
      expect(service.isAuthenticated()).toBe(false);
      expect(mockLs.remove).toHaveBeenCalledWith('session');
    });
  });

  describe('session expiry', () => {
    it('should report expired when no session exists', () => {
      mockLs.get.and.returnValue(null);
      expect(service.isSessionExpired()).toBe(true);
    });

    it('should report expired when session is too old', () => {
      mockLs.get.and.returnValue({
        profileId: 'p1',
        lastActivity: Date.now() - AUTH_CONSTANTS.INACTIVITY_TIMEOUT_MS - 1000,
      });
      expect(service.isSessionExpired()).toBe(true);
    });

    it('should report not expired for recent session', () => {
      mockLs.get.and.returnValue({
        profileId: 'p1',
        lastActivity: Date.now() - 1000,
      });
      expect(service.isSessionExpired()).toBe(false);
    });
  });
});
