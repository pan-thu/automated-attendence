import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';

class AttendanceHistoryRepository {
  AttendanceHistoryRepository({FirebaseFunctions? functions})
    : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<List<AttendanceDaySummary>> fetchAttendance({
    required DateTime start,
    required DateTime end,
    required AttendanceFilters filters,
  }) async {
    try {
      final callable = _functions.httpsCallable('listEmployeeAttendance');
      final response = await callable.call({
        'startDate': DateFormat('yyyy-MM-dd').format(start),
        'endDate': DateFormat('yyyy-MM-dd').format(end),
        'status': filters.status,
        'violationTypes': filters.violationTypes,
      });

      final raw = List<Map<String, dynamic>>.from(
        (response.data as List?)?.map(
              (entry) => Map<String, dynamic>.from(entry as Map),
            ) ??
            const <Map<String, dynamic>>[],
      );

      final summaries = raw.map(AttendanceDaySummary.fromJson).toList()
        ..sort((a, b) => b.date.compareTo(a.date));
      return summaries;
    } on FirebaseFunctionsException catch (error) {
      throw AttendanceHistoryFailure(
        error.message ?? 'Failed to load attendance history (${error.code}).',
      );
    } catch (error) {
      throw AttendanceHistoryFailure(
        'Failed to load attendance history: $error',
      );
    }
  }

  Future<AttendanceDayDetail> fetchDayDetail(DateTime date) async {
    try {
      final callable = _functions.httpsCallable('getAttendanceDayDetail');
      final response = await callable.call({
        'date': DateFormat('yyyy-MM-dd').format(date),
      });

      final data = Map<String, dynamic>.from(response.data as Map);
      return AttendanceDayDetail.fromJson(data);
    } on FirebaseFunctionsException catch (error) {
      throw AttendanceHistoryFailure(
        error.message ?? 'Failed to load day detail (${error.code}).',
      );
    } catch (error) {
      throw AttendanceHistoryFailure('Failed to load day detail: $error');
    }
  }
}

class AttendanceHistoryFailure implements Exception {
  const AttendanceHistoryFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

class AttendanceDaySummary {
  const AttendanceDaySummary({
    required this.date,
    required this.status,
    required this.violationTypes,
    required this.hasManualOverride,
  });

  final DateTime date;
  final String? status;
  final List<String> violationTypes;
  final bool hasManualOverride;

  factory AttendanceDaySummary.fromJson(Map<String, dynamic> json) {
    return AttendanceDaySummary(
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String?,
      violationTypes: List<String>.from(
        json['violationTypes'] as List? ?? const <String>[],
      ),
      hasManualOverride: json['hasManualOverride'] as bool? ?? false,
    );
  }
}

enum DateRangePreset {
  none,
  thisMonth,
  lastMonth,
  last30Days,
}

class AttendanceFilters {
  const AttendanceFilters({
    this.status,
    this.violationTypes = const <String>[],
    this.startDate,
    this.endDate,
    this.rangePreset = DateRangePreset.none,
  });

  final String? status;
  final List<String> violationTypes;
  final DateTime? startDate;
  final DateTime? endDate;
  final DateRangePreset rangePreset;

  AttendanceFilters copyWith({
    String? status,
    List<String>? violationTypes,
    DateTime? startDate,
    DateTime? endDate,
    DateRangePreset? rangePreset,
  }) {
    return AttendanceFilters(
      status: status ?? this.status,
      violationTypes: violationTypes ?? this.violationTypes,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      rangePreset: rangePreset ?? this.rangePreset,
    );
  }

  bool get hasFilters =>
      status != null || violationTypes.isNotEmpty || hasDateRange;

  bool get hasDateRange => rangePreset != DateRangePreset.none || startDate != null || endDate != null;

  AttendanceFilters withoutDateRange() {
    return AttendanceFilters(
      status: status,
      violationTypes: violationTypes,
      rangePreset: DateRangePreset.none,
    );
  }
}

class AttendanceDayDetail {
  const AttendanceDayDetail({
    required this.date,
    required this.status,
    required this.manualOverride,
    required this.checks,
    required this.violations,
    required this.notes,
  });

  final DateTime date;
  final String? status;
  final ManualOverrideSummary? manualOverride;
  final List<AttendanceCheckDetail> checks;
  final List<String> violations;
  final List<String> notes;

  factory AttendanceDayDetail.fromJson(Map<String, dynamic> json) {
    final checksJson = List<Map<String, dynamic>>.from(
      (json['checks'] as List? ?? []).map(
        (entry) => Map<String, dynamic>.from(entry as Map),
      ),
    );

    return AttendanceDayDetail(
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      status: json['status'] as String?,
      manualOverride:
          json['manualOverride'] == null
              ? null
              : ManualOverrideSummary.fromJson(
                Map<String, dynamic>.from(json['manualOverride'] as Map),
              ),
      checks: checksJson.map(AttendanceCheckDetail.fromJson).toList(),
      violations: List<String>.from(
        json['violations'] as List? ?? const <String>[],
      ),
      notes: List<String>.from(json['notes'] as List? ?? const <String>[]),
    );
  }
}

class ManualOverrideSummary {
  const ManualOverrideSummary({required this.by, required this.reason});

  final String? by;
  final String? reason;

  factory ManualOverrideSummary.fromJson(Map<String, dynamic> json) {
    return ManualOverrideSummary(
      by: json['by'] as String?,
      reason: json['reason'] as String?,
    );
  }
}

class AttendanceCheckDetail {
  const AttendanceCheckDetail({
    required this.slot,
    required this.status,
    required this.timestamp,
    required this.geofenceStatus,
  });

  final String slot;
  final String? status;
  final String? timestamp;
  final String? geofenceStatus;

  factory AttendanceCheckDetail.fromJson(Map<String, dynamic> json) {
    return AttendanceCheckDetail(
      slot: json['slot'] as String? ?? '',
      status: json['status'] as String?,
      timestamp: json['timestamp'] as String?,
      geofenceStatus: json['geofenceStatus'] as String?,
    );
  }
}

class AttendanceExportPayload {
  const AttendanceExportPayload({
    required this.title,
    required this.generatedAt,
    required this.days,
  });

  final String title;
  final DateTime generatedAt;
  final List<AttendanceDaySummary> days;
}
