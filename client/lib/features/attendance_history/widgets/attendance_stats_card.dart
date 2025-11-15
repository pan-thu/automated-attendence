import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Attendance statistics summary card
///
/// Shows color-coded circular indicators with counts
/// Redesigned to match attendance.png mockup
class AttendanceStatsCard extends StatelessWidget {
  final int present;
  final int absent;
  final int late;
  final int leave;
  final int halfDay;
  final int totalDays;

  const AttendanceStatsCard({
    super.key,
    required this.present,
    required this.absent,
    required this.late,
    required this.leave,
    required this.halfDay,
    required this.totalDays,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingLarge),
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _StatIndicator(
            color: const Color(0xFF4CAF50), // Green
            count: present,
            total: totalDays,
            label: 'PRESENT',
          ),
          _StatIndicator(
            color: const Color(0xFFF44336), // Red
            count: absent,
            total: totalDays,
            label: 'ABSENT',
          ),
          _StatIndicator(
            color: const Color(0xFFFFA726), // Orange
            count: late,
            total: totalDays,
            label: 'LATE',
          ),
          _StatIndicator(
            color: const Color(0xFF42A5F5), // Blue
            count: leave,
            total: totalDays,
            label: 'LEAVE',
          ),
          _StatIndicator(
            color: const Color(0xFF9C27B0), // Purple
            count: halfDay,
            total: totalDays,
            label: 'HALF\nDAY',
          ),
        ],
      ),
    );
  }
}

/// Individual stat indicator with circular color badge
class _StatIndicator extends StatelessWidget {
  final Color color;
  final int count;
  final int total;
  final String label;

  const _StatIndicator({
    required this.color,
    required this.count,
    required this.total,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Colored circle
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(
              color: color,
              width: 3,
            ),
            color: Colors.transparent,
          ),
        ),
        const SizedBox(height: space2),

        // Count/Total
        Text(
          '${count.toString().padLeft(2, '0')}/$total',
          style: app_typography.bodyMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: textPrimary,
          ),
        ),
        const SizedBox(height: space1),

        // Label
        Text(
          label,
          textAlign: TextAlign.center,
          style: app_typography.labelSmall.copyWith(
            color: textSecondary,
            height: 1.2,
          ),
        ),
      ],
    );
  }
}
