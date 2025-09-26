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

export const assertEmail = (value: unknown, field = 'email'): string => {
  return assertString(value, field, {
    min: 5,
    max: 254,
    pattern:
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  });
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

export const assertTimestampRange = (
  start: unknown,
  end: unknown,
  field: string
): { startDate: FirebaseFirestore.Timestamp; endDate: FirebaseFirestore.Timestamp } => {
  if (!(start instanceof admin.firestore.Timestamp) || !(end instanceof admin.firestore.Timestamp)) {
    throw new functions.https.HttpsError('invalid-argument', `${field} must contain Firestore Timestamps.`);
  }

  if (start.toMillis() > end.toMillis()) {
    throw new functions.https.HttpsError('invalid-argument', `${field} start cannot be after end.`);
  }

  return { startDate: start, endDate: end };
};


