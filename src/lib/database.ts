
'use client';

import { ref, get, set, remove, update } from 'firebase/database';
import { rtdb, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { addNotification } from '@/hooks/use-notifications';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !rtdb) {
        throw new Error("Firebase Realtime Database is not configured. For local development, please create and populate a .env file as described in the README.");
    }
    return rtdb;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const db = checkConfig();
    const settingsRef = ref(db, 'config/settings');
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (serverError) {
        console.error("RTDB getSettings failed:", serverError);
        addNotification({
            title: "Could Not Load Cloud Settings (RTDB)",
            description: "The application will use local settings. Some features may be unavailable.",
            variant: "destructive"
        });
        return null;
    }
}

export async function updateSettings(settings: AppSettings) {
    const db = checkConfig();
    const settingsRef = ref(db, 'config/settings');
    await set(settingsRef, settings).catch((error) => {
        console.error("RTDB updateSettings failed:", error);
        addNotification({
            title: "Cloud Sync Failed (RTDB)",
            description: "Settings were saved locally but could not be synced to the backup cloud database.",
            variant: "destructive",
        });
    });
}


// --- Assets ---

export async function getAssets(): Promise<Asset[]> {
    const db = checkConfig();
    const assetsRef = ref(db, 'assets');
    try {
        const snapshot = await get(assetsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Firebase returns an object when fetching a collection, so we convert it to an array.
            return Object.keys(data).map(key => ({ ...data[key], id: key }));
        }
        return [];
    } catch (serverError) {
        console.error("RTDB getAssets failed:", serverError);
        addNotification({
            title: "Could Not Load Cloud Assets (RTDB)",
            description: "The application will use local data. Go online to sync.",
            variant: "destructive"
        });
        return []; // return empty on error
    }
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    const assetRef = ref(db, `assets/${assetId}`);
    await remove(assetRef).catch((error) => {
        console.error("RTDB deleteAsset failed:", error);
        addNotification({
            title: "Cloud Sync Failed (RTDB)",
            description: "Deletion was successful locally but could not be synced to the backup cloud.",
            variant: "destructive",
        });
    });
}

export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    const updates: { [key: string]: any } = {};
    assets.forEach(asset => {
        // RTDB doesn't like 'undefined' values, so we stringify and parse to remove them.
        const cleanAsset = JSON.parse(JSON.stringify(asset));
        updates[`/assets/${asset.id}`] = { ...cleanAsset, lastModified: asset.lastModified || new Date().toISOString() };
    });
    await update(ref(db), updates).catch((error) => {
        console.error("RTDB batchSetAssets failed:", error);
        addNotification({
            title: "Batch Cloud Sync Failed (RTDB)",
            description: "Some changes were saved locally but could not be synced to the backup cloud.",
            variant: "destructive",
        });
    });
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    const updates: { [key: string]: null } = {};
    assetIds.forEach(id => {
        updates[`/assets/${id}`] = null;
    });
    await update(ref(db), updates).catch((error) => {
        console.error("RTDB batchDeleteAssets failed:", error);
        addNotification({
            title: "Batch Cloud Deletion Failed (RTDB)",
            description: "Some deletions were successful locally but could not be synced to the backup cloud.",
            variant: "destructive",
        });
    });
}

export async function clearAssets() {
    const db = checkConfig();
    const assetsRef = ref(db, 'assets');
    await remove(assetsRef);
}
