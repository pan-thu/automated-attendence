import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const ANALYTICS_COLLECTION = 'ANALYTICS_SUMMARY';

export interface AttendanceReportInput {
  userId?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
}

const toTimestamp = (iso: string) => admin.firestore.Timestamp.fromDate(new Date(iso));

export const generateAttendanceReport = async (input: AttendanceReportInput) => {
  const { userId, startDate, endDate } = input;

  let query = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', toTimestamp(startDate))
    .where('attendanceDate', '<=', toTimestamp(endDate));

  if (userId) {
    query = query.where('userId', '==', userId);
  }

  const snapshot = await query.get();
  const records = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return {
    total: records.length,
    records,
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

  const totalPresent = attendanceSnap.docs.filter((doc) => doc.get('status') === 'present').length;
  const totalAbsent = attendanceSnap.docs.filter((doc) => doc.get('status') === 'absent').length;
  const totalHalfDay = attendanceSnap.docs.filter((doc) => doc.get('status') === 'half_day_absent').length;

  const leaveSnap = await firestore
    .collection(LEAVE_COLLECTION)
    .where('status', '==', 'pending')
    .get();

  return {
    attendance: {
      present: totalPresent,
      absent: totalAbsent,
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
    .where('attendanceDate', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('attendanceDate', '<=', admin.firestore.Timestamp.fromDate(end))
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
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await firestore.collection(ANALYTICS_COLLECTION).doc(`monthly_${month}`).set(analyticsDoc);
  return analyticsDoc;
};


