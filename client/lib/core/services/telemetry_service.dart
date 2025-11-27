import 'package:cloud_functions/cloud_functions.dart';
import 'package:flutter/foundation.dart';

/// Bug Fix #18: Added debug logging to telemetry errors
class TelemetryService {
  TelemetryService({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<void> recordEvent(
    String name, {
    Map<String, Object?>? metadata,
  }) async {
    if (name.isEmpty) {
      return;
    }

    try {
      final callable = _functions.httpsCallable('recordTelemetryEvent');
      await callable.call({
        'name': name,
        if (metadata != null && metadata.isNotEmpty) 'metadata': metadata,
      });
    } on FirebaseFunctionsException catch (e) {
      // Bug Fix #18: Log telemetry failures in debug mode for diagnostics
      // Swallow in production to avoid impacting UX
      if (kDebugMode) {
        debugPrint('TelemetryService: Firebase Functions error - ${e.code}: ${e.message}');
      }
    } catch (e) {
      // Bug Fix #18: Log unexpected errors in debug mode
      if (kDebugMode) {
        debugPrint('TelemetryService: Unexpected error recording event "$name": $e');
      }
    }
  }

  /// Record an error for monitoring and debugging
  Future<void> recordError(
    String message, {
    Object? error,
    StackTrace? stackTrace,
    Map<String, Object?>? metadata,
  }) async {
    // In debug mode, print the error for local debugging
    if (kDebugMode) {
      debugPrint('TelemetryService: Error - $message');
      if (error != null) {
        debugPrint('  Error: $error');
      }
      if (stackTrace != null) {
        debugPrint('  StackTrace: $stackTrace');
      }
    }

    // Record as telemetry event with error context
    await recordEvent(
      'error',
      metadata: {
        'message': message,
        if (error != null) 'error': error.toString(),
        if (stackTrace != null) 'stackTrace': stackTrace.toString(),
        ...?metadata,
      },
    );
  }
}

