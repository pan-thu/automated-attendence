import { firestore } from '../utils/firestore';

const SETTINGS_COLLECTION = 'COMPANY_SETTINGS';

export interface GetHolidaysInput {
  year?: number;
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  type: string; // 'public', 'company', 'optional'
  description?: string;
}

export interface GetHolidaysResult {
  holidays: Holiday[];
}

/**
 * Parses a holiday string from company settings.
 * Format: "YYYY-MM-DD Name" (e.g., "2026-01-01 New Year")
 */
const parseHolidayString = (holidayStr: string, index: number): Holiday | null => {
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

export const getHolidays = async (input: GetHolidaysInput): Promise<GetHolidaysResult> => {
  const targetYear = input.year || new Date().getFullYear();

  // Read holidays from company settings
  const settingsDoc = await firestore
    .collection(SETTINGS_COLLECTION)
    .doc('main')
    .get();

  if (!settingsDoc.exists) {
    return { holidays: [] };
  }

  const data = settingsDoc.data();
  const holidayStrings = (data?.holidays as string[] | undefined) ?? [];

  const holidays: Holiday[] = holidayStrings
    .map((str, index) => parseHolidayString(str, index))
    .filter((h): h is Holiday => h !== null)
    .filter((h) => {
      const holidayYear = parseInt(h.date.substring(0, 4), 10);
      return holidayYear === targetYear;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { holidays };
};

