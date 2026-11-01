/**
 * Minimal in-memory TTL cache.
 *
 * Deliberately process-local and non-persistent: third-party discovery data
 * (OpenStreetMap, Google Places, Ticketmaster) must not be written to the
 * database, and provider terms cap how long it may be cached. Entries are
 * evicted lazily and the map is bounded to avoid unbounded growth.
 *
 * Beyond plain TTL it supports:
 *  - per-entry TTL overrides (e.g. a short TTL for "provider returned nothing"
 *    so an empty answer is re-checked quickly);
 *  - a stale window used for stale-while-revalidate: an entry that is past its
 *    TTL but inside the stale window is still served (flagged as stale) while a
 *    background refresh runs.
 */
function createCache({ ttlMs = 60 * 1000, maxEntries = 500, staleMs = 0 } = {}) {
  const store = new Map();

  function isExpired(entry, now) {
    return !entry || now - entry.storedAt >= entry.ttlMs;
  }

  function touch(key, entry) {
    // Refresh recency for simple LRU eviction.
    store.delete(key);
    store.set(key, entry);
  }

  function get(key) {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry) return null;

    if (isExpired(entry, now)) {
      store.delete(key);
      return null;
    }

    touch(key, entry);

    return {
      value: entry.value,
      storedAt: entry.storedAt,
      ageMs: now - entry.storedAt
    };
  }

  /**
   * Returns the entry even when it is past its TTL but still inside the stale
   * window. `stale` tells the caller whether the value needs refreshing.
   */
  function getEntry(key, { staleMs: overrideStaleMs } = {}) {
    const now = Date.now();
    const entry = store.get(key);
    if (!entry) return null;

    const ageMs = now - entry.storedAt;
    const window = overrideStaleMs ?? staleMs;

    if (ageMs >= entry.ttlMs + window) {
      store.delete(key);
      return null;
    }

    touch(key, entry);

    return {
      value: entry.value,
      storedAt: entry.storedAt,
      ageMs,
      stale: ageMs >= entry.ttlMs
    };
  }

  function set(key, value, { ttlMs: overrideTtlMs } = {}) {
    if (store.size >= maxEntries) {
      const oldest = store.keys().next().value;
      if (oldest !== undefined) store.delete(oldest);
    }
    store.set(key, {
      value,
      storedAt: Date.now(),
      ttlMs: Number.isFinite(overrideTtlMs) ? overrideTtlMs : ttlMs
    });
  }

  function deleteKey(key) {
    return store.delete(key);
  }

  function clear() {
    store.clear();
  }

  return { get, getEntry, set, delete: deleteKey, clear, ttlMs, staleMs, size: () => store.size };
}

module.exports = { createCache };
