import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Month and year selector with tabs
///
/// Shows horizontal month tabs (May, June, July) and year dropdown
/// Redesigned to match attendance.png mockup
class MonthYearSelector extends StatelessWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateChanged;

  const MonthYearSelector({
    super.key,
    required this.selectedDate,
    required this.onDateChanged,
  });

  @override
  Widget build(BuildContext context) {
    final currentMonth = selectedDate.month;
    final currentYear = selectedDate.year;

    // Show current month and 2 months before
    final months = [
      DateTime(currentYear, currentMonth - 2),
      DateTime(currentYear, currentMonth - 1),
      DateTime(currentYear, currentMonth),
    ];

    return Row(
      children: [
        // Month tabs
        Expanded(
          child: Row(
            mainAxisAlignment: MainAxisAlignment.start,
            children: months.map((month) {
              final isSelected = month.month == currentMonth && month.year == currentYear;
              return Padding(
                padding: const EdgeInsets.only(right: gapSmall),
                child: _MonthTab(
                  month: month,
                  isSelected: isSelected,
                  onTap: () => onDateChanged(month),
                ),
              );
            }).toList(),
          ),
        ),

        // Year dropdown
        _YearDropdown(
          selectedYear: currentYear,
          onYearChanged: (year) {
            final newDate = DateTime(year, currentMonth);
            onDateChanged(newDate);
          },
        ),
      ],
    );
  }
}

/// Month tab widget
class _MonthTab extends StatelessWidget {
  final DateTime month;
  final bool isSelected;
  final VoidCallback onTap;

  const _MonthTab({
    required this.month,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final monthFormat = DateFormat('MMMM'); // Full month name
    final monthName = monthFormat.format(month);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFFFC107) : Colors.transparent,
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        child: Text(
          monthName,
          style: app_typography.bodyMedium.copyWith(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected ? const Color(0xFF1A1A1A) : textSecondary,
          ),
        ),
      ),
    );
  }
}

/// Year dropdown widget
class _YearDropdown extends StatelessWidget {
  final int selectedYear;
  final ValueChanged<int> onYearChanged;

  const _YearDropdown({
    required this.selectedYear,
    required this.onYearChanged,
  });

  @override
  Widget build(BuildContext context) {
    // Generate year list (current year ± 5 years)
    final currentYear = DateTime.now().year;
    final years = List.generate(
      11,
      (index) => currentYear - 5 + index,
    );

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3E0),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: DropdownButton<int>(
        value: selectedYear,
        underline: const SizedBox(),
        icon: const Icon(
          Icons.keyboard_arrow_down,
          color: Color(0xFFFFA726),
          size: 20,
        ),
        style: app_typography.bodyMedium.copyWith(
          fontWeight: FontWeight.w600,
          color: const Color(0xFFFFA726),
        ),
        items: years.map((year) {
          return DropdownMenuItem<int>(
            value: year,
            child: Text(year.toString()),
          );
        }).toList(),
        onChanged: (year) {
          if (year != null) {
            onYearChanged(year);
          }
        },
      ),
    );
  }
}
