import * as functions from 'firebase-functions';
import { Timestamp, FieldValue, GeoPoint } from 'firebase-admin/firestore';
import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const SETTINGS_COLLECTION = 'COMPANY_SETTINGS';

export interface CompanySettingsInput {
  companyName?: string;
  timezone?: string;
  workplace_center?: { latitude: number; longitude: number };
  workplace_radius?: number;
  workplaceAddress?: string;
  timeWindows?: Record<string, { label: string; start: string; end: string }>;
  gracePeriods?: Record<string, number>;
  penaltyRules?: {
    violationThresholds: Record<string, number>;
    amounts: Record<string, number>;
  };
  leavePolicy?: Record<string, number>;
  workingDays?: Record<string, boolean>;
  holidays?: string[];
  geoFencingEnabled?: boolean;
  maxLeaveAttachmentSizeMb?: number;
  allowedLeaveAttachmentTypes?: string[];
  leaveAttachmentRequiredTypes?: string[];
}

export interface CompanySettings extends CompanySettingsInput {
  workplace_center?: FirebaseFirestore.GeoPoint;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const ensureOptionalString = (value: unknown, field: string): string | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a string.`);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new functions.https.HttpsError('invalid-argument', `${field} cannot be empty.`);
  }

  return trimmed;
};

const ensureOptionalBoolean = (value: unknown, field: string): boolean | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a boolean.`);
  }

  return value;
};

const ensureOptionalNumber = (
  value: unknown,
  field: string,
  { allowZero = true, allowUndefined = true }: { allowZero?: boolean; allowUndefined?: boolean } = {}
): number | undefined => {
  if (value === undefined) {
    if (allowUndefined) {
      return undefined;
    }
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }

  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a valid number.`);
  }

  if (value < 0 || (!allowZero && value === 0)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be greater than${allowZero ? ' or equal to' : ''} 0.`);
  }

  return value;
};

const ensureOptionalCoordinate = (
  value: unknown,
  field: string
): { latitude: number; longitude: number } | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an object with latitude and longitude.`);
  }

  const rawLat = value.latitude;
  const rawLng = value.longitude;

  if (typeof rawLat !== 'number' || Number.isNaN(rawLat) || !Number.isFinite(rawLat)) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.latitude must be a valid number.`);
  }

  if (typeof rawLng !== 'number' || Number.isNaN(rawLng) || !Number.isFinite(rawLng)) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.longitude must be a valid number.`);
  }

  if (rawLat < -90 || rawLat > 90) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.latitude must be between -90 and 90.`);
  }

  if (rawLng < -180 || rawLng > 180) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.longitude must be between -180 and 180.`);
  }

  return { latitude: rawLat, longitude: rawLng };
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const sanitizeTimeWindows = (
  value: unknown,
  field: string
): Record<string, { label: string; start: string; end: string }> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
  }

  const sanitized: Record<string, { label: string; start: string; end: string }> = {};
  for (const [key, windowValue] of Object.entries(value)) {
    if (!isPlainObject(windowValue)) {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be an object.`);
    }

    const label = ensureOptionalString(windowValue.label, `${field}.${key}.label`);
    const start = ensureOptionalString(windowValue.start, `${field}.${key}.start`);
    const end = ensureOptionalString(windowValue.end, `${field}.${key}.end`);

    if (!label || !start || !end) {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must include label, start, and end.`);
    }

    if (!timePattern.test(start)) {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key}.start must be in HH:MM format.`);
    }

    if (!timePattern.test(end)) {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key}.end must be in HH:MM format.`);
    }

    sanitized[key] = { label, start, end };
  }

  return sanitized;
};

const sanitizeNumberRecord = (
  value: unknown,
  field: string
): Record<string, number> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
  }

  const sanitized: Record<string, number> = {};
  for (const [key, raw] of Object.entries(value)) {
    const numeric = ensureOptionalNumber(raw, `${field}.${key}`, {
      allowZero: true,
      allowUndefined: false,
    });

    if (numeric === undefined) {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be a number.`);
    }

    sanitized[key] = numeric;
  }

  return sanitized;
};

const sanitizeBooleanRecord = (
  value: unknown,
  field: string
): Record<string, boolean> | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
  }

  const sanitized: Record<string, boolean> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== 'boolean') {
      throw new functions.https.HttpsError('invalid-argument', `${field}.${key} must be a boolean.`);
    }
    sanitized[key] = raw;
  }

  return sanitized;
};

const sanitizePenaltyRules = (
  value: unknown,
  field: string
) => {
  if (value === undefined) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an object.`);
  }

  const violationThresholds = sanitizeNumberRecord(value.violationThresholds, `${field}.violationThresholds`);
  if (!violationThresholds || Object.keys(violationThresholds).length === 0) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.violationThresholds must include at least one entry.`);
  }

  const amounts = sanitizeNumberRecord(value.amounts, `${field}.amounts`);

  if (!amounts || Object.keys(amounts).length === 0) {
    throw new functions.https.HttpsError('invalid-argument', `${field}.amounts must include at least one entry.`);
  }

  return {
    violationThresholds,
    amounts,
  };
};

const sanitizeHolidays = (value: unknown, field: string): string[] | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an array of strings.`);
  }

  return value.map((item, index) => {
    const result = ensureOptionalString(item, `${field}[${index}]`);
    if (!result) {
      throw new functions.https.HttpsError('invalid-argument', `${field}[${index}] cannot be empty.`);
    }
    return result;
  });
};

const sanitizeCompanySettingsInput = (
  input: CompanySettingsInput
): Record<string, unknown> => {
  const sanitized: Record<string, unknown> = {};

  const companyName = ensureOptionalString(input.companyName, 'companyName');
  if (companyName !== undefined) {
    sanitized.companyName = companyName;
  }

  const timezone = ensureOptionalString(input.timezone, 'timezone');
  if (timezone !== undefined) {
    sanitized.timezone = timezone;
  }

  const workplaceCenter = ensureOptionalCoordinate(input.workplace_center, 'workplace_center');
  if (workplaceCenter) {
    sanitized.workplace_center = workplaceCenter;
  }

  const workplaceRadius = ensureOptionalNumber(input.workplace_radius, 'workplace_radius', {
    allowZero: false,
  });
  if (workplaceRadius !== undefined) {
    sanitized.workplace_radius = workplaceRadius;
  }

  const workplaceAddress = ensureOptionalString(input.workplaceAddress, 'workplaceAddress');
  if (workplaceAddress !== undefined) {
    sanitized.workplaceAddress = workplaceAddress;
  }

  const timeWindows = sanitizeTimeWindows(input.timeWindows, 'timeWindows');
  if (timeWindows) {
    sanitized.timeWindows = timeWindows;
  }

  const gracePeriods = sanitizeNumberRecord(input.gracePeriods, 'gracePeriods');
  if (gracePeriods) {
    sanitized.gracePeriods = gracePeriods;
  }

  const penaltyRules = sanitizePenaltyRules(input.penaltyRules, 'penaltyRules');
  if (penaltyRules) {
    sanitized.penaltyRules = penaltyRules;
  }

  const leavePolicy = sanitizeNumberRecord(input.leavePolicy, 'leavePolicy');
  if (leavePolicy) {
    sanitized.leavePolicy = leavePolicy;
  }

  const workingDays = sanitizeBooleanRecord(input.workingDays, 'workingDays');
  if (workingDays) {
    sanitized.workingDays = workingDays;
  }

  const holidays = sanitizeHolidays(input.holidays, 'holidays');
  if (holidays) {
    sanitized.holidays = holidays;
  }

  const geoFencingEnabled = ensureOptionalBoolean(input.geoFencingEnabled, 'geoFencingEnabled');
  if (geoFencingEnabled !== undefined) {
    sanitized.geoFencingEnabled = geoFencingEnabled;
  }

  const maxAttachmentSize = ensureOptionalNumber(input.maxLeaveAttachmentSizeMb, 'maxLeaveAttachmentSizeMb', {
    allowZero: false,
  });
  if (maxAttachmentSize !== undefined) {
    sanitized.maxLeaveAttachmentSizeMb = maxAttachmentSize;
  }

  if (input.allowedLeaveAttachmentTypes !== undefined) {
    if (!Array.isArray(input.allowedLeaveAttachmentTypes)) {
      throw new functions.https.HttpsError('invalid-argument', 'allowedLeaveAttachmentTypes must be an array.');
    }

    const sanitizedTypes = input.allowedLeaveAttachmentTypes.map((entry, index) => {
      const value = ensureOptionalString(entry, `allowedLeaveAttachmentTypes[${index}]`);
      return value?.toLowerCase();
    }).filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);

    sanitized.allowedLeaveAttachmentTypes = sanitizedTypes;
  }

  if (input.leaveAttachmentRequiredTypes !== undefined) {
    if (!Array.isArray(input.leaveAttachmentRequiredTypes)) {
      throw new functions.https.HttpsError('invalid-argument', 'leaveAttachmentRequiredTypes must be an array.');
    }

    const sanitizedRequiredTypes = input.leaveAttachmentRequiredTypes
      .map((entry, index) => {
        const value = ensureOptionalString(entry, `leaveAttachmentRequiredTypes[${index}]`);
        return value?.toLowerCase();
      })
      .filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);

    sanitized.leaveAttachmentRequiredTypes = sanitizedRequiredTypes;
  }

  return sanitized;
};

export const updateCompanySettings = async (
  input: CompanySettingsInput,
  updatedBy: string
) => {
  const sanitized = sanitizeCompanySettingsInput(input);

  const payload: Record<string, unknown> = {
    ...sanitized,
    updatedBy,
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (sanitized.workplace_center) {
    const center = sanitized.workplace_center as { latitude: number; longitude: number };
    payload.workplace_center = new GeoPoint(center.latitude, center.longitude);
  }

  await firestore.collection(SETTINGS_COLLECTION).doc('main').set(payload, { merge: true });
};

export const getCompanySettings = async (): Promise<CompanySettings> => {
  const snapshot = await firestore.collection(SETTINGS_COLLECTION).doc('main').get();
  if (!snapshot.exists) {
    return {} as CompanySettings;
  }

  return snapshot.data() as CompanySettings;
};


