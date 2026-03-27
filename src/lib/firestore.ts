
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
        logger.error("Failed to fetch Firestore settings:", serverError);
        return null;
    }
}

/**
 * Updates settings immediately in the cloud and broadcast to all users.
 * Falls back to local queue if offline.
 */
export async function updateSettings(settings: AppSettings) {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    try {
        await setDoc(settingsRef, settings, { merge: true });
    } catch (serverError) {
        logger.error("Immediate cloud config update failed, enqueuing for later:", serverError);
        await enqueueOp('update', 'config', settings);
        
        if ((serverError as any)?.code === 'permission-denied') {
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: settingsRef.path,
                operation: 'update',
                requestResourceData: settings,
            }));
        }
        throw serverError;
    }
}

// --- Assets (Primary Layer) ---
export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return [];
    
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    
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
        logger.error("Failed to fetch Firestore assets:", serverError);
        return [];
    }
}

/**
 * Used for manual synchronization only.
 */
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
            // Ensure lastModified is set on batch writes
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        
        await batch.commit().catch(async (e) => {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: assetsCollectionRef.path,
                    operation: 'update'
                }));
            }
            throw e;
        });
    }
}

/**
 * Used for manual synchronization only.
 */
export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const batchSize = 500;
    
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach(id => {
            batch.delete(doc(db, 'assets', id));
        });
        
        await batch.commit().catch(async (e) => {
            if (e.code === 'permission-denied') {
                errorEmitter.emit('permission-error', new FirestorePermissionError({
                    path: 'assets',
                    operation: 'delete'
                }));
            }
            throw e;
        });
    }
}

/**
 * Administrative wipe - used only when strictly required.
 */
export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    try {
        const snapshot = await getDocs(collection(db, "assets"));
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) {
        logger.error("Firestore Global Wipe Error:", e);
        throw e;
    }
}
