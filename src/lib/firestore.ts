
'use client';

import { doc, getDocs, setDoc, collection, writeBatch, deleteDoc, query, getDoc } from 'firebase/firestore';
import { db, isConfigValid } from '@/lib/firebase';
import type { Asset, AppSettings, HistoricalAppSettings } from '@/lib/types';
import { addNotification } from '@/hooks/use-notifications';


// Helper function to ensure Firebase is properly configured before use.
const checkConfig = () => {
    if (!isConfigValid || !db) {
        throw new Error("Firebase is not configured. For local development, please create and populate a .env file as described in the README.");
    }
    return db;
}

// --- App Settings ---
export async function getSettings(): Promise<AppSettings | null> {
    const firestoreDb = checkConfig();
    const settingsRef = doc(firestoreDb, 'config', 'settings');
    try {
        const docSnap = await getDoc(settingsRef);
        if (docSnap.exists()) {
            return docSnap.data() as AppSettings;
        }
        return null;
    } catch (serverError) {
        console.error("Firestore getSettings failed:", serverError);
        addNotification({
            title: "Could Not Load Cloud Settings",
            description: "The application will use local settings. Some features may be unavailable.",
            variant: "destructive"
        });
        return null;
    }
}

export async function updateSettings(settings: AppSettings) {
  const firestoreDb = checkConfig();
  
  const currentSettings = await getSettings();

  const settingsToSave: AppSettings = { ...settings };
  if (currentSettings) {
      const historyEntry: HistoricalAppSettings = { ...currentSettings };
      delete historyEntry.settingsHistory; // Prevent nested histories

      const newHistory = [historyEntry, ...(currentSettings.settingsHistory || [])];
      settingsToSave.settingsHistory = newHistory.slice(0, 10); // Keep only the last 10 versions
  }
  
  const settingsRef = doc(firestoreDb, 'config', 'settings');
  setDoc(settingsRef, settingsToSave).catch((error) => {
    console.error("Firestore updateSettings failed:", error);
    addNotification({
      title: "Cloud Sync Failed",
      description: "Settings were saved locally but could not be synced to the cloud.",
      variant: "destructive",
    });
  });
}


// --- Assets ---

export async function getAssets(): Promise<Asset[]> {
    const db = checkConfig();
    try {
        const assetsCollectionRef = collection(db, 'assets');
        const q = query(assetsCollectionRef);
        const querySnapshot = await getDocs(q);
        const fetchedAssets: Asset[] = [];
        querySnapshot.forEach((doc) => {
            fetchedAssets.push({ id: doc.id, ...doc.data() } as Asset);
        });
        return fetchedAssets;
    } catch (serverError) {
        console.error("Firestore getAssets failed:", serverError);
        addNotification({
            title: "Could Not Load Cloud Assets",
            description: "The application will use local data. Go online to sync.",
            variant: "destructive"
        });
        return []; // return empty on error
    }
}

export async function updateAsset(asset: Asset) {
    const db = checkConfig();
    const assetRef = doc(db, 'assets', asset.id);
    setDoc(assetRef, { ...asset, lastModified: new Date().toISOString() }, { merge: true })
        .catch((error) => {
          console.error("Firestore updateAsset failed:", error);
          addNotification({
            title: "Cloud Sync Failed",
            description: `Changes to "${asset.description}" were saved locally but could not be synced.`,
            variant: "destructive",
          });
        });
}

export async function deleteAsset(assetId: string) {
    const db = checkConfig();
    const assetRef = doc(db, 'assets', assetId);
    deleteDoc(assetRef).catch((error) => {
        console.error("Firestore deleteAsset failed:", error);
        addNotification({
            title: "Cloud Sync Failed",
            description: "Deletion was successful locally but could not be synced.",
            variant: "destructive",
        });
    });
}


export async function batchSetAssets(assets: Asset[]) {
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
        batch.commit().catch((error) => {
            console.error("Firestore batchSetAssets failed:", error);
            addNotification({
                title: "Batch Cloud Sync Failed",
                description: "Some changes were saved locally but could not be synced.",
                variant: "destructive",
            });
        });
    }
}

export async function batchDeleteAssets(assetIds: string[]) {
    const db = checkConfig();
    const batchSize = 500;
    for (let i = 0; i < assetIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const chunk = assetIds.slice(i, i + batchSize);
        chunk.forEach((assetId) => {
            const docRef = doc(db, 'assets', assetId);
            batch.delete(docRef);
        });
        batch.commit().catch((error) => {
            console.error("Firestore batchDeleteAssets failed:", error);
            addNotification({
                title: "Batch Cloud Deletion Failed",
                description: "Some deletions were successful locally but could not be synced.",
                variant: "destructive",
            });
        });
    }
}
