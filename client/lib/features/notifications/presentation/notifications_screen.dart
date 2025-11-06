import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/notification_repository.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/filter_tabs.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/notification_controller.dart';
import '../widgets/notification_card.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({required this.repository, super.key});

  final NotificationRepositoryBase repository;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<NotificationController>(
      create: (_) => NotificationController(repository: repository)..initialise(),
      child: const _NotificationsView(),
    );
  }
}

/// Notifications screen with filtering and grouping
///
/// Features:
/// - Filter tabs for read/unread
/// - Mark all as read action
/// - Notification cards with type indicators
/// - Empty state
/// Based on spec in docs/client-overhaul/06-notifications.md
class _NotificationsView extends StatelessWidget {
  const _NotificationsView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<NotificationController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Notifications',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        actions: [
          // Mark all as read button
          if (controller.items.any((item) => !item.isRead))
            TextButton.icon(
              icon: const Icon(Icons.done_all, size: iconSizeSmall),
              label: const Text('Mark all read'),
              onPressed: controller.isLoading
                  ? null
                  : () => _markAllAsRead(context, controller),
            ),
        ],
      ),
      body: controller.isLoading && controller.items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : controller.errorMessage != null && controller.items.isEmpty
              ? AsyncErrorView(
                  message: controller.errorMessage!,
                  onRetry: controller.refresh,
                  onHelp: () => _showHelp(context),
                )
              : RefreshIndicator(
                  onRefresh: controller.refresh,
                  child: CustomScrollView(
                    slivers: [
                      // Offline notice (if offline)
                      if (controller.isOffline)
                        SliverToBoxAdapter(
                          child: Padding(
                            padding: const EdgeInsets.all(paddingLarge),
                            child: OfflineNotice(
                              message: 'Showing cached notifications.',
                              lastUpdated: controller.lastUpdated,
                              onRetry: controller.refresh,
                            ),
                          ),
                        ),

                      // Filter tabs
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            paddingLarge,
                            paddingLarge,
                            paddingLarge,
                            space4,
                          ),
                          child: FilterTabs(
                            tabs: [
                              FilterTab(id: 'all', label: 'All'),
                              FilterTab(id: 'unread', label: 'Unread'),
                              FilterTab(id: 'read', label: 'Read'),
                            ],
                            selectedTab: controller.statusFilter.name,
                            onTabSelected: (value) {
                              final filter = NotificationStatusFilter.values.firstWhere(
                                (f) => f.name == value,
                                orElse: () => NotificationStatusFilter.all,
                              );
                              controller.changeFilter(filter);
                            },
                            style: FilterTabStyle.chips,
                          ),
                        ),
                      ),

                      // Loading indicator
                      if (controller.isLoading)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.symmetric(
                              horizontal: paddingLarge,
                            ),
                            child: LinearProgressIndicator(),
                          ),
                        ),

                      const SliverToBoxAdapter(
                        child: SizedBox(height: space4),
                      ),

                      // Notification list
                      controller.items.isEmpty
                          ? SliverFillRemaining(
                              child: EmptyState(
                                icon: Icons.notifications_none,
                                title: 'No Notifications',
                                message: 'You\'re all caught up!',
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.fromLTRB(
                                paddingLarge,
                                0,
                                paddingLarge,
                                paddingLarge,
                              ),
                              sliver: SliverList(
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) {
                                    final notification = controller.items[index];
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: gapMedium,
                                      ),
                                      child: NotificationCard(
                                        id: notification.id,
                                        title: notification.title,
                                        message: notification.message,
                                        timestamp: notification.sentAt ?? DateTime.now(),
                                        isRead: notification.isRead,
                                        type: _mapNotificationType(notification.type),
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
                                  },
                                  childCount: controller.items.length,
                                ),
                              ),
                            ),
                    ],
                  ),
                ),
    );
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

  void _showHelp(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => const _HelpSheet(),
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

    return Padding(
      padding: const EdgeInsets.all(24),
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
          const SizedBox(height: 8),
          Text(item.message, style: theme.textTheme.bodyMedium),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              if (item.category != null && item.category!.isNotEmpty) Chip(label: Text(item.category!)),
              if (item.type != null && item.type!.isNotEmpty) Chip(label: Text(item.type!)),
              Chip(
                label: Text(item.isRead ? 'Read' : 'Unread'),
                backgroundColor: item.isRead ? Colors.green.shade50 : Colors.orange.shade50,
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text('Sent: ${item.sentAt != null ? formatter.format(item.sentAt!) : 'Unknown'}'),
          if (item.readAt != null) Text('Read: ${formatter.format(item.readAt!)}'),
          const SizedBox(height: 16),
          if (item.metadata.isNotEmpty) _MetadataSection(metadata: item.metadata),
        ],
      ),
    );
  }
}

/// Help sheet widget
class _HelpSheet extends StatelessWidget {
  const _HelpSheet();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: paddingLarge,
        left: paddingLarge,
        right: paddingLarge,
        bottom: MediaQuery.of(context).viewInsets.bottom + paddingLarge,
      ),
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
              Icon(
                Icons.help_outline,
                color: primaryGreen,
                size: iconSizeLarge,
              ),
              const SizedBox(width: gapMedium),
              Text(
                'Help & Support',
                style: app_typography.headingMedium.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: space6),
          _HelpItem(
            text: 'Notifications sync when you are online. Pull to refresh for latest updates.',
          ),
          _HelpItem(
            text: 'Tap any notification to see details. It will be marked as read automatically.',
          ),
          _HelpItem(
            text: 'Use filters to view all, unread, or read notifications.',
          ),
          _HelpItem(
            text: 'Use "Mark all read" to clear all unread notifications at once.',
          ),
          const SizedBox(height: space6),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Got it'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Help item widget
class _HelpItem extends StatelessWidget {
  final String text;

  const _HelpItem({required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: space3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            margin: const EdgeInsets.only(top: space1),
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: primaryGreen,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: gapMedium),
          Expanded(
            child: Text(
              text,
              style: app_typography.bodyMedium.copyWith(
                color: textSecondary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Metadata section widget for displaying notification metadata
class _MetadataSection extends StatelessWidget {
  final Map<String, dynamic> metadata;

  const _MetadataSection({required this.metadata});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        const Divider(),
        const SizedBox(height: space4),
        Text(
          'Additional Information',
          style: app_typography.labelMedium.copyWith(
            fontWeight: FontWeight.w600,
            color: textSecondary,
          ),
        ),
        const SizedBox(height: space3),
        ...metadata.entries.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: space2),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 100,
                  child: Text(
                    entry.key,
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ),
                const SizedBox(width: gapMedium),
                Expanded(
                  child: Text(
                    '${entry.value}',
                    style: app_typography.bodyMedium.copyWith(
                      fontWeight: FontWeight.w500,
                      color: textPrimary,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

