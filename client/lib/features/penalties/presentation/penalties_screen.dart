import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/penalty_repository.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/filter_tabs.dart';
import '../../widgets/offline_notice.dart';
import '../controllers/penalty_controller.dart';
import '../widgets/penalty_card.dart';
import '../widgets/penalty_summary_card.dart';

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

/// Penalties screen with filtering and summary
///
/// Features:
/// - Penalty summary card
/// - Filter tabs for status
/// - Penalty cards list
/// - Empty state
/// Based on spec in docs/client-overhaul/07-penalties.md
class _PenaltiesView extends StatelessWidget {
  const _PenaltiesView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<PenaltyController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Penalties',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.help_outline),
            tooltip: 'Help',
            onPressed: () => _showHelp(context),
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
                              message: 'Showing cached penalties.',
                              lastUpdated: controller.lastUpdated,
                              onRetry: controller.refresh,
                            ),
                          ),
                        ),

                      // Summary card
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(
                            paddingLarge,
                            paddingLarge,
                            paddingLarge,
                            space6,
                          ),
                          child: controller.isLoadingSummary && controller.summary == null
                              ? const Center(
                                  child: Padding(
                                    padding: EdgeInsets.all(paddingLarge),
                                    child: CircularProgressIndicator(),
                                  ),
                                )
                              : PenaltySummaryCard(
                                  totalPenalties: (controller.summary?.byStatus.active.count ?? 0) +
                                      (controller.summary?.byStatus.waived.count ?? 0) +
                                      (controller.summary?.byStatus.resolved.count ?? 0) +
                                      (controller.summary?.byStatus.disputed.count ?? 0),
                                  totalAmount: controller.summary?.totalAmount ?? 0.0,
                                  activePenalties: controller.summary?.activeCount ?? 0,
                                ),
                        ),
                      ),

                      // Filter tabs
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            horizontal: paddingLarge,
                          ),
                          child: FilterTabs(
                            tabs: [
                              FilterTab(id: 'all', label: 'All'),
                              FilterTab(id: 'active', label: 'Active'),
                              FilterTab(id: 'resolved', label: 'Resolved'),
                              FilterTab(id: 'waived', label: 'Waived'),
                            ],
                            selectedTab: controller.statusFilter.name,
                            onTabSelected: (value) {
                              final filter = PenaltyStatusFilter.values.firstWhere(
                                (f) => f.name == value,
                                orElse: () => PenaltyStatusFilter.all,
                              );
                              controller.changeFilter(filter);
                            },
                            style: FilterTabStyle.chips,
                          ),
                        ),
                      ),

                      const SliverToBoxAdapter(
                        child: SizedBox(height: space6),
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

                      // Penalty list
                      controller.items.isEmpty
                          ? SliverFillRemaining(
                              child: EmptyState(
                                icon: Icons.celebration,
                                title: 'No Penalties',
                                message: 'You have no penalties. Keep up the good work!',
                              ),
                            )
                          : SliverPadding(
                              padding: const EdgeInsets.fromLTRB(
                                paddingLarge,
                                space4,
                                paddingLarge,
                                paddingLarge,
                              ),
                              sliver: SliverList(
                                delegate: SliverChildBuilderDelegate(
                                  (context, index) {
                                    final penalty = controller.items[index];
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: gapMedium,
                                      ),
                                      child: PenaltyCard(
                                        penalty: penalty,
                                        onTap: () => _showPenaltyDetail(
                                          context,
                                          penalty,
                                        ),
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

  void _showPenaltyDetail(BuildContext context, PenaltyItem penalty) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PenaltyDetailSheet(item: penalty),
    );
  }


  void _showHelp(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => const _HelpSheet(),
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
                'Penalty Help',
                style: app_typography.headingMedium.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: space6),
          _HelpItem(
            text: 'Penalties listed here come from your attendance and violation history.',
          ),
          _HelpItem(
            text: 'Use the filters to view penalties by status (all, active, resolved, waived).',
          ),
          _HelpItem(
            text: 'Tap a penalty card to view full details.',
          ),
          _HelpItem(
            text: 'Contact HR if you believe a penalty is incorrect.',
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

/// Penalty detail sheet widget
class PenaltyDetailSheet extends StatelessWidget {
  final PenaltyItem item;

  const PenaltyDetailSheet({required this.item, super.key});

  @override
  Widget build(BuildContext context) {
    final formatter = DateFormat.yMMMd().add_jm();

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
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(paddingSmall),
                decoration: BoxDecoration(
                  color: errorBackground.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(radiusMedium),
                ),
                child: Icon(
                  Icons.warning_amber,
                  color: errorBackground,
                  size: iconSizeLarge,
                ),
              ),
              const SizedBox(width: gapMedium),
              Expanded(
                child: Text(
                  'Penalty Details',
                  style: app_typography.headingMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close),
                onPressed: () => Navigator.of(context).pop(),
              ),
            ],
          ),
          const SizedBox(height: space6),

          // Details
          _DetailRow(
            label: 'Violation Type',
            value: item.violationType
                .split('_')
                .map((w) => w[0].toUpperCase() + w.substring(1))
                .join(' '),
          ),
          _DetailRow(
            label: 'Status',
            value: item.status,
          ),
          _DetailRow(
            label: 'Amount',
            value: 'Rs ${item.amount.toStringAsFixed(2)}',
            valueColor: errorBackground,
          ),
          _DetailRow(
            label: 'Date Incurred',
            value: item.dateIncurred != null
                ? formatter.format(item.dateIncurred!)
                : 'Unknown',
          ),
          if (item.violationCount != null)
            _DetailRow(
              label: 'Violation Count',
              value: '${item.violationCount}',
            ),
          if (item.reason.isNotEmpty)
            _DetailRow(
              label: 'Reason',
              value: item.reason,
            ),

          // Metadata (if any)
          if (item.metadata.isNotEmpty) ...[
            const SizedBox(height: space4),
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
            ...item.metadata.entries.map(
              (entry) => _DetailRow(
                label: entry.key,
                value: '${entry.value}',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Detail row widget
class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;

  const _DetailRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: space4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: app_typography.bodySmall.copyWith(
                color: textSecondary,
              ),
            ),
          ),
          const SizedBox(width: gapMedium),
          Expanded(
            child: Text(
              value,
              style: app_typography.bodyMedium.copyWith(
                fontWeight: FontWeight.w500,
                color: valueColor ?? textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

