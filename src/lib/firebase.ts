// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from 'firebase/database';
import { logger } from "@/lib/logger";

// Firebase configuration loaded from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firestore requires apiKey + projectId.
const isConfigValid =
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId;

// Realtime Database additionally requires a databaseURL.
const isRtdbConfigValid =
    isConfigValid &&
    !!firebaseConfig.databaseURL;

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let rtdb: Database | undefined;

// Initialize Firebase only on the client side and if config is valid.
if (typeof window !== 'undefined') {
  if (isConfigValid) {
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      if (isRtdbConfigValid) {
        rtdb = getDatabase(app);
      } else {
        logger.warn("NEXT_PUBLIC_FIREBASE_DATABASE_URL is not set. Realtime Database features are disabled.");
      }
    } catch (e) {
      logger.error("Firebase initialization error:", e);
    }
  } else {
    logger.warn("Firebase configuration is missing or incomplete. Online features will be disabled. Please populate your .env file as described in the README.");
  }
}

// Export the initialized services for use throughout the app.
export { app, db, rtdb, firebaseConfig, isConfigValid, isRtdbConfigValid };
