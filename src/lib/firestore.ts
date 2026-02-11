'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings, HistoricalAppSettings } from './types';
import { addNotification } from '@/hooks/use-notifications';

// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        // This warning is for developers who haven't set up their .env file.
        // It prevents the app from crashing.
        return null;
    }
    return db;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig();
    if (!firestoreDb) return null;
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return docSnap.data() as AppSettings;
    }
    return null;
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  if (!firestoreDb) return;
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
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  await setDoc(settingsRef, settingsToSave);
}


// --- Assets ---

export async function getAssets(): Promise<Asset[]> {
    const db = checkConfig();
    if (!db) return [];
    const assetsCollectionRef = collection(db, 'assets');
    const q = query(assetsCollectionRef);
    const querySnapshot = await getDocs(q);
    const fetchedAssets: Asset[] = [];
    querySnapshot.forEach((doc) => {
        fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
    });
    return fetchedAssets;
}

export async function updateAsset(asset: Asset) {
    const db = checkConfig();
    if (!db) return;
    const assetRef = doc(db, 'assets', asset.id);
    await setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true });
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    if (!db) return;
    const assetRef = doc(db, 'assets', assetId);
    await deleteDoc(assetRef);
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
            const docRef = doc(assetsCollectionRef, asset.id);
            batch.set(docRef, { ...asset, lastModified: asset.lastModified || new Date().toISOString() });
        });
        await batch.commit();
    }
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    if (!db) return;
    const batchSize = 500;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach((assetId) => {
            const docRef = doc(db, 'assets', assetId);
            batch.delete(docRef);
        });
        await batch.commit();
    }
}

export async function clearAssets() {
    const db = checkConfig();
    if (!db) return;
    const assetsSnapshot = await getDocs(collection(db, "assets"));
    const assetIds = assetsSnapshot.docs.map(doc => doc.id);
    if(assetIds.length > 0) {
      await batchDeleteAssets(assetIds);
    }
}
