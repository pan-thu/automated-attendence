import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../../core/services/auth_repository.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/styles.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../widgets/app_logo.dart';
import '../../widgets/auth_text_field.dart';
import '../../widgets/feedback_dialog.dart';
import '../../widgets/forgot_password_dialog.dart';
import '../controllers/login_controller.dart';

/// Login screen for employee authentication
///
/// Features:
/// - App logo and branding
/// - Email/password authentication
/// - Forgot password flow via dialog
/// - Error feedback via FeedbackDialog
/// Based on spec in docs/client-overhaul/01-login.md
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<LoginController>(
      create: (_) => LoginController(),
      child: const _LoginView(),
    );
  }
}

class _LoginView extends StatefulWidget {
  const _LoginView();

  @override
  State<_LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<_LoginView> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignIn(LoginController controller) async {
    try {
      await controller.signIn(context);
      // Navigation is handled by AppRouter redirect logic
    } on AuthFailure catch (e) {
      if (mounted) {
        FeedbackDialog.showError(
          context,
          'Login Failed',
          message: e.message,
        );
      }
    }
  }

  Future<void> _handleForgotPassword(LoginController controller) async {
    await ForgotPasswordDialog.show(
      context,
      onSubmit: (email) async {
        try {
          await controller.sendPasswordReset(email);
          if (mounted) {
            FeedbackDialog.showSuccess(
              context,
              'Email Sent',
              message: 'Check your inbox for password reset instructions.',
            );
          }
        } on AuthFailure catch (e) {
          if (mounted) {
            FeedbackDialog.showError(
              context,
              'Reset Failed',
              message: e.message,
            );
          }
          rethrow; // Re-throw to keep dialog open
        }
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LoginController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: paddingXLarge,
            vertical: paddingXLarge * 2,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // App Logo
              const AppLogo(size: 64, showSubtitle: true),
              const SizedBox(height: space12),

              // Welcome heading
              Text(
                'Welcome Back',
                style: app_typography.headingLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: space2),

              Text(
                'Sign in to continue',
                style: app_typography.bodyMedium.copyWith(
                  color: textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: space10),

              // Email field
              AuthTextField(
                controller: _emailController,
                label: 'Work Email',
                hint: 'Enter your work email',
                keyboardType: TextInputType.emailAddress,
                autofocus: false,
                onChanged: controller.updateEmail,
                validator: (value) => controller.emailError,
              ),
              const SizedBox(height: space6),

              // Password field
              AuthTextField(
                controller: _passwordController,
                label: 'Password',
                hint: 'Enter your password',
                obscureText: _obscurePassword,
                onChanged: controller.updatePassword,
                validator: (value) => controller.passwordError,
                suffixIcon: IconButton(
                  icon: Icon(
                    _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                    color: textSecondary,
                  ),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
              ),
              const SizedBox(height: space4),

              // Forgot password link
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: controller.isLoading
                      ? null
                      : () => _handleForgotPassword(controller),
                  style: TextButton.styleFrom(
                    foregroundColor: primaryGreen,
                    padding: const EdgeInsets.symmetric(
                      horizontal: paddingSmall,
                      vertical: paddingSmall,
                    ),
                  ),
                  child: Text(
                    'Forgot Password?',
                    style: app_typography.bodyMedium.copyWith(
                      color: primaryGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: space8),

              // Sign In button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: controller.canSubmit && !controller.isLoading
                      ? () => _handleSignIn(controller)
                      : null,
                  style: primaryButtonStyle,
                  child: controller.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                          ),
                        )
                      : Text(
                          'Sign In',
                          style: app_typography.buttonLarge,
                        ),
                ),
              ),

              // Error message (if any, shown inline for field validation)
              if (controller.errorMessage != null) ...[
                const SizedBox(height: space6),
                Container(
                  padding: const EdgeInsets.all(paddingMedium),
                  decoration: BoxDecoration(
                    color: errorBackground.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(radiusMedium),
                    border: Border.all(color: errorBackground, width: 1),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.error_outline,
                        color: errorBackground,
                        size: iconSizeMedium,
                      ),
                      const SizedBox(width: gapSmall),
                      Expanded(
                        child: Text(
                          controller.errorMessage!,
                          style: app_typography.bodySmall.copyWith(
                            color: errorBackground,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
