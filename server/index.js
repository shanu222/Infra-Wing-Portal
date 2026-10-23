const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { presignGet, signPut, presignList } = require("./r2");

function loadEnv() {
  const file = path.join(__dirname, ".env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    if (!process.env[key]) process.env[key] = match[2].trim();
  }
}
loadEnv();

const ROOT = path.join(__dirname, "..");
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
const CONTENT = path.join(DATA_DIR, "content.json");
const SESSIONS = path.join(DATA_DIR, "sessions.json");
const PORT = process.env.PORT || 8787;
const PASSWORD = process.env.ADMIN_PASSWORD || "wing-admin";
const MODEL_PUBLIC = (process.env.R2_READ_PUBLIC_BASE || "https://pub-e38210c9c2ff4bf3a45338616cd43df2.r2.dev").replace(/\/$/, "");
const MODEL_PREFIX = "content/resilience-models";
let modelCache = { at: 0, body: null };

async function modelMeta() {
  if (modelCache.body && Date.now() - modelCache.at < 10 * 60 * 1000) return modelCache.body;
  const upstream = await fetch(`${MODEL_PUBLIC}/${MODEL_PREFIX}/metadata.json`);
  if (!upstream.ok) throw new Error("models unavailable");
  const body = await upstream.json();
  modelCache = { at: Date.now(), body };
  return body;
}

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(CONTENT)) {
  fs.copyFileSync(path.join(__dirname, "data", "content.json"), CONTENT);
}

const sessions = new Set(fs.existsSync(SESSIONS) ? JSON.parse(fs.readFileSync(SESSIONS, "utf8")) : []);
function saveSessions() {
  fs.writeFileSync(SESSIONS, JSON.stringify([...sessions]));
}

function readContent() {
  return JSON.parse(fs.readFileSync(CONTENT, "utf8"));
}
function writeContent(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("content must be an object");
  }
  const next = path.join(DATA_DIR, "content.next.json");
  fs.writeFileSync(next, JSON.stringify(data, null, 2));
  fs.renameSync(next, CONTENT);
}

const allowed = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".mp4", ".webm", ".mov"]);
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.has(ext)) return cb(new Error("Use an image or video file"));
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 }
});

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!sessions.has(token)) return res.status(401).json({ error: "unauthorized" });
  next();
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "8mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/models", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.json(await modelMeta());
  } catch (error) {
    res.status(502).json({ error: "models unavailable" });
  }
});

app.get("/api/models/file", async (req, res) => {
  const rel = String(req.query.path || "");
  if (!/^(images|pdfs|videos)\/[A-Za-z0-9._-]+$/.test(rel)) return res.status(400).json({ error: "bad path" });
  try {
    const upstream = await fetch(`${MODEL_PUBLIC}/${MODEL_PREFIX}/${rel}`);
    if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).end();
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=86400");
    const { Readable } = require("stream");
    const { pipeline } = require("stream");
    pipeline(Readable.fromWeb(upstream.body), res, (err) => {
      if (err && !res.headersSent) res.status(502).end();
    });
  } catch (error) {
    if (!res.headersSent) res.status(502).end();
  }
});

const WING_MEDIA = [
  { id: "mandate", title: "Pre and post disaster work", kind: "video", key: "portal/mandate/pre-post.mp4" },
  { id: "audit", title: "Infra Audit Program", kind: "video", key: "portal/audit/program.mp4" },
  { id: "audit", title: "Audit portal", kind: "video", key: "portal/audit/portal.mp4" },
  { id: "drim", title: "DRIM", kind: "video", key: "portal/drim/promo.mp4" },
  { id: "seminars", title: "Seminar, 23 September 2024", kind: "video", key: "portal/seminars/23-sep-2024.mp4" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/01.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/02.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/03.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/04.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/05.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/06.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/07.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", key: "portal/seminars/08.jpg" },
  { id: "portals", title: "PRIA", kind: "video", key: "portal/portals/pria.mp4" },
  { id: "portals", title: "Structural health monitoring", kind: "video", key: "portal/portals/shm.mp4" },
  { id: "portals", title: "NIDRMP", kind: "video", key: "portal/portals/nidrmp.mp4" },
  { id: "portals", title: "Built up growth", kind: "video", key: "portal/portals/built-up.mp4" },
  { id: "app360", title: "Resilience 360", kind: "video", key: "portal/app/r360.mp4" },
  { id: "advisories", title: "Infrastructure publications", kind: "video", key: "portal/advisories/books.mp4" },
  { id: "field", title: "Gilgit-Baltistan field visit", kind: "video", key: "portal/field/visit.mp4" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/01.jpg" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/02.jpg" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/03.jpg" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/04.jpg" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/05.jpg" },
  { id: "field", title: "Field visit", kind: "image", key: "portal/field/06.jpg" }
];
[
  ["mandate", "Pre and post disaster work", "portal/mandate/still-1.jpg"],
  ["mandate", "Pre and post disaster work", "portal/mandate/still-2.jpg"],
  ["mandate", "Pre and post disaster work", "portal/mandate/still-3.jpg"],
  ["audit", "Infra Audit Program", "portal/audit/still-1.jpg"],
  ["audit", "Infra Audit Program", "portal/audit/still-2.jpg"],
  ["audit", "Infra Audit Program", "portal/audit/still-3.jpg"],
  ["drim", "DRIM", "portal/drim/still-1.jpg"],
  ["drim", "DRIM", "portal/drim/still-2.jpg"],
  ["drim", "DRIM", "portal/drim/still-3.jpg"],
  ["app360", "Resilience 360", "portal/app/still-1.jpg"],
  ["app360", "Resilience 360", "portal/app/still-2.jpg"],
  ["app360", "Resilience 360", "portal/app/still-3.jpg"],
  ["advisories", "Infrastructure publications", "portal/advisories/still-1.jpg"],
  ["advisories", "Infrastructure publications", "portal/advisories/still-2.jpg"],
  ["advisories", "Infrastructure publications", "portal/advisories/still-3.jpg"],
  ["portals", "PRIA", "portal/portals/still-1.jpg"],
  ["portals", "PRIA", "portal/portals/still-2.jpg"],
  ["portals", "PRIA", "portal/portals/still-3.jpg"]
].forEach(([id, title, key]) => WING_MEDIA.push({ id, title, kind: "image", key }));

function safeKey(key) {
  return /^portal\/[a-z0-9/_-]+\.(mp4|webm|jpe?g|png|webp)$/i.test(String(key || "")) && !String(key).includes("..");
}
function mediaCatalog() {
  let extra = [];
  try {
    const data = readContent();
    if (Array.isArray(data.media)) extra = data.media;
  } catch (error) {
    extra = [];
  }
  const byKey = new Map();
  WING_MEDIA.forEach((item) => byKey.set(item.key, item));
  extra.forEach((item) => {
    if (item && safeKey(item.key)) byKey.set(item.key, { id: item.id, title: item.title || "Media", kind: item.kind || "image", key: item.key });
  });
  return [...byKey.values()];
}
function wingConfig() {
  const accessKey = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT || "https://38fa030ebec51c33ffeec13cdf1233.r2.cloudflarestorage.com";
  if (!accessKey || !secret) return null;
  let host = "";
  try { host = new URL(endpoint).host; } catch (error) { return null; }
  return { accessKey, secret, host, bucket: process.env.R2_BUCKET || "infra-wing-portal" };
}

app.get("/api/wing-media", (req, res) => {
  const items = mediaCatalog().map((item) => ({
    id: item.id,
    title: item.title,
    kind: item.kind,
    key: item.key,
    url: `/api/media/${item.key}`,
    ready: fs.existsSync(path.join(UPLOAD_DIR, item.key))
  }));
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(items);
});

const wingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 80 * 1024 * 1024 } });

const { Readable } = require("stream");

function asUpstream(res) {
  return {
    statusCode: res.status,
    headers: {
      "content-type": res.headers.get("content-type") || "",
      "content-length": res.headers.get("content-length") || "",
      "content-range": res.headers.get("content-range") || "",
      "accept-ranges": res.headers.get("accept-ranges") || ""
    },
    resume() {
      if (res.body && res.body.cancel) res.body.cancel().catch(() => {});
    },
    pipe(dest) {
      Readable.fromWeb(res.body).pipe(dest);
    },
    async *[Symbol.asyncIterator]() {
      const reader = res.body.getReader();
      try {
        while (true) {
          const step = await reader.read();
          if (step.done) return;
          yield Buffer.from(step.value);
        }
      } finally {
        reader.releaseLock();
      }
    }
  };
}

async function storeWingObject(key, contentType, body) {
  const cfg = wingConfig();
  if (!cfg) throw new Error("storage is not configured");
  const signed = signPut({ host: cfg.host, bucket: cfg.bucket, key, accessKey: cfg.accessKey, secret: cfg.secret, contentType, payloadHash: "UNSIGNED-PAYLOAD" });
  const res = await fetch(signed.url, {
    method: "PUT",
    headers: { ...signed.headers, "content-length": String(body.length) },
    body
  });
  const detail = await res.text();
  const code = (detail.match(/<Code>([^<]+)<\/Code>/) || [])[1] || "";
  return { status: res.status, code };
}

function openWingObject(key, range) {
  const cfg = wingConfig();
  if (!cfg) return Promise.reject(new Error("storage is not configured"));
  const url = presignGet({ host: cfg.host, bucket: cfg.bucket, key, accessKey: cfg.accessKey, secret: cfg.secret, expires: 300 });
  return fetch(url, { headers: range ? { Range: range } : {} }).then(asUpstream);
}

const CONTENT_KEY = "portal/content.json";
const BUCKET_FLAG = path.join(DATA_DIR, "content.bucket-ok");

function readStoredContent() {
  return readContent();
}

app.post("/api/wing-media", auth, (req, res) => {
  wingUpload.single("file")(req, res, async (error) => {
    if (error) return res.status(400).json({ error: error.message });
    const key = String((req.body && req.body.key) || "");
    if (!safeKey(key)) return res.status(400).json({ error: "unknown key" });
    if (!req.file) return res.status(400).json({ error: "file required" });
    const dest = path.join(UPLOAD_DIR, key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, req.file.buffer);
    const contentType = /\.mp4$/i.test(key) ? "video/mp4" : /\.webm$/i.test(key) ? "video/webm" : /\.png$/i.test(key) ? "image/png" : /\.webp$/i.test(key) ? "image/webp" : "image/jpeg";
    res.json({ ok: true, key });
    storeWingObject(key, contentType, req.file.buffer).then((stored) => {
      if (stored.status === 200) fs.writeFileSync(BUCKET_FLAG, "ok");
    }).catch(() => {});
  });
});

app.get("/api/media/*", (req, res) => {
  const key = String(req.params[0] || "");
  if (!safeKey(key)) return res.status(400).end();
  const local = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(local)) return res.sendFile(local);
  const packed = path.join(ROOT, "media", key);
  if (fs.existsSync(packed)) return res.sendFile(packed);
  openWingObject(key, req.headers.range).then((upstream) => {
    if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
      upstream.resume();
      return res.status(404).end();
    }
    res.status(upstream.statusCode);
    ["content-type", "content-length", "content-range", "accept-ranges"].forEach((name) => {
      if (upstream.headers[name]) res.setHeader(name, upstream.headers[name]);
    });
    if (!res.getHeader("Accept-Ranges")) res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=300");
    upstream.pipe(res);
  }).catch(() => {
    if (fs.existsSync(packed)) return res.sendFile(packed);
    res.status(404).end();
  });
});

function readConfig() {
  const accessKey = process.env.R2_READ_ACCESS_KEY_ID;
  const secret = process.env.R2_READ_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_READ_ENDPOINT || "";
  if (!accessKey || !secret || !endpoint) return null;
  let host = "";
  try { host = new URL(endpoint).host; } catch (error) { return null; }
  const buckets = [
    { id: "portals", title: "PRIA", bucket: process.env.R2_READ_BUCKET_PRIA || "" },
    { id: "app360", title: "Resilience 360", bucket: process.env.R2_READ_BUCKET_APP360 || "" },
    { id: "advisories", title: "Climate resilience", bucket: process.env.R2_READ_BUCKET_CLIMATE || "" }
  ].filter((item) => item.bucket);
  if (!buckets.length) return null;
  return { accessKey, secret, host, buckets };
}
function safeReadKey(key) {
  const text = String(key || "");
  if (!text || text.length > 500 || text.includes("..") || text.includes("\\") || text.startsWith("/")) return false;
  return /\.(mp4|webm|mov|jpe?g|png|webp|gif)$/i.test(text);
}
function readKind(key) {
  return /\.(mp4|webm|mov)$/i.test(key) ? "video" : "image";
}
function decodeXml(value) {
  return String(value || "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}
let readCache = { at: 0, items: [] };
async function listReadKeys(cfg, bucket) {
  const keys = [];
  let token = "";
  for (let page = 0; page < 8; page += 1) {
    const url = presignList({ host: cfg.host, bucket, accessKey: cfg.accessKey, secret: cfg.secret, token });
    const upstream = await fetch(url);
    if (!upstream.ok) break;
    const xml = await upstream.text();
    const re = /<Key>([^<]*)<\/Key>/g;
    let match;
    while ((match = re.exec(xml))) keys.push(decodeXml(match[1]));
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) break;
    const next = xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/);
    if (!next) break;
    token = decodeXml(next[1]);
  }
  return keys;
}
async function readCatalog() {
  const cfg = readConfig();
  if (!cfg) return [];
  if (readCache.items.length && Date.now() - readCache.at < 10 * 60 * 1000) return readCache.items;
  const items = [];
  for (const source of cfg.buckets) {
    let keys = [];
    try { keys = await listReadKeys(cfg, source.bucket); } catch (error) { keys = []; }
    keys.filter(safeReadKey).slice(0, 24).forEach((key) => {
      items.push({
        id: source.id,
        title: source.title,
        kind: readKind(key),
        key,
        bucket: source.bucket,
        path: `/api/read-file?bucket=${encodeURIComponent(source.bucket)}&key=${encodeURIComponent(key)}`
      });
    });
  }
  readCache = { at: Date.now(), items };
  return items;
}
function openReadObject(bucket, key, range) {
  const cfg = readConfig();
  const known = cfg && cfg.buckets.some((item) => item.bucket === bucket);
  if (!cfg || !known || !safeReadKey(key)) return Promise.reject(new Error("unknown object"));
  const url = presignGet({ host: cfg.host, bucket, key, accessKey: cfg.accessKey, secret: cfg.secret, expires: 300 });
  return fetch(url, { headers: range ? { Range: range } : {} }).then(asUpstream);
}
app.get("/api/read-media", async (req, res) => {
  try {
    res.setHeader("Cache-Control", "public, max-age=60");
    res.json(await readCatalog());
  } catch (error) {
    res.json([]);
  }
});
app.get("/api/read-file", (req, res) => {
  const bucket = String(req.query.bucket || "");
  const key = String(req.query.key || "");
  openReadObject(bucket, key, req.headers.range).then((upstream) => {
    if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
      upstream.resume();
      return res.status(upstream.statusCode || 404).end();
    }
    res.status(upstream.statusCode);
    ["content-type", "content-length", "content-range", "accept-ranges"].forEach((name) => {
      if (upstream.headers[name]) res.setHeader(name, upstream.headers[name]);
    });
    if (!res.getHeader("Accept-Ranges")) res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Cache-Control", "public, max-age=300");
    upstream.pipe(res);
  }).catch(() => {
    if (!res.headersSent) res.status(404).end();
  });
});

function contentTypeFor(key) {
  if (/\.mp4$/i.test(key)) return "video/mp4";
  if (/\.webm$/i.test(key)) return "video/webm";
  if (/\.mov$/i.test(key)) return "video/quicktime";
  if (/\.png$/i.test(key)) return "image/png";
  if (/\.webp$/i.test(key)) return "image/webp";
  if (/\.gif$/i.test(key)) return "image/gif";
  return "image/jpeg";
}
function localPortalFiles() {
  const root = path.join(ROOT, "media", "portal");
  const files = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files.push(full);
    });
  };
  walk(root);
  return files;
}
async function objectExists(key) {
  const upstream = await openWingObject(key, "bytes=0-0");
  const ok = upstream.statusCode === 200 || upstream.statusCode === 206;
  upstream.resume();
  return ok;
}
async function ensureWingCopies() {
  if (!wingConfig()) return;
  try {
    for (const file of localPortalFiles()) {
      const key = path.relative(path.join(ROOT, "media"), file).split(path.sep).join("/");
      if (!safeKey(key) || await objectExists(key)) continue;
      const stored = await storeWingObject(key, contentTypeFor(key), fs.readFileSync(file));
      if (stored.status !== 200) return;
    }
    if (!(await objectExists(CONTENT_KEY))) {
      await storeWingObject(CONTENT_KEY, "application/json", fs.readFileSync(CONTENT));
    }
  } catch (error) {
    /* disk copies still play when the bucket cannot be reached */
  }
}

app.get("/api/content", async (req, res) => {
  try {
    res.json(await readStoredContent());
  } catch (error) {
    res.status(500).json({ error: "content unavailable" });
  }
});

app.post("/api/login", (req, res) => {
  const password = String((req.body && req.body.password) || "");
  if (password !== PASSWORD) return res.status(401).json({ error: "unauthorized" });
  const token = crypto.randomBytes(24).toString("hex");
  sessions.add(token);
  saveSessions();
  res.json({ token });
});

app.put("/api/content", auth, (req, res) => {
  try {
    writeContent(req.body);
    res.json({ ok: true });
    const body = Buffer.from(JSON.stringify(req.body));
    storeWingObject(CONTENT_KEY, "application/json", body).then((stored) => {
      if (stored.status === 200) fs.writeFileSync(BUCKET_FLAG, "ok");
    }).catch(() => {});
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post("/api/upload", auth, (req, res) => {
  upload.single("file")(req, res, (error) => {
    if (error) return res.status(400).json({ error: error.message });
    if (!req.file) return res.status(400).json({ error: "file required" });
    const ext = path.extname(req.file.filename).toLowerCase();
    const type = [".mp4", ".webm", ".mov"].includes(ext) ? "video" : "image";
    res.json({
      id: path.parse(req.file.filename).name,
      type,
      title: String(req.body.title || req.file.originalname || "Media"),
      url: `/uploads/${req.file.filename}`
    });
  });
});

app.use("/uploads", express.static(UPLOAD_DIR));
app.get("/admin", (req, res) => res.sendFile(path.join(ROOT, "admin.html")));

app.use((req, res, next) => {
  const blocked = req.path.startsWith("/server") || req.path.startsWith("/.git") || req.path.includes("..");
  if (blocked) return res.status(404).end();
  next();
});
app.use(express.static(ROOT));

app.listen(PORT, () => {
  console.log(`Infra Wing portal http://127.0.0.1:${PORT}`);
  ensureWingCopies();
});
