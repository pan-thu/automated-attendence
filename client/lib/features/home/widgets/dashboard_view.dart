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
        _dashboardController.startLocationUpdates();
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
      appBar: AppBar(
        title: Text(
          'Home',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: Badge(
              isLabelVisible: dashboard.summary != null &&
                  dashboard.summary!.unreadNotifications > 0,
              label: Text(
                dashboard.summary?.unreadNotifications.toString() ?? '',
              ),
              child: const Icon(Icons.notifications_outlined),
            ),
            onPressed: () => context.push(AppRoutePaths.notifications),
          ),
        ],
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

    return ListView(
      padding: const EdgeInsets.all(paddingLarge),
      children: [
        // Current check indicator at top
        if (currentCheckSlot != null) ...[
          Center(
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: paddingMedium,
                vertical: paddingSmall,
              ),
              decoration: BoxDecoration(
                color: primaryGreen.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(radiusLarge),
                border: Border.all(color: primaryGreen, width: 1),
              ),
              child: Text(
                'Check $currentCheckSlot',
                style: app_typography.labelMedium.copyWith(
                  fontWeight: FontWeight.w600,
                  color: primaryGreen,
                ),
              ),
            ),
          ),
          const SizedBox(height: space6),
        ],

        // Time display
        const TimeDisplay(),
        const SizedBox(height: space10),

        // Circular clock-in button
        Center(
          child: Material(
            elevation: elevationHigh,
            shape: const CircleBorder(),
            color: clockIn.isLoading ? borderColor : primaryGreen,
            child: InkWell(
              onTap: clockIn.isLoading ? null : onClockIn,
              customBorder: const CircleBorder(),
              child: SizedBox(
                width: 140,
                height: 140,
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
                            size: 56,
                            color: Colors.white,
                          ),
                          const SizedBox(height: space2),
                          Text(
                            'Clock In',
                            style: app_typography.labelLarge.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
        const SizedBox(height: space10),

        // Location proximity indicator
        LocationProximityIndicator(
          isInRange: dashboard.isWithinGeofence,
          distanceInMeters: dashboard.distanceToOffice,
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

        // Check status tracker
        tracker.CheckStatusTracker(
          checks: checkSummaries,
        ),
        const SizedBox(height: space10),

        // Quick action cards section
        Text(
          'Quick Actions',
          style: app_typography.headingSmall.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: space4),

        // Action cards grid
        Row(
          children: [
            Expanded(
              child: _QuickActionCard(
                icon: Icons.beach_access_outlined,
                label: 'Leave',
                subtitle: _getLeaveBalanceText(summary.leaveBalances),
                onTap: () => context.push(AppRoutePaths.leaves),
              ),
            ),
            const SizedBox(width: gapMedium),
            Expanded(
              child: _QuickActionCard(
                icon: Icons.warning_amber_outlined,
                label: 'Penalties',
                subtitle: summary.activePenalties.isEmpty
                    ? 'No penalties'
                    : '${summary.activePenalties.length} active',
                onTap: () => context.push(AppRoutePaths.penalties),
              ),
            ),
          ],
        ),
        const SizedBox(height: space8),

        // Statistics section
        Text(
          'Today\'s Summary',
          style: app_typography.headingSmall.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: space4),

        _StatisticsCard(
          items: [
            _StatItem(
              icon: Icons.check_circle,
              label: 'Status',
              value: _formatAttendanceStatus(summary.attendance.status),
              color: _getAttendanceStatusColor(summary.attendance.status),
            ),
            _StatItem(
              icon: Icons.done_all,
              label: 'Completed',
              value: '${summary.attendance.checks.where((c) => c.status != null && c.status != 'missed').length}',
              color: statusPresent,
            ),
            _StatItem(
              icon: Icons.schedule,
              label: 'Late Checks',
              value: '${summary.attendance.checks.where((c) => c.status == 'late').length}',
              color: statusLate,
            ),
          ],
        ),

        // Upcoming leave (if any)
        if (summary.upcomingLeave.isNotEmpty) ...[
          const SizedBox(height: space8),
          _UpcomingLeaveCard(leaves: summary.upcomingLeave),
        ],

        const SizedBox(height: space16),
      ],
    );
  }

  String _getLeaveBalanceText(Map<String, num> balances) {
    if (balances.isEmpty) return 'No balance';
    final total = balances.values.fold<num>(0, (a, b) => a + b);
    return '$total days left';
  }

  String _formatAttendanceStatus(String? status) {
    if (status == null || status.isEmpty) return 'Unknown';

    switch (status.toLowerCase()) {
      case 'present':
        return 'Present';
      case 'absent':
        return 'Absent';
      case 'late':
        return 'Late';
      case 'half_day_absent':
        return 'Half Day';
      case 'on_leave':
        return 'On Leave';
      case 'holiday':
        return 'Holiday';
      default:
        return status.split('_').map((word) => word[0].toUpperCase() + word.substring(1)).join(' ');
    }
  }

  Color _getAttendanceStatusColor(String? status) {
    if (status == null || status.isEmpty) return textSecondary;

    switch (status.toLowerCase()) {
      case 'present':
        return statusPresent;
      case 'absent':
        return statusAbsent;
      case 'late':
        return statusLate;
      case 'half_day_absent':
        return statusHalfDay;
      case 'on_leave':
        return statusLeave;
      case 'holiday':
        return statusHoliday;
      default:
        return textSecondary;
    }
  }
}

/// Quick action card widget for navigation
class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: backgroundSecondary,
          borderRadius: BorderRadius.circular(radiusMedium),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              color: primaryGreen,
              size: iconSizeLarge,
            ),
            const SizedBox(height: space3),
            Text(
              label,
              style: app_typography.labelLarge.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
            const SizedBox(height: space1),
            Text(
              subtitle,
              style: app_typography.bodySmall.copyWith(
                color: textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Statistics card widget for displaying metrics
class _StatisticsCard extends StatelessWidget {
  final List<_StatItem> items;

  const _StatisticsCard({required this.items});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: items
            .map(
              (item) => Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      item.icon,
                      color: item.color,
                      size: iconSizeMedium,
                    ),
                    const SizedBox(height: space2),
                    Text(
                      item.value,
                      style: app_typography.headingMedium.copyWith(
                        fontWeight: FontWeight.bold,
                        color: item.color,
                      ),
                    ),
                    const SizedBox(height: space1),
                    Text(
                      item.label,
                      style: app_typography.bodySmall.copyWith(
                        color: textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
            )
            .toList(),
      ),
    );
  }
}

/// Stat item data class
class _StatItem {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatItem({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });
}

/// Upcoming leave card widget
class _UpcomingLeaveCard extends StatelessWidget {
  final List<repo.LeaveSummary> leaves;

  const _UpcomingLeaveCard({required this.leaves});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(
                Icons.beach_access_outlined,
                color: primaryGreen,
                size: iconSizeMedium,
              ),
              const SizedBox(width: gapSmall),
              Text(
                'Upcoming Leave',
                style: app_typography.labelLarge.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: space4),
          ...leaves.take(2).map(
            (leave) => Padding(
              padding: const EdgeInsets.only(bottom: space3),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 40,
                    decoration: BoxDecoration(
                      color: _getLeaveStatusColor(leave.status),
                      borderRadius: BorderRadius.circular(radiusSmall),
                    ),
                  ),
                  const SizedBox(width: gapSmall),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          leave.status.toUpperCase(),
                          style: app_typography.labelSmall.copyWith(
                            fontWeight: FontWeight.w600,
                            color: _getLeaveStatusColor(leave.status),
                          ),
                        ),
                        const SizedBox(height: space1),
                        Text(
                          '${_formatDate(leave.startDate ?? DateTime.now())} → ${_formatDate(leave.endDate ?? DateTime.now())}',
                          style: app_typography.bodySmall.copyWith(
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          if (leaves.length > 2) ...[
            const SizedBox(height: space2),
            Text(
              '+${leaves.length - 2} more',
              style: app_typography.bodySmall.copyWith(
                color: textSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getLeaveStatusColor(String? status) {
    switch (status?.toLowerCase()) {
      case 'approved':
        return successBackground;
      case 'pending':
        return warningBackground;
      case 'rejected':
        return errorBackground;
      default:
        return textSecondary;
    }
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'TBD';
    return DateFormat.MMMd().format(date);
  }
}
