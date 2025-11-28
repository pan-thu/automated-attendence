"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.timestampToLocalDateString = timestampToLocalDateString;
exports.localDateStringToTimestamp = localDateStringToTimestamp;
exports.getCurrentDateString = getCurrentDateString;
exports.getCurrentDateInTimezone = getCurrentDateInTimezone;
exports.calculateBusinessDays = calculateBusinessDays;
exports.isWeekend = isWeekend;
exports.isCompanyHoliday = isCompanyHoliday;
exports.formatDateKey = formatDateKey;
exports.parseDateOnly = parseDateOnly;
exports.asUtcDate = asUtcDate;
exports.getMonthStartUTC = getMonthStartUTC;
exports.getMonthEndUTC = getMonthEndUTC;
exports.ensureFutureOrPresentDate = ensureFutureOrPresentDate;
exports.ensureDateRange = ensureDateRange;
const functions = __importStar(require("firebase-functions"));
const firestore_1 = require("firebase-admin/firestore");
const firebase_1 = require("../firebase");
/**
 * Date/Timezone utility functions.
 * Bug Fix #1: Resolve date/timezone handling inconsistencies.
 * Bug Fix #19: Block weekend/holiday clock-ins with proper date handling.
 */
/**
 * Convert a Firestore Timestamp to a date string in the specified timezone.
 * Format: YYYY-MM-DD
 */
function timestampToLocalDateString(timestamp, timezone = 'Asia/Bangkok') {
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
function localDateStringToTimestamp(dateString, timezone = 'Asia/Bangkok') {
    // Parse the date string
    const [year, month, day] = dateString.split('-').map(Number);
    // Create a date at midnight in the specified timezone
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
    // Create Date object and adjust for timezone
    const date = new Date(dateStr);
    return firestore_1.Timestamp.fromDate(date);
}
/**
 * Get current date string in the specified timezone.
 */
function getCurrentDateString(timezone = 'Asia/Bangkok') {
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
function getCurrentDateInTimezone(timezone = 'Asia/Bangkok') {
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
    const dateObj = {};
    parts.forEach((part) => {
        if (part.type !== 'literal') {
            dateObj[part.type] = part.value;
        }
    });
    return new Date(`${dateObj.year}-${dateObj.month}-${dateObj.day}T${dateObj.hour}:${dateObj.minute}:${dateObj.second}`);
}
/**
 * Calculate business days between two timestamps (excluding weekends).
 * Bug Fix #1: Accurate business day calculation for leave requests.
 */
function calculateBusinessDays(startDate, endDate) {
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
function isWeekend(date) {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
}
/**
 * Check if a date is a company holiday.
 * Bug Fix #19: Validate clock-ins against company holidays.
 * Reads holidays from COMPANY_SETTINGS.main.holidays array (format: "YYYY-MM-DD Name")
 */
async function isCompanyHoliday(date) {
    const db = firebase_1.admin.firestore();
    const { getCompanyTimezoneDateKey } = await Promise.resolve().then(() => __importStar(require('./timezoneUtils')));
    // Format date as YYYY-MM-DD in company timezone
    const dateString = await getCompanyTimezoneDateKey(date);
    // Read holidays from company settings
    const settingsDoc = await db.collection('COMPANY_SETTINGS').doc('main').get();
    if (!settingsDoc.exists) {
        return false;
    }
    const data = settingsDoc.data();
    const holidays = data?.holidays ?? [];
    // Check if any holiday matches the date (format: "YYYY-MM-DD Name")
    return holidays.some((holiday) => holiday.startsWith(dateString));
}
/**
 * Format date as YYYY-MM-DD in company timezone.
 * @deprecated Use getCompanyTimezoneDateKey or getDateKeyInTimezone from timezoneUtils instead
 */
async function formatDateKey(date) {
    const { getCompanyTimezoneDateKey } = await Promise.resolve().then(() => __importStar(require('./timezoneUtils')));
    return getCompanyTimezoneDateKey(date);
}
/**
 * Parse a date string (YYYY-MM-DD) and validate format.
 */
function parseDateOnly(value, label) {
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
function asUtcDate(source) {
    return new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth(), source.getUTCDate()));
}
/**
 * Get the start of a month in UTC.
 */
function getMonthStartUTC(year, month) {
    return new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
}
/**
 * Get the end of a month in UTC (start of next month).
 */
function getMonthEndUTC(year, month) {
    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
}
/**
 * Ensure a date is in the future or present.
 */
function ensureFutureOrPresentDate(date, label) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (date < today) {
        throw new functions.https.HttpsError('failed-precondition', `${label} cannot be in the past.`);
    }
}
/**
 * Ensure start date is before end date.
 */
function ensureDateRange(start, end) {
    if (start > end) {
        throw new functions.https.HttpsError('invalid-argument', 'startDate must be before or equal to endDate.');
    }
}
