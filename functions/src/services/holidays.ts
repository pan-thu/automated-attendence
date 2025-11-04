import * as functions from 'firebase-functions';
import { Timestamp } from 'firebase-admin/firestore';
import { firestore } from '../utils/firestore';

const HOLIDAYS_COLLECTION = 'HOLIDAYS';

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

export const getHolidays = async (input: GetHolidaysInput): Promise<GetHolidaysResult> => {
  const currentYear = input.year || new Date().getFullYear();

  const holidaysSnapshot = await firestore
    .collection(HOLIDAYS_COLLECTION)
    .where('year', '==', currentYear)
    .orderBy('date', 'asc')
    .get();

  const holidays: Holiday[] = holidaysSnapshot.docs.map((doc) => {
    const data = doc.data();
    const dateTimestamp = data.date as Timestamp;
    const date = dateTimestamp.toDate();

    return {
      id: doc.id,
      name: (data.name as string) ?? '',
      date: date.toISOString().split('T')[0], // Format as YYYY-MM-DD
      type: (data.type as string) ?? 'public',
      description: (data.description as string | undefined) ?? undefined,
    };
  });

  return { holidays };
};

export interface CreateHolidayInput {
  name: string;
  date: string; // ISO 8601 format (YYYY-MM-DD)
  type?: string;
  description?: string;
  companyId?: string;
}

export const createHoliday = async (input: CreateHolidayInput): Promise<string> => {
  const { name, date, type = 'public', description, companyId } = input;

  const dateObj = new Date(date);
  const year = dateObj.getFullYear();

  const docRef = await firestore.collection(HOLIDAYS_COLLECTION).add({
    name,
    date: Timestamp.fromDate(dateObj),
    type,
    description: description || null,
    year,
    companyId: companyId || null,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });

  return docRef.id;
};
