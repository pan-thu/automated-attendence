# Navigation Architecture - Bottom Navigation Implementation

## Overview
This document defines the navigation architecture for implementing the bottom navigation bar as shown in the designs. This is a **major architectural change** from the current flat routing structure.

## Design Reference
Source designs: `docs/ui/client/high/*.png` (bottom navigation visible in most screens)

## Current State
**File**: `client/lib/core/navigation/app_router.dart`

**Current Architecture**:
- Flat GoRouter-based navigation
- Direct routes: `/`, `/login`, `/attendance/history`, `/leaves`, `/notifications`, `/penalties`, `/settings`
- No persistent bottom navigation
- Each screen is a separate route

---

## Target Architecture

### Bottom Navigation Tabs
From the designs, the app should have 5 main tabs:

1. **Home** (index 0)
   - Icon: Home icon
   - Label: "Home"
   - Screen: Dashboard with clock-in functionality
   - Route: `/`

2. **Attendance** (index 1)
   - Icon: Calendar icon
   - Label: "Attendance"
   - Screen: Attendance history/calendar
   - Route: `/attendance`

3. **Updates** (index 2)
   - Icon: Notification bell icon
   - Label: "Updates"
   - Screen: Notifications list
   - Route: `/notifications`

4. **Resources** (index 3)
   - Icon: Grid/menu icon
   - Label: "Resources"
   - Screen: Resources hub (new screen)
   - Route: `/resources`

5. **Profile** (index 4)
   - Icon: Person/user icon
   - Label: "Profile"
   - Screen: Settings/Profile screen
   - Route: `/settings`

---

## Implementation Approach

### Option 1: Shell Route with StatefulShellRoute (Recommended)

**Pros**:
- Maintains state across tab switches
- Each tab has independent navigation stack
- Built-in support for deep linking
- GoRouter native solution

**Cons**:
- More complex setup
- Need to manage multiple navigators

**Implementation**:
```dart
final GoRouter router = GoRouter(
  initialLocation: '/',
  redirect: (context, state) {
    // Auth redirect logic (existing)
  },
  routes: [
    // Auth routes (outside shell)
    GoRoute(
      path: '/login',
      builder: (context, state) => const LoginScreen(),
    ),
    GoRoute(
      path: '/onboarding',
      builder: (context, state) => const OnboardingScreen(),
    ),

    // Main app shell with bottom navigation
    StatefulShellRoute.indexedStack(
      builder: (context, state, navigationShell) {
        return MainScaffold(
          navigationShell: navigationShell,
        );
      },
      branches: [
        // Branch 0: Home
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/',
              builder: (context, state) => const HomeScreen(),
            ),
          ],
        ),

        // Branch 1: Attendance
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/attendance',
              builder: (context, state) => const AttendanceHistoryScreen(),
            ),
          ],
        ),

        // Branch 2: Updates/Notifications
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/notifications',
              builder: (context, state) => const NotificationsScreen(),
            ),
          ],
        ),

        // Branch 3: Resources
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/resources',
              builder: (context, state) => const ResourcesScreen(),
            ),
          ],
        ),

        // Branch 4: Profile/Settings
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/settings',
              builder: (context, state) => const SettingsScreen(),
            ),
          ],
        ),
      ],
    ),

    // Modal/overlay routes (outside shell)
    GoRoute(
      path: '/leaves/new',
      builder: (context, state) => const LeaveRequestForm(),
    ),
  ],
);
```

### Option 2: IndexedStack with Manual Management

**Pros**:
- Simpler implementation
- More control over tab switching

**Cons**:
- Manual state management
- Need to handle back button manually
- Deep linking more complex

**Not recommended** for this project due to existing GoRouter setup.

---

## Main Scaffold Implementation

**File**: `client/lib/features/widgets/main_scaffold.dart` (new file)

```dart
class MainScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffold({
    Key? key,
    required this.navigationShell,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: AppBottomNavigation(
        currentIndex: navigationShell.currentIndex,
        onTabChanged: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
      ),
    );
  }
}
```

---

## Modal/Overlay Routes

Routes that should appear as modals or push on top of bottom nav (not in tabs):

### Full-Screen Modals
- `/login` - Login screen (before auth)
- `/onboarding` - Onboarding flow (before auth)

### Push Routes (within tabs)
- Leave request form - Push from Resources tab
- Leave detail - Push from Attendance or Resources tab
- Penalty detail - Push from Resources tab
- Employee detail (admin only?) - If applicable

**Implementation**:
```dart
// From Resources screen, navigate to leave form
context.push('/leaves/new');

// Or use a nested route under resources
StatefulShellBranch(
  routes: [
    GoRoute(
      path: '/resources',
      builder: (context, state) => const ResourcesScreen(),
      routes: [
        GoRoute(
          path: 'leaves/new',
          builder: (context, state) => const LeaveRequestForm(),
        ),
        GoRoute(
          path: 'penalties/:id',
          builder: (context, state) {
            final id = state.pathParameters['id']!;
            return PenaltyDetailScreen(penaltyId: id);
          },
        ),
      ],
    ),
  ],
),
```

---

## Deep Linking Strategy

### URL Structure
```
attendesk://
  /login
  /onboarding
  /                         # Home tab
  /attendance              # Attendance tab
  /notifications           # Updates tab
  /resources               # Resources tab
  /settings                # Profile tab
  /leaves/new              # Leave request form (modal)
  /leaves/:id              # Leave detail
  /penalties/:id           # Penalty detail
```

### Notification Deep Links
When user taps notification:
- Attendance notification → `/attendance`
- Leave notification → `/notifications` (with notification highlighted)
- Penalty notification → `/resources` or `/penalties/:id`

**Implementation**:
```dart
// In notification tap handler
void handleNotificationTap(String notificationType, String? entityId) {
  switch (notificationType) {
    case 'attendance':
      context.go('/attendance');
      break;
    case 'leave':
      context.go('/notifications');
      break;
    case 'penalty':
      if (entityId != null) {
        context.push('/penalties/$entityId');
      } else {
        context.go('/resources');
      }
      break;
  }
}
```

---

## Tab State Management

### State Persistence
Each tab should maintain its own state when switching between tabs:

- **Home**: Clock-in state, dashboard data
- **Attendance**: Calendar selection, filters, scroll position
- **Updates**: Filter selection, scroll position
- **Resources**: No state (menu screen)
- **Profile**: Settings selection

**Implementation**:
Using `StatefulShellRoute.indexedStack` automatically handles this.

### State Refresh
Certain tabs should refresh data when navigated to:

- **Home**: Always refresh (real-time clock-in status)
- **Attendance**: Refresh on tab switch
- **Updates**: Check for new notifications
- **Resources**: No refresh needed
- **Profile**: No refresh needed

**Implementation**:
```dart
// In each screen
@override
void didChangeDependencies() {
  super.didChangeDependencies();
  // Check if tab became active
  if (ModalRoute.of(context)?.isCurrent ?? false) {
    _refreshData();
  }
}
```

---

## Back Button Behavior

### Android Back Button
- When on any tab: Exit app (show confirmation dialog)
- When on pushed route: Pop to tab
- When on modal: Dismiss modal

**Implementation**:
```dart
// In MainScaffold
return WillPopScope(
  onWillPop: () async {
    if (navigationShell.currentIndex != 0) {
      // Go to home tab if not already there
      navigationShell.goBranch(0);
      return false;
    }
    // Show exit confirmation
    return await showExitConfirmation(context);
  },
  child: Scaffold(/* ... */),
);
```

---

## Migration Strategy

### Phase 1: Setup Infrastructure
1. Create `MainScaffold` widget
2. Create `AppBottomNavigation` component (see `00-shared-components.md`)
3. Update `app_router.dart` with StatefulShellRoute structure

### Phase 2: Migrate Existing Screens
4. Update Home screen to work within tab
5. Update Attendance screen (rename route `/attendance/history` → `/attendance`)
6. Update Notifications screen
7. Update Settings screen (keep route `/settings`)

### Phase 3: Add New Screens
8. Create Resources hub screen (new)
9. Move leave request form to modal route
10. Add penalty detail routes if needed

### Phase 4: Testing
11. Test tab switching and state persistence
12. Test deep linking
13. Test notification navigation
14. Test back button behavior
15. Test on both Android and iOS

---

## Code Changes Required

### 1. Update `app_router.dart`
**File**: `client/lib/core/navigation/app_router.dart`

- Replace flat routes with `StatefulShellRoute.indexedStack`
- Define 5 branches for tabs
- Move non-tab routes outside shell

### 2. Create `MainScaffold`
**File**: `client/lib/features/widgets/main_scaffold.dart` (new)

- Scaffold with bottom navigation
- Handle WillPopScope for back button
- Pass navigation shell to bottom nav

### 3. Create `AppBottomNavigation`
**File**: `client/lib/features/widgets/app_bottom_navigation.dart` (new)

- See `00-shared-components.md` for specification
- 5 tabs with icons and labels
- Active/inactive states

### 4. Update Existing Screens
- Remove individual Scaffold wrappers (body only)
- Or keep Scaffold but without bottomNavigationBar
- Ensure screens work within tab context

### 5. Create `ResourcesScreen`
**File**: `client/lib/features/resources/presentation/resources_screen.dart` (new)

- Menu hub screen
- See `08-resources.md` for details

---

## Dependencies

```
pubspec.yaml:
  dependencies:
    go_router: ^14.0.0  # Already present, ensure version supports StatefulShellRoute
```

No additional dependencies needed.

---

## Testing Checklist

- [ ] Bottom nav displays correctly
- [ ] All 5 tabs navigate to correct screens
- [ ] Tab state persists when switching
- [ ] Back button exits app from home tab
- [ ] Back button goes to home tab from other tabs
- [ ] Deep links navigate to correct tab
- [ ] Notification taps navigate correctly
- [ ] Modal routes display on top of bottom nav
- [ ] Push routes display correctly within tabs
- [ ] Auth redirect works (login → home after auth)
- [ ] Onboarding flow works
- [ ] iOS and Android behavior consistent

---

## Accessibility Considerations

- Bottom nav items have semantic labels
- Screen reader announces current tab
- Tab indicators are color-blind friendly (not just color)
- Minimum touch target size (48dp)

---

## Performance Considerations

- Use `IndexedStack` (via StatefulShellRoute) to maintain tab state
- Lazy load tab content if needed
- Dispose resources when tabs are not visible
- Optimize rebuilds with proper keys

---

## Future Enhancements

- **Tab Badges**: Show notification count on Updates tab
- **Tab Gestures**: Swipe between tabs
- **Tab Icons**: Animated active state
- **Dark Mode**: Ensure bottom nav supports dark theme

---

## Open Questions

- [x] Should we maintain state across tab switches? **Yes - using StatefulShellRoute**
- [x] How should notifications navigate to relevant tabs? **Defined in Deep Linking Strategy**
- [x] Should back button exit app or go to home tab? **Go to home tab first, then exit**
- [ ] Do we need tab badges (e.g., unread notification count)? **TBD - Can add later**

---

## Related Documents

- `00-design-system.md` - For bottom nav styling
- `00-shared-components.md` - For AppBottomNavigation component spec
- `02-home-dashboard.md` - Home tab implementation
- `03-attendance-history.md` - Attendance tab implementation
- `06-notifications.md` - Updates tab implementation
- `08-resources.md` - Resources tab implementation
- `10-profile-settings.md` - Profile tab implementation

---

## Next Steps

1. Review this architecture with team
2. Implement `AppBottomNavigation` component
3. Update `app_router.dart` with StatefulShellRoute
4. Create `MainScaffold` widget
5. Migrate existing screens to tab structure
6. Test thoroughly on both platforms
7. Iterate based on feedback
