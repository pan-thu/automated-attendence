import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../../core/services/penalty_repository.dart';
import '../../../core/navigation/app_router.dart';

/// Resources screen - navigation hub for secondary features
///
/// Provides access to:
/// - Leave Request
/// - Penalties (with summary badge)
/// - Holiday List
///
/// Redesigned to match resources.png mockup
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
          style: app_typography.headingLarge.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.all(paddingLarge),
        children: [
          // Leaves
          ResourceMenuItem(
            icon: Icons.calendar_today,
            title: 'Leaves',
            subtitle: 'View balance and apply leave',
            onTap: () {
              context.push(AppRoutePaths.leaves);
            },
          ),
          const SizedBox(height: gapMedium),

          // Penalties with summary badge
          _isLoadingSummary
              ? ResourceMenuItem(
                  icon: Icons.warning,
                  title: 'Penalties',
                  subtitle: 'View penalties',
                  onTap: () {
                    context.push(AppRoutePaths.penalties);
                  },
                )
              : ResourceMenuItem(
                  icon: Icons.warning,
                  title: 'Penalties',
                  subtitle: 'View penalties',
                  badgeLines: _penaltySummary != null &&
                          _penaltySummary!.activeCount > 0
                      ? [
                          '${_penaltySummary!.activeCount} active',
                          '\$${_penaltySummary!.totalAmount.toStringAsFixed(0)} total',
                        ]
                      : null,
                  onTap: () {
                    context.push(AppRoutePaths.penalties);
                  },
                ),
          const SizedBox(height: gapMedium),

          // Holiday List
          ResourceMenuItem(
            icon: Icons.calendar_month,
            title: 'Holiday List',
            subtitle: 'View upcoming holidays',
            onTap: () {
              context.push(AppRoutePaths.holidays);
            },
          ),
        ],
      ),
    );
  }
}

/// Resource menu item widget
///
/// Redesigned to match resources.png mockup:
/// - Gray background
/// - Black icon (no colored container)
/// - Badge shown on right side
class ResourceMenuItem extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String>? badgeLines;
  final VoidCallback onTap;

  const ResourceMenuItem({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
    this.badgeLines,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(radiusLarge * 1.5),
      child: Container(
        padding: const EdgeInsets.all(paddingMedium),
        decoration: BoxDecoration(
          color: const Color(0xFFE8E8E8),
          borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        ),
        child: Row(
          children: [
            // Icon with green background
            Container(
              width: 50,
              height: 50,
              decoration: BoxDecoration(
                color: const Color(0xFF4CAF50).withOpacity(0.1),
                borderRadius: BorderRadius.circular(radiusMedium),
              ),
              child: Icon(
                icon,
                color: const Color(0xFF4CAF50),
                size: 28,
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
                    style: app_typography.bodyLarge.copyWith(
                      fontWeight: FontWeight.w600,
                      color: textPrimary,
                    ),
                  ),
                  const SizedBox(height: space1),
                  Text(
                    subtitle,
                    style: app_typography.bodyMedium.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ],
              ),
            ),

            // Badge (if provided) or chevron
            if (badgeLines != null && badgeLines!.isNotEmpty) ...[
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  for (final line in badgeLines!) ...[
                    Text(
                      line,
                      style: app_typography.bodySmall.copyWith(
                        color: textSecondary,
                      ),
                    ),
                    if (line != badgeLines!.last) const SizedBox(height: space1),
                  ],
                ],
              ),
              const SizedBox(width: gapSmall),
            ],

            // Trailing chevron
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
