import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';

type ReminderCheckSlot = 'check1' | 'check2' | 'check3';
const CHECK_STATUS_FIELDS: Record<ReminderCheckSlot, string> = {
  check1: 'check1_status',
  check2: 'check2_status',
  check3: 'check3_status',
};

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

export interface NotificationPayload {
  userId: string;
  title: string;
  message: string;
  category?: string;
  type?: string;
  relatedId?: string;
  relatedType?: string;
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
  const { userId, title, message, category = 'system', type = 'info', relatedId, relatedType, metadata } = payload;

  return firestore.collection(NOTIFICATIONS_COLLECTION).add({
    userId,
    title,
    message,
    category,
    type,
    relatedId: relatedId ?? null,
    relatedType: relatedType ?? null,
    metadata: metadata ?? null,
    isRead: false,
    sentAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
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
      relatedType: rest.relatedType ?? null,
      metadata: rest.metadata ?? null,
      isRead: false,
      sentAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
    readAt: FieldValue.serverTimestamp(),
    acknowledgment: acknowledgment ?? null,
    updatedAt: FieldValue.serverTimestamp(),
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

export const getEmployeesNeedingClockInReminder = async (
  dateKey: string,
  slot: ReminderCheckSlot
): Promise<string[]> => {
  const start = Timestamp.fromDate(new Date(`${dateKey}T00:00:00Z`));
  const end = Timestamp.fromDate(new Date(`${dateKey}T23:59:59Z`));

  const [attendanceSnap, activeEmployees] = await Promise.all([
    firestore
      .collection(ATTENDANCE_COLLECTION)
      .where('attendanceDate', '>=', start)
      .where('attendanceDate', '<=', end)
      .get(),
    getActiveEmployees(),
  ]);

  const pending = new Set<string>(activeEmployees);
  const skipStatuses = new Set(['on_leave', 'present']);
  const checkField = CHECK_STATUS_FIELDS[slot];

  attendanceSnap.forEach((doc) => {
    const userId = doc.get('userId') as string | undefined;
    if (!userId) {
      return;
    }

    if (!pending.has(userId)) {
      return;
    }

    const dayStatus = (doc.get('status') as string | undefined)?.toLowerCase();
    if (dayStatus && skipStatuses.has(dayStatus)) {
      pending.delete(userId);
      return;
    }

    const checkStatus = doc.get(checkField) as string | undefined;
    if (checkStatus && checkStatus !== 'missed') {
      pending.delete(userId);
    }
  });

  return Array.from(pending);
};

export interface MarkAllNotificationsAsReadInput {
  userId: string;
}

export interface MarkAllNotificationsAsReadResult {
  success: boolean;
  markedCount: number;
}

export const markAllNotificationsAsRead = async (
  input: MarkAllNotificationsAsReadInput
): Promise<MarkAllNotificationsAsReadResult> => {
  const { userId } = input;

  const unreadNotifications = await firestore
    .collection(NOTIFICATIONS_COLLECTION)
    .where('userId', '==', userId)
    .where('isRead', '==', false)
    .get();

  if (unreadNotifications.empty) {
    return { success: true, markedCount: 0 };
  }

  const batch = firestore.batch();

  unreadNotifications.forEach((doc) => {
    batch.update(doc.ref, {
      isRead: true,
      readAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  return { success: true, markedCount: unreadNotifications.size };
};



