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

      final data = Map<String, dynamic>.from(response.data as Map);
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
      final data = Map<String, dynamic>.from(response.data as Map);
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

      final data = Map<String, dynamic>.from(response.data as Map);
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
      final data = Map<String, dynamic>.from(response.data as Map);
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

class LeaveFailure implements Exception {
  const LeaveFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

