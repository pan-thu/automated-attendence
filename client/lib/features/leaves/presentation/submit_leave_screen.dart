import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/leave_repository.dart';

/// Submit leave screen for creating new leave requests
///
/// Features:
/// - Side-by-side date pickers with calendar view
/// - Reason text input
/// - Submit button with loading state
/// Redesigned to match submit_leave.png mockup
class SubmitLeaveScreen extends StatefulWidget {
  final LeaveRepositoryBase repository;

  const SubmitLeaveScreen({required this.repository, super.key});

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
  String _selectedLeaveType = 'casual'; // casual, sick, vacation

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

    setState(() => _isLoading = true);

    try {
      await widget.repository.submitLeaveRequest(
        leaveType: _selectedLeaveType,
        startDate: _startDate!,
        endDate: _endDate!,
        reason: _reasonController.text,
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
                          label: 'Casual',
                          isSelected: _selectedLeaveType == 'casual',
                          onTap: () => setState(() => _selectedLeaveType = 'casual'),
                        ),
                        const SizedBox(width: gapMedium),
                        _LeaveTypeOption(
                          label: 'Medical',
                          isSelected: _selectedLeaveType == 'sick',
                          onTap: () => setState(() => _selectedLeaveType = 'sick'),
                        ),
                        const SizedBox(width: gapMedium),
                        _LeaveTypeOption(
                          label: 'Maternity',
                          isSelected: _selectedLeaveType == 'vacation',
                          onTap: () => setState(() => _selectedLeaveType = 'vacation'),
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
                  ],
                ),
              ),
            ),

            // Submit button at bottom
            Container(
              padding: const EdgeInsets.all(paddingLarge),
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
