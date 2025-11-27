import 'package:cloud_functions/cloud_functions.dart';

import '../../types/holiday.dart';

/// Base interface for holiday repository
abstract class HolidayRepositoryBase {
  Future<List<Holiday>> getHolidays({int? year});
}

/// Holiday repository implementation
///
/// Fetches holidays from Firebase Functions
class HolidayRepository implements HolidayRepositoryBase {
  final FirebaseFunctions _functions;

  HolidayRepository({FirebaseFunctions? functions})
      : _functions = functions ?? FirebaseFunctions.instance;

  @override
  Future<List<Holiday>> getHolidays({int? year}) async {
    try {
      final callable = _functions.httpsCallable('getHolidays');
      final yearParam = year ?? DateTime.now().year;

      final response = await callable.call({'year': yearParam});

      final data = Map<String, dynamic>.from(response.data);
      final holidaysJson = data['holidays'] as List<dynamic>;

      return holidaysJson
          .map((json) => Holiday.fromJson(Map<String, dynamic>.from(json as Map)))
          .toList();
    } on FirebaseFunctionsException catch (e) {
      throw HolidayRepositoryException(
        e.message ?? 'Failed to fetch holidays (${e.code})',
      );
    } catch (e) {
      throw HolidayRepositoryException('Failed to fetch holidays: $e');
    }
  }
}

/// Exception thrown when holiday repository operations fail
class HolidayRepositoryException implements Exception {
  final String message;

  HolidayRepositoryException(this.message);

  @override
  String toString() => message;
}

/// Mock holiday repository for testing/development
class MockHolidayRepository implements HolidayRepositoryBase {
  @override
  Future<List<Holiday>> getHolidays({int? year}) async {
    await Future.delayed(const Duration(milliseconds: 500));

    final currentYear = year ?? DateTime.now().year;

    return [
      Holiday(
        id: 'holiday-1',
        name: "New Year's Day",
        date: DateTime(currentYear, 1, 1),
        type: 'public',
        description: 'New Year celebration',
      ),
      Holiday(
        id: 'holiday-2',
        name: 'Republic Day',
        date: DateTime(currentYear, 1, 26),
        type: 'public',
        description: 'National Republic Day',
      ),
      Holiday(
        id: 'holiday-3',
        name: 'Holi',
        date: DateTime(currentYear, 3, 14),
        type: 'public',
        description: 'Festival of Colors',
      ),
      Holiday(
        id: 'holiday-4',
        name: 'Good Friday',
        date: DateTime(currentYear, 4, 7),
        type: 'public',
        description: 'Christian holiday',
      ),
      Holiday(
        id: 'holiday-5',
        name: 'Independence Day',
        date: DateTime(currentYear, 8, 15),
        type: 'public',
        description: 'National Independence Day',
      ),
      Holiday(
        id: 'holiday-6',
        name: 'Gandhi Jayanti',
        date: DateTime(currentYear, 10, 2),
        type: 'public',
        description: 'Birth anniversary of Mahatma Gandhi',
      ),
      Holiday(
        id: 'holiday-7',
        name: 'Diwali',
        date: DateTime(currentYear, 10, 24),
        type: 'public',
        description: 'Festival of Lights',
      ),
      Holiday(
        id: 'holiday-8',
        name: 'Christmas',
        date: DateTime(currentYear, 12, 25),
        type: 'public',
        description: 'Christian holiday',
      ),
    ];
  }
}
