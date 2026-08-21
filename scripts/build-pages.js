const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const pagesDir = path.join(srcDir, "pages");
const partialsDir = path.join(srcDir, "partials");
const templatesDir = path.join(srcDir, "templates");
const dataDir = path.join(srcDir, "data");
const distDir = path.join(rootDir, "dist");

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getPathValue(values, keyPath) {
  return keyPath.split(".").reduce((current, key) => {
    if (current == null) return undefined;
    return current[key];
  }, values);
}

function replaceTokens(template, values) {
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => {
    const value = getPathValue(values, keyPath);
    return value == null ? "" : String(value);
  });
}

const site = JSON.parse(read(path.join(srcDir, "site.json")));
const pages = JSON.parse(read(path.join(srcDir, "pages.json")));
const layoutTemplate = read(path.join(templatesDir, "layout.html"));
const headerTemplate = read(path.join(partialsDir, "header.html"));
const footerTemplate = read(path.join(partialsDir, "footer.html"));
const home = JSON.parse(read(path.join(dataDir, "home.json")));
const contact = JSON.parse(read(path.join(dataDir, "contact.json")));
const eventMarketing = JSON.parse(read(path.join(dataDir, "event-marketing.json")));
const news = JSON.parse(read(path.join(dataDir, "news.json")));
const partners = JSON.parse(read(path.join(dataDir, "partners.json")));

// Source-of-truth repo for event config and archived data. The website ships
// fallback copies (used when the cross-origin fetch fails), but they are
// always synced from playmaker-static at build time — never edited here.
const staticRepoDir = path.resolve(rootDir, "..", "playmaker-static");

const syncedFromStaticRepo = ["event_config.json", "rules_template.json", "archived", "banners"];

const staticAssets = [
  "assets",
  "styles.css",
  "site.js",
  "event-page.js",
  "logo.png",
  "page-utils.js",
  "team-directory.js",
  "home-page.js",
  "rules-page.js",
  "results-page.js",
  "teams-page.js",
  "clubs-page.js",
  "news-page.js",
  "contact-page.js"
];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyIfExists(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) return;
  ensureDir(path.dirname(toPath));
  fs.cpSync(fromPath, toPath, { recursive: true });
}

function renderNavLinks(activeKey) {
  return site.navLinks
    .map((link) => {
      const className = link.key === activeKey ? ' class="nav-active"' : "";
      return `          <a href="${link.href}"${className}>${link.label}</a>`;
    })
    .join("\n");
}

function renderHeader(activeKey) {
  return replaceTokens(headerTemplate, {
    nav_links: renderNavLinks(activeKey)
  });
}

function renderAppLinks() {
  return site.appLinks
    .map((link) => {
      return [
        `          <a href="${link.href}" target="_blank" rel="noopener" class="store-badge ${link.className}">`,
        '            <span class="store-badge-copy">',
        `              <span class="store-badge-kicker">${link.kicker}</span>`,
        `              <span class="store-badge-label">${link.label}</span>`,
        "            </span>",
        "          </a>"
      ].join("\n");
    })
    .join("\n");
}

function renderSocialLinks() {
  return site.socialLinks
    .map((link) => {
      return `        <a href="${link.href}" target="_blank" rel="noopener" class="social-btn ${link.className}">${link.label}</a>`;
    })
    .join("\n");
}

function renderFooterLinks() {
  return site.footerLinks
    .map((link, index) => {
      const parts = [];
      if (index > 0) {
        parts.push("          <span>&bull;</span>");
      }
      parts.push(`          <a href="${link.href}">${link.label}</a>`);
      return parts.join("\n");
    })
    .join("\n");
}

function renderFooter() {
  return replaceTokens(footerTemplate, {
    footer_links: renderFooterLinks(),
    app_links: renderAppLinks(),
    social_links: renderSocialLinks()
  });
}

function renderContactSocialLinks() {
  return contact.socialLabels
    .map((label) => site.socialLinks.find((link) => link.label === label))
    .filter(Boolean)
    .map((link) => {
      return `                <a href="${link.href}" target="_blank" rel="noopener">${link.label}</a>`;
    })
    .join("\n");
}

function renderContactCards() {
  return contact.cards
    .map((card) => {
      if (card.type === "email") {
        return [
          '          <div class="contact-info-card">',
          `            <div class="contact-info-icon">${card.icon}</div>`,
          "            <div>",
          `              <div class="contact-info-label">${card.label}</div>`,
          `              <a href="mailto:${card.email}" class="contact-info-value">${card.email}</a>`,
          "            </div>",
          "          </div>"
        ].join("\n");
      }

      if (card.type === "social") {
        return [
          '          <div class="contact-info-card">',
          `            <div class="contact-info-icon">${card.icon}</div>`,
          "            <div>",
          `              <div class="contact-info-label">${card.label}</div>`,
          '              <div class="contact-social-links">',
          renderContactSocialLinks(),
          "              </div>",
          "            </div>",
          "          </div>"
        ].join("\n");
      }

      return [
        '          <div class="contact-info-card">',
        `            <div class="contact-info-icon">${card.icon}</div>`,
        "            <div>",
        `              <div class="contact-info-label">${card.label}</div>`,
        `              <p class="contact-info-text">${card.text}</p>`,
        "            </div>",
        "          </div>"
      ].join("\n");
    })
    .join("\n\n");
}

function renderContactSubjectOptions() {
  return contact.subjectOptions
    .map((option) => {
      return `                <option value="${option.value}">${option.label}</option>`;
    })
    .join("\n");
}

function renderPartnerLogos() {
  return partners
    .map((partner) => {
      return [
        '      <div class="partner-logo">',
        `        <img src="${escapeHtml(partner.image)}" alt="${escapeHtml(partner.name)} logo" loading="lazy" decoding="async" />`,
        "      </div>"
      ].join("\n");
    })
    .join("\n");
}

function renderNewsArticle(post) {
  const paragraphs = post.body
    .map((paragraph) => `        <p>${escapeHtml(paragraph)}</p>`)
    .join("\n");

  return [
    '<main class="page-shell article-page">',
    '  <article class="news-article">',
    '    <a class="article-back" href="news.html">&larr; All news</a>',
    '    <header class="article-header">',
    `      <div class="page-kicker">${escapeHtml(post.date)}</div>`,
    `      <h1>${escapeHtml(post.title)}</h1>`,
    `      <p class="article-deck">${escapeHtml(post.snippet)}</p>`,
    `      <div class="article-byline">By ${escapeHtml(post.author)}</div>`,
    "    </header>",
    '    <figure class="article-hero">',
    `      <img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt)}" />`,
    "    </figure>",
    '    <div class="article-body">',
    paragraphs,
    "    </div>",
    '    <footer class="article-footer">',
    '      <div><span class="page-kicker">Ready for the next one?</span><h2>Join us on the field.</h2></div>',
    '      <a class="btn btn-primary" href="playmakers-cup.html">View the next tournament</a>',
    "    </footer>",
    "  </article>",
    "</main>"
  ].join("\n");
}

function getPageContentTemplate(page) {
  if (eventMarketing[page.id]) {
    return read(path.join(partialsDir, "event-page-content.html")).trim();
  }
  return read(path.join(pagesDir, `${page.id}.content.html`)).trim();
}

fs.rmSync(distDir, { recursive: true, force: true });
ensureDir(distDir);

for (const page of pages) {
  const scriptsPath = path.join(pagesDir, `${page.id}.scripts.html`);
  const pageContent = replaceTokens(getPageContentTemplate(page), {
    home,
    contact,
    eventPage: eventMarketing[page.id] || {},
    contact_info_cards: renderContactCards(),
    contact_subject_options: renderContactSubjectOptions(),
    partner_logos: renderPartnerLogos()
  });

  const baseUrl = (site.baseUrl || "").replace(/\/$/, "");
  const html = replaceTokens(layoutTemplate, {
    title: page.title,
    description: page.description || site.defaultDescription || "",
    site_name: site.siteName || "Playmaker Sports",
    page_url: page.output === "index.html" ? `${baseUrl}/` : `${baseUrl}/${page.output}`,
    og_image: `${baseUrl}/logo.png`,
    body_attributes: page.bodyAttributes ? ` ${page.bodyAttributes}` : "",
    header: renderHeader(page.navKey),
    content: pageContent,
    footer: renderFooter(),
    scripts: fs.existsSync(scriptsPath) ? read(scriptsPath).trim() : ""
  }).replace(/\n{3,}/g, "\n\n");

  const output = `${html.trim()}\n`;
  fs.writeFileSync(path.join(distDir, page.output), output, "utf8");
}

const articleBaseUrl = (site.baseUrl || "").replace(/\/$/, "");
for (const post of news) {
  const outputName = `post-${post.slug}.html`;
  const html = replaceTokens(layoutTemplate, {
    title: `${post.title} | Playmaker Sports`,
    description: post.snippet,
    site_name: site.siteName || "Playmaker Sports",
    page_url: `${articleBaseUrl}/${outputName}`,
    og_image: `${articleBaseUrl}/${post.image}`,
    body_attributes: "",
    header: renderHeader("news"),
    content: renderNewsArticle(post),
    footer: renderFooter(),
    scripts: ""
  }).replace(/\n{3,}/g, "\n\n");

  fs.writeFileSync(path.join(distDir, outputName), `${html.trim()}\n`, "utf8");
}

staticAssets.forEach((asset) => {
  copyIfExists(path.join(rootDir, asset), path.join(distDir, asset));
});

if (!fs.existsSync(staticRepoDir)) {
  console.error(
    `Missing sibling repo: ${staticRepoDir}\n` +
      "playmaker-static is the source of truth for event config and archived data. " +
      "Clone it next to playmaker-website before building."
  );
  process.exit(1);
}

syncedFromStaticRepo.forEach((asset) => {
  const fromPath = path.join(staticRepoDir, asset);
  if (!fs.existsSync(fromPath)) {
    console.error(`Missing ${asset} in ${staticRepoDir} — cannot build fallback data.`);
    process.exit(1);
  }
  fs.cpSync(fromPath, path.join(distDir, asset), { recursive: true });
});

copyIfExists(dataDir, path.join(distDir, "data"));

console.log(`Built ${pages.length + news.length} pages`);
