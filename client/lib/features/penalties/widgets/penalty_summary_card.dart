import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Penalty summary cards showing statistics
///
/// Displays active count and total amount side by side
/// Redesigned to match penalty.png mockup
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
    return Row(
      children: [
        // Active penalties card
        Expanded(
          child: _SummaryCard(
            label: 'Active:',
            value: activePenalties.toString(),
          ),
        ),
        const SizedBox(width: gapMedium),

        // Total amount card
        Expanded(
          child: _SummaryCard(
            label: 'Total:',
            value: '\$${totalAmount.toStringAsFixed(0)}',
          ),
        ),
      ],
    );
  }
}

/// Individual summary card widget
class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;

  const _SummaryCard({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: app_typography.bodyMedium.copyWith(
              color: textSecondary,
            ),
          ),
          const SizedBox(height: space1),
          Text(
            value,
            style: app_typography.headingLarge.copyWith(
              fontWeight: FontWeight.bold,
              color: textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
