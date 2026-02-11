// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getDatabase, type Database } from 'firebase/database';

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyBoU-iXGO0600841daa1LZzSlfRuZojXxA",
  authDomain: "globalassethub.firebaseapp.com",
  databaseURL: "https://globalassethub-default-rtdb.firebaseio.com",
  projectId: "globalassethub",
  storageBucket: "globalassethub.appspot.com",
  messagingSenderId: "296731745587",
  appId: "1:296731745587:web:d3df3d38247e2b3073b246"
};


// Check if all essential keys are present and not placeholders
export const isConfigValid = 
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.databaseURL;

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
    console.error("Firebase configuration is missing or incomplete. Online features will be disabled.");
  }
}

// Export the initialized services for use throughout the app.
export { app, db, rtdb };
