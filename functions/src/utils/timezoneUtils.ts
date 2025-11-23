import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { getCompanySettings } from '../services/settings';

// Default timezone for the application (India Standard Time)
const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Gets the effective timezone to use for scheduling and notifications
 * Returns company timezone from settings, or default timezone if not configured
 */
export async function getEffectiveTimezone(): Promise<string> {
  try {
    const settings = await getCompanySettings();

    if (settings.timezone && settings.timezone.trim()) {
      return settings.timezone;
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
 */
export async function convertToCompanyTimezone(
  utcDate: Date,
  timezone?: string
): Promise<Date> {
  const tz = timezone || await getEffectiveTimezone();
  return toZonedTime(utcDate, tz);
}

/**
 * Converts a date from company timezone to UTC
 * @param localDate - Date in company timezone
 * @param timezone - Source timezone (optional, will fetch from settings if not provided)
 * @returns Date object in UTC
 */
export async function convertFromCompanyTimezone(
  localDate: Date,
  timezone?: string
): Promise<Date> {
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
 */
export async function formatInCompanyTimezone(
  utcDate: Date,
  formatString: string,
  timezone?: string
): Promise<string> {
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
 */
export async function getCompanyTimezoneDateKey(utcDate?: Date): Promise<string> {
  const date = utcDate || new Date();
  const timezone = await getEffectiveTimezone();
  const zonedDate = toZonedTime(date, timezone);

  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Creates a date key (YYYY-MM-DD) in the specified timezone
 * Use this when you already have the timezone to avoid redundant settings fetches
 * @param utcDate - UTC date
 * @param timezone - Target timezone
 * @returns Date key string in the specified timezone
 */
export function getDateKeyInTimezone(utcDate: Date, timezone: string): string {
  const zonedDate = toZonedTime(utcDate, timezone);
  return format(zonedDate, 'yyyy-MM-dd');
}

/**
 * Creates a date key (YYYY-MM-DD) from an ISO string in company timezone
 * @param isoString - ISO 8601 date string
 * @returns Date key string in company timezone
 */
export async function getCompanyTimezoneDateKeyFromISO(isoString: string): Promise<string> {
  const date = new Date(isoString);
  return getCompanyTimezoneDateKey(date);
}

/**
 * Creates a date key (YYYY-MM-DD) from an ISO string in the specified timezone
 * @param isoString - ISO 8601 date string
 * @param timezone - Target timezone
 * @returns Date key string in the specified timezone
 */
export function getDateKeyInTimezoneFromISO(isoString: string, timezone: string): string {
  const date = new Date(isoString);
  return getDateKeyInTimezone(date, timezone);
}