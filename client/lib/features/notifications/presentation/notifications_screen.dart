import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/services/notification_repository.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/notification_controller.dart';
import '../widgets/notification_filters.dart';
import '../widgets/notification_list.dart';

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

class _NotificationsView extends StatelessWidget {
  const _NotificationsView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<NotificationController>();

    final body = controller.isLoading && controller.items.isEmpty
        ? const Center(child: CircularProgressIndicator())
        : controller.errorMessage != null && controller.items.isEmpty
            ? AsyncErrorView(
                message: controller.errorMessage!,
                onRetry: controller.refresh,
                onHelp: () => _showHelp(context),
              )
            : Column(
                children: [
                  if (controller.isOffline)
                    OfflineNotice(
                      message: 'Showing cached notifications. Pull to refresh when online for the latest updates.',
                      lastUpdated: controller.lastUpdated,
                      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                      onRetry: controller.refresh,
                    ),
                  NotificationFilters(
                    filter: controller.statusFilter,
                    isLoading: controller.isLoading,
                    onFilterChanged: controller.changeFilter,
                  ),
                  if (controller.errorMessage != null)
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      child: _ErrorBanner(message: controller.errorMessage!),
                    ),
                  Expanded(
                    child: NotificationList(
                      controller: controller,
                      onMarkAsRead: controller.markAsRead,
                      onLoadMore: controller.loadMore,
                    ),
                  ),
                ],
              );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: controller.isLoading ? null : controller.refresh,
          ),
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => _showHelp(context),
          ),
        ],
      ),
      body: body,
    );
  }

  void _showHelp(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
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
                icon: const Icon(Icons.help_outline),
                onPressed: () => _HelpSheet.show(context),
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

class _HelpSheet extends StatelessWidget {
  const _HelpSheet();

  static void show(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (_) => const _HelpSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Help & Support', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          Text('• Notifications sync when you are online. Pull to refresh to fetch the latest updates.'),
          SizedBox(height: 8),
          Text('• Tap any notification to see details and mark it as read automatically.'),
          SizedBox(height: 8),
          Text('• For persistent issues, contact support or refer to the troubleshooting guide.'),
        ],
      ),
    );
  }
}

class _MetadataSection extends StatelessWidget {
  const _MetadataSection({required this.metadata});

  final Map<String, dynamic> metadata;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Metadata', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        ...metadata.entries.map(
          (entry) => Row(
            children: [
              Expanded(child: Text(entry.key)),
              Expanded(child: Text(entry.value?.toString() ?? '')), // ignore: avoid_unnecessary_containers
            ],
          ),
        ),
      ],
    );
  }
}

class _ErrorBanner extends StatelessWidget {
  const _ErrorBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      color: colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(Icons.error_outline, color: colorScheme.error),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: colorScheme.onErrorContainer),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

