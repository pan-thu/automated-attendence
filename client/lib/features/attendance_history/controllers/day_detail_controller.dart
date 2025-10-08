import 'package:flutter/foundation.dart';

import '../repository/attendance_history_repository.dart';

class DayDetailController extends ChangeNotifier {
  DayDetailController({AttendanceHistoryRepository? repository})
    : _repository = repository ?? AttendanceHistoryRepository();

  final AttendanceHistoryRepository _repository;

  AttendanceDayDetail? _detail;
  bool _isLoading = false;
  String? _errorMessage;

  AttendanceDayDetail? get detail => _detail;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadDetail(DateTime date) async {
    _setLoading(true);
    try {
      _detail = await _repository.fetchDayDetail(date);
      _errorMessage = null;
    } on AttendanceHistoryFailure catch (error) {
      _detail = null;
      _errorMessage = error.message;
    } catch (error) {
      _detail = null;
      _errorMessage = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  void clear() {
    _detail = null;
    _errorMessage = null;
    notifyListeners();
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}
