# Fix: Correct Monthly Violation Classification

## Summary
- Resolved incorrect penalty type classification in `calculateMonthlyViolations` that always selected the "absent" penalty amount.
- Captured actual violation statuses alongside their originating fields for proper audit trails and penalty calculations.
- Ensured employees receive rejection notifications by populating leave summary metadata for both approval and rejection flows.

## Root Cause
- Violations were aggregated using the Firestore field name (`status`, `check1_status`, etc.) rather than the actual status value (`late`, `absent`, ...). The helper `inferMonthlyViolationType` inspected the field names, so every violation matched the `status` substring and returned `absent`.
- `leaveSummary` was only populated when approving a leave request, so rejection notifications never had the data needed for messaging.

## Resolution
- Store violations as `{ field, status }` pairs to retain the real status, adjust `inferMonthlyViolationType` to work directly on status values, and include `missed` handling.
- Capture leave metadata for both approve/reject branches and adjust the rejection notification message to include reviewer notes when present.


