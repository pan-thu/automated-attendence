import * as functions from 'firebase-functions';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const LEAVE_COLLECTION = 'LEAVE_REQUESTS';

const toIsoString = (value: unknown): string | null => {
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

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  category?: string;
  type?: string;
  relatedId?: string;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsInput {
  userId: string;
  limit?: number;
  cursor?: string;
  status?: 'read' | 'unread';
}

export interface ListNotificationsResult {
  items: Array<{
    id: string;
    title: string;
    message: string;
    category: string | null;
    type: string | null;
    isRead: boolean;
    sentAt: string | null;
    readAt: string | null;
    relatedId: string | null;
    metadata: Record<string, unknown> | null;
  }>;
  nextCursor: string | null;
}

export interface MarkNotificationInput {
  userId: string;
  notificationId: string;
  acknowledgment?: string;
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

export const listNotificationsForEmployee = async (
  input: ListNotificationsInput
): Promise<ListNotificationsResult> => {
  const { userId, limit = 20, cursor, status } = input;

  if (limit <= 0 || limit > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
  }

  let query = firestore
    .collection(NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('sentAt', 'desc')
    .limit(limit);

  if (status === 'read') {
    query = query.where('isRead', '==', true);
  } else if (status === 'unread') {
    query = query.where('isRead', '==', false);
  }

  if (cursor) {
    const cursorDoc = await firestore.collection(NOTIFICATIONS_COLLECTION).doc(cursor).get();
    if (!cursorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
    }
    if ((cursorDoc.get('userId') as string | undefined) !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to this user.');
    }
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();

  const items = snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    return {
      id: doc.id,
      title: (data.title as string | undefined) ?? '',
      message: (data.message as string | undefined) ?? '',
      category: (data.category as string | undefined) ?? null,
      type: (data.type as string | undefined) ?? null,
      isRead: Boolean(data.isRead ?? false),
      sentAt: toIsoString(data.sentAt),
      readAt: toIsoString(data.readAt),
      relatedId: (data.relatedId as string | undefined) ?? null,
      metadata: (data.metadata as Record<string, unknown> | undefined) ?? null,
    };
  });
  const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;

  return { items, nextCursor };
};

export const markNotificationAsRead = async (input: MarkNotificationInput) => {
  const { userId, notificationId, acknowledgment } = input;

  const ref = firestore.collection(NOTIFICATIONS_COLLECTION).doc(notificationId);
  const doc = await ref.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError('not-found', 'Notification not found.');
  }

  if ((doc.get('userId') as string | undefined) !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot update another user\'s notification.');
  }

  await ref.update({
    isRead: true,
    readAt: admin.firestore.FieldValue.serverTimestamp(),
    acknowledgment: acknowledgment ?? null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true };
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



