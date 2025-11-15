import 'package:flutter/material.dart';

import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// All/Unread toggle selector
///
/// Pill-shaped toggle between "All" and "Unread" options
/// Redesigned to match notification.png mockup
class ReadStatusToggle extends StatelessWidget {
  final bool showUnreadOnly;
  final ValueChanged<bool> onChanged;

  const ReadStatusToggle({
    super.key,
    required this.showUnreadOnly,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFFE8E8E8),
        borderRadius: BorderRadius.circular(radiusLarge * 2),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _ToggleOption(
            label: 'All',
            isSelected: !showUnreadOnly,
            onTap: () => onChanged(false),
          ),
          _ToggleOption(
            label: 'Unread',
            isSelected: showUnreadOnly,
            onTap: () => onChanged(true),
          ),
        ],
      ),
    );
  }
}

/// Individual toggle option
class _ToggleOption extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _ToggleOption({
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: paddingLarge * 1.5,
          vertical: paddingSmall,
        ),
        decoration: BoxDecoration(
          color: isSelected ? backgroundPrimary : Colors.transparent,
          borderRadius: BorderRadius.circular(radiusLarge * 2),
        ),
        child: Text(
          label,
          style: app_typography.bodyMedium.copyWith(
            fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
            color: isSelected ? textPrimary : textSecondary,
          ),
        ),
      ),
    );
  }
}
