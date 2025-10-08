import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/services/notification_repository.dart';
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

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: controller.isLoading ? null : controller.refresh,
          ),
        ],
      ),
      body: Column(
        children: [
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
      ),
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
          Text(item.title, style: theme.textTheme.titleLarge),
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
          if (item.readAt != null)
            Text('Read: ${formatter.format(item.readAt!)}'),
          const SizedBox(height: 16),
          if (item.metadata.isNotEmpty)
            _MetadataSection(metadata: item.metadata),
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

