import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/session_controller.dart';
import '../config/app_environment.dart';
import '../controllers/preferences_controller.dart';
import '../navigation/app_router.dart';
import '../services/company_settings_repository.dart';
import '../services/leave_repository.dart';
import '../services/notification_repository.dart';
import '../services/penalty_repository.dart';
import '../services/push_notification_service.dart';
import '../../features/onboarding/controllers/onboarding_controller.dart';

Future<void> configureAppProviders({required AppEnvironment environment}) async {
  // Placeholder for async service initialization.
}

class ProviderScope extends StatelessWidget {
  const ProviderScope({required this.environment, super.key});

  final AppEnvironment environment;

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<SessionController>(
          create: (_) => SessionController()..hydrate(),
        ),
        ChangeNotifierProvider<PreferencesController>(
          create: (_) => PreferencesController()..hydrate(),
        ),
        ChangeNotifierProvider<OnboardingController>(
          create: (_) => OnboardingController(),
        ),
        Provider<LeaveRepositoryBase>(create: (_) => LeaveRepository()),
        Provider<NotificationRepositoryBase>(create: (_) => NotificationRepository()),
        Provider<PenaltyRepositoryBase>(create: (_) => PenaltyRepository()),
        Provider<CompanySettingsRepository>(create: (_) => CompanySettingsRepository()),
        Provider<PushNotificationService>(create: (_) => PushNotificationService()),
        ProxyProvider6<
            SessionController,
            OnboardingController,
            LeaveRepositoryBase,
            NotificationRepositoryBase,
            PenaltyRepositoryBase,
            PushNotificationService,
            AppRouter>(
          update: (
            context,
            sessionController,
            onboardingController,
            leaveRepository,
            notificationRepository,
            penaltyRepository,
            pushService,
            previous,
          ) =>
              AppRouter(
                sessionController: sessionController,
                onboardingController: onboardingController,
                leaveRepository: leaveRepository,
                notificationRepository: notificationRepository,
                penaltyRepository: penaltyRepository,
                pushNotificationService: pushService,
                settingsRepository: context.read<CompanySettingsRepository>(),
                preferencesController: context.read<PreferencesController>(),
              ),
        ),
      ],
      child: Consumer2<AppRouter, PreferencesController>(
        builder: (context, appRouter, preferences, _) => MaterialApp.router(
          title: 'Attendance App',
          routerDelegate: appRouter.router.routerDelegate,
          routeInformationParser: appRouter.router.routeInformationParser,
          routeInformationProvider: appRouter.router.routeInformationProvider,
          themeMode: preferences.themeMode,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
            useMaterial3: true,
          ),
          darkTheme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple, brightness: Brightness.dark),
            useMaterial3: true,
          ),
        ),
      ),
    );
  }
}

