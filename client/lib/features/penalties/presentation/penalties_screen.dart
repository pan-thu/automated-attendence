import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/services/penalty_repository.dart';
import '../controllers/penalty_controller.dart';
import '../widgets/penalty_filters.dart';
import '../widgets/penalty_list.dart';

class PenaltiesScreen extends StatelessWidget {
  const PenaltiesScreen({required this.repository, super.key});

  final PenaltyRepositoryBase repository;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<PenaltyController>(
      create: (_) => PenaltyController(repository: repository)..initialise(),
      child: const _PenaltiesView(),
    );
  }
}

class _PenaltiesView extends StatelessWidget {
  const _PenaltiesView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<PenaltyController>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Penalties'),
        actions: [
          IconButton(
            icon: const Icon(Icons.picture_as_pdf),
            tooltip: 'View policy',
            onPressed: () => _openPolicy(context),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: controller.isLoading ? null : controller.refresh,
          ),
        ],
      ),
      body: Column(
        children: [
          PenaltyFilters(
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
            child: PenaltyList(
              controller: controller,
              onAcknowledge: controller.acknowledgePenalty,
              onLoadMore: controller.loadMore,
            ),
          ),
        ],
      ),
    );
  }

  void _openPolicy(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Penalty Policy'),
        content: const Text('Refer to the company handbook or contact HR for detailed penalty policies.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

class PenaltyDetailSheet extends StatelessWidget {
  const PenaltyDetailSheet({required this.item, super.key});

  final PenaltyItem item;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final formatter = DateFormat.yMMMd().add_jm();
    final amountString = NumberFormat.simpleCurrency().format(item.amount);

    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Penalty Details', style: theme.textTheme.titleLarge),
          const SizedBox(height: 12),
          Text('Status: ${item.status}'),
          Text('Violation: ${item.violationType}'),
          Text('Amount: $amountString'),
          Text('Reason: ${item.reason.isNotEmpty ? item.reason : 'Not provided'}'),
          Text('Date: ${item.dateIncurred != null ? formatter.format(item.dateIncurred!) : 'Unknown'}'),
          if (item.violationCount != null)
            Text('Violation Count: ${item.violationCount}'),
          const SizedBox(height: 16),
          if (item.metadata.isNotEmpty) const Text('Metadata:'),
          if (item.metadata.isNotEmpty)
            ...item.metadata.entries.map(
              (entry) => Text('${entry.key}: ${entry.value}'),
            ),
        ],
      ),
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

