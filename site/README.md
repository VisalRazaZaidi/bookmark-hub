# Bookmark Hub website

Two standalone pages, no build step:

```
site/
  index.html      landing page with a working search demo
  privacy.html    privacy policy (effective 14 November 2026)
  assets/
    icon-32.png   favicon
    icon-128.png  larger icon
```

Everything else in the repository belongs to the extension.

## Before you publish

1. **Store URL.** Open `site/index.html` and find this line near the bottom:

   ```js
   const STORE_URL = "";
   ```

   Paste the public Chrome Web Store listing URL between the quotes. While it is
   empty, every "Add to Chrome" button scrolls to the install section, so the
   page is safe to publish before the listing is live.

2. **Privacy URL.** Already hosted at
   `https://visalrazazaidi.github.io/bookmark-hub/privacy.html`; use that URL in
   the Chrome Web Store dashboard and in `store-listing.md`.

3. **Optional: self-host the fonts.** The pages load Bricolage Grotesque and
   Inter from Google Fonts. To remove that third-party request, copy
   `fonts/bricolage.woff2` and `fonts/inter.woff2` from the extension into
   `site/assets/` and replace the Google Fonts `<link>` with the `@font-face`
   rules used in `css/manager.css`. Also update the privacy policy sentence
   about Google Fonts if you do.

## Hosting

The site is live on GitHub Pages:

- **Landing page:** https://visalrazazaidi.github.io/bookmark-hub/
- **Privacy policy:** https://visalrazazaidi.github.io/bookmark-hub/privacy.html
- **Repository:** https://github.com/VisalRazaZaidi/bookmark-hub

Deployment is automatic: `.github/workflows/pages.yml` uploads this `site/`
folder whenever `main` changes. Enable it once under Settings > Pages >
Source: **GitHub Actions**. No build command, no output directory.

Any other static host also works: drag the `site` folder into Netlify or
Cloudflare Pages, or copy `index.html`, `privacy.html` and `assets/` to the same
directory on any web server. The pages have no server-side code, cookies or
analytics.

Open `privacy.html` directly from the site root; the landing page links to it as
`privacy.html`, so both files must stay side by side.

## What is in the demo

The hero searches 28 sample bookmarks from public sites (Linear, Figma, GitHub,
MDN, King Arthur Baking and so on). The same list is exported for screenshots in
`demo/bookmarks-demo.html`. The landing page never includes anyone's real
bookmark data.

The duplicate card in the "Clean up" section has a working delete and Undo
animation. The hero search supports the real operators: `site:`, `folder:`,
`"exact phrase"` and `-exclude`.
