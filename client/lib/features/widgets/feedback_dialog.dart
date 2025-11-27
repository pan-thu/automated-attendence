import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';

/// Feedback dialog component for displaying success/error/warning/info messages
///
/// Used for clock-in success, leave submission, password reset, etc.
/// Based on spec in docs/client-overhaul/09-success-toast.md
class FeedbackDialog extends StatelessWidget {
  final FeedbackType type;
  final String title;
  final String? message;
  final VoidCallback? onDismiss;
  final Duration? autoDismissDuration;

  const FeedbackDialog({
    super.key,
    required this.type,
    required this.title,
    this.message,
    this.onDismiss,
    this.autoDismissDuration,
  });

  /// Show success feedback dialog
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
        autoDismissDuration: autoDismissDuration ?? const Duration(seconds: 3),
      ),
    );
  }

  /// Show error feedback dialog
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

  /// Show warning feedback dialog
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

  /// Show info feedback dialog
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
          dialog.onDismiss?.call();
        }
      });
    }
  }

  Color _getBackgroundColor() {
    switch (type) {
      case FeedbackType.success:
        return successBackground;
      case FeedbackType.error:
        return errorBackground;
      case FeedbackType.warning:
        return warningBackground;
      case FeedbackType.info:
        return infoBackground;
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
            margin: const EdgeInsets.all(paddingXLarge * 1.5),
            padding: const EdgeInsets.all(paddingXLarge),
            decoration: BoxDecoration(
              color: _getBackgroundColor(),
              borderRadius: BorderRadius.circular(radiusXLarge),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Icon with animation
                TweenAnimationBuilder<double>(
                  tween: Tween(begin: 0.0, end: 1.0),
                  duration: const Duration(milliseconds: 500),
                  curve: Curves.elasticOut,
                  builder: (context, value, child) {
                    return Transform.scale(
                      scale: value,
                      child: Icon(
                        _getIcon(),
                        size: iconSizeXLarge * 1.5,
                        color: Colors.white,
                      ),
                    );
                  },
                ),
                const SizedBox(height: space6),

                // Title
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                  ),
                  textAlign: TextAlign.center,
                ),

                // Message (optional)
                if (message != null) ...[
                  const SizedBox(height: space3),
                  Text(
                    message!,
                    style: const TextStyle(
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

/// Feedback type enum
enum FeedbackType {
  success,
  error,
  warning,
  info,
}
