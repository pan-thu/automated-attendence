import * as functions from 'firebase-functions';
import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';
import { queueNotification } from './notifications';
import { recordAuditLog } from './audit';
import { getCompanySettings } from './settings';
import {
  assertAttachmentOwnedByUser,
  assertAttachmentReady,
  attachAttachmentToLeave,
  getAttachmentById,
} from './leaveAttachments';

const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const USERS_COLLECTION = 'USERS';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';

const formatDateKey = (date: Date): string => {
  return date.toISOString().slice(0, 10);
};

const asUtcDate = (source: Date): Date => {
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
};

export interface LeaveApprovalInput {
  requestId: string;
  action: 'approve' | 'reject';
  reviewerId: string;
  notes?: string;
}

export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface SubmitLeaveRequestInput {
  userId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachmentId?: string | null;
}

export interface CancelLeaveRequestInput {
  userId: string;
  requestId: string;
}

export interface ListEmployeeLeavesInput {
  userId: string;
  status?: LeaveStatus;
  limit?: number;
  cursor?: string;
}

export interface ListEmployeeLeavesResult {
  items: LeaveRequestItem[];
  nextCursor: string | null;
}

export interface LeaveRequestItem {
  id: string;
  leaveType: string;
  status: LeaveStatus;
  startDate: string | null;
  endDate: string | null;
  reason: string | null;
  reviewerNotes: string | null;
  attachmentId: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
}

const leaveTypeFieldMap: Record<string, string> = {
  full: 'fullLeaveBalance',
  half: 'halfLeaveBalance',
  medical: 'medicalLeaveBalance',
  maternity: 'maternityLeaveBalance',
};

export const handleLeaveApproval = async (input: LeaveApprovalInput) => {
  const { requestId, action, reviewerId, notes } = input;

  const overrides: Array<{
    userId: string;
    date: string;
    previousValues: FirebaseFirestore.DocumentData | null;
  }> = [];
  let leaveSummary: {
    userId: string;
    startDate: Date;
    endDate: Date;
    totalDays: number;
    leaveType: string;
  } | null = null;

  await runTransaction(async (tx) => {
    const leaveRef = firestore.collection(LEAVE_COLLECTION).doc(requestId);
    const leaveSnap = await tx.get(leaveRef);

    if (!leaveSnap.exists) {
      throw new Error('Leave request not found.');
    }

    const leaveData = leaveSnap.data()!;

    if (leaveData.status !== 'pending') {
      throw new Error('Leave request no longer pending.');
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const updates: Record<string, unknown> = {
      status: action === 'approve' ? 'approved' : 'rejected',
      reviewedAt: now,
      reviewedBy: reviewerId,
      updatedAt: now,
    };

    if (action === 'approve') {
      updates.approvedAt = now;
      updates.approvedBy = reviewerId;
    }

    if (notes) {
      updates.reviewerNotes = notes;
    }

    tx.update(leaveRef, updates);

    const userId = leaveData.userId as string;
    const leaveType = leaveData.leaveType as string;
    const totalDays = leaveData.totalDays as number;
    const startDateTimestamp = leaveData.startDate as FirebaseFirestore.Timestamp | undefined;
    const endDateTimestamp = leaveData.endDate as FirebaseFirestore.Timestamp | undefined;
    const startUtc = startDateTimestamp ? asUtcDate(startDateTimestamp.toDate()) : asUtcDate(new Date());
    const endUtc = endDateTimestamp ? asUtcDate(endDateTimestamp.toDate()) : startUtc;

    leaveSummary = {
      userId,
      startDate: startUtc,
      endDate: endUtc,
      totalDays,
      leaveType,
    };

    if (action === 'approve') {
      const balanceField = leaveTypeFieldMap[leaveType];
      if (balanceField) {
        const userRef = firestore.collection(USERS_COLLECTION).doc(userId);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists) {
          throw new Error('User not found for leave request.');
        }

        const currentBalance = (userSnap.get(balanceField) as number) ?? 0;
        const updatedBalance = Math.max(currentBalance - totalDays, 0);

        tx.update(userRef, {
          [balanceField]: updatedBalance,
          updatedAt: now,
        });
      }

      let cursor = new Date(startUtc.getTime());
      const attendanceCollection = firestore.collection(ATTENDANCE_COLLECTION);

      while (cursor.getTime() <= endUtc.getTime()) {
        const dateKey = formatDateKey(cursor);
        const docId = `${userId}_${dateKey}`;
        const attendanceRef = attendanceCollection.doc(docId);
        const attendanceSnap = await tx.get(attendanceRef);

        const previousValues = attendanceSnap.exists ? attendanceSnap.data() ?? null : null;
        const previousStatus = previousValues ? (previousValues.status as string | undefined) : undefined;

        tx.set(
          attendanceRef,
          {
            userId,
            status: 'on_leave',
            leaveRequestId: requestId,
            leaveBackfill: true,
            updatedAt: now,
            updatedBy: reviewerId,
            attendanceDate: admin.firestore.Timestamp.fromDate(cursor),
            notes: notes ?? previousValues?.notes ?? null,
          },
          { merge: true }
        );

        if (previousStatus && previousStatus !== 'on_leave') {
          overrides.push({ userId, date: dateKey, previousValues });
        }

        cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
      }

    }
  });

  if (action === 'approve' && leaveSummary) {
    const { userId, startDate, endDate, totalDays, leaveType } = leaveSummary;
    const startKey = formatDateKey(startDate);
    const endKey = formatDateKey(endDate);

    await queueNotification({
      userId,
      title: 'Leave Approved',
      message: `Your ${leaveType} leave (${totalDays} day${totalDays > 1 ? 's' : ''}) from ${startKey} to ${endKey} has been approved.`,
      category: 'leave',
      relatedId: requestId,
      metadata: { startDate: startKey, endDate: endKey, leaveType },
    });
  }

  if (action === 'reject' && leaveSummary) {
    const { userId, startDate, endDate, totalDays, leaveType } = leaveSummary;
    const startKey = formatDateKey(startDate);
    const endKey = formatDateKey(endDate);

    await queueNotification({
      userId,
      title: 'Leave Rejected',
      message: `Your ${leaveType} leave (${totalDays} day${totalDays > 1 ? 's' : ''}) from ${startKey} to ${endKey} was rejected.${notes ? ` Reason: ${notes}` : ''}`,
      category: 'leave',
      relatedId: requestId,
      metadata: { startDate: startKey, endDate: endKey, leaveType },
    });
  }

  if (overrides.length > 0) {
    const auditPromises = overrides.map((override) =>
      recordAuditLog({
        action: 'leave_backfill_attendance',
        resource: 'ATTENDANCE_RECORDS',
        resourceId: `${override.userId}_${override.date}`,
        status: 'success',
        performedBy: input.reviewerId,
        oldValues: override.previousValues,
        newValues: {
          status: 'on_leave',
          leaveRequestId: input.requestId,
        },
      })
    );

    await Promise.all(auditPromises);
  }
};

const parseTimestamp = (value: unknown): string | null => {
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

const parseDateOnly = (value: string, label: string): Date => {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${label} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is not a valid date.`);
  }

  return parsed;
};

const ensureFutureOrPresentDate = (date: Date, label: string) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date < today) {
    throw new functions.https.HttpsError('failed-precondition', `${label} cannot be in the past.`);
  }
};

const ensureDateRange = (start: Date, end: Date) => {
  if (start > end) {
    throw new functions.https.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
  }
};

const sanitizeLeaveReason = (reason: string): string => {
  const trimmed = reason.trim();
  if (trimmed.length < 5 || trimmed.length > 500) {
    throw new functions.https.HttpsError('invalid-argument', 'reason must be between 5 and 500 characters.');
  }
  return trimmed;
};

export const submitLeaveRequest = async (input: SubmitLeaveRequestInput) => {
  const { userId, leaveType, startDate, endDate, reason, attachmentId } = input;

  if (!leaveType || typeof leaveType !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'leaveType is required.');
  }

  const start = parseDateOnly(startDate, 'startDate');
  const end = parseDateOnly(endDate, 'endDate');

  ensureDateRange(start, end);
  ensureFutureOrPresentDate(start, 'startDate');

  const sanitizedReason = sanitizeLeaveReason(reason);

  const companySettings = await getCompanySettings();
  const requiredAttachmentTypes = companySettings.leaveAttachmentRequiredTypes ?? [];
  const requiresAttachment = requiredAttachmentTypes.includes(leaveType.toLowerCase());

  let attachmentMetadata: Awaited<ReturnType<typeof getAttachmentById>> | null = null;

  if (attachmentId) {
    attachmentMetadata = assertAttachmentOwnedByUser(await getAttachmentById(attachmentId), userId);
    assertAttachmentReady(attachmentMetadata);
  }

  if (requiresAttachment && !attachmentMetadata) {
    throw new functions.https.HttpsError('failed-precondition', 'Attachment is required for this leave type.');
  }

  const leaveRef = firestore.collection(LEAVE_COLLECTION).doc();
  const submittedAt = admin.firestore.FieldValue.serverTimestamp();

  await leaveRef.set({
    userId,
    leaveType,
    status: 'pending',
    reason: sanitizedReason,
    startDate: admin.firestore.Timestamp.fromDate(start),
    endDate: admin.firestore.Timestamp.fromDate(end),
    attachmentId: attachmentMetadata ? attachmentMetadata.id : null,
    createdAt: submittedAt,
    updatedAt: submittedAt,
    submittedAt,
  });

  if (attachmentMetadata) {
    await attachAttachmentToLeave({
      attachment: attachmentMetadata,
      leaveRequestId: leaveRef.id,
    });
  }

  await queueNotification({
    userId,
    title: 'Leave Request Submitted',
    message: `Your ${leaveType} leave from ${startDate} to ${endDate} was submitted for review.`,
    category: 'leave',
    relatedId: leaveRef.id,
  });

  return { requestId: leaveRef.id };
};

export const cancelLeaveRequest = async (input: CancelLeaveRequestInput) => {
  const { userId, requestId } = input;

  const ref = firestore.collection(LEAVE_COLLECTION).doc(requestId);

  await runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) {
      throw new functions.https.HttpsError('not-found', 'Leave request not found.');
    }

    const data = snapshot.data() ?? {};

    if (data.userId !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cannot cancel another user\'s leave request.');
    }

    if (data.status !== 'pending') {
      throw new functions.https.HttpsError('failed-precondition', 'Only pending requests can be cancelled.');
    }

    tx.update(ref, {
      status: 'cancelled',
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await queueNotification({
    userId,
    title: 'Leave Request Cancelled',
    message: 'Your leave request has been cancelled.',
    category: 'leave',
    relatedId: requestId,
  });

  return { success: true };
};

export const listEmployeeLeaves = async (input: ListEmployeeLeavesInput): Promise<ListEmployeeLeavesResult> => {
  const { userId, status, limit = 20, cursor } = input;

  if (limit <= 0 || limit > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
  }

  let query = firestore
    .collection(LEAVE_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('startDate', 'desc')
    .limit(limit);

  if (status) {
    query = query.where('status', '==', status);
  }

  if (cursor) {
    const cursorDoc = await firestore.collection(LEAVE_COLLECTION).doc(cursor).get();
    if (!cursorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
    }
    if ((cursorDoc.get('userId') as string | undefined) !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to this user.');
    }
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();

  const items: LeaveRequestItem[] = snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const startTimestamp = data.startDate as FirebaseFirestore.Timestamp | undefined;
    const endTimestamp = data.endDate as FirebaseFirestore.Timestamp | undefined;

    return {
      id: doc.id,
      leaveType: (data.leaveType as string | undefined) ?? 'unknown',
      status: (data.status as LeaveStatus | undefined) ?? 'pending',
      reason: (data.reason as string | undefined) ?? null,
      reviewerNotes: (data.reviewerNotes as string | undefined) ?? null,
      attachmentId: (data.attachmentId as string | undefined) ?? null,
      startDate: startTimestamp ? startTimestamp.toDate().toISOString() : null,
      endDate: endTimestamp ? endTimestamp.toDate().toISOString() : null,
      submittedAt: parseTimestamp(data.submittedAt),
      reviewedAt: parseTimestamp(data.reviewedAt),
    };
  });

  const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;

  return {
    items,
    nextCursor,
  };
};
