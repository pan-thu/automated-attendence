import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const PENALTIES_COLLECTION = 'PENALTIES';
const VIOLATION_HISTORY_COLLECTION = 'VIOLATION_HISTORY';
const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';

export interface WaivePenaltyInput {
  penaltyId: string;
  waivedReason: string;
  performedBy: string;
}

export const waivePenalty = async (input: WaivePenaltyInput) => {
  const { penaltyId, waivedReason, performedBy } = input;

  await firestore.collection(PENALTIES_COLLECTION).doc(penaltyId).set(
    {
      status: 'waived',
      waivedReason,
      waivedBy: performedBy,
      waivedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};

interface CalculateMonthlyViolationsInput {
  month: string; // YYYY-MM
  userId?: string;
}

const violationStatusFields = ['status', 'check1_status', 'check2_status', 'check3_status'];

const isViolation = (status: string | null | undefined) => {
  if (!status) return false;
  return ['late', 'early_leave', 'absent', 'half_day_absent', 'missed'].includes(status);
};

export const calculateMonthlyViolations = async (input: CalculateMonthlyViolationsInput) => {
  const { month, userId } = input;
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));

  const attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('attendanceDate', '<=', admin.firestore.Timestamp.fromDate(end));

  const snapshots = await attendanceQuery.get();

  const violationMap = new Map<string, { count: number; violations: string[] }>();

  snapshots.forEach((doc) => {
    const data = doc.data();
    const docUserId = data.userId as string;
    if (userId && docUserId !== userId) {
      return;
    }

    let userViolations = violationMap.get(docUserId);
    if (!userViolations) {
      userViolations = { count: 0, violations: [] };
      violationMap.set(docUserId, userViolations);
    }

    for (const field of violationStatusFields) {
      const value = data[field] as string | undefined;
      if (isViolation(value)) {
        userViolations.count += 1;
        userViolations.violations.push(field);
      }
    }
  });

  for (const [targetUserId, info] of violationMap.entries()) {
    await firestore.collection(VIOLATION_HISTORY_COLLECTION).add({
      userId: targetUserId,
      violationDate: admin.firestore.FieldValue.serverTimestamp(),
      violationType: 'monthly_summary',
      monthlyCount: info.count,
      details: info.violations,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { processed: violationMap.size };
};


