import 'package:flutter/foundation.dart';

import '../../../core/services/leave_repository.dart';
import '../../../models/leave_models.dart';
import '../repository/leave_cache.dart';

class LeaveListController extends ChangeNotifier {
  LeaveListController({LeaveRepositoryBase? repository, LeaveCache? cache})
      : _repository = repository ?? LeaveRepository(),
        _cache = cache ?? LeaveCache();

  final LeaveRepositoryBase _repository;
  final LeaveCache _cache;

  final List<LeaveListItem> _items = <LeaveListItem>[];
  LeaveStatus? _statusFilter;
  String? _nextCursor;
  bool _isLoading = false;
  bool _isRefreshing = false;
  String? _errorMessage;

  List<LeaveListItem> get items => List.unmodifiable(_items);
  LeaveStatus? get statusFilter => _statusFilter;
  bool get isLoading => _isLoading;
  bool get isRefreshing => _isRefreshing;
  bool get canLoadMore => _nextCursor != null && !_isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> initialize({LeaveStatus? status}) async {
    _statusFilter = status;

    final cached = _cache.get(status);
    if (cached != null) {
      _items
        ..clear()
        ..addAll(cached.items);
      _nextCursor = cached.cursor;
      notifyListeners();
    }

    await _load(initial: true);
  }

  Future<void> refresh() async {
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
        _cache.set(
          _statusFilter,
          LeaveCacheEntry(items: List<LeaveListItem>.from(page.items), cursor: page.nextCursor),
        );
      } else {
        _items.addAll(page.items);
        final existing = _cache.get(_statusFilter);
        if (existing != null) {
          _cache.set(
            _statusFilter,
            LeaveCacheEntry(
              items: List<LeaveListItem>.from(existing.items)..addAll(page.items),
              cursor: page.nextCursor,
            ),
          );
        }
      }
      _nextCursor = page.nextCursor;
    } on LeaveFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}


