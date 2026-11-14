# Bookmark Hub

Click the toolbar icon (or press **Alt+B**) to open all your bookmarks in a new tab: organized by folder, with thumbnails and instant search.

Free, no account, no analytics, no server. Your bookmarks never leave the browser.

**Links:** [Landing page](https://visalrazazaidi.github.io/bookmark-hub/) · [Download](https://github.com/VisalRazaZaidi/bookmark-hub/releases/latest) · [Privacy policy](https://visalrazazaidi.github.io/bookmark-hub/privacy.html)

## What it does

- **Real folders.** The sidebar mirrors the browser's bookmark tree with live counts, plus Recently added, Duplicates, Missing titles and Top sites.
- **Page previews (optional).** Each card can show the page's own preview image and real title. Off until you enable it; previews are fetched from the sites themselves and cached locally.
- **Search that understands context.** Every word must match, ranked by title, site, folder and URL. Operators: `site:github.com`, `folder:recipes` (or `in:`), `"exact phrase"`, `-exclude`.
- **Clean up safely.** Duplicates counts the extra copies of a link. Delete removes exactly the copy you clicked and offers **Undo** for 8 seconds, restoring it to the same folder and position.
- **Share without a server.** Send the current folder, search result or a hand-picked selection as a plain link list, Markdown, or a standard bookmark file that Chrome, Edge, Firefox and Safari can import. Duplicates can be skipped, and folder names travel with the file.
- **Live sync.** Creating, moving, renaming or deleting a bookmark in the browser updates the page.
- **Keyboard first.** `/` focuses search, `Enter` opens the top result, arrow keys move between cards, `Esc` clears, `Alt+B` opens the hub.
- **Light and dark**, grid or compact list, group by folder, site or month.

New in **1.2.0**:

- **Share** the current view or a selection as a link list, Markdown or an importable bookmark file. Everything is built locally; there is no share server.
- **Select mode** for picking individual cards, with shift-range selection and "Select all visible".
- Native share sheet support on browsers that provide it, with copy/download fallback everywhere else.

New in **1.1.0**:

- A second toolbar click focuses the open hub tab instead of opening a duplicate tab (no extra permission).
- Deleting a duplicate removes only that copy and can be undone for 8 seconds (the old confirmation dialog is gone).
- Chrome and Firefox packages are built from one source by `build.py`.

## Install

### Download (Chrome, Edge, Brave)

1. Download `bookmark-hub-chrome.zip` from [Releases](https://github.com/VisalRazaZaidi/bookmark-hub/releases/latest) and unzip it.
2. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`) and turn on **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.
4. Click the Bookmark Hub icon, or press **Alt+B**.

The Chrome Web Store listing is coming later; until then this is the install path the landing page links to.

### Chrome, Edge, Brave (from source, for development)

1. Run `python build.py` (or use the included `dist/chrome` folder).
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select `dist/chrome`.
4. Click the Bookmark Hub icon, or press **Alt+B**.

Do not load the repository root in Chrome: it contains the Firefox `background.scripts` key as well. The build strips it.

### Firefox (temporary)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...** and pick `manifest.json` from this folder (or the zip).
3. Click the Bookmark Hub icon. Firefox removes temporary add-ons when it restarts.

### Install permanently

- **Signed Firefox build:** upload `dist/bookmark-hub-firefox.zip` at https://addons.mozilla.org/developers/ as **"On your own"** (unlisted). Mozilla signs it in minutes; install the signed `.xpi` from Add-ons > gear icon > Install Add-on From File.
- **Firefox Developer Edition / Nightly / ESR:** set `xpinstall.signatures.required` to `false` in `about:config`, then install the zip as an add-on file.
- **Chrome Web Store / Edge Add-ons:** upload `dist/bookmark-hub-chrome.zip`. See `store-listing.md` for the listing text, permission justifications and review checklist.

## Build

```bash
python build.py            # both browsers
python build.py --chrome   # Chrome / Edge / Brave
python build.py --firefox  # Firefox
```

Output goes to `dist/`:

```
dist/chrome/                  unpacked Chrome build
dist/firefox/                 unpacked Firefox build
dist/bookmark-hub-chrome.zip
dist/bookmark-hub-firefox.zip
```

The source folder is the single source of truth; the browser-specific manifests are derived from `manifest.json`.

## Search tips

- `site:github.com` limits to a site
- `folder:python` limits to a folder (`in:python` also works)
- `"exact phrase"` matches a phrase
- `-word` excludes a word
- Press `/` anywhere to jump to search; `Enter` opens the top result; arrow keys move between cards.

## Sharing

- Click the share icon in the toolbar to share the current view — a folder, a search result, Duplicates, a site or all bookmarks.
- Or click the select icon, tick cards (Shift-click selects a range), then press **Share** in the bottom bar.
- Choose **Link list** (chat/email), **Markdown** (docs/README) or **Bookmark file (.html)** (importable by Chrome, Edge, Firefox and Safari).
- "Skip duplicate links" is on by default; the bookmark file keeps folder names.
- Everything is generated locally. Nothing is uploaded, and the recipient does not need Bookmark Hub.

## Privacy

- Bookmarks are read locally with the browser's bookmarks API and never leave your browser.
- Sharing is a local export: the link text or `.html` file is generated in the page and downloaded or copied by you. Nothing is uploaded.
- Page previews (optional) are fetched directly from each bookmarked site and cached in this browser. The optional all-sites permission is requested only when you enable previews and can be removed in Settings.
- Site icons come from Google's icon service by default (this sends each site's domain to Google). Turn it off in Settings.
- The full policy is at https://visalrazazaidi.github.io/bookmark-hub/privacy.html (source: `site/privacy.html`).

## Project layout

```
manifest.json          MV3 manifest (Chrome + Firefox keys; build.py splits it)
manager.html           the hub page
css/manager.css        all styling; light/dark tokens
js/background.js       toolbar click: focus an open hub tab, else open one
js/store.js            storage.local, localStorage fallback for preview mode
js/data.js             bookmarks API, Netscape HTML import, delete/restore
js/previews.js         optional og:image/title/description/icon fetcher
js/share.js            text / Markdown / Netscape export builders, copy + download
js/app.js              UI, search, grouping, cards, sharing, selection, settings, undo
fonts/                 bundled Bricolage + Inter
icons/                 toolbar and store icons
build.py               Chrome/Firefox packages -> dist/
store-listing.md       Chrome Web Store copy, disclosures, checklist
site/                  landing page + privacy policy (static, no build)
screenshots/           1280x800 store screenshots + promo tiles + promo.html source
demo/                  sample bookmarks export used for tests and screenshots
```

The site pages use sample bookmarks only. To retake screenshots, import
`demo/bookmarks-demo.html` into the extension's preview mode and follow the
captions in `store-listing.md`.
