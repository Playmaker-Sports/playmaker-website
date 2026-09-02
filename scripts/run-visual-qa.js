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

async function expectCountAtLeast(page, selector, minimum, message) {
  const count = await page.locator(selector).count();
  if (count < minimum) {
    fail(`${message} (expected at least ${minimum}, got ${count})`);
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
  if (!heroTitle.includes("Playmaker Sports")) {
    fail(`Homepage should lead with the Playmaker Sports brand (got "${heroTitle.trim()}")`);
  }
  await expectCount(page, ".home-hero-watermark", 0, "Homepage hero should remain image-only");
  const heroHeight = await page.locator(".home-hero").evaluate((element) => Math.round(element.getBoundingClientRect().height));
  if (heroHeight >= 1000) {
    fail(`Homepage hero should be shorter than a full viewport (got ${heroHeight}px)`);
  }
  await expectCount(page, ".home-hero-mark", 0, "Homepage hero should not show decorative vertical text");
  await expectCount(page, ".home-hero .hero-text-eyebrow, .home-hero .hero-footnote, .home-hero .hero-buttons", 0, "Homepage hero should keep its copy and controls minimal");
  await expectCount(page, "#events-grid .event-card", 3, "Homepage should render three event cards");
  const eventImageSizes = await page.locator("#events-grid .event-card-img").evaluateAll((images) =>
    images.map((image) => {
      const box = image.getBoundingClientRect();
      return { width: Math.round(box.width), height: Math.round(box.height) };
    })
  );
  if (eventImageSizes.some((size) => size.width !== eventImageSizes[0].width || size.height !== eventImageSizes[0].height)) {
    fail(`Homepage event images should use equal proportions (got ${JSON.stringify(eventImageSizes)})`);
  }
  const homepageEventSources = await page.locator("#events-grid .event-card-bg").evaluateAll((images) =>
    images.map((image) => image.getAttribute("src"))
  );
  if (homepageEventSources[0] !== "assets/news/first-playmakers-cup-recap.webp") {
    fail(`Upcoming Playmakers Cup card should use color photography (got ${homepageEventSources[0] || "no image"})`);
  }
  const homepageEventNames = await page.locator("#events-grid .event-name").allTextContents();
  if (homepageEventNames[1] !== "Winter Fest" || homepageEventNames[2] !== "Summer Championship") {
    fail(`Homepage events should order Winter Fest second and Summer Championship third (got ${JSON.stringify(homepageEventNames)})`);
  }
  const summerCardFilter = await page.locator(".event-story-summer-championship .event-card-bg").evaluate((image) => getComputedStyle(image).filter);
  if (!summerCardFilter.includes("grayscale(1)")) {
    fail(`Summer Championship card should be black and white (got ${summerCardFilter})`);
  }
  await expectVisible(page, ".home-hero-media.is-active", "Homepage should lead with tournament photography");
  await expectImagesLoaded(page, ".home-hero-media.is-active", "Homepage hero media should load");
  await expectCount(page, "#home-hero-pagination button", 3, "Homepage hero should provide three slideshow controls");
  await expectCount(page, "#home-countdown", 0, "Homepage hero should not show an event countdown");
  await expectVisible(page, "#upcoming-event #upcoming-title", "Homepage second section should show the next tournament");
  const secondSectionId = await page.locator("main > section").nth(1).getAttribute("id");
  if (secondSectionId !== "upcoming-event") {
    fail(`Homepage next tournament should be the second section (got "${secondSectionId || "no id"}")`);
  }
  await expectTextNotContaining(page, "#upcoming-title", "Loading", "Homepage next-tournament section should load event content");
  await expectCount(page, ".home-event-logo, .event-story-logo", 0, "Homepage should not show tournament logos");
  await expectVisible(page, ".home-join-section .join-title", "Homepage contact CTA should show its heading");
  const joinTitleColor = await page.locator(".home-join-section .join-title").evaluate((element) => getComputedStyle(element).color);
  if (joinTitleColor !== "rgb(255, 255, 255)") {
    fail(`Homepage contact CTA heading should be white (got ${joinTitleColor})`);
  }
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
    await expectCountAtLeast(page, ".news-article .article-body p", 4, "News article should contain its full body copy");
    await expectImagesLoaded(page, ".article-hero img", "News article hero image should load");
  }
  await expectFooter(page);

  await page.goto(`${baseUrl}/partners.html`, { waitUntil: "networkidle" });
  await expectCount(page, ".partner-grid .partner-logo", 11, "Partners page should render all migrated logos");
  await expectImagesLoaded(page, ".partner-grid img", "Partner logos should load from the built site");
  await expectFooter(page);

  await page.goto(`${baseUrl}/contact.html`, { waitUntil: "networkidle" });
  await expectVisible(page, '#contact-form[action="https://playmakersportsapp-api.onrender.com/api/contact"]', "Contact form should use the Playmaker API delivery backend");
  await expectCount(page, "#contact-form [name]", 6, "Contact form fields should be named for delivery");
  await expectFooter(page);

  for (const eventPage of ["playmakers-cup.html", "winter-fest.html", "summer-championship.html"]) {
    await page.goto(`${baseUrl}/${eventPage}`, { waitUntil: "networkidle" });
    await expectCount(page, ".clubs-wall-section", 0, `${eventPage} should not show the club logo wall`);
    await expectCount(page, "#data-container", 0, `${eventPage} should not fetch club data for a hidden logo wall`);
    await expectVisible(page, ".event-info-intro .event-info-logo", `${eventPage} should show its tournament logo above the information`);
    await expectImagesLoaded(page, ".event-info-intro .event-info-logo", `${eventPage} tournament logo should load`);
    await expectCount(page, "#previous-results-section", 0, `${eventPage} should not show previous-results links`);
    await expectCount(page, '.event-nav a[href*="system.gotsport.com"]', 0, `${eventPage} should not show the original GotSport button`);
    await expectFooter(page);
  }

  await page.goto(`${baseUrl}/playmakers-cup.html`, { waitUntil: "networkidle" });
  await expectVisible(page, ".event-info-intro .event-countdown", "Playmakers Cup should show its countdown with the tournament information");

  await page.goto(`${baseUrl}/winter-fest.html`, { waitUntil: "networkidle" });
  const winterFestText = await page.locator(".event-page-shell").textContent().catch(() => "");
  if (!(winterFestText || "").includes("February 27–28, 2027")) {
    fail("Winter Fest should show its February 27–28, 2027 dates");
  }

  await page.goto(`${baseUrl}/summer-championship.html`, { waitUntil: "networkidle" });
  await expectVisible(page, '.event-nav a[href="results.html?slug=summer-championship"]', "Summer Championship should link to Playmaker's imported results");

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

  await page.goto(`${baseUrl}/teams.html?slug=summer-championship`, { waitUntil: "networkidle" });
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

  await page.goto(`${baseUrl}/clubs.html?slug=summer-championship`, { waitUntil: "networkidle" });
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
