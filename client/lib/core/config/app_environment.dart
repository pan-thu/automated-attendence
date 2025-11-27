class AppEnvironment {
  AppEnvironment()
      : flavor = const String.fromEnvironment('APP_FLAVOR', defaultValue: 'dev'),
        apiBaseUrl = const String.fromEnvironment('API_BASE_URL', defaultValue: ''),
        sentryDsn = const String.fromEnvironment('SENTRY_DSN', defaultValue: '');

  final String flavor;
  final String apiBaseUrl;
  final String sentryDsn;

  bool get isProduction => flavor.toLowerCase() == 'prod' || flavor.toLowerCase() == 'production';
  bool get isStaging => flavor.toLowerCase() == 'staging';
  bool get isDevelopment => !isProduction && !isStaging;
}

