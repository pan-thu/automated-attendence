import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'app_bottom_navigation.dart';

/// Main scaffold widget with bottom navigation
///
/// Wraps all main tab screens with persistent bottom navigation
/// Based on spec in docs/client-overhaul/00-navigation-architecture.md
class MainScaffold extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainScaffold({
    super.key,
    required this.navigationShell,
  });

  void _onTabTapped(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  Future<bool> _onWillPop(BuildContext context) async {
    // If not on home tab, go to home tab
    if (navigationShell.currentIndex != 0) {
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
        body: navigationShell,
        bottomNavigationBar: AppBottomNavigation(
          currentIndex: navigationShell.currentIndex,
          onTabChanged: _onTabTapped,
        ),
      ),
    );
  }
}
