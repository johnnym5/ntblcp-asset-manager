'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid, rtdb } from '@/lib/firebase';
import type { Asset, AppSettings } from '@/lib/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { addNotification } from '@/hooks/use-notifications';
import { ref, set } from 'firebase/database';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        throw new Error("Firebase is not configured. For local development, please create and populate a .env file as described in the README.");
    }
    return db;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const db = checkConfig();
    const settingsRef = doc(db, 'config', 'settings');
    try {
      const docSnap = await getDoc(settingsRef);
      if (docSnap.exists()) {
          return docSnap.data() as AppSettings;
      }
      return null;
    } catch (serverError) {
        if ((serverError as any)?.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'get',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        throw serverError;
    }
}

export function updateSettings(settings: Partial<AppSettings>) {
  const db = checkConfig();
  const settingsRef = doc(db, 'config', 'settings');
  setDoc(settingsRef, settings, { merge: true }).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
        path: settingsRef.path,
        operation: 'update',
        requestResourceData: settings,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}


// --- Assets ---

/**
 * Fetches all asset documents from Firestore once.
 * This is now the primary method for getting cloud data to avoid real-time listener costs.
 * @returns A promise that resolves with an array of assets.
 */
export async function getAssets(): Promise<Asset[]> {
  const db = checkConfig();
  const assetsCollectionRef = collection(db, 'assets');
  const q = query(assetsCollectionRef);
  try {
    const querySnapshot = await getDocs(q);
    const fetchedAssets: Asset[] = [];
    querySnapshot.forEach((doc) => {
      fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
    });
    return fetchedAssets;
  } catch (serverError) {
    if ((serverError as any)?.code === 'permission-denied') {
      const permissionError = new FirestorePermissionError({
          path: assetsCollectionRef.path,
          operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
    throw serverError;
  }
}

/**
 * Creates or updates an asset document in Firestore.
 * The document ID is the asset's own `id` property.
 * @param asset The asset object to save.
 */
export function updateAsset(asset: Asset) {
  const db = checkConfig();
  const assetRef = doc(db, 'assets', asset.id);
  setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true })
    .catch(async (serverError) => {
      const permissionError = new FirestorePermissionError({
          path: assetRef.path,
          operation: 'update',
          requestResourceData: asset,
      });
      errorEmitter.emit('permission-error', permissionError);
  });
}

/**
 * Deletes an asset document from Firestore.
 * @param assetId The ID of the asset to delete.
 */
export function deleteAsset(assetId: string) {
  const db = checkConfig();
  const assetRef = doc(db, 'assets', assetId);
  deleteDoc(assetRef).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
        path: assetRef.path,
        operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
  });
}


/**
 * Writes a large array of assets to Firestore in batches of 500.
 * @param assets The array of assets to write.
 */
export function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
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
        batch.commit().catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: assetsCollectionRef.path,
              operation: 'update',
              requestResourceData: { note: `Batch update for ${chunk.length} assets.` }
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
}


/**
 * Deletes an array of assets from Firestore in batches.
 * @param assetIds The array of asset IDs to delete.
 */
export function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    const batchSize = 500;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach((assetId) => {
            const docRef = doc(db, 'assets', assetId);
            batch.delete(docRef);
        });
        batch.commit().catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: 'assets',
              operation: 'delete',
              requestResourceData: { note: `Batch delete for ${chunk.length} assets.` }
          });
          errorEmitter.emit('permission-error', permissionError);
        });
    }
}

export async function copyAssetsToRealtimeDB(): Promise<void> {
    const rtdbInstance = rtdb;
    if (!isConfigValid || !db || !rtdbInstance) {
        addNotification({
            title: 'Firebase Not Configured',
            description: "Cannot perform operation. Please check your Firebase configuration.",
            variant: 'destructive',
        });
        return;
    }

    try {
        addNotification({ title: 'Starting copy...', description: 'Fetching all assets from Firestore.' });
        const assets = await getAssets();
        
        if (assets.length === 0) {
            addNotification({ title: 'No Assets Found', description: 'There are no assets in Firestore to copy.' });
            return;
        }

        // Convert array to an object with IDs as keys for better RTDB structure
        const assetsObject = assets.reduce((acc, asset) => {
            const { id, ...rest } = asset; // RTDB doesn't need the ID inside the object if it's the key
            acc[id] = rest;
            return acc;
        }, {} as { [key: string]: Omit<Asset, 'id'> });

        const dbRef = ref(rtdbInstance, 'assets');
        await set(dbRef, assetsObject);

        addNotification({ title: 'Copy Successful', description: `${assets.length} assets have been copied to the Realtime Database.` });
    } catch (error) {
        console.error("Failed to copy assets to Realtime Database:", error);
        addNotification({
            title: 'Copy Failed',
            description: error instanceof Error ? error.message : 'An unknown error occurred.',
            variant: 'destructive',
        });
    }
}
