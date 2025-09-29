import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { admin } from './firebase';
import { assertAdmin, requireAuthUid, CallableContext, assertAuthenticated } from './utils/auth';
import { assertPayload, assertString, assertEmail, assertBoolean } from './utils/validators';
import {
  createEmployee as createEmployeeService,
  updateEmployee as updateEmployeeService,
  toggleUserStatus as toggleUserStatusService,
  DEFAULT_LEAVE_KEYS,
} from './services/users';
import { setManualAttendance, ManualAttendanceInput } from './services/attendance';
import { handleLeaveApproval as handleLeaveApprovalService } from './services/leaves';
import { updateCompanySettings as updateCompanySettingsService } from './services/settings';
import {
  waivePenalty as waivePenaltyService,
  calculateMonthlyViolations as calculateMonthlyViolationsService,
} from './services/penalties';
import {
  generateAttendanceReport as generateAttendanceReportService,
  getDashboardStats as getDashboardStatsService,
  aggregateDailyAttendance,
  aggregateMonthlyAttendance,
} from './services/analytics';
import {
  queueNotification,
  queueBulkNotifications,
  getEmployeesNeedingClockInReminder,
  getEmployeesWithPendingActions,
  getActiveEmployees,
} from './services/notifications';
import { handleClockIn as handleClockInService } from './services/clockInUtils';
import { recordAuditLog } from './services/audit';

type SupportedRole = 'admin' | 'employee';

interface SetUserRolePayload {
  uid?: string;
  email?: string;
  role: SupportedRole;
}

const allowedRoles: SupportedRole[] = ['admin', 'employee'];

const extractLeaveBalances = (
  input: unknown
): Partial<Record<typeof DEFAULT_LEAVE_KEYS[number], number>> | undefined => {
  if (!input || typeof input !== 'object') {
    return undefined;
  }

  const result: Partial<Record<typeof DEFAULT_LEAVE_KEYS[number], number>> = {};

  DEFAULT_LEAVE_KEYS.forEach((key) => {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === 'number' && value >= 0) {
      result[key] = value;
    }
  });

  return Object.keys(result).length > 0 ? result : undefined;
};

export const setUserRole = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);

  const rawPayload = assertPayload<Record<string, unknown>>(data, 'A payload with uid/email and role is required.');
  const payload: SetUserRolePayload = {
    uid: rawPayload.uid as string | undefined,
    email: rawPayload.email as string | undefined,
    role: rawPayload.role as SupportedRole,
  };
  const { uid, email, role } = payload;

  if (!role || !allowedRoles.includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Role must be one of: ${allowedRoles.join(', ')}.`
    );
  }

  if (!uid && !email) {
    throw new functions.https.HttpsError('invalid-argument', 'Provide either uid or email to identify the user.');
  }

  let userRecord: admin.auth.UserRecord;

  try {
    if (uid) {
      userRecord = await admin.auth().getUser(uid);
    } else if (email) {
      userRecord = await admin.auth().getUserByEmail(email);
    } else {
      throw new functions.https.HttpsError('invalid-argument', 'Unable to resolve target user.');
    }
  } catch (error) {
    throw new functions.https.HttpsError('not-found', 'The specified user does not exist.');
  }

  if (userRecord.customClaims?.role === 'admin' && role !== 'admin') {
    const adminsSnap = await admin
      .firestore()
      .collection('USERS')
      .where('role', '==', 'admin')
      .count()
      .get();

    if (adminsSnap.data().count <= 1) {
      throw new functions.https.HttpsError('failed-precondition', 'At least one admin must remain.');
    }
  }

  const mergedClaims = { ...(userRecord.customClaims ?? {}), role };

  await admin.auth().setCustomUserClaims(userRecord.uid, mergedClaims);

  const performedBy = requireAuthUid(ctx);

  try {
    await admin
      .firestore()
      .collection('USERS')
      .doc(userRecord.uid)
      .set(
        {
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: performedBy,
        },
        { merge: true }
      );
  } catch (error) {
    functions.logger.warn('Failed to sync role to Firestore USERS collection', error);
  }

  functions.logger.info('Role updated', {
    targetUid: userRecord.uid,
    newRole: role,
    performedBy,
  });

  return {
    success: true,
    message: `Role for ${userRecord.uid} set to ${role}.`,
  };
});

export const createEmployee = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const email = assertEmail(payload.email);
  const password = assertString(payload.password, 'password', { min: 8, max: 64 });
  const fullName = assertString(payload.fullName, 'fullName', { min: 2, max: 120 });

  const department = payload.department ? assertString(payload.department, 'department', { max: 80 }) : undefined;
  const position = payload.position ? assertString(payload.position, 'position', { max: 80 }) : undefined;
  const phoneNumber = payload.phoneNumber
    ? assertString(payload.phoneNumber, 'phoneNumber', { max: 20 })
    : undefined;

  const leaveBalances = extractLeaveBalances(payload.leaveBalances);

  const { uid } = await createEmployeeService(
    {
      email,
      password,
      fullName,
      department,
      position,
      phoneNumber,
      leaveBalances,
    },
    requireAuthUid(ctx)
  );

  await recordAuditLog({
    action: 'create_employee',
    resource: 'USERS',
    resourceId: uid,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: { email, fullName, department, position },
  });

  return { uid };
});

export const updateEmployee = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const uid = assertString(payload.uid, 'uid');

  const fullName = payload.fullName ? assertString(payload.fullName, 'fullName', { min: 2, max: 120 }) : undefined;
  const department = payload.department
    ? assertString(payload.department, 'department', { max: 80 })
    : undefined;
  const position = payload.position ? assertString(payload.position, 'position', { max: 80 }) : undefined;
  const phoneNumber = payload.phoneNumber
    ? assertString(payload.phoneNumber, 'phoneNumber', { max: 20 })
    : undefined;

  const leaveBalances = extractLeaveBalances(payload.leaveBalances);

  await updateEmployeeService({
    uid,
    fullName,
    department,
    position,
    phoneNumber,
    leaveBalances,
  });

  await recordAuditLog({
    action: 'update_employee',
    resource: 'USERS',
    resourceId: uid,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: {
      fullName,
      department,
      position,
      phoneNumber,
      leaveBalances,
    },
  });

  return { success: true };
});

export const toggleUserStatus = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const uid = assertString(payload.uid, 'uid');
  const disable = !assertBoolean(payload.enable, 'enable');

  await toggleUserStatusService(uid, disable);

  await recordAuditLog({
    action: 'toggle_user_status',
    resource: 'USERS',
    resourceId: uid,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: {
      isActive: !disable,
    },
  });

  return { success: true };
});

export const manualSetAttendance = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);

  const userId = assertString(payload.userId, 'userId');
  const attendanceDate = assertString(payload.attendanceDate, 'attendanceDate');
  const status = assertString(payload.status, 'status');
  const reason = assertString(payload.reason, 'reason', { min: 5, max: 255 });

  await setManualAttendance({
    userId,
    attendanceDate,
    status,
    checks: Array.isArray(payload.checks)
      ? (payload.checks as ManualAttendanceInput['checks'])
      : undefined,
    isManualEntry: true,
    notes: payload.notes as string | undefined,
    reason,
    performedBy: requireAuthUid(ctx),
  });

  await recordAuditLog({
    action: 'manual_set_attendance',
    resource: 'ATTENDANCE_RECORDS',
    resourceId: `${userId}_${attendanceDate}`,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    reason,
    newValues: {
      status,
      notes: payload.notes,
    },
  });

  return { success: true };
});

export const handleLeaveApproval = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const requestId = assertString(payload.requestId, 'requestId');
  const action = assertString(payload.action, 'action');
  if (!['approve', 'reject'].includes(action)) {
    throw new functions.https.HttpsError('invalid-argument', 'Action must be approve or reject.');
  }

  try {
    await handleLeaveApprovalService({
      requestId,
      action: action as 'approve' | 'reject',
      reviewerId: requireAuthUid(ctx),
      notes: payload.notes as string | undefined,
    });
  } catch (error) {
    throw new functions.https.HttpsError('failed-precondition', (error as Error).message);
  }

  await recordAuditLog({
    action: `leave_${action}`,
    resource: 'LEAVE_REQUESTS',
    resourceId: requestId,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    reason: (payload.notes as string | undefined) ?? undefined,
  });

  return { success: true };
});

export const updateCompanySettings = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);

  await updateCompanySettingsService(payload, requireAuthUid(ctx));

  await recordAuditLog({
    action: 'update_company_settings',
    resource: 'COMPANY_SETTINGS',
    resourceId: 'main',
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: payload,
  });

  return { success: true };
});

export const waivePenalty = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const penaltyId = assertString(payload.penaltyId, 'penaltyId');
  const waivedReason = assertString(payload.waivedReason, 'waivedReason', { min: 5, max: 200 });

  await waivePenaltyService({
    penaltyId,
    waivedReason,
    performedBy: requireAuthUid(ctx),
  });

  await recordAuditLog({
    action: 'waive_penalty',
    resource: 'PENALTIES',
    resourceId: penaltyId,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    reason: waivedReason,
  });

  return { success: true };
});

export const calculateMonthlyViolations = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const month = assertString(payload.month, 'month');

  const result = await calculateMonthlyViolationsService({
    month,
    userId: payload.userId as string | undefined,
  });

  await recordAuditLog({
    action: 'calculate_monthly_violations',
    resource: 'VIOLATION_HISTORY',
    resourceId: month,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    metadata: { result },
  });

  return result;
});

export const generateAttendanceReport = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const startDate = assertString(payload.startDate, 'startDate');
  const endDate = assertString(payload.endDate, 'endDate');

  const result = await generateAttendanceReportService({
    startDate,
    endDate,
    userId: payload.userId as string | undefined,
    department: payload.department as string | undefined,
  });

  await recordAuditLog({
    action: 'generate_attendance_report',
    resource: 'ATTENDANCE_RECORDS',
    resourceId: `${startDate}_${endDate}`,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    metadata: { total: result.total },
  });

  return result;
});

export const getDashboardStats = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const date = assertString(payload.date, 'date');

  const result = await getDashboardStatsService({ date });

  return result;
});

export const sendNotification = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const userId = assertString(payload.userId, 'userId');
  const title = assertString(payload.title, 'title');
  const message = assertString(payload.message, 'message');

  await queueNotification({
    userId,
    title,
    message,
    category: payload.category as string | undefined,
    type: payload.type as string | undefined,
    relatedId: payload.relatedId as string | undefined,
    metadata: payload.metadata as Record<string, unknown> | undefined,
  });

  await recordAuditLog({
    action: 'send_notification',
    resource: 'NOTIFICATIONS',
    resourceId: userId,
    status: 'success',
    performedBy: requireAuthUid(ctx),
    newValues: { title, message },
  });

  return { success: true };
});

export const sendBulkNotification = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAdmin(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const userIds = payload.userIds as string[];
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'userIds must be a non-empty array.');
  }

  const title = assertString(payload.title, 'title');
  const message = assertString(payload.message, 'message');

  const result = await queueBulkNotifications({
    userIds,
    userId: '',
    title,
    message,
    category: payload.category as string | undefined,
    type: payload.type as string | undefined,
    relatedId: payload.relatedId as string | undefined,
    metadata: payload.metadata as Record<string, unknown> | undefined,
  });

  await recordAuditLog({
    action: 'send_bulk_notification',
    resource: 'NOTIFICATIONS',
    resourceId: 'bulk',
    status: 'success',
    performedBy: requireAuthUid(ctx),
    metadata: { count: result.count },
  });

  return result;
});

export const handleClockIn = functions.https.onCall(async (data, context) => {
  const ctx = (context as unknown) as CallableContext;
  assertAuthenticated(ctx);
  const payload = assertPayload<Record<string, unknown>>(data);
  const userId = requireAuthUid(ctx);

  const latitude = payload.latitude as number;
  const longitude = payload.longitude as number;
  const isMocked = payload.isMocked as boolean | undefined;
  const timestamp = payload.timestamp as string | undefined;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Valid latitude and longitude are required.');
  }

  const clockInTimestamp = timestamp ?? new Date().toISOString();

  const result = await handleClockInService({
    userId,
    payload: {
      timestamp: clockInTimestamp,
      location: { latitude, longitude },
      isMocked,
    },
  });

  return result;
});

export const scheduledPenaltyAutomation = onSchedule(
  {
    schedule: '0 2 1 * *',
    timeZone: 'UTC',
  },
  async () => {
    const now = new Date();
    const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    await calculateMonthlyViolationsService({ month });
  }
);

export const scheduledDailyClockInReminder = onSchedule(
  {
    schedule: '30 8 * * *',
    timeZone: 'UTC',
  },
  async () => {
    const today = new Date();
    const dateKey = today.toISOString().slice(0, 10);
    const targets = await getEmployeesNeedingClockInReminder(dateKey);
    if (targets.length === 0) {
      return;
    }

    await queueBulkNotifications({
      userIds: targets,
      userId: '',
      title: 'Clock-In Reminder',
      message: 'Friendly reminder: please clock in for today.',
      category: 'attendance',
      metadata: { dateKey },
    });
  }
);

export const scheduledPendingActionDigest = onSchedule(
  {
    schedule: '0 14 * * *',
    timeZone: 'UTC',
  },
  async () => {
    const admins = await getEmployeesWithPendingActions();
    if (admins.length === 0) {
      return;
    }

    await queueBulkNotifications({
      userIds: admins,
      userId: '',
      title: 'Pending Approvals',
      message: 'You have pending leave requests awaiting review.',
      category: 'admin',
    });
  }
);

export const scheduledDailyAnalyticsSync = onSchedule(
  {
    schedule: '15 0 * * *',
    timeZone: 'UTC',
  },
  async () => {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const dateKey = yesterday.toISOString().slice(0, 10);
    await aggregateDailyAttendance(dateKey);
  }
);

export const scheduledMonthlyAnalyticsSync = onSchedule(
  {
    schedule: '30 1 1 * *',
    timeZone: 'UTC',
  },
  async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    const monthKey = `${lastMonth.getUTCFullYear()}-${String(lastMonth.getUTCMonth() + 1).padStart(2, '0')}`;
    await aggregateMonthlyAttendance(monthKey);
  }
);
