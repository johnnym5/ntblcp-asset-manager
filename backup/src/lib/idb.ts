
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Asset } from './types';

const DB_NAME = 'ntblcp-asset-db';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

interface AssetDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: Asset;
  };
}

let dbPromise: Promise<IDBPDatabase<AssetDB>> | null = null;

// This function ensures the DB is only opened on the client-side.
const getDb = () => {
    // If we're on the server, return null.
    if (typeof window === 'undefined') {
        return null;
    }
    // If the promise hasn't been created yet, create it.
    if (!dbPromise) {
        dbPromise = openDB<AssetDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            },
        });
    }
    // Return the promise.
    return dbPromise;
}


export const getLocalAssets = async (): Promise<Asset[]> => {
  const dbp = getDb();
  if (!dbp) return []; // Don't run on server
  try {
    const db = await dbp;
    return await db.getAll(STORE_NAME);
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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(assets.map(asset => tx.store.put(asset)));
    await tx.done;
  } catch (error) {
    console.error("Failed to save assets to IndexedDB", error);
    // Optionally, notify the user about storage issues
  }
};

export const clearAssets = async (): Promise<void> => {
  const dbp = getDb();
  if (!dbp) return; // Don't run on server
  try {
    const db = await dbp;
    await db.clear(STORE_NAME);
  }
  catch (error) {
    console.error("Failed to clear assets from IndexedDB", error);
  }
};
