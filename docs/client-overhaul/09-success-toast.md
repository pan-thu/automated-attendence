# Success Toast/Feedback Dialog - Workflow Plan

## Component Overview

**Purpose**: Display success/error/warning/info feedback to users after actions

**Design Reference**: `docs/ui/client/high/toast.png`

**Current Implementation**: May have basic snackbars, need custom dialog

**Usage**: Clock-in success, leave submission, password reset, etc.

---

## Design Analysis

### Design Shows:
1. **Full-screen overlay** with semi-transparent background
2. **Large icon**: Check icon (success)
3. **Title**: "You Are On Time!"
4. **Message**: "Clock in time: 09:16 AM"
5. **Auto-dismiss** or tap-to-dismiss functionality

---

## Implementation Steps

### Step 1: Create Feedback Dialog Component
**File**: `client/lib/features/widgets/feedback_dialog.dart`

```dart
class FeedbackDialog extends StatelessWidget {
  final FeedbackType type;
  final String title;
  final String? message;
  final VoidCallback? onDismiss;
  final Duration? autoDismissDuration;

  const FeedbackDialog({
    Key? key,
    required this.type,
    required this.title,
    this.message,
    this.onDismiss,
    this.autoDismissDuration,
  }) : super(key: key);

  // Static helper methods
  static void showSuccess(
    BuildContext context,
    String title, {
    String? message,
    Duration? autoDismissDuration,
  }) {
    _show(
      context,
      FeedbackDialog(
        type: FeedbackType.success,
        title: title,
        message: message,
        autoDismissDuration: autoDismissDuration ?? Duration(seconds: 3),
      ),
    );
  }

  static void showError(
    BuildContext context,
    String title, {
    String? message,
  }) {
    _show(
      context,
      FeedbackDialog(
        type: FeedbackType.error,
        title: title,
        message: message,
      ),
    );
  }

  static void showWarning(
    BuildContext context,
    String title, {
    String? message,
  }) {
    _show(
      context,
      FeedbackDialog(
        type: FeedbackType.warning,
        title: title,
        message: message,
      ),
    );
  }

  static void showInfo(
    BuildContext context,
    String title, {
    String? message,
  }) {
    _show(
      context,
      FeedbackDialog(
        type: FeedbackType.info,
        title: title,
        message: message,
      ),
    );
  }

  static void _show(BuildContext context, FeedbackDialog dialog) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black54,
      builder: (context) => dialog,
    );

    // Auto-dismiss if duration is set
    if (dialog.autoDismissDuration != null) {
      Future.delayed(dialog.autoDismissDuration!, () {
        if (context.mounted) {
          Navigator.of(context).pop();
        }
      });
    }
  }

  Color _getBackgroundColor() {
    switch (type) {
      case FeedbackType.success:
        return Colors.green;
      case FeedbackType.error:
        return Colors.red;
      case FeedbackType.warning:
        return Colors.orange;
      case FeedbackType.info:
        return Colors.blue;
    }
  }

  IconData _getIcon() {
    switch (type) {
      case FeedbackType.success:
        return Icons.check_circle;
      case FeedbackType.error:
        return Icons.error;
      case FeedbackType.warning:
        return Icons.warning;
      case FeedbackType.info:
        return Icons.info;
    }
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).pop();
        onDismiss?.call();
      },
      child: Material(
        color: Colors.transparent,
        child: Center(
          child: Container(
            margin: EdgeInsets.all(48),
            padding: EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: _getBackgroundColor(),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon with animation
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: Duration(milliseconds: 500),
                  curve: Curves.elasticOut,
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      child: Icon(
                        _getIcon(),
                        size: 64,
                        color: Colors.white,
                      ),
                    );
                  },
                ),
                SizedBox(height: 24),

                // Title
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),

                // Message (optional)
                if (message != null) ...[
                  SizedBox(height: 12),
                  Text(
                    message!,
                    style: TextStyle(
                      fontSize: 16,
                      color: Colors.white,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

enum FeedbackType {
  success,
  error,
  warning,
  info,
}
```

### Step 2: Usage Examples

**Clock-in success**:
```dart
FeedbackDialog.showSuccess(
  context,
  'You Are On Time!',
  message: 'Clock in time: ${DateFormat('hh:mm a').format(DateTime.now())}',
);
```

**Leave submission success**:
```dart
FeedbackDialog.showSuccess(
  context,
  'Leave Request Submitted',
  message: 'Your leave request has been submitted for approval',
);
```

**Error example**:
```dart
FeedbackDialog.showError(
  context,
  'Clock-in Failed',
  message: 'You are outside the geofence area',
);
```

**Warning example**:
```dart
FeedbackDialog.showWarning(
  context,
  'Late Clock-in',
  message: 'You are clocking in late. A penalty may be applied.',
);
```

### Step 3: Integration Points
Update the following controllers to use FeedbackDialog:
- `ClockInController` - Show success/error after clock-in
- `LeaveRequestController` - Show success/error after leave submission
- `LoginController` - Show error for login failures (optional, can use inline errors)
- Any other action that needs user feedback

---

## Success Criteria

- ✅ Dialog displays with correct colors for each type
- ✅ Icon animates on appearance
- ✅ Auto-dismiss works for success messages
- ✅ Manual dismiss works via tap
- ✅ Used consistently across all actions

---

## Estimated Effort

- **Component creation**: 3 hours
- **Integration**: 2 hours
- **Testing**: 1 hour
- **Total**: ~6 hours (1 day)

---

## Related Documents

- `00-design-system.md` - Colors and styling
- `02-home-dashboard.md` - Clock-in usage
- `05-submit-leave.md` - Leave submission usage
- `01-login.md` - Password reset usage
