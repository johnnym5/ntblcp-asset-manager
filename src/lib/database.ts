
'use client';

import { ref, get, set, remove, update, query, orderByChild, equalTo } from 'firebase/database';
import { rtdb, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { logger } from './logger';

const checkConfig = () => {
    if (!isRtdbConfigValid || !rtdb) return null;
    return rtdb;
}

// Re-importing to ensure availability within this context
import { isRtdbConfigValid } from '@/lib/firebase';

// --- Settings (Redundancy Layer) ---
export async function getSettings(): Promise<AppSettings | null> {
    const db = checkConfig();
    if (!db) return null;
    const settingsRef = ref(db, 'config/settings');
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            return snapshot.val() as AppSettings;
        }
    } catch (e) {
        logger.error("RTDB Settings Fetch Error:", e);
    }
    return null;
}

export async function updateSettings(settings: AppSettings) {
    const db = checkConfig();
    if (!db) return;
    const settingsRef = ref(db, 'config/settings');
    try {
        await set(settingsRef, settings);
    } catch (e) {
        logger.error("RTDB Settings Update Error:", e);
        throw e;
    }
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
            // RTDB returns an object of objects where keys are IDs
            return Object.entries(data).map(([id, value]: [string, any]) => ({ 
                ...(value as Asset), 
                id 
            }));
        }
    } catch (e) {
        logger.error("RTDB Assets Fetch Error:", e);
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
        // We use the ID as the key in the assets node
        updates[`assets/${asset.id}`] = { 
            ...cleanAsset, 
            lastModified: asset.lastModified || new Date().toISOString() 
        };
    });
    
    try {
        await update(ref(db), updates);
    } catch (e) {
        logger.error("RTDB Batch Set Error:", e);
        throw e;
    }
}

/**
 * Removes multiple assets from RTDB in one request.
 */
export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: null } = {};
    assetIds.forEach(id => { 
        updates[`assets/${id}`] = null; 
    });
    try {
        await update(ref(db), updates);
    } catch (e) {
        logger.error("RTDB Batch Delete Error:", e);
        throw e;
    }
}

export async function deleteAsset(id: string) {
    const db = checkConfig();
    if (!db) return;
    try {
        await remove(ref(db, `assets/${id}`));
    } catch (e) {
        logger.error("RTDB Single Delete Error:", e);
        throw e;
    }
}

/**
 * Wipes the entire assets node in RTDB.
 */
export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    try {
        await remove(ref(db, 'assets'));
    } catch (e) {
        logger.error("RTDB Global Wipe Error:", e);
        throw e;
    }
}
