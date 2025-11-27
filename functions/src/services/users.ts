import { admin } from '../firebase';
import { firestore, nowTimestamp } from '../utils/firestore';

const USERS_COLLECTION = 'USERS';

export interface CreateEmployeeInput {
  email: string;
  password: string;
  fullName: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: Partial<Record<'fullLeaveBalance' | 'halfLeaveBalance' | 'medicalLeaveBalance' | 'maternityLeaveBalance', number>>;
}

export interface UpdateEmployeeInput {
  uid: string;
  fullName?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  leaveBalances?: Partial<Record<'fullLeaveBalance' | 'halfLeaveBalance' | 'medicalLeaveBalance' | 'maternityLeaveBalance', number>>;
}

export const DEFAULT_LEAVE_KEYS = [
  'fullLeaveBalance',
  'halfLeaveBalance',
  'medicalLeaveBalance',
  'maternityLeaveBalance',
] as const;

export const createEmployee = async (input: CreateEmployeeInput, performedBy: string) => {
  const { email, password, fullName, department, position, phoneNumber, leaveBalances } = input;

  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: fullName,
    phoneNumber,
    disabled: false,
  });

  const uid = userRecord.uid;

  await admin.auth().setCustomUserClaims(uid, { role: 'employee' });

  // Fetch initial leave balances from company settings
  const { getCompanySettings } = await import('./settings');
  const companySettings = await getCompanySettings();
  const leavePolicy = companySettings?.leavePolicy ?? {};

  // Build initial leave balances from company settings (default to 0 if not configured)
  const initialLeaveBalances: Record<string, number> = {};
  for (const key of Object.keys(leavePolicy)) {
    initialLeaveBalances[key] = leavePolicy[key] ?? 0;
  }

  const userDoc = firestore.collection(USERS_COLLECTION).doc(uid);

  await userDoc.set({
    userId: uid,
    email,
    fullName,
    department: department ?? null,
    position: position ?? null,
    phoneNumber: phoneNumber ?? null,
    role: 'employee',
    isActive: true,
    createdAt: nowTimestamp(),
    updatedAt: nowTimestamp(),
    createdBy: performedBy,
    ...initialLeaveBalances,
    ...(leaveBalances ?? {}),
  });

  return { uid };
};

export const updateEmployee = async (input: UpdateEmployeeInput) => {
  const { uid, fullName, department, position, phoneNumber, leaveBalances } = input;

  const updates: Record<string, unknown> = {
    updatedAt: nowTimestamp(),
  };

  if (fullName !== undefined) updates.fullName = fullName;
  if (department !== undefined) updates.department = department;
  if (position !== undefined) updates.position = position;
  if (phoneNumber !== undefined) updates.phoneNumber = phoneNumber;

  if (leaveBalances) {
    for (const [key, value] of Object.entries(leaveBalances)) {
      if (typeof value === 'number' && value >= 0) {
        updates[key] = value;
      }
    }
  }

  if (fullName !== undefined || phoneNumber !== undefined) {
    await admin.auth().updateUser(uid, {
      displayName: fullName,
      phoneNumber: phoneNumber ?? undefined,
    });
  }

  await firestore.collection(USERS_COLLECTION).doc(uid).set(updates, { merge: true });
};

export const toggleUserStatus = async (uid: string, disable: boolean) => {
  await admin.auth().updateUser(uid, { disabled: disable });
  await firestore.collection(USERS_COLLECTION).doc(uid).set(
    {
      isActive: !disable,
      updatedAt: nowTimestamp(),
    },
    { merge: true }
  );
};


