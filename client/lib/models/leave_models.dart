import 'package:intl/intl.dart';

enum LeaveStatus {
  pending,
  approved,
  rejected,
  cancelled,
}

class LeaveRequestSummary {
  const LeaveRequestSummary({required this.requestId});

  final String requestId;

  factory LeaveRequestSummary.fromJson(Map<String, dynamic> json) {
    return LeaveRequestSummary(
      requestId: json['requestId'] as String? ?? '',
    );
  }
}

class LeaveListPage {
  const LeaveListPage({required this.items, required this.nextCursor});

  final List<LeaveListItem> items;
  final String? nextCursor;

  factory LeaveListPage.fromJson(Map<String, dynamic> json) {
    final itemsJson = List<Map<String, dynamic>>.from(
      (json['items'] as List?)?.map(
            (item) => Map<String, dynamic>.from(item as Map),
          ) ??
          const <Map<String, dynamic>>[],
    );

    return LeaveListPage(
      items: itemsJson.map(LeaveListItem.fromJson).toList(),
      nextCursor: json['nextCursor'] as String?,
    );
  }
}

class LeaveListItem {
  const LeaveListItem({
    required this.id,
    required this.leaveType,
    required this.status,
    required this.startDate,
    required this.endDate,
    required this.reason,
    required this.reviewerNotes,
    required this.attachmentId,
    required this.submittedAt,
    required this.reviewedAt,
  });

  final String id;
  final String leaveType;
  final LeaveStatus status;
  final DateTime? startDate;
  final DateTime? endDate;
  final String? reason;
  final String? reviewerNotes;
  final String? attachmentId;
  final DateTime? submittedAt;
  final DateTime? reviewedAt;

  factory LeaveListItem.fromJson(Map<String, dynamic> json) {
    return LeaveListItem(
      id: json['id'] as String? ?? '',
      leaveType: json['leaveType'] as String? ?? 'unknown',
      status: _parseStatus(json['status']),
      startDate: _parseIso(json['startDate']),
      endDate: _parseIso(json['endDate']),
      reason: json['reason'] as String?,
      reviewerNotes: json['reviewerNotes'] as String?,
      attachmentId: json['attachmentId'] as String?,
      submittedAt: _parseIso(json['submittedAt']),
      reviewedAt: _parseIso(json['reviewedAt']),
    );
  }

  String get dateRangeLabel {
    if (startDate == null && endDate == null) {
      return 'N/A';
    }
    final formatter = DateFormat.yMMMd();
    final start = startDate != null ? formatter.format(startDate!) : 'N/A';
    final end = endDate != null ? formatter.format(endDate!) : start;
    if (start == end) {
      return start;
    }
    return '$start – $end';
  }

  static LeaveStatus _parseStatus(dynamic value) {
    final raw = (value as String? ?? 'pending').toLowerCase();
    return LeaveStatus.values.firstWhere(
      (status) => status.name == raw,
      orElse: () => LeaveStatus.pending,
    );
  }

  static DateTime? _parseIso(dynamic value) {
    final raw = value as String?;
    if (raw == null || raw.isEmpty) {
      return null;
    }
    return DateTime.tryParse(raw);
  }
}

class LeaveAttachmentRequirement {
  const LeaveAttachmentRequirement({
    required this.leaveTypesRequiringAttachment,
    required this.allowedMimeTypes,
    required this.maxAttachmentSizeMb,
  });

  final Set<String> leaveTypesRequiringAttachment;
  final List<String> allowedMimeTypes;
  final double maxAttachmentSizeMb;

  bool requiresAttachment(String leaveType) =>
      leaveTypesRequiringAttachment.contains(leaveType.toLowerCase());
}

class AttachmentUploadInfo {
  const AttachmentUploadInfo({
    required this.attachmentId,
    required this.uploadUrl,
    required this.uploadHeaders,
    required this.uploadUrlExpiresAt,
  });

  final String attachmentId;
  final String uploadUrl;
  final Map<String, String> uploadHeaders;
  final DateTime uploadUrlExpiresAt;

  factory AttachmentUploadInfo.fromJson(Map<String, dynamic> json) {
    return AttachmentUploadInfo(
      attachmentId: json['attachmentId'] as String? ?? '',
      uploadUrl: json['uploadUrl'] as String? ?? '',
      uploadHeaders: Map<String, String>.from(
        (json['uploadHeaders'] as Map?)?.map(
              (key, value) => MapEntry(key as String, value as String),
            ) ??
            const <String, String>{},
      ),
      uploadUrlExpiresAt: DateTime.tryParse(json['uploadUrlExpiresAt'] as String? ?? '') ??
          DateTime.fromMillisecondsSinceEpoch(0),
    );
  }
}

class AttachmentMetadata {
  const AttachmentMetadata({
    required this.attachmentId,
    required this.storagePath,
    required this.sizeBytes,
    required this.mimeType,
  });

  final String attachmentId;
  final String storagePath;
  final int sizeBytes;
  final String mimeType;

  factory AttachmentMetadata.fromJson(Map<String, dynamic> json) {
    return AttachmentMetadata(
      attachmentId: json['attachmentId'] as String? ?? '',
      storagePath: json['storagePath'] as String? ?? '',
      sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
      mimeType: json['mimeType'] as String? ?? 'application/octet-stream',
    );
  }
}
