"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAttendanceDayDetail = exports.listEmployeeAttendance = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const firestore_2 = require("../utils/firestore");
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const validateDateInput = (value, field) => {
    if (!DATE_ONLY_REGEX.test(value)) {
        throw new https_1.HttpsError('invalid-argument', `${field} must be in YYYY-MM-DD format.`);
    }
    const parsed = Date.parse(`${value}T00:00:00Z`);
    if (Number.isNaN(parsed)) {
        throw new https_1.HttpsError('invalid-argument', `${field} is not a valid date.`);
    }
};
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
const mapAttendanceDocument = (doc) => {
    const data = doc.data();
    const checks = ['check1', 'check2', 'check3'].map((slot) => {
        const timestamp = parseTimestamp(data[`${slot}_timestamp`]);
        const locationValue = data[`${slot}_location`];
        const location = locationValue instanceof firestore_1.GeoPoint
            ? { latitude: locationValue.latitude, longitude: locationValue.longitude }
            : null;
        return {
            slot: slot,
            status: data[`${slot}_status`] ?? null,
            timestamp,
            location,
        };
    });
    const status = data.status ?? 'unknown';
    const attendanceDateIso = parseTimestamp(data.attendanceDate);
    const attendanceDate = attendanceDateIso
        ? attendanceDateIso.slice(0, 10)
        : doc.id.includes('_')
            ? doc.id.split('_').slice(-1)[0]
            : new Date().toISOString().slice(0, 10);
    return {
        id: doc.id,
        attendanceDate,
        status,
        checks,
        isManualEntry: Boolean(data.isManualEntry ?? false),
        manualReason: data.manualReason ?? null,
        notes: data.notes ?? null,
        leaveRequestId: data.leaveRequestId ?? null,
    };
};
const toTimestamp = (dateIso) => {
    return firestore_1.Timestamp.fromDate(new Date(`${dateIso}T00:00:00Z`));
};
const listEmployeeAttendance = async (input) => {
    const { userId, limit = 20, cursor, startDate, endDate } = input;
    if (limit <= 0 || limit > 100) {
        throw new https_1.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
    }
    if (startDate) {
        validateDateInput(startDate, 'startDate');
    }
    if (endDate) {
        validateDateInput(endDate, 'endDate');
    }
    if (startDate && endDate) {
        if (Date.parse(`${startDate}T00:00:00Z`) > Date.parse(`${endDate}T00:00:00Z`)) {
            throw new https_1.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
        }
    }
    let query = firestore_2.firestore
        .collection(ATTENDANCE_COLLECTION)
        .where('userId', '==', userId)
        .orderBy('attendanceDate', 'desc')
        .limit(limit);
    if (startDate) {
        query = query.where('attendanceDate', '>=', toTimestamp(startDate));
    }
    if (endDate) {
        query = query.where('attendanceDate', '<=', toTimestamp(endDate));
    }
    if (cursor) {
        const cursorDoc = await firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(cursor).get();
        if (!cursorDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Cursor document not found.');
        }
        if (cursorDoc.get('userId') !== userId) {
            throw new https_1.HttpsError('permission-denied', 'Cursor does not belong to the requesting user.');
        }
        query = query.startAfter(cursorDoc);
    }
    const snapshot = await query.get();
    const items = snapshot.docs.map(mapAttendanceDocument);
    const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;
    return { items, nextCursor };
};
exports.listEmployeeAttendance = listEmployeeAttendance;
const getAttendanceDayDetail = async (input) => {
    const { userId, date } = input;
    validateDateInput(date, 'date');
    const docId = `${userId}_${date}`;
    const doc = await firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(docId).get();
    if (!doc.exists) {
        throw new https_1.HttpsError('not-found', 'Attendance record not found for the specified date.');
    }
    const record = mapAttendanceDocument(doc);
    const completedChecks = record.checks.filter((check) => check.status && check.status !== 'missed').length;
    const remainingChecks = record.checks
        .filter((check) => !check.status || check.status === 'missed')
        .map((check) => check.slot);
    return {
        ...record,
        dailyStatus: record.status,
        summary: {
            completedChecks,
            remainingChecks,
        },
    };
};
exports.getAttendanceDayDetail = getAttendanceDayDetail;
