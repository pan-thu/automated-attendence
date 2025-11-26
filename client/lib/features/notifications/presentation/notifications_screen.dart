import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/notification_repository.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/notification_controller.dart';
import '../widgets/category_filter_chips.dart';
import '../widgets/notification_card.dart';
import '../widgets/notification_search_bar.dart';
import '../widgets/read_status_toggle.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({required this.repository, super.key});

  final NotificationRepositoryBase repository;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Refresh notifications when screen is opened
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final controller = context.read<NotificationController>();
      if (!controller.hasInitialised) {
        controller.initialise();
      } else {
        // Refresh to get latest notifications
        controller.refresh();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Use global NotificationController from provider
    return const _NotificationsView();
  }
}

/// Notifications screen with filtering and grouping
///
/// Features:
/// - All/Unread toggle
/// - Category filter chips
/// - Search bar
/// - Date-grouped notifications (TODAY, YESTERDAY, EARLIER)
/// - "Mark all read" action
/// Redesigned to match notification.png mockup
class _NotificationsView extends StatefulWidget {
  const _NotificationsView();

  @override
  State<_NotificationsView> createState() => _NotificationsViewState();
}

class _NotificationsViewState extends State<_NotificationsView> {
  String _selectedCategory = 'All';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<NotificationController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Updates',
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        centerTitle: true,
        backgroundColor: backgroundPrimary,
        elevation: 0,
        actions: [
          // Mark all as read button
          if (controller.items.any((item) => !item.isRead))
            TextButton(
              onPressed: controller.isLoading
                  ? null
                  : () => _markAllAsRead(context, controller),
              child: Text(
                'Mark all read',
                style: app_typography.bodyMedium,
              ),
            ),
        ],
      ),
      body: controller.isLoading && controller.items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : controller.errorMessage != null && controller.items.isEmpty
              ? AsyncErrorView(
                  message: controller.errorMessage!,
                  onRetry: controller.refresh,
                )
              : RefreshIndicator(
                  onRefresh: controller.refresh,
                  child: ListView(
                    padding: const EdgeInsets.all(paddingLarge),
                    children: [
                      // All/Unread toggle
                      Center(
                        child: ReadStatusToggle(
                          showUnreadOnly: controller.statusFilter == NotificationStatusFilter.unread,
                          onChanged: (showUnread) {
                            final filter = showUnread
                                ? NotificationStatusFilter.unread
                                : NotificationStatusFilter.all;
                            controller.changeFilter(filter);
                          },
                        ),
                      ),
                      const SizedBox(height: space6),

                      // Category filter chips
                      CategoryFilterChips(
                        selectedCategory: _selectedCategory,
                        onCategoryChanged: (category) {
                          setState(() {
                            _selectedCategory = category;
                          });
                        },
                      ),
                      const SizedBox(height: space6),

                      // Search bar
                      NotificationSearchBar(
                        searchQuery: _searchQuery,
                        onSearchChanged: (query) {
                          setState(() {
                            _searchQuery = query;
                          });
                        },
                      ),
                      const SizedBox(height: space6),

                      // Notification list with date grouping
                      controller.items.isEmpty
                          ? const EmptyState(
                              icon: Icons.notifications_none,
                              title: 'No Notifications',
                              message: 'You\'re all caught up!',
                            )
                          : _NotificationList(
                              items: _filterNotifications(controller.items),
                              controller: controller,
                            ),
                    ],
                  ),
                ),
    );
  }

  List<NotificationItem> _filterNotifications(List<NotificationItem> items) {
    var filtered = items;

    // Filter by category
    if (_selectedCategory != 'All') {
      filtered = filtered.where((item) {
        return item.category?.toLowerCase() == _selectedCategory.toLowerCase();
      }).toList();
    }

    // Filter by search query
    if (_searchQuery.isNotEmpty) {
      final query = _searchQuery.toLowerCase();
      filtered = filtered.where((item) {
        return item.title.toLowerCase().contains(query) ||
            item.message.toLowerCase().contains(query);
      }).toList();
    }

    return filtered;
  }

  void _markAllAsRead(
    BuildContext context,
    NotificationController controller,
  ) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Mark all as read'),
        content: const Text(
          'Are you sure you want to mark all notifications as read?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.of(context).pop();
              try {
                await controller.markAllAsRead();
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('All notifications marked as read'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              } catch (error) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Failed to mark all as read: $error'),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Mark all'),
          ),
        ],
      ),
    );
  }
}

/// Notification list with date grouping
class _NotificationList extends StatelessWidget {
  final List<NotificationItem> items;
  final NotificationController controller;

  const _NotificationList({
    required this.items,
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    final grouped = _groupByDate(items);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final group in grouped.entries) ...[
          // Date section header
          Text(
            group.key,
            style: app_typography.labelMedium.copyWith(
              color: textSecondary,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: space4),

          // Notifications in this section
          ...group.value.map((notification) {
            return Padding(
              padding: const EdgeInsets.only(bottom: gapMedium),
              child: NotificationCard(
                id: notification.id,
                title: notification.title,
                message: notification.message,
                timestamp: notification.sentAt ?? DateTime.now(),
                isRead: notification.isRead,
                type: _mapNotificationType(notification.type),
                category: notification.category,
                onTap: () => _showNotificationDetail(
                  context,
                  notification,
                  controller,
                ),
                onMarkAsRead: !notification.isRead
                    ? () => controller.markAsRead(notification)
                    : null,
              ),
            );
          }),

          const SizedBox(height: space6),
        ],
      ],
    );
  }

  Map<String, List<NotificationItem>> _groupByDate(List<NotificationItem> items) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));

    final Map<String, List<NotificationItem>> grouped = {
      'TODAY': [],
      'YESTERDAY': [],
      'EARLIER': [],
    };

    for (final item in items) {
      final timestamp = item.sentAt ?? DateTime.now();
      final date = DateTime(timestamp.year, timestamp.month, timestamp.day);

      if (date == today) {
        grouped['TODAY']!.add(item);
      } else if (date == yesterday) {
        grouped['YESTERDAY']!.add(item);
      } else {
        grouped['EARLIER']!.add(item);
      }
    }

    // Remove empty sections
    grouped.removeWhere((key, value) => value.isEmpty);

    return grouped;
  }

  NotificationType _mapNotificationType(String? type) {
    switch (type?.toLowerCase()) {
      case 'info':
        return NotificationType.info;
      case 'success':
        return NotificationType.success;
      case 'warning':
        return NotificationType.warning;
      case 'error':
        return NotificationType.error;
      default:
        return NotificationType.general;
    }
  }

  void _showNotificationDetail(
    BuildContext context,
    NotificationItem notification,
    NotificationController controller,
  ) {
    // Mark as read when opening detail
    if (!notification.isRead) {
      controller.markAsRead(notification);
    }

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => NotificationDetailSheet(item: notification),
    );
  }
}

class NotificationDetailSheet extends StatelessWidget {
  const NotificationDetailSheet({required this.item, super.key});

  final NotificationItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat.yMMMd().add_jm();

    return Container(
      padding: const EdgeInsets.all(paddingXLarge),
      decoration: const BoxDecoration(
        color: backgroundPrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXLarge)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(item.title, style: theme.textTheme.titleLarge)),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: space4),
          Text(item.message, style: theme.textTheme.bodyMedium),
          const SizedBox(height: space6),
          Wrap(
            spacing: gapSmall,
            runSpacing: gapSmall,
            children: [
              if (item.category != null && item.category!.isNotEmpty)
                Chip(label: Text(item.category!)),
              if (item.type != null && item.type!.isNotEmpty)
                Chip(label: Text(item.type!)),
              Chip(
                label: Text(item.isRead ? 'Read' : 'Unread'),
                backgroundColor: item.isRead ? Colors.green.shade50 : Colors.orange.shade50,
              ),
            ],
          ),
          const SizedBox(height: space6),
          Text('Sent: ${item.sentAt != null ? formatter.format(item.sentAt!) : 'Unknown'}'),
          if (item.readAt != null) Text('Read: ${formatter.format(item.readAt!)}'),
          const SizedBox(height: space6),
        ],
      ),
    );
  }
}
