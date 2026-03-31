'use client';

/**
 * @fileOverview Abstraction layer for Firebase Authentication.
 * Handles session-level persistence and provides a clean interface for the AuthContext.
 */

import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

let isSigningIn = false;

export const FirebaseAuthService = {
  /**
   * Initializes a system session. 
   * Uses anonymous auth as a base for custom RBAC state.
   */
  async ensureSession(): Promise<User | null> {
    if (!auth || isSigningIn) return auth?.currentUser || null;
    try {
      if (auth.currentUser) return auth.currentUser;
      
      isSigningIn = true;
      const credential = await signInAnonymously(auth);
      isSigningIn = false;
      return credential.user;
    } catch (e) {
      isSigningIn = false;
      logger.error("Firebase Auth: Failed to initialize session", e);
      return null;
    }
  },

  /**
   * Signs out the current session and clears persistent state.
   */
  async terminateSession(): Promise<void> {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch (e) {
      logger.error("Firebase Auth: Failed to terminate session", e);
    }
  },

  /**
   * Listens for auth state changes.
   */
  subscribeToAuthState(callback: (user: User | null) => void) {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  }
};
