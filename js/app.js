// Bookmark Hub UI
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const ext = globalThis.browser ?? globalThis.chrome ?? null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const CHUNK = 90;

  const ICON = {
    all: '<svg viewBox="0 0 24 24"><path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.8L6 20V5.5a1 1 0 0 1 1-1z"/></svg>',
    recent: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 2"/></svg>',
    dupes: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
    notitle: '<svg viewBox="0 0 24 24"><path d="M5 7V5h14v2M12 5v14M9 19h6"/></svg>',
    folder: '<svg viewBox="0 0 24 24"><path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2v7.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12M10.5 11v5M13.5 11v5"/></svg>',
    open: '<svg viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4"/></svg>',
    share: '<svg viewBox="0 0 24 24"><circle cx="18" cy="5.5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="18.5" r="2.3"/><path d="m8 10.9 7.9-4.2M8 13.1l7.9 4.2"/></svg>',
  };

  // ---------- State ----------
  const S = {
    q: "", scope: { type: "all" }, sort: "recent", group: "folder", view: "grid",
    theme: "auto", newTab: true, favicons: true, collapsed: [], bannerDismissed: false,
  };
  let live = BHData.HAS_API;
  let model = { folders: new Map(), roots: [], items: [] };
  let byId = new Map();
  let urlIndex = new Map();
  let folderOrder = new Map();
  let topSites = [];
  let sections = [];
  let cur = { si: 0, ii: 0, grid: null };
  let parsed = { terms: [], neg: [], folder: [], site: [] };
  let hlRe = null;
  let visible = [];
  let selecting = false;
  const picked = new Set();
  let lastPicked = null;
  let shareState = null;
  let shareReturn = null;
  let shareCopiedTimer;

  const el = {
    q: $("#q"), clear: $("#clearQ"), search: $(".search"), side: $("#side"), main: $("#main"), head: $("#head"),
    results: $("#results"), banner: $("#banner"), sentinel: $("#sentinel"), settings: $("#settings"),
    toast: $("#toast"), toastText: $("#toastText"), toastUndo: $("#toastUndo"),
    sort: $("#sort"), group: $("#group"), file: $("#file"),
    shareBtn: $("#shareBtn"), selectBtn: $("#selectBtn"), selBar: $("#selBar"), selCount: $("#selCount"),
    shareModal: $("#shareModal"), shareTitle: $("#shareTitle"), shareSub: $("#shareSub"),
    sharePreview: $("#sharePreview"), shareFile: $("#shareFile"), shareGo: $("#shareGo"),
    shareNative: $("#shareNative"), shareGroup: $("#shareGroup"), shareDedupe: $("#shareDedupe"),
    sharePick: $("#sharePick"), shareX: $("#shareX"),
  };

  // ---------- Helpers ----------
  const hueOf = (host) => {
    let h = 7;
    for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) >>> 0;
    h %= 360;
    if (h >= 40 && h < 110) h = (h + 120) % 360; // keep clear of yellow-greens that wash out white text
    return h;
  };
  const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
  const monthFmt = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
  const fmtDate = (ms) => (ms ? dateFmt.format(ms) : "");

  const domSize = (h) => (h.length <= 11 ? 34 : h.length <= 15 ? 28 : h.length <= 22 ? 22 : 17);
  const domStyle = (h) => { const px = domSize(h); return `--fs:${px}px;--k:${(px / 266 * 100).toFixed(1)}`; };

  function prettyUrl(it) {
    try {
      const u = new URL(it.url);
      const p = (u.pathname + u.search).replace(/\/$/, "");
      return (it.host + p).slice(0, 90);
    } catch { return it.url.slice(0, 90); }
  }
  function displayTitle(it) {
    if (it.title) return it.title;
    const pv = BHPreviews.get(it.url);
    return pv?.t || prettyUrl(it);
  }
  function favUrl(it, pv) {
    if (it.icon) return it.icon;
    if (pv?.f) return pv.f;
    if (S.favicons && it.host) return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(it.host)}`;
    return null;
  }
  function hl(text) {
    if (!hlRe) return esc(text);
    return text.split(hlRe).map((part, i) => (i % 2 ? `<mark>${esc(part)}</mark>` : esc(part))).join("");
  }
  let toastTimer;
  let undoNode = null;
  function hideUndo() {
    undoNode = null;
    el.toastUndo.hidden = true;
  }
  function toast(msg, ms = 2200) {
    el.toastText.textContent = msg;
    hideUndo();
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), ms);
  }
  // Delete is reversible for 8 seconds: the toolbar lets the click through.
  function toastUndoable(msg, node) {
    el.toastText.textContent = msg;
    undoNode = node;
    el.toastUndo.hidden = false;
    el.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.classList.remove("show"); hideUndo(); }, 8000);
  }
  el.toastUndo.addEventListener("click", async () => {
    const node = undoNode;
    hideUndo();
    if (!node) return;
    try {
      await BHData.restoreBookmark(node);
      toast("Bookmark restored");
    } catch {
      toast("Couldn't restore it");
    }
  });
  let saveTimer;
  function persist() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const { q, ...rest } = S;
      BHStore.set("ui", rest);
    }, 300);
  }

  // ---------- Indexing ----------
  function index() {
    byId = new Map(); urlIndex = new Map(); folderOrder = new Map();
    for (const it of model.items) {
      byId.set(it.id, it);
      if (!urlIndex.has(it.url)) urlIndex.set(it.url, []);
      urlIndex.get(it.url).push(it);
    }
    let n = 0;
    const dfs = (ids) => ids.forEach((id) => { folderOrder.set(id, n++); dfs(model.folders.get(id).children); });
    dfs(model.roots);
    const counts = new Map();
    for (const it of model.items) if (it.host) counts.set(it.host, (counts.get(it.host) || 0) + 1);
    topSites = [...counts].filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 12);
    if (S.scope.type === "folder" && !model.folders.has(S.scope.id)) S.scope = { type: "all" };
  }
  const dupSurplus = () => model.items.length - new Set(model.items.map((i) => i.dupKey)).size;
  const untitledCount = () => model.items.reduce((n, i) => n + (i.title ? 0 : 1), 0);

  // ---------- Search ----------
  function parseQuery(raw) {
    const P = { terms: [], neg: [], folder: [], site: [] };
    const re = /(-?)(?:(folder|in|site):)?(?:"([^"]*)"|(\S+))/gi;
    let m;
    while ((m = re.exec(raw))) {
      const val = (m[3] ?? m[4] ?? "").toLowerCase().trim();
      if (!val) continue;
      const key = (m[2] || "").toLowerCase();
      if (key === "site") P.site.push(val);
      else if (key === "folder" || key === "in") P.folder.push(val);
      else if (m[1]) P.neg.push(val);
      else P.terms.push(val);
    }
    return P;
  }
  function score(it, P) {
    const pv = BHPreviews.get(it.url);
    const title = ((it.title || "") + " " + (pv?.t || "")).toLowerCase();
    const host = it.host.toLowerCase();
    const url = it.url.toLowerCase();
    const path = it.path.join(" / ").toLowerCase();
    const desc = (pv?.d || "").toLowerCase();
    for (const s of P.site) if (!host.includes(s)) return -1;
    for (const f of P.folder) if (!path.includes(f)) return -1;
    for (const n of P.neg) if (title.includes(n) || host.includes(n) || url.includes(n) || path.includes(n)) return -1;
    let total = 0;
    for (const t of P.terms) {
      let s = 0;
      if (title.includes(t)) s += title.startsWith(t) || title.includes(" " + t) ? 15 : 10;
      if (host.includes(t)) s += 8;
      if (path.includes(t)) s += 4;
      if (url.includes(t)) s += 3;
      if (desc.includes(t)) s += 2;
      if (!s) return -1;
      total += s;
    }
    return total;
  }

  // ---------- Sorting & grouping ----------
  const tcmp = (a, b) => displayTitle(a).localeCompare(displayTitle(b), undefined, { sensitivity: "base", numeric: true });
  const SORTS = {
    recent: (a, b) => b.added - a.added,
    old: (a, b) => a.added - b.added,
    az: tcmp,
    za: (a, b) => tcmp(b, a),
  };

  function collect() {
    const q = S.q.trim();
    if (q) {
      parsed = parseQuery(q);
      hlRe = parsed.terms.length ? new RegExp("(" + parsed.terms.map(escRe).join("|") + ")", "gi") : null;
      return model.items
        .map((it) => [it, score(it, parsed)])
        .filter(([, s]) => s >= 0)
        .sort((a, b) => b[1] - a[1] || b[0].added - a[0].added)
        .map(([it]) => it);
    }
    hlRe = null;
    const { type, id } = S.scope;
    switch (type) {
      case "recent": return [...model.items].sort(SORTS.recent).slice(0, 60);
      case "dupes": return model.items.filter((i) => i.dups > 1);
      case "notitle": return model.items.filter((i) => !i.title);
      case "folder": return model.items.filter((i) => i.pathIds.includes(id));
      case "site": return model.items.filter((i) => i.host === id);
      default: return model.items;
    }
  }

  function folderTitleHtml(folderId, relativeTo) {
    const f = model.folders.get(folderId);
    if (!f) return "";
    let names = f.path;
    if (relativeTo) {
      const base = model.folders.get(relativeTo);
      names = f.path.slice(base.path.length - 1); // keep the scope folder as the first crumb
    }
    const last = names[names.length - 1];
    const lead = names.slice(0, -1).map((n) => esc(n)).join(" › ");
    return `<button data-act="scope" data-type="folder" data-id="${esc(folderId)}">${lead ? `<span class="path">${lead} › </span>` : ""}${esc(last)}</button>`;
  }

  function buildSections(items) {
    if (S.q.trim()) return [{ items }];
    const { type, id } = S.scope;
    if (type === "dupes") {
      const g = new Map();
      for (const it of items) { if (!g.has(it.dupKey)) g.set(it.dupKey, []); g.get(it.dupKey).push(it); }
      return [...g.values()]
        .sort((a, b) => b.length - a.length || tcmp(a[0], b[0]))
        .map((list) => ({ titleHtml: esc(displayTitle(list[0])), count: list.length, items: list.sort(SORTS.old) }));
    }
    const sorted = [...items].sort(SORTS[S.sort]);
    if (type === "recent" || S.group === "none") return [{ items: type === "recent" ? [...items].sort(SORTS.recent) : sorted }];
    const buckets = new Map();
    const push = (k, it) => { if (!buckets.has(k)) buckets.set(k, []); buckets.get(k).push(it); };
    if (S.group === "folder") {
      for (const it of sorted) push(it.folderId, it);
      return [...buckets].sort((a, b) => (folderOrder.get(a[0]) ?? 0) - (folderOrder.get(b[0]) ?? 0))
        .map(([fid, list]) => ({ titleHtml: folderTitleHtml(fid, type === "folder" ? id : null), count: list.length, items: list }));
    }
    if (S.group === "domain") {
      const hostCount = new Map();
      for (const it of sorted) hostCount.set(it.host, (hostCount.get(it.host) || 0) + 1);
      for (const it of sorted) push(hostCount.get(it.host) >= 2 ? it.host : "\u0000single", it);
      return [...buckets].sort((a, b) => (a[0] === "\u0000single") - (b[0] === "\u0000single") || b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([host, list]) => ({
          titleHtml: host === "\u0000single" ? "Sites with one bookmark" : `<button data-act="scope" data-type="site" data-id="${esc(host)}">${esc(host)}</button>`,
          count: list.length, items: list,
        }));
    }
    // by month added
    for (const it of sorted) push(it.added ? new Date(it.added).getFullYear() * 100 + new Date(it.added).getMonth() : 0, it);
    return [...buckets].sort((a, b) => b[0] - a[0]).map(([k, list]) => ({
      titleHtml: k ? esc(monthFmt.format(list[0].added)) : "Undated", count: list.length, items: list,
    }));
  }

  // ---------- Rendering: cards ----------
  function cardHtml(it) {
    const pv = BHPreviews.get(it.url);
    const title = displayTitle(it);
    const fav = favUrl(it, pv);
    const target = S.newTab ? ' target="_blank" rel="noopener noreferrer"' : ' rel="noopener noreferrer"';
    const href = `href="${esc(it.url)}"${target}`;
    const letter = esc((it.host.match(/[a-z0-9]/i) || ["•"])[0].toUpperCase());
    const folderName = it.path[it.path.length - 1] || "";
    const isList = S.view === "list";
    return `<article class="card" data-id="${esc(it.id)}" style="--h:${hueOf(it.host)}">
      <label class="pick" title="Select"><input type="checkbox" data-pick="${esc(it.id)}" aria-label="Select ${esc(title)}"></label>
      <a class="thumb" ${href} tabindex="-1" aria-hidden="true">
        <div class="ph"><span class="fav">${letter}${fav ? `<img src="${esc(fav)}" alt="" referrerpolicy="no-referrer" loading="lazy">` : ""}</span><span class="dom" style="${domStyle(it.host)}">${esc(it.host || "bookmark").replace(/([.\-])/g, "$1<wbr>")}</span></div>
        ${!isList && pv?.i ? `<img class="shot" src="${esc(pv.i)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""}
      </a>
      <div class="body">
        <a class="title${it.title ? "" : " untitled"}" ${href} title="${esc(it.url)}">${hl(title)}</a>
        <div class="meta">${isList && fav ? `<img class="mini" src="${esc(fav)}" alt="" referrerpolicy="no-referrer">` : ""}<span class="host">${hl(it.host)}</span><span class="date">${fmtDate(it.added)}</span></div>
        ${folderName ? `<button class="folder-chip" data-act="scope" data-type="folder" data-id="${esc(it.folderId)}" title="${esc(it.path.join(" › "))}">${ICON.folder}<span>${esc(folderName)}</span></button>` : ""}
      </div>
      ${it.dups > 1 ? `<span class="dupbadge">${it.dups} copies</span>` : ""}
      <div class="acts">
        <button class="act" data-act="share-one" aria-label="Share bookmark" title="Share">${ICON.share}</button>
        <button class="act" data-act="copy" aria-label="Copy link" title="Copy link">${ICON.copy}</button>
        ${live ? `<button class="act del" data-act="delete" aria-label="Delete bookmark" title="Delete bookmark">${ICON.trash}</button>` : ""}
      </div>
    </article>`;
  }

  const fetchIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      fetchIO.unobserve(e.target);
      const it = byId.get(e.target.dataset.id);
      if (it) BHPreviews.request(it.url, true);
    }
  }, { rootMargin: "500px" });

  function observeCards(root) {
    if (!BHPreviews.allowed) return;
    root.querySelectorAll(".card:not([data-obs])").forEach((c) => {
      c.dataset.obs = "1";
      const it = byId.get(c.dataset.id);
      if (it && !BHPreviews.get(it.url)) fetchIO.observe(c);
    });
  }

  function appendChunk(n) {
    let left = n;
    while (left > 0 && cur.si < sections.length) {
      const sec = sections[cur.si];
      if (!cur.grid) {
        const s = document.createElement("section");
        s.className = "group";
        s.innerHTML = (sec.titleHtml ? `<h2>${sec.titleHtml}<span class="gn">${sec.count}</span></h2>` : "") +
          `<div class="${S.view === "list" ? "list" : "grid"}"></div>`;
        el.results.appendChild(s);
        cur.grid = s.lastElementChild;
        if (!sec.titleHtml) s.style.marginTop = "14px";
      }
      const take = sec.items.slice(cur.ii, cur.ii + left);
      cur.grid.insertAdjacentHTML("beforeend", take.map(cardHtml).join(""));
      syncPicks(cur.grid);
      observeCards(cur.grid);
      cur.ii += take.length;
      left -= take.length;
      if (cur.ii >= sec.items.length) { cur.si++; cur.ii = 0; cur.grid = null; }
    }
    const more = cur.si < sections.length;
    el.sentinel.hidden = !more;
    sentinelIO.unobserve(el.sentinel);
    if (more) sentinelIO.observe(el.sentinel);
  }
  const sentinelIO = new IntersectionObserver((es) => { if (es[0].isIntersecting) appendChunk(CHUNK); }, { rootMargin: "900px" });

  // Swap a single card in place when its preview arrives.
  const pending = new Set();
  let flushTimer = null;
  function patchCards(url) {
    pending.add(url);
    clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      for (const u of pending) {
        for (const it of urlIndex.get(u) || []) {
          const old = el.results.querySelector(`.card[data-id="${CSS.escape(it.id)}"]`);
          if (!old) continue;
          const tpl = document.createElement("template");
          tpl.innerHTML = cardHtml(it);
          const fresh = tpl.content.firstElementChild;
          fresh.dataset.obs = "1";
          old.replaceWith(fresh);
        }
      }
      pending.clear();
    }, 250);
  }

  // ---------- Rendering: head, empty states, main ----------
  const scopeTitle = () => {
    const { type, id } = S.scope;
    if (type === "recent") return "Recently added";
    if (type === "dupes") return "Duplicates";
    if (type === "notitle") return "Missing titles";
    if (type === "folder") return model.folders.get(id)?.title || "Folder";
    if (type === "site") return id;
    return "All bookmarks";
  };

  function renderHead(n) {
    const q = S.q.trim();
    if (!model.items.length) { el.head.innerHTML = ""; return; }
    if (q) {
      el.head.innerHTML = `<h1>${n ? "Results" : "No matches"}</h1><span class="count">${n} of ${model.items.length} bookmarks</span>`;
      return;
    }
    const { type, id } = S.scope;
    let extra = "";
    if (type === "folder") {
      const f = model.folders.get(id);
      const trail = [];
      for (let p = model.folders.get(f.parentId); p; p = model.folders.get(p.parentId)) trail.unshift(p);
      const crumbs = trail.map((p) => `<button data-act="scope" data-type="folder" data-id="${esc(p.id)}">${esc(p.title)}</button> <span>›</span>`).join(" ");
      if (crumbs) extra = `<div class="crumbs">${crumbs}</div>`;
    } else if (type === "dupes") {
      const groups = new Set(model.items.filter((i) => i.dups > 1).map((i) => i.dupKey)).size;
      extra = `<p class="note">${n - groups} extra copies across ${groups} links. The oldest copy of each link is listed first; delete the rest.</p>`;
    } else if (type === "notitle") {
      extra = `<p class="note">These bookmarks were saved without a name. Page previews fill in the real title when they are turned on.</p>`;
    }
    el.head.innerHTML = `<h1>${esc(scopeTitle())}</h1><span class="count">${n} ${n === 1 ? "bookmark" : "bookmarks"}</span>${extra}`;
  }

  function renderEmpty(kind) {
    sections = []; el.sentinel.hidden = true;
    if (kind === "none") {
      el.results.innerHTML = `<div class="empty"><h2>No matches</h2><p>Try fewer words, or narrow by site with <b>site:github.com</b> or by folder with <b>folder:python</b>.</p></div>`;
    } else if (!live) {
      el.results.innerHTML = `<div class="empty"><h2>Load your bookmarks</h2><p>This page is running outside the extension. Drop an exported bookmarks file here to preview it.</p>
        <div class="drop"><button class="btn" id="emptyImport">Choose bookmarks .html</button></div></div>`;
    } else {
      el.results.innerHTML = `<div class="empty"><h2>No bookmarks yet</h2><p>Press Ctrl+D on any page to save one. It shows up here right away.</p></div>`;
    }
  }

  function renderMain(resetScroll = true) {
    el.results.textContent = "";
    const items = collect();
    visible = items;
    updateShareUi();
    renderHead(items.length);
    if (!model.items.length) renderEmpty("empty");
    else if (!items.length) renderEmpty("none");
    else {
      sections = buildSections(items);
      cur = { si: 0, ii: 0, grid: null };
      appendChunk(CHUNK);
    }
    if (resetScroll) window.scrollTo(0, 0);
  }

  // ---------- Rendering: sidebar ----------
  function treeHtml(ids) {
    return ids.map((id) => {
      const f = model.folders.get(id);
      if (!f || !f.count) return "";
      const kids = f.children.filter((c) => model.folders.get(c).count > 0);
      const open = !S.collapsed.includes(id);
      const current = !S.q.trim() && S.scope.type === "folder" && S.scope.id === id;
      return `<div class="tree-row" style="--d:${f.depth}">
        ${kids.length ? `<button class="chev" data-act="toggle" data-id="${esc(id)}" aria-expanded="${open}" aria-label="${open ? "Collapse" : "Expand"} ${esc(f.title)}">${ICON.chev}</button>` : '<span class="chev blank"></span>'}
        <button class="nav-item" data-act="scope" data-type="folder" data-id="${esc(id)}" aria-current="${current}">${ICON.folder}<span class="lbl">${esc(f.title)}</span><span class="n">${f.count}</span></button>
      </div>${open && kids.length ? treeHtml(kids) : ""}`;
    }).join("");
  }

  function renderSide() {
    const noQ = !S.q.trim();
    const isCur = (type, id) => noQ && S.scope.type === type && (id === undefined || S.scope.id === id);
    const item = (type, label, count, icon, id) =>
      `<button class="nav-item" data-act="scope" data-type="${type}"${id !== undefined ? ` data-id="${esc(id)}"` : ""} aria-current="${isCur(type, id)}">${icon}<span class="lbl">${esc(label)}</span><span class="n">${count}</span></button>`;
    const dup = dupSurplus();
    const nt = untitledCount();
    el.side.innerHTML =
      item("all", "All bookmarks", model.items.length, ICON.all) +
      item("recent", "Recently added", Math.min(60, model.items.length), ICON.recent) +
      (dup ? item("dupes", "Duplicates", dup, ICON.dupes) : "") +
      (nt ? item("notitle", "Missing titles", nt, ICON.notitle) : "") +
      (model.roots.length ? `<h3>Folders</h3>${treeHtml(model.roots)}` : "") +
      (topSites.length ? `<h3>Top sites</h3>${topSites.map(([host, c]) =>
        `<button class="nav-item" data-act="scope" data-type="site" data-id="${esc(host)}" aria-current="${isCur("site", host)}"><span class="site-dot" style="--h:${hueOf(host)}"></span><span class="lbl">${esc(host)}</span><span class="n">${c}</span></button>`).join("")}` : "");
  }

  // ---------- Banner (previews permission / progress) ----------
  function renderBanner() {
    if (!live || !BHPreviews.supported) { el.banner.innerHTML = ""; return; }
    const p = BHPreviews.progress;
    if (BHPreviews.allowed) {
      if (p.pending > 0 && p.total > 0) {
        const pct = Math.min(100, Math.round((p.done / p.total) * 100));
        el.banner.innerHTML = `<div class="banner"><p><strong>Fetching page previews</strong> ${p.done} of ${p.total}. You can keep browsing.</p><div class="bar"><i style="width:${pct}%"></i></div><button class="btn ghost" data-act="pv-stop">Stop</button></div>`;
      } else el.banner.innerHTML = "";
    } else if (!S.bannerDismissed) {
      el.banner.innerHTML = `<div class="banner"><p><strong>Add page thumbnails.</strong> Bookmark Hub can read each page's preview image and real title. It all stays in your browser.</p><button class="btn" data-act="pv-enable">Enable previews</button><button class="btn ghost" data-act="pv-dismiss">Not now</button></div>`;
    } else el.banner.innerHTML = "";
  }

  function renderSettings() {
    for (const b of document.querySelectorAll("[data-theme-set]")) b.setAttribute("aria-pressed", String(b.dataset.themeSet === S.theme));
    for (const b of document.querySelectorAll("[data-open-set]")) b.setAttribute("aria-pressed", String((b.dataset.openSet === "tab") === S.newTab));
    $("#favToggle").checked = S.favicons;
    $("#previewRow").hidden = !(live && BHPreviews.supported);
    $("#importRow").hidden = live;
    const on = BHPreviews.allowed;
    $("#previewState").textContent = on ? `On. ${BHPreviews.stats().cached} pages saved in this browser.` : "Off. Cards use site colours and icons.";
    $("#pvFetch").textContent = on ? "Fetch missing previews" : "Turn on previews";
    $("#pvRevoke").hidden = !on;
    $("#pvClear").hidden = !on;
    el.sort.value = S.sort;
    el.group.value = S.group;
    $("#vGrid").setAttribute("aria-pressed", String(S.view === "grid"));
    $("#vList").setAttribute("aria-pressed", String(S.view === "list"));
    document.documentElement.dataset.theme = S.theme === "auto" ? "" : S.theme;
    if (S.theme === "auto") delete document.documentElement.dataset.theme;
  }

  // ---------- Sharing (local exports) and selection ----------
  const shareDateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

  function shareScopeLabel() {
    const q = S.q.trim();
    if (q) return `search results for “${q}”`;
    const title = scopeTitle();
    if (S.scope.type === "folder") return `folder “${title}”`;
    if (S.scope.type === "site") return `site ${title}`;
    return title.toLowerCase();
  }

  function updateShareUi() {
    if (!el.shareBtn) return;
    el.shareBtn.disabled = !visible.length;
    el.shareBtn.title = visible.length ? "Share shown bookmarks" : "Nothing to share here";
    if (selecting) { syncPicks(); updateSelBar(); }
  }

  function syncPicks(root = document) {
    root.querySelectorAll("input[data-pick]").forEach((box) => {
      const on = picked.has(box.dataset.pick);
      box.checked = on;
      box.closest(".card")?.classList.toggle("picked", on);
    });
  }

  function updateSelBar() {
    if (!el.selBar) return;
    el.selCount.textContent = picked.size === 1 ? "1 selected" : `${picked.size} selected`;
    const go = el.selBar.querySelector('[data-act="share-selected"]');
    if (go) go.disabled = !picked.size;
  }

  function setSelecting(on) {
    selecting = on;
    document.body.classList.toggle("sel-mode", on);
    el.selBar.hidden = !on;
    el.selectBtn?.setAttribute("aria-pressed", String(on));
    if (on) {
      if (!picked.size) toast("Pick the bookmarks you want to share");
    } else {
      picked.clear();
      lastPicked = null;
      syncPicks();
    }
    updateSelBar();
  }

  function handlePick(box, shift) {
    const id = box.dataset.pick;
    if (shift && lastPicked) {
      const ids = visible.map((it) => it.id);
      const a = ids.indexOf(lastPicked);
      const b = ids.indexOf(id);
      if (a >= 0 && b >= 0) {
        const [lo, hi] = a < b ? [a, b] : [b, a];
        for (let i = lo; i <= hi; i++) {
          if (box.checked) picked.add(ids[i]); else picked.delete(ids[i]);
        }
      }
    } else if (box.checked) picked.add(id);
    else picked.delete(id);
    lastPicked = id;
    syncPicks();
    updateSelBar();
  }

  function openShare(items, label, opts = {}) {
    if (!items?.length) return;
    closeSettings();
    clearTimeout(toastTimer);
    el.toast.classList.remove("show");
    shareReturn = document.activeElement;
    shareState = {
      items,
      label,
      fileLabel: opts.fileLabel || label,
      fromSelection: !!opts.fromSelection,
      format: "text",
      group: items.length > 1,
      dedupe: true,
      rootId: opts.rootId || null,
      rootTitle: opts.rootTitle || `Shared bookmarks — ${shareDateFmt.format(new Date())}`,
    };
    el.shareModal.hidden = false;
    document.body.classList.add("modal-open");
    el.shareTitle.textContent = `Share ${items.length} ${items.length === 1 ? "bookmark" : "bookmarks"}`;
    el.shareSub.textContent = `From ${label}`;
    const radio = el.shareModal.querySelector('input[name="shareFmt"][value="text"]');
    if (radio) radio.checked = true;
    el.shareGroup.checked = shareState.group;
    el.shareDedupe.checked = shareState.dedupe;
    renderShare();
    el.shareX.focus();
  }

  function renderShare() {
    const s = shareState;
    if (!s) return;
    const list = s.dedupe ? BHShare.dedupe(s.items) : s.items;
    const dropped = s.items.length - list.length;
    el.shareSub.textContent = `From ${s.label}` + (dropped ? ` · ${dropped} duplicate link${dropped === 1 ? "" : "s"} skipped` : "");
    const group = s.group && list.length > 1;
    const opts = { folders: model.folders, group, dedupe: false };
    const body = s.format === "md" ? BHShare.markdown(list, opts) : BHShare.text(list, opts);
    const pv = BHShare.preview(body, 3);
    el.sharePreview.textContent = pv.text + (pv.more ? `\n… ${pv.more} more line${pv.more === 1 ? "" : "s"}` : "");
    el.shareGroup.disabled = list.length <= 1;
    el.shareGroup.checked = group;
    el.shareFile.hidden = s.format !== "html";
    if (s.format === "html") el.shareFile.textContent = `Saves as ${BHShare.filename(s.fileLabel)}. Folder names are kept.`;
    el.shareNative.hidden = !(s.format === "text" && BHShare.canNative());
    el.sharePick.hidden = s.fromSelection;
    el.shareGo.textContent = s.format === "html" ? "Download .html" : s.format === "md" ? "Copy Markdown" : "Copy list";
    el.shareGo.disabled = !list.length;
  }

  function closeShare() {
    if (!el.shareModal || el.shareModal.hidden) return;
    el.shareModal.hidden = true;
    document.body.classList.remove("modal-open");
    shareState = null;
    clearTimeout(shareCopiedTimer);
    if (shareReturn && document.contains(shareReturn)) shareReturn.focus();
  }

  async function runShare() {
    const s = shareState;
    if (!s) return;
    const list = s.dedupe ? BHShare.dedupe(s.items) : s.items;
    if (!list.length) { toast("Nothing to share here"); return; }
    if (s.format === "html") {
      const html = BHShare.netscape(list, {
        folders: model.folders, root: s.rootTitle, rootId: s.rootId, dedupe: false,
      });
      BHShare.download(BHShare.filename(s.fileLabel), "text/html;charset=utf-8", html);
      closeShare();
      toast(`${list.length} bookmark${list.length === 1 ? "" : "s"} saved as a file`);
      return;
    }
    const opts = { folders: model.folders, group: s.group && list.length > 1, dedupe: false };
    const body = s.format === "md" ? BHShare.markdown(list, opts) : BHShare.text(list, opts);
    const ok = await BHShare.copy(body);
    if (!ok) { toast("Couldn't copy — try Download .html"); return; }
    toast(s.format === "md" ? "Markdown copied" : "Link list copied");
    el.shareGo.textContent = "Copied";
    clearTimeout(shareCopiedTimer);
    shareCopiedTimer = setTimeout(() => {
      if (shareState && shareState.format === s.format) renderShare();
    }, 1400);
  }

  async function runNative() {
    const s = shareState;
    if (!s) return;
    const list = s.dedupe ? BHShare.dedupe(s.items) : s.items;
    const capped = list.slice(0, 20);
    const opts = { folders: model.folders, group: s.group && capped.length > 1, dedupe: false };
    let body = BHShare.text(capped, opts);
    if (list.length > capped.length) body += `\n… and ${list.length - capped.length} more`;
    const res = await BHShare.shareNative({ title: s.label, text: body });
    if (res === "shared") { closeShare(); toast("Shared"); }
    else if (res === "failed") {
      const ok = await BHShare.copy(body);
      toast(ok ? "Couldn't open the share sheet — list copied" : "Couldn't share or copy");
    }
  }

  async function shareOne(id) {
    const it = byId.get(id);
    if (!it) return;
    if (BHShare.canNative()) {
      const res = await BHShare.shareNative({ title: displayTitle(it), url: it.url });
      if (res === "shared") { toast("Shared"); return; }
      if (res === "abort") return;
    }
    openShare([it], "this bookmark");
  }

  function openShareFromView() {
    if (!visible.length) return;
    const folder = !S.q.trim() && S.scope.type === "folder" ? model.folders.get(S.scope.id) : null;
    openShare(visible, shareScopeLabel(), folder
      ? { rootId: folder.id, rootTitle: folder.title, fileLabel: folder.title }
      : { fileLabel: S.q.trim() ? "search results" : "all bookmarks" });
  }

  // ---------- Actions ----------
  function setScope(type, id) {
    S.scope = id !== undefined ? { type, id } : { type };
    S.q = ""; el.q.value = ""; syncSearchUi();
    document.body.classList.remove("nav-open");
    renderSide(); renderMain(); persist();
  }
  function syncSearchUi() {
    const has = !!el.q.value;
    el.search.classList.toggle("has-text", has);
    el.clear.hidden = !has;
  }
  async function enablePreviews() {
    const ok = await BHPreviews.requestPermission();
    if (!ok) { toast("Permission not granted"); return; }
    observeCards(el.results);
    BHPreviews.fetchAll(model.items.map((i) => i.url));
    renderBanner(); renderSettings();
  }
  function setModelFromFile(text) {
    model = BHData.parseHtml(text);
    S.scope = { type: "all" };
    index(); renderSide(); renderMain();
    toast(`Loaded ${model.items.length} bookmarks`);
  }

  document.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) {
      if (!e.target.closest("#settings, #settingsBtn")) closeSettings();
      if (e.target.id === "scrim") document.body.classList.remove("nav-open");
      return;
    }
    const act = t.dataset.act;
    if (act === "scope") setScope(t.dataset.type, t.dataset.id);
    else if (act === "toggle") {
      const id = t.dataset.id;
      S.collapsed = S.collapsed.includes(id) ? S.collapsed.filter((x) => x !== id) : [...S.collapsed, id];
      renderSide(); persist();
    } else if (act === "copy") {
      const it = byId.get(t.closest(".card").dataset.id);
      try { await navigator.clipboard.writeText(it.url); toast("Link copied"); } catch { toast("Couldn't copy the link"); }
    } else if (act === "share-one") {
      shareOne(t.closest(".card").dataset.id);
    } else if (act === "share-selected") {
      const items = visible.filter((it) => picked.has(it.id));
      if (items.length) {
        openShare(items, `${items.length} selected ${items.length === 1 ? "bookmark" : "bookmarks"}`, { fromSelection: true });
      }
    } else if (act === "select-all") {
      visible.forEach((it) => picked.add(it.id));
      syncPicks(); updateSelBar();
    } else if (act === "select-off") {
      setSelecting(false);
    } else if (act === "delete") {
      const it = byId.get(t.closest(".card").dataset.id);
      if (!it) return;
      const folder = it.path[it.path.length - 1] || "Bookmarks";
      try {
        const node = await BHData.removeBookmark(it.id);
        if (picked.delete(it.id)) { syncPicks(); updateSelBar(); }
        toastUndoable(
          it.dups > 1
            ? `Deleted this copy. The other copy is still saved in "${folder}".`
            : `Deleted from "${folder}".`,
          node
        );
      } catch {
        toast("Couldn't delete it");
      }
    } else if (act === "pv-enable") enablePreviews();
    else if (act === "pv-dismiss") { S.bannerDismissed = true; persist(); renderBanner(); }
    else if (act === "pv-stop") BHPreviews.stop();
  });

  document.addEventListener("click", (e) => {
    const box = e.target.closest("input[data-pick]");
    if (box) handlePick(box, e.shiftKey);
  });

  // Images that fail to load fall back to the coloured tile.
  document.addEventListener("error", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLImageElement)) return;
    if (t.classList.contains("shot")) {
      const it = byId.get(t.closest(".card")?.dataset.id);
      if (it) BHPreviews.markImageBroken(it.url);
      t.remove();
    } else if (t.closest(".fav") || t.classList.contains("mini")) t.remove();
  }, true);
  document.addEventListener("load", (e) => {
    const t = e.target;
    if (t.classList?.contains("shot") || t.closest?.(".fav")) t.classList.add("ok");
  }, true);

  // ---------- Controls ----------
  let qTimer;
  el.q.addEventListener("input", () => {
    syncSearchUi();
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { S.q = el.q.value; renderSide(); renderMain(); }, 90);
  });
  const hintsOn = () => el.search.classList.add("hints-on");
  el.q.addEventListener("mousedown", hintsOn);
  el.q.addEventListener("blur", () => el.search.classList.remove("hints-on"));
  el.q.addEventListener("keydown", (e) => {
    hintsOn();
    if (e.key === "Enter") {
      const first = el.results.querySelector(".card .title");
      if (!first) return;
      if (e.ctrlKey || e.metaKey || e.shiftKey) window.open(first.href, "_blank", "noopener");
      else first.click();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      el.results.querySelector(".card .title")?.focus();
    } else if (e.key === "Escape" && el.q.value) {
      el.q.value = ""; S.q = ""; syncSearchUi(); renderSide(); renderMain(); e.stopPropagation();
    }
  });
  el.clear.addEventListener("click", () => { el.q.value = ""; S.q = ""; syncSearchUi(); renderSide(); renderMain(); el.q.focus(); });
  $("#hints").addEventListener("mousedown", (e) => {
    const b = e.target.closest("[data-hint]");
    if (!b) return;
    e.preventDefault();
    el.q.value = (el.q.value ? el.q.value.trimEnd() + " " : "") + b.dataset.hint;
    syncSearchUi(); el.q.focus();
  });

  el.sort.addEventListener("change", () => { S.sort = el.sort.value; renderMain(false); persist(); });
  el.group.addEventListener("change", () => { S.group = el.group.value; renderMain(); persist(); });
  document.querySelectorAll("[data-view]").forEach((b) => b.addEventListener("click", () => {
    S.view = b.dataset.view; renderSettings(); renderMain(false); persist();
  }));
  document.querySelectorAll("[data-theme-set]").forEach((b) => b.addEventListener("click", () => { S.theme = b.dataset.themeSet; renderSettings(); persist(); }));
  document.querySelectorAll("[data-open-set]").forEach((b) => b.addEventListener("click", () => {
    S.newTab = b.dataset.openSet === "tab"; renderSettings(); renderMain(false); persist();
  }));
  $("#favToggle").addEventListener("change", (e) => { S.favicons = e.target.checked; renderMain(false); persist(); });
  $("#pvFetch").addEventListener("click", async () => {
    if (!BHPreviews.allowed) await enablePreviews();
    else { BHPreviews.fetchAll(model.items.map((i) => i.url)); renderBanner(); }
  });
  $("#pvClear").addEventListener("click", async () => { await BHPreviews.clear(); renderMain(false); renderSettings(); toast("Preview cache cleared"); });
  $("#pvRevoke").addEventListener("click", async () => { await BHPreviews.revokePermission(); renderBanner(); renderSettings(); renderMain(false); toast("Previews turned off"); });

  const settingsBtn = $("#settingsBtn");
  function closeSettings() { el.settings.hidden = true; settingsBtn.setAttribute("aria-expanded", "false"); }
  settingsBtn.addEventListener("click", () => {
    const open = el.settings.hidden;
    if (open) renderSettings();
    el.settings.hidden = !open;
    settingsBtn.setAttribute("aria-expanded", String(open));
  });
  $("#menuBtn").addEventListener("click", () => document.body.classList.toggle("nav-open"));

  // ---------- Share dialog and selection controls ----------
  el.shareBtn.addEventListener("click", openShareFromView);
  el.selectBtn.addEventListener("click", () => setSelecting(!selecting));
  el.shareX.addEventListener("click", closeShare);
  $("#shareScrim").addEventListener("click", closeShare);
  $("#shareCancel").addEventListener("click", closeShare);
  el.shareGo.addEventListener("click", runShare);
  el.shareNative.addEventListener("click", runNative);
  el.sharePick.addEventListener("click", () => { closeShare(); setSelecting(true); });
  el.shareModal.querySelectorAll('input[name="shareFmt"]').forEach((r) => r.addEventListener("change", () => {
    if (!shareState) return;
    shareState.format = r.value;
    renderShare();
  }));
  el.shareGroup.addEventListener("change", () => {
    if (!shareState) return;
    shareState.group = el.shareGroup.checked;
    renderShare();
  });
  el.shareDedupe.addEventListener("change", () => {
    if (!shareState) return;
    shareState.dedupe = el.shareDedupe.checked;
    renderShare();
  });
  el.shareModal.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const f = [...el.shareModal.querySelectorAll("button, input, a[href]")].filter((x) => !x.disabled && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  // File import (preview mode)
  $("#importBtn").addEventListener("click", () => el.file.click());
  document.addEventListener("click", (e) => { if (e.target.id === "emptyImport") el.file.click(); });
  el.file.addEventListener("change", async () => { const f = el.file.files[0]; if (f) { setModelFromFile(await f.text()); closeSettings(); } });
  window.addEventListener("dragover", (e) => { if (!live) { e.preventDefault(); document.body.classList.add("dragging"); } });
  window.addEventListener("dragleave", () => document.body.classList.remove("dragging"));
  window.addEventListener("drop", async (e) => {
    if (live) return;
    e.preventDefault(); document.body.classList.remove("dragging");
    const f = e.dataTransfer.files[0];
    if (f) setModelFromFile(await f.text());
  });

  // ---------- Keyboard ----------
  document.addEventListener("keydown", (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName || "");
    if (e.key === "/" && !inField && !e.ctrlKey && !e.metaKey) { e.preventDefault(); el.q.focus(); el.q.select(); hintsOn(); return; }
    if (e.key === "Escape") {
      if (!el.shareModal.hidden) { closeShare(); return; }
      if (selecting) { setSelecting(false); return; }
      closeSettings();
      document.body.classList.remove("nav-open");
      return;
    }
    const a = document.activeElement;
    if (!a?.classList?.contains("title")) return;
    const arrows = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const dir = arrows[e.key];
    if (!dir) return;
    e.preventDefault();
    const cards = [...el.results.querySelectorAll(".card")];
    const me = a.closest(".card");
    const r = me.getBoundingClientRect();
    let best = null; let bestD = Infinity;
    for (const c of cards) {
      if (c === me) continue;
      const b = c.getBoundingClientRect();
      const dx = b.left - r.left; const dy = b.top - r.top;
      let d;
      if (dir[0]) { if (Math.abs(dy) > 8 || dx * dir[0] <= 0) continue; d = Math.abs(dx); }
      else { if (dy * dir[1] <= 8) continue; d = Math.abs(dy) * 1000 + Math.abs(dx); }
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) { best.querySelector(".title").focus(); best.scrollIntoView({ block: "nearest" }); }
    else if (dir[1] < 0) el.q.focus();
  });

  // ---------- Live updates ----------
  async function reload() {
    model = await BHData.loadLive();
    index(); renderSide(); renderMain(false);
  }
  let lastBannerKey = "";
  BHPreviews.onUpdate((url) => {
    if (url) patchCards(url);
    const p = BHPreviews.progress;
    const key = p.pending + ":" + Math.floor(p.done / 5);
    if (key !== lastBannerKey || !url) { lastBannerKey = key; renderBanner(); }
  });

  // ---------- Toolbar shortcut ----------
  // The background page asks whether a hub tab is already open and we answer
  // with our own tab id, so a second toolbar click focuses this tab instead of
  // opening another one. No extra permission is needed for this.
  if (ext?.runtime?.onMessage && ext.tabs?.getCurrent) {
    ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (!msg || msg.type !== "bookmark-hub:ping") return undefined;
      ext.tabs.getCurrent()
        .then((tab) => sendResponse(tab ? { tabId: tab.id, windowId: tab.windowId } : null))
        .catch(() => sendResponse(null));
      return true; // keep the channel open for the async reply
    });
  }

  // ---------- Boot ----------
  (async function boot() {
    Object.assign(S, (await BHStore.get("ui", {})) || {});
    S.q = "";
    renderSettings();
    await BHPreviews.init();
    if (live) {
      try { model = await BHData.loadLive(); } catch { live = false; }
      BHData.onChange(reload);
    }
    index();
    renderSettings(); renderSide(); renderBanner(); renderMain(false);
    el.q.focus();
  })();
})();
