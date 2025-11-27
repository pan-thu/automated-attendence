import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Category filter chips for notifications
///
/// Shows horizontal scrollable chips: All, System, Attendance, Leave, Penalty
/// Redesigned to match notification.png mockup
class CategoryFilterChips extends StatelessWidget {
  final String selectedCategory;
  final ValueChanged<String> onCategoryChanged;

  const CategoryFilterChips({
    super.key,
    required this.selectedCategory,
    required this.onCategoryChanged,
  });

  @override
  Widget build(BuildContext context) {
    final categories = [
      'All',
      'System',
      'Attendance',
      'Leave',
      'Penalty',
    ];

    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: gapSmall),
        itemBuilder: (context, index) {
          final category = categories[index];
          final isSelected = selectedCategory == category;

          return _CategoryChip(
            label: category,
            isSelected: isSelected,
            onTap: () => onCategoryChanged(category),
          );
        },
      ),
    );
  }
}

/// Individual category chip
class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({
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
          horizontal: paddingMedium,
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
          ),
        ),
      ),
    );
  }
}
