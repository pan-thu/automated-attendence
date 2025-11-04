# Shared UI Components Library

## Overview
This document defines the reusable UI components needed across all screens in the mobile app UI/UX overhaul. These components should be built using the design system defined in `00-design-system.md`.

## Design Reference
Source designs: `docs/ui/client/high/*.png`

---

## Component Inventory

### 1. Status Badge Component
**File**: `client/lib/features/widgets/status_badge.dart`

**Purpose**: Display status indicators with consistent styling

**Variants**:
- Leave statuses: Approved, Pending, Rejected, Cancelled
- Penalty statuses: Active, Waived, Paid, Disputed
- Attendance statuses: Present, Absent, Late, Leave, Half Day

**API**:
```dart
class StatusBadge extends StatelessWidget {
  final String label;
  final StatusType type;
  final BadgeSize size;

  StatusBadge({
    required this.label,
    required this.type,
    this.size = BadgeSize.medium,
  });
}

enum StatusType {
  approved,    // Green
  pending,     // Yellow
  rejected,    // Red
  cancelled,   // Gray
  active,      // Red
  waived,      // Green
  paid,        // Blue
  disputed,    // Orange
  present,     // Green
  absent,      // Red
  late,        // Yellow
  leave,       // Gray
  halfDay,     // Orange
}

enum BadgeSize {
  small,   // Compact for dense lists
  medium,  // Default
  large,   // Prominent display
}
```

**Used in**: Leave management, Penalties, Attendance history, Notifications

---

### 2. Filter Chips/Tabs Component
**File**: `client/lib/features/widgets/filter_tabs.dart`

**Purpose**: Horizontal scrollable filter tabs for content filtering

**API**:
```dart
class FilterTabs extends StatelessWidget {
  final List<FilterTab> tabs;
  final String selectedTab;
  final ValueChanged<String> onTabSelected;
  final FilterTabStyle style;

  FilterTabs({
    required this.tabs,
    required this.selectedTab,
    required this.onTabSelected,
    this.style = FilterTabStyle.chips,
  });
}

class FilterTab {
  final String id;
  final String label;
  final int? count;  // Optional badge count

  FilterTab({
    required this.id,
    required this.label,
    this.count,
  });
}

enum FilterTabStyle {
  chips,      // Rounded chips (used in notifications, penalties)
  tabs,       // Underline tabs (used in leave management)
  buttons,    // Button-style tabs
}
```

**Used in**: Notifications, Penalties, Leave management, Attendance history

---

### 3. Search Bar Component
**File**: `client/lib/features/widgets/search_bar.dart`

**Purpose**: Consistent search input across screens

**API**:
```dart
class AppSearchBar extends StatelessWidget {
  final String hint;
  final ValueChanged<String> onChanged;
  final VoidCallback? onClear;
  final TextEditingController? controller;
  final bool autofocus;

  AppSearchBar({
    required this.hint,
    required this.onChanged,
    this.onClear,
    this.controller,
    this.autofocus = false,
  });
}
```

**Used in**: Notifications, Penalties

---

### 4. Date Range Picker Component
**File**: `client/lib/features/widgets/date_range_picker.dart`

**Purpose**: Date range selection with calendar view

**API**:
```dart
class DateRangePicker extends StatelessWidget {
  final DateTime? startDate;
  final DateTime? endDate;
  final ValueChanged<DateTimeRange?> onDateRangeSelected;
  final DateTime? minDate;
  final DateTime? maxDate;
  final bool showCalendar;

  DateRangePicker({
    this.startDate,
    this.endDate,
    required this.onDateRangeSelected,
    this.minDate,
    this.maxDate,
    this.showCalendar = true,
  });
}
```

**Features**:
- Start date / End date inputs
- Integrated calendar view
- Quick date range presets (optional)
- Date validation

**Used in**: Submit leave form, Attendance history filters

---

### 5. Bottom Navigation Bar Component
**File**: `client/lib/features/widgets/app_bottom_navigation.dart`

**Purpose**: Main app navigation with 5 tabs

**API**:
```dart
class AppBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabChanged;

  AppBottomNavigation({
    required this.currentIndex,
    required this.onTabChanged,
  });
}
```

**Tabs**:
1. Home (index 0) - Dashboard with clock-in
2. Attendance (index 1) - Attendance history
3. Updates (index 2) - Notifications
4. Resources (index 3) - Resources hub
5. Profile (index 4) - Settings/Profile

**Used in**: Main app scaffold (see `00-navigation-architecture.md`)

---

### 6. Time Display Widget
**File**: `client/lib/features/widgets/time_display.dart`

**Purpose**: Large formatted time display

**API**:
```dart
class TimeDisplay extends StatelessWidget {
  final DateTime time;
  final bool showSeconds;
  final TimeDisplaySize size;

  TimeDisplay({
    required this.time,
    this.showSeconds = false,
    this.size = TimeDisplaySize.large,
  });
}

enum TimeDisplaySize {
  small,   // 24px
  medium,  // 32px
  large,   // 48px (used in home screen)
}
```

**Used in**: Home dashboard

---

### 7. Location Proximity Indicator
**File**: `client/lib/features/widgets/location_proximity.dart`

**Purpose**: Show distance from office location

**API**:
```dart
class LocationProximityIndicator extends StatelessWidget {
  final double distanceInMeters;
  final String locationName;
  final bool isWithinGeofence;

  LocationProximityIndicator({
    required this.distanceInMeters,
    required this.locationName,
    required this.isWithinGeofence,
  });
}
```

**Features**:
- Distance display (e.g., "1 meter away from office")
- Location name display (e.g., "Vashi - Navi Mumbai")
- Color coding based on geofence status

**Used in**: Home dashboard

---

### 8. Check Status Tracker
**File**: `client/lib/features/widgets/check_status_tracker.dart`

**Purpose**: Display multiple check-in status (Check 1, 2, 3)

**API**:
```dart
class CheckStatusTracker extends StatelessWidget {
  final List<CheckStatus> checks;
  final int maxChecks;

  CheckStatusTracker({
    required this.checks,
    this.maxChecks = 3,
  });
}

class CheckStatus {
  final int slot;
  final String? time;  // null if not checked in
  final CheckStatusType status;

  CheckStatus({
    required this.slot,
    this.time,
    required this.status,
  });
}

enum CheckStatusType {
  notDone,    // --:--
  onTime,     // Green indicator
  late,       // Yellow/red indicator with warning
  completed,  // Gray (past check)
}
```

**Used in**: Home dashboard, Attendance history

---

### 9. Notification Grouping Header
**File**: `client/lib/features/widgets/notification_group_header.dart`

**Purpose**: Time-based group headers for notifications

**API**:
```dart
class NotificationGroupHeader extends StatelessWidget {
  final String label;  // "TODAY", "YESTERDAY", "EARLIER"

  NotificationGroupHeader({
    required this.label,
  });
}
```

**Used in**: Notifications screen

---

### 10. Success/Error Dialog Component
**File**: `client/lib/features/widgets/feedback_dialog.dart`

**Purpose**: Full-screen overlay feedback for actions

**API**:
```dart
class FeedbackDialog extends StatelessWidget {
  final FeedbackType type;
  final String title;
  final String? message;
  final VoidCallback? onDismiss;
  final Duration? autoDismissDuration;

  FeedbackDialog({
    required this.type,
    required this.title,
    this.message,
    this.onDismiss,
    this.autoDismissDuration,
  });

  // Static helper methods
  static void showSuccess(BuildContext context, String title, {String? message}) {}
  static void showError(BuildContext context, String title, {String? message}) {}
  static void showWarning(BuildContext context, String title, {String? message}) {}
  static void showInfo(BuildContext context, String title, {String? message}) {}
}

enum FeedbackType {
  success,  // Green background, check icon
  error,    // Red background, error icon
  warning,  // Orange background, warning icon
  info,     // Blue background, info icon
}
```

**Features**:
- Full-screen overlay with semi-transparent background
- Large icon with animation
- Title and optional message
- Auto-dismiss option
- Manual dismiss via tap or button

**Used in**: Clock-in flow, Leave submission, All action confirmations

---

### 11. Info Card Component
**File**: `client/lib/features/widgets/info_card.dart`

**Purpose**: Consistent card styling for information display

**API**:
```dart
class InfoCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final Color? backgroundColor;
  final double? elevation;

  InfoCard({
    required this.child,
    this.onTap,
    this.padding,
    this.backgroundColor,
    this.elevation,
  });
}
```

**Variants**:
- `SummaryCard` - For stat summaries (leave balance, penalty stats)
- `ListCard` - For list items (notifications, penalties, leaves)
- `ActionCard` - For actionable items (resources menu)

**Used in**: All screens

---

### 12. Empty State Component
**File**: `client/lib/features/widgets/empty_state.dart`

**Purpose**: Consistent empty state messaging

**API**:
```dart
class EmptyState extends StatelessWidget {
  final String? iconPath;
  final IconData? icon;
  final String title;
  final String? message;
  final Widget? action;

  EmptyState({
    this.iconPath,
    this.icon,
    required this.title,
    this.message,
    this.action,
  });
}
```

**Used in**: All list screens when data is empty

---

### 13. Loading Skeleton Component
**File**: `client/lib/features/widgets/loading_skeleton.dart`

**Purpose**: Skeleton screens for loading states

**API**:
```dart
class LoadingSkeleton extends StatelessWidget {
  final SkeletonType type;
  final int itemCount;

  LoadingSkeleton({
    required this.type,
    this.itemCount = 3,
  });
}

enum SkeletonType {
  listItem,
  card,
  dashboard,
  calendar,
}
```

**Note**: App already has `skeleton_loading.dart` - extend it with new types

**Used in**: All screens with async data

---

### 14. Icon Badge Component
**File**: `client/lib/features/widgets/icon_badge.dart`

**Purpose**: Icon with optional badge/counter

**API**:
```dart
class IconBadge extends StatelessWidget {
  final IconData icon;
  final int? count;
  final String? label;
  final Color? badgeColor;
  final double iconSize;

  IconBadge({
    required this.icon,
    this.count,
    this.label,
    this.badgeColor,
    this.iconSize = 24.0,
  });
}
```

**Used in**: Resources menu (penalty count badge), Bottom navigation

---

### 15. Statistics Summary Widget
**File**: `client/lib/features/widgets/stats_summary.dart`

**Purpose**: Display key metrics/statistics

**API**:
```dart
class StatsSummary extends StatelessWidget {
  final List<StatItem> stats;
  final Axis direction;

  StatsSummary({
    required this.stats,
    this.direction = Axis.horizontal,
  });
}

class StatItem {
  final String label;
  final String value;
  final Color? color;
  final IconData? icon;

  StatItem({
    required this.label,
    required this.value,
    this.color,
    this.icon,
  });
}
```

**Used in**: Attendance history (legend), Leave management (balance), Penalties (summary)

---

### 16. Month/Year Selector
**File**: `client/lib/features/widgets/month_year_selector.dart`

**Purpose**: Month and year selection widget

**API**:
```dart
class MonthYearSelector extends StatelessWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateChanged;
  final DateTime? minDate;
  final DateTime? maxDate;

  MonthYearSelector({
    required this.selectedDate,
    required this.onDateChanged,
    this.minDate,
    this.maxDate,
  });
}
```

**Features**:
- Horizontal month list (scrollable)
- Year selector
- Highlight current month

**Used in**: Attendance history

---

## Component Dependencies

```
Design System (00-design-system.md)
  ↓
Shared Components (this doc)
  ↓
Screen-specific components
```

---

## Implementation Priority

### Phase 1 - Critical Components (Week 1)
1. Info Card Component
2. Status Badge Component
3. Bottom Navigation Bar
4. Loading Skeleton (extend existing)
5. Empty State Component

### Phase 2 - Interactive Components (Week 2)
6. Filter Tabs Component
7. Search Bar Component
8. Success/Error Dialog Component
9. Date Range Picker Component

### Phase 3 - Screen-Specific Components (Week 3)
10. Time Display Widget
11. Location Proximity Indicator
12. Check Status Tracker
13. Month/Year Selector
14. Stats Summary Widget
15. Notification Group Header
16. Icon Badge Component

---

## File Organization

```
client/lib/
  features/
    widgets/
      # Core components
      status_badge.dart
      filter_tabs.dart
      search_bar.dart
      date_range_picker.dart
      app_bottom_navigation.dart

      # Display components
      time_display.dart
      location_proximity.dart
      check_status_tracker.dart
      stats_summary.dart
      month_year_selector.dart

      # Feedback components
      feedback_dialog.dart
      empty_state.dart
      loading_skeleton.dart  # Already exists, extend

      # Utility components
      info_card.dart
      icon_badge.dart
      notification_group_header.dart

      # Existing (keep)
      async_error_view.dart
      auth_text_field.dart
      offline_notice.dart
```

---

## Testing Strategy

Each component should have:
1. **Unit tests** - Component rendering and logic
2. **Widget tests** - User interactions
3. **Visual tests** - Screenshot comparisons (optional)
4. **Storybook** - Component showcase (optional but recommended)

---

## Documentation

Each component file should include:
```dart
/// Brief description of the component
///
/// Example usage:
/// ```dart
/// StatusBadge(
///   label: 'Approved',
///   type: StatusType.approved,
/// )
/// ```
///
/// See also:
/// - [OtherRelatedComponent]
/// - Design: docs/ui/client/high/...
class ComponentName extends StatelessWidget {
  // ...
}
```

---

## Next Steps

1. Implement design system (see `00-design-system.md`)
2. Create component library following this specification
3. Write tests for each component
4. Create Storybook or component gallery for QA/Design review
5. Use components in screen implementations
6. Iterate based on design feedback

---

## Notes

- All components must use design tokens from `00-design-system.md`
- Components should be **stateless** where possible
- Use **composition** over inheritance
- Follow **Material 3** guidelines
- Ensure **accessibility** (semantic labels, contrast ratios)
- Support **dark mode** (future consideration)
