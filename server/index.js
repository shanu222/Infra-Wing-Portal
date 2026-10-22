const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const https = require("https");
const { presignGet, signPut } = require("./r2");

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
  const cfg = wingConfig();
  const items = mediaCatalog().map((item) => ({
    id: item.id,
    title: item.title,
    kind: item.kind,
    key: item.key,
    url: cfg ? presignGet({ host: cfg.host, bucket: cfg.bucket, key: item.key, accessKey: cfg.accessKey, secret: cfg.secret, expires: 86400 }) : ""
  }));
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json(items);
});

const wingUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 40 * 1024 * 1024 } });

function storeWingObject(key, contentType, body) {
  const cfg = wingConfig();
  if (!cfg) return Promise.reject(new Error("storage is not configured"));
  const payloadHash = crypto.createHash("sha256").update(body).digest("hex");
  const signed = signPut({ host: cfg.host, bucket: cfg.bucket, key, accessKey: cfg.accessKey, secret: cfg.secret, contentType, payloadHash });
  return new Promise((resolve, reject) => {
    const req = https.request(signed.url, {
      method: "PUT",
      headers: { ...signed.headers, "content-length": body.length }
    }, (upstream) => {
      upstream.resume();
      upstream.on("end", () => resolve(upstream.statusCode || 502));
    });
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("bucket timeout")));
    req.end(body);
  });
}

function openWingObject(key, range) {
  const cfg = wingConfig();
  if (!cfg) return Promise.reject(new Error("storage is not configured"));
  const url = presignGet({ host: cfg.host, bucket: cfg.bucket, key, accessKey: cfg.accessKey, secret: cfg.secret, expires: 300 });
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: range ? { Range: range } : {} }, resolve);
    req.on("error", reject);
    req.setTimeout(20000, () => req.destroy(new Error("bucket timeout")));
  });
}

const CONTENT_KEY = "portal/content.json";
const BUCKET_FLAG = path.join(DATA_DIR, "content.bucket-ok");

async function readStoredContent() {
  if (fs.existsSync(BUCKET_FLAG)) {
    try {
      const upstream = await openWingObject(CONTENT_KEY);
      if (upstream.statusCode === 200) {
        const chunks = [];
        for await (const chunk of upstream) chunks.push(chunk);
        return JSON.parse(Buffer.concat(chunks).toString("utf8"));
      }
      upstream.resume();
    } catch (error) {
      /* disk copy remains available */
    }
  }
  return readContent();
}

async function writeStoredContent(data) {
  writeContent(data);
  try {
    const status = await storeWingObject(CONTENT_KEY, "application/json", Buffer.from(JSON.stringify(data)));
    if (status === 200) {
      fs.writeFileSync(BUCKET_FLAG, "ok");
      return true;
    }
  } catch (error) {
    /* reported to the admin as not stored in the bucket */
  }
  fs.rmSync(BUCKET_FLAG, { force: true });
  return false;
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
    let bucket = false;
    try {
      bucket = (await storeWingObject(key, contentType, req.file.buffer)) === 200;
    } catch (err) {
      bucket = false;
    }
    res.json({ ok: true, bucket, key });
  });
});

app.get("/api/media/*", (req, res) => {
  const key = String(req.params[0] || "");
  if (!safeKey(key)) return res.status(400).end();
  const local = path.join(UPLOAD_DIR, key);
  if (fs.existsSync(local)) return res.sendFile(local);
  const packed = path.join(ROOT, "media", key);
  openWingObject(key, req.headers.range).then((upstream) => {
    if (upstream.statusCode !== 200 && upstream.statusCode !== 206) {
      upstream.resume();
      if (fs.existsSync(packed)) return res.sendFile(packed);
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
    if (fs.existsSync(packed)) return res.sendFile(packed);
    res.status(404).end();
  });
});

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

app.put("/api/content", auth, async (req, res) => {
  try {
    const bucket = await writeStoredContent(req.body);
    res.json({ ok: true, bucket });
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
});
