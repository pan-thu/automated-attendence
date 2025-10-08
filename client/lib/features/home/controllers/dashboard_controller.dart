import 'package:flutter/material.dart';

import '../../../core/services/dashboard_repository.dart';

class DashboardController extends ChangeNotifier {
  DashboardController({DashboardRepository? repository})
      : _repository = repository ?? DashboardRepository();

  final DashboardRepository _repository;

  bool _isLoading = false;
  String? _errorMessage;
  DashboardSummary? _summary;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  DashboardSummary? get summary => _summary;

  Future<void> loadDashboard({DateTime? date}) async {
    _setLoading(true);
    try {
      _summary = await _repository.fetchDashboard(date: date);
      _errorMessage = null;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _setLoading(false);
    }
  }

  Future<void> refreshDashboard() async {
    await loadDashboard();
  }

  void _setLoading(bool value) {
    if (_isLoading == value) {
      return;
    }
    _isLoading = value;
    notifyListeners();
  }
}

