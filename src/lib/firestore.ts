
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc, where } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';

const checkConfig = () => {
    if (!isConfigValid || !db) return null;
    return db;
}

// --- Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return null;
    const settingsRef = doc(firestoreDb, 'config', 'settings');
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
        return null;
    }
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  if (!firestoreDb) return;
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  
  // Primary write to Firestore
  setDoc(settingsRef, settings, { merge: true }).then(() => {
      // AUTO BACKUP: Mirror settings to Realtime Database
      import('@/lib/database').then(dbMod => {
          dbMod.updateSettings(settings).catch(() => {});
      });
  }).catch(async (error) => {
      const permissionError = new FirestorePermissionError({
          path: settingsRef.path,
          operation: 'update',
          requestResourceData: settings,
      });
      errorEmitter.emit('permission-error', permissionError);
  });
}

// --- Assets (Primary Layer) ---
export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return [];
    
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    try {
        const querySnapshot = await getDocs(assetsCollectionRef);
        const fetchedAssets: Asset[] = [];
        querySnapshot.forEach((doc) => {
            fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
        });

        if (grantId && grantId !== 'All') {
            return fetchedAssets.filter(asset => asset.grantId === grantId);
        }
        return fetchedAssets;
    } catch (serverError) {
        if ((serverError as any)?.code === 'permission-denied') {
            const permissionError = new FirestorePermissionError({
                path: assetsCollectionRef.path,
                operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
        }
        return [];
    }
}

export async function getAsset(id: string): Promise<Asset | null> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return null;
    const docRef = doc(firestoreDb, 'assets', id);
    const snap = await getDoc(docRef);
    if (snap.exists()) return { id: snap.id, ...snap.data() } as Asset;
    return null;
}

export async function setAsset(asset: Asset) {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, 'assets', asset.id);
    await setDoc(docRef, asset);
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
        await batch.commit().catch(async () => {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: assetsCollectionRef.path,
                operation: 'update'
            }));
        });
    }
}

export async function deleteAsset(id: string) {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    await deleteDoc(doc(firestoreDb, 'assets', id));
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const batch = writeBatch(db);
    assetIds.forEach(id => {
        batch.delete(doc(db, 'assets', id));
    });
    await batch.commit();
}

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    const snapshot = await getDocs(collection(db, "assets"));
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}
