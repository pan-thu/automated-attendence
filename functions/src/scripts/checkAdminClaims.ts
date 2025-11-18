/**
 * Check Admin Custom Claims
 *
 * Checks if a user has the admin custom claim set in Firebase Auth.
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('❌ SERVICE_ACCOUNT_PATH not set in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '../..', serviceAccountPath))),
});

const auth = admin.auth();

async function checkAdminClaims() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || 'panthu200@gmail.com';

  try {
    console.log(`\n🔍 Checking Firebase Auth custom claims for: ${adminEmail}\n`);

    const userRecord = await auth.getUserByEmail(adminEmail);

    console.log(`User ID: ${userRecord.uid}`);
    console.log(`Email: ${userRecord.email}`);
    console.log(`Email Verified: ${userRecord.emailVerified}`);
    console.log(`\nCustom Claims:`);
    console.log(JSON.stringify(userRecord.customClaims || {}, null, 2));

    const hasAdminClaim = userRecord.customClaims?.role === 'admin';

    if (hasAdminClaim) {
      console.log('\n✅ User HAS admin custom claim');
    } else {
      console.log('\n❌ User DOES NOT have admin custom claim');
      console.log('\nTo fix this, run:');
      console.log('  npm run set-admin');
    }

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminClaims();
