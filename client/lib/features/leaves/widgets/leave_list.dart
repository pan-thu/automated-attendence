import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/leave_models.dart';
import '../controllers/leave_list_controller.dart';
import 'leave_request_detail.dart';

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
                title: Row(
                  children: [
                    Expanded(child: Text(item.leaveType.toUpperCase())),
                    _StatusChip(status: item.status),
                  ],
                ),
                subtitle: Text(
                  '${item.dateRangeLabel}\n${_formatSubmittedAt(item.submittedAt)}${item.reviewerNotes != null && item.reviewerNotes!.isNotEmpty ? '\nNote: ${item.reviewerNotes}' : ''}',
                ),
                isThreeLine: true,
                trailing: const Icon(Icons.chevron_right),
                onTap: () => _openDetail(context, item),
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

  Future<void> _openDetail(BuildContext context, LeaveListItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => LeaveDetailSheet(item: item),
    );
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

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final LeaveStatus status;

  @override
  Widget build(BuildContext context) {
    final (color, icon) = switch (status) {
      LeaveStatus.pending => (Colors.orange, Icons.schedule),
      LeaveStatus.approved => (Colors.green, Icons.check_circle),
      LeaveStatus.rejected => (Colors.red, Icons.cancel),
      LeaveStatus.cancelled => (Colors.grey, Icons.block),
    };

    return Chip(
      avatar: Icon(icon, size: 16, color: color),
      label: Text(
        status.name.toUpperCase(),
        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
      ),
      visualDensity: VisualDensity.compact,
      padding: EdgeInsets.zero,
    );
  }
}


