
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, AppSettings, SheetDefinition } from '@/lib/types';
import { HEADER_DEFINITIONS, TARGET_SHEETS } from './constants';

// --- Assets ---

/**
 * Fetches all asset documents from Firestore once.
 * @returns A promise that resolves with an array of assets.
 */
export async function getAssets(): Promise<Asset[]> {
  const assetsCollectionRef = collection(db, 'assets');
  const q = query(assetsCollectionRef);
  const querySnapshot = await getDocs(q);
  const fetchedAssets: Asset[] = [];
  querySnapshot.forEach((doc) => {
    fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
  });
  return fetchedAssets;
}

/**
 * Creates or updates an asset document in Firestore.
 * @param asset The asset object to save.
 */
export async function updateAsset(asset: Asset) {
  const assetRef = doc(db, 'assets', asset.id);
  await setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true });
}

/**
 * Deletes an asset document from Firestore.
 * @param assetId The ID of the asset to delete.
 */
export async function deleteAsset(assetId: string) {
  const assetRef = doc(db, 'assets', assetId);
  await deleteDoc(assetRef);
}


/**
 * Writes a large array of assets to Firestore in batches of 500.
 * @param assets The array of assets to write.
 */
export async function batchSetAssets(assets: Asset[]) {
    const assetsCollectionRef = collection(db, 'assets');
    const batchSize = 500;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assets.slice(i, i + batchSize);
        chunk.forEach((asset) => {
            const docRef = doc(assetsCollectionRef, asset.id);
            // Ensure lastModified is set on batch writes
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        await batch.commit();
    }
}


/**
 * Deletes an array of assets from Firestore in batches.
 * @param assetIds The array of asset IDs to delete.
 */
export async function batchDeleteAssets(assetIds: string[]) {
    const batchSize = 500;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach((assetId) => {
            const docRef = doc(db, 'assets', assetId);
            batch.delete(docRef);
        });
        await batch.commit();
    }
}

// --- Global App Settings ---

const SETTINGS_DOC_ID = 'global';

// Convert initial constants to the new AppSettings format
const initialSheetDefinitions: Record<string, SheetDefinition> = {};
TARGET_SHEETS.forEach(sheetName => {
  initialSheetDefinitions[sheetName] = {
    name: sheetName,
    headers: HEADER_DEFINITIONS[sheetName] || [],
    displayFields: ['sn', 'description', 'assetIdCode', 'assignee', 'verifiedStatus', 'lastModified'],
  };
});

const defaultAppSettings: AppSettings = {
  lockAssetList: true,
  autoSyncEnabled: true,
  enabledSheets: [...TARGET_SHEETS],
  sheetDefinitions: initialSheetDefinitions,
};

/**
 * Fetches the global application settings from Firestore.
 * @returns A promise that resolves with the AppSettings object or null if not found.
 */
export async function getSettings(): Promise<AppSettings> {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Merge with defaults to ensure all keys are present
        return { ...defaultAppSettings, ...data } as AppSettings;
    } else {
        // If no settings exist, create them with default values
        await updateSettings(defaultAppSettings);
        return defaultAppSettings;
    }
}

/**
 * Creates or updates the global application settings in Firestore.
 * @param settings The partial or full settings object to save.
 */
export async function updateSettings(settings: Partial<AppSettings>) {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    await setDoc(settingsRef, settings, { merge: true });
}

/**
 * Listens for real-time updates to the global settings document.
 * @param callback The function to call with the new settings data.
 * @returns An unsubscribe function to stop listening.
 */
export function listenToSettings(callback: (settings: AppSettings | null) => void) {
    const settingsRef = doc(db, 'settings', SETTINGS_DOC_ID);
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            callback({ ...defaultAppSettings, ...doc.data() } as AppSettings);
        } else {
            // If the document is deleted, we can fetch/create defaults.
            getSettings().then(settings => callback(settings));
        }
    });
    return unsubscribe;
}
