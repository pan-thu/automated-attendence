import 'package:flutter/material.dart';

import '../../../core/data/cache_manager.dart';
import '../../../core/services/dashboard_repository.dart';
import '../../../core/services/telemetry_service.dart';

class DashboardController extends ChangeNotifier {
  DashboardController({
    DashboardRepository? repository,
    CacheManager<DashboardSummary>? cache,
    TelemetryService? telemetry,
  })  : _repository = repository ?? DashboardRepository(),
        _cache = cache ?? CacheManager<DashboardSummary>(ttl: const Duration(minutes: 2)),
        _telemetry = telemetry ?? TelemetryService();

  final DashboardRepository _repository;
  final CacheManager<DashboardSummary> _cache;
  final TelemetryService _telemetry;

  bool _isLoading = false;
  String? _errorMessage;
  DashboardSummary? _summary;
  bool _isOffline = false;
  DateTime? _summaryUpdatedAt;
  bool _disposed = false;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DashboardSummary? get summary => _summary;
  bool get isOffline => _isOffline;
  DateTime? get summaryUpdatedAt => _summaryUpdatedAt;

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
  }

  void _setLoading(bool value) {
    if (_disposed || _isLoading == value) {
      return;
    }
    _isLoading = value;
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
    super.dispose();
  }
}

