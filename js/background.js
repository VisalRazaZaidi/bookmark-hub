// Toolbar button -> open (or focus) the Bookmark Hub page in a tab.
//
// The old version used tabs.query({url}), which needs the "tabs" permission to
// be reliable. Instead the hub page answers a runtime message with its own
// tab/window id, so we can focus it without asking for any extra permission.
const ext = globalThis.browser ?? globalThis.chrome;
const PAGE = ext.runtime.getURL("manager.html");

async function pingHub() {
  try {
    const res = await ext.runtime.sendMessage({ type: "bookmark-hub:ping" });
    return res && typeof res === "object" && res.tabId != null ? res : null;
  } catch {
    // No hub page is listening: normal when the tab is not open yet.
    return null;
  }
}

async function openHub() {
  const hub = await pingHub();
  if (hub) {
    try {
      await ext.tabs.update(hub.tabId, { active: true });
      if (hub.windowId != null) await ext.windows.update(hub.windowId, { focused: true });
      return;
    } catch {
      /* the tab is gone; fall through and open a fresh one */
    }
  }
  await ext.tabs.create({ url: PAGE });
}

ext.action.onClicked.addListener(openHub);
