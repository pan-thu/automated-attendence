import 'package:go_router/go_router.dart';

import '../auth/session_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/onboarding/controllers/onboarding_controller.dart';

class AppRouter {
  AppRouter({required SessionController sessionController, required OnboardingController onboardingController})
      : _sessionController = sessionController,
        _onboardingController = onboardingController {
    router = GoRouter(
      initialLocation: AppRoutePaths.home,
      refreshListenable: Listenable.merge([_sessionController, _onboardingController]),
      debugLogDiagnostics: false,
      redirect: (context, state) {
        if (!_sessionController.isHydrated) {
          return null;
        }

        final isAuthenticated = _sessionController.isAuthenticated;
        final goingToLogin = state.matchedLocation == AppRoutePaths.login;
        final goingToOnboarding = state.matchedLocation == AppRoutePaths.onboarding;
        final needsOnboarding = _onboardingController.requiresOnboarding;

        if (!isAuthenticated && !goingToLogin) {
          return AppRoutePaths.login;
        }

        if (isAuthenticated && goingToLogin) {
          return needsOnboarding ? AppRoutePaths.onboarding : AppRoutePaths.home;
        }

        if (isAuthenticated && needsOnboarding && !goingToOnboarding) {
          return AppRoutePaths.onboarding;
        }

        if (isAuthenticated && !needsOnboarding && goingToOnboarding) {
          return AppRoutePaths.home;
        }

        return null;
      },
      routes: <GoRoute>[
        GoRoute(
          name: AppRoutePaths.login,
          path: AppRoutePaths.login,
          builder: (context, state) => const LoginScreen(),
        ),
        GoRoute(
          name: AppRoutePaths.onboarding,
          path: AppRoutePaths.onboarding,
          builder: (context, state) => const OnboardingScreen(),
        ),
        GoRoute(
          name: AppRoutePaths.home,
          path: AppRoutePaths.home,
          builder: (context, state) => const HomeScreen(),
        ),
      ],
    );
  }

  final SessionController _sessionController;
  final OnboardingController _onboardingController;
  late final GoRouter router;
}

class AppRoutePaths {
  AppRoutePaths._();

  static const String login = '/login';
  static const String onboarding = '/onboarding';
  static const String home = '/';
}

