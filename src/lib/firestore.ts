
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid, rtdb } from '@/lib/firebase';
import type { Asset, AppSettings } from '@/lib/types';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import { addNotification } from '@/hooks/use-notifications';
import { ref, set as rtdbSet, get as rtdbGet } from 'firebase/database';
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

// --- App Settings (DUAL WRITE) ---
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

export async function updateSettings(settings: Partial<AppSettings>) {
  const firestoreDb = checkConfig();
  const rtdbInstance = checkRTDBConfig();
  
  const settingsWithTimestamp = { ...settings, lastModified: new Date().toISOString() };

  // Write to Firestore
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  setDoc(settingsRef, settingsWithTimestamp, { merge: true }).catch(async (serverError) => {
    const permissionError = new FirestorePermissionError({
        path: settingsRef.path,
        operation: 'update',
        requestResourceData: settings,
    });
    errorEmitter.emit('permission-error', permissionError);
  });
  
  // Write to Realtime DB
  const rtdbSettingsRef = ref(rtdbInstance, 'config/settings');
  const existingSettings = await rtdbGet(rtdbSettingsRef).then(s => s.val() || {});
  const newRtdbSettings = { ...existingSettings, ...settingsWithTimestamp };
  await rtdbSet(rtdbSettingsRef, newRtdbSettings);
}


// --- Firestore Assets ---

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

export function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    const assetsCollectionRef = collection(db, 'assets');
    const batchSize = 500;
    for (let i = 0; i < assets.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assets.slice(i, i + batchSize);
        chunk.forEach((asset) => {
            const docRef = doc(assetsCollectionRef, asset.id);
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


// --- Realtime Database Assets ---

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
    for (const asset of assets) {
        const assetRef = ref(db, `assets/${asset.id}`);
        const assetToSave = { ...asset, id: undefined, lastModified: asset.lastModified || new Date().toISOString() };
        delete (assetToSave as any).id;
        await rtdbSet(assetRef, assetToSave);
    }
}

export async function batchDeleteAssetsRTDB(assetIds: string[]) {
    const db = checkRTDBConfig();
    for (const assetId of assetIds) {
        const assetRef = ref(db, `assets/${assetId}`);
        await rtdbSet(assetRef, null);
    }
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
    const firestoreAssets = await getAssets();
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
        await batchSetAssets(toFirestore);
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
