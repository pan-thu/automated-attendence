import 'package:cloud_functions/cloud_functions.dart';
import 'package:intl/intl.dart';

class DashboardRepository {
  DashboardRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  Future<DashboardSummary> fetchDashboard({DateTime? date}) async {
    final dashboardCallable = _functions.httpsCallable('getEmployeeDashboard');
    final settingsCallable = _functions.httpsCallable('getCompanySettingsPublic');

    final Map<String, dynamic> payload = {};
    if (date != null) {
      payload['date'] = DateFormat('yyyy-MM-dd').format(date);
    }

    final results = await Future.wait([
      dashboardCallable.call(payload),
      settingsCallable.call(),
    ]);

    final dashboardData = Map<String, dynamic>.from(results[0].data as Map);
    final settingsData = Map<String, dynamic>.from(results[1].data as Map);

    return DashboardSummary.fromJson(
      dashboardData,
      CompanySettingsSummary.fromJson(settingsData),
    );
  }
}

class DashboardSummary {
  DashboardSummary({
    required this.date,
    required this.attendance,
    required this.remainingChecks,
    required this.upcomingLeave,
    required this.activePenalties,
    required this.unreadNotifications,
    required this.leaveBalances,
    required this.isActive,
    required this.companySettings,
  });

  final DateTime date;
  final AttendanceSummary attendance;
  final List<String> remainingChecks;
  final List<LeaveSummary> upcomingLeave;
  final List<PenaltySummary> activePenalties;
  final int unreadNotifications;
  final Map<String, num> leaveBalances;
  final bool isActive;
  final CompanySettingsSummary companySettings;

  bool get hasRemainingChecks => remainingChecks.isNotEmpty;

  factory DashboardSummary.fromJson(
    Map<String, dynamic> json,
    CompanySettingsSummary companySettings,
  ) {
    final attendanceJson = Map<String, dynamic>.from(json['attendance'] as Map? ?? {});
    final checksJson = List<Map<String, dynamic>>.from(
      (attendanceJson['checksCompleted'] as List? ?? []).map(
        (entry) => Map<String, dynamic>.from(entry as Map),
      ),
    );

    final upcomingLeaveJson = List<Map<String, dynamic>>.from(
      (json['upcomingLeave'] as List? ?? []).map(
        (entry) => Map<String, dynamic>.from(entry as Map),
      ),
    );

    final penaltiesJson = List<Map<String, dynamic>>.from(
      (json['activePenalties'] as List? ?? []).map(
        (entry) => Map<String, dynamic>.from(entry as Map),
      ),
    );

    return DashboardSummary(
      date: DateTime.tryParse(json['date'] as String? ?? '') ?? DateTime.now(),
      attendance: AttendanceSummary.fromJson(attendanceJson, checksJson),
      remainingChecks: List<String>.from(json['remainingChecks'] as List? ?? const []),
      upcomingLeave: upcomingLeaveJson.map(LeaveSummary.fromJson).toList(),
      activePenalties: penaltiesJson.map(PenaltySummary.fromJson).toList(),
      unreadNotifications: (json['unreadNotifications'] as num?)?.toInt() ?? 0,
      leaveBalances: Map<String, num>.from(json['leaveBalances'] as Map? ?? {}),
      isActive: json['isActive'] as bool? ?? true,
      companySettings: companySettings,
    );
  }
}

class AttendanceSummary {
  AttendanceSummary({
    required this.status,
    required this.checks,
  });

  final String? status;
  final List<CheckSummary> checks;

  factory AttendanceSummary.fromJson(
    Map<String, dynamic> attendanceJson,
    List<Map<String, dynamic>> checksJson,
  ) {
    return AttendanceSummary(
      status: attendanceJson['status'] as String?,
      checks: checksJson.map(CheckSummary.fromJson).toList(),
    );
  }
}

class CheckSummary {
  CheckSummary({
    required this.slot,
    required this.status,
    required this.timestamp,
  });

  final String slot;
  final String? status;
  final DateTime? timestamp;

  factory CheckSummary.fromJson(Map<String, dynamic> json) {
    return CheckSummary(
      slot: json['slot'] as String? ?? 'check',
      status: json['status'] as String?,
      timestamp: DateTime.tryParse(json['timestamp'] as String? ?? ''),
    );
  }
}

class LeaveSummary {
  LeaveSummary({
    required this.requestId,
    required this.status,
    required this.startDate,
    required this.endDate,
  });

  final String requestId;
  final String status;
  final DateTime? startDate;
  final DateTime? endDate;

  factory LeaveSummary.fromJson(Map<String, dynamic> json) {
    return LeaveSummary(
      requestId: json['requestId'] as String? ?? '',
      status: json['status'] as String? ?? 'unknown',
      startDate: DateTime.tryParse(json['startDate'] as String? ?? ''),
      endDate: DateTime.tryParse(json['endDate'] as String? ?? ''),
    );
  }
}

class PenaltySummary {
  PenaltySummary({
    required this.penaltyId,
    required this.status,
    required this.amount,
    required this.violationType,
    required this.dateIncurred,
  });

  final String penaltyId;
  final String status;
  final double amount;
  final String? violationType;
  final DateTime? dateIncurred;

  factory PenaltySummary.fromJson(Map<String, dynamic> json) {
    return PenaltySummary(
      penaltyId: json['penaltyId'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      violationType: json['violationType'] as String?,
      dateIncurred: DateTime.tryParse(json['dateIncurred'] as String? ?? ''),
    );
  }
}

class CompanySettingsSummary {
  CompanySettingsSummary({
    required this.companyName,
    required this.geofenceRadiusMeters,
    required this.timeWindows,
    required this.geoFencingEnabled,
    required this.timezone,
  });

  final String? companyName;
  final double? geofenceRadiusMeters;
  final Map<String, TimeWindowSummary> timeWindows;
  final bool geoFencingEnabled;
  final String? timezone;

  factory CompanySettingsSummary.fromJson(Map<String, dynamic> json) {
    final rawTimeWindows = Map<String, dynamic>.from(json['timeWindows'] as Map? ?? {});
    final timeWindows = <String, TimeWindowSummary>{};
    rawTimeWindows.forEach((key, value) {
      timeWindows[key] = TimeWindowSummary.fromJson(Map<String, dynamic>.from(value as Map));
    });

    return CompanySettingsSummary(
      companyName: json['companyName'] as String?,
      geofenceRadiusMeters: (json['workplaceRadius'] as num?)?.toDouble(),
      timeWindows: timeWindows,
      geoFencingEnabled: json['geoFencingEnabled'] as bool? ?? true,
      timezone: json['timezone'] as String?,
    );
  }
}

class TimeWindowSummary {
  TimeWindowSummary({
    required this.label,
    required this.start,
    required this.end,
  });

  final String label;
  final String start;
  final String end;

  factory TimeWindowSummary.fromJson(Map<String, dynamic> json) {
    return TimeWindowSummary(
      label: json['label'] as String? ?? '',
      start: json['start'] as String? ?? '',
      end: json['end'] as String? ?? '',
    );
  }
}

