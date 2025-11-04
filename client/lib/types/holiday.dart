/// Holiday model
///
/// Represents a company or public holiday
class Holiday {
  final String id;
  final String name;
  final DateTime date;
  final String type; // 'public', 'company', 'optional'
  final String? description;

  const Holiday({
    required this.id,
    required this.name,
    required this.date,
    required this.type,
    this.description,
  });

  factory Holiday.fromJson(Map<String, dynamic> json) {
    return Holiday(
      id: json['id'] as String,
      name: json['name'] as String,
      date: DateTime.parse(json['date'] as String),
      type: json['type'] as String? ?? 'public',
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'date': date.toIso8601String(),
      'type': type,
      if (description != null) 'description': description,
    };
  }

  /// Check if this holiday is upcoming (in the future)
  bool get isUpcoming => date.isAfter(DateTime.now());

  /// Check if this holiday is today
  bool get isToday {
    final now = DateTime.now();
    return date.year == now.year &&
        date.month == now.month &&
        date.day == now.day;
  }

  /// Get the number of days until this holiday
  int get daysUntil {
    final now = DateTime.now();
    final difference = date.difference(DateTime(now.year, now.month, now.day));
    return difference.inDays;
  }
}
