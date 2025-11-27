import * as firebaseAdmin from 'firebase-admin';
import * as path from 'path';

// Initialize synchronously at module load time
if (!firebaseAdmin.apps.length) {
  // Check if running locally with service account credentials
  const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

  if (serviceAccountPath) {
    // Local development with emulators - use explicit service account
    try {
      // Resolve path relative to functions directory
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(__dirname, '..', serviceAccountPath);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const serviceAccount = require(resolvedPath);

      firebaseAdmin.initializeApp({
        credential: firebaseAdmin.credential.cert(serviceAccount),
        storageBucket: process.env.STORAGE_BUCKET || 'automated-attendence-6fc07.firebasestorage.app'
      });

      console.log('✅ Firebase Admin initialized with service account credentials');
    } catch (error) {
      console.warn('⚠️  Failed to load service account, using default initialization:', error);
      firebaseAdmin.initializeApp();
    }
  } else {
    // Production - use Application Default Credentials
    firebaseAdmin.initializeApp();
  }
}

// Export initialized admin instance (works for both value and type usage)
export const admin: typeof firebaseAdmin = firebaseAdmin;


