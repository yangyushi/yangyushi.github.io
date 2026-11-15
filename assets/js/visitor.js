// The reader's identity and browser storage. Views, likes, and comments all
// use the same random visitor id.

const VISITOR_KEY = "blog-visitor-id";

export function storage() {
  try {
    const probe = "__probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch (error) {
    const memory = new Map();
    return {
      getItem: (key) => (memory.has(key) ? memory.get(key) : null),
      setItem: (key, value) => memory.set(key, String(value)),
      removeItem: (key) => memory.delete(key),
    };
  }
}

export function uuid4() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // The database accepts UUIDs only, so build one where randomUUID is absent.
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function visitorId(store) {
  const existing = store.getItem(VISITOR_KEY);
  if (existing) {
    return existing;
  }
  const fresh = uuid4();
  store.setItem(VISITOR_KEY, fresh);
  return fresh;
}
