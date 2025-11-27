import 'dart:typed_data';

import 'package:cloud_functions/cloud_functions.dart';
import 'package:file_picker/file_picker.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import '../../models/leave_models.dart';

abstract class LeaveRepositoryBase {
  Future<LeaveListPage> listLeaves({LeaveStatus? status, String? cursor, int limit});
  Future<LeaveRequestSummary> submitLeaveRequest({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    String? attachmentId,
  });
  Future<void> cancelLeaveRequest(String requestId);
  Future<AttachmentUploadInfo> createAttachmentUpload({
    required String fileName,
    required String mimeType,
    required int sizeBytes,
  });
  Future<void> uploadAttachmentBytes({
    required AttachmentUploadInfo uploadInfo,
    required Uint8List data,
  });
  Future<AttachmentMetadata> finalizeAttachment(String attachmentId);
  Future<AttachmentMetadata?> pickAndUploadAttachment();
  Future<LeaveBalance> getLeaveBalance({int? year});
}

class LeaveRepository implements LeaveRepositoryBase {
  LeaveRepository({
    FirebaseFunctions? functions,
    http.Client? httpClient,
  })  : _functions = functions ?? FirebaseFunctions.instance,
        _httpClient = httpClient ?? http.Client();

  final FirebaseFunctions _functions;
  final http.Client _httpClient;

  @override
  Future<LeaveListPage> listLeaves({LeaveStatus? status, String? cursor, int limit = 20}) async {
    try {
      final callable = _functions.httpsCallable('listEmployeeLeaves');
      final response = await callable.call({
        'status': status?.name,
        'cursor': cursor,
        'limit': limit,
      });

      final data = Map<String, dynamic>.from(response.data);
      return LeaveListPage.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to load leave requests (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to load leave requests: $error');
    }
  }

  @override
  Future<LeaveRequestSummary> submitLeaveRequest({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    String? attachmentId,
  }) async {
    try {
      final callable = _functions.httpsCallable('submitLeaveRequest');
      final payload = <String, dynamic>{
        'leaveType': leaveType,
        'startDate': DateFormat('yyyy-MM-dd').format(startDate),
        'endDate': DateFormat('yyyy-MM-dd').format(endDate),
        'reason': reason,
        if (attachmentId != null) 'attachmentId': attachmentId,
      };

      final response = await callable.call(payload);
      final data = Map<String, dynamic>.from(response.data);
      return LeaveRequestSummary.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to submit leave request (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to submit leave request: $error');
    }
  }

  @override
  Future<void> cancelLeaveRequest(String requestId) async {
    try {
      final callable = _functions.httpsCallable('cancelLeaveRequest');
      await callable.call({'requestId': requestId});
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to cancel leave request (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to cancel leave request: $error');
    }
  }

  @override
  Future<AttachmentUploadInfo> createAttachmentUpload({
    required String fileName,
    required String mimeType,
    required int sizeBytes,
  }) async {
    try {
      final callable = _functions.httpsCallable('generateLeaveAttachmentUploadUrl');
      final response = await callable.call({
        'fileName': fileName,
        'mimeType': mimeType,
        'sizeBytes': sizeBytes,
      });

      final data = Map<String, dynamic>.from(response.data);
      return AttachmentUploadInfo.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to prepare attachment upload (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to prepare attachment upload: $error');
    }
  }

  @override
  Future<void> uploadAttachmentBytes({
    required AttachmentUploadInfo uploadInfo,
    required Uint8List data,
  }) async {
    try {
      final request = http.Request('PUT', Uri.parse(uploadInfo.uploadUrl))
        ..bodyBytes = data;
      request.headers.addAll(uploadInfo.uploadHeaders);

      final streamed = await _httpClient.send(request);
      if (streamed.statusCode < 200 || streamed.statusCode >= 300) {
        throw LeaveFailure('Attachment upload failed (${streamed.statusCode}).');
      }
    } on LeaveFailure {
      rethrow;
    } catch (error) {
      throw LeaveFailure('Attachment upload failed: $error');
    }
  }

  @override
  Future<AttachmentMetadata> finalizeAttachment(String attachmentId) async {
    try {
      final callable = _functions.httpsCallable('registerLeaveAttachment');
      final response = await callable.call({'attachmentId': attachmentId});
      final data = Map<String, dynamic>.from(response.data);
      return AttachmentMetadata.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to finalise attachment (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to finalise attachment: $error');
    }
  }

  @override
  Future<AttachmentMetadata?> pickAndUploadAttachment() async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) {
      return null;
    }

    final file = result.files.first;
    final data = file.bytes;
    if (data == null) {
      throw LeaveFailure('Unable to read selected file.');
    }

    final uploadInfo = await createAttachmentUpload(
      fileName: file.name,
      mimeType: _getMimeType(file.extension),
      sizeBytes: data.length,
    );

    await uploadAttachmentBytes(uploadInfo: uploadInfo, data: data);
    return finalizeAttachment(uploadInfo.attachmentId);
  }

  @override
  Future<LeaveBalance> getLeaveBalance({int? year}) async {
    try {
      final callable = _functions.httpsCallable('getLeaveBalance');
      final response = await callable.call({
        if (year != null) 'year': year,
      });

      final data = Map<String, dynamic>.from(response.data);
      return LeaveBalance.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw LeaveFailure(
        error.message ?? 'Failed to fetch leave balance (${error.code}).',
      );
    } catch (error) {
      throw LeaveFailure('Failed to fetch leave balance: $error');
    }
  }

  String _getMimeType(String? extension) {
    if (extension == null) return 'application/octet-stream';

    final ext = extension.toLowerCase();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'xls':
        return 'application/vnd.ms-excel';
      case 'xlsx':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'txt':
        return 'text/plain';
      default:
        return 'application/octet-stream';
    }
  }
}

class LeaveBalance {
  LeaveBalance({
    required this.total,
    required this.used,
    required this.remaining,
    required this.year,
    this.breakdown,
  });

  factory LeaveBalance.fromJson(Map<String, dynamic> json) {
    final breakdownData = json['breakdown'] != null
        ? Map<String, dynamic>.from(json['breakdown'])
        : null;

    return LeaveBalance(
      total: (json['total'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
      breakdown: breakdownData != null
          ? LeaveBreakdown.fromJson(breakdownData)
          : null,
    );
  }

  final int total;
  final int used;
  final int remaining;
  final int year;
  final LeaveBreakdown? breakdown;
}

class LeaveBreakdown {
  LeaveBreakdown({
    this.full,
    this.medical,
    this.maternity,
  });

  factory LeaveBreakdown.fromJson(Map<String, dynamic> json) {
    return LeaveBreakdown(
      full: json['full'] != null
          ? LeaveTypeBalance.fromJson(Map<String, dynamic>.from(json['full'] as Map))
          : null,
      medical: json['medical'] != null
          ? LeaveTypeBalance.fromJson(Map<String, dynamic>.from(json['medical'] as Map))
          : null,
      maternity: json['maternity'] != null
          ? LeaveTypeBalance.fromJson(Map<String, dynamic>.from(json['maternity'] as Map))
          : null,
    );
  }

  final LeaveTypeBalance? full;
  final LeaveTypeBalance? medical;
  final LeaveTypeBalance? maternity;
}

class LeaveTypeBalance {
  LeaveTypeBalance({
    required this.total,
    required this.used,
    required this.remaining,
  });

  factory LeaveTypeBalance.fromJson(Map<String, dynamic> json) {
    return LeaveTypeBalance(
      total: (json['total'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
    );
  }

  final int total;
  final int used;
  final int remaining;
}

class LeaveFailure implements Exception {
  const LeaveFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

