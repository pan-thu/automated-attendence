import 'package:go_router/go_router.dart';
import 'package:flutter/foundation.dart';

import '../auth/session_controller.dart';
import '../controllers/preferences_controller.dart';
import '../services/company_settings_repository.dart';
import '../services/holiday_repository.dart';
import '../services/leave_repository.dart';
import '../services/notification_repository.dart';
import '../services/penalty_repository.dart';
import '../services/push_notification_service.dart';
import '../../features/attendance_history/presentation/attendance_history_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/holidays/presentation/holidays_screen.dart';
import '../../features/home/presentation/home_screen.dart';
import '../../features/leaves/presentation/leave_screen.dart';
import '../../features/leaves/presentation/submit_leave_screen.dart';
import '../../features/onboarding/presentation/onboarding_screen.dart';
import '../../features/onboarding/controllers/onboarding_controller.dart';
import '../../features/notifications/presentation/notifications_screen.dart';
import '../../features/penalties/presentation/penalties_screen.dart';
import '../../features/resources/presentation/resources_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/widgets/main_scaffold.dart';

class AppRouter {
  AppRouter({
    required SessionController sessionController,
    required OnboardingController onboardingController,
    required HolidayRepositoryBase holidayRepository,
    required LeaveRepositoryBase leaveRepository,
    required NotificationRepositoryBase notificationRepository,
    required PenaltyRepositoryBase penaltyRepository,
    required PushNotificationService pushNotificationService,
    required CompanySettingsRepository settingsRepository,
    required PreferencesController preferencesController,
  }) : _sessionController = sessionController,
       _onboardingController = onboardingController,
       _holidayRepository = holidayRepository,
       _leaveRepository = leaveRepository,
       _notificationRepository = notificationRepository,
       _penaltyRepository = penaltyRepository,
       _pushNotificationService = pushNotificationService,
       _settingsRepository = settingsRepository,
       _preferencesController = preferencesController {
    _pushNotificationService.configure(this);
    router = GoRouter(
      initialLocation: AppRoutePaths.home,
      refreshListenable: Listenable.merge([
        _sessionController,
        _onboardingController,
      ]),
      debugLogDiagnostics: false,
      redirect: (context, state) {
        if (!_sessionController.isHydrated) {
          return null;
        }

        final isAuthenticated = _sessionController.isAuthenticated;
        final goingToLogin = state.matchedLocation == AppRoutePaths.login;
        final goingToOnboarding =
            state.matchedLocation == AppRoutePaths.onboarding;
        final needsOnboarding = _onboardingController.requiresOnboarding;

        if (!isAuthenticated && !goingToLogin) {
          return AppRoutePaths.login;
        }

        if (isAuthenticated && goingToLogin) {
          return needsOnboarding
              ? AppRoutePaths.onboarding
              : AppRoutePaths.home;
        }

        if (isAuthenticated && needsOnboarding && !goingToOnboarding) {
          return AppRoutePaths.onboarding;
        }

        if (isAuthenticated && !needsOnboarding && goingToOnboarding) {
          return AppRoutePaths.home;
        }

        return null;
      },
      routes: <RouteBase>[
        // Auth routes (outside shell)
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

        // Main app shell with bottom navigation
        StatefulShellRoute.indexedStack(
          builder: (context, state, navigationShell) {
            return MainScaffold(navigationShell: navigationShell);
          },
          branches: [
            // Branch 0: Home
            StatefulShellBranch(
              routes: [
                GoRoute(
                  name: AppRoutePaths.home,
                  path: AppRoutePaths.home,
                  builder: (context, state) => const HomeScreen(),
                ),
              ],
            ),

            // Branch 1: Attendance
            StatefulShellBranch(
              routes: [
                GoRoute(
                  name: AppRoutePaths.attendance,
                  path: AppRoutePaths.attendance,
                  builder: (context, state) => const AttendanceHistoryScreen(),
                ),
              ],
            ),

            // Branch 2: Updates/Notifications
            StatefulShellBranch(
              routes: [
                GoRoute(
                  name: AppRoutePaths.notifications,
                  path: AppRoutePaths.notifications,
                  builder: (context, state) =>
                      NotificationsScreen(repository: _notificationRepository),
                ),
              ],
            ),

            // Branch 3: Resources
            StatefulShellBranch(
              routes: [
                GoRoute(
                  name: AppRoutePaths.resources,
                  path: AppRoutePaths.resources,
                  builder: (context, state) => ResourcesScreen(
                    penaltyRepository: _penaltyRepository,
                  ),
                ),
              ],
            ),

            // Branch 4: Profile/Settings
            StatefulShellBranch(
              routes: [
                GoRoute(
                  name: AppRoutePaths.settings,
                  path: AppRoutePaths.settings,
                  builder: (context, state) => SettingsScreen(
                    repository: _settingsRepository,
                    preferencesController: _preferencesController,
                  ),
                ),
              ],
            ),
          ],
        ),

        // Modal/push routes (outside bottom nav)
        GoRoute(
          name: AppRoutePaths.leaves,
          path: AppRoutePaths.leaves,
          builder: (context, state) => LeaveScreen(repository: _leaveRepository),
        ),
        GoRoute(
          name: AppRoutePaths.penalties,
          path: AppRoutePaths.penalties,
          builder: (context, state) =>
              PenaltiesScreen(repository: _penaltyRepository),
        ),
        GoRoute(
          name: AppRoutePaths.holidays,
          path: AppRoutePaths.holidays,
          builder: (context, state) => HolidaysScreen(repository: _holidayRepository),
        ),
        GoRoute(
          name: AppRoutePaths.submitLeave,
          path: AppRoutePaths.submitLeave,
          builder: (context, state) => SubmitLeaveScreen(repository: _leaveRepository),
        ),
      ],
    );
  }

  final SessionController _sessionController;
  final OnboardingController _onboardingController;
  final HolidayRepositoryBase _holidayRepository;
  final LeaveRepositoryBase _leaveRepository;
  final NotificationRepositoryBase _notificationRepository;
  final PenaltyRepositoryBase _penaltyRepository;
  final PushNotificationService _pushNotificationService;
  final CompanySettingsRepository _settingsRepository;
  final PreferencesController _preferencesController;
  late final GoRouter router;
}

class AppRoutePaths {
  AppRoutePaths._();

  // Auth routes
  static const String login = '/login';
  static const String onboarding = '/onboarding';

  // Bottom nav routes (main tabs)
  static const String home = '/';
  static const String attendance = '/attendance';
  static const String notifications = '/notifications';
  static const String resources = '/resources';
  static const String settings = '/settings';

  // Modal/push routes
  static const String leaves = '/leaves';
  static const String penalties = '/penalties';
  static const String holidays = '/holidays';
  static const String submitLeave = '/submit-leave';
}
