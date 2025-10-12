import * as firebaseAdmin from 'firebase-admin';

// Initialize synchronously at module load time
if (!firebaseAdmin.apps.length) {
  firebaseAdmin.initializeApp();
}

// Export initialized admin instance (works for both value and type usage)
export const admin: typeof firebaseAdmin = firebaseAdmin;


