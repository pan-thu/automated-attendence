import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Leave request card widget
///
/// Shows:
/// - Date range (or single date)
/// - Leave reason/type
/// - Status badge
/// Redesigned to match leave_balance.png mockup
class LeaveRequestCard extends StatelessWidget {
  final DateTime startDate;
  final DateTime? endDate;
  final String reason;
  final String status;
  final VoidCallback? onTap;

  const LeaveRequestCard({
    super.key,
    required this.startDate,
    this.endDate,
    required this.reason,
    required this.status,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
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
            // Date and reason
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Date range
                  Text(
                    _formatDateRange(),
                    style: app_typography.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: space1),

                  // Reason
                  Text(
                    reason,
                    style: app_typography.bodyMedium.copyWith(
                      color: textSecondary,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),

            // Status badge
            _StatusBadge(status: status),
            const SizedBox(width: gapSmall),

            // Chevron
            Icon(
              Icons.chevron_right,
              color: textSecondary,
              size: iconSizeMedium,
            ),
          ],
        ),
      ),
    );
  }

  String _formatDateRange() {
    final monthFormat = DateFormat('MMM');
    final dayFormat = DateFormat('d');

    if (endDate == null || _isSameDay(startDate, endDate!)) {
      // Single day: "Jun 01"
      return '${monthFormat.format(startDate)} ${dayFormat.format(startDate)}';
    } else if (_isSameMonth(startDate, endDate!)) {
      // Same month: "Jun 01 - 03"
      return '${monthFormat.format(startDate)} ${dayFormat.format(startDate)} – ${dayFormat.format(endDate!)}';
    } else {
      // Different months: "Aug 15" or "Sep 20 - 21"
      return '${monthFormat.format(startDate)} ${dayFormat.format(startDate)} – ${dayFormat.format(endDate!)}';
    }
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  bool _isSameMonth(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month;
  }
}

/// Status badge widget
class _StatusBadge extends StatelessWidget {
  final String status;

  const _StatusBadge({required this.status});

  Color _getBackgroundColor() {
    switch (status.toLowerCase()) {
      case 'approved':
        return const Color(0xFFE8E8E8);
      case 'pending':
        return const Color(0xFFE8E8E8);
      case 'rejected':
        return const Color(0xFFE8E8E8);
      default:
        return const Color(0xFFE8E8E8);
    }
  }

  Color _getTextColor() {
    switch (status.toLowerCase()) {
      case 'approved':
        return textPrimary;
      case 'pending':
        return textPrimary;
      case 'rejected':
        return textPrimary;
      default:
        return textSecondary;
    }
  }

  @override
  Widget build(BuildContext context) {
    final displayStatus = status[0].toUpperCase() + status.substring(1).toLowerCase();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        borderRadius: BorderRadius.circular(radiusLarge),
      ),
      child: Text(
        displayStatus,
        style: app_typography.bodySmall.copyWith(
          color: _getTextColor(),
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
