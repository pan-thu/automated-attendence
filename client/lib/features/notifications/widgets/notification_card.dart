import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Notification card widget
///
/// Displays notification title, message, timestamp, and read status
/// Based on spec in docs/client-overhaul/06-notifications.md
class NotificationCard extends StatelessWidget {
  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  final bool isRead;
  final NotificationType type;
  final VoidCallback? onTap;
  final VoidCallback? onMarkAsRead;

  const NotificationCard({
    super.key,
    required this.id,
    required this.title,
    required this.message,
    required this.timestamp,
    required this.isRead,
    required this.type,
    this.onTap,
    this.onMarkAsRead,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: isRead
              ? backgroundSecondary
              : primaryGreen.withOpacity(0.05),
          borderRadius: BorderRadius.circular(radiusMedium),
          border: Border.all(
            color: isRead ? borderColor : primaryGreen.withOpacity(0.2),
            width: 1,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Notification icon
            Container(
              padding: const EdgeInsets.all(paddingSmall),
              decoration: BoxDecoration(
                color: _getTypeColor().withOpacity(0.1),
                borderRadius: BorderRadius.circular(radiusSmall),
              ),
              child: Icon(
                _getTypeIcon(),
                color: _getTypeColor(),
                size: iconSizeMedium,
              ),
            ),
            const SizedBox(width: gapMedium),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Title and unread indicator
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: app_typography.labelLarge.copyWith(
                            fontWeight: isRead
                                ? FontWeight.w500
                                : FontWeight.w700,
                            color: textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isRead) ...[
                        const SizedBox(width: gapSmall),
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: primaryGreen,
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: space2),

                  // Message
                  Text(
                    message,
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: space2),

                  // Timestamp
                  Text(
                    _formatTimestamp(timestamp),
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),

            // Mark as read button (for unread notifications)
            if (!isRead && onMarkAsRead != null) ...[
              const SizedBox(width: gapSmall),
              IconButton(
                icon: const Icon(Icons.done),
                iconSize: iconSizeSmall,
                color: primaryGreen,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: onMarkAsRead,
                tooltip: 'Mark as read',
              ),
            ],
          ],
        ),
      ),
    );
  }

  Color _getTypeColor() {
    switch (type) {
      case NotificationType.info:
        return infoBackground;
      case NotificationType.success:
        return successBackground;
      case NotificationType.warning:
        return warningBackground;
      case NotificationType.error:
        return errorBackground;
      case NotificationType.general:
        return primaryGreen;
    }
  }

  IconData _getTypeIcon() {
    switch (type) {
      case NotificationType.info:
        return Icons.info_outline;
      case NotificationType.success:
        return Icons.check_circle_outline;
      case NotificationType.warning:
        return Icons.warning_amber_outlined;
      case NotificationType.error:
        return Icons.error_outline;
      case NotificationType.general:
        return Icons.notifications_outlined;
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return DateFormat('MMM d, yyyy').format(timestamp);
    }
  }
}

/// Notification type enum
enum NotificationType {
  info,
  success,
  warning,
  error,
  general,
}
