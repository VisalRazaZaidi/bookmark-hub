// Tiny key/value store: extension storage when available, localStorage otherwise.
(() => {
  const ext = globalThis.browser ?? globalThis.chrome ?? null;
  const area = ext && ext.storage && ext.storage.local;

  async function get(key, fallback) {
    try {
      if (area) {
        const r = await area.get(key);
        return r[key] === undefined ? fallback : r[key];
      }
      const raw = localStorage.getItem("bh:" + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  async function set(key, value) {
    try {
      if (area) await area.set({ [key]: value });
      else localStorage.setItem("bh:" + key, JSON.stringify(value));
    } catch { /* storage unavailable or full: ignore */ }
  }
  async function remove(key) {
    try {
      if (area) await area.remove(key);
      else localStorage.removeItem("bh:" + key);
    } catch { /* ignore */ }
  }
  globalThis.BHStore = { get, set, remove };
})();
