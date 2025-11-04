# Attendance History Screen - Workflow Plan

## Screen Overview

**Purpose**: View attendance history with calendar view and detailed check records

**Design Reference**: `docs/ui/client/high/attendance.png`

**Current Implementation**:
- File: `client/lib/features/attendance_history/presentation/attendance_history_screen.dart`
- Controller: `client/lib/features/attendance_history/controllers/attendance_calendar_controller.dart`
- Repository: `client/lib/features/attendance_history/repository/attendance_history_repository.dart`

**Route**: `/attendance` (Attendance tab - index 1 in bottom navigation)

---

## Design Analysis

### Design Shows:
1. **Month/Year Selector**
   - Horizontal scrollable months: May, June, July (highlighted)
   - Year selector: 2025
   - Clean, minimal design

2. **Statistics Legend**
   - Color-coded summary showing:
     - 25/30 Present (green)
     - 01/25 Absent (red)
     - 02/25 Late (yellow/orange)
     - 0/25 Leave (gray)
     - 0/25 Half Day (orange)

3. **List View**
   - Table-style layout with columns:
     - Date (with color-coded indicator)
     - Check 1 (time)
     - Check 2 (time)
     - Check 3 (time)
   - Warning icons for late arrivals
   - Color coding: Green (present), Red (absent), Yellow (late)

### Current Implementation Gap:
- ✅ Has attendance history repository and controller
- ✅ Has day detail functionality
- ❌ Design doesn't match high-fidelity mockup
- ❌ Missing month/year selector UI
- ❌ Missing statistics legend
- ❌ List view not showing all three checks in columns
- ❌ Missing color coding for status indicators
- ❌ Missing late arrival warning icons

---

## Data Requirements

### Models
**Existing** (`client/lib/features/attendance_history/repository/attendance_history_repository.dart`):
```dart
class AttendanceDaySummary {
  final DateTime date;
  final List<AttendanceCheckDetail> checks;
  final String status;  // 'present', 'absent', 'late', 'leave', 'half_day'
  final ManualOverrideSummary? manualOverride;
}

class AttendanceCheckDetail {
  final int slot;  // 1, 2, 3
  final String? timestamp;
  final String? status;  // 'on_time', 'late', 'missed'
  final bool? withinGeofence;
}

class AttendanceFilters {
  final DateRangePreset preset;
  final DateTime? startDate;
  final DateTime? endDate;
  final List<String>? statusFilter;
}

enum DateRangePreset {
  none,
  thisMonth,
  lastMonth,
  last30Days,
}
```

**New Model Needed**:
```dart
class AttendanceStatistics {
  final int totalDays;
  final int presentDays;
  final int absentDays;
  final int lateDays;
  final int leaveDays;
  final int halfDays;

  AttendanceStatistics({
    required this.totalDays,
    required this.presentDays,
    required this.absentDays,
    required this.lateDays,
    required this.leaveDays,
    required this.halfDays,
  });
}
```

### API Endpoints
**Existing**:
- Repository already has methods to fetch attendance history

**New Endpoint Needed**:
- Statistics calculation can be done client-side from attendance list
- Or add backend endpoint for monthly statistics (optional optimization)

### State Management
**Controller**: `AttendanceCalendarController`

**State**:
- Selected month/year
- Attendance list for month
- Statistics summary
- Loading state
- Filters

---

## UI Components Needed

### New Components
1. **MonthYearSelector** (from `00-shared-components.md`)
2. **StatsSummary** (from `00-shared-components.md`)
3. **AttendanceListTable** - Custom table view for checks

### Existing Components
- Day detail sheet (already exists)
- Filters sheet (already exists)

---

## Implementation Steps

### Step 1: Create MonthYearSelector Component
**File**: `client/lib/features/widgets/month_year_selector.dart`

```dart
class MonthYearSelector extends StatelessWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateChanged;
  final DateTime? minDate;
  final DateTime? maxDate;

  const MonthYearSelector({
    Key? key,
    required this.selectedDate,
    required this.onDateChanged,
    this.minDate,
    this.maxDate,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final currentMonth = selectedDate.month;
    final currentYear = selectedDate.year;

    return Column(
      children: [
        // Year selector
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            IconButton(
              icon: Icon(Icons.chevron_left),
              onPressed: () {
                onDateChanged(DateTime(currentYear - 1, currentMonth));
              },
            ),
            Text(
              currentYear.toString(),
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            IconButton(
              icon: Icon(Icons.chevron_right),
              onPressed: () {
                onDateChanged(DateTime(currentYear + 1, currentMonth));
              },
            ),
          ],
        ),
        SizedBox(height: 8),
        // Month selector
        SizedBox(
          height: 50,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: 12,
            itemBuilder: (context, index) {
              final month = index + 1;
              final isSelected = month == currentMonth;

              return GestureDetector(
                onTap: () {
                  onDateChanged(DateTime(currentYear, month));
                },
                child: Container(
                  padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  margin: EdgeInsets.symmetric(horizontal: 4),
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.green : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      DateFormat.MMM().format(DateTime(currentYear, month)),
                      style: TextStyle(
                        color: isSelected ? Colors.white : Colors.black,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
```

### Step 2: Create Statistics Summary Component
**File**: `client/lib/features/widgets/stats_summary.dart`

```dart
class AttendanceStats extends StatelessWidget {
  final AttendanceStatistics stats;

  const AttendanceStats({Key? key, required this.stats}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 16,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: [
        _StatItem(
          label: 'Present',
          value: '${stats.presentDays}/${stats.totalDays}',
          color: Colors.green,
        ),
        _StatItem(
          label: 'Absent',
          value: '${stats.absentDays}/${stats.totalDays}',
          color: Colors.red,
        ),
        _StatItem(
          label: 'Late',
          value: '${stats.lateDays}/${stats.totalDays}',
          color: Colors.orange,
        ),
        _StatItem(
          label: 'Leave',
          value: '${stats.leaveDays}/${stats.totalDays}',
          color: Colors.grey,
        ),
        _StatItem(
          label: 'Half Day',
          value: '${stats.halfDays}/${stats.totalDays}',
          color: Colors.amber,
        ),
      ],
    );
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 12,
          height: 12,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
          ),
        ),
        SizedBox(width: 4),
        Text('$value $label', style: TextStyle(fontSize: 12)),
      ],
    );
  }
}
```

### Step 3: Create Attendance List Table
**File**: `client/lib/features/attendance_history/widgets/attendance_list_table.dart`

```dart
class AttendanceListTable extends StatelessWidget {
  final List<AttendanceDaySummary> days;
  final ValueChanged<AttendanceDaySummary>? onDayTap;

  const AttendanceListTable({
    Key? key,
    required this.days,
    this.onDayTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Header
        _TableHeader(),
        Divider(height: 1),
        // Rows
        ...days.map((day) => _TableRow(
          day: day,
          onTap: onDayTap != null ? () => onDayTap!(day) : null,
        )),
      ],
    );
  }
}

class _TableHeader extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
      color: Colors.grey[100],
      child: Row(
        children: [
          Expanded(flex: 2, child: Text('Date', style: TextStyle(fontWeight: FontWeight.bold))),
          Expanded(child: Text('Check 1', style: TextStyle(fontWeight: FontWeight.bold))),
          Expanded(child: Text('Check 2', style: TextStyle(fontWeight: FontWeight.bold))),
          Expanded(child: Text('Check 3', style: TextStyle(fontWeight: FontWeight.bold))),
        ],
      ),
    );
  }
}

class _TableRow extends StatelessWidget {
  final AttendanceDaySummary day;
  final VoidCallback? onTap;

  const _TableRow({required this.day, this.onTap});

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'present':
        return Colors.green;
      case 'absent':
        return Colors.red;
      case 'late':
        return Colors.orange;
      case 'leave':
        return Colors.grey;
      case 'half_day':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }

  String _formatCheckTime(AttendanceCheckDetail? check) {
    if (check?.timestamp == null) return '--:--';
    return DateFormat('HH:mm').format(DateTime.parse(check!.timestamp!));
  }

  bool _isLate(AttendanceCheckDetail? check) {
    return check?.status?.toLowerCase() == 'late';
  }

  @override
  Widget build(BuildContext context) {
    final check1 = day.checks.firstWhereOrNull((c) => c.slot == 1);
    final check2 = day.checks.firstWhereOrNull((c) => c.slot == 2);
    final check3 = day.checks.firstWhereOrNull((c) => c.slot == 3);

    return InkWell(
      onTap: onTap,
      child: Container(
        padding: EdgeInsets.symmetric(vertical: 12, horizontal: 16),
        decoration: BoxDecoration(
          border: Border(bottom: BorderSide(color: Colors.grey[200]!)),
        ),
        child: Row(
          children: [
            // Date with status indicator
            Expanded(
              flex: 2,
              child: Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _getStatusColor(day.status),
                      shape: BoxShape.circle,
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(DateFormat('MMM dd').format(day.date)),
                ],
              ),
            ),
            // Check 1
            Expanded(
              child: Row(
                children: [
                  Text(_formatCheckTime(check1)),
                  if (_isLate(check1)) ...[
                    SizedBox(width: 4),
                    Icon(Icons.warning, size: 16, color: Colors.orange),
                  ],
                ],
              ),
            ),
            // Check 2
            Expanded(
              child: Row(
                children: [
                  Text(_formatCheckTime(check2)),
                  if (_isLate(check2)) ...[
                    SizedBox(width: 4),
                    Icon(Icons.warning, size: 16, color: Colors.orange),
                  ],
                ],
              ),
            ),
            // Check 3
            Expanded(
              child: Row(
                children: [
                  Text(_formatCheckTime(check3)),
                  if (_isLate(check3)) ...[
                    SizedBox(width: 4),
                    Icon(Icons.warning, size: 16, color: Colors.orange),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

### Step 4: Update Controller to Calculate Statistics
**File**: `client/lib/features/attendance_history/controllers/attendance_calendar_controller.dart`

```dart
class AttendanceCalendarController extends StateNotifier<AsyncValue<AttendanceCalendarState>> {
  // ... existing code

  AttendanceStatistics _calculateStatistics(List<AttendanceDaySummary> days) {
    final present = days.where((d) => d.status == 'present').length;
    final absent = days.where((d) => d.status == 'absent').length;
    final late = days.where((d) => d.status == 'late').length;
    final leave = days.where((d) => d.status == 'leave').length;
    final halfDay = days.where((d) => d.status == 'half_day').length;

    return AttendanceStatistics(
      totalDays: days.length,
      presentDays: present,
      absentDays: absent,
      lateDays: late,
      leaveDays: leave,
      halfDays: halfDay,
    );
  }

  Future<void> loadMonth(DateTime date) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      final startDate = DateTime(date.year, date.month, 1);
      final endDate = DateTime(date.year, date.month + 1, 0);

      final days = await _repository.getAttendanceHistory(
        startDate: startDate,
        endDate: endDate,
      );

      final statistics = _calculateStatistics(days);

      return AttendanceCalendarState(
        selectedDate: date,
        days: days,
        statistics: statistics,
      );
    });
  }
}

class AttendanceCalendarState {
  final DateTime selectedDate;
  final List<AttendanceDaySummary> days;
  final AttendanceStatistics statistics;

  // ... constructor, copyWith, etc.
}
```

### Step 5: Redesign Attendance History Screen
**File**: `client/lib/features/attendance_history/presentation/attendance_history_screen.dart`

```dart
class AttendanceHistoryScreen extends ConsumerStatefulWidget {
  const AttendanceHistoryScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<AttendanceHistoryScreen> createState() => _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends ConsumerState<AttendanceHistoryScreen> {
  @override
  void initState() {
    super.initState();
    // Load current month on init
    Future.microtask(() {
      ref.read(attendanceCalendarControllerProvider.notifier).loadMonth(DateTime.now());
    });
  }

  void _handleMonthChanged(DateTime date) {
    ref.read(attendanceCalendarControllerProvider.notifier).loadMonth(date);
  }

  void _handleDayTap(AttendanceDaySummary day) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DayDetailSheet(day: day),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(attendanceCalendarControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance'),
        actions: [
          IconButton(
            icon: Icon(Icons.filter_list),
            onPressed: () {
              // Show filters sheet
            },
          ),
        ],
      ),
      body: state.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (data) {
          return SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Month/Year selector
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: MonthYearSelector(
                    selectedDate: data.selectedDate,
                    onDateChanged: _handleMonthChanged,
                  ),
                ),

                // Statistics legend
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
                  child: AttendanceStats(stats: data.statistics),
                ),

                SizedBox(height: 16),

                // Attendance list table
                AttendanceListTable(
                  days: data.days,
                  onDayTap: _handleDayTap,
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
```

### Step 6: Testing
- Test month/year navigation
- Test statistics calculation
- Test color coding for different statuses
- Test late warning indicators
- Test day detail sheet
- Test with empty data

---

## Testing Scenarios

### Scenario 1: View Current Month
1. User opens attendance screen
2. Current month is selected
3. Statistics show summary for the month
4. List displays all days with check times
5. Status colors match attendance status

### Scenario 2: Navigate to Previous Month
1. User taps left arrow on year
2. Year changes to 2024
3. Data loads for same month in 2024
4. Statistics update

### Scenario 3: View Day Details
1. User taps on a specific day
2. Bottom sheet opens showing detailed info
3. All checks, geofence status, and manual overrides visible

---

## Success Criteria

- ✅ Month/year selector works
- ✅ Statistics legend displays correctly
- ✅ Table shows all three checks
- ✅ Color coding matches status
- ✅ Late warnings display
- ✅ Day detail accessible via tap

---

## Estimated Effort

- **Component creation**: 5 hours
- **Controller updates**: 3 hours
- **Screen redesign**: 5 hours
- **Testing**: 2 hours
- **Total**: ~15 hours (2 days)
