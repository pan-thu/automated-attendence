import 'package:flutter_test/flutter_test.dart';

import 'package:client/features/attendance_history/controllers/attendance_calendar_controller.dart';
import 'package:client/features/attendance_history/controllers/day_detail_controller.dart';
import 'package:client/features/attendance_history/repository/attendance_history_repository.dart';

class FakeAttendanceHistoryRepository implements AttendanceHistoryRepository {
  FakeAttendanceHistoryRepository({
    List<AttendanceDaySummary>? summaries,
    AttendanceDayDetail? detail,
  }) : _summaries = summaries ?? <AttendanceDaySummary>[],
       _detail =
           detail ??
           AttendanceDayDetail(
             date: DateTime(2025, 10, 8),
             status: 'present',
             manualOverride: null,
             checks: const <AttendanceCheckDetail>[],
             violations: const <String>[],
             notes: const <String>[],
           );

  List<AttendanceDaySummary> _summaries;
  AttendanceDayDetail _detail;
  bool throwOnSummaries = false;
  bool throwOnDetail = false;
  DateTime? requestedStart;
  DateTime? requestedEnd;
  AttendanceFilters? requestedFilters;
  DateTime? requestedDetailDate;

  set summaries(List<AttendanceDaySummary> value) => _summaries = value;
  set detail(AttendanceDayDetail value) => _detail = value;

  @override
  Future<List<AttendanceDaySummary>> fetchAttendance({
    required DateTime start,
    required DateTime end,
    required AttendanceFilters filters,
  }) async {
    if (throwOnSummaries) {
      throw Exception('summaries failure');
    }
    requestedStart = start;
    requestedEnd = end;
    requestedFilters = filters;
    return _summaries;
  }

  @override
  Future<AttendanceDayDetail> fetchDayDetail(DateTime date) async {
    if (throwOnDetail) {
      throw Exception('detail failure');
    }
    requestedDetailDate = date;
    return _detail;
  }
}

void main() {
  group('AttendanceCalendarController', () {
    late FakeAttendanceHistoryRepository repository;
    late AttendanceCalendarController controller;

    setUp(() {
      repository = FakeAttendanceHistoryRepository();
      controller = AttendanceCalendarController(
        repository: repository,
        clock: () => DateTime(2025, 10, 1),
      );
    });

    test('initialize loads current month summaries', () async {
      repository.summaries = <AttendanceDaySummary>[
        AttendanceDaySummary(
          date: DateTime(2025, 10, 8),
          status: 'present',
          violationTypes: const <String>['late'],
          hasManualOverride: false,
        ),
      ];

      expect(controller.isLoading, isFalse);

      await controller.initialize();

      expect(controller.isLoading, isFalse);
      expect(controller.errorMessage, isNull);
      expect(controller.days.length, 1);
      expect(controller.days.first.status, 'present');
      expect(repository.requestedStart, DateTime(2025, 10, 1));
      expect(repository.requestedEnd, DateTime(2025, 10, 31));
    });

    test('initialize captures repository errors', () async {
      repository.throwOnSummaries = true;

      await controller.initialize();

      expect(controller.isLoading, isFalse);
      expect(controller.errorMessage, isNotNull);
      expect(controller.days, isEmpty);
    });

    test('selectMonth reloads summaries for new month', () async {
      await controller.initialize();
      repository.summaries = <AttendanceDaySummary>[
        AttendanceDaySummary(
          date: DateTime(2025, 11, 10),
          status: 'absent',
          violationTypes: const <String>['absent'],
          hasManualOverride: true,
        ),
      ];

      await controller.selectMonth(DateTime(2025, 11, 1));

      expect(repository.requestedStart, DateTime(2025, 11, 1));
      expect(repository.requestedEnd, DateTime(2025, 11, 30));
      expect(controller.days.length, 1);
      expect(controller.days.first.status, 'absent');
    });

    test('applyFilters with date range requests exact span and updates cache key', () async {
      repository.summaries = <AttendanceDaySummary>[
        AttendanceDaySummary(
          date: DateTime(2025, 9, 15),
          status: 'present',
          violationTypes: const <String>[],
          hasManualOverride: false,
        ),
      ];

      await controller.applyFilters(
        const AttendanceFilters(
          startDate: DateTime(2025, 9, 10),
          endDate: DateTime(2025, 9, 20),
        ),
      );

      expect(repository.requestedStart, DateTime(2025, 9, 10));
      expect(repository.requestedEnd, DateTime(2025, 9, 20));
      expect(controller.days.length, 1);
      expect(controller.days.first.date, DateTime(2025, 9, 15));

      repository.summaries = <AttendanceDaySummary>[];
      await controller.applyFilters(
        const AttendanceFilters(
          startDate: DateTime(2025, 9, 10),
          endDate: DateTime(2025, 9, 20),
        ),
      );

      expect(repository.requestedStart, DateTime(2025, 9, 10));
      expect(repository.requestedEnd, DateTime(2025, 9, 20));
      expect(controller.days.length, 0);
    });
  });

  group('DayDetailController', () {
    late FakeAttendanceHistoryRepository repository;
    late DayDetailController controller;

    setUp(() {
      repository = FakeAttendanceHistoryRepository();
      controller = DayDetailController(repository: repository);
    });

    test('loadDetail fetches and stores attendance detail', () async {
      final date = DateTime(2025, 10, 8);
      repository.detail = AttendanceDayDetail(
        date: date,
        status: 'present',
        manualOverride: const ManualOverrideSummary(
          by: 'Admin',
          reason: 'Adjusted',
        ),
        checks: const <AttendanceCheckDetail>[
          AttendanceCheckDetail(
            slot: 'morning',
            status: 'on_time',
            timestamp: '2025-10-08T08:30:00.000Z',
            geofenceStatus: 'inside',
          ),
        ],
        violations: const <String>['late'],
        notes: const <String>['Valid reason'],
      );

      await controller.loadDetail(date);

      expect(controller.isLoading, isFalse);
      expect(controller.detail?.status, 'present');
      expect(repository.requestedDetailDate, date);
    });

    test('loadDetail handles repository errors', () async {
      repository.throwOnDetail = true;

      await controller.loadDetail(DateTime(2025, 10, 9));

      expect(controller.isLoading, isFalse);
      expect(controller.errorMessage, isNotNull);
      expect(controller.detail, isNull);
    });
  });
}
