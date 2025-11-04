# Resources Screen - Workflow Plan

## Screen Overview

**Purpose**: Navigation hub for secondary features (leave requests, penalties, holidays)

**Design Reference**: `docs/ui/client/high/resources.png`

**Current Implementation**: Does NOT exist - NEW screen

**Route**: `/resources` (Resources tab - index 3 in bottom navigation)

---

## Design Analysis

### Design Shows:
1. **Menu Items**:
   - Leave Request (calendar icon) - "Apply leave"
   - Penalties (warning icon) - "View penalties" with badge ("2 active, $75 total")
   - Holiday List (calendar icon) - "View upcoming holidays"

### Implementation Requirements:
- This is a **brand new screen** to be created
- Simple menu/hub layout
- Navigate to other screens

---

## Data Requirements

### For Penalty Badge
Need to fetch penalty summary to show badge:
```dart
// From penalty summary API
{
  "activeCount": 2,
  "totalAmount": 75
}
```

---

## Implementation Steps

### Step 1: Create Resources Feature Module
```
client/lib/features/resources/
  presentation/
    resources_screen.dart
  controllers/
    resources_controller.dart (optional)
```

### Step 2: Create Menu Item Widget
```dart
class ResourceMenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final String? badge;
  final VoidCallback onTap;

  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: Container(
          padding: EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.green.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.green),
        ),
        title: Text(title, style: TextStyle(fontWeight: FontWeight.bold)),
        subtitle: badge != null
            ? Row(
                children: [
                  Text(subtitle),
                  SizedBox(width: 8),
                  Container(
                    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      badge!,
                      style: TextStyle(color: Colors.white, fontSize: 12),
                    ),
                  ),
                ],
              )
            : Text(subtitle),
        trailing: Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}
```

### Step 3: Create Resources Screen
**File**: `client/lib/features/resources/presentation/resources_screen.dart`

```dart
class ResourcesScreen extends ConsumerWidget {
  const ResourcesScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final penaltySummary = ref.watch(penaltySummaryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Resources'),
      ),
      body: ListView(
        padding: EdgeInsets.all(16),
        children: [
          // Leave Request
          ResourceMenuItem(
            icon: Icons.calendar_today,
            title: 'Leave Request',
            subtitle: 'Apply leave',
            onTap: () {
              context.push('/leaves/new');
            },
          ),
          SizedBox(height: 12),

          // Penalties
          penaltySummary.when(
            data: (summary) => ResourceMenuItem(
              icon: Icons.warning,
              title: 'Penalties',
              subtitle: 'View penalties',
              badge: summary.activeCount > 0
                  ? '${summary.activeCount} active, \$${summary.totalAmount.toStringAsFixed(0)} total'
                  : null,
              onTap: () {
                context.push('/penalties');
              },
            ),
            loading: () => ResourceMenuItem(
              icon: Icons.warning,
              title: 'Penalties',
              subtitle: 'View penalties',
              onTap: () {
                context.push('/penalties');
              },
            ),
            error: (_, __) => ResourceMenuItem(
              icon: Icons.warning,
              title: 'Penalties',
              subtitle: 'View penalties',
              onTap: () {
                context.push('/penalties');
              },
            ),
          ),
          SizedBox(height: 12),

          // Holiday List
          ResourceMenuItem(
            icon: Icons.event,
            title: 'Holiday List',
            subtitle: 'View upcoming holidays',
            onTap: () {
              context.push('/holidays');
            },
          ),
        ],
      ),
    );
  }
}
```

### Step 4: Create Holiday List Screen (NEW FEATURE)
**File**: `client/lib/features/holidays/presentation/holidays_screen.dart`

```dart
class HolidaysScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    final holidaysState = ref.watch(holidaysProvider);

    return Scaffold(
      appBar: AppBar(title: Text('Holidays')),
      body: holidaysState.when(
        data: (holidays) {
          return ListView.builder(
            itemCount: holidays.length,
            itemBuilder: (context, index) {
              final holiday = holidays[index];
              return ListTile(
                leading: Icon(Icons.event, color: Colors.green),
                title: Text(holiday.name),
                subtitle: Text(DateFormat('MMMM dd, yyyy').format(holiday.date)),
              );
            },
          );
        },
        loading: () => Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
```

### Step 5: Add Backend API for Holidays (See api-requirements.md)

---

## Success Criteria

- ✅ Resources screen displays menu items
- ✅ Leave request navigation works
- ✅ Penalties navigation works with badge
- ✅ Holiday list navigation works
- ✅ Icons and styling match design

---

## Estimated Effort

- **Resources screen**: 3 hours
- **Holiday list screen**: 4 hours
- **Backend API (holidays)**: 4 hours
- **Testing**: 2 hours
- **Total**: ~13 hours (2 days)

---

## Related Documents

- `00-navigation-architecture.md` - Bottom nav integration
- `04-leave-management.md` - Leave navigation
- `07-penalties.md` - Penalty navigation
- `api-requirements.md` - Holiday API specs
