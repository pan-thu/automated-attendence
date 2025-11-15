import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';
import { getCompanySettings } from './settings';
import { penaltyLogger } from '../utils/logger';

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
      waivedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
      acknowledgedAt: FieldValue.serverTimestamp(),
      acknowledgementNote: note ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true };
};

interface CalculateMonthlyViolationsInput {
  month: string; // YYYY-MM
  userId?: string;
}

// Violation types based on daily status and individual check statuses
const violationStatuses = ['late', 'early_leave', 'absent', 'half_day_absent'] as const;

type ViolationStatus = (typeof violationStatuses)[number];

const isViolation = (status: string | null | undefined): status is ViolationStatus => {
  return typeof status === 'string' && (violationStatuses as readonly string[]).includes(status);
};

export const calculateMonthlyViolations = async (input: CalculateMonthlyViolationsInput) => {
  const { month, userId } = input;
  const [yearStr, monthStr] = month.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  // Bug Fix #7: Use exclusive end boundary to prevent overlapping month calculations
  // Start of month at 00:00:00 UTC
  const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  // Start of NEXT month at 00:00:00 UTC (exclusive end)
  const end = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));

  penaltyLogger.info(`Calculating penalties for ${year}-${monthIndex + 1}`, {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    userId: userId ?? 'all',
  });

  const companySettings = await getCompanySettings();
  const violationThresholds = companySettings.penaltyRules?.violationThresholds ?? {};
  const penaltyAmounts = companySettings.penaltyRules?.amounts ?? {};

  // Use < instead of <= for exclusive end boundary
  const attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', Timestamp.fromDate(start))
    .where('attendanceDate', '<', Timestamp.fromDate(end));

  const snapshots = await attendanceQuery.get();

  const violationSummary = new Map<string, { violations: Array<{ field: string; status: ViolationStatus }>; counts: Map<ViolationStatus, number> }>();

  snapshots.docs.forEach((doc) => {
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

    // Track daily status violations (absent, half_day_absent)
    const dailyStatus = data.status as string | undefined;
    if (isViolation(dailyStatus)) {
      summary.violations.push({ field: 'status', status: dailyStatus });
      summary.counts.set(dailyStatus, (summary.counts.get(dailyStatus) ?? 0) + 1);
    }

    // Track individual check violations (late, early_leave)
    const check1Status = data.check1_status as string | undefined;
    const check2Status = data.check2_status as string | undefined;
    const check3Status = data.check3_status as string | undefined;

    if (check1Status === 'late') {
      summary.violations.push({ field: 'check1_status', status: 'late' });
      summary.counts.set('late', (summary.counts.get('late') ?? 0) + 1);
    }

    if (check2Status === 'late') {
      summary.violations.push({ field: 'check2_status', status: 'late' });
      summary.counts.set('late', (summary.counts.get('late') ?? 0) + 1);
    }

    if (check3Status === 'early_leave') {
      summary.violations.push({ field: 'check3_status', status: 'early_leave' });
      summary.counts.set('early_leave', (summary.counts.get('early_leave') ?? 0) + 1);
    }
  });

  let penaltiesCreated = 0;

  for (const [targetUserId, info] of violationSummary.entries()) {
    const violationDocRef = admin.firestore().collection(VIOLATION_HISTORY_COLLECTION).doc();

    const violationRecord = {
      userId: targetUserId,
      violationDate: FieldValue.serverTimestamp(),
      violationType: 'monthly_summary',
      monthlyCount: info.violations.length,
      details: info.violations,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
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
      const penaltyRef = admin.firestore().collection(PENALTIES_COLLECTION).doc();
      const penaltyId = penaltyRef.id;

      await penaltyRef.set({
        userId: targetUserId,
        violationType: status,
        amount,
        status: 'active',
        violationCount: count,
        dateIncurred: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
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

export interface GetPenaltySummaryInput {
  userId: string;
}

export interface PenaltySummaryResult {
  activeCount: number;
  totalAmount: number;
  byStatus: {
    active: { count: number; amount: number };
    waived: { count: number; amount: number };
    resolved: { count: number; amount: number };
    disputed: { count: number; amount: number };
  };
}

export const getPenaltySummary = async (input: GetPenaltySummaryInput): Promise<PenaltySummaryResult> => {
  const { userId } = input;

  const penaltiesSnapshot = await firestore
    .collection(PENALTIES_COLLECTION)
    .where('userId', '==', userId)
    .get();

  const summary: PenaltySummaryResult = {
    activeCount: 0,
    totalAmount: 0,
    byStatus: {
      active: { count: 0, amount: 0 },
      waived: { count: 0, amount: 0 },
      resolved: { count: 0, amount: 0 },
      disputed: { count: 0, amount: 0 },
    },
  };

  penaltiesSnapshot.forEach((doc) => {
    const penalty = doc.data();
    const status = (penalty.status as string | undefined)?.toLowerCase() ?? 'active';
    const amount = (penalty.amount as number) ?? 0;

    // Map status to our summary categories
    let statusKey: keyof typeof summary.byStatus = 'active';
    if (status === 'waived') {
      statusKey = 'waived';
    } else if (status === 'paid' || status === 'resolved') {
      statusKey = 'resolved';
    } else if (status === 'disputed') {
      statusKey = 'disputed';
    }

    summary.byStatus[statusKey].count++;
    summary.byStatus[statusKey].amount += amount;

    if (status === 'active') {
      summary.activeCount++;
      summary.totalAmount += amount;
    }
  });

  return summary;
};


