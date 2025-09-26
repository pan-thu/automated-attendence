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
| `sendNotification` | Queues a notification for a specific user. | `{ userId, title, message, category?, type?, relatedId?, metadata? }` | `{ success: true }` |
| `sendBulkNotification` | Queues notifications for multiple users at once. | `{ userIds: string[], title, message, category?, type?, relatedId?, metadata? }` | `{ count }` |
| `handleClockIn` | Employee clock-in endpoint enforcing location validation before calling `handleClockInService`. | `{ latitude, longitude, timestamp?, isMocked? }` | `{ success: true, ... }` |

## Scheduled Jobs (v2 Scheduler)
| Function | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `scheduledPenaltyAutomation` | `0 2 1 * *` | Triggers monthly violation aggregation on the first of each month. |
| `scheduledDailyClockInReminder` | `30 8 * * *` | Sends reminders to employees who have not clocked in for the day. |
| `scheduledPendingActionDigest` | `0 14 * * *` | Notifies admins about pending approvals. |
| `scheduledDailyAnalyticsSync` | `15 0 * * *` | Aggregates attendance data for the previous day. |
| `scheduledMonthlyAnalyticsSync` | `30 1 1 * *` | Aggregates monthly attendance metrics for the prior month. |

Each callable logs an entry to `AUDIT_LOGS` containing the acting admin UID, target resource, and context.

