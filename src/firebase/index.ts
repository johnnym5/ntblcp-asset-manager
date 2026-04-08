'use client';

/**
 * @fileOverview Firebase SDK Gateway.
 * Proxies authoritative instances from the centralized library to ensure 
 * single-instance parity and high-latency resilience.
 */

import { app, db, auth } from '@/lib/firebase';

export function initializeFirebase() {
  return {
    firebaseApp: app!,
    auth: auth!,
    firestore: db!
  };
}

export { app as firebaseApp, auth, db as firestore };

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
