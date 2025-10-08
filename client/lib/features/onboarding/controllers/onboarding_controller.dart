import 'dart:async';

import 'dart:io';

import 'package:device_info_plus/device_info_plus.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/services/device_token_repository.dart';

class OnboardingController extends ChangeNotifier {
  OnboardingController({DeviceTokenRepository? deviceTokenRepository})
      : _deviceTokenRepository = deviceTokenRepository ?? DeviceTokenRepository();

  final DeviceTokenRepository _deviceTokenRepository;

  bool _locationGranted = false;
  bool _notificationsGranted = false;
  bool _isRegisteringToken = false;
  bool _isCompleted = false;
  String? _errorMessage;

  bool get locationGranted => _locationGranted;
  bool get notificationsGranted => _notificationsGranted;
  bool get isRegisteringToken => _isRegisteringToken;
  bool get isCompleted => _isCompleted;
  String? get errorMessage => _errorMessage;
  bool get requiresOnboarding => !_isCompleted || !_locationGranted || !_notificationsGranted;

  Future<void> loadStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _locationGranted = prefs.getBool(_locationGrantedKey) ?? false;
    _notificationsGranted = prefs.getBool(_notificationsGrantedKey) ?? false;
    _isCompleted = prefs.getBool(_completedKey) ?? false;
    notifyListeners();
  }

  Future<void> requestLocationPermission() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      _errorMessage = 'Enable location services to clock in.';
      notifyListeners();
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    if (permission == LocationPermission.deniedForever) {
      _locationGranted = false;
      _errorMessage = 'Location permissions are permanently denied. Open settings to enable them.';
    } else {
      _locationGranted = permission == LocationPermission.always || permission == LocationPermission.whileInUse;
      _errorMessage = null;
    }

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_locationGrantedKey, _locationGranted);
    notifyListeners();
  }

  Future<void> requestNotificationPermission() async {
    final messaging = FirebaseMessaging.instance;
    final settings = await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
    );

    _notificationsGranted = settings.authorizationStatus == AuthorizationStatus.authorized ||
        settings.authorizationStatus == AuthorizationStatus.provisional;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_notificationsGrantedKey, _notificationsGranted);
    notifyListeners();
  }

  Future<void> registerDeviceToken({required String? userId, VoidCallback? onSuccess}) async {
    if (userId == null || userId.isEmpty) {
      _errorMessage = 'Unable to register device: no user session.';
      notifyListeners();
      return;
    }

    if (!_locationGranted || !_notificationsGranted) {
      _errorMessage = 'Complete permissions before registering your device.';
      notifyListeners();
      return;
    }

    _setRegistering(true);
    try {
      final fcmToken = await FirebaseMessaging.instance.getToken();
      if (fcmToken == null || fcmToken.isEmpty) {
        throw Exception('Unable to retrieve device token.');
      }

      final deviceInfo = DeviceInfoPlugin();
      String deviceId = 'unknown-device';
      String platform = 'unknown';

      if (Platform.isAndroid) {
        final info = await deviceInfo.androidInfo;
        deviceId = info.id ?? info.model ?? 'android-device';
        platform = 'android';
      } else if (Platform.isIOS) {
        final info = await deviceInfo.iosInfo;
        deviceId = info.identifierForVendor ?? 'ios-device';
        platform = 'ios';
      }

      await _deviceTokenRepository.registerDeviceToken(
        userId: userId,
        token: fcmToken,
        deviceId: deviceId,
        platform: platform,
      );

      final prefs = await SharedPreferences.getInstance();
      await prefs.setBool(_completedKey, true);
      _isCompleted = true;
      _errorMessage = null;
      onSuccess?.call();
    } catch (error) {
      _errorMessage = 'Failed to register device: $error';
    } finally {
      _setRegistering(false);
    }
  }

  void _setRegistering(bool value) {
    if (_isRegisteringToken == value) {
      return;
    }
    _isRegisteringToken = value;
    notifyListeners();
  }

  static const String _locationGrantedKey = 'onboarding_location_granted';
  static const String _notificationsGrantedKey = 'onboarding_notifications_granted';
  static const String _completedKey = 'onboarding_completed';
}

