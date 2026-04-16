import { TestBed } from '@angular/core/testing';
import { HistoryService, StatePatch } from './history.service';
import { VERSION_LIMITS } from '../models/version.model';

describe('HistoryService', () => {
  let service: HistoryService;

  const patch = (id = 'n1'): StatePatch[] => [
    { store: 'nodes', id, before: { id, label: 'old' }, after: { id, label: 'new' } },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [HistoryService] });
    service = TestBed.inject(HistoryService);
  });

  it('should start empty', () => {
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(false);
    expect(service.entries().length).toBe(0);
  });

  it('should push entries and enable undo', () => {
    service.push('test', 'Test action', patch());
    expect(service.canUndo()).toBe(true);
    expect(service.canRedo()).toBe(false);
    expect(service.entries().length).toBe(1);
  });

  it('should not push entries with empty patches', () => {
    service.push('test', 'Empty', []);
    expect(service.entries().length).toBe(0);
  });

  it('should undo and return patches', () => {
    service.push('test', 'Action', patch());
    const patches = service.undo();
    expect(patches).toBeTruthy();
    expect(patches!.length).toBe(1);
    expect(service.canUndo()).toBe(false);
    expect(service.canRedo()).toBe(true);
  });

  it('should redo after undo', () => {
    service.push('test', 'Action', patch());
    service.undo();
    const patches = service.redo();
    expect(patches).toBeTruthy();
    expect(service.canUndo()).toBe(true);
    expect(service.canRedo()).toBe(false);
  });

  it('should return null for undo when nothing to undo', () => {
    expect(service.undo()).toBeNull();
  });

  it('should return null for redo when nothing to redo', () => {
    service.push('test', 'A', patch());
    expect(service.redo()).toBeNull();
  });

  it('should truncate redo stack when new action is pushed after undo', () => {
    service.push('test', 'A', patch('n1'));
    service.push('test', 'B', patch('n2'));
    service.undo(); // undo B
    service.push('test', 'C', patch('n3')); // should truncate B from redo
    expect(service.entries().length).toBe(2); // A + C
    expect(service.canRedo()).toBe(false);
  });

  it('should enforce MAX_UNDO_STEPS limit', () => {
    for (let i = 0; i < VERSION_LIMITS.MAX_UNDO_STEPS + 10; i++) {
      service.push('test', `Action ${i}`, patch(`n${i}`));
    }
    expect(service.entries().length).toBe(VERSION_LIMITS.MAX_UNDO_STEPS);
  });

  it('should clear all state', () => {
    service.push('test', 'A', patch());
    service.clear();
    expect(service.entries().length).toBe(0);
    expect(service.canUndo()).toBe(false);
    expect(service.pointer()).toBe(-1);
  });

  it('should track visibleEntries correctly', () => {
    service.push('test', 'A', patch('n1'));
    service.push('test', 'B', patch('n2'));
    service.push('test', 'C', patch('n3'));
    expect(service.visibleEntries().length).toBe(3);
    service.undo(); // undo C
    expect(service.visibleEntries().length).toBe(2);
  });
});
