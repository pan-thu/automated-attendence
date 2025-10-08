import 'package:flutter/foundation.dart';

import '../../../core/services/penalty_repository.dart';

class PenaltyController extends ChangeNotifier {
  PenaltyController({required PenaltyRepositoryBase repository}) : _repository = repository;

  final PenaltyRepositoryBase _repository;

  bool _isLoading = false;
  bool _isLoadingMore = false;
  bool _hasInitialised = false;
  PenaltyStatusFilter _statusFilter = PenaltyStatusFilter.all;
  String? _errorMessage;
  String? _nextCursor;
  final List<PenaltyItem> _items = <PenaltyItem>[];

  bool get isLoading => _isLoading;
  bool get isLoadingMore => _isLoadingMore;
  bool get hasInitialised => _hasInitialised;
  PenaltyStatusFilter get statusFilter => _statusFilter;
  String? get errorMessage => _errorMessage;
  bool get canLoadMore => _nextCursor != null && !_isLoading && !_isLoadingMore;
  List<PenaltyItem> get items => List.unmodifiable(_items);

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
      final page = await _repository.fetchPenalties(filter: _statusFilter);
      _items
        ..clear()
        ..addAll(page.items);
      _nextCursor = page.nextCursor;
      _errorMessage = null;
    } on PenaltyFailure catch (error) {
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
      final page = await _repository.fetchPenalties(
        filter: _statusFilter,
        cursor: _nextCursor,
      );
      _items.addAll(page.items);
      _nextCursor = page.nextCursor;
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
    );
    _items[index] = updated;
    notifyListeners();

    try {
      await _repository.acknowledgePenalty(penaltyId: item.id, note: note);
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
}

