# Architecture

## Overview

`playmaker-website` is a modular static frontend for Playmaker Sports.

It does not own tournament truth. Instead, it sits on top of:

- `playmaker-static` for event config, archived JSON, field maps, logos, and static assets
- `playmaker-api` for live event data

This repo assembles static HTML from reusable templates and content files, then ships a plain static site in `dist/`.

## Build model

The site uses a simple source-to-output pipeline:

- source files live in `src/`
- shared behavior lives in root `.js` files
- `scripts/build-pages.js` renders the final pages
- output is written to `dist/`

That means:

- humans edit `src/` and shared JS
- hosting serves `dist/`

## Source layout

### `src/partials/`

Shared HTML fragments. Use this for repeated layout chunks such as:

- header
- footer
- event landing-page shell

### `src/templates/`

Outer HTML wrapper for every page.

### `src/pages/`

Page-specific source fragments:

- `*.content.html` for page content
- `*.scripts.html` for page-level script includes

### `src/data/`

Site-owned editable content:

- `home.json`
- `contact.json`
- `news.json`
- `event-marketing.json`

### `src/pages.json`

Route manifest for generated pages.

## Runtime behavior

Shared browser behavior is intentionally kept in reusable root scripts:

- `site.js` for site-wide bootstrapping and shared helpers already used across pages
- `event-page.js` for event landing-page behavior
- `results-page.js` for standings, schedule, and prior results flow
- `teams-page.js` and `clubs-page.js` for team and club views
- `team-directory.js` for shared team/club helper rendering
- `page-utils.js` for generic UI helpers

## Event boundary

This repo may display event data, but it should not become the source of truth for it.

Keep these here:

- page layout
- marketing copy
- navigation
- social/app links
- presentation logic

Keep these out of here:

- event config truth
- archived event datasets
- field maps as source assets
- API transformation logic

If you are unsure where something belongs, default to checking `playmaker-static` first.

## Why `dist/` exists

The repo uses partials, templates, and JSON-driven content. Browsers cannot host those source files directly as a final site without first assembling them.

`dist/` is the assembled website:

- one folder to host
- one folder to QA
- one folder that represents the final output

This keeps editing cleaner than hand-maintaining many fully expanded HTML files.

## Retired legacy path

`standings.html` and `cup.js` were removed because the current site already uses `results.html` for standings and schedule flows.

This avoids maintaining two competing standings systems.
