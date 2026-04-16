import { Injectable } from '@angular/core';

const DB_NAME = 'diagram-studio-db';
const DB_VERSION = 1;

interface StoreSchema {
  name: string;
  keyPath: string;
  indexes: { name: string; keyPath: string; unique: boolean }[];
}

const STORES: StoreSchema[] = [
  {
    name: 'profiles',
    keyPath: 'id',
    indexes: [
      { name: 'username', keyPath: 'username', unique: true },
    ],
  },
  {
    name: 'canvases',
    keyPath: 'id',
    indexes: [
      { name: 'profileId', keyPath: 'profileId', unique: false },
      { name: 'status', keyPath: 'status', unique: false },
    ],
  },
  {
    name: 'nodes',
    keyPath: 'id',
    indexes: [
      { name: 'canvasId', keyPath: 'canvasId', unique: false },
    ],
  },
  {
    name: 'edges',
    keyPath: 'id',
    indexes: [
      { name: 'canvasId', keyPath: 'canvasId', unique: false },
    ],
  },
  {
    name: 'templates',
    keyPath: 'id',
    indexes: [
      { name: 'family', keyPath: 'family', unique: false },
      { name: 'builtIn', keyPath: 'builtIn', unique: false },
    ],
  },
  {
    name: 'notifications',
    keyPath: 'id',
    indexes: [
      { name: 'profileId', keyPath: 'profileId', unique: false },
      { name: 'read', keyPath: 'read', unique: false },
    ],
  },
  {
    name: 'imports',
    keyPath: 'id',
    indexes: [
      { name: 'canvasId', keyPath: 'canvasId', unique: false },
      { name: 'profileId', keyPath: 'profileId', unique: false },
    ],
  },
  {
    name: 'versions',
    keyPath: 'id',
    indexes: [
      { name: 'canvasId', keyPath: 'canvasId', unique: false },
      { name: 'type', keyPath: 'type', unique: false },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class IndexedDbService {
  private db: IDBDatabase | null = null;
  private dbReady: Promise<IDBDatabase>;

  constructor() {
    this.dbReady = this.openDatabase();
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        for (const schema of STORES) {
          if (!db.objectStoreNames.contains(schema.name)) {
            const store = db.createObjectStore(schema.name, { keyPath: schema.keyPath });
            for (const idx of schema.indexes) {
              store.createIndex(idx.name, idx.keyPath, { unique: idx.unique });
            }
          }
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  private async getStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const db = await this.dbReady;
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  async put<T>(storeName: string, record: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllByIndex<T>(storeName: string, indexName: string, value: IDBValidKey): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.getAll(value);
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async count(storeName: string): Promise<number> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async countByIndex(storeName: string, indexName: string, value: IDBValidKey): Promise<number> {
    const store = await this.getStore(storeName, 'readonly');
    const index = store.index(indexName);
    return new Promise((resolve, reject) => {
      const request = index.count(value);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Execute multiple put/delete operations across one or more stores atomically.
   * All operations share a single transaction — if any fails, all are rolled back.
   */
  async transact(
    storeNames: string[],
    ops: { store: string; type: 'put' | 'delete'; key?: string; record?: unknown }[],
  ): Promise<void> {
    const db = await this.dbReady;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);

      for (const op of ops) {
        const store = tx.objectStore(op.store);
        if (op.type === 'put' && op.record !== undefined) {
          store.put(op.record);
        } else if (op.type === 'delete' && op.key !== undefined) {
          store.delete(op.key);
        }
      }
    });
  }
}
