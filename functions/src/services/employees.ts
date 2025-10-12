import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../utils/firestore';
import { getCompanySettings } from './settings';
import { admin } from '../firebase';

const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const PENALTIES_COLLECTION = 'PENALTIES';

export interface EmployeeProfile {
  userId: string;
  fullName: string | null;
  email: string | null;
  department: string | null;
  position: string | null;
  phoneNumber: string | null;
  leaveBalances: Record<string, number>;
  isActive: boolean;
}

export const fetchEmployeeProfile = async (userId: string): Promise<EmployeeProfile> => {
  const snapshot = await firestore.collection(USERS_COLLECTION).doc(userId).get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError('not-found', 'Employee profile not found.');
  }

  const data = snapshot.data() ?? {};
  if (data.role !== 'employee') {
    throw new functions.https.HttpsError('permission-denied', 'Profile access restricted to employees.');
  }

  return {
    userId,
    fullName: (data.fullName as string | undefined) ?? null,
    email: (data.email as string | undefined) ?? null,
    department: (data.department as string | undefined) ?? null,
    position: (data.position as string | undefined) ?? null,
    phoneNumber: (data.phoneNumber as string | undefined) ?? null,
    leaveBalances: {
      fullLeaveBalance: Number(data.fullLeaveBalance) || 0,
      halfLeaveBalance: Number(data.halfLeaveBalance) || 0,
      medicalLeaveBalance: Number(data.medicalLeaveBalance) || 0,
      maternityLeaveBalance: Number(data.maternityLeaveBalance) || 0,
    },
    isActive: Boolean(data.isActive ?? false),
  };
};

export interface EmployeeDashboardSummary {
  date: string;
  attendance: {
    status: string | null;
    checksCompleted: Array<{ slot: string; status: string | null; timestamp: string | null }>;
  };
  remainingChecks: string[];
  upcomingLeave: Array<{ requestId: string; startDate: string | null; endDate: string | null; status: string }>;
  activePenalties: Array<{ penaltyId: string; status: string; amount: number; violationType: string | null; dateIncurred: string | null }>;
  unreadNotifications: number;
  leaveBalances: Record<string, number>;
  isActive: boolean;
}

const formatTimestamp = (value: unknown): string | null => {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'string') {
    return value;
  }
  return null;
};

export const fetchEmployeeDashboard = async (userId: string, dateIso?: string): Promise<EmployeeDashboardSummary> => {
  const dateKey = dateIso ? dateIso.slice(0, 10) : new Date().toISOString().slice(0, 10);

  const [profile, attendanceSnapshot] = await Promise.all([
    fetchEmployeeProfile(userId),
    firestore.collection(ATTENDANCE_COLLECTION).doc(`${userId}_${dateKey}`).get(),
  ]);

  const attendanceData = attendanceSnapshot.exists ? attendanceSnapshot.data() ?? {} : {};

  const checks: Array<{ slot: string; status: string | null; timestamp: string | null }> = ['check1', 'check2', 'check3'].map(
    (slot) => ({
      slot,
      status: (attendanceData[`${slot}_status`] as string | undefined) ?? null,
      timestamp: formatTimestamp(attendanceData[`${slot}_timestamp`]),
    })
  );

  const remainingChecks = checks
    .filter((entry) => !entry.status || entry.status === 'missed')
    .map((entry) => entry.slot);

  const today = new Date(`${dateKey}T00:00:00Z`);
  const todayTimestamp = Timestamp.fromDate(today);

  const [pendingLeavesSnapshot, approvedLeavesQuery] = await Promise.all([
    firestore
      .collection(LEAVE_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('startDate', 'asc')
      .limit(5)
      .get(),
    firestore
      .collection(LEAVE_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'approved')
      .orderBy('startDate', 'asc')
      .limit(50)
      .get(),
  ]);

  const todayMillis = todayTimestamp.toMillis();

  const approvedUpcomingDocs = approvedLeavesQuery.docs.filter((doc) => {
    const start = doc.get('startDate');
    return start instanceof Timestamp && start.toMillis() >= todayMillis;
  });

  const leavesToReport = [...pendingLeavesSnapshot.docs, ...approvedUpcomingDocs]
    .map((doc) => {
      const data = doc.data();
      return {
        requestId: doc.id,
        startDate: formatTimestamp(data.startDate),
        endDate: formatTimestamp(data.endDate),
        status: (data.status as string | undefined) ?? 'unknown',
      };
    })
    .sort((a, b) => {
      const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    })
    .slice(0, 5);

  const [activePenaltiesSnap, pendingPenaltiesSnap] = await Promise.all([
    firestore
      .collection(PENALTIES_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'active')
      .orderBy('dateIncurred', 'desc')
      .limit(5)
      .get(),
    firestore
      .collection(PENALTIES_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('dateIncurred', 'desc')
      .limit(5)
      .get(),
  ]);

  const activePenalties = [...activePenaltiesSnap.docs, ...pendingPenaltiesSnap.docs]
    .map((doc) => {
      const data = doc.data();
      return {
        penaltyId: doc.id,
        status: (data.status as string | undefined) ?? 'active',
        amount: Number(data.amount) || 0,
        violationType: (data.violationType as string | undefined) ?? null,
        dateIncurred: formatTimestamp(data.dateIncurred),
      };
    })
    .sort((a, b) => {
      const aTime = a.dateIncurred ? new Date(a.dateIncurred).getTime() : 0;
      const bTime = b.dateIncurred ? new Date(b.dateIncurred).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const unreadNotifications = await firestore
    .collection(NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('isRead', '==', false)
    .get()
    .then((snapshot) => snapshot.size);

  return {
    date: dateKey,
    attendance: {
      status: (attendanceData.status as string | undefined) ?? null,
      checksCompleted: checks,
    },
    remainingChecks,
    upcomingLeave: leavesToReport,
    activePenalties,
    unreadNotifications,
    leaveBalances: profile.leaveBalances,
    isActive: profile.isActive,
  };
};

export const fetchCompanySettingsPublic = async () => {
  const settings = await getCompanySettings();
  if (!settings) {
    throw new functions.https.HttpsError('failed-precondition', 'Company settings unavailable.');
  }

  return {
    companyName: settings.companyName ?? null,
    timezone: settings.timezone ?? null,
    workplaceRadius: settings.workplace_radius ?? null,
    workplaceCenter: settings.workplace_center
      ? { latitude: settings.workplace_center.latitude, longitude: settings.workplace_center.longitude }
      : null,
    timeWindows: settings.timeWindows ?? null,
    gracePeriods: settings.gracePeriods ?? null,
    workingDays: settings.workingDays ?? null,
    holidays: settings.holidays ?? [],
    geoFencingEnabled: settings.geoFencingEnabled !== false,
    leaveAttachmentRequiredTypes: settings.leaveAttachmentRequiredTypes ?? [],
    maxLeaveAttachmentSizeMb: settings.maxLeaveAttachmentSizeMb ?? null,
    allowedLeaveAttachmentTypes: settings.allowedLeaveAttachmentTypes ?? null,
  };
};
