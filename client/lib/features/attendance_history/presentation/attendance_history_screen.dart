import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:table_calendar/table_calendar.dart';

import '../controllers/attendance_calendar_controller.dart';
import '../controllers/day_detail_controller.dart';
import '../repository/attendance_history_repository.dart';
import '../widgets/day_detail_sheet.dart';
import '../widgets/history_filters_sheet.dart';

class AttendanceHistoryScreen extends StatefulWidget {
  const AttendanceHistoryScreen({super.key});

  @override
  State<AttendanceHistoryScreen> createState() =>
      _AttendanceHistoryScreenState();
}

class _AttendanceHistoryScreenState extends State<AttendanceHistoryScreen> {
  DateTime _focusedDay = DateTime.now();
  DateTime? _selectedDay;

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
        appBar: AppBar(
          title: const Text('Attendance History'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh),
              onPressed:
                  () => context.read<AttendanceCalendarController>().refresh(),
            ),
            IconButton(
              icon: const Icon(Icons.filter_list),
              onPressed: () => _openFilters(context),
            ),
            IconButton(
              icon: const Icon(Icons.ios_share),
              onPressed: () => _exportAttendance(context),
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

            return Column(
              children: [
                TableCalendar<AttendanceDaySummary>(
                  firstDay: DateTime.utc(2023, 1, 1),
                  lastDay: DateTime.utc(2030, 12, 31),
                  focusedDay: _focusedDay,
                  startingDayOfWeek: StartingDayOfWeek.monday,
                  calendarFormat: CalendarFormat.month,
                  selectedDayPredicate: (day) => isSameDay(_selectedDay, day),
                  onDaySelected: (selected, focused) {
                    setState(() {
                      _selectedDay = selected;
                      _focusedDay = focused;
                    });
                    if (!calendar.days.any(
                      (summary) => isSameDay(summary.date, selected),
                    )) {
                      context.read<DayDetailController>().clear();
                      return;
                    }
                    _openDayDetail(context, selected);
                  },
                  onPageChanged: (focused) {
                    _focusedDay = focused;
                    context.read<AttendanceCalendarController>().selectMonth(
                      focused,
                    );
                  },
                  eventLoader:
                      (day) =>
                          calendar.days
                              .where((summary) => isSameDay(summary.date, day))
                              .toList(),
                  calendarBuilders: CalendarBuilders(
                    markerBuilder: (context, day, events) {
                      if (events.isEmpty) {
                        return null;
                      }
                      final summary = events.first;
                      return _StatusMarker(summary: summary);
                    },
                  ),
                ),
                if (calendar.isLoading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: LinearProgressIndicator(),
                  ),
                Expanded(
                  child: _HistoryList(
                    summaries: calendar.days,
                    onSelect:
                        (summary) => _openDayDetail(context, summary.date),
                    onScrollRefresh: calendar.refresh,
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  Future<void> _openDayDetail(BuildContext context, DateTime day) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return ChangeNotifierProvider.value(
          value: context.read<DayDetailController>()..loadDetail(day),
          child: DayDetailSheet(date: day),
        );
      },
    );
  }

  Future<void> _openFilters(BuildContext context) async {
    final calendar = context.read<AttendanceCalendarController>();
    final filters = await showModalBottomSheet<AttendanceFilters>(
      context: context,
      builder:
          (context) => HistoryFiltersSheet(initialFilters: calendar.filters),
    );

    if (filters != null) {
      await calendar.applyFilters(filters);
    }
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
          'Attendance ${_focusedDay.year}-${_focusedDay.month.toString().padLeft(2, '0')}',
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

    Share.share(exportBuffer.toString(), subject: payload.title);
  }
}

class _HistoryList extends StatelessWidget {
  const _HistoryList({
    required this.summaries,
    required this.onSelect,
    required this.onScrollRefresh,
  });

  final List<AttendanceDaySummary> summaries;
  final ValueChanged<AttendanceDaySummary> onSelect;
  final Future<void> Function() onScrollRefresh;

  @override
  Widget build(BuildContext context) {
    if (summaries.isEmpty) {
      return const Center(
        child: Text('No attendance records for this period.'),
      );
    }

    return RefreshIndicator(
      onRefresh: onScrollRefresh,
      child: ListView.builder(
        itemCount: summaries.length,
        itemBuilder: (context, index) {
          final summary = summaries[index];
          return ListTile(
            title: Text(
              '${summary.date.year}-${summary.date.month.toString().padLeft(2, '0')}-${summary.date.day.toString().padLeft(2, '0')}',
            ),
            subtitle: Text(summary.status ?? 'Unknown'),
            trailing:
                summary.violationTypes.isNotEmpty
                    ? Chip(label: Text(summary.violationTypes.join(', ')))
                    : null,
            onTap: () => onSelect(summary),
          );
        },
      ),
    );
  }
}

class _StatusMarker extends StatelessWidget {
  const _StatusMarker({required this.summary});

  final AttendanceDaySummary summary;

  @override
  Widget build(BuildContext context) {
    final color = switch (summary.status) {
      'present' => Colors.green,
      'late' => Colors.orange,
      'absent' => Colors.red,
      _ => Colors.grey,
    };

    return Positioned(
      bottom: 4,
      child: Container(
        width: 8,
        height: 8,
        decoration: BoxDecoration(shape: BoxShape.circle, color: color),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}
