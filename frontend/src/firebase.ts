import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;

if (auth) {
  void setPersistence(auth, browserLocalPersistence);
}

const adminEmailSet = new Set(
  (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function isFirebaseConfigured(): boolean {
  return hasFirebaseConfig;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmailSet.has(email.toLowerCase());
}

export function observeAuthState(callback: (user: User | null) => void): (() => void) | null {
  if (!auth) return null;
  return onAuthStateChanged(auth, callback);
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error("Firebase web configuration is missing.");
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  if (!credential.user.emailVerified && !isAdminEmail(email)) {
    await signOut(auth);
    throw new Error("Please verify your email address before logging in.");
  }
  return credential.user;
}

export async function signUpVolunteerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  if (!auth) {
    throw new Error("Firebase web configuration is missing.");
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  await sendEmailVerification(credential.user);
  await signOut(auth); // Prevent auto-login after signup
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export async function getFirebaseIdToken(): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken();
}
