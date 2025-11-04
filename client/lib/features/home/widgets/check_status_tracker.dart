import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Model for individual check summary
class CheckSummary {
  final int slot; // 1, 2, 3
  final String? status; // 'on_time', 'late', 'missed'
  final DateTime? timestamp;

  const CheckSummary({
    required this.slot,
    this.status,
    this.timestamp,
  });
}

/// Check status tracker showing Check 1, 2, 3 horizontal list
///
/// Displays:
/// - Check 1, Check 2, Check 3 labels
/// - Times for completed checks (e.g., "09:30")
/// - Placeholder "--:--" for pending checks
/// - Current check highlighted
/// - Warning icon for late checks
/// Based on spec in docs/client-overhaul/02-home-dashboard.md
class CheckStatusTracker extends StatelessWidget {
  final List<CheckSummary> checks;
  final int maxChecks;

  const CheckStatusTracker({
    super.key,
    required this.checks,
    this.maxChecks = 3,
  });

  int? get _currentCheckSlot {
    if (checks.isEmpty) return 1;
    if (checks.length < maxChecks) return checks.length + 1;
    return null; // All checks complete
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingLarge),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: List.generate(maxChecks, (index) {
          final slot = index + 1;
          final check = checks.cast<CheckSummary?>().firstWhere(
                (c) => c?.slot == slot,
                orElse: () => null,
              );

          return _CheckItem(
            slot: slot,
            check: check,
            isCurrent: _currentCheckSlot == slot,
          );
        }),
      ),
    );
  }
}

/// Individual check item widget
class _CheckItem extends StatelessWidget {
  final int slot;
  final CheckSummary? check;
  final bool isCurrent;

  const _CheckItem({
    required this.slot,
    this.check,
    this.isCurrent = false,
  });

  @override
  Widget build(BuildContext context) {
    final timeFormat = DateFormat('HH:mm');
    final timeStr = check?.timestamp != null ? timeFormat.format(check!.timestamp!) : '--:--';
    final isLate = check?.status == 'late';
    final isCompleted = check != null;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // Check label
        Text(
          'Check $slot',
          style: app_typography.labelMedium.copyWith(
            fontWeight: isCurrent ? FontWeight.w600 : FontWeight.normal,
            color: isCurrent
                ? primaryGreen
                : isCompleted
                    ? textPrimary
                    : textSecondary,
          ),
        ),
        const SizedBox(height: space2),

        // Time display with optional warning icon
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              timeStr,
              style: app_typography.headingSmall.copyWith(
                fontWeight: FontWeight.bold,
                color: isLate
                    ? warningBackground
                    : isCompleted
                        ? textPrimary
                        : textSecondary,
                fontFeatures: [const FontFeature.tabularFigures()], // Monospaced digits
              ),
            ),
            if (isLate) ...[
              const SizedBox(width: space1),
              Icon(
                Icons.warning_rounded,
                size: iconSizeSmall,
                color: warningBackground,
              ),
            ],
          ],
        ),
      ],
    );
  }
}
