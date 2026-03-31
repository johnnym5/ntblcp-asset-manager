'use client';

/**
 * @fileOverview Abstraction layer for Firebase Authentication.
 * Handles session-level persistence and provides a clean interface for the AuthContext.
 * singleton promise pattern prevents auth/too-many-requests during high-frequency boots.
 */

import { 
  signInAnonymously, 
  signOut, 
  onAuthStateChanged, 
  type User 
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logger } from '@/lib/logger';

// singleton promise to handle concurrent ensureSession pulses
let signInPromise: Promise<User | null> | null = null;

export const FirebaseAuthService = {
  /**
   * Initializes a system session. 
   * Uses anonymous auth as a base for custom RBAC state.
   */
  async ensureSession(): Promise<User | null> {
    if (!auth) return null;
    if (auth.currentUser) return auth.currentUser;
    if (signInPromise) return signInPromise;

    signInPromise = (async () => {
      try {
        const credential = await signInAnonymously(auth);
        return credential.user;
      } catch (e) {
        logger.error("Firebase Auth: Failed to initialize session", e);
        return null;
      } finally {
        signInPromise = null;
      }
    })();

    return signInPromise;
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
