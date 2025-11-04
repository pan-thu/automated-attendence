import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

/**
 * Bug Fix #25: Lazy Firebase config initialization.
 * Config is created on first access to ensure NEXT_PUBLIC_ vars are available.
 */
function getFirebaseConfig() {
  // In Next.js, NEXT_PUBLIC_ vars are replaced at build time
  // Access them directly, not via process.env
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  };

  // Validate required fields
  const requiredFields: (keyof typeof config)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missing = requiredFields.filter(field => !config[field]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Firebase configuration: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_* variables are set.'
    );
  }

  return config;
}

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;

const assertBrowser = () => {
  if (typeof window === "undefined") {
    throw new Error("Firebase is only available in the browser environment.");
  }
};

export const getFirebaseApp = (): FirebaseApp => {
  assertBrowser();
  if (!firebaseApp) {
    const config = getFirebaseConfig();
    firebaseApp = getApps().length ? getApp() : initializeApp(config);
  }
  return firebaseApp;
};

export const getFirebaseAuth = (): Auth => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp());
  }
  return firebaseAuth;
};

export const getFirebaseFirestore = (): Firestore => {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getFirebaseApp());
  }
  return firestoreInstance;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp());
  }
  return storageInstance;
};

// Connect to Firebase Emulators in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const useEmulators = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  if (useEmulators) {
    const app = getFirebaseApp();
    const auth = getAuth(app);
    const db = getFirestore(app);
    const functions = getFunctions(app);
    const storage = getStorage(app);

    // Determine emulator host - use environment variable or default to localhost
    const emulatorHost = process.env.NEXT_PUBLIC_EMULATOR_HOST || 'localhost';

    // Connect to emulators (only called once)
    try {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
      connectFirestoreEmulator(db, emulatorHost, 8080);
      connectFunctionsEmulator(functions, emulatorHost, 5001);
      connectStorageEmulator(storage, emulatorHost, 9199);

      console.log(`🔧 Connected to Firebase Emulators @ ${emulatorHost}`);
    } catch (error) {
      console.log(error);
    }
  }
}
