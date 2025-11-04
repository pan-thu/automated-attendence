import 'package:flutter/material.dart';

import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Icon badge widget for displaying notification counts
///
/// Features:
/// - Shows count on top-right of icon
/// - Supports different colors (default, error)
/// - Handles 0, 1-9, and 10+ counts
/// - Hides badge when count is 0
/// From spec in docs/client-overhaul/00-shared-components.md
class IconBadge extends StatelessWidget {
  final Widget child;
  final int count;
  final Color? badgeColor;
  final Color? textColor;
  final bool showZero;

  const IconBadge({
    super.key,
    required this.child,
    required this.count,
    this.badgeColor,
    this.textColor,
    this.showZero = false,
  });

  @override
  Widget build(BuildContext context) {
    final shouldShow = count > 0 || (count == 0 && showZero);

    return Stack(
      clipBehavior: Clip.none,
      children: [
        child,
        if (shouldShow)
          Positioned(
            top: -4,
            right: -4,
            child: Container(
              padding: EdgeInsets.symmetric(
                horizontal: count > 9 ? paddingSmall : space1,
                vertical: space1,
              ),
              decoration: BoxDecoration(
                color: badgeColor ?? errorBackground,
                borderRadius: BorderRadius.circular(radiusLarge),
                border: Border.all(
                  color: backgroundPrimary,
                  width: 1.5,
                ),
              ),
              constraints: const BoxConstraints(
                minWidth: 18,
                minHeight: 18,
              ),
              child: Text(
                count > 99 ? '99+' : count.toString(),
                style: app_typography.labelSmall.copyWith(
                  color: textColor ?? Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 10,
                ),
                textAlign: TextAlign.center,
              ),
            ),
          ),
      ],
    );
  }
}
