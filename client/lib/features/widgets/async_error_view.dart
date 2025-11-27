import 'package:flutter/material.dart';

typedef AsyncCallback = Future<void> Function();

class AsyncErrorView extends StatelessWidget {
  const AsyncErrorView({super.key, required this.message, this.onRetry, this.onHelp});

  final String message;
  final AsyncCallback? onRetry;
  final VoidCallback? onHelp;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, color: colorScheme.error, size: 48),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyLarge,
            ),
            const SizedBox(height: 16),
            if (onRetry != null)
              FilledButton(
                onPressed: () => onRetry!.call(),
                child: const Text('Try Again'),
              ),
            if (onHelp != null)
              TextButton(
                onPressed: onHelp,
                child: const Text('Need help?'),
              ),
          ],
        ),
      ),
    );
  }
}

