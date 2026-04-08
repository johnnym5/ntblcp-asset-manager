// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { 
  initializeFirestore, 
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
 * This is the authoritative source for Firebase SDK instances.
 * Configured for high-latency resilience using Long Polling to bypass
 * the default 10s stream timeout in restricted networks.
 */

// Your web app's Firebase configuration is loaded from environment variables with static fallbacks.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || staticConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || staticConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || staticConfig.projectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || staticConfig.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || staticConfig.messagingSenderId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || staticConfig.appId,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || staticConfig.databaseURL,
};

// Check if all essential keys are present
export const isConfigValid = 
    !!firebaseConfig.apiKey &&
    !!firebaseConfig.projectId;

export const isRtdbConfigValid = 
    isConfigValid && !!firebaseConfig.databaseURL;

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;
let rtdb: Database | undefined;

// Initialize Firebase only on the client side and if config is valid
if (typeof window !== 'undefined') {
  if (isConfigValid) {
    try {
      // Ensure we only initialize once to prevent connection overhead
      if (!getApps().length) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApp();
      }
      
      /**
       * RESILIENCE PULSE: Hardened Firestore
       * We use initializeFirestore instead of getFirestore to enable 
       * experimentalForceLongPolling. This mitigates the "Backend didn't respond 
       * within 10 seconds" error encountered in low-bandwidth regional scopes.
       * 
       * We also enable ignoreUndefinedProperties to prevent mutation failures
       * on optional registry fields.
       */
      db = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        }),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
      });

      auth = getAuth(app);
      if (isRtdbConfigValid) {
        rtdb = getDatabase(app);
      }
    } catch (e) {
      console.error("Firebase initialization error:", e);
    }
  } else {
    console.warn("Firebase configuration is missing or incomplete. Online features will be disabled.");
  }
}

// Export the initialized services for use throughout the app.
export { app, db, auth, rtdb };
