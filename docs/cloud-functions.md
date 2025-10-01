# Cloud Functions Reference

This document summarizes the callable Cloud Functions exposed in `functions/src/index.ts` and describes how to deploy them to Firebase.

## Access Requirements
- All endpoints require Firebase Authentication.
- Only users whose ID tokens include the custom claim `role: 'admin'` may invoke these functions.
- Validation runs on every payload; invalid requests return `invalid-argument` errors.

## Callable Endpoints
| Function | Description | Payload | Response |
| --- | --- | --- | --- |
| `setUserRole` | Assigns an `admin` or `employee` role to an existing user and syncs Firestore metadata. | `{ uid? , email? , role }` | `{ success: true, message }` |
| `createEmployee` | Creates a Firebase Auth user, seeds the `USERS` document, and applies the employee claim. | `{ email, password, fullName, department?, position?, phoneNumber?, leaveBalances? }` | `{ uid }` |
| `updateEmployee` | Updates profile fields and leave balances in Firestore/AUTH. | `{ uid, fullName?, department?, position?, phoneNumber?, leaveBalances? }` | `{ success: true }` |
| `toggleUserStatus` | Enables or disables an employee account and toggles `isActive`. | `{ uid, enable: boolean }` | `{ success: true }` |
| `manualSetAttendance` | Manually records attendance with reason and audit logging. | `{ userId, attendanceDate, status, reason, notes?, checks? }` | `{ success: true }` |
| `handleLeaveApproval` | Approves/rejects leave, adjusts balances, and records reviewer notes. | `{ requestId, action: 'approve' | 'reject', notes? }` | `{ success: true }` |
| `updateCompanySettings` | Writes validated settings to `COMPANY_SETTINGS/main`. | Partial settings object (e.g. `companyName`, `workplace_center`, etc.) | `{ success: true }` |
| `waivePenalty` | Marks a penalty document as waived for a given reason. | `{ penaltyId, waivedReason }` | `{ success: true }` |
| `calculateMonthlyViolations` | Aggregates violations for the month and writes summaries. | `{ month: 'YYYY-MM', userId? }` | `{ processed }` |
| `generateAttendanceReport` | Returns attendance records within a range. | `{ startDate, endDate, userId? }` | `{ total, records }` |
| `getDashboardStats` | Provides day-level attendance stats and pending leave counts. | `{ date: 'YYYY-MM-DD' }` | `{ attendance: { present, absent, halfDay, total }, pendingLeaves }` |
| `triggerDailyAnalyticsAggregation` | Manually aggregates daily analytics for the latest completed day. | `{}` | `{ attendance, pendingLeaves }` |
| `triggerMonthlyAnalyticsAggregation` | Manually aggregates monthly analytics for the most recent month. | `{}` | `{ attendance }` |
| `sendNotification` | Queues a notification for a specific user. | `{ userId, title, message, category?, type?, relatedId?, metadata? }` | `{ success: true }` |
| `sendBulkNotification` | Queues notifications for multiple users at once. | `{ userIds: string[], title, message, category?, type?, relatedId?, metadata? }` | `{ count }` |
| `handleClockIn` | Employee clock-in endpoint enforcing location validation before calling `handleClockInService`. | `{ latitude, longitude, timestamp?, isMocked? }` | `{ success: true, ... }` |
| `getEmployeeProfile` | Returns the signed-in employee's profile, leave balances, and active status. | `{} (none)` | `{ userId, fullName, email, department, position, phoneNumber, leaveBalances, isActive }` |
| `getEmployeeDashboard` | Provides the employee dashboard summary for a given day including attendance, upcoming leave, penalties, and notifications. | `{ date? }` | `{ date, attendance, remainingChecks, upcomingLeave, activePenalties, unreadNotifications, leaveBalances, isActive }` |
| `getCompanySettingsPublic` | Exposes public company configuration needed by the mobile client. | `{} (none)` | `{ companyName, timezone, workplaceRadius, workplaceCenter, timeWindows, gracePeriods, workingDays, holidays, geoFencingEnabled }` |
| `listEmployeeAttendance` | Returns paginated attendance history for the authenticated employee with optional date filtering. | `{ limit?, cursor?, startDate?, endDate? }` | `{ items, nextCursor }` |
| `getAttendanceDayDetail` | Provides full details for a single attendance day including per-check info and summary. | `{ date }` | `{ ...AttendanceDayDetail }` |
| `submitLeaveRequest` | Submits a leave request with optional attachment metadata and enqueues review notifications. | `{ leaveType, startDate, endDate, reason, attachmentId? }` | `{ requestId }` |
| `cancelLeaveRequest` | Cancels a pending leave request owned by the caller. | `{ requestId }` | `{ success: true }` |
| `listEmployeeLeaves` | Lists the caller's leave requests with optional status filter and pagination. | `{ status?, limit?, cursor? }` | `{ items, nextCursor }` |
| `generateLeaveAttachmentUploadUrl` | Returns a signed Cloud Storage upload URL and attachment metadata for supporting documents. | `{ fileName, mimeType, sizeBytes }` | `{ attachmentId, uploadUrl, uploadHeaders, uploadUrlExpiresAt }` |
| `registerLeaveAttachment` | Finalizes a pending attachment by validating the uploaded object and marking it ready. | `{ attachmentId }` | `{ attachmentId, storagePath, sizeBytes, mimeType }` |
| `listEmployeeNotifications` | Returns the employee's notifications with pagination and optional status filtering. | `{ status?, limit?, cursor? }` | `{ items, nextCursor }` |
| `markNotificationRead` | Marks a notification as read and optionally records an acknowledgment. | `{ notificationId, acknowledgment? }` | `{ success: true }` |
| `listEmployeePenalties` | Lists active and historical penalties for the employee. | `{ status?, limit?, cursor? }` | `{ items, nextCursor }` |
| `registerDeviceToken` | Registers or updates an FCM device token for push notifications. | `{ token, platform, deviceId, metadata? }` | `{ success: true }` |

## Scheduled Jobs (v2 Scheduler)
| Function | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `scheduledPenaltyAutomation` | `0 2 1 * *` | Triggers monthly violation aggregation on the first of each month. |
| `scheduledDailyClockInReminder` | `30 8,13,17 * * *` | Sends time-of-day specific reminders to employees who have not clocked in/out. |

Each callable logs an entry to `AUDIT_LOGS` containing the acting admin UID, target resource, and context.

