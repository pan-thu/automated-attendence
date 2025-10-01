#### **1. Cloud Schedulers**

*   **Current State:** The system utilizes 5 separate scheduled functions. This exceeds the free tier limit of 3 jobs, resulting in a small monthly charge.
*   **Proposed Change:** The number of scheduled jobs will be reduced to 2. The three daily reminders will be consolidated into a single job, the monthly penalty automation will be kept, and the daily/monthly analytics syncs will be converted to manually-triggered functions. The admin digest reminder will be removed entirely.
*   **Reason:** This change brings the number of scheduled jobs within the free tier limit (2 of 3), completely eliminating all Cloud Scheduler costs.

---

#### **2. Penalty System**

*   **Current State:** A single, overall violation threshold triggers a maximum of one penalty per user per month. The system then infers the most severe violation type to determine the fee.
*   **Proposed Change:** Implement per-violation type thresholds (e.g., 0 for 'absent', 3 for 'half-day', 5 for 'late'/'early'). Each violation type will be counted independently and will trigger its own penalty if its specific threshold is met, potentially resulting in multiple penalties per month for a single user.
*   **Reason:** To create a more granular, fair, and transparent penalty system. This allows different infractions to have their own tolerance levels and ensures penalties directly correspond to the specific rules broken.

---

#### **3. Half-Day Leave**

*   **Current State:** The 'half-day leave' feature exists but is implemented incorrectly, causing it to cancel all violations for an entire day instead of just the relevant portion.
*   **Proposed Change:** The 'half-day leave' type will be removed entirely from the system. All other leave types (full, medical, maternity) will continue to function as full-day leaves, correctly nullifying all violations for the approved dates.
*   **Reason:** To simplify the system and remove a critically flawed feature. The correct logic for a half-day leave is complex and not currently implemented, so removing it ensures the remaining leave types work reliably and predictably.

---

#### **4. Early Leave Grace Period**

*   **Current State:** The grace period logic only handles 'late' clock-ins that occur *after* a time window closes. It does not have logic to identify or flag 'early leave' clock-outs that occur *before* a window's official end time.
*   **Proposed Change:** The core clock-in logic will be modified to specifically handle the final check of the day. It will recognize a clock-out within the 30-minute grace period *before* the official end time and assign it an `'early_leave'` status.
*   **Reason:** To fix a bug and correctly implement the business rule for early departures. This ensures 'early_leave' violations are accurately tracked and can be properly counted by the new, more granular penalty system.