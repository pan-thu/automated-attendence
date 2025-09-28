const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app;
let auth;
let db;
let storage;

async function initialize() {
  if (app) return { app, auth, db, storage };

  if (typeof window === "undefined") {
    throw new Error("Firebase can only be initialized in the browser");
  }

  const [{ initializeApp, getApps, getApp }, { getAuth }, { getFirestore }, { getStorage }] = await Promise.all([
    import("firebase/app"),
    import("firebase/auth"),
    import("firebase/firestore"),
    import("firebase/storage"),
  ]);

  if (!firebaseConfig.apiKey) {
    throw new Error("Missing Firebase configuration. Verify NEXT_PUBLIC_FIREBASE_* env vars.");
  }

  const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

  app = firebaseApp;
  auth = getAuth(firebaseApp);
  db = getFirestore(firebaseApp);
  storage = getStorage(firebaseApp);

  return { app, auth, db, storage };
}

export async function getFirebase() {
  if (typeof window === "undefined") {
    throw new Error("Firebase is not available in SSR contexts.");
  }
  return initialize();
}

export async function getFirebaseAuth() {
  return (await getFirebase()).auth;
}

export async function getFirebaseFirestore() {
  return (await getFirebase()).db;
}

export async function getFirebaseStorage() {
  return (await getFirebase()).storage;
}
