
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Asset, AppSettings } from './types';

const DB_NAME = 'assetain-db';
const DB_VERSION = 5; // Incremented version for offline-queue
const ASSET_STORE_NAME = 'assets';
const OFFLINE_ASSET_STORE_NAME = 'offline-assets';
const SETTINGS_STORE_NAME = 'settings';
const QUEUE_STORE_NAME = 'offline-queue';

export interface OfflineOp {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  payload: any;
  timestamp: number;
  status: 'pending' | 'synced' | 'failed';
  error?: string;
}

interface AssetDB extends DBSchema {
  [ASSET_STORE_NAME]: {
    key: string;
    value: Asset;
  };
  [OFFLINE_ASSET_STORE_NAME]: {
    key: string;
    value: Asset;
  };
  [SETTINGS_STORE_NAME]: {
    key: string;
    value: AppSettings;
  };
  [QUEUE_STORE_NAME]: {
    key: string;
    value: OfflineOp;
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

export const getDb = (): Promise<IDBPDatabase<AssetDB>> | null => {
    if (typeof window === 'undefined') {
        return null;
    }
    if (!dbPromise) {
        dbPromise = openDB<AssetDB>(DB_NAME, DB_VERSION, {
            upgrade(db, oldVersion) {
                if (oldVersion < 1) {
                  if (!db.objectStoreNames.contains(ASSET_STORE_NAME)) {
                      db.createObjectStore(ASSET_STORE_NAME, { keyPath: 'id' });
                  }
                }
                if (oldVersion < 3) {
                  if (!db.objectStoreNames.contains(OFFLINE_ASSET_STORE_NAME)) {
                    db.createObjectStore(OFFLINE_ASSET_STORE_NAME, { keyPath: 'id' });
                  }
                }
                if (oldVersion < 4) {
                  if (!db.objectStoreNames.contains(SETTINGS_STORE_NAME)) {
                    db.createObjectStore(SETTINGS_STORE_NAME);
                  }
                }
                if (oldVersion < 5) {
                  if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
                    db.createObjectStore(QUEUE_STORE_NAME, { keyPath: 'id' });
                  }
                }
            },
        });
    }
    return dbPromise;
}

// --- SYNCABLE ASSET FUNCTIONS ---

export const getLocalAssets = async (): Promise<Asset[]> => {
  const dbp = getDb();
  if (!dbp) return [];
  try {
    const db = await dbp;
    return await db.getAll(ASSET_STORE_NAME);
  } catch (error) {
    console.error("Failed to get local assets from IndexedDB", error);
    return [];
  }
};

export const saveAssets = async (assets: Asset[]): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    await tx.store.clear();
    await Promise.all(assets.map(asset => tx.store.put(asset)));
    await tx.done;
  } catch (error) {
    console.error("Failed to save assets to IndexedDB", error);
  }
};

export const clearLocalAssets = async (): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.clear(ASSET_STORE_NAME);
  }
  catch (error) {
    console.error("Failed to clear assets from IndexedDB", error);
  }
};

// --- LOCKED OFFLINE ASSET FUNCTIONS ---

export const getLockedOfflineAssets = async (): Promise<Asset[]> => {
  const dbp = getDb();
  if (!dbp) return [];
  try {
    const db = await dbp;
    return await db.getAll(OFFLINE_ASSET_STORE_NAME);
  } catch (error) {
    console.error("Failed to get locked offline assets from IndexedDB", error);
    return [];
  }
};

export const saveLockedOfflineAssets = async (assets: Asset[]): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    const tx = db.transaction(OFFLINE_ASSET_STORE_NAME, 'readwrite');
    await tx.store.clear();
    await Promise.all(assets.map(asset => tx.store.put(asset)));
    await tx.done;
  } catch (error) {
    console.error("Failed to save locked offline assets to IndexedDB", error);
  }
};

export const clearLockedOfflineAssets = async (): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.clear(OFFLINE_ASSET_STORE_NAME);
  } catch (error) {
    console.error("Failed to clear locked offline assets from IndexedDB", error);
  }
};

// --- App Settings ---
export const getLocalSettings = async (): Promise<AppSettings | null> => {
  const dbp = getDb();
  if (!dbp) return null;
  try {
    const db = await dbp;
    return await db.get(SETTINGS_STORE_NAME, 'app-settings');
  } catch (error) {
    console.error("Failed to get local settings from IndexedDB", error);
    return null;
  }
};

export const saveLocalSettings = async (settings: AppSettings): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.put(SETTINGS_STORE_NAME, settings, 'app-settings');
  } catch (error) {
    console.error("Failed to save settings to IndexedDB", error);
  }
};

// --- Offline Queue ---
export const getQueuedOps = async (): Promise<OfflineOp[]> => {
  const dbp = getDb();
  if (!dbp) return [];
  try {
    const db = await dbp;
    return await db.getAll(QUEUE_STORE_NAME);
  } catch (error) {
    return [];
  }
};

export const saveQueuedOp = async (op: OfflineOp): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.put(QUEUE_STORE_NAME, op);
  } catch (error) {
    console.error("Failed to enqueue operation", error);
  }
};

export const deleteQueuedOp = async (id: string): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.delete(QUEUE_STORE_NAME, id);
  } catch (error) {
    console.error("Failed to remove queued operation", error);
  }
};
