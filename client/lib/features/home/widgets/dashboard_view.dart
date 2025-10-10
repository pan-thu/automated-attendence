import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/navigation/app_router.dart';
import '../../../core/services/dashboard_repository.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/clock_in_controller.dart';
import '../controllers/dashboard_controller.dart';

class DashboardView extends StatelessWidget {
  const DashboardView({super.key});

  @override
  Widget build(BuildContext context) {
    final dashboard = context.watch<DashboardController>();
    final clockIn = context.watch<ClockInController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Attendance Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: 'Settings',
            onPressed: () => context.push(AppRoutePaths.settings),
          ),
          IconButton(
            onPressed: dashboard.isLoading ? null : () => dashboard.refreshDashboard(),
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
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
                          message: 'You are viewing cached attendance data. Pull down to refresh once you are back online.',
                          lastUpdated: dashboard.summaryUpdatedAt,
                          onRetry: dashboard.refreshDashboard,
                        ),
                      Expanded(
                        child: _DashboardContent(
                          summary: dashboard.summary!,
                          clockIn: clockIn,
                        ),
                      ),
                    ],
                  ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: clockIn.isLoading
            ? null
            : () async {
                final didComplete = await context.read<ClockInController>().attemptClockIn();
                if (!context.mounted) return;

                final messenger = ScaffoldMessenger.of(context);
                if (didComplete) {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        clockIn.statusMessage ?? 'Clock-in recorded.',
                      ),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                  await context.read<DashboardController>().refreshDashboard();
                } else {
                  messenger.showSnackBar(
                    SnackBar(
                      content: Text(
                        clockIn.errorMessage ?? 'Clock-in failed.',
                      ),
                      behavior: SnackBarBehavior.floating,
                    ),
                  );
                }
              },
        icon: clockIn.isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.fingerprint),
        label: const Text('Clock In'),
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
  const _DashboardContent({required this.summary, required this.clockIn});

  final DashboardSummary summary;
  final ClockInController clockIn;

  @override
  Widget build(BuildContext context) {
    final dateLabel = DateFormat.MMMMEEEEd().format(summary.date);

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  dateLabel,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 4),
                Text('${summary.unreadNotifications} unread notifications'),
              ],
            ),
            Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.settings),
                  tooltip: 'Settings',
                  onPressed: () => context.push(AppRoutePaths.settings),
                ),
                Chip(
                  label: Text(summary.isActive ? 'Active' : 'Inactive'),
                  backgroundColor: summary.isActive ? Colors.green.shade100 : Colors.red.shade100,
                ),
              ],
            ),
          ],
        ),
        if (clockIn.statusMessage != null || clockIn.errorMessage != null) ...[
          const SizedBox(height: 16),
          _FeedbackAlert(
            isError: clockIn.errorMessage != null,
            message: clockIn.errorMessage ?? clockIn.statusMessage!,
          ),
        ],
        const SizedBox(height: 16),
        _AttendanceCard(summary: summary.attendance),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: () => context.push(AppRoutePaths.attendanceHistory),
          icon: const Icon(Icons.calendar_month),
          label: const Text('View Attendance History'),
        ),
        const SizedBox(height: 16),
        _LeaveBalancesCard(leaveBalances: summary.leaveBalances),
        const SizedBox(height: 8),
        FilledButton.icon(
          onPressed: () => context.push(AppRoutePaths.leaves),
          icon: const Icon(Icons.beach_access),
          label: const Text('Manage Leave'),
        ),
        const SizedBox(height: 8),
        FilledButton.icon(
          onPressed: () => context.push(AppRoutePaths.notifications),
          icon: const Icon(Icons.notifications),
          label: const Text('Notifications'),
        ),
        if (summary.remainingChecks.isNotEmpty) ...[
          const SizedBox(height: 16),
          _RemainingChecksCard(remaining: summary.remainingChecks),
        ],
        if (summary.upcomingLeave.isNotEmpty) ...[
          const SizedBox(height: 16),
          _UpcomingLeaveCard(leaves: summary.upcomingLeave),
        ],
        if (summary.activePenalties.isNotEmpty) ...[
          const SizedBox(height: 16),
          _PenaltiesCard(penalties: summary.activePenalties),
        ],
        const SizedBox(height: 16),
        _CompanyInfoCard(settings: summary.companySettings),
      ],
    );
  }
}

class _FeedbackAlert extends StatelessWidget {
  const _FeedbackAlert({required this.isError, required this.message});

  final bool isError;
  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      color:
          isError ? colorScheme.errorContainer : colorScheme.primaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isError ? Icons.error_outline : Icons.check_circle_outline,
              color: isError ? colorScheme.error : colorScheme.primary,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color:
                      isError
                          ? colorScheme.onErrorContainer
                          : colorScheme.onPrimaryContainer,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.summary});

  final AttendanceSummary summary;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Attendance Status',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              summary.status ?? 'Unknown',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children:
                  summary.checks
                      .map(
                        (check) => Chip(
                          label: Text(
                            '${check.slot.toUpperCase()}: ${check.status ?? 'pending'}',
                          ),
                        ),
                      )
                      .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _LeaveBalancesCard extends StatelessWidget {
  const _LeaveBalancesCard({required this.leaveBalances});

  final Map<String, num> leaveBalances;

  @override
  Widget build(BuildContext context) {
    if (leaveBalances.isEmpty) {
      return Card(
        child: ListTile(
          title: const Text('Leave Balances'),
          subtitle: const Text('No leave balances available.'),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Leave Balances',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            ...leaveBalances.entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [Text(entry.key), Text(entry.value.toString())],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RemainingChecksCard extends StatelessWidget {
  const _RemainingChecksCard({required this.remaining});

  final List<String> remaining;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.schedule),
        title: const Text('Remaining Checks'),
        subtitle: Text(remaining.map((slot) => slot.toUpperCase()).join(', ')),
      ),
    );
  }
}

class _UpcomingLeaveCard extends StatelessWidget {
  const _UpcomingLeaveCard({required this.leaves});

  final List<LeaveSummary> leaves;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Upcoming Leave',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 12),
            ...leaves.map(
              (leave) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.beach_access),
                title: Text((leave.status ?? 'unknown').toUpperCase()),
                subtitle: Text(
                  '${_formatDate(leave.startDate)} → ${_formatDate(leave.endDate)}',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'TBD';
    return DateFormat.MMMd().format(date);
  }
}

class _PenaltiesCard extends StatelessWidget {
  const _PenaltiesCard({required this.penalties});

  final List<PenaltySummary> penalties;

  @override
  Widget build(BuildContext context) {
    if (penalties.isEmpty) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.warning_amber_rounded),
          title: const Text('Penalties'),
          subtitle: const Text('No penalties recorded.'),
        ),
      );
    }
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Penalties', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...penalties.map(
              (penalty) {
                final amount = penalty.amount ?? 0;
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.warning_amber_rounded),
                  title: Text(penalty.violationType ?? 'Violation'),
                  subtitle: Text(_formatDate(penalty.dateIncurred)),
                  trailing: Text('Rs ${amount.toStringAsFixed(2)}'),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? date) {
    if (date == null) return 'Unknown';
    return DateFormat.MMMd().format(date);
  }
}

class _CompanyInfoCard extends StatelessWidget {
  const _CompanyInfoCard({required this.settings});

  final CompanySettingsSummary settings;

  @override
  Widget build(BuildContext context) {
    final timeWindows = settings.timeWindows.entries
        .map((entry) => '${entry.value.label} (${entry.value.start} – ${entry.value.end})')
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              settings.companyName ?? 'Company Settings',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text('Timezone: ${settings.timezone ?? 'Unknown'}'),
            Text(
              'Geofence radius: ${settings.geofenceRadiusMeters != null ? '${settings.geofenceRadiusMeters.toStringAsFixed(0)} m' : 'n/a'}',
            ),
            Text(
              'Geofence enforcement: ${settings.geoFencingEnabled ? 'Enabled' : 'Disabled'}',
            ),
            if (timeWindows.isNotEmpty) ...[
              const SizedBox(height: 8),
              const Text('Clock-in windows:'),
              ...timeWindows.map(Text.new),
            ],
          ],
        ),
      ),
    );
  }
}
