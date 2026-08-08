const { chromium } = require("playwright");

const baseUrl = process.env.PLAYMAKER_QA_BASE_URL || "http://localhost:4173";
const failures = [];

function fail(message) {
  failures.push(message);
  console.error("FAIL:", message);
}

async function expectVisible(page, selector, message) {
  const locator = page.locator(selector).first();
  if ((await locator.count()) === 0) {
    fail(message + ` (missing selector: ${selector})`);
    return false;
  }
  const visible = await locator.isVisible().catch(() => false);
  if (!visible) {
    fail(message + ` (not visible: ${selector})`);
    return false;
  }
  return true;
}

async function expectTextNotContaining(page, selector, disallowed, message) {
  const text = await page.locator(selector).first().textContent().catch(() => "");
  if ((text || "").includes(disallowed)) {
    fail(message + ` (found "${disallowed}")`);
  }
}

async function expectCount(page, selector, expected, message) {
  const count = await page.locator(selector).count();
  if (count !== expected) {
    fail(`${message} (expected ${expected}, got ${count})`);
  }
}

async function expectImagesLoaded(page, selector, message) {
  const unloadedCount = await page.locator(selector).evaluateAll((images) =>
    images.filter((image) => !image.complete || image.naturalWidth === 0).length
  );
  if (unloadedCount > 0) {
    fail(`${message} (${unloadedCount} image${unloadedCount === 1 ? "" : "s"} failed to load)`);
  }
}

async function expectFooter(page) {
  await expectVisible(page, ".site-footer", "Footer should be visible");
  await expectVisible(page, '.footer-app-links a[href*="apps.apple.com"]', "App Store link should be visible");
  await expectVisible(page, '.footer-app-links a[href*="play.google.com"]', "Google Play link should be visible");
  await expectCount(page, ".footer-socials .social-btn", 4, "Footer should show four social buttons");
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await page.goto(`${baseUrl}/index.html`, { waitUntil: "networkidle" });
  await expectTextNotContaining(page, "#hero-title", "Loading", "Homepage hero should load event content");
  const heroTitle = (await page.locator("#hero-title").textContent().catch(() => "")) || "";
  if (!heroTitle.includes("Playmakers Cup 2026")) {
    fail(`Homepage should feature Playmakers Cup 2026 (got "${heroTitle.trim()}")`);
  }
  await expectCount(page, "#events-grid .event-card", 3, "Homepage should render three event cards");
  await expectFooter(page);

  await page.goto(`${baseUrl}/news.html`, { waitUntil: "networkidle" });
  await expectCount(page, "#news-grid .news-card", 7, "News page should render seven posts");
  await expectImagesLoaded(page, "#news-grid .news-card img", "News images should load from the built site");
  const firstArticleHref = await page.locator("#news-grid .news-card").first().getAttribute("href");
  if (!firstArticleHref) {
    fail("News cards should link to complete article pages");
  } else {
    await page.goto(`${baseUrl}/${firstArticleHref}`, { waitUntil: "networkidle" });
    await expectVisible(page, ".news-article .article-body", "News article should render its full body");
    await expectCount(page, ".news-article .article-body p", 4, "News article should contain four body paragraphs");
    await expectImagesLoaded(page, ".article-hero img", "News article hero image should load");
  }
  await expectFooter(page);

  await page.goto(`${baseUrl}/partners.html`, { waitUntil: "networkidle" });
  await expectCount(page, ".partner-grid .partner-logo", 11, "Partners page should render all migrated logos");
  await expectImagesLoaded(page, ".partner-grid img", "Partner logos should load from the built site");
  await expectFooter(page);

  await page.goto(`${baseUrl}/soccer-program.html`, { waitUntil: "networkidle" });
  await expectVisible(page, ".program-hero", "Soccer Program page should render its program overview");
  await expectVisible(page, '.program-hero a[href="contact.html"]', "Soccer Program should link to current-session contact");
  await expectFooter(page);

  await page.goto(`${baseUrl}/contact.html`, { waitUntil: "networkidle" });
  await expectVisible(page, '#contact-form[action*="formsubmit.co"]', "Contact form should have a delivery backend");
  await expectCount(page, "#contact-form [name]", 8, "Contact form fields should be named for delivery");
  await expectFooter(page);

  await page.goto(`${baseUrl}/rules.html?slug=playmakers-cup`, { waitUntil: "networkidle" });
  await expectVisible(page, "#rules-container .rules-header", "Rules page should render the rules header");
  await expectFooter(page);

  await page.goto(`${baseUrl}/results.html?slug=winter-fest`, { waitUntil: "networkidle" });
  await expectTextNotContaining(page, "#data-container", "Loading event data...", "Results page should finish loading");
  await expectVisible(page, "#data-container", "Results data container should be visible");
  await expectFooter(page);

  await page.goto(`${baseUrl}/teams.html?slug=playmakers-cup`, { waitUntil: "networkidle" });
  await expectTextNotContaining(page, "#teams-grid", "Loading teams...", "Teams page should finish loading");
  await expectVisible(page, "#teams-grid", "Teams page grid should be visible");
  const playmakersCupTeamsText = await page.locator("#teams-grid").textContent().catch(() => "");
  if (!(playmakersCupTeamsText || "").includes("Team data will be available closer to the event.")) {
    fail("Playmakers Cup teams page should show the coming-soon placeholder for schedule-disabled events");
  }
  await expectFooter(page);

  await page.goto(`${baseUrl}/teams.html?slug=winter-fest`, { waitUntil: "networkidle" });
  await expectVisible(page, "#teams-grid .team-card", "Archived teams page should render team cards");
  const teamHref = await page.locator("#teams-grid .team-card a").first().getAttribute("href");
  if (teamHref) {
    await page.goto(`${baseUrl}/${teamHref}`, { waitUntil: "networkidle" });
    await expectVisible(page, "#team-detail-view", "Team detail route should render detail view");
    await expectVisible(page, "#team-header .team-detail-name", "Team detail should show team name");
  } else {
    fail("Teams page did not provide a detail link");
  }
  await expectFooter(page);

  await page.goto(`${baseUrl}/clubs.html?slug=winter-fest`, { waitUntil: "networkidle" });
  await expectVisible(page, "#clubs-grid .club-card", "Archived clubs page should render club cards");
  await page.click("#ct-view-teams");
  await expectVisible(page, "#teams-grid .team-card", "Clubs page team toggle should render team cards");
  await expectFooter(page);

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} QA check(s) failed.`);
    process.exit(1);
  }

  console.log("Visual QA checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
