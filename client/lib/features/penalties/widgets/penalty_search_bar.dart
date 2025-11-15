import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty search bar with sort button
///
/// Search input for filtering penalties by reason or ID
/// Redesigned to match penalty.png mockup
class PenaltySearchBar extends StatelessWidget {
  final String searchQuery;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback? onSortPressed;

  const PenaltySearchBar({
    super.key,
    required this.searchQuery,
    required this.onSearchChanged,
    this.onSortPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Search bar
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: paddingMedium,
              vertical: paddingSmall,
            ),
            decoration: BoxDecoration(
              color: const Color(0xFFE8E8E8),
              borderRadius: BorderRadius.circular(radiusLarge * 1.5),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.search,
                  color: textSecondary,
                  size: iconSizeMedium,
                ),
                const SizedBox(width: gapSmall),
                Expanded(
                  child: TextField(
                    onChanged: onSearchChanged,
                    decoration: InputDecoration(
                      hintText: 'Search reason or ID...',
                      hintStyle: app_typography.bodyMedium.copyWith(
                        color: textSecondary,
                      ),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.zero,
                      isDense: true,
                    ),
                    style: app_typography.bodyMedium.copyWith(
                      color: textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: gapMedium),

        // Sort button
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: const Color(0xFFE8E8E8),
            borderRadius: BorderRadius.circular(radiusLarge),
          ),
          child: IconButton(
            icon: Icon(
              Icons.unfold_more,
              color: textSecondary,
              size: iconSizeMedium,
            ),
            onPressed: onSortPressed,
          ),
        ),
      ],
    );
  }
}
