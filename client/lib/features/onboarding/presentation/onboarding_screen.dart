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
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                "Let's get your device ready.",
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView(
                  physics: const ClampingScrollPhysics(),
                  children: [
                    _PermissionCard(
                      title: 'Location Access',
                      description: 'Required to verify you are within company premises.',
                      granted: onboarding.locationGranted,
                      actionLabel: 'Grant Access',
                      onPressed: onboarding.locationGranted
                          ? null
                          : () async {
                              await onboarding.requestLocationPermission();
                            },
                    ),
                    const SizedBox(height: 16),
                    _PermissionCard(
                      title: 'Notifications',
                      description: 'Stay updated on attendance and leave status.',
                      granted: onboarding.notificationsGranted,
                      actionLabel: 'Enable Notifications',
                      onPressed: onboarding.notificationsGranted
                          ? null
                          : () async {
                              await onboarding.requestNotificationPermission();
                            },
                    ),
                    const SizedBox(height: 24),
                    if (onboarding.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          onboarding.errorMessage!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onErrorContainer,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                  ],
                ),
              ),
              FilledButton.icon(
                onPressed: onboarding.isRegisteringToken
                    ? null
                    : () async {
                        await onboarding.registerDeviceToken(
                          userId: session.user?.uid,
                          onSuccess: session.markOnboardingComplete,
                        );
                      },
                icon: onboarding.isRegisteringToken
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.check_circle),
                label: const Text('Finish Setup'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () {
                  session.markOnboardingComplete();
                },
                child: const Text('Skip for now'),
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: granted
              ? colorScheme.primary.withOpacity(0.3)
              : colorScheme.outline.withOpacity(0.2),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  granted ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: granted ? colorScheme.primary : colorScheme.outline,
                  size: 24,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    title,
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.only(left: 36),
              child: Text(
                description,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ),
            if (!granted) ...[
              const SizedBox(height: 16),
              Padding(
                padding: const EdgeInsets.only(left: 36),
                child: ElevatedButton(
                  onPressed: onPressed,
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 40),
                  ),
                  child: Text(actionLabel),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
