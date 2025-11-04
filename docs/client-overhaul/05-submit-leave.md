# Submit Leave Form - Workflow Plan

## Screen Overview

**Purpose**: Submit new leave requests

**Design Reference**: `docs/ui/client/high/submit_leave.png`

**Current Implementation**:
- File: `client/lib/features/leaves/widgets/leave_request_form.dart`
- Controller: `leave_request_controller.dart`

**Route**: `/leaves/new` (modal/push route)

---

## Design Analysis

### Design Shows:
1. **Header**: "Apply Leave" with back button
2. **Date Range Picker**:
   - Start Date / End Date fields
   - Calendar view for selection
3. **Reason Input**: Text area for reason
4. **Submit Button**: Primary button at bottom

### Current Implementation Gap:
- ✅ Has form functionality
- ❌ Design doesn't match mockup
- ❌ Calendar integration needs improvement

---

## UI Components Needed

### From `00-shared-components.md`:
- `DateRangePicker` component

---

## Implementation Steps

### Step 1: Create/Update DateRangePicker Component
**File**: `client/lib/features/widgets/date_range_picker.dart`

```dart
class DateRangePicker extends StatefulWidget {
  final DateTime? startDate;
  final DateTime? endDate;
  final ValueChanged<DateTimeRange?> onDateRangeSelected;

  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                readOnly: true,
                decoration: InputDecoration(labelText: 'Start Date'),
                controller: TextEditingController(
                  text: startDate != null ? DateFormat('MMM dd, yyyy').format(startDate!) : '',
                ),
                onTap: () => _showDatePicker(context, isStart: true),
              ),
            ),
            SizedBox(width: 16),
            Expanded(
              child: TextField(
                readOnly: true,
                decoration: InputDecoration(labelText: 'End Date'),
                controller: TextEditingController(
                  text: endDate != null ? DateFormat('MMM dd, yyyy').format(endDate!) : '',
                ),
                onTap: () => _showDatePicker(context, isStart: false),
              ),
            ),
          ],
        ),
        // Calendar view
        if (showCalendar)
          TableCalendar(
            firstDay: DateTime.now(),
            lastDay: DateTime.now().add(Duration(days: 365)),
            focusedDay: focusedDay,
            selectedDayPredicate: (day) => _isInRange(day),
            onDaySelected: _handleDaySelected,
          ),
      ],
    );
  }
}
```

### Step 2: Redesign Leave Request Form
**File**: `client/lib/features/leaves/widgets/leave_request_form.dart`

```dart
class LeaveRequestForm extends ConsumerStatefulWidget {
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Apply Leave'),
        leading: IconButton(
          icon: Icon(Icons.arrow_back),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SingleChildScrollView(
        padding: EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Date range picker
              DateRangePicker(
                startDate: _startDate,
                endDate: _endDate,
                onDateRangeSelected: (range) {
                  setState(() {
                    _startDate = range?.start;
                    _endDate = range?.end;
                  });
                },
              ),
              SizedBox(height: 24),
              // Reason input
              TextFormField(
                controller: _reasonController,
                decoration: InputDecoration(
                  labelText: 'Reason',
                  hintText: 'Enter reason for leave',
                  alignedLabelText: true,
                ),
                maxLines: 4,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Reason is required';
                  }
                  return null;
                },
              ),
              SizedBox(height: 32),
              // Submit button
              ElevatedButton(
                onPressed: _isLoading ? null : _handleSubmit,
                child: _isLoading
                    ? CircularProgressIndicator(color: Colors.white)
                    : Text('Submit'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _handleSubmit() async {
    if (_formKey.currentState!.validate() && _startDate != null && _endDate != null) {
      setState(() => _isLoading = true);

      try {
        await ref.read(leaveRequestControllerProvider.notifier).submitLeaveRequest(
          startDate: _startDate!,
          endDate: _endDate!,
          reason: _reasonController.text,
        );

        if (mounted) {
          FeedbackDialog.showSuccess(
            context,
            'Leave Request Submitted',
            message: 'Your leave request has been submitted for approval',
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          FeedbackDialog.showError(
            context,
            'Submission Failed',
            message: e.toString(),
          );
        }
      } finally {
        if (mounted) setState(() => _isLoading = false);
      }
    }
  }
}
```

### Step 3: Add Calendar Dependency
**File**: `pubspec.yaml`

```yaml
dependencies:
  table_calendar: ^3.0.9
```

### Step 4: Testing
- Test date selection
- Test validation
- Test submission
- Test error handling

---

## Success Criteria

- ✅ Date range picker works smoothly
- ✅ Calendar view is functional
- ✅ Form validation works
- ✅ Submission success/error feedback displays
- ✅ Navigation back after successful submission

---

## Estimated Effort

- **Date picker component**: 4 hours
- **Form redesign**: 3 hours
- **Testing**: 2 hours
- **Total**: ~9 hours (1.5 days)

---

## Related Documents

- `04-leave-management.md` - Parent leave screen
- `09-success-toast.md` - Feedback dialog
- `00-shared-components.md` - Date range picker specs
