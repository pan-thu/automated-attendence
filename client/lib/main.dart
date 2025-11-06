import 'dart:async';
import 'dart:io';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:firebase_storage/firebase_storage.dart';
import 'package:flutter/foundation.dart';
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

  // Connect to Firebase Emulators in development
  const useEmulators = bool.fromEnvironment('USE_EMULATORS', defaultValue: false);

  if (useEmulators) {
    try {
      // Allow overriding emulator host via dart-define for flexibility
      // Use 10.0.2.2 for Android emulator (maps to host's localhost)
      // Use localhost for iOS simulator/web
      const customHost = String.fromEnvironment('EMULATOR_HOST', defaultValue: '');
      final host = customHost.isNotEmpty
          ? customHost
          : (Platform.isAndroid ? '10.0.2.2' : 'localhost');

      // Connect to Auth emulator
      await FirebaseAuth.instance.useAuthEmulator(host, 9099);

      // Connect to Firestore emulator
      FirebaseFirestore.instance.useFirestoreEmulator(host, 8080);

      // Connect to Functions emulator
      FirebaseFunctions.instance.useFunctionsEmulator(host, 5001);

      // Connect to Storage emulator
      await FirebaseStorage.instance.useStorageEmulator(host, 9199);

      if (kDebugMode) {
        debugPrint('🔧 Connected to Firebase Emulators at $host');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('⚠️  Error connecting to emulators: $e');
      }
    }
  }

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

        return AppProviders(environment: widget.environment);
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