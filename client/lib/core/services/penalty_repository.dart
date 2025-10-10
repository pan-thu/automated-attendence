import 'package:cloud_functions/cloud_functions.dart';

import '../data/cache_manager.dart';

abstract class PenaltyRepositoryBase {
  Future<PenaltyPage> fetchPenalties({
    PenaltyStatusFilter filter,
    String? cursor,
    int limit,
    bool forceRefresh,
  });

  Future<void> acknowledgePenalty({required String penaltyId, String? note});
}

class PenaltyRepository implements PenaltyRepositoryBase {
  PenaltyRepository({
    FirebaseFunctions? functions,
    CacheManager<PenaltyPage>? cacheManager,
  })  : _functions = functions ?? FirebaseFunctions.instance,
        _cacheManager = cacheManager ?? CacheManager<PenaltyPage>(ttl: const Duration(minutes: 5));

  final FirebaseFunctions _functions;
  final CacheManager<PenaltyPage> _cacheManager;

  static String _cacheKey(PenaltyStatusFilter filter) => 'penalties:${filter.name}';

  @override
  Future<PenaltyPage> fetchPenalties({
    PenaltyStatusFilter filter = PenaltyStatusFilter.all,
    String? cursor,
    int limit = 20,
    bool forceRefresh = false,
  }) async {
    if (cursor == null && !forceRefresh) {
      final cached = _cacheManager.read(_cacheKey(filter));
      if (cached != null) {
        return cached.value;
      }
    }

    try {
      final callable = _functions.httpsCallable('listEmployeePenalties');
      final payload = <String, dynamic>{'limit': limit};
      if (cursor != null) {
        payload['cursor'] = cursor;
      }
      final status = filter.toStatusString();
      if (status != null) {
        payload['status'] = status;
      }

      final response = await callable.call(payload);
      final data = Map<String, dynamic>.from(response.data as Map);
      final items = (data['items'] as List<dynamic>? ?? const <dynamic>[])
          .map((raw) => PenaltyItem.fromJson(Map<String, dynamic>.from(raw as Map)))
          .toList();
      final page = PenaltyPage(
        items: items,
        nextCursor: data['nextCursor'] as String?,
        lastSyncedAt: DateTime.now(),
      );
      if (cursor == null) {
        _cacheManager.write(_cacheKey(filter), page);
      }
      return page;
    } on FirebaseFunctionsException catch (error) {
      final message = error.message?.isNotEmpty == true ? error.message! : 'Failed to load penalties (${error.code}).';
      throw PenaltyFailure(message);
    } catch (error) {
      throw PenaltyFailure('Failed to load penalties: $error');
    }
  }

  @override
  Future<void> acknowledgePenalty({required String penaltyId, String? note}) async {
    try {
      final callable = _functions.httpsCallable('acknowledgePenalty');
      await callable.call({
        'penaltyId': penaltyId,
        if (note != null && note.isNotEmpty) 'note': note,
      });
      _cacheManager.invalidate(_cacheKey(PenaltyStatusFilter.all));
      _cacheManager.invalidate(_cacheKey(PenaltyStatusFilter.active));
    } on FirebaseFunctionsException catch (error) {
      final message = error.message?.isNotEmpty == true ? error.message! : 'Failed to acknowledge penalty (${error.code}).';
      throw PenaltyFailure(message);
    } catch (error) {
      throw PenaltyFailure('Failed to acknowledge penalty: $error');
    }
  }
}

class PenaltyPage {
  const PenaltyPage({
    required this.items,
    this.nextCursor,
    DateTime? lastSyncedAt,
  }) : lastSyncedAt = lastSyncedAt ?? DateTime.now();

  final List<PenaltyItem> items;
  final String? nextCursor;
  final DateTime lastSyncedAt;

  PenaltyPage copyWith({
    List<PenaltyItem>? items,
    String? nextCursor,
    DateTime? lastSyncedAt,
  }) {
    return PenaltyPage(
      items: items ?? this.items,
      nextCursor: nextCursor ?? this.nextCursor,
      lastSyncedAt: lastSyncedAt ?? this.lastSyncedAt,
    );
  }

  bool get isLastPage => nextCursor == null;
}

class PenaltyItem {
  PenaltyItem({
    required this.id,
    required this.status,
    required this.violationType,
    required this.reason,
    required this.amount,
    required this.dateIncurred,
    required this.acknowledged,
    required this.acknowledgedAt,
    required this.metadata,
    required this.violationCount,
  });

  factory PenaltyItem.fromJson(Map<String, dynamic> json) {
    final data = Map<String, dynamic>.from(json['data'] as Map? ?? const {});
    return PenaltyItem(
      id: json['id'] as String? ?? '',
      status: data['status'] as String? ?? 'active',
      violationType: data['violationType'] as String? ?? 'violation',
      reason: data['reason'] as String? ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0,
      dateIncurred: _parseDate(data['dateIncurred']),
      acknowledged: data['acknowledged'] as bool? ?? false,
      acknowledgedAt: _parseDate(data['acknowledgedAt']),
      metadata: data['metadata'] is Map ? Map<String, dynamic>.from(data['metadata'] as Map) : const <String, dynamic>{},
      violationCount: (data['violationCount'] as num?)?.toInt(),
    );
  }

  final String id;
  final String status;
  final String violationType;
  final String reason;
  final double amount;
  final DateTime? dateIncurred;
  final bool acknowledged;
  final DateTime? acknowledgedAt;
  final Map<String, dynamic> metadata;
  final int? violationCount;

  PenaltyItem copyWith({bool? acknowledged, DateTime? acknowledgedAt, String? status}) {
    return PenaltyItem(
      id: id,
      status: status ?? this.status,
      violationType: violationType,
      reason: reason,
      amount: amount,
      dateIncurred: dateIncurred,
      acknowledged: acknowledged ?? this.acknowledged,
      acknowledgedAt: acknowledgedAt ?? this.acknowledgedAt,
      metadata: metadata,
      violationCount: violationCount,
    );
  }

  static DateTime? _parseDate(dynamic value) {
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

enum PenaltyStatusFilter {
  all,
  active,
  waived,
  paid,
  disputed,
}

extension on PenaltyStatusFilter {
  String? toStatusString() {
    switch (this) {
      case PenaltyStatusFilter.all:
        return null;
      case PenaltyStatusFilter.active:
        return 'active';
      case PenaltyStatusFilter.waived:
        return 'waived';
      case PenaltyStatusFilter.paid:
        return 'paid';
      case PenaltyStatusFilter.disputed:
        return 'disputed';
    }
  }
}

class PenaltyFailure implements Exception {
  const PenaltyFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

