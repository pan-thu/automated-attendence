import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Month selector widget for attendance history
///
/// Displays current month/year with navigation arrows
/// Based on spec in docs/client-overhaul/03-attendance-history.md
class MonthSelector extends StatelessWidget {
  final DateTime selectedMonth;
  final ValueChanged<DateTime> onMonthChanged;

  const MonthSelector({
    super.key,
    required this.selectedMonth,
    required this.onMonthChanged,
  });

  void _previousMonth() {
    final newMonth = DateTime(
      selectedMonth.year,
      selectedMonth.month - 1,
    );
    onMonthChanged(newMonth);
  }

  void _nextMonth() {
    final newMonth = DateTime(
      selectedMonth.year,
      selectedMonth.month + 1,
    );
    onMonthChanged(newMonth);
  }

  bool get _canGoNext {
    final now = DateTime.now();
    final nextMonth = DateTime(
      selectedMonth.year,
      selectedMonth.month + 1,
    );
    return nextMonth.isBefore(DateTime(now.year, now.month + 1));
  }

  @override
  Widget build(BuildContext context) {
    final monthFormat = DateFormat('MMMM yyyy');

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Previous month button
          IconButton(
            onPressed: _previousMonth,
            icon: const Icon(Icons.chevron_left),
            padding: const EdgeInsets.all(paddingSmall),
            constraints: const BoxConstraints(),
            color: primaryGreen,
          ),

          // Month/year label
          Text(
            monthFormat.format(selectedMonth),
            style: app_typography.labelLarge.copyWith(
              fontWeight: FontWeight.w600,
              color: textPrimary,
            ),
          ),

          // Next month button
          IconButton(
            onPressed: _canGoNext ? _nextMonth : null,
            icon: const Icon(Icons.chevron_right),
            padding: const EdgeInsets.all(paddingSmall),
            constraints: const BoxConstraints(),
            color: _canGoNext ? primaryGreen : textSecondary,
          ),
        ],
      ),
    );
  }
}
