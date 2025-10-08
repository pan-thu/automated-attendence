import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:client/core/services/notification_repository.dart';
import 'package:client/features/notifications/controllers/notification_controller.dart';

class _MockNotificationRepository extends Mock
    implements NotificationRepositoryBase {}

void main() {
  group('NotificationController', () {
    late NotificationController controller;
    late _MockNotificationRepository repository;

    setUp(() {
      repository = _MockNotificationRepository();
      controller = NotificationController(repository: repository);
    });

    test('refresh populates items on success', () async {
      final notif = NotificationItem(
        id: 'id',
        title: 'title',
        message: 'message',
        category: 'system',
        type: 'info',
        isRead: false,
        sentAt: DateTime.now(),
        readAt: null,
        relatedId: null,
        metadata: const {},
      );
      when(() => repository.fetchNotifications(filter: any(named: 'filter')))
          .thenAnswer((_) async => NotificationPage(items: [notif]));

      await controller.refresh();

      expect(controller.items, hasLength(1));
      expect(controller.errorMessage, isNull);
    });

    test('refresh records error on failure', () async {
      when(() => repository.fetchNotifications(filter: any(named: 'filter')))
          .thenThrow(const NotificationFailure('boom'));

      await controller.refresh();

      expect(controller.items, isEmpty);
      expect(controller.errorMessage, 'boom');
    });

    test('markAsRead rolls back on failure', () async {
      final notif = NotificationItem(
        id: 'id',
        title: 'title',
        message: 'message',
        category: 'system',
        type: 'info',
        isRead: false,
        sentAt: DateTime.now(),
        readAt: null,
        relatedId: null,
        metadata: const {},
      );
      when(() => repository.fetchNotifications(filter: any(named: 'filter')))
          .thenAnswer((_) async => NotificationPage(items: [notif]));
      await controller.refresh();

      when(() => repository.markAsRead(notificationId: 'id', acknowledgment: any(named: 'acknowledgment')))
          .thenThrow(const NotificationFailure('error'));

      await controller.markAsRead(controller.items.first);

      expect(controller.items.first.isRead, isFalse);
      expect(controller.errorMessage, 'error');
    });
  });
}

