import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/leave_repository.dart';

/// Leave balance header showing remaining, total, and used days
///
/// Displays:
/// - Large "X REMAINING" display
/// - Breakdown: "Y Total, Z Used"
/// Based on spec in docs/client-overhaul/04-leave-management.md
class LeaveBalanceHeader extends StatelessWidget {
  final LeaveBalance balance;

  const LeaveBalanceHeader({
    super.key,
    required this.balance,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(paddingLarge),
      padding: const EdgeInsets.all(paddingLarge),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            primaryGreen,
            primaryGreen.withOpacity(0.8),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(radiusLarge),
        boxShadow: [
          BoxShadow(
            color: primaryGreen.withOpacity(0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Row(
            children: [
              Icon(
                Icons.event_available,
                color: Colors.white,
                size: iconSizeLarge,
              ),
              const SizedBox(width: gapMedium),
              Text(
                'Leave Balance',
                style: app_typography.headingSmall.copyWith(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: paddingSmall,
                  vertical: paddingTiny,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(radiusSmall),
                ),
                child: Text(
                  '${balance.year}',
                  style: app_typography.labelSmall.copyWith(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: space6),

          // Remaining days (large)
          Center(
            child: Column(
              children: [
                Text(
                  '${balance.remaining}',
                  style: TextStyle(
                    fontSize: 64,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    height: 1.0,
                  ),
                ),
                const SizedBox(height: space2),
                Text(
                  'REMAINING',
                  style: app_typography.headingSmall.copyWith(
                    color: Colors.white.withOpacity(0.9),
                    fontWeight: FontWeight.w600,
                    letterSpacing: 2,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: space6),

          // Breakdown
          Container(
            padding: const EdgeInsets.all(paddingMedium),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(radiusMedium),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _BalanceItem(
                  label: 'Total',
                  value: '${balance.total}',
                  icon: Icons.calendar_month,
                ),
                Container(
                  height: 40,
                  width: 1,
                  color: Colors.white.withOpacity(0.3),
                ),
                _BalanceItem(
                  label: 'Used',
                  value: '${balance.used}',
                  icon: Icons.check_circle_outline,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Balance item widget for total/used display
class _BalanceItem extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;

  const _BalanceItem({
    required this.label,
    required this.value,
    required this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
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
          style: app_typography.headingMedium.copyWith(
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
    );
  }
}
