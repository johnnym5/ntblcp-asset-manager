/**
 * @fileOverview Low-level IndexedDB Persistence Adapter.
 * Provides isolated storage for registry data, staging sandbox, and the sync queue.
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Asset, AppSettings, OfflineQueueEntry } from '@/types/domain';

const DB_NAME = 'assetain-core-db';
const DB_VERSION = 1;

interface AssetainSchema extends DBSchema {
  assets: {
    key: string;
    value: Asset;
  };
  sandbox: {
    key: string;
    value: Asset;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  queue: {
    key: string;
    value: OfflineQueueEntry;
    indexes: { 'by-timestamp': number };
  };
}

let dbPromise: Promise<IDBPDatabase<AssetainSchema>> | null = null;

const getDb = () => {
  if (typeof window === 'undefined') return null;
  if (!dbPromise) {
    dbPromise = openDB<AssetainSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('assets')) {
          db.createObjectStore('assets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sandbox')) {
          db.createObjectStore('sandbox', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('queue')) {
          const queueStore = db.createObjectStore('queue', { keyPath: 'id' });
          queueStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

export const storage = {
  // Asset Store
  async getAssets(): Promise<Asset[]> {
    const db = await getDb();
    return db ? db.getAll('assets') : [];
  },
  async saveAssets(assets: Asset[]): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction('assets', 'readwrite');
    await Promise.all(assets.map(a => tx.store.put(a)));
    await tx.done;
  },
  async clearAssets(): Promise<void> {
    const db = await getDb();
    if (db) await db.clear('assets');
  },

  // Sandbox Store (Imports)
  async getSandbox(): Promise<Asset[]> {
    const db = await getDb();
    return db ? db.getAll('sandbox') : [];
  },
  async saveToSandbox(assets: Asset[]): Promise<void> {
    const db = await getDb();
    if (!db) return;
    const tx = db.transaction('sandbox', 'readwrite');
    await Promise.all(assets.map(a => tx.store.put(a)));
    await tx.done;
  },
  async clearSandbox(): Promise<void> {
    const db = await getDb();
    if (db) await db.clear('sandbox');
  },

  // Settings Store
  async getSettings(): Promise<AppSettings | null> {
    const db = await getDb();
    return db ? db.get('settings', 'app-settings') : null;
  },
  async saveSettings(settings: AppSettings): Promise<void> {
    const db = await getDb();
    if (db) await db.put('settings', settings, 'app-settings');
  },

  // Queue Store
  async getQueue(): Promise<OfflineQueueEntry[]> {
    const db = await getDb();
    return db ? db.getAllFromIndex('queue', 'by-timestamp') : [];
  },
  async enqueue(entry: OfflineQueueEntry): Promise<void> {
    const db = await getDb();
    if (db) await db.put('queue', entry);
  },
  async dequeue(id: string): Promise<void> {
    const db = await getDb();
    if (db) await db.delete('queue', id);
  }
};
