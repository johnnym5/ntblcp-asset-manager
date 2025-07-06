
'use client';

import type { Asset, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

// --- User Profile ---
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  console.log("Firestore is disabled. Returning null for user profile.");
  return Promise.resolve(null);
}

export async function createUserProfile(user: User): Promise<UserProfile> {
  console.log("Firestore is disabled. Mocking user profile creation.");
  const newUserProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    role: 'user', // Default role
  };
  return Promise.resolve(newUserProfile);
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>) {
  console.log("Firestore is disabled. Skipping user profile update.");
  return Promise.resolve();
}

// --- Assets ---
export async function saveAssetsToFirestore(assetsBySheet: { [sheetName: string]: Asset[] }) {
  console.log("Firestore is disabled. Skipping save to Firestore.");
  const totalAssets = Object.values(assetsBySheet).reduce((acc, assets) => acc + assets.length, 0);
  return Promise.resolve(totalAssets);
}

export function getAssetsListener(
  callback: (assets: Asset[]) => void,
  userProfile?: UserProfile | null
) {
  console.log("Firestore is disabled. Not listening for assets.");
  // Immediately return an empty array and a no-op unsubscribe function
  callback([]);
  return () => {};
}


export async function updateAsset(asset: Asset) {
  console.log(`Firestore is disabled. Skipping update for asset: ${asset.id}`);
  return Promise.resolve();
}

export async function deleteAsset(asset: Asset) {
  console.log(`Firestore is disabled. Skipping delete for asset: ${asset.id}`);
  return Promise.resolve();
}

export async function batchDeleteAssets(assetsToDelete: Asset[]) {
  console.log(`Firestore is disabled. Skipping batch delete for ${assetsToDelete.length} assets.`);
  return Promise.resolve();
}
