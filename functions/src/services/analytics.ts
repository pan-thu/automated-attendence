import { admin } from '../firebase';
import { firestore } from '../utils/firestore';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const ANALYTICS_COLLECTION = 'ANALYTICS_SUMMARY';

type AttendanceRecordDoc = Record<string, unknown> & {
  id: string;
  userId?: string;
  status?: string;
  attendanceDate?: unknown;
  isManualEntry?: boolean;
  manualReason?: unknown;
  notes?: unknown;
};

export interface AttendanceReportInput {
  userId?: string;
  department?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

const toTimestamp = (iso: string) => Timestamp.fromDate(new Date(iso));

const toIsoString = (value: unknown): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
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

const USERS_COLLECTION = 'USERS';

export const generateAttendanceReport = async (input: AttendanceReportInput) => {
  const { userId, department, startDate, endDate } = input;

  let query = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', toTimestamp(startDate))
    .where('attendanceDate', '<=', toTimestamp(endDate));

  if (userId) {
    query = query.where('userId', '==', userId);
  }

  const snapshot = await query.get();
  const attendanceRecords: AttendanceRecordDoc[] = snapshot.docs.map((doc) => {
    const data = doc.data() as FirebaseFirestore.DocumentData;
    return {
      id: doc.id,
      ...data,
    } as AttendanceRecordDoc;
  });

  const uniqueUserIds = new Set<string>();
  attendanceRecords.forEach((record) => {
    const uid = record.userId;
    if (uid) {
      uniqueUserIds.add(uid);
    }
  });

  const userDocs = await Promise.all(
    Array.from(uniqueUserIds).map((uid) => firestore.collection(USERS_COLLECTION).doc(uid).get())
  );

  const userLookup = new Map<string, FirebaseFirestore.DocumentData>();
  userDocs.forEach((doc) => {
    if (doc.exists) {
      userLookup.set(doc.id, doc.data() ?? {});
    }
  });

  const filtered = attendanceRecords.filter((record) => {
    if (!department) {
      return true;
    }

    const userData = userLookup.get(record.userId ?? '');
    const userDepartment = typeof userData?.department === 'string' ? userData.department : null;
    return userDepartment === department;
  });

  const normalized = filtered.map((record) => {
    const uid = record.userId ?? '';
    const userData = userLookup.get(uid) ?? {};

    return {
      id: record.id,
      userId: uid,
      status: record.status ?? 'unknown',
      attendanceDate: toIsoString(record.attendanceDate),
      isManualEntry: record.isManualEntry ?? false,
      reason: record.manualReason ?? null,
      notes: record.notes ?? null,
      userName: (userData.fullName as string | undefined) ?? null,
      userEmail: (userData.email as string | undefined) ?? null,
      department: (userData.department as string | undefined) ?? null,
      position: (userData.position as string | undefined) ?? null,
    } as Record<string, unknown>;
  });

  return {
    total: normalized.length,
    records: normalized,
  };
};

export interface DashboardStatsInput {
  date: string; // YYYY-MM-DD
}

export const getDashboardStats = async (input: DashboardStatsInput) => {
  const { date } = input;
  const start = toTimestamp(`${date}T00:00:00Z`);
  const end = toTimestamp(`${date}T23:59:59Z`);

  const attendanceSnap = await firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', start)
    .where('attendanceDate', '<=', end)
    .get();

  let totalPresent = 0;
  let totalAbsent = 0;
  let totalHalfDay = 0;
  let totalOnLeave = 0;

  attendanceSnap.docs.forEach((doc) => {
    const status = (doc.get('status') as string | undefined)?.toLowerCase();
    switch (status) {
      case 'present':
        totalPresent += 1;
        break;
      case 'absent':
        totalAbsent += 1;
        break;
      case 'half_day_absent':
        totalHalfDay += 1;
        break;
      case 'on_leave':
        totalOnLeave += 1;
        break;
      default:
        break;
    }
  });

  const leaveSnap = await firestore
    .collection(LEAVE_COLLECTION)
    .where('status', '==', 'pending')
    .get();

  return {
    attendance: {
      present: totalPresent,
      absent: totalAbsent,
      onLeave: totalOnLeave,
      halfDay: totalHalfDay,
      total: attendanceSnap.size,
    },
    pendingLeaves: leaveSnap.size,
  };
};

export const aggregateDailyAttendance = async (date: string) => {
  const stats = await getDashboardStats({ date });
  const docId = `${date}`;
  const ref = firestore.collection(ANALYTICS_COLLECTION).doc(docId);

  await ref.set({
    date,
    attendance: stats.attendance,
    pendingLeaves: stats.pendingLeaves,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return stats;
};

export const aggregateMonthlyAttendance = async (month: string) => {
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));

  const attendanceSnap = await firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', Timestamp.fromDate(start))
    .where('attendanceDate', '<=', Timestamp.fromDate(end))
    .get();

  const present = attendanceSnap.docs.filter((doc) => doc.get('status') === 'present').length;
  const absent = attendanceSnap.docs.filter((doc) => doc.get('status') === 'absent').length;
  const halfDay = attendanceSnap.docs.filter((doc) => doc.get('status') === 'half_day_absent').length;

  const analyticsDoc = {
    month,
    attendance: {
      present,
      absent,
      halfDay,
      total: attendanceSnap.size,
    },
    updatedAt: FieldValue.serverTimestamp(),
  };

  await firestore.collection(ANALYTICS_COLLECTION).doc(`monthly_${month}`).set(analyticsDoc);
  return analyticsDoc;
};


