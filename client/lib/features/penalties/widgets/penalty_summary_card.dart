import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty summary card showing statistics
///
/// Displays total penalties and total amount
/// Based on spec in docs/client-overhaul/07-penalties.md
class PenaltySummaryCard extends StatelessWidget {
  final int totalPenalties;
  final double totalAmount;
  final int activePenalties;

  const PenaltySummaryCard({
    super.key,
    required this.totalPenalties,
    required this.totalAmount,
    required this.activePenalties,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingLarge),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            errorBackground,
            errorBackground.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(radiusLarge),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              Icon(
                Icons.warning_amber_rounded,
                color: Colors.white,
                size: iconSizeLarge,
              ),
              const SizedBox(width: gapMedium),
              Text(
                'Penalty Summary',
                style: app_typography.headingSmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: space6),

          // Stats grid
          Row(
            children: [
              Expanded(
                child: _SummaryItem(
                  label: 'Total',
                  value: '$totalPenalties',
                  icon: Icons.list_alt,
                ),
              ),
              const SizedBox(width: gapMedium),
              Expanded(
                child: _SummaryItem(
                  label: 'Active',
                  value: '$activePenalties',
                  icon: Icons.error_outline,
                ),
              ),
            ],
          ),
          const SizedBox(height: space4),

          // Total amount
          Container(
            padding: const EdgeInsets.all(paddingMedium),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(radiusMedium),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Total Amount',
                  style: app_typography.labelMedium.copyWith(
                    color: Colors.white.withOpacity(0.9),
                  ),
                ),
                Text(
                  'Rs ${totalAmount.toStringAsFixed(2)}',
                  style: app_typography.headingMedium.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Summary item widget
class _SummaryItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _SummaryItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.15),
        borderRadius: BorderRadius.circular(radiusMedium),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: Colors.white.withOpacity(0.8),
            size: iconSizeMedium,
          ),
          const SizedBox(height: space2),
          Text(
            value,
            style: app_typography.headingLarge.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: space1),
          Text(
            label,
            style: app_typography.bodySmall.copyWith(
              color: Colors.white.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }
}
