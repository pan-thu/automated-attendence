import 'package:cloud_functions/cloud_functions.dart';

import '../data/cache_manager.dart';
import '../../features/settings/models/company_settings.dart';

class CompanySettingsRepository {
  CompanySettingsRepository({
    FirebaseFunctions? functions,
    CacheManager<CompanySettings>? cacheManager,
  })  : _functions = functions ?? FirebaseFunctions.instance,
        _cacheManager = cacheManager ?? CacheManager<CompanySettings>(ttl: const Duration(minutes: 15));

  final FirebaseFunctions _functions;
  final CacheManager<CompanySettings> _cacheManager;

  static const String _cacheKey = 'company_settings_public';

  Future<CompanySettings> fetchSettings({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      final cached = _cacheManager.read(_cacheKey);
      if (cached != null) {
        return cached.value;
      }
    }

    final callable = _functions.httpsCallable('getCompanySettingsPublic');
    final response = await callable.call();
    final data = Map<String, dynamic>.from(response.data as Map);
    final settings = CompanySettings.fromJson(data);
    _cacheManager.write(_cacheKey, settings);
    return settings;
  }

  CacheSnapshot<CompanySettings>? readCached() => _cacheManager.read(_cacheKey);

  void clear() => _cacheManager.clear();
}

