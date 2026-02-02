import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updatePassword,
  reload,
  signOut,
  type Auth,
  type ActionCodeSettings,
  type User as FirebaseUser,
} from 'firebase/auth';
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

const FIRESTORE_ENABLED = (import.meta.env.VITE_FIRESTORE_ENABLED ?? 'true') !== 'false';

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

/** Aguarda o estado de autenticação estar definido (útil logo após sign-in para o Firestore ter o token). */
export function waitForAuthState(): Promise<void> {
  return getFirebaseAuth().authStateReady();
}

export function isFirestoreEnabled(): boolean {
  return FIRESTORE_ENABLED;
}

export async function ensureFirebaseAuth(): Promise<boolean> {
  if (!isFirestoreEnabled()) return false;
  try {
    const firebaseAuth = getFirebaseAuth();
    const currentUser = firebaseAuth.currentUser;
    return !!currentUser;
  } catch (error) {
    console.warn('Firebase auth unavailable:', error);
    return false;
  }
}

export function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
  }
  return db;
}

export function getFirebaseCurrentUser(): FirebaseUser | null {
  return getFirebaseAuth().currentUser;
}

export async function createFirebaseUser(email: string, password: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
  return result.user;
}

export async function signInFirebaseUser(email: string, password: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return result.user;
}

export async function sendFirebaseVerificationEmail(user: FirebaseUser): Promise<void> {
  await sendEmailVerification(user);
}

export async function sendFirebasePasswordResetEmail(email: string, actionCodeSettings?: ActionCodeSettings): Promise<void> {
  await sendPasswordResetEmail(getFirebaseAuth(), email, actionCodeSettings);
}

export async function verifyFirebasePasswordResetCode(code: string): Promise<string> {
  return await verifyPasswordResetCode(getFirebaseAuth(), code);
}

export async function confirmFirebasePasswordReset(code: string, newPassword: string): Promise<void> {
  await confirmPasswordReset(getFirebaseAuth(), code, newPassword);
}

export async function reloadFirebaseUser(user: FirebaseUser): Promise<void> {
  await reload(user);
}

export async function updateFirebasePassword(user: FirebaseUser, newPassword: string): Promise<void> {
  await updatePassword(user, newPassword);
}

export async function signOutFirebase(): Promise<void> {
  await signOut(getFirebaseAuth());
}

export { firebaseConfig };
