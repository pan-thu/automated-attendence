import { admin } from '../firebase';

export const firestore = admin.firestore();

export type TransactionFn<T> = (tx: FirebaseFirestore.Transaction) => Promise<T>;

export const runTransaction = async <T>(fn: TransactionFn<T>): Promise<T> => {
  return firestore.runTransaction(async (tx) => fn(tx));
};

export const nowTimestamp = admin.firestore.FieldValue.serverTimestamp;

export const withServerTimestamps = <T extends Record<string, unknown>>(
  data: T
): T & { updatedAt: FirebaseFirestore.FieldValue } => ({
  ...data,
  updatedAt: nowTimestamp(),
});

export const setWithTimestamps = async (
  ref: FirebaseFirestore.DocumentReference,
  data: FirebaseFirestore.WithFieldValue<FirebaseFirestore.DocumentData>,
  options?: FirebaseFirestore.SetOptions
) => {
  const payload = { ...data, updatedAt: nowTimestamp() };
  if (options) {
    return ref.set(payload, options);
  }
  return ref.set(payload, { merge: true });
};


