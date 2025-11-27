import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/company_settings_repository.dart';
import '../../../core/services/leave_repository.dart';
import '../../../models/leave_models.dart';
import '../../settings/models/company_settings.dart';

/// Submit leave screen for creating new leave requests
///
/// Features:
/// - Side-by-side date pickers with calendar view
/// - Reason text input
/// - Attachment upload for required leave types
/// - Submit button with loading state
/// Redesigned to match submit_leave.png mockup
class SubmitLeaveScreen extends StatefulWidget {
  final LeaveRepositoryBase repository;
  final CompanySettingsRepository settingsRepository;

  const SubmitLeaveScreen({
    required this.repository,
    required this.settingsRepository,
    super.key,
  });

  @override
  State<SubmitLeaveScreen> createState() => _SubmitLeaveScreenState();
}

class _SubmitLeaveScreenState extends State<SubmitLeaveScreen> {
  final _formKey = GlobalKey<FormState>();
  final _reasonController = TextEditingController();
  DateTime? _startDate;
  DateTime? _endDate;
  DateTime _viewingMonth = DateTime.now();
  bool _isLoading = false;
  String _selectedLeaveType = 'full'; // full, medical, maternity

  // Company settings and attachment state
  CompanySettings? _companySettings;
  bool _isLoadingSettings = true;
  AttachmentMetadata? _attachment;
  bool _isUploadingAttachment = false;

  @override
  void initState() {
    super.initState();
    _loadCompanySettings();
  }

  Future<void> _loadCompanySettings() async {
    try {
      final settings = await widget.settingsRepository.fetchSettings();
      if (mounted) {
        setState(() {
          _companySettings = settings;
          _isLoadingSettings = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingSettings = false);
      }
    }
  }

  bool get _requiresAttachment {
    // Hardcoded: medical and maternity leave types require supporting documents
    return _selectedLeaveType == 'medical' || _selectedLeaveType == 'maternity';
  }

  @override
  void dispose() {
    _reasonController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    if (_startDate == null) {
      _showError('Please select a start date');
      return;
    }

    if (_endDate == null) {
      _showError('Please select an end date');
      return;
    }

    if (_endDate!.isBefore(_startDate!)) {
      _showError('End date must be after start date');
      return;
    }

    // Validate attachment if required
    if (_requiresAttachment && _attachment == null) {
      _showError('Supporting document is required for this leave type');
      return;
    }

    setState(() => _isLoading = true);

    try {
      await widget.repository.submitLeaveRequest(
        leaveType: _selectedLeaveType,
        startDate: _startDate!,
        endDate: _endDate!,
        reason: _reasonController.text,
        attachmentId: _attachment?.attachmentId,
      );

      if (mounted) {
        _showSuccess();
        Navigator.of(context).pop(true);
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

  Future<void> _pickAttachment() async {
    if (_isUploadingAttachment) return;

    setState(() => _isUploadingAttachment = true);

    try {
      final metadata = await widget.repository.pickAndUploadAttachment();
      if (metadata != null && mounted) {
        setState(() => _attachment = metadata);
      }
    } catch (e) {
      if (mounted) {
        _showError('Failed to upload attachment: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isUploadingAttachment = false);
      }
    }
  }

  void _removeAttachment() {
    setState(() => _attachment = null);
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

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Apply Leave',
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(paddingLarge),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Leave Type Selection
                    Text(
                      'Leave Type',
                      style: app_typography.labelLarge.copyWith(
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: space3),
                    Row(
                      children: [
                        _LeaveTypeOption(
                          label: 'Full',
                          isSelected: _selectedLeaveType == 'full',
                          onTap: () => setState(() => _selectedLeaveType = 'full'),
                        ),
                        const SizedBox(width: gapMedium),
                        _LeaveTypeOption(
                          label: 'Medical',
                          isSelected: _selectedLeaveType == 'medical',
                          onTap: () => setState(() => _selectedLeaveType = 'medical'),
                        ),
                        const SizedBox(width: gapMedium),
                        _LeaveTypeOption(
                          label: 'Maternity',
                          isSelected: _selectedLeaveType == 'maternity',
                          onTap: () => setState(() => _selectedLeaveType = 'maternity'),
                        ),
                      ],
                    ),
                    const SizedBox(height: space6),

                    // Date pickers side by side
                    Container(
                      padding: const EdgeInsets.all(paddingLarge),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                      ),
                      child: Row(
                        children: [
                          // Start Date
                          Expanded(
                            child: _DatePickerField(
                              label: 'Start Date',
                              selectedDate: _startDate,
                              onTap: () => _selectDate(isStartDate: true),
                            ),
                          ),

                          // Divider
                          Container(
                            width: 1,
                            height: 60,
                            color: borderColor.withOpacity(0.3),
                            margin: const EdgeInsets.symmetric(horizontal: paddingMedium),
                          ),

                          // End Date
                          Expanded(
                            child: _DatePickerField(
                              label: 'End Date',
                              selectedDate: _endDate,
                              onTap: () => _selectDate(isStartDate: false),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: space6),

                    // Calendar widget
                    Container(
                      padding: const EdgeInsets.all(paddingLarge),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                      ),
                      child: _CalendarWidget(
                        viewingMonth: _viewingMonth,
                        startDate: _startDate,
                        endDate: _endDate,
                        onMonthChanged: (month) {
                          setState(() => _viewingMonth = month);
                        },
                        onDateSelected: (date) {
                          setState(() {
                            if (_startDate == null || (_endDate != null && date.isBefore(_startDate!))) {
                              _startDate = date;
                              _endDate = null;
                            } else if (_endDate == null && date.isAfter(_startDate!)) {
                              _endDate = date;
                            } else {
                              _startDate = date;
                              _endDate = null;
                            }
                          });
                        },
                      ),
                    ),
                    const SizedBox(height: space6),

                    // Reason section
                    Text(
                      'Reason',
                      style: app_typography.labelLarge.copyWith(
                        fontWeight: FontWeight.w600,
                        color: textPrimary,
                      ),
                    ),
                    const SizedBox(height: space3),
                    Container(
                      padding: const EdgeInsets.all(paddingMedium),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE8E8E8),
                        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                      ),
                      child: TextFormField(
                        controller: _reasonController,
                        maxLines: 4,
                        decoration: InputDecoration(
                          hintText: 'Have to attend a family event...',
                          hintStyle: app_typography.bodyMedium.copyWith(
                            color: textSecondary,
                          ),
                          border: InputBorder.none,
                          enabledBorder: InputBorder.none,
                          focusedBorder: InputBorder.none,
                          filled: false,
                          contentPadding: EdgeInsets.zero,
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
                    ),

                    // Attachment section (shown when required or when attachment exists)
                    if (_requiresAttachment || _attachment != null) ...[
                      const SizedBox(height: space6),
                      Row(
                        children: [
                          Text(
                            'Supporting Document',
                            style: app_typography.labelLarge.copyWith(
                              fontWeight: FontWeight.w600,
                              color: textPrimary,
                            ),
                          ),
                          if (_requiresAttachment) ...[
                            const SizedBox(width: space2),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: paddingSmall,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: errorBackground.withOpacity(0.1),
                                borderRadius: BorderRadius.circular(radiusSmall),
                              ),
                              child: Text(
                                'Required',
                                style: app_typography.labelSmall.copyWith(
                                  color: errorBackground,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: space3),
                      if (_attachment != null)
                        // Show uploaded attachment
                        Container(
                          padding: const EdgeInsets.all(paddingMedium),
                          decoration: BoxDecoration(
                            color: const Color(0xFFE8E8E8),
                            borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                          ),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(paddingSmall),
                                decoration: BoxDecoration(
                                  color: successBackground.withOpacity(0.2),
                                  borderRadius: BorderRadius.circular(radiusMedium),
                                ),
                                child: Icon(
                                  Icons.description,
                                  color: successBackground,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: gapMedium),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Document uploaded',
                                      style: app_typography.bodyMedium.copyWith(
                                        fontWeight: FontWeight.w600,
                                        color: textPrimary,
                                      ),
                                    ),
                                    Text(
                                      _formatFileSize(_attachment!.sizeBytes),
                                      style: app_typography.bodySmall.copyWith(
                                        color: textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              IconButton(
                                onPressed: _removeAttachment,
                                icon: Icon(
                                  Icons.close,
                                  color: textSecondary,
                                ),
                              ),
                            ],
                          ),
                        )
                      else
                        // Upload button
                        InkWell(
                          onTap: _isUploadingAttachment ? null : _pickAttachment,
                          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                          child: Container(
                            padding: const EdgeInsets.all(paddingLarge),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8E8E8),
                              borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                              border: Border.all(
                                color: _requiresAttachment
                                    ? borderColor.withOpacity(0.5)
                                    : Colors.transparent,
                                style: BorderStyle.solid,
                              ),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                if (_isUploadingAttachment)
                                  const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                else
                                  Icon(
                                    Icons.cloud_upload_outlined,
                                    color: textSecondary,
                                  ),
                                const SizedBox(width: gapSmall),
                                Text(
                                  _isUploadingAttachment
                                      ? 'Uploading...'
                                      : 'Tap to upload document',
                                  style: app_typography.bodyMedium.copyWith(
                                    color: textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (_companySettings != null &&
                          _companySettings!.allowedLeaveAttachmentTypes.isNotEmpty) ...[
                        const SizedBox(height: space2),
                        Text(
                          'Allowed: ${_companySettings!.allowedLeaveAttachmentTypes.join(", ")} (max ${_companySettings!.maxLeaveAttachmentSizeMb.toStringAsFixed(0)}MB)',
                          style: app_typography.labelSmall.copyWith(
                            color: textSecondary,
                          ),
                        ),
                      ],
                    ],
                  ],
                ),
              ),
            ),

            // Submit button at bottom
            Container(
              padding: EdgeInsets.only(
                left: paddingLarge,
                right: paddingLarge,
                top: paddingLarge,
                bottom: paddingLarge + MediaQuery.of(context).padding.bottom,
              ),
              decoration: BoxDecoration(
                color: backgroundPrimary,
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 10,
                    offset: const Offset(0, -2),
                  ),
                ],
              ),
              child: SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4CAF50),
                    foregroundColor: backgroundPrimary,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                    ),
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
                          'Submit',
                          style: app_typography.bodyLarge.copyWith(
                            fontWeight: FontWeight.w600,
                            color: backgroundPrimary,
                          ),
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _selectDate({required bool isStartDate}) async {
    final initialDate = isStartDate
        ? (_startDate ?? DateTime.now())
        : (_endDate ?? _startDate ?? DateTime.now());

    final picked = await showDatePicker(
      context: context,
      initialDate: initialDate,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 365)),
    );

    if (picked != null && mounted) {
      setState(() {
        if (isStartDate) {
          _startDate = picked;
          // Reset end date if it's before the new start date
          if (_endDate != null && _endDate!.isBefore(picked)) {
            _endDate = null;
          }
        } else {
          _endDate = picked;
        }
        _viewingMonth = picked;
      });
    }
  }
}

/// Date picker field widget
class _DatePickerField extends StatelessWidget {
  final String label;
  final DateTime? selectedDate;
  final VoidCallback onTap;

  const _DatePickerField({
    required this.label,
    required this.selectedDate,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            label,
            style: app_typography.labelMedium.copyWith(
              color: textSecondary,
            ),
          ),
          const SizedBox(height: space2),
          Text(
            selectedDate != null
                ? DateFormat('MMM dd, yyyy').format(selectedDate!)
                : 'Pick a date',
            style: app_typography.bodyLarge.copyWith(
              fontWeight: FontWeight.w600,
              color: textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}

/// Calendar widget
class _CalendarWidget extends StatelessWidget {
  final DateTime viewingMonth;
  final DateTime? startDate;
  final DateTime? endDate;
  final ValueChanged<DateTime> onMonthChanged;
  final ValueChanged<DateTime> onDateSelected;

  const _CalendarWidget({
    required this.viewingMonth,
    required this.startDate,
    required this.endDate,
    required this.onMonthChanged,
    required this.onDateSelected,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Month/Year header with navigation
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            IconButton(
              icon: const Icon(Icons.chevron_left),
              onPressed: () {
                final previousMonth = DateTime(
                  viewingMonth.year,
                  viewingMonth.month - 1,
                );
                onMonthChanged(previousMonth);
              },
            ),
            Text(
              DateFormat('MMMM yyyy').format(viewingMonth),
              style: app_typography.bodyLarge.copyWith(
                fontWeight: FontWeight.w600,
                color: textPrimary,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.chevron_right),
              onPressed: () {
                final nextMonth = DateTime(
                  viewingMonth.year,
                  viewingMonth.month + 1,
                );
                onMonthChanged(nextMonth);
              },
            ),
          ],
        ),
        const SizedBox(height: space4),

        // Weekday headers
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) {
            return SizedBox(
              width: 40,
              child: Center(
                child: Text(
                  day,
                  style: app_typography.labelSmall.copyWith(
                    color: textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: space3),

        // Calendar grid
        _buildCalendarGrid(),
      ],
    );
  }

  Widget _buildCalendarGrid() {
    final firstDayOfMonth = DateTime(viewingMonth.year, viewingMonth.month, 1);
    final lastDayOfMonth = DateTime(viewingMonth.year, viewingMonth.month + 1, 0);
    final daysInMonth = lastDayOfMonth.day;
    final startWeekday = firstDayOfMonth.weekday % 7; // Convert to 0-6 (Sun-Sat)

    final weeks = <Widget>[];
    var currentWeek = <Widget>[];

    // Add empty cells for days before the month starts
    for (var i = 0; i < startWeekday; i++) {
      currentWeek.add(const SizedBox(width: 40, height: 40));
    }

    // Add days of the month
    for (var day = 1; day <= daysInMonth; day++) {
      final date = DateTime(viewingMonth.year, viewingMonth.month, day);
      currentWeek.add(_buildDayCell(date));

      if (currentWeek.length == 7) {
        weeks.add(Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: currentWeek,
        ));
        weeks.add(const SizedBox(height: space2));
        currentWeek = [];
      }
    }

    // Add remaining empty cells
    if (currentWeek.isNotEmpty) {
      while (currentWeek.length < 7) {
        currentWeek.add(const SizedBox(width: 40, height: 40));
      }
      weeks.add(Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: currentWeek,
      ));
    }

    return Column(children: weeks);
  }

  Widget _buildDayCell(DateTime date) {
    final isSelected = (startDate != null && _isSameDay(date, startDate!)) ||
        (endDate != null && _isSameDay(date, endDate!));
    final isInRange = startDate != null &&
        endDate != null &&
        date.isAfter(startDate!) &&
        date.isBefore(endDate!);

    return InkWell(
      onTap: () => onDateSelected(date),
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isSelected
              ? const Color(0xFF4CAF50)
              : isInRange
                  ? const Color(0xFFD0D0D0)
                  : Colors.transparent,
          borderRadius: BorderRadius.circular(radiusMedium),
        ),
        child: Center(
          child: Text(
            date.day.toString(),
            style: app_typography.bodyMedium.copyWith(
              color: isSelected ? backgroundPrimary : textPrimary,
              fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            ),
          ),
        ),
      ),
    );
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }
}

/// Leave type option chip
class _LeaveTypeOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _LeaveTypeOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingLarge,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF4CAF50) : const Color(0xFFE8E8E8),
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        child: Text(
          label,
          style: app_typography.bodyMedium.copyWith(
            color: isSelected ? backgroundPrimary : textSecondary,
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ),
    );
  }
}
