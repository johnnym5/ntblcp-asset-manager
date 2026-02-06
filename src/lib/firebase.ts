// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";

// Your web app's Firebase configuration is now loaded from environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// Check if all essential keys are present and not placeholders
export const isConfigValid = 
    firebaseConfig.apiKey &&
    firebaseConfig.projectId;

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let rtdb: Database | undefined;

// Initialize Firebase only on the client side and if config is valid
if (typeof window !== 'undefined') {
  if (isConfigValid) {
    try {
      app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
      db = getFirestore(app);
      rtdb = getDatabase(app);
    } catch (e) {
      console.error("Firebase initialization error:", e);
    }
  } else {
    // This warning helps developers who haven't set up their .env file.
    console.warn("Firebase configuration is missing or incomplete. Online features will be disabled. Please create and populate a .env file for local development as described in the README.");
  }
}

// Export the initialized services for use throughout the app.
export { app, db, rtdb };
