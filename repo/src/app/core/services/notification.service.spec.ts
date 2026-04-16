import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { IndexedDbService } from './indexed-db.service';
import { LocalStorageService } from './local-storage.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDb: jasmine.SpyObj<IndexedDbService>;
  let mockLs: jasmine.SpyObj<LocalStorageService>;

  beforeEach(() => {
    mockDb = jasmine.createSpyObj('IndexedDbService', ['put', 'getAll', 'getAllByIndex']);
    mockLs = jasmine.createSpyObj('LocalStorageService', ['get', 'set']);
    mockDb.put.and.returnValue(Promise.resolve());
    mockDb.getAllByIndex.and.returnValue(Promise.resolve([]));
    mockLs.get.and.returnValue(null);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: IndexedDbService, useValue: mockDb },
        { provide: LocalStorageService, useValue: mockLs },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('should create with zero unread', () => {
    expect(service.unreadCount()).toBe(0);
  });

  describe('send', () => {
    it('should create a notification and increment unread count', async () => {
      await service.send('p1', 'system', 'Title', 'Message');
      expect(service.notifications().length).toBe(1);
      expect(service.unreadCount()).toBe(1);
    });

    it('should resolve template variables in message', async () => {
      const n = await service.send('p1', 'publish', 'Published', 'Canvas "{{name}}" v{{ver}}', { name: 'Test', ver: '3' });
      expect(n.message).toBe('Canvas "Test" v3');
    });

    it('should preserve unresolved template tokens', async () => {
      const n = await service.send('p1', 'system', 'T', 'Hello {{unknown}}', {});
      expect(n.message).toBe('Hello {{unknown}}');
    });

    it('should persist to IndexedDB', async () => {
      await service.send('p1', 'system', 'T', 'M');
      expect(mockDb.put).toHaveBeenCalledWith('notifications', jasmine.objectContaining({ type: 'system' }));
    });
  });

  describe('markRead', () => {
    it('should mark notification as read and decrement unread', async () => {
      const n = await service.send('p1', 'system', 'T', 'M');
      expect(service.unreadCount()).toBe(1);
      await service.markRead(n.id);
      expect(service.unreadCount()).toBe(0);
      expect(service.notifications()[0].read).toBe(true);
    });
  });

  describe('dismiss', () => {
    it('should mark notification as dismissed', async () => {
      const n = await service.send('p1', 'system', 'T', 'M');
      await service.dismiss(n.id);
      expect(service.notifications()[0].dismissed).toBe(true);
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('DND', () => {
    it('should report DND inactive by default', () => {
      expect(service.isDndActive()).toBe(false);
    });

    it('should allow system notifications during DND', () => {
      expect(service.shouldShow('system')).toBe(true);
    });

    it('should allow approval-request during DND', () => {
      expect(service.shouldShow('approval-request')).toBe(true);
    });

    it('should save DND settings to localStorage', () => {
      service.updateDnd({ enabled: true, startHour: 22, endHour: 7 });
      expect(mockLs.set).toHaveBeenCalledWith('dnd_settings', jasmine.objectContaining({ enabled: true }));
    });
  });
});
