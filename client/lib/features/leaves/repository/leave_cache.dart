import '../../../models/leave_models.dart';

class LeaveCacheEntry {
  const LeaveCacheEntry({
    required this.items,
    required this.cursor,
    required this.updatedAt,
  });

  final List<LeaveListItem> items;
  final String? cursor;
  final DateTime updatedAt;
}

class LeaveCache {
  final Map<String, LeaveCacheEntry> _store = <String, LeaveCacheEntry>{};

  LeaveCacheEntry? get(LeaveStatus? status) => _store[_key(status)];

  void set(LeaveStatus? status, LeaveCacheEntry entry) {
    _store[_key(status)] = entry;
  }

  void clear() => _store.clear();

  String _key(LeaveStatus? status) => 'status:${status?.name ?? 'all'}';
}

