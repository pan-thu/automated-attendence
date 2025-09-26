import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';
import { queueNotification } from './notifications';
import { recordAuditLog } from './audit';

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

    if (action === 'approve') {
      const userId = leaveData.userId as string;
      const leaveType = leaveData.leaveType as string;
      const totalDays = leaveData.totalDays as number;
      const startDateTimestamp = leaveData.startDate as FirebaseFirestore.Timestamp | undefined;
      const endDateTimestamp = leaveData.endDate as FirebaseFirestore.Timestamp | undefined;
      const startUtc = startDateTimestamp ? asUtcDate(startDateTimestamp.toDate()) : asUtcDate(new Date());
      const endUtc = endDateTimestamp ? asUtcDate(endDateTimestamp.toDate()) : startUtc;

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

      leaveSummary = {
        userId,
        startDate: startUtc,
        endDate: endUtc,
        totalDays,
        leaveType,
      };
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
      message: `Your ${leaveType} leave (${totalDays} day${totalDays > 1 ? 's' : ''}) from ${startKey} to ${endKey} was rejected. ${notes ? `Reason: ${notes}` : ''}`.trim(),
      category: 'leave',
      relatedId: requestId,
      metadata: { startDate: startKey, endDate: endKey, leaveType },
    });
  }

  if (overrides.length > 0) {
    await Promise.all(
      overrides.map((override) =>
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
      )
    );
  }
};


