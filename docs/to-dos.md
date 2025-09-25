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
-   [ ] **Employee Management Functions (Callable):**
    -   [ ] `createEmployee(data)`: Creates a user in Firebase Auth and a corresponding document in Firestore `USERS`. Sets the `employee` custom claim. *Security: Admin only.*
    -   [ ] `updateEmployee(data)`: Updates a user's document in the Firestore `USERS` collection. *Security: Admin only.*
    -   [ ] `toggleUserStatus(data)`: Toggles `isActive` flag in Firestore and disables/enables the user in Firebase Auth. *Security: Admin only.*

-   [ ] **Attendance Management Functions (Callable):**
    -   [ ] `manualSetAttendance(data)`: Allows an admin to manually create or overwrite an attendance record. Requires a `reason` and logs the action to `AUDIT_LOGS`. *Security: Admin only.*

-   [ ] **Leave Management Functions (Callable):**
    -   [ ] `handleLeaveApproval(data)`: Takes `requestId` and `action` ('approve' or 'reject'). Updates the `LEAVE_REQUESTS` document, adjusts user's leave balance, populates `ATTENDANCE_RECORDS` if approved, and sends a notification. *Security: Admin only.*

-   [ ] **Settings Management Functions (Callable):**
    -   [ ] `updateCompanySettings(data)`: Updates the `COMPANY_SETTINGS` document. Performs validation on incoming data and logs the change to `AUDIT_LOGS`. *Security: Admin only.*

-   [ ] **Penalty & Violation Functions:**
    -   [ ] `waivePenalty(data)`: Callable function to update a penalty's status to `waived`. Requires a `waivedReason`. *Security: Admin only.*
    -   [ ] `calculateMonthlyViolations(data)`: (Scheduled or Callable) Iterates through user attendance for a month, generates `VIOLATION_HISTORY`, and triggers penalty creation if thresholds are met. *Security: Admin only.*

-   [ ] **Analytics & Reporting Functions:**
    -   [ ] `generateAttendanceReport(data)`: Generates attendance reports for specified date ranges and employees. *Security: Admin only.*
    -   [ ] `getDashboardStats(data)`: Returns aggregated statistics for the admin dashboard. *Security: Admin only.*

-   [ ] **Notification Functions:**
    -   [ ] `sendNotification(data)`: Sends push notifications to users for leave approvals, penalties, etc. *Security: Admin only.*
    -   [ ] `sendBulkNotification(data)`: Sends notifications to multiple users. *Security: Admin only.*

---

## Phase 2: Frontend (React/Next.js Dashboard)

With the backend logic in place, we can build the user interface for admins.

### 2.1. Project Foundation & Layout
-   [ ] **Cleanup:** Remove default Next.js starter page content from `src/app/page.tsx`.
-   [ ] **Auth Context:** Implement a proper `AuthContext` provider that wraps the application and provides user state, admin role status, and loading status.
-   [ ] **Protected Routes:** Create a higher-order component or layout component that checks for an authenticated admin user. Redirect to `/login` if not authenticated.
-   [ ] **Core Layout:**
    -   [ ] Enhance `Sidebar.tsx` with actual navigation links (`Dashboard`, `Employees`, `Attendance`, `Leaves`, `Settings`).
    -   [ ] Enhance `Header.tsx` to show the currently logged-in admin's name and a logout button.
    -   [ ] Create a main content layout that uses the Sidebar and Header.

### 2.2. Authentication Module
-   [ ] **Login Page (`/login`):**
    -   [ ] Build the UI for the login form (`LoginForm.tsx`).
    -   [ ] Implement the `signInWithEmailAndPassword` logic.
    -   [ ] On successful login, check for the `admin` custom claim. If not present, log the user out and show an "Access Denied" error.
    -   [ ] Redirect to the dashboard (`/`) on successful admin login.
-   [ ] **Logout Functionality:**
    -   [ ] Implement the logout button in the `Header` to call `signOut` and redirect to `/login`.

### 2.3. Dashboard Module (`/`)
-   [ ] **UI Widgets:**
    -   [ ] Widget for "Today's Attendance Stats" (Present, Absent, On Leave).
    -   [ ] Widget for "Pending Leave Requests" (Count with a link to the leaves page).
    -   [ ] Widget for "Recent Violations".
-   [ ] **Data Fetching:** Fetch aggregated data from Firestore to populate the widgets.

### 2.4. Employee Management Module (`/employees`)
-   [ ] **Employee List View:**
    -   [ ] Create a page to display all users in a data table (using `shadcn/ui` Table).
    -   [ ] Columns: Full Name, Email, Department, Position, Status (`Active`/`Inactive`).
    -   [ ] Add a "Create Employee" button.
-   [ ] **Create Employee Form:**
    -   [ ] Use a `Dialog` or a new page (`/employees/new`) for the form.
    -   [ ] On submit, call the `createEmployee` Cloud Function.
-   [ ] **Edit Employee View:**
    -   [ ] Create a page (`/employees/[id]`) to show and edit employee details, including leave balances.
    -   [ ] Implement "Deactivate" / "Activate" button which calls `toggleUserStatus`.
    -   [ ] On save, call the `updateEmployee` Cloud Function.

### 2.5. Attendance Management Module (`/attendance`)
-   [ ] **Attendance Table View:**
    -   [ ] Display all attendance records in a data table.
    -   [ ] Implement filters by date range, employee, and status.
    -   [ ] Implement a "Manual Entry" button.
-   [ ] **Manual Entry Form:**
    -   [ ] A `Dialog` to manually create/edit a record with a mandatory "Reason" field.
    -   [ ] On submit, call the `manualSetAttendance` Cloud Function.
    -   [ ] Implement real-time Firestore listeners so table updates without manual refresh.

### 2.6. Leave Management Module (`/leaves`)
-   [ ] **Leave Requests Table:**
    -   [ ] Display all leave requests with filters for "Pending", "Approved", "Rejected".
-   [ ] **Leave Request Detail View:**
    -   [ ] Clicking a request shows details and attached documents.
    -   [ ] Add "Approve" and "Reject" buttons that call the `handleLeaveApproval` Cloud Function.

### 2.7. Settings Module (`/settings`)
-   [ ] **Settings Form:**
    -   [ ] Create a multi-section form to manage all `COMPANY_SETTINGS`.
    -   [ ] **Geofencing:** Include an interactive map (e.g., React-Leaflet) to set the `workplace_center`.
    -   [ ] **Time Windows & Grace Periods:** Inputs for start/end times.
    -   [ ] **Penalty Rules:** Inputs for violation thresholds and amounts.
    -   [ ] **Holidays:** A list editor to add/remove company holidays.
    -   [ ] A "Save Settings" button that calls the `updateCompanySettings` Cloud Function.

### 2.8. Analytics & Reports Module (`/reports`)
-   [ ] **Reports Dashboard:**
    -   [ ] Create a page to generate and view attendance reports.
    -   [ ] Add filters for date range, department, and employee.
    -   [ ] Implement export functionality (PDF, Excel).
-   [ ] **Analytics Charts:**
    -   [ ] Display attendance trends over time.
    -   [ ] Show department-wise attendance statistics.
    -   [ ] Create violation and penalty analytics.

### 2.9. Penalties Module (`/penalties`)
-   [ ] **Penalties Management:**
    -   [ ] Display all penalties in a data table.
    -   [ ] Add filters for status, employee, and date range.
    -   [ ] Implement "Waive Penalty" functionality.
    -   [ ] Show penalty history and reasons.

### 2.10. Notifications Module (`/notifications`)
-   [ ] **Notifications Management:**
    -   [ ] Display a feed of announcements and system notices sent to employees.
    -   [ ] Provide actions to send single-user and bulk notifications via `sendNotification` / `sendBulkNotification` Cloud Functions.
    -   [ ] Include form validation for notification category, audience selection, and preview.
    -   [ ] Surface delivery status indicators (success, queued, failed) using Firestore data.

### 2.11. Audit Logs Module (`/audit-logs`)
-   [ ] **Audit Trail Viewer:**
    -   [ ] Create a read-only table for `AUDIT_LOGS` with filters for action, resource, and date range.
    -   [ ] Implement detail drawer showing `oldValues` vs `newValues` for selected entries.
    -   [ ] Ensure the UI enforces admin-only access and paginates results for performance.

---

## Meta/Infra Status
- 2025-09-24: Set Cloud Functions `engines.node` to `22` and `main` to `lib/index.js`. Built TypeScript and verified `setUserRole` loads in Functions shell. Emulator warns host Node 22 in use, which is acceptable locally.
- 2025-09-24: Added Firestore seeding script (`npm run seed:firestore`) that loads `.env`, grants admin claim, and seeds `USERS`/`COMPANY_SETTINGS`.