import 'package:flutter/foundation.dart';

import '../../../core/data/cache_manager.dart';
import '../../../core/services/notification_repository.dart';
import '../../../core/services/telemetry_service.dart';

class NotificationController extends ChangeNotifier {
  NotificationController({
    required NotificationRepositoryBase repository,
    CacheManager<NotificationPage>? cache,
    TelemetryService? telemetry,
  })  : _repository = repository,
        _cache = cache ?? CacheManager<NotificationPage>(ttl: const Duration(minutes: 5)),
        _telemetry = telemetry ?? TelemetryService();

  final NotificationRepositoryBase _repository;
  final CacheManager<NotificationPage> _cache;
  final TelemetryService _telemetry;

  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasInitialised = false;
  NotificationStatusFilter _statusFilter = NotificationStatusFilter.all;
  String? _errorMessage;
  String? _nextCursor;
  final List<NotificationItem> _items = <NotificationItem>[];
  DateTime? _lastUpdated;
  bool _isOffline = false;

  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasInitialised => _hasInitialised;
  List<NotificationItem> get items => List.unmodifiable(_items);
  NotificationStatusFilter get statusFilter => _statusFilter;
  String? get errorMessage => _errorMessage;
  bool get canLoadMore => _nextCursor != null && !_isLoading && !_isLoadingMore;
  int get unreadCount => _items.where((item) => !item.isRead).length;
  DateTime? get lastUpdated => _lastUpdated;
  bool get isOffline => _isOffline;

  Future<void> initialise() async {
    if (_hasInitialised) {
      return;
    }
    await refresh();
    _hasInitialised = true;
  }

  Future<void> refresh() async {
    if (_isLoading) {
      return;
    }
    _setLoading(true);
    try {
      final cached = _cache.read(_cacheKey());
      if (cached != null) {
        _items
          ..clear()
          ..addAll(cached.value.items);
        _nextCursor = cached.value.nextCursor;
        _lastUpdated = cached.value.lastSyncedAt;
        _isOffline = true;
        _errorMessage = null;
        notifyListeners();
      }

      final page = await _repository.fetchNotifications(filter: _statusFilter, forceRefresh: true);
      _items
        ..clear()
        ..addAll(page.items);
      _nextCursor = page.nextCursor;
      _errorMessage = null;
      _cache.write(_cacheKey(), page);
      _lastUpdated = page.lastSyncedAt;
      _isOffline = false;
    } on NotificationFailure catch (error) {
      _errorMessage = error.message;
      final cached = _cache.read(_cacheKey());
      if (cached != null) {
        _items
          ..clear()
          ..addAll(cached.value.items);
        _nextCursor = cached.value.nextCursor;
        _lastUpdated = cached.value.lastSyncedAt;
        _isOffline = true;
      }
    } catch (error) {
      _errorMessage = error.toString();
      final cached = _cache.read(_cacheKey());
      if (cached != null) {
        _items
          ..clear()
          ..addAll(cached.value.items);
        _nextCursor = cached.value.nextCursor;
        _lastUpdated = cached.value.lastSyncedAt;
        _isOffline = true;
      }
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadMore() async {
    if (!canLoadMore) {
      return;
    }

    _setLoadingMore(true);
    try {
      final page = await _repository.fetchNotifications(
        cursor: _nextCursor,
        filter: _statusFilter,
      );
      _items.addAll(page.items);
      _nextCursor = page.nextCursor;
      _lastUpdated = page.lastSyncedAt;
      _cache.write(
        _cacheKey(),
        NotificationPage(
          items: List<NotificationItem>.from(_items),
          nextCursor: _nextCursor,
          lastSyncedAt: _lastUpdated,
        ),
      );
    } on NotificationFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _setLoadingMore(false);
    }
  }

  Future<void> markAsRead(NotificationItem item, {String? acknowledgment}) async {
    if (item.isRead) {
      return;
    }

    final index = _items.indexWhere((candidate) => candidate.id == item.id);
    if (index == -1) {
      return;
    }

    final updated = item.copyWith(
      isRead: true,
      readAt: DateTime.now(),
    );
    _items[index] = updated;
    notifyListeners();

    try {
      await _repository.markAsRead(notificationId: item.id, acknowledgment: acknowledgment);
      _cache.invalidate(_cacheKey());
      _telemetry.recordEvent('notification_marked_read', metadata: {
        'notificationId': item.id,
        'acknowledgment': acknowledgment,
      });
    } on NotificationFailure catch (error) {
      _items[index] = item;
      _errorMessage = error.message;
      notifyListeners();
    } catch (error) {
      _items[index] = item;
      _errorMessage = error.toString();
      notifyListeners();
    }
  }

  Future<void> markAllAsRead() async {
    // Optimistically update UI - mark all notifications as read
    final now = DateTime.now();
    final updatedItems = _items.map((item) {
      if (item.isRead) {
        return item;
      }
      return item.copyWith(isRead: true, readAt: now);
    }).toList();

    _items
      ..clear()
      ..addAll(updatedItems);
    notifyListeners();

    try {
      final result = await _repository.markAllAsRead();

      // Invalidate cache and refresh to get latest state
      _cache.invalidate(_cacheKey());
      await refresh();

      _telemetry.recordEvent('notifications_mark_all_read', metadata: {
        'markedCount': result.markedCount,
        'success': result.success,
      });
    } on NotificationFailure catch (error) {
      // Revert optimistic update on failure
      await refresh();
      _errorMessage = error.message;
      _telemetry.recordEvent('notifications_mark_all_read_failed', metadata: {
        'error': error.message,
      });
      rethrow;
    } catch (error) {
      // Revert optimistic update on failure
      await refresh();
      _errorMessage = error.toString();
      _telemetry.recordEvent('notifications_mark_all_read_failed', metadata: {
        'error': error.toString(),
      });
      rethrow;
    }
  }

  Future<void> changeFilter(NotificationStatusFilter filter) async {
    if (_statusFilter == filter) {
      return;
    }
    _statusFilter = filter;
    await refresh();
    notifyListeners();
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }

  void _setLoadingMore(bool value) {
    if (_isLoadingMore == value) {
      return;
    }
    _isLoadingMore = value;
    notifyListeners();
  }

  String _cacheKey() => 'notifications:${_statusFilter.name}';
}

