import 'package:flutter/material.dart';

import '../../../core/services/notification_repository.dart';

class NotificationFilters extends StatelessWidget {
  const NotificationFilters({
    required this.filter,
    required this.isLoading,
    required this.onFilterChanged,
    super.key,
  });

  final NotificationStatusFilter filter;
  final bool isLoading;
  final ValueChanged<NotificationStatusFilter> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SegmentedButton<NotificationStatusFilter>(
        segments: const <ButtonSegment<NotificationStatusFilter>>[
          ButtonSegment<NotificationStatusFilter>(
            value: NotificationStatusFilter.all,
            label: Text('All'),
            icon: Icon(Icons.inbox),
          ),
          ButtonSegment<NotificationStatusFilter>(
            value: NotificationStatusFilter.unread,
            label: Text('Unread'),
            icon: Icon(Icons.mark_email_unread),
          ),
          ButtonSegment<NotificationStatusFilter>(
            value: NotificationStatusFilter.read,
            label: Text('Read'),
            icon: Icon(Icons.mark_email_read),
          ),
        ],
        selected: <NotificationStatusFilter>{filter},
        onSelectionChanged: isLoading
            ? null
            : (selection) {
                final value = selection.first;
                onFilterChanged(value);
              },
      ),
    );
  }
}

