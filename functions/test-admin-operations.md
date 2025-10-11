# Admin Operations Test Suite

## Purpose

Verify that all critical admin operations work correctly after migration to 2nd-gen Cloud Functions, with proper error handling and logging.

---

## Pre-Test Setup

### 1. Start Emulators
```bash
cd functions
npm run build
npm run serve
```

### 2. Seed Initial Data
```bash
npm run seed:firestore
```

This creates:
- Admin user (from `SEED_ADMIN_UID`)
- Default company settings

### 3. Start Admin Dashboard
```bash
cd admin
npm run dev
```

Ensure `.env.local` has:
```env
NEXT_PUBLIC_USE_EMULATORS="true"
NODE_ENV="development"
```

### 4. Log In as Admin
- Navigate to `http://localhost:3000/login`
- Use admin credentials
- Verify role is "admin" in custom claims

---

## Critical Operations to Test

### Test 1: Update Company Settings ⚙️

**Function**: `updateCompanySettings`

**Steps**:
1. Navigate to `/settings` page
2. Modify settings:
   - Company name
   - Time windows (check1, check2, check3)
   - Grace periods
   - Workplace location (lat/lng/radius)
   - Penalty rules
3. Click "Save"
4. Verify success message (not "internal" error)
5. Reload page → verify changes persisted

**Expected Logs** (check emulator):
```
INFO: [updateCompanySettings] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [updateCompanySettings] Completed successfully { userId: '...', durationMs: 150 }
```

**Test Invalid Input**:
- Enter invalid time format → should show `invalid-argument` error
- Enter negative grace period → should show validation error
- Enter invalid lat/lng → should show validation error

**Checklist**:
- [ ] Settings update succeeds
- [ ] Changes persist after reload
- [ ] Invalid input shows structured error (not "internal")
- [ ] Logs show success message
- [ ] Audit log created

---

### Test 2: Create Employee 👤

**Function**: `createEmployee`

**Steps**:
1. Navigate to `/employees` page
2. Click "Add Employee"
3. Fill form:
   - Email: `test@example.com`
   - Password: `password123`
   - Full Name: `John Doe`
   - Department: `Engineering`
   - Position: `Developer`
4. Submit form
5. Verify employee appears in list
6. Check employee can log in (optional)

**Expected Logs**:
```
INFO: [createEmployee] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [createEmployee] Completed successfully { userId: '...', durationMs: 200 }
```

**Test Invalid Input**:
- Missing email → `invalid-argument`
- Invalid email format → `invalid-argument`
- Short password (<8 chars) → `invalid-argument`
- Duplicate email → should fail gracefully

**Checklist**:
- [ ] Employee created successfully
- [ ] Employee appears in list
- [ ] Invalid input shows structured errors
- [ ] Logs show creation success
- [ ] Audit log created
- [ ] Employee can log in (if testing login)

---

### Test 3: Update Employee 📝

**Function**: `updateEmployee`

**Steps**:
1. Navigate to `/employees` page
2. Click on employee created in Test 2
3. Edit `/employees/[id]` page:
   - Change full name
   - Change department
   - Update leave balances
4. Save changes
5. Verify updates persisted

**Expected Logs**:
```
INFO: [updateEmployee] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [updateEmployee] Completed successfully { userId: '...', durationMs: 120 }
```

**Test Invalid Input**:
- Try to update non-existent employee → `not-found`
- Enter negative leave balance → `invalid-argument`

**Checklist**:
- [ ] Employee updated successfully
- [ ] Changes persist after reload
- [ ] Invalid input shows structured errors
- [ ] Logs show update success
- [ ] Audit log created

---

### Test 4: Manual Set Attendance 📅

**Function**: `manualSetAttendance`

**Steps**:
1. Navigate to `/attendance` page
2. Click "Manual Entry" or similar
3. Fill form:
   - Select employee (from Test 2)
   - Select date
   - Select status (present/absent/half-day)
   - Enter reason: "System testing"
   - Optionally set check statuses
4. Submit
5. Verify attendance record created

**Expected Logs**:
```
INFO: [manualSetAttendance] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [manualSetAttendance] Completed successfully { userId: '...', durationMs: 180 }
```

**Test Invalid Input**:
- Missing reason → `invalid-argument`
- Invalid date format → `invalid-argument`
- Short reason (<5 chars) → `invalid-argument`

**Checklist**:
- [ ] Attendance record created
- [ ] Record shows in attendance list
- [ ] Invalid input shows structured errors
- [ ] Logs show success
- [ ] Audit log created with reason

---

### Test 5: Leave Approval ✅

**Function**: `handleLeaveApproval`

**Steps**:
**Setup** (create leave request first):
1. Log in as employee (or use callable directly)
2. Submit leave request via `submitLeaveRequest`
3. Log out, log back in as admin

**Test**:
1. Navigate to `/leaves` page
2. Find pending leave request
3. Click "Approve" or "Reject"
4. Add optional notes
5. Confirm action
6. Verify leave status updated

**Expected Logs**:
```
INFO: [handleLeaveApproval] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [handleLeaveApproval] Completed successfully { userId: '...', durationMs: 250 }
```

**Test Business Logic Errors**:
- Try to approve already-approved leave → `failed-precondition`
- Try to approve cancelled leave → `failed-precondition`
- Invalid leave request ID → `not-found`

**Checklist**:
- [ ] Leave approved/rejected successfully
- [ ] Leave status updated
- [ ] Leave balance adjusted (if approved)
- [ ] Attendance records backfilled (if approved)
- [ ] Business logic errors show structured errors
- [ ] Logs show success
- [ ] Audit log created

---

### Test 6: Waive Penalty 💰

**Function**: `waivePenalty`

**Steps**:
**Setup** (create penalty first):
1. Create violations via attendance records
2. Run `calculateMonthlyViolations` to generate penalty
3. Verify penalty exists in `/penalties` page

**Test**:
1. Navigate to `/penalties` page
2. Find active penalty
3. Click "Waive Penalty"
4. Enter waiver reason: "First-time offense forgiven"
5. Confirm waiver
6. Verify penalty marked as waived

**Expected Logs**:
```
INFO: [waivePenalty] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [waivePenalty] Completed successfully { userId: '...', durationMs: 100 }
```

**Test Invalid Input**:
- Missing reason → `invalid-argument`
- Short reason (<5 chars) → `invalid-argument`
- Invalid penalty ID → `not-found`

**Checklist**:
- [ ] Penalty waived successfully
- [ ] Penalty status updated
- [ ] Waive reason saved
- [ ] Invalid input shows structured errors
- [ ] Logs show success
- [ ] Audit log created with reason

---

### Test 7: Get Dashboard Stats 📊

**Function**: `getDashboardStats`

**Steps**:
1. Navigate to `/` (dashboard home)
2. Dashboard should load automatically
3. Verify stats display:
   - Total employees
   - Present count
   - Absent count
   - Late count
   - On leave count
4. Change date filter
5. Verify stats update

**Expected Logs**:
```
INFO: [getDashboardStats] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [getDashboardStats] Completed successfully { userId: '...', durationMs: 120 }
```

**Test Invalid Input**:
- Invalid date format → `invalid-argument`

**Checklist**:
- [ ] Dashboard loads successfully
- [ ] Stats display correctly
- [ ] Date filter works
- [ ] Invalid input shows structured errors
- [ ] Logs show success

---

### Test 8: Generate Attendance Report 📈

**Function**: `generateAttendanceReport`

**Steps**:
1. Navigate to `/reports` page
2. Select date range (start → end)
3. Optionally filter by employee or department
4. Click "Generate Report"
5. Verify report data displays

**Expected Logs**:
```
INFO: [generateAttendanceReport] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [generateAttendanceReport] Completed successfully { userId: '...', durationMs: 300 }
```

**Test Invalid Input**:
- End date before start date → `invalid-argument`
- Invalid date format → `invalid-argument`

**Checklist**:
- [ ] Report generates successfully
- [ ] Data displays correctly
- [ ] Filters work (employee, department)
- [ ] Invalid input shows structured errors
- [ ] Logs show success
- [ ] Audit log created

---

### Test 9: Send Notification 📬

**Function**: `sendNotification`

**Steps**:
1. Navigate to `/notifications` page
2. Click "Send Notification"
3. Fill form:
   - Select employee
   - Enter title: "Test Notification"
   - Enter message: "This is a test notification from admin"
   - Select category (optional)
4. Send
5. Verify notification created

**Expected Logs**:
```
INFO: [sendNotification] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [sendNotification] Completed successfully { userId: '...', durationMs: 150 }
```

**Test Invalid Input**:
- Missing title → `invalid-argument`
- Missing message → `invalid-argument`
- Invalid employee ID → `not-found`

**Checklist**:
- [ ] Notification sent successfully
- [ ] Notification appears in employee's notification list
- [ ] Invalid input shows structured errors
- [ ] Logs show success
- [ ] Audit log created

---

### Test 10: Send Bulk Notification 📢

**Function**: `sendBulkNotification`

**Steps**:
1. Navigate to `/notifications` page
2. Click "Send Bulk Notification"
3. Select multiple employees (or "All Employees")
4. Enter title and message
5. Send
6. Verify notifications created for all selected employees

**Expected Logs**:
```
INFO: [sendBulkNotification] Started { userId: '...', hasAuth: true, hasData: true }
INFO: [sendBulkNotification] Completed successfully { userId: '...', durationMs: 400 }
```

**Test Invalid Input**:
- Empty user list → `invalid-argument`
- Missing title → `invalid-argument`

**Checklist**:
- [ ] Bulk notification sent successfully
- [ ] Notifications created for all employees
- [ ] Invalid input shows structured errors
- [ ] Logs show success with count
- [ ] Audit log created with count

---

## Test Summary Matrix

| Operation | Function | Status | Error Handling | Logging | Audit Log |
|-----------|----------|--------|----------------|---------|-----------|
| Update Settings | `updateCompanySettings` | ⬜ | ⬜ | ⬜ | ⬜ |
| Create Employee | `createEmployee` | ⬜ | ⬜ | ⬜ | ⬜ |
| Update Employee | `updateEmployee` | ⬜ | ⬜ | ⬜ | ⬜ |
| Manual Attendance | `manualSetAttendance` | ⬜ | ⬜ | ⬜ | ⬜ |
| Leave Approval | `handleLeaveApproval` | ⬜ | ⬜ | ⬜ | ⬜ |
| Waive Penalty | `waivePenalty` | ⬜ | ⬜ | ⬜ | ⬜ |
| Dashboard Stats | `getDashboardStats` | ⬜ | ⬜ | ⬜ | ⬜ |
| Generate Report | `generateAttendanceReport` | ⬜ | ⬜ | ⬜ | ⬜ |
| Send Notification | `sendNotification` | ⬜ | ⬜ | ⬜ | ⬜ |
| Send Bulk Notification | `sendBulkNotification` | ⬜ | ⬜ | ⬜ | ⬜ |

---

## General Success Criteria

For ALL operations:

### Client-Side (Admin Dashboard)
- ✅ Operation completes without "internal" error
- ✅ Success message displays correctly
- ✅ Error messages are specific and actionable
- ✅ UI updates reflect changes
- ✅ No console errors

### Server-Side (Emulator Logs)
- ✅ Function start logged with context
- ✅ Function completion logged with duration
- ✅ Errors logged with stack trace and details
- ✅ No unhandled exceptions

### Database (Firestore Emulator)
- ✅ Data persists correctly
- ✅ Audit logs created for all operations
- ✅ Timestamps use serverTimestamp()
- ✅ Data structure matches schema

---

## Next Steps After Testing

1. ✅ Complete all 10 critical operations
2. ✅ Verify error handling for each
3. ✅ Check emulator logs for all operations
4. ✅ Confirm audit logs created
5. ➡️ Create Phase 3 completion summary
6. ➡️ Proceed to deployment preparation
