/**
 * Set Admin Custom Claims
 *
 * Sets the 'admin' role custom claim for a specified user.
 *
 * Usage:
 *   ADMIN_EMAIL=panthu200@gmail.com npm run set-admin
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase Admin for production
const serviceAccountPath = process.env.SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  console.error('❌ SERVICE_ACCOUNT_PATH not set in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(require(path.resolve(__dirname, '../..', serviceAccountPath))),
});

const auth = admin.auth();

async function setAdminClaims() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;

  if (!adminEmail) {
    console.error('❌ ADMIN_EMAIL environment variable not set');
    console.log('   Usage: ADMIN_EMAIL=your@email.com npm run set-admin');
    process.exit(1);
  }

  try {
    console.log(`\n🔍 Looking up user: ${adminEmail}`);

    // Get user by email
    const userRecord = await auth.getUserByEmail(adminEmail);
    console.log(`   Found user with UID: ${userRecord.uid}`);

    // Check current claims
    const currentClaims = userRecord.customClaims || {};
    console.log(`   Current claims:`, currentClaims);

    // Set admin claim
    await auth.setCustomUserClaims(userRecord.uid, {
      ...currentClaims,
      role: 'admin',
    });

    console.log('✅ Admin custom claims set successfully');
    console.log('\n📝 Next steps:');
    console.log('   1. Update functions/.env with:');
    console.log(`      SEED_ADMIN_UID=${userRecord.uid}`);
    console.log('   2. Sign out of the admin panel');
    console.log('   3. Sign back in to refresh your token');
    console.log('   4. You should now have admin access!');

    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setAdminClaims();
