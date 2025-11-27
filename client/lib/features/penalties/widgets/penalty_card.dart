import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/services/penalty_repository.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty card widget for displaying penalty details
///
/// Shows date, reason, amount, and status
/// Redesigned to match penalty.png mockup
class PenaltyCard extends StatelessWidget {
  final PenaltyItem penalty;
  final VoidCallback? onTap;

  const PenaltyCard({
    super.key,
    required this.penalty,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('dd MMM');

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: const Color(0xFFE8E8E8),
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        child: Row(
          children: [
            // Left side: Date and Reason
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Date
                  Text(
                    penalty.dateIncurred != null
                        ? dateFormat.format(penalty.dateIncurred!)
                        : 'N/A',
                    style: app_typography.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: space1),

                  // Reason
                  Text(
                    _formatViolationType(penalty.violationType),
                    style: app_typography.bodyMedium.copyWith(
                      color: textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Right side: Amount and Status
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Amount
                Text(
                  '\$${penalty.amount.toStringAsFixed(0)}',
                  style: app_typography.headingMedium.copyWith(
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: space1),

                // Status
                Text(
                  _formatStatus(penalty.status),
                  style: app_typography.bodyMedium.copyWith(
                    color: textPrimary,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
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
      case 'waived':
        return infoBackground;
      case 'paid':
        return successBackground;
      default:
        return textSecondary;
    }
  }

  String _formatStatus(String status) {
    return status[0].toUpperCase() + status.substring(1).toLowerCase();
  }
}
