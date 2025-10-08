import * as functions from 'firebase-functions';
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

export interface ListEmployeePenaltiesInput {
  userId: string;
  limit?: number;
  cursor?: string;
  status?: string;
}

export interface ListEmployeePenaltiesResult {
  items: Array<{ id: string; data: FirebaseFirestore.DocumentData }>;
  nextCursor: string | null;
}

export interface AcknowledgePenaltyInput {
  userId: string;
  penaltyId: string;
  note?: string;
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

export const listEmployeePenalties = async (
  input: ListEmployeePenaltiesInput
): Promise<ListEmployeePenaltiesResult> => {
  const { userId, limit = 20, cursor, status } = input;

  if (limit <= 0 || limit > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'limit must be between 1 and 100.');
  }

  let query = firestore
    .collection(PENALTIES_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('dateIncurred', 'desc')
    .limit(limit);

  if (status) {
    query = query.where('status', '==', status);
  }

  if (cursor) {
    const cursorDoc = await firestore.collection(PENALTIES_COLLECTION).doc(cursor).get();
    if (!cursorDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Cursor document not found.');
    }
    if ((cursorDoc.get('userId') as string | undefined) !== userId) {
      throw new functions.https.HttpsError('permission-denied', 'Cursor does not belong to this user.');
    }
    query = query.startAfter(cursorDoc);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} }));
  const nextCursor = snapshot.size === limit ? snapshot.docs[snapshot.docs.length - 1]?.id ?? null : null;

  return { items, nextCursor };
};

export const acknowledgePenalty = async (input: AcknowledgePenaltyInput) => {
  const { userId, penaltyId, note } = input;

  const penaltyRef = firestore.collection(PENALTIES_COLLECTION).doc(penaltyId);
  const snapshot = await penaltyRef.get();

  if (!snapshot.exists) {
    throw new functions.https.HttpsError('not-found', 'Penalty not found.');
  }

  if ((snapshot.get('userId') as string | undefined) !== userId) {
    throw new functions.https.HttpsError('permission-denied', 'Cannot acknowledge another user\'s penalty.');
  }

  await penaltyRef.set(
    {
      acknowledged: true,
      acknowledgedAt: admin.firestore.FieldValue.serverTimestamp(),
      acknowledgementNote: note ?? null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
};

interface CalculateMonthlyViolationsInput {
  month: string; // YYYY-MM
  userId?: string;
}

const violationStatusFields = ['status', 'check1_status', 'check2_status', 'check3_status'];

const violationStatuses = ['late', 'early_leave', 'absent', 'missed'] as const;

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
  const violationThresholds = companySettings.penaltyRules?.violationThresholds ?? {};
  const penaltyAmounts = companySettings.penaltyRules?.amounts ?? {};

  const attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', admin.firestore.Timestamp.fromDate(start))
    .where('attendanceDate', '<=', admin.firestore.Timestamp.fromDate(end));

  const snapshots = await attendanceQuery.get();

  const violationSummary = new Map<string, { violations: Array<{ field: string; status: ViolationStatus }>; counts: Map<ViolationStatus, number> }>();

  snapshots.forEach((doc) => {
    const data = doc.data();
    const docUserId = data.userId as string;
    if (userId && docUserId !== userId) {
      return;
    }

    let summary = violationSummary.get(docUserId);
    if (!summary) {
      summary = { violations: [], counts: new Map() };
      violationSummary.set(docUserId, summary);
    }

    for (const field of violationStatusFields) {
      const value = data[field] as string | undefined;
      if (isViolation(value)) {
        summary.violations.push({ field, status: value });
        summary.counts.set(value, (summary.counts.get(value) ?? 0) + 1);
      }
    }
  });

  let penaltiesCreated = 0;

  for (const [targetUserId, info] of violationSummary.entries()) {
    const violationDocRef = firestore.collection(VIOLATION_HISTORY_COLLECTION).doc();

    const violationRecord = {
      userId: targetUserId,
      violationDate: admin.firestore.FieldValue.serverTimestamp(),
      violationType: 'monthly_summary',
      monthlyCount: info.violations.length,
      details: info.violations,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    } as Record<string, unknown>;

    if (info.violations.length === 0) {
      await violationDocRef.set(violationRecord);
      continue;
    }

    const triggeredPenalties: Array<{ violationType: string; penaltyId: string; amount: number; count: number }> = [];

    for (const [status, count] of info.counts.entries()) {
      const threshold = violationThresholds[status];
      if (threshold === undefined || count < threshold) {
        continue;
      }

      const amount = penaltyAmounts[status] ?? 0;
      const penaltyRef = firestore.collection(PENALTIES_COLLECTION).doc();
      const penaltyId = penaltyRef.id;

      await penaltyRef.set({
        userId: targetUserId,
        violationType: status,
        amount,
        status: 'active',
        violationCount: count,
        dateIncurred: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      penaltiesCreated += 1;
      triggeredPenalties.push({ violationType: status, penaltyId, amount, count });
    }

    if (triggeredPenalties.length > 0) {
      violationRecord.penalties = triggeredPenalties;
    }

    await violationDocRef.set(violationRecord);
  }

  return { processed: violationSummary.size, penaltiesCreated };
};


const inferMonthlyViolationCounts = (statuses: ViolationStatus[]) => {
  const counts = new Map<string, number>();
  statuses.forEach((status) => {
    counts.set(status, (counts.get(status) ?? 0) + 1);
  });
  return counts;
};


