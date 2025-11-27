import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/navigation/app_router.dart';
import '../../../core/services/auth_repository.dart';
import '../../../core/services/dashboard_repository.dart' as repo;
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../widgets/feedback_dialog.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/clock_in_controller.dart';
import '../controllers/dashboard_controller.dart';
import 'check_status_tracker.dart' as tracker;
import 'location_proximity_indicator.dart';
import 'time_display.dart';

/// Dashboard view for home screen
///
/// Features:
/// - Live time display
/// - Location proximity indicator
/// - Check-in/out status tracker
/// - Clock-in action button
/// - Quick action cards
/// - Summary statistics
/// Based on spec in docs/client-overhaul/02-home-dashboard.md
class DashboardView extends StatefulWidget {
  const DashboardView({super.key});

  @override
  State<DashboardView> createState() => _DashboardViewState();
}

class _DashboardViewState extends State<DashboardView> {
  late DashboardController _dashboardController;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Save reference to controller for use in dispose()
    _dashboardController = context.read<DashboardController>();
  }

  @override
  void initState() {
    super.initState();
    // Start location updates when dashboard is shown
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        // Access controller from context here instead of using the field
        context.read<DashboardController>().startLocationUpdates();
      }
    });
  }

  @override
  void dispose() {
    // Stop location updates when dashboard is hidden
    _dashboardController.stopLocationUpdates();
    super.dispose();
  }

  Future<void> _handleClockIn(BuildContext context) async {
    final clockIn = context.read<ClockInController>();

    try {
      final didComplete = await clockIn.attemptClockIn();

      if (!context.mounted) return;

      if (didComplete) {
        FeedbackDialog.showSuccess(
          context,
          'Clock-In Successful',
          message: clockIn.statusMessage ?? 'Your attendance has been recorded.',
        );

        // Refresh dashboard after successful clock-in
        await context.read<DashboardController>().refreshDashboard();
      } else {
        FeedbackDialog.showError(
          context,
          'Clock-In Failed',
          message: clockIn.errorMessage ?? 'Unable to record attendance. Please try again.',
        );
      }
    } on AuthFailure catch (e) {
      if (context.mounted) {
        FeedbackDialog.showError(
          context,
          'Clock-In Failed',
          message: e.message,
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardController>();
    final clockIn = context.watch<ClockInController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      // Transparent AppBar to maintain status bar color
      appBar: AppBar(
        toolbarHeight: 0,
        backgroundColor: backgroundPrimary,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: dashboard.refreshDashboard,
        child: dashboard.isLoading
            ? const Center(child: CircularProgressIndicator())
            : dashboard.summary == null
                ? _EmptyState(errorMessage: dashboard.errorMessage)
                : Column(
                    children: [
                      if (dashboard.isOffline)
                        OfflineNotice(
                          message:
                              'You are viewing cached data. Pull down to refresh.',
                          lastUpdated: dashboard.summaryUpdatedAt,
                          onRetry: dashboard.refreshDashboard,
                        ),
                      Expanded(
                        child: _DashboardContent(
                          summary: dashboard.summary!,
                          dashboard: dashboard,
                          clockIn: clockIn,
                          onClockIn: () => _handleClockIn(context),
                        ),
                      ),
                    ],
                  ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({this.errorMessage});

  final String? errorMessage;

  @override
  Widget build(BuildContext context) {
    if (errorMessage != null && errorMessage!.isNotEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Text(errorMessage!, textAlign: TextAlign.center),
        ),
      );
    }
    return const Center(child: Text('No dashboard data available yet.'));
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({
    required this.summary,
    required this.dashboard,
    required this.clockIn,
    required this.onClockIn,
  });

  final repo.DashboardSummary summary;
  final DashboardController dashboard;
  final ClockInController clockIn;
  final VoidCallback onClockIn;

  @override
  Widget build(BuildContext context) {
    // Convert attendance checks from repo.CheckSummary to tracker.CheckSummary
    final checkSummaries = summary.attendance.checks
        .map((check) {
          // Parse slot string to int (e.g., "check1" -> 1, "1" -> 1)
          int slot;
          try {
            slot = int.parse(check.slot.replaceAll(RegExp(r'[^0-9]'), ''));
          } catch (_) {
            slot = 1; // Default to 1 if parsing fails
          }

          return tracker.CheckSummary(
            slot: slot,
            status: check.status,
            timestamp: check.timestamp, // Already DateTime?
          );
        })
        .toList();

    // Determine current check slot
    final currentCheckSlot = checkSummaries.isEmpty
        ? 1
        : checkSummaries.length < 3
            ? checkSummaries.length + 1
            : null;

    return Padding(
      padding: const EdgeInsets.all(paddingLarge),
      child: Column(
        children: [
          // Time display at top
          const TimeDisplay(),

          // Spacer to push clock-in button to center
          const Spacer(),

          // Circular clock-in button centered on screen
          Material(
            elevation: elevationHigh,
            shape: const CircleBorder(),
            color: clockIn.isLoading ? borderColor : primaryGreen,
            child: InkWell(
              onTap: clockIn.isLoading ? null : onClockIn,
              customBorder: const CircleBorder(),
              child: SizedBox(
                width: 220,
                height: 220,
                child: clockIn.isLoading
                    ? const Center(
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.touch_app_rounded,
                            size: 80,
                            color: Colors.white,
                          ),
                          const SizedBox(height: space3),
                          Text(
                            'Clock In',
                            style: app_typography.headingMedium.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),

          // Spacer to push check tracker to bottom
          const Spacer(),

          // Location proximity indicator
          LocationProximityIndicator(
            isInRange: dashboard.isWithinGeofence,
            distanceInMeters: dashboard.distanceToOffice,
            workplaceAddress: summary.companySettings.workplaceAddress,
            isLoading: dashboard.isLoadingLocation,
          ),
          const SizedBox(height: space6),

          // Location error message (if any)
          if (dashboard.locationError != null) ...[
            Container(
              padding: const EdgeInsets.all(paddingMedium),
              decoration: BoxDecoration(
                color: warningBackground.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(radiusMedium),
                border: Border.all(color: warningBackground, width: 1),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: warningBackground,
                    size: iconSizeSmall,
                  ),
                  const SizedBox(width: gapSmall),
                  Expanded(
                    child: Text(
                      dashboard.locationError!,
                      style: app_typography.bodySmall.copyWith(
                        color: warningBackground,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: space6),
          ],

          // Check status tracker at bottom
          tracker.CheckStatusTracker(
            checks: checkSummaries,
          ),
        ],
      ),
    );
  }

}
