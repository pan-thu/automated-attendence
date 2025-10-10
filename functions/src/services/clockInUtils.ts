import * as functions from 'firebase-functions';
import { formatInTimeZone } from 'date-fns-tz';
import { admin } from '../firebase';
import { firestore, runTransaction } from '../utils/firestore';
import { queueNotification } from './notifications';
import { recordAuditLog } from './audit';
import { CompanySettingsInput } from './settings';
import { isWeekend, isCompanyHoliday } from '../utils/dateUtils';

type CheckSlot = 'check1' | 'check2' | 'check3';
type CheckStatus = 'on_time' | 'late' | 'early_leave' | 'missed';
type DailyStatus = 'in_progress' | 'present' | 'half_day_absent' | 'absent';

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
  const close = end + graceMinutes;

  if (actual < start) {
    return null;
  }

  if (actual <= end) {
    return { slot, status: 'on_time' };
  }

  if (actual <= close) {
    return { slot, status: 'late', lateByMinutes: actual - end };
  }

  return null;
};

export const computeDailyStatus = (
  checkStatuses: Partial<Record<CheckSlot, CheckStatus>>
): DailyStatus => {
  const completed = CLOCK_ORDER.filter((slot) => {
    const status = checkStatuses[slot];
    return status && status !== 'missed';
  });

  if (completed.length === 0) {
    return 'absent';
  }

  if (completed.length === 3) {
    return 'present';
  }

  if (completed.length === 2) {
    return 'half_day_absent';
  }

  return 'in_progress';
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

    const grace = settings.gracePeriods?.[slot] ?? 0;
    const outcome = determineCheckOutcome(iso, slot, window, grace, settings.timezone);
    if (outcome) {
      return outcome;
    }
  }

  return null;
};

const normalizeDateKey = (iso: string) => iso.slice(0, 10);

const getAttendanceDoc = (userId: string, dateKey: string) =>
  firestore.collection(ATTENDANCE_COLLECTION).doc(`${userId}_${dateKey}`);

export const handleClockIn = async ({ userId, payload }: ClockInServiceInput): Promise<ClockInResult> => {
  if (!payload.timestamp || !payload.location) {
    throw new functions.https.HttpsError('invalid-argument', 'timestamp and location are required.');
  }

  if (payload.isMocked) {
    throw new functions.https.HttpsError('failed-precondition', 'Clock-in rejected. Mock location detected.');
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

  const attendanceDate = normalizeDateKey(payload.timestamp);
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

    const dayStatus = computeDailyStatus(updatedStatuses);

    const updates: Record<string, unknown> = {
      userId,
      status: dayStatus,
      [`${slotOutcome.slot}_status`]: slotOutcome.status,
      [`${slotOutcome.slot}_timestamp`]: admin.firestore.Timestamp.fromDate(new Date(payload.timestamp)),
      [`${slotOutcome.slot}_location`]: new admin.firestore.GeoPoint(
        payload.location.latitude,
        payload.location.longitude
      ),
      attendanceDate: admin.firestore.Timestamp.fromDate(new Date(`${attendanceDate}T00:00:00Z`)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
