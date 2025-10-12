import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';

export interface ManualAttendanceInput {
  userId: string;
  attendanceDate: string; // YYYY-MM-DD
  status: string;
  checks?: Array<{
    check: 'check1' | 'check2' | 'check3';
    timestamp: string; // ISO string
    status: string;
    location?: { latitude: number; longitude: number };
  }>;
  isManualEntry?: boolean;
  notes?: string;
  reason: string;
  performedBy: string;
}

const parseTimestamp = (iso: string) => Timestamp.fromDate(new Date(iso));

export const setManualAttendance = async (input: ManualAttendanceInput) => {
  const {
    userId,
    attendanceDate,
    status,
    checks = [],
    isManualEntry = true,
    notes,
    reason,
    performedBy,
  } = input;

  const docId = `${userId}_${attendanceDate}`;
  const attendanceRef = firestore.collection(ATTENDANCE_COLLECTION).doc(docId);

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
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot set half-day absent: user has ${completedChecks} completed checks (requires exactly 2)`
        );
      }
    } else {
      // If no record exists, we can't set half-day absent without check data
      if (checks.length === 0 || checks.filter(c => c.status && c.status !== 'missed').length !== 2) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Cannot set half-day absent: no attendance record exists or invalid check count'
        );
      }
    }
  }

  const payload: Record<string, unknown> = {
    userId,
    status,
    isManualEntry,
    manualReason: reason,
    manualUpdatedBy: performedBy,
    manualUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
        payload[`${check.check}_location`] = new admin.firestore.GeoPoint(
          check.location.latitude,
          check.location.longitude
        );
      }
    }
  }

  payload.attendanceDate = Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`));

  await attendanceRef.set(payload, { merge: true });
};


