"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateMonthlyAttendance = exports.aggregateDailyAttendance = exports.getDashboardStats = exports.generateAttendanceReport = void 0;
const firestore_1 = require("../utils/firestore");
const firestore_2 = require("firebase-admin/firestore");
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const ANALYTICS_COLLECTION = 'ANALYTICS_SUMMARY';
const toTimestamp = (iso) => firestore_2.Timestamp.fromDate(new Date(iso));
const toIsoString = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_2.Timestamp) {
        return value.toDate().toISOString();
    }
    if (typeof value.toDate === 'function') {
        try {
            return value.toDate().toISOString();
        }
        catch {
            return null;
        }
    }
    if (typeof value === 'string') {
        return value;
    }
    return null;
};
const USERS_COLLECTION = 'USERS';
const generateAttendanceReport = async (input) => {
    const { userId, department, startDate, endDate } = input;
    let query = firestore_1.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('attendanceDate', '>=', toTimestamp(startDate))
        .where('attendanceDate', '<=', toTimestamp(endDate));
    if (userId) {
        query = query.where('userId', '==', userId);
    }
    const snapshot = await query.get();
    const attendanceRecords = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
        };
    });
    const uniqueUserIds = new Set();
    attendanceRecords.forEach((record) => {
        const uid = record.userId;
        if (uid) {
            uniqueUserIds.add(uid);
        }
    });
    const userDocs = await Promise.all(Array.from(uniqueUserIds).map((uid) => firestore_1.firestore.collection(USERS_COLLECTION).doc(uid).get()));
    const userLookup = new Map();
    userDocs.forEach((doc) => {
        if (doc.exists) {
            userLookup.set(doc.id, doc.data() ?? {});
        }
    });
    const filtered = attendanceRecords.filter((record) => {
        if (!department) {
            return true;
        }
        const userData = userLookup.get(record.userId ?? '');
        const userDepartment = typeof userData?.department === 'string' ? userData.department : null;
        return userDepartment === department;
    });
    const normalized = filtered.map((record) => {
        const uid = record.userId ?? '';
        const userData = userLookup.get(uid) ?? {};
        return {
            id: record.id,
            userId: uid,
            status: record.status ?? 'unknown',
            attendanceDate: toIsoString(record.attendanceDate),
            isManualEntry: record.isManualEntry ?? false,
            reason: record.manualReason ?? null,
            notes: record.notes ?? null,
            userName: userData.fullName ?? null,
            userEmail: userData.email ?? null,
            department: userData.department ?? null,
            position: userData.position ?? null,
        };
    });
    return {
        total: normalized.length,
        records: normalized,
    };
};
exports.generateAttendanceReport = generateAttendanceReport;
const getDashboardStats = async (input) => {
    const { date } = input;
    const start = toTimestamp(`${date}T00:00:00Z`);
    const end = toTimestamp(`${date}T23:59:59Z`);
    // Query total active employees
    const usersSnap = await firestore_1.firestore
        .collection(USERS_COLLECTION)
        .where('isActive', '==', true)
        .get();
    const totalEmployees = usersSnap.size;
    const attendanceSnap = await firestore_1.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('attendanceDate', '>=', start)
        .where('attendanceDate', '<=', end)
        .get();
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalHalfDay = 0;
    let totalOnLeave = 0;
    attendanceSnap.docs.forEach((doc) => {
        const status = doc.get('status')?.toLowerCase();
        switch (status) {
            case 'present':
            case 'in_progress':
                totalPresent += 1;
                break;
            case 'absent':
                totalAbsent += 1;
                break;
            case 'half_day_absent':
            case 'half_day':
                totalHalfDay += 1;
                break;
            case 'on_leave':
                totalOnLeave += 1;
                break;
            default:
                break;
        }
    });
    const leaveSnap = await firestore_1.firestore
        .collection(LEAVE_COLLECTION)
        .where('status', '==', 'pending')
        .get();
    // Count active violations/penalties
    const penaltiesSnap = await firestore_1.firestore
        .collection('PENALTIES')
        .where('status', '==', 'active')
        .get();
    return {
        totalEmployees,
        attendance: {
            present: totalPresent,
            absent: totalAbsent,
            onLeave: totalOnLeave,
            halfDay: totalHalfDay,
            total: attendanceSnap.size,
        },
        pendingLeaves: leaveSnap.size,
        activeViolations: penaltiesSnap.size,
    };
};
exports.getDashboardStats = getDashboardStats;
const aggregateDailyAttendance = async (date) => {
    const stats = await (0, exports.getDashboardStats)({ date });
    const docId = `${date}`;
    const ref = firestore_1.firestore.collection(ANALYTICS_COLLECTION).doc(docId);
    await ref.set({
        date,
        attendance: stats.attendance,
        pendingLeaves: stats.pendingLeaves,
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    });
    return stats;
};
exports.aggregateDailyAttendance = aggregateDailyAttendance;
const aggregateMonthlyAttendance = async (month) => {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
    const attendanceSnap = await firestore_1.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('attendanceDate', '>=', firestore_2.Timestamp.fromDate(start))
        .where('attendanceDate', '<=', firestore_2.Timestamp.fromDate(end))
        .get();
    const present = attendanceSnap.docs.filter((doc) => doc.get('status') === 'present').length;
    const absent = attendanceSnap.docs.filter((doc) => doc.get('status') === 'absent').length;
    const halfDay = attendanceSnap.docs.filter((doc) => doc.get('status') === 'half_day_absent').length;
    const analyticsDoc = {
        month,
        attendance: {
            present,
            absent,
            halfDay,
            total: attendanceSnap.size,
        },
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    };
    await firestore_1.firestore.collection(ANALYTICS_COLLECTION).doc(`monthly_${month}`).set(analyticsDoc);
    return analyticsDoc;
};
exports.aggregateMonthlyAttendance = aggregateMonthlyAttendance;
