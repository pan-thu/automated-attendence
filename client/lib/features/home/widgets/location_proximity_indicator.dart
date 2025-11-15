import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Location proximity indicator for geofencing
///
/// Displays simple text showing distance to office and workplace address
/// Redesigned to match home.png mockup - minimal, plain text
class LocationProximityIndicator extends StatelessWidget {
  final bool isInRange;
  final double? distanceInMeters;
  final String? workplaceAddress;
  final bool isLoading;

  const LocationProximityIndicator({
    super.key,
    required this.isInRange,
    this.distanceInMeters,
    this.workplaceAddress,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildLoadingState();
    }

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Distance text
        Text(
          _getDistanceText(),
          style: app_typography.bodyMedium.copyWith(
            color: textSecondary,
          ),
          textAlign: TextAlign.center,
        ),

        // Workplace address (if provided)
        if (workplaceAddress != null && workplaceAddress!.isNotEmpty) ...[
          const SizedBox(height: space1),
          Text(
            workplaceAddress!,
            style: app_typography.bodyMedium.copyWith(
              color: textSecondary,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }

  Widget _buildLoadingState() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(strokeWidth: 2),
        ),
        const SizedBox(width: gapSmall),
        Text(
          'Checking location...',
          style: app_typography.bodyMedium.copyWith(
            color: textSecondary,
          ),
        ),
      ],
    );
  }

  String _getDistanceText() {
    if (distanceInMeters == null) {
      return 'Location not available';
    }

    final distance = distanceInMeters!;
    if (distance < 1000) {
      final meters = distance.toStringAsFixed(0);
      return 'You are $meters meter${meters == '1' ? '' : 's'} away from office';
    } else {
      final km = (distance / 1000).toStringAsFixed(1);
      return 'You are $km km away from office';
    }
  }
}
