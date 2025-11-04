# Leave Management Screen - Workflow Plan

## Screen Overview

**Purpose**: View leave balance and manage leave requests

**Design Reference**: `docs/ui/client/high/leave_balance.png`

**Current Implementation**:
- File: `client/lib/features/leaves/presentation/leave_screen.dart`
- Controllers: `leave_list_controller.dart`, `leave_request_controller.dart`
- Repository: Leave repository already exists

**Route**: Accessed from Resources tab

---

## Design Analysis

### Design Shows:
1. **Leave Balance Header**
   - Large "10 REMAINING" display
   - Breakdown: "12 Total, 2 Used"

2. **Filter Tabs**
   - "This Month" / "Last Month"

3. **Leave Request List**
   - Date range display
   - Reason text
   - Status badges (Approved, Pending, Rejected)

4. **Action Button**
   - "Request Leave" button (FAB or bottom button)

### Current Implementation Gap:
- ❌ No leave balance/quota display (API doesn't exist)
- ❌ Design doesn't match mockup
- ✅ Has leave list functionality

---

## Data Requirements

### New Backend API Needed
**Endpoint**: `GET /api/leaves/balance`

**Response**:
```json
{
  "total": 12,
  "used": 2,
  "remaining": 10,
  "year": 2025
}
```

**See**: `api-requirements.md` for full specification

### Models
**New Model**:
```dart
class LeaveBalance {
  final int total;
  final int used;
  final int remaining;
  final int year;
}
```

---

## Implementation Steps

### Step 1: Add Backend API (See api-requirements.md)
1.1. Implement leave balance endpoint in Cloud Functions

### Step 2: Update Leave Repository
**File**: Repository file

```dart
Future<LeaveBalance> getLeaveBalance() async {
  final response = await _http.get('/api/leaves/balance');
  return LeaveBalance.fromJson(response.data);
}
```

### Step 3: Create Leave Balance Widget
```dart
class LeaveBalanceHeader extends StatelessWidget {
  final LeaveBalance balance;

  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(24),
        child: Column(
          children: [
            Text(
              '${balance.remaining} REMAINING',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 8),
            Text('${balance.total} Total, ${balance.used} Used'),
          ],
        ),
      ),
    );
  }
}
```

### Step 4: Redesign Leave Screen
```dart
class LeaveScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final balanceState = ref.watch(leaveBalanceProvider);
    final leavesState = ref.watch(leaveListProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Leaves')),
      body: Column(
        children: [
          // Balance header
          balanceState.when(
            data: (balance) => LeaveBalanceHeader(balance: balance),
            loading: () => LoadingSkeleton(),
            error: (e, st) => ErrorWidget(e),
          ),
          // Filter tabs
          FilterTabs(/* ... */),
          // Leave list
          Expanded(
            child: leavesState.when(/* ... */),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/leaves/new'),
        label: Text('Request Leave'),
        icon: Icon(Icons.add),
      ),
    );
  }
}
```

### Step 5: Update Leave List Items
- Use `StatusBadge` component for status
- Show date range clearly
- Show reason text

---

## Success Criteria

- ✅ Leave balance displays correctly
- ✅ Filter tabs work
- ✅ Leave list shows all requests
- ✅ Status badges display correctly
- ✅ Request leave button navigates to form

---

## Estimated Effort

- **Backend API**: 3 hours
- **Repository update**: 1 hour
- **UI components**: 4 hours
- **Screen redesign**: 4 hours
- **Testing**: 2 hours
- **Total**: ~14 hours (2 days)

---

## Related Documents

- `05-submit-leave.md` - Leave request form
- `api-requirements.md` - Backend API specs
- `00-shared-components.md` - Status badge component
