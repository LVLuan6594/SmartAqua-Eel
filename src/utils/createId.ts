let fallbackSequence = 0;

/** Generates IDs on HTTPS and plain HTTP LAN origins. */
export function createId(prefix = 'id'): string {
  try {
    const uuid = globalThis.crypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // randomUUID can be unavailable on non-secure origins.
  }
  fallbackSequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${fallbackSequence.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
