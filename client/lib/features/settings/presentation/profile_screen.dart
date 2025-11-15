import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/auth/session_controller.dart';
import '../../../core/controllers/preferences_controller.dart';
import '../../../core/navigation/app_router.dart';
import '../../../core/services/auth_repository.dart';
import '../../../core/services/telemetry_service.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/typography.dart' as app_typography;

/// Profile screen with user information and settings
///
/// Features:
/// - Profile header with avatar
/// - Quick stats overview
/// - Settings and preferences
/// - Account actions
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({
    required this.preferencesController,
    super.key,
  });

  final PreferencesController preferencesController;

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<ProfileController>(
      create: (_) => ProfileController(
        preferencesController: preferencesController,
      ),
      child: const _ProfileView(),
    );
  }
}

class _ProfileView extends StatelessWidget {
  const _ProfileView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<ProfileController>();
    final session = context.watch<SessionController>();
    final user = session.user;

    return Scaffold(
      backgroundColor: backgroundPrimary,
      body: CustomScrollView(
        slivers: [
          // Gradient app bar with profile info
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: const Color(0xFF667eea),
            flexibleSpace: FlexibleSpaceBar(
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF667eea), Color(0xFF764ba2)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
                child: SafeArea(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const SizedBox(height: space8),
                      // Avatar
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white,
                            width: 3,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.2),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CircleAvatar(
                          radius: 38,
                          backgroundColor: Colors.white,
                          backgroundImage: user?.photoURL != null
                              ? NetworkImage(user!.photoURL!)
                              : null,
                          child: user?.photoURL == null
                              ? Icon(
                                  Icons.person,
                                  size: 40,
                                  color: const Color(0xFF667eea),
                                )
                              : null,
                        ),
                      ),
                      const SizedBox(height: space3),
                      // Name
                      Text(
                        user?.displayName ?? user?.email?.split('@').first ?? 'User',
                        style: app_typography.headingMedium.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: space1),
                      // Email
                      Text(
                        user?.email ?? '',
                        style: app_typography.bodyMedium.copyWith(
                          color: Colors.white.withOpacity(0.9),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Content
          SliverPadding(
            padding: const EdgeInsets.all(paddingLarge),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Quick stats
                const Text(
                  'Quick Stats',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: space4),
                Row(
                  children: [
                    Expanded(
                      child: _QuickStatCard(
                        label: 'Attendance',
                        value: '95%',
                        icon: Icons.check_circle,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF56ab2f), Color(0xFFa8e063)],
                        ),
                      ),
                    ),
                    const SizedBox(width: gapMedium),
                    Expanded(
                      child: _QuickStatCard(
                        label: 'Leaves',
                        value: '3',
                        icon: Icons.beach_access,
                        gradient: const LinearGradient(
                          colors: [Color(0xFF4facfe), Color(0xFF00f2fe)],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: space8),

                // Settings section
                const Text(
                  'Settings',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: space4),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                  ),
                  child: Column(
                    children: [
                      _SettingsTile(
                        icon: Icons.dark_mode,
                        title: 'Theme',
                        trailing: DropdownButton<ThemeMode>(
                          value: controller.preferences.themeMode,
                          onChanged: controller.updateTheme,
                          underline: const SizedBox(),
                          items: const [
                            DropdownMenuItem(
                              value: ThemeMode.system,
                              child: Text('System'),
                            ),
                            DropdownMenuItem(
                              value: ThemeMode.light,
                              child: Text('Light'),
                            ),
                            DropdownMenuItem(
                              value: ThemeMode.dark,
                              child: Text('Dark'),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, indent: 56, endIndent: 16),
                      _SettingsTile(
                        icon: Icons.language,
                        title: 'Language',
                        trailing: DropdownButton<Locale?>(
                          value: controller.preferences.locale,
                          onChanged: controller.updateLocale,
                          underline: const SizedBox(),
                          items: const [
                            DropdownMenuItem(
                              value: null,
                              child: Text('System'),
                            ),
                            DropdownMenuItem(
                              value: Locale('en'),
                              child: Text('English'),
                            ),
                            DropdownMenuItem(
                              value: Locale('hi'),
                              child: Text('Hindi'),
                            ),
                          ],
                        ),
                      ),
                      const Divider(height: 1, indent: 56, endIndent: 16),
                      _SettingsTile(
                        icon: Icons.notifications,
                        title: 'Notifications',
                        trailing: Switch(
                          value: true,
                          onChanged: (value) {
                            // TODO: Implement notification toggle
                          },
                          activeColor: const Color(0xFF667eea),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: space8),

                // Account section
                const Text(
                  'Account',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: textPrimary,
                  ),
                ),
                const SizedBox(height: space4),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(radiusLarge * 1.5),
                  ),
                  child: Column(
                    children: [
                      _SettingsTile(
                        icon: Icons.person_outline,
                        title: 'Edit Profile',
                        subtitle: 'Update your personal information',
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          // TODO: Navigate to edit profile
                        },
                      ),
                      const Divider(height: 1, indent: 56, endIndent: 16),
                      _SettingsTile(
                        icon: Icons.lock_outline,
                        title: 'Change Password',
                        subtitle: 'Update your account password',
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () {
                          // TODO: Navigate to change password
                        },
                      ),
                      const Divider(height: 1, indent: 56, endIndent: 16),
                      _SettingsTile(
                        icon: Icons.help_outline,
                        title: 'Help & Support',
                        subtitle: 'Get help and contact support',
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => controller.openHelp(context),
                      ),
                      const Divider(height: 1, indent: 56, endIndent: 16),
                      _SettingsTile(
                        icon: Icons.logout_rounded,
                        title: 'Logout',
                        subtitle: 'Sign out of your account',
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => controller.logout(context),
                        iconColor: errorBackground,
                        textColor: errorBackground,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: space8),

                // App version
                Center(
                  child: Text(
                    'Version 1.0.0',
                    style: app_typography.bodySmall.copyWith(
                      color: textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: space8),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

/// Quick stat card widget
class _QuickStatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Gradient gradient;

  const _QuickStatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.gradient,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        gradient: gradient,
        borderRadius: BorderRadius.circular(radiusLarge * 1.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 8,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            icon,
            color: Colors.white.withOpacity(0.9),
            size: iconSizeMedium,
          ),
          const SizedBox(height: space2),
          Text(
            value,
            style: app_typography.headingLarge.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 28,
            ),
          ),
          Text(
            label,
            style: app_typography.bodySmall.copyWith(
              color: Colors.white.withOpacity(0.9),
            ),
          ),
        ],
      ),
    );
  }
}

/// Settings tile widget
class _SettingsTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final Color? iconColor;
  final Color? textColor;

  const _SettingsTile({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.iconColor,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(
        icon,
        color: iconColor ?? textPrimary,
        size: iconSizeMedium,
      ),
      title: Text(
        title,
        style: app_typography.bodyLarge.copyWith(
          fontWeight: FontWeight.w600,
          color: textColor ?? textPrimary,
        ),
      ),
      subtitle: subtitle != null
          ? Text(
              subtitle!,
              style: app_typography.bodySmall.copyWith(
                color: textSecondary,
              ),
            )
          : null,
      trailing: trailing,
      onTap: onTap,
    );
  }
}

/// Profile controller
class ProfileController extends ChangeNotifier {
  ProfileController({
    required this.preferencesController,
    TelemetryService? telemetry,
  }) : _telemetry = telemetry ?? TelemetryService();

  final PreferencesController preferencesController;
  final TelemetryService _telemetry;

  PreferencesController get preferences => preferencesController;

  Future<void> updateTheme(ThemeMode? mode) async {
    if (mode == null) return;
    await preferencesController.updateTheme(mode);
    _telemetry.recordEvent('profile_theme_changed', metadata: {'mode': mode.name});
  }

  Future<void> updateLocale(Locale? locale) async {
    await preferencesController.updateLocale(locale);
    _telemetry.recordEvent('profile_locale_changed', metadata: {'locale': locale?.languageCode});
  }

  void openHelp(BuildContext context) {
    _telemetry.recordEvent('profile_help_opened');
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(paddingXLarge),
        decoration: const BoxDecoration(
          color: backgroundPrimary,
          borderRadius: BorderRadius.vertical(top: Radius.circular(radiusXLarge)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  Icons.help_outline,
                  color: const Color(0xFF667eea),
                  size: iconSizeLarge,
                ),
                const SizedBox(width: gapMedium),
                Text(
                  'Help & Support',
                  style: app_typography.headingMedium.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: space6),
            const Text('• Need assistance? Contact your HR department'),
            const SizedBox(height: space3),
            const Text('• For technical issues, reach out to IT support'),
            const SizedBox(height: space3),
            const Text('• Check company policies in the employee handbook'),
            const SizedBox(height: space6),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                onPressed: () => Navigator.of(context).pop(),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF667eea),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(radiusLarge),
                  ),
                ),
                child: const Text('Got it'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> logout(BuildContext context) async {
    _telemetry.recordEvent('profile_logout_initiated');

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          'Logout',
          style: app_typography.headingSmall,
        ),
        content: Text(
          'Are you sure you want to logout?',
          style: app_typography.bodyMedium,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(
              'Cancel',
              style: app_typography.labelMedium.copyWith(
                color: textSecondary,
              ),
            ),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: ButtonStyle(
              backgroundColor: WidgetStatePropertyAll(errorBackground),
            ),
            child: Text(
              'Logout',
              style: app_typography.labelMedium.copyWith(
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      try {
        final authRepo = Provider.of<AuthRepository>(context, listen: false);
        await authRepo.signOut();

        _telemetry.recordEvent('profile_logout_completed');

        if (context.mounted) {
          context.go(AppRoutePaths.login);
        }
      } catch (error) {
        _telemetry.recordEvent('profile_logout_failed', metadata: {'error': error.toString()});

        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Logout failed: $error'),
              backgroundColor: errorBackground,
            ),
          );
        }
      }
    }
  }
}
