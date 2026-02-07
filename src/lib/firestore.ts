
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid, rtdb } from '@/lib/firebase';
import type { Asset, AppSettings } from '@/lib/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/errors';
import { addNotification } from '@/hooks/use-notifications';
import { ref, set as rtdbSet, get as rtdbGet, update as rtdbUpdate } from 'firebase/database';
import { getLocalAssets as getLocalAssetsFromDb } from './idb';


// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        throw new Error("Firebase is not configured. For local development, please create and populate a .env file as described in the README.");
    }
    return db;
}
const checkRTDBConfig = () => {
    if (!isConfigValid || !rtdb) {
        throw new Error("Firebase Realtime Database is not configured.");
    }
    return rtdb;
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


// --- App Settings (DUAL WRITE) ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig(); // Use Firestore for reads
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        }
        // If Firestore settings are empty, try falling back to RTDB just in case.
        const rtdbInstance = checkRTDBConfig();
        const rtdbSettingsRef = ref(rtdbInstance, 'config/settings');
        const rtdbSnap = await rtdbGet(rtdbSettingsRef);
        if (rtdbSnap.exists()) {
            const settings = rtdbSnap.val() as AppSettings;
            // Write back to firestore to keep it in sync for next time
            await setDoc(settingsRef, settings, { merge: true });
            return settings;
        }
        return null;
    } catch (serverError) {
        handleFirestoreError(serverError, { path: 'config/settings', operation: 'get' });
        return null;
    }
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  const rtdbInstance = checkRTDBConfig();

  // The 'settings' object passed in is now the complete and final version.
  // It should completely overwrite the existing settings.
  
  // 1. Overwrite settings in Realtime Database (Primary)
  const rtdbSettingsRef = ref(rtdbInstance, 'config/settings');
  await rtdbSet(rtdbSettingsRef, settings);

  // 2. Overwrite settings in Firestore (Backup)
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  try {
    // Using setDoc without merge options overwrites the document.
    await setDoc(settingsRef, settings);
  } catch (serverError) {
    console.warn("Firestore backup write for settings failed, but RTDB succeeded.", serverError);
    // We don't throw an error here because the primary (RTDB) write succeeded.
  }
}


// --- Primary Assets API (Forced to RTDB) ---

export async function getAssets(): Promise<Asset[]> {
    return getAssetsRTDB();
}

export function updateAsset(asset: Asset) {
    updateAssetRTDB(asset).catch(async (serverError) => {
        handleFirestoreError(serverError, { path: `assets/${asset.id}`, operation: 'update' });
    });
}

export function deleteAsset(assetId: string) {
    deleteAssetRTDB(assetId).catch(async (serverError) => {
        handleFirestoreError(serverError, { path: `assets/${assetId}`, operation: 'delete' });
    });
}

export function batchSetAssets(assets: Asset[]) {
    batchSetAssetsRTDB(assets).catch(async (serverError) => {
        handleFirestoreError(serverError, { path: 'assets', operation: 'update' });
    });
}

export function batchDeleteAssets(assetIds: string[]) {
    batchDeleteAssetsRTDB(assetIds).catch(async (serverError) => {
        handleFirestoreError(serverError, { path: 'assets', operation: 'delete' });
    });
}


// --- Realtime Database Assets (Implementations) ---

export async function getAssetsRTDB(): Promise<Asset[]> {
    const db = checkRTDBConfig();
    const snapshot = await rtdbGet(ref(db, 'assets'));
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
}

export async function updateAssetRTDB(asset: Asset) {
    const db = checkRTDBConfig();
    const assetRef = ref(db, `assets/${asset.id}`);
    const assetToSave = { ...asset, id: undefined, lastModified: new Date().toISOString() };
    delete (assetToSave as any).id; // Ensure ID is not nested
    await rtdbSet(assetRef, assetToSave);
}

export async function deleteAssetRTDB(assetId: string) {
    const db = checkRTDBConfig();
    const assetRef = ref(db, `assets/${assetId}`);
    await rtdbSet(assetRef, null);
}

export async function batchSetAssetsRTDB(assets: Asset[]) {
    const db = checkRTDBConfig();
    const updates: { [key: string]: any } = {};
    for (const asset of assets) {
        const assetToSave = { ...asset, id: undefined, lastModified: asset.lastModified || new Date().toISOString() };
        delete (assetToSave as any).id;
        updates[`/assets/${asset.id}`] = assetToSave;
    }
    await rtdbUpdate(ref(db), updates);
}

export async function batchDeleteAssetsRTDB(assetIds: string[]) {
    const db = checkRTDBConfig();
    const updates: { [key: string]: null } = {};
    for (const assetId of assetIds) {
        updates[`/assets/${assetId}`] = null;
    }
    await rtdbUpdate(ref(db), updates);
}


// --- DUAL-DB SYNC FUNCTIONS ---

export async function synchronizeDatabases(): Promise<{ toFirestoreCount: number; toRTDBCount: number }> {
    addNotification({ title: "Syncing cloud databases..." });

    const firestoreDb = checkConfig();
    const rtdbInstance = checkRTDBConfig();

    // --- SYNC SETTINGS ---
    const firestoreSettings = await getDoc(doc(firestoreDb, 'config', 'settings')).then(d => d.exists() ? d.data() as AppSettings : null);
    const rtdbSettingsSnapshot = await rtdbGet(ref(rtdbInstance, 'config/settings'));
    const rtdbSettings = rtdbSettingsSnapshot.exists() ? rtdbSettingsSnapshot.val() as AppSettings : null;

    if (firestoreSettings && !rtdbSettings) {
        await rtdbSet(ref(rtdbInstance, 'config/settings'), firestoreSettings);
    } else if (!firestoreSettings && rtdbSettings) {
        await setDoc(doc(firestoreDb, 'config', 'settings'), rtdbSettings, { merge: true });
    } else if (firestoreSettings && rtdbSettings) {
        const fsTime = new Date(firestoreSettings.lastModified || 0).getTime();
        const rtdbTime = new Date(rtdbSettings.lastModified || 0).getTime();

        if (fsTime > rtdbTime + 1000) {
            await rtdbSet(ref(rtdbInstance, 'config/settings'), firestoreSettings);
        } else if (rtdbTime > fsTime + 1000) {
            await setDoc(doc(firestoreDb, 'config', 'settings'), rtdbSettings, { merge: true });
        }
    }


    // --- SYNC ASSETS ---
    const firestoreAssets = await getDocs(query(collection(firestoreDb, 'assets'))).then(snap => snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
    const rtdbAssets = await getAssetsRTDB();

    const firestoreMap = new Map(firestoreAssets.map(a => [a.id, a]));
    const rtdbMap = new Map(rtdbAssets.map(a => [a.id, a]));
    const allIds = new Set([...firestoreMap.keys(), ...rtdbMap.keys()]);

    const toFirestore: Asset[] = [];
    const toRTDB: Asset[] = [];

    // 2. Compare assets
    for (const id of allIds) {
        const fsAsset = firestoreMap.get(id);
        const rtdbAsset = rtdbMap.get(id);

        if (fsAsset && !rtdbAsset) {
            toRTDB.push(fsAsset);
        } else if (!fsAsset && rtdbAsset) {
            toFirestore.push(rtdbAsset);
        } else if (fsAsset && rtdbAsset) {
            const fsTime = new Date(fsAsset.lastModified || 0).getTime();
            const rtdbTime = new Date(rtdbAsset.lastModified || 0).getTime();
            
            // Add a 1-second buffer to prevent sync loops from minor time differences
            if (fsTime > rtdbTime + 1000) {
                toRTDB.push(fsAsset);
            } else if (rtdbTime > fsTime + 1000) {
                toFirestore.push(rtdbAsset);
            }
        }
    }

    // 3. Execute updates if necessary
    if (toFirestore.length > 0) {
        const batch = writeBatch(firestoreDb);
        toFirestore.forEach(asset => {
            const docRef = doc(firestoreDb, 'assets', asset.id);
            batch.set(docRef, asset);
        });
        await batch.commit();
    }
    if (toRTDB.length > 0) {
        await batchSetAssetsRTDB(toRTDB);
    }

    return { toFirestoreCount: toFirestore.length, toRTDBCount: toRTDB.length };
}

// --- Legacy RTDB Copy Function ---
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
        addNotification({ title: 'Starting copy...', description: 'Fetching all local assets from your device.' });
        const assets = await getLocalAssetsFromDb();
        
        if (assets.length === 0) {
            addNotification({ title: 'No Local Assets Found', description: 'There are no assets stored on this device to copy.' });
            return;
        }

        const assetsObject = assets.reduce((acc, asset) => {
            const { id, ...rest } = asset;
            acc[id] = rest;
            return acc;
        }, {} as { [key: string]: Omit<Asset, 'id'> });

        const dbRef = ref(rtdbInstance, 'assets');
        await rtdbSet(dbRef, assetsObject);

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
