'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset } from '@/lib/types';
import type { User } from 'firebase/auth';

// --- Assets ---

/**
 * Fetches all asset documents from Firestore once.
 * This is now the primary method for getting cloud data to avoid real-time listener costs.
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
 * The document ID is the asset's own `id` property.
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
