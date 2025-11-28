"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHolidays = void 0;
const firestore_1 = require("../utils/firestore");
const SETTINGS_COLLECTION = 'COMPANY_SETTINGS';
/**
 * Parses a holiday string from company settings.
 * Format: "YYYY-MM-DD Name" (e.g., "2026-01-01 New Year")
 */
const parseHolidayString = (holidayStr, index) => {
    const match = holidayStr.match(/^(\d{4}-\d{2}-\d{2})\s+(.+)$/);
    if (!match) {
        return null;
    }
    const [, date, name] = match;
    return {
        id: `holiday-${index}`,
        name: name.trim(),
        date,
        type: 'company',
    };
};
const getHolidays = async (input) => {
    const targetYear = input.year || new Date().getFullYear();
    // Read holidays from company settings
    const settingsDoc = await firestore_1.firestore
        .collection(SETTINGS_COLLECTION)
        .doc('main')
        .get();
    if (!settingsDoc.exists) {
        return { holidays: [] };
    }
    const data = settingsDoc.data();
    const holidayStrings = data?.holidays ?? [];
    const holidays = holidayStrings
        .map((str, index) => parseHolidayString(str, index))
        .filter((h) => h !== null)
        .filter((h) => {
        const holidayYear = parseInt(h.date.substring(0, 4), 10);
        return holidayYear === targetYear;
    })
        .sort((a, b) => a.date.localeCompare(b.date));
    return { holidays };
};
exports.getHolidays = getHolidays;
