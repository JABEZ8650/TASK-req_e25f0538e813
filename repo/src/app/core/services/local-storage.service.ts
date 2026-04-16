import { Injectable } from '@angular/core';

const KEY_PREFIX = 'ds_';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {

  get<T>(key: string): T | null {
    const raw = localStorage.getItem(KEY_PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    localStorage.setItem(KEY_PREFIX + key, JSON.stringify(value));
  }

  remove(key: string): void {
    localStorage.removeItem(KEY_PREFIX + key);
  }

  has(key: string): boolean {
    return localStorage.getItem(KEY_PREFIX + key) !== null;
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  }
}
