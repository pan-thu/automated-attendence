import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Leave balance summary card
///
/// Shows:
/// - Large remaining count
/// - Total and used counts below
/// Redesigned to match leave_balance.png mockup
class LeaveBalanceCard extends StatelessWidget {
  final int remaining;
  final int total;
  final int used;

  const LeaveBalanceCard({
    super.key,
    required this.remaining,
    required this.total,
    required this.used,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingLarge * 1.5),
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Column(
        children: [
          // Large remaining count
          Text(
            remaining.toString(),
            style: const TextStyle(
              fontSize: 80,
              fontWeight: FontWeight.bold,
              color: textPrimary,
              height: 1.0,
            ),
          ),
          const SizedBox(height: space2),

          // "REMAINING" label
          Text(
            'REMAINING',
            style: app_typography.labelMedium.copyWith(
              color: textSecondary,
              letterSpacing: 1.2,
            ),
          ),
          const SizedBox(height: space8),

          // Divider
          Container(
            height: 1,
            color: borderColor.withOpacity(0.3),
          ),
          const SizedBox(height: space8),

          // Total and Used row
          Row(
            children: [
              // Total
              Expanded(
                child: Column(
                  children: [
                    Text(
                      total.toString(),
                      style: app_typography.headingLarge.copyWith(
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: space1),
                    Text(
                      'TOTAL',
                      style: app_typography.labelMedium.copyWith(
                        color: textSecondary,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),

              // Vertical divider
              Container(
                width: 1,
                height: 48,
                color: borderColor.withOpacity(0.3),
              ),

              // Used
              Expanded(
                child: Column(
                  children: [
                    Text(
                      used.toString(),
                      style: app_typography.headingLarge.copyWith(
                        fontWeight: FontWeight.bold,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: space1),
                    Text(
                      'USED',
                      style: app_typography.labelMedium.copyWith(
                        color: textSecondary,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
