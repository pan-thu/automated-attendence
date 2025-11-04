import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// App logo widget for branding
///
/// Displays "AttenDesk" with clock icon
/// Based on spec in docs/client-overhaul/01-login.md
class AppLogo extends StatelessWidget {
  final double size;
  final bool showSubtitle;

  const AppLogo({
    super.key,
    this.size = 48.0,
    this.showSubtitle = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo icon (using clock icon for now)
        // TODO: Replace with actual logo asset when available
        Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: primaryGreen,
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          child: Icon(
            Icons.access_time,
            size: size * 0.6,
            color: Colors.white,
          ),
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
