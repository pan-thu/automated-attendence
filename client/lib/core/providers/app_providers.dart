import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/session_controller.dart';
import '../config/app_environment.dart';
import '../navigation/app_router.dart';
import '../../features/onboarding/controllers/onboarding_controller.dart';
import '../services/leave_repository.dart';
import '../services/notification_repository.dart';
import '../services/penalty_repository.dart';
import '../services/push_notification_service.dart';

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
        ChangeNotifierProvider<OnboardingController>(
          create: (_) => OnboardingController(),
        ),
        Provider<LeaveRepositoryBase>(create: (_) => LeaveRepository()),
        Provider<NotificationRepositoryBase>(create: (_) => NotificationRepository()),
        Provider<PenaltyRepositoryBase>(create: (_) => PenaltyRepository()),
        Provider<PushNotificationService>(create: (_) => PushNotificationService()),
        ProxyProvider5<
            SessionController,
            OnboardingController,
            LeaveRepositoryBase,
            NotificationRepositoryBase,
            PenaltyRepositoryBase,
            PushNotificationService,
            AppRouter>(
          update: (
            _,
            sessionController,
            onboardingController,
            leaveRepository,
            notificationRepository,
            penaltyRepository,
            pushService,
            __,
          ) =>
              AppRouter(
                sessionController: sessionController,
                onboardingController: onboardingController,
                leaveRepository: leaveRepository,
                notificationRepository: notificationRepository,
                penaltyRepository: penaltyRepository,
                pushNotificationService: pushService,
              ),
        ),
      ],
      child: Consumer<AppRouter>(
        builder: (context, appRouter, _) => MaterialApp.router(
          title: 'Attendance App',
          routerDelegate: appRouter.router.routerDelegate,
          routeInformationParser: appRouter.router.routeInformationParser,
          routeInformationProvider: appRouter.router.routeInformationProvider,
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
            useMaterial3: true,
          ),
        ),
      ),
    );
  }
}

