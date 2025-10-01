# Admin Features To-Do List

---

## Phase 1: Backend (Firebase & Cloud Functions)

### 1.1. Authentication & Authorization
-   [x] **Firebase Auth Setup:**
    -   [x] Configure the Email/Password sign-in provider in the Firebase console.
    -   [x] Create the first admin user manually in the console for initial access (use seeding script to sync Firestore metadata).
-   [x] **Custom Claims for Roles:**
    -   [x] Create a Cloud Function `setUserRole` to assign custom claims (`{ role: 'admin' }`) to a user. This will be triggered by an admin from the dashboard later but needs to exist first for securing other functions.
    -   [x] Secure this function so only authenticated admins can call it.

### 1.2. Firestore Schema & Security Rules
-   [x] **Initial Schema Setup:**
    -   [x] Seed the `COMPANY_SETTINGS/main` document with defaults (via `npm run seed:firestore`).
    -   [x] Seed the `USERS` collection with the initial admin user (via `npm run seed:firestore`).
    -   [x] Create `ATTENDANCE_RECORDS` collection structure
    -   [x] Create `LEAVE_REQUESTS` collection structure  
    -   [x] Create `PENALTIES` collection structure
    -   [x] Create `VIOLATION_HISTORY` collection structure
    -   [x] Create `NOTIFICATIONS` collection structure
    -   [x] Create `AUDIT_LOGS` collection structure
-   [x] **Firestore Security Rules (`firestore.rules`):**
    -   [x] **Default Deny:** Start with `allow read, write: if false;` globally.
    -   [x] **USERS collection:**
        -   Allow authenticated users to read their own document.
        -   Allow users with an `admin` custom claim to read/write any document in the `USERS` collection.
    -   [x] **COMPANY_SETTINGS collection:**
        -   Allow any authenticated user to read the `main` document.
        -   Allow only users with an `admin` custom claim to write to the `main` document.
    -   [x] **ATTENDANCE_RECORDS, LEAVE_REQUESTS, PENALTIES:**
        -   Allow employees to read their own records.
        -   Allow admins to read/write all records.
        -   Deny all client-side writes to sensitive fields that should only be modified by Cloud Functions (e.g., leave status, penalty amount).
    -   [x] **VIOLATION_HISTORY & AUDIT_LOGS:**
        -   Allow only admins to read.
        -   Deny all client-side writes (Cloud Functions only).
    -   [x] **NOTIFICATIONS collection:**
        -   Allow employees to read their own notifications.
        -   Allow admins to create announcements via Cloud Functions only.

### 1.3. Cloud Functions (Core Business Logic)
-   [x] **Employee Management Functions (Callable):**
    -   [x] `createEmployee(data)`: Creates a user in Firebase Auth and a corresponding document in Firestore `USERS`. Sets the `employee` custom claim. *Security: Admin only.*
    -   [x] `updateEmployee(data)`: Updates a user's document in the Firestore `USERS` collection. *Security: Admin only.*
    -   [x] `toggleUserStatus(data)`: Toggles `isActive` flag in Firestore and disables/enables the user in Firebase Auth. *Security: Admin only.*

-   [x] **Attendance Management Functions (Callable):**
    -   [x] `manualSetAttendance(data)`: Allows an admin to manually create or overwrite an attendance record. Requires a `reason` and logs the action to `AUDIT_LOGS`. *Security: Admin only.*

-   [x] **Leave Management Functions (Callable):**
    -   [x] `handleLeaveApproval(data)`: Takes `requestId` and `action` ('approve' or 'reject'). Updates the `LEAVE_REQUESTS` document, adjusts user's leave balance, populates `ATTENDANCE_RECORDS` if approved, and sends a notification. *Security: Admin only.*

-   [x] **Settings Management Functions (Callable):**
    -   [x] `updateCompanySettings(data)`: Updates the `COMPANY_SETTINGS` document with strict validation on incoming data and logs the change to `AUDIT_LOGS`. *Security: Admin only.*

-   [x] **Penalty & Violation Functions:**
    -   [x] `waivePenalty(data)`: Callable function to update a penalty's status to `waived`. Requires a `waivedReason`. *Security: Admin only.*
    -   [x] `calculateMonthlyViolations(data)`: (Scheduled or Callable) Iterates through user attendance for a month, generates `VIOLATION_HISTORY`, and triggers penalty creation if thresholds are met. *Security: Admin only.*

-   [x] **Analytics & Reporting Functions:**
    -   [x] `generateAttendanceReport(data)`: Generates attendance reports for specified date ranges and employees. *Security: Admin only.*
    -   [x] `getDashboardStats(data)`: Returns aggregated statistics for the admin dashboard. *Security: Admin only.*

-   [x] **Notification Functions:**
    -   [x] `sendNotification(data)`: Sends push notifications to users for leave approvals, penalties, etc. *Security: Admin only.*
    -   [x] `sendBulkNotification(data)`: Sends notifications to multiple users. *Security: Admin only.*

### 1.4. Supporting Services & Scheduling
-   [x] **Penalty Automation:** Extend `calculateMonthlyViolations` (or introduce a dedicated job) to honour `COMPANY_SETTINGS.penaltyRules`, emit `PENALTIES`, and tag `VIOLATION_HISTORY` entries with triggered penalties.
-   [x] **Handle Clock-In Callable:** Implement `handleClockIn` to validate geofence, time windows, and attendance logic before updating `ATTENDANCE_RECORDS` and logging outcomes per architecture docs.
-   [x] **Leave Backfill:** Update `handleLeaveApproval` to backfill approved date ranges in `ATTENDANCE_RECORDS` with `on_leave` status and log manual overrides where needed.
-   [x] **Notification Dispatch & Reminders:** Implement scheduled/bulk notification workflows referenced in architecture (daily reminders, alerts) so `NOTIFICATIONS` is populated without manual intervention.
-   [x] **Daily Reminder Job:** Create a scheduled Cloud Function that sends clock-in reminders and pending-action notifications, emitting audit logs and queuing `NOTIFICATIONS` per design.
-   [x] **Analytics Sync:** Implement automated analytics aggregation (daily/monthly stats) feeding admin dashboard widgets, leveraging `AUDIT_LOGS`, `ATTENDANCE_RECORDS`, and `PENALTIES`.
-   [x] **Audit Log Coverage:** Ensure all sensitive operations (clock-in decisions, penalty creation, reminders) log to `AUDIT_LOGS` as depicted in sequence/UML diagrams.
---

## Phase 2: Frontend (React/Next.js Dashboard)

With the backend logic in place, we can build the user interface for admins.

### 2.1. Project Foundation & Layout
-   [x] **Cleanup:** Remove default Next.js starter page content from `src/app/page.tsx`.
-   [x] **Auth Context:** Implement a proper `AuthContext` provider that wraps the application and provides user state, admin role status, and loading status.
-   [x] **Protected Routes:** Create a higher-order component or layout component that checks for an authenticated admin user. Redirect to `/login` if not authenticated.
-   [x] **Core Layout:**
    -   [x] Enhance `Sidebar.tsx` with actual navigation links (`Dashboard`, `Employees`, `Attendance`, `Leaves`, `Settings`).
    -   [x] Enhance `Header.tsx` to show the currently logged-in admin's name and a logout button.
    -   [x] Create a main content layout that uses the Sidebar and Header.

### 2.2. Authentication Module
-   [x] **Login Page (`/login`):**
    -   [x] Build the UI for the login form (`LoginForm.tsx`).
    -   [x] Implement the `signInWithEmailAndPassword` logic.
    -   [x] On successful login, check for the `admin` custom claim. If not present, log the user out and show an "Access Denied" error.
    -   [x] Redirect to the dashboard (`/`) on successful admin login.
-   [x] **Logout Functionality:**
    -   [x] Implement the logout button in the `Header` to call `signOut` and redirect to `/login`.

### 2.3. Dashboard Module (`/`)
-   [x] **UI Widgets:**
    -   [x] Widget for "Today's Attendance Stats" (Present, Absent, On Leave).
    -   [x] Widget for "Pending Leave Requests" (Count with a link to the leaves page).
    -   [x] Widget for "Recent Violations".
-   [x] **Data Fetching:** Fetch aggregated data from Firestore to populate the widgets.

### 2.4. Employee Management Module (`/employees`)
-   [x] **Employee List View:**
    -   [x] Create a page to display all users in a data table (using `shadcn/ui` Table).
    -   [x] Columns: Full Name, Email, Department, Position, Status (`Active`/`Inactive`).
    -   [x] Add a "Create Employee" button.
-   [x] **Create Employee Form:**
    -   [x] Use a `Dialog` or a new page (`/employees/new`) for the form.
    -   [x] On submit, call the `createEmployee` Cloud Function.
-   [x] **Edit Employee View:**
    -   [x] Create a page (`/employees/[id]`) to show and edit employee details, including leave balances.
    -   [x] Implement "Deactivate" / "Activate" button which calls `toggleUserStatus`.
    -   [x] On save, call the `updateEmployee` Cloud Function.

### 2.5. Attendance Management Module (`/attendance`)
-   [x] **Attendance Table View:**
    -   [x] Display all attendance records in a data table.
    -   [x] Implement filters by date range, employee, and status.
    -   [x] Implement a "Manual Entry" button.
-   [x] Implement real-time Firestore listeners so table updates without manual refresh.
-   [x] **Manual Entry Form:**
    -   [x] A `Dialog` to manually create/edit a record with a mandatory "Reason" field.
    -   [x] On submit, call the `manualSetAttendance` Cloud Function.
    -   [x] Implement real-time Firestore listeners so table updates without manual refresh.

### 2.6. Leave Management Module (`/leaves`)
-   [x] **Leave Requests Table:**
    -   [x] Display all leave requests with filters for "Pending", "Approved", "Rejected".
-   [x] **Leave Request Detail View:**
    -   [x] Clicking a request shows details and attached documents.
    -   [x] Add "Approve" and "Reject" buttons that call the `handleLeaveApproval` Cloud Function.

### 2.7. Settings Module (`/settings`)
-   [x] **Settings Form:**
    -   [x] Create a multi-section form to manage all `COMPANY_SETTINGS`.
    -   [x] **Geofencing:** Include an interactive map (e.g., React-Leaflet) to set the `workplace_center`.
    -   [x] **Time Windows & Grace Periods:** Inputs for start/end times.
    -   [x] **Penalty Rules:** Inputs for violation thresholds and amounts.
    -   [x] **Holidays:** A list editor to add/remove company holidays.
    -   [x] A "Save Settings" button that calls the `updateCompanySettings` Cloud Function.

### 2.8. Analytics & Reports Module (`/reports`)
-   [x] **Reports Dashboard:**
    -   [x] Create a page to generate and view attendance reports.
    -   [x] Add filters for date range, department, and employee.
    -   [x] Implement export functionality (CSV, JSON download).
-   [x] **Analytics Charts:**
    -   [x] Display attendance trends over time.
    -   [x] Show department-wise attendance statistics.
    -   [x] Create violation and penalty analytics.

### 2.9. Penalties Module (`/penalties`)
-   [x] **Penalties Management:**
    -   [x] Display all penalties in a data table.
    -   [x] Add filters for status, employee, and date range.
    -   [x] Implement "Waive Penalty" functionality.
    -   [x] Show penalty history and reasons.

### 2.10. Notifications Module (`/notifications`)
-   [x] **Notifications Management:**
    -   [x] Display a feed of announcements and system notices sent to employees.
    -   [x] Provide actions to send single-user and bulk notifications via `sendNotification` / `sendBulkNotification` Cloud Functions.
    -   [x] Include form validation for notification category, audience selection, and preview.
    -   [x] Surface delivery status indicators (success, queued, failed) using Firestore data.

### 2.11. Audit Logs Module (`/audit-logs`)
-   [x] **Audit Trail Viewer:**
    -   [x] Create a read-only table for `AUDIT_LOGS` with filters for action, resource, and date range.
    -   [x] Implement detail drawer showing `oldValues` vs `newValues` for selected entries.
    -   [x] Ensure the UI enforces admin-only access and paginates results for performance.

---

## Phase 3: Employee Callable APIs (Firebase Functions)

### 3.1. Employee Profile & Dashboard
-   [x] `getEmployeeProfile`: Return sanitized user metadata, leave balances, and active status for the authenticated employee.
-   [x] `getEmployeeDashboard`: Provide daily attendance status, remaining checks, and upcoming leave/penalty summaries.
-   [x] `getCompanySettingsPublic`: Expose read-only settings needed by the mobile client (time windows, grace periods, timezone, geofence radius).

### 3.2. Attendance & History Retrieval
-   [x] `listEmployeeAttendance`: Paginated history scoped to the caller with optional date filters and computed check details.
-   [x] `getAttendanceDayDetail`: Single-day breakdown including clock-in timestamps, geofence outcome, and manual override notes.
-   [x] Harden Firestore security so employees can only read their own attendance records via callable-backed access patterns.

### 3.3. Leave Lifecycle (Employee-Side)
-   [x] `submitLeaveRequest`: Validate payload, persist to `LEAVE_REQUESTS`, enqueue notification, and log audit trail.
-   [x] `cancelLeaveRequest`: Allow cancellation while pending; reverse any provisional attendance overrides.
-   [x] `listEmployeeLeaves`: Return the employee's leave history with statuses and reviewer notes.
-   [x] Signed upload workflow for supporting documents (generate upload URL, validate file metadata, store reference). Includes attachment requirement enforcement for medical and maternity leave types via company settings.

### 3.4. Notifications, Penalties, Device State
-   [x] `listEmployeeNotifications`: Fetch unread/read notifications with pagination.
-   [x] `markNotificationRead`: Update read status and optionally register acknowledgement metadata.
-   [x] `listEmployeePenalties`: Return active and historical penalties with waiver statuses.
-   [x] `registerDeviceToken`: Store FCM tokens scoped to employee devices for push delivery.

### 3.5. Quality & Observability
-   [x] Extend audit logging coverage for all employee callables (action, resource, metadata).
-   [x] Update API documentation (`docs/cloud-functions.md`) with request/response contracts and error codes.

---

## Phase 4: Flutter Mobile Application

### 4.1. Project Foundation & Architecture
-   [ ] Establish app architecture (feature-first folders, Provider/ChangeNotifier state management, services abstraction).
-   [ ] Configure Firebase initialization, environment handling, and crash/error reporting pipeline.
-   [ ] Implement secure persistence of auth session and custom-claim checks (enforce `role === 'employee'`).

### 4.2. Authentication & Onboarding
-   [ ] Build production-ready login, forgot-password, and logout flows wired to Firebase Auth.
-   [ ] Add onboarding sequence to capture device permissions (location, notifications) and register FCM token via `registerDeviceToken`.

### 4.3. Home Dashboard & Clock-In
-   [ ] Create home screen that consumes `getEmployeeDashboard` and surfaces attendance status, remaining checks, and alerts.
-   [ ] Implement clock-in flow: permission gating, geolocation retrieval via `geolocator`, call `handleClockIn`, handle error codes, and animate status updates.
-   [ ] Surface geofence radius using map preview or textual guidance referencing company settings.

### 4.4. Attendance History & Details
-   [ ] Integrate `table_calendar` to display monthly attendance with status indicators.
-   [ ] Build day-detail sheet leveraging `getAttendanceDayDetail`, including manual override/audit metadata.
-   [ ] Add filtering/search for specific ranges and export/share options where appropriate.

### 4.5. Leave Management Experience
-   [ ] Leave list screen consuming `listEmployeeLeaves` with status chips and reviewer notes.
-   [ ] Leave request creation wizard (type selection, date picker, reason, attachment upload using signed URLs).
-   [ ] Allow cancellation of pending requests through `cancelLeaveRequest` with confirmation and state refresh.

### 4.6. Notifications & Penalties
-   [ ] Notifications center: list, detail view, and mark-as-read actions tied to `listEmployeeNotifications`/`markNotificationRead`.
-   [ ] Integrate push notifications (Firebase Messaging) with deep links into relevant screens.
-   [ ] Penalties screen displaying active and historical penalties with CTA to acknowledge or view policy guidance.

### 4.7. Settings, Offline, and Support
-   [ ] Settings/profile screen allowing light preferences (theme, locale), showing company info from `getCompanySettingsPublic`.
-   [ ] Implement optimistic UI & caching strategy for key data sets with offline messaging.
-   [ ] Add in-app help, error boundary views, and telemetry hooks for critical flows.

### 4.8. QA & Release Readiness
-   [ ] Widget/unit tests for view models, service adapters, and validation logic.
-   [ ] End-to-end smoke flows (clock-in, leave request, notification) using integration test harness or tooling.
-   [ ] Prepare release pipeline (CI lint/test, build flavors, beta distribution) and update store metadata checklists.




