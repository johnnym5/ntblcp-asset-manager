'use client';

import { ref, get, set, remove, update, query, orderByChild, equalTo } from 'firebase/database';
import { rtdb, isRtdbConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings } from './types';
import { logger } from './logger';

const checkConfig = () => {
    if (!isRtdbConfigValid || !rtdb) return null;
    return rtdb;
}

export async function getSettings(): Promise<AppSettings | null> {
    const db = checkConfig();
    if (!db) return null;
    const settingsRef = ref(db, 'config/settings');
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) return snapshot.val() as AppSettings;
    } catch (e) {
        logger.error("RTDB Settings Error:", e);
    }
    return null;
}

export async function updateSettings(settings: AppSettings) {
    const db = checkConfig();
    if (!db) return;
    try {
        await set(ref(db, 'config/settings'), settings);
    } catch (e) {
        throw e;
    }
}

export async function getAssets(grantId: string): Promise<Asset[]> {
    const db = checkConfig();
    if (!db || !grantId) return [];
    
    const assetsRef = ref(db, 'assets');
    const assetsQuery = query(assetsRef, orderByChild('grantId'), equalTo(grantId));
    
    try {
        const snapshot = await get(assetsQuery);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.entries(data).map(([id, value]: [string, any]) => ({ 
                ...(value as Asset), 
                id 
            }));
        }
    } catch (e) {
        logger.error("RTDB Assets Error:", e);
    }
    return [];
}

export async function batchSetAssets(assets: Asset[]) {
    const db = checkConfig();
    if (!db) return;
    const updates: { [key: string]: any } = {};
    assets.forEach(asset => {
        if (!asset.grantId) return;
        updates[`assets/${asset.id}`] = { 
            ...asset, 
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

export async function clearAssets(grantId?: string) {
    const db = checkConfig();
    if (!db) return;
    if (!grantId) {
        await remove(ref(db, 'assets'));
        return;
    }
    const all = await getAssets(grantId);
    const updates: { [key: string]: null } = {};
    all.forEach(a => updates[`assets/${a.id}`] = null);
    await update(ref(db), updates);
}
