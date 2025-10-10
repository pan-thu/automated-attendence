import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:synchronized/synchronized.dart';

import '../../../core/services/clock_in_repository.dart';
import '../../../core/services/telemetry_service.dart';

class ClockInController extends ChangeNotifier {
  ClockInController({ClockInRepository? repository, TelemetryService? telemetry})
      : _repository = repository ?? ClockInRepository(),
        _telemetry = telemetry ?? TelemetryService();

  final ClockInRepository _repository;
  final TelemetryService _telemetry;
  final Lock _lock = Lock(); // Bug Fix #11: Mutex for preventing race conditions

  bool _isLoading = false;
  String? _statusMessage;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get statusMessage => _statusMessage;
  String? get errorMessage => _errorMessage;

  /// Attempt to clock in with race condition protection
  /// Bug Fix #11: Use lock to prevent rapid successive clock-in attempts
  Future<bool> attemptClockIn() async {
    // Acquire lock - only one clock-in operation at a time
    return await _lock.synchronized(() async {
      // Double-check inside lock
      if (_isLoading) {
        return false;
      }

      _statusMessage = null;
      _errorMessage = null;
      _setLoading(true);
      var didSucceed = false;
      try {
      final position = await _determinePosition();
      final result = await _repository.clockIn(
        latitude: position.latitude,
        longitude: position.longitude,
      );

      _statusMessage = result.message;
      _errorMessage = null;
      didSucceed = true;
      _telemetry.recordEvent('clock_in_success', metadata: {
        'accuracy': position.accuracy,
        'latitude': position.latitude,
        'longitude': position.longitude,
      });
    } on ClockInFailure catch (failure) {
      _statusMessage = null;
      _errorMessage = failure.message;
      _telemetry.recordEvent('clock_in_failure', metadata: {'reason': failure.message});
      } catch (error) {
        _statusMessage = null;
        _errorMessage = 'Clock-in failed: $error';
        _telemetry.recordEvent('clock_in_failure', metadata: {'reason': error.toString()});
      } finally {
        _setLoading(false);
      }

      return didSucceed;
    });
  }

  Future<Position> _determinePosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw ClockInFailure('Location services are disabled.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw ClockInFailure('Location permission denied.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw ClockInFailure('Location permissions are permanently denied.');
    }

    return Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}

