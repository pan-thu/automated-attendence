import * as functions from 'firebase-functions';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half_day_absent'
  | 'on_leave'
  | 'in_progress'
  | 'unknown';

export type CheckSlot = 'check1' | 'check2' | 'check3';

export interface AttendanceCheckInfo {
  slot: CheckSlot;
  status: string | null;
  timestamp: string | null;
  location?: { latitude: number; longitude: number } | null;
}

export interface AttendanceHistoryItem {
  id: string;
  attendanceDate: string;
  status: AttendanceStatus;
  checks: AttendanceCheckInfo[];
  isManualEntry: boolean;
  manualReason: string | null;
  notes: string | null;
  leaveRequestId?: string | null;
}

export interface ListEmployeeAttendanceInput {
  userId: string;
  limit?: number;
  cursor?: string; // document ID for pagination
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface ListEmployeeAttendanceResult {
  items: AttendanceHistoryItem[];
  nextCursor: string | null;
}

const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const validateDateInput = (value: string, field: string): void => {
  if (!DATE_ONLY_REGEX.test(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be in YYYY-MM-DD format.`);
  }

  const parsed = Date.parse(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is not a valid date.`);
  }
};

const parseTimestamp = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof admin.firestore.Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }

  if (typeof value === 'string') {
    return value;
  }

  return null;
};

const mapAttendanceDocument = (doc: FirebaseFirestore.QueryDocumentSnapshot): AttendanceHistoryItem => {
  const data = doc.data();
  const checks: AttendanceCheckInfo[] = ['check1', 'check2', 'check3'].map((slot) => {
    const timestamp = parseTimestamp(data[`${slot}_timestamp`]);
    const locationValue = data[`${slot}_location`];
    const location =
      locationValue instanceof admin.firestore.GeoPoint
        ? { latitude: locationValue.latitude, longitude: locationValue.longitude }
        : null;

    return {
      slot: slot as CheckSlot,
      status: (data[`${slot}_status`] as string | undefined) ?? null,
      timestamp,
      location,
    };
  });

  const status = (data.status as AttendanceStatus | undefined) ?? 'unknown';
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
    manualReason: (data.manualReason as string | undefined) ?? null,
    notes: (data.notes as string | undefined) ?? null,
    leaveRequestId: (data.leaveRequestId as string | undefined) ?? null,
  };
};

const toTimestamp = (dateIso: string): FirebaseFirestore.Timestamp => {
  return admin.firestore.Timestamp.fromDate(new Date(`${dateIso}T00:00:00Z`));
};

export const listEmployeeAttendance = async (
  input: ListEmployeeAttendanceInput
): Promise<ListEmployeeAttendanceResult> => {
  const { userId, limit = 20, cursor, startDate, endDate } = input;

  if (limit <= 0 || limit > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
  }

  if (startDate) {
    validateDateInput(startDate, 'startDate');
  }

  if (endDate) {
    validateDateInput(endDate, 'endDate');
  }

  if (startDate && endDate) {
    if (Date.parse(`${startDate}T00:00:00Z`) > Date.parse(`${endDate}T00:00:00Z`)) {
      throw new functions.https.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
    }
  }

  let query = firestore
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
    const cursorDoc = await firestore.collection(ATTENDANCE_COLLECTION).doc(cursor).get();
    if (!cursorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
    }

    if ((cursorDoc.get('userId') as string | undefined) !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to the requesting user.');
    }

    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map(mapAttendanceDocument);
  const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;

  return { items, nextCursor };
};

export interface GetAttendanceDayDetailInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface AttendanceDayDetail extends AttendanceHistoryItem {
  dailyStatus: AttendanceStatus;
  summary: {
    completedChecks: number;
    remainingChecks: CheckSlot[];
  };
}

export const getAttendanceDayDetail = async (
  input: GetAttendanceDayDetailInput
): Promise<AttendanceDayDetail> => {
  const { userId, date } = input;
  validateDateInput(date, 'date');
  const docId = `${userId}_${date}`;

  const doc = await firestore.collection(ATTENDANCE_COLLECTION).doc(docId).get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Attendance record not found for the specified date.');
  }

  const record = mapAttendanceDocument(doc as FirebaseFirestore.QueryDocumentSnapshot);

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

