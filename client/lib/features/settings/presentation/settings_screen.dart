import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../../core/controllers/preferences_controller.dart';
import '../../../core/navigation/app_router.dart';
import '../../../core/services/auth_repository.dart';
import '../../../core/services/company_settings_repository.dart';
import '../../../core/services/telemetry_service.dart';
import '../../../design_system/colors.dart';
import '../../../design_system/spacing.dart';
import '../../../design_system/styles.dart';
import '../../../design_system/typography.dart' as app_typography;
import '../../widgets/async_error_view.dart';
import '../../widgets/offline_notice.dart';
import '../models/company_settings.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({
    required this.repository,
    required this.preferencesController,
    super.key,
  });

  final CompanySettingsRepository repository;
  final PreferencesController preferencesController;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<CompanySettingsRepository>.value(value: repository),
        ChangeNotifierProvider<SettingsController>(
          create: (_) => SettingsController(
            repository: repository,
            preferencesController: preferencesController,
          )..initialise(),
        ),
      ],
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatelessWidget {
  const _SettingsView();

  @override
  Widget build(BuildContext context) {
    final controller = context.watch<SettingsController>();

    return Scaffold(
      backgroundColor: backgroundPrimary,
      appBar: AppBar(
        title: Text(
          'Profile',
          style: app_typography.headingMedium,
        ),
        backgroundColor: backgroundPrimary,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Refresh',
            onPressed: controller.isLoading ? null : () => controller.refresh(context),
          ),
        ],
      ),
      body: controller.isLoading && !controller.hasData
          ? const Center(child: CircularProgressIndicator())
          : controller.errorMessage != null && !controller.hasData
              ? AsyncErrorView(
                  message: controller.errorMessage!,
                  onRetry: () => controller.refresh(context),
                  onHelp: () => controller.openHelp(context),
                )
              : RefreshIndicator(
                  onRefresh: () => controller.refresh(context),
                  child: ListView(
                    padding: const EdgeInsets.all(24),
                    children: [
                      if (controller.isOffline)
                        OfflineNotice(
                          message: 'Showing cached company settings. Pull to refresh when you are back online.',
                          lastUpdated: controller.lastUpdated,
                          margin: const EdgeInsets.only(bottom: 24),
                          onRetry: () => controller.refresh(context),
                        ),
                      _PreferencesSection(controller: controller),
                      const SizedBox(height: 24),
                      if (controller.settings != null)
                        _CompanyInfoSection(settings: controller.settings!),
                      const SizedBox(height: 24),
                      if (controller.settings == null)
                        const _MissingSettingsSupport(),
                      if (controller.settings != null)
                        _HelpAndSupportSection(onOpenHelp: () => controller.openHelp(context)),
                      const SizedBox(height: 24),
                      _LogoutSection(onLogout: () => controller.logout(context)),
                      const SizedBox(height: 48),
                    ],
                  ),
                ),
    );
  }
}

class _PreferencesSection extends StatelessWidget {
  const _PreferencesSection({required this.controller});

  final SettingsController controller;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Preferences', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Theme'),
              trailing: DropdownButton<ThemeMode>(
                value: controller.preferences.themeMode,
                onChanged: controller.updateTheme,
                items: const [
                  DropdownMenuItem(value: ThemeMode.system, child: Text('System')),
                  DropdownMenuItem(value: ThemeMode.light, child: Text('Light')),
                  DropdownMenuItem(value: ThemeMode.dark, child: Text('Dark')),
                ],
              ),
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Language'),
              trailing: DropdownButton<Locale?>(
                value: controller.preferences.locale,
                onChanged: controller.updateLocale,
                items: const [
                  DropdownMenuItem(value: null, child: Text('System default')),
                  DropdownMenuItem(value: Locale('en'), child: Text('English')),
                  DropdownMenuItem(value: Locale('hi'), child: Text('Hindi')),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _CompanyInfoSection extends StatelessWidget {
  const _CompanyInfoSection({required this.settings});

  final CompanySettings settings;

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.decimalPattern();
    final timeWindows = settings.timeWindows.entries
        .map((entry) => '${entry.value.label} (${entry.value.start} – ${entry.value.end})')
        .toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Company Information', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            _InfoRow(label: 'Company', value: settings.companyName ?? 'Unknown'),
            _InfoRow(label: 'Timezone', value: settings.timezone ?? 'Unknown'),
            _InfoRow(
              label: 'Geofence radius',
              value: settings.geofenceRadiusMeters != null
                  ? '${formatter.format(settings.geofenceRadiusMeters)} m'
                  : 'n/a',
            ),
            _InfoRow(
              label: 'Geofence enforcement',
              value: settings.geoFencingEnabled ? 'Enabled' : 'Disabled',
            ),
            if (timeWindows.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Clock-in windows:'),
              const SizedBox(height: 4),
              ...timeWindows.map((window) => Text('• $window')),
            ],
            if (settings.penaltyRules.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text('Penalty rules:'),
              const SizedBox(height: 4),
              ...settings.penaltyRules.entries.map(
                (entry) {
                  final rule = entry.value;
                  final amount = rule.amount != null ? NumberFormat.currency(symbol: '₹').format(rule.amount) : 'n/a';
                  final threshold = rule.threshold != null ? '${rule.threshold} violations' : 'n/a';
                  return Text('• ${entry.key}: ${rule.description} (Threshold: $threshold, Amount: $amount)');
                },
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _HelpAndSupportSection extends StatelessWidget {
  const _HelpAndSupportSection({required this.onOpenHelp});

  final VoidCallback onOpenHelp;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Help & Support', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            const Text('• Need assistance? Read our troubleshooting guide or contact support.'),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: onOpenHelp,
              icon: const Icon(Icons.help_center),
              label: const Text('Troubleshooting tips'),
            ),
          ],
        ),
      ),
    );
  }
}

class _MissingSettingsSupport extends StatelessWidget {
  const _MissingSettingsSupport();

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Row(
              children: [
                Icon(Icons.info_outline),
                SizedBox(width: 8),
                Text('Configuration unavailable', style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
            SizedBox(height: 8),
            Text('We could not load company settings. Please try again later or contact support if the issue persists.'),
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: Theme.of(context).textTheme.bodyMedium),
          Text(value, style: Theme.of(context).textTheme.bodyMedium),
        ],
      ),
    );
  }
}

class _LogoutSection extends StatelessWidget {
  const _LogoutSection({required this.onLogout});

  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(paddingMedium),
      decoration: BoxDecoration(
        color: backgroundSecondary,
        borderRadius: BorderRadius.circular(radiusMedium),
        border: Border.all(color: borderColor, width: 1),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Account',
            style: app_typography.labelLarge.copyWith(
              fontWeight: FontWeight.w600,
              color: textPrimary,
            ),
          ),
          const SizedBox(height: space4),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(
              Icons.logout_rounded,
              color: errorBackground,
              size: iconSizeMedium,
            ),
            title: Text(
              'Logout',
              style: app_typography.bodyMedium.copyWith(
                color: errorBackground,
                fontWeight: FontWeight.w500,
              ),
            ),
            subtitle: Text(
              'Sign out of your account',
              style: app_typography.bodySmall.copyWith(
                color: textSecondary,
              ),
            ),
            onTap: onLogout,
            trailing: Icon(
              Icons.chevron_right,
              color: errorBackground,
            ),
          ),
        ],
      ),
    );
  }
}

class SettingsController extends ChangeNotifier {
  SettingsController({
    required this.repository,
    required this.preferencesController,
    TelemetryService? telemetry,
  }) : _telemetry = telemetry ?? TelemetryService();

  final CompanySettingsRepository repository;
  final PreferencesController preferencesController;
  final TelemetryService _telemetry;

  bool _isLoading = false;
  String? _errorMessage;
  CompanySettings? _settings;
  DateTime? _lastUpdated;
  bool _isOffline = false;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  CompanySettings? get settings => _settings;
  bool get hasData => _settings != null;
  PreferencesController get preferences => preferencesController;
  DateTime? get lastUpdated => _lastUpdated;
  bool get isOffline => _isOffline;

  Future<void> initialise() async {
    await loadSettings();
  }

  Future<void> refresh(BuildContext context) async {
    if (_isLoading) {
      return;
    }
    await loadSettings(forceRefresh: true);
  }

  Future<void> loadSettings({bool forceRefresh = false}) async {
    _setLoading(true);
    try {
      final cached = repository.readCached();
      if (!forceRefresh && cached != null) {
        _settings = cached.value;
        _lastUpdated = cached.updatedAt;
        _isOffline = true;
        notifyListeners();
        return;
      }

      _settings = await repository.fetchSettings(forceRefresh: forceRefresh);
      _errorMessage = null;
      _lastUpdated = DateTime.now();
      _isOffline = false;
    } catch (error) {
      _errorMessage = error.toString();
      _telemetry.recordEvent('settings_load_failed', metadata: {'error': error.toString()});
      final cached = repository.readCached();
      if (cached != null) {
        _settings = cached.value;
        _lastUpdated = cached.updatedAt;
        _isOffline = true;
      }
    } finally {
      _setLoading(false);
    }
  }

  Future<void> updateTheme(ThemeMode? mode) async {
    if (mode == null) {
      return;
    }
    await preferencesController.updateTheme(mode);
    _telemetry.recordEvent('settings_theme_changed', metadata: {'mode': mode.name});
  }

  Future<void> updateLocale(Locale? locale) async {
    await preferencesController.updateLocale(locale);
    _telemetry.recordEvent('settings_locale_changed', metadata: {'locale': locale?.languageCode});
  }

  void openHelp(BuildContext context) {
    _telemetry.recordEvent('settings_help_opened');
    showModalBottomSheet<void>(
      context: context,
      builder: (context) => const _HelpSheet(),
    );
  }

  Future<void> logout(BuildContext context) async {
    _telemetry.recordEvent('settings_logout_initiated');

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
        // Get auth repository from context
        final authRepo = Provider.of<AuthRepository>(context, listen: false);
        await authRepo.signOut();

        _telemetry.recordEvent('settings_logout_completed');

        if (context.mounted) {
          context.go(AppRoutePaths.login);
        }
      } catch (error) {
        _telemetry.recordEvent('settings_logout_failed', metadata: {'error': error.toString()});

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

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}

class _HelpSheet extends StatelessWidget {
  const _HelpSheet();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text('Troubleshooting', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 12),
          Text('• Pull to refresh if settings appear outdated or stale.'),
          SizedBox(height: 8),
          Text('• Clock-in windows and geofence values come directly from the admin dashboard.'),
          SizedBox(height: 8),
          Text('• Contact support if you notice incorrect penalty rules or missing company information.'),
        ],
      ),
    );
  }
}
