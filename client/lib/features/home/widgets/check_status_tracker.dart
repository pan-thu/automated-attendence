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
/// - Entry icon for completed checks
/// Redesigned to match home.png mockup - cleaner, more rounded
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
      padding: const EdgeInsets.symmetric(
        horizontal: paddingLarge,
        vertical: paddingMedium,
      ),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
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
    final isCompleted = check != null;

    return Expanded(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Icon or dash
          if (isCompleted)
            Icon(
              Icons.login_rounded,
              size: iconSizeLarge,
              color: primaryGreen,
            )
          else
            Container(
              height: iconSizeLarge,
              alignment: Alignment.center,
              child: Text(
                '─',
                style: TextStyle(
                  fontSize: 24,
                  color: borderColor,
                  height: 1.0,
                ),
              ),
            ),
          const SizedBox(height: space2),

          // Time display
          Text(
            timeStr,
            style: app_typography.headingSmall.copyWith(
              fontWeight: FontWeight.bold,
              color: isCompleted ? textPrimary : textSecondary,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: space1),

          // Check label
          Text(
            'Check $slot',
            style: app_typography.labelSmall.copyWith(
              color: isCompleted ? textSecondary : textTertiary,
            ),
          ),
        ],
      ),
    );
  }
}
