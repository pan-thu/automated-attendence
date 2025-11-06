import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../controllers/attendance_calendar_controller.dart';
import '../controllers/day_detail_controller.dart';
import '../repository/attendance_history_repository.dart';
import '../widgets/attendance_calendar.dart';
import '../widgets/attendance_stats_summary.dart';
import '../widgets/day_detail_sheet.dart';
import '../widgets/month_selector.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

/// Attendance history screen with calendar and statistics
///
/// Features:
/// - Month selector
/// - Calendar view with color-coded attendance
/// - Monthly statistics summary
/// - Day detail bottom sheet
/// - Export attendance data
/// Based on spec in docs/client-overhaul/03-attendance-history.md
class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  DateTime _focusedMonth = DateTime.now();

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
            'Attendance History',
            style: app_typography.headingMedium,
          ),
          backgroundColor: backgroundPrimary,
          elevation: 0,
          actions: [
            IconButton(
              icon: const Icon(Icons.ios_share_outlined),
              onPressed: () => _exportAttendance(context),
              tooltip: 'Export',
            ),
          ],
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

            // Convert attendance data to map for calendar
            final attendanceMap = _buildAttendanceMap(calendar.days);
            final stats = _calculateStats(calendar.days);

            return RefreshIndicator(
              onRefresh: calendar.refresh,
              child: ListView(
                padding: const EdgeInsets.all(paddingLarge),
                children: [
                  // Month selector
                  MonthSelector(
                    selectedMonth: _focusedMonth,
                    onMonthChanged: (month) {
                      setState(() {
                        _focusedMonth = month;
                      });
                      calendar.selectMonth(month);
                    },
                  ),
                  const SizedBox(height: space6),

                  // Calendar view
                  AttendanceCalendar(
                    focusedMonth: _focusedMonth,
                    attendanceData: attendanceMap,
                    onDaySelected: (day) => _openDayDetail(context, day),
                  ),
                  const SizedBox(height: space6),

                  // Loading indicator
                  if (calendar.isLoading)
                    const LinearProgressIndicator(),
                  if (calendar.isLoading)
                    const SizedBox(height: space6),

                  // Statistics summary
                  AttendanceStatsSummary(stats: stats),
                  const SizedBox(height: space16),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Map<DateTime, AttendanceStatus> _buildAttendanceMap(
    List<AttendanceDaySummary> days,
  ) {
    final map = <DateTime, AttendanceStatus>{};

    for (final day in days) {
      final normalizedDate = DateTime(
        day.date.year,
        day.date.month,
        day.date.day,
      );

      final status = _mapStatus(day.status);
      if (status != null) {
        map[normalizedDate] = status;
      }
    }

    return map;
  }

  AttendanceStatus? _mapStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'present':
        return AttendanceStatus.present;
      case 'absent':
        return AttendanceStatus.absent;
      case 'late':
      case 'early_leave':
        return AttendanceStatus.late;
      case 'half_day_absent':
        return AttendanceStatus.halfDay;
      case 'on_leave':
        return AttendanceStatus.leave;
      case 'holiday':
        return AttendanceStatus.holiday;
      default:
        return null;
    }
  }

  AttendanceStats _calculateStats(List<AttendanceDaySummary> days) {
    int present = 0;
    int absent = 0;
    int late = 0;
    int halfDay = 0;
    int leave = 0;
    int holiday = 0;

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
        case 'holiday':
          holiday++;
          break;
      }
    }

    return AttendanceStats(
      present: present,
      absent: absent,
      late: late,
      halfDay: halfDay,
      leave: leave,
      holiday: holiday,
    );
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


  void _exportAttendance(BuildContext context) {
    final calendar = context.read<AttendanceCalendarController>();
    if (calendar.days.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No attendance data to export for this month.'),
        ),
      );
      return;
    }

    final payload = AttendanceExportPayload(
      title:
          'Attendance ${_focusedMonth.year}-${_focusedMonth.month.toString().padLeft(2, '0')}',
      generatedAt: DateTime.now(),
      days: calendar.days.toList(),
    );

    final exportBuffer =
        StringBuffer()
          ..writeln(
            'Attendance export generated on ${payload.generatedAt.toIso8601String()}',
          )
          ..writeln('Date,Status,Violations,Manual Override');

    for (final day in payload.days) {
      final violations = day.violationTypes.join('|');
      final manual = day.hasManualOverride ? 'Yes' : 'No';
      exportBuffer.writeln(
        '${day.date.toIso8601String()},${day.status ?? 'unknown'},$violations,$manual',
      );
    }

    // ignore: deprecated_member_use
    Share.share(exportBuffer.toString(), subject: payload.title);
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
