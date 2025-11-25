import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Notification card widget
///
/// Displays notification with icon, title, message, and time
/// Redesigned to match notification.png mockup
class NotificationCard extends StatelessWidget {
  final String id;
  final String title;
  final String message;
  final DateTime timestamp;
  final bool isRead;
  final NotificationType type;
  final String? category;
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
    this.category,
    this.onTap,
    this.onMarkAsRead,
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
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Notification icon
            _getIcon(),
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
                          style: app_typography.bodyMedium.copyWith(
                            fontWeight: FontWeight.w600,
                            color: textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      if (!isRead) ...[
                        const SizedBox(width: gapSmall),
                        Container(
                          width: 10,
                          height: 10,
                          decoration: const BoxDecoration(
                            color: Color(0xFF2196F3), // Blue dot
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                      const SizedBox(width: gapMedium),
                      // Timestamp
                      Text(
                        _formatTimestamp(timestamp),
                        style: app_typography.bodySmall.copyWith(
                          color: textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: space1),

                  // Message
                  Text(
                    message,
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _getIcon() {
    IconData iconData;

    // Determine icon based on category or type
    if (category != null) {
      switch (category!.toLowerCase()) {
        case 'attendance':
          iconData = Icons.access_time;
          break;
        case 'leave':
          iconData = Icons.calendar_today;
          break;
        case 'penalty':
          iconData = Icons.warning;
          break;
        case 'system':
          iconData = Icons.settings;
          break;
        default:
          iconData = _getTypeIcon();
      }
    } else {
      iconData = _getTypeIcon();
    }

    return Icon(
      iconData,
      size: 32,
      color: const Color(0xFF4CAF50),
    );
  }

  IconData _getTypeIcon() {
    switch (type) {
      case NotificationType.info:
        return Icons.info_outline;
      case NotificationType.success:
        return Icons.check_circle_outline;
      case NotificationType.warning:
        return Icons.warning;
      case NotificationType.error:
        return Icons.error_outline;
      case NotificationType.general:
        return Icons.notifications;
    }
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d';
    } else {
      return DateFormat('MMM d').format(timestamp);
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
