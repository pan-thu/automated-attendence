import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../widgets/auth_text_field.dart';
import '../controllers/login_controller.dart';

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

class _LoginView extends StatelessWidget {
  const _LoginView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<LoginController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Employee Login')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Sign in to continue',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 16),
              AuthTextField(
                label: 'Work Email',
                keyboardType: TextInputType.emailAddress,
                onChanged: controller.updateEmail,
                errorText: controller.emailError,
              ),
              const SizedBox(height: 12),
              AuthTextField(
                label: 'Password',
                obscureText: true,
                onChanged: controller.updatePassword,
                errorText: controller.passwordError,
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed:
                      controller.canSubmit
                          ? () => controller.resetPassword(context)
                          : null,
                  child: const Text('Forgot password?'),
                ),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed:
                    controller.canSubmit
                        ? () => controller.signIn(context)
                        : null,
                child:
                    controller.isLoading
                        ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                        : const Text('Sign In'),
              ),
              if (controller.errorMessage != null) ...[
                const SizedBox(height: 16),
                Text(
                  controller.errorMessage!,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
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
