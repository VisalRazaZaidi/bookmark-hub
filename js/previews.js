// Page previews: fetches each bookmarked page's head once and remembers its
// share image (og:image), real title, description and icon. Needs the optional
// "all sites" permission, which the user grants from the banner in the UI.
(() => {
  const ext = globalThis.browser ?? globalThis.chrome ?? null;
  const KEY = "previews";
  const CONCURRENCY = 6;
  const TIMEOUT_MS = 9000;
  const MAX_BYTES = 262144;
  const RETRY_FAILED_AFTER = 3 * 24 * 3600 * 1000;

  let cache = {};
  let loaded = false;
  let allowed = false;
  const queue = [];
  const queued = new Set();
  let active = 0;
  let job = { total: 0, done: 0 };
  let saveTimer = null;
  const listeners = new Set();

  const canFetch = () => !!(ext && ext.permissions);
  const emit = (url) => listeners.forEach((fn) => fn(url));

  async function init() {
    cache = (await BHStore.get(KEY, {})) || {};
    loaded = true;
    if (canFetch()) {
      try { allowed = await ext.permissions.contains({ origins: ["<all_urls>"] }); } catch { allowed = false; }
    }
  }

  async function requestPermission() {
    if (!canFetch()) return false;
    try { allowed = await ext.permissions.request({ origins: ["<all_urls>"] }); } catch { allowed = false; }
    return allowed;
  }

  async function revokePermission() {
    if (!canFetch()) return;
    try { await ext.permissions.remove({ origins: ["<all_urls>"] }); } catch { /* ignore */ }
    allowed = false;
    queue.length = 0; queued.clear();
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => BHStore.set(KEY, cache), 1200);
  }

  const get = (url) => cache[url] || null;
  const isFresh = (rec) => rec && (!rec.e || Date.now() - rec.ts < RETRY_FAILED_AFTER);

  function abs(raw, base) {
    if (!raw) return null;
    try {
      const u = new URL(raw.trim(), base);
      if (!/^https?:$/.test(u.protocol)) return null;
      if (u.protocol === "http:") u.protocol = "https:"; // extension pages block mixed content
      return u.href;
    } catch { return null; }
  }

  function pickIcon(doc, base) {
    let best = null; let bestSize = -1;
    for (const l of doc.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="shortcut icon"]')) {
      const href = abs(l.getAttribute("href"), base);
      if (!href) continue;
      const m = /(\d+)x\d+/.exec(l.getAttribute("sizes") || "");
      const size = m ? parseInt(m[1], 10) : (l.getAttribute("rel") || "").includes("apple") ? 180 : 16;
      if (size > bestSize) { best = href; bestSize = size; }
    }
    return best;
  }

  async function readHead(res) {
    const reader = res.body.getReader();
    const dec = new TextDecoder("utf-8");
    let text = ""; let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      text += dec.decode(value, { stream: true });
      if (/<\/head>/i.test(text) || bytes > MAX_BYTES) break;
    }
    try { await reader.cancel(); } catch { /* ignore */ }
    return text;
  }

  async function fetchOne(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const rec = { ts: Date.now() };
    try {
      const res = await fetch(url, { credentials: "omit", redirect: "follow", signal: ctrl.signal, headers: { Accept: "text/html,*/*;q=0.5" } });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || (type && !/html|xml/i.test(type))) { rec.e = 1; return rec; }
      const doc = new DOMParser().parseFromString(await readHead(res), "text/html"); // inert: nothing loads or runs
      const meta = (sel) => doc.querySelector(sel)?.getAttribute("content")?.trim() || null;
      const base = res.url || url;
      rec.i = abs(meta('meta[property="og:image:secure_url"]') || meta('meta[property="og:image"]') ||
        meta('meta[name="twitter:image"]') || meta('meta[name="twitter:image:src"]') ||
        doc.querySelector('link[rel="image_src"]')?.getAttribute("href"), base);
      rec.t = (meta('meta[property="og:title"]') || doc.querySelector("title")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 160) || null;
      rec.d = (meta('meta[property="og:description"]') || meta('meta[name="description"]') || "").replace(/\s+/g, " ").trim().slice(0, 220) || null;
      rec.f = pickIcon(doc, base);
      if (!rec.i && !rec.t && !rec.f) rec.e = 1;
      return rec;
    } catch {
      rec.e = 1;
      return rec;
    } finally {
      clearTimeout(timer);
    }
  }

  function pump() {
    while (allowed && active < CONCURRENCY && queue.length) {
      const url = queue.shift();
      active++;
      fetchOne(url).then((rec) => {
        cache[url] = rec;
        scheduleSave();
        job.done++;
        emit(url);
      }).finally(() => {
        queued.delete(url);
        active--;
        if (!queue.length && !active) emit(null);
        pump();
      });
    }
  }

  // priority=true moves a visible card to the front of the line.
  function request(url, priority = false) {
    if (!allowed || !loaded) return;
    if (isFresh(cache[url]) || queued.has(url)) {
      if (priority && queued.has(url)) {
        const i = queue.indexOf(url);
        if (i > 0) { queue.splice(i, 1); queue.unshift(url); }
      }
      return;
    }
    queued.add(url);
    priority ? queue.unshift(url) : queue.push(url);
    pump();
  }

  function fetchAll(urls) {
    job = { total: 0, done: 0 };
    for (const u of urls) if (!isFresh(cache[u]) && !queued.has(u)) job.total++;
    for (const u of urls) request(u);
    emit(null);
  }

  function stop() { queue.forEach((u) => queued.delete(u)); queue.length = 0; job = { total: 0, done: 0 }; emit(null); }
  function markImageBroken(url) { if (cache[url]) { cache[url].i = null; scheduleSave(); } }
  async function clear() { cache = {}; stop(); await BHStore.remove(KEY); }

  globalThis.BHPreviews = {
    init, get, request, fetchAll, stop, clear, markImageBroken, requestPermission, revokePermission,
    onUpdate: (fn) => listeners.add(fn),
    get allowed() { return allowed; },
    get supported() { return canFetch(); },
    get progress() { return { ...job, pending: queue.length + active }; },
    stats: () => ({ cached: Object.values(cache).filter((r) => !r.e).length }),
  };
})();
