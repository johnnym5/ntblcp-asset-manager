// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { 
  initializeFirestore, 
  getFirestore,
  type Firestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { getAuth, type Auth } from "firebase/auth";
import { firebaseConfig as staticConfig } from "@/firebase/config";

/**
 * ASSETAIN FIREBASE INITIALIZATION PULSE
 * 
 * Authoritative source for Firebase SDK instances.
 * Hardened for high-latency resilience and idempotent multi-tab stability.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || staticConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || staticConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || staticConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || staticConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || staticConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || staticConfig.appId,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || staticConfig.databaseURL,
};

export const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;
export const isRtdbConfigValid = isConfigValid && !!firebaseConfig.databaseURL;

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;

if (typeof window !== 'undefined') {
  if (isConfigValid) {
    try {
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      
      // Idempotent Firestore Protocol: Prevents lease contestation and backfill errors.
      try {
        db = initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
          }),
          experimentalForceLongPolling: true,
          ignoreUndefinedProperties: true
        });
      } catch (e) {
        db = getFirestore(app);
      }

      auth = getAuth(app);
      if (isRtdbConfigValid) {
        rtdb = getDatabase(app);
      }
    } catch (e) {
      console.error("Firebase Initialization Failure:", e);
    }
  }
}

export { app, db, auth, rtdb };
