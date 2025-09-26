import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  category?: string;
  type?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

export const queueNotification = async (
  payload: NotificationPayload
): Promise<FirebaseFirestore.DocumentReference> => {
  const { userId, title, message, category = 'system', type = 'info', relatedId, metadata } = payload;

  return firestore.collection(NOTIFICATIONS_COLLECTION).add({
    userId,
    title,
    message,
    category,
    type,
    relatedId: relatedId ?? null,
    metadata: metadata ?? null,
    isRead: false,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
};

export interface BulkNotificationPayload extends NotificationPayload {
  userIds: string[];
}

export const queueBulkNotifications = async (payload: BulkNotificationPayload) => {
  const { userIds, ...rest } = payload;
  const batch = firestore.batch();

  userIds.forEach((id) => {
    const ref = firestore.collection(NOTIFICATIONS_COLLECTION).doc();
    batch.set(ref, {
      ...rest,
      userId: id,
      relatedId: rest.relatedId ?? null,
      metadata: rest.metadata ?? null,
      isRead: false,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  return { count: userIds.length };
};

export const getActiveEmployees = async (): Promise<string[]> => {
  const snapshot = await firestore
    .collection(USERS_COLLECTION)
    .where('role', '==', 'employee')
    .where('isActive', '==', true)
    .get();

  return snapshot.docs.map((doc) => doc.id);
};

export const getEmployeesNeedingClockInReminder = async (dateKey: string): Promise<string[]> => {
  const start = admin.firestore.Timestamp.fromDate(new Date(`${dateKey}T00:00:00Z`));
  const end = admin.firestore.Timestamp.fromDate(new Date(`${dateKey}T23:59:59Z`));

  const attendanceSnap = await firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', start)
    .where('attendanceDate', '<=', end)
    .get();

  const completed = new Set<string>();
  attendanceSnap.forEach((doc) => {
    if (doc.get('status')) {
      completed.add(doc.get('userId') as string);
    }
  });

  const employees = await getActiveEmployees();
  return employees.filter((id) => !completed.has(id));
};

export const getEmployeesWithPendingActions = async (): Promise<string[]> => {
  const leaveSnap = await firestore
    .collection(LEAVE_COLLECTION)
    .where('status', '==', 'pending')
    .get();

  const employees = new Set<string>();
  leaveSnap.forEach((doc) => {
    const approverId = doc.get('approverId') as string | undefined;
    if (approverId) {
      employees.add(approverId);
    }
  });

  return Array.from(employees);
};



