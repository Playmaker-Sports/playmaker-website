const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const distDir = path.join(process.cwd(), "dist");
const port = Number(process.env.PORT || process.argv[2] || 4173);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".webp": "image/webp"
};

function send(response, statusCode, body, contentType) {
  response.writeHead(statusCode, { "Content-Type": contentType });
  response.end(body);
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(requestUrl.pathname);

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.normalize(path.join(distDir, pathname));
  if (!filePath.startsWith(distDir)) {
    send(response, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(response, 404, "Not Found", "text/plain; charset=utf-8");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[extension] || "application/octet-stream";
  send(response, 200, fs.readFileSync(filePath), contentType);
});

server.listen(port, () => {
  console.log(`Serving dist at http://localhost:${port}`);
});
