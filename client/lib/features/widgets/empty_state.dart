import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Consistent empty state component
///
/// Used across all list screens when data is empty
/// Based on spec in docs/client-overhaul/00-shared-components.md
class EmptyState extends StatelessWidget {
  final String? iconPath;
  final IconData? icon;
  final String title;
  final String? message;
  final Widget? action;

  const EmptyState({
    super.key,
    this.iconPath,
    this.icon,
    required this.title,
    this.message,
    this.action,
  }) : assert(
          iconPath != null || icon != null,
          'Either iconPath or icon must be provided',
        );

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(paddingXLarge),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Icon
            if (icon != null)
              Icon(
                icon,
                size: iconSizeXLarge * 2,
                color: textTertiary,
              )
            else if (iconPath != null)
              Image.asset(
                iconPath!,
                width: iconSizeXLarge * 2,
                height: iconSizeXLarge * 2,
                color: textTertiary,
              ),

            const SizedBox(height: space6),

            // Title
            Text(
              title,
              style: app_typography.headingMedium.copyWith(
                color: textPrimary,
              ),
              textAlign: TextAlign.center,
            ),

            // Message
            if (message != null) ...[
              const SizedBox(height: space3),
              Text(
                message!,
                style: app_typography.bodyMedium.copyWith(
                  color: textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
            ],

            // Action button
            if (action != null) ...[
              const SizedBox(height: space6),
              action!,
            ],
          ],
        ),
      ),
    );
  }
}
