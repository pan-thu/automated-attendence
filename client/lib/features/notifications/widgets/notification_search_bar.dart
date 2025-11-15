import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Search bar for notifications
///
/// Rounded search input with search icon
/// Redesigned to match notification.png mockup
class NotificationSearchBar extends StatelessWidget {
  final String? searchQuery;
  final ValueChanged<String> onSearchChanged;

  const NotificationSearchBar({
    super.key,
    this.searchQuery,
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
          const SizedBox(width: gapMedium),
          Expanded(
            child: TextField(
              onChanged: onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Search notifications...',
                hintStyle: app_typography.bodyMedium.copyWith(
                  color: textSecondary,
                ),
                border: InputBorder.none,
                isDense: true,
                contentPadding: EdgeInsets.zero,
              ),
              style: app_typography.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}
