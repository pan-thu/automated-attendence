/**
 * Firestore Seeding Script
 *
 * Seeds Firestore with initial data for development/testing:
 * - Admin user with custom claims
 * - Default company settings
 *
 * Usage:
 *   npm run seed:firestore
 *
 * Requirements:
 *   - GOOGLE_APPLICATION_CREDENTIALS must be set in .env
 *   - SEED_ADMIN_UID must be set in .env (the UID of the admin user)
 */

import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Check if we're using emulators
  // Default to emulator for development unless explicitly set to production
  const useProduction = process.env.USE_PRODUCTION === 'true';
  const useEmulator = !useProduction;

  if (useEmulator) {
    console.log('🔧 Using Firebase Emulators');
    // Set emulator hosts for Admin SDK
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

    // For emulators, use the actual project ID from firebase.json
    admin.initializeApp({ projectId: 'automated-attendence-6fc07' });
  } else {
    console.log('☁️  Using Production Firestore');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  }
}

const db = admin.firestore();
const auth = admin.auth();

/**
 * Default company settings
 */
const defaultCompanySettings = {
  // Time windows for 3-check system
  timeWindows: {
    check1: {
      start: '08:30',
      end: '09:15',
      name: 'Morning Check-In',
    },
    check2: {
      start: '13:00',
      end: '14:00',
      name: 'Lunch Return',
    },
    check3: {
      start: '16:45',
      end: '17:30',
      name: 'Evening Check-Out',
    },
  },

  // Grace periods (in minutes) - per check slot
  gracePeriods: {
    check1: 30, // Late arrival grace for morning check
    check2: 30, // Late arrival grace for lunch return
    check3: 30, // Early leave and late checkout grace for evening
  },

  // Geofencing
  workplace_center: new admin.firestore.GeoPoint(6.9271, 79.8612), // Colombo, Sri Lanka (example)
  workplace_radius: 100, // meters

  // Penalty rules - violation thresholds and amounts per violation type
  penaltyRules: {
    // Each violation type has a threshold (4th violation triggers penalty)
    violationThresholds: {
      absent: 4,           // Full absent - miss more than 1 check
      half_day_absent: 4,  // Half-day absent - miss exactly 1 check
      late: 4,             // Late arrival - check-in within grace period
      early_leave: 4,      // Early leave - check-out before window with grace
    },
    // Penalty amounts per violation type (in USD)
    amounts: {
      absent: 20,
      half_day_absent: 15,
      late: 10,
      early_leave: 10,
    },
  },

  // Leave settings
  leaveAttachmentRequiredTypes: ['Medical', 'Maternity'],
  allowedLeaveAttachmentTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ],
  maxLeaveAttachmentSizeMb: 5,

  // Leave balances (annual defaults)
  defaultLeaveBalances: {
    annual: 14,
    sick: 7,
    medical: 7,
    maternity: 84,
    paternity: 7,
  },

  // Metadata
  createdAt: admin.firestore.FieldValue.serverTimestamp(),
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  version: 1,
};

/**
 * Seed company settings
 */
async function seedCompanySettings() {
  console.log('\n📋 Seeding Company Settings...');

  const settingsRef = db.collection('COMPANY_SETTINGS').doc('main');
  const settingsDoc = await settingsRef.get();

  if (settingsDoc.exists) {
    console.log('⚠️  Company settings already exist. Skipping.');
    return;
  }

  await settingsRef.set(defaultCompanySettings);
  console.log('✅ Company settings created successfully');
}

/**
 * Seed admin user with custom claims
 */
async function seedAdminUser() {
  console.log('\n👤 Seeding Admin User...');

  const adminUid = process.env.SEED_ADMIN_UID;
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const useEmulator = process.env.USE_PRODUCTION !== 'true';

  if (!adminUid) {
    console.error('❌ SEED_ADMIN_UID environment variable not set');
    console.log('   Please set SEED_ADMIN_UID in functions/.env');
    return;
  }

  try {
    let userRecord;

    // Check if user exists
    try {
      userRecord = await auth.getUser(adminUid);
      console.log(`   Found existing user: ${userRecord.email}`);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' && useEmulator) {
        // Create user in emulator
        console.log(`   Creating test admin user in emulator...`);
        userRecord = await auth.createUser({
          uid: adminUid,
          email: adminEmail,
          password: adminPassword,
          displayName: 'Admin',
          emailVerified: true,
        });
        console.log(`   ✅ Created user: ${userRecord.email}`);
      } else {
        throw error;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(adminUid, {
      role: 'admin',
    });
    console.log('✅ Admin custom claims set successfully');

    // Create/update user document in Firestore
    const userRef = db.collection('USERS').doc(adminUid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      console.log('⚠️  Admin user document already exists. Updating role...');
      await userRef.update({
        role: 'admin',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      console.log('   Creating admin user document...');
      await userRef.set({
        email: userRecord.email || adminEmail,
        name: userRecord.displayName || 'System Administrator',
        role: 'admin',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Admin user document created');
    }

    console.log('\n🔑 Admin user setup complete!');
    console.log(`   UID: ${adminUid}`);
    console.log(`   Email: ${userRecord.email}`);
    if (useEmulator) {
      console.log(`   Password: ${adminPassword}`);
    }
    console.log('   Role: admin');
    console.log('\n   ⚠️  Note: The user must sign out and sign back in to refresh their token and get the new role claim.');

  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User with UID "${adminUid}" not found in Firebase Auth`);
      console.log('   Please create the user first using Firebase Console or Auth API');
    } else {
      console.error('❌ Error setting up admin user:', error);
    }
  }
}

/**
 * Main seeding function
 */
async function seed() {
  console.log('🌱 Starting Firestore Seed...\n');
  console.log('=' .repeat(50));

  try {
    await seedCompanySettings();
    await seedAdminUser();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Seeding completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seed();
