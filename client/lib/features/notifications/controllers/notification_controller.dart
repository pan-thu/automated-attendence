import 'package:flutter/foundation.dart';

import '../../../core/services/notification_repository.dart';

class NotificationController extends ChangeNotifier {
  NotificationController({required NotificationRepositoryBase repository}) : _repository = repository;

  final NotificationRepositoryBase _repository;

  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasInitialised = false;
  NotificationStatusFilter _statusFilter = NotificationStatusFilter.all;
  String? _errorMessage;
  String? _nextCursor;
  final List<NotificationItem> _items = <NotificationItem>[];

  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasInitialised => _hasInitialised;
  List<NotificationItem> get items => List.unmodifiable(_items);
  NotificationStatusFilter get statusFilter => _statusFilter;
  String? get errorMessage => _errorMessage;
  bool get canLoadMore => _nextCursor != null && !_isLoading && !_isLoadingMore;
  int get unreadCount => _items.where((item) => !item.isRead).length;

  Future<void> initialise() async {
    if (_hasInitialised) {
      return;
    }
    await refresh();
    _hasInitialised = true;
  }

  Future<void> refresh() async {
    _setLoading(true);
    try {
      final page = await _repository.fetchNotifications(filter: _statusFilter);
      _items
        ..clear()
        ..addAll(page.items);
      _nextCursor = page.nextCursor;
      _errorMessage = null;
    } on NotificationFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
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
}

