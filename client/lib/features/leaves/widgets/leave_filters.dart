import 'package:flutter/material.dart';

import '../../../models/leave_models.dart';

class LeaveFilters extends StatelessWidget {
  const LeaveFilters({
    required this.status,
    required this.onFilterChanged,
    required this.isLoading,
    super.key,
  });

  final LeaveStatus? status;
  final ValueChanged<LeaveStatus?> onFilterChanged;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 56,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          _FilterChip(
            label: 'All',
            selected: status == null,
            onSelected: () => onFilterChanged(null),
            isLoading: isLoading,
          ),
          const SizedBox(width: 8),
          ...LeaveStatus.values.map(
            (value) => Padding(
              padding: const EdgeInsets.only(right: 8),
              child: _FilterChip(
                label: value.name.toUpperCase(),
                selected: status == value,
                onSelected: () => onFilterChanged(value),
                isLoading: isLoading,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
    required this.isLoading,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: isLoading ? null : (_) => onSelected(),
    );
  }
}


