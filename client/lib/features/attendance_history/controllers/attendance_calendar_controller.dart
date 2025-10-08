import 'dart:collection';

import 'package:flutter/foundation.dart';

import '../repository/attendance_history_repository.dart';

typedef Clock = DateTime Function();

class AttendanceCalendarController extends ChangeNotifier {
  AttendanceCalendarController({
    AttendanceHistoryRepository? repository,
    Clock? clock,
  }) : _repository = repository ?? AttendanceHistoryRepository(),
       _clock = clock ?? DateTime.now;

  final AttendanceHistoryRepository _repository;
  final Clock _clock;

  final Map<String, List<AttendanceDaySummary>> _cache =
      <String, List<AttendanceDaySummary>>{};
  DateTime? _currentMonth;
  AttendanceFilters _filters = const AttendanceFilters();
  bool _isLoading = false;
  String? _errorMessage;

  UnmodifiableListView<AttendanceDaySummary> get days {
    final scope = _deriveScope();
    return UnmodifiableListView(
      _cache[scope.cacheKey] ?? const <AttendanceDaySummary>[],
    );
  }
  DateTime? get currentMonth => _currentMonth;
  AttendanceFilters get filters => _filters;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> initialize() async {
    _currentMonth = DateTime(_clock().year, _clock().month, 1);
    await _loadCurrentScope();
  }

  Future<void> selectMonth(DateTime month) async {
    final normalized = DateTime(month.year, month.month, 1);
    if (_currentMonth == normalized) {
      return;
    }
    _currentMonth = normalized;
    notifyListeners();
    await _loadCurrentScope();
  }

  Future<void> refresh() async {
    final scope = _deriveScope();

    if (!scope.isRange && _currentMonth == null) {
      return;
    }
    _cache.remove(scope.cacheKey);
    await _loadCurrentScope(force: true);
  }

  Future<void> applyFilters(AttendanceFilters filters) async {
    _filters = filters;
    _cache.clear();
    notifyListeners();
    await _loadCurrentScope();
  }

  Future<void> _loadCurrentScope({bool force = false}) async {
    final scope = _deriveScope();

    if (!scope.isRange) {
      _currentMonth = scope.start;
    }

    if (!force && _cache.containsKey(scope.cacheKey)) {
      notifyListeners();
      return;
    }

    _setLoading(true);
    try {
      final results = await _repository.fetchAttendance(
        start: scope.start,
        end: scope.end,
        filters: _filters,
      );
      _cache[scope.cacheKey] = results;
      _errorMessage = null;
    } on AttendanceHistoryFailure catch (error) {
      _errorMessage = error.message;
      _cache.remove(scope.cacheKey);
    } catch (error) {
      _errorMessage = error.toString();
      _cache.remove(scope.cacheKey);
    } finally {
      _setLoading(false);
    }
  }

  String _monthKey(DateTime? month) {
    if (month == null) {
      return 'uninitialized';
    }
    return '${month.year}-${month.month.toString().padLeft(2, '0')}';
  }

  String _rangeKey(DateTime? start, DateTime? end) {
    final startKey = start == null
        ? 'null'
        : '${start.year}-${start.month.toString().padLeft(2, '0')}-${start.day.toString().padLeft(2, '0')}';
    final endKey = end == null
        ? 'null'
        : '${end.year}-${end.month.toString().padLeft(2, '0')}-${end.day.toString().padLeft(2, '0')}';
    return 'range:$startKey:$endKey';
  }

  _Scope _deriveScope() {
    if (_filters.rangePreset != DateRangePreset.none) {
      final now = _clock();
      switch (_filters.rangePreset) {
        case DateRangePreset.thisMonth:
          final start = DateTime(now.year, now.month, 1);
          final end = DateTime(now.year, now.month + 1, 0);
          return _Scope(
            start: start,
            end: end,
            cacheKey: _rangeKey(start, end),
            isRange: false,
          );
        case DateRangePreset.lastMonth:
          final start = DateTime(now.year, now.month - 1, 1);
          final end = DateTime(now.year, now.month, 0);
          return _Scope(
            start: start,
            end: end,
            cacheKey: _rangeKey(start, end),
            isRange: false,
          );
        case DateRangePreset.last30Days:
          final end = DateTime(now.year, now.month, now.day);
          final start = end.subtract(const Duration(days: 29));
          return _Scope(
            start: DateTime(start.year, start.month, start.day),
            end: end,
            cacheKey: _rangeKey(start, end),
            isRange: true,
          );
        case DateRangePreset.none:
          break;
      }
    }

    if (_filters.hasDateRange) {
      final start = _filters.startDate ?? DateTime(_clock().year, _clock().month, 1);
      final normalizedStart = DateTime(start.year, start.month, start.day);
      final end = _filters.endDate ?? DateTime(normalizedStart.year, normalizedStart.month + 1, 0);
      final normalizedEnd = DateTime(end.year, end.month, end.day);
      return _Scope(
        start: normalizedStart,
        end: normalizedEnd,
        cacheKey: _rangeKey(normalizedStart, normalizedEnd),
        isRange: true,
      );
    }

    final baseMonth = _currentMonth ?? DateTime(_clock().year, _clock().month, 1);
    final normalizedMonth = DateTime(baseMonth.year, baseMonth.month, 1);
    final end = DateTime(normalizedMonth.year, normalizedMonth.month + 1, 0);
    return _Scope(
      start: normalizedMonth,
      end: end,
      cacheKey: _monthKey(normalizedMonth),
      isRange: false,
    );
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}

class _Scope {
  const _Scope({
    required this.start,
    required this.end,
    required this.cacheKey,
    required this.isRange,
  });

  final DateTime start;
  final DateTime end;
  final String cacheKey;
  final bool isRange;
}
