import * as functions from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { admin } from './firebase';
import type * as firebaseAdmin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { assertAdmin, requireAuthUid, CallableContext, assertAuthenticated, assertEmployee } from './utils/auth';
import { assertAdmin as assertAdminV2, assertEmployee as assertEmployeeV2, assertAuthenticated as assertAuthenticatedV2, requireAuthUid as requireAuthUidV2 } from './utils/authV2';
import { wrapCallable } from './utils/callableWrapper';
import { assertPayload, assertString, assertEmail, assertBoolean } from './utils/validators';
import {
  createEmployee as createEmployeeService,
  updateEmployee as updateEmployeeService,
  toggleUserStatus as toggleUserStatusService,
  DEFAULT_LEAVE_KEYS,
} from './services/users';
import { setManualAttendance, ManualAttendanceInput } from './services/attendance';
import {
  handleLeaveApproval as handleLeaveApprovalService,
  submitLeaveRequest as submitLeaveRequestService,
  cancelLeaveRequest as cancelLeaveRequestService,
  listEmployeeLeaves as listEmployeeLeavesService,
} from './services/leaves';
import {
  generateLeaveAttachmentUploadUrl as generateLeaveAttachmentUploadUrlService,
  registerLeaveAttachment as registerLeaveAttachmentService,
} from './services/leaveAttachments';
import { updateCompanySettings as updateCompanySettingsService } from './services/settings';
import {
  waivePenalty as waivePenaltyService,
  calculateMonthlyViolations as calculateMonthlyViolationsService,
  listEmployeePenalties as listEmployeePenaltiesService,
  acknowledgePenalty as acknowledgePenaltyService,
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
  listNotificationsForEmployee as listNotificationsForEmployeeService,
  markNotificationAsRead as markNotificationAsReadService,
} from './services/notifications';
import { registerDeviceToken as registerDeviceTokenService } from './services/deviceTokens';
import { handleClockIn as handleClockInService } from './services/clockInUtils';
import {
  fetchEmployeeProfile,
  fetchEmployeeDashboard,
  fetchCompanySettingsPublic,
} from './services/employees';
import {
  listEmployeeAttendance as listEmployeeAttendanceService,
  getAttendanceDayDetail as getAttendanceDayDetailService,
} from './services/attendanceHistory';
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

export const setUserRole = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);

    const rawPayload = assertPayload<Record<string, unknown>>(request.data, 'A payload with uid/email and role is required.');
    const payload: SetUserRolePayload = {
      uid: rawPayload.uid as string | undefined,
      email: rawPayload.email as string | undefined,
      role: rawPayload.role as SupportedRole,
    };
    const { uid, email, role } = payload;

    if (!role || !allowedRoles.includes(role)) {
      throw new HttpsError(
        'invalid-argument',
        `Role must be one of: ${allowedRoles.join(', ')}.`
      );
    }

    if (!uid && !email) {
      throw new HttpsError('invalid-argument', 'Provide either uid or email to identify the user.');
    }

    let userRecord: firebaseAdmin.auth.UserRecord;

    try {
      if (uid) {
        userRecord = await admin.auth().getUser(uid);
      } else if (email) {
        userRecord = await admin.auth().getUserByEmail(email);
      } else {
        throw new HttpsError('invalid-argument', 'Unable to resolve target user.');
      }
    } catch (error) {
      throw new HttpsError('not-found', 'The specified user does not exist.');
    }

    if (userRecord.customClaims?.role === 'admin' && role !== 'admin') {
      const adminsSnap = await admin
        .firestore()
        .collection('USERS')
        .where('role', '==', 'admin')
        .count()
        .get();

      if (adminsSnap.data().count <= 1) {
        throw new HttpsError('failed-precondition', 'At least one admin must remain.');
      }
    }

    const mergedClaims = { ...(userRecord.customClaims ?? {}), role };

    await admin.auth().setCustomUserClaims(userRecord.uid, mergedClaims);

    const performedBy = requireAuthUidV2(request);

    try {
      await admin
        .firestore()
        .collection('USERS')
        .doc(userRecord.uid)
        .set(
          {
            role,
            updatedAt: FieldValue.serverTimestamp(),
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
  }, 'setUserRole')
);

export const createEmployee = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
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
      requireAuthUidV2(request)
    );

    await recordAuditLog({
      action: 'create_employee',
      resource: 'USERS',
      resourceId: uid,
      status: 'success',
      performedBy: requireAuthUidV2(request),
      newValues: { email, fullName, department, position },
    });

    return { uid };
  }, 'createEmployee')
);

export const updateEmployee = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
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
      performedBy: requireAuthUidV2(request),
      newValues: {
        fullName,
        department,
        position,
        phoneNumber,
        leaveBalances,
      },
    });

    return { success: true };
  }, 'updateEmployee')
);

export const toggleUserStatus = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const uid = assertString(payload.uid, 'uid');
    const disable = !assertBoolean(payload.enable, 'enable');

    await toggleUserStatusService(uid, disable);

    await recordAuditLog({
      action: 'toggle_user_status',
      resource: 'USERS',
      resourceId: uid,
      status: 'success',
      performedBy: requireAuthUidV2(request),
      newValues: {
        isActive: !disable,
      },
    });

    return { success: true };
  }, 'toggleUserStatus')
);

export const manualSetAttendance = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);

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
      performedBy: requireAuthUidV2(request),
    });

    await recordAuditLog({
      action: 'manual_set_attendance',
      resource: 'ATTENDANCE_RECORDS',
      resourceId: `${userId}_${attendanceDate}`,
      status: 'success',
      performedBy: requireAuthUidV2(request),
      reason,
      newValues: {
        status,
        notes: payload.notes,
      },
    });

    return { success: true };
  }, 'manualSetAttendance')
);

export const handleLeaveApproval = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const requestId = assertString(payload.requestId, 'requestId');
    const action = assertString(payload.action, 'action');
    if (!['approve', 'reject'].includes(action)) {
      throw new HttpsError('invalid-argument', 'Action must be approve or reject.');
    }

    try {
      await handleLeaveApprovalService({
        requestId,
        action: action as 'approve' | 'reject',
        reviewerId: requireAuthUidV2(request),
        notes: payload.notes as string | undefined,
      });
    } catch (error) {
      throw new HttpsError('failed-precondition', (error as Error).message);
    }

    await recordAuditLog({
      action: `leave_${action}`,
      resource: 'LEAVE_REQUESTS',
      resourceId: requestId,
      status: 'success',
      performedBy: requireAuthUidV2(request),
      reason: (payload.notes as string | undefined) ?? undefined,
    });

    return { success: true };
  }, 'handleLeaveApproval')
);

export const updateCompanySettings = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);

    await updateCompanySettingsService(payload, requireAuthUidV2(request));

    await recordAuditLog({
      action: 'update_company_settings',
      resource: 'COMPANY_SETTINGS',
      resourceId: 'main',
      status: 'success',
      performedBy: requireAuthUidV2(request),
      newValues: payload,
    });

    return { success: true };
  }, 'updateCompanySettings')
);

export const waivePenalty = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const penaltyId = assertString(payload.penaltyId, 'penaltyId');
    const waivedReason = assertString(payload.waivedReason, 'waivedReason', { min: 5, max: 200 });

    await waivePenaltyService({
      penaltyId,
      waivedReason,
      performedBy: requireAuthUidV2(request),
    });

    await recordAuditLog({
      action: 'waive_penalty',
      resource: 'PENALTIES',
      resourceId: penaltyId,
      status: 'success',
      performedBy: requireAuthUidV2(request),
      reason: waivedReason,
    });

    return { success: true };
  }, 'waivePenalty')
);

export const calculateMonthlyViolations = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
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
      performedBy: requireAuthUidV2(request),
      metadata: { result },
    });

    return result;
  }, 'calculateMonthlyViolations')
);

export const generateAttendanceReport = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
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
      performedBy: requireAuthUidV2(request),
      metadata: { total: result.total },
    });

    return result;
  }, 'generateAttendanceReport')
);

export const getDashboardStats = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const date = assertString(payload.date, 'date');

    const result = await getDashboardStatsService({ date });

    return result;
  }, 'getDashboardStats')
);

export const sendNotification = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
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
      performedBy: requireAuthUidV2(request),
      newValues: { title, message },
    });

    return { success: true };
  }, 'sendNotification')
);

export const sendBulkNotification = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const userIds = payload.userIds as string[];
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new HttpsError('invalid-argument', 'userIds must be a non-empty array.');
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
      performedBy: requireAuthUidV2(request),
      metadata: { count: result.count },
    });

    return result;
  }, 'sendBulkNotification')
);

export const handleClockIn = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAuthenticatedV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data);
    const userId = requireAuthUidV2(request);

    const latitude = payload.latitude as number;
    const longitude = payload.longitude as number;
    const isMocked = payload.isMocked as boolean | undefined;
    const timestamp = payload.timestamp as string | undefined;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw new HttpsError('invalid-argument', 'Valid latitude and longitude are required.');
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
  }, 'handleClockIn')
);

export const getEmployeeProfile = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const userId = requireAuthUidV2(request);

    const profile = await fetchEmployeeProfile(userId);

    return profile;
  }, 'getEmployeeProfile')
);

export const getEmployeeDashboard = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = request.data ? assertPayload<Record<string, unknown>>(request.data) : {};
    const userId = requireAuthUidV2(request);

    const date = typeof payload.date === 'string' ? payload.date : undefined;

    const summary = await fetchEmployeeDashboard(userId, date);

    return summary;
  }, 'getEmployeeDashboard')
);

export const getCompanySettingsPublic = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);

    const settings = await fetchCompanySettingsPublic();

    return settings;
  }, 'getCompanySettingsPublic')
);

export const listEmployeeAttendance = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const limit = payload.limit as number | undefined;
    const cursor = payload.cursor as string | undefined;
    const startDate = payload.startDate as string | undefined;
    const endDate = payload.endDate as string | undefined;

    const result = await listEmployeeAttendanceService({
      userId,
      limit,
      cursor,
      startDate,
      endDate,
    });

    return result;
  }, 'listEmployeeAttendance')
);

export const getAttendanceDayDetail = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const date = assertString(payload.date, 'date');

    const detail = await getAttendanceDayDetailService({
      userId,
      date,
    });

    return detail;
  }, 'getAttendanceDayDetail')
);

export const submitLeaveRequest = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const leaveType = assertString(payload.leaveType, 'leaveType');
    const startDate = assertString(payload.startDate, 'startDate');
    const endDate = assertString(payload.endDate, 'endDate');
    const reason = assertString(payload.reason, 'reason', { min: 5, max: 500 });
    const attachmentId = payload.attachmentId ? assertString(payload.attachmentId, 'attachmentId') : undefined;

    const result = await submitLeaveRequestService({
      userId,
      leaveType,
      startDate,
      endDate,
      reason,
      attachmentId,
    });

    return result;
  }, 'submitLeaveRequest')
);

export const cancelLeaveRequest = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const requestId = assertString(payload.requestId, 'requestId');

    const result = await cancelLeaveRequestService({
      userId,
      requestId,
    });

    return result;
  }, 'cancelLeaveRequest')
);

export const listEmployeeLeaves = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const status = payload.status ? assertString(payload.status, 'status') : undefined;
    const limit = payload.limit as number | undefined;
    const cursor = payload.cursor as string | undefined;

    const result = await listEmployeeLeavesService({
      userId,
      status: status as 'pending' | 'approved' | 'rejected' | 'cancelled' | undefined,
      limit,
      cursor,
    });

    return result;
  }, 'listEmployeeLeaves')
);

export const generateLeaveAttachmentUploadUrl = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const fileName = assertString(payload.fileName, 'fileName', { min: 1, max: 255 });
    const mimeType = assertString(payload.mimeType, 'mimeType', { min: 3, max: 255 });
    const sizeBytes = payload.sizeBytes as number | undefined;

    const result = await generateLeaveAttachmentUploadUrlService({
      userId,
      fileName,
      mimeType,
      sizeBytes,
    });

    await recordAuditLog({
      action: 'generate_leave_attachment_upload_url',
      resource: 'LEAVE_ATTACHMENTS',
      resourceId: result.attachmentId,
      status: 'success',
      performedBy: userId,
      metadata: { fileName, mimeType, sizeBytes },
    });

    return result;
  }, 'generateLeaveAttachmentUploadUrl')
);

export const registerLeaveAttachment = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const attachmentId = assertString(payload.attachmentId, 'attachmentId');

    const result = await registerLeaveAttachmentService({
      userId,
      attachmentId,
    });

    await recordAuditLog({
      action: 'register_leave_attachment',
      resource: 'LEAVE_ATTACHMENTS',
      resourceId: attachmentId,
      status: 'success',
      performedBy: userId,
    });

    return result;
  }, 'registerLeaveAttachment')
);

export const listEmployeeNotifications = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const limit = typeof payload.limit === 'number' ? payload.limit : 20;
    const cursor = typeof payload.cursor === 'string' ? payload.cursor : undefined;
    const status = typeof payload.status === 'string' && (payload.status === 'read' || payload.status === 'unread')
      ? payload.status
      : undefined;

    const result = await listNotificationsForEmployeeService({
      userId,
      limit,
      cursor,
      status,
    });

    await recordAuditLog({
      action: 'list_employee_notifications',
      resource: 'NOTIFICATIONS',
      resourceId: userId,
      status: 'success',
      performedBy: userId,
    });

    return result;
  }, 'listEmployeeNotifications')
);

export const markNotificationRead = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const notificationId = assertString(payload.notificationId, 'notificationId');

    const result = await markNotificationAsReadService({
      userId,
      notificationId,
      acknowledgment: payload.acknowledgment as string | undefined,
    });

    await recordAuditLog({
      action: 'mark_notification_read',
      resource: 'NOTIFICATIONS',
      resourceId: notificationId,
      status: 'success',
      performedBy: userId,
      metadata: {
        acknowledgment: payload.acknowledgment ?? null,
      },
    });

    return result;
  }, 'markNotificationRead')
);

export const listEmployeePenalties = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const limit = typeof payload.limit === 'number' ? payload.limit : 20;
    const cursor = typeof payload.cursor === 'string' ? payload.cursor : undefined;
    const status = typeof payload.status === 'string' ? payload.status : undefined;

    const result = await listEmployeePenaltiesService({
      userId,
      limit,
      cursor,
      status,
    });

    await recordAuditLog({
      action: 'list_employee_penalties',
      resource: 'PENALTIES',
      resourceId: userId,
      status: 'success',
      performedBy: userId,
    });

    return result;
  }, 'listEmployeePenalties')
);

export const acknowledgePenalty = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const penaltyId = assertString(payload.penaltyId, 'penaltyId');
    const note = typeof payload.note === 'string' ? payload.note : undefined;

    const result = await acknowledgePenaltyService({
      userId,
      penaltyId,
      note,
    });

    await recordAuditLog({
      action: 'acknowledge_penalty',
      resource: 'PENALTIES',
      resourceId: penaltyId,
      status: 'success',
      performedBy: userId,
      metadata: { note: note ?? null },
    });

    return result;
  }, 'acknowledgePenalty')
);

export const registerDeviceToken = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertEmployeeV2(request);
    const payload = assertPayload<Record<string, unknown>>(request.data ?? {});
    const userId = requireAuthUidV2(request);

    const token = assertString(payload.token, 'token');
    const platform = assertString(payload.platform, 'platform');
    const deviceId = assertString(payload.deviceId, 'deviceId');

    await registerDeviceTokenService({
      userId,
      token,
      platform,
      deviceId,
      metadata: payload.metadata as Record<string, unknown> | undefined,
    });

    await recordAuditLog({
      action: 'register_device_token',
      resource: 'DEVICE_TOKENS',
      resourceId: `${userId}:${deviceId}`,
      status: 'success',
      performedBy: userId,
      metadata: {
        platform,
      },
    });

    return { success: true };
  }, 'registerDeviceToken')
);

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
    schedule: '30 8,13,17 * * *',
    timeZone: 'UTC',
  },
  async (event) => {
    const runDate = event.scheduleTime ? new Date(event.scheduleTime) : new Date();
    const dateKey = runDate.toISOString().slice(0, 10);
    const hour = runDate.getUTCHours();

    const slot = hour < 10 ? 'check1' : hour < 16 ? 'check2' : 'check3';
    const targets = await getEmployeesNeedingClockInReminder(dateKey, slot);
    if (targets.length === 0) {
      return;
    }

    const reminderMessages: Record<typeof slot, { title: string; message: string }> = {
      check1: {
        title: 'Morning Clock-In Reminder',
        message: 'Good morning! Please remember to clock in to start your day.',
      },
      check2: {
        title: 'Midday Clock-In Reminder',
        message: 'Lunch break wrap-up! Clock in to confirm your return.',
      },
      check3: {
        title: 'End-of-Day Clock-Out Reminder',
        message: 'Heading out? Don’t forget to clock out before you leave.',
      },
    };

    const { title, message } = reminderMessages[slot];

    await queueBulkNotifications({
      userIds: targets,
      userId: '',
      title,
      message,
      category: 'attendance',
      metadata: { dateKey, slot },
    });
  }
);

export const triggerDailyAnalyticsAggregation = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - 1);
    const dateKey = date.toISOString().slice(0, 10);

    const result = await aggregateDailyAttendance(dateKey);

    await recordAuditLog({
      action: 'aggregate_daily_analytics',
      resource: 'ANALYTICS_SUMMARY',
      resourceId: dateKey,
      status: 'success',
      performedBy: requireAuthUidV2(request),
    });

    return result;
  }, 'triggerDailyAnalyticsAggregation')
);

export const triggerMonthlyAnalyticsAggregation = onCall(
  wrapCallable(async (request: CallableRequest<Record<string, unknown>>) => {
    assertAdminV2(request);
    const now = new Date();
    now.setUTCMonth(now.getUTCMonth() - 1);
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const result = await aggregateMonthlyAttendance(monthKey);

    await recordAuditLog({
      action: 'aggregate_monthly_analytics',
      resource: 'ANALYTICS_SUMMARY',
      resourceId: monthKey,
      status: 'success',
      performedBy: requireAuthUidV2(request),
    });

    return result;
  }, 'triggerMonthlyAnalyticsAggregation')
);
