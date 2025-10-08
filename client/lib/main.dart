import 'dart:async';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';

import 'core/config/app_environment.dart';
import 'core/providers/app_providers.dart';
import 'firebase_options.dart';

Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final appEnvironment = AppEnvironment();

  runApp(AppBootstrap(environment: appEnvironment));
}

class AppBootstrap extends StatefulWidget {
  const AppBootstrap({required this.environment, super.key});

  final AppEnvironment environment;

  @override
  State<AppBootstrap> createState() => _AppBootstrapState();
}

class _AppBootstrapState extends State<AppBootstrap> {
  late final Future<void> _initialization;

  @override
  void initState() {
    super.initState();
    _initialization = _bootstrap();
  }

  Future<void> _bootstrap() async {
    await configureAppProviders(environment: widget.environment);
    await FirebaseMessaging.instance.setAutoInitEnabled(true);
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<void>(
      future: _initialization,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const MaterialApp(home: SplashScreen());
        }

        return ProviderScope(environment: widget.environment);
      },
    );
  }
}

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}