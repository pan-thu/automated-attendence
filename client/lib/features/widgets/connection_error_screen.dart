import 'package:flutter/material.dart';

/// A full-screen error display for connection failures.
///
/// Shows a friendly message when the app cannot connect to Firebase
/// due to network issues, with an option to retry.
class ConnectionErrorScreen extends StatelessWidget {
  const ConnectionErrorScreen({
    super.key,
    required this.onRetry,
    this.title = 'Connection Error',
    this.message = 'Unable to connect to the server. Please check your internet connection and try again.',
  });

  final VoidCallback onRetry;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              Icon(
                Icons.cloud_off_rounded,
                size: 80,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 24),
              Text(
                title,
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                message,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: Colors.grey.shade600,
                    ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              FilledButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh),
                label: const Text('Try Again'),
              ),
              const Spacer(),
              Text(
                'Make sure you have an active internet connection',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade500,
                    ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
