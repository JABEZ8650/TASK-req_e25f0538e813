import { Injectable, signal, computed } from '@angular/core';
import { VERSION_LIMITS } from '../models/version.model';

export interface StatePatch {
  store: 'nodes' | 'edges';
  id: string;
  before: unknown | null; // null = record didn't exist (was created)
  after: unknown | null;  // null = record was deleted
}

export interface HistoryEntry {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  patches: StatePatch[];
}

@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly _entries = signal<HistoryEntry[]>([]);
  private readonly _pointer = signal(-1); // points to the current position

  readonly entries = this._entries.asReadonly();
  readonly pointer = this._pointer.asReadonly();
  readonly canUndo = computed(() => this._pointer() >= 0);
  readonly canRedo = computed(() => this._pointer() < this._entries().length - 1);

  /** The visible portion: entries up to and including pointer, for display. */
  readonly visibleEntries = computed(() => this._entries().slice(0, this._pointer() + 1));

  /** Push a new action. Truncates any redo stack beyond the pointer. */
  push(type: string, description: string, patches: StatePatch[]): void {
    if (patches.length === 0) return;

    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      type,
      description,
      timestamp: Date.now(),
      patches,
    };

    const current = this._entries().slice(0, this._pointer() + 1);
    current.push(entry);

    // Trim to max size
    if (current.length > VERSION_LIMITS.MAX_UNDO_STEPS) {
      current.splice(0, current.length - VERSION_LIMITS.MAX_UNDO_STEPS);
    }

    this._entries.set(current);
    this._pointer.set(current.length - 1);
  }

  /** Move pointer back and return the patches to apply (before-states). */
  undo(): StatePatch[] | null {
    if (!this.canUndo()) return null;
    const entry = this._entries()[this._pointer()];
    this._pointer.update(p => p - 1);
    return entry.patches;
  }

  /** Move pointer forward and return the patches to apply (after-states). */
  redo(): StatePatch[] | null {
    if (!this.canRedo()) return null;
    this._pointer.update(p => p + 1);
    const entry = this._entries()[this._pointer()];
    return entry.patches;
  }

  /** Clear all history (e.g. when switching canvases). */
  clear(): void {
    this._entries.set([]);
    this._pointer.set(-1);
  }
}
