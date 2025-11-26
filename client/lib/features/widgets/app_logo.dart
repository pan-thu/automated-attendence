import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// App logo widget for branding
///
/// Displays "AttenDesk" with the app logo
class AppLogo extends StatelessWidget {
  final double size;
  final bool showSubtitle;
  final bool iconOnly;

  const AppLogo({
    super.key,
    this.size = 48.0,
    this.showSubtitle = false,
    this.iconOnly = false,
  });

  @override
  Widget build(BuildContext context) {
    if (iconOnly) {
      return Image.asset(
        'assets/images/app-icon.png',
        width: size,
        height: size,
      );
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo icon
        Image.asset(
          'assets/images/app-icon.png',
          width: size,
          height: size,
        ),
        const SizedBox(height: gapSmall),

        // App name
        Text(
          'AttenDesk',
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
            fontSize: size * 0.5,
          ),
        ),

        // Subtitle (optional)
        if (showSubtitle) ...[
          const SizedBox(height: space1),
          Text(
            'Attendance Management',
            style: app_typography.bodySmall.copyWith(
              color: textSecondary,
            ),
          ),
        ],
      ],
    );
  }
}
