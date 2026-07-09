import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = firebaseConfig.apiKey 
  ? initializeApp(firebaseConfig) 
  : initializeApp({ apiKey: 'dummy', authDomain: 'dummy', projectId: 'dummy' });

if (!firebaseConfig.apiKey) {
  console.error("FIREBASE CONFIG MISSING: Please create a .env file with VITE_FIREBASE_* variables.");
}

export const auth = getAuth(app);
export const db = getFirestore(app);
