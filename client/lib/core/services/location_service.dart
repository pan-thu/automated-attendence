import 'package:geolocator/geolocator.dart';

/// Shared location service for GPS operations
///
/// Handles:
/// - Location permissions
/// - Getting current position
/// - Distance calculations
/// - Geofence checks
class LocationService {
  /// Get current device position
  ///
  /// Throws [LocationServiceException] if:
  /// - Location services are disabled
  /// - Permissions are denied
  Future<Position> getCurrentPosition() async {
    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      throw LocationServiceException('Location services are disabled.');
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        throw LocationServiceException('Location permission denied.');
      }
    }

    if (permission == LocationPermission.deniedForever) {
      throw LocationServiceException(
        'Location permissions are permanently denied. Please enable them in settings.',
      );
    }

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  /// Calculate distance between two coordinates in meters
  ///
  /// Uses Haversine formula via geolocator
  double calculateDistance({
    required double fromLat,
    required double fromLng,
    required double toLat,
    required double toLng,
  }) {
    return Geolocator.distanceBetween(
      fromLat,
      fromLng,
      toLat,
      toLng,
    );
  }

  /// Check if position is within geofence radius
  ///
  /// [position] - Current device position
  /// [geofence] - Map with 'lat', 'lng', 'radius' keys
  /// Returns true if within radius
  bool isWithinGeofence(Position position, Map<String, dynamic> geofence) {
    final centerLat = geofence['lat'] as double?;
    final centerLng = geofence['lng'] as double?;
    final radiusMeters = geofence['radius'] as num?;

    if (centerLat == null || centerLng == null || radiusMeters == null) {
      return false;
    }

    final distance = calculateDistance(
      fromLat: position.latitude,
      fromLng: position.longitude,
      toLat: centerLat,
      toLng: centerLng,
    );

    return distance <= radiusMeters;
  }

  /// Get distance from position to geofence center in meters
  ///
  /// Returns null if geofence data is invalid
  double? getDistanceToGeofence(
    Position position,
    Map<String, dynamic> geofence,
  ) {
    final centerLat = geofence['lat'] as double?;
    final centerLng = geofence['lng'] as double?;

    if (centerLat == null || centerLng == null) {
      return null;
    }

    return calculateDistance(
      fromLat: position.latitude,
      fromLng: position.longitude,
      toLat: centerLat,
      toLng: centerLng,
    );
  }

  /// Check location permission status without requesting
  Future<LocationPermission> checkPermission() async {
    return Geolocator.checkPermission();
  }

  /// Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return Geolocator.isLocationServiceEnabled();
  }
}

/// Exception thrown by LocationService
class LocationServiceException implements Exception {
  final String message;

  LocationServiceException(this.message);

  @override
  String toString() => message;
}
