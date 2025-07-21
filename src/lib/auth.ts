
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
  sendPasswordResetEmail,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult
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

export const signUpWithEmail = async (email: string, password: string, displayName: string): Promise<User | null> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseProfile(userCredential.user, { displayName });
    
    // Create the user profile document in Firestore
    await createUserProfile(userCredential.user);

    return userCredential.user;
  } catch (error) {
    console.error("Error signing up with email and password: ", error);
    throw error;
  }
};


export const anonymousSignIn = async (): Promise<User | null> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error('Error signing in anonymously', error);
    throw error;
  }
};

export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Error sending password reset email: ", error);
    throw error;
  }
};

export const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
  if (typeof window === 'undefined') {
    throw new Error("reCAPTCHA can only be set up in the browser.");
  }
  // This ensures the verifier is only created once per element.
  if ((window as any).recaptchaVerifier) {
    (window as any).recaptchaVerifier.clear();
  }
  
  const verifier = new RecaptchaVerifier(auth, elementId, {
    size: 'invisible',
    callback: (response: any) => {
      // reCAPTCHA solved, allow signInWithPhoneNumber.
    },
  });

  (window as any).recaptchaVerifier = verifier;
  return verifier;
}

export const sendVerificationCode = async (phoneNumber: string, appVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        return confirmationResult;
    } catch(error) {
        console.error("Error sending verification code: ", error);
        throw error;
    }
}

export const confirmVerificationCode = async (confirmationResult: ConfirmationResult, code: string): Promise<User | null> => {
    try {
        const userCredential = await confirmationResult.confirm(code);
        return userCredential.user;
    } catch(error) {
        console.error("Error confirming verification code: ", error);
        throw error;
    }
}

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};
