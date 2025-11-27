import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../controllers/day_detail_controller.dart';
import '../repository/attendance_history_repository.dart';

class DayDetailSheet extends StatelessWidget {
  const DayDetailSheet({required this.date, super.key});

  final DateTime date;

  @override
  Widget build(BuildContext context) {
    return Consumer<DayDetailController>(
      builder: (context, controller, _) {
        if (controller.isLoading || controller.detail == null) {
          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(context).viewInsets.bottom,
            ),
            child: const SizedBox(
              height: 320,
              child: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        if (controller.errorMessage != null) {
          return Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(controller.errorMessage!, textAlign: TextAlign.center),
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: () => controller.loadDetail(date),
                  child: const Text('Retry'),
                ),
              ],
            ),
          );
        }

        final detail = controller.detail!;
        final formattedDate = DateFormat.yMMMMEEEEd().format(detail.date);

        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.8,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          builder: (context, scrollController) {
            return Container(
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.surface,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.symmetric(
                  horizontal: 24,
                  vertical: 16,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              formattedDate,
                              style: Theme.of(context).textTheme.titleLarge,
                            ),
                            const SizedBox(height: 4),
                            Text(detail.status ?? 'Unknown'),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh),
                          onPressed: () => controller.loadDetail(date),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (detail.manualOverride != null)
                      _ManualOverrideCard(
                        manualOverride: detail.manualOverride!,
                      ),
                    const SizedBox(height: 12),
                    _ChecksCard(checks: detail.checks),
                    if (detail.violations.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _ViolationsCard(violations: detail.violations),
                    ],
                    if (detail.notes.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      _NotesCard(notes: detail.notes),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}

class _ManualOverrideCard extends StatelessWidget {
  const _ManualOverrideCard({required this.manualOverride});

  final ManualOverrideSummary manualOverride;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Manual Override',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text('By: ${manualOverride.by ?? 'Unknown'}'),
            if (manualOverride.reason != null) ...[
              const SizedBox(height: 4),
              Text('Reason: ${manualOverride.reason}'),
            ],
          ],
        ),
      ),
    );
  }
}

class _ChecksCard extends StatelessWidget {
  const _ChecksCard({required this.checks});

  final List<AttendanceCheckDetail> checks;

  @override
  Widget build(BuildContext context) {
    if (checks.isEmpty) {
      return Card(
        child: ListTile(
          leading: const Icon(Icons.timelapse),
          title: const Text('Checks'),
          subtitle: const Text('No check-ins recorded.'),
        ),
      );
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Checks', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ...checks.map(
              (check) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.fingerprint),
                title: Text(check.slot.toUpperCase()),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Status: ${check.status ?? 'Unknown'}'),
                    if (check.timestamp != null)
                      Text(
                        'Time: ${DateFormat.Hm().format(DateTime.parse(check.timestamp!))}',
                      ),
                    if (check.geofenceStatus != null)
                      Text('Geofence: ${check.geofenceStatus}'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ViolationsCard extends StatelessWidget {
  const _ViolationsCard({required this.violations});

  final List<String> violations;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Violations', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children:
                  violations
                      .map((violation) => Chip(label: Text(violation)))
                      .toList(),
            ),
          ],
        ),
      ),
    );
  }
}

class _NotesCard extends StatelessWidget {
  const _NotesCard({required this.notes});

  final List<String> notes;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Notes', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            ...notes.map(
              (note) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(note),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
