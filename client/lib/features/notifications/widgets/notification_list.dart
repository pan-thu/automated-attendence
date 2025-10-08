import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/services/notification_repository.dart';
import '../controllers/notification_controller.dart';
import '../presentation/notifications_screen.dart';

class NotificationList extends StatefulWidget {
  const NotificationList({
    required this.controller,
    required this.onMarkAsRead,
    required this.onLoadMore,
    super.key,
  });

  final NotificationController controller;
  final Future<void> Function(NotificationItem item) onMarkAsRead;
  final Future<void> Function() onLoadMore;

  @override
  State<NotificationList> createState() => _NotificationListState();
}

class _NotificationListState extends State<NotificationList> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (!_scrollController.hasClients) {
      return;
    }

    final threshold = _scrollController.position.maxScrollExtent * 0.7;
    if (_scrollController.position.pixels >= threshold) {
      widget.onLoadMore();
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;

    if (controller.isLoading && controller.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.items.isEmpty) {
      return const _EmptyState();
    }

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          if (index >= controller.items.length) {
            return const _LoadingIndicator();
          }

          final item = controller.items[index];
          return _NotificationTile(
            item: item,
            onTap: () => _openSheet(context, item),
            onMarkAsRead: () => widget.onMarkAsRead(item),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemCount: controller.canLoadMore ? controller.items.length + 1 : controller.items.length,
      ),
    );
  }

  Future<void> _openSheet(BuildContext context, NotificationItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => NotificationDetailSheet(item: item),
    );

    if (!item.isRead) {
      await widget.onMarkAsRead(item);
    }
  }
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({
    required this.item,
    required this.onTap,
    required this.onMarkAsRead,
  });

  final NotificationItem item;
  final VoidCallback onTap;
  final VoidCallback onMarkAsRead;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat.MMMd().add_jm();

    return Card(
      child: ListTile(
        onTap: onTap,
        leading: Icon(item.isRead ? Icons.mark_email_read : Icons.mark_email_unread),
        title: Text(item.title),
        subtitle: Text(item.message, maxLines: 2, overflow: TextOverflow.ellipsis),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(item.sentAt != null ? formatter.format(item.sentAt!) : 'Unknown'),
            if (!item.isRead)
              TextButton(
                onPressed: onMarkAsRead,
                child: const Text('Mark read'),
              ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Icon(Icons.notifications_off, size: 48),
            SizedBox(height: 12),
            Text('No notifications yet.', textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    return const Padding(
      padding: EdgeInsets.symmetric(vertical: 16),
      child: Center(child: CircularProgressIndicator()),
    );
  }
}

