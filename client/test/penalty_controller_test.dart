import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:client/core/services/penalty_repository.dart';
import 'package:client/features/penalties/controllers/penalty_controller.dart';

class _MockPenaltyRepository extends Mock implements PenaltyRepositoryBase {}

void main() {
  group('PenaltyController', () {
    late PenaltyController controller;
    late _MockPenaltyRepository repository;

    setUp(() {
      repository = _MockPenaltyRepository();
      controller = PenaltyController(repository: repository);
    });

    test('refresh fetches penalties', () async {
      final penalty = PenaltyItem(
        id: 'pen',
        status: 'active',
        violationType: 'late',
        reason: 'late arrival',
        amount: 10,
        dateIncurred: DateTime.now(),
        acknowledged: false,
        acknowledgedAt: null,
        metadata: const {},
        violationCount: 1,
      );
      when(() => repository.fetchPenalties(filter: any(named: 'filter')))
          .thenAnswer((_) async => PenaltyPage(items: [penalty]));

      await controller.refresh();

      expect(controller.items, hasLength(1));
      expect(controller.errorMessage, isNull);
    });

    test('acknowledgePenalty rolls back on failure', () async {
      final penalty = PenaltyItem(
        id: 'pen',
        status: 'active',
        violationType: 'late',
        reason: 'late arrival',
        amount: 10,
        dateIncurred: DateTime.now(),
        acknowledged: false,
        acknowledgedAt: null,
        metadata: const {},
        violationCount: 1,
      );
      when(() => repository.fetchPenalties(filter: any(named: 'filter')))
          .thenAnswer((_) async => PenaltyPage(items: [penalty]));
      await controller.refresh();

      when(() => repository.acknowledgePenalty(penaltyId: 'pen', note: any(named: 'note')))
          .thenThrow(const PenaltyFailure('fail'));

      await controller.acknowledgePenalty(controller.items.first);

      expect(controller.items.first.acknowledged, isFalse);
      expect(controller.errorMessage, 'fail');
    });
  });
}

