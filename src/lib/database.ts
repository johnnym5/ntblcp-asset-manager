'use client';

import { ref, get, set, remove, update, onValue, query, orderByChild, equalTo } from 'firebase/database';
import { rtdb, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings, HistoricalAppSettings } from './types';
import { addNotification } from '@/hooks/use-notifications';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !rtdb) {
        // This warning is for developers who haven't set up their .env file.
        // It prevents the app from crashing.
        console.warn("Firebase Realtime Database is not configured. For local development, please create and populate a .env file as described in the README.");
        return null;
    }
    return rtdb;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const db = checkConfig();
    if (!db) return null;
    const settingsRef = ref(db, 'config/settings');
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
        return snapshot.val();
    }
    return null;
}

export async function updateSettings(settings: AppSettings) {
    const db = checkConfig();
    if (!db) return;
    const settingsRef = ref(db, 'config/settings');
    await set(settingsRef, settings);
}

export function onSettingsChange(callback: (settings: AppSettings | null) => void): () => void {
    const db = checkConfig();
    if (!db) return () => {};
    const settingsRef = ref(db, 'config/settings');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        } else {
            callback(null);
        }
    }, (error) => {
        console.error("Error listening to settings changes:", error);
        callback(null);
    });
    return unsubscribe;
}


// --- Assets ---

export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const db = checkConfig();
    if (!db) return [];
    
    // WORKAROUND: Instead of querying by grantId (which requires an index that is failing to deploy),
    // we fetch all assets and filter them on the client-side. This is less performant for very large
    // datasets but guarantees functionality in this environment.
    const assetsQuery = ref(db, 'assets');
    
    const snapshot = await get(assetsQuery);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const allAssets: Asset[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        
        // Perform filtering client-side if a specific grantId is provided.
        if (grantId && grantId !== 'All') {
            return allAssets.filter(asset => asset.grantId === grantId);
        }
        
        // If no grantId or grantId is 'All', return all assets.
        return allAssets;
    }
    return [];
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    if (!db) return;
    const assetRef = ref(db, `assets/${assetId}`);
    await remove(assetRef);
}

export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: any } = {};
    assets.forEach(asset => {
        // RTDB doesn't like 'undefined' values, so we stringify and parse to remove them.
        const cleanAsset = JSON.parse(JSON.stringify(asset));
        updates[`/assets/${asset.id}`] = { ...cleanAsset, lastModified: new Date().toISOString() };
    });
    await update(ref(db), updates);
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: null } = {};
    assetIds.forEach(id => {
        updates[`/assets/${id}`] = null;
    });
    await update(ref(db), updates);
}

export async function clearAssets(grantId: string) {
    const db = checkConfig();
    if (!db) return;
    
    // Fetch all assets for the specific grant and then delete them.
    const assetsSnapshot = await get(query(ref(db, 'assets'), orderByChild('grantId'), equalTo(grantId)));
    if (assetsSnapshot.exists()) {
        const updates: { [key: string]: null } = {};
        assetsSnapshot.forEach((childSnapshot) => {
            updates[`/assets/${childSnapshot.key}`] = null;
        });
        await update(ref(db), updates);
    }
}
