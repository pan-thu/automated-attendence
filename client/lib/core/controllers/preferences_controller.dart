import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../services/telemetry_service.dart';

class PreferencesController extends ChangeNotifier {
  PreferencesController({SharedPreferences? preferences, TelemetryService? telemetry})
      : _telemetry = telemetry ?? TelemetryService(),
        _prefsFuture = preferences != null ? Future.value(preferences) : SharedPreferences.getInstance();

  final TelemetryService _telemetry;
  final Future<SharedPreferences> _prefsFuture;

  ThemeMode _themeMode = ThemeMode.system;
  Locale? _locale;
  bool _hydrated = false;

  ThemeMode get themeMode => _themeMode;
  Locale? get locale => _locale;
  bool get isHydrated => _hydrated;

  Future<void> hydrate() async {
    final prefs = await _prefsFuture;
    final themeName = prefs.getString(_Keys.themeMode);
    final localeCode = prefs.getString(_Keys.locale);

    _themeMode = _parseTheme(themeName) ?? ThemeMode.system;
    _locale = localeCode != null ? Locale(localeCode) : null;
    _hydrated = true;
    notifyListeners();
  }

  Future<void> updateTheme(ThemeMode mode) async {
    if (_themeMode == mode) {
      return;
    }
    _themeMode = mode;
    notifyListeners();

    final prefs = await _prefsFuture;
    await prefs.setString(_Keys.themeMode, mode.name);
    _telemetry.recordEvent('theme_mode_changed', metadata: {'mode': mode.name});
  }

  Future<void> updateLocale(Locale? locale) async {
    if (_locale == locale) {
      return;
    }
    _locale = locale;
    notifyListeners();

    final prefs = await _prefsFuture;
    if (locale == null) {
      await prefs.remove(_Keys.locale);
    } else {
      await prefs.setString(_Keys.locale, locale.languageCode);
    }
    _telemetry.recordEvent('locale_changed', metadata: {'locale': locale?.languageCode});
  }

  ThemeMode? _parseTheme(String? name) {
    if (name == null) {
      return null;
    }
    return ThemeMode.values.firstWhere(
      (mode) => mode.name == name,
      orElse: () => ThemeMode.system,
    );
  }
}

class _Keys {
  static const String themeMode = 'preferences.theme_mode';
  static const String locale = 'preferences.locale';
}

