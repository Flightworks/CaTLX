import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  useEmulators: boolean;
}

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const requiredKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const readEnv = (key: string): string => {
  const value = (import.meta.env as unknown as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
};

export const isFirebaseConfigured = (): boolean =>
  requiredKeys.every((key) => readEnv(key).length > 0);

export const getFirebaseConfig = (): FirebaseConfig => {
  const missing = requiredKeys.filter((key) => !readEnv(key));
  if (missing.length > 0) {
    throw new Error(`Firebase configuration is incomplete. Missing: ${missing.join(', ')}`);
  }

  return {
    apiKey: readEnv('VITE_FIREBASE_API_KEY'),
    authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
    projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
    appId: readEnv('VITE_FIREBASE_APP_ID'),
    useEmulators: readEnv('VITE_USE_FIREBASE_EMULATORS').toLowerCase() === 'true',
  };
};

let emulatorConnectionsConfigured = false;

export const initializeFirebase = (): FirebaseServices => {
  const config = getFirebaseConfig();
  const app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey: config.apiKey,
    authDomain: config.authDomain,
    projectId: config.projectId,
    appId: config.appId,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  if (config.useEmulators && !emulatorConnectionsConfigured) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    // Port 8080 is occupied by qBittorrent on the development machine.
    connectFirestoreEmulator(db, '127.0.0.1', 8081);
    emulatorConnectionsConfigured = true;
  }

  return { app, auth, db };
};

export const resetFirebaseEmulatorConnectionStateForTests = (): void => {
  emulatorConnectionsConfigured = false;
};
