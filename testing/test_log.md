## Timeboxing 1

TB1-T01 — Update Settings 
Objective: Verify that an Admin can update the workplace radius and working time windows, and that changes are saved.
Preconditions/Test Data: Admin user signed in; initial radius and window exist.
Procedures: Try to save a new radius value in settings.
Expected Result: Admin user can make the changes.
Actual Result:
Proofs: 

TB1-T02 — Settings Validation
Objective: Show clear error messages for invalid values.
Preconditions/Test Data: Admin user signed in.
Procedures: Try to save a negative radius in settings.
Expected Result: Show error messages.
Actual Result: 
Proofs: 

TB1-T03 — Create Employee
Objective: Admin can add a new employee with required fields.
Preconditions/Test Data: Admin signed in; sample employee data ready.
Procedures: Try to create a new employee with mandatory information.
Expected Result: New employee created.
Actual Result: 
Proofs: 

TB1-T04 — Deactivate Employee
Objective: Admin can deactivate an employee and the change is reflected in the list.
Preconditions/Test Data: An active employee exists.
Procedures: Try to select and deactivate an active employee in employee list.
Expected Result: Employee is deactivated.
Actual Result: 
Proofs: 

TB1-T05 — Attendance List and Filter
Objective: Admin can view attendance and filter by date and employee.
Preconditions/Test Data: At least two employees and several attendance records.
Procedures: Try to filter the list by specific employee.
Expected Result: Filtered list of employees correctly display.
Actual Result: 
Proofs: 

TB1-T06 — Approve Leave
Objective: Admin can approve a pending leave and status changes to Approved.
Preconditions/Test Data: At least one pending leave request exists.
Procedures: Try to select and approve a pending leave request with comment.
Expected Result: Leave is approved.
Actual Result: 
Proofs: 

TB1-T07 — Reject Leave
Objective: Rejecting a leave requires a comment and status becomes Rejected.
Preconditions/Test Data: A pending leave request exists.
Procedures: Try to reject a pending leave without comment first, then reject with a comment.
Expected Result: Leave is rejected.
Actual Result: 
Proofs: 

TB1-T08 — Waive Penalty 
Objective: Admin can waive a penalty only after entering a reason; an audit entry is created.
Preconditions/Test Data: At least one penalty exists.
Procedures: Try to waive a penalty without reason first, then waive it with reason.
Expected Result: Penalty is waived with audit record.
Actual Result: 
Proofs: 

TB1-T09 — Audit Log Read-Only and Completeness
Objective: Sensitive actions appear in the audit log; entries cannot be edited.
Preconditions/Test Data: Perform actions from T04, T07, T08 first.
Procedures: Try to find audit entry for T04, T07 and T08 and attempt to edit them.
Expected Result: Unmodifiable entries appear in audit log for test 04, 07 and 08.
Actual Result: 
Proofs: 

TB1-T10 — Role Access 
Objective: Only Admin can access Admin pages.
Preconditions/Test Data: Valid Admin account and a non-admin account exist.
Procedures: Try to login with an Employee account then login with Admin account.
Expected Result: Authenticated when logged in as Admin but denied access when logged in as Employee.
Actual Result: 
Proofs: 

TB1-T11 — Save and Refresh Consistency
Objective: Changes in Settings remain after refresh and re-login.
Preconditions/Test Data: Admin user signed in.
Procedures: Save new settings, refresh page, log out and back in, re-check values.
Expected Result: Settings are still updated.
Actual Result: 
Proofs:

TB1-T12 — Audit Log After Failures
Objective: Failed attempts (e.g., reject without comment) should not create audit entries.
Preconditions/Test Data: Admin user signed in.
Procedures: Trigger a validation failure, then check the audit log.
Expected Result: No audit entry found.
Actual Result: 
Proofs: 

TB1-T13 — Direct URL Access Blocked
Objective: Non-admin cannot open Admin pages via direct URL.
Preconditions/Test Data: N/A
Procedures: Paste an Admin URL into the browser.
Expected Result: Redirected to the login page.
Actual Result: 
Proofs: 

---

## Timeboxing 2

TB2-T01 — Login Success
Objective: Employee can sign in with valid credentials.
Preconditions/Test Data: Valid employee account exists.
Procedures: Open the app, enter valid credentials, tap Sign In.
Expected Result: The app signs in successfully, shows the Home screen, and displays the employee’s name or ID.
Actual Result:
Proofs:

TB2-T02 — Login Error Message
Objective: Clear error message appears for wrong password.
Preconditions/Test Data: Valid account; wrong password.
Procedures: Open the app, enter the correct username with an incorrect password, tap Sign In.
Expected Result: Sign in is rejected, an error banner explains that the password is incorrect, and input fields remain editable.
Actual Result:
Proofs:

TB2-T03 — Clock-In Inside Geofence and Time Window
Objective: Successful clock-in when location and time are valid.
Preconditions/Test Data: Device location within geofence; current time inside working window.
Procedures: Open Home, confirm current status, tap Clock In.
Expected Result: Clock-in is recorded, success message is shown, and status changes to Clocked In with the correct timestamp.
Actual Result:
Proofs:

TB2-T04 — Clock-In Outside Geofence
Objective: Show clear message and prevent clock-in when outside the allowed area.
Preconditions/Test Data: Device location outside geofence.
Procedures: Open Home, tap Clock In.
Expected Result: Clock-in is blocked, a short message explains that the user is outside the allowed area, and no attendance record is created.
Actual Result:
Proofs:

TB2-T05 — Clock-In Outside Time Window
Objective: Show clear message and prevent clock-in when time is not allowed.
Preconditions/Test Data: Current time outside working window.
Procedures: Open Home, tap Clock In.
Expected Result: Clock-in is blocked, a short message explains that the time is outside the allowed window, and no attendance record is created.
Actual Result:
Proofs:

TB2-T06 — Mock or Invalid Location Detected
Objective: Block clock-in and warn if mock location or invalid GPS is detected.
Preconditions/Test Data: Device set to mock location or using an invalid provider.
Procedures: Open Home, tap Clock In.
Expected Result: Clock-in is blocked, a warning explains that the location source is not trusted, and no attendance record is created.
Actual Result:
Proofs:

TB2-T07 — Clock-Out Success
Objective: Successful clock-out from a valid clock-in session.
Preconditions/Test Data: User is currently clocked in.
Procedures: Open Home, tap Clock Out.
Expected Result: Clock-out is recorded, success message is shown, and status changes to Not Clocked In with the correct timestamp.
Actual Result:
Proofs:

TB2-T08 — Offline Clock-In Retry
Objective: If network is unavailable, the app queues the attempt and retries safely.
Preconditions/Test Data: Network disabled after opening the app.
Procedures: On Home, tap Clock In while offline, wait for the offline notice, enable network, return to the app.
Expected Result: The app keeps the pending attempt and submits it when the network returns, resulting in a recorded clock-in with the original local time and a confirmation message.
Actual Result:
Proofs:

TB2-T09 — Leave Request Submit with Attachment
Objective: Create a leave request with dates, reason, and attachment.
Preconditions/Test Data: Sample image or PDF file available.
Procedures: Open Leave, select start and end dates, enter a reason, attach a file, submit the request.
Expected Result: Leave request is created, status shows Pending, the attachment is listed, and the request appears in the user’s leave history.
Actual Result:
Proofs:

TB2-T10 — Leave Request Validation for Missing Fields
Objective: Required fields are enforced with friendly messages.
Preconditions/Test Data: None.
Procedures: Open Leave, attempt to submit without dates or without a reason.
Expected Result: Submission is blocked, specific messages indicate which fields are missing, and the form remains on screen.
Actual Result:
Proofs:

TB2-T11 — Attendance History List and Filter
Objective: History shows correct records and can filter by date range.
Preconditions/Test Data: Several attendance records exist across different days.
Procedures: Open History, set a date range, apply the filter.
Expected Result: The list refreshes to show only records inside the selected range, and totals or summaries update accordingly.
Actual Result:
Proofs:

TB2-T12 — Notification Display
Objective: In-app notification appears for a relevant event such as leave approval.
Preconditions/Test Data: A test notification is sent from the admin or system.
Procedures: Open the app, wait for the event, open the notification list, select the new notification.
Expected Result: A new notification appears with a clear title and timestamp, opens the related detail when selected, and marks as read after viewing.
Actual Result:
Proofs:

TB2-T13 — Profile Update and Save
Objective: Employee can edit and save basic profile details; changes persist.
Preconditions/Test Data: Employee logged in.
Procedures: Open Profile, change one or more fields, save, reopen Profile.
Expected Result: Changes are saved successfully, a confirmation message appears, and updated values are visible after reopening the screen.
Actual Result:
Proofs:

TB2-T14 — Profile Update Audit Entry
Objective: Profile changes are recorded for audit.
Preconditions/Test Data: Complete TB2-F13.
Procedures: Make a profile change, save, then review the audit information from the admin or audit view.
Expected Result: An audit entry exists for the profile update, including user, action, and timestamp, and the entry is read-only.
Actual Result:
Proofs:

TB2-T15 — Save and Refresh Consistency on Mobile
Objective: After closing and reopening the app, the latest status and data remain correct.
Procedures: Perform a clock-in, close the app, reopen the app, review the Home and History screens; then change a profile field, close and reopen, review the Profile screen.
Expected Result: The app restores the correct logged-in state, shows the correct clock-in status and timestamps, and retains the saved profile changes.
Actual Result:
Proofs:

---

## Timeboxing 3

TB3-T01 — Nightly Penalty Calculation: Late Arrival
Objective: Create a penalty when an employee is late beyond the grace period.
Preconditions/Test Data: Company grace period set; an attendance record with a start time later than allowed; no existing penalty for that date.
Procedures: Run the nightly penalty job with the test date in scope, then open the penalties list for the employee.
Expected Result: One penalty entry is created for that date with type Late and correct notes.
Actual Result:
Proofs:

TB3-T02 — Nightly Penalty Calculation: Absence
Objective: Create a penalty when there is no attendance for a scheduled workday.
Preconditions/Test Data: A workday with no clock-in and no approved leave; holiday calendar excludes the date.
Procedures: Run the nightly penalty job with the test date in scope, then open the penalties list.
Expected Result: One penalty entry is created for that date with type Absent and correct notes.
Actual Result:
Proofs:

TB3-T03 — Holiday and Weekend Respect
Objective: No penalty is created on holidays or non-working days.
Preconditions/Test Data: Holiday defined for a date; no attendance on that date.
Procedures: Run the nightly penalty job with the holiday date in scope, then review penalties.
Expected Result: No penalty is created for the holiday date.
Actual Result:
Proofs:

TB3-T04 — Idempotency for Nightly Job
Objective: Re-running the job does not create duplicate penalties.
Preconditions/Test Data: Penalties already created by a previous run for the same period.
Procedures: Run the nightly penalty job again for the same date range, then check the penalties list.
Expected Result: No new duplicate entries are added; counts remain the same.
Actual Result:
Proofs:

TB3-T05 — Waived Penalty is Not Recreated
Objective: A previously waived penalty is not recreated by later runs.
Preconditions/Test Data: One penalty from an earlier run is manually waived with a reason.
Procedures: Run the nightly penalty job for the same date again, then check the penalty status.
Expected Result: The waived penalty remains waived and no new penalty is created for that date.
Actual Result:
Proofs:

TB3-T06 — Daily Reminder for Missing Attendance
Objective: Send a reminder to employees who did not clock in by a set time.
Preconditions/Test Data: At least one employee with missing attendance on the day; reminder window set.
Procedures: Run the reminder job for the day, open the notifications list on the employee device or the admin page.
Expected Result: A reminder notification exists for the employee with a short message and timestamp.
Actual Result:
Proofs:

TB3-T07 — Reminder Respecting Approved Leave
Objective: Do not send a missing-attendance reminder to an employee on approved leave.
Preconditions/Test Data: Employee has approved leave for the day.
Procedures: Run the reminder job for the day and review notifications for that employee.
Expected Result: No reminder is created for the employee on leave.
Actual Result:
Proofs:

TB3-T08 — Report: Late Count per Employee
Objective: Show correct late counts for a selected date range.
Preconditions/Test Data: Several attendance records across the range; some late, some on time.
Procedures: Open Reports, select the date range, view Late Count table or card.
Expected Result: The late count matches the data for the range and each employee shows correct totals.
Actual Result:
Proofs:

TB3-T09 — Report: Absence Summary
Objective: Show the number of absences per employee for a selected period.
Preconditions/Test Data: At least one absence per employee across the period.
Procedures: Open Reports, select the date range, review Absence Summary.
Expected Result: The absence counts match the stored data for the range.
Actual Result:
Proofs:

TB3-T10 — Report: Leave Usage
Objective: Show total approved leave days per employee for a selected period.
Preconditions/Test Data: Approved leave records in the period.
Procedures: Open Reports, select the date range, review Leave Usage.
Expected Result: The totals match the approved leave records for the range.
Actual Result:
Proofs:

TB3-T11 — Audit Entries for Automated Actions
Objective: Automated jobs write audit entries with action and timestamp.
Preconditions/Test Data: Run any job that creates or skips items.
Procedures: After the job completes, open Audit Log and review entries.
Expected Result: Audit entries exist for the job run, include the system identity, action type, and timestamp, and are read-only.
Actual Result:
Proofs:

TB3-T12 — Retry on Temporary Failure
Objective: If a job step fails temporarily, it retries safely.
Preconditions/Test Data: Simulate a temporary failure such as a brief database or network issue.
Procedures: Run the job during the simulated failure window, then remove the fault and let the job continue.
Expected Result: The job retries and completes without duplicate penalties or notifications.
Actual Result:
Proofs:

TB3-T13 — Respect Current Settings
Objective: Jobs read the latest company settings when running.
Preconditions/Test Data: Change grace period or working window before a run.
Procedures: Update settings, run the nightly job, review results for the affected date.
Expected Result: Calculations reflect the new settings and notes show correct thresholds.
Actual Result:
Proofs:

TB3-T14 — Scheduled Time Verification
Objective: Jobs run at the configured time of day.
Procedures: Set the schedule to a known time, wait for the window, verify logs and outcomes.
Expected Result: The job runs within the expected minute range and outcomes are recorded.
Actual Result:
Proofs:

