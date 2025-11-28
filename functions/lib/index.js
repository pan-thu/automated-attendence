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
exports.cleanupTestData = exports.seedTestData = exports.recordTelemetryEvent = exports.triggerMonthlyAnalyticsAggregation = exports.triggerDailyAnalyticsAggregation = exports.scheduledDailyClockInReminder = exports.calculateDailyViolations = exports.finalizeAttendance = exports.scheduledDailyPenaltyCalculation = exports.scheduledPenaltyAutomation = exports.registerDeviceToken = exports.getPenaltySummary = exports.acknowledgePenalty = exports.listEmployeePenalties = exports.markAllNotificationsAsRead = exports.markNotificationRead = exports.listEmployeeNotifications = exports.getLeaveAttachmentDownloadUrl = exports.registerLeaveAttachment = exports.generateLeaveAttachmentUploadUrl = exports.getLeaveBalance = exports.listEmployeeLeaves = exports.cancelLeaveRequest = exports.submitLeaveRequest = exports.getHolidays = exports.getAttendanceDayDetail = exports.listEmployeeAttendance = exports.updateOwnPassword = exports.registerProfilePhoto = exports.generateProfilePhotoUploadUrl = exports.updateOwnProfile = exports.getOwnProfile = exports.getCompanySettingsPublic = exports.getEmployeeDashboard = exports.getEmployeeProfile = exports.handleClockIn = exports.sendBulkNotification = exports.sendNotification = exports.getDashboardStats = exports.generateAttendanceReport = exports.calculateMonthlyViolations = exports.waivePenalty = exports.updateCompanySettings = exports.handleLeaveApproval = exports.manualSetAttendance = exports.toggleUserStatus = exports.updateEmployee = exports.createEmployee = exports.setUserRole = void 0;
const functions = __importStar(require("firebase-functions"));
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firebase_1 = require("./firebase");
const firestore_1 = require("firebase-admin/firestore");
const authV2_1 = require("./utils/authV2");
const callableWrapper_1 = require("./utils/callableWrapper");
const rateLimiter_1 = require("./utils/rateLimiter");
const validators_1 = require("./utils/validators");
const users_1 = require("./services/users");
const attendance_1 = require("./services/attendance");
const leaves_1 = require("./services/leaves");
const leaveAttachments_1 = require("./services/leaveAttachments");
const settings_1 = require("./services/settings");
const penalties_1 = require("./services/penalties");
const analytics_1 = require("./services/analytics");
const notifications_1 = require("./services/notifications");
const holidays_1 = require("./services/holidays");
const deviceTokens_1 = require("./services/deviceTokens");
const clockInUtils_1 = require("./services/clockInUtils");
const employees_1 = require("./services/employees");
const attendanceHistory_1 = require("./services/attendanceHistory");
const audit_1 = require("./services/audit");
const profile_1 = require("./services/profile");
const allowedRoles = ['admin', 'employee'];
const extractLeaveBalances = (input) => {
    if (!input || typeof input !== 'object') {
        return undefined;
    }
    const result = {};
    users_1.DEFAULT_LEAVE_KEYS.forEach((key) => {
        const value = input[key];
        if (typeof value === 'number' && value >= 0) {
            result[key] = value;
        }
    });
    return Object.keys(result).length > 0 ? result : undefined;
};
exports.setUserRole = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const rawPayload = (0, validators_1.assertPayload)(request.data, 'A payload with uid/email and role is required.');
    const payload = {
        uid: rawPayload.uid,
        email: rawPayload.email,
        role: rawPayload.role,
    };
    const { uid, email, role } = payload;
    if (!role || !allowedRoles.includes(role)) {
        throw new https_1.HttpsError('invalid-argument', `Role must be one of: ${allowedRoles.join(', ')}.`);
    }
    if (!uid && !email) {
        throw new https_1.HttpsError('invalid-argument', 'Provide either uid or email to identify the user.');
    }
    let userRecord;
    try {
        if (uid) {
            userRecord = await firebase_1.admin.auth().getUser(uid);
        }
        else if (email) {
            userRecord = await firebase_1.admin.auth().getUserByEmail(email);
        }
        else {
            throw new https_1.HttpsError('invalid-argument', 'Unable to resolve target user.');
        }
    }
    catch (error) {
        throw new https_1.HttpsError('not-found', 'The specified user does not exist.');
    }
    if (userRecord.customClaims?.role === 'admin' && role !== 'admin') {
        const adminsSnap = await firebase_1.admin
            .firestore()
            .collection('USERS')
            .where('role', '==', 'admin')
            .count()
            .get();
        if (adminsSnap.data().count <= 1) {
            throw new https_1.HttpsError('failed-precondition', 'At least one admin must remain.');
        }
    }
    const mergedClaims = { ...(userRecord.customClaims ?? {}), role };
    await firebase_1.admin.auth().setCustomUserClaims(userRecord.uid, mergedClaims);
    const performedBy = (0, authV2_1.requireAuthUid)(request);
    try {
        await firebase_1.admin
            .firestore()
            .collection('USERS')
            .doc(userRecord.uid)
            .set({
            role,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy: performedBy,
        }, { merge: true });
    }
    catch (error) {
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
}, 'setUserRole', { rateLimit: rateLimiter_1.RATE_LIMITS.AUTH }));
exports.createEmployee = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const email = (0, validators_1.assertEmail)(payload.email);
    const password = (0, validators_1.assertString)(payload.password, 'password', { min: 8, max: 64 });
    const fullName = (0, validators_1.assertString)(payload.fullName, 'fullName', { min: 2, max: 120 });
    const department = payload.department ? (0, validators_1.assertString)(payload.department, 'department', { max: 80 }) : undefined;
    const position = payload.position ? (0, validators_1.assertString)(payload.position, 'position', { max: 80 }) : undefined;
    const phoneNumber = payload.phoneNumber
        ? (0, validators_1.assertString)(payload.phoneNumber, 'phoneNumber', { max: 20 })
        : undefined;
    const leaveBalances = extractLeaveBalances(payload.leaveBalances);
    const { uid } = await (0, users_1.createEmployee)({
        email,
        password,
        fullName,
        department,
        position,
        phoneNumber,
        leaveBalances,
    }, (0, authV2_1.requireAuthUid)(request));
    await (0, audit_1.recordAuditLog)({
        action: 'create_employee',
        resource: 'USERS',
        resourceId: uid,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        newValues: { email, fullName, department, position },
    });
    return { uid };
}, 'createEmployee', { rateLimit: rateLimiter_1.RATE_LIMITS.WRITE }));
exports.updateEmployee = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const uid = (0, validators_1.assertString)(payload.uid, 'uid');
    const fullName = payload.fullName ? (0, validators_1.assertString)(payload.fullName, 'fullName', { min: 2, max: 120 }) : undefined;
    const department = payload.department
        ? (0, validators_1.assertString)(payload.department, 'department', { max: 80 })
        : undefined;
    const position = payload.position ? (0, validators_1.assertString)(payload.position, 'position', { max: 80 }) : undefined;
    const phoneNumber = payload.phoneNumber
        ? (0, validators_1.assertString)(payload.phoneNumber, 'phoneNumber', { max: 20 })
        : undefined;
    const leaveBalances = extractLeaveBalances(payload.leaveBalances);
    await (0, users_1.updateEmployee)({
        uid,
        fullName,
        department,
        position,
        phoneNumber,
        leaveBalances,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'update_employee',
        resource: 'USERS',
        resourceId: uid,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        newValues: {
            fullName,
            department,
            position,
            phoneNumber,
            leaveBalances,
        },
    });
    return { success: true };
}, 'updateEmployee'));
exports.toggleUserStatus = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const uid = (0, validators_1.assertString)(payload.uid, 'uid');
    const disable = !(0, validators_1.assertBoolean)(payload.enable, 'enable');
    await (0, users_1.toggleUserStatus)(uid, disable);
    await (0, audit_1.recordAuditLog)({
        action: 'toggle_user_status',
        resource: 'USERS',
        resourceId: uid,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        newValues: {
            isActive: !disable,
        },
    });
    return { success: true };
}, 'toggleUserStatus'));
exports.manualSetAttendance = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const userId = (0, validators_1.assertString)(payload.userId, 'userId');
    const attendanceDate = (0, validators_1.assertString)(payload.attendanceDate, 'attendanceDate');
    const status = (0, validators_1.assertString)(payload.status, 'status');
    const reason = (0, validators_1.assertString)(payload.reason, 'reason', { min: 5, max: 255 });
    await (0, attendance_1.setManualAttendance)({
        userId,
        attendanceDate,
        status,
        checks: Array.isArray(payload.checks)
            ? payload.checks
            : undefined,
        isManualEntry: true,
        notes: payload.notes,
        reason,
        performedBy: (0, authV2_1.requireAuthUid)(request),
    });
    await (0, audit_1.recordAuditLog)({
        action: 'manual_set_attendance',
        resource: 'ATTENDANCE_RECORDS',
        resourceId: `${userId}_${attendanceDate}`,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        reason,
        newValues: {
            status,
            notes: payload.notes,
        },
    });
    return { success: true };
}, 'manualSetAttendance'));
exports.handleLeaveApproval = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const requestId = (0, validators_1.assertString)(payload.requestId, 'requestId');
    const action = (0, validators_1.assertString)(payload.action, 'action');
    if (!['approve', 'reject'].includes(action)) {
        throw new https_1.HttpsError('invalid-argument', 'Action must be approve or reject.');
    }
    try {
        await (0, leaves_1.handleLeaveApproval)({
            requestId,
            action: action,
            reviewerId: (0, authV2_1.requireAuthUid)(request),
            notes: payload.notes,
        });
    }
    catch (error) {
        throw new https_1.HttpsError('failed-precondition', error.message);
    }
    await (0, audit_1.recordAuditLog)({
        action: `leave_${action}`,
        resource: 'LEAVE_REQUESTS',
        resourceId: requestId,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        reason: payload.notes ?? undefined,
    });
    return { success: true };
}, 'handleLeaveApproval'));
exports.updateCompanySettings = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    await (0, settings_1.updateCompanySettings)(payload, (0, authV2_1.requireAuthUid)(request));
    // Convert workplace_center to GeoPoint for audit log to prevent serialization errors
    const auditPayload = { ...payload };
    if (auditPayload.workplace_center && typeof auditPayload.workplace_center === 'object') {
        const center = auditPayload.workplace_center;
        auditPayload.workplace_center = new firestore_1.GeoPoint(center.latitude, center.longitude);
    }
    await (0, audit_1.recordAuditLog)({
        action: 'update_company_settings',
        resource: 'COMPANY_SETTINGS',
        resourceId: 'main',
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        newValues: auditPayload,
    });
    return { success: true };
}, 'updateCompanySettings'));
exports.waivePenalty = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const penaltyId = (0, validators_1.assertString)(payload.penaltyId, 'penaltyId');
    const waivedReason = (0, validators_1.assertString)(payload.waivedReason, 'waivedReason', { min: 5, max: 200 });
    await (0, penalties_1.waivePenalty)({
        penaltyId,
        waivedReason,
        performedBy: (0, authV2_1.requireAuthUid)(request),
    });
    await (0, audit_1.recordAuditLog)({
        action: 'waive_penalty',
        resource: 'PENALTIES',
        resourceId: penaltyId,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        reason: waivedReason,
    });
    return { success: true };
}, 'waivePenalty'));
exports.calculateMonthlyViolations = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const month = (0, validators_1.assertString)(payload.month, 'month');
    const result = await (0, penalties_1.calculateMonthlyViolations)({
        month,
        userId: payload.userId,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'calculate_monthly_violations',
        resource: 'VIOLATION_HISTORY',
        resourceId: month,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { result },
    });
    return result;
}, 'calculateMonthlyViolations'));
exports.generateAttendanceReport = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const startDate = (0, validators_1.assertString)(payload.startDate, 'startDate');
    const endDate = (0, validators_1.assertString)(payload.endDate, 'endDate');
    const result = await (0, analytics_1.generateAttendanceReport)({
        startDate,
        endDate,
        userId: payload.userId,
        department: payload.department,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'generate_attendance_report',
        resource: 'ATTENDANCE_RECORDS',
        resourceId: `${startDate}_${endDate}`,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { total: result.total },
    });
    return result;
}, 'generateAttendanceReport'));
exports.getDashboardStats = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const date = (0, validators_1.assertString)(payload.date, 'date');
    const result = await (0, analytics_1.getDashboardStats)({ date });
    return result;
}, 'getDashboardStats'));
exports.sendNotification = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const userId = (0, validators_1.assertString)(payload.userId, 'userId');
    const title = (0, validators_1.assertString)(payload.title, 'title');
    const message = (0, validators_1.assertString)(payload.message, 'message');
    await (0, notifications_1.queueNotification)({
        userId,
        title,
        message,
        category: payload.category,
        type: payload.type,
        relatedId: payload.relatedId,
        metadata: payload.metadata,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'send_notification',
        resource: 'NOTIFICATIONS',
        resourceId: userId,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        newValues: { title, message },
    });
    return { success: true };
}, 'sendNotification'));
exports.sendBulkNotification = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const userIds = payload.userIds;
    if (!Array.isArray(userIds) || userIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'userIds must be a non-empty array.');
    }
    const title = (0, validators_1.assertString)(payload.title, 'title');
    const message = (0, validators_1.assertString)(payload.message, 'message');
    const result = await (0, notifications_1.queueBulkNotifications)({
        userIds,
        userId: '',
        title,
        message,
        category: payload.category,
        type: payload.type,
        relatedId: payload.relatedId,
        metadata: payload.metadata,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'send_bulk_notification',
        resource: 'NOTIFICATIONS',
        resourceId: 'bulk',
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { count: result.count },
    });
    return result;
}, 'sendBulkNotification'));
exports.handleClockIn = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const userId = (0, authV2_1.requireAuthUid)(request);
    const latitude = payload.latitude;
    const longitude = payload.longitude;
    const isMocked = payload.isMocked;
    const timestamp = payload.timestamp;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new https_1.HttpsError('invalid-argument', 'Valid latitude and longitude are required.');
    }
    const clockInTimestamp = timestamp ?? new Date().toISOString();
    const result = await (0, clockInUtils_1.handleClockIn)({
        userId,
        payload: {
            timestamp: clockInTimestamp,
            location: { latitude, longitude },
            isMocked,
        },
    });
    return result;
}, 'handleClockIn', { rateLimit: rateLimiter_1.RATE_LIMITS.CLOCK_IN }));
exports.getEmployeeProfile = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const userId = (0, authV2_1.requireAuthUid)(request);
    const profile = await (0, employees_1.fetchEmployeeProfile)(userId);
    return profile;
}, 'getEmployeeProfile'));
exports.getEmployeeDashboard = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = request.data ? (0, validators_1.assertPayload)(request.data) : {};
    const userId = (0, authV2_1.requireAuthUid)(request);
    // Validate date parameter if provided
    let date;
    if (payload.date !== undefined && payload.date !== null) {
        if (typeof payload.date !== 'string') {
            throw new https_1.HttpsError('invalid-argument', 'Date must be a string');
        }
        const dateStr = payload.date.trim();
        if (dateStr === '') {
            // Empty string is treated as no date provided
            date = undefined;
        }
        else {
            // Validate date format (YYYY-MM-DD)
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(dateStr)) {
                throw new https_1.HttpsError('invalid-argument', 'Date must be in YYYY-MM-DD format');
            }
            // Validate that it's a parseable date
            const testDate = new Date(dateStr);
            if (isNaN(testDate.getTime())) {
                throw new https_1.HttpsError('invalid-argument', 'Invalid date value');
            }
            date = dateStr;
        }
    }
    const summary = await (0, employees_1.fetchEmployeeDashboard)(userId, date);
    return summary;
}, 'getEmployeeDashboard'));
exports.getCompanySettingsPublic = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const settings = await (0, employees_1.fetchCompanySettingsPublic)();
    return settings;
}, 'getCompanySettingsPublic'));
exports.getOwnProfile = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const userId = (0, authV2_1.requireAuthUid)(request);
    const profile = await (0, profile_1.getOwnProfile)(userId);
    return profile;
}, 'getOwnProfile'));
exports.updateOwnProfile = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const fullName = payload.fullName ? (0, validators_1.assertString)(payload.fullName, 'fullName', { min: 2, max: 120 }) : undefined;
    const department = payload.department ? (0, validators_1.assertString)(payload.department, 'department', { max: 80 }) : undefined;
    const position = payload.position ? (0, validators_1.assertString)(payload.position, 'position', { max: 80 }) : undefined;
    const phoneNumber = payload.phoneNumber ? (0, validators_1.assertString)(payload.phoneNumber, 'phoneNumber', { max: 20 }) : undefined;
    const leaveBalances = extractLeaveBalances(payload.leaveBalances);
    await (0, profile_1.updateOwnProfile)(userId, {
        fullName,
        department,
        position,
        phoneNumber,
        leaveBalances,
    });
    // Filter out undefined values for audit log
    const auditNewValues = {};
    if (fullName !== undefined)
        auditNewValues.fullName = fullName;
    if (department !== undefined)
        auditNewValues.department = department;
    if (position !== undefined)
        auditNewValues.position = position;
    if (phoneNumber !== undefined)
        auditNewValues.phoneNumber = phoneNumber;
    await (0, audit_1.recordAuditLog)({
        action: 'update_own_profile',
        resource: 'USERS',
        resourceId: userId,
        status: 'success',
        performedBy: userId,
        newValues: Object.keys(auditNewValues).length > 0 ? auditNewValues : undefined,
    });
    return { success: true };
}, 'updateOwnProfile', { rateLimit: rateLimiter_1.RATE_LIMITS.WRITE }));
exports.generateProfilePhotoUploadUrl = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const fileName = (0, validators_1.assertString)(payload.fileName, 'fileName', { min: 1, max: 255 });
    const mimeType = (0, validators_1.assertString)(payload.mimeType, 'mimeType', { min: 3, max: 255 });
    const sizeBytes = payload.sizeBytes;
    const result = await (0, profile_1.generateProfilePhotoUploadUrl)({
        userId,
        fileName,
        mimeType,
        sizeBytes,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'generate_profile_photo_upload_url',
        resource: 'PROFILE_PHOTOS',
        resourceId: result.photoId,
        status: 'success',
        performedBy: userId,
        metadata: { fileName, mimeType, sizeBytes },
    });
    return result;
}, 'generateProfilePhotoUploadUrl'));
exports.registerProfilePhoto = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const photoId = (0, validators_1.assertString)(payload.photoId, 'photoId');
    const result = await (0, profile_1.registerProfilePhoto)({
        userId,
        photoId,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'register_profile_photo',
        resource: 'PROFILE_PHOTOS',
        resourceId: photoId,
        status: 'success',
        performedBy: userId,
        metadata: { photoURL: result.photoURL },
    });
    return result;
}, 'registerProfilePhoto'));
exports.updateOwnPassword = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const currentPassword = (0, validators_1.assertString)(payload.currentPassword, 'currentPassword', { min: 6 });
    const newPassword = (0, validators_1.assertString)(payload.newPassword, 'newPassword', { min: 6 });
    // Get user email for verification
    const user = await firebase_1.admin.auth().getUser(userId);
    if (!user.email) {
        throw new https_1.HttpsError('failed-precondition', 'User email not found.');
    }
    await (0, profile_1.updateOwnPassword)(userId, user.email, {
        currentPassword,
        newPassword,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'update_own_password',
        resource: 'USERS',
        resourceId: userId,
        status: 'success',
        performedBy: userId,
    });
    return { success: true };
}, 'updateOwnPassword', { rateLimit: rateLimiter_1.RATE_LIMITS.AUTH }));
exports.listEmployeeAttendance = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const limit = payload.limit;
    const cursor = payload.cursor;
    const startDate = payload.startDate;
    const endDate = payload.endDate;
    const result = await (0, attendanceHistory_1.listEmployeeAttendance)({
        userId,
        limit,
        cursor,
        startDate,
        endDate,
    });
    return result;
}, 'listEmployeeAttendance'));
exports.getAttendanceDayDetail = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const date = (0, validators_1.assertString)(payload.date, 'date');
    const detail = await (0, attendanceHistory_1.getAttendanceDayDetail)({
        userId,
        date,
    });
    return detail;
}, 'getAttendanceDayDetail'));
exports.getHolidays = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const year = payload.year;
    const result = await (0, holidays_1.getHolidays)({
        year,
    });
    return result;
}, 'getHolidays'));
exports.submitLeaveRequest = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const leaveType = (0, validators_1.assertString)(payload.leaveType, 'leaveType');
    const startDate = (0, validators_1.assertString)(payload.startDate, 'startDate');
    const endDate = (0, validators_1.assertString)(payload.endDate, 'endDate');
    const reason = (0, validators_1.assertString)(payload.reason, 'reason', { min: 5, max: 500 });
    const attachmentId = payload.attachmentId ? (0, validators_1.assertString)(payload.attachmentId, 'attachmentId') : undefined;
    const result = await (0, leaves_1.submitLeaveRequest)({
        userId,
        leaveType,
        startDate,
        endDate,
        reason,
        attachmentId,
    });
    return result;
}, 'submitLeaveRequest', { rateLimit: rateLimiter_1.RATE_LIMITS.WRITE }));
exports.cancelLeaveRequest = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const requestId = (0, validators_1.assertString)(payload.requestId, 'requestId');
    const result = await (0, leaves_1.cancelLeaveRequest)({
        userId,
        requestId,
    });
    return result;
}, 'cancelLeaveRequest'));
exports.listEmployeeLeaves = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const status = payload.status ? (0, validators_1.assertString)(payload.status, 'status') : undefined;
    const limit = payload.limit;
    const cursor = payload.cursor;
    const result = await (0, leaves_1.listEmployeeLeaves)({
        userId,
        status: status,
        limit,
        cursor,
    });
    return result;
}, 'listEmployeeLeaves'));
exports.getLeaveBalance = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const year = payload.year;
    const result = await (0, leaves_1.getLeaveBalance)({
        userId,
        year,
    });
    return result;
}, 'getLeaveBalance'));
exports.generateLeaveAttachmentUploadUrl = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const fileName = (0, validators_1.assertString)(payload.fileName, 'fileName', { min: 1, max: 255 });
    const mimeType = (0, validators_1.assertString)(payload.mimeType, 'mimeType', { min: 3, max: 255 });
    const sizeBytes = payload.sizeBytes;
    const result = await (0, leaveAttachments_1.generateLeaveAttachmentUploadUrl)({
        userId,
        fileName,
        mimeType,
        sizeBytes,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'generate_leave_attachment_upload_url',
        resource: 'LEAVE_ATTACHMENTS',
        resourceId: result.attachmentId,
        status: 'success',
        performedBy: userId,
        metadata: { fileName, mimeType, sizeBytes },
    });
    return result;
}, 'generateLeaveAttachmentUploadUrl'));
exports.registerLeaveAttachment = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const attachmentId = (0, validators_1.assertString)(payload.attachmentId, 'attachmentId');
    const result = await (0, leaveAttachments_1.registerLeaveAttachment)({
        userId,
        attachmentId,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'register_leave_attachment',
        resource: 'LEAVE_ATTACHMENTS',
        resourceId: attachmentId,
        status: 'success',
        performedBy: userId,
    });
    return result;
}, 'registerLeaveAttachment'));
exports.getLeaveAttachmentDownloadUrl = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const attachmentId = (0, validators_1.assertString)(payload.attachmentId, 'attachmentId');
    const result = await (0, leaveAttachments_1.getLeaveAttachmentDownloadUrl)({
        attachmentId,
    });
    return result;
}, 'getLeaveAttachmentDownloadUrl'));
exports.listEmployeeNotifications = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const limit = typeof payload.limit === 'number' ? payload.limit : 20;
    const cursor = typeof payload.cursor === 'string' ? payload.cursor : undefined;
    const status = typeof payload.status === 'string' && (payload.status === 'read' || payload.status === 'unread')
        ? payload.status
        : undefined;
    const result = await (0, notifications_1.listNotificationsForEmployee)({
        userId,
        limit,
        cursor,
        status,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'list_employee_notifications',
        resource: 'NOTIFICATIONS',
        resourceId: userId,
        status: 'success',
        performedBy: userId,
    });
    return result;
}, 'listEmployeeNotifications'));
exports.markNotificationRead = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const notificationId = (0, validators_1.assertString)(payload.notificationId, 'notificationId');
    const result = await (0, notifications_1.markNotificationAsRead)({
        userId,
        notificationId,
        acknowledgment: payload.acknowledgment,
    });
    await (0, audit_1.recordAuditLog)({
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
}, 'markNotificationRead'));
exports.markAllNotificationsAsRead = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const userId = (0, authV2_1.requireAuthUid)(request);
    const result = await (0, notifications_1.markAllNotificationsAsRead)({
        userId,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'mark_all_notifications_read',
        resource: 'NOTIFICATIONS',
        resourceId: userId,
        status: 'success',
        performedBy: userId,
        metadata: {
            markedCount: result.markedCount,
        },
    });
    return result;
}, 'markAllNotificationsAsRead'));
exports.listEmployeePenalties = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const limit = typeof payload.limit === 'number' ? payload.limit : 20;
    const cursor = typeof payload.cursor === 'string' ? payload.cursor : undefined;
    const status = typeof payload.status === 'string' ? payload.status : undefined;
    const result = await (0, penalties_1.listEmployeePenalties)({
        userId,
        limit,
        cursor,
        status,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'list_employee_penalties',
        resource: 'PENALTIES',
        resourceId: userId,
        status: 'success',
        performedBy: userId,
    });
    return result;
}, 'listEmployeePenalties'));
exports.acknowledgePenalty = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const penaltyId = (0, validators_1.assertString)(payload.penaltyId, 'penaltyId');
    const note = typeof payload.note === 'string' ? payload.note : undefined;
    const result = await (0, penalties_1.acknowledgePenalty)({
        userId,
        penaltyId,
        note,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'acknowledge_penalty',
        resource: 'PENALTIES',
        resourceId: penaltyId,
        status: 'success',
        performedBy: userId,
        metadata: { note: note ?? null },
    });
    return result;
}, 'acknowledgePenalty'));
exports.getPenaltySummary = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const userId = (0, authV2_1.requireAuthUid)(request);
    const result = await (0, penalties_1.getPenaltySummary)({
        userId,
    });
    return result;
}, 'getPenaltySummary'));
exports.registerDeviceToken = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertEmployee)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const userId = (0, authV2_1.requireAuthUid)(request);
    const token = (0, validators_1.assertString)(payload.token, 'token');
    const platform = (0, validators_1.assertString)(payload.platform, 'platform');
    const deviceId = (0, validators_1.assertString)(payload.deviceId, 'deviceId');
    await (0, deviceTokens_1.registerDeviceToken)({
        userId,
        token,
        platform,
        deviceId,
        metadata: payload.metadata,
    });
    await (0, audit_1.recordAuditLog)({
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
}, 'registerDeviceToken'));
exports.scheduledPenaltyAutomation = (0, scheduler_1.onSchedule)({
    // Run daily at 2 AM UTC to check if it's the 1st of the month in company timezone
    schedule: '0 2 * * *',
    timeZone: 'UTC',
}, async () => {
    const now = new Date();
    // Import timezone utilities
    const { convertToCompanyTimezone, formatInCompanyTimezone } = await Promise.resolve().then(() => __importStar(require('./utils/timezoneUtils')));
    // Get current date in company timezone
    const companyDate = await convertToCompanyTimezone(now);
    // Check if it's the 1st of the month in company timezone
    if (companyDate.getDate() !== 1) {
        return; // Not the 1st of the month in company timezone
    }
    // Calculate penalties for the PREVIOUS month (not current month)
    // On Jan 1st, we calculate December's penalties
    const previousMonth = new Date(companyDate);
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    // Get the previous month string in company timezone
    const month = await formatInCompanyTimezone(previousMonth, 'yyyy-MM');
    await (0, penalties_1.calculateMonthlyViolations)({ month });
});
/**
 * Daily attendance finalization and penalty calculation - runs after all check windows close
 * 1. Finalizes attendance: Creates absent records for no-shows, marks missed checks
 * 2. Creates penalties for each violation (late, early_leave, absent, half_day_absent)
 *
 * Schedule: Runs every hour and checks if it's the right time in company timezone.
 * This allows the schedule to work regardless of the configured timezone.
 * Finalization runs when it's between 18:00-19:00 in company timezone (after check-out window).
 */
exports.scheduledDailyPenaltyCalculation = (0, scheduler_1.onSchedule)({
    // Run every hour at minute 30
    schedule: '30 * * * *',
    timeZone: 'UTC',
}, async () => {
    const now = new Date();
    // Import timezone utilities and settings
    const { convertToCompanyTimezone, formatInCompanyTimezone } = await Promise.resolve().then(() => __importStar(require('./utils/timezoneUtils')));
    const { isWeekend, isCompanyHoliday } = await Promise.resolve().then(() => __importStar(require('./utils/dateUtils')));
    const { getCompanySettings } = await Promise.resolve().then(() => __importStar(require('./services/settings')));
    // Get company settings to check time windows
    const settings = await getCompanySettings();
    const check3Window = settings.timeWindows?.check3;
    // Get current time in company timezone
    const companyDate = await convertToCompanyTimezone(now);
    const companyHour = companyDate.getHours();
    // Determine the finalization hour (1 hour after check-out window ends)
    // Default: check-out ends at 17:30, so finalize at 18:xx
    let finalizationHour = 18;
    if (check3Window?.end) {
        const [endHour] = check3Window.end.split(':').map(Number);
        finalizationHour = endHour + 1; // 1 hour after check-out window ends
    }
    // Only run during the finalization hour (e.g., 18:00-18:59)
    if (companyHour !== finalizationHour) {
        return;
    }
    // Skip weekends
    if (isWeekend(companyDate)) {
        return;
    }
    // Skip holidays
    if (await isCompanyHoliday(companyDate)) {
        return;
    }
    // Get today's date string
    const dateKey = await formatInCompanyTimezone(companyDate, 'yyyy-MM-dd');
    // Check if finalization already ran today (prevent duplicate runs)
    const db = firebase_1.admin.firestore();
    const flagDoc = await db.collection('SYSTEM_FLAGS').doc(`finalization_${dateKey}`).get();
    if (flagDoc.exists) {
        return; // Already processed today
    }
    // Mark as processing to prevent duplicate runs
    await db.collection('SYSTEM_FLAGS').doc(`finalization_${dateKey}`).set({
        startedAt: firestore_1.FieldValue.serverTimestamp(),
        status: 'processing',
    });
    try {
        // Step 1: Finalize attendance - create absent records for no-shows, mark missed checks
        const finalizeResult = await (0, clockInUtils_1.finalizeAttendance)({ date: dateKey });
        // Step 2: Calculate daily penalties based on finalized attendance
        const penaltyResult = await (0, penalties_1.calculateDailyViolations)({ date: dateKey });
        // Update flag with success
        await db.collection('SYSTEM_FLAGS').doc(`finalization_${dateKey}`).update({
            completedAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'completed',
            finalizeResult,
            penaltyResult,
        });
    }
    catch (error) {
        // Update flag with error
        await db.collection('SYSTEM_FLAGS').doc(`finalization_${dateKey}`).update({
            completedAt: firestore_1.FieldValue.serverTimestamp(),
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error;
    }
});
/**
 * Manual trigger for attendance finalization (admin only)
 * Creates absent records for no-shows and marks missed checks
 */
exports.finalizeAttendance = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const date = (0, validators_1.assertString)(payload.date, 'date');
    const result = await (0, clockInUtils_1.finalizeAttendance)({ date });
    await (0, audit_1.recordAuditLog)({
        action: 'finalize_attendance',
        resource: 'ATTENDANCE_RECORDS',
        resourceId: date,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { result },
    });
    return result;
}, 'finalizeAttendance'));
/**
 * Manual trigger for daily penalty calculation (admin only)
 */
exports.calculateDailyViolations = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = (0, validators_1.assertPayload)(request.data);
    const date = (0, validators_1.assertString)(payload.date, 'date');
    const result = await (0, penalties_1.calculateDailyViolations)({
        date,
        userId: payload.userId,
    });
    await (0, audit_1.recordAuditLog)({
        action: 'calculate_daily_violations',
        resource: 'PENALTIES',
        resourceId: date,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { result },
    });
    return result;
}, 'calculateDailyViolations'));
exports.scheduledDailyClockInReminder = (0, scheduler_1.onSchedule)({
    // Run every 30 minutes to check for notification times in company timezone
    schedule: '*/30 * * * *',
    timeZone: 'UTC',
}, async (event) => {
    const runDate = event.scheduleTime ? new Date(event.scheduleTime) : new Date();
    // Import timezone utilities
    const { getNotificationSlotForTime, getCompanyTimezoneDateKey } = await Promise.resolve().then(() => __importStar(require('./utils/timezoneUtils')));
    // Check if current time matches any notification schedule in company timezone
    const notificationConfig = await getNotificationSlotForTime(runDate);
    if (!notificationConfig) {
        // Not a notification time in company timezone
        return;
    }
    const { slot } = notificationConfig;
    // Get date key in company timezone
    const dateKey = await getCompanyTimezoneDateKey(runDate);
    // Skip reminders on holidays
    const { isCompanyHoliday } = await Promise.resolve().then(() => __importStar(require('./utils/dateUtils')));
    if (await isCompanyHoliday(runDate)) {
        return;
    }
    const targets = await (0, notifications_1.getEmployeesNeedingClockInReminder)(dateKey, slot);
    if (targets.length === 0) {
        return;
    }
    const reminderMessages = {
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
            message: 'Heading out? Don\'t forget to clock out before you leave.',
        },
    };
    const { title, message } = reminderMessages[slot];
    await (0, notifications_1.queueBulkNotifications)({
        userIds: targets,
        userId: '',
        title,
        message,
        category: 'attendance',
        metadata: { dateKey, slot },
    });
});
exports.triggerDailyAnalyticsAggregation = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    // Import timezone utilities
    const { convertToCompanyTimezone, formatInCompanyTimezone } = await Promise.resolve().then(() => __importStar(require('./utils/timezoneUtils')));
    // Get yesterday's date in company timezone
    const now = new Date();
    const companyNow = await convertToCompanyTimezone(now);
    companyNow.setDate(companyNow.getDate() - 1);
    const dateKey = await formatInCompanyTimezone(companyNow, 'yyyy-MM-dd');
    const result = await (0, analytics_1.aggregateDailyAttendance)(dateKey);
    await (0, audit_1.recordAuditLog)({
        action: 'aggregate_daily_analytics',
        resource: 'ANALYTICS_SUMMARY',
        resourceId: dateKey,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
    });
    return result;
}, 'triggerDailyAnalyticsAggregation'));
exports.triggerMonthlyAnalyticsAggregation = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    // Import timezone utilities
    const { convertToCompanyTimezone, formatInCompanyTimezone } = await Promise.resolve().then(() => __importStar(require('./utils/timezoneUtils')));
    // Get last month in company timezone
    const now = new Date();
    const companyNow = await convertToCompanyTimezone(now);
    companyNow.setMonth(companyNow.getMonth() - 1);
    const monthKey = await formatInCompanyTimezone(companyNow, 'yyyy-MM');
    const result = await (0, analytics_1.aggregateMonthlyAttendance)(monthKey);
    await (0, audit_1.recordAuditLog)({
        action: 'aggregate_monthly_analytics',
        resource: 'ANALYTICS_SUMMARY',
        resourceId: monthKey,
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
    });
    return result;
}, 'triggerMonthlyAnalyticsAggregation'));
/**
 * Record telemetry event from client app
 * This is a stub function for development - in production, integrate with monitoring service
 */
exports.recordTelemetryEvent = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAuthenticated)(request);
    const payload = (0, validators_1.assertPayload)(request.data ?? {});
    const eventName = (0, validators_1.assertString)(payload.name, 'name');
    const metadata = payload.metadata;
    // In development, just log it
    // In production, this would integrate with your monitoring service (e.g., Sentry, DataDog)
    functions.logger.debug('Telemetry event recorded', {
        userId: (0, authV2_1.requireAuthUid)(request),
        eventName,
        metadata,
        timestamp: new Date().toISOString(),
    });
    return { success: true };
}, 'recordTelemetryEvent'));
/**
 * Seed test data for testing purposes (admin only)
 * Creates isolated test users, attendance records, leaves, penalties, etc.
 * All test data has IDs prefixed with "TEST_" for easy identification.
 *
 * WARNING: Only use in development/staging environments.
 */
exports.seedTestData = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const payload = request.data ?? {};
    const cleanFirst = payload.cleanFirst !== false; // Default to true
    const { seedTestData: seedTestDataService } = await Promise.resolve().then(() => __importStar(require('./scripts/seedTestData')));
    const result = await seedTestDataService(cleanFirst);
    await (0, audit_1.recordAuditLog)({
        action: 'seed_test_data',
        resource: 'SYSTEM',
        resourceId: 'test_data',
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { cleanFirst, users: result.users },
    });
    return result;
}, 'seedTestData'));
/**
 * Clean up test data (admin only)
 * Removes all documents with IDs prefixed with "TEST_"
 */
exports.cleanupTestData = (0, https_1.onCall)((0, callableWrapper_1.wrapCallable)(async (request) => {
    (0, authV2_1.assertAdmin)(request);
    const collections = [
        'USERS',
        'ATTENDANCE_RECORDS',
        'LEAVE_REQUESTS',
        'PENALTIES',
        'NOTIFICATIONS',
        'AUDIT_LOGS',
    ];
    const db = firebase_1.admin.firestore();
    let totalDeleted = 0;
    for (const collectionName of collections) {
        const snapshot = await db
            .collection(collectionName)
            .where(firebase_1.admin.firestore.FieldPath.documentId(), '>=', 'TEST_')
            .where(firebase_1.admin.firestore.FieldPath.documentId(), '<', 'TEST_\uf8ff')
            .get();
        if (!snapshot.empty) {
            const batch = db.batch();
            snapshot.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
            totalDeleted += snapshot.size;
        }
    }
    await (0, audit_1.recordAuditLog)({
        action: 'cleanup_test_data',
        resource: 'SYSTEM',
        resourceId: 'test_data',
        status: 'success',
        performedBy: (0, authV2_1.requireAuthUid)(request),
        metadata: { totalDeleted },
    });
    return { success: true, deletedCount: totalDeleted };
}, 'cleanupTestData'));
