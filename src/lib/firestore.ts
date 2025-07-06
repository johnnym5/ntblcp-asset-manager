
'use client';

import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  getDoc,
  setDoc,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';
import { TARGET_SHEETS } from './constants';

// --- User Profile ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  const docSnap = await getDoc(userDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(user: User): Promise<UserProfile> {
  const userDocRef = doc(db, 'users', user.uid);
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'user', // Default role
  };
  await setDoc(userDocRef, newUserProfile);
  return newUserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, data, { merge: true });
}

// --- Assets ---
export async function saveAssetsToFirestore(assetsBySheet: { [sheetName: string]: Asset[] }) {
  const batch = writeBatch(db);
  let totalAssets = 0;

  for (const sheetName in assetsBySheet) {
    const assets = assetsBySheet[sheetName];
    const collectionRef = collection(db, sheetName); // Use sheet name as collection ID
    assets.forEach((asset) => {
      const docRef = doc(collectionRef, asset.id);
      batch.set(docRef, asset);
      totalAssets++;
    });
  }

  if (totalAssets > 0) {
    await batch.commit();
  }
  return totalAssets;
}

export function getAssetsListener(
  callback: (assets: Asset[]) => void,
  userProfile?: UserProfile | null
) {
  // This listener is a composite of listeners for each target sheet.
  // It fetches all assets the user is allowed to see.
  const assetsByCategory: { [key: string]: Asset[] } = {};

  const unsubscribes = TARGET_SHEETS.map(category => {
    let q = query(collection(db, category));

    // For non-admin users, filter by their assigned state at the query level.
    // This is important for security and data reduction.
    if (userProfile?.role === 'user' && userProfile.state) {
      q = query(q, where('location', '==', userProfile.state));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data() as Asset);
      assetsByCategory[category] = docs;

      // Combine assets from all categories and update the state via callback
      const allAssets = Object.values(assetsByCategory).flat();
      callback(allAssets);
    }, (error) => {
      console.error(`Error listening to ${category}:`, error);
      // Even if one listener fails, we should update with the rest
      delete assetsByCategory[category];
      const allAssets = Object.values(assetsByCategory).flat();
      callback(allAssets);
    });

    return unsubscribe;
  });

  // Return a function that unsubscribes from all listeners
  return () => {
    unsubscribes.forEach(unsub => unsub());
  };
}


export async function updateAsset(asset: Asset) {
  const assetRef = doc(db, asset.category, asset.id);
  await setDoc(assetRef, asset, { merge: true });
}

export async function deleteAsset(asset: Asset) {
  const assetRef = doc(db, asset.category, asset.id);
  await deleteDoc(assetRef);
}
