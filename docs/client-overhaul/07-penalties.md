# Penalties Screen - Workflow Plan

## Screen Overview

**Purpose**: View and manage penalties

**Design Reference**: `docs/ui/client/high/penalty.png`

**Current Implementation**:
- File: `client/lib/features/penalties/presentation/penalties_screen.dart`
- Controller: `penalty_controller.dart`

**Route**: `/penalties` or accessed from Resources tab

---

## Design Analysis

### Design Shows:
1. **Summary Header**:
   - Active count: "3"
   - Total amount: "$245"

2. **Status Filters**: Tabs for All, Active, Waived, Paid, Disputed

3. **Search**: "Search by reason or ID"

4. **Penalty List**:
   - Date
   - Reason
   - Amount
   - Status badge

### Current Implementation Gap:
- ❌ No summary stats (need backend API)
- ✅ Has penalty list
- ❌ Design doesn't match mockup

---

## Data Requirements

### New Backend API Needed
**Endpoint**: `GET /api/penalties/summary`

**Response**:
```json
{
  "activeCount": 3,
  "totalAmount": 245,
  "byStatus": {
    "active": { "count": 3, "amount": 245 },
    "waived": { "count": 1, "amount": 50 },
    "paid": { "count": 2, "amount": 100 },
    "disputed": { "count": 0, "amount": 0 }
  }
}
```

**See**: `api-requirements.md`

### Models
```dart
class PenaltySummary {
  final int activeCount;
  final double totalAmount;
  final Map<String, PenaltyStatusSummary> byStatus;
}

class PenaltyStatusSummary {
  final int count;
  final double amount;
}
```

---

## Implementation Steps

### Step 1: Add Backend API (See api-requirements.md)

### Step 2: Create Penalty Summary Widget
```dart
class PenaltySummaryHeader extends StatelessWidget {
  final PenaltySummary summary;

  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _SummaryItem(
              label: 'Active',
              value: summary.activeCount.toString(),
            ),
            _SummaryItem(
              label: 'Total Amount',
              value: '\$${summary.totalAmount.toStringAsFixed(2)}',
            ),
          ],
        ),
      ),
    );
  }
}
```

### Step 3: Redesign Penalties Screen
```dart
class PenaltiesScreen extends ConsumerStatefulWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final summaryState = ref.watch(penaltySummaryProvider);
    final penaltiesState = ref.watch(penaltyListProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Penalties')),
      body: Column(
        children: [
          // Summary header
          summaryState.when(
            data: (summary) => PenaltySummaryHeader(summary: summary),
            loading: () => LoadingSkeleton(),
            error: (e, st) => ErrorWidget(e),
          ),

          // Status filters
          FilterTabs(
            tabs: [
              FilterTab(id: 'all', label: 'All'),
              FilterTab(id: 'active', label: 'Active'),
              FilterTab(id: 'waived', label: 'Waived'),
              FilterTab(id: 'paid', label: 'Paid'),
              FilterTab(id: 'disputed', label: 'Disputed'),
            ],
            selectedTab: _selectedStatus,
            onTabSelected: (id) {
              setState(() {
                _selectedStatus = id;
              });
            },
          ),

          // Search bar
          AppSearchBar(
            hint: 'Search by reason or ID',
            onChanged: (value) {
              setState(() {
                _searchQuery = value;
              });
            },
          ),

          // Penalty list
          Expanded(
            child: penaltiesState.when(
              data: (penalties) {
                final filtered = _applyFilters(penalties);
                return ListView.builder(
                  itemCount: filtered.length,
                  itemBuilder: (context, index) {
                    return PenaltyCard(penalty: filtered[index]);
                  },
                );
              },
              loading: () => LoadingSkeleton(type: SkeletonType.listItem),
              error: (e, st) => ErrorWidget(e),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## Success Criteria

- ✅ Summary stats display correctly
- ✅ Status filters work
- ✅ Search works
- ✅ Penalty list displays with correct info
- ✅ Status badges use correct colors

---

## Estimated Effort

- **Backend API**: 3 hours
- **Summary widget**: 2 hours
- **Screen redesign**: 4 hours
- **Testing**: 2 hours
- **Total**: ~11 hours (1.5 days)
