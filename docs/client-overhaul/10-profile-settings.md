# Profile/Settings Screen - Workflow Plan

## Screen Overview

**Purpose**: User profile and app settings

**Design Reference**: No specific design provided

**Current Implementation**:
- File: `client/lib/features/settings/presentation/settings_screen.dart`
- Exists but needs to be integrated with bottom navigation

**Route**: `/settings` (Profile tab - index 4 in bottom navigation)

---

## Design Analysis

### Requirements (Based on Navigation):
Since no specific design is provided, the Profile tab should display:
1. User profile information (if available)
2. App settings
3. Logout option
4. App information (version, etc.)

### Decision:
**Use existing settings screen** as the Profile tab (per user confirmation)

---

## Implementation Steps

### Step 1: Review Existing Settings Screen
**File**: `client/lib/features/settings/presentation/settings_screen.dart`

Check what's currently implemented:
- Company settings display/edit
- User preferences
- Logout functionality
- Any profile information

### Step 2: Ensure Settings Screen Works Within Bottom Nav
```dart
class SettingsScreen extends ConsumerWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Profile'),  // Change title if needed
      ),
      body: ListView(
        children: [
          // User profile section (if available)
          // Company settings section
          // App preferences
          // Logout button
          // App info
        ],
      ),
    );
  }
}
```

### Step 3: Add Profile Section (Optional Enhancement)
If user profile data is available, add a profile header:

```dart
class ProfileHeader extends StatelessWidget {
  final UserProfile profile;

  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(24),
      child: Column(
        children: [
          // Profile photo
          CircleAvatar(
            radius: 48,
            backgroundImage: profile.photoUrl != null
                ? NetworkImage(profile.photoUrl!)
                : null,
            child: profile.photoUrl == null
                ? Icon(Icons.person, size: 48)
                : null,
          ),
          SizedBox(height: 16),
          // Name
          Text(
            profile.name,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          // Email
          Text(
            profile.email,
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }
}
```

### Step 4: Ensure Logout Works
```dart
ListTile(
  leading: Icon(Icons.logout, color: Colors.red),
  title: Text('Logout', style: TextStyle(color: Colors.red)),
  onTap: () async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Logout'),
        content: Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Logout'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(authRepositoryProvider).signOut();
      if (context.mounted) {
        context.go('/login');
      }
    }
  },
),
```

### Step 5: Update Navigation Architecture
Ensure settings screen is mapped to Profile tab in bottom navigation (index 4).

**File**: `client/lib/core/navigation/app_router.dart`

```dart
// In StatefulShellRoute branches
StatefulShellBranch(
  routes: [
    GoRoute(
      path: '/settings',
      builder: (context, state) => const SettingsScreen(),
    ),
  ],
),
```

### Step 6: Testing
- Test navigation to settings from Profile tab
- Test all existing settings functionality
- Test logout flow
- Ensure state persists when switching tabs

---

## Success Criteria

- ✅ Settings screen accessible from Profile tab in bottom nav
- ✅ All existing settings functionality works
- ✅ Logout works correctly
- ✅ Navigation between tabs preserved
- ✅ No breaking changes to existing features

---

## Estimated Effort

- **Review existing implementation**: 1 hour
- **Bottom nav integration**: 2 hours
- **Profile section (optional)**: 3 hours
- **Testing**: 1 hour
- **Total**: ~7 hours (1 day) without profile section, ~10 hours with

---

## Notes

- **No design provided**: Use existing settings screen implementation
- **Future enhancement**: Add dedicated profile view if needed
- **Keep it simple**: Focus on integration with bottom nav for now

---

## Related Documents

- `00-navigation-architecture.md` - Bottom nav integration
- User confirmation: Use existing settings screen for Profile tab
