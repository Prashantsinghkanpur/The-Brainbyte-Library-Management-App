const CACHE_PREFIX = "brainbyte-data-cache-v1";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function serializeEntry(data) {
  return JSON.stringify({
    timestamp: Date.now(),
    data
  });
}

export function buildCacheKey(...parts) {
  return [CACHE_PREFIX, ...parts]
    .filter((part) => part !== undefined && part !== null && part !== "")
    .join(":");
}

export function readCacheEntry(cacheKey) {
  const storage = getStorage();

  if (!storage || !cacheKey) {
    return null;
  }

  try {
    const rawValue = storage.getItem(cacheKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    const timestamp = Number(parsedValue?.timestamp);

    if (!Number.isFinite(timestamp)) {
      storage.removeItem(cacheKey);
      return null;
    }

    return {
      timestamp,
      ageMs: Math.max(0, Date.now() - timestamp),
      data: parsedValue.data
    };
  } catch {
    storage.removeItem(cacheKey);
    return null;
  }
}

export function readCachedValue(cacheKey, { maxAgeMs = Number.POSITIVE_INFINITY, allowExpired = false } = {}) {
  const entry = readCacheEntry(cacheKey);

  if (!entry) {
    return null;
  }

  if (!allowExpired && entry.ageMs > maxAgeMs) {
    return null;
  }

  return entry.data;
}

export function writeCachedValue(cacheKey, data) {
  const storage = getStorage();

  if (!storage || !cacheKey) {
    return;
  }

  try {
    storage.setItem(cacheKey, serializeEntry(data));
  } catch {
    storage.removeItem(cacheKey);
  }
}

export function removeCachedValue(cacheKey) {
  const storage = getStorage();

  if (!storage || !cacheKey) {
    return;
  }

  storage.removeItem(cacheKey);
}

export function removeCachedValuesByPrefix(prefix) {
  const storage = getStorage();

  if (!storage || !prefix) {
    return;
  }

  const keysToRemove = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);

    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}
