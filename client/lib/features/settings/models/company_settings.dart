class CompanySettings {
  CompanySettings({
    required this.companyName,
    required this.geofenceRadiusMeters,
    required this.timeWindows,
    required this.geoFencingEnabled,
    required this.timezone,
    required this.penaltyRules,
  });

  final String? companyName;
  final double? geofenceRadiusMeters;
  final Map<String, TimeWindowSetting> timeWindows;
  final bool geoFencingEnabled;
  final String? timezone;
  final Map<String, PenaltyRule> penaltyRules;

  factory CompanySettings.fromJson(Map<String, dynamic> json) {
    final rawTimeWindows = Map<String, dynamic>.from(json['timeWindows'] as Map? ?? {});
    final timeWindows = <String, TimeWindowSetting>{};
    rawTimeWindows.forEach((key, value) {
      timeWindows[key] = TimeWindowSetting.fromJson(Map<String, dynamic>.from(value));
    });

    final rawPenaltyRules = Map<String, dynamic>.from(json['penaltyRules'] as Map? ?? {});
    final penaltyRules = <String, PenaltyRule>{};
    rawPenaltyRules.forEach((key, value) {
      penaltyRules[key] = PenaltyRule.fromJson(Map<String, dynamic>.from(value));
    });

    return CompanySettings(
      companyName: json['companyName'] as String?,
      geofenceRadiusMeters: (json['workplaceRadius'] as num?)?.toDouble(),
      timeWindows: timeWindows,
      geoFencingEnabled: json['geoFencingEnabled'] as bool? ?? true,
      timezone: json['timezone'] as String?,
      penaltyRules: penaltyRules,
    );
  }
}

class TimeWindowSetting {
  TimeWindowSetting({required this.label, required this.start, required this.end});

  final String label;
  final String start;
  final String end;

  factory TimeWindowSetting.fromJson(Map<String, dynamic> json) {
    return TimeWindowSetting(
      label: json['label'] as String? ?? '',
      start: json['start'] as String? ?? '',
      end: json['end'] as String? ?? '',
    );
  }
}

class PenaltyRule {
  PenaltyRule({required this.description, this.threshold, this.amount});

  final String description;
  final int? threshold;
  final double? amount;

  factory PenaltyRule.fromJson(Map<String, dynamic> json) {
    return PenaltyRule(
      description: json['description'] as String? ?? '',
      threshold: (json['threshold'] as num?)?.toInt(),
      amount: (json['amount'] as num?)?.toDouble(),
    );
  }
}

