import 'package:flutter/material.dart';

import '../repository/attendance_history_repository.dart';

class HistoryFiltersSheet extends StatefulWidget {
  const HistoryFiltersSheet({required this.initialFilters, super.key});

  final AttendanceFilters initialFilters;

  @override
  State<HistoryFiltersSheet> createState() => _HistoryFiltersSheetState();
}

class _HistoryFiltersSheetState extends State<HistoryFiltersSheet> {
  late String? _status;
  late List<String> _violations;
  DateTime? _customStart;
  DateTime? _customEnd;
  late DateRangePreset _preset;

  static const List<String> _availableStatuses = <String>[
    'present',
    'late',
    'absent',
  ];
  static const List<String> _availableViolations = <String>[
    'absent',
    'half_day',
    'late',
    'early_leave',
  ];

  @override
  void initState() {
    super.initState();
    _status = widget.initialFilters.status;
    _violations = List<String>.from(widget.initialFilters.violationTypes);
    _customStart = widget.initialFilters.startDate;
    _customEnd = widget.initialFilters.endDate;
    _preset = widget.initialFilters.rangePreset;
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('Filters'),
              trailing: TextButton(
                onPressed: () {
                  setState(() {
                    _status = null;
                    _violations.clear();
                    _customStart = null;
                    _customEnd = null;
                    _preset = DateRangePreset.none;
                  });
                },
                child: const Text('Clear'),
              ),
            ),
            const Divider(height: 1),
            _buildPresetSection(),
            const Divider(height: 1),
            _buildStatusSection(),
            const Divider(height: 1),
            _buildViolationsSection(),
            const Divider(height: 1),
            _buildDateRangeSection(context),
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () {
                    Navigator.of(context).pop(
                      AttendanceFilters(
                        status: _status,
                        violationTypes: _violations,
                        startDate: _customStart,
                        endDate: _customEnd,
                        rangePreset: _preset,
                      ),
                    );
                  },
                  child: const Text('Apply Filters'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetSection() {
    return ExpansionTile(
      title: const Text('Quick ranges'),
      initiallyExpanded: _preset != DateRangePreset.none,
      children: [
        Wrap(
          spacing: 8,
          children: [
            _PresetChip(
              label: 'None',
              selected: _preset == DateRangePreset.none,
              onSelected: () {
                setState(() {
                  _preset = DateRangePreset.none;
                  _customStart = null;
                  _customEnd = null;
                });
              },
            ),
            _PresetChip(
              label: 'This Month',
              selected: _preset == DateRangePreset.thisMonth,
              onSelected: () {
                setState(() {
                  _preset = DateRangePreset.thisMonth;
                  _customStart = null;
                  _customEnd = null;
                });
              },
            ),
            _PresetChip(
              label: 'Last Month',
              selected: _preset == DateRangePreset.lastMonth,
              onSelected: () {
                setState(() {
                  _preset = DateRangePreset.lastMonth;
                  _customStart = null;
                  _customEnd = null;
                });
              },
            ),
            _PresetChip(
              label: 'Last 30 Days',
              selected: _preset == DateRangePreset.last30Days,
              onSelected: () {
                setState(() {
                  _preset = DateRangePreset.last30Days;
                  _customStart = null;
                  _customEnd = null;
                });
              },
            ),
          ],
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildStatusSection() {
    return ExpansionTile(
      title: const Text('Status'),
      initiallyExpanded: true,
      children: [
        RadioListTile<String?>(
          value: null,
          groupValue: _status,
          title: const Text('Any status'),
          onChanged: (value) => setState(() => _status = value),
        ),
        ..._availableStatuses.map(
          (status) => RadioListTile<String?>(
            value: status,
            groupValue: _status,
            title: Text(status.toUpperCase()),
            onChanged: (value) => setState(() => _status = value),
          ),
        ),
      ],
    );
  }

  Widget _buildViolationsSection() {
    return ExpansionTile(
      title: const Text('Violation types'),
      children: [
        Wrap(
          spacing: 8,
          children:
              _availableViolations.map((violation) {
                final isSelected = _violations.contains(violation);
                return FilterChip(
                  label: Text(violation.replaceAll('_', ' ').toUpperCase()),
                  selected: isSelected,
                  onSelected: (selected) {
                    setState(() {
                      if (selected) {
                        _violations =
                            <String>{..._violations, violation}.toList();
                      } else {
                        _violations.remove(violation);
                      }
                    });
                  },
                );
              }).toList(),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  Widget _buildDateRangeSection(BuildContext context) {
    final hasCustomRange = _customStart != null || _customEnd != null;

    return ExpansionTile(
      title: const Text('Date range (optional)'),
      initiallyExpanded: hasCustomRange,
      children: [
        SwitchListTile(
          title: const Text('Use custom range'),
          value: hasCustomRange,
          onChanged: (enabled) {
            setState(() {
              if (!enabled) {
                _customStart = null;
                _customEnd = null;
                _preset = DateRangePreset.none;
              } else {
                final now = DateTime.now();
                _customStart ??= DateTime(now.year, now.month - 1, 1);
                _customEnd ??= DateTime(now.year, now.month, now.day);
                _preset = DateRangePreset.none;
              }
            });
          },
        ),
        if (hasCustomRange) ...[
          ListTile(
            title: const Text('From'),
            subtitle:
                Text(
                  _customStart == null
                      ? 'Any time'
                      : '${_customStart!.year}-${_customStart!.month.toString().padLeft(2, '0')}-${_customStart!.day.toString().padLeft(2, '0')}',
                ),
            trailing: IconButton(
              icon: const Icon(Icons.event),
              onPressed: () => _pickDate(context, isStart: true),
            ),
          ),
          ListTile(
            title: const Text('To'),
            subtitle:
                Text(
                  _customEnd == null
                      ? 'Any time'
                      : '${_customEnd!.year}-${_customEnd!.month.toString().padLeft(2, '0')}-${_customEnd!.day.toString().padLeft(2, '0')}',
                ),
            trailing: IconButton(
              icon: const Icon(Icons.event),
              onPressed: () => _pickDate(context, isStart: false),
            ),
          ),
          if (_customStart != null && _customEnd != null && _customStart!.isAfter(_customEnd!))
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Text(
                'Start date must be before end date.',
                style: TextStyle(color: Colors.red),
              ),
            ),
        ],
        const SizedBox(height: 8),
      ],
    );
  }

  Future<void> _pickDate(BuildContext context, {required bool isStart}) async {
    final initialDate = isStart
        ? _customStart ?? DateTime.now()
        : _customEnd ?? _customStart ?? DateTime.now();

    final firstDate = DateTime(DateTime.now().year - 5);
    final lastDate = DateTime(DateTime.now().year + 1, 12, 31);

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: firstDate,
      lastDate: lastDate,
    );

    if (picked == null) {
      return;
    }

    setState(() {
      final normalized = DateTime(picked.year, picked.month, picked.day);
      if (isStart) {
        _customStart = normalized;
      } else {
        _customEnd = normalized;
      }
      _preset = DateRangePreset.none;
    });
  }
}

class _PresetChip extends StatelessWidget {
  const _PresetChip({required this.label, required this.selected, required this.onSelected});

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return ChoiceChip(
      label: Text(label),
      selected: selected,
      onSelected: (_) => onSelected(),
    );
  }
}
