import 'package:flutter/material.dart';
import 'package:synchronized/synchronized.dart';

import '../../../core/services/clock_in_repository.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/telemetry_service.dart';

class ClockInController extends ChangeNotifier {
  ClockInController({
    ClockInRepository? repository,
    TelemetryService? telemetry,
    LocationService? locationService,
  })  : _repository = repository ?? ClockInRepository(),
        _telemetry = telemetry ?? TelemetryService(),
        _locationService = locationService ?? LocationService();

  final ClockInRepository _repository;
  final TelemetryService _telemetry;
  final LocationService _locationService;
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
        // Use shared location service
        final position = await _locationService.getCurrentPosition();
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
      } on LocationServiceException catch (error) {
        // Handle location service errors
        _statusMessage = null;
        _errorMessage = error.message;
        _telemetry.recordEvent('clock_in_failure', metadata: {'reason': error.message});
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

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}

