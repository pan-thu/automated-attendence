import 'package:flutter/foundation.dart';

import '../../../core/services/leave_repository.dart';
import '../../../models/leave_models.dart';

class LeaveRequestController extends ChangeNotifier {
  LeaveRequestController({LeaveRepositoryBase? repository})
      : _repository = repository ?? LeaveRepository();

  final LeaveRepositoryBase _repository;

  String? _selectedLeaveType;
  DateTime? _startDate;
  DateTime? _endDate;
  String _reason = '';
  AttachmentMetadata? _attachment;
  bool _isSubmitting = false;
  bool _isPickingAttachment = false;
  String? _errorMessage;
  LeaveRequestSummary? _lastSubmission;

  String? get selectedLeaveType => _selectedLeaveType;
  DateTime? get startDate => _startDate;
  DateTime? get endDate => _endDate;
  String get reason => _reason;
  AttachmentMetadata? get attachment => _attachment;
  bool get isSubmitting => _isSubmitting;
  bool get isPickingAttachment => _isPickingAttachment;
  String? get errorMessage => _errorMessage;
  LeaveRequestSummary? get lastSubmission => _lastSubmission;

  void selectLeaveType(String? type) {
    if (_selectedLeaveType == type) {
      return;
    }
    _selectedLeaveType = type;
    notifyListeners();
  }

  void updateDates({DateTime? start, DateTime? end}) {
    _startDate = start;
    _endDate = end;
    notifyListeners();
  }

  void updateReason(String value) {
    _reason = value;
    notifyListeners();
  }

  Future<void> pickAttachment() async {
    if (_isPickingAttachment) {
      return;
    }
    _isPickingAttachment = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final metadata = await _repository.pickAndUploadAttachment();
      if (metadata != null) {
        _attachment = metadata;
      }
    } on LeaveFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isPickingAttachment = false;
      notifyListeners();
    }
  }

  void removeAttachment() {
    _attachment = null;
    notifyListeners();
  }

  Future<void> submit() async {
    if (_selectedLeaveType == null || _startDate == null || _endDate == null) {
      _errorMessage = 'Please complete all required fields.';
      notifyListeners();
      return;
    }

    if (_isSubmitting) {
      return;
    }

    _isSubmitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _lastSubmission = await _repository.submitLeaveRequest(
        leaveType: _selectedLeaveType!,
        startDate: _startDate!,
        endDate: _endDate!,
        reason: _reason,
        attachmentId: _attachment?.attachmentId,
      );
    } on LeaveFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  Future<void> cancelRequest(String requestId) async {
    if (_isSubmitting) {
      return;
    }

    _isSubmitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _repository.cancelLeaveRequest(requestId);
    } on LeaveFailure catch (error) {
      _errorMessage = error.message;
    } catch (error) {
      _errorMessage = error.toString();
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
  }

  void reset() {
    _selectedLeaveType = null;
    _startDate = null;
    _endDate = null;
    _reason = '';
    _attachment = null;
    _lastSubmission = null;
    _errorMessage = null;
    notifyListeners();
  }
}


