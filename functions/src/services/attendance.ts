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

const parseTimestamp = (iso: string) => admin.firestore.Timestamp.fromDate(new Date(iso));

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

  const payload: Record<string, unknown> = {
    userId,
    status,
    isManualEntry,
    manualReason: reason,
    manualUpdatedBy: performedBy,
    manualUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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

  payload.attendanceDate = admin.firestore.Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`));

  await attendanceRef.set(payload, { merge: true });
};


