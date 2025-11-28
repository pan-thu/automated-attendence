"use strict";
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
exports.fetchCompanySettingsPublic = exports.fetchEmployeeDashboard = exports.fetchEmployeeProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const settings_1 = require("./settings");
const timezoneUtils_1 = require("../utils/timezoneUtils");
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const PENALTIES_COLLECTION = 'PENALTIES';
const fetchEmployeeProfile = async (userId) => {
    const snapshot = await firestore_2.firestore.collection(USERS_COLLECTION).doc(userId).get();
    if (!snapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Employee profile not found.');
    }
    const data = snapshot.data() ?? {};
    if (data.role !== 'employee') {
        throw new functions.https.HttpsError('permission-denied', 'Profile access restricted to employees.');
    }
    return {
        userId,
        fullName: data.fullName ?? null,
        email: data.email ?? null,
        department: data.department ?? null,
        position: data.position ?? null,
        phoneNumber: data.phoneNumber ?? null,
        leaveBalances: {
            fullLeaveBalance: Number(data.fullLeaveBalance) || 0,
            halfLeaveBalance: Number(data.halfLeaveBalance) || 0,
            medicalLeaveBalance: Number(data.medicalLeaveBalance) || 0,
            maternityLeaveBalance: Number(data.maternityLeaveBalance) || 0,
        },
        isActive: Boolean(data.isActive ?? false),
    };
};
exports.fetchEmployeeProfile = fetchEmployeeProfile;
const formatTimestamp = (value) => {
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    if (typeof value === 'string') {
        return value;
    }
    return null;
};
const fetchEmployeeDashboard = async (userId, dateIso) => {
    // Use company timezone for date key calculation
    const dateKey = dateIso
        ? await (0, timezoneUtils_1.getCompanyTimezoneDateKeyFromISO)(dateIso)
        : await (0, timezoneUtils_1.getCompanyTimezoneDateKey)();
    const [profile, attendanceSnapshot] = await Promise.all([
        (0, exports.fetchEmployeeProfile)(userId),
        firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(`${userId}_${dateKey}`).get(),
    ]);
    const attendanceData = attendanceSnapshot.exists ? attendanceSnapshot.data() ?? {} : {};
    const checks = ['check1', 'check2', 'check3'].map((slot) => ({
        slot,
        status: attendanceData[`${slot}_status`] ?? null,
        timestamp: formatTimestamp(attendanceData[`${slot}_timestamp`]),
    }));
    const remainingChecks = checks
        .filter((entry) => !entry.status || entry.status === 'missed')
        .map((entry) => entry.slot);
    const today = new Date(`${dateKey}T00:00:00Z`);
    const todayTimestamp = firestore_1.Timestamp.fromDate(today);
    const [pendingLeavesSnapshot, approvedLeavesQuery] = await Promise.all([
        firestore_2.firestore
            .collection(LEAVE_COLLECTION)
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .orderBy('startDate', 'asc')
            .limit(5)
            .get(),
        firestore_2.firestore
            .collection(LEAVE_COLLECTION)
            .where('userId', '==', userId)
            .where('status', '==', 'approved')
            .orderBy('startDate', 'asc')
            .limit(50)
            .get(),
    ]);
    const todayMillis = todayTimestamp.toMillis();
    const approvedUpcomingDocs = approvedLeavesQuery.docs.filter((doc) => {
        const start = doc.get('startDate');
        return start instanceof firestore_1.Timestamp && start.toMillis() >= todayMillis;
    });
    const leavesToReport = [...pendingLeavesSnapshot.docs, ...approvedUpcomingDocs]
        .map((doc) => {
        const data = doc.data();
        return {
            requestId: doc.id,
            startDate: formatTimestamp(data.startDate),
            endDate: formatTimestamp(data.endDate),
            status: data.status ?? 'unknown',
        };
    })
        .sort((a, b) => {
        const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aDate - bDate;
    })
        .slice(0, 5);
    const [activePenaltiesSnap, pendingPenaltiesSnap] = await Promise.all([
        firestore_2.firestore
            .collection(PENALTIES_COLLECTION)
            .where('userId', '==', userId)
            .where('status', '==', 'active')
            .orderBy('dateIncurred', 'desc')
            .limit(5)
            .get(),
        firestore_2.firestore
            .collection(PENALTIES_COLLECTION)
            .where('userId', '==', userId)
            .where('status', '==', 'pending')
            .orderBy('dateIncurred', 'desc')
            .limit(5)
            .get(),
    ]);
    const activePenalties = [...activePenaltiesSnap.docs, ...pendingPenaltiesSnap.docs]
        .map((doc) => {
        const data = doc.data();
        return {
            penaltyId: doc.id,
            status: data.status ?? 'active',
            amount: Number(data.amount) || 0,
            violationType: data.violationType ?? null,
            dateIncurred: formatTimestamp(data.dateIncurred),
        };
    })
        .sort((a, b) => {
        const aTime = a.dateIncurred ? new Date(a.dateIncurred).getTime() : 0;
        const bTime = b.dateIncurred ? new Date(b.dateIncurred).getTime() : 0;
        return bTime - aTime;
    })
        .slice(0, 5);
    const unreadNotifications = await firestore_2.firestore
        .collection(NOTIFICATIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get()
        .then((snapshot) => snapshot.size);
    return {
        date: dateKey,
        attendance: {
            status: attendanceData.status ?? null,
            checksCompleted: checks,
        },
        remainingChecks,
        upcomingLeave: leavesToReport,
        activePenalties,
        unreadNotifications,
        leaveBalances: profile.leaveBalances,
        isActive: profile.isActive,
    };
};
exports.fetchEmployeeDashboard = fetchEmployeeDashboard;
const fetchCompanySettingsPublic = async () => {
    const settings = await (0, settings_1.getCompanySettings)();
    if (!settings) {
        throw new functions.https.HttpsError('failed-precondition', 'Company settings unavailable.');
    }
    return {
        companyName: settings.companyName ?? null,
        timezone: settings.timezone ?? null,
        workplaceRadius: settings.workplace_radius ?? null,
        workplaceCenter: settings.workplace_center
            ? { latitude: settings.workplace_center.latitude, longitude: settings.workplace_center.longitude }
            : null,
        timeWindows: settings.timeWindows ?? null,
        gracePeriods: settings.gracePeriods ?? null,
        workingDays: settings.workingDays ?? null,
        holidays: settings.holidays ?? [],
        geoFencingEnabled: settings.geoFencingEnabled !== false,
        leaveAttachmentRequiredTypes: settings.leaveAttachmentRequiredTypes ?? [],
        maxLeaveAttachmentSizeMb: settings.maxLeaveAttachmentSizeMb ?? null,
        allowedLeaveAttachmentTypes: settings.allowedLeaveAttachmentTypes ?? null,
    };
};
exports.fetchCompanySettingsPublic = fetchCompanySettingsPublic;
