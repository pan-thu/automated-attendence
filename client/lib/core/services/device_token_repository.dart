import 'package:cloud_functions/cloud_functions.dart';

class DeviceTokenRepository {
  DeviceTokenRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<void> registerDeviceToken({
    required String userId,
    required String token,
    required String deviceId,
    required String platform,
  }) async {
    final callable = _functions.httpsCallable('registerDeviceToken');
    await callable.call({
      'token': token,
      'deviceId': deviceId,
      'platform': platform,
      'metadata': {
        'userId': userId,
      },
    });
  }
}

