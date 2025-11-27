import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/leave_repository.dart';

/// Leave balance summary card
///
/// Shows breakdown by leave type using pie charts:
/// - Casual Leave (Full leave)
/// - Medical Leave (Sick leave)
/// - Maternity Leave (Vacation leave)
class LeaveBalanceCard extends StatelessWidget {
  final LeaveBalance balance;

  const LeaveBalanceCard({
    super.key,
    required this.balance,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingLarge * 1.5),
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      ),
      child: balance.breakdown != null
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (balance.breakdown!.casual != null)
                  Expanded(
                    child: _LeaveTypePieChart(
                      label: 'Casual',
                      remaining: balance.breakdown!.casual!.remaining,
                      used: balance.breakdown!.casual!.used,
                      total: balance.breakdown!.casual!.total,
                    ),
                  ),
                if (balance.breakdown!.sick != null) ...[
                  const SizedBox(width: gapMedium),
                  Expanded(
                    child: _LeaveTypePieChart(
                      label: 'Medical',
                      remaining: balance.breakdown!.sick!.remaining,
                      used: balance.breakdown!.sick!.used,
                      total: balance.breakdown!.sick!.total,
                    ),
                  ),
                ],
                if (balance.breakdown!.vacation != null) ...[
                  const SizedBox(width: gapMedium),
                  Expanded(
                    child: _LeaveTypePieChart(
                      label: 'Maternity',
                      remaining: balance.breakdown!.vacation!.remaining,
                      used: balance.breakdown!.vacation!.used,
                      total: balance.breakdown!.vacation!.total,
                    ),
                  ),
                ],
              ],
            )
          : _FallbackBalanceDisplay(balance: balance),
    );
  }
}

/// Individual leave type pie chart
class _LeaveTypePieChart extends StatelessWidget {
  final String label;
  final int remaining;
  final int used;
  final int total;

  const _LeaveTypePieChart({
    required this.label,
    required this.remaining,
    required this.used,
    required this.total,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Label
        Text(
          label,
          style: app_typography.bodyMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: textPrimary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: space4),

        // Pie chart
        SizedBox(
          width: 60,
          height: 60,
          child: total > 0
              ? CustomPaint(
                  painter: _PieChartPainter(
                    remaining: remaining,
                    used: used,
                    total: total,
                  ),
                )
              : Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE0E0E0),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: borderColor.withOpacity(0.3),
                      width: 2,
                    ),
                  ),
                  child: Center(
                    child: Text(
                      'N/A',
                      style: app_typography.bodySmall.copyWith(
                        color: textSecondary,
                      ),
                    ),
                  ),
                ),
        ),
        const SizedBox(height: space4),

        // Legend
        Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Color(0xFF4CAF50),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  '$remaining',
                  style: app_typography.bodySmall.copyWith(
                    fontWeight: FontWeight.w600,
                    color: textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: space1),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  width: 10,
                  height: 10,
                  decoration: const BoxDecoration(
                    color: Color(0xFFBDBDBD),
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 4),
                Text(
                  '$used',
                  style: app_typography.bodySmall.copyWith(
                    color: textSecondary,
                  ),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  }
}

/// Custom painter for pie chart
class _PieChartPainter extends CustomPainter {
  final int remaining;
  final int used;
  final int total;

  _PieChartPainter({
    required this.remaining,
    required this.used,
    required this.total,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = math.min(size.width, size.height) / 2;

    // Calculate angles
    final remainingAngle = total > 0 ? (remaining / total) * 2 * math.pi : 0.0;
    final usedAngle = total > 0 ? (used / total) * 2 * math.pi : 0.0;

    // Paint for remaining (green)
    final remainingPaint = Paint()
      ..color = const Color(0xFF4CAF50)
      ..style = PaintingStyle.fill;

    // Paint for used (gray)
    final usedPaint = Paint()
      ..color = const Color(0xFFBDBDBD)
      ..style = PaintingStyle.fill;

    // Draw remaining segment (starts at -90 degrees / top)
    if (remaining > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2, // Start at top
        remainingAngle,
        true,
        remainingPaint,
      );
    }

    // Draw used segment
    if (used > 0) {
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: radius),
        -math.pi / 2 + remainingAngle, // Start after remaining
        usedAngle,
        true,
        usedPaint,
      );
    }

    // Draw white circle in center for donut effect (optional)
    final innerRadius = radius * 0.5;
    final innerPaint = Paint()
      ..color = const Color(0xFFE8E8E8)
      ..style = PaintingStyle.fill;

    canvas.drawCircle(center, innerRadius, innerPaint);
  }

  @override
  bool shouldRepaint(_PieChartPainter oldDelegate) {
    return oldDelegate.remaining != remaining ||
        oldDelegate.used != used ||
        oldDelegate.total != total;
  }
}

/// Fallback display when breakdown is not available
class _FallbackBalanceDisplay extends StatelessWidget {
  final LeaveBalance balance;

  const _FallbackBalanceDisplay({required this.balance});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          balance.remaining.toString(),
          style: const TextStyle(
            fontSize: 80,
            fontWeight: FontWeight.bold,
            color: textPrimary,
            height: 1.0,
          ),
        ),
        const SizedBox(height: space2),
        Text(
          'REMAINING',
          style: app_typography.labelMedium.copyWith(
            color: textSecondary,
            letterSpacing: 1.2,
          ),
        ),
        const SizedBox(height: space8),
        Container(
          height: 1,
          color: borderColor.withOpacity(0.3),
        ),
        const SizedBox(height: space8),
        Row(
          children: [
            Expanded(
              child: Column(
                children: [
                  Text(
                    balance.total.toString(),
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
            Container(
              width: 1,
              height: 48,
              color: borderColor.withOpacity(0.3),
            ),
            Expanded(
              child: Column(
                children: [
                  Text(
                    balance.used.toString(),
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
    );
  }
}
