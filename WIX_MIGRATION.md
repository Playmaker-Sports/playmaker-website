# Wix to GitHub + Render migration

Status date: September 2, 2026

## Final architecture

- GitHub repository: `https://github.com/Playmaker-Sports/playmaker-website`
- Production host: Render static site `playmaker-website`
- Render preview URL: `https://playmaker-website.onrender.com`
- Production domains: `playmakersports.us` and `www.playmakersports.us`
- Website source of truth: `src/`, root browser scripts/styles, and `assets/`
- Generated deploy artifact: `dist/`
- Event data source of truth: sibling `playmaker-static` repository, copied into `dist/` during the local build
- Contact form backend: `https://playmakersportsapp-api.onrender.com/api/contact`

GitHub stores the site. Render builds and hosts it. A push to `main` automatically triggers a Render deployment.

## What has been preserved

- All public Wix routes for Home, Playmakers Cup, Winter Fest, Summer Championship, Contact, and News
- All seven Wix news articles, including their original slugs, titles, dates, long-form body copy, and local hero images
- Redirects from the old Wix paths (`/contactus`, `/playmakerscup`, `/winterfest`, `/summerchampionship`, `/news`, and all seven `/post/...` URLs)
- Partner logos, event artwork, field maps, archived event data, navigation, social links, app-store links, contact details, and SEO metadata
- A generated `dist/` copy that can be served without Wix
- A dated raw public-site archive at `migration/wix-public-archive/2026-09-02/` containing 13 Wix HTML snapshots, 28 locally stored media files, source URLs, byte sizes, and SHA-256 checksums

The former Wix article bodies were compared with the public pages on September 2, 2026. The full long-form copy is stored in `src/data/news.json`; the deploy build generates the matching article pages in `dist/`.

## Publish the next news article

1. Put the hero image in `assets/news/`, preferably as a compressed WebP.
2. Add a new object at the top of `src/data/news.json` with `slug`, `title`, `snippet`, `author`, `date`, `image`, `imageAlt`, and a `body` array.
3. Run:

   ```powershell
   npm.cmd run build
   npm.cmd run qa
   ```

4. Commit both the source and generated `dist/` files, then push `main`.
5. Wait for Render to report the deploy as live and check:
   - `https://playmaker-website.onrender.com/news.html`
   - `https://playmaker-website.onrender.com/post-<slug>.html`

## Domain and email facts captured before cutover

- Registrar: GoDaddy.com, LLC
- Registration expiration: May 15, 2028
- Current authoritative nameservers: `ns4.wixdns.net`, `ns5.wixdns.net`
- Current apex A records: `185.230.63.107`, `185.230.63.171`, `185.230.63.186` (Wix)
- Current `www` CNAME: `cdn3.wixdns.net` (Wix)
- Email provider: Zoho Mail
- MX records:
  - priority 10: `mx.zoho.com`
  - priority 20: `mx2.zoho.com`
  - priority 50: `mx3.zoho.com`

Do not cancel Wix or replace its nameservers until every DNS record is copied from the Wix DNS manager. In addition to the records above, preserve all TXT records (SPF, DKIM, site verification), CAA records, and any subdomain records. Missing Zoho records can interrupt email even when the website works.

## Safe cutover order

1. Export Wix Contacts, subscribers, form submissions, automations, invoices, and any media not already stored locally.
2. In Render, confirm the latest `main` deploy is live and both custom domains are added. Copy the exact DNS targets shown by Render.
3. In GoDaddy DNS, recreate the complete Wix DNS record set, especially all Zoho MX and TXT/DKIM records.
4. Add the Render-provided apex and `www` records. Do not guess these values; use the current values shown in the Render dashboard.
5. Change the domain from Wix nameservers to GoDaddy default nameservers only after the recreated zone has been checked.
6. Verify the apex domain, `www`, all legacy paths, the contact form, and Zoho inbound/outbound email.
7. Keep Wix active for at least 72 hours after DNS is stable. Then disconnect the domain and cancel only the Wix website plan that is no longer needed.

## Wix account exports still requiring an authenticated owner

These records are not exposed by the public website and must be exported from the Wix dashboard before cancellation:

- Contacts and newsletter subscribers
- Contact-form submissions and inbox history
- Email-marketing campaigns, automations, and templates
- Billing records and invoices
- Any private/unpublished pages, drafts, members, roles, analytics reports, or media-library items not represented in this repository

Store the exports in a durable owner-controlled location. If they are added to this repository, remove or encrypt personal data first; do not commit subscriber or form-submission data to public GitHub.

## Verification checklist

- Render deploy status is `live`
- `/`, `/news`, `/contactus`, and each old `/post/<slug>` return the intended page
- Images, scripts, and JSON data load without 404s
- Contact form sends successfully
- Mobile and desktop smoke tests pass
- Both `playmakersports.us` and `www.playmakersports.us` have valid HTTPS
- Zoho inbound and outbound email work after DNS changes
- Search Console and analytics ownership remain valid

## Rollback

If the custom domain fails after cutover, leave the Render service running and restore the prior Wix apex and `www` records (or the Wix nameservers) from the captured DNS values above. DNS rollback is independent of the GitHub repository, so no code rollback is needed. Keep Wix active until the replacement has been stable for at least 72 hours.
