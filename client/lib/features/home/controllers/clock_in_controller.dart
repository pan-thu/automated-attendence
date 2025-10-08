import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/services/clock_in_repository.dart';

class ClockInController extends ChangeNotifier {
  ClockInController({ClockInRepository? repository})
      : _repository = repository ?? ClockInRepository();

  final ClockInRepository _repository;

  bool _isLoading = false;
  String? _statusMessage;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  String? get statusMessage => _statusMessage;
  String? get errorMessage => _errorMessage;

  Future<bool> attemptClockIn() async {
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
    } on ClockInFailure catch (failure) {
      _statusMessage = null;
      _errorMessage = failure.message;
    } catch (error) {
      _statusMessage = null;
      _errorMessage = 'Clock-in failed: $error';
    } finally {
      _setLoading(false);
    }

    return didSucceed;
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

