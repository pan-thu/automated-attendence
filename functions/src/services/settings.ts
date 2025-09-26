import { admin } from '../firebase';
import { firestore } from '../utils/firestore';

const SETTINGS_COLLECTION = 'COMPANY_SETTINGS';

export interface CompanySettingsInput {
  companyName?: string;
  timezone?: string;
  workplace_center?: { latitude: number; longitude: number };
  workplace_radius?: number;
  timeWindows?: Record<string, { label: string; start: string; end: string }>;
  gracePeriods?: Record<string, number>;
  penaltyRules?: {
    violationThreshold: number;
    amounts: Record<string, number>;
  };
  leavePolicy?: Record<string, number>;
  workingDays?: Record<string, boolean>;
  holidays?: string[];
  geoFencingEnabled?: boolean;
}

export const updateCompanySettings = async (
  input: CompanySettingsInput,
  updatedBy: string
) => {
  const payload: Record<string, unknown> = {
    ...input,
    updatedBy,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (input.workplace_center) {
    payload.workplace_center = new admin.firestore.GeoPoint(
      input.workplace_center.latitude,
      input.workplace_center.longitude
    );
  }

  await firestore.collection(SETTINGS_COLLECTION).doc('main').set(payload, { merge: true });
};


