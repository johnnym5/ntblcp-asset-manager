
import { openDB, type DBSchema } from 'idb';
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

const dbPromise = openDB<AssetDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  },
});

export const getLocalAssets = async (): Promise<Asset[]> => {
  try {
    const db = await dbPromise;
    return await db.getAll(STORE_NAME);
  } catch (error) {
    console.error("Failed to get local assets from IndexedDB", error);
    return [];
  }
};

export const saveAssets = async (assets: Asset[]): Promise<void> => {
  try {
    const db = await dbPromise;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await Promise.all(assets.map(asset => tx.store.put(asset)));
    await tx.done;
  } catch (error) {
    console.error("Failed to save assets to IndexedDB", error);
    // Optionally, notify the user about storage issues
  }
};

export const clearAssets = async (): Promise<void> => {
  try {
    const db = await dbPromise;
    await db.clear(STORE_NAME);
  } catch (error) {
    console.error("Failed to clear assets from IndexedDB", error);
  }
};

export const db = {
  getLocalAssets,
  saveAssets,
  clearAssets,
};
