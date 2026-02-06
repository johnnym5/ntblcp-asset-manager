'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, AppSettings } from '@/lib/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
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
