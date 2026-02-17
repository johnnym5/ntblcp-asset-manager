
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc, where } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { addNotification } from '@/hooks/use-notifications';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        // This warning is for developers who haven't set up their .env file.
        // It prevents the app from crashing.
        return null;
    }
    return db;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return null;
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
    }
    return null;
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  if (!firestoreDb) return;
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  await setDoc(settingsRef, settings);
}


// --- Assets ---

export async function getAssets(location?: string): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return [];
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    
    let q;
    if (location && location !== 'All') {
        // This query performs a "starts with" search on the location field.
        // It's a good-enough approximation for location-based filtering on the backend.
        q = query(assetsCollectionRef, where("location", ">=", location), where("location", "<=", location + '\uf8ff'));
    } else {
        q = query(assetsCollectionRef);
    }
    
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
        } else if ((serverError as any)?.code === 'failed-precondition') {
            addNotification({
                title: 'Database Index Required',
                description: `A database index is needed for this query. Please create a composite index on the 'assets' collection for the 'location' field in your Firebase console.`,
                variant: 'destructive',
            });
        }
        throw serverError;
    }
}

export async function updateAsset(asset: Asset) {
    const db = checkConfig();
    if (!db) return;
    const assetRef = doc(db, 'assets', asset.id);
    await setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true });
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    await deleteDoc(assetRef);
}


export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const assetsCollectionRef = collection(db, 'assets');
    const batchSize = 500;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assets.slice(i, i + batchSize);
        chunk.forEach((asset) => {
            const docRef = doc(assetsCollectionRef, asset.id);
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        await batch.commit();
    }
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
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

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    const assetsSnapshot = await getDocs(collection(db, "assets"));
    const assetIds = assetsSnapshot.docs.map(doc => doc.id);
    if(assetIds.length > 0) {
      await batchDeleteAssets(assetIds);
    }
}

    