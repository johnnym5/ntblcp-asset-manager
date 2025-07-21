// This file contains all the client-side Firebase authentication functions.
'use client';

import {
  auth
} from '@/lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  updateProfile as updateFirebaseProfile,
} from 'firebase/auth';
import { createUserProfile } from './firestore';

export const loginWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email and password: ", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName: string, state: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseProfile(userCredential.user, { displayName });
    
    // Create the user profile document in Firestore
    await createUserProfile(userCredential.user, { displayName, state });

    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email and password: ", error);
    throw error;
  }
};


export const anonymousSignIn = async () => {
  try {
    const userCredential = await signInAnonymously(auth);
    // Create a guest profile in Firestore
    await createUserProfile(userCredential.user, { role: 'guest', displayName: 'Guest User' });
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously', error);
    throw error;
  }
};
