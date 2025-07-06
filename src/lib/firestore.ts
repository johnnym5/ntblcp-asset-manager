
'use client';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

// --- User Profile ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
}

export async function createUserProfile(user: User): Promise<UserProfile> {
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'user', // Default role
  };
  await setDoc(doc(db, 'users', user.uid), newUserProfile);
  return newUserProfile;
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, data, { merge: true });
}

// --- Assets ---
// Asset functions are disabled to keep the app in local/offline mode.
export async function saveAssetsToFirestore(assetsBySheet: { [sheetName: string]: Asset[] }) {
  console.log("Firestore is disabled for assets. Skipping save to Firestore.");
  const totalAssets = Object.values(assetsBySheet).reduce((acc, assets) => acc + assets.length, 0);
  return Promise.resolve(totalAssets);
}

export function getAssetsListener(
  callback: (assets: Asset[]) => void,
  userProfile?: UserProfile | null
) {
  console.log("Firestore is disabled for assets. Not listening for assets.");
  // Immediately return an empty array and a no-op unsubscribe function
  callback([]);
  return () => {};
}


export async function updateAsset(asset: Asset) {
  console.log(`Firestore is disabled for assets. Skipping update for asset: ${asset.id}`);
  return Promise.resolve();
}

export async function deleteAsset(asset: Asset) {
  console.log(`Firestore is disabled for assets. Skipping delete for asset: ${asset.id}`);
  return Promise.resolve();
}

export async function batchDeleteAssets(assetsToDelete: Asset[]) {
  console.log(`Firestore is disabled for assets. Skipping batch delete for ${assetsToDelete.length} assets.`);
  return Promise.resolve();
}
