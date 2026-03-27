
'use client';

import { ref, get, set, remove, update, query, orderByChild, equalTo } from 'firebase/database';
import { rtdb, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';

const checkConfig = () => {
    if (!isConfigValid || !rtdb) return null;
    return rtdb;
}

// --- Settings (Redundancy Layer) ---
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

// --- Assets (Primary Heavy-Sync Layer) ---
/**
 * Fetches assets from RTDB. Supports optional grantId filtering.
 */
export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const db = checkConfig();
    if (!db) return [];
    
    const assetsRef = ref(db, 'assets');
    let assetsQuery: any = assetsRef;

    // Use server-side filtering if a specific grant is active
    if (grantId && grantId !== 'All') {
        assetsQuery = query(assetsRef, orderByChild('grantId'), equalTo(grantId));
    }
    
    try {
        const snapshot = await get(assetsQuery);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // RTDB returns an object of objects
            return Object.keys(data).map(key => ({ ...data[key], id: key }));
        }
    } catch (e) {
        console.error("RTDB Fetch Error:", e);
    }
    return [];
}

/**
 * Performs a high-speed batch write to RTDB.
 */
export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: any } = {};
    assets.forEach(asset => {
        // Deep clone to avoid proxy issues and ensure lastModified is set
        const cleanAsset = JSON.parse(JSON.stringify(asset));
        updates[`/assets/${asset.id}`] = { 
            ...cleanAsset, 
            lastModified: asset.lastModified || new Date().toISOString() 
        };
    });
    await update(ref(db), updates);
}

/**
 * Removes multiple assets from RTDB in one request.
 */
export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: null } = {};
    assetIds.forEach(id => { updates[`/assets/${id}`] = null; });
    await update(ref(db), updates);
}

export async function deleteAsset(id: string) {
    const db = checkConfig();
    if (!db) return;
    await remove(ref(db, `assets/${id}`));
}

/**
 * Wipes the entire assets node in RTDB.
 */
export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    await remove(ref(db, 'assets'));
}
