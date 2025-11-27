import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';

const DEVICE_TOKENS_COLLECTION = 'DEVICE_TOKENS';

export interface RegisterDeviceTokenInput {
  userId: string;
  deviceId: string;
  token: string;
  platform: string;
  metadata?: Record<string, unknown>;
}

export const registerDeviceToken = async (input: RegisterDeviceTokenInput): Promise<void> => {
  const { userId, deviceId, token, platform, metadata } = input;

  if (!token || token.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid device token.');
  }

  await runTransaction(async (tx) => {
    const existingTokenSnap = await tx.get(
      firestore
        .collection(DEVICE_TOKENS_COLLECTION)
        .where('token', '==', token)
        .limit(1)
    );

    existingTokenSnap.forEach((doc) => {
      tx.delete(doc.ref);
    });

    const ref = firestore.collection(DEVICE_TOKENS_COLLECTION).doc(`${userId}_${deviceId}`);

    tx.set(
      ref,
      {
        userId,
        deviceId,
        token,
        platform,
        metadata: metadata ?? null,
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        lastRegisteredAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });
};

