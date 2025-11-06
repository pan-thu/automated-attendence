import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:table_calendar/table_calendar.dart';

import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Date range picker widget for selecting start and end dates
///
/// Features:
/// - Start date and end date input fields
/// - Inline calendar view for date selection
/// - Range selection with visual feedback
/// - Validation for date ranges
/// Based on spec in docs/client-overhaul/05-submit-leave.md
class DateRangePicker extends StatefulWidget {
  final DateTime? startDate;
  final DateTime? endDate;
  final ValueChanged<DateTimeRange?> onDateRangeSelected;
  final DateTime? firstDay;
  final DateTime? lastDay;
  final bool showCalendar;

  const DateRangePicker({
    super.key,
    this.startDate,
    this.endDate,
    required this.onDateRangeSelected,
    this.firstDay,
    this.lastDay,
    this.showCalendar = true,
  });

  @override
  State<DateRangePicker> createState() => _DateRangePickerState();
}

class _DateRangePickerState extends State<DateRangePicker> {
  late DateTime _focusedDay;
  DateTime? _rangeStart;
  DateTime? _rangeEnd;

  @override
  void initState() {
    super.initState();
    _focusedDay = widget.startDate ?? DateTime.now();
    _rangeStart = widget.startDate;
    _rangeEnd = widget.endDate;
  }

  @override
  void didUpdateWidget(DateRangePicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.startDate != oldWidget.startDate) {
      _rangeStart = widget.startDate;
      if (widget.startDate != null) {
        _focusedDay = widget.startDate!;
      }
    }
    if (widget.endDate != oldWidget.endDate) {
      _rangeEnd = widget.endDate;
    }
  }

  void _onDaySelected(DateTime selectedDay, DateTime focusedDay) {
    setState(() {
      _focusedDay = focusedDay;

      if (_rangeStart == null || (_rangeStart != null && _rangeEnd != null)) {
        // Start new range
        _rangeStart = selectedDay;
        _rangeEnd = null;
      } else if (_rangeStart != null && _rangeEnd == null) {
        // Complete the range
        if (selectedDay.isBefore(_rangeStart!)) {
          _rangeEnd = _rangeStart;
          _rangeStart = selectedDay;
        } else {
          _rangeEnd = selectedDay;
        }
      }

      // Notify parent
      if (_rangeStart != null && _rangeEnd != null) {
        widget.onDateRangeSelected(
          DateTimeRange(start: _rangeStart!, end: _rangeEnd!),
        );
      } else if (_rangeStart != null) {
        widget.onDateRangeSelected(
          DateTimeRange(start: _rangeStart!, end: _rangeStart!),
        );
      }
    });
  }

  void _clearRange() {
    setState(() {
      _rangeStart = null;
      _rangeEnd = null;
    });
    widget.onDateRangeSelected(null);
  }

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    final firstDay = widget.firstDay ?? DateTime.now();
    final lastDay = widget.lastDay ?? DateTime.now().add(const Duration(days: 365));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Date input fields
        Row(
          children: [
            Expanded(
              child: _buildDateField(
                label: 'Start Date',
                date: _rangeStart,
                dateFormat: dateFormat,
              ),
            ),
            const SizedBox(width: gapMedium),
            Expanded(
              child: _buildDateField(
                label: 'End Date',
                date: _rangeEnd,
                dateFormat: dateFormat,
              ),
            ),
          ],
        ),

        // Clear button
        if (_rangeStart != null || _rangeEnd != null) ...[
          const SizedBox(height: space3),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton.icon(
              onPressed: _clearRange,
              icon: const Icon(Icons.clear, size: iconSizeSmall),
              label: const Text('Clear'),
              style: TextButton.styleFrom(
                foregroundColor: textSecondary,
              ),
            ),
          ),
        ],

        // Days count
        if (_rangeStart != null && _rangeEnd != null) ...[
          const SizedBox(height: space3),
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingMedium,
              vertical: paddingSmall,
            ),
            decoration: BoxDecoration(
              color: infoBackground.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(radiusSmall),
              border: Border.all(color: infoBackground.withValues(alpha: 0.3)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  Icons.calendar_today,
                  size: iconSizeSmall,
                  color: infoBackground,
                ),
                const SizedBox(width: gapSmall),
                Text(
                  '${_calculateDays(_rangeStart!, _rangeEnd!)} day(s)',
                  style: app_typography.bodySmall.copyWith(
                    color: infoBackground,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],

        // Calendar view
        if (widget.showCalendar) ...[
          const SizedBox(height: space6),
          Container(
            decoration: BoxDecoration(
              color: backgroundSecondary,
              borderRadius: BorderRadius.circular(radiusLarge),
              border: Border.all(color: borderColor, width: 1),
            ),
            child: TableCalendar(
              firstDay: firstDay,
              lastDay: lastDay,
              focusedDay: _focusedDay,
              rangeStartDay: _rangeStart,
              rangeEndDay: _rangeEnd,
              rangeSelectionMode: RangeSelectionMode.toggledOn,
              selectedDayPredicate: (day) => isSameDay(day, _rangeStart),
              onDaySelected: _onDaySelected,
              onPageChanged: (focusedDay) {
                setState(() => _focusedDay = focusedDay);
              },
              calendarFormat: CalendarFormat.month,
              startingDayOfWeek: StartingDayOfWeek.monday,
              headerStyle: HeaderStyle(
                formatButtonVisible: false,
                titleCentered: true,
                titleTextStyle: app_typography.labelLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
                leftChevronIcon: Icon(
                  Icons.chevron_left,
                  color: primaryGreen,
                ),
                rightChevronIcon: Icon(
                  Icons.chevron_right,
                  color: primaryGreen,
                ),
              ),
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
              calendarStyle: CalendarStyle(
                outsideDaysVisible: false,
                // Default day style
                defaultTextStyle: app_typography.bodyMedium.copyWith(
                  color: textPrimary,
                ),
                // Weekend style
                weekendTextStyle: app_typography.bodyMedium.copyWith(
                  color: textPrimary,
                ),
                // Today style
                todayDecoration: BoxDecoration(
                  color: primaryGreen.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                  border: Border.all(color: primaryGreen, width: 2),
                ),
                todayTextStyle: app_typography.bodyMedium.copyWith(
                  color: primaryGreen,
                  fontWeight: FontWeight.w600,
                ),
                // Selected day style
                selectedDecoration: BoxDecoration(
                  color: primaryGreen,
                  shape: BoxShape.circle,
                ),
                selectedTextStyle: app_typography.bodyMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
                // Range start/end style
                rangeStartDecoration: BoxDecoration(
                  color: primaryGreen,
                  shape: BoxShape.circle,
                ),
                rangeStartTextStyle: app_typography.bodyMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
                rangeEndDecoration: BoxDecoration(
                  color: primaryGreen,
                  shape: BoxShape.circle,
                ),
                rangeEndTextStyle: app_typography.bodyMedium.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                ),
                // Range middle days style
                rangeHighlightColor: primaryGreen.withValues(alpha: 0.1),
                withinRangeTextStyle: app_typography.bodyMedium.copyWith(
                  color: textPrimary,
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildDateField({
    required String label,
    required DateTime? date,
    required DateFormat dateFormat,
  }) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(
          color: date != null ? primaryGreen : borderColor,
          width: date != null ? 2 : 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: app_typography.labelSmall.copyWith(
              color: textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: space1),
          Text(
            date != null ? dateFormat.format(date) : 'Select date',
            style: app_typography.bodyMedium.copyWith(
              color: date != null ? textPrimary : textSecondary,
              fontWeight: date != null ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  int _calculateDays(DateTime start, DateTime end) {
    final difference = end.difference(start);
    return difference.inDays + 1;
  }
}
