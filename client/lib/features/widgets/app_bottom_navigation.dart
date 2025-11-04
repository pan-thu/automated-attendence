import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';

/// Bottom navigation bar component for main app navigation
///
/// Provides 5 tabs: Home, Attendance, Updates, Resources, Profile
/// Based on spec in docs/client-overhaul/00-shared-components.md
class AppBottomNavigation extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTabChanged;

  const AppBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTabChanged,
  });

  @override
  Widget build(BuildContext context) {
    return BottomNavigationBar(
      currentIndex: currentIndex,
      onTap: onTabChanged,
      type: BottomNavigationBarType.fixed,
      backgroundColor: backgroundPrimary,
      selectedItemColor: primaryGreen,
      unselectedItemColor: textTertiary,
      selectedFontSize: 12,
      unselectedFontSize: 12,
      elevation: 8,
      items: const [
        // Tab 0: Home
        BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.home, size: iconSizeBottomNav),
          label: 'Home',
        ),

        // Tab 1: Attendance
        BottomNavigationBarItem(
          icon: Icon(Icons.calendar_today_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.calendar_today, size: iconSizeBottomNav),
          label: 'Attendance',
        ),

        // Tab 2: Updates/Notifications
        BottomNavigationBarItem(
          icon: Icon(Icons.notifications_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.notifications, size: iconSizeBottomNav),
          label: 'Updates',
        ),

        // Tab 3: Resources
        BottomNavigationBarItem(
          icon: Icon(Icons.apps_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.apps, size: iconSizeBottomNav),
          label: 'Resources',
        ),

        // Tab 4: Profile/Settings
        BottomNavigationBarItem(
          icon: Icon(Icons.person_outline, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.person, size: iconSizeBottomNav),
          label: 'Profile',
        ),
      ],
    );
  }
}
