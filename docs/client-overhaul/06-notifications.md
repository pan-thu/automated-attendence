# Notifications Screen - Workflow Plan

## Screen Overview

**Purpose**: View and manage system notifications

**Design Reference**: `docs/ui/client/high/notification.png`

**Current Implementation**:
- File: `client/lib/features/notifications/presentation/notifications_screen.dart`
- Controller: `notification_controller.dart`
- Widgets: `notification_filters.dart`, `notification_list.dart`

**Route**: `/notifications` (Updates tab - index 2 in bottom navigation)

---

## Design Analysis

### Design Shows:
1. **Header Actions**: "Mark all read" button
2. **Status Filter**: Toggle between "All" / "Unread"
3. **Category Filters**: Chips for All, System, Attendance, Leave, Penalty
4. **Search Bar**: Search functionality
5. **Time Grouping**: Grouped by TODAY, YESTERDAY, EARLIER
6. **Notification Items**:
   - Icon (category-specific)
   - Title and description
   - Timestamp
   - Read/unread indicator

### Current Implementation Gap:
- ✅ Has notification list and filters
- ❌ Missing "Mark all read" action
- ❌ Missing search bar
- ❌ Missing time-based grouping
- ❌ Design doesn't match mockup

---

## UI Components Needed

### From `00-shared-components.md`:
- `FilterTabs` component
- `AppSearchBar` component
- `NotificationGroupHeader` component

---

## Implementation Steps

### Step 1: Update Notification Repository
Add mark all read method:
```dart
Future<void> markAllAsRead() async {
  await _http.post('/api/notifications/mark-all-read');
}
```

### Step 2: Create NotificationGroupHeader Component
**File**: `client/lib/features/widgets/notification_group_header.dart`

```dart
class NotificationGroupHeader extends StatelessWidget {
  final String label;

  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      color: Colors.grey[100],
      child: Text(
        label.toUpperCase(),
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: Colors.grey[600],
        ),
      ),
    );
  }
}
```

### Step 3: Add Search and Grouping Logic
**Controller**:
```dart
List<NotificationGroup> groupNotificationsByTime(List<NotificationItem> notifications) {
  final now = DateTime.now();
  final today = DateTime(now.year, now.month, now.day);
  final yesterday = today.subtract(Duration(days: 1));

  final todayItems = <NotificationItem>[];
  final yesterdayItems = <NotificationItem>[];
  final earlierItems = <NotificationItem>[];

  for (final notification in notifications) {
    final date = notification.createdAt;
    final notificationDay = DateTime(date.year, date.month, date.day);

    if (notificationDay == today) {
      todayItems.add(notification);
    } else if (notificationDay == yesterday) {
      yesterdayItems.add(notification);
    } else {
      earlierItems.add(notification);
    }
  }

  return [
    if (todayItems.isNotEmpty) NotificationGroup('TODAY', todayItems),
    if (yesterdayItems.isNotEmpty) NotificationGroup('YESTERDAY', yesterdayItems),
    if (earlierItems.isNotEmpty) NotificationGroup('EARLIER', earlierItems),
  ];
}

List<NotificationItem> filterBySearch(List<NotificationItem> notifications, String query) {
  if (query.isEmpty) return notifications;
  return notifications.where((n) =>
    n.title.toLowerCase().contains(query.toLowerCase()) ||
    n.message.toLowerCase().contains(query.toLowerCase())
  ).toList();
}
```

### Step 4: Redesign Notifications Screen
```dart
class NotificationsScreen extends ConsumerStatefulWidget {
  @override
  ConsumerState<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  String _searchQuery = '';
  String _statusFilter = 'all';  // 'all' or 'unread'
  String _categoryFilter = 'all';  // 'all', 'system', 'attendance', 'leave', 'penalty'

  @override
  Widget build(BuildContext context) {
    final notificationsState = ref.watch(notificationControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text('Notifications'),
        actions: [
          TextButton(
            onPressed: () {
              ref.read(notificationControllerProvider.notifier).markAllAsRead();
            },
            child: Text('Mark all read'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Status filter (All / Unread)
          Padding(
            padding: EdgeInsets.all(16),
            child: SegmentedButton<String>(
              segments: [
                ButtonSegment(value: 'all', label: Text('All')),
                ButtonSegment(value: 'unread', label: Text('Unread')),
              ],
              selected: {_statusFilter},
              onSelectionChanged: (Set<String> newSelection) {
                setState(() {
                  _statusFilter = newSelection.first;
                });
              },
            ),
          ),

          // Category filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: FilterTabs(
              tabs: [
                FilterTab(id: 'all', label: 'All'),
                FilterTab(id: 'system', label: 'System'),
                FilterTab(id: 'attendance', label: 'Attendance'),
                FilterTab(id: 'leave', label: 'Leave'),
                FilterTab(id: 'penalty', label: 'Penalty'),
              ],
              selectedTab: _categoryFilter,
              onTabSelected: (id) {
                setState(() {
                  _categoryFilter = id;
                });
              },
            ),
          ),
          SizedBox(height: 8),

          // Search bar
          Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: AppSearchBar(
              hint: 'Search notifications',
              onChanged: (value) {
                setState(() {
                  _searchQuery = value;
                });
              },
            ),
          ),
          SizedBox(height: 16),

          // Notification list with grouping
          Expanded(
            child: notificationsState.when(
              loading: () => Center(child: CircularProgressIndicator()),
              error: (e, st) => Center(child: Text('Error: $e')),
              data: (notifications) {
                // Apply filters
                var filtered = notifications;
                if (_statusFilter == 'unread') {
                  filtered = filtered.where((n) => !n.isRead).toList();
                }
                if (_categoryFilter != 'all') {
                  filtered = filtered.where((n) => n.category == _categoryFilter).toList();
                }
                filtered = filterBySearch(filtered, _searchQuery);

                // Group by time
                final groups = groupNotificationsByTime(filtered);

                if (groups.isEmpty) {
                  return EmptyState(
                    icon: Icons.notifications_none,
                    title: 'No notifications',
                    message: 'You have no notifications',
                  );
                }

                return ListView.builder(
                  itemCount: groups.fold<int>(
                    0,
                    (sum, group) => sum + 1 + group.items.length,
                  ),
                  itemBuilder: (context, index) {
                    // Build grouped list with headers
                    int currentIndex = 0;
                    for (final group in groups) {
                      if (index == currentIndex) {
                        return NotificationGroupHeader(label: group.label);
                      }
                      currentIndex++;

                      for (final item in group.items) {
                        if (index == currentIndex) {
                          return NotificationCard(notification: item);
                        }
                        currentIndex++;
                      }
                    }
                    return SizedBox.shrink();
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

class NotificationGroup {
  final String label;
  final List<NotificationItem> items;

  NotificationGroup(this.label, this.items);
}
```

---

## Success Criteria

- ✅ Mark all read works
- ✅ Filters work (status, category)
- ✅ Search works
- ✅ Time-based grouping displays correctly
- ✅ Notification icons match categories
- ✅ Read/unread states visible

---

## Estimated Effort

- **Components**: 3 hours
- **Grouping/filtering logic**: 3 hours
- **Screen redesign**: 4 hours
- **Testing**: 2 hours
- **Total**: ~12 hours (1.5 days)
