import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../controllers/leave_list_controller.dart';

class LeaveList extends StatelessWidget {
  const LeaveList({required this.controller, super.key});

  final LeaveListController controller;

  @override
  Widget build(BuildContext context) {
    if (controller.isLoading && controller.items.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }

    if (controller.errorMessage != null && controller.items.isEmpty) {
      return _ErrorView(
        message: controller.errorMessage!,
        onRetry: controller.refresh,
      );
    }

    if (controller.items.isEmpty) {
      return const Center(child: Text('No leave requests found.'));
    }

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: NotificationListener<ScrollNotification>(
      onNotification: (notification) {
              if (notification.metrics.pixels >= notification.metrics.maxScrollExtent - 100) {
                controller.loadMore();
              }
              return false;
            },
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        itemCount: controller.items.length + (controller.canLoadMore ? 1 : 0),
        itemBuilder: (context, index) {
          if (index >= controller.items.length) {
            return const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Center(child: CircularProgressIndicator()),
            );
          }

          final item = controller.items[index];
          return Card(
            child: ListTile(
              title: Text(item.leaveType.toUpperCase()),
              subtitle: Text(
                '${item.status.name.toUpperCase()} • ${item.dateRangeLabel}\n${_formatSubmittedAt(item.submittedAt)}',
              ),
              isThreeLine: true,
              trailing: const Icon(Icons.chevron_right),
            ),
          );
        },
      ),
      ),
    );
  }

  String _formatSubmittedAt(DateTime? submittedAt) {
    if (submittedAt == null) {
      return 'Submitted: unknown';
    }
    return 'Submitted: ${DateFormat.yMMMd().add_Hm().format(submittedAt)}';
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            FilledButton(onPressed: onRetry, child: const Text('Retry')),
          ],
        ),
      ),
    );
  }
}


