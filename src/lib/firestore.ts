'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc, where, QueryConstraint } from 'firebase/firestore';
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

export async function getAssets(grantId?: string | null, location?: string): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return [];
    
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    const constraints: QueryConstraint[] = [];

    if (grantId) {
        constraints.push(where("grantId", "==", grantId));
    }
    
    // The location filter is a "startsWith" query, which is complex.
    // If a location is provided, we can add it, but it might require a composite index.
    if (location && location !== 'All') {
        constraints.push(where("location", ">=", location));
        constraints.push(where("location", "<=", location + '\uf8ff'));
    }
    
    const q = query(assetsCollectionRef, ...constraints);
    
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
            let errorMsg = `A database index is needed for this query.`;
            if (grantId && location) {
              errorMsg += ` Please create a composite index in Firestore on the 'assets' collection for fields 'grantId' and 'location'.`;
            } else if (grantId) {
              errorMsg += ` Please create an index on the 'assets' collection for the 'grantId' field.`;
            }
             addNotification({
                title: 'Database Index Required',
                description: errorMsg,
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

export async function clearAssets(grantId: string) {
    const db = checkConfig();
    if (!db) return;
    
    // Fetch all assets for the specific grant and then delete them.
    const q = query(collection(db, "assets"), where("grantId", "==", grantId));
    const assetsSnapshot = await getDocs(q);

    if (!assetsSnapshot.empty) {
        const assetIds = assetsSnapshot.docs.map(doc => doc.id);
        await batchDeleteAssets(assetIds);
    }
}
