import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../controllers/attendance_calendar_controller.dart';
import '../controllers/day_detail_controller.dart';
import '../repository/attendance_history_repository.dart';
import '../widgets/attendance_list_view.dart';
import '../widgets/attendance_stats_card.dart';
import '../widgets/day_detail_sheet.dart';
import '../widgets/month_year_selector.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

/// Attendance history screen with list view and statistics
///
/// Features:
/// - Month/year selector tabs
/// - Statistics summary with circular indicators
/// - List view showing days with check columns
/// - Day detail bottom sheet
/// - Export attendance data
/// Redesigned to match attendance.png mockup
class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AttendanceCalendarController>(
          create: (_) => AttendanceCalendarController()..initialize(),
        ),
        ChangeNotifierProvider<DayDetailController>(
          create: (_) => DayDetailController(),
        ),
      ],
      child: Scaffold(
        backgroundColor: backgroundPrimary,
        appBar: AppBar(
          title: Text(
            'Attendance',
            style: app_typography.headingLarge.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          backgroundColor: backgroundPrimary,
          elevation: 0,
          centerTitle: true,
        ),
        body: Consumer<AttendanceCalendarController>(
          builder: (context, calendar, _) {
            if (calendar.isLoading && calendar.days.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }

            if (calendar.errorMessage != null && calendar.days.isEmpty) {
              return _ErrorState(
                message: calendar.errorMessage!,
                onRetry: () => calendar.refresh(),
              );
            }

            // Calculate stats for the month
            final stats = _calculateStats(calendar.days);

            return RefreshIndicator(
              onRefresh: calendar.refresh,
              child: ListView(
                padding: const EdgeInsets.all(paddingLarge),
                children: [
                  // Month/Year selector
                  MonthYearSelector(
                    selectedDate: _selectedDate,
                    onDateChanged: (date) {
                      setState(() {
                        _selectedDate = date;
                      });
                      calendar.selectMonth(date);
                    },
                  ),
                  const SizedBox(height: space6),

                  // Statistics summary card
                  AttendanceStatsCard(
                    present: stats['present'] ?? 0,
                    absent: stats['absent'] ?? 0,
                    late: stats['late'] ?? 0,
                    leave: stats['leave'] ?? 0,
                    halfDay: stats['halfDay'] ?? 0,
                    totalDays: stats['total'] ?? 30,
                  ),
                  const SizedBox(height: space6),

                  // Loading indicator
                  if (calendar.isLoading)
                    const LinearProgressIndicator(),
                  if (calendar.isLoading)
                    const SizedBox(height: space6),

                  // Attendance list view
                  AttendanceListView(
                    days: calendar.days,
                    onDayTap: () {
                      // Could open day detail sheet here
                    },
                  ),
                  const SizedBox(height: space16),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Map<String, int> _calculateStats(List<AttendanceDaySummary> days) {
    int present = 0;
    int absent = 0;
    int late = 0;
    int halfDay = 0;
    int leave = 0;

    for (final day in days) {
      switch (day.status?.toLowerCase()) {
        case 'present':
          present++;
          break;
        case 'absent':
          absent++;
          break;
        case 'late':
        case 'early_leave':
          late++;
          break;
        case 'half_day_absent':
          halfDay++;
          break;
        case 'on_leave':
          leave++;
          break;
      }
    }

    // Determine total days in month (approximate)
    final daysInMonth = DateTime(
      _selectedDate.year,
      _selectedDate.month + 1,
      0,
    ).day;

    return {
      'present': present,
      'absent': absent,
      'late': late,
      'halfDay': halfDay,
      'leave': leave,
      'total': daysInMonth,
    };
  }

  Future<void> _openDayDetail(BuildContext context, DateTime day) async {
    final controller = context.read<DayDetailController>();
    controller.loadDetail(day);

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return ChangeNotifierProvider.value(
          value: controller,
          child: DayDetailSheet(date: day),
        );
      },
    );
  }
}

/// Error state widget
class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({
    required this.message,
    required this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(paddingXLarge),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.error_outline,
              size: 64,
              color: errorBackground,
            ),
            const SizedBox(height: space6),
            Text(
              'Error',
              style: app_typography.headingMedium.copyWith(
                color: errorBackground,
              ),
            ),
            const SizedBox(height: space3),
            Text(
              message,
              textAlign: TextAlign.center,
              style: app_typography.bodyMedium.copyWith(
                color: textSecondary,
              ),
            ),
            const SizedBox(height: space8),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}
