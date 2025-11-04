import 'package:flutter/material.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Attendance calendar widget showing daily attendance status
///
/// Displays a calendar with color-coded attendance markers
/// Based on spec in docs/client-overhaul/03-attendance-history.md
class AttendanceCalendar extends StatelessWidget {
  final DateTime focusedMonth;
  final Map<DateTime, AttendanceStatus> attendanceData;
  final ValueChanged<DateTime> onDaySelected;

  const AttendanceCalendar({
    super.key,
    required this.focusedMonth,
    required this.attendanceData,
    required this.onDaySelected,
  });

  AttendanceStatus? _getAttendanceStatus(DateTime day) {
    // Normalize date to midnight for comparison
    final normalizedDay = DateTime(day.year, day.month, day.day);
    return attendanceData[normalizedDay];
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusLarge),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: TableCalendar(
        firstDay: DateTime(2020),
        lastDay: DateTime.now(),
        focusedDay: focusedMonth,
        currentDay: DateTime.now(),
        calendarFormat: CalendarFormat.month,
        startingDayOfWeek: StartingDayOfWeek.monday,
        availableCalendarFormats: const {
          CalendarFormat.month: 'Month',
        },
        headerVisible: false, // We use custom MonthSelector
        daysOfWeekHeight: 40,
        rowHeight: 48,

        // Styling
        calendarStyle: CalendarStyle(
          // Today
          todayDecoration: BoxDecoration(
            color: primaryGreen.withOpacity(0.2),
            shape: BoxShape.circle,
            border: Border.all(color: primaryGreen, width: 2),
          ),
          todayTextStyle: app_typography.bodyMedium.copyWith(
            color: primaryGreen,
            fontWeight: FontWeight.w600,
          ),

          // Selected day
          selectedDecoration: const BoxDecoration(
            color: primaryGreen,
            shape: BoxShape.circle,
          ),
          selectedTextStyle: app_typography.bodyMedium.copyWith(
            color: Colors.white,
            fontWeight: FontWeight.w600,
          ),

          // Default day
          defaultDecoration: const BoxDecoration(
            shape: BoxShape.circle,
          ),
          defaultTextStyle: app_typography.bodyMedium.copyWith(
            color: textPrimary,
          ),

          // Weekend day
          weekendDecoration: const BoxDecoration(
            shape: BoxShape.circle,
          ),
          weekendTextStyle: app_typography.bodyMedium.copyWith(
            color: textSecondary,
          ),

          // Outside month
          outsideDecoration: const BoxDecoration(
            shape: BoxShape.circle,
          ),
          outsideTextStyle: app_typography.bodyMedium.copyWith(
            color: textSecondary.withOpacity(0.5),
          ),

          // Markers
          markerDecoration: const BoxDecoration(
            color: primaryGreen,
            shape: BoxShape.circle,
          ),
        ),

        // Day of week styling
        daysOfWeekStyle: DaysOfWeekStyle(
          weekdayStyle: app_typography.labelSmall.copyWith(
            color: textSecondary,
            fontWeight: FontWeight.w600,
          ),
          weekendStyle: app_typography.labelSmall.copyWith(
            color: textSecondary,
            fontWeight: FontWeight.w600,
          ),
        ),

        // Custom day builder to show attendance status
        calendarBuilders: CalendarBuilders(
          defaultBuilder: (context, day, focusedDay) {
            return _buildDayCell(day, false, false);
          },
          todayBuilder: (context, day, focusedDay) {
            return _buildDayCell(day, true, false);
          },
          selectedBuilder: (context, day, focusedDay) {
            return _buildDayCell(day, false, true);
          },
          outsideBuilder: (context, day, focusedDay) {
            return _buildDayCell(day, false, false, isOutside: true);
          },
        ),

        onDaySelected: (selectedDay, focusedDay) {
          onDaySelected(selectedDay);
        },
      ),
    );
  }

  Widget _buildDayCell(
    DateTime day,
    bool isToday,
    bool isSelected, {
    bool isOutside = false,
  }) {
    final status = _getAttendanceStatus(day);
    final statusColor = _getStatusColor(status);

    return Container(
      margin: const EdgeInsets.all(2),
      decoration: BoxDecoration(
        color: isSelected
            ? primaryGreen
            : isToday
                ? primaryGreen.withOpacity(0.1)
                : statusColor?.withOpacity(0.1),
        shape: BoxShape.circle,
        border: isToday && !isSelected
            ? Border.all(color: primaryGreen, width: 2)
            : status != null
                ? Border.all(color: statusColor!, width: 2)
                : null,
      ),
      child: Center(
        child: Text(
          '${day.day}',
          style: app_typography.bodyMedium.copyWith(
            color: isSelected
                ? Colors.white
                : isOutside
                    ? textSecondary.withOpacity(0.5)
                    : isToday
                        ? primaryGreen
                        : statusColor ?? textPrimary,
            fontWeight: isSelected || isToday ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }

  Color? _getStatusColor(AttendanceStatus? status) {
    if (status == null) return null;

    switch (status) {
      case AttendanceStatus.present:
        return statusPresent;
      case AttendanceStatus.absent:
        return statusAbsent;
      case AttendanceStatus.late:
        return statusLate;
      case AttendanceStatus.halfDay:
        return statusHalfDay;
      case AttendanceStatus.leave:
        return statusLeave;
      case AttendanceStatus.holiday:
        return statusHoliday;
    }
  }
}

/// Attendance status enum
enum AttendanceStatus {
  present,
  absent,
  late,
  halfDay,
  leave,
  holiday,
}
