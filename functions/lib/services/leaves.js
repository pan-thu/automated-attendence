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
exports.getLeaveBalance = exports.listEmployeeLeaves = exports.cancelLeaveRequest = exports.submitLeaveRequest = exports.handleLeaveApproval = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const notifications_1 = require("./notifications");
const audit_1 = require("./audit");
const settings_1 = require("./settings");
const leaveAttachments_1 = require("./leaveAttachments");
const timezoneUtils_1 = require("../utils/timezoneUtils");
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const formatDateKey = (date, timezone) => {
    return (0, timezoneUtils_1.getDateKeyInTimezone)(date, timezone);
};
const asUtcDate = (source) => {
    return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
};
const leaveTypeFieldMap = {
    full: 'fullLeaveBalance',
    medical: 'medicalLeaveBalance',
    maternity: 'maternityLeaveBalance',
};
const handleLeaveApproval = async (input) => {
    const { requestId, action, reviewerId, notes } = input;
    // Get company settings for timezone
    const settings = await (0, settings_1.getCompanySettings)();
    const timezone = settings.timezone || 'Asia/Kolkata';
    const overrides = [];
    let leaveSummary = null;
    await (0, firestore_2.runTransaction)(async (tx) => {
        // ===== PHASE 1: ALL READS FIRST =====
        const leaveRef = firestore_2.firestore.collection(LEAVE_COLLECTION).doc(requestId);
        const leaveSnap = await tx.get(leaveRef);
        if (!leaveSnap.exists) {
            throw new Error('Leave request not found.');
        }
        const leaveData = leaveSnap.data();
        if (leaveData.status !== 'pending') {
            throw new Error('Leave request no longer pending.');
        }
        const userId = leaveData.userId;
        const leaveTypeRaw = leaveData.leaveType;
        const leaveType = leaveTypeRaw?.toLowerCase();
        const totalDays = leaveData.totalDays;
        const startDateTimestamp = leaveData.startDate;
        const endDateTimestamp = leaveData.endDate;
        const startUtc = startDateTimestamp ? asUtcDate(startDateTimestamp.toDate()) : asUtcDate(new Date());
        const endUtc = endDateTimestamp ? asUtcDate(endDateTimestamp.toDate()) : startUtc;
        leaveSummary = {
            userId,
            startDate: startUtc,
            endDate: endUtc,
            totalDays,
            leaveType: leaveType ?? 'unknown',
        };
        // Read user document if approving
        let userSnap = null;
        let balanceField = undefined;
        if (action === 'approve') {
            balanceField = leaveType ? leaveTypeFieldMap[leaveType] : undefined;
            if (!balanceField) {
                throw new Error(`Unsupported leave type: ${leaveTypeRaw ?? 'unknown'}`);
            }
            const userRef = firestore_2.firestore.collection(USERS_COLLECTION).doc(userId);
            userSnap = await tx.get(userRef);
            if (!userSnap.exists) {
                throw new Error('User not found for leave request.');
            }
        }
        // Read all attendance records if approving
        const attendanceSnapshots = [];
        if (action === 'approve') {
            let cursor = new Date(startUtc.getTime());
            const attendanceCollection = firestore_2.firestore.collection(ATTENDANCE_COLLECTION);
            while (cursor.getTime() <= endUtc.getTime()) {
                const dateKey = formatDateKey(cursor, timezone);
                const docId = `${userId}_${dateKey}`;
                const attendanceRef = attendanceCollection.doc(docId);
                const attendanceSnap = await tx.get(attendanceRef);
                attendanceSnapshots.push({
                    ref: attendanceRef,
                    snap: attendanceSnap,
                    dateKey,
                });
                cursor.setUTCDate(cursor.getUTCDate() + 1);
            }
        }
        // ===== PHASE 2: ALL WRITES AFTER ALL READS =====
        const now = firestore_1.FieldValue.serverTimestamp();
        const updates = {
            status: action === 'approve' ? 'approved' : 'rejected',
            reviewedAt: now,
            reviewedBy: reviewerId,
            updatedAt: now,
        };
        if (action === 'approve') {
            updates.approvedAt = now;
            updates.approvedBy = reviewerId;
        }
        if (notes) {
            updates.reviewerNotes = notes;
        }
        tx.update(leaveRef, updates);
        if (action === 'approve') {
            // Update user balance
            if (balanceField && userSnap) {
                // Support both new field names and legacy keys for backwards compatibility
                const currentBalance = userSnap.get(balanceField) ?? (leaveType ? userSnap.get(leaveType) : undefined) ?? 0;
                const updatedBalance = Math.max(currentBalance - totalDays, 0);
                tx.update(userSnap.ref, {
                    [balanceField]: updatedBalance,
                    updatedAt: now,
                });
            }
            // Update attendance records
            for (const { ref: attendanceRef, snap: attendanceSnap, dateKey } of attendanceSnapshots) {
                const previousValues = attendanceSnap.exists ? attendanceSnap.data() ?? null : null;
                const previousStatus = previousValues ? previousValues.status : undefined;
                // Parse date from dateKey (format: YYYY-MM-DD)
                const attendanceDate = new Date(dateKey + 'T00:00:00.000Z');
                tx.set(attendanceRef, {
                    userId,
                    status: 'on_leave',
                    leaveRequestId: requestId,
                    leaveBackfill: true,
                    updatedAt: now,
                    updatedBy: reviewerId,
                    attendanceDate: firestore_1.Timestamp.fromDate(attendanceDate),
                    notes: notes ?? previousValues?.notes ?? null,
                }, { merge: true });
                if (previousStatus && previousStatus !== 'on_leave') {
                    overrides.push({ userId, date: dateKey, previousValues });
                }
            }
        }
        // Bug Fix #8: Queue notifications INSIDE transaction to ensure atomicity
        const notificationRef = firestore_2.firestore.collection('NOTIFICATIONS').doc();
        const startKey = formatDateKey(leaveSummary.startDate, timezone);
        const endKey = formatDateKey(leaveSummary.endDate, timezone);
        if (action === 'approve') {
            tx.create(notificationRef, {
                userId: leaveSummary.userId,
                title: 'Leave Approved',
                message: `Your ${leaveSummary.leaveType} leave (${leaveSummary.totalDays} day${leaveSummary.totalDays > 1 ? 's' : ''}) from ${startKey} to ${endKey} has been approved.`,
                category: 'leave',
                relatedId: requestId,
                isRead: false,
                createdAt: now,
                metadata: { startDate: startKey, endDate: endKey, leaveType: leaveSummary.leaveType },
            });
        }
        else if (action === 'reject') {
            tx.create(notificationRef, {
                userId: leaveSummary.userId,
                title: 'Leave Rejected',
                message: `Your ${leaveSummary.leaveType} leave (${leaveSummary.totalDays} day${leaveSummary.totalDays > 1 ? 's' : ''}) from ${startKey} to ${endKey} was rejected.${notes ? ` Reason: ${notes}` : ''}`,
                category: 'leave',
                relatedId: requestId,
                isRead: false,
                createdAt: now,
                metadata: { startDate: startKey, endDate: endKey, leaveType: leaveSummary.leaveType },
            });
        }
    });
    if (overrides.length > 0) {
        const auditPromises = overrides.map((override) => (0, audit_1.recordAuditLog)({
            action: 'leave_backfill_attendance',
            resource: 'ATTENDANCE_RECORDS',
            resourceId: `${override.userId}_${override.date}`,
            status: 'success',
            performedBy: input.reviewerId,
            oldValues: override.previousValues,
            newValues: {
                status: 'on_leave',
                leaveRequestId: input.requestId,
            },
        }));
        await Promise.all(auditPromises);
    }
};
exports.handleLeaveApproval = handleLeaveApproval;
const parseTimestamp = (value) => {
    if (!value) {
        return null;
    }
    if (value instanceof firestore_1.Timestamp) {
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
const parseDateOnly = (value, label) => {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(value)) {
        throw new functions.https.HttpsError('invalid-argument', `${label} must be in YYYY-MM-DD format.`);
    }
    const parsed = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
        throw new functions.https.HttpsError('invalid-argument', `${label} is not a valid date.`);
    }
    return parsed;
};
const ensureFutureOrPresentDate = (date, label) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
        throw new functions.https.HttpsError('failed-precondition', `${label} cannot be in the past.`);
    }
};
const ensureDateRange = (start, end) => {
    if (start > end) {
        throw new functions.https.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
    }
};
const sanitizeLeaveReason = (reason) => {
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 500) {
        throw new functions.https.HttpsError('invalid-argument', 'reason must be between 5 and 500 characters.');
    }
    return trimmed;
};
/**
 * Check for overlapping leave requests for a user.
 * Bug Fix #10: Prevent users from submitting overlapping leave requests.
 */
const checkOverlappingLeaves = async (userId, startDate, endDate, excludeRequestId) => {
    const query = firestore_2.firestore
        .collection(LEAVE_COLLECTION)
        .where('userId', '==', userId)
        .where('status', 'in', ['pending', 'approved']);
    const snapshot = await query.get();
    for (const doc of snapshot.docs) {
        if (excludeRequestId && doc.id === excludeRequestId) {
            continue;
        }
        const data = doc.data();
        const existingStart = data.startDate.toDate();
        const existingEnd = data.endDate.toDate();
        // Check for overlap: (StartA <= EndB) AND (EndA >= StartB)
        if (startDate <= existingEnd && endDate >= existingStart) {
            return true; // Overlap detected
        }
    }
    return false; // No overlap
};
const submitLeaveRequest = async (input) => {
    const { userId, leaveType, startDate, endDate, reason, attachmentId } = input;
    if (!leaveType || typeof leaveType !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'leaveType is required.');
    }
    const start = parseDateOnly(startDate, 'startDate');
    const end = parseDateOnly(endDate, 'endDate');
    ensureDateRange(start, end);
    ensureFutureOrPresentDate(start, 'startDate');
    // Bug Fix #10: Check for overlapping leaves
    const hasOverlap = await checkOverlappingLeaves(userId, start, end);
    if (hasOverlap) {
        throw new functions.https.HttpsError('failed-precondition', 'You already have a pending or approved leave request for overlapping dates.');
    }
    const sanitizedReason = sanitizeLeaveReason(reason);
    // Calculate total days for leave request (inclusive of start and end dates)
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    // Validate leave balance
    const userRef = firestore_2.firestore.collection(USERS_COLLECTION).doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const leaveTypeLower = leaveType.toLowerCase();
    const balanceField = leaveTypeFieldMap[leaveTypeLower];
    if (balanceField) {
        // Get leave balance - support both new field names and legacy keys for backwards compatibility
        const currentBalance = userSnap.get(balanceField) ?? userSnap.get(leaveTypeLower) ?? 0;
        if (totalDays > currentBalance) {
            throw new functions.https.HttpsError('failed-precondition', `Insufficient leave balance. Requested: ${totalDays} days, Available: ${currentBalance} days.`);
        }
    }
    // Hardcoded: medical and maternity leave types require supporting documents
    const requiresAttachment = leaveTypeLower === 'medical' || leaveTypeLower === 'maternity';
    let attachmentMetadata = null;
    if (attachmentId) {
        attachmentMetadata = (0, leaveAttachments_1.assertAttachmentOwnedByUser)(await (0, leaveAttachments_1.getAttachmentById)(attachmentId), userId);
        (0, leaveAttachments_1.assertAttachmentReady)(attachmentMetadata);
    }
    if (requiresAttachment && !attachmentMetadata) {
        throw new functions.https.HttpsError('failed-precondition', 'Attachment is required for this leave type.');
    }
    const leaveRef = firestore_2.firestore.collection(LEAVE_COLLECTION).doc();
    const submittedAt = firestore_1.FieldValue.serverTimestamp();
    await leaveRef.set({
        userId,
        leaveType,
        status: 'pending',
        reason: sanitizedReason,
        startDate: firestore_1.Timestamp.fromDate(start),
        endDate: firestore_1.Timestamp.fromDate(end),
        totalDays, // Add calculated total days
        attachmentId: attachmentMetadata ? attachmentMetadata.id : null,
        createdAt: submittedAt,
        updatedAt: submittedAt,
        submittedAt,
    });
    if (attachmentMetadata) {
        await (0, leaveAttachments_1.attachAttachmentToLeave)({
            attachment: attachmentMetadata,
            leaveRequestId: leaveRef.id,
        });
    }
    await (0, notifications_1.queueNotification)({
        userId,
        title: 'Leave Request Submitted',
        message: `Your ${leaveType} leave from ${startDate} to ${endDate} was submitted for review.`,
        category: 'leave',
        relatedId: leaveRef.id,
    });
    return { requestId: leaveRef.id };
};
exports.submitLeaveRequest = submitLeaveRequest;
/**
 * Cancel leave request with balance restoration for approved leaves.
 * Bug Fix #3: Restore leave balance when canceling approved leaves.
 * Bug Fix #9: Use transactions to ensure atomic balance updates.
 */
const cancelLeaveRequest = async (input) => {
    const { userId, requestId } = input;
    // Get company settings for timezone
    const settings = await (0, settings_1.getCompanySettings)();
    const timezone = settings.timezone || 'Asia/Kolkata';
    const ref = firestore_2.firestore.collection(LEAVE_COLLECTION).doc(requestId);
    let leaveData = {};
    await (0, firestore_2.runTransaction)(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) {
            throw new functions.https.HttpsError('not-found', 'Leave request not found.');
        }
        const data = snapshot.data() ?? {};
        leaveData = data;
        if (data.userId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Cannot cancel another user\'s leave request.');
        }
        // Can only cancel pending or approved leaves
        if (!['pending', 'approved'].includes(data.status)) {
            throw new functions.https.HttpsError('failed-precondition', 'Only pending or approved requests can be cancelled.');
        }
        const wasApproved = data.status === 'approved';
        const now = firestore_1.FieldValue.serverTimestamp();
        // Update leave status
        tx.update(ref, {
            status: 'cancelled',
            cancelledAt: now,
            updatedAt: now,
        });
        // Bug Fix #3: Restore balance if leave was approved
        if (wasApproved && data.totalDays && data.totalDays > 0) {
            const leaveType = data.leaveType?.toLowerCase();
            const balanceField = leaveType ? leaveTypeFieldMap[leaveType] : undefined;
            if (balanceField) {
                const userRef = firestore_2.firestore.collection(USERS_COLLECTION).doc(userId);
                const userSnap = await tx.get(userRef);
                if (!userSnap.exists) {
                    throw new functions.https.HttpsError('not-found', 'User not found.');
                }
                // Support both new field names and legacy keys for backwards compatibility
                const currentBalance = userSnap.get(balanceField) ?? (leaveType ? userSnap.get(leaveType) : undefined) ?? 0;
                const restoredBalance = currentBalance + data.totalDays;
                tx.update(userRef, {
                    [balanceField]: restoredBalance,
                    updatedAt: now,
                });
            }
            // Remove attendance backfills if leave was approved
            const startDate = data.startDate.toDate();
            const endDate = data.endDate.toDate();
            let cursor = new Date(asUtcDate(startDate).getTime());
            while (cursor.getTime() <= asUtcDate(endDate).getTime()) {
                const dateKey = formatDateKey(cursor, timezone);
                const docId = `${userId}_${dateKey}`;
                const attendanceRef = firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(docId);
                const attendanceSnap = await tx.get(attendanceRef);
                // Only remove if it was a leave backfill for this specific request
                if (attendanceSnap.exists) {
                    const attData = attendanceSnap.data() ?? {};
                    if (attData.leaveRequestId === requestId && attData.leaveBackfill === true) {
                        tx.delete(attendanceRef);
                    }
                }
                cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
            }
        }
    });
    await (0, notifications_1.queueNotification)({
        userId,
        title: 'Leave Request Cancelled',
        message: `Your ${leaveData?.leaveType ?? 'leave'} request has been cancelled.${leaveData?.status === 'approved' ? ' Your leave balance has been restored.' : ''}`,
        category: 'leave',
        relatedId: requestId,
    });
    return { success: true };
};
exports.cancelLeaveRequest = cancelLeaveRequest;
const listEmployeeLeaves = async (input) => {
    const { userId, status, limit = 20, cursor } = input;
    if (limit <= 0 || limit > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
    }
    let query = firestore_2.firestore
        .collection(LEAVE_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('startDate', 'desc')
        .limit(limit);
    if (status) {
        query = query.where('status', '==', status);
    }
    if (cursor) {
        const cursorDoc = await firestore_2.firestore.collection(LEAVE_COLLECTION).doc(cursor).get();
        if (!cursorDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
        }
        if (cursorDoc.get('userId') !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to this user.');
        }
        query = query.startAfter(cursorDoc);
    }
    const snapshot = await query.get();
    const items = snapshot.docs.map((doc) => {
        const data = doc.data() ?? {};
        const startTimestamp = data.startDate;
        const endTimestamp = data.endDate;
        return {
            id: doc.id,
            leaveType: data.leaveType ?? 'unknown',
            status: data.status ?? 'pending',
            reason: data.reason ?? null,
            reviewerNotes: data.reviewerNotes ?? null,
            attachmentId: data.attachmentId ?? null,
            startDate: startTimestamp ? startTimestamp.toDate().toISOString() : null,
            endDate: endTimestamp ? endTimestamp.toDate().toISOString() : null,
            submittedAt: parseTimestamp(data.submittedAt),
            reviewedAt: parseTimestamp(data.reviewedAt),
        };
    });
    const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;
    return {
        items,
        nextCursor,
    };
};
exports.listEmployeeLeaves = listEmployeeLeaves;
const getLeaveBalance = async (input) => {
    const { userId, year } = input;
    const currentYear = year || new Date().getFullYear();
    // Get company settings for total leave allocation
    const settings = await (0, settings_1.getCompanySettings)();
    // leavePolicy contains leave type -> days mapping, sum them for total
    const leavePolicy = settings.leavePolicy || {};
    const totalFromPolicy = Object.values(leavePolicy).reduce((sum, days) => sum + days, 0);
    const totalLeaves = totalFromPolicy || 12; // Default to 12 if no policy defined
    // Get user document for leave balances
    const userRef = firestore_2.firestore.collection(USERS_COLLECTION).doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const userData = userSnap.data();
    // Support both new field names (fullLeaveBalance) and legacy keys (full) for backwards compatibility
    const fullLeaveBalance = userData?.fullLeaveBalance ?? userData?.full ?? 0;
    const medicalLeaveBalance = userData?.medicalLeaveBalance ?? userData?.medical ?? 0;
    const maternityLeaveBalance = userData?.maternityLeaveBalance ?? userData?.maternity ?? 0;
    // Calculate total available from user balances
    const totalAvailable = fullLeaveBalance + medicalLeaveBalance + maternityLeaveBalance;
    // Query approved/pending leaves for the year to calculate used days
    const yearStart = firestore_1.Timestamp.fromDate(new Date(currentYear, 0, 1));
    const yearEnd = firestore_1.Timestamp.fromDate(new Date(currentYear, 11, 31, 23, 59, 59));
    const leavesSnapshot = await firestore_2.firestore
        .collection(LEAVE_COLLECTION)
        .where('userId', '==', userId)
        .where('status', 'in', ['approved', 'pending'])
        .where('startDate', '>=', yearStart)
        .where('startDate', '<=', yearEnd)
        .get();
    // Calculate used days
    let usedDays = 0;
    let fullUsed = 0;
    let medicalUsed = 0;
    let maternityUsed = 0;
    leavesSnapshot.forEach((doc) => {
        const leave = doc.data();
        const startTimestamp = leave.startDate;
        const endTimestamp = leave.endDate;
        const start = startTimestamp.toDate();
        const end = endTimestamp.toDate();
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        usedDays += days;
        // Track by type
        const leaveType = leave.leaveType?.toLowerCase() ?? 'full';
        if (leaveType === 'medical') {
            medicalUsed += days;
        }
        else if (leaveType === 'maternity') {
            maternityUsed += days;
        }
        else {
            fullUsed += days;
        }
    });
    const remaining = totalAvailable - usedDays;
    return {
        total: totalAvailable,
        used: usedDays,
        remaining: Math.max(0, remaining),
        year: currentYear,
        breakdown: {
            full: {
                total: fullLeaveBalance,
                used: fullUsed,
                remaining: Math.max(0, fullLeaveBalance - fullUsed),
            },
            medical: {
                total: medicalLeaveBalance,
                used: medicalUsed,
                remaining: Math.max(0, medicalLeaveBalance - medicalUsed),
            },
            maternity: {
                total: maternityLeaveBalance,
                used: maternityUsed,
                remaining: Math.max(0, maternityLeaveBalance - maternityUsed),
            },
        },
    };
};
exports.getLeaveBalance = getLeaveBalance;
