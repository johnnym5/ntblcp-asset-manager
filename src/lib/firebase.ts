// Import the necessary functions from the Firebase SDKs.
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyBoU-iXGO0600841daa1LZzSlfRuZojXxA",
  authDomain: "globalassethub.firebaseapp.com",
  projectId: "globalassethub",
  storageBucket: "globalassethub.appspot.com",
  messagingSenderId: "296731745587",
  appId: "1:296731745587:web:91f0e8a28ca497e973b246"
};


// Initialize Firebase.
// This pattern prevents re-initializing the app on hot-reloads.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Get references to the Firebase services we'll use.
const db = getFirestore(app);

// Export the initialized services for use throughout the app.
export { app, db };
