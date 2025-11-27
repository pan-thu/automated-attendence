import 'package:flutter/material.dart';

import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;

/// Success toast widget matching toast.png design
///
/// Features:
/// - Light green background with green border
/// - Large green checkmark icon
/// - Bold title text
/// - Subtitle for additional info
/// - Auto-dismiss after delay
/// - Centered overlay display
class SuccessToast {
  /// Shows a success toast with the design from toast.png
  static void show(
    BuildContext context, {
    required String title,
    String? subtitle,
    Duration duration = const Duration(seconds: 3),
    VoidCallback? onDismiss,
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.3),
      builder: (context) => _SuccessToastDialog(
        title: title,
        subtitle: subtitle,
        duration: duration,
        onDismiss: onDismiss,
      ),
    );
  }
}

class _SuccessToastDialog extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Duration duration;
  final VoidCallback? onDismiss;

  const _SuccessToastDialog({
    required this.title,
    this.subtitle,
    required this.duration,
    this.onDismiss,
  });

  @override
  State<_SuccessToastDialog> createState() => _SuccessToastDialogState();
}

class _SuccessToastDialogState extends State<_SuccessToastDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();

    // Auto-dismiss after duration
    Future.delayed(widget.duration, () {
      if (mounted) {
        _dismiss();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    if (mounted) {
      Navigator.of(context).pop();
      widget.onDismiss?.call();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: paddingXLarge),
              padding: const EdgeInsets.all(paddingXLarge),
              decoration: BoxDecoration(
                color: const Color(0xFFD4F4DD), // Light green background
                border: Border.all(
                  color: const Color(0xFF4CAF50), // Green border
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(radiusXLarge),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Green checkmark icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: const BoxDecoration(
                      color: Color(0xFF4CAF50), // Green circle
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.check,
                      color: Colors.white,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: space6),

                  // Title
                  Text(
                    widget.title,
                    style: app_typography.headingMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  // Subtitle (if provided)
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: space3),
                    Text(
                      widget.subtitle!,
                      style: app_typography.bodyMedium.copyWith(
                        color: textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Error toast variant
class ErrorToast {
  static void show(
    BuildContext context, {
    required String title,
    String? subtitle,
    Duration duration = const Duration(seconds: 3),
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.3),
      builder: (context) => _ErrorToastDialog(
        title: title,
        subtitle: subtitle,
        duration: duration,
      ),
    );
  }
}

class _ErrorToastDialog extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Duration duration;

  const _ErrorToastDialog({
    required this.title,
    this.subtitle,
    required this.duration,
  });

  @override
  State<_ErrorToastDialog> createState() => _ErrorToastDialogState();
}

class _ErrorToastDialogState extends State<_ErrorToastDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();

    Future.delayed(widget.duration, () {
      if (mounted) {
        _dismiss();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: paddingXLarge),
              padding: const EdgeInsets.all(paddingXLarge),
              decoration: BoxDecoration(
                color: const Color(0xFFFFE5E5), // Light red background
                border: Border.all(
                  color: errorBackground, // Red border
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(radiusXLarge),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Red X icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: errorBackground,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.close,
                      color: Colors.white,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: space6),

                  // Title
                  Text(
                    widget.title,
                    style: app_typography.headingMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  // Subtitle
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: space3),
                    Text(
                      widget.subtitle!,
                      style: app_typography.bodyMedium.copyWith(
                        color: textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Warning toast variant
class WarningToast {
  static void show(
    BuildContext context, {
    required String title,
    String? subtitle,
    Duration duration = const Duration(seconds: 3),
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.3),
      builder: (context) => _WarningToastDialog(
        title: title,
        subtitle: subtitle,
        duration: duration,
      ),
    );
  }
}

class _WarningToastDialog extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Duration duration;

  const _WarningToastDialog({
    required this.title,
    this.subtitle,
    required this.duration,
  });

  @override
  State<_WarningToastDialog> createState() => _WarningToastDialogState();
}

class _WarningToastDialogState extends State<_WarningToastDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();

    Future.delayed(widget.duration, () {
      if (mounted) {
        _dismiss();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: paddingXLarge),
              padding: const EdgeInsets.all(paddingXLarge),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF4E5), // Light orange background
                border: Border.all(
                  color: warningBackground, // Orange border
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(radiusXLarge),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Orange warning icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: warningBackground,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.warning_amber_rounded,
                      color: Colors.white,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: space6),

                  // Title
                  Text(
                    widget.title,
                    style: app_typography.headingMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  // Subtitle
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: space3),
                    Text(
                      widget.subtitle!,
                      style: app_typography.bodyMedium.copyWith(
                        color: textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Info toast variant
class InfoToast {
  static void show(
    BuildContext context, {
    required String title,
    String? subtitle,
    Duration duration = const Duration(seconds: 3),
  }) {
    showDialog(
      context: context,
      barrierDismissible: true,
      barrierColor: Colors.black.withOpacity(0.3),
      builder: (context) => _InfoToastDialog(
        title: title,
        subtitle: subtitle,
        duration: duration,
      ),
    );
  }
}

class _InfoToastDialog extends StatefulWidget {
  final String title;
  final String? subtitle;
  final Duration duration;

  const _InfoToastDialog({
    required this.title,
    this.subtitle,
    required this.duration,
  });

  @override
  State<_InfoToastDialog> createState() => _InfoToastDialogState();
}

class _InfoToastDialogState extends State<_InfoToastDialog>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _scaleAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutBack,
    );

    _fadeAnimation = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeIn,
    );

    _controller.forward();

    Future.delayed(widget.duration, () {
      if (mounted) {
        _dismiss();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _dismiss() async {
    await _controller.reverse();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _fadeAnimation,
      child: ScaleTransition(
        scale: _scaleAnimation,
        child: Dialog(
          backgroundColor: Colors.transparent,
          elevation: 0,
          child: Center(
            child: Container(
              margin: const EdgeInsets.symmetric(horizontal: paddingXLarge),
              padding: const EdgeInsets.all(paddingXLarge),
              decoration: BoxDecoration(
                color: const Color(0xFFE3F2FD), // Light blue background
                border: Border.all(
                  color: infoBackground, // Blue border
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(radiusXLarge),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Blue info icon
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: infoBackground,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.info_outline,
                      color: Colors.white,
                      size: 48,
                    ),
                  ),
                  const SizedBox(height: space6),

                  // Title
                  Text(
                    widget.title,
                    style: app_typography.headingMedium.copyWith(
                      fontWeight: FontWeight.bold,
                      color: textPrimary,
                    ),
                    textAlign: TextAlign.center,
                  ),

                  // Subtitle
                  if (widget.subtitle != null) ...[
                    const SizedBox(height: space3),
                    Text(
                      widget.subtitle!,
                      style: app_typography.bodyMedium.copyWith(
                        color: textSecondary,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
