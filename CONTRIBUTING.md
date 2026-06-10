# Contributing

This repo is meant to stay simple for a small team. The main rule is: keep the architecture modular, static, and easy to edit.

## Before you change anything

Understand the ownership split:

- `playmaker-static` owns event details and static event data
- `playmaker-api` owns live API behavior
- `playmaker-website` owns presentation and site-level content

If a change feels like event config, archived data, field maps, or tournament facts, it probably belongs in `playmaker-static`, not here.

## Safe editing rules

- Edit page structure in `src/`
- Edit shared content in `src/data/`
- Edit shared nav/footer/social/app-store config in `src/site.json`
- Edit shared client-side behavior in the root `.js` files
- Keep repeated markup in partials instead of copying it into multiple page files
- Keep repeated copy in JSON data files instead of scattering it across HTML

## Avoid these mistakes

- Do not create or edit root `.html` pages in the repo root
- Do not hand-maintain duplicate versions of the same page structure
- Do not add event-detail data here just because it is convenient
- Do not add a framework rewrite unless there is a deliberate team decision
- Do not bypass the build and QA steps after structural changes

## Required steps before committing

1. Run `npm.cmd run build`
2. Run `npm.cmd run qa`
3. Confirm the generated `dist/` output matches your intended change
4. Commit both source and `dist/` changes together

## When adding new content

Use the smallest shared place that fits:

- New site-wide link or footer item: `src/site.json`
- New homepage or contact copy: `src/data/home.json` or `src/data/contact.json`
- New news item: `src/data/news.json`
- New event landing-page presentation copy: `src/data/event-marketing.json`
- New shared page shell or repeated layout: `src/partials/`
- New route: add it to `src/pages.json` and create the matching source files

## When changing behavior

Prefer extending existing shared scripts before creating new one-off logic:

- `event-page.js` for event landing pages
- `results-page.js` for schedule/standings/results views
- `teams-page.js` and `clubs-page.js` for team and club flows
- `team-directory.js` for team/club/standings helpers
- `page-utils.js` for generic display helpers

## AI usage note

If you use ChatGPT, Claude, or Codex on this repo, give them these rules:

- preserve the `src -> dist` workflow
- do not recreate root HTML pages
- prefer shared partials and data files over copied markup
- preserve the ownership boundary with `playmaker-static` and `playmaker-api`
- run build and QA after meaningful changes
