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
exports.setManualAttendance = void 0;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../firebase");
const firestore_2 = require("../utils/firestore");
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const parseTimestamp = (iso) => firestore_1.Timestamp.fromDate(new Date(iso));
const setManualAttendance = async (input) => {
    const { userId, attendanceDate, status, checks = [], isManualEntry = true, notes, reason, performedBy, } = input;
    const docId = `${userId}_${attendanceDate}`;
    const attendanceRef = firestore_2.firestore.collection(ATTENDANCE_COLLECTION).doc(docId);
    // Bug Fix #15: Validate half-day status against actual check-ins
    if (status === 'half_day_absent') {
        const existingDoc = await attendanceRef.get();
        if (existingDoc.exists) {
            const data = existingDoc.data();
            const completedChecks = [
                data?.check1_status,
                data?.check2_status,
                data?.check3_status,
            ].filter((checkStatus) => checkStatus && checkStatus !== 'missed').length;
            // Half-day absent requires exactly 2 completed checks
            if (completedChecks !== 2) {
                throw new functions.https.HttpsError('failed-precondition', `Cannot set half-day absent: user has ${completedChecks} completed checks (requires exactly 2)`);
            }
        }
        else {
            // If no record exists, we can't set half-day absent without check data
            if (checks.length === 0 || checks.filter(c => c.status && c.status !== 'missed').length !== 2) {
                throw new functions.https.HttpsError('failed-precondition', 'Cannot set half-day absent: no attendance record exists or invalid check count');
            }
        }
    }
    const payload = {
        userId,
        status,
        isManualEntry,
        manualReason: reason,
        manualUpdatedBy: performedBy,
        manualUpdatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    };
    if (notes) {
        payload.notes = notes;
    }
    if (checks.length > 0) {
        for (const check of checks) {
            payload[`${check.check}_status`] = check.status;
            payload[`${check.check}_timestamp`] = check.timestamp
                ? parseTimestamp(check.timestamp)
                : null;
            if (check.location) {
                payload[`${check.check}_location`] = new firebase_1.admin.firestore.GeoPoint(check.location.latitude, check.location.longitude);
            }
        }
    }
    payload.attendanceDate = firestore_1.Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`));
    await attendanceRef.set(payload, { merge: true });
};
exports.setManualAttendance = setManualAttendance;
