import 'package:cloud_functions/cloud_functions.dart';

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
    } on FirebaseFunctionsException catch (_) {
      // Swallow telemetry failures to avoid impacting UX.
    } catch (_) {
      // Ignored.
    }
  }
}

