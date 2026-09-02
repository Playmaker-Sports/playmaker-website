# Playmaker Website

This repo is a modular static site. The goal is to keep it easy for multiple people to update without drifting back into duplicated HTML or unclear ownership.

## Daily workflow

1. Edit source files in `src/` and shared browser code in the root `.js` files.
2. Run `npm.cmd run build` or `node scripts/build-pages.js`.
3. Run `npm.cmd run qa` or `node scripts/qa-dist.js`.
4. Commit both the source changes and the generated `dist/` output.

## Publish a news article

1. Add the article image to `assets/news/` (prefer WebP and a descriptive filename).
2. Add the newest article first in `src/data/news.json`. Keep the `slug` lowercase with hyphens; it becomes `post-<slug>.html`.
3. Run `npm.cmd run build` and `npm.cmd run qa`.
4. Commit the source, image, and generated `dist/` output, then push `main`.
5. Render deploys the pushed commit automatically. Verify `/news.html` and the new article URL after the deploy is live.

See [WIX_MIGRATION.md](WIX_MIGRATION.md) for the hosting architecture, domain cutover, Wix export, rollback, and final cancellation checklist.

## Repo structure

- `src/` is the source of truth for page structure and editable content.
- `src/partials/` contains shared markup such as the header, footer, and reusable event-page shell.
- `src/templates/` contains the outer page layout.
- `src/pages/` contains page-specific content fragments and script includes.
- `src/data/` contains site-owned content such as homepage copy, contact-page copy, news posts, and event landing-page presentation copy.
- Root `.js` files such as `event-page.js`, `results-page.js`, `teams-page.js`, and `clubs-page.js` contain shared browser behavior.
- `dist/` is the only generated website output and the folder that should be hosted or published.

## Ownership boundaries

- `playmaker-static` is the source of truth for event details, config, archived JSON, field maps, logos, and event assets.
- `playmaker-api` is the source of truth for API behavior and live event data shaping.
- `playmaker-website` should only own presentation, layout, routing, and site-level marketing copy.

Do not copy event-detail data into this repo if it belongs in `playmaker-static`.

The site ships fallback copies of `event_config.json`, `rules_template.json`, and
`archived/` (used when the cross-origin fetch from the static site fails), but they
are synced into `dist/` from the sibling `playmaker-static` checkout at build time.
They no longer exist in this repo's root and must never be hand-edited — fix the
data in `playmaker-static` and rebuild. The build fails if `../playmaker-static`
is missing.

## What to edit

Edit these when changing shared site content:

- `src/site.json` for nav links, footer links, social links, and app store badges
- `src/data/home.json` for homepage marketing copy
- `src/data/contact.json` for contact-page copy
- `src/data/news.json` for news posts
- `src/data/event-marketing.json` for event landing-page presentation-only copy

Edit these when changing layout or page structure:

- `src/partials/*.html`
- `src/templates/layout.html`
- `src/pages/*.content.html`
- `src/pages/*.scripts.html`

Edit these when changing behavior:

- `site.js`
- `event-page.js`
- `results-page.js`
- `rules-page.js`
- `teams-page.js`
- `clubs-page.js`
- `team-directory.js`
- `page-utils.js`

## What not to edit by hand

- Do not hand-edit files inside `dist/` unless you are debugging a generated output issue.
- Do not recreate root `.html` files in the repo root. They were intentionally removed.
- Do not reintroduce one-off page copies when the same structure belongs in a shared partial or data file.
- Do not move event-detail ownership from `playmaker-static` into `playmaker-website`.

## Routes

Current site routes are generated from `src/pages.json` and include:

- `index.html`
- `news.html`
- `contact.html`
- `playmakers-cup.html`
- `winter-fest.html`
- `summer-championship.html`
- `results.html`
- `rules.html`
- `teams.html`
- `clubs.html`

Legacy `standings.html` has been retired. The current standings and schedule flow uses `results.html`.

## Commands

- `npm.cmd run build` builds the site into `dist/`
- `npm.cmd run serve:dist` serves `dist/` locally on port `4173`
- `npm.cmd run qa` serves `dist/` and runs Playwright smoke checks
- `node scripts/build-pages.js` is the direct build command
- `node scripts/qa-dist.js` is the direct QA command

## Team and AI guardrails

If Kian, ChatGPT, Claude, or Codex are helping with changes:

- ask them to preserve the `src -> dist` architecture
- ask them not to reintroduce editable root HTML files
- ask them to centralize repeated content in `src/data/` or `src/partials/`
- ask them to keep event data ownership in `playmaker-static`
- ask them to run the build and QA commands after structural changes

## More docs

- See [src/README.md](C:/Users/camko/Desktop/Projects/Playmaker/playmaker-website/src/README.md) for source-folder details.
- See [CONTRIBUTING.md](C:/Users/camko/Desktop/Projects/Playmaker/playmaker-website/CONTRIBUTING.md) for contribution rules.
- See [ARCHITECTURE.md](C:/Users/camko/Desktop/Projects/Playmaker/playmaker-website/ARCHITECTURE.md) for a higher-level architecture guide.
