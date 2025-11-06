import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Location proximity indicator for geofencing
///
/// Shows if user is within range of company location for clock-in
/// Displays distance and visual feedback
/// Based on spec in docs/client-overhaul/02-home-dashboard.md
class LocationProximityIndicator extends StatelessWidget {
  final bool isInRange;
  final double? distanceInMeters;
  final bool isLoading;

  const LocationProximityIndicator({
    super.key,
    required this.isInRange,
    this.distanceInMeters,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildLoadingState();
    }

    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: isInRange
            ? successBackground.withValues(alpha: 0.1)
            : warningBackground.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(
          color: isInRange ? successBackground : warningBackground,
          width: 1,
        ),
      ),
      child: Row(
        children: [
          // Location icon
          Container(
            padding: const EdgeInsets.all(paddingSmall),
            decoration: BoxDecoration(
              color: isInRange ? successBackground : warningBackground,
              borderRadius: BorderRadius.circular(radiusSmall),
            ),
            child: Icon(
              isInRange ? Icons.location_on : Icons.location_off,
              color: Colors.white,
              size: iconSizeMedium,
            ),
          ),
          const SizedBox(width: gapMedium),

          // Status and distance info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Status text
                Text(
                  isInRange ? 'In Range' : 'Out of Range',
                  style: app_typography.labelMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: isInRange ? successBackground : warningBackground,
                  ),
                ),

                // Distance (if available)
                if (distanceInMeters != null) ...[
                  const SizedBox(height: space1),
                  Text(
                    _formatDistance(distanceInMeters!),
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ],
              ],
            ),
          ),

          // Visual indicator
          Icon(
            isInRange ? Icons.check_circle : Icons.info_outline,
            color: isInRange ? successBackground : warningBackground,
            size: iconSizeMedium,
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState() {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        children: [
          // Location icon
          Container(
            padding: const EdgeInsets.all(paddingSmall),
            decoration: BoxDecoration(
              color: borderColor,
              borderRadius: BorderRadius.circular(radiusSmall),
            ),
            child: const Icon(
              Icons.location_searching,
              color: Colors.white,
              size: iconSizeMedium,
            ),
          ),
          const SizedBox(width: gapMedium),

          // Loading text
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  'Checking location...',
                  style: app_typography.labelMedium.copyWith(
                    fontWeight: FontWeight.w600,
                    color: textSecondary,
                  ),
                ),
                const SizedBox(height: space1),
                Text(
                  'Please wait',
                  style: app_typography.bodySmall.copyWith(
                    color: textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Loading spinner
          const SizedBox(
            width: iconSizeMedium,
            height: iconSizeMedium,
            child: CircularProgressIndicator(
              strokeWidth: 2,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDistance(double meters) {
    if (meters < 1000) {
      return '${meters.toStringAsFixed(0)} meters away';
    } else {
      final km = meters / 1000;
      return '${km.toStringAsFixed(1)} km away';
    }
  }
}
