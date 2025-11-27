import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/penalty_repository.dart';
import '../../widgets/async_error_view.dart';
import '../../widgets/empty_state.dart';
import '../controllers/penalty_controller.dart';
import '../widgets/penalty_card.dart';
import '../widgets/penalty_filter_tabs.dart';
import '../widgets/penalty_search_bar.dart';
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
/// - Penalty summary cards (Active/Total)
/// - Filter tabs for status
/// - Search bar with sort button
/// - Penalty cards list
/// Redesigned to match penalty.png mockup
class _PenaltiesView extends StatefulWidget {
  const _PenaltiesView();

  @override
  State<_PenaltiesView> createState() => _PenaltiesViewState();
}

class _PenaltiesViewState extends State<_PenaltiesView> {
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<PenaltyController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Penalties',
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: controller.isLoading && controller.items.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : controller.errorMessage != null && controller.items.isEmpty
              ? AsyncErrorView(
                  message: controller.errorMessage!,
                  onRetry: controller.refresh,
                )
              : RefreshIndicator(
                  onRefresh: controller.refresh,
                  child: ListView(
                    padding: const EdgeInsets.all(paddingLarge),
                    children: [
                      // Summary cards
                      if (controller.isLoadingSummary && controller.summary == null)
                        const Center(
                          child: Padding(
                            padding: EdgeInsets.all(paddingLarge),
                            child: CircularProgressIndicator(),
                          ),
                        )
                      else
                        PenaltySummaryCard(
                          totalPenalties: (controller.summary?.byStatus.active.count ?? 0) +
                              (controller.summary?.byStatus.waived.count ?? 0) +
                              (controller.summary?.byStatus.paid.count ?? 0),
                          totalAmount: controller.summary?.totalAmount ?? 0.0,
                          activePenalties: controller.summary?.activeCount ?? 0,
                        ),
                      const SizedBox(height: space6),

                      // Filter tabs
                      PenaltyFilterTabs(
                        selectedTab: controller.statusFilter.name,
                        onTabSelected: (value) {
                          final filter = PenaltyStatusFilter.values.firstWhere(
                            (f) => f.name == value,
                            orElse: () => PenaltyStatusFilter.all,
                          );
                          controller.changeFilter(filter);
                        },
                      ),
                      const SizedBox(height: space6),

                      // Search bar
                      PenaltySearchBar(
                        searchQuery: _searchQuery,
                        onSearchChanged: (query) {
                          setState(() {
                            _searchQuery = query;
                          });
                        },
                      ),
                      const SizedBox(height: space6),

                      // Loading indicator
                      if (controller.isLoading)
                        const LinearProgressIndicator(),
                      if (controller.isLoading)
                        const SizedBox(height: space6),

                      // Penalty list
                      if (_getFilteredPenalties(controller.items).isEmpty)
                        const EmptyState(
                          icon: Icons.celebration,
                          title: 'No Penalties',
                          message: 'You have no penalties. Keep up the good work!',
                        )
                      else
                        ..._getFilteredPenalties(controller.items).map((penalty) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: gapMedium),
                            child: PenaltyCard(
                              penalty: penalty,
                              onTap: () => _showPenaltyDetail(context, penalty),
                            ),
                          );
                        }),
                    ],
                  ),
                ),
    );
  }

  List<PenaltyItem> _getFilteredPenalties(List<PenaltyItem> items) {
    if (_searchQuery.isEmpty) {
      return items;
    }

    final query = _searchQuery.toLowerCase();
    return items.where((penalty) {
      final violationType = penalty.violationType.toLowerCase();
      final reason = penalty.reason.toLowerCase();
      final id = penalty.id.toLowerCase();

      return violationType.contains(query) ||
          reason.contains(query) ||
          id.contains(query);
    }).toList();
  }

  void _showPenaltyDetail(BuildContext context, PenaltyItem penalty) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => PenaltyDetailSheet(item: penalty),
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

