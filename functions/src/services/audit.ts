import { admin } from '../firebase';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { firestore } from '../utils/firestore';

const AUDIT_COLLECTION = 'AUDIT_LOGS';

export interface AuditLogPayload {
  action: string;
  resource: string;
  resourceId: string;
  status: 'success' | 'failure';
  performedBy: string;
  reason?: string;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export const recordAuditLog = async (payload: AuditLogPayload): Promise<void> => {
  await firestore.collection(AUDIT_COLLECTION).add({
    ...payload,
    timestamp: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
};


