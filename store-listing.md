# Bookmark Hub - Chrome Web Store listing

Copy each block into the matching field in the Chrome Web Store developer dashboard.
Version: 1.1.0. Package: `dist/bookmark-hub-chrome.zip`.

---

## Name

```
Bookmark Hub
```

## Summary (max 132 characters)

```
All your bookmarks on one fast, visual page. Folders, page previews and search that understands site: and folder:.
```

Character count: 116.

## Category

```
Productivity
```

## Language

```
English
```

## Detailed description

```
Bookmark Hub turns the browser's bookmark list into a page you can actually browse.

Click the toolbar icon or press Alt+B and every bookmark opens in one tab: grouped by folder, with page previews, sites you recognise and a search box that understands what you are looking for.

FIND ANYTHING IN SECONDS
Type what you remember. Every word has to match, and results are ranked by where the match was found: the bookmark title first, then the site, then the folder path. Press / to jump to search, Enter to open the top result, and the arrow keys to move between cards.

Search operators:
  site:github.com      only bookmarks from one site
  folder:recipes       only bookmarks inside one folder
  "sourdough starter"  an exact phrase
  -youtube             leave a word or site out

SEE YOUR FOLDERS
The sidebar mirrors your real folder tree with live counts, plus Recently added, Top sites, Duplicates and Missing titles. Group the grid by folder, by site or by month added. Switch between cards and a compact list.

RECOGNISE PAGES BY SIGHT
Cards use the site's own page preview image and real title when previews are enabled (optional, asked once). Without previews, each card gets a coloured tile built from the site name and its icon. Nothing is uploaded: previews are fetched straight from the bookmarked page and cached in this browser.

TIDY UP WITHOUT LOSING ANYTHING
Duplicates counts the extra copies of the same link, so you can find them fast. Missing titles shows bookmarks saved with no name. Delete removes exactly the copy you clicked, and an Undo button is available for 8 seconds to put it back in the same folder and position.

WORKS WITH YOUR BROWSER
Live updates: adding, moving, renaming or deleting a bookmark in the browser shows up on the page right away. Light and dark themes follow the system or your choice. Open bookmarks in a new tab or the current one. Works in Chrome, Edge and Brave. A Firefox build is available from addons.mozilla.org.

PRIVATE BY DESIGN
No account, no server, no analytics, no tracking. Your bookmarks never leave the browser. Site icons are loaded from Google's favicon service by default (that sends each bookmarked domain to Google); you can turn this off in Settings. Page previews are off until you enable them.

FREE
No subscription, no sign-up, no ads.
```

## Single purpose statement

The store asks for one sentence when a permission looks broad. Use:

```
Bookmark Hub has one purpose: show the user's bookmarks in a single searchable page.
```

## Permission justifications

Paste the matching text into the dashboard's permission fields.

### `bookmarks`

```
Read the browser's bookmark tree (titles, URLs, folder names, dates added) so the extension's single page can display, group and search them. The extension calls bookmarks.remove only after the user clicks the Delete button on a card, and offers Undo for 8 seconds, which recreates the bookmark in its original folder and position. No bookmark data is sent anywhere.
```

### `storage`

```
Store the user's display settings (theme, layout, sort, grouping) and the optional page-preview cache in the extension's own local storage on the device. Nothing is synced or transmitted.
```

### Optional host permission `<all_urls>`

```
Requested only after the user clicks "Enable previews" in the page or Settings. It is used to fetch the bookmarked page itself and read its <head>: page title, description, preview image and site icon. Results are cached in local storage. The permission can be removed at any time with Settings > Page previews > Turn off. The extension never runs on or modifies the pages the user visits.
```

### `commands` (`Alt+B`)

```
Optional keyboard shortcut that opens the Bookmark Hub page, the same action as clicking the toolbar icon. Users can change or remove it at chrome://extensions/shortcuts.
```

### Permissions deliberately not requested

- No `tabs` permission: the toolbar shortcut finds an already-open hub tab with a runtime message, not by reading tab URLs.
- No `history`, `downloads`, `cookies`, `scripting` or content scripts.

## Remote code

Answer: **No, I am not using remote code.**

```
All JavaScript is bundled in the extension package. Nothing is loaded from a CDN, evaluated from a string, or downloaded at runtime.
```

## Data usage / privacy practices answers

Chrome asks what the extension handles and what the developer does with it.

| Question | Answer |
|---|---|
| Does the extension collect personally identifiable information? | No |
| Health information? | No |
| Financial and payment information? | No |
| Authentication information? | No |
| Personal communications? | No |
| Location? | No |
| Web history? | Bookmarks are read locally so they can be displayed and searched. They are not transmitted. Declare this if the form treats saved URLs as web history. |
| User activity? | No |
| Website content? | Optional previews read a bookmarked page's title, description and preview image directly from that site. Cached locally, never sent to the developer. |

Certify:

- Data is **not** sold to third parties.
- Data is **not** used or transferred for purposes unrelated to the item's single purpose.
- Data is **not** used or transferred to determine creditworthiness or for lending purposes.

Plain-language summary to keep the reviewer happy:

```
Bookmark Hub processes bookmark titles, URLs, folders and dates locally in the browser to render its single page. The developer has no server and receives no data. Optional page previews fetch the bookmarked page directly from the site that hosts it; those sites see a normal request. Site icons are requested from Google's favicon service unless the user turns that setting off. Settings and the preview cache live in extension local storage on the device.
```

## Privacy policy URL

Host `site/privacy.html` (see `site/README.md`), then paste the public URL here:

```
https://REPLACE-WITH-YOUR-DOMAIN/privacy.html
```

The URL must be publicly reachable without a login. GitHub Pages, Netlify, Cloudflare Pages and Vercel all work.

## Store assets

### Screenshots (1280x800 PNG or JPEG, 1-5 images)

| File | Caption |
|---|---|
| `01-all-bookmarks.png` | Every bookmark on one page, grouped by folder. |
| `02-instant-search.png` | Search ranks titles first, then sites and folders. |
| `03-folders-dark.png` | The real folder tree, with counts, in dark mode. |
| `04-clean-up-duplicates.png` | Find duplicate links and delete one copy at a time, with Undo. |
| `05-compact-list.png` | A compact list when you want more on screen. |

If you retake the screenshots yourself, use sample bookmarks only (never your real bookmark data) and keep the exact 1280x800 size.

### Small promo tile (440x280)

Text on the tile, if you rebuild it:

```
Bookmark Hub
Find any bookmark in seconds.
```

### Marquee tile (1400x560, optional)

```
Bookmark Hub - every bookmark, one searchable page.
```

## Store listing checklist

1. Create a Chrome Web Store developer account (one-time US$5 registration fee) at https://chrome.google.com/webstore/devconsole.
2. Upload `dist/bookmark-hub-chrome.zip`.
3. Paste the name, summary and detailed description above.
4. Add the five screenshots and the 440x280 promo tile.
5. Select Productivity, English, and the regions you want to distribute in.
6. Fill the Privacy practices tab: single purpose, permission justifications, data usage, remote code = No.
7. Host `site/privacy.html` and add its public URL.
8. Add the support contact (the Support tab on the listing is enough; no personal email needed).
9. Submit for review. Broad optional host permissions can add review time; the justification above explains that it is opt-in and preview-only.

## Honest notes for the reviewer and for you

- Bookmark URLs are processed only in the browser. There is no backend.
- With site icons on (the default), each bookmarked domain is sent to `www.google.com/s2/favicons`. The setting is in the page's Settings panel and is labelled plainly. If review pushes back on this, the fastest fix is to ship with site icons off by default; the coloured tiles still work.
- Preview images are loaded from the site that hosts them, so those sites see a normal image request.
- Deleting is user-initiated and reversible for 8 seconds. There is no bulk delete and no background modification of bookmarks.
- The Firefox package is `dist/bookmark-hub-firefox.zip` for addons.mozilla.org; use the same copy, with the Firefox privacy-policy field pointing at the same page.
