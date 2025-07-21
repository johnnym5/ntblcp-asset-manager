
// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyB9O662zXyyJkhtle1snkNLapre3_Sa3rc",
  authDomain: "ntblcp-asset-manager-k7hy1.firebaseapp.com",
  projectId: "ntblcp-asset-manager-k7hy1",
  storageBucket: "ntblcp-asset-manager-k7hy1.appspot.com",
  messagingSenderId: "45027293772",
  appId: "1:45027293772:web:0116cfaa586d17fa4c52e9"
};


// Initialize Firebase.
// This pattern prevents re-initializing the app on hot-reloads.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get references to the Firebase services we'll use.
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);


// Export the initialized services for use throughout the app.
export { app, auth, db, storage };
