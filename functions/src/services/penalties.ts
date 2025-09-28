import { admin } from '../firebase';
import { firestore } from '../utils/firestore';
import { getCompanySettings } from './settings';

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

const violationStatuses = ['late', 'early_leave', 'absent', 'half_day_absent', 'missed'] as const;

type ViolationStatus = (typeof violationStatuses)[number];

const isViolation = (status: string | null | undefined): status is ViolationStatus => {
  return typeof status === 'string' && (violationStatuses as readonly string[]).includes(status);
};

export const calculateMonthlyViolations = async (input: CalculateMonthlyViolationsInput) => {
  const { month, userId } = input;
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));

  const companySettings = await getCompanySettings();
  const violationThreshold = companySettings.penaltyRules?.violationThreshold ?? null;
  const penaltyAmounts = companySettings.penaltyRules?.amounts ?? {};

  const attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('attendanceDate', '<=', admin.firestore.Timestamp.fromDate(end));

  const snapshots = await attendanceQuery.get();

  const violationMap = new Map<string, { count: number; violations: Array<{ field: string; status: ViolationStatus }> }>();

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
        userViolations.violations.push({ field, status: value });
      }
    }
  });

  let penaltiesCreated = 0;

  for (const [targetUserId, info] of violationMap.entries()) {
    const violationDocRef = firestore.collection(VIOLATION_HISTORY_COLLECTION).doc();

    const violationRecord = {
      userId: targetUserId,
      violationDate: admin.firestore.FieldValue.serverTimestamp(),
      violationType: 'monthly_summary',
      monthlyCount: info.count,
      details: info.violations,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Record<string, unknown>;

    let penaltyId: string | null = null;

    if (violationThreshold !== null && info.count >= violationThreshold) {
      const violationType = inferMonthlyViolationType(info.violations.map((entry) => entry.status));
      const amount = violationType ? penaltyAmounts[violationType] ?? 0 : 0;

      const penaltyRef = firestore.collection(PENALTIES_COLLECTION).doc();
      penaltyId = penaltyRef.id;
      penaltiesCreated += 1;

      await penaltyRef.set({
        userId: targetUserId,
        violationType: violationType ?? 'monthly_summary',
        amount,
        status: 'active',
        violationCount: info.count,
        dateIncurred: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      violationRecord.penaltyTriggered = true;
      violationRecord.penaltyId = penaltyId;
      violationRecord.penaltyAmount = amount;
    }

    await violationDocRef.set(violationRecord);
  }

  return { processed: violationMap.size, penaltiesCreated };
};


const inferMonthlyViolationType = (statuses: ViolationStatus[]): string | null => {
  if (statuses.some((status) => status === 'absent')) {
    return 'absent';
  }

  if (statuses.some((status) => status === 'half_day_absent')) {
    return 'half_day_absent';
  }

  if (statuses.some((status) => status === 'late')) {
    return 'late';
  }

  if (statuses.some((status) => status === 'early_leave')) {
    return 'early_leave';
  }

  if (statuses.some((status) => status === 'missed')) {
    return 'missed';
  }

  return null;
};


