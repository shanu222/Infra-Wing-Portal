let DATA = null;
const state = { hub: "all", region: "all", open: "", kind: "all", frame: null, frameFrom: "" };
let bookTask = null;
let bookDoc = null;
let bookPage = 1;
let bookBusy = false;
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => {
  const num = Number(n);
  if (Number.isNaN(num)) return esc(n);
  if (Number.isInteger(num)) return num.toLocaleString("en-US");
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};
const sum = (arr) => (arr || []).reduce((a, b) => a + Number(b || 0), 0);
const hubTotal = (h) => sum(h.stock);
const totalUnits = () => (DATA.hubs || []).reduce((a, h) => a + hubTotal(h), 0);
const seminarTotal = () => (DATA.seminars || []).reduce((a, s) => a + Number(s.n || 0), 0);

function apiBase() {
  return String(window.INFRA_API || "").replace(/\/$/, "");
}
function absUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (String(url).startsWith("/uploads")) return apiBase() + url;
  return url;
}
function safeUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const parsed = new URL(raw, location.origin);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.href;
  } catch (error) {
    return "";
  }
  return "";
}

function heatColor(v, max) {
  const t = Math.max(0, Math.min(1, v / max));
  return { bg: `hsl(${6 + t * 138} 72% ${32 + t * 16}%)`, fg: t > 0.62 ? "#062018" : "#f5fffb" };
}

function donut(slices, center, sub) {
  const clean = slices.filter((s) => s.value > 0);
  const total = clean.reduce((a, s) => a + s.value, 0) || 1;
  const r = 68;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const rings = clean.map((s) => {
    const len = (s.value / total) * circ;
    const dash = Math.max(0, len - (clean.length > 1 ? 2.5 : 0));
    const node = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${s.color}" stroke-width="18" data-len="${dash.toFixed(2)}" data-circ="${circ.toFixed(2)}" style="stroke-dasharray:0 ${circ.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"></circle>`;
    off += len;
    return node;
  }).join("");
  const legend = clean.map((s) => `<li><i style="background:${s.color}"></i><span>${esc(s.name)}</span><b>${fmt(s.value)}</b></li>`).join("");
  return `<div class="donut"><svg class="donut-svg" viewBox="0 0 200 200"><ellipse cx="100" cy="168" rx="64" ry="10" fill="rgba(0,0,0,.35)"></ellipse><g transform="rotate(-90 100 100)"><circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="18"></circle>${rings}</g><text class="donut-n" x="100" y="98" text-anchor="middle">${esc(center)}</text><text class="donut-s" x="100" y="116" text-anchor="middle">${esc(sub)}</text></svg><ul class="legend">${legend}</ul></div>`;
}

function hBars(rows) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="bars">${rows.map((r) => `<div class="barline"><span>${esc(r.name)}</span><div class="track"><i class="fill" style="--w:${(r.value / max) * 100}%;--c:${r.color}"></i></div><em>${fmt(r.value)}</em></div>`).join("")}</div>`;
}

const FLOW_COLORS = ["#3ad7f5", "#1ec87a", "#f0c14b", "#ff9f43", "#b08cff", "#ff6fa8", "#6aa4ff", "#ff6d6d", "#8dffe4", "#ffd56a"];
function chips(list) {
  return `<div class="chips">${(list || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
}
function storyBoard(title, lead, lanes) {
  const body = lanes.map((lane) => {
    const from = lane.from.map((text) => `<span>${esc(text)}</span>`).join("");
    const to = lane.to.map((text) => `<b>${esc(text)}</b>`).join("");
    return `<article class="lane" style="--c:${lane.color}"><div class="lane-from">${from}</div><span class="lane-go" aria-hidden="true"></span><div class="lane-to">${to}</div></article>`;
  }).join("");
  return `<section class="story"><h3>${esc(title)}</h3><p>${esc(lead)}</p>${body}</section>`;
}
function pairFlow(leftTitle, leftItems, rightTitle, rightItems, pairs) {
  const node = (text, side, index) => `<div class="flow-node" data-side="${side}" data-i="${index}" style="--c:${FLOW_COLORS[index % FLOW_COLORS.length]}"><i></i><b>${esc(text)}</b></div>`;
  const links = (pairs || []).map(([a, b]) => `${a}:${b}`).join(",");
  return `<section class="pair-flow" data-flow data-links="${links}"><div class="pair-col"><h3>${esc(leftTitle)}</h3>${leftItems.map((text, index) => node(text, "l", index)).join("")}</div><svg class="pair-lines" aria-hidden="true"></svg><div class="pair-col"><h3>${esc(rightTitle)}</h3>${rightItems.map((text, index) => node(text, "r", index + 3)).join("")}</div></section>`;
}
function chainFlow(title, items) {
  const row = (items || []).map((text, index) => {
    const node = `<div class="chain-node" style="--c:${FLOW_COLORS[index % FLOW_COLORS.length]}"><em>${String(index + 1).padStart(2, "0")}</em><b>${esc(text)}</b></div>`;
    const join = index < items.length - 1 ? `<span class="chain-join" style="--c:${FLOW_COLORS[index % FLOW_COLORS.length]}"></span>` : "";
    return node + join;
  }).join("");
  return `<section class="chain-flow"><h3>${esc(title)}</h3><div class="chain-row">${row}</div></section>`;
}
function paintFlows(root) {
  (root || document).querySelectorAll("[data-flow]").forEach((board) => {
    const svg = board.querySelector(".pair-lines");
    if (!svg) return;
    const left = [...board.querySelectorAll("[data-side='l']")];
    const right = [...board.querySelectorAll("[data-side='r']")];
    const box = board.getBoundingClientRect();
    if (box.width < 40) return;
    const parts = String(board.dataset.links || "").split(",").filter(Boolean).map((link, index) => {
      const [a, b] = link.split(":").map(Number);
      const from = left[a];
      const to = right[b];
      if (!from || !to) return "";
      const A = from.getBoundingClientRect();
      const B = to.getBoundingClientRect();
      const x1 = A.right - box.left;
      const y1 = A.top + A.height / 2 - box.top;
      const x2 = B.left - box.left;
      const y2 = B.top + B.height / 2 - box.top;
      const color = FLOW_COLORS[index % FLOW_COLORS.length];
      const d = `M${x1.toFixed(1)},${y1.toFixed(1)} C${(x1 + 64).toFixed(1)},${y1.toFixed(1)} ${(x2 - 64).toFixed(1)},${y2.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}`;
      const dot = reduce ? "" : `<circle r="3.4" fill="${color}"><animateMotion dur="${2.6 + (index % 4) * 0.35}s" repeatCount="indefinite" path="${d}" /></circle>`;
      return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" class="flow-line" style="animation-delay:${index * 0.12}s" />${dot}`;
    }).join("");
    svg.setAttribute("viewBox", `0 0 ${box.width} ${box.height}`);
    svg.innerHTML = parts;
  });
}

function playDonuts(root) {
  root.querySelectorAll("circle[data-len]").forEach((node) => {
    const circ = Number(node.dataset.circ);
    const len = Number(node.dataset.len);
    const apply = () => { node.style.strokeDasharray = `${len} ${circ - len}`; };
    if (reduce) return apply();
    node.style.transition = "stroke-dasharray 1.15s cubic-bezier(.2,.8,.2,1)";
    requestAnimationFrame(() => requestAnimationFrame(apply));
  });
}

function runCounters(root) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    if (el.dataset.ran) return;
    el.dataset.ran = "1";
    const target = parseFloat(el.dataset.count);
    if (reduce || Number.isNaN(target)) {
      el.textContent = fmt(target);
      return;
    }
    el.textContent = "0";
    const start = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - start) / 1100);
      const e = 1 - Math.pow(1 - t, 3);
      el.textContent = fmt(Math.round(target * e));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = fmt(target);
    };
    requestAnimationFrame(step);
  });
}

function tileValue(id) {
  if (id === "audit") return DATA.regions.length;
  if (id === "drim") return DATA.drim.count;
  if (id === "hubs") return DATA.hubs.length;
  if (id === "app360") return DATA.modules.length;
  if (id === "field") return DATA.field.districts.length;
  if (id === "seminars") return seminarTotal();
  if (id === "response") return DATA.response.length;
  if (id === "portals") return DATA.portals.length;
  if (id === "media") return DATA.media.length;
  if (id === "mandate") return DATA.mandate.length;
  return "";
}

function pictureRail() {
  const pics = (DATA.library || []).filter((item) => item.type !== "video" && /brief-/i.test(item.url));
  if (!pics.length) return "";
  const frame = (item) => `<img src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`;
  const row = pics.map(frame).join("");
  return `<section class="cover-rail"><div class="reel home-reel"><div class="reel-track">${row}${row}</div></div></section>`;
}

function clipReel(items) {
  if (!items.length) return "";
  const pics = items.filter((item) => item.type !== "video");
  const vids = items.filter((item) => item.type === "video");
  const frames = pics.map((item) => `<img src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`).join("");
  const reel = pics.length ? `<div class="reel"><div class="reel-track">${frames}${frames}</div></div>` : "";
  const players = vids.map((item) => `<video class="wing-video" muted autoplay loop playsinline preload="auto" src="${esc(absUrl(item.url))}"></video>`).join("");
  return reel + (players ? `<div class="media-grid">${players}</div>` : "");
}

const HOME_ART = {
  mandate: "assets/home/card-mandate.jpg",
  audit: "assets/home/card-iap.jpg",
  drim: "assets/home/card-drim.jpg",
  hubs: "assets/home/card-hub.jpg",
  app360: "assets/home/card-app.jpg",
  field: "assets/home/card-field.jpg",
  advisories: "assets/home/card-advisories.jpg",
  seminars: "assets/home/card-seminars.jpg",
  portals: "assets/home/card-portals.jpg"
};

function navIcon(id) {
  const paths = {
    wing: '<path d="M4 11 12 4l8 7"/><path d="M6 10.5V20h12v-9.5"/>',
    mandate: '<path d="M7 3.5h8l4 4V20H7z"/><path d="M15 3.5V8h4.2"/><path d="M9 12h6M9 16h6"/>',
    audit: '<path d="M4 20V9.5L12 4l8 5.5V20"/><path d="M9 20v-6h6v6"/>',
    drim: '<path d="M4 16c2.2-4 3.8-4 6 0s3.8 4 6 0 3.8-4 4 0"/><path d="M4 20h16"/>',
    hubs: '<path d="M3 8h18v11H3z"/><path d="M3 12.5h18M12 8v11"/>',
    app360: '<rect x="8" y="3" width="8" height="18" rx="2"/><path d="M11 18h2"/>',
    field: '<path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.2"/>',
    advisories: '<path d="M5 5h9l4 4v11H5z"/><path d="M14 5v4h4"/><path d="M8 12h7M8 16h5"/>',
    seminars: '<circle cx="8" cy="9" r="2.4"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4M11.5 19c.6-2.6 2.4-4 4.5-4s3.9 1.4 4.5 4"/>',
    portals: '<circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.2 2.4 2.2 13.6 0 16M12 4c-2.2 2.4-2.2 13.6 0 16"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[id] || paths.wing}</svg>`;
}

const MODEL_MEDIA = "https://pub-e38210c9c2ff4bf3a45338616cd43df2.r2.dev/content/resilience-models";
const DRIM_BOARD = [
  { slug: "loh-kaat-timber-house-structure", title: "Loh-Kaat Timber House", hazards: ["Earthquake", "Heat & cold"], regions: [["Upper Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"], ["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"]] },
  { slug: "timber-frame-lath-plaster", title: "Timber Frame with Lath & Plaster", hazards: ["Earthquake", "Heat & cold"], regions: [["Upper Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"], ["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"]] },
  { slug: "bamboo-frame-wattle-daub", title: "Bamboo Frame with Wattle & Daub", hazards: ["Earthquake", "Heat & cold"], regions: [["Northern Azad Jammu & Kashmir", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"], ["Balochistan plains", "balochistan"]] },
  { slug: "cement-bamboo-frame-structure", title: "Cement Bamboo Frame Structure", hazards: ["Earthquake"], regions: [["Khyber Pakhtunkhwa plains", "khyber-pakhtunkhwa"], ["Sindh plains", "sindh"]] },
  { slug: "confined-concrete-block-masonry-structure", title: "Confined Concrete Block Masonry", hazards: ["Earthquake"], regions: [["Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"], ["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"], ["Northern Punjab", "punjab"]] },
  { slug: "interlocking-brick-masonry-structure", title: "Interlocking Brick Masonry", hazards: ["Earthquake"], regions: [["Punjab plains", "punjab"], ["Sindh plains", "sindh"], ["Khyber Pakhtunkhwa plains", "khyber-pakhtunkhwa"]] },
  { slug: "rat-trap-bond-masonry-structure", title: "Rat-Trap Bond Masonry", hazards: ["Heat & cold"], regions: [["Punjab plains", "punjab"], ["Sindh plains", "sindh"], ["Khyber Pakhtunkhwa plains", "khyber-pakhtunkhwa"]] },
  { slug: "fly-ash-masonry-structure", title: "Fly Ash Masonry", hazards: ["Heat & cold"], regions: [["Sindh plains", "sindh"], ["Punjab (industrial zones)", "punjab"], ["Khyber Pakhtunkhwa plains", "khyber-pakhtunkhwa"]] },
  { slug: "earthbag-masonry-structure", title: "Earthbag Masonry", hazards: ["Earthquake", "Heat & cold"], regions: [["Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"], ["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"]] },
  { slug: "reinforced-adobe-brick-structure", title: "Reinforced Adobe Brick", hazards: ["Earthquake", "Heat & cold"], regions: [["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"], ["Khyber Pakhtunkhwa seismic areas", "khyber-pakhtunkhwa"]] },
  { slug: "light-gauge-steel-house-structure", title: "Light Gauge Steel House", hazards: ["Earthquake"], regions: [["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"], ["Khyber Pakhtunkhwa (hilly & plains)", "khyber-pakhtunkhwa"]] },
  { slug: "pre-fabricated-house-structure", title: "Pre-Fabricated House", hazards: ["Earthquake"], regions: [["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Northern Punjab", "punjab"], ["Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"]] },
  { slug: "elevated-flood-resilient-house-structure", title: "Elevated Flood Resilient House", hazards: ["Flood"], regions: [["Riverine Sindh", "sindh"], ["Riverine Punjab", "punjab"], ["Coastal Sindh", "sindh"]] },
  { slug: "raised-plinth-flood-resilient-house", title: "Raised Plinth Flood Resilient House", hazards: ["Flood"], regions: [["Khyber Pakhtunkhwa plains", "khyber-pakhtunkhwa"], ["South Punjab plains", "punjab"], ["Balochistan plains", "balochistan"]] },
  { slug: "floating-amphibious-structure", title: "Floating Amphibious Structure", hazards: ["Flood"], regions: [["Sindh (flood-prone areas)", "sindh"], ["South Punjab", "punjab"], ["Coastal Balochistan", "balochistan"]] },
  { slug: "geogrid-reinforced-retaining-wall-structure", title: "Geogrid Reinforced Retaining Wall", hazards: ["Landslide"], regions: [["Upper Khyber Pakhtunkhwa (hilly)", "khyber-pakhtunkhwa"], ["Azad Jammu & Kashmir (hilly)", "azad-kashmir"], ["Gilgit-Baltistan (hilly)", "gilgit-baltistan"]] }
];
let models = { images: [], pdfs: [] };
let modelTimer = null;
let modelIndex = 0;
let cardTimer = null;
let pdfShot = 0;
let boardRender = null;
const pdfCache = new Map();
let drimHold = false;

function modelMedia(rel) {
  return MODEL_MEDIA + "/" + String(rel || "").split("/").map((part) => encodeURIComponent(part)).join("/");
}
function modelFile(rel) {
  return apiBase() + "/api/models/file?path=" + encodeURIComponent(rel);
}
function titleize(stem) {
  return stem.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bPk\b/g, "Pakistan");
}
function uniqueModels(list) {
  const rank = { png: 3, jpg: 2, jpeg: 1, webp: 2 };
  const best = new Map();
  (list || []).forEach((rel) => {
    const file = String(rel).split("/").pop() || "";
    const dot = file.lastIndexOf(".");
    if (dot < 1) return;
    const stem = file.slice(0, dot);
    const ext = file.slice(dot + 1).toLowerCase();
    const score = rank[ext] || 0;
    const prev = best.get(stem);
    if (!prev || score > prev.score) best.set(stem, { stem, rel, score, title: titleize(stem), url: modelMedia(rel) });
  });
  return [...best.values()];
}
function modelProvinces(item) {
  return [...new Set((item.regions || []).map((region) => region[1]))];
}
function regionChips(item) {
  const map = window.PAK_MAP;
  return (item.regions || []).map((region) => {
    const color = map && map.colors[region[1]] ? map.colors[region[1]] : "#1ec87a";
    const name = map && map.names[region[1]] ? map.names[region[1]] : region[1];
    return `<span class="drim-loc"><i style="background:${color}"></i><b>${esc(region[0])}</b><em>${esc(name)}</em></span>`;
  }).join("");
}
async function loadModels() {
  const base = apiBase();
  if (!base) return;
  try {
    const res = await fetch(base + "/api/models");
    if (!res.ok) return;
    const meta = await res.json();
    const images = new Map(uniqueModels(meta.images).map((item) => [item.stem, item]));
    const pdfs = new Map((meta.pdfs || []).map((rel) => {
      const file = String(rel).split("/").pop() || "";
      return [file.replace(/\.pdf$/i, ""), modelFile(rel)];
    }));
    models = {
      images: DRIM_BOARD.map((info) => {
        const image = images.get(info.slug);
        if (!image) return null;
        return { stem: info.slug, title: info.title, url: image.url, pdf: pdfs.get(info.slug) || "", hazards: info.hazards, regions: info.regions };
      }).filter(Boolean),
      pdfs: []
    };
  } catch (error) {
    models = { images: [], pdfs: [] };
  }
}
function startDrimCard() {
  if (cardTimer) clearInterval(cardTimer);
  cardTimer = null;
  const box = document.getElementById("drim-play");
  if (!box || models.images.length < 2 || reduce) {
    const first = box && box.querySelector("img");
    if (first && models.images[0]) first.src = models.images[0].url;
    return;
  }
  const frames = [...box.querySelectorAll("img")];
  let n = 0;
  frames[0].src = models.images[0].url;
  frames[0].classList.add("is-on");
  frames[1].src = models.images[1].url;
  cardTimer = setInterval(() => {
    n = (n + 1) % models.images.length;
    const show = frames[n % 2];
    const hide = frames[(n + 1) % 2];
    show.src = models.images[n].url;
    show.classList.add("is-on");
    hide.classList.remove("is-on");
    setTimeout(() => {
      if (hide.isConnected) hide.src = models.images[(n + 1) % models.images.length].url;
    }, 1200);
  }, 3400);
}
function stopModelShow() {
  if (modelTimer) clearInterval(modelTimer);
  modelTimer = null;
}
function showModel(index) {
  if (!models.images.length) return;
  modelIndex = (index + models.images.length) % models.images.length;
  const item = models.images[modelIndex];
  const hero = document.getElementById("model-hero");
  const name = document.getElementById("model-name");
  if (hero) {
    hero.src = item.url;
    hero.alt = item.title;
  }
  if (name) name.textContent = item.title;
  const hazards = document.getElementById("model-hazards");
  if (hazards) hazards.innerHTML = item.hazards.map((hazard) => `<span>${esc(hazard)}</span>`).join("");
  const count = document.getElementById("model-count");
  if (count) count.textContent = `${modelIndex + 1} / ${models.images.length}`;
  const regions = document.getElementById("model-regions");
  if (regions) regions.innerHTML = regionChips(item);
  const map = document.getElementById("drim-map");
  if (map && window.pakistanMap) map.innerHTML = window.pakistanMap(modelProvinces(item));
  const pdfTitle = document.getElementById("drim-pdf-title");
  if (pdfTitle) pdfTitle.textContent = item.title;
  const open = document.getElementById("drim-open-pdf");
  if (open) {
    open.dataset.doc = item.pdf || "";
    open.dataset.title = item.title;
    open.hidden = !item.pdf;
  }
  const meter = document.getElementById("drim-meter");
  if (meter) {
    meter.classList.remove("run");
    void meter.offsetWidth;
    if (!reduce) meter.classList.add("run");
  }
  paintBoardPdf(item.pdf);
}
function startModelShow() {
  stopModelShow();
  const pair = document.getElementById("drim-pair");
  if (pair && !pair.dataset.bound) {
    pair.dataset.bound = "1";
    pair.addEventListener("mouseenter", () => {
      drimHold = true;
      stopModelShow();
    });
    pair.addEventListener("mouseleave", () => {
      drimHold = false;
      startModelShow();
    });
  }
  if (drimHold || models.images.length < 2 || reduce || !document.getElementById("model-hero")) return;
  modelTimer = setInterval(() => {
    if (!document.getElementById("model-hero")) {
      stopModelShow();
      return;
    }
    showModel(modelIndex + 1);
  }, 5600);
}
async function paintBoardPdf(url) {
  const canvas = document.getElementById("drim-pdf-page");
  if (!canvas || !url || !window.pdfjsLib) return;
  const token = ++pdfShot;
  if (boardRender) {
    try { boardRender.cancel(); } catch (error) { /* a newer page replaces this one */ }
    boardRender = null;
  }
  pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
  try {
    let doc = pdfCache.get(url);
    if (!doc) {
      doc = await pdfjsLib.getDocument(url).promise;
      pdfCache.set(url, doc);
    }
    if (token !== pdfShot || !canvas.isConnected) return;
    const page = await doc.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const box = canvas.parentElement;
    const width = box && box.clientWidth ? box.clientWidth : 520;
    const view = page.getViewport({ scale: Math.min(1.8, Math.max(0.8, (width - 8) / base.width)) });
    canvas.width = Math.floor(view.width);
    canvas.height = Math.floor(view.height);
    if (token !== pdfShot) return;
    boardRender = page.render({ canvasContext: canvas.getContext("2d"), viewport: view });
    await boardRender.promise;
  } catch (error) {
    /* the next model replaces a cancelled page */
  }
}
function drimShowcase() {
  const item = models.images[0];
  if (!item) return "";
  const map = window.pakistanMap ? window.pakistanMap(modelProvinces(item)) : "";
  return `<div class="drim-pair" id="drim-pair">
    <article class="drim-feature">
      <img id="model-hero" src="${esc(item.url)}" alt="${esc(item.title)}" />
      <div class="drim-feature-copy">
        <span class="k">DRIM model</span>
        <h3 id="model-name">${esc(item.title)}</h3>
        <p id="model-hazards">${item.hazards.map((hazard) => `<span>${esc(hazard)}</span>`).join("")}</p>
        <b id="model-count">1 / ${models.images.length}</b>
      </div>
      <i class="drim-meter" id="drim-meter"></i>
    </article>
    <article class="drim-board">
      <div class="drim-board-page"><canvas id="drim-pdf-page"></canvas></div>
      <div class="drim-board-copy">
        <span class="k">Model board</span>
        <h3 id="drim-pdf-title">${esc(item.title)}</h3>
        <p>The display board for this model, shown with the photo.</p>
        <button class="btn gold" type="button" id="drim-open-pdf" data-doc="${esc(item.pdf)}" data-title="${esc(item.title)}">Open the board</button>
      </div>
    </article>
  </div>
  <div class="drim-where">
    <div class="drim-map" id="drim-map">${map}</div>
    <div class="drim-places">
      <span class="k">Where this model is used</span>
      <h3>Province and location</h3>
      <div id="model-regions">${regionChips(item)}</div>
      <p class="pk-note">Boundaries are indicative. The Survey of Pakistan is the authority for official boundaries.</p>
    </div>
  </div>`;
}
function pakistanFooter() {
  if (!window.pakistanMap || !window.PAK_MAP) return "";
  const legend = Object.keys(window.PAK_MAP.names).map((id) => `<li><i style="background:${window.PAK_MAP.colors[id]}"></i>${esc(window.PAK_MAP.names[id])}</li>`).join("");
  return `<footer class="pk-foot">
    <div class="pk-foot-copy">
      <span class="k">Pakistan</span>
      <h2>Provinces and territories</h2>
      <p>Infra Wing works across the country. Each DRIM model marks the provinces and locations where it can be used.</p>
      <ul class="pk-legend">${legend}</ul>
      <p class="pk-note">Boundaries are indicative. The Survey of Pakistan is the authority for official boundaries.</p>
    </div>
    <div class="pk-foot-map">${window.pakistanMap(null)}</div>
  </footer>`;
}

const HUB_MEDIA = "https://pub-e38210c9c2ff4bf3a45338616cd43df2.r2.dev/content/material-hubs";
const HUB_PHOTO = {
  gilgit: "images/gilgit-hub.jpg",
  muzaffargarh: "images/muzaffargarh-hub.jpg",
  sukkur: "images/sukkur-hub.jpg"
};
const HUB_VIDEOS = [
  "Installation videos for material/Bamboo_disaster-resilient_house_…_202607211139.mp4",
  "Installation videos for material/CGI_sheet_roofing_installation_d…_202607211148.mp4",
  "Installation videos for material/EPS_Panel_Construction_Disaster-…_202607211316.mp4",
  "Installation videos for material/Pallets.mp4",
  "Installation videos for material/Polythene_sheet_installation_dis…_202607211216.mp4",
  "Installation videos for material/Rope.mp4",
  "Installation videos for material/Steel_girder_construction_disast…_202607211205.mp4",
  "Installation videos for material/Wooden_plank_construction_disast…_202607211228.mp4",
  "Installation videos for material/Wooden_stick_chick_mat_construction_202607211159.mp4"
];
function hubMedia(rel) {
  return HUB_MEDIA + "/" + String(rel || "").split("/").map((part) => encodeURIComponent(part)).join("/");
}
function glyph(kind) {
  const paths = {
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.8.8-1.4 1.7-1.6 2.7H9.6C9.4 15.7 8.8 14.8 8 14z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3.5v2M12 18.5V20.5M4.9 6.8l1.5 1.5M17.6 15.7l1.5 1.5M3.5 12h2M18.5 12h2M4.9 17.2l1.5-1.5M17.6 8.3l1.5-1.5"/>',
    road: '<path d="M7 20 10 4h2l3 16M16 20l1.5-6H20"/>',
    public: '<path d="M4 20V10l8-5 8 5v10"/><path d="M9 20v-6h6v6"/>',
    factory: '<path d="M3 20V11l5 3V9l5 3V8l8 4v8z"/>',
    water: '<path d="M3 14c2-3 3-3 5 0s3 3 5 0 3-3 5 0"/><path d="M3 18c2-3 3-3 5 0s3 3 5 0 3-3 5 0"/>',
    home: '<path d="M4 12 12 5l8 7"/><path d="M6 11v8h12v-8"/>',
    shop: '<path d="M4 10h16l-1 10H5z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    shield: '<path d="M12 3 5 6v6c0 4.4 3 6.8 7 8.5 4-1.7 7-4.1 7-8.5V6z"/>',
    alert: '<path d="m12 4 9 16H3z"/><path d="M12 10v4M12 17h.01"/>'
  };
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[kind] || ""}</svg>`;
}
function goMark() {
  return `<span class="home-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 6h10v10"/><path d="M8 16 18 6"/></svg></span>`;
}
function startHubCard() {
  const video = document.querySelector("#hub-play video");
  if (!video || !HUB_VIDEOS.length) return;
  let n = 0;
  let fails = 0;
  const next = () => {
    video.src = hubMedia(HUB_VIDEOS[n]);
    const play = video.play();
    if (play && play.catch) play.catch(() => {});
  };
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.addEventListener("ended", () => {
    n = (n + 1) % HUB_VIDEOS.length;
    next();
  });
  video.addEventListener("error", () => {
    fails += 1;
    if (fails > HUB_VIDEOS.length) return;
    n = (n + 1) % HUB_VIDEOS.length;
    next();
  });
  next();
}
function mandatePage() {
  const art = {
    strengthen: "assets/home/mandate-strengthen.jpg",
    innovate: "assets/home/mandate-innovate.jpg",
    localise: "assets/home/mandate-localise.jpg",
    communication: "assets/home/mandate-communication.jpg",
    public: "assets/home/mandate-public.jpg",
    industrial: "assets/home/mandate-industrial.jpg",
    hydraulic: "assets/home/mandate-hydraulic.jpg",
    residential: "assets/home/mandate-residential.jpg",
    commercial: "assets/home/mandate-commercial.jpg"
  };
  const icons = ["target", "bulb", "gear"];
  const classIcon = { communication: "road", public: "public", industrial: "factory", hydraulic: "water", residential: "home", commercial: "shop" };
  const pillars = DATA.mandate.map((item, i) => `<article class="m-card" style="--accent:${item.color}"><img src="${art[item.title.toLowerCase()] || ""}" alt="" /><div class="m-copy"><span class="m-ico">${glyph(icons[i] || "target")}</span><div><b>0${i + 1}</b><h3>${esc(item.title)}</h3></div></div>${goMark()}</article>`).join("");
  const classes = DATA.classes.map((item) => `<article class="m-tile" style="--accent:${item.color}"><img src="${art[item.title.toLowerCase()] || ""}" alt="" /><div class="m-copy"><span class="m-ico">${glyph(classIcon[item.title.toLowerCase()] || "public")}</span><div><b>${esc(item.title)}</b><p>${esc(item.line)}</p></div></div>${goMark()}</article>`).join("");
  return `<section class="mandate">
    <div class="m-hero"><img src="assets/home/mandate-hero.jpg" alt="" /><div><h2>Mandate</h2><p>Strengthening infrastructure, enhancing resilience, and building safer communities across Pakistan.</p></div></div>
    <div class="m-three">${pillars}</div>
    <div class="m-six">${classes}</div>
    ${storyBoard("How preparation is used after a disaster", "Read each row from left to right. The left side is the work done before a disaster. The right side is what that work becomes after one.", [
      { color: "#3ad7f5", from: ["Infrastructure awareness advisories", "Infrastructure audit mechanism", "Cost of exposed infrastructure", "Pre-disaster damage projection"], to: ["Damage verification"] },
      { color: "#1ec87a", from: ["Material hubs", "Region-wise designs"], to: ["Reconstruction through material hubs", "Temporary camp support", "Temporary infrastructure"] },
      { color: "#f0c14b", from: ["National seminars", "Global practice for Pakistan"], to: ["Strengthening and retrofitting"] }
    ])}
    ${storyBoard("What changes when a building can survive", "Each result of an exposed build is answered by the result beside it.", [
      { color: "#ff6d6d", from: ["Infrastructure damage"], to: ["Survive the hazard"] },
      { color: "#ff9f43", from: ["Lives disrupted"], to: ["Save lives"] },
      { color: "#b08cff", from: ["Services halt"], to: ["Reduce losses"] },
      { color: "#6aa4ff", from: ["Recovery delayed"], to: ["Reduce losses"] }
    ])}
  </section>`;
}

const WING_FILES = [
  { id: "mandate", title: "Pre and post disaster work", kind: "video", url: "media/portal/mandate/pre-post.mp4" },
  { id: "audit", title: "Infra Audit Program", kind: "video", url: "media/portal/audit/program.mp4" },
  { id: "audit", title: "Audit portal", kind: "video", url: "media/portal/audit/portal.mp4" },
  { id: "drim", title: "DRIM", kind: "video", url: "media/portal/drim/promo.mp4" },
  { id: "seminars", title: "Seminar, 23 September 2024", kind: "video", url: "media/portal/seminars/23-sep-2024.mp4" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/01.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/02.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/03.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/04.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/05.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/06.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/07.jpg" },
  { id: "seminars", title: "Seminar", kind: "image", url: "media/portal/seminars/08.jpg" },
  { id: "portals", title: "PRIA", kind: "video", url: "media/portal/portals/pria.mp4" },
  { id: "portals", title: "Structural health monitoring", kind: "video", url: "media/portal/portals/shm.mp4" },
  { id: "app360", title: "Resilience 360", kind: "video", url: "media/portal/app/r360.mp4" },
  { id: "advisories", title: "Infrastructure publications", kind: "video", url: "media/portal/advisories/books.mp4" },
  { id: "field", title: "Gilgit-Baltistan field visit", kind: "video", url: "media/portal/field/visit.mp4" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/01.jpg" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/02.jpg" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/03.jpg" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/04.jpg" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/05.jpg" },
  { id: "field", title: "Field visit", kind: "image", url: "media/portal/field/06.jpg" },
  { id: "mandate", title: "Pre and post disaster work", kind: "image", url: "media/portal/mandate/still-1.jpg" },
  { id: "mandate", title: "Pre and post disaster work", kind: "image", url: "media/portal/mandate/still-2.jpg" },
  { id: "mandate", title: "Pre and post disaster work", kind: "image", url: "media/portal/mandate/still-3.jpg" },
  { id: "audit", title: "Infra Audit Program", kind: "image", url: "media/portal/audit/still-1.jpg" },
  { id: "audit", title: "Infra Audit Program", kind: "image", url: "media/portal/audit/still-2.jpg" },
  { id: "audit", title: "Infra Audit Program", kind: "image", url: "media/portal/audit/still-3.jpg" },
  { id: "drim", title: "DRIM", kind: "image", url: "media/portal/drim/still-1.jpg" },
  { id: "drim", title: "DRIM", kind: "image", url: "media/portal/drim/still-2.jpg" },
  { id: "drim", title: "DRIM", kind: "image", url: "media/portal/drim/still-3.jpg" },
  { id: "app360", title: "Resilience 360", kind: "image", url: "media/portal/app/still-1.jpg" },
  { id: "app360", title: "Resilience 360", kind: "image", url: "media/portal/app/still-2.jpg" },
  { id: "app360", title: "Resilience 360", kind: "image", url: "media/portal/app/still-3.jpg" },
  { id: "advisories", title: "Infrastructure publications", kind: "image", url: "media/portal/advisories/still-1.jpg" },
  { id: "advisories", title: "Infrastructure publications", kind: "image", url: "media/portal/advisories/still-2.jpg" },
  { id: "advisories", title: "Infrastructure publications", kind: "image", url: "media/portal/advisories/still-3.jpg" },
  { id: "portals", title: "PRIA", kind: "image", url: "media/portal/portals/still-1.jpg" },
  { id: "portals", title: "PRIA", kind: "image", url: "media/portal/portals/still-2.jpg" },
  { id: "portals", title: "PRIA", kind: "image", url: "media/portal/portals/still-3.jpg" }
];
let wingMedia = WING_FILES;
function mediaFor(id, kind) {
  return wingMedia.filter((item) => item.id === id && (!kind || item.kind === kind));
}
function cardPlaylist(id) {
  const images = mediaFor(id, "image").map((item) => item.url);
  const videos = mediaFor(id, "video").map((item) => item.url);
  if (id === "drim") models.images.forEach((item) => images.push(item.url));
  if (id === "hubs") {
    Object.keys(HUB_PHOTO).forEach((key) => images.push(hubMedia(HUB_PHOTO[key])));
    HUB_VIDEOS.forEach((rel) => videos.push(hubMedia(rel)));
  }
  const list = [];
  const count = Math.max(images.length, videos.length);
  for (let i = 0; i < count; i += 1) {
    if (images[i]) list.push({ type: "image", url: images[i] });
    if (videos[i]) list.push({ type: "video", url: videos[i] });
  }
  return list;
}
function cardMedia(item) {
  const list = cardPlaylist(item.id);
  const first = list.find((entry) => entry.type === "image") || list[0];
  const src = first ? first.url : (HOME_ART[item.id] || item.image);
  return `<div class="card-play" data-card-play="${esc(item.id)}"><img src="${esc(src)}" alt="" class="is-on" /><img alt="" /><video muted playsinline></video></div>`;
}
function homeCard(item, wide) {
  return `<article class="home-card${wide ? " wide" : ""}" style="--accent:${esc(item.color || "#1ec87a")}" data-open="${esc(item.id)}" data-home-card data-find="${esc(`${item.title} ${item.line} ${item.line2}`.toLowerCase())}">${cardMedia(item)}<footer class="card-foot"><b>${esc(item.title)}</b><span class="home-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 6h10v10"/><path d="M8 16 18 6"/></svg></span></footer></article>`;
}
function filmTag(url) {
  return `<div class="film"><video class="wing-video" muted autoplay loop playsinline preload="auto" src="${esc(url)}"></video></div>`;
}
function wingStage(id) {
  const videos = mediaFor(id, "video");
  const images = mediaFor(id, "image");
  if (!videos.length && !images.length) return "";
  const video = videos.length ? `<div class="wing-videos">${videos.map((item) => filmTag(item.url)).join("")}</div>` : "";
  const strip = images.length ? `<div class="wing-strip">${images.map((item) => `<img src="${esc(item.url)}" alt="${esc(item.title)}">`).join("")}</div>` : "";
  return `<div class="wing-stage">${video}${strip}</div>`;
}
function wingLink() {
  const nodes = [
    ["mandate", "Mandate", 12, 22],
    ["audit", "IAP", 31, 22],
    ["field", "Field visits", 50, 22],
    ["seminars", "Seminars", 69, 22],
    ["portals", "Portals", 88, 22],
    ["drim", "DRIM", 12, 74],
    ["hubs", "Material hubs", 31, 74],
    ["advisories", "Advisories", 56, 74],
    ["app360", "360 App", 82, 74]
  ];
  const tone = { mandate: "#f0c14b", audit: "#3ad7f5", field: "#ff6d6d", seminars: "#ff6fa8", portals: "#ff8a3d", drim: "#ff9f43", hubs: "#b08cff", advisories: "#f0a202", app360: "#6aa4ff" };
  const lines = [[12, 22, 31, 22, "#f0c14b"], [31, 22, 50, 22, "#3ad7f5"], [50, 22, 69, 22, "#ff6d6d"], [69, 22, 88, 22, "#ff6fa8"], [12, 22, 12, 74, "#f0c14b"], [12, 74, 31, 74, "#ff9f43"], [31, 74, 56, 74, "#b08cff"], [56, 74, 82, 74, "#f0a202"], [31, 22, 31, 74, "#3ad7f5"], [50, 22, 56, 74, "#ff6d6d"], [69, 22, 82, 74, "#ff6fa8"]];
  const paths = lines.map(([x1, y1, x2, y2, color], index) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" class="link-flow" style="animation-delay:${index * 0.18}s" />`).join("");
  const dots = reduce ? "" : lines.map(([x1, y1, x2, y2, color], index) => `<circle r="0.85" fill="${color}"><animateMotion dur="${4.2 + index * 0.35}s" repeatCount="indefinite" path="M${x1},${y1} L${x2},${y2}" /></circle>`).join("");
  const buttons = nodes.map(([id, label, x, y]) => `<button class="link-node" type="button" data-open="${id}" style="left:${x}%;top:${y}%;--c:${tone[id] || "#1ec87a"}"><b>${esc(label)}</b></button>`).join("");
  return `<section class="wing-link"><span class="k">Connected work</span><h2>How the wing fits together</h2><div class="link-board"><svg class="link-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${paths}${dots}</svg>${buttons}</div></section>`;
}

function pageScene(id) {
  const key = id || "home";
  const dot = (path, color, dur) => reduce ? "" : `<circle r="4.5" fill="${color}"><animateMotion dur="${dur}" repeatCount="indefinite" path="${path}" /></circle>`;
  const art = {
    home: `<path class="scene-road" d="M0 560 H1200"/><path class="scene-line" d="M40 560 V390 H150 V250 H250 V560 M430 560 C530 390 690 390 790 560 M860 560 V340 H980 V220 H1100 V560"/>${dot("M0 560 H1200", "#8dffe4", "11s")}`,
    mandate: `<g class="scene-rise"><path class="scene-line" d="M80 560 V320 H150 V240 H230 V560 M360 560 V280 H470 V180 H560 V560 M700 560 V340 H820 V200 H960 V560 M1020 560 V300 H1140 V560"/></g>${dot("M80 500 H1140", "#f0c14b", "13s")}`,
    audit: `<path class="scene-line" d="M80 120 H1120 M80 240 H1120 M80 360 H1120 M80 480 H1120 M160 80 V560 M360 80 V560 M560 80 V560 M760 80 V560 M960 80 V560"/><line class="scene-scan" x1="70" x2="1130" y1="90" y2="90"/>`,
    drim: `<path class="scene-draw" d="M120 560 V300 L280 180 L440 300 V560 Z M220 560 V400 H340 V560 M700 560 V280 L900 140 L1100 280 V560 Z M800 560 V400 H980 V560"/>`,
    hubs: `<path class="scene-road" d="M0 470 H1200"/><g class="scene-crates"><rect x="40" y="390" width="70" height="70"/><rect x="130" y="360" width="80" height="100"/><rect x="230" y="400" width="60" height="60"/></g>${dot("M0 430 H1200", "#b08cff", "10s")}`,
    app360: `<circle class="scene-ring" cx="600" cy="340" r="70"/><circle class="scene-ring" cx="600" cy="340" r="140"/><circle class="scene-ring" cx="600" cy="340" r="220"/><path class="scene-line" d="M560 300 H640 V420 H560 Z M590 300 V270 H610 V300"/>`,
    field: `<path class="scene-wave" d="M0 420 C150 340 250 500 400 420 S650 340 800 420 1050 500 1200 420"/><path class="scene-wave" d="M0 500 C160 420 280 580 440 500 S700 420 860 500 1100 580 1200 500"/>${dot("M0 460 H1200", "#ff6d6d", "14s")}`,
    advisories: `<g class="scene-pages"><rect x="180" y="160" width="220" height="300" rx="8"/><rect x="490" y="130" width="220" height="300" rx="8"/><rect x="800" y="180" width="220" height="300" rx="8"/></g>`,
    seminars: `<path class="scene-line" d="M600 180 L600 180"/><circle class="scene-ring" cx="600" cy="220" r="40"/><path class="scene-arc" d="M430 260 A180 180 0 0 1 770 260"/><path class="scene-arc" d="M330 300 A280 280 0 0 1 870 300"/><path class="scene-arc" d="M230 350 A380 380 0 0 1 970 350"/>`,
    portals: `<path class="scene-line" d="M180 220 H420 V460 H180 Z M500 160 H760 V400 H500 Z M820 240 H1080 V500 H820 Z M420 340 H500 M760 280 H820"/>${dot("M200 340 H500", "#ff8a3d", "6s")}${dot("M760 280 H900", "#3ad7f5", "7s")}`
  };
  return `<div class="scene scene-${key}" aria-hidden="true"><svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">${art[key] || art.home}</svg></div>`;
}

function home() {
  const portals = (DATA.tiles || []).find((item) => item.id === "portals");
  const cards = (DATA.tiles || []).filter((item) => item.id !== "portals");
  return `
    <div class="desk">
      <aside class="side">
        <div class="brand">
          <button class="menu-toggle" type="button" data-menu aria-label="Expand or collapse the menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
          <img src="assets/ndma-logo.png" alt="National Disaster Management Authority" />
          <div><h1>${esc(DATA.brand.title)}</h1><p>${esc(DATA.brand.line)}</p></div>
        </div>
        <nav class="nav">${DATA.nav.map((item) => `<button type="button" data-open="${esc(item.id)}" title="${esc(item.id === "wing" ? "Home" : item.label)}">${navIcon(item.id)}<span>${esc(item.id === "wing" ? "Home" : item.label)}</span></button>`).join("")}</nav>
        <div class="side-promo"><b>Building a Resilient Pakistan</b></div>
        <a class="side-admin" href="admin.html">Admin</a>
      </aside>
      <div class="stage main">
        <header class="command">
          <label class="finder">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
            <input id="finder" type="search" placeholder="Search modules, resources, districts, infrastructure..." autocomplete="off" />
            <kbd>Ctrl + K</kbd>
          </label>
          <span class="bell" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z"/><path d="M10 19a2 2 0 0 0 4 0"/></svg></span>
          <div class="clockbox"><i></i><div><b id="clock">--:--:--</b><span>Islamabad</span></div></div>
        </header>
        <section class="banner">
          <img class="banner-bg" src="assets/home/hero-landscape.jpg" alt="" />
          <div class="banner-copy">
            <h2>Infrastructure for a <span>Resilient Pakistan</span></h2>
            <p class="banner-line">Every <b>$1</b> put into stronger roads, bridges, and buildings saves <b>$6</b> when disaster hits.</p>
            <div class="banner-pills">
              <span>${navIcon("audit")}Roads &amp; bridges</span>
              <span>${navIcon("mandate")}Schools &amp; housing</span>
              <span>${navIcon("hubs")}Stocked hubs</span>
              <span>${navIcon("drim")}Ready before impact</span>
            </div>
          </div>
          <figure class="banner-map">
            ${window.pakistanMap ? window.pakistanMap(null, false) : ""}
            <figcaption>Safe Infrastructure<br>Stronger Communities<br>Resilient Pakistan.</figcaption>
          </figure>
        </section>
        ${pictureRail()}
        <div class="home-grid" id="home-grid">
          ${cards.map((item) => homeCard(item, false)).join("")}
          ${portals ? homeCard(portals, true) : ""}
        </div>
        ${wingLink()}
        <div class="skyline" aria-hidden="true">
          <svg viewBox="0 0 1200 90" preserveAspectRatio="none">
            <path class="sky-bridge" d="M40 62 V38 H150 V62 M70 38 V24 H120 V38 M430 62 C500 28 620 28 690 62 M900 62 V34 H1080 V62 M940 34 V18 H1040 V34" />
            <path class="sky-build" d="M180 62 V40 H210 V28 H240 V62z" />
            <path class="sky-build b" d="M250 62 V32 H290 V62z" />
            <path class="sky-build c" d="M760 62 V36 H800 V22 H830 V62z" />
            <path class="sky-road" d="M0 70 H1200" />
            <path class="sky-dash" d="M0 70 H1200" />
          </svg>
          <svg class="sky-run" viewBox="0 0 36 16" width="36" height="16"><rect class="sky-vehicle" x="2" y="4" width="32" height="10" rx="2"/><circle cx="10" cy="14" r="2" fill="#0b1720"/><circle cx="26" cy="14" r="2" fill="#0b1720"/></svg>
        </div>
      </div>
      <button class="quick" type="button" data-quick>Quick Access</button>
    </div>
    <div id="modal" class="modal" role="dialog" aria-modal="true">
      <div class="sheet">
        <div id="page-scene"></div>
        <div class="sheet-h"><h2 id="modal-title"></h2><div class="frame-actions"><span id="modal-actions"></span><button class="btn coral" type="button" data-close>Close</button></div></div>
        <div id="modal-body"></div>
      </div>
    </div>`;
}

function provinceBars() {
  return `<div class="vwrap"><div class="vbars"><div class="yaxis"><span>100</span><span>50</span><span>0</span></div>${DATA.regions.map((r) => `<div class="vbar"><div class="vn" style="color:${r.color}">${r.net}</div><div class="vtrack"><i class="vfill" style="--h:${r.net}%;--c:${r.color}"></i></div><div class="vl">${esc(r.name)}</div></div>`).join("")}</div></div>`;
}

function heatmap() {
  const heads = DATA.regions.map((r) => `<div class="hh" style="color:${r.color}">${esc(r.name)}</div>`).join("");
  const body = DATA.attrs.map((name, i) => `<div class="hl">${esc(name)}</div>` + DATA.matrix[i].map((v, c) => {
    const tone = heatColor(v, 10);
    return `<div class="cell" data-col="${c}" style="--d:${(i * 7 + c) * 12}ms;background:${tone.bg};color:${tone.fg}">${fmt(v)}</div>`;
  }).join("")).join("");
  const nets = DATA.regions.map((r, c) => {
    const tone = heatColor(r.net, 100);
    return `<div class="cell" data-col="${c}" style="background:${tone.bg};color:${tone.fg}">${r.net}%</div>`;
  }).join("");
  return `<div class="heat-scroll"><div class="heat" id="heat"><div class="hh"></div>${heads}${body}<div class="hl">Net valuation</div>${nets}</div></div><div class="scale"><span>0</span><i></i><span>10</span></div>`;
}

const HUB_PIN = {
  gilgit: [68, 12.5],
  muzaffargarh: [54.3, 53.4],
  sukkur: [44, 69.9],
  jallozai: [56.9, 25.7]
};
function hubWhere(active) {
  if (!window.pakistanMap) return "";
  const marks = Object.keys(HUB_PIN).map((id) => {
    const hub = (DATA.hubs || []).find((item) => item.id === id);
    if (!hub) return "";
    const [x, y] = HUB_PIN[id];
    return `<button class="map-pin${active === id ? " is-on" : ""}" type="button" data-hub="${esc(id)}" style="left:${x}%;top:${y}%;--c:${hub.color}"><i></i><b>${esc(hub.name)}</b></button>`;
  }).join("");
  return `<section class="hub-where"><div class="k">Hub locations</div><h3>Where the stock stands</h3><p>Gilgit, Muzaffargarh, Sukkur, and Jalozai, placed from the coordinates used by Infra Resilience 360.</p><div class="hub-where-map">${window.pakistanMap(["sindh", "punjab", "gilgit-baltistan", "khyber-pakhtunkhwa"], false)}${marks}</div></section>`;
}
function hubViz(id) {
  if (id === "all") {
    const slices = DATA.hubs.map((h) => ({ name: h.name, value: hubTotal(h), color: h.color }));
    const rows = DATA.items.map((name, i) => ({ name, value: DATA.hubs.reduce((a, h) => a + Number(h.stock[i] || 0), 0), color: "#1ec87a" })).filter((r) => r.value > 0);
    return `<article class="card pad hub-panel"><div class="k">Share of stock</div><h3>Units by hub</h3>${donut(slices, fmt(totalUnits()), "Units")}</article><article class="card pad hub-panel"><div class="k">On hand</div><h3>Stock by item</h3>${hBars(rows)}</article>`;
  }
  const hub = DATA.hubs.find((h) => h.id === id) || DATA.hubs[0];
  const slices = DATA.families.map((f) => ({ name: f.name, value: f.idx.reduce((a, i) => a + Number(hub.stock[i] || 0), 0), color: f.color }));
  const rows = DATA.items.map((name, i) => ({ name, value: Number(hub.stock[i] || 0), color: hub.color })).filter((r) => r.value > 0);
  const issue = hub.issue ? `<div class="pill" style="margin:12px 0">${esc(hub.issue)}</div>${chips(hub.issueItems)}` : "";
  return `<article class="card pad hub-panel"><div class="k">Share of stock</div><h3>${esc(hub.name)}</h3>${donut(slices, fmt(hubTotal(hub)), hub.name)}${issue}</article><article class="card pad hub-panel"><div class="k">On hand</div><h3>Stock by item</h3>${hBars(rows)}</article>`;
}

function gbBlock() {
  return `<div class="gb">${DATA.field.rows.map((r) => {
    const max = Math.max(r.a, r.b);
    const delta = Math.round(((r.b - r.a) / r.a) * 100);
    return `<div><div class="two"><b>${esc(r.name)}</b><span class="delta">${delta}%</span></div><div class="pairbars"><div class="barline"><span>2025</span><div class="track"><i class="fill" style="--w:${(r.a / max) * 100}%;--c:#ff9f43"></i></div><em>${fmt(r.a)}</em></div><div class="barline"><span>2026</span><div class="track"><i class="fill" style="--w:${(r.b / max) * 100}%;--c:#3ad7f5"></i></div><em>${fmt(r.b)}</em></div></div></div>`;
  }).join("")}</div>`;
}

function modalBody(id) {
  return sectionBody(id);
}

function sectionBody(id) {
  if (id === "mandate") return wingStage("mandate") + mandatePage();
  if (id === "audit") {
    return `${wingStage("audit")}<div class="badges">${DATA.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>
      <article class="card pad"><div class="k">Net valuation</div>${provinceBars()}</article>
      <article class="card pad" style="margin-top:14px"><div class="switch" id="regSwitch"><button class="btn cyan is-on" type="button" data-region="all">All regions</button>${DATA.regions.map((r) => `<button class="btn ghost" type="button" data-region="${r.id}">${esc(r.name)}</button>`).join("")}</div>${heatmap()}</article>
      ${chainFlow("How an audit moves", DATA.process)}
      <div class="chips" style="margin-top:14px">${DATA.objectives.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
  }
  if (id === "drim") {
    const d = DATA.drim;
    return `<div class="stats cols-4"><article class="card stat" style="--accent:#ff9f43"><strong>${d.count}</strong><em>DRIM</em></article><article class="card stat" style="--accent:#1ec87a"><strong>${d.time[0]}–${d.time[1]}%</strong><em>Faster</em></article><article class="card stat" style="--accent:#f0c14b"><strong>${d.cost[0]}–${d.cost[1]}%</strong><em>Cost saved</em></article><article class="card stat" style="--accent:#3ad7f5"><strong>All</strong><em>${esc(d.coverage)}</em></article></div>
      <article class="card pad" style="margin-top:14px">${chips(d.hazards)}<div class="range"><div class="range-lab"><span>Time saved</span><b>${d.time[0]}–${d.time[1]}%</b></div><div class="range-track"><i style="--a:${d.time[0]}%;--b:${d.time[1]}%;--c:#1ec87a"></i></div></div><div class="range"><div class="range-lab"><span>Cost saved</span><b>${d.cost[0]}–${d.cost[1]}%</b></div><div class="range-track"><i style="--a:${d.cost[0]}%;--b:${d.cost[1]}%;--c:#f0c14b"></i></div></div></article>
      ${drimShowcase()}
      ${wingStage("drim")}
      <div class="models" style="margin-top:14px">${d.zones.map((z) => `<article class="card model" style="--accent:${z.color}"><h3>${esc(z.name)}</h3>${chips(z.models)}</article>`).join("")}</div>
      <div class="grid-2" style="margin-top:14px"><article class="card pad" style="--accent:#b08cff"><div class="k">Publications</div>${chips(d.publications)}</article><article class="card pad" style="--accent:#6aa4ff"><div class="k">Building Code of Pakistan</div>${chips(d.codes)}</article></div>`;
  }
  if (id === "hubs") {
    const active = state.hub;
    const photo = (hub) => HUB_PHOTO[hub.id] ? hubMedia(HUB_PHOTO[hub.id]) : "";
    const chosen = DATA.hubs.find((hub) => hub.id === active);
    const shots = DATA.hubs.map((hub) => {
      const src = photo(hub);
      const media = src ? `<img src="${esc(src)}" alt="" />` : `<span class="hub-fallback" style="--c:${hub.color}">${esc(hub.name.slice(0, 1))}</span>`;
      return `<button class="hub-shot${active === hub.id ? " is-on" : ""}" type="button" data-hub="${esc(hub.id)}">${media}<span class="hub-shot-copy"><b>${esc(hub.name)}</b><em>${esc(hub.region)}</em><strong>${fmt(hubTotal(hub))} units</strong></span></button>`;
    }).join("");
    const one = (hub) => {
      const src = photo(hub);
      const picture = src ? `<img src="${esc(src)}" alt="" />` : `<span class="hub-fallback" style="--c:${hub.color}">${esc(hub.name.slice(0, 1))}</span>`;
      return `<figure class="hub-hero hub-one">${picture}<figcaption><em>${esc(hub.region)}</em><strong>${esc(hub.name)} Material Hub</strong><span>${fmt(hubTotal(hub))} units</span></figcaption></figure>`;
    };
    const side = chosen ? one(chosen) : `<div class="hub-row">${shots}</div>`;
    return `<div class="switch" id="hubSwitch"><button class="btn ${active === "all" ? "violet is-on" : "ghost"}" type="button" data-hub="all">All hubs</button>${DATA.hubs.map((h) => `<button class="btn ${active === h.id ? "violet is-on" : "ghost"}" type="button" data-hub="${h.id}">${esc(h.name)}</button>`).join("")}</div><div class="hub-top">${hubWhere(active)}<div class="hub-gallery">${side}</div></div><div class="hub-stats" id="hubViz">${hubViz(active)}</div>`;
  }
  if (id === "app360") {
    const app = DATA.app360 || { link: "", cards: [], interfaces: [] };
    const href = safeUrl(app.link);
    const faces = app.interfaces || [];
    const face = (item) => `<img class="phone" src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`;
    const moving = faces.length ? `<div class="reel app-reel"><div class="reel-track">${faces.map(face).join("")}${faces.map(face).join("")}</div></div>` : "";
    const cards = (app.cards && app.cards.length ? app.cards : DATA.modules).map((m) => `<article class="card pad" style="--accent:${m.color}"><h3>${esc(m.title)}</h3>${m.line ? `<p class="muted">${esc(m.line)}</p>` : ""}</article>`).join("");
    const open = href ? `<a class="portal-open" data-tab href="${esc(href)}" target="_blank" rel="noopener noreferrer" style="--accent:#6aa4ff">Open Infra APP</a>` : "";
    return `${wingStage("app360")}<div class="portal-actions">${open}</div>${moving}<div class="grid-6 mod-grid" style="margin-top:14px">${cards}</div><div class="pills" style="margin-top:14px">${DATA.users.map((u) => `<span class="pill">${esc(u)}</span>`).join("")}</div>`;
  }
  if (id === "field") {
    const f = DATA.field;
    return `${wingStage("field")}<div class="grid-2"><article class="card pad"><div class="k">Monsoon damage</div><h3>2025 and 2026</h3>${gbBlock()}</article><article class="card pad"><div class="k">Districts visited</div><ul class="list">${f.districts.map((d) => `<li><b>${esc(d.name)}</b>${d.detail ? `<span>${esc(d.detail)}</span>` : ""}</li>`).join("")}</ul></article></div>
      <article class="card pad" style="margin-top:14px"><div class="k">Recommended measures</div>${chips(f.measures)}</article>
      ${pairFlow("Vision 2027", ["Urban flood resilience"], "Taken up by", f.vision, f.vision.map((_, index) => [0, index]))}
      ${chainFlow("Verification chain", f.chain)}
      ${pairFlow("Residential damage", f.residential.causes, "What to change", f.residential.recommendations, [[0, 0], [1, 1]])}
      ${pairFlow("Communication damage", f.communication.causes, "What to change", f.communication.recommendations, [[0, 0], [1, 1], [2, 2]])}`;
  }
  if (id === "seminars") {
    const max = Math.max(...DATA.seminars.map((s) => Number(s.n)), 1);
    const colors = { 2024: "#f0c14b", 2025: "#3ad7f5", 2026: "#1ec87a" };
    const years = [2024, 2025, 2026].map((y) => ({ name: String(y), value: DATA.seminars.filter((s) => Number(s.y) === y).reduce((a, s) => a + Number(s.n), 0), color: colors[y] }));
    return `${wingStage("seminars")}<div class="grid-2"><article class="card pad"><div class="k">Participants</div><h3>${fmt(seminarTotal())}</h3>${DATA.seminars.map((s) => `<div class="sem-row"><span>${esc(s.d)}</span><div class="meta"><strong>${esc(s.t)}</strong><span>${esc(s.loc)}</span><div class="track" style="margin-top:4px"><i class="fill" style="--w:${(s.n / max) * 100}%;--c:${colors[s.y] || "#1ec87a"}"></i></div></div><em class="delta">${s.n}</em></div>`).join("")}</article><article class="card pad"><div class="k">By year</div>${donut(years, fmt(seminarTotal()), "People")}</article></div>`;
  }
  if (id === "response") {
    return `<div class="grid-6 steps-grid">${DATA.response.map((item, i) => `<article class="card step" style="--accent:${item.color}"><b class="n">${String(i + 1).padStart(2, "0")}</b><div>${esc(item.title)}</div></article>`).join("")}</div>`;
  }
  if (id === "advisories") return wingStage("advisories") + advisoryShelf();
  if (id === "portals") return portalPages(DATA.portals);
  return "";
}

function wingName(show) {
  return `<div class="wing-name${show ? " is-on" : ""}"><img src="assets/ndma-logo.png" alt="" /><h2>INFRA WING</h2></div>`;
}

function frameTab(url) {
  const href = safeUrl(url);
  if (!href) return "";
  return `<a class="btn cyan" data-tab href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open in another tab</a>`;
}

function frameStage() {
  return "";
}
function setFrameActions(url) {
  const slot = document.getElementById("modal-actions");
  if (slot) slot.innerHTML = url ? frameTab(url) : "";
}
const PORTAL_FILM = {
  "PRIA Portal": "PRIA",
  "Infra APP": "Resilience 360",
  "Structural health monitoring": "Structural health monitoring"
};
function portalFilm(title) {
  const name = PORTAL_FILM[title];
  if (!name) return "";
  const hit = wingMedia.find((item) => item.kind === "video" && item.title === name);
  return hit ? hit.url : "";
}
function portalCard(portal) {
  const href = safeUrl(portal.url);
  const film = portalFilm(portal.title);
  const intro = (portal.items || []).filter(Boolean).join(". ");
  const media = film
    ? filmTag(film)
    : `<div class="portal-miss"><b>Not available</b><span>No film for this portal is on the disk or in the buckets.</span></div>`;
  const button = href ? `<a class="portal-open" data-tab href="${esc(href)}" target="_blank" rel="noopener noreferrer">Open in another page</a>` : "";
  return `<article class="portal-card" style="--accent:${esc(portal.color || "#ff8a3d")}"><div class="portal-media">${media}</div><div class="portal-copy"><h3>${esc(portal.title)}</h3><p>${esc(intro)}</p>${button}</div></article>`;
}
function portalPages(list) {
  const rows = (list || []).slice();
  if (!rows.some((item) => /structural health/i.test(item.title))) {
    rows.push({
      title: "Structural health monitoring",
      color: "#ff8a3d",
      url: "",
      items: ["Structural health of buildings and bridges", "Screen tour saved from the wing drive"]
    });
  }
  return `<div class="portal-stack">${rows.map(portalCard).join("")}</div>`;
}

function diskMedia(url) {
  const mark = "/api/media/";
  const text = String(url || "");
  const at = text.indexOf(mark);
  if (at < 0) return "";
  return "media/" + text.slice(at + mark.length).split("?")[0];
}
function retryDisk(video) {
  if (video.dataset.disk) return false;
  const next = diskMedia(video.getAttribute("src") || video.currentSrc || "");
  if (!next) return false;
  video.dataset.disk = "1";
  video.src = next;
  const play = video.play();
  if (play && play.catch) play.catch(() => {});
  return true;
}
function watchFrames(root) {
  (root || document).querySelectorAll("video").forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    if (video.closest("[data-card-play]")) return;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    const play = video.play();
    if (play && play.catch) play.catch(() => {});
    if (video.dataset.watched) return;
    video.dataset.watched = "1";
    video.addEventListener("error", () => {
      if (retryDisk(video)) return;
      const miss = video.parentElement && video.parentElement.querySelector(".portal-miss");
      if (miss || (video.nextElementSibling && video.nextElementSibling.classList.contains("video-miss"))) return;
      const note = document.createElement("p");
      note.className = "video-miss";
      note.textContent = "This video did not load.";
      video.insertAdjacentElement("afterend", note);
    });
  });
}

function openFrame(url, title) {
  const href = safeUrl(url);
  if (!href) return;
  if (!state.frame) state.frameFrom = state.open || "";
  state.frame = { url: href, title: title || "Portal" };
  const modal = document.getElementById("modal");
  const sheet = modal.querySelector(".sheet");
  document.getElementById("modal-title").textContent = state.frame.title;
  setFrameActions(href);
  document.getElementById("modal-body").innerHTML = frameStage(href, state.frame.title, "full");
  sheet.classList.add("is-wide");
  modal.classList.add("is-on");
  document.body.style.overflow = "hidden";
  watchFrames(document.getElementById("modal-body"));
  markNav();
}

function closeFrame() {
  const back = state.frameFrom || "";
  state.frame = null;
  state.frameFrom = "";
  state.open = back;
  setFrameActions("");
  paintModal();
}

function advisoryShelf() {
  const books = DATA.advisories || [];
  const kinds = ["all", "Advisory", "Publication"];
  const labels = { all: "All", Advisory: "Advisories", Publication: "Publications" };
  const shown = books.map((book, index) => ({ book, index })).filter((item) => state.kind === "all" || item.book.kind === state.kind);
  return `<div class="switch">${kinds.map((kind) => `<button class="btn ${state.kind === kind ? "gold is-on" : "ghost"}" type="button" data-kind="${kind}">${labels[kind]}</button>`).join("")}</div>
    <div class="shelf">${shown.map(({ book, index }) => `<article class="tome" data-book="${index}" style="--accent:${book.color}"><img src="${esc(book.cover)}" alt="" /><div class="tome-copy"><b>${esc(book.kind)}</b><h3>${esc(book.title)}</h3><p>${esc(book.line)}</p><p>${esc(book.line2)}</p></div></article>`).join("")}</div>`;
}

function releaseBook() {
  bookDoc = null;
  bookPage = 1;
  if (bookTask) {
    try { bookTask.destroy(); } catch (error) { /* already closed */ }
    bookTask = null;
  }
}

async function paintPage(num) {
  if (!bookDoc) return;
  const total = bookDoc.numPages;
  num = Math.max(1, Math.min(total, num));
  const token = num;
  bookPage = num;
  const canvas = document.getElementById("book-page");
  if (!canvas) return;
  const page = await bookDoc.getPage(num);
  if (bookPage !== token) return;
  const base = page.getViewport({ scale: 1 });
  const view = page.getViewport({ scale: 1200 / base.width });
  canvas.width = view.width;
  canvas.height = view.height;
  await page.render({ canvasContext: canvas.getContext("2d"), viewport: view }).promise;
  const count = document.getElementById("book-count");
  const range = document.getElementById("book-range");
  if (count) count.textContent = num + " / " + total;
  if (range) range.value = String(num);
}

function turnPage(dir) {
  if (!bookDoc || bookBusy) return;
  const next = bookPage + dir;
  if (next < 1 || next > bookDoc.numPages) return;
  const paper = document.getElementById("paper");
  if (!paper || reduce) {
    paintPage(next);
    return;
  }
  bookBusy = true;
  paper.classList.add(dir > 0 ? "leaving-next" : "leaving-prev");
  paper.addEventListener("animationend", async function once() {
    paper.removeEventListener("animationend", once);
    await paintPage(next);
    paper.classList.remove("leaving-next", "leaving-prev");
    paper.classList.add("arriving");
    paper.addEventListener("animationend", function done() {
      paper.classList.remove("arriving");
      paper.removeEventListener("animationend", done);
      bookBusy = false;
    }, { once: true });
  }, { once: true });
}

async function openBook(index) {
  const item = (DATA.advisories || [])[index];
  if (!item) return;
  openDoc(item.file, item.title, index);
}

async function openDoc(file, title, mark) {
  if (!file || !window.pdfjsLib) return;
  releaseBook();
  stopModelShow();
  state.book = mark == null ? 0 : mark;
  setFrameActions("");
  document.getElementById("modal-title").textContent = title || "Guide";
  document.getElementById("modal-body").innerHTML = `<div class="bookbar"><button class="btn ghost" type="button" data-shelf>Shelf</button><button class="btn gold" type="button" data-turn="-1">Previous</button><span id="book-count">Opening</span><button class="btn gold" type="button" data-turn="1">Next</button></div><div class="bookstage"><div class="paper" id="paper"><canvas id="book-page"></canvas></div></div><input id="book-range" type="range" min="1" max="1" value="1" />`;
  const range = document.getElementById("book-range");
  range.oninput = () => { if (!bookBusy) paintPage(Number(range.value)); };
  pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
  const token = state.book;
  try {
    bookTask = pdfjsLib.getDocument(file);
    bookDoc = await bookTask.promise;
  } catch (error) {
    const count = document.getElementById("book-count");
    if (count) count.textContent = "Could not open";
    return;
  }
  if (state.book !== token) return;
  range.max = String(bookDoc.numPages);
  await paintPage(1);
}

function markNav() {
  document.querySelectorAll(".nav button").forEach((btn) => {
    const id = btn.dataset.open;
    btn.classList.toggle("active", state.open ? id === state.open : id === "wing");
  });
}

function paintModal() {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  setFrameActions("");
  stopModelShow();
  const scene = document.getElementById("page-scene");
  if (!state.open) {
    if (scene) scene.innerHTML = "";
    modal.classList.remove("is-on");
    document.body.style.overflow = "";
    markNav();
    return;
  }
  const tile = (DATA.tiles || []).find((t) => t.id === state.open) || (DATA.nav || []).find((t) => t.id === state.open);
  document.getElementById("modal-title").textContent = tile ? tile.title || tile.label : state.open;
  if (scene) scene.innerHTML = "";
  body.innerHTML = modalBody(state.open);
  body.classList.add("inview");
  modal.classList.add("is-on");
  document.body.style.overflow = "hidden";
  const sheet = modal.querySelector(".sheet");
  if (sheet) sheet.classList.toggle("is-wide", state.open === "app360" || state.open === "portals" || state.open === "drim" || state.open === "mandate" || state.open === "hubs");
  playDonuts(body);
  runCounters(body);
  watchFrames(body);
  requestAnimationFrame(() => paintFlows(body));
  markNav();
  if (state.open === "drim" && state.book == null) {
    showModel(0);
    startModelShow();
  }
}

function openPanel(id) {
  state.book = null;
  state.frame = null;
  releaseBook();
  if (id === "wing") state.open = "";
  else state.open = state.open === id ? "" : id;
  paintModal();
}

function tickClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date());
}

function bind() {
  const finder = document.getElementById("finder");
  if (finder) {
    finder.addEventListener("input", () => {
      const q = finder.value.trim().toLowerCase();
      document.querySelectorAll("[data-home-card]").forEach((card) => {
        card.hidden = Boolean(q) && !String(card.dataset.find || "").includes(q);
      });
    });
  }
  document.body.addEventListener("click", (e) => {
    const menu = e.target.closest("[data-menu]");
    if (menu) {
      document.body.classList.toggle("menu-slim");
      localStorage.setItem("wing-menu", document.body.classList.contains("menu-slim") ? "slim" : "open");
      return;
    }
    if (e.target.closest("[data-quick]")) {
      const grid = document.getElementById("home-grid");
      if (grid) grid.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      return;
    }
    const tab = e.target.closest("a[data-tab], a.portal-open");
    if (tab) {
      const href = safeUrl(tab.getAttribute("href"));
      if (!href) {
        e.preventDefault();
        return;
      }
      tab.setAttribute("href", href);
      tab.setAttribute("target", "_blank");
      tab.setAttribute("rel", "noopener noreferrer");
      return;
    }
    const clip = e.target.closest("[data-clip]");
    if (clip && clip.dataset.clip) {
      const video = clip.closest(".wing-stage") && clip.closest(".wing-stage").querySelector("video");
      if (video) {
        video.src = clip.dataset.clip;
        const play = video.play();
        if (play && play.catch) play.catch(() => {});
      }
      clip.parentElement.querySelectorAll("[data-clip]").forEach((button) => {
        button.classList.toggle("gold", button === clip);
        button.classList.toggle("ghost", button !== clip);
      });
      return;
    }
    const opener = e.target.closest("[data-open]");
    if (opener && opener.dataset.open) {
      openPanel(opener.dataset.open);
      return;
    }
    const frameBtn = e.target.closest("[data-frame]");
    if (frameBtn && frameBtn.dataset.frame) {
      const href = safeUrl(frameBtn.dataset.frame);
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    const docBtn = e.target.closest("[data-doc]");
    if (docBtn && docBtn.dataset.doc) {
      openDoc(docBtn.dataset.doc, docBtn.dataset.title);
      return;
    }
    const modelBtn = e.target.closest("[data-model]");
    if (modelBtn) {
      showModel(Number(modelBtn.dataset.model));
      startModelShow();
      return;
    }
    const bookBtn = e.target.closest("[data-book]");
    if (bookBtn) {
      openBook(Number(bookBtn.dataset.book));
      return;
    }
    const kindBtn = e.target.closest("[data-kind]");
    if (kindBtn) {
      state.kind = kindBtn.dataset.kind;
      paintModal();
      return;
    }
    if (e.target.closest("[data-shelf]")) {
      state.book = null;
      releaseBook();
      paintModal();
      return;
    }
    const turn = e.target.closest("[data-turn]");
    if (turn) {
      turnPage(Number(turn.dataset.turn));
      return;
    }
    if (e.target.id === "book-page") {
      const box = e.target.getBoundingClientRect();
      turnPage(e.clientX > box.left + box.width / 2 ? 1 : -1);
      return;
    }
    if (e.target.closest("[data-close]") || e.target.id === "modal") {
      if (state.frame) {
        closeFrame();
        return;
      }
      state.open = "";
      state.book = null;
      releaseBook();
      paintModal();
      return;
    }
    const hub = e.target.closest("[data-hub]");
    if (hub) {
      state.hub = hub.dataset.hub;
      paintModal();
      return;
    }
    const region = e.target.closest("[data-region]");
    if (region) {
      state.region = region.dataset.region;
      document.querySelectorAll("[data-region]").forEach((btn) => {
        const on = btn.dataset.region === state.region;
        btn.classList.toggle("is-on", on);
        btn.classList.toggle("ghost", !on);
        btn.classList.toggle("cyan", on);
      });
      const heat = document.getElementById("heat");
      if (!heat) return;
      heat.classList.toggle("is-filter", state.region !== "all");
      const idx = DATA.regions.findIndex((r) => r.id === state.region);
      heat.querySelectorAll(".cell").forEach((cell) => cell.classList.toggle("on", state.region !== "all" && Number(cell.dataset.col) === idx));
    }
  });
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      const box = document.getElementById("finder");
      if (box) {
        e.preventDefault();
        box.focus();
      }
    }
    if (e.key === "Escape" && state.book != null) {
      state.book = null;
      releaseBook();
      paintModal();
      return;
    }
    if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && state.book != null) {
      turnPage(e.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (e.key === "Escape" && state.frame) {
      closeFrame();
      return;
    }
    if (e.key === "Escape" && state.open) {
      state.open = "";
      releaseBook();
      paintModal();
    }
  });
  const main = document.querySelector(".main");
  if (!main) return;
  main.addEventListener("pointermove", (e) => {
    const card = e.target.closest(".tilt");
    if (!card || reduce) return;
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    card.style.transform = `perspective(900px) rotateX(${(0.5 - py) * 8}deg) rotateY(${(px - 0.5) * 10}deg) translateY(-3px)`;
  });
  main.addEventListener("pointerout", (e) => {
    const card = e.target.closest(".tilt");
    if (card && !card.contains(e.relatedTarget)) card.style.transform = "";
  });
}

async function loadContent() {
  const base = apiBase();
  try {
    const live = await fetch(`${base}/api/content`);
    if (live.ok) return live.json();
  } catch (error) {
    /* local file fallback */
  }
  const file = await fetch("server/data/content.json");
  if (!file.ok) throw new Error("content missing");
  return file.json();
}

function startPhotoPlay(box, urls) {
  if (!box || !urls.length) return;
  const frames = [...box.querySelectorAll("img")];
  if (frames.length < 2 || urls.length < 2 || reduce) {
    if (frames[0]) frames[0].src = urls[0];
    return;
  }
  let n = 0;
  frames[0].src = urls[0];
  frames[0].classList.add("is-on");
  frames[1].src = urls[1];
  setInterval(() => {
    if (!box.isConnected) return;
    n = (n + 1) % urls.length;
    const show = frames[n % 2];
    const hide = frames[(n + 1) % 2];
    show.src = urls[n];
    show.classList.add("is-on");
    hide.classList.remove("is-on");
    setTimeout(() => {
      if (hide.isConnected) hide.src = urls[(n + 1) % urls.length];
    }, 1200);
  }, 3400);
}
function startCardShows() {
  document.querySelectorAll("[data-card-play]").forEach((box, index) => {
    const list = cardPlaylist(box.dataset.cardPlay);
    const frames = [...box.querySelectorAll("img")];
    const video = box.querySelector("video");
    if (!list.length || frames.length < 2) return;
    if (reduce) {
      const photo = list.find((entry) => entry.type === "image");
      if (photo) frames[0].src = photo.url;
      return;
    }
    let n = 0;
    let flip = 0;
    let token = 0;
    const show = () => {
      if (!box.isConnected) return;
      const mine = ++token;
      const item = list[n % list.length];
      const advance = () => {
        if (mine !== token || !box.isConnected) return;
        n = (n + 1) % list.length;
        show();
      };
      if (item.type === "video" && video && !reduce) {
        frames.forEach((img) => img.classList.remove("is-on"));
        video.classList.add("is-on");
        video.muted = true;
        video.defaultMuted = true;
        video.volume = 0;
        video.playsInline = true;
        video.onended = advance;
        video.onerror = () => {
          if (retryDisk(video)) return;
          advance();
        };
        video.src = item.url;
        const play = video.play();
        if (play && play.catch) play.catch(() => {});
        window.setTimeout(advance, 9000);
        return;
      }
      if (video) {
        video.pause();
        video.classList.remove("is-on");
        video.onended = null;
        video.onerror = null;
      }
      const showImg = frames[flip % 2];
      const hideImg = frames[(flip + 1) % 2];
      flip += 1;
      showImg.onerror = () => {
        const next = diskMedia(showImg.src);
        if (next && showImg.dataset.disk !== next) {
          showImg.dataset.disk = next;
          showImg.src = next;
          return;
        }
        if (mine === token) advance();
      };
      showImg.src = item.url;
      showImg.classList.add("is-on");
      hideImg.classList.remove("is-on");
      if (list.length > 1 && !reduce) window.setTimeout(advance, 3400);
    };
    window.setTimeout(show, index * 500);
  });
}
async function loadWingMedia() {
  const diskFor = (item) => {
    if (item.key) {
      const disk = "media/" + item.key;
      if (WING_FILES.some((file) => file.url === disk)) return disk;
    }
    return WING_FILES.find((file) => file.id === item.id && file.kind === item.kind && file.title === item.title);
  };
  try {
    const res = await fetch(apiBase() + "/api/wing-media");
    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items) || !items.length) return;
    const base = apiBase();
    const merged = [];
    const seen = new Set();
    items.forEach((item) => {
      const known = diskFor(item);
      const url = known ? (known.url || known) : (item.key ? `${base}/api/media/${item.key}` : "");
      const mark = item.key || url;
      if (!url || seen.has(mark)) return;
      seen.add(mark);
      merged.push({ id: item.id, title: item.title, kind: item.kind, key: item.key || "", url });
    });
    WING_FILES.forEach((file) => {
      if (!merged.some((item) => item.url === file.url)) merged.push(file);
    });
    if (merged.length) wingMedia = merged;
  } catch (error) {
    wingMedia = WING_FILES;
  }
}
async function boot() {
  if (localStorage.getItem("wing-menu") === "slim") document.body.classList.add("menu-slim");
  const [content] = await Promise.all([loadContent(), loadModels(), loadWingMedia()]);
  DATA = content;
  document.getElementById("app").innerHTML = home();
  watchFrames(document);
  bind();
  runCounters(document);
  tickClock();
  setInterval(tickClock, 1000);
  markNav();
  startDrimCard();
  startHubCard();
  startCardShows();
  window.addEventListener("resize", () => {
    window.clearTimeout(window.__flowTimer);
    window.__flowTimer = window.setTimeout(() => paintFlows(document), 140);
  });
}

boot();
