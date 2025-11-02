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
    // Use environment variable or default to localhost
    const emulatorHost = process.env.EMULATOR_HOST || 'localhost';
    process.env.FIRESTORE_EMULATOR_HOST = `${emulatorHost}:8080`;
    process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorHost}:9099`;

    console.log(`   Firestore: ${emulatorHost}:8080`);
    console.log(`   Auth: ${emulatorHost}:9099`);

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
 * Seed test employees
 */
async function seedTestEmployees() {
  console.log('\n👥 Seeding Test Employees...');

  const employees = [
    {
      uid: 'test-employee-1',
      email: 'john.doe@company.com',
      password: 'Password123!',
      name: 'John Doe',
      department: 'Engineering',
      position: 'Senior Developer',
      phoneNumber: '+94771234567',
    },
    {
      uid: 'test-employee-2',
      email: 'jane.smith@company.com',
      password: 'Password123!',
      name: 'Jane Smith',
      department: 'Marketing',
      position: 'Marketing Manager',
      phoneNumber: '+94771234568',
    },
    {
      uid: 'test-employee-3',
      email: 'bob.johnson@company.com',
      password: 'Password123!',
      name: 'Bob Johnson',
      department: 'Engineering',
      position: 'Junior Developer',
      phoneNumber: '+94771234569',
    },
    {
      uid: 'test-employee-4',
      email: 'alice.williams@company.com',
      password: 'Password123!',
      name: 'Alice Williams',
      department: 'HR',
      position: 'HR Specialist',
      phoneNumber: '+94771234570',
    },
    {
      uid: 'test-employee-5',
      email: 'charlie.brown@company.com',
      password: 'Password123!',
      name: 'Charlie Brown',
      department: 'Sales',
      position: 'Sales Representative',
      phoneNumber: '+94771234571',
    },
  ];

  for (const emp of employees) {
    try {
      // Create user in Auth
      let userRecord;
      try {
        userRecord = await auth.getUser(emp.uid);
        console.log(`   ✓ User exists: ${emp.email}`);
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          userRecord = await auth.createUser({
            uid: emp.uid,
            email: emp.email,
            password: emp.password,
            displayName: emp.name,
            emailVerified: true,
          });
          console.log(`   ✓ Created user: ${emp.email}`);
        } else {
          throw error;
        }
      }

      // Set employee role
      await auth.setCustomUserClaims(emp.uid, { role: 'employee' });

      // Create user document
      const userRef = db.collection('USERS').doc(emp.uid);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          email: emp.email,
          name: emp.name,
          role: 'employee',
          status: 'active',
          department: emp.department,
          position: emp.position,
          phoneNumber: emp.phoneNumber,
          leaveBalances: {
            annual: 14,
            sick: 7,
            medical: 7,
            maternity: 84,
            paternity: 7,
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`   ✓ Created employee document: ${emp.name}`);
      }
    } catch (error) {
      console.error(`   ✗ Error creating employee ${emp.email}:`, error);
    }
  }

  console.log('✅ Test employees seeded successfully');
}

/**
 * Seed attendance records (past 7 days)
 */
async function seedAttendanceRecords() {
  console.log('\n📅 Seeding Attendance Records...');

  const employeeIds = [
    'test-employee-1',
    'test-employee-2',
    'test-employee-3',
    'test-employee-4',
    'test-employee-5',
  ];

  const today = new Date();
  const recordsCreated = [];

  // Generate records for past 7 days
  for (let daysAgo = 6; daysAgo >= 0; daysAgo--) {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD

    for (const employeeId of employeeIds) {
      // Vary attendance patterns
      let status: string;
      let checks: any = {};

      const random = Math.random();
      if (random < 0.6) {
        // 60% present - all 3 checks
        status = 'present';
        checks = {
          check1: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T08:35:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
          check2: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T13:10:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
          check3: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T17:00:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
        };
      } else if (random < 0.75) {
        // 15% late
        status = 'present';
        checks = {
          check1: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T09:00:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'late',
          },
          check2: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T13:15:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
          check3: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T17:05:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
        };
      } else if (random < 0.85) {
        // 10% half-day (2 checks)
        status = 'half_day_absent';
        checks = {
          check1: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T08:40:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
          check2: {
            timestamp: admin.firestore.Timestamp.fromDate(
              new Date(`${dateStr}T13:20:00`)
            ),
            location: new admin.firestore.GeoPoint(6.9271, 79.8612),
            status: 'on_time',
          },
        };
      } else {
        // 15% absent
        status = 'absent';
        checks = {};
      }

      const docId = `${employeeId}_${dateStr}`;
      const recordRef = db.collection('ATTENDANCE_RECORDS').doc(docId);

      await recordRef.set({
        userId: employeeId,
        date: dateStr,
        status,
        checks,
        isManualEntry: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      recordsCreated.push(docId);
    }
  }

  console.log(`✅ Created ${recordsCreated.length} attendance records`);
}

/**
 * Seed leave requests
 */
async function seedLeaveRequests() {
  console.log('\n🏖️  Seeding Leave Requests...');

  // Clear existing leave requests first
  const existingLeaves = await db.collection('LEAVE_REQUESTS').get();
  const batch = db.batch();
  existingLeaves.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  if (!existingLeaves.empty) {
    await batch.commit();
    console.log(`   Deleted ${existingLeaves.size} existing leave requests`);
  }

  const leaveRequests = [
    {
      userId: 'test-employee-1',
      type: 'full',
      leaveType: 'full',
      startDate: '2025-10-25',
      endDate: '2025-10-27',
      reason: 'Family vacation',
      status: 'pending',
      totalDays: 3,
    },
    {
      userId: 'test-employee-2',
      type: 'medical',
      leaveType: 'medical',
      startDate: '2025-10-15',
      endDate: '2025-10-16',
      reason: 'Flu',
      status: 'approved',
      totalDays: 2,
      reviewedBy: process.env.SEED_ADMIN_UID || 'admin-uid',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewNotes: 'Approved - get well soon',
    },
    {
      userId: 'test-employee-3',
      type: 'full',
      leaveType: 'full',
      startDate: '2025-10-12',
      endDate: '2025-10-13',
      reason: 'Personal matters',
      status: 'rejected',
      totalDays: 2,
      reviewedBy: process.env.SEED_ADMIN_UID || 'admin-uid',
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewNotes: 'Rejected - insufficient notice period',
    },
    {
      userId: 'test-employee-4',
      type: 'medical',
      leaveType: 'medical',
      startDate: '2025-10-22',
      endDate: '2025-10-24',
      reason: 'Medical appointment',
      status: 'pending',
      totalDays: 3,
      hasAttachment: true,
    },
    {
      userId: 'test-employee-5',
      type: 'maternity',
      leaveType: 'maternity',
      startDate: '2025-11-01',
      endDate: '2025-11-03',
      reason: 'Maternity leave',
      status: 'pending',
      totalDays: 3,
    },
  ];

  for (const leave of leaveRequests) {
    await db.collection('LEAVE_REQUESTS').add({
      ...leave,
      startDate: admin.firestore.Timestamp.fromDate(new Date(leave.startDate)),
      endDate: admin.firestore.Timestamp.fromDate(new Date(leave.endDate)),
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`✅ Created ${leaveRequests.length} leave requests`);
}

/**
 * Seed penalties
 */
async function seedPenalties() {
  console.log('\n⚠️  Seeding Penalties...');

  const penalties = [
    {
      userId: 'test-employee-1',
      violationType: 'late',
      amount: 10,
      status: 'active',
      incurredAt: admin.firestore.Timestamp.fromDate(
        new Date('2025-10-01')
      ),
      reason: '4th late arrival in October',
    },
    {
      userId: 'test-employee-3',
      violationType: 'absent',
      amount: 20,
      status: 'waived',
      incurredAt: admin.firestore.Timestamp.fromDate(
        new Date('2025-09-28')
      ),
      reason: '4th absence in September',
      waivedAt: admin.firestore.Timestamp.fromDate(new Date('2025-10-01')),
      waivedBy: process.env.SEED_ADMIN_UID || 'admin-uid',
      waivedReason: 'First-time offense - issuing warning instead',
    },
    {
      userId: 'test-employee-5',
      violationType: 'half_day_absent',
      amount: 15,
      status: 'active',
      incurredAt: admin.firestore.Timestamp.fromDate(
        new Date('2025-10-05')
      ),
      reason: '4th half-day absence in October',
    },
  ];

  for (const penalty of penalties) {
    await db.collection('PENALTIES').add({
      ...penalty,
      acknowledged: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`✅ Created ${penalties.length} penalties`);
}

/**
 * Seed notifications
 */
async function seedNotifications() {
  console.log('\n🔔 Seeding Notifications...');

  const notifications = [
    {
      userId: 'test-employee-1',
      title: 'Penalty Issued',
      message: 'You have been issued a penalty for late arrival.',
      category: 'penalty',
      type: 'warning',
      isRead: false,
    },
    {
      userId: 'test-employee-2',
      title: 'Leave Approved',
      message: 'Your sick leave request has been approved.',
      category: 'leave',
      type: 'success',
      isRead: true,
      readAt: admin.firestore.Timestamp.fromDate(new Date('2025-10-16')),
    },
    {
      userId: 'test-employee-3',
      title: 'Leave Rejected',
      message: 'Your leave request was rejected due to insufficient notice.',
      category: 'leave',
      type: 'error',
      isRead: false,
    },
    {
      userId: 'test-employee-4',
      title: 'Clock-In Reminder',
      message: 'Don\'t forget to clock in for your morning check.',
      category: 'attendance',
      type: 'info',
      isRead: true,
      readAt: admin.firestore.Timestamp.fromDate(new Date('2025-10-18')),
    },
    {
      userId: 'test-employee-5',
      title: 'System Maintenance',
      message: 'System will be down for maintenance tonight at 10 PM.',
      category: 'system',
      type: 'info',
      isRead: false,
    },
  ];

  for (const notification of notifications) {
    await db.collection('NOTIFICATIONS').add({
      ...notification,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  console.log(`✅ Created ${notifications.length} notifications`);
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
    await seedTestEmployees();
    await seedAttendanceRecords();
    await seedLeaveRequests();
    await seedPenalties();
    await seedNotifications();

    console.log('\n' + '=' .repeat(50));
    console.log('✅ Seeding completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - 5 test employees created');
    console.log('   - ~35 attendance records (7 days × 5 employees)');
    console.log('   - 5 leave requests (pending, approved, rejected)');
    console.log('   - 3 penalties (active and waived)');
    console.log('   - 5 notifications (various categories)');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding
seed();
