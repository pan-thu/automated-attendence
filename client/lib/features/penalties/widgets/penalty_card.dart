import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../types/penalty.dart';

/// Penalty card widget for displaying penalty details
///
/// Shows violation type, date, amount, and status
/// Based on spec in docs/client-overhaul/07-penalties.md
class PenaltyCard extends StatelessWidget {
  final Penalty penalty;
  final VoidCallback? onTap;

  const PenaltyCard({
    super.key,
    required this.penalty,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM d, yyyy');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: backgroundSecondary,
          borderRadius: BorderRadius.circular(radiusMedium),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            // Header row with violation type and status
            Row(
              children: [
                // Violation icon
                Container(
                  padding: const EdgeInsets.all(paddingSmall),
                  decoration: BoxDecoration(
                    color: errorBackground.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(radiusSmall),
                  ),
                  child: Icon(
                    _getViolationIcon(penalty.violationType),
                    color: errorBackground,
                    size: iconSizeMedium,
                  ),
                ),
                const SizedBox(width: gapMedium),

                // Violation type
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _formatViolationType(penalty.violationType),
                        style: app_typography.labelLarge.copyWith(
                          fontWeight: FontWeight.w600,
                          color: textPrimary,
                        ),
                      ),
                      const SizedBox(height: space1),
                      Text(
                        dateFormat.format(penalty.dateIncurred),
                        style: app_typography.bodySmall.copyWith(
                          color: textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),

                // Status badge
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: paddingSmall,
                    vertical: space1,
                  ),
                  decoration: BoxDecoration(
                    color: _getStatusColor(penalty.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(radiusSmall),
                    border: Border.all(
                      color: _getStatusColor(penalty.status),
                      width: 1,
                    ),
                  ),
                  child: Text(
                    _formatStatus(penalty.status),
                    style: app_typography.labelSmall.copyWith(
                      color: _getStatusColor(penalty.status),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),

            // Reason (if available)
            if (penalty.reason != null && penalty.reason!.isNotEmpty) ...[
              const SizedBox(height: space4),
              Text(
                penalty.reason!,
                style: app_typography.bodySmall.copyWith(
                  color: textSecondary,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],

            const SizedBox(height: space4),

            // Amount and divider
            const Divider(height: 1),
            const SizedBox(height: space3),

            // Amount row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Penalty Amount',
                  style: app_typography.bodySmall.copyWith(
                    color: textSecondary,
                  ),
                ),
                Text(
                  'Rs ${penalty.amount.toStringAsFixed(2)}',
                  style: app_typography.labelLarge.copyWith(
                    fontWeight: FontWeight.bold,
                    color: errorBackground,
                  ),
                ),
              ],
            ),

            // Applied by (if available)
            if (penalty.appliedBy != null) ...[
              const SizedBox(height: space2),
              Row(
                children: [
                  Icon(
                    Icons.person_outline,
                    size: iconSizeSmall,
                    color: textSecondary,
                  ),
                  const SizedBox(width: gapSmall),
                  Text(
                    'Applied by ${penalty.appliedBy}',
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  IconData _getViolationIcon(String violationType) {
    switch (violationType.toLowerCase()) {
      case 'late_arrival':
        return Icons.schedule;
      case 'early_departure':
        return Icons.logout;
      case 'absence':
      case 'unauthorized_absence':
        return Icons.event_busy;
      case 'missing_check':
        return Icons.cancel;
      case 'policy_violation':
        return Icons.policy;
      default:
        return Icons.warning_amber;
    }
  }

  String _formatViolationType(String type) {
    return type
        .split('_')
        .map((word) => word[0].toUpperCase() + word.substring(1))
        .join(' ');
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'active':
        return errorBackground;
      case 'resolved':
        return successBackground;
      case 'waived':
        return infoBackground;
      case 'disputed':
        return warningBackground;
      default:
        return textSecondary;
    }
  }

  String _formatStatus(String status) {
    return status[0].toUpperCase() + status.substring(1).toLowerCase();
  }
}
