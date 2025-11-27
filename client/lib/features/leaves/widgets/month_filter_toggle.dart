import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Month filter toggle for leave list
///
/// Toggle between "This Month" and "Last Month"
/// Redesigned to match leave_balance.png mockup
class MonthFilterToggle extends StatelessWidget {
  final bool showThisMonth;
  final ValueChanged<bool> onChanged;

  const MonthFilterToggle({
    super.key,
    required this.showThisMonth,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _MonthOption(
          label: 'This Month',
          isSelected: showThisMonth,
          onTap: () => onChanged(true),
        ),
        const SizedBox(width: gapMedium),
        _MonthOption(
          label: 'Last Month',
          isSelected: !showThisMonth,
          onTap: () => onChanged(false),
        ),
      ],
    );
  }
}

/// Individual month option
class _MonthOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _MonthOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingLarge,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF4CAF50) : const Color(0xFFE8E8E8),
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        child: Text(
          label,
          style: app_typography.bodyMedium.copyWith(
            color: isSelected ? backgroundPrimary : textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
