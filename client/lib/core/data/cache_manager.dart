import 'dart:collection';

typedef Clock = DateTime Function();

class CacheManager<T> {
  CacheManager({Clock? clock, Duration ttl = const Duration(minutes: 5)})
      : _clock = clock ?? DateTime.now,
        _ttl = ttl;

  final Clock _clock;
  final Duration _ttl;

  final Map<String, _CacheEntry<T>> _store = HashMap<String, _CacheEntry<T>>();

  CacheSnapshot<T>? read(String key) {
    final entry = _store[key];
    if (entry == null) {
      return null;
    }
    if (_clock().isAfter(entry.expiresAt)) {
      _store.remove(key);
      return null;
    }
    return CacheSnapshot<T>(value: entry.value, updatedAt: entry.updatedAt);
  }

  void write(String key, T value) {
    _store[key] = _CacheEntry<T>(
      value: value,
      updatedAt: _clock(),
      expiresAt: _clock().add(_ttl),
    );
  }

  void writeWithExpiration(String key, T value, DateTime expiresAt) {
    _store[key] = _CacheEntry<T>(
      value: value,
      updatedAt: _clock(),
      expiresAt: expiresAt,
    );
  }

  void invalidate(String key) => _store.remove(key);

  void clear() => _store.clear();
}

class CacheSnapshot<T> {
  CacheSnapshot({required this.value, required this.updatedAt});

  final T value;
  final DateTime updatedAt;
}

class _CacheEntry<T> {
  _CacheEntry({required this.value, required this.updatedAt, required this.expiresAt});

  final T value;
  final DateTime updatedAt;
  final DateTime expiresAt;
}

