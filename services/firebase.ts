import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyAb3brUxybrrm4Wg3YUJ9DQMl3RGozuHf8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'kronus-55870.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'kronus-55870',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'kronus-55870.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '586104660512',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:586104660512:web:2d00bed89e3ab86dc59245',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? 'G-EZRR2H7Y2L',
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function getFirebaseApp(): FirebaseApp {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0] as FirebaseApp;
  }
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
  }
  return auth;
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export { firebaseConfig };
