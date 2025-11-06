import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';

/// Error types for categorizing exceptions
enum ErrorType {
  auth,
  network,
  validation,
  permission,
  notFound,
  unknown,
}

/// Custom application exception with categorization
class AppException implements Exception {
  final String message;
  final ErrorType type;
  final dynamic details;

  AppException(
    this.message, {
    this.type = ErrorType.unknown,
    this.details,
  });

  @override
  String toString() => message;
}

/// Bug Fix #28: User-friendly error message handler
///
/// Converts Firebase exceptions and generic errors into user-friendly messages
/// that can be displayed in the UI via SnackBars or dialogs.
class ErrorHandler {
  /// Converts any error into a user-friendly message
  static String getUserFriendlyMessage(dynamic error) {
    if (error is FirebaseFunctionsException) {
      return _handleFunctionsException(error);
    } else if (error is FirebaseAuthException) {
      return _handleAuthException(error);
    } else if (error is FirebaseException) {
      return _handleFirebaseException(error);
    } else if (error is Exception) {
      return error.toString().replaceAll('Exception: ', '');
    } else {
      return error.toString();
    }
  }

  /// Handles Cloud Functions exceptions
  static String _handleFunctionsException(FirebaseFunctionsException error) {
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to perform this action.';
      case 'unauthenticated':
        return 'Please log in to continue.';
      case 'not-found':
        return 'The requested resource was not found.';
      case 'failed-precondition':
        // Use the server-provided message as it often contains specific details
        return error.message ?? 'Cannot complete this action right now.';
      case 'invalid-argument':
        // Use the server-provided message for validation errors
        return error.message ?? 'Invalid input provided.';
      case 'deadline-exceeded':
      case 'unavailable':
        return 'Request timed out. Please check your connection and try again.';
      case 'resource-exhausted':
        return 'Service temporarily unavailable. Please try again later.';
      case 'aborted':
        return 'Operation was aborted. Please try again.';
      case 'already-exists':
        return 'This item already exists.';
      case 'out-of-range':
        return 'Value is out of acceptable range.';
      case 'unimplemented':
        return 'This feature is not yet available.';
      case 'internal':
        return 'An internal error occurred. Please try again.';
      case 'data-loss':
        return 'Data loss or corruption detected. Please contact support.';
      default:
        return error.message ?? 'An unexpected error occurred.';
    }
  }

  /// Handles Firebase Authentication exceptions
  static String _handleAuthException(FirebaseAuthException error) {
    switch (error.code) {
      case 'user-not-found':
        return 'No account found with this email.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'invalid-email':
        return 'Invalid email address format.';
      case 'user-disabled':
        return 'This account has been disabled. Contact your administrator.';
      case 'email-already-in-use':
        return 'This email is already registered.';
      case 'weak-password':
        return 'Password is too weak. Use at least 6 characters.';
      case 'operation-not-allowed':
        return 'This operation is not allowed.';
      case 'account-exists-with-different-credential':
        return 'An account already exists with a different sign-in method.';
      case 'invalid-credential':
        return 'Invalid credentials. Please check your email and password.';
      case 'invalid-verification-code':
        return 'Invalid verification code.';
      case 'invalid-verification-id':
        return 'Invalid verification ID.';
      case 'network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'user-token-expired':
      case 'requires-recent-login':
        return 'Session expired. Please log in again.';
      default:
        return error.message ?? 'Authentication error occurred.';
    }
  }

  /// Handles generic Firebase exceptions
  static String _handleFirebaseException(FirebaseException error) {
    switch (error.code) {
      case 'unavailable':
        return 'Service unavailable. Please check your internet connection.';
      case 'cancelled':
        return 'Operation was cancelled.';
      case 'unknown':
        return 'An unknown error occurred. Please try again.';
      default:
        return error.message ?? 'An error occurred.';
    }
  }

  /// Gets a user-friendly message for location permission errors
  static String getLocationPermissionMessage(String permissionStatus) {
    switch (permissionStatus) {
      case 'denied':
        return 'Location permission is required for attendance tracking.';
      case 'deniedForever':
      case 'permanentlyDenied':
        return 'Location permission was permanently denied. Please enable it in Settings.';
      case 'restricted':
        return 'Location services are restricted on this device.';
      default:
        return 'Unable to access location. Please check your permissions.';
    }
  }

  /// Gets a user-friendly message for geofence validation errors
  static String getGeofenceMessage(double distance, double radius) {
    final distanceKm = (distance / 1000).toStringAsFixed(2);
    final radiusKm = (radius / 1000).toStringAsFixed(2);
    return 'You are ${distanceKm}km from the workplace (allowed radius: ${radiusKm}km). '
        'Please move closer to clock in.';
  }

  /// Gets a user-friendly message for time window errors
  static String getTimeWindowMessage(String checkName, String timeWindow) {
    return 'Clock-in $checkName is only available during $timeWindow. '
        'Please try again during the allowed time.';
  }

  /// Checks if an error is a network-related error
  static bool isNetworkError(dynamic error) {
    if (error is FirebaseFunctionsException) {
      return error.code == 'unavailable' || error.code == 'deadline-exceeded';
    }
    if (error is FirebaseAuthException) {
      return error.code == 'network-request-failed';
    }
    if (error is FirebaseException) {
      return error.code == 'unavailable';
    }
    final message = error.toString().toLowerCase();
    return message.contains('network') ||
        message.contains('connection') ||
        message.contains('timeout') ||
        message.contains('unreachable');
  }

  /// Checks if an error is an authentication error requiring re-login
  static bool isAuthError(dynamic error) {
    if (error is FirebaseFunctionsException) {
      return error.code == 'unauthenticated';
    }
    if (error is FirebaseAuthException) {
      return error.code == 'user-token-expired' ||
          error.code == 'requires-recent-login' ||
          error.code == 'user-not-found';
    }
    return false;
  }
}
