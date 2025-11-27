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
  final bool hasUnreadNotifications;

  const AppBottomNavigation({
    super.key,
    required this.currentIndex,
    required this.onTabChanged,
    this.hasUnreadNotifications = false,
  });

  /// Build notification icon with optional red dot badge
  Widget _buildNotificationIcon({required bool isActive}) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Icon(
          isActive ? Icons.notifications : Icons.notifications_outlined,
          size: iconSizeBottomNav,
        ),
        if (hasUnreadNotifications)
          Positioned(
            right: -2,
            top: -2,
            child: Container(
              width: 10,
              height: 10,
              decoration: BoxDecoration(
                color: statusAbsent,
                shape: BoxShape.circle,
                border: Border.all(
                  color: backgroundPrimary,
                  width: 1.5,
                ),
              ),
            ),
          ),
      ],
    );
  }

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
      items: [
        // Tab 0: Home
        const BottomNavigationBarItem(
          icon: Icon(Icons.home_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.home, size: iconSizeBottomNav),
          label: 'Home',
        ),

        // Tab 1: Attendance
        const BottomNavigationBarItem(
          icon: Icon(Icons.calendar_today_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.calendar_today, size: iconSizeBottomNav),
          label: 'Attendance',
        ),

        // Tab 2: Updates/Notifications (with badge)
        BottomNavigationBarItem(
          icon: _buildNotificationIcon(isActive: false),
          activeIcon: _buildNotificationIcon(isActive: true),
          label: 'Updates',
        ),

        // Tab 3: Resources
        const BottomNavigationBarItem(
          icon: Icon(Icons.apps_outlined, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.apps, size: iconSizeBottomNav),
          label: 'Resources',
        ),

        // Tab 4: Profile/Settings
        const BottomNavigationBarItem(
          icon: Icon(Icons.person_outline, size: iconSizeBottomNav),
          activeIcon: Icon(Icons.person, size: iconSizeBottomNav),
          label: 'Profile',
        ),
      ],
    );
  }
}
