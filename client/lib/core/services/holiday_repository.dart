import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../types/holiday.dart';
import '../config/app_environment.dart';
import '../utils/error_handler.dart';
import 'package:firebase_auth/firebase_auth.dart' as auth;

/// Base interface for holiday repository
abstract class HolidayRepositoryBase {
  Future<List<Holiday>> getHolidays({int? year});
}

/// Holiday repository implementation
///
/// Fetches holidays from the backend API
class HolidayRepository implements HolidayRepositoryBase {
  final http.Client _client;
  final auth.FirebaseAuth _firebaseAuth;
  final AppEnvironment _environment;

  HolidayRepository({
    http.Client? client,
    auth.FirebaseAuth? firebaseAuth,
    AppEnvironment? environment,
  })  : _client = client ?? http.Client(),
        _firebaseAuth = firebaseAuth ?? auth.FirebaseAuth.instance,
        _environment = environment ?? AppEnvironment();

  @override
  Future<List<Holiday>> getHolidays({int? year}) async {
    try {
      final user = _firebaseAuth.currentUser;
      if (user == null) {
        throw AppException('User not authenticated', type: ErrorType.auth);
      }

      final token = await user.getIdToken();
      final yearParam = year ?? DateTime.now().year;
      final url = Uri.parse('${_environment.apiUrl}/holidays?year=$yearParam');

      final response = await _client.get(
        url,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        final holidaysJson = data['holidays'] as List<dynamic>;
        return holidaysJson
            .map((json) => Holiday.fromJson(json as Map<String, dynamic>))
            .toList();
      } else if (response.statusCode == 401) {
        throw AppException('Unauthorized', type: ErrorType.auth);
      } else {
        throw AppException(
          'Failed to fetch holidays: ${response.statusCode}',
          type: ErrorType.network,
        );
      }
    } on auth.FirebaseAuthException catch (e) {
      throw AppException(
        'Authentication error: ${e.message}',
        type: ErrorType.auth,
      );
    } catch (e) {
      if (e is AppException) rethrow;
      throw AppException(
        'Failed to fetch holidays: $e',
        type: ErrorType.unknown,
      );
    }
  }

  void dispose() {
    _client.close();
  }
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
