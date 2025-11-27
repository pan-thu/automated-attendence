import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty search bar
///
/// Search input for filtering penalties by reason or ID
/// Redesigned to match penalty.png mockup
class PenaltySearchBar extends StatelessWidget {
  final String searchQuery;
  final ValueChanged<String> onSearchChanged;

  const PenaltySearchBar({
    super.key,
    required this.searchQuery,
    required this.onSearchChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
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
    );
  }
}
