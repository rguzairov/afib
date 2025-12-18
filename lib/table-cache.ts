const TABLE_INVALIDATION_PREFIX = "tableCacheInvalidate:v1:";

export function markTableCacheInvalidated(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${TABLE_INVALIDATION_PREFIX}${path}`, String(Date.now()));
  } catch {
    // Best-effort; ignore storage failures.
  }
}

export function consumeTableCacheInvalidation(path: string) {
  if (typeof window === "undefined") return false;
  try {
    const key = `${TABLE_INVALIDATION_PREFIX}${path}`;
    const marker = window.localStorage.getItem(key);
    if (!marker) return false;
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

