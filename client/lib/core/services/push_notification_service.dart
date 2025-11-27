import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';

import '../navigation/app_router.dart';
import 'telemetry_service.dart';

class PushNotificationService {
  PushNotificationService({FirebaseMessaging? messaging, TelemetryService? telemetry})
      : _messaging = messaging ?? FirebaseMessaging.instance,
        _telemetry = telemetry ?? TelemetryService();

  final FirebaseMessaging _messaging;
  final TelemetryService _telemetry;
  AppRouter? _router;
  bool _isInitialized = false;
  StreamSubscription<RemoteMessage>? _openedSubscription;

  Future<void> configure(AppRouter router) async {
    _router = router;
    if (_isInitialized) {
      return;
    }
    _isInitialized = true;

    _openedSubscription = FirebaseMessaging.onMessageOpenedApp.listen(_handleOpenedMessage);

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      _handleOpenedMessage(initialMessage);
    }
  }

  void _handleOpenedMessage(RemoteMessage message) {
    final router = _router;
    if (router == null) {
      _telemetry.recordEvent(
        'push_open_without_router',
        metadata: message.data,
      );
      return;
    }

    final route = message.data['route'] as String?;
    final category = message.data['category'] as String?;

    _telemetry.recordEvent(
      'push_notification_opened',
      metadata: {
        'route': route,
        'category': category,
        'messageId': message.messageId,
      }..removeWhere((_, value) => value == null),
    );

    if (route != null && route.isNotEmpty) {
      router.router.go(route);
      return;
    }

    if (category == 'penalty') {
      router.router.go(AppRoutePaths.penalties);
      return;
    }

    router.router.go(AppRoutePaths.notifications);
  }

  Future<void> dispose() async {
    await _openedSubscription?.cancel();
    _openedSubscription = null;
    _router = null;
    _isInitialized = false;
  }
}

