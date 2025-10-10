import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class OfflineNotice extends StatelessWidget {
  const OfflineNotice({
    required this.message,
    this.lastUpdated,
    this.margin,
    this.icon,
    this.onRetry,
    super.key,
  });

  final String message;
  final DateTime? lastUpdated;
  final EdgeInsets? margin;
  final IconData? icon;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textTheme = Theme.of(context).textTheme;
    final effectiveMargin = margin ?? const EdgeInsets.fromLTRB(16, 12, 16, 12);
    final timestamp =
        lastUpdated != null
            ? DateFormat.yMMMd().add_jm().format(lastUpdated!.toLocal())
            : null;

    return Card(
      margin: effectiveMargin,
      color: colorScheme.surfaceContainerHighest,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  icon ?? Icons.cloud_off,
                  color: colorScheme.onSurfaceVariant,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(message, style: textTheme.bodyMedium),
                      if (timestamp != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          'Last updated: $timestamp',
                          style: textTheme.labelSmall,
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ),
            if (onRetry != null) ...[
              const SizedBox(height: 12),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: onRetry,
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
