"use strict";
/**
 * Test Data Seeding Script
 *
 * Creates isolated test data for testing purposes.
 * All test users have IDs prefixed with "TEST_" for easy identification and cleanup.
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seedTestData.ts
 *
 * Or deploy and call the seedTestData cloud function from Firebase console.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTestData = seedTestData;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}
const db = admin.firestore();
// Test user IDs - clearly prefixed for identification
const TEST_USERS = {
    ADMIN: 'TEST_ADMIN_001',
    EMPLOYEE_1: 'TEST_EMP_001',
    EMPLOYEE_2: 'TEST_EMP_002',
    EMPLOYEE_3: 'TEST_EMP_003',
    INACTIVE_EMPLOYEE: 'TEST_EMP_INACTIVE',
};
// Bangkok timezone offset (UTC+7)
const BANGKOK_OFFSET_HOURS = 7;
// Helper to get current date in Bangkok timezone
function getBangkokDate() {
    const now = new Date();
    // Add Bangkok offset to get Bangkok time
    const bangkokTime = new Date(now.getTime() + BANGKOK_OFFSET_HOURS * 60 * 60 * 1000);
    return bangkokTime;
}
// Helper to create a date at specific time in Bangkok timezone
// Returns a Date that represents the given Bangkok time
function createBangkokDate(year, month, day, hour = 0, minute = 0) {
    // Create the date as if it's in Bangkok timezone
    // Then convert to UTC by subtracting the offset
    const bangkokDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    // Subtract Bangkok offset to get UTC time
    const utcTime = bangkokDate.getTime() - BANGKOK_OFFSET_HOURS * 60 * 60 * 1000;
    return new Date(utcTime);
}
// Helper to create Firestore Timestamp
function toTimestamp(date) {
    return firestore_1.Timestamp.fromDate(date);
}
// Helper to add time to a base date (base date is already in UTC representing Bangkok midnight)
function addBangkokTime(baseDate, hour, minute = 0) {
    // baseDate represents Bangkok midnight in UTC
    // Add the hours and minutes to get the desired Bangkok time
    const result = new Date(baseDate.getTime());
    result.setUTCHours(result.getUTCHours() + hour);
    result.setUTCMinutes(result.getUTCMinutes() + minute);
    return result;
}
// Get dates for test data (all in Bangkok timezone)
function getTestDates() {
    const bangkokNow = getBangkokDate();
    const year = bangkokNow.getUTCFullYear();
    const month = bangkokNow.getUTCMonth() + 1;
    const day = bangkokNow.getUTCDate();
    return {
        // Past dates for historical records
        fiveDaysAgo: createBangkokDate(year, month, day - 5),
        fourDaysAgo: createBangkokDate(year, month, day - 4),
        threeDaysAgo: createBangkokDate(year, month, day - 3),
        twoDaysAgo: createBangkokDate(year, month, day - 2),
        yesterday: createBangkokDate(year, month, day - 1),
        today: createBangkokDate(year, month, day),
        // Future dates for leave requests
        tomorrow: createBangkokDate(year, month, day + 1),
        inThreeDays: createBangkokDate(year, month, day + 3),
        inFiveDays: createBangkokDate(year, month, day + 5),
        inSevenDays: createBangkokDate(year, month, day + 7),
    };
}
async function seedUsers() {
    console.log('Seeding test users...');
    const users = [
        {
            id: TEST_USERS.ADMIN,
            data: {
                userId: TEST_USERS.ADMIN,
                email: 'test.admin@attendesk.test',
                fullName: 'Test Admin User',
                role: 'admin',
                department: 'Management',
                position: 'System Administrator',
                isActive: true,
                phoneNumber: '+66800000001',
                photoURL: null,
                fullLeaveBalance: 15,
                halfLeaveBalance: 10,
                medicalLeaveBalance: 30,
                maternityLeaveBalance: 90,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: 'SYSTEM_SEED',
            },
        },
        {
            id: TEST_USERS.EMPLOYEE_1,
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                email: 'test.employee1@attendesk.test',
                fullName: 'Alice Test Employee',
                role: 'employee',
                department: 'Engineering',
                position: 'Software Developer',
                isActive: true,
                phoneNumber: '+66800000002',
                photoURL: null,
                fullLeaveBalance: 10,
                halfLeaveBalance: 12,
                medicalLeaveBalance: 30,
                maternityLeaveBalance: 90,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: TEST_USERS.ADMIN,
            },
        },
        {
            id: TEST_USERS.EMPLOYEE_2,
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                email: 'test.employee2@attendesk.test',
                fullName: 'Bob Test Employee',
                role: 'employee',
                department: 'Marketing',
                position: 'Marketing Specialist',
                isActive: true,
                phoneNumber: '+66800000003',
                photoURL: null,
                fullLeaveBalance: 8,
                halfLeaveBalance: 10,
                medicalLeaveBalance: 30,
                maternityLeaveBalance: 0,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: TEST_USERS.ADMIN,
            },
        },
        {
            id: TEST_USERS.EMPLOYEE_3,
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                email: 'test.employee3@attendesk.test',
                fullName: 'Carol Test Employee',
                role: 'employee',
                department: 'HR',
                position: 'HR Coordinator',
                isActive: true,
                phoneNumber: '+66800000004',
                photoURL: null,
                fullLeaveBalance: 12,
                halfLeaveBalance: 8,
                medicalLeaveBalance: 30,
                maternityLeaveBalance: 90,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: TEST_USERS.ADMIN,
            },
        },
        {
            id: TEST_USERS.INACTIVE_EMPLOYEE,
            data: {
                userId: TEST_USERS.INACTIVE_EMPLOYEE,
                email: 'test.inactive@attendesk.test',
                fullName: 'David Inactive Employee',
                role: 'employee',
                department: 'Engineering',
                position: 'Former Developer',
                isActive: false,
                phoneNumber: '+66800000005',
                photoURL: null,
                fullLeaveBalance: 0,
                halfLeaveBalance: 0,
                medicalLeaveBalance: 0,
                maternityLeaveBalance: 0,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                createdBy: TEST_USERS.ADMIN,
            },
        },
    ];
    const batch = db.batch();
    for (const user of users) {
        batch.set(db.collection('USERS').doc(user.id), user.data);
    }
    await batch.commit();
    console.log(`Created ${users.length} test users`);
}
async function seedAttendanceRecords() {
    console.log('Seeding attendance records...');
    const dates = getTestDates();
    const testLocation = new admin.firestore.GeoPoint(13.7563, 100.5018); // Bangkok
    // Helper to format date for document ID (YYYY-MM-DD in Bangkok time)
    const formatDateId = (date) => {
        // Add Bangkok offset to get the Bangkok date
        const bangkokDate = new Date(date.getTime() + BANGKOK_OFFSET_HOURS * 60 * 60 * 1000);
        return bangkokDate.toISOString().split('T')[0];
    };
    const records = [
        // Employee 1 - Mix of on-time, late, and partial days
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_1}_${formatDateId(dates.fiveDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                attendanceDate: toTimestamp(dates.fiveDaysAgo),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 8, 30)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 12, 0)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 17, 30)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_1}_${formatDateId(dates.fourDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                attendanceDate: toTimestamp(dates.fourDaysAgo),
                status: 'late',
                check1_status: 'late',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 9, 45)), // Late arrival
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 12, 5)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 17, 35)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_1}_${formatDateId(dates.threeDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                attendanceDate: toTimestamp(dates.threeDaysAgo),
                status: 'half_day_absent',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.threeDaysAgo, 8, 30)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.threeDaysAgo, 12, 10)),
                check2_location: testLocation,
                // No check3 - left early
                isManualEntry: false,
                notes: 'Left early - personal emergency',
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Employee 2 - Mix of records including absence
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_2}_${formatDateId(dates.fiveDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                attendanceDate: toTimestamp(dates.fiveDaysAgo),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 8, 15)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 12, 0)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 17, 45)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_2}_${formatDateId(dates.fourDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                attendanceDate: toTimestamp(dates.fourDaysAgo),
                status: 'late',
                check1_status: 'late',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 10, 30)), // Very late
                check1_location: testLocation,
                check2_status: 'late',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 13, 15)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 18, 0)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Employee 2 - threeDaysAgo is ABSENT (no record - handled by penalty)
        // Employee 3 - Good attendance record
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_3}_${formatDateId(dates.fiveDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                attendanceDate: toTimestamp(dates.fiveDaysAgo),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 8, 0)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 12, 0)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fiveDaysAgo, 17, 30)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_3}_${formatDateId(dates.fourDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                attendanceDate: toTimestamp(dates.fourDaysAgo),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 8, 5)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 12, 0)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.fourDaysAgo, 17, 30)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_3}_${formatDateId(dates.threeDaysAgo)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                attendanceDate: toTimestamp(dates.threeDaysAgo),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.threeDaysAgo, 8, 10)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.threeDaysAgo, 12, 5)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.threeDaysAgo, 17, 35)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // TODAY's records - for "Today" filter testing
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_1}_${formatDateId(dates.today)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                attendanceDate: toTimestamp(dates.today),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.today, 8, 25)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.today, 12, 5)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.today, 17, 30)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_2}_${formatDateId(dates.today)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                attendanceDate: toTimestamp(dates.today),
                status: 'late',
                check1_status: 'late',
                check1_timestamp: toTimestamp(addBangkokTime(dates.today, 9, 45)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.today, 12, 10)),
                check2_location: testLocation,
                // No check3 yet - still at work
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: `TEST_ATT_${TEST_USERS.EMPLOYEE_3}_${formatDateId(dates.today)}`,
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                attendanceDate: toTimestamp(dates.today),
                status: 'present',
                check1_status: 'on_time',
                check1_timestamp: toTimestamp(addBangkokTime(dates.today, 8, 0)),
                check1_location: testLocation,
                check2_status: 'on_time',
                check2_timestamp: toTimestamp(addBangkokTime(dates.today, 12, 0)),
                check2_location: testLocation,
                check3_status: 'on_time',
                check3_timestamp: toTimestamp(addBangkokTime(dates.today, 17, 30)),
                check3_location: testLocation,
                isManualEntry: false,
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
    ];
    const batch = db.batch();
    for (const record of records) {
        batch.set(db.collection('ATTENDANCE_RECORDS').doc(record.id), record.data);
    }
    await batch.commit();
    console.log(`Created ${records.length} attendance records`);
}
async function seedLeaveRequests() {
    console.log('Seeding leave requests...');
    const dates = getTestDates();
    const leaves = [
        // Pending leave requests (for approve/reject tests)
        {
            id: 'TEST_LEAVE_PENDING_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                leaveType: 'full',
                startDate: toTimestamp(dates.inThreeDays),
                endDate: toTimestamp(dates.inFiveDays),
                totalDays: 3,
                status: 'pending',
                reason: 'Family vacation - planned trip',
                attachmentId: null,
                submittedAt: toTimestamp(dates.yesterday),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_LEAVE_PENDING_002',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                leaveType: 'medical',
                startDate: toTimestamp(dates.tomorrow),
                endDate: toTimestamp(dates.tomorrow),
                totalDays: 1,
                status: 'pending',
                reason: 'Doctor appointment - follow-up checkup',
                attachmentId: 'TEST_ATTACHMENT_001', // Has attachment
                submittedAt: toTimestamp(dates.today),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_LEAVE_PENDING_003',
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                leaveType: 'half',
                startDate: toTimestamp(dates.inSevenDays),
                endDate: toTimestamp(dates.inSevenDays),
                totalDays: 0.5,
                status: 'pending',
                reason: 'Personal errand in the morning',
                attachmentId: null,
                submittedAt: toTimestamp(dates.today),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Approved leave (for reports and history)
        {
            id: 'TEST_LEAVE_APPROVED_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                leaveType: 'full',
                startDate: toTimestamp(dates.fiveDaysAgo),
                endDate: toTimestamp(dates.fourDaysAgo),
                totalDays: 2,
                status: 'approved',
                reason: 'Annual leave',
                attachmentId: null,
                submittedAt: toTimestamp(createBangkokDate(dates.fiveDaysAgo.getFullYear(), dates.fiveDaysAgo.getMonth() + 1, dates.fiveDaysAgo.getDate() - 3)),
                reviewedBy: TEST_USERS.ADMIN,
                reviewedAt: toTimestamp(createBangkokDate(dates.fiveDaysAgo.getFullYear(), dates.fiveDaysAgo.getMonth() + 1, dates.fiveDaysAgo.getDate() - 2)),
                reviewerNotes: 'Approved. Enjoy your time off!',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_LEAVE_APPROVED_002',
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                leaveType: 'medical',
                startDate: toTimestamp(dates.twoDaysAgo),
                endDate: toTimestamp(dates.twoDaysAgo),
                totalDays: 1,
                status: 'approved',
                reason: 'Sick leave - flu symptoms',
                attachmentId: 'TEST_ATTACHMENT_002',
                submittedAt: toTimestamp(dates.threeDaysAgo),
                reviewedBy: TEST_USERS.ADMIN,
                reviewedAt: toTimestamp(dates.threeDaysAgo),
                reviewerNotes: 'Get well soon!',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Rejected leave (for history)
        {
            id: 'TEST_LEAVE_REJECTED_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                leaveType: 'full',
                startDate: toTimestamp(dates.yesterday),
                endDate: toTimestamp(dates.today),
                totalDays: 2,
                status: 'rejected',
                reason: 'Need time off for personal matters',
                attachmentId: null,
                submittedAt: toTimestamp(dates.fourDaysAgo),
                reviewedBy: TEST_USERS.ADMIN,
                reviewedAt: toTimestamp(dates.threeDaysAgo),
                reviewerNotes: 'Rejected due to critical project deadline. Please reschedule.',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
    ];
    const batch = db.batch();
    for (const leave of leaves) {
        batch.set(db.collection('LEAVE_REQUESTS').doc(leave.id), leave.data);
    }
    await batch.commit();
    console.log(`Created ${leaves.length} leave requests`);
}
async function seedPenalties() {
    console.log('Seeding penalties...');
    const dates = getTestDates();
    const penalties = [
        // Active penalties (for waive test)
        {
            id: 'TEST_PENALTY_ACTIVE_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                violationType: 'late_arrival',
                amount: 0, // Warning only, threshold not exceeded
                status: 'active',
                dateIncurred: toTimestamp(dates.fourDaysAgo),
                notes: 'Late arrival: 9:45 AM (grace period: 9:00 AM)',
                waivedAt: null,
                waivedReason: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_PENALTY_ACTIVE_002',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                violationType: 'early_departure',
                amount: 0,
                status: 'active',
                dateIncurred: toTimestamp(dates.threeDaysAgo),
                notes: 'Early departure without completing full day',
                waivedAt: null,
                waivedReason: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_PENALTY_ACTIVE_003',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                violationType: 'late_arrival',
                amount: 100, // Fine applied (exceeded threshold)
                status: 'active',
                dateIncurred: toTimestamp(dates.fourDaysAgo),
                notes: 'Late arrival: 10:30 AM (third late this month)',
                waivedAt: null,
                waivedReason: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        {
            id: 'TEST_PENALTY_ACTIVE_004',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                userName: 'Bob Test Employee',
                userEmail: 'test.employee2@attendesk.test',
                violationType: 'absent',
                amount: 200, // Absence fine
                status: 'active',
                dateIncurred: toTimestamp(dates.threeDaysAgo),
                notes: 'Unexcused absence - no clock-in recorded',
                waivedAt: null,
                waivedReason: null,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Waived penalty (for idempotency test)
        {
            id: 'TEST_PENALTY_WAIVED_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                userName: 'Carol Test Employee',
                userEmail: 'test.employee3@attendesk.test',
                violationType: 'late_arrival',
                amount: 0,
                status: 'waived',
                dateIncurred: toTimestamp(dates.fiveDaysAgo),
                notes: 'Late arrival due to traffic accident',
                waivedAt: toTimestamp(dates.fourDaysAgo),
                waivedReason: 'Traffic accident on main road - verified by news report',
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
        // Paid penalty (for history)
        {
            id: 'TEST_PENALTY_PAID_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                userName: 'Alice Test Employee',
                userEmail: 'test.employee1@attendesk.test',
                violationType: 'absent',
                amount: 200,
                status: 'paid',
                dateIncurred: toTimestamp(createBangkokDate(dates.fiveDaysAgo.getFullYear(), dates.fiveDaysAgo.getMonth() + 1, dates.fiveDaysAgo.getDate() - 10)),
                notes: 'Unexcused absence',
                waivedAt: null,
                waivedReason: null,
                paidAt: toTimestamp(dates.fiveDaysAgo),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            },
        },
    ];
    const batch = db.batch();
    for (const penalty of penalties) {
        batch.set(db.collection('PENALTIES').doc(penalty.id), penalty.data);
    }
    await batch.commit();
    console.log(`Created ${penalties.length} penalties`);
}
async function seedNotifications() {
    console.log('Seeding notifications...');
    const dates = getTestDates();
    const notifications = [
        {
            id: 'TEST_NOTIF_001',
            data: {
                userId: TEST_USERS.EMPLOYEE_1,
                title: 'Leave Request Approved',
                body: 'Your leave request for Nov 23-24 has been approved.',
                type: 'leave_approved',
                relatedId: 'TEST_LEAVE_APPROVED_001',
                isRead: false,
                createdAt: toTimestamp(dates.fourDaysAgo),
            },
        },
        {
            id: 'TEST_NOTIF_002',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                title: 'Leave Request Rejected',
                body: 'Your leave request has been rejected. Please check the reviewer notes.',
                type: 'leave_rejected',
                relatedId: 'TEST_LEAVE_REJECTED_001',
                isRead: true,
                createdAt: toTimestamp(dates.threeDaysAgo),
            },
        },
        {
            id: 'TEST_NOTIF_003',
            data: {
                userId: TEST_USERS.EMPLOYEE_2,
                title: 'New Penalty',
                body: 'A penalty has been recorded for late arrival.',
                type: 'penalty_created',
                relatedId: 'TEST_PENALTY_ACTIVE_003',
                isRead: false,
                createdAt: toTimestamp(dates.fourDaysAgo),
            },
        },
        {
            id: 'TEST_NOTIF_004',
            data: {
                userId: TEST_USERS.EMPLOYEE_3,
                title: 'Penalty Waived',
                body: 'Your penalty from Nov 23 has been waived.',
                type: 'penalty_waived',
                relatedId: 'TEST_PENALTY_WAIVED_001',
                isRead: false,
                createdAt: toTimestamp(dates.fourDaysAgo),
            },
        },
    ];
    const batch = db.batch();
    for (const notif of notifications) {
        batch.set(db.collection('NOTIFICATIONS').doc(notif.id), notif.data);
    }
    await batch.commit();
    console.log(`Created ${notifications.length} notifications`);
}
async function seedAuditLogs() {
    console.log('Seeding audit logs...');
    const dates = getTestDates();
    const auditLogs = [
        {
            id: 'TEST_AUDIT_001',
            data: {
                action: 'LEAVE_APPROVED',
                performedBy: TEST_USERS.ADMIN,
                performedByName: 'Test Admin User',
                targetUserId: TEST_USERS.EMPLOYEE_1,
                targetUserName: 'Alice Test Employee',
                resourceType: 'leave_request',
                resourceId: 'TEST_LEAVE_APPROVED_001',
                details: {
                    leaveType: 'full',
                    totalDays: 2,
                    notes: 'Approved. Enjoy your time off!',
                },
                createdAt: toTimestamp(dates.fourDaysAgo),
            },
        },
        {
            id: 'TEST_AUDIT_002',
            data: {
                action: 'LEAVE_REJECTED',
                performedBy: TEST_USERS.ADMIN,
                performedByName: 'Test Admin User',
                targetUserId: TEST_USERS.EMPLOYEE_2,
                targetUserName: 'Bob Test Employee',
                resourceType: 'leave_request',
                resourceId: 'TEST_LEAVE_REJECTED_001',
                details: {
                    leaveType: 'full',
                    totalDays: 2,
                    notes: 'Rejected due to critical project deadline.',
                },
                createdAt: toTimestamp(dates.threeDaysAgo),
            },
        },
        {
            id: 'TEST_AUDIT_003',
            data: {
                action: 'PENALTY_WAIVED',
                performedBy: TEST_USERS.ADMIN,
                performedByName: 'Test Admin User',
                targetUserId: TEST_USERS.EMPLOYEE_3,
                targetUserName: 'Carol Test Employee',
                resourceType: 'penalty',
                resourceId: 'TEST_PENALTY_WAIVED_001',
                details: {
                    violationType: 'late_arrival',
                    waivedReason: 'Traffic accident on main road - verified by news report',
                },
                createdAt: toTimestamp(dates.fourDaysAgo),
            },
        },
        {
            id: 'TEST_AUDIT_004',
            data: {
                action: 'EMPLOYEE_CREATED',
                performedBy: TEST_USERS.ADMIN,
                performedByName: 'Test Admin User',
                targetUserId: TEST_USERS.EMPLOYEE_1,
                targetUserName: 'Alice Test Employee',
                resourceType: 'user',
                resourceId: TEST_USERS.EMPLOYEE_1,
                details: {
                    department: 'Engineering',
                    position: 'Software Developer',
                },
                createdAt: toTimestamp(dates.fiveDaysAgo),
            },
        },
    ];
    const batch = db.batch();
    for (const log of auditLogs) {
        batch.set(db.collection('AUDIT_LOGS').doc(log.id), log.data);
    }
    await batch.commit();
    console.log(`Created ${auditLogs.length} audit logs`);
}
async function cleanupTestData() {
    console.log('Cleaning up existing test data...');
    const collections = [
        'USERS',
        'ATTENDANCE_RECORDS',
        'LEAVE_REQUESTS',
        'PENALTIES',
        'NOTIFICATIONS',
        'AUDIT_LOGS',
    ];
    for (const collectionName of collections) {
        const snapshot = await db
            .collection(collectionName)
            .where(admin.firestore.FieldPath.documentId(), '>=', 'TEST_')
            .where(admin.firestore.FieldPath.documentId(), '<', 'TEST_\uf8ff')
            .get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            console.log(`Deleted ${snapshot.size} test documents from ${collectionName}`);
        }
    }
}
async function seedTestData(cleanFirst = true) {
    console.log('=== Starting Test Data Seeding ===\n');
    try {
        if (cleanFirst) {
            await cleanupTestData();
            console.log('');
        }
        await seedUsers();
        await seedAttendanceRecords();
        await seedLeaveRequests();
        await seedPenalties();
        await seedNotifications();
        await seedAuditLogs();
        console.log('\n=== Test Data Seeding Complete ===');
        console.log('\nTest Users Created:');
        console.log(`  Admin: ${TEST_USERS.ADMIN} (test.admin@attendesk.test)`);
        console.log(`  Employee 1: ${TEST_USERS.EMPLOYEE_1} (test.employee1@attendesk.test)`);
        console.log(`  Employee 2: ${TEST_USERS.EMPLOYEE_2} (test.employee2@attendesk.test)`);
        console.log(`  Employee 3: ${TEST_USERS.EMPLOYEE_3} (test.employee3@attendesk.test)`);
        console.log(`  Inactive: ${TEST_USERS.INACTIVE_EMPLOYEE} (test.inactive@attendesk.test)`);
        console.log('\nNote: These are Firestore documents only. To login, create Firebase Auth users with these UIDs.');
        return {
            success: true,
            users: TEST_USERS,
        };
    }
    catch (error) {
        console.error('Error seeding test data:', error);
        throw error;
    }
}
// Run directly if executed as script
if (require.main === module) {
    seedTestData()
        .then(() => process.exit(0))
        .catch((error) => {
        console.error(error);
        process.exit(1);
    });
}
