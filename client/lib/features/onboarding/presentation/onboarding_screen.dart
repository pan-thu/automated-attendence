import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../controllers/onboarding_controller.dart';
import '../../../core/auth/session_controller.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OnboardingController>().loadStatus();
    });
  }

  @override
  Widget build(BuildContext context) {
    final onboarding = context.watch<OnboardingController>();
    final session = context.watch<SessionController>();

    return Scaffold(
      appBar: AppBar(title: const Text('Welcome')),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Let’s get your device ready.',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 16),
          _PermissionCard(
            title: 'Location Access',
            description: 'Needed to verify you are within the company geofence when clocking in/out.',
            granted: onboarding.locationGranted,
            actionLabel: onboarding.locationGranted ? 'Granted' : 'Grant Access',
            onPressed: onboarding.locationGranted ? null : onboarding.requestLocationPermission,
          ),
          const SizedBox(height: 16),
          _PermissionCard(
            title: 'Notifications',
            description: 'Stay informed about attendance reminders, leave approvals, and penalties.',
            granted: onboarding.notificationsGranted,
            actionLabel: onboarding.notificationsGranted ? 'Granted' : 'Enable Notifications',
            onPressed: onboarding.notificationsGranted ? null : onboarding.requestNotificationPermission,
          ),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onboarding.isRegisteringToken
                ? null
                : () => onboarding.registerDeviceToken(
                      userId: session.user?.uid,
                      onSuccess: session.markOnboardingComplete,
                    ),
            icon: onboarding.isRegisteringToken
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.check_circle),
            label: const Text('Finish Setup'),
          ),
          if (onboarding.errorMessage != null) ...[
            const SizedBox(height: 16),
            Text(
              onboarding.errorMessage!,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: Theme.of(context).colorScheme.error),
            ),
          ],
          if (onboarding.isCompleted)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Text('You’re all set! You’ll be redirected shortly.'),
            ),
        ],
      ),
    );
  }
}

class _PermissionCard extends StatelessWidget {
  const _PermissionCard({
    required this.title,
    required this.description,
    required this.granted,
    required this.actionLabel,
    required this.onPressed,
  });

  final String title;
  final String description;
  final bool granted;
  final String actionLabel;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(description, style: Theme.of(context).textTheme.bodyMedium),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Chip(
                  avatar: Icon(
                    granted ? Icons.check_circle : Icons.error_outline,
                    color: granted ? colorScheme.primary : colorScheme.error,
                  ),
                  label: Text(granted ? 'Granted' : 'Required'),
                  backgroundColor: granted
                      ? colorScheme.primaryContainer.withOpacity(0.3)
                      : colorScheme.errorContainer.withOpacity(0.3),
                ),
                TextButton(onPressed: onPressed, child: Text(actionLabel)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

