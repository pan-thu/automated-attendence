import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../repository/attendance_history_repository.dart';

/// Attendance list view showing days with check columns
///
/// Displays each day with:
/// - Color-coded date badge
/// - Check 1, 2, 3 times in columns
/// - Menu button for actions
/// Redesigned to match attendance.png mockup
class AttendanceListView extends StatelessWidget {
  final List<AttendanceDaySummary> days;
  final VoidCallback? onDayTap;

  const AttendanceListView({
    super.key,
    required this.days,
    this.onDayTap,
  });

  @override
  Widget build(BuildContext context) {
    if (days.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(paddingXLarge),
          child: Text(
            'No attendance records for this month',
            style: app_typography.bodyMedium.copyWith(
              color: textSecondary,
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header row
        _HeaderRow(),
        const SizedBox(height: space3),

        // Attendance rows
        ...days.map((day) => Padding(
              padding: const EdgeInsets.only(bottom: space3),
              child: _AttendanceRow(day: day, onTap: onDayTap),
            )),
      ],
    );
  }
}

/// Header row showing column labels
class _HeaderRow extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: paddingSmall),
      child: Row(
        children: [
          // Date column (fixed width)
          SizedBox(
            width: 64,
            child: Text(
              'Date',
              style: app_typography.labelMedium.copyWith(
                color: textSecondary,
              ),
            ),
          ),

          // Check columns
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    'Check 1',
                    textAlign: TextAlign.center,
                    style: app_typography.labelMedium.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Check 2',
                    textAlign: TextAlign.center,
                    style: app_typography.labelMedium.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ),
                Expanded(
                  child: Text(
                    'Check 3',
                    textAlign: TextAlign.center,
                    style: app_typography.labelMedium.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Menu button space
          const SizedBox(width: 40),
        ],
      ),
    );
  }
}

/// Individual attendance row
class _AttendanceRow extends StatelessWidget {
  final AttendanceDaySummary day;
  final VoidCallback? onTap;

  const _AttendanceRow({
    required this.day,
    this.onTap,
  });

  Color _getDateBadgeColor() {
    switch (day.status?.toLowerCase()) {
      case 'present':
        return const Color(0xFFE8F5E9); // Light green
      case 'absent':
        return const Color(0xFFFFEBEE); // Light red
      case 'late':
      case 'early_leave':
        return const Color(0xFFFFF9C4); // Light yellow
      case 'half_day_absent':
        return const Color(0xFFF3E5F5); // Light purple
      case 'on_leave':
        return const Color(0xFFE3F2FD); // Light blue
      default:
        return const Color(0xFFF5F5F5); // Light gray
    }
  }

  Color _getDateTextColor() {
    switch (day.status?.toLowerCase()) {
      case 'present':
        return const Color(0xFF4CAF50); // Green
      case 'absent':
        return const Color(0xFFF44336); // Red
      case 'late':
      case 'early_leave':
        return const Color(0xFFFFA726); // Orange
      case 'half_day_absent':
        return const Color(0xFF9C27B0); // Purple
      case 'on_leave':
        return const Color(0xFF42A5F5); // Blue
      default:
        return textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final dayFormat = DateFormat('d');
    final weekdayFormat = DateFormat('E');

    // Get checks, ensure we have exactly 3 slots
    final checks = <AttendanceCheckSummary?>[];
    for (var i = 1; i <= 3; i++) {
      final slot = 'check$i';
      final check = day.checks.cast<AttendanceCheckSummary?>().firstWhere(
            (c) => c?.slot == slot,
            orElse: () => null,
          );
      checks.add(check);
    }

    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Row(
        children: [
          // Date badge
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: _getDateBadgeColor(),
              borderRadius: BorderRadius.circular(radiusMedium),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  dayFormat.format(day.date),
                  style: app_typography.headingSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: _getDateTextColor(),
                  ),
                ),
                Text(
                  weekdayFormat.format(day.date),
                  style: app_typography.labelSmall.copyWith(
                    color: _getDateTextColor(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: gapMedium),

          // Check times
          Expanded(
            child: Row(
              children: checks.map((check) {
                return Expanded(
                  child: _CheckTimeCell(check: check),
                );
              }).toList(),
            ),
          ),

          // Menu button
          IconButton(
            icon: Icon(
              Icons.more_vert,
              color: textSecondary,
              size: 20,
            ),
            onPressed: onTap,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(),
          ),
        ],
      ),
    );
  }
}

/// Check time cell showing time or dash
class _CheckTimeCell extends StatelessWidget {
  final AttendanceCheckSummary? check;

  const _CheckTimeCell({this.check});

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final hasTime = check?.timestamp != null;
    final isLate = check?.status?.toLowerCase() == 'late';

    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        if (hasTime)
          Text(
            timeFormat.format(check!.timestamp!),
            style: app_typography.bodyMedium.copyWith(
              color: isLate ? const Color(0xFFFFA726) : textPrimary,
              fontWeight: FontWeight.w500,
            ),
          )
        else
          Text(
            '─',
            style: app_typography.bodyMedium.copyWith(
              color: borderColor,
              fontSize: 20,
            ),
          ),

        // Warning icon for late
        if (isLate) ...[
          const SizedBox(width: space1),
          Icon(
            Icons.warning_rounded,
            size: 16,
            color: const Color(0xFFFFA726),
          ),
        ],
      ],
    );
  }
}
