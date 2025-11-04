import 'package:flutter/foundation.dart';

import '../../../core/data/cache_manager.dart';
import '../../../core/services/penalty_repository.dart';
import '../../../core/services/telemetry_service.dart';

class PenaltyController extends ChangeNotifier {
  PenaltyController({
    required PenaltyRepositoryBase repository,
    CacheManager<PenaltyPage>? cache,
    TelemetryService? telemetry,
  })  : _repository = repository,
        _cache = cache ?? CacheManager<PenaltyPage>(ttl: const Duration(minutes: 5)),
        _telemetry = telemetry ?? TelemetryService();

  final PenaltyRepositoryBase _repository;
  final CacheManager<PenaltyPage> _cache;
  final TelemetryService _telemetry;

  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasInitialised = false;
  PenaltyStatusFilter _statusFilter = PenaltyStatusFilter.all;
  String? _errorMessage;
  String? _nextCursor;
  final List<PenaltyItem> _items = <PenaltyItem>[];
  DateTime? _lastUpdated;
  bool _isOffline = false;
  PenaltySummary? _summary;
  bool _isLoadingSummary = false;

  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasInitialised => _hasInitialised;
  PenaltyStatusFilter get statusFilter => _statusFilter;
  String? get errorMessage => _errorMessage;
  bool get canLoadMore => _nextCursor != null && !_isLoading && !_isLoadingMore;
  List<PenaltyItem> get items => List.unmodifiable(_items);
  DateTime? get lastUpdated => _lastUpdated;
  bool get isOffline => _isOffline;
  PenaltySummary? get summary => _summary;
  bool get isLoadingSummary => _isLoadingSummary;

  Future<void> initialise() async {
    if (_hasInitialised) {
      return;
    }
    await Future.wait([
      refresh(),
      _fetchSummary(),
    ]);
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

      final results = await Future.wait([
        _repository.fetchPenalties(filter: _statusFilter, forceRefresh: true),
        _fetchSummary(),
      ]);

      final page = results[0] as PenaltyPage;
      _items
        ..clear()
        ..addAll(page.items);
      _nextCursor = page.nextCursor;
      _errorMessage = null;
      _cache.write(_cacheKey(), page);
      _lastUpdated = page.lastSyncedAt;
      _isOffline = false;
    } on PenaltyFailure catch (error) {
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

  Future<void> _fetchSummary() async {
    _isLoadingSummary = true;
    notifyListeners();

    try {
      _summary = await _repository.getPenaltySummary();
    } on PenaltyFailure catch (error) {
      // Silent fail for summary - not critical
      _telemetry.recordError('penalty_summary_fetch_failed', error: error);
    } catch (error) {
      // Silent fail for summary - not critical
      _telemetry.recordError('penalty_summary_fetch_failed', error: error);
    } finally {
      _isLoadingSummary = false;
      notifyListeners();
    }
  }

  Future<void> loadMore() async {
    if (!canLoadMore) {
      return;
    }

    _setLoadingMore(true);
    try {
      final page = await _repository.fetchPenalties(
        filter: _statusFilter,
        cursor: _nextCursor,
      );
      _items.addAll(page.items);
      _nextCursor = page.nextCursor;
      _lastUpdated = page.lastSyncedAt;
      _cache.write(
        _cacheKey(),
        PenaltyPage(
          items: List<PenaltyItem>.from(_items),
          nextCursor: _nextCursor,
          lastSyncedAt: _lastUpdated,
        ),
      );
    } on PenaltyFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _setLoadingMore(false);
    }
  }

  Future<void> acknowledgePenalty(PenaltyItem item, {String? note}) async {
    if (item.acknowledged) {
      return;
    }

    final index = _items.indexWhere((candidate) => candidate.id == item.id);
    if (index == -1) {
      return;
    }

    final updated = item.copyWith(
      acknowledged: true,
      acknowledgedAt: DateTime.now(),
      status: 'acknowledged',
    );
    _items[index] = updated;
    notifyListeners();

    try {
      await _repository.acknowledgePenalty(penaltyId: item.id, note: note);
      _cache.invalidate(_cacheKey());
      _telemetry.recordEvent('penalty_acknowledged', metadata: {
        'penaltyId': item.id,
        'note': note,
      });
    } on PenaltyFailure catch (error) {
      _items[index] = item;
      _errorMessage = error.message;
      notifyListeners();
    } catch (error) {
      _items[index] = item;
      _errorMessage = error.toString();
      notifyListeners();
    }
  }

  Future<void> changeFilter(PenaltyStatusFilter filter) async {
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

  String _cacheKey() => 'penalties:${_statusFilter.name}';
}

