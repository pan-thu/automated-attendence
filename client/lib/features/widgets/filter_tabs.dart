import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Filter tabs component for horizontal scrollable content filtering
///
/// Used for filtering notifications, penalties, leaves, etc.
/// Based on spec in docs/client-overhaul/00-shared-components.md
class FilterTabs extends StatelessWidget {
  final List<FilterTab> tabs;
  final String selectedTab;
  final ValueChanged<String> onTabSelected;
  final FilterTabStyle style;

  const FilterTabs({
    super.key,
    required this.tabs,
    required this.selectedTab,
    required this.onTabSelected,
    this.style = FilterTabStyle.chips,
  });

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: paddingMedium),
      child: Row(
        children: tabs.map((tab) {
          final isSelected = tab.id == selectedTab;
          return Padding(
            padding: const EdgeInsets.only(right: gapSmall),
            child: _buildTab(tab, isSelected),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildTab(FilterTab tab, bool isSelected) {
    switch (style) {
      case FilterTabStyle.chips:
        return _buildChipTab(tab, isSelected);
      case FilterTabStyle.tabs:
        return _buildUnderlineTab(tab, isSelected);
      case FilterTabStyle.buttons:
        return _buildButtonTab(tab, isSelected);
    }
  }

  Widget _buildChipTab(FilterTab tab, bool isSelected) {
    return GestureDetector(
      onTap: () => onTabSelected(tab.id),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected ? primaryGreen : backgroundSecondary,
          borderRadius: BorderRadius.circular(radiusLarge),
          border: Border.all(
            color: isSelected ? primaryGreen : borderColor,
            width: 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              tab.label,
              style: app_typography.labelMedium.copyWith(
                color: isSelected ? Colors.white : textPrimary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
            if (tab.count != null) ...[
              const SizedBox(width: gapXSmall),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: paddingXSmall,
                  vertical: space1,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? Colors.white.withValues(alpha: 0.2)
                      : primaryGreen.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(radiusSmall),
                ),
                child: Text(
                  tab.count.toString(),
                  style: app_typography.labelSmall.copyWith(
                    color: isSelected ? Colors.white : primaryGreen,
                    fontSize: 10,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUnderlineTab(FilterTab tab, bool isSelected) {
    return GestureDetector(
      onTap: () => onTabSelected(tab.id),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingMedium,
              vertical: paddingSmall,
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  tab.label,
                  style: app_typography.labelLarge.copyWith(
                    color: isSelected ? primaryGreen : textSecondary,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                  ),
                ),
                if (tab.count != null) ...[
                  const SizedBox(width: gapXSmall),
                  Text(
                    '(${tab.count})',
                    style: app_typography.labelSmall.copyWith(
                      color: isSelected ? primaryGreen : textTertiary,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Container(
            height: 2,
            width: 60,
            color: isSelected ? primaryGreen : Colors.transparent,
          ),
        ],
      ),
    );
  }

  Widget _buildButtonTab(FilterTab tab, bool isSelected) {
    return OutlinedButton(
      onPressed: () => onTabSelected(tab.id),
      style: OutlinedButton.styleFrom(
        backgroundColor: isSelected ? primaryGreen : Colors.transparent,
        foregroundColor: isSelected ? Colors.white : textPrimary,
        side: BorderSide(
          color: isSelected ? primaryGreen : borderColor,
        ),
        padding: const EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingSmall,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(tab.label),
          if (tab.count != null) ...[
            const SizedBox(width: gapXSmall),
            Text('(${tab.count})'),
          ],
        ],
      ),
    );
  }
}

/// Filter tab data model
class FilterTab {
  final String id;
  final String label;
  final int? count; // Optional badge count

  const FilterTab({
    required this.id,
    required this.label,
    this.count,
  });
}

/// Filter tab style variants
enum FilterTabStyle {
  chips, // Rounded chips (used in notifications, penalties)
  tabs, // Underline tabs (used in leave management)
  buttons, // Button-style tabs
}
