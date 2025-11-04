import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/leave_repository.dart';
import '../../widgets/date_range_picker.dart';

/// Submit leave screen for creating new leave requests
///
/// Features:
/// - Date range picker with calendar view
/// - Reason text input
/// - Leave type selection
/// - Submit button with loading state
/// Based on spec in docs/client-overhaul/05-submit-leave.md
class SubmitLeaveScreen extends StatefulWidget {
  final LeaveRepositoryBase repository;

  const SubmitLeaveScreen({required this.repository, super.key});

  @override
  State<SubmitLeaveScreen> createState() => _SubmitLeaveScreenState();
}

class _SubmitLeaveScreenState extends State<SubmitLeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  DateTimeRange? _selectedRange;
  String? _selectedType;
  bool _isLoading = false;

  final List<LeaveType> _leaveTypes = [
    LeaveType(id: 'sick', label: 'Sick Leave', icon: Icons.medical_services),
    LeaveType(id: 'casual', label: 'Casual Leave', icon: Icons.event),
    LeaveType(id: 'vacation', label: 'Vacation', icon: Icons.beach_access),
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_selectedRange == null) {
      _showError('Please select a date range');
      return;
    }

    if (_selectedType == null) {
      _showError('Please select a leave type');
      return;
    }

    setState(() => _isLoading = true);

    try {
      await widget.repository.submitLeaveRequest(
        leaveType: _selectedType!,
        startDate: _selectedRange!.start,
        endDate: _selectedRange!.end,
        reason: _reasonController.text,
      );

      if (mounted) {
        _showSuccess();
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        _showError(e.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: errorBackground,
      ),
    );
  }

  void _showSuccess() {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Leave request submitted successfully'),
        backgroundColor: successBackground,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Apply Leave',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(paddingLarge),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Leave type selection
              Text(
                'Leave Type',
                style: app_typography.labelLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              const SizedBox(height: space3),
              Wrap(
                spacing: gapMedium,
                runSpacing: gapMedium,
                children: _leaveTypes.map((type) {
                  final isSelected = _selectedType == type.id;
                  return _LeaveTypeChip(
                    type: type,
                    isSelected: isSelected,
                    onTap: () {
                      setState(() => _selectedType = type.id);
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: space6),

              // Date range picker
              Text(
                'Date Range',
                style: app_typography.labelLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              const SizedBox(height: space3),
              DateRangePicker(
                startDate: _selectedRange?.start,
                endDate: _selectedRange?.end,
                onDateRangeSelected: (range) {
                  setState(() => _selectedRange = range);
                },
                firstDay: DateTime.now(),
                lastDay: DateTime.now().add(const Duration(days: 365)),
              ),
              const SizedBox(height: space6),

              // Reason input
              Text(
                'Reason',
                style: app_typography.labelLarge.copyWith(
                  fontWeight: FontWeight.w600,
                  color: textPrimary,
                ),
              ),
              const SizedBox(height: space3),
              TextFormField(
                controller: _reasonController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText: 'Enter reason for leave',
                  hintStyle: app_typography.bodyMedium.copyWith(
                    color: textSecondary,
                  ),
                  filled: true,
                  fillColor: backgroundSecondary,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusMedium),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusMedium),
                    borderSide: BorderSide(color: borderColor),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusMedium),
                    borderSide: BorderSide(color: primaryGreen, width: 2),
                  ),
                  errorBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(radiusMedium),
                    borderSide: BorderSide(color: errorBackground),
                  ),
                  contentPadding: const EdgeInsets.all(paddingMedium),
                ),
                style: app_typography.bodyMedium.copyWith(
                  color: textPrimary,
                ),
                validator: (value) {
                  if (value == null || value.trim().isEmpty) {
                    return 'Reason is required';
                  }
                  if (value.trim().length < 10) {
                    return 'Reason must be at least 10 characters';
                  }
                  return null;
                },
              ),
              const SizedBox(height: space8),

              // Submit button
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: primaryGreen,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(radiusMedium),
                    ),
                    elevation: 0,
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor:
                                AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          'Submit Request',
                          style: app_typography.labelLarge.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Leave type chip widget
class _LeaveTypeChip extends StatelessWidget {
  final LeaveType type;
  final bool isSelected;
  final VoidCallback onTap;

  const _LeaveTypeChip({
    required this.type,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingMedium,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected
              ? primaryGreen
              : backgroundSecondary,
          borderRadius: BorderRadius.circular(radiusMedium),
          border: Border.all(
            color: isSelected ? primaryGreen : borderColor,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              type.icon,
              size: iconSizeMedium,
              color: isSelected ? Colors.white : textSecondary,
            ),
            const SizedBox(width: gapSmall),
            Text(
              type.label,
              style: app_typography.labelMedium.copyWith(
                color: isSelected ? Colors.white : textPrimary,
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Leave type model
class LeaveType {
  final String id;
  final String label;
  final IconData icon;

  const LeaveType({
    required this.id,
    required this.label,
    required this.icon,
  });
}
