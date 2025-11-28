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
exports.markAllNotificationsAsRead = exports.getEmployeesNeedingClockInReminder = exports.getActiveEmployees = exports.markNotificationAsRead = exports.listNotificationsForEmployee = exports.queueBulkNotifications = exports.queueNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const CHECK_STATUS_FIELDS = {
    check1: 'check1_status',
    check2: 'check2_status',
    check3: 'check3_status',
};
const toIsoString = (value) => {
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
const queueNotification = async (payload) => {
    const { userId, title, message, category = 'system', type = 'info', relatedId, relatedType, metadata } = payload;
    return firestore_2.firestore.collection(NOTIFICATIONS_COLLECTION).add({
        userId,
        title,
        message,
        category,
        type,
        relatedId: relatedId ?? null,
        relatedType: relatedType ?? null,
        metadata: metadata ?? null,
        isRead: false,
        sentAt: firestore_1.FieldValue.serverTimestamp(),
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
};
exports.queueNotification = queueNotification;
const queueBulkNotifications = async (payload) => {
    const { userIds, ...rest } = payload;
    const batch = firestore_2.firestore.batch();
    userIds.forEach((id) => {
        const ref = firestore_2.firestore.collection(NOTIFICATIONS_COLLECTION).doc();
        batch.set(ref, {
            ...rest,
            userId: id,
            relatedId: rest.relatedId ?? null,
            relatedType: rest.relatedType ?? null,
            metadata: rest.metadata ?? null,
            isRead: false,
            sentAt: firestore_1.FieldValue.serverTimestamp(),
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
    return { count: userIds.length };
};
exports.queueBulkNotifications = queueBulkNotifications;
const listNotificationsForEmployee = async (input) => {
    const { userId, limit = 20, cursor, status } = input;
    if (limit <= 0 || limit > 100) {
        throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
    }
    let query = firestore_2.firestore
        .collection(NOTIFICATIONS_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('sentAt', 'desc')
        .limit(limit);
    if (status === 'read') {
        query = query.where('isRead', '==', true);
    }
    else if (status === 'unread') {
        query = query.where('isRead', '==', false);
    }
    if (cursor) {
        const cursorDoc = await firestore_2.firestore.collection(NOTIFICATIONS_COLLECTION).doc(cursor).get();
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
        return {
            id: doc.id,
            title: data.title ?? '',
            message: data.message ?? '',
            category: data.category ?? null,
            type: data.type ?? null,
            isRead: Boolean(data.isRead ?? false),
            sentAt: toIsoString(data.sentAt),
            readAt: toIsoString(data.readAt),
            relatedId: data.relatedId ?? null,
            metadata: data.metadata ?? null,
        };
    });
    const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;
    return { items, nextCursor };
};
exports.listNotificationsForEmployee = listNotificationsForEmployee;
const markNotificationAsRead = async (input) => {
    const { userId, notificationId, acknowledgment } = input;
    const ref = firestore_2.firestore.collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
    const doc = await ref.get();
    if (!doc.exists) {
        throw new functions.https.HttpsError('not-found', 'Notification not found.');
    }
    if (doc.get('userId') !== userId) {
        throw new functions.https.HttpsError('permission-denied', 'Cannot update another user\'s notification.');
    }
    await ref.update({
        isRead: true,
        readAt: firestore_1.FieldValue.serverTimestamp(),
        acknowledgment: acknowledgment ?? null,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return { success: true };
};
exports.markNotificationAsRead = markNotificationAsRead;
const getActiveEmployees = async () => {
    const snapshot = await firestore_2.firestore
        .collection(USERS_COLLECTION)
        .where('role', '==', 'employee')
        .where('isActive', '==', true)
        .get();
    return snapshot.docs.map((doc) => doc.id);
};
exports.getActiveEmployees = getActiveEmployees;
const getEmployeesNeedingClockInReminder = async (dateKey, slot) => {
    // Import timezone utilities for proper date range calculation
    const { getEffectiveTimezone } = await Promise.resolve().then(() => __importStar(require('../utils/timezoneUtils')));
    const { fromZonedTime } = await Promise.resolve().then(() => __importStar(require('date-fns-tz')));
    // Get company timezone
    const timezone = await getEffectiveTimezone();
    // Create start and end dates in company timezone, then convert to UTC
    const startInTimezone = new Date(`${dateKey}T00:00:00`);
    const endInTimezone = new Date(`${dateKey}T23:59:59`);
    // Convert from company timezone to UTC for Firestore query
    const startUTC = fromZonedTime(startInTimezone, timezone);
    const endUTC = fromZonedTime(endInTimezone, timezone);
    const start = firestore_1.Timestamp.fromDate(startUTC);
    const end = firestore_1.Timestamp.fromDate(endUTC);
    const [attendanceSnap, activeEmployees] = await Promise.all([
        firestore_2.firestore
            .collection(ATTENDANCE_COLLECTION)
            .where('attendanceDate', '>=', start)
            .where('attendanceDate', '<=', end)
            .get(),
        (0, exports.getActiveEmployees)(),
    ]);
    const pending = new Set(activeEmployees);
    const skipStatuses = new Set(['on_leave', 'present']);
    const checkField = CHECK_STATUS_FIELDS[slot];
    attendanceSnap.forEach((doc) => {
        const userId = doc.get('userId');
        if (!userId) {
            return;
        }
        if (!pending.has(userId)) {
            return;
        }
        const dayStatus = doc.get('status')?.toLowerCase();
        if (dayStatus && skipStatuses.has(dayStatus)) {
            pending.delete(userId);
            return;
        }
        const checkStatus = doc.get(checkField);
        if (checkStatus && checkStatus !== 'missed') {
            pending.delete(userId);
        }
    });
    return Array.from(pending);
};
exports.getEmployeesNeedingClockInReminder = getEmployeesNeedingClockInReminder;
const markAllNotificationsAsRead = async (input) => {
    const { userId } = input;
    const unreadNotifications = await firestore_2.firestore
        .collection(NOTIFICATIONS_COLLECTION)
        .where('userId', '==', userId)
        .where('isRead', '==', false)
        .get();
    if (unreadNotifications.empty) {
        return { success: true, markedCount: 0 };
    }
    const batch = firestore_2.firestore.batch();
    unreadNotifications.forEach((doc) => {
        batch.update(doc.ref, {
            isRead: true,
            readAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
    });
    await batch.commit();
    return { success: true, markedCount: unreadNotifications.size };
};
exports.markAllNotificationsAsRead = markAllNotificationsAsRead;
