import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../models/leave_models.dart';
import '../controllers/leave_request_controller.dart';

class LeaveDetailSheet extends StatelessWidget {
  const LeaveDetailSheet({required this.item, super.key});

  final LeaveListItem item;

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat.yMMMMEEEEd();
    final period = item.startDate == null
        ? 'n/a'
        : '${formatter.format(item.startDate!)} → ${formatter.format(item.endDate ?? item.startDate!)}';

    return DraggableScrollableSheet(
      expand: false,
      initialChildSize: 0.8,
      minChildSize: 0.5,
      maxChildSize: 0.95,
      builder: (context, scrollController) {
        return Container(
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
          ),
          child: ListView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item.leaveType.toUpperCase(), style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      _StatusChip(status: item.status),
                    ],
                  ),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.help_outline),
                        onPressed: () => _HelpSheet.show(context),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              _DetailTile(label: 'Date range', value: period),
              _DetailTile(label: 'Reason', value: item.reason ?? 'Not provided'),
              if (item.reviewerNotes != null && item.reviewerNotes!.isNotEmpty)
                _DetailTile(label: 'Reviewer notes', value: item.reviewerNotes!),
              if (item.attachmentId != null)
                _DetailTile(label: 'Attachment', value: item.attachmentId!),
              _DetailTile(label: 'Submitted', value: _formatDateTime(item.submittedAt)),
              _DetailTile(label: 'Reviewed', value: _formatDateTime(item.reviewedAt)),
              if (item.status == LeaveStatus.pending) ...[
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.tonalIcon(
                    onPressed: () => _confirmCancellation(context),
                    icon: const Icon(Icons.cancel_outlined),
                    label: const Text('Cancel Request'),
                    style: FilledButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.errorContainer,
                      foregroundColor: Theme.of(context).colorScheme.onErrorContainer,
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  String _formatDateTime(DateTime? date) {
    if (date == null) {
      return 'Unknown';
    }
    return DateFormat.yMMMd().add_jm().format(date);
  }

  Future<void> _confirmCancellation(BuildContext context) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Leave Request'),
        content: const Text(
          'Are you sure you want to cancel this leave request? This action cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Keep Request'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      final controller = LeaveRequestController();
      await controller.cancelRequest(item.id);
      
      if (context.mounted) {
        if (controller.errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(controller.errorMessage!),
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          );
        } else {
          Navigator.of(context).pop();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Leave request cancelled successfully')),
          );
        }
      }
    }
  }
}

class _DetailTile extends StatelessWidget {
  const _DetailTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(value),
        ],
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
        style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
      ),
      visualDensity: VisualDensity.compact,
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
          Text('Need Help?', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          Text('• Pending requests can be cancelled from this screen.'),
          SizedBox(height: 8),
          Text('• Attachments may be required for medical or special leave types.'),
          SizedBox(height: 8),
          Text('• Contact HR if supporting documents are rejected.'),
        ],
      ),
    );
  }
}

