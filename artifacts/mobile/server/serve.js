/**
 * Standalone production server for Expo static builds.
 *
 * Serves the output of build.js (static-build/) with two special routes:
 * - GET / or /manifest with expo-platform header → platform manifest JSON
 * - GET / without expo-platform → landing page HTML
 * Everything else falls through to static file serving from ./static-build/.
 *
 * Zero external dependencies — uses only Node.js built-ins (http, fs, path).
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const TEMPLATE_PATH = path.resolve(__dirname, "templates", "landing-page.html");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const PUBLIC_API_ORIGIN = (
  process.env.PUBLIC_API_ORIGIN || "http://127.0.0.1:5000"
).replace(/\/+$/, "");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".map": "application/json",
};

function getAppName() {
  try {
    const appJsonPath = path.resolve(__dirname, "..", "app.json");
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, "utf-8"));
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ error: `Manifest not found for platform: ${platform}` }),
    );
    return;
  }

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveLandingPage(req, res, landingPageTemplate, appName) {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const protocol = forwardedProto || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"];
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function serveStaticFile(urlPath, res) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(STATIC_ROOT, safePath);

  if (!filePath.startsWith(STATIC_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

const WEB_ROOT = path.join(STATIC_ROOT, "web");

/**
 * Resolve a URL pathname against the static web export (expo export
 * --platform web). Handles:
 * - exact files (/assets/..., /favicon.ico)
 * - route html files (/onboarding -> onboarding.html)
 * - dynamic routes (/partage/offre/42 -> partage/offre/[id].html)
 * - fallback to index.html so direct reloads never 404
 * Returns an absolute file path, or null when no web build exists.
 */
function resolveWebFile(pathname) {
  if (!fs.existsSync(WEB_ROOT)) return null;

  const safePath = path
    .normalize(decodeURIComponent(pathname))
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const exact = path.join(WEB_ROOT, safePath);

  if (exact.startsWith(WEB_ROOT) && fs.existsSync(exact) && fs.statSync(exact).isFile()) {
    return exact;
  }

  if (exact.startsWith(WEB_ROOT) && fs.existsSync(`${exact}.html`)) {
    return `${exact}.html`;
  }

  // Dynamic route matching: walk segments, allowing [param] dirs/files.
  const segments = safePath.split("/").filter(Boolean);
  let dir = WEB_ROOT;
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const isLast = i === segments.length - 1;
    let entries;
    try {
      entries = fs.readdirSync(dir);
    } catch {
      break;
    }

    if (isLast) {
      const htmlMatch =
        entries.find((e) => e === `${segment}.html`) ||
        entries.find((e) => /^\[.+\]\.html$/.test(e));
      if (htmlMatch) return path.join(dir, htmlMatch);
      break;
    }

    const dirMatch =
      entries.find((e) => e === segment && fs.statSync(path.join(dir, e)).isDirectory()) ||
      entries.find((e) => /^\[.+\]$/.test(e) && fs.statSync(path.join(dir, e)).isDirectory());
    if (!dirMatch) break;
    dir = path.join(dir, dirMatch);
  }

  const index = path.join(WEB_ROOT, "index.html");
  return fs.existsSync(index) ? index : null;
}

function serveFile(filePath, res) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
}

async function proxyPublicJob(pathname, res) {
  const match = pathname.match(/^\/api\/public\/jobs\/([^/]+)$/);
  if (!match) return false;

  try {
    let jobId;
    try {
      jobId = decodeURIComponent(match[1]);
    } catch {
      res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "Invalid job identifier" }));
      return true;
    }

    const upstream = await fetch(
      `${PUBLIC_API_ORIGIN}/api/public/jobs/${encodeURIComponent(jobId)}`,
    );
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "content-type":
        upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, s-maxage=900",
    });
    res.end(body);
  } catch (error) {
    console.error("Public job API proxy failed:", error.message);
    res.writeHead(502, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Public job API unavailable" }));
  }

  return true;
}

const landingPageTemplate = fs.readFileSync(TEMPLATE_PATH, "utf-8");
const appName = getAppName();

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  if (pathname === "/" || pathname === "/manifest") {
    const platform = req.headers["expo-platform"];
    if (platform === "ios" || platform === "android") {
      return serveManifest(platform, res);
    }
  }

  // Native update bundles/manifests live outside the web export.
  if (
    pathname.startsWith("/ios/") ||
    pathname.startsWith("/android/") ||
    /^\/\d+-\d+\//.test(pathname)
  ) {
    return serveStaticFile(pathname, res);
  }

  if (pathname.startsWith("/api/public/jobs/")) {
    return void proxyPublicJob(pathname, res);
  }

  const webFile = resolveWebFile(pathname);
  if (webFile) {
    return serveFile(webFile, res);
  }

  if (pathname === "/") {
    return serveLandingPage(req, res, landingPageTemplate, appName);
  }

  serveStaticFile(pathname, res);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving static Expo build on port ${port}`);
});
