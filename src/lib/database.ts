'use client';

import { ref, get, set, remove, update } from 'firebase/database';
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
export async function getAssets(grantId?: string | null): Promise<Asset[]> {
    const db = checkConfig();
    if (!db) return [];
    
    const assetsRef = ref(db, 'assets');
    const snapshot = await get(assetsRef);
    if (snapshot.exists()) {
        const data = snapshot.val();
        const allAssets: Asset[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        if (grantId && grantId !== 'All') {
            return allAssets.filter(asset => asset.grantId === grantId);
        }
        return allAssets;
    }
    return [];
}

export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: any } = {};
    assets.forEach(asset => {
        const cleanAsset = JSON.parse(JSON.stringify(asset));
        updates[`/assets/${asset.id}`] = { ...cleanAsset, lastModified: asset.lastModified || new Date().toISOString() };
    });
    await update(ref(db), updates);
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: null } = {};
    assetIds.forEach(id => { updates[`/assets/${id}`] = null; });
    await update(ref(db), updates);
}

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    await remove(ref(db, 'assets'));
}
