# Business Logic Summary - Automated Attendance System

## Four Violation Types

### 1. Full Absent
- **Definition**: Employee misses more than 1 check (0 or 1 checks completed)
- **Tracking**: Daily `status` field = `'absent'`
- **Penalty Amount**: $20 USD
- **Threshold**: 4th violation in a month triggers penalty

### 2. Half-Day Absent
- **Definition**: Employee misses exactly 1 check (2 checks completed)
- **Tracking**: Daily `status` field = `'half_day_absent'`
- **Penalty Amount**: $15 USD
- **Threshold**: 4th violation in a month triggers penalty

### 3. Late Arrival
- **Definition**: Check-in within grace period **after** time window end
- **Applies To**: Check 1 (morning) and Check 2 (lunch return)
- **Tracking**: `check1_status` or `check2_status` = `'late'`
- **Penalty Amount**: $10 USD
- **Threshold**: 4th violation in a month triggers penalty

### 4. Early Leave
- **Definition**: Check-out within grace period **before** time window start
- **Applies To**: Check 3 (evening checkout) only
- **Tracking**: `check3_status` = `'early_leave'`
- **Penalty Amount**: $10 USD
- **Threshold**: 4th violation in a month triggers penalty

---

## Grace Period Behavior

### Per-Check Configuration
Grace periods are configured individually for each check slot in `COMPANY_SETTINGS`:

```typescript
gracePeriods: {
  check1: 30,  // Late arrival grace for morning check
  check2: 30,  // Late arrival grace for lunch return
  check3: 30,  // Early leave AND late checkout grace for evening
}
```

### Check 1 & Check 2 (Morning/Lunch)
- **Before window start**: Too early → Rejected
- **Within window** (start to end): On time ✅
- **After window, within grace**: Late ⚠️ (violation)
- **After grace period**: Too late → Rejected

### Check 3 (Evening)
- **Before (window start - grace)**: Too early → Rejected
- **Within early grace** (before window start): Early leave ⚠️ (violation)
- **Within window** (start to end): On time ✅
- **After window, within late grace**: Late ⚠️ (violation)
- **After late grace period**: Too late → Rejected

---

## Leave Management

### Leave Request Flow

1. **Submission** (`submitLeaveRequest`):
   - Calculates `totalDays` = `Math.ceil((end - start) / 86400000) + 1` (inclusive)
   - Validates against current balance for leave type
   - Rejects if `totalDays > currentBalance`
   - Checks for overlapping pending/approved leaves
   - Requires attachments for Medical and Maternity types

2. **Approval** (`handleLeaveApproval`):
   - Deducts `totalDays` from user's balance field
   - Backfills `ATTENDANCE_RECORDS` with `status: 'on_leave'`
   - Sends notification to employee
   - Records audit log

3. **Cancellation** (`cancelLeaveRequest`):
   - Restores `totalDays` to user's balance (for approved leaves)
   - Removes attendance backfills
   - Sends cancellation notification

### Leave Types & Balance Fields

```typescript
leaveTypeFieldMap = {
  'full': 'fullLeaveBalance',
  'medical': 'medicalLeaveBalance',
  'maternity': 'maternityLeaveBalance',
}
```

### Leave Balance Validation
- **Submission**: Validates `totalDays <= currentBalance`
- **Approval**: Deducts `totalDays`, ensures balance doesn't go below 0
- **Cancellation**: Restores `totalDays` only for approved leaves

---

## Penalty Calculation

### Monthly Automation
- **Schedule**: 1st of each month at 2:00 AM UTC
- **Function**: `scheduledPenaltyAutomation`
- **Process**:
  1. Queries all `ATTENDANCE_RECORDS` for previous month
  2. Counts violations by type per user:
     - Daily status: `absent`, `half_day_absent`
     - Check statuses: `late` (from check1/check2), `early_leave` (from check3)
  3. Applies thresholds from `COMPANY_SETTINGS.penaltyRules.violationThresholds`
  4. Creates `PENALTIES` when threshold reached
  5. Records all data in `VIOLATION_HISTORY`

### Configuration Schema

```typescript
penaltyRules: {
  violationThresholds: {
    absent: 4,
    half_day_absent: 4,
    late: 4,
    early_leave: 4,
  },
  amounts: {
    absent: 20,
    half_day_absent: 15,
    late: 10,
    early_leave: 10,
  },
}
```

### Penalty Lifecycle
- **Status**: `active`, `waived`, `acknowledged`
- **Admin Actions**: Waive with mandatory reason (audit logged)
- **Employee Actions**: Acknowledge penalties via mobile app

---

## Data Model

### Attendance Record Fields
```typescript
{
  userId: string,
  attendanceDate: Timestamp,
  status: 'in_progress' | 'present' | 'half_day_absent' | 'absent' | 'on_leave',

  check1_status: 'on_time' | 'late' | 'missed',
  check1_timestamp: Timestamp,
  check1_location: GeoPoint,

  check2_status: 'on_time' | 'late' | 'missed',
  check2_timestamp: Timestamp,
  check2_location: GeoPoint,

  check3_status: 'on_time' | 'late' | 'early_leave' | 'missed',
  check3_timestamp: Timestamp,
  check3_location: GeoPoint,
}
```

### Leave Request Fields
```typescript
{
  userId: string,
  leaveType: string,
  status: 'pending' | 'approved' | 'rejected' | 'cancelled',
  startDate: Timestamp,
  endDate: Timestamp,
  totalDays: number,  // Calculated: inclusive of start/end
  reason: string,
  attachmentId?: string,
}
```

### Penalty Fields
```typescript
{
  userId: string,
  violationType: 'absent' | 'half_day_absent' | 'late' | 'early_leave',
  amount: number,
  status: 'active' | 'waived' | 'acknowledged',
  violationCount: number,
  dateIncurred: Timestamp,
}
```

---

## Key Implementation Files

- **Violation Detection**: `functions/src/services/clockInUtils.ts:88-144`
- **Daily Status Calculation**: `functions/src/services/clockInUtils.ts:146-166`
- **Penalty Calculation**: `functions/src/services/penalties.ts:128-236`
- **Leave Management**: `functions/src/services/leaves.ts:349-519`
- **Configuration Seed**: `functions/src/scripts/seedFirestore.ts:52-116`

---

## Testing Coverage

- **Unit Tests**: `functions/src/__tests__/clockInUtils.test.ts`
  - All 4 violation types
  - Grace period boundaries
  - Daily status calculation

- **Integration Tests**:
  - `functions/src/__tests__/penalties.integration.test.ts`: Penalty calculation flows
  - `functions/src/__tests__/leaves.integration.test.ts`: Leave management flows
