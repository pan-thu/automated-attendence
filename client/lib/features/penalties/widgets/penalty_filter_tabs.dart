import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty filter tabs widget
///
/// Horizontal scrollable tabs for filtering penalties
/// Redesigned to match penalty.png mockup
class PenaltyFilterTabs extends StatelessWidget {
  final String selectedTab;
  final ValueChanged<String> onTabSelected;

  const PenaltyFilterTabs({
    super.key,
    required this.selectedTab,
    required this.onTabSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(space2),
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          _TabItem(
            label: 'All',
            isSelected: selectedTab == 'all',
            onTap: () => onTabSelected('all'),
          ),
          _TabItem(
            label: 'Active',
            isSelected: selectedTab == 'active',
            onTap: () => onTabSelected('active'),
          ),
          _TabItem(
            label: 'Waived',
            isSelected: selectedTab == 'waived',
            onTap: () => onTabSelected('waived'),
          ),
          _TabItem(
            label: 'Paid',
            isSelected: selectedTab == 'paid',
            onTap: () => onTabSelected('paid'),
          ),
        ],
      ),
    );
  }
}

/// Individual tab item widget
class _TabItem extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _TabItem({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(
            vertical: paddingSmall,
          ),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF4CAF50) : Colors.transparent,
            borderRadius: BorderRadius.circular(radiusLarge),
          ),
          child: Center(
            child: Text(
              label,
              style: app_typography.bodyMedium.copyWith(
                color: isSelected ? backgroundPrimary : textSecondary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
