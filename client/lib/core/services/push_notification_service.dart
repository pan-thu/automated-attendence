import 'dart:async';

import 'package:firebase_messaging/firebase_messaging.dart';

import '../navigation/app_router.dart';

class PushNotificationService {
  PushNotificationService({FirebaseMessaging? messaging})
      : _messaging = messaging ?? FirebaseMessaging.instance;

  final FirebaseMessaging _messaging;
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
      return;
    }

    final route = message.data['route'] as String?;
    final category = message.data['category'] as String?;

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

