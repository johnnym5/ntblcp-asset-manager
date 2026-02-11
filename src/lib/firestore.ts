
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings, HistoricalAppSettings } from '@/lib/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        throw new Error("Firebase is not configured. For local development, please create and populate a .env file as described in the README.");
    }
    return db;
}

const handleFirestoreError = (error: any, context: Omit<SecurityRuleContext, 'requestResourceData'>) => {
    const failoverErrorCodes = ['permission-denied', 'resource-exhausted', 'unavailable', 'unauthenticated'];
    if (failoverErrorCodes.includes(error?.code)) {
        const permissionError = new FirestorePermissionError({
            ...context,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
    throw error;
}


// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig();
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        }
        return null;
    } catch (serverError) {
        handleFirestoreError(serverError, { path: 'config/settings', operation: 'get' });
        return null;
    }
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  
  const currentSettings = await getSettings();

  const settingsToSave: AppSettings = { ...settings };
  if (currentSettings) {
      const historyEntry: HistoricalAppSettings = { ...currentSettings };
      delete historyEntry.settingsHistory; // Prevent nested histories

      const newHistory = [historyEntry, ...(currentSettings.settingsHistory || [])];
      settingsToSave.settingsHistory = newHistory.slice(0, 10); // Keep only the last 10 versions
  }
  
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  await setDoc(settingsRef, settingsToSave);
}


// --- Assets ---

export async function getAssets(): Promise<Asset[]> {
    const db = checkConfig();
    try {
        const assetsCollectionRef = collection(db, 'assets');
        const q = query(assetsCollectionRef);
        const querySnapshot = await getDocs(q);
        const fetchedAssets: Asset[] = [];
        querySnapshot.forEach((doc) => {
            fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
        });
        return fetchedAssets;
    } catch (serverError) {
        handleFirestoreError(serverError, { path: 'assets', operation: 'list' });
        return []; // return empty on error
    }
}

export async function updateAsset(asset: Asset) {
    const db = checkConfig();
    const assetRef = doc(db, 'assets', asset.id);
    try {
        await setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true });
    } catch (serverError) {
        handleFirestoreError(serverError, {
            path: assetRef.path,
            operation: 'update',
            requestResourceData: asset,
        });
    }
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    const assetRef = doc(db, 'assets', assetId);
    try {
        await deleteDoc(assetRef);
    } catch(serverError) {
        handleFirestoreError(serverError, {
            path: assetRef.path,
            operation: 'delete',
        });
    }
}


export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    const assetsCollectionRef = collection(db, 'assets');
    const batchSize = 500;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assets.slice(i, i + batchSize);
        chunk.forEach((asset) => {
            const docRef = doc(assetsCollectionRef, asset.id);
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        try {
            await batch.commit();
        } catch(serverError) {
             handleFirestoreError(serverError, {
                path: assetsCollectionRef.path,
                operation: 'update',
            });
        }
    }
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    const batchSize = 500;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach((assetId) => {
            const docRef = doc(db, 'assets', assetId);
            batch.delete(docRef);
        });
        await batch.commit(); // This might throw an error handled by caller
    }
}
