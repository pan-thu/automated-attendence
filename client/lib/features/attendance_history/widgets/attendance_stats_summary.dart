import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Attendance statistics summary widget
///
/// Displays monthly statistics in a grid layout
/// Based on spec in docs/client-overhaul/03-attendance-history.md
class AttendanceStatsSummary extends StatelessWidget {
  final AttendanceStats stats;

  const AttendanceStatsSummary({
    super.key,
    required this.stats,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
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
          Text(
            'Monthly Summary',
            style: app_typography.labelLarge.copyWith(
              fontWeight: FontWeight.w600,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: space4),

          // Stats grid
          GridView.count(
            crossAxisCount: 3,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: gapSmall,
            crossAxisSpacing: gapSmall,
            childAspectRatio: 1.2,
            children: [
              _StatCard(
                icon: Icons.check_circle,
                label: 'Present',
                value: '${stats.present}',
                color: statusPresent,
              ),
              _StatCard(
                icon: Icons.cancel,
                label: 'Absent',
                value: '${stats.absent}',
                color: statusAbsent,
              ),
              _StatCard(
                icon: Icons.schedule,
                label: 'Late',
                value: '${stats.late}',
                color: statusLate,
              ),
              _StatCard(
                icon: Icons.timelapse,
                label: 'Half Day',
                value: '${stats.halfDay}',
                color: statusHalfDay,
              ),
              _StatCard(
                icon: Icons.beach_access,
                label: 'Leave',
                value: '${stats.leave}',
                color: statusLeave,
              ),
              _StatCard(
                icon: Icons.event,
                label: 'Holiday',
                value: '${stats.holiday}',
                color: statusHoliday,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Individual stat card widget
class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingSmall),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(radiusSmall),
        border: Border.all(color: color.withOpacity(0.3), width: 1),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            color: color,
            size: iconSizeMedium,
          ),
          const SizedBox(height: space2),
          Text(
            value,
            style: app_typography.headingSmall.copyWith(
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: space1),
          Text(
            label,
            style: app_typography.bodySmall.copyWith(
              color: textSecondary,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

/// Attendance statistics data class
class AttendanceStats {
  final int present;
  final int absent;
  final int late;
  final int halfDay;
  final int leave;
  final int holiday;

  const AttendanceStats({
    this.present = 0,
    this.absent = 0,
    this.late = 0,
    this.halfDay = 0,
    this.leave = 0,
    this.holiday = 0,
  });

  int get totalDays =>
      present + absent + late + halfDay + leave + holiday;

  double get attendancePercentage {
    if (totalDays == 0) return 0;
    return (present + late) / totalDays * 100;
  }
}
