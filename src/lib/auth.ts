
'use client';

import { 
  auth,
} from './firebase';
import {
  signInAnonymously,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';

/**
 * Ensures the user is signed in anonymously to Firebase.
 * This provides a valid authentication token for Firestore requests.
 * @returns A promise that resolves with the anonymous user credential.
 */
export const ensureAnonymousSession = (): Promise<FirebaseUser> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // We only need this once to check the initial state.
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then(userCredential => resolve(userCredential.user))
          .catch(error => reject(error));
      }
    });
  });
};
