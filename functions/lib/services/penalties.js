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
exports.getPenaltySummary = exports.calculateDailyViolations = exports.acknowledgePenalty = exports.listEmployeePenalties = exports.waivePenalty = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../firebase");
const firestore_2 = require("../utils/firestore");
const settings_1 = require("./settings");
const logger_1 = require("../utils/logger");
const notifications_1 = require("./notifications");
const PENALTIES_COLLECTION = 'PENALTIES';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const waivePenalty = async (input) => {
    const { penaltyId, waivedReason, performedBy } = input;
    await firestore_2.firestore.collection(PENALTIES_COLLECTION).doc(penaltyId).set({
        status: 'waived',
        waivedReason,
        waivedBy: performedBy,
        waivedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
};
exports.waivePenalty = waivePenalty;
const listEmployeePenalties = async (input) => {
    const { userId, limit = 20, cursor, status } = input;
    if (limit <= 0 || limit > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
    }
    let query = firestore_2.firestore
        .collection(PENALTIES_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('dateIncurred', 'desc')
        .limit(limit);
    if (status) {
        query = query.where('status', '==', status);
    }
    if (cursor) {
        const cursorDoc = await firestore_2.firestore.collection(PENALTIES_COLLECTION).doc(cursor).get();
        if (!cursorDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
        }
        if (cursorDoc.get('userId') !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to this user.');
        }
        query = query.startAfter(cursorDoc);
    }
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
    const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;
    return { items, nextCursor };
};
exports.listEmployeePenalties = listEmployeePenalties;
const acknowledgePenalty = async (input) => {
    const { userId, penaltyId, note } = input;
    const penaltyRef = firestore_2.firestore.collection(PENALTIES_COLLECTION).doc(penaltyId);
    const snapshot = await penaltyRef.get();
    if (!snapshot.exists) {
        throw new functions.https.HttpsError('not-found', 'Penalty not found.');
    }
    if (snapshot.get('userId') !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot acknowledge another user\'s penalty.');
    }
    await penaltyRef.set({
        acknowledged: true,
        acknowledgedAt: firestore_1.FieldValue.serverTimestamp(),
        acknowledgementNote: note ?? null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    }, { merge: true });
    return { success: true };
};
exports.acknowledgePenalty = acknowledgePenalty;
// Violation types based on daily status and individual check statuses
const violationStatuses = ['late', 'early_leave', 'absent', 'half_day_absent'];
const isViolation = (status) => {
    return typeof status === 'string' && violationStatuses.includes(status);
};
/**
 * Get human-readable label for violation types
 */
const getViolationTypeLabel = (violationType) => {
    const labels = {
        late: 'Late Check-in',
        early_leave: 'Early Check-out',
        absent: 'Absence',
        half_day_absent: 'Half-day Absence',
    };
    return labels[violationType] || violationType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};
const calculateDailyViolations = async (input) => {
    const { date, userId } = input;
    // Parse date
    const [year, month, day] = date.split('-').map(Number);
    const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    logger_1.penaltyLogger.info(`Calculating daily penalties for ${date}`, {
        userId: userId ?? 'all',
    });
    const companySettings = await (0, settings_1.getCompanySettings)();
    const penaltyAmounts = companySettings.penaltyRules?.amounts ?? {};
    // Check if this date is a holiday - skip if so
    const holidays = companySettings.holidays ?? [];
    const holidayDates = new Set(holidays
        .map((h) => h.match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
        .filter((d) => d !== undefined));
    if (holidayDates.has(date)) {
        logger_1.penaltyLogger.info(`Skipping ${date} - it's a holiday`);
        return { processed: 0, penaltiesCreated: 0, skippedHoliday: true };
    }
    // Query attendance records for this specific date
    let attendanceQuery = firestore_2.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('attendanceDate', '>=', firestore_1.Timestamp.fromDate(startOfDay))
        .where('attendanceDate', '<=', firestore_1.Timestamp.fromDate(endOfDay));
    const snapshots = await attendanceQuery.get();
    let penaltiesCreated = 0;
    let processedCount = 0;
    for (const doc of snapshots.docs) {
        const data = doc.data();
        const docUserId = data.userId;
        // Skip if filtering by userId and doesn't match
        if (userId && docUserId !== userId) {
            continue;
        }
        processedCount++;
        // Check for violations in this attendance record
        const violations = [];
        // Daily status violations (absent, half_day_absent)
        const dailyStatus = data.status;
        // DEBUG LOGGING
        logger_1.penaltyLogger.info(`Processing attendance for ${docUserId} on ${date}`, {
            dailyStatus,
            check1_status: data.check1_status,
            check2_status: data.check2_status,
            check3_status: data.check3_status,
            attendanceRecordId: doc.id,
        });
        if (dailyStatus === 'absent' || dailyStatus === 'half_day_absent') {
            violations.push({ type: dailyStatus, field: 'status' });
            logger_1.penaltyLogger.info(`Daily status violation detected: ${dailyStatus}`);
        }
        // Individual check violations (late, early_leave)
        const check1Status = data.check1_status;
        const check2Status = data.check2_status;
        const check3Status = data.check3_status;
        if (check1Status === 'late') {
            violations.push({ type: 'late', field: 'check1_status' });
            logger_1.penaltyLogger.info(`Check1 late violation detected`);
        }
        if (check2Status === 'late') {
            violations.push({ type: 'late', field: 'check2_status' });
            logger_1.penaltyLogger.info(`Check2 late violation detected`);
        }
        if (check3Status === 'early_leave') {
            violations.push({ type: 'early_leave', field: 'check3_status' });
            logger_1.penaltyLogger.info(`Check3 early_leave violation detected`);
        }
        logger_1.penaltyLogger.info(`Total violations found: ${violations.length}`, { violations });
        // Create a penalty for each violation
        for (const violation of violations) {
            // Check if penalty already exists for this user, date, and violation type
            const existingPenalty = await firestore_2.firestore
                .collection(PENALTIES_COLLECTION)
                .where('userId', '==', docUserId)
                .where('dateKey', '==', date)
                .where('violationType', '==', violation.type)
                .where('violationField', '==', violation.field)
                .limit(1)
                .get();
            if (!existingPenalty.empty) {
                // Penalty already exists for this violation, skip
                continue;
            }
            // Count existing violations of this type for the current month
            const [violationYear, violationMonth] = date.split('-').map(Number);
            const monthStart = new Date(Date.UTC(violationYear, violationMonth - 1, 1, 0, 0, 0, 0));
            const monthEnd = new Date(Date.UTC(violationYear, violationMonth, 0, 23, 59, 59, 999));
            const existingViolationsSnapshot = await firestore_2.firestore
                .collection(PENALTIES_COLLECTION)
                .where('userId', '==', docUserId)
                .where('violationType', '==', violation.type)
                .where('dateIncurred', '>=', firestore_1.Timestamp.fromDate(monthStart))
                .where('dateIncurred', '<=', firestore_1.Timestamp.fromDate(monthEnd))
                .get();
            const existingCount = existingViolationsSnapshot.size;
            const threshold = companySettings.penaltyRules?.violationThresholds?.[violation.type] ?? 0;
            const baseAmount = penaltyAmounts[violation.type] ?? 0;
            // Only apply fine if threshold is passed (count >= threshold means this is the Nth+ violation)
            // threshold of 0 means fine from first violation
            // threshold of 3 means fine starts from 4th violation (after 3 warnings)
            const thresholdPassed = existingCount >= threshold;
            const amount = thresholdPassed ? baseAmount : 0;
            const penaltyRef = firebase_1.admin.firestore().collection(PENALTIES_COLLECTION).doc();
            await penaltyRef.set({
                userId: docUserId,
                violationType: violation.type,
                violationField: violation.field,
                amount,
                status: 'active',
                isWarning: !thresholdPassed,
                violationCount: existingCount + 1, // This is the Nth violation
                threshold,
                dateKey: date,
                dateIncurred: firestore_1.Timestamp.fromDate(startOfDay),
                attendanceRecordId: doc.id,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
            penaltiesCreated++;
            // Send notification to user about the violation/penalty
            const violationTypeLabel = getViolationTypeLabel(violation.type);
            const notificationTitle = thresholdPassed ? 'Penalty Issued' : 'Attendance Violation Warning';
            const notificationMessage = thresholdPassed
                ? `A penalty of ₹${amount} has been issued for ${violationTypeLabel} on ${date}. This is violation #${existingCount + 1} this month.`
                : `Warning: ${violationTypeLabel} recorded on ${date}. This is violation #${existingCount + 1} of ${threshold} allowed this month.`;
            await (0, notifications_1.queueNotification)({
                userId: docUserId,
                title: notificationTitle,
                message: notificationMessage,
                category: 'penalty',
                type: thresholdPassed ? 'penalty' : 'warning',
                relatedId: penaltyRef.id,
                relatedType: 'penalty',
                metadata: {
                    violationType: violation.type,
                    violationField: violation.field,
                    amount,
                    isWarning: !thresholdPassed,
                    violationCount: existingCount + 1,
                    threshold,
                    date,
                },
            });
            logger_1.penaltyLogger.info(`Created penalty for ${docUserId}`, {
                violationType: violation.type,
                date,
                amount,
                isWarning: !thresholdPassed,
                violationCount: existingCount + 1,
            });
        }
    }
    logger_1.penaltyLogger.info(`Daily penalties completed for ${date}`, {
        processed: processedCount,
        penaltiesCreated,
    });
    return { processed: processedCount, penaltiesCreated };
};
exports.calculateDailyViolations = calculateDailyViolations;
const getPenaltySummary = async (input) => {
    const { userId } = input;
    const penaltiesSnapshot = await firestore_2.firestore
        .collection(PENALTIES_COLLECTION)
        .where('userId', '==', userId)
        .get();
    const summary = {
        activeCount: 0,
        totalAmount: 0,
        byStatus: {
            active: { count: 0, amount: 0 },
            waived: { count: 0, amount: 0 },
            paid: { count: 0, amount: 0 },
        },
    };
    penaltiesSnapshot.forEach((doc) => {
        const penalty = doc.data();
        const status = penalty.status?.toLowerCase() ?? 'active';
        const amount = penalty.amount ?? 0;
        // Map status to our summary categories
        let statusKey = 'active';
        if (status === 'waived') {
            statusKey = 'waived';
        }
        else if (status === 'paid') {
            statusKey = 'paid';
        }
        summary.byStatus[statusKey].count++;
        summary.byStatus[statusKey].amount += amount;
        if (status === 'active') {
            summary.activeCount++;
            summary.totalAmount += amount;
        }
    });
    return summary;
};
exports.getPenaltySummary = getPenaltySummary;
