# Playmaker Website Source

Edit the shared layout and page source files in `src/`, then run `node scripts/build-pages.js` to regenerate the static site.

If PowerShell blocks `npm` scripts on this machine, use `node scripts/build-pages.js` directly or `npm.cmd run build`.

- `src/partials/` holds shared header/footer markup.
- `src/templates/layout.html` wraps every page.
- `src/pages/*.content.html` holds each page's main content.
- `src/pages/*.scripts.html` holds page-specific scripts.
- `src/site.json` centralizes nav, social links, and app store links.
- `src/data/` holds editable content collections and page copy such as news posts, homepage text, and contact-page content.
- `src/data/event-marketing.json` holds website-owned event landing-page presentation copy; live event details still belong in `playmaker-static`.
- `dist/` is the only generated website output and the clean deploy target.
- `npm.cmd run serve:dist` serves the built site locally on port `4173`.
- `npm.cmd run qa` starts a local server and runs the Playwright smoke checks against `dist/`.

## Editing rules

- If content is repeated across pages, move it into `src/partials/` or a file in `src/data/`.
- If content belongs to event truth, do not add it here; put it in `playmaker-static`.
- If you need a new route, add it to `src/pages.json` and create the matching source fragments.
- Do not create generated HTML in the repo root.

## Good patterns

- Shared site copy in `src/data/*.json`
- Shared layout in `src/partials/*.html`
- Small page-specific content fragments in `src/pages/*.content.html`
- Shared JS behavior in root `.js` modules

## Bad patterns

- Copying the same footer, header, or event shell into multiple page files
- Hardcoding site-wide links in multiple places
- Treating `dist/` as the source of truth
- Pulling event-detail ownership into this repo
