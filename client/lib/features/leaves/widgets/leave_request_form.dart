import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../models/leave_models.dart';
import '../controllers/leave_request_controller.dart';

class LeaveRequestForm extends StatefulWidget {
  const LeaveRequestForm({super.key});

  @override
  State<LeaveRequestForm> createState() => _LeaveRequestFormState();
}

class _LeaveRequestFormState extends State<LeaveRequestForm> {
  final _formKey = GlobalKey<FormState>();
  DateTimeRange? _selectedRange;

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LeaveRequestController>();

    return Padding(
      padding: EdgeInsets.only(
        left: 24,
        right: 24,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'New Leave Request',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              decoration: const InputDecoration(labelText: 'Leave Type'),
              value: controller.selectedLeaveType,
              onChanged: controller.isSubmitting ? null : controller.selectLeaveType,
              items: const [
                DropdownMenuItem(value: 'full', child: Text('Full Day')),
                DropdownMenuItem(value: 'half', child: Text('Half Day')),
                DropdownMenuItem(value: 'medical', child: Text('Medical')),
              ],
              validator: (value) => value == null ? 'Select leave type' : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: TextEditingController(text: _formatRange()),
              readOnly: true,
              decoration: const InputDecoration(
                labelText: 'Date Range',
                suffixIcon: Icon(Icons.calendar_today),
              ),
              onTap: controller.isSubmitting ? null : _pickDateRange,
              validator: (_) => controller.startDate == null || controller.endDate == null
                  ? 'Select date range'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              initialValue: controller.reason,
              enabled: !controller.isSubmitting,
              maxLines: 4,
              decoration: const InputDecoration(
                labelText: 'Reason',
                alignLabelWithHint: true,
              ),
              onChanged: controller.updateReason,
              validator: (value) => value == null || value.trim().length < 5
                  ? 'Reason must be at least 5 characters'
                  : null,
            ),
            const SizedBox(height: 16),
            _AttachmentRow(controller: controller),
            const SizedBox(height: 16),
            if (controller.errorMessage != null)
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  controller.errorMessage!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: controller.isSubmitting ? null : _submit,
                child: controller.isSubmitting
                    ? const SizedBox(
                        height: 18,
                        width: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('Submit Request'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickDateRange() async {
    final controller = context.read<LeaveRequestController>();
    final now = DateTime.now();
    final result = await showDateRangePicker(
      context: context,
      firstDate: DateTime(now.year, now.month - 3, 1),
      lastDate: DateTime(now.year + 1, now.month, 0),
      initialDateRange: _selectedRange,
    );

    if (result != null) {
      setState(() {
        _selectedRange = result;
      });
      controller.updateDates(start: result.start, end: result.end);
    }
  }

  String _formatRange() {
    final controller = context.watch<LeaveRequestController>();
    final start = controller.startDate;
    final end = controller.endDate;
    if (start == null || end == null) {
      return '';
    }
    final formatter = MaterialLocalizations.of(context);
    return formatter.formatMediumDate(start) + ' – ' + formatter.formatMediumDate(end);
  }

  Future<void> _submit() async {
    final controller = context.read<LeaveRequestController>();
    if (!_formKey.currentState!.validate()) {
      return;
    }
    await controller.submit();
    if (controller.errorMessage == null && mounted) {
      Navigator.of(context).pop();
    }
  }
}

class _AttachmentRow extends StatelessWidget {
  const _AttachmentRow({required this.controller});

  final LeaveRequestController controller;

  @override
  Widget build(BuildContext context) {
    final metadata = controller.attachment;
    return Row(
      children: [
        Expanded(
          child: Text(
            metadata == null ? 'No attachment' : metadata.storagePath.split('/').last,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
        ),
        const SizedBox(width: 12),
        if (metadata != null)
          IconButton(
            icon: const Icon(Icons.delete),
            tooltip: 'Remove attachment',
            onPressed: controller.isSubmitting ? null : controller.removeAttachment,
          ),
        FilledButton.icon(
          onPressed: controller.isSubmitting ? null : controller.pickAttachment,
          icon: controller.isPickingAttachment
              ? const SizedBox(
                  height: 18,
                  width: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.attach_file),
          label: Text(metadata == null ? 'Add' : 'Replace'),
        ),
      ],
    );
  }
}


