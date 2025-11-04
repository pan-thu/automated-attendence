import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/penalty_repository.dart';

/// Resources screen - navigation hub for secondary features
///
/// Provides access to:
/// - Leave Request
/// - Penalties (with summary badge)
/// - Holiday List
///
/// Based on spec in docs/client-overhaul/08-resources.md
class ResourcesScreen extends StatefulWidget {
  final PenaltyRepositoryBase penaltyRepository;

  const ResourcesScreen({required this.penaltyRepository, super.key});

  @override
  State<ResourcesScreen> createState() => _ResourcesScreenState();
}

class _ResourcesScreenState extends State<ResourcesScreen> {
  PenaltySummary? _penaltySummary;
  bool _isLoadingSummary = false;

  @override
  void initState() {
    super.initState();
    _loadPenaltySummary();
  }

  Future<void> _loadPenaltySummary() async {
    setState(() => _isLoadingSummary = true);

    try {
      final summary = await widget.penaltyRepository.getPenaltySummary();
      if (mounted) {
        setState(() {
          _penaltySummary = summary;
          _isLoadingSummary = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingSummary = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Resources',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(paddingLarge),
        children: [
          // Header section
          Padding(
            padding: const EdgeInsets.only(bottom: space6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Quick Access',
                  style: app_typography.headingSmall.copyWith(
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: space2),
                Text(
                  'Access leave requests, penalties, and holiday information',
                  style: app_typography.bodyMedium.copyWith(
                    color: textSecondary,
                  ),
                ),
              ],
            ),
          ),

          // Leave Request
          ResourceMenuItem(
            icon: Icons.calendar_today,
            iconColor: primaryGreen,
            title: 'Leave Request',
            subtitle: 'Apply for leave',
            onTap: () {
              context.push('/submit-leave');
            },
          ),
          const SizedBox(height: gapMedium),

          // Penalties with summary badge
          _isLoadingSummary
              ? ResourceMenuItem(
                  icon: Icons.warning_amber,
                  iconColor: errorBackground,
                  title: 'Penalties',
                  subtitle: 'View your penalties',
                  onTap: () {
                    context.push('/penalties');
                  },
                )
              : ResourceMenuItem(
                  icon: Icons.warning_amber,
                  iconColor: errorBackground,
                  title: 'Penalties',
                  subtitle: 'View your penalties',
                  badge: _penaltySummary != null &&
                          _penaltySummary!.activeCount > 0
                      ? '${_penaltySummary!.activeCount} active, Rs ${_penaltySummary!.totalAmount.toStringAsFixed(0)} total'
                      : null,
                  onTap: () {
                    context.push('/penalties');
                  },
                ),
          const SizedBox(height: gapMedium),

          // Holiday List
          ResourceMenuItem(
            icon: Icons.event,
            iconColor: infoBackground,
            title: 'Holiday List',
            subtitle: 'View upcoming holidays',
            onTap: () {
              context.push('/holidays');
            },
          ),
        ],
      ),
    );
  }
}

/// Resource menu item widget
class ResourceMenuItem extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String title;
  final String subtitle;
  final String? badge;
  final VoidCallback onTap;

  const ResourceMenuItem({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    this.badge,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusMedium),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: backgroundSecondary,
          borderRadius: BorderRadius.circular(radiusMedium),
          border: Border.all(color: borderColor, width: 1),
        ),
        child: Row(
          children: [
            // Icon container
            Container(
              padding: const EdgeInsets.all(paddingMedium),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(radiusSmall),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: iconSizeLarge,
              ),
            ),
            const SizedBox(width: gapMedium),

            // Title and subtitle
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: app_typography.labelLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: space1),
                  Text(
                    subtitle,
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                  ),
                  if (badge != null) ...[
                    const SizedBox(height: space2),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: paddingSmall,
                        vertical: space1,
                      ),
                      decoration: BoxDecoration(
                        color: warningBackground,
                        borderRadius: BorderRadius.circular(radiusSmall),
                      ),
                      child: Text(
                        badge!,
                        style: app_typography.labelSmall.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                          fontSize: 11,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

            // Trailing icon
            Icon(
              Icons.chevron_right,
              color: textSecondary,
              size: iconSizeMedium,
            ),
          ],
        ),
      ),
    );
  }
}
