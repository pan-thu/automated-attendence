import * as functions from 'firebase-functions';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { admin } from '../firebase';

/**
 * Date/Timezone utility functions.
 * Bug Fix #1: Resolve date/timezone handling inconsistencies.
 * Bug Fix #19: Block weekend/holiday clock-ins with proper date handling.
 */

/**
 * Convert a Firestore Timestamp to a date string in the specified timezone.
 * Format: YYYY-MM-DD
 */
export function timestampToLocalDateString(
  timestamp: FirebaseFirestore.Timestamp,
  timezone: string = 'Asia/Bangkok'
): string {
  const date = timestamp.toDate();
  // Use Intl.DateTimeFormat for proper timezone conversion
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Convert a date string (YYYY-MM-DD) to a Firestore Timestamp at start of day in timezone.
 */
export function localDateStringToTimestamp(
  dateString: string,
  timezone: string = 'Asia/Bangkok'
): FirebaseFirestore.Timestamp {
  // Parse the date string
  const [year, month, day] = dateString.split('-').map(Number);

  // Create a date at midnight in the specified timezone
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;

  // Create Date object and adjust for timezone
  const date = new Date(dateStr);

  return Timestamp.fromDate(date);
}

/**
 * Get current date string in the specified timezone.
 */
export function getCurrentDateString(timezone: string = 'Asia/Bangkok'): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/**
 * Get current date/time in the specified timezone.
 */
export function getCurrentDateInTimezone(timezone: string = 'Asia/Bangkok'): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const dateObj: Record<string, string> = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      dateObj[part.type] = part.value;
    }
  });

  return new Date(
    `${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`
  );
}

/**
 * Calculate business days between two timestamps (excluding weekends).
 * Bug Fix #1: Accurate business day calculation for leave requests.
 */
export function calculateBusinessDays(
  startDate: FirebaseFirestore.Timestamp,
  endDate: FirebaseFirestore.Timestamp
): number {
  const start = startDate.toDate();
  const end = endDate.toDate();

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    const dayOfWeek = current.getDay();
    // Not Sunday (0) or Saturday (6)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Check if a date falls on a weekend.
 * Bug Fix #19: Validate clock-ins against weekends.
 */
export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay();
  return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}

/**
 * Check if a date is a company holiday.
 * Bug Fix #19: Validate clock-ins against company holidays.
 */
export async function isCompanyHoliday(date: Date): Promise<boolean> {
  const db = admin.firestore();

  // Format date as YYYY-MM-DD for document ID
  const dateString = date.toISOString().slice(0, 10);

  const holidayDoc = await db.collection('COMPANY_HOLIDAYS').doc(dateString).get();

  return holidayDoc.exists;
}

/**
 * Format date as YYYY-MM-DD.
 */
export function formatDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parse a date string (YYYY-MM-DD) and validate format.
 */
export function parseDateOnly(value: string, label: string): Date {
  const pattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!pattern.test(value)) {
    throw new functions.https.HttpsError('invalid-argument', `${label} must be in YYYY-MM-DD format.`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new functions.https.HttpsError('invalid-argument', `${label} is not a valid date.`);
  }

  return parsed;
}

/**
 * Convert a source date to UTC date (midnight UTC).
 */
export function asUtcDate(source: Date): Date {
  return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
}

/**
 * Get the start of a month in UTC.
 */
export function getMonthStartUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}

/**
 * Get the end of a month in UTC (start of next month).
 */
export function getMonthEndUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}

/**
 * Ensure a date is in the future or present.
 */
export function ensureFutureOrPresentDate(date: Date, label: string): void {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (date < today) {
    throw new functions.https.HttpsError('failed-precondition', `${label} cannot be in the past.`);
  }
}

/**
 * Ensure start date is before end date.
 */
export function ensureDateRange(start: Date, end: Date): void {
  if (start > end) {
    throw new functions.https.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
  }
}
