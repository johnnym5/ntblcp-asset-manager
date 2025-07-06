'use client';

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Asset, RoomUser } from '@/lib/types';
import type { AssetFormValues } from '@/components/asset-form';
import type { User } from 'firebase/auth';

// ASSET CRUD in Room
export function getAssetsStream(roomId: string, callback: (assets: Asset[]) => void) {
  const assetsCol = collection(db, 'rooms', roomId, 'assets');
  return onSnapshot(assetsCol, (snapshot) => {
    const assets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Asset));
    callback(assets);
  });
}

export async function addAsset(roomId: string, assetData: AssetFormValues, photoUrl: string) {
  const assetsCol = collection(db, 'rooms', roomId, 'assets');
  await addDoc(assetsCol, {
    ...assetData,
    photoUrl,
  });
}

export async function updateAsset(roomId: string, assetId: string, assetData: Partial<Asset>) {
  const assetRef = doc(db, 'rooms', roomId, 'assets', assetId);
  await updateDoc(assetRef, assetData);
}

export async function deleteAsset(roomId: string, assetId: string) {
  const assetRef = doc(db, 'rooms', roomId, 'assets', assetId);
  await deleteDoc(assetRef);
}

// PRESENCE MANAGEMENT
export function getRoomUsersStream(roomId: string, callback: (users: RoomUser[]) => void) {
  const usersCol = collection(db, 'rooms', roomId, 'users');
  const q = query(usersCol, where('lastSeen', '>', new Date(Date.now() - 1000 * 60))); // Active in last minute
  
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => doc.data() as RoomUser);
    callback(users);
  });
}

export async function updateUserPresence(roomId: string, user: User) {
  const userRef = doc(db, 'rooms', roomId, 'users', user.uid);
  try {
     await setDoc(userRef, {
      id: user.uid,
      displayName: user.isAnonymous ? 'Anonymous' : (user.displayName || user.email),
      photoURL: user.photoURL,
      lastSeen: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error("Failed to update user presence: ", error);
  }
}


// Helper to get a server-safe timestamp
export function getTimestamp() {
  return Timestamp.now();
}
