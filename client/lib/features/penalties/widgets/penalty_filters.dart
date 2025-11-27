import 'package:flutter/material.dart';

import '../../../core/services/penalty_repository.dart';

class PenaltyFilters extends StatelessWidget {
  const PenaltyFilters({
    required this.filter,
    required this.isLoading,
    required this.onFilterChanged,
    super.key,
  });

  final PenaltyStatusFilter filter;
  final bool isLoading;
  final ValueChanged<PenaltyStatusFilter> onFilterChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: SegmentedButton<PenaltyStatusFilter>(
        segments: const <ButtonSegment<PenaltyStatusFilter>>[
          ButtonSegment(value: PenaltyStatusFilter.all, label: Text('All'), icon: Icon(Icons.list)),
          ButtonSegment(value: PenaltyStatusFilter.active, label: Text('Active'), icon: Icon(Icons.warning_amber_rounded)),
          ButtonSegment(value: PenaltyStatusFilter.waived, label: Text('Waived'), icon: Icon(Icons.redeem)),
          ButtonSegment(value: PenaltyStatusFilter.paid, label: Text('Paid'), icon: Icon(Icons.check_circle_outline)),
        ],
        selected: <PenaltyStatusFilter>{filter},
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

