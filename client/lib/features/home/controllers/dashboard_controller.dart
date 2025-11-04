import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../../../core/data/cache_manager.dart';
import '../../../core/services/dashboard_repository.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/telemetry_service.dart';

class DashboardController extends ChangeNotifier {
  DashboardController({
    DashboardRepository? repository,
    CacheManager<DashboardSummary>? cache,
    TelemetryService? telemetry,
    LocationService? locationService,
  })  : _repository = repository ?? DashboardRepository(),
        _cache = cache ?? CacheManager<DashboardSummary>(ttl: const Duration(minutes: 2)),
        _telemetry = telemetry ?? TelemetryService(),
        _locationService = locationService ?? LocationService();

  final DashboardRepository _repository;
  final CacheManager<DashboardSummary> _cache;
  final TelemetryService _telemetry;
  final LocationService _locationService;

  bool _isLoading = false;
  String? _errorMessage;
  DashboardSummary? _summary;
  bool _isOffline = false;
  DateTime? _summaryUpdatedAt;
  bool _disposed = false;

  // Location state
  Position? _userPosition;
  double? _distanceToOffice;
  bool _isWithinGeofence = false;
  bool _isLoadingLocation = false;
  String? _locationError;
  Timer? _locationUpdateTimer;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DashboardSummary? get summary => _summary;
  bool get isOffline => _isOffline;
  DateTime? get summaryUpdatedAt => _summaryUpdatedAt;

  // Location getters
  Position? get userPosition => _userPosition;
  double? get distanceToOffice => _distanceToOffice;
  bool get isWithinGeofence => _isWithinGeofence;
  bool get isLoadingLocation => _isLoadingLocation;
  String? get locationError => _locationError;

  Future<void> loadDashboard({DateTime? date}) async {
    if (_disposed) return;

    _setLoading(true);
    try {
      final cached = _cache.read(_cacheKey(date));
      if (cached != null && !_disposed) {
        _summary = cached.value;
        _errorMessage = null;
        _isOffline = false;
        _summaryUpdatedAt = cached.updatedAt;
        _safeNotifyListeners();
      }

      final summary = await _repository.fetchDashboard(date: date);
      if (_disposed) return;

      _summary = summary;
      _errorMessage = null;
      _isOffline = false;
      _cache.write(_cacheKey(date), summary);
      _summaryUpdatedAt = DateTime.now();
    } catch (error) {
      if (_disposed) return;

      _errorMessage = error.toString();
      final cached = _cache.read(_cacheKey(date));
      if (cached != null) {
        _summary = cached.value;
        _summaryUpdatedAt = cached.updatedAt;
      }
      _isOffline = _summary != null;
      if (_isOffline) {
        _telemetry.recordEvent('dashboard_load_offline', metadata: {'error': error.toString()});
      }
    } finally {
      _setLoading(false);
    }
  }

  Future<void> refreshDashboard() async {
    await loadDashboard();
    await updateLocation(); // Also refresh location
  }

  /// Update user location and calculate distance to office
  Future<void> updateLocation() async {
    if (_disposed || _summary == null) return;

    final geofence = _summary!.companySettings.geofence;
    if (geofence == null || geofence.isEmpty) {
      // No geofence configured
      return;
    }

    _setLoadingLocation(true);
    _locationError = null;

    try {
      final position = await _locationService.getCurrentPosition();
      if (_disposed) return;

      _userPosition = position;

      // Calculate distance to office
      final distance = _locationService.getDistanceToGeofence(position, geofence);
      _distanceToOffice = distance;

      // Check if within geofence
      _isWithinGeofence = _locationService.isWithinGeofence(position, geofence);

      _telemetry.recordEvent('location_updated', metadata: {
        'distance': distance,
        'isWithinGeofence': _isWithinGeofence,
        'accuracy': position.accuracy,
      });

      _safeNotifyListeners();
    } on LocationServiceException catch (error) {
      if (_disposed) return;
      _locationError = error.message;
      _telemetry.recordEvent('location_update_failed', metadata: {
        'error': error.message,
      });
      _safeNotifyListeners();
    } catch (error) {
      if (_disposed) return;
      _locationError = 'Failed to get location: $error';
      _telemetry.recordEvent('location_update_failed', metadata: {
        'error': error.toString(),
      });
      _safeNotifyListeners();
    } finally {
      _setLoadingLocation(false);
    }
  }

  /// Start periodic location updates (every 30 seconds)
  void startLocationUpdates() {
    if (_disposed) return;

    // Cancel existing timer if any
    stopLocationUpdates();

    // Initial update
    updateLocation();

    // Periodic updates every 30 seconds
    _locationUpdateTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => updateLocation(),
    );

    _telemetry.recordEvent('location_updates_started');
  }

  /// Stop periodic location updates
  void stopLocationUpdates() {
    _locationUpdateTimer?.cancel();
    _locationUpdateTimer = null;
    _telemetry.recordEvent('location_updates_stopped');
  }

  void _setLoading(bool value) {
    if (_disposed || _isLoading == value) {
      return;
    }
    _isLoading = value;
    _safeNotifyListeners();
  }

  void _setLoadingLocation(bool value) {
    if (_disposed || _isLoadingLocation == value) {
      return;
    }
    _isLoadingLocation = value;
    _safeNotifyListeners();
  }

  void _safeNotifyListeners() {
    if (!_disposed) {
      notifyListeners();
    }
  }

  String _cacheKey(DateTime? date) {
    final target = date ?? DateTime.now();
    return 'dashboard:${target.year}-${target.month}-${target.day}';
  }

  @override
  void dispose() {
    _disposed = true;
    stopLocationUpdates(); // Clean up location timer
    super.dispose();
  }
}

