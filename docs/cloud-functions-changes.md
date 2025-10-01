#### **1. Daily Clock-In Reminders**

*   **Current State:** Each of the three daily reminders (morning, mid-day, end-of-day) would require its own separate scheduled job, consuming three scheduler slots in total.
*   **Proposed Change:** Consolidate all three daily reminders into a single, unified Cloud Function. This function will be triggered by a single Cloud Scheduler job configured to run three times per day (e.g., at 8:30, 13:30, and 17:30 UTC). The function's internal logic will determine which specific reminder to send based on the time it was triggered.
*   **Reason:** To reduce the number of scheduler jobs from three to one, significantly contributing to staying within the free tier. This also centralizes the reminder logic, making the code easier to maintain and update.

---

#### **2. Admin Pending Action Reminders**

*   **Current State:** A scheduled function (`scheduledPendingActionDigest`) runs every day to notify administrators about pending leave requests, consuming one scheduler job slot.
*   **Proposed Change:** The `scheduledPendingActionDigest` function and its corresponding scheduler job will be removed entirely.
*   **Reason:** This notification is a non-essential "quality of life" feature. Removing it is a straightforward way to free up a scheduler slot without affecting the core functionality of the admin dashboard. Administrators will be responsible for proactively checking for pending tasks.

---

#### **3. Daily & Monthly Analytics Syncs**

*   **Current State:** Two separate scheduled functions (`scheduledDailyAnalyticsSync` and `scheduledMonthlyAnalyticsSync`) run automatically to pre-calculate and save summary data for the dashboard. These consume two scheduler job slots.
*   **Proposed Change:** Convert both the daily and monthly analytics sync functions from scheduled `onSchedule` triggers to manually-invoked `onCall` triggers. Administrators will initiate these data aggregation tasks on-demand by clicking a button in the admin dashboard.
*   **Reason:** For a low-traffic school project, automatic daily/monthly aggregation is unnecessary. Making this process manual completely removes two scheduler jobs, provides more control for demonstrations, and ensures no costs are incurred for analytics processing unless actively requested.

---

#### **4. Penalty System**

*   **Current State:** A single, overall violation threshold triggers a maximum of one penalty per user per month. The system then infers the most severe violation type to determine the fee.
*   **Proposed Change:** Implement per-violation type thresholds (e.g., 0 for 'absent', 3 for 'half-day', 5 for 'late'/'early'). Each violation type will be counted independently and will trigger its own penalty if its specific threshold is met, potentially resulting in multiple penalties per month for a single user.
*   **Reason:** To create a more granular, fair, and transparent penalty system. This allows different infractions to have their own tolerance levels and ensures penalties directly correspond to the specific rules broken.

---

#### **5. Half-Day Leave**

*   **Current State:** The 'half-day leave' feature exists but is implemented incorrectly, causing it to cancel all violations for an entire day instead of just the relevant portion.
*   **Proposed Change:** The 'half-day leave' type will be removed entirely from the system. All other leave types (full, medical, maternity) will continue to function as full-day leaves, correctly nullifying all violations for the approved dates.
*   **Reason:** To simplify the system and remove a critically flawed feature. The correct logic for a half-day leave is complex and not currently implemented, so removing it ensures the remaining leave types work reliably and predictably.

---

#### **6. Early Leave Grace Period**

*   **Current State:** The grace period logic only handles 'late' clock-ins that occur *after* a time window closes. It does not have logic to identify or flag 'early leave' clock-outs that occur *before* a window's official end time.
*   **Proposed Change:** The core clock-in logic will be modified to specifically handle the final check of the day. It will recognize a clock-out within the 30-minute grace period *before* the official end time and assign it an `'early_leave'` status.
*   **Reason:** To fix a bug and correctly implement the business rule for early departures. This ensures 'early_leave' violations are accurately tracked and can be properly counted by the new, more granular penalty system.