import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const NOTIFICATIONS_COLLECTION = 'NOTIFICATIONS';

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



