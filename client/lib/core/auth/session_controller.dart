import 'dart:async';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SessionController extends ChangeNotifier {
  SessionController({FirebaseAuth? firebaseAuth, FlutterSecureStorage? secureStorage})
      : _firebaseAuth = firebaseAuth ?? FirebaseAuth.instance,
        _secureStorage = secureStorage ?? const FlutterSecureStorage();

  final FirebaseAuth _firebaseAuth;
  final FlutterSecureStorage _secureStorage;

  bool _isHydrated = false;
  User? _user;
  Map<String, dynamic> _claims = {};
  bool _onboardingCompleted = false;

  bool get isHydrated => _isHydrated;
  bool get isAuthenticated => _user != null && _claims['role'] == 'employee';
  bool get isOnboardingCompleted => _onboardingCompleted;
  User? get user => _user;
  Map<String, dynamic> get claims => Map.unmodifiable(_claims);

  Future<void> hydrate() async {
    _authSubscription?.cancel();
    _authSubscription = _firebaseAuth.authStateChanges().listen((firebaseUser) async {
      _isHydrated = true;
      _user = firebaseUser;

      if (firebaseUser != null) {
        final idTokenResult = await firebaseUser.getIdTokenResult(true);
        _claims = Map<String, dynamic>.from(idTokenResult.claims ?? {});
        await _secureStorage.write(key: _sessionTokenKey, value: idTokenResult.token);
        final prefs = await SharedPreferences.getInstance();
        _onboardingCompleted = prefs.getBool(_onboardingCompletedKey) ?? false;
      } else {
        _claims = {};
        await _secureStorage.delete(key: _sessionTokenKey);
        _onboardingCompleted = false;
      }

      notifyListeners();
    });
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
    await _secureStorage.delete(key: _sessionTokenKey);
    _user = null;
    _claims = {};
    _onboardingCompleted = false;
    notifyListeners();
  }

  Future<void> markOnboardingComplete() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_onboardingCompletedKey, true);
    _onboardingCompleted = true;
    notifyListeners();
  }

  Future<void> refreshUser() async {
    final currentUser = _firebaseAuth.currentUser;
    if (currentUser != null) {
      await currentUser.reload();
      _user = _firebaseAuth.currentUser;
      final idTokenResult = await currentUser.getIdTokenResult(true);
      _claims = Map<String, dynamic>.from(idTokenResult.claims ?? {});
      notifyListeners();
    }
  }

  StreamSubscription<User?>? _authSubscription;

  static const String _sessionTokenKey = 'session_token';
  static const String _onboardingCompletedKey = 'onboarding_completed';

  /// Bug Fix #13: Properly dispose of auth subscription to prevent memory leak
  @override
  void dispose() {
    _authSubscription?.cancel();
    super.dispose();
  }
}

