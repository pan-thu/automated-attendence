import 'package:cloud_functions/cloud_functions.dart';

class ClockInRepository {
  ClockInRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<ClockInResult> clockIn({
    required double latitude,
    required double longitude,
  }) async {
    try {
      final callable = _functions.httpsCallable('handleClockIn');
      final response = await callable.call({
        'latitude': latitude,
        'longitude': longitude,
      });

      final data = Map<String, dynamic>.from(response.data as Map);
      return ClockInResult.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      final message = error.message?.isNotEmpty == true
          ? error.message!
          : 'Clock-in failed. (${error.code})';
      throw ClockInFailure(message);
    } catch (error) {
      throw ClockInFailure('Clock-in failed: $error');
    }
  }
}

class ClockInResult {
  ClockInResult({
    required this.success,
    required this.message,
    required this.slot,
    required this.checkStatus,
    required this.dailyStatus,
  });

  final bool success;
  final String message;
  final String? slot;
  final String? checkStatus;
  final String? dailyStatus;

  factory ClockInResult.fromJson(Map<String, dynamic> json) {
    return ClockInResult(
      success: json['success'] as bool? ?? false,
      message: json['message'] as String? ?? 'Clock-in completed.',
      slot: json['slot'] as String?,
      checkStatus: json['checkStatus'] as String?,
      dailyStatus: json['dailyStatus'] as String?,
    );
  }
}

class ClockInFailure implements Exception {
  const ClockInFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

