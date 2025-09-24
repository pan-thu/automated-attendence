import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import * as admin from 'firebase-admin';

const ENV_PATHS = [
  resolve(__dirname, '../../.env'),
];

for (const envPath of ENV_PATHS) {
  const result = loadEnv({ path: envPath, override: true });
  if (result.error) {
    continue;
  }
}

if (!admin.apps.length) {
  admin.initializeApp();
}

const firestore = admin.firestore();

const DEFAULT_COMPANY_SETTINGS = {
  companyName: 'Automated Attendance Inc.',
  timezone: 'Asia/Yangon',
  workplace_center: new admin.firestore.GeoPoint(16.8409, 96.1735),
  workplace_radius: 100,
  timeWindows: {
    check1: { label: 'Morning Check-In', start: '08:30', end: '09:15' },
    check2: { label: 'Post-Lunch', start: '13:00', end: '14:00' },
    check3: { label: 'End of Day', start: '16:45', end: '17:30' },
  },
  gracePeriods: {
    check1: 15,
    check2: 10,
    check3: 10,
  },
  penaltyRules: {
    violationThreshold: 4,
    amounts: {
      absent: 20,
      half_day_absent: 15,
      late: 10,
      early_leave: 10,
    },
  },
  leavePolicy: {
    full: 12,
    half: 12,
    medical: 10,
    maternity: 0,
  },
  workingDays: {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  },
  holidays: [],
  geoFencingEnabled: true,
};

async function resolveAdminUser() {
  const uid = process.env.SEED_ADMIN_UID?.trim();
  const email = process.env.SEED_ADMIN_EMAIL?.trim();

  if (!uid && !email) {
    throw new Error('Set SEED_ADMIN_UID or SEED_ADMIN_EMAIL before running the seeder.');
  }

  if (uid) {
    return admin.auth().getUser(uid);
  }

  if (email) {
    return admin.auth().getUserByEmail(email);
  }

  throw new Error('Unable to resolve admin user for seeding.');
}

async function seed() {
  const userRecord = await resolveAdminUser();
  const targetUid = userRecord.uid;
  const batch = firestore.batch();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Ensure custom claim is set
  const mergedClaims = { ...(userRecord.customClaims ?? {}), role: 'admin' };
  await admin.auth().setCustomUserClaims(targetUid, mergedClaims);

  const userRef = firestore.collection('USERS').doc(targetUid);
  const userSnap = await userRef.get();
  const userData: Record<string, unknown> = {
    userId: targetUid,
    email: userRecord.email ?? null,
    fullName: userRecord.displayName ?? 'Admin User',
    role: 'admin',
    department: 'Operations',
    position: 'Administrator',
    isActive: true,
    fullLeaveBalance: 12,
    halfLeaveBalance: 12,
    medicalLeaveBalance: 10,
    maternityLeaveBalance: 0,
    phoneNumber: userRecord.phoneNumber ?? null,
    profileImageUrl: userRecord.photoURL ?? null,
    updatedAt: now,
  };

  if (!userSnap.exists) {
    userData.createdAt = now;
  }

  batch.set(userRef, userData, { merge: true });

  const settingsRef = firestore.collection('COMPANY_SETTINGS').doc('main');
  const settingsSnap = await settingsRef.get();
  const settingsData: Record<string, unknown> = {
    ...DEFAULT_COMPANY_SETTINGS,
    updatedAt: now,
    updatedBy: targetUid,
  };

  if (!settingsSnap.exists) {
    settingsData.createdAt = now;
  }

  batch.set(settingsRef, settingsData, { merge: true });

  await batch.commit();

  console.log('Firestore seed completed successfully.');
  console.log(`Admin user UID: ${targetUid}`);
}

seed().catch((error) => {
  console.error('Failed to seed Firestore:', error);
  process.exit(1);
});
