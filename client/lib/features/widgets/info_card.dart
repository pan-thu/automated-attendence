import 'package:flutter/material.dart';
import '../../design_system/colors.dart';
import '../../design_system/spacing.dart';

/// Consistent card component for information display
///
/// Used across all screens for consistent card styling
/// Based on spec in docs/client-overhaul/00-shared-components.md
class InfoCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final Color? backgroundColor;
  final double? elevation;

  const InfoCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.backgroundColor,
    this.elevation,
  });

  @override
  Widget build(BuildContext context) {
    final card = Card(
      color: backgroundColor ?? backgroundCard,
      elevation: elevation ?? elevationCard,
      margin: EdgeInsets.zero,
      child: Padding(
        padding: padding ??
            const EdgeInsets.all(paddingMedium),
        child: child,
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(radiusLarge),
        child: card,
      );
    }

    return card;
  }
}

/// Summary card variant for stat summaries
class SummaryCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const SummaryCard({
    super.key,
    required this.child,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InfoCard(
      onTap: onTap,
      padding: const EdgeInsets.all(paddingLarge),
      elevation: elevationCard,
      child: child,
    );
  }
}

/// List card variant for list items
class ListCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;

  const ListCard({
    super.key,
    required this.child,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InfoCard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(
        horizontal: paddingMedium,
        vertical: paddingSmall,
      ),
      child: child,
    );
  }
}

/// Action card variant for actionable items
class ActionCard extends StatelessWidget {
  final Widget child;
  final VoidCallback onTap;

  const ActionCard({
    super.key,
    required this.child,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InfoCard(
      onTap: onTap,
      padding: const EdgeInsets.all(paddingMedium),
      elevation: elevationCardHover,
      child: child,
    );
  }
}
