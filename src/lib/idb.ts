
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Asset, UserProfile } from './types';

const DB_NAME = 'ntblcp-asset-db';
const DB_VERSION = 3; // Incremented version
const ASSET_STORE_NAME = 'assets';
const OFFLINE_ASSET_STORE_NAME = 'offline-assets'; // New store for locked offline assets
const USER_PROFILE_STORE_NAME = 'userProfile';

interface AssetDB extends DBSchema {
  [ASSET_STORE_NAME]: {
    key: string;
    value: Asset;
  };
  [OFFLINE_ASSET_STORE_NAME]: {
    key: string;
    value: Asset;
  };
  [USER_PROFILE_STORE_NAME]: {
    key: string;
    value: UserProfile;
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

// This function ensures the DB is only opened on the client-side.
const getDb = (): Promise<IDBPDatabase<AssetDB>> | null => {
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
                if (oldVersion < 2) {
                  if (!db.objectStoreNames.contains(USER_PROFILE_STORE_NAME)) {
                    db.createObjectStore(USER_PROFILE_STORE_NAME, { keyPath: 'uid' });
                  }
                }
                if (oldVersion < 3) {
                  if (!db.objectStoreNames.contains(OFFLINE_ASSET_STORE_NAME)) {
                    db.createObjectStore(OFFLINE_ASSET_STORE_NAME, { keyPath: 'id' });
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
  if (!dbp) return []; // Don't run on server
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
  if (!dbp) return; // Don't run on server
  try {
    const db = await dbp;
    const tx = db.transaction(ASSET_STORE_NAME, 'readwrite');
    await Promise.all(assets.map(asset => tx.store.put(asset)));
    await tx.done;
  } catch (error) {
    console.error("Failed to save assets to IndexedDB", error);
  }
};

export const clearAssets = async (): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return; // Don't run on server
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


// --- USER PROFILE FUNCTIONS ---

export const saveLocalUserProfile = async (profile: UserProfile): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.put(USER_PROFILE_STORE_NAME, profile);
  } catch (error) {
    console.error("Failed to save user profile to IndexedDB", error);
  }
};

export const getLocalUserProfile = async (uid: string): Promise<UserProfile | undefined> => {
  const dbp = getDb();
  if (!dbp) return undefined;
  try {
    const db = await dbp;
    return await db.get(USER_PROFILE_STORE_NAME, uid);
  } catch (error) {
    console.error("Failed to get user profile from IndexedDB", error);
    return undefined;
  }
}

export const clearLocalUserProfile = async (): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return;
  try {
    const db = await dbp;
    await db.clear(USER_PROFILE_STORE_NAME);
  } catch (error) {
    console.error("Failed to clear user profile from IndexedDB", error);
  }
}
