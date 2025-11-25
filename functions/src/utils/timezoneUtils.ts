import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getCompanySettings } from '../services/settings';

// Default timezone for the application (India Standard Time)
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Validates if a Date object is valid
 * @param date - Date object to validate
 * @returns true if date is valid, false otherwise
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validates if a timezone string is valid by testing it with date-fns-tz
 */
function isValidTimezone(timezone: string): boolean {
  try {
    // Test if the timezone works with toZonedTime
    const testDate = new Date('2024-01-01T00:00:00Z');
    const zonedDate = toZonedTime(testDate, timezone);
    return isValidDate(zonedDate);
  } catch {
    return false;
  }
}

/**
 * Gets the effective timezone to use for scheduling and notifications
 * Returns company timezone from settings, or default timezone if not configured
 */
export async function getEffectiveTimezone(): Promise<string> {
  try {
    const settings = await getCompanySettings();

    if (settings.timezone && settings.timezone.trim()) {
      const tz = settings.timezone.trim();
      // Validate the timezone is actually valid
      if (isValidTimezone(tz)) {
        return tz;
      } else {
        console.warn(`Invalid timezone in company settings: "${tz}". Falling back to ${DEFAULT_TIMEZONE}`);
      }
    }
  } catch (error) {
    console.warn('Failed to fetch company settings for timezone:', error);
  }

  return DEFAULT_TIMEZONE;
}

/**
 * Converts a UTC date to the company's timezone
 * @param utcDate - Date in UTC
 * @param timezone - Target timezone (optional, will fetch from settings if not provided)
 * @returns Date object in the specified timezone
 * @throws Error if the date is invalid
 */
export async function convertToCompanyTimezone(
  utcDate: Date,
  timezone?: string
): Promise<Date> {
  if (!isValidDate(utcDate)) {
    throw new Error('Invalid date provided to convertToCompanyTimezone');
  }
  const tz = timezone || await getEffectiveTimezone();
  return toZonedTime(utcDate, tz);
}

/**
 * Converts a date from company timezone to UTC
 * @param localDate - Date in company timezone
 * @param timezone - Source timezone (optional, will fetch from settings if not provided)
 * @returns Date object in UTC
 * @throws Error if the date is invalid
 */
export async function convertFromCompanyTimezone(
  localDate: Date,
  timezone?: string
): Promise<Date> {
  if (!isValidDate(localDate)) {
    throw new Error('Invalid date provided to convertFromCompanyTimezone');
  }
  const tz = timezone || await getEffectiveTimezone();
  return fromZonedTime(localDate, tz);
}

/**
 * Gets the current hour in the company's timezone
 * @param utcDate - UTC date to check (optional, defaults to now)
 * @returns Current hour (0-23) in company timezone
 */
export async function getCompanyTimezoneHour(utcDate?: Date): Promise<number> {
  const date = utcDate || new Date();
  const timezone = await getEffectiveTimezone();
  const zonedDate = toZonedTime(date, timezone);
  return zonedDate.getHours();
}

/**
 * Formats a date in the company's timezone
 * @param utcDate - Date in UTC
 * @param formatString - Format string for date-fns
 * @param timezone - Target timezone (optional, will fetch from settings if not provided)
 * @returns Formatted date string
 * @throws Error if the date is invalid
 */
export async function formatInCompanyTimezone(
  utcDate: Date,
  formatString: string,
  timezone?: string
): Promise<string> {
  if (!isValidDate(utcDate)) {
    throw new Error('Invalid date provided to formatInCompanyTimezone');
  }
  const tz = timezone || await getEffectiveTimezone();
  return format(toZonedTime(utcDate, tz), formatString, { timeZone: tz });
}

/**
 * Checks if a given UTC time corresponds to a specific hour in company timezone
 * @param utcDate - UTC date to check
 * @param targetHour - Target hour in company timezone (0-23)
 * @returns true if the UTC date corresponds to the target hour in company timezone
 */
export async function isCompanyTimezoneHour(
  utcDate: Date,
  targetHour: number
): Promise<boolean> {
  const currentHour = await getCompanyTimezoneHour(utcDate);
  return currentHour === targetHour;
}

/**
 * Gets notification schedule hours mapped to their slot names
 */
export function getNotificationSchedule(): Record<string, { hour: number; minute: number; slot: 'check1' | 'check2' | 'check3' }> {
  return {
    morning: { hour: 8, minute: 30, slot: 'check1' },
    midday: { hour: 13, minute: 30, slot: 'check2' },
    evening: { hour: 17, minute: 30, slot: 'check3' },
  };
}

/**
 * Determines which notification slot should be triggered based on current time
 * @param utcDate - UTC date to check
 * @returns Notification slot if one should be triggered, null otherwise
 */
export async function getNotificationSlotForTime(
  utcDate?: Date
): Promise<{ slot: 'check1' | 'check2' | 'check3'; label: string } | null> {
  const date = utcDate || new Date();
  const timezone = await getEffectiveTimezone();
  const zonedDate = toZonedTime(date, timezone);

  const hour = zonedDate.getHours();
  const minute = zonedDate.getMinutes();

  const schedule = getNotificationSchedule();

  // Check if current time matches any notification schedule
  // Allow a 30-minute window for each notification
  for (const [label, config] of Object.entries(schedule)) {
    if (hour === config.hour && minute >= config.minute && minute < config.minute + 30) {
      return { slot: config.slot, label };
    }
  }

  return null;
}

/**
 * Creates a date key (YYYY-MM-DD) in company timezone
 * @param utcDate - UTC date
 * @returns Date key string in company timezone
 * @throws Error if the date is invalid
 */
export async function getCompanyTimezoneDateKey(utcDate?: Date): Promise<string> {
  const date = utcDate || new Date();
  if (!isValidDate(date)) {
    throw new Error(`Invalid date provided to getCompanyTimezoneDateKey: ${date}`);
  }
  const timezone = await getEffectiveTimezone();
  const zonedDate = toZonedTime(date, timezone);
  if (!isValidDate(zonedDate)) {
    throw new Error(`toZonedTime produced invalid date. Input: ${date.toISOString()}, timezone: ${timezone}`);
  }

  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Creates a date key (YYYY-MM-DD) in the specified timezone
 * Use this when you already have the timezone to avoid redundant settings fetches
 * @param utcDate - UTC date
 * @param timezone - Target timezone
 * @returns Date key string in the specified timezone
 * @throws Error if the date is invalid
 */
export function getDateKeyInTimezone(utcDate: Date, timezone: string): string {
  if (!isValidDate(utcDate)) {
    throw new Error('Invalid date provided to getDateKeyInTimezone');
  }
  const zonedDate = toZonedTime(utcDate, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Creates a date key (YYYY-MM-DD) from an ISO string in company timezone
 * @param isoString - ISO 8601 date string
 * @returns Date key string in company timezone
 * @throws Error if the date string is invalid
 */
export async function getCompanyTimezoneDateKeyFromISO(isoString: string): Promise<string> {
  const date = new Date(isoString);
  if (!isValidDate(date)) {
    throw new Error(`Invalid date string: "${isoString}"`);
  }
  return getCompanyTimezoneDateKey(date);
}

/**
 * Creates a date key (YYYY-MM-DD) from an ISO string in the specified timezone
 * @param isoString - ISO 8601 date string
 * @param timezone - Target timezone
 * @returns Date key string in the specified timezone
 * @throws Error if the date string is invalid
 */
export function getDateKeyInTimezoneFromISO(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  if (!isValidDate(date)) {
    throw new Error(`Invalid date string: "${isoString}"`);
  }
  return getDateKeyInTimezone(date, timezone);
}