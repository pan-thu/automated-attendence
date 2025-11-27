import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';
import '../../design_system/typography.dart' as app_typography;
import '../../design_system/styles.dart';

/// Forgot password dialog for password reset
///
/// Shows a bottom sheet modal for password reset flow
/// Based on spec in docs/client-overhaul/01-login.md
class ForgotPasswordDialog extends StatefulWidget {
  final Future<void> Function(String email) onSubmit;

  const ForgotPasswordDialog({
    super.key,
    required this.onSubmit,
  });

  /// Show the forgot password dialog
  static Future<void> show(
    BuildContext context, {
    required Future<void> Function(String email) onSubmit,
  }) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ForgotPasswordDialog(onSubmit: onSubmit),
    );
  }

  @override
  State<ForgotPasswordDialog> createState() => _ForgotPasswordDialogState();
}

class _ForgotPasswordDialogState extends State<ForgotPasswordDialog> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      await widget.onSubmit(_emailController.text.trim());
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      // Error will be handled by the onSubmit callback
      // which should show error feedback dialog
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  String? _validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Email is required';
    }

    final emailRegex = RegExp(
      r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$',
    );

    if (!emailRegex.hasMatch(value.trim())) {
      return 'Please enter a valid email address';
    }

    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: backgroundPrimary,
        borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXLarge)),
      ),
      padding: EdgeInsets.only(
        top: paddingLarge,
        left: paddingLarge,
        right: paddingLarge,
        bottom: MediaQuery.of(context).viewInsets.bottom + paddingLarge,
      ),
      child: Form(
        key: _formKey,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Row(
              children: [
                // Back button
                IconButton(
                  onPressed: _isSubmitting
                      ? null
                      : () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(width: gapMedium),

                // Title
                Expanded(
                  child: Text(
                    'Reset Password',
                    style: app_typography.headingMedium,
                  ),
                ),
              ],
            ),
            const SizedBox(height: space6),

            // Description
            Text(
              'Enter your email address and we\'ll send you instructions to reset your password.',
              style: app_typography.bodyMedium.copyWith(
                color: textSecondary,
              ),
            ),
            const SizedBox(height: space8),

            // Email field
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              validator: _validateEmail,
              enabled: !_isSubmitting,
              autofocus: true,
              textInputAction: TextInputAction.done,
              onFieldSubmitted: (_) => _handleSubmit(),
              decoration: InputDecoration(
                labelText: 'Email',
                hintText: 'Enter your email',
                prefixIcon: const Icon(Icons.email_outlined),
                filled: true,
                fillColor: backgroundSecondary,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: BorderSide.none,
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: const BorderSide(color: borderColor, width: 1),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: const BorderSide(color: primaryGreen, width: 2),
                ),
                errorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: const BorderSide(color: errorBackground, width: 1),
                ),
                focusedErrorBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: const BorderSide(color: errorBackground, width: 2),
                ),
                disabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(radiusMedium),
                  borderSide: const BorderSide(color: borderColor, width: 1),
                ),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: paddingMedium,
                  vertical: paddingMedium,
                ),
              ),
            ),
            const SizedBox(height: space8),

            // Submit button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _handleSubmit,
                style: primaryButtonStyle,
                child: _isSubmitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                        ),
                      )
                    : Text(
                        'Send Reset Link',
                        style: app_typography.buttonLarge,
                      ),
              ),
            ),
            const SizedBox(height: space4),
          ],
        ),
      ),
    );
  }
}
