import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../controllers/leave_request_controller.dart';

enum LeaveRequestStep { type, dates, reason, attachment, review }

class LeaveRequestForm extends StatefulWidget {
  const LeaveRequestForm({super.key});

  @override
  State<LeaveRequestForm> createState() => _LeaveRequestFormState();
}

class _LeaveRequestFormState extends State<LeaveRequestForm> {
  final _formKey = GlobalKey<FormState>();
  DateTimeRange? _selectedRange;
  LeaveRequestStep _currentStep = LeaveRequestStep.type;

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
            Stepper(
              physics: const ClampingScrollPhysics(),
              currentStep: _currentStep.index,
              onStepContinue: controller.isSubmitting ? null : () => _nextStep(context),
              onStepCancel: controller.isSubmitting || _currentStep == LeaveRequestStep.type
                  ? null
                  : _previousStep,
              controlsBuilder: (context, details) {
                return Row(
                  children: [
                  ElevatedButton(
                    onPressed: details.onStepContinue,
                    child: controller.isSubmitting
                        ? const SizedBox(
                            height: 18,
                            width: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : Text(_currentStep == LeaveRequestStep.review ? 'Submit' : 'Next'),
                  ),
                  if (_currentStep != LeaveRequestStep.type)
                      Padding(
                        padding: const EdgeInsets.only(left: 12),
                        child: TextButton(
                          onPressed: details.onStepCancel,
                          child: const Text('Back'),
                        ),
                      ),
                  ],
                );
              },
              steps: [
                Step(
                  title: const Text('Leave type'),
                  isActive: _currentStep.index >= LeaveRequestStep.type.index,
                  state: _stepState(LeaveRequestStep.type, controller.selectedLeaveType != null),
                  content: DropdownButtonFormField<String>(
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
                ),
                Step(
                  title: const Text('Dates'),
                  isActive: _currentStep.index >= LeaveRequestStep.dates.index,
                  state: _stepState(
                    LeaveRequestStep.dates,
                    controller.startDate != null && controller.endDate != null,
                  ),
                  content: TextFormField(
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
                ),
                Step(
                  title: const Text('Reason'),
                  isActive: _currentStep.index >= LeaveRequestStep.reason.index,
                  state: _stepState(LeaveRequestStep.reason, controller.reason.trim().length >= 5),
                  content: TextFormField(
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
                ),
                Step(
                  title: const Text('Attachment'),
                  isActive: _currentStep.index >= LeaveRequestStep.attachment.index,
                  state: _stepState(
                    LeaveRequestStep.attachment,
                    controller.attachment != null || controller.selectedLeaveType != 'medical',
                  ),
                  content: _AttachmentRow(controller: controller),
                ),
                Step(
                  title: const Text('Review & submit'),
                  isActive: _currentStep.index >= LeaveRequestStep.review.index,
                  state: _stepState(
                    LeaveRequestStep.review,
                    controller.lastSubmission != null,
                  ),
                  content: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _ReviewRow(label: 'Type', value: controller.selectedLeaveType ?? '-'),
                      _ReviewRow(label: 'Dates', value: _formatRange()),
                      _ReviewRow(label: 'Reason', value: controller.reason.isEmpty ? '-' : controller.reason),
                      _ReviewRow(
                        label: 'Attachment',
                        value: controller.attachment?.storagePath.split('/').last ?? 'None',
                      ),
                      if (controller.errorMessage != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Text(
                            controller.errorMessage!,
                            style: TextStyle(color: Theme.of(context).colorScheme.error),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
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
    final totalDays = _calculateTotalDays(start, end);
    return '${formatter.formatMediumDate(start)} – ${formatter.formatMediumDate(end)} ($totalDays days)';
  }

  int _calculateTotalDays(DateTime start, DateTime end) {
    return ((end.difference(start).inMilliseconds / (24 * 60 * 60 * 1000)).ceil() + 1);
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

  StepState _stepState(LeaveRequestStep step, bool isComplete) {
    if (_currentStep.index > step.index || isComplete) {
      return StepState.complete;
    }
    if (_currentStep == step) {
      return StepState.editing;
    }
    return StepState.indexed;
  }

  bool _validateCurrentStep(BuildContext context) {
    final controller = context.read<LeaveRequestController>();

    switch (_currentStep) {
      case LeaveRequestStep.type:
        if (controller.selectedLeaveType == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Select a leave type to continue.')),
          );
          return false;
        }
        return true;
      case LeaveRequestStep.dates:
        if (controller.startDate == null || controller.endDate == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Select a date range to continue.')),
          );
          return false;
        }
        return true;
      case LeaveRequestStep.reason:
        if (controller.reason.trim().length < 5) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Reason must be at least 5 characters.')),
          );
          return false;
        }
        return true;
      case LeaveRequestStep.attachment:
        final type = controller.selectedLeaveType;
        final requires = type == 'medical';
        if (requires && controller.attachment == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Medical leave requires an attachment.')),
          );
          return false;
        }
        return true;
      case LeaveRequestStep.review:
        return true;
    }
  }

  void _previousStep() {
    if (_currentStep == LeaveRequestStep.type) {
      return;
    }
    setState(() {
      _currentStep = LeaveRequestStep.values[_currentStep.index - 1];
    });
  }

  Future<void> _nextStep(BuildContext context) async {
    if (_currentStep == LeaveRequestStep.review) {
      await _submit();
      return;
    }

    if (!_validateCurrentStep(context)) {
      return;
    }

    setState(() {
      _currentStep = LeaveRequestStep.values[_currentStep.index + 1];
    });
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

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ),
        ],
      ),
    );
  }
}


