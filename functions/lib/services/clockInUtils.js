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
exports.finalizeAttendance = exports.handleClockIn = exports.computeDailyStatus = exports.determineCheckOutcome = exports.calculateDistanceMeters = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const date_fns_tz_1 = require("date-fns-tz");
const firebase_1 = require("../firebase");
const firestore_2 = require("../utils/firestore");
const notifications_1 = require("./notifications");
const audit_1 = require("./audit");
const dateUtils_1 = require("../utils/dateUtils");
const timezoneUtils_1 = require("../utils/timezoneUtils");
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const CLOCK_ORDER = ['check1', 'check2', 'check3'];
const calculateDistanceMeters = (origin, target) => {
    const toRad = (value) => (Math.PI / 180) * value;
    const R = 6371000;
    const dLat = toRad(target.latitude - origin.latitude);
    const dLng = toRad(target.longitude - origin.longitude);
    const lat1 = toRad(origin.latitude);
    const lat2 = toRad(target.latitude);
    const haversine = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return R * c;
};
exports.calculateDistanceMeters = calculateDistanceMeters;
const parseTimeToMinutes = (time) => {
    const [hour, minute] = time.split(':').map((value) => Number(value));
    return hour * 60 + minute;
};
const getMinutesInTimezone = (iso, timezone) => {
    if (!timezone) {
        const date = new Date(iso);
        return date.getUTCHours() * 60 + date.getUTCMinutes();
    }
    const timeString = (0, date_fns_tz_1.formatInTimeZone)(iso, timezone, 'HH:mm');
    const [hours, minutes] = timeString.split(':').map((value) => Number(value));
    return hours * 60 + minutes;
};
const determineCheckOutcome = (iso, slot, window, graceMinutes, timezone) => {
    const actual = getMinutesInTimezone(iso, timezone);
    const start = parseTimeToMinutes(window.start);
    const end = parseTimeToMinutes(window.end);
    // For check3 (evening check-out), we need to detect early leave
    // Early leave: checking out before the window ends (with grace period before end)
    if (slot === 'check3') {
        const earlyGraceStart = start - graceMinutes;
        // Too early (before grace period)
        if (actual < earlyGraceStart) {
            return null;
        }
        // Within early grace period (early leave violation)
        if (actual < start) {
            return { slot, status: 'early_leave', lateByMinutes: start - actual };
        }
        // On time (within normal window)
        if (actual <= end) {
            return { slot, status: 'on_time' };
        }
        // After window end (still within late grace period for check3)
        const lateGraceEnd = end + graceMinutes;
        if (actual <= lateGraceEnd) {
            return { slot, status: 'late', lateByMinutes: actual - end };
        }
        // Too late (missed window completely)
        return null;
    }
    // For check1 and check2 (morning/lunch), detect late arrival only
    if (actual < start) {
        return null;
    }
    if (actual <= end) {
        return { slot, status: 'on_time' };
    }
    const close = end + graceMinutes;
    if (actual <= close) {
        return { slot, status: 'late', lateByMinutes: actual - end };
    }
    return null;
};
exports.determineCheckOutcome = determineCheckOutcome;
const computeDailyStatus = (checkStatuses) => {
    const completed = CLOCK_ORDER.filter((slot) => {
        const status = checkStatuses[slot];
        return status && status !== 'missed';
    });
    const hasMissedChecks = CLOCK_ORDER.some((slot) => checkStatuses[slot] === 'missed');
    // If no checks completed at all
    if (completed.length === 0) {
        return 'absent';
    }
    // If all 3 checks completed
    if (completed.length === 3) {
        return 'present';
    }
    // If exactly 2 checks completed
    if (completed.length === 2) {
        return 'half_day_absent';
    }
    // If only 1 check completed
    // - If there are explicitly missed checks, day is still in progress (windows passed but not finalized)
    // - If no missed checks (just undefined), treat as absent (end-of-day assessment)
    if (completed.length === 1) {
        return hasMissedChecks ? 'in_progress' : 'absent';
    }
    return 'in_progress';
};
exports.computeDailyStatus = computeDailyStatus;
const fetchCompanySettings = async () => {
    const snapshot = await firestore_2.firestore.collection('COMPANY_SETTINGS').doc('main').get();
    if (!snapshot.exists) {
        throw new functions.https.HttpsError('failed-precondition', 'Company settings not configured.');
    }
    return snapshot.data();
};
const resolveSlotOutcome = (iso, settings) => {
    if (!settings.timeWindows) {
        return null;
    }
    const slots = CLOCK_ORDER.filter((slot) => settings.timeWindows?.[slot]);
    for (const slot of slots) {
        const window = settings.timeWindows?.[slot];
        if (!window) {
            continue;
        }
        // Get grace period for this check slot (per-check configuration)
        const grace = settings.gracePeriods?.[slot] ?? 30; // Default to 30 minutes if not specified
        const outcome = (0, exports.determineCheckOutcome)(iso, slot, window, grace, settings.timezone);
        if (outcome) {
            return outcome;
        }
    }
    return null;
};
const getAttendanceDoc = (userId, dateKey) => firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(`${userId}_${dateKey}`);
const handleClockIn = async ({ userId, payload }) => {
    if (!payload.timestamp || !payload.location) {
        throw new functions.https.HttpsError('invalid-argument', 'timestamp and location are required.');
    }
    if (payload.isMocked) {
        throw new functions.https.HttpsError('failed-precondition', 'Clock-in rejected. Mock location detected.');
    }
    // Validate timestamp is within ±5 minutes of server time
    const now = Date.now();
    const timestampMs = new Date(payload.timestamp).getTime();
    const timeDiff = Math.abs(timestampMs - now);
    const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes in milliseconds
    if (timeDiff > MAX_TIME_DIFF) {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid timestamp. Clock-in must be done in real-time.');
    }
    // Bug Fix #19: Validate against weekends and company holidays
    const clockInDate = new Date(payload.timestamp);
    if ((0, dateUtils_1.isWeekend)(clockInDate)) {
        throw new functions.https.HttpsError('failed-precondition', 'Clock-ins are not allowed on weekends.');
    }
    if (await (0, dateUtils_1.isCompanyHoliday)(clockInDate)) {
        throw new functions.https.HttpsError('failed-precondition', 'Clock-ins are not allowed on company holidays.');
    }
    const settings = await fetchCompanySettings();
    if (!settings.workplace_center || typeof settings.workplace_radius !== 'number') {
        throw new functions.https.HttpsError('failed-precondition', 'Workplace geofence not configured.');
    }
    if (settings.geoFencingEnabled !== false) {
        const distance = (0, exports.calculateDistanceMeters)(payload.location, {
            latitude: settings.workplace_center.latitude,
            longitude: settings.workplace_center.longitude,
        });
        if (distance > settings.workplace_radius) {
            throw new functions.https.HttpsError('failed-precondition', `Outside allowed geofence. Distance: ${Math.round(distance)}m.`);
        }
    }
    // Use company timezone to determine the attendance date
    const timezone = settings.timezone || 'Asia/Kolkata';
    const attendanceDate = (0, timezoneUtils_1.getDateKeyInTimezoneFromISO)(payload.timestamp, timezone);
    const attendanceDoc = getAttendanceDoc(userId, attendanceDate);
    const transactionResult = await (0, firestore_2.runTransaction)(async (tx) => {
        const slotOutcome = resolveSlotOutcome(payload.timestamp, settings);
        if (!slotOutcome) {
            throw new functions.https.HttpsError('failed-precondition', 'No active clock-in window.');
        }
        const snapshot = await tx.get(attendanceDoc);
        const data = snapshot.exists ? snapshot.data() ?? {} : {};
        const existingStatus = data[`${slotOutcome.slot}_status`];
        if (existingStatus && existingStatus !== 'missed') {
            throw new functions.https.HttpsError('failed-precondition', `Clock-in already recorded for ${slotOutcome.slot}.`);
        }
        const updatedStatuses = {
            check1: data?.check1_status,
            check2: data?.check2_status,
            check3: data?.check3_status,
        };
        updatedStatuses[slotOutcome.slot] = slotOutcome.status;
        const dayStatus = (0, exports.computeDailyStatus)(updatedStatuses);
        const updates = {
            userId,
            status: dayStatus,
            [`${slotOutcome.slot}_status`]: slotOutcome.status,
            [`${slotOutcome.slot}_timestamp`]: firestore_1.Timestamp.fromDate(new Date(payload.timestamp)),
            [`${slotOutcome.slot}_location`]: new firebase_1.admin.firestore.GeoPoint(payload.location.latitude, payload.location.longitude),
            attendanceDate: firestore_1.Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`)),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        };
        tx.set(attendanceDoc, updates, { merge: true });
        return {
            slotOutcome,
            dayStatus,
        };
    });
    const { slotOutcome, dayStatus } = transactionResult;
    await (0, audit_1.recordAuditLog)({
        action: 'clock_in',
        resource: 'ATTENDANCE_RECORDS',
        resourceId: `${userId}_${attendanceDate}`,
        status: 'success',
        performedBy: userId,
        metadata: {
            slot: slotOutcome.slot,
            status: slotOutcome.status,
            lateByMinutes: slotOutcome.lateByMinutes ?? null,
        },
    });
    const message = slotOutcome.status === 'late'
        ? `Clock-in recorded (${slotOutcome.slot}). Late by ${slotOutcome.lateByMinutes} minutes.`
        : `Clock-in recorded (${slotOutcome.slot}).`;
    await (0, notifications_1.queueNotification)({
        userId,
        title: 'Clock-In Recorded',
        message,
        type: 'info',
        category: 'attendance',
        relatedId: `${userId}_${attendanceDate}`,
    });
    return {
        success: true,
        message,
        slot: slotOutcome.slot,
        checkStatus: slotOutcome.status,
        dailyStatus: dayStatus,
    };
};
exports.handleClockIn = handleClockIn;
const finalizeAttendance = async (input) => {
    const { date } = input;
    // Parse date
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    // Get all active employees
    const usersSnapshot = await firestore_2.firestore
        .collection('USERS')
        .where('isActive', '==', true)
        .where('role', '==', 'employee')
        .get();
    const activeEmployeeIds = usersSnapshot.docs.map(doc => doc.id);
    // Get existing attendance records for this date
    const attendanceSnapshot = await firestore_2.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('attendanceDate', '>=', firestore_1.Timestamp.fromDate(startOfDay))
        .where('attendanceDate', '<=', firestore_1.Timestamp.fromDate(endOfDay))
        .get();
    // Build a map of userId -> attendance record
    const attendanceByUser = new Map();
    attendanceSnapshot.docs.forEach(doc => {
        const userId = doc.get('userId');
        if (userId) {
            attendanceByUser.set(userId, doc);
        }
    });
    let absentRecordsCreated = 0;
    let recordsUpdated = 0;
    const batch = firestore_2.firestore.batch();
    for (const employeeId of activeEmployeeIds) {
        const existingRecord = attendanceByUser.get(employeeId);
        if (!existingRecord) {
            // No attendance record - create absent record with all checks missed
            const docId = `${employeeId}_${date}`;
            const docRef = firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(docId);
            batch.set(docRef, {
                userId: employeeId,
                status: 'absent',
                check1_status: 'missed',
                check2_status: 'missed',
                check3_status: 'missed',
                attendanceDate: firestore_1.Timestamp.fromDate(startOfDay),
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
                isAutoGenerated: true,
            });
            absentRecordsCreated++;
        }
        else {
            // Has record - check if any checks are missing and mark as missed
            const data = existingRecord.data() ?? {};
            const updates = {};
            let needsUpdate = false;
            // Check each slot and mark as missed if not set
            for (const slot of CLOCK_ORDER) {
                const statusField = `${slot}_status`;
                const currentStatus = data[statusField];
                if (!currentStatus) {
                    updates[statusField] = 'missed';
                    needsUpdate = true;
                }
            }
            if (needsUpdate) {
                // Recalculate daily status with updated check statuses
                const checkStatuses = {
                    check1: updates.check1_status ?? data.check1_status,
                    check2: updates.check2_status ?? data.check2_status,
                    check3: updates.check3_status ?? data.check3_status,
                };
                const newDailyStatus = (0, exports.computeDailyStatus)(checkStatuses);
                updates.status = newDailyStatus;
                updates.updatedAt = firestore_1.FieldValue.serverTimestamp();
                batch.update(existingRecord.ref, updates);
                recordsUpdated++;
            }
        }
    }
    await batch.commit();
    return {
        processed: activeEmployeeIds.length,
        absentRecordsCreated,
        recordsUpdated,
    };
};
exports.finalizeAttendance = finalizeAttendance;
