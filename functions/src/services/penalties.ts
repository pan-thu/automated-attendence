import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';
import { getCompanySettings } from './settings';
import { penaltyLogger } from '../utils/logger';
import { queueNotification } from './notifications';

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

  // Get holidays for this month to exclude from penalty calculation
  const holidays = (companySettings.holidays as string[] | undefined) ?? [];
  const holidayDates = new Set(
    holidays
      .map((h) => h.match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
      .filter((date): date is string => date !== undefined)
  );

  // Use < instead of <= for exclusive end boundary
  const attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', Timestamp.fromDate(start))
    .where('attendanceDate', '<', Timestamp.fromDate(end));

  const snapshots = await attendanceQuery.get();

  const violationSummary = new Map<string, { violations: Array<{ field: string; status: ViolationStatus }>; counts: Map<ViolationStatus, number> }>();

  // Import timezone utility for date formatting
  const { getEffectiveTimezone } = await import('../utils/timezoneUtils');
  const timezone = await getEffectiveTimezone();

  snapshots.docs.forEach((doc) => {
    const data = doc.data();
    const docUserId = data.userId as string;
    if (userId && docUserId !== userId) {
      return;
    }

    // Skip holidays - don't count violations on holidays
    const attendanceDate = data.attendanceDate as Timestamp | undefined;
    if (attendanceDate) {
      const dateObj = attendanceDate.toDate();
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const dateKey = formatter.format(dateObj);
      if (holidayDates.has(dateKey)) {
        return; // Skip this record - it's a holiday
      }
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

/**
 * Get human-readable label for violation types
 */
const getViolationTypeLabel = (violationType: string): string => {
  const labels: Record<string, string> = {
    late: 'Late Check-in',
    early_leave: 'Early Check-out',
    absent: 'Absence',
    half_day_absent: 'Half-day Absence',
  };
  return labels[violationType] || violationType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

/**
 * Calculate and create penalties for a single day's violations.
 * This runs daily after all check windows close to assess each employee's attendance.
 */
export interface CalculateDailyViolationsInput {
  date: string; // YYYY-MM-DD
  userId?: string; // Optional: process single user, otherwise all users
}

export const calculateDailyViolations = async (input: CalculateDailyViolationsInput) => {
  const { date, userId } = input;

  // Parse date
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  penaltyLogger.info(`Calculating daily penalties for ${date}`, {
    userId: userId ?? 'all',
  });

  const companySettings = await getCompanySettings();
  const penaltyAmounts = companySettings.penaltyRules?.amounts ?? {};

  // Check if this date is a holiday - skip if so
  const holidays = (companySettings.holidays as string[] | undefined) ?? [];
  const holidayDates = new Set(
    holidays
      .map((h) => h.match(/^(\d{4}-\d{2}-\d{2})/)?.[1])
      .filter((d): d is string => d !== undefined)
  );

  if (holidayDates.has(date)) {
    penaltyLogger.info(`Skipping ${date} - it's a holiday`);
    return { processed: 0, penaltiesCreated: 0, skippedHoliday: true };
  }

  // Query attendance records for this specific date
  let attendanceQuery = firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', Timestamp.fromDate(startOfDay))
    .where('attendanceDate', '<=', Timestamp.fromDate(endOfDay));

  const snapshots = await attendanceQuery.get();

  let penaltiesCreated = 0;
  let processedCount = 0;

  for (const doc of snapshots.docs) {
    const data = doc.data();
    const docUserId = data.userId as string;

    // Skip if filtering by userId and doesn't match
    if (userId && docUserId !== userId) {
      continue;
    }

    processedCount++;

    // Check for violations in this attendance record
    const violations: Array<{ type: string; field: string }> = [];

    // Daily status violations (absent, half_day_absent)
    const dailyStatus = data.status as string | undefined;
    if (dailyStatus === 'absent' || dailyStatus === 'half_day_absent') {
      violations.push({ type: dailyStatus, field: 'status' });
    }

    // Individual check violations (late, early_leave)
    const check1Status = data.check1_status as string | undefined;
    const check2Status = data.check2_status as string | undefined;
    const check3Status = data.check3_status as string | undefined;

    if (check1Status === 'late') {
      violations.push({ type: 'late', field: 'check1_status' });
    }
    if (check2Status === 'late') {
      violations.push({ type: 'late', field: 'check2_status' });
    }
    if (check3Status === 'early_leave') {
      violations.push({ type: 'early_leave', field: 'check3_status' });
    }

    // Create a penalty for each violation
    for (const violation of violations) {
      // Check if penalty already exists for this user, date, and violation type
      const existingPenalty = await firestore
        .collection(PENALTIES_COLLECTION)
        .where('userId', '==', docUserId)
        .where('dateKey', '==', date)
        .where('violationType', '==', violation.type)
        .where('violationField', '==', violation.field)
        .limit(1)
        .get();

      if (!existingPenalty.empty) {
        // Penalty already exists for this violation, skip
        continue;
      }

      // Count existing violations of this type for the current month
      const [violationYear, violationMonth] = date.split('-').map(Number);
      const monthStart = new Date(Date.UTC(violationYear, violationMonth - 1, 1, 0, 0, 0, 0));
      const monthEnd = new Date(Date.UTC(violationYear, violationMonth, 0, 23, 59, 59, 999));

      const existingViolationsSnapshot = await firestore
        .collection(PENALTIES_COLLECTION)
        .where('userId', '==', docUserId)
        .where('violationType', '==', violation.type)
        .where('dateIncurred', '>=', Timestamp.fromDate(monthStart))
        .where('dateIncurred', '<=', Timestamp.fromDate(monthEnd))
        .get();

      const existingCount = existingViolationsSnapshot.size;
      const threshold = companySettings.penaltyRules?.violationThresholds?.[violation.type] ?? 0;
      const baseAmount = penaltyAmounts[violation.type] ?? 0;

      // Only apply fine if threshold is passed (count >= threshold means this is the Nth+ violation)
      // threshold of 0 means fine from first violation
      // threshold of 3 means fine starts from 4th violation (after 3 warnings)
      const thresholdPassed = existingCount >= threshold;
      const amount = thresholdPassed ? baseAmount : 0;

      const penaltyRef = admin.firestore().collection(PENALTIES_COLLECTION).doc();

      await penaltyRef.set({
        userId: docUserId,
        violationType: violation.type,
        violationField: violation.field,
        amount,
        status: 'active',
        isWarning: !thresholdPassed,
        violationCount: existingCount + 1, // This is the Nth violation
        threshold,
        dateKey: date,
        dateIncurred: Timestamp.fromDate(startOfDay),
        attendanceRecordId: doc.id,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      penaltiesCreated++;

      // Send notification to user about the violation/penalty
      const violationTypeLabel = getViolationTypeLabel(violation.type);
      const notificationTitle = thresholdPassed ? 'Penalty Issued' : 'Attendance Violation Warning';
      const notificationMessage = thresholdPassed
        ? `A penalty of ₹${amount} has been issued for ${violationTypeLabel} on ${date}. This is violation #${existingCount + 1} this month.`
        : `Warning: ${violationTypeLabel} recorded on ${date}. This is violation #${existingCount + 1} of ${threshold} allowed this month.`;

      await queueNotification({
        userId: docUserId,
        title: notificationTitle,
        message: notificationMessage,
        category: 'penalty',
        type: thresholdPassed ? 'penalty' : 'warning',
        relatedId: penaltyRef.id,
        relatedType: 'penalty',
        metadata: {
          violationType: violation.type,
          violationField: violation.field,
          amount,
          isWarning: !thresholdPassed,
          violationCount: existingCount + 1,
          threshold,
          date,
        },
      });

      penaltyLogger.info(`Created penalty for ${docUserId}`, {
        violationType: violation.type,
        date,
        amount,
        isWarning: !thresholdPassed,
        violationCount: existingCount + 1,
      });
    }
  }

  penaltyLogger.info(`Daily penalties completed for ${date}`, {
    processed: processedCount,
    penaltiesCreated,
  });

  return { processed: processedCount, penaltiesCreated };
};

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


