import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { formatInTimeZone } from 'date-fns-tz';
import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';
import { queueNotification } from './notifications';
import { recordAuditLog } from './audit';
import { CompanySettingsInput } from './settings';
import { isWeekend, isCompanyHoliday } from '../utils/dateUtils';
import { getDateKeyInTimezoneFromISO } from '../utils/timezoneUtils';

type CheckSlot = 'check1' | 'check2' | 'check3';
type CheckStatus = 'on_time' | 'late' | 'early_leave' | 'missed';
type DailyStatus = 'in_progress' | 'present' | 'half_day_absent' | 'absent' | 'on_leave';

interface TimeWindow {
  label: string;
  start: string;
  end: string;
}

interface ClockInPayload {
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  isMocked?: boolean;
}

interface ClockInServiceInput {
  userId: string;
  payload: ClockInPayload;
}

interface ClockInResult {
  success: boolean;
  message: string;
  slot?: CheckSlot;
  checkStatus?: CheckStatus;
  dailyStatus?: DailyStatus;
}

const ATTENDANCE_COLLECTION = 'ATTENDANCE_RECORDS';
const CLOCK_ORDER: CheckSlot[] = ['check1', 'check2', 'check3'];

export const calculateDistanceMeters = (
  origin: { latitude: number; longitude: number },
  target: { latitude: number; longitude: number }
): number => {
  const toRad = (value: number) => (Math.PI / 180) * value;
  const R = 6371000;
  const dLat = toRad(target.latitude - origin.latitude);
  const dLng = toRad(target.longitude - origin.longitude);
  const lat1 = toRad(origin.latitude);
  const lat2 = toRad(target.latitude);

  const haversine =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return R * c;
};

const parseTimeToMinutes = (time: string): number => {
  const [hour, minute] = time.split(':').map((value) => Number(value));
  return hour * 60 + minute;
};

const getMinutesInTimezone = (iso: string, timezone?: string): number => {
  if (!timezone) {
    const date = new Date(iso);
    return date.getUTCHours() * 60 + date.getUTCMinutes();
  }

  const timeString = formatInTimeZone(iso, timezone, 'HH:mm');
  const [hours, minutes] = timeString.split(':').map((value) => Number(value));
  return hours * 60 + minutes;
};

interface CheckOutcome {
  slot: CheckSlot;
  status: CheckStatus;
  lateByMinutes?: number;
}

export const determineCheckOutcome = (
  iso: string,
  slot: CheckSlot,
  window: TimeWindow,
  graceMinutes: number,
  timezone?: string
): CheckOutcome | null => {
  const actual = getMinutesInTimezone(iso, timezone);
  const start = parseTimeToMinutes(window.start);
  const end = parseTimeToMinutes(window.end);

  // For check3 (evening check-out), we need to detect early leave
  // Early leave: checking out before the window ends (with grace period before end)
  if (slot === 'check3') {
    const earlyGraceStart = start - graceMinutes;

    // Too early (before grace period)
    if (actual < earlyGraceStart) {
      return null;
    }

    // Within early grace period (early leave violation)
    if (actual < start) {
      return { slot, status: 'early_leave', lateByMinutes: start - actual };
    }

    // On time (within normal window)
    if (actual <= end) {
      return { slot, status: 'on_time' };
    }

    // After window end (still within late grace period for check3)
    const lateGraceEnd = end + graceMinutes;
    if (actual <= lateGraceEnd) {
      return { slot, status: 'late', lateByMinutes: actual - end };
    }

    // Too late (missed window completely)
    return null;
  }

  // For check1 and check2 (morning/lunch), detect late arrival only
  if (actual < start) {
    return null;
  }

  if (actual <= end) {
    return { slot, status: 'on_time' };
  }

  const close = end + graceMinutes;
  if (actual <= close) {
    return { slot, status: 'late', lateByMinutes: actual - end };
  }

  return null;
};

/**
 * Calculates the daily status based on completed checks.
 * 
 * @param checkStatuses Map of check slots to their status
 * @param isFinalizing If true, calculates final status (Present/Absent). If false, forces 'in_progress'.
 */
export const computeDailyStatus = (
  checkStatuses: Partial<Record<CheckSlot, CheckStatus>>,
  isFinalizing: boolean = false
): DailyStatus => {
  const completed = CLOCK_ORDER.filter((slot) => {
    const status = checkStatuses[slot];
    return status && status !== 'missed';
  });

  const hasMissedChecks = CLOCK_ORDER.some((slot) => checkStatuses[slot] === 'missed');

  // If not finalizing (mid-day clock in), status remains pending/in_progress
  if (!isFinalizing) {
    return 'in_progress';
  }

  // --- EOD FINALIZATION LOGIC ---

  // If no checks completed at all
  if (completed.length === 0) {
    return 'absent';
  }

  // If all 3 checks completed
  if (completed.length === 3) {
    return 'present';
  }

  // If exactly 2 checks completed
  if (completed.length === 2) {
    return 'half_day_absent';
  }

  // If only 1 check completed, treated as absent (incomplete day)
  return 'absent';
};

const fetchCompanySettings = async () => {
  const snapshot = await firestore.collection('COMPANY_SETTINGS').doc('main').get();
  if (!snapshot.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Company settings not configured.');
  }
  return snapshot.data() as CompanySettingsInput & {
    workplace_center?: FirebaseFirestore.GeoPoint;
  };
};

const resolveSlotOutcome = (
  iso: string,
  settings: Awaited<ReturnType<typeof fetchCompanySettings>>
): CheckOutcome | null => {
  if (!settings.timeWindows) {
    return null;
  }

  const slots = CLOCK_ORDER.filter((slot) => settings.timeWindows?.[slot]);
  for (const slot of slots) {
    const window = settings.timeWindows?.[slot];
    if (!window) {
      continue;
    }

    // Get grace period for this check slot (per-check configuration)
    const grace = settings.gracePeriods?.[slot] ?? 30; // Default to 30 minutes if not specified
    const outcome = determineCheckOutcome(iso, slot, window, grace, settings.timezone);
    if (outcome) {
      return outcome;
    }
  }

  return null;
};

const getAttendanceDoc = (userId: string, dateKey: string) =>
  firestore.collection(ATTENDANCE_COLLECTION).doc(`${userId}_${dateKey}`);

export const handleClockIn = async ({ userId, payload }: ClockInServiceInput): Promise<ClockInResult> => {
  if (!payload.timestamp || !payload.location) {
    throw new functions.https.HttpsError('invalid-argument', 'timestamp and location are required.');
  }

  if (payload.isMocked) {
    throw new functions.https.HttpsError('failed-precondition', 'Clock-in rejected. Mock location detected.');
  }

  // Validate timestamp is within ±5 minutes of server time
  const now = Date.now();
  const timestampMs = new Date(payload.timestamp).getTime();
  const timeDiff = Math.abs(timestampMs - now);
  const MAX_TIME_DIFF = 5 * 60 * 1000; // 5 minutes in milliseconds

  if (timeDiff > MAX_TIME_DIFF) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Invalid timestamp. Clock-in must be done in real-time.'
    );
  }

  // Bug Fix #19: Validate against weekends and company holidays
  const clockInDate = new Date(payload.timestamp);

  if (isWeekend(clockInDate)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Clock-ins are not allowed on weekends.'
    );
  }

  if (await isCompanyHoliday(clockInDate)) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Clock-ins are not allowed on company holidays.'
    );
  }

  const settings = await fetchCompanySettings();
  if (!settings.workplace_center || typeof settings.workplace_radius !== 'number') {
    throw new functions.https.HttpsError('failed-precondition', 'Workplace geofence not configured.');
  }

  if (settings.geoFencingEnabled !== false) {
    const distance = calculateDistanceMeters(payload.location, {
      latitude: settings.workplace_center.latitude,
      longitude: settings.workplace_center.longitude,
    });

    if (distance > settings.workplace_radius) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Outside allowed geofence. Distance: ${Math.round(distance)}m.`
      );
    }
  }

  // Use company timezone to determine the attendance date
  const timezone = settings.timezone || 'Asia/Kolkata';
  const attendanceDate = getDateKeyInTimezoneFromISO(payload.timestamp, timezone);
  const attendanceDoc = getAttendanceDoc(userId, attendanceDate);
  const transactionResult = await runTransaction(async (tx) => {
    const slotOutcome = resolveSlotOutcome(payload.timestamp, settings);
    if (!slotOutcome) {
      throw new functions.https.HttpsError('failed-precondition', 'No active clock-in window.');
    }

    const snapshot = await tx.get(attendanceDoc);
    const data = snapshot.exists ? snapshot.data() ?? {} : {};

    const existingStatus = data[`${slotOutcome.slot}_status`] as CheckStatus | undefined;
    if (existingStatus && existingStatus !== 'missed') {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Clock-in already recorded for ${slotOutcome.slot}.`
      );
    }

    const updatedStatuses: Partial<Record<CheckSlot, CheckStatus>> = {
      check1: data?.check1_status as CheckStatus | undefined,
      check2: data?.check2_status as CheckStatus | undefined,
      check3: data?.check3_status as CheckStatus | undefined,
    };
    updatedStatuses[slotOutcome.slot] = slotOutcome.status;

    // PASS FALSE: Live clock-in acts as "Draft" mode. Status remains 'in_progress'.
    // It will only switch to present/absent/half_day during the EOD finalization.
    const dayStatus = computeDailyStatus(updatedStatuses, false);

    const updates: Record<string, unknown> = {
      userId,
      status: dayStatus,
      [`${slotOutcome.slot}_status`]: slotOutcome.status,
      [`${slotOutcome.slot}_timestamp`]: Timestamp.fromDate(new Date(payload.timestamp)),
      [`${slotOutcome.slot}_location`]: new admin.firestore.GeoPoint(
        payload.location.latitude,
        payload.location.longitude
      ),
      attendanceDate: Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`)),
      updatedAt: FieldValue.serverTimestamp(),
    };

    tx.set(attendanceDoc, updates, { merge: true });

    return {
      slotOutcome,
      dayStatus,
    };
  });

  const { slotOutcome, dayStatus } = transactionResult;

  await recordAuditLog({
    action: 'clock_in',
    resource: 'ATTENDANCE_RECORDS',
    resourceId: `${userId}_${attendanceDate}`,
    status: 'success',
    performedBy: userId,
    metadata: {
      slot: slotOutcome.slot,
      status: slotOutcome.status,
      lateByMinutes: slotOutcome.lateByMinutes ?? null,
    },
  });

  const message = slotOutcome.status === 'late'
    ? `Clock-in recorded (${slotOutcome.slot}). Late by ${slotOutcome.lateByMinutes} minutes.`
    : `Clock-in recorded (${slotOutcome.slot}).`;

  await queueNotification({
    userId,
    title: 'Clock-In Recorded',
    message,
    type: 'info',
    category: 'attendance',
    relatedId: `${userId}_${attendanceDate}`,
  });

  return {
    success: true,
    message,
    slot: slotOutcome.slot,
    checkStatus: slotOutcome.status,
    dailyStatus: dayStatus,
  };
};

/**
 * Finalize daily attendance for all employees at end of day.
 * - Creates absent records for employees who didn't clock in at all
 * - Marks missing checks as 'missed' for partial attendance records
 * - Updates daily status based on completed checks (switching from in_progress to final status)
 */
export interface FinalizeAttendanceInput {
  date: string; // YYYY-MM-DD
}

export interface FinalizeAttendanceResult {
  processed: number;
  absentRecordsCreated: number;
  recordsUpdated: number;
}

export const finalizeAttendance = async (input: FinalizeAttendanceInput): Promise<FinalizeAttendanceResult> => {
  const { date } = input;

  // Parse date
  const [year, month, day] = date.split('-').map(Number);
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  // Get all active employees
  const usersSnapshot = await firestore
    .collection('USERS')
    .where('isActive', '==', true)
    .where('role', '==', 'employee')
    .get();

  const activeEmployeeIds = usersSnapshot.docs.map(doc => doc.id);

  // Get existing attendance records for this date
  const attendanceSnapshot = await firestore
    .collection(ATTENDANCE_COLLECTION)
    .where('attendanceDate', '>=', Timestamp.fromDate(startOfDay))
    .where('attendanceDate', '<=', Timestamp.fromDate(endOfDay))
    .get();

  // Build a map of userId -> attendance record
  const attendanceByUser = new Map<string, FirebaseFirestore.DocumentSnapshot>();
  attendanceSnapshot.docs.forEach(doc => {
    const userId = doc.get('userId') as string;
    if (userId) {
      attendanceByUser.set(userId, doc);
    }
  });

  let absentRecordsCreated = 0;
  let recordsUpdated = 0;

  const batch = firestore.batch();

  for (const employeeId of activeEmployeeIds) {
    const existingRecord = attendanceByUser.get(employeeId);

    if (!existingRecord) {
      // No attendance record - create absent record with all checks missed
      const docId = `${employeeId}_${date}`;
      const docRef = firestore.collection(ATTENDANCE_COLLECTION).doc(docId);

      batch.set(docRef, {
        userId: employeeId,
        status: 'absent',
        check1_status: 'missed',
        check2_status: 'missed',
        check3_status: 'missed',
        attendanceDate: Timestamp.fromDate(startOfDay),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isAutoGenerated: true,
      });

      absentRecordsCreated++;
    } else {
      // Has record - finalize status and mark missed checks
      const data = existingRecord.data() ?? {};
      
      // Skip if user is on approved leave
      if (data.status === 'on_leave') continue;

      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      // Check each slot and mark as missed if not set
      for (const slot of CLOCK_ORDER) {
        const statusField = `${slot}_status`;
        const currentStatus = data[statusField] as CheckStatus | undefined;

        if (!currentStatus) {
          updates[statusField] = 'missed';
          needsUpdate = true;
        }
      }

      // Recalculate status with isFinalizing = TRUE to graduate from 'in_progress'
      const checkStatuses: Partial<Record<CheckSlot, CheckStatus>> = {
        check1: (updates.check1_status as CheckStatus) ?? (data.check1_status as CheckStatus),
        check2: (updates.check2_status as CheckStatus) ?? (data.check2_status as CheckStatus),
        check3: (updates.check3_status as CheckStatus) ?? (data.check3_status as CheckStatus),
      };

      const newDailyStatus = computeDailyStatus(checkStatuses, true);

      // Update if status changed (e.g., in_progress -> present) OR if we marked checks as missed
      if (newDailyStatus !== data.status || needsUpdate) {
        updates.status = newDailyStatus;
        updates.updatedAt = FieldValue.serverTimestamp();
        batch.update(existingRecord.ref, updates);
        recordsUpdated++;
      }
    }
  }

  await batch.commit();

  return {
    processed: activeEmployeeIds.length,
    absentRecordsCreated,
    recordsUpdated,
  };
};