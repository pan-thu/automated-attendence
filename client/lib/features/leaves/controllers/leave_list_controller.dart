import 'package:flutter/foundation.dart';

import '../../../core/services/leave_repository.dart';
import '../../../core/services/telemetry_service.dart';
import '../../../models/leave_models.dart';
import '../repository/leave_cache.dart';

class LeaveListController extends ChangeNotifier {
  LeaveListController({LeaveRepositoryBase? repository, LeaveCache? cache, TelemetryService? telemetry})
      : _repository = repository ?? LeaveRepository(),
        _cache = cache ?? LeaveCache(),
        _telemetry = telemetry ?? TelemetryService();

  final LeaveRepositoryBase _repository;
  final LeaveCache _cache;
  final TelemetryService _telemetry;

  final List<LeaveListItem> _items = <LeaveListItem>[];
  LeaveStatus? _statusFilter;
  String? _nextCursor;
  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _errorMessage;
  DateTime? _lastUpdated;
  bool _isOffline = false;

  List<LeaveListItem> get items => List.unmodifiable(_items);
  LeaveStatus? get statusFilter => _statusFilter;
  bool get isLoading => _isLoading;
  bool get isRefreshing => _isRefreshing;
  bool get canLoadMore => _nextCursor != null && !_isLoading;
  String? get errorMessage => _errorMessage;
  DateTime? get lastUpdated => _lastUpdated;
  bool get isOffline => _isOffline;

  Future<void> initialize({LeaveStatus? status}) async {
    _statusFilter = status;

    final cached = _cache.get(status);
    if (cached != null) {
      _items
        ..clear()
        ..addAll(cached.items);
      _nextCursor = cached.cursor;
      _lastUpdated = cached.updatedAt;
      _isOffline = true;
      notifyListeners();
    }

    await _load(initial: true);
  }

  Future<void> refresh() async {
    if (_isRefreshing) {
      return;
    }
    _isRefreshing = true;
    notifyListeners();
    await _load(initial: true);
    _isRefreshing = false;
    notifyListeners();
  }

  Future<void> changeFilter(LeaveStatus? status) async {
    if (_statusFilter == status) {
      return;
    }
    _statusFilter = status;
    await initialize(status: status);
  }

  Future<void> loadMore() async {
    if (!canLoadMore) {
      return;
    }
    await _load(initial: false);
  }

  Future<void> _load({required bool initial}) async {
    if (_isLoading) {
      return;
    }
    _isLoading = true;
    _errorMessage = null;
    _isOffline = false;
    if (initial) {
      _nextCursor = null;
    }
    notifyListeners();

    try {
      final page = await _repository.listLeaves(
        status: _statusFilter,
        cursor: initial ? null : _nextCursor,
        limit: 20,
      );
      if (initial) {
        _items
          ..clear()
          ..addAll(page.items);
      } else {
        _items.addAll(page.items);
      }
      _cache.set(
        _statusFilter,
        LeaveCacheEntry(
          items: List<LeaveListItem>.from(_items),
          cursor: page.nextCursor,
          updatedAt: DateTime.now(),
        ),
      );
      _nextCursor = page.nextCursor;
      _lastUpdated = DateTime.now();
      _telemetry.recordEvent('leave_list_loaded', metadata: {
        'statusFilter': _statusFilter?.name,
        'initial': initial,
        'count': _items.length,
      });
    } on LeaveFailure catch (error) {
      _errorMessage = error.message;
      _telemetry.recordEvent('leave_list_load_failed', metadata: {
        'statusFilter': _statusFilter?.name,
        'error': error.message,
      });
      final cached = _cache.get(_statusFilter);
      if (cached != null) {
        _items
          ..clear()
          ..addAll(cached.items);
        _nextCursor = cached.cursor;
        _lastUpdated = cached.updatedAt;
        _isOffline = true;
      }
    } catch (error) {
      _errorMessage = error.toString();
      _telemetry.recordEvent('leave_list_load_failed', metadata: {
        'statusFilter': _statusFilter?.name,
        'error': error.toString(),
      });
      final cached = _cache.get(_statusFilter);
      if (cached != null) {
        _items
          ..clear()
          ..addAll(cached.items);
        _nextCursor = cached.cursor;
        _lastUpdated = cached.updatedAt;
        _isOffline = true;
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}


