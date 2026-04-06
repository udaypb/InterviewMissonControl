type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

declare global {
  var __missionControlCache__: Map<string, CacheEntry<unknown>> | undefined;
}

function getCacheStore() {
  if (!globalThis.__missionControlCache__) {
    globalThis.__missionControlCache__ = new Map<string, CacheEntry<unknown>>();
  }

  return globalThis.__missionControlCache__;
}

export async function getOrSetCache<T>(
  key: string,
  ttlMs: number,
  compute: () => Promise<T>
): Promise<T> {
  const store = getCacheStore();
  const existing = store.get(key);

  if (existing && existing.expiresAt > Date.now()) {
    return existing.value as T;
  }

  const value = await compute();
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export function invalidateCache(prefix?: string) {
  const store = getCacheStore();

  if (!prefix) {
    store.clear();
    return;
  }

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}
