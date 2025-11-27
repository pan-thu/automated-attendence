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
  final bool circularBackground;

  const AppLogo({
    super.key,
    this.size = 48.0,
    this.showSubtitle = false,
    this.iconOnly = false,
    this.circularBackground = false,
  });

  Widget _buildLogo() {
    final logoImage = Image.asset(
      'assets/images/app-icon.png',
      width: size * 0.6,
      height: size * 0.6,
    );

    if (circularBackground) {
      return Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(size * 0.2),
        ),
        child: Center(child: logoImage),
      );
    }

    return Image.asset(
      'assets/images/app-icon.png',
      width: size,
      height: size,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (iconOnly) {
      return _buildLogo();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Logo icon
        _buildLogo(),
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
