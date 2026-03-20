const memoryCache = new Map();

function getCacheEntry(key) {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return cached.value;
}

async function withCache(key, ttlMs, loader) {
  const existing = getCacheEntry(key);
  if (existing) return existing;

  const value = await loader();
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs
  });
  return value;
}

function clearCache() {
  memoryCache.clear();
}

module.exports = {
  clearCache,
  withCache
};
