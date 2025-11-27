import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Status badge component for displaying status indicators
///
/// Used for leave statuses, penalty statuses, attendance statuses, etc.
/// Based on spec in docs/client-overhaul/00-shared-components.md
class StatusBadge extends StatelessWidget {
  final String label;
  final StatusType type;
  final BadgeSize size;

  const StatusBadge({
    super.key,
    required this.label,
    required this.type,
    this.size = BadgeSize.medium,
  });

  Color _getBackgroundColor() {
    switch (type) {
      case StatusType.approved:
      case StatusType.waived:
      case StatusType.present:
        return leaveApproved.withValues(alpha: 0.1);
      case StatusType.pending:
      case StatusType.late:
        return leavePending.withValues(alpha: 0.1);
      case StatusType.rejected:
      case StatusType.absent:
      case StatusType.active:
        return leaveRejected.withValues(alpha: 0.1);
      case StatusType.cancelled:
      case StatusType.leave:
        return statusLeave.withValues(alpha: 0.1);
      case StatusType.paid:
        return penaltyPaid.withValues(alpha: 0.1);
      case StatusType.disputed:
      case StatusType.halfDay:
        return penaltyDisputed.withValues(alpha: 0.1);
    }
  }

  Color _getTextColor() {
    switch (type) {
      case StatusType.approved:
      case StatusType.waived:
      case StatusType.present:
        return leaveApproved;
      case StatusType.pending:
      case StatusType.late:
        return leavePending;
      case StatusType.rejected:
      case StatusType.absent:
      case StatusType.active:
        return leaveRejected;
      case StatusType.cancelled:
      case StatusType.leave:
        return statusLeave;
      case StatusType.paid:
        return penaltyPaid;
      case StatusType.disputed:
      case StatusType.halfDay:
        return penaltyDisputed;
    }
  }

  EdgeInsets _getPadding() {
    switch (size) {
      case BadgeSize.small:
        return const EdgeInsets.symmetric(
          horizontal: paddingXSmall,
          vertical: space1,
        );
      case BadgeSize.medium:
        return const EdgeInsets.symmetric(
          horizontal: paddingSmall,
          vertical: space1,
        );
      case BadgeSize.large:
        return const EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingXSmall,
        );
    }
  }

  TextStyle _getTextStyle() {
    final baseStyle = app_typography.labelSmall.copyWith(
      color: _getTextColor(),
      fontWeight: FontWeight.w600,
    );

    switch (size) {
      case BadgeSize.small:
        return baseStyle.copyWith(fontSize: 10);
      case BadgeSize.medium:
        return baseStyle.copyWith(fontSize: 12);
      case BadgeSize.large:
        return baseStyle.copyWith(fontSize: 14);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: _getPadding(),
      decoration: BoxDecoration(
        color: _getBackgroundColor(),
        borderRadius: BorderRadius.circular(radiusSmall),
      ),
      child: Text(
        label,
        style: _getTextStyle(),
      ),
    );
  }
}

/// Status type enum for different badge types
enum StatusType {
  // Leave statuses
  approved,
  pending,
  rejected,
  cancelled,

  // Penalty statuses
  active,
  waived,
  paid,
  disputed,

  // Attendance statuses
  present,
  absent,
  late,
  leave,
  halfDay,
}

/// Badge size variants
enum BadgeSize {
  small, // Compact for dense lists
  medium, // Default
  large, // Prominent display
}
