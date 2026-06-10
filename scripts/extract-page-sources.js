const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const srcDir = path.join(rootDir, "src");
const pagesDir = path.join(srcDir, "pages");

fs.mkdirSync(pagesDir, { recursive: true });

const htmlFiles = fs
  .readdirSync(rootDir)
  .filter((file) => file.endsWith(".html"))
  .sort();

function inferNavKey(activeHref) {
  const key = (activeHref || "").replace(/\.html$/i, "");
  return key || "";
}

const pageManifest = htmlFiles.map((fileName) => {
  const html = fs.readFileSync(path.join(rootDir, fileName), "utf8");
  const pageId = fileName.replace(/\.html$/i, "");

  const titleMatch = html.match(/<title>([\s\S]*?)<\/title>/i);
  const bodyMatch = html.match(/<body([^>]*)>/i);
  const mainMatch = html.match(/<main\b[\s\S]*?<\/main>/i);

  if (!titleMatch || !bodyMatch || !mainMatch) {
    throw new Error(`Could not extract page structure from ${fileName}`);
  }

  const bodyAttrs = bodyMatch[1].trim();
  const scripts = Array.from(html.matchAll(/<script\b[\s\S]*?<\/script>/gi))
    .map((match) => match[0].trim())
    .join("\n\n");

  const activeNavMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*class="nav-active"[^>]*>/i);
  const navKey = inferNavKey(activeNavMatch && activeNavMatch[1]);

  fs.writeFileSync(
    path.join(pagesDir, `${pageId}.content.html`),
    `${mainMatch[0].trim()}\n`,
    "utf8"
  );

  fs.writeFileSync(
    path.join(pagesDir, `${pageId}.scripts.html`),
    scripts ? `${scripts}\n` : "",
    "utf8"
  );

  return {
    id: pageId,
    output: fileName,
    title: titleMatch[1].trim(),
    navKey,
    bodyAttributes: bodyAttrs
  };
});

fs.writeFileSync(
  path.join(srcDir, "pages.json"),
  `${JSON.stringify(pageManifest, null, 2)}\n`,
  "utf8"
);

console.log(`Extracted ${pageManifest.length} page sources into src/pages`);
