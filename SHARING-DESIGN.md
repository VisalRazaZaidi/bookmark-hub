# Sharing — product and technical design

Status: implemented in v1.2.0 (tested 14 November 2026). See `js/share.js` and the sharing section of `CONTEXT-HANDOFF.md`.

## 1. Problem

Bookmark Hub can find and clean up bookmarks, but there is no way to hand
bookmarks to another person. "Copy link" on a card copies one URL; a folder, a
search result or a curated set cannot leave the extension.

## 2. Principles

1. **No backend.** The landing page is static and the extension has no server.
   Sharing must therefore produce text or a file, not a hosted link.
2. **No new permissions.** Generate everything from the bookmarks already loaded.
   The manifest stays `bookmarks` + `storage` + optional `<all_urls>`.
3. **Explicit and predictable.** The user always sees the exact count and scope
   before anything is copied or downloaded. Nothing is shared automatically.
4. **Recipient-friendly.** Prefer formats the other person can use without
   installing Bookmark Hub: pasted links, Markdown, or a standard bookmark file
   that Chrome, Edge, Firefox and Safari can import.

Consequence: there is no "bookmark-hub.com/s/abc123" style link. That is a
deliberate trade-off. A hosted link needs a database, accounts, abuse handling
and a privacy-policy change; it is a separate product decision, not a v1.2
feature.

## 3. What can be shared

The share action operates on **the current view** — exactly what `collect()`
returns for the current scope and search. This is the same set the header count
already shows, so the dialog never surprises the user.

| Current view | What gets shared |
|---|---|
| All bookmarks | everything |
| A folder | that folder and its subfolders |
| Duplicates | every copy currently listed |
| Missing titles | those bookmarks |
| A site (Top sites) | bookmarks on that host |
| Search results | matches, in ranking order |

Phase 2 adds checkboxes for cherry-picking individual cards.

## 4. User workflows

### A. Send one link to a friend

1. Hover a card, click the new **Share** action.
2. If the browser supports the system share sheet
   (`navigator.share`), that opens with the title and URL.
3. Otherwise a small dialog opens with one item: copy the link, or copy
   "Title — URL".

This is the most common case and must stay under two clicks.

### B. Share a folder with a teammate

1. Click the folder in the sidebar.
2. Click **Share** in the toolbar.
3. The dialog says "Share 24 bookmarks · From folder Recipes".
4. Keep **Bookmark file (.html)** selected and click **Download**.
5. Send `bookmark-hub-recipes-2026-11-14.html` over chat or email.

The teammate double-clicks the file to read a clickable list, or imports it:
Chrome/Edge → Bookmark manager → ⋮ → Import bookmarks; Firefox → Library →
Import and Backup → Import Bookmarks from HTML. Folder names are preserved.

### C. Share search results

1. Search `site:github.com react hooks`.
2. Click **Share**.
3. Choose **Markdown** → **Copy list**, paste into a README, issue or chat.

The link list is the safest default for chat apps; Markdown is for docs; the
bookmark file is for people who want to keep the bookmarks.

### D. Pick a few cards (phase 2)

1. Enter selection mode from the Share dialog ("Choose bookmarks…") or the
   toolbar overflow.
2. Ctrl/Cmd-click toggles a card; Shift-click selects a range; "Select all
   visible" covers the current view.
3. A sticky bar shows "3 selected · Share · Clear".
4. The same dialog opens, scoped to the selection.

## 5. UI

### 5.1 Entry points

- **Toolbar:** a Share icon between the view switch and Settings (desktop and
  mobile). Disabled with a tooltip when the current view is empty.
- **Card action:** a third hover action next to Copy link. Direct system share
  for one bookmark, dialog fallback.
- **Sidebar folder:** phase 2, a small share icon on hover (right-click menu
  also possible later).

### 5.2 Share dialog (wireframe)

```
┌─ Share 42 bookmarks ─────────────────────────────────── ✕ ┐
│ From All bookmarks · 40 after removing duplicates          │
│                                                            │
│  (•) Link list       Title — URL, one per line             │
│  ( ) Markdown        - [Title](URL), grouped by folder     │
│  ( ) Bookmark file   .html any browser can import          │
│                                                            │
│  [✓] Group by folder        [✓] Skip duplicate links       │
│                                                            │
│  Preview                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Recipes                                              │  │
│  │ Sourdough starter — https://www.kingarthurbaking.com…│  │
│  │ Weeknight pasta — https://www.seriouseats.com/…      │  │
│  │ … 38 more lines                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Generated in this tab. Nothing is uploaded.               │
│                                  [Cancel]  [Copy list]     │
└────────────────────────────────────────────────────────────┘
```

Behaviour:

- Count and scope line update before any action; the primary button label
  follows the chosen format (Copy list / Copy Markdown / Download .html).
- Toggles update the preview instantly. "Group by folder" only affects text and
  Markdown; the .html file always keeps folders.
- "Skip duplicate links" is on by default; it removes later copies by `dupKey`.
- Preview shows the first 3 lines and "… N more lines"; no second scroll area.
- **Copy** keeps the dialog open and shows "Copied" for two seconds, so the user
  can also grab Markdown. **Download** and system share close it and toast.
- Esc, ✕, backdrop click and Cancel close it; focus returns to the Share button.
- Dialog is a real `role="dialog" aria-modal="true"` with a focus trap; all
  count/toggle changes are announced through the existing polite toast/live
  region where appropriate.
- Mobile: full-width sheet, formats stacked, preview collapsed to one line.

### 5.3 System share

- Use when `navigator.share` and `navigator.canShare({ text })` allow it.
- Chrome and Edge on Windows/macOS show the OS share sheet; Firefox desktop
  hides the button and keeps copy/download.
- Multi-item sharing sends text, capped at 20 links with "… and N more" because
  share targets often truncate long payloads. The dialog says so when the cap
  applies.

## 6. Output formats

### 6.1 Plain text

```
Recipes
Sourdough starter — https://www.kingarthurbaking.com/recipes/sourdough-starter
Weeknight pasta — https://www.seriouseats.com/weeknight-pasta

Code
React hooks — https://react.dev/reference/react
```

One bookmark per line, `Title — URL`, blank line between folder groups. Titles
fall back to a shortened URL when a bookmark has no title. Newlines and
repeated spaces in titles are collapsed. No dates (noise, and they leak when
the bookmark was saved).

### 6.2 Markdown

```markdown
## Recipes

- [Sourdough starter](https://www.kingarthurbaking.com/recipes/sourdough-starter)
- [Weeknight pasta](https://www.seriouseats.com/weeknight-pasta)
```

`[` and `]` in titles are escaped. Without grouping it is one flat list.

### 6.3 Bookmark file (Netscape HTML)

The format every browser exports and imports. It is also readable when opened
directly.

```html
<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- Generated by Bookmark Hub. Import with your browser's bookmark manager. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmark Hub share</H1>
<DL><p>
    <DT><H3 ADD_DATE="1763088000">Recipes</H3>
    <DL><p>
        <DT><A HREF="https://www.kingarthurbaking.com/recipes/sourdough-starter" ADD_DATE="1762992000">Sourdough starter</A>
    </DL><p>
</DL><p>
```

- When the current scope is a folder, that folder becomes the root `<H3>`.
- For All bookmarks or search results, a virtual root
  `Shared bookmarks — 14 Nov 2026` is created and the original relative folder
  paths are rebuilt inside it.
- `ADD_DATE` is the bookmark's `added / 1000`, omitted when unknown.
- Titles, URLs and folder names are HTML-escaped. Only `http(s)`, `ftp` and
  `file` URLs are exported (the data layer already drops the rest).
- A small `<style>` in the head makes the file pleasant to open; importers
  ignore it. No scripts, no remote assets.

Filename: `bookmark-hub-<scope-slug>-YYYY-MM-DD.html`, slug lowercased,
non-alphanumerics collapsed to dashes, max 40 chars; fallback `bookmarks`.

## 7. Technical plan

### 7.1 New module: `js/share.js` (~200 lines)

```js
BHShare = {
  text(items, { group, folders, dedupe }),
  markdown(items, { group, folders, dedupe }),
  netscape(items, { root, folders, dedupe, now }),
  preview(text, lines = 3),
  copy(text),                        // clipboard + execCommand fallback
  download(filename, mime, text),
  shareNative({ title, text }),      // returns false when unavailable
  canNative(),
  filename(scopeLabel, date),
}
```

- Pure string builders stay testable in Node (no DOM except `download`/`copy`).
- `folders` is a `Map<id, {title, path}>`; the app passes `model.folders`.
- Deduplication uses `dupKey` and keeps the first item, matching screen order.
- `download` uses `Blob` + `URL.createObjectURL` + a temporary `<a download>`.
  This needs no `downloads` permission.
- `copy` uses `navigator.clipboard.writeText` inside the click gesture, with a
  hidden textarea fallback; failures toast "Couldn't copy — try Download .html".
- No network calls anywhere in this module.

### 7.2 `js/app.js` changes (~120 lines)

- New toolbar button `#shareBtn` and `data-act="share"` handler; disabled when
  `collect().length === 0` (also updated after render and delete/undo).
- `openShare()` builds `items = collect()`, derives the scope label from
  `scopeTitle()` plus `S.q`, and renders the dialog state.
- Card action `data-act="share-one"`: system share if available, else dialog
  with that single item.
- Dialog state: `{ items, format, group, dedupe }`; re-render preview on change.
- Confirmation toasts reuse the existing `#toast`; no Undo needed.
- Keyboard: `Escape` closes the dialog before clearing search; `/` unaffected.

### 7.3 `manager.html` / `css/manager.css`

- Dialog markup next to `#settings`, hidden by default.
- Styles reuse the settings panel tokens (card, border, shadow, radius) and the
  existing `.seg` control for formats. Dark mode comes free from the tokens.
- New card action icon (share arrow) and toolbar icon.

### 7.4 No manifest changes

No new permissions, no host permissions, no background changes, no new files
outside `js/`. `build.py` already copies `js/` wholesale, so both browser
packages pick the module up.

### 7.5 Version and docs

- `manifest.json` → `1.2.0`.
- README feature list + "Share" section, `CONTEXT-HANDOFF.md` status/file map.
- `site/index.html`: one short section or FAQ entry with the workflow.
- `site/privacy.html`: add one sentence — "Sharing is a local export; nothing
  is uploaded and the recipient only receives what you choose to send."
- `store-listing.md`: add the feature to the description and data-usage text;
  no new permission justification needed.
- Optional sixth screenshot: the share dialog at 1280×800.

## 8. Edge cases

| Case | Behaviour |
|---|---|
| Empty view | Share disabled; tooltip "Nothing to share here". |
| Bookmark with no title | Use shortened URL as the title. |
| Duplicate URLs | `Skip duplicates` on: keep first by screen order. |
| Very large view (5,000+) | Text/HTML generation is synchronous and fast; native share is capped at 20 links; dialog shows the real count. |
| `place:`, `javascript:` URLs | Already filtered by the data layer. |
| Quotes, `&`, emoji, RTL titles | Escaped per format; text/Markdown leave Unicode intact. |
| Windows clipboard | `\n` line endings are accepted everywhere; no CRLF conversion needed for text, HTML keeps `\n`. |
| Clipboard blocked | Fallback textarea; if that fails, suggest the bookmark file. |
| Preview mode (not installed) | Sharing works the same; dialog hides the system-share row if unsupported. |
| Search active | Sharing uses the ranked results, not the whole folder; the dialog says "Search results for “…”" so it is explicit. |
| Recipient imports twice | Browser creates a second "Imported" folder; documented in the share section. |

## 9. Round-trip test

The strongest correctness check needs no network:

1. Open `manager.html` in preview mode, import `demo/bookmarks-demo.html`.
2. Share All → Bookmark file.
3. Import the downloaded file back through the same page.
4. Expect the same bookmark count (28), the same folder names and the same
   duplicate pairs (3). `BHData.parseHtml` is the independent parser here.

Additional checks: one item, folder scope, search scope, duplicate skipping,
no-title fallback, 400 px layout, dark mode, keyboard-only run, Chrome import
and Firefox import, Firefox without `navigator.share`.

## 10. Phases and effort

| Phase | Scope | Effort |
|---|---|---|
| 1 | Toolbar Share for current view, 3 formats, toggles, preview, copy/download, system share, per-card share | ~1–1.5 days |
| 2 | Selection mode (checkbox, Ctrl/Shift, select all visible, sticky bar) | ~0.5–1 day |
| 3 (optional) | QR code for a single link, styled share page with cached previews, CSV | separate decision |

Phase 3 items are deliberately excluded: preview thumbnails would export data
cached from visited sites, and a styled standalone page competes with the
importable format without adding a recipient benefit.

## 11. Decisions taken (change these before implementation if you disagree)

1. **Share what is on screen**, not the whole library, when a search or scope is
   active. Predictable and matches the header count.
2. **No hosted share links.** Keeps the no-server privacy claim honest.
3. **No dates and no preview images** in exports. Smaller files, less metadata.
4. **Plain text is the primary action**; the bookmark file is the "keep these"
   option.
5. **No new permissions.** If a future feature needs `downloads` or a server,
   that is a new review and a new privacy note.
