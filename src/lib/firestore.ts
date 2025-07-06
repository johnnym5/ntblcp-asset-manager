
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
  getDocs,
  collectionGroup,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, UserProfile } from '@/lib/types';
import type { User } from 'firebase/auth';

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
  categories: string[],
  callback: (assets: Asset[]) => void,
  userProfile?: UserProfile | null
) {
  if (categories.length === 0) {
    callback([]);
    return () => {};
  }
  
  // This is complex. For "All Sheets", we need multiple listeners.
  // For simplicity in this phase, we'll listen to one category at a time.
  // A more robust solution would query across collections.
  const category = categories[0];
  let q = query(collection(db, category));
  
  // Apply state-based filtering if user is not an admin
  if (userProfile?.role === 'user' && userProfile.state) {
      q = query(collection(db, category), where('location', '==', userProfile.state));
      // In a real app, you might need to query on 'lga' as well, which requires composite indexes.
  }

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const assets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
    callback(assets);
  }, (error) => {
    console.error(`Error listening to ${category}:`, error);
    callback([]);
  });

  return unsubscribe;
}

export async function getAllAssets(userProfile?: UserProfile | null): Promise<Asset[]> {
    const q = query(collectionGroup(db, 'assets')); // This requires Firestore indexes
    const querySnapshot = await getDocs(q);
    const allAssets = querySnapshot.docs.map(doc => doc.data() as Asset);

    if (userProfile?.role === 'user' && userProfile.state) {
        return allAssets.filter(asset => asset.location === userProfile.state || asset.lga === userProfile.state);
    }
    
    return allAssets;
}

export async function updateAsset(asset: Asset) {
  const assetRef = doc(db, asset.category, asset.id);
  await setDoc(assetRef, asset, { merge: true });
}

export async function deleteAsset(asset: Asset) {
  const assetRef = doc(db, asset.category, asset.id);
  await deleteDoc(assetRef);
}
