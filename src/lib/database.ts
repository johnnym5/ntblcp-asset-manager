'use client';

import { ref, get, set, remove, update, onValue } from 'firebase/database';
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
    const currentSettings = await getSettings();
    const settingsToSave: AppSettings = { ...settings };

    if (currentSettings) {
        const historyEntry: HistoricalAppSettings = { ...currentSettings };
        delete historyEntry.settingsHistory;
        
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentHistory = (currentSettings.settingsHistory || []).filter(h => {
            return h.lastModified && new Date(h.lastModified) > oneWeekAgo;
        });

        const newHistory = [historyEntry, ...recentHistory];
        settingsToSave.settingsHistory = newHistory.slice(0, 10);
    }
    
    settingsToSave.lastModified = new Date().toISOString();
    await set(ref(db, 'config/settings'), settingsToSave);
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

export async function getAssets(): Promise<Asset[]> {
    const db = checkConfig();
    if (!db) return [];
    const assetsRef = ref(db, 'assets');
    const snapshot = await get(assetsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        // Firebase returns an object when fetching a collection, so we convert it to an array.
        return Object.keys(data).map(key => ({ ...data[key], id: key }));
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

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    const assetsRef = ref(db, 'assets');
    await remove(assetsRef);
}
