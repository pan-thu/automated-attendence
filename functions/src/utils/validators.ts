import * as functions from 'firebase-functions';
import { admin } from '../firebase';

export const assertPayload = <T extends Record<string, unknown>>(
  payload: unknown,
  message = 'Invalid payload.'
): T => {
  if (!payload || typeof payload !== 'object') {
    throw new functions.https.HttpsError('invalid-argument', message);
  }
  return payload as T;
};

export const assertString = (
  value: unknown,
  field: string,
  options?: { optional?: boolean; min?: number; max?: number; pattern?: RegExp }
): string => {
  if (value == null) {
    if (options?.optional) {
      return '';
    }
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }

  if (typeof value !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a string.`);
  }

  const trimmed = value.trim();

  if (options?.min !== undefined && trimmed.length < options.min) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `${field} must be at least ${options.min} characters.`
    );
  }

  if (options?.max !== undefined && trimmed.length > options.max) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `${field} must be at most ${options.max} characters.`
    );
  }

  if (options?.pattern && !options.pattern.test(trimmed)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is invalid.`);
  }

  return trimmed;
};

/**
 * Validate and normalize email address to lowercase.
 * Bug Fix #21: Email addresses must be normalized to prevent case-sensitivity issues.
 */
export const assertEmail = (value: unknown, field = 'email'): string => {
  const email = assertString(value, field, {
    min: 5,
    max: 254,
    pattern:
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  });

  // Normalize to lowercase
  return email.toLowerCase();
};

export const assertBoolean = (value: unknown, field: string): boolean => {
  if (typeof value !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a boolean.`);
  }
  return value;
};

export const assertArray = <T>(value: unknown, field: string): T[] => {
  if (!Array.isArray(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be an array.`);
  }
  return value as T[];
};

export const assertEnum = <T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `${field} must be one of: ${allowed.join(', ')}.`
    );
  }
  return value as T;
};

/**
 * Validate single Firestore Timestamp with null safety.
 * Bug Fix #2: Handle null/undefined before accessing Timestamp methods.
 */
export const assertTimestamp = (value: unknown, field: string): FirebaseFirestore.Timestamp => {
  if (value === null || value === undefined) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }

  if (!(value instanceof admin.firestore.Timestamp)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a Firestore Timestamp.`);
  }

  return value;
};

/**
 * Validate Timestamp range with null safety.
 * Bug Fix #2: Handle null/undefined before accessing .toMillis().
 */
export const assertTimestampRange = (
  start: unknown,
  end: unknown,
  field: string
): { startDate: FirebaseFirestore.Timestamp; endDate: FirebaseFirestore.Timestamp } => {
  // Null safety checks before type checks
  if (start === null || start === undefined) {
    throw new functions.https.HttpsError('invalid-argument', `${field} startDate is required.`);
  }

  if (end === null || end === undefined) {
    throw new functions.https.HttpsError('invalid-argument', `${field} endDate is required.`);
  }

  if (!(start instanceof admin.firestore.Timestamp) || !(end instanceof admin.firestore.Timestamp)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must contain Firestore Timestamps.`);
  }

  // Safe to call .toMillis() now
  if (start.toMillis() >= end.toMillis()) {
    throw new functions.https.HttpsError('invalid-argument', `${field} start must be before end.`);
  }

  return { startDate: start, endDate: end };
};

/**
 * Validate number with optional range.
 * Bug Fix #2: Comprehensive null safety for numeric validation.
 */
export const assertNumber = (
  value: unknown,
  field: string,
  min?: number,
  max?: number
): number => {
  if (value === null || value === undefined) {
    throw new functions.https.HttpsError('invalid-argument', `${field} is required.`);
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be a valid number.`);
  }

  if (min !== undefined && num < min) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be at least ${min}.`);
  }

  if (max !== undefined && num > max) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must be at most ${max}.`);
  }

  return num;
};

/**
 * Validate latitude coordinate.
 * Bug Fix #12: Validate latitude range (-90 to 90).
 */
export const assertLatitude = (value: unknown, field = 'latitude'): number => {
  return assertNumber(value, field, -90, 90);
};

/**
 * Validate longitude coordinate.
 * Bug Fix #12: Validate longitude range (-180 to 180).
 */
export const assertLongitude = (value: unknown, field = 'longitude'): number => {
  return assertNumber(value, field, -180, 180);
};

/**
 * Validate and create GeoPoint from coordinates.
 * Bug Fix #12: Comprehensive coordinate validation.
 */
export const assertGeoPoint = (lat: unknown, lon: unknown): FirebaseFirestore.GeoPoint => {
  const validLat = assertLatitude(lat);
  const validLon = assertLongitude(lon);
  return new admin.firestore.GeoPoint(validLat, validLon);
};


