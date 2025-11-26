import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';

import '../auth/session_controller.dart';
import '../config/app_environment.dart';
import '../controllers/preferences_controller.dart';
import '../navigation/app_router.dart';
import '../services/company_settings_repository.dart';
import '../services/holiday_repository.dart';
import '../services/leave_repository.dart';
import '../services/notification_repository.dart';
import '../services/penalty_repository.dart';
import '../services/push_notification_service.dart';
import '../services/telemetry_service.dart';
import '../../design_system/theme.dart' as app_theme;
import '../../features/onboarding/controllers/onboarding_controller.dart';
import '../../features/notifications/controllers/notification_controller.dart';

Future<void> configureAppProviders({required AppEnvironment environment}) async {
  // Placeholder for async service initialization.
}

class AppProviders extends StatelessWidget {
  const AppProviders({required this.environment, super.key});

  final AppEnvironment environment;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: _buildProviders(),
      child: Consumer2<AppRouter, PreferencesController>(
        builder: (context, appRouter, preferences, _) => MaterialApp.router(
          title: 'AttenDesk',
          routerDelegate: appRouter.router.routerDelegate,
          routeInformationParser: appRouter.router.routeInformationParser,
          routeInformationProvider: appRouter.router.routeInformationProvider,
          themeMode: preferences.themeMode,
          theme: app_theme.lightTheme,
          darkTheme: app_theme.lightTheme, // TODO: Implement dark theme in future
        ),
      ),
    );
  }

  List<SingleChildWidget> _buildProviders() {
    return <SingleChildWidget>[
      Provider<TelemetryService>(create: (_) => TelemetryService()),
      ChangeNotifierProvider<SessionController>(
        create: (_) => SessionController()..hydrate(),
      ),
      ChangeNotifierProvider<PreferencesController>(
        create: (_) => PreferencesController()..hydrate(),
      ),
      ChangeNotifierProvider<OnboardingController>(
        create: (_) => OnboardingController(),
      ),
      Provider<HolidayRepositoryBase>(create: (_) => HolidayRepository()),
      Provider<LeaveRepositoryBase>(create: (_) => LeaveRepository()),
      Provider<NotificationRepositoryBase>(create: (_) => NotificationRepository()),
      ChangeNotifierProxyProvider<NotificationRepositoryBase, NotificationController>(
        create: (context) => NotificationController(
          repository: context.read<NotificationRepositoryBase>(),
        ),
        update: (context, repository, previous) =>
            previous ?? NotificationController(repository: repository),
      ),
      Provider<PenaltyRepositoryBase>(create: (_) => PenaltyRepository()),
      Provider<CompanySettingsRepository>(create: (_) => CompanySettingsRepository()),
      Provider<PushNotificationService>(create: (_) => PushNotificationService()),
      ProxyProvider6<
          SessionController,
          OnboardingController,
          HolidayRepositoryBase,
          LeaveRepositoryBase,
          NotificationRepositoryBase,
          PenaltyRepositoryBase,
          AppRouter>(
        update: (
          context,
          sessionController,
          onboardingController,
          holidayRepository,
          leaveRepository,
          notificationRepository,
          penaltyRepository,
          previous,
        ) =>
            AppRouter(
              sessionController: sessionController,
              onboardingController: onboardingController,
              holidayRepository: holidayRepository,
              leaveRepository: leaveRepository,
              notificationRepository: notificationRepository,
              penaltyRepository: penaltyRepository,
              pushNotificationService: context.read<PushNotificationService>(),
              settingsRepository: context.read<CompanySettingsRepository>(),
              preferencesController: context.read<PreferencesController>(),
            ),
      ),
    ];
  }
}

