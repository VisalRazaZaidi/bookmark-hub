# Bookmark Hub: project handoff (for OpenCode / DeepSeek)

Last verified on disk: 2026-11-14. Repository: `D:\coding\bookmark-hub`.

Live: https://visalrazazaidi.github.io/bookmark-hub/ · Privacy: https://visalrazazaidi.github.io/bookmark-hub/privacy.html · GitHub: https://github.com/VisalRazaZaidi/bookmark-hub

## 1. Goal

The user (Pakistan-based full-stack dev, writes Roman Urdu mixed with English, wants direct and actionable replies) found the browser's bookmark UI poor for browsing and searching. Bookmark Hub is a **browser extension**:

- Click the toolbar icon (or Alt+B) and a **new tab opens** with every bookmark organized by folder, with thumbnails and a search box.
- Next goal: **publish it on the Chrome Web Store**, which needs (a) a Chrome-clean package, (b) store listing text and images, (c) a **landing page** explaining how it organizes and helps find bookmarks, and (d) a **privacy policy page**.

## 2. Current status

| Item | State |
|---|---|
| Extension v1.2.0 source | Done and tested in Chromium (sharing + selection) |
| Sharing (v1.2.0) | Done: share the current view (folder/search/Duplicates/site/all) as a link list, Markdown or Netscape bookmark file; per-card share; native share sheet when available. Local-only, no new permissions |
| Selection mode (v1.2.0) | Done: toolbar toggle, card checkboxes, Shift-click range, "Select all visible", sticky bar, share selected. Esc exits |
| Fix: second toolbar click opened a duplicate tab | Done (runtime ping, no `tabs` permission), tested |
| Fix: deleting a duplicate seemed to delete all copies | Done. Unique-id delete, no confirm dialog, 8 s Undo that restores folder + position. Tested |
| Chrome + Firefox build script and zips | Done: `build.py` -> `dist/bookmark-hub-chrome.zip`, `dist/bookmark-hub-firefox.zip` |
| Store screenshots (1280x800 x5) + promo tiles (440x280, 1400x560) | Done: `screenshots/`, built from sample data, not the user's bookmarks |
| `store-listing.md` | Done: copy, permission justifications, data-usage answers, checklist |
| Landing page `site/index.html` + `site/privacy.html` | Done, responsive, working search demo, no console errors |
| Hosting the landing page | **Done.** Public repo `VisalRazaZaidi/bookmark-hub`, deployed by `.github/workflows/pages.yml` to GitHub Pages |
| Publishing to the stores | **Manual step remains.** Developer account, US$5 fee, upload zips, submit for review |

Nothing is left in the code that blocks submission. The remaining work is account/hosting actions in section 7.

## 3. File map

```
D:\coding\bookmark-hub\
  manifest.json          MV3 v1.2.0. perms: bookmarks, storage. optional_host_permissions: <all_urls>.
                         Sharing adds no permissions and no network access.
                         Both background.service_worker and background.scripts are present in the source
                         (Chrome uses one, Firefox the other); build.py splits them.
                         gecko id bookmark-hub@visalraza.dev, min Firefox 140, command _execute_action Alt+B.
  manager.html           hub page (topbar, sidebar, main, settings panel, toast with Undo)
  css/manager.css        all styling; light/dark via color-scheme + light-dark() tokens
  js/background.js       openHub(): runtime message {type:"bookmark-hub:ping"}; if the hub tab answers
                         {tabId,windowId} it focuses it, else tabs.create(manager.html)
  js/store.js            BHStore get/set/remove: extension storage.local, localStorage fallback
  js/data.js             BHData: loadLive(), parseHtml() for Netscape exports, removeBookmark(id)
                         (returns the removed node), restoreBookmark(node), onChange()
  js/previews.js         BHPreviews: optional og:image/title/description/icon fetcher + cache
  js/share.js            BHShare: pure text/Markdown/Netscape builders, preview, copy, download,
                         filename, canNative/shareNative. No DOM state, no network.
  js/app.js              all UI logic, search, grouping, ping responder, undo toast,
                         share dialog, selection mode, per-card share
  fonts/                 bricolage.woff2, inter.woff2 (bundled)
  icons/                 icon-16/32/48/128.png
  build.py               builds dist/chrome, dist/firefox and both zips
  store-listing.md       Chrome Web Store copy, permission texts, privacy answers, submission checklist
  README.md              install, build, features, privacy summary
  site/                  static landing page + privacy policy (no build step)
    index.html           hero with a working 28-bookmark search demo, sections, FAQ, install
    privacy.html         effective 2026-11-14, includes a sharing section
    assets/              icon-32.png, icon-128.png
    README.md            hosting, STORE_URL and privacy-URL steps
  .github/workflows/pages.yml   deploys site/ to GitHub Pages on push to main
  screenshots/           01-all-bookmarks.png ... 05-compact-list.png (1280x800)
                         promo-small-440x280.png, promo-marquee-1400x560.png, promo.html (source)
  demo/bookmarks-demo.html   28 sample bookmarks in 7 folders, 3 duplicate pairs, 2 untitled
  dist/                  build output; regenerate with build.py, do not edit by hand
  .gitignore             dist/ and OS junk
  .gitattributes         LF line endings, binary assets
```

## 4. How the extension works (key behavior)

- **Data**: live mode reads `bookmarks.getTree()`; each bookmark becomes `{id,title,url,host,added,folderId,pathIds,path,icon,dupKey,dups}`. `dupKey` = host (no www) + path (no trailing slash) + query, lowercase; `dups` = number of bookmarks sharing it. Non-http(s)/ftp/file URLs (place:, javascript:) are skipped.
- **Preview mode**: if opened outside the extension (no bookmarks API), the page lets you import an exported bookmarks `.html` (used for tests and screenshots).
- **Sidebar**: All bookmarks, Recently added (latest 60), Duplicates (count = surplus copies), Missing titles, folder tree with recursive counts, Top sites (hosts with 2+ bookmarks).
- **Main**: card grid (16:10 thumbnail, title, host, date, folder chip) or compact list. Group by folder / site / month added / none. Sort: newest, oldest, A-Z, Z-A. Rendering is chunked (90 cards at a time, IntersectionObserver sentinel).
- **Thumbnails**: with no preview, a tile is drawn from a hash-derived hue, a large domain name in Bricolage, and a favicon badge. Favicons come from the Google s2 service (toggle in Settings). Optional previews: user clicks "Enable previews", the extension requests `<all_urls>`, fetches each page head (max 256 KB, 9 s timeout, 6 concurrent, visible cards first), reads og:image / twitter:image, title, description, icon with an inert DOMParser, and caches in storage.local. Titles for bookmarks saved with an empty title come from this.
- **Search** (global, ignores the sidebar scope while typing): all terms must match (AND). Score weights: title 10 (+5 word start), host 8, folder path 4, URL 3, description 2. Operators: `site:`, `folder:` (alias `in:`), `"exact phrase"`, `-exclude`. `/` focuses search, Enter opens the top result (Ctrl/Shift+Enter in a new tab), arrow keys move between cards, Esc clears.
- **Live sync**: bookmark created/removed/changed/moved events trigger a debounced reload.
- **Single tab**: the hub page listens for `bookmark-hub:ping` and replies with its tab/window id; the background focuses that tab, otherwise opens a new one. No `tabs` permission is needed.
- **Delete/Undo**: clicking Delete on a card calls `bookmarks.remove(id)` for that unique id only. `removeBookmark` returns the node first; the toast offers Undo for 8 s, and `restoreBookmark` calls `bookmarks.create` with the original parentId and index. No confirmation dialog.
- **Sharing**: exports exactly the items currently rendered (`visible`, same as the header count). `BHShare.text/markdown/netscape` build the body; dedupe is on by default (screen order wins), grouping follows the immediate folder. Netscape output is importable and keeps folder hierarchy and `ADD_DATE`. The dialog offers copy, download, and a native share sheet when `navigator.share` exists. Selection mode adds checkboxes with Shift-range and "Select all visible", and shares only the picked cards. Everything is local; there is no fetch, backend or new permission.
- **Settings**: theme (auto/light/dark), open in new tab vs same tab, site icons on/off, preview controls (fetch missing, clear cache, turn off).

## 5. Bugs reported and how they were handled

1. **"It creates a duplicate tab."** The old background code used `tabs.query({url})`, unreliable without the `tabs` permission. Fix: the hub page answers a runtime ping with its tab id; the background focuses it, else opens a new one. Verified in Chrome for Testing: the ping returns the exact current tab id, and the page runs no `tabs`-permission code.
2. **"Deleting a duplicate deletes all copies."** The delete uses `bookmarks.remove(id)` on the unique id of the card. In a group of 2, the surviving copy leaves the Duplicates view (it is no longer a duplicate), which looks like both were deleted. Changes: removed the confirm dialog, the toast now states what happened ("Deleted this copy. The other copy is still saved in 'Folder'."), and an 8 s **Undo** button restores the bookmark at its original folder and position. Tested in Chrome for Testing: 5 duplicate cards -> delete one -> 4; API shows the other copies; Undo recreates the removed copy at the same index. Firefox itself is still untested; if real loss appears there, investigate next.

## 6. Tests run on 2026-11-14

- **Sharing, preview mode** (`share-test.js`, 39 checks, ALL PASS): imported `demo/bookmarks-demo.html` (28 cards); dialog count and scope label; dedupe 28 -> 25 with "3 duplicate links skipped"; clipboard has 25 links; Markdown preview and button label; `.html` download starts with the Netscape doctype, has 25 anchors, folder headings and escaped ampersands; round-trip imports 25 cards and 7 folder rows; folder scope (Recipes, 3 links, root `<H1>`); search scope ("sourdough", 1 link); empty search disables Share; selection mode, Shift-range (4), share-selected label, Esc behavior, "Select all visible" (25); dedupe off still copies 25 remaining links; dialog fits at 1280 and 400/360 px with no horizontal overflow; zero page errors.
- **Sharing, live extension** (`live-share-test.js`, ALL PASS): `dist/chrome` seeded with 4 cards including a duplicate, an untitled bookmark, an ampersand URL and a nested folder; dedupe reports 1 duplicate; clipboard has 3 links; untitled bookmark falls back to its URL as title; file escapes `&` and keeps the nested folder; folder scope label/count; selection + delete keeps the count honest; Undo toast appears; share-selected shows the right count; ping returns the exact tab/window; zero page errors.
- **Existing delete/undo/ping regression** (`test.js`): still passes.
- **Extension, Chrome for Testing 159** (Playwright, `--load-extension=dist/chrome`, fresh profile):
  - seeded 6 bookmarks (one 3-copy group, one pair, one untitled): page showed 6 cards, Duplicates 3, Missing titles 1;
  - Duplicates view showed 5 cards; deleting one showed 4, API confirmed exactly one removed;
  - toast had Undo; clicking it restored the bookmark with the original `parentId` and `index`;
  - `runtime.sendMessage({type:"bookmark-hub:ping"})` from the service worker returned the page's precise `tabId`/`windowId`;
  - no page JavaScript errors (only expected 404s for fake-domain favicons).
- **Preview mode** (file://, imported `demo/bookmarks-demo.html`):
  - 28 cards, 7 folder rows, 3 duplicate pairs (6 cards), 2 untitled;
  - search: `docs` -> 8, `site:github.com` -> 2, `folder:recipes` -> 3, `"sourdough starter"` -> 1, `-youtube` -> 27; highlights present; 0 errors.
- **`web-ext lint` on `dist/firefox`**: 0 errors, 0 notices, 7 `UNSAFE_VAR_ASSIGNMENT` warnings (same as before; all dynamic values pass through `esc()`).
- **Landing page** (Chrome headless + in-app browser):
  - 1280x800 and 400/360 px iframe layouts: no horizontal overflow;
  - hero search operators, chips, empty state, and the duplicate delete/Undo mock all work;
  - no console errors; privacy page renders at 1280.
- **Not tested**: real Firefox, live network previews inside the store build, Chrome Web Store review.

## 7. Remaining work (manual, no code)

### 7.1 The site is hosted

- Landing page: https://visalrazazaidi.github.io/bookmark-hub/
- Privacy policy: https://visalrazazaidi.github.io/bookmark-hub/privacy.html
- Repository: https://github.com/VisalRazaZaidi/bookmark-hub (public, because free GitHub Pages requires it)
- Release: https://github.com/VisalRazaZaidi/bookmark-hub/releases/tag/v1.2.0 with both zips attached (v1.1.0 is the previous release)

Pushing to `main` redeploys the site through GitHub Actions. The privacy URL above is already filled into `store-listing.md`. When the Chrome Web Store listing exists, paste its URL into `const STORE_URL = "";` in `site/index.html` and push again; until then the store buttons scroll to the install section, which now links to the GitHub release downloads.

### 7.2 Publish

1. Create a Chrome Web Store developer account (one-time US$5 fee) at https://chrome.google.com/webstore/devconsole.
2. Upload `dist/bookmark-hub-chrome.zip`.
3. Paste the fields from `store-listing.md`: name, summary, detailed description, category (Productivity), language.
4. Upload the five 1280x800 screenshots and the 440x280 promo tile.
5. Fill Privacy practices: single purpose, permission justifications, data usage, remote code = No; add the hosted privacy URL.
6. Submit for review. The optional `<all_urls>` permission may add review time; the justification is opt-in and preview-only.
7. Firefox: upload `dist/bookmark-hub-firefox.zip` to https://addons.mozilla.org/developers/ as unlisted, or publish it publicly.

### 7.3 Optional polish

- Retake screenshots in the user's own browser for authentic favicons/previews (use sample bookmarks, never real data).
- Ship with site icons off by default if review objects to the Google favicon request.
- Test the Firefox build manually.

## 8. Gotchas and constraints

- **Do not change the unique-id delete logic** and **do not add the `tabs` permission** (it triggers a scary install warning and breaks the no-permission ping design).
- **Never invent a store URL.** `STORE_URL` stays empty until the listing exists.
- **Do not publish real bookmark data.** All demo/screenshot data uses public sample sites.
- The branded installed Chrome (137+) ignores `--load-extension`; use Playwright's Chrome for Testing for extension tests. The repository's `dist/chrome` is the correct Chrome input; the root is the Firefox/dev source.
- Screenshot/promo requirements: screenshots exactly 1280x800 or 640x400, promo tile 440x280, marquee 1400x560 optional, description under 132 chars.
- Fonts for promo/screenshot HTML must load from a `file://` page (not `setContent`) or they silently fall back.
- The site's Google Fonts request sends the visitor's IP to Google; the privacy page already says so. The extension bundles fonts locally.
- `dist/` is regenerated by `build.py`; never hand-edit it.

## 9. Quick commands

```bash
python build.py                 # rebuild both zips
npx web-ext lint --source-dir dist/firefox --output text
```

The landing page deploys automatically on every push to `main` (`.github/workflows/pages.yml`).

To verify the extension in a browser, load `dist/chrome` unpacked at `chrome://extensions`, or use Playwright with the Chrome for Testing executable and
`--disable-extensions-except=dist/chrome --load-extension=dist/chrome`.
