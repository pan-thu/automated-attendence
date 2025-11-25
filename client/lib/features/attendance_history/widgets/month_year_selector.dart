import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Month and year selector with tabs
///
/// Shows horizontal month tabs (May, June, July) and year dropdown
/// Redesigned to match attendance.png mockup
class MonthYearSelector extends StatefulWidget {
  final DateTime selectedDate;
  final ValueChanged<DateTime> onDateChanged;

  const MonthYearSelector({
    super.key,
    required this.selectedDate,
    required this.onDateChanged,
  });

  @override
  State<MonthYearSelector> createState() => _MonthYearSelectorState();
}

class _MonthYearSelectorState extends State<MonthYearSelector> {
  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final currentMonth = widget.selectedDate.month;
    final currentYear = widget.selectedDate.year;

    // Generate all 12 months for the selected year
    final months = List.generate(
      12,
      (index) => DateTime(currentYear, index + 1),
    );

    return Row(
      children: [
        // Horizontally scrollable month tabs
        Expanded(
          child: SizedBox(
            height: 44,
            child: ListView.builder(
              key: PageStorageKey<String>('month_selector_$currentYear'),
              scrollDirection: Axis.horizontal,
              physics: const ClampingScrollPhysics(),
              itemCount: months.length,
              itemBuilder: (context, index) {
                final month = months[index];
                final isSelected = month.month == currentMonth;
                return Padding(
                  padding: EdgeInsets.only(
                    right: index < months.length - 1 ? gapSmall : 0,
                  ),
                  child: _MonthTab(
                    month: month,
                    isSelected: isSelected,
                    onTap: () => widget.onDateChanged(month),
                  ),
                );
              },
            ),
          ),
        ),

        const SizedBox(width: gapMedium),

        // Year dropdown
        _YearDropdown(
          selectedYear: currentYear,
          onYearChanged: (year) {
            final newDate = DateTime(year, currentMonth);
            widget.onDateChanged(newDate);
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
        horizontal: paddingSmall,
        vertical: paddingXSmall,
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
          size: 18,
        ),
        isDense: true,
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
