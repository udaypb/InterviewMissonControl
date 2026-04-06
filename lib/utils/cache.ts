type CacheEntry<T> = {
  expiresAt: number;
  value?: T;
  pending?: Promise<T>;
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
  const now = Date.now();

  if (existing?.pending) {
    return existing.pending as Promise<T>;
  }

  if (existing && existing.expiresAt > now && existing.value !== undefined) {
    return existing.value as T;
  }

  const pending = compute()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .catch((error) => {
      store.delete(key);
      throw error;
    });

  store.set(key, { expiresAt: now + ttlMs, pending });
  return pending;
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
