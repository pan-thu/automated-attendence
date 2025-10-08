import 'package:cloud_functions/cloud_functions.dart';

abstract class NotificationRepositoryBase {
  Future<NotificationPage> fetchNotifications({int limit, String? cursor, NotificationStatusFilter filter});

  Future<void> markAsRead({required String notificationId, String? acknowledgment});
}

class NotificationRepository implements NotificationRepositoryBase {
  NotificationRepository({FirebaseFunctions? functions}) : _functions = functions ?? FirebaseFunctions.instance;

  final FirebaseFunctions _functions;

  @override
  @override
  Future<NotificationPage> fetchNotifications({int limit = 20, String? cursor, NotificationStatusFilter filter = NotificationStatusFilter.all}) async {
    try {
      final callable = _functions.httpsCallable('listEmployeeNotifications');
      final payload = <String, dynamic>{
        'limit': limit,
      };

      if (cursor != null) {
        payload['cursor'] = cursor;
      }

      if (filter != NotificationStatusFilter.all) {
        payload['status'] = filter == NotificationStatusFilter.unread ? 'unread' : 'read';
      }

      final response = await callable.call(payload);
      final data = Map<String, dynamic>.from(response.data as Map);
      final items = (data['items'] as List<dynamic>? ?? const <dynamic>[])
          .map((raw) => NotificationItem.fromJson(Map<String, dynamic>.from(raw as Map)))
          .toList();

      final nextCursor = data['nextCursor'] as String?;

      return NotificationPage(items: items, nextCursor: nextCursor);
    } on FirebaseFunctionsException catch (error) {
      final message = error.message?.isNotEmpty == true ? error.message! : 'Failed to load notifications (${error.code}).';
      throw NotificationFailure(message);
    } catch (error) {
      throw NotificationFailure('Failed to load notifications: $error');
    }
  }

  @override
  Future<void> markAsRead({required String notificationId, String? acknowledgment}) async {
    try {
      final callable = _functions.httpsCallable('markNotificationRead');
      await callable.call({
        'notificationId': notificationId,
        if (acknowledgment != null && acknowledgment.isNotEmpty) 'acknowledgment': acknowledgment,
      });
    } on FirebaseFunctionsException catch (error) {
      final message = error.message?.isNotEmpty == true ? error.message! : 'Failed to update notification (${error.code}).';
      throw NotificationFailure(message);
    } catch (error) {
      throw NotificationFailure('Failed to update notification: $error');
    }
  }
}

class NotificationPage {
  const NotificationPage({required this.items, this.nextCursor});

  final List<NotificationItem> items;
  final String? nextCursor;

  bool get isLastPage => nextCursor == null;
}

class NotificationItem {
  NotificationItem({
    required this.id,
    required this.title,
    required this.message,
    required this.category,
    required this.type,
    required this.isRead,
    required this.sentAt,
    required this.readAt,
    required this.relatedId,
    required this.metadata,
  });

  factory NotificationItem.fromJson(Map<String, dynamic> json) {
    return NotificationItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      category: json['category'] as String?,
      type: json['type'] as String?,
      isRead: json['isRead'] as bool? ?? false,
      sentAt: _parseDate(json['sentAt']),
      readAt: _parseDate(json['readAt']),
      relatedId: json['relatedId'] as String?,
      metadata: json['metadata'] is Map ? Map<String, dynamic>.from(json['metadata'] as Map) : const <String, dynamic>{},
    );
  }

  final String id;
  final String title;
  final String message;
  final String? category;
  final String? type;
  final bool isRead;
  final DateTime? sentAt;
  final DateTime? readAt;
  final String? relatedId;
  final Map<String, dynamic> metadata;

  NotificationItem copyWith({bool? isRead, DateTime? readAt}) {
    return NotificationItem(
      id: id,
      title: title,
      message: message,
      category: category,
      type: type,
      isRead: isRead ?? this.isRead,
      sentAt: sentAt,
      readAt: readAt ?? this.readAt,
      relatedId: relatedId,
      metadata: metadata,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) {
      return null;
    }
    if (value is DateTime) {
      return value;
    }
    if (value is String) {
      return DateTime.tryParse(value);
    }
    if (value is int) {
      return DateTime.fromMillisecondsSinceEpoch(value);
    }
    return null;
  }
}

enum NotificationStatusFilter {
  all,
  unread,
  read,
}

class NotificationFailure implements Exception {
  const NotificationFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

