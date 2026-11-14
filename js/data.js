// Data layer: reads bookmarks from the live browser API, or from an exported
// bookmarks HTML file (preview mode, used when this page is opened outside the extension).
(() => {
  const ext = globalThis.browser ?? globalThis.chrome ?? null;
  const HAS_API = !!(ext && ext.bookmarks && ext.bookmarks.getTree);
  const OPENABLE = /^(https?|ftp|file):/i;

  const hostOf = (u) => {
    try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; }
  };
  const dupKeyOf = (u) => {
    try {
      const x = new URL(u);
      return (x.hostname.replace(/^www\./, "") + x.pathname.replace(/\/+$/, "") + x.search).toLowerCase();
    } catch { return u; }
  };

  // Turn a flat list of folders + items into the model the UI uses.
  function finalize(folders, items) {
    const byId = new Map(folders.map((f) => [f.id, f]));
    for (const f of folders) { f.children = []; f.count = 0; }
    for (const f of folders) {
      const p = byId.get(f.parentId);
      if (p) p.children.push(f.id);
    }
    for (const it of items) {
      let f = byId.get(it.folderId);
      while (f) { f.count++; f = byId.get(f.parentId); }
    }
    const dupCount = new Map();
    for (const it of items) dupCount.set(it.dupKey, (dupCount.get(it.dupKey) || 0) + 1);
    for (const it of items) it.dups = dupCount.get(it.dupKey);
    const roots = folders.filter((f) => !byId.has(f.parentId) && f.count > 0).map((f) => f.id);
    return { folders: byId, roots, items };
  }

  // ---- Live browser bookmarks ------------------------------------------------
  async function loadLive() {
    const [root] = await ext.bookmarks.getTree();
    const folders = [];
    const items = [];
    const walk = (node, pathNames, pathIds, parentId, depth) => {
      if (node.url) {
        if (!OPENABLE.test(node.url)) return;
        items.push({
          id: node.id, title: (node.title || "").trim(), url: node.url, host: hostOf(node.url),
          added: node.dateAdded || 0, folderId: parentId, pathIds, path: pathNames,
          icon: null, dupKey: dupKeyOf(node.url),
        });
        return;
      }
      if (!node.children) return; // separator
      const names = [...pathNames, node.title || "Untitled folder"];
      const ids = [...pathIds, node.id];
      folders.push({ id: node.id, title: node.title || "Untitled folder", parentId, depth, path: names });
      for (const c of node.children) walk(c, names, ids, node.id, depth + 1);
    };
    for (const top of root.children || []) walk(top, [], [], null, 0);
    return finalize(folders, items);
  }

  // ---- Exported bookmarks HTML (Netscape format) ----------------------------
  function parseHtml(text) {
    const doc = new DOMParser().parseFromString(text, "text/html");
    const folders = [];
    const items = [];
    let uid = 0;
    const walkDL = (dl, pathNames, pathIds, parentId, depth) => {
      for (const child of dl.children) {
        if (child.tagName !== "DT") continue;
        const head = child.firstElementChild;
        if (!head) continue;
        if (head.tagName === "H3") {
          const id = "f" + ++uid;
          const title = head.textContent.trim() || "Untitled folder";
          const names = [...pathNames, title];
          const ids = [...pathIds, id];
          folders.push({ id, title, parentId, depth, path: names });
          const sub = child.querySelector(":scope > dl");
          if (sub) walkDL(sub, names, ids, id, depth + 1);
        } else if (head.tagName === "A") {
          const url = head.getAttribute("href") || "";
          if (!OPENABLE.test(url)) continue;
          items.push({
            id: "b" + ++uid, title: head.textContent.trim(), url, host: hostOf(url),
            added: (parseInt(head.getAttribute("add_date"), 10) || 0) * 1000,
            folderId: parentId, pathIds, path: pathNames,
            icon: head.getAttribute("icon") || null, dupKey: dupKeyOf(url),
          });
        }
      }
    };
    const top = doc.querySelector("dl");
    if (top) walkDL(top, [], [], null, 0);
    return finalize(folders, items);
  }

  // ---- Mutations (live mode only) -------------------------------------------
  // Returns the removed node (id, parentId, index, title, url) so the UI can
  // put it back in the same folder and position.
  async function removeBookmark(id) {
    const [node] = await ext.bookmarks.get(id);
    await ext.bookmarks.remove(id);
    return node;
  }

  async function restoreBookmark(node) {
    if (!node || !node.url) throw new Error("Nothing to restore");
    return ext.bookmarks.create({
      parentId: node.parentId,
      index: Number.isInteger(node.index) ? node.index : undefined,
      title: node.title || "",
      url: node.url,
    });
  }

  function onChange(cb) {
    if (!HAS_API) return;
    let t;
    const fire = () => { clearTimeout(t); t = setTimeout(cb, 250); };
    for (const ev of ["onCreated", "onRemoved", "onChanged", "onMoved", "onImportEnded"]) {
      ext.bookmarks[ev]?.addListener(fire);
    }
  }

  globalThis.BHData = { HAS_API, loadLive, parseHtml, removeBookmark, restoreBookmark, onChange, hostOf };
})();
