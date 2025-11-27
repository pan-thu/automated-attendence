import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'app_bottom_navigation.dart';
import '../notifications/controllers/notification_controller.dart';

/// Main scaffold widget with bottom navigation
///
/// Wraps all main tab screens with persistent bottom navigation
/// Based on spec in docs/client-overhaul/00-navigation-architecture.md
class MainScaffold extends StatefulWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffold({
    super.key,
    required this.navigationShell,
  });

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  @override
  void initState() {
    super.initState();
    // Initialize notification controller to fetch unread count
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final notificationController = context.read<NotificationController>();
      if (!notificationController.hasInitialised) {
        notificationController.initialise();
      }
    });
  }

  void _onTabTapped(int index) {
    widget.navigationShell.goBranch(
      index,
      initialLocation: index == widget.navigationShell.currentIndex,
    );
  }

  Future<bool> _onWillPop(BuildContext context) async {
    // If not on home tab, go to home tab
    if (widget.navigationShell.currentIndex != 0) {
      _onTabTapped(0);
      return false;
    }

    // If on home tab, show exit confirmation
    final shouldExit = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Exit App'),
        content: const Text('Are you sure you want to exit?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Exit'),
          ),
        ],
      ),
    );

    return shouldExit ?? false;
  }

  @override
  Widget build(BuildContext context) {
    // Watch notification controller for unread count changes
    final notificationController = context.watch<NotificationController>();
    final hasUnread = notificationController.unreadCount > 0;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await _onWillPop(context);
        if (shouldPop && context.mounted) {
          Navigator.of(context).pop();
        }
      },
      child: Scaffold(
        body: widget.navigationShell,
        bottomNavigationBar: AppBottomNavigation(
          currentIndex: widget.navigationShell.currentIndex,
          onTabChanged: _onTabTapped,
          hasUnreadNotifications: hasUnread,
        ),
      ),
    );
  }
}
