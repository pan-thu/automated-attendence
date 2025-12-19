"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEffectiveTimezone = getEffectiveTimezone;
exports.convertToCompanyTimezone = convertToCompanyTimezone;
exports.convertFromCompanyTimezone = convertFromCompanyTimezone;
exports.getCompanyTimezoneHour = getCompanyTimezoneHour;
exports.formatInCompanyTimezone = formatInCompanyTimezone;
exports.isCompanyTimezoneHour = isCompanyTimezoneHour;
exports.getNotificationSchedule = getNotificationSchedule;
exports.getNotificationSlotForTime = getNotificationSlotForTime;
exports.getCompanyTimezoneDateKey = getCompanyTimezoneDateKey;
exports.getDateKeyInTimezone = getDateKeyInTimezone;
exports.getCompanyTimezoneDateKeyFromISO = getCompanyTimezoneDateKeyFromISO;
exports.getDateKeyInTimezoneFromISO = getDateKeyInTimezoneFromISO;
exports.getCurrentDateInCompanyTimezone = getCurrentDateInCompanyTimezone;
const date_fns_tz_1 = require("date-fns-tz");
const settings_1 = require("../services/settings");
// Default timezone for the application (India Standard Time)
const DEFAULT_TIMEZONE = 'Asia/Kolkata';
/**
 * Validates if a Date object is valid
 * @param date - Date object to validate
 * @returns true if date is valid, false otherwise
 */
function isValidDate(date) {
    return date instanceof Date && !isNaN(date.getTime());
}
/**
 * Validates if a timezone string is valid by testing it with date-fns-tz
 */
function isValidTimezone(timezone) {
    try {
        // Test if the timezone works with toZonedTime
        const testDate = new Date('2024-01-01T00:00:00Z');
        const zonedDate = (0, date_fns_tz_1.toZonedTime)(testDate, timezone);
        return isValidDate(zonedDate);
    }
    catch {
        return false;
    }
}
/**
 * Gets the effective timezone to use for scheduling and notifications
 * Returns company timezone from settings, or default timezone if not configured
 */
async function getEffectiveTimezone() {
    try {
        const settings = await (0, settings_1.getCompanySettings)();
        if (settings.timezone && settings.timezone.trim()) {
            const tz = settings.timezone.trim();
            // Validate the timezone is actually valid
            if (isValidTimezone(tz)) {
                return tz;
            }
            else {
                console.warn(`Invalid timezone in company settings: "${tz}". Falling back to ${DEFAULT_TIMEZONE}`);
            }
        }
    }
    catch (error) {
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
async function convertToCompanyTimezone(utcDate, timezone) {
    if (!isValidDate(utcDate)) {
        throw new Error('Invalid date provided to convertToCompanyTimezone');
    }
    const tz = timezone || await getEffectiveTimezone();
    return (0, date_fns_tz_1.toZonedTime)(utcDate, tz);
}
/**
 * Converts a date from company timezone to UTC
 * @param localDate - Date in company timezone
 * @param timezone - Source timezone (optional, will fetch from settings if not provided)
 * @returns Date object in UTC
 * @throws Error if the date is invalid
 */
async function convertFromCompanyTimezone(localDate, timezone) {
    if (!isValidDate(localDate)) {
        throw new Error('Invalid date provided to convertFromCompanyTimezone');
    }
    const tz = timezone || await getEffectiveTimezone();
    return (0, date_fns_tz_1.fromZonedTime)(localDate, tz);
}
/**
 * Gets the current hour in the company's timezone using Intl API
 * @param utcDate - UTC date to check (optional, defaults to now)
 * @returns Current hour (0-23) in company timezone
 */
async function getCompanyTimezoneHour(utcDate) {
    const date = utcDate || new Date();
    const timezone = await getEffectiveTimezone();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    const hourPart = parts.find(p => p.type === 'hour');
    if (!hourPart) {
        throw new Error('Failed to extract hour from date');
    }
    return parseInt(hourPart.value, 10);
}
/**
 * Formats a date in the company's timezone
 * @param utcDate - Date in UTC
 * @param formatString - Format string for date-fns
 * @param timezone - Target timezone (optional, will fetch from settings if not provided)
 * @returns Formatted date string
 * @throws Error if the date is invalid
 */
async function formatInCompanyTimezone(utcDate, formatString, timezone) {
    if (!isValidDate(utcDate)) {
        throw new Error('Invalid date provided to formatInCompanyTimezone');
    }
    const tz = timezone || await getEffectiveTimezone();
    return (0, date_fns_tz_1.format)((0, date_fns_tz_1.toZonedTime)(utcDate, tz), formatString, { timeZone: tz });
}
/**
 * Checks if a given UTC time corresponds to a specific hour in company timezone
 * @param utcDate - UTC date to check
 * @param targetHour - Target hour in company timezone (0-23)
 * @returns true if the UTC date corresponds to the target hour in company timezone
 */
async function isCompanyTimezoneHour(utcDate, targetHour) {
    const currentHour = await getCompanyTimezoneHour(utcDate);
    return currentHour === targetHour;
}
/**
 * Gets notification schedule hours mapped to their slot names
 */
function getNotificationSchedule() {
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
async function getNotificationSlotForTime(utcDate) {
    const date = utcDate || new Date();
    const timezone = await getEffectiveTimezone();
    const zonedDate = (0, date_fns_tz_1.toZonedTime)(date, timezone);
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
 * Creates a date key (YYYY-MM-DD) in company timezone using Intl API
 * This is more reliable than date-fns-tz for timezone conversion
 * @param utcDate - UTC date
 * @returns Date key string in company timezone
 * @throws Error if the date is invalid
 */
async function getCompanyTimezoneDateKey(utcDate) {
    const date = utcDate || new Date();
    if (!isValidDate(date)) {
        throw new Error(`Invalid date provided to getCompanyTimezoneDateKey: ${date}`);
    }
    const timezone = await getEffectiveTimezone();
    // Use Intl.DateTimeFormat for reliable timezone conversion
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(date); // Returns "YYYY-MM-DD"
}
/**
 * Creates a date key (YYYY-MM-DD) in the specified timezone using Intl API
 * Use this when you already have the timezone to avoid redundant settings fetches
 * @param utcDate - UTC date
 * @param timezone - Target timezone
 * @returns Date key string in the specified timezone
 * @throws Error if the date is invalid
 */
function getDateKeyInTimezone(utcDate, timezone) {
    if (!isValidDate(utcDate)) {
        throw new Error('Invalid date provided to getDateKeyInTimezone');
    }
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    return formatter.format(utcDate); // Returns "YYYY-MM-DD"
}
/**
 * Creates a date key (YYYY-MM-DD) from an ISO string in company timezone
 * @param isoString - ISO 8601 date string
 * @returns Date key string in company timezone
 * @throws Error if the date string is invalid
 */
async function getCompanyTimezoneDateKeyFromISO(isoString) {
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
function getDateKeyInTimezoneFromISO(isoString, timezone) {
    const date = new Date(isoString);
    if (!isValidDate(date)) {
        throw new Error(`Invalid date string: "${isoString}"`);
    }
    return getDateKeyInTimezone(date, timezone);
}
/**
 * Gets the current date as a date key (YYYY-MM-DD) in company timezone
 * This is the primary function for determining "today's date" in the company's local time
 * @returns Current date in YYYY-MM-DD format in company timezone
 */
async function getCurrentDateInCompanyTimezone() {
    return getCompanyTimezoneDateKey(new Date());
}
