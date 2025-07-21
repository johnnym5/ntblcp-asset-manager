
// This file contains all the client-side Firebase authentication functions.
'use client';

import {
  auth,
  googleProvider,
} from '@/lib/firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously,
  updateProfile as updateFirebaseProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { createUserProfile } from './firestore';

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    return null;
  }
};

export const loginWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in with email and password: ", error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string, displayName: string, state: string): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseProfile(userCredential.user, { displayName });
    await createUserProfile(userCredential.user, { state, displayName });
    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email and password: ", error);
    throw error;
  }
};

export const anonymousSignIn = async (): Promise<User | null> => {
  try {
    const userCredential = await signInAnonymously(auth);
    await createUserProfile(userCredential.user, { displayName: 'Guest User', state: 'All' });
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};

// --- Phone Auth Functions ---

export const setupRecaptcha = (containerId: string): RecaptchaVerifier => {
  if (typeof window === 'undefined') {
    throw new Error("reCAPTCHA can only be set up in the browser.");
  }
  
  (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    'size': 'invisible',
    'callback': (response: any) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    }
  });
  return (window as any).recaptchaVerifier;
};


export const sendVerificationCode = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
  return signInWithPhoneNumber(auth, phoneNumber, appVerifier);
};

export const confirmVerificationCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User> => {
  const userCredential = await confirmationResult.confirm(code);
  const user = userCredential.user;

  // Since phone auth doesn't have email/name, we create a basic profile.
  // The user should be prompted to complete their profile later if needed.
  await createUserProfile(user, { displayName: `User ${user.phoneNumber}` });

  return user;
};
