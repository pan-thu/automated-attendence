import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';

const LEAVE_COLLECTION = 'LEAVE_REQUESTS';
const USERS_COLLECTION = 'USERS';

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
    }
  });
};


