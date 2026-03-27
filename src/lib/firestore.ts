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

export async function updateSettings(settings: AppSettings) {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return;
    
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    try {
        await setDoc(settingsRef, settings, { merge: true });
    } catch (serverError) {
        logger.error("Cloud config update failed, enqueuing:", serverError);
        await enqueueOp('update', 'config', settings);
        throw serverError;
    }
}

// --- Assets (Project Scoped) ---
export async function getAssets(grantId: string): Promise<Asset[]> {
    const firestoreDb = checkConfig();
    if (!firestoreDb || !grantId) return [];
    
    const assetsCollectionRef = collection(firestoreDb, 'assets');
    const q = query(assetsCollectionRef, where('grantId', '==', grantId));

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

export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const assetsCollectionRef = collection(db, 'assets');
    const batchSize = 500;
    
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assets.slice(i, i + batchSize);
        chunk.forEach((asset) => {
            if (!asset.grantId) {
                logger.warn("Attempting to save asset without grantId:", asset.id);
                return;
            }
            const docRef = doc(assetsCollectionRef, asset.id);
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        await batch.commit();
    }
}

export async function clearAssets(grantId?: string) {
    const db = checkConfig();
    if (!db) return;
    try {
        const assetsRef = collection(db, "assets");
        const q = grantId ? query(assetsRef, where('grantId', '==', grantId)) : query(assetsRef);
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    } catch (e) {
        logger.error("Firestore Wipe Error:", e);
        throw e;
    }
}
