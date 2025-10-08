import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../auth/session_controller.dart';
import '../config/app_environment.dart';
import '../navigation/app_router.dart';
import '../../features/onboarding/controllers/onboarding_controller.dart';
import '../services/leave_repository.dart';

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
        ProxyProvider3<SessionController, OnboardingController, LeaveRepositoryBase, AppRouter>(
          update: (_, sessionController, onboardingController, leaveRepository, __) =>
              AppRouter(
                sessionController: sessionController,
                onboardingController: onboardingController,
                leaveRepository: leaveRepository,
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

