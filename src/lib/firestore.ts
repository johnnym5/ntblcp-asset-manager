
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc, where } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { errorEmitter } from './error-emitter';
import { FirestorePermissionError } from './errors';
import { enqueueOp } from './offline-queue';
import { logger } from './logger';

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
  if (typeof window !== 'undefined' && !navigator.onLine) {
    await enqueueOp('update', 'config', settings);
    return;
  }

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
      if ((error as any)?.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: settingsRef.path,
              operation: 'update',
              requestResourceData: settings,
          });
          errorEmitter.emit('permission-error', permissionError);
      } else {
          // If other network error, enqueue for safety
          await enqueueOp('update', 'config', settings);
      }
  });
}

// --- Assets (Primary Layer) ---
export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return [];
    
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    
    // Server-side optimized query using grantId index
    let q = query(assetsCollectionRef);
    if (grantId && grantId !== 'All') {
        q = query(assetsCollectionRef, where('grantId', '==', grantId));
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
        }
        return [];
    }
}

export async function setAsset(asset: Asset) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        await enqueueOp('update', 'assets', asset);
        return;
    }

    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, 'assets', asset.id);
    await setDoc(docRef, asset).catch(async (e) => {
        if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'update',
                requestResourceData: asset
            }));
        } else {
            await enqueueOp('update', 'assets', asset);
        }
    });
}

export async function batchSetAssets(assets: Asset[]) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        for (const asset of assets) {
            await enqueueOp('update', 'assets', asset);
        }
        return;
    }

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
        await batch.commit().catch(async (e) => {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: assetsCollectionRef.path,
                    operation: 'update'
                }));
            } else {
                // If network failure during batch, individual enqueuing is safest
                for (const asset of chunk) {
                    await enqueueOp('update', 'assets', asset);
                }
            }
        });
    }
}

export async function deleteAsset(id: string) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        await enqueueOp('delete', 'assets', { id });
        return;
    }

    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    const docRef = doc(firestoreDb, 'assets', id);
    await deleteDoc(docRef).catch(async (e) => {
        if (e.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: docRef.path,
                operation: 'delete'
            }));
        } else {
            await enqueueOp('delete', 'assets', { id });
        }
    });
}

export async function batchDeleteAssets(assetIds: string[]) {
    if (typeof window !== 'undefined' && !navigator.onLine) {
        for (const id of assetIds) {
            await enqueueOp('delete', 'assets', { id });
        }
        return;
    }

    const db = checkConfig();
    if (!db) return;
    const batch = writeBatch(db);
    assetIds.forEach(id => {
        batch.delete(doc(db, 'assets', id));
    });
    await batch.commit().catch(async () => {
        for (const id of assetIds) {
            await enqueueOp('delete', 'assets', { id });
        }
    });
}

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    const snapshot = await getDocs(collection(db, "assets"));
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}
