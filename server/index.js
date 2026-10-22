const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

app.get("/api/content", (req, res) => {
  res.json(readContent());
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
