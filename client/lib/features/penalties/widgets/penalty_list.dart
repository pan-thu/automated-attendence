import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../core/services/penalty_repository.dart';
import '../controllers/penalty_controller.dart';
import '../presentation/penalties_screen.dart';
import '../../widgets/offline_notice.dart';

class PenaltyList extends StatefulWidget {
  const PenaltyList({
    required this.controller,
    required this.onAcknowledge,
    required this.onLoadMore,
    super.key,
  });

  final PenaltyController controller;
  final Future<void> Function(PenaltyItem item, {String? note}) onAcknowledge;
  final Future<void> Function() onLoadMore;

  @override
  State<PenaltyList> createState() => _PenaltyListState();
}

class _PenaltyListState extends State<PenaltyList> {
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

    return RefreshIndicator(
      onRefresh: controller.refresh,
      child: ListView.separated(
        controller: _scrollController,
        padding: const EdgeInsets.all(16),
        itemBuilder: (context, index) {
          if (controller.isOffline && index == 0) {
            return OfflineNotice(
              message: 'Penalties are from the last sync. Pull to refresh once reconnected.',
              lastUpdated: controller.lastUpdated,
              margin: EdgeInsets.zero,
              onRetry: controller.refresh,
            );
          }

          final adjustedIndex = controller.isOffline ? index - 1 : index;

          if (controller.items.isEmpty && !controller.canLoadMore) {
            return const _EmptyState();
          }

          if (adjustedIndex >= controller.items.length) {
            return const _LoadingIndicator();
          }

          final item = controller.items[adjustedIndex];
          return _PenaltyTile(
            item: item,
            onTap: () => _openDetail(context, item),
            onAcknowledge: () => _acknowledge(context, item),
          );
        },
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemCount: _itemCount(controller),
      ),
    );
  }

  int _itemCount(PenaltyController controller) {
    final offlineOffset = controller.isOffline ? 1 : 0;
    if (controller.items.isEmpty && !controller.canLoadMore) {
      return offlineOffset + 1;
    }
    return controller.items.length + offlineOffset + (controller.canLoadMore ? 1 : 0);
  }

  Future<void> _openDetail(BuildContext context, PenaltyItem item) async {
    await showModalBottomSheet<void>(
      context: context,
      builder: (context) => PenaltyDetailSheet(item: item),
    );
  }

  Future<void> _acknowledge(BuildContext context, PenaltyItem item) async {
    if (item.acknowledged) {
      return;
    }

    String? note;

    await showDialog<void>(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Acknowledge Penalty'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Confirm you have reviewed this penalty. Add an optional note if needed.'),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                decoration: const InputDecoration(labelText: 'Optional note'),
                maxLines: 3,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () {
                note = controller.text;
                Navigator.of(context).pop();
              },
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (!context.mounted) {
      return;
    }

    await widget.onAcknowledge(item, note: note);
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Penalty acknowledged.')),
      );
    }
  }
}

class _PenaltyTile extends StatelessWidget {
  const _PenaltyTile({
    required this.item,
    required this.onTap,
    required this.onAcknowledge,
  });

  final PenaltyItem item;
  final VoidCallback onTap;
  final VoidCallback onAcknowledge;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.simpleCurrency();
    final dateFormatter = DateFormat.MMMd().add_jm();

    return Card(
      child: ListTile(
        onTap: onTap,
        leading: Icon(
          item.acknowledged ? Icons.check_circle_outline : Icons.warning_amber_rounded,
          color: item.acknowledged ? Colors.green : Colors.orange,
        ),
        title: Text('${item.violationType} • ${formatter.format(item.amount)}'),
        subtitle: Text(
          '${item.reason.isNotEmpty ? item.reason : 'No reason provided'}\n${item.dateIncurred != null ? dateFormatter.format(item.dateIncurred!) : 'Unknown date'}',
        ),
        isThreeLine: true,
        trailing: item.acknowledged
            ? const Icon(Icons.check, color: Colors.green)
            : TextButton(
                onPressed: onAcknowledge,
                child: const Text('Acknowledge'),
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
            Icon(Icons.verified_user, size: 48),
            SizedBox(height: 12),
            Text('No penalties recorded.', textAlign: TextAlign.center),
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

