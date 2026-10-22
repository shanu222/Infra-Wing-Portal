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
  try {
    const parsed = new URL(url, location.origin);
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

function chips(list) {
  return `<div class="chips">${(list || []).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
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
  const pics = (DATA.library || []).filter((item) => item.type !== "video");
  if (!pics.length) return "";
  const frame = (item) => `<img src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`;
  const row = pics.map(frame).join("");
  return `<div class="reel home-reel">${`<div class="reel-track">${row}${row}</div>`}</div>`;
}

function clipReel(items) {
  if (!items.length) return "";
  const pics = items.filter((item) => item.type !== "video");
  const vids = items.filter((item) => item.type === "video");
  const frames = pics.map((item) => `<img src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`).join("");
  const reel = pics.length ? `<div class="reel"><div class="reel-track">${frames}${frames}</div></div>` : "";
  const players = vids.map((item) => `<video controls preload="metadata" src="${esc(absUrl(item.url))}"></video>`).join("");
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

function homeCard(item, wide) {
  const art = HOME_ART[item.id] || item.image;
  return `<article class="home-card${wide ? " wide" : ""}" data-open="${esc(item.id)}" data-home-card data-find="${esc(`${item.title} ${item.line} ${item.line2}`.toLowerCase())}"><img src="${esc(art)}" alt="" /><div class="home-card-copy"><h3>${esc(item.title)}</h3><p>${esc(item.line)}</p><p>${esc(item.line2)}</p></div><span class="home-go" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 6h10v10"/><path d="M8 16 18 6"/></svg></span></article>`;
}

function home() {
  const portals = (DATA.tiles || []).find((item) => item.id === "portals");
  const cards = (DATA.tiles || []).filter((item) => item.id !== "portals");
  const provinces = (DATA.regions || []).length || 7;
  return `
    <div class="desk">
      <aside class="side">
        <div class="brand">
          <img src="assets/ndma-logo.png" alt="National Disaster Management Authority" />
          <div><h1>${esc(DATA.brand.title)}</h1><p>${esc(DATA.brand.line)}</p></div>
        </div>
        <nav class="nav">${DATA.nav.map((item) => `<button type="button" data-open="${esc(item.id)}">${navIcon(item.id)}<span>${esc(item.id === "wing" ? "Home" : item.label)}</span></button>`).join("")}</nav>
        <div class="side-promo"><img src="assets/home/pakistan-map.jpg" alt="" /><b>Building a Resilient Pakistan</b></div>
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
            <p>Strengthening infrastructure, enhancing resilience, and building safer communities across Pakistan.</p>
            <div class="banner-pills">
              <span>${navIcon("audit")}${provinces} Provinces</span>
              <span>${navIcon("mandate")}Integrated Planning</span>
              <span>${navIcon("drim")}Disaster Resilience</span>
              <span>${navIcon("portals")}Sustainable Development</span>
            </div>
          </div>
          <figure class="banner-map">
            <img src="assets/home/pakistan-map.jpg" alt="Map of Pakistan" />
            <figcaption>Safe Infrastructure<br>Stronger Communities<br>Resilient Pakistan.</figcaption>
          </figure>
        </section>
        <div class="home-grid" id="home-grid">
          ${cards.map((item) => homeCard(item, false)).join("")}
          ${portals ? homeCard(portals, true) : ""}
        </div>
        <div class="skyline" aria-hidden="true"></div>
      </div>
      <button class="quick" type="button" data-quick>Quick Access</button>
    </div>
    <div id="modal" class="modal" role="dialog" aria-modal="true">
      <div class="sheet">
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

function hubViz(id) {
  if (id === "all") {
    const slices = DATA.hubs.map((h) => ({ name: h.name, value: hubTotal(h), color: h.color }));
    const rows = DATA.items.map((name, i) => ({ name, value: DATA.hubs.reduce((a, h) => a + Number(h.stock[i] || 0), 0), color: "#1ec87a" })).filter((r) => r.value > 0);
    return `${donut(slices, fmt(totalUnits()), "Units")}<div style="margin-top:16px">${hBars(rows)}</div>`;
  }
  const hub = DATA.hubs.find((h) => h.id === id) || DATA.hubs[0];
  const slices = DATA.families.map((f) => ({ name: f.name, value: f.idx.reduce((a, i) => a + Number(hub.stock[i] || 0), 0), color: f.color }));
  const rows = DATA.items.map((name, i) => ({ name, value: Number(hub.stock[i] || 0), color: hub.color })).filter((r) => r.value > 0);
  const issue = hub.issue ? `<div class="pill" style="margin:12px 0">${esc(hub.issue)}</div>${chips(hub.issueItems)}` : "";
  return `${donut(slices, fmt(hubTotal(hub)), hub.name)}${issue}<div style="margin-top:16px">${hBars(rows)}</div>`;
}

function gbBlock() {
  return `<div class="gb">${DATA.field.rows.map((r) => {
    const max = Math.max(r.a, r.b);
    const delta = Math.round(((r.b - r.a) / r.a) * 100);
    return `<div><div class="two"><b>${esc(r.name)}</b><span class="delta">${delta}%</span></div><div class="pairbars"><div class="barline"><span>2025</span><div class="track"><i class="fill" style="--w:${(r.a / max) * 100}%;--c:#ff9f43"></i></div><em>${fmt(r.a)}</em></div><div class="barline"><span>2026</span><div class="track"><i class="fill" style="--w:${(r.b / max) * 100}%;--c:#3ad7f5"></i></div><em>${fmt(r.b)}</em></div></div></div>`;
  }).join("")}</div>`;
}

function modalBody(id) {
  const clips = (DATA.library || []).filter((item) => item.place === id);
  const strip = clips.length ? clipReel(clips) : "";
  return strip + sectionBody(id);
}

function sectionBody(id) {
  if (id === "mandate") {
    return `<div class="grid-3">${DATA.mandate.map((item, i) => `<article class="card pad" style="--accent:${item.color}"><div class="k">0${i + 1}</div><h3>${esc(item.title)}</h3></article>`).join("")}</div>
      <div class="grid-6" style="margin-top:14px">${DATA.classes.map((item) => `<article class="card pad" style="--accent:${item.color}"><div class="k">${esc(item.title)}</div><h3>${esc(item.line)}</h3></article>`).join("")}</div>
      <div class="grid-2" style="margin-top:14px"><article class="card pad" style="--accent:#3ad7f5"><div class="k">Pre-disaster</div>${chips(DATA.pre)}</article><article class="card pad" style="--accent:#ff6d6d"><div class="k">Post-disaster</div>${chips(DATA.post)}</article></div>
      <div class="grid-2" style="margin-top:14px"><article class="card pad" style="--accent:#ff6d6d"><div class="k">Exposed</div>${chips(DATA.exposed)}</article><article class="card pad" style="--accent:#1ec87a"><div class="k">Built to survive</div>${chips(DATA.resilient)}</article></div>`;
  }
  if (id === "audit") {
    return `<div class="badges">${DATA.badges.map((b) => `<span class="badge">${esc(b)}</span>`).join("")}</div>
      <article class="card pad"><div class="k">Net valuation</div>${provinceBars()}</article>
      <article class="card pad" style="margin-top:14px"><div class="switch" id="regSwitch"><button class="btn cyan is-on" type="button" data-region="all">All regions</button>${DATA.regions.map((r) => `<button class="btn ghost" type="button" data-region="${r.id}">${esc(r.name)}</button>`).join("")}</div>${heatmap()}</article>
      <div class="flow" style="margin-top:14px">${DATA.process.map((t, i) => `<article class="card"><div class="n">${String(i + 1).padStart(2, "0")}</div><b>${esc(t)}</b></article>`).join("")}</div>
      <div class="chips" style="margin-top:14px">${DATA.objectives.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
  }
  if (id === "drim") {
    const d = DATA.drim;
    return `<div class="stats cols-4"><article class="card stat" style="--accent:#ff9f43"><strong>${d.count}</strong><em>DRIM</em></article><article class="card stat" style="--accent:#1ec87a"><strong>${d.time[0]}–${d.time[1]}%</strong><em>Faster</em></article><article class="card stat" style="--accent:#f0c14b"><strong>${d.cost[0]}–${d.cost[1]}%</strong><em>Cost saved</em></article><article class="card stat" style="--accent:#3ad7f5"><strong>All</strong><em>${esc(d.coverage)}</em></article></div>
      <article class="card pad" style="margin-top:14px">${chips(d.hazards)}<div class="range"><div class="range-lab"><span>Time saved</span><b>${d.time[0]}–${d.time[1]}%</b></div><div class="range-track"><i style="--a:${d.time[0]}%;--b:${d.time[1]}%;--c:#1ec87a"></i></div></div><div class="range"><div class="range-lab"><span>Cost saved</span><b>${d.cost[0]}–${d.cost[1]}%</b></div><div class="range-track"><i style="--a:${d.cost[0]}%;--b:${d.cost[1]}%;--c:#f0c14b"></i></div></div></article>
      <div class="models" style="margin-top:14px">${d.zones.map((z) => `<article class="card model" style="--accent:${z.color}"><h3>${esc(z.name)}</h3>${chips(z.models)}</article>`).join("")}</div>
      <div class="grid-2" style="margin-top:14px"><article class="card pad" style="--accent:#b08cff"><div class="k">Publications</div>${chips(d.publications)}</article><article class="card pad" style="--accent:#6aa4ff"><div class="k">Building Code of Pakistan</div>${chips(d.codes)}</article></div>`;
  }
  if (id === "hubs") {
    const active = state.hub;
    return `<div class="switch" id="hubSwitch"><button class="btn ${active === "all" ? "violet is-on" : "ghost"}" type="button" data-hub="all">All hubs</button>${DATA.hubs.map((h) => `<button class="btn ${active === h.id ? "violet is-on" : "ghost"}" type="button" data-hub="${h.id}">${esc(h.name)}</button>`).join("")}</div><div id="hubViz">${hubViz(active)}</div>`;
  }
  if (id === "app360") {
    const app = DATA.app360 || { link: "", cards: [], interfaces: [] };
    const href = safeUrl(app.link);
    const faces = app.interfaces || [];
    const face = (item) => `<img class="phone" src="${esc(absUrl(item.url))}" alt="${esc(item.title)}" />`;
    const moving = faces.length ? `<div class="reel app-reel"><div class="reel-track">${faces.map(face).join("")}${faces.map(face).join("")}</div></div>` : "";
    const cards = (app.cards && app.cards.length ? app.cards : DATA.modules).map((m) => `<article class="card pad" style="--accent:${m.color}"><h3>${esc(m.title)}</h3>${m.line ? `<p class="muted">${esc(m.line)}</p>` : ""}</article>`).join("");
    const stage = href ? `<div class="frame-bar"><div><h3>Infra APP</h3></div><div class="frame-actions"><button class="btn" type="button" data-frame="${esc(href)}" data-title="Infra APP">Open</button>${frameTab(href)}</div></div>${frameStage(href, "Infra APP")}` : wingName(true);
    return `${stage}${moving}<div class="grid-6 mod-grid" style="margin-top:14px">${cards}</div><div class="pills" style="margin-top:14px">${DATA.users.map((u) => `<span class="pill">${esc(u)}</span>`).join("")}</div>`;
  }
  if (id === "field") {
    const f = DATA.field;
    return `<div class="grid-2"><article class="card pad"><div class="k">Monsoon damage</div><h3>2025 and 2026</h3>${gbBlock()}</article><article class="card pad"><div class="k">Districts visited</div><ul class="list">${f.districts.map((d) => `<li><b>${esc(d.name)}</b>${d.detail ? `<span>${esc(d.detail)}</span>` : ""}</li>`).join("")}</ul></article></div>
      <article class="card pad" style="margin-top:14px"><div class="k">Recommended measures</div>${chips(f.measures)}</article>
      <div class="grid-2" style="margin-top:14px"><article class="card pad" style="--accent:#6aa4ff"><div class="k">Vision 2027</div><h3>Urban flood resilience</h3>${chips(f.vision)}</article><article class="card pad" style="--accent:#f0c14b"><div class="k">Verification chain</div><ul class="list">${f.chain.map((t) => `<li><b>${esc(t)}</b></li>`).join("")}</ul></article></div>
      <div class="cause" style="margin-top:14px"><article class="card pad" style="--accent:#ff6d6d"><div class="k">Residential</div><div class="stack">${f.residential.causes.map((t) => `<div>${esc(t)}</div>`).join("")}</div><div class="k" style="margin-top:12px">Recommendations</div><div class="stack">${f.residential.recommendations.map((t) => `<div>${esc(t)}</div>`).join("")}</div></article><article class="card pad" style="--accent:#ff9f43"><div class="k">Communication</div><div class="stack">${f.communication.causes.map((t) => `<div>${esc(t)}</div>`).join("")}</div><div class="k" style="margin-top:12px">Recommendations</div><div class="stack">${f.communication.recommendations.map((t) => `<div>${esc(t)}</div>`).join("")}</div></article></div>`;
  }
  if (id === "seminars") {
    const max = Math.max(...DATA.seminars.map((s) => Number(s.n)), 1);
    const colors = { 2024: "#f0c14b", 2025: "#3ad7f5", 2026: "#1ec87a" };
    const years = [2024, 2025, 2026].map((y) => ({ name: String(y), value: DATA.seminars.filter((s) => Number(s.y) === y).reduce((a, s) => a + Number(s.n), 0), color: colors[y] }));
    return `<div class="grid-2"><article class="card pad"><div class="k">Participants</div><h3>${fmt(seminarTotal())}</h3>${DATA.seminars.map((s) => `<div class="sem-row"><span>${esc(s.d)}</span><div class="meta"><strong>${esc(s.t)}</strong><span>${esc(s.loc)}</span><div class="track" style="margin-top:4px"><i class="fill" style="--w:${(s.n / max) * 100}%;--c:${colors[s.y] || "#1ec87a"}"></i></div></div><em class="delta">${s.n}</em></div>`).join("")}</article><article class="card pad"><div class="k">By year</div>${donut(years, fmt(seminarTotal()), "People")}</article></div>`;
  }
  if (id === "response") {
    return `<div class="grid-6 steps-grid">${DATA.response.map((item, i) => `<article class="card step" style="--accent:${item.color}"><b class="n">${String(i + 1).padStart(2, "0")}</b><div>${esc(item.title)}</div></article>`).join("")}</div>`;
  }
  if (id === "advisories") return advisoryShelf();
  if (id === "portals") {
    return portalPages(DATA.portals);
  }
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

function frameStage(url, title, kind) {
  return `<div class="live-frame ${kind || "full"}"><iframe data-live src="${esc(url)}" title="${esc(title || "Portal")}"></iframe>${wingName()}</div>`;
}

function setFrameActions(url) {
  const slot = document.getElementById("modal-actions");
  if (slot) slot.innerHTML = url ? frameTab(url) : "";
}

function portalPeeks(list) {
  return (list || []).map((portal) => {
    const href = safeUrl(portal.url);
    const peek = href
      ? `<div class="peek"><iframe data-live src="${esc(href)}" title="${esc(portal.title)}" tabindex="-1"></iframe>${wingName()}</div>`
      : `<div class="peek">${wingName(true)}</div>`;
    return `<article class="card shot portal-peek" data-frame="${esc(href)}" data-title="${esc(portal.title)}" style="--accent:${portal.color || "#ff8a3d"}">${peek}<div class="shot-copy"><h3>${esc(portal.title)}</h3><p>${esc((portal.items || [])[0] || "")}</p><p>${esc((portal.items || [])[1] || "")}</p>${frameTab(href)}</div></article>`;
  }).join("");
}

function portalPages(list) {
  return `<div class="portal-stack">${(list || []).map((portal) => {
    const href = safeUrl(portal.url);
    const stage = href ? frameStage(href, portal.title, "page") : `<div class="live-frame page">${wingName(true)}</div>`;
    const actions = href ? `<button class="btn" type="button" data-frame="${esc(href)}" data-title="${esc(portal.title)}">Open</button>${frameTab(href)}` : "";
    return `<article class="card portal-live" style="--accent:${portal.color || "#ff8a3d"}"><div class="frame-bar"><div><h3>${esc(portal.title)}</h3><p>${esc((portal.items || [])[0] || "")}</p></div><div class="frame-actions">${actions}</div></div>${stage}</article>`;
  }).join("")}</div>`;
}

function watchFrames(root) {
  (root || document).querySelectorAll("iframe[data-live]").forEach((frame) => {
    if (frame.dataset.watched) return;
    frame.dataset.watched = "1";
    const box = frame.closest(".live-frame, .peek");
    const fail = () => { if (box) box.classList.add("is-dead"); };
    let loaded = false;
    frame.addEventListener("error", fail);
    frame.addEventListener("load", () => {
      loaded = true;
      try {
        const doc = frame.contentDocument;
        if (!doc || doc.URL === "about:blank" || !(doc.body && doc.body.childNodes.length)) fail();
      } catch (error) {
        /* A cross-origin portal loaded inside the frame. */
      }
    });
    setTimeout(() => { if (!loaded) fail(); }, 9000);
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
  if (!item || !window.pdfjsLib) return;
  releaseBook();
  state.book = index;
  setFrameActions("");
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-body").innerHTML = `<div class="bookbar"><button class="btn ghost" type="button" data-shelf>Shelf</button><button class="btn gold" type="button" data-turn="-1">Previous</button><span id="book-count">Opening</span><button class="btn gold" type="button" data-turn="1">Next</button></div><div class="bookstage"><div class="paper" id="paper"><canvas id="book-page"></canvas></div></div><input id="book-range" type="range" min="1" max="1" value="1" />`;
  const range = document.getElementById("book-range");
  range.oninput = () => { if (!bookBusy) paintPage(Number(range.value)); };
  pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdf.worker.min.js";
  try {
    bookTask = pdfjsLib.getDocument(item.file);
    bookDoc = await bookTask.promise;
  } catch (error) {
    const count = document.getElementById("book-count");
    if (count) count.textContent = "Could not open";
    return;
  }
  if (state.book !== index) return;
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
  if (!state.open) {
    modal.classList.remove("is-on");
    document.body.style.overflow = "";
    markNav();
    return;
  }
  const tile = (DATA.tiles || []).find((t) => t.id === state.open) || (DATA.nav || []).find((t) => t.id === state.open);
  document.getElementById("modal-title").textContent = tile ? tile.title || tile.label : state.open;
  body.innerHTML = modalBody(state.open);
  body.classList.add("inview");
  modal.classList.add("is-on");
  document.body.style.overflow = "hidden";
  const sheet = modal.querySelector(".sheet");
  if (sheet) sheet.classList.toggle("is-wide", state.open === "app360" || state.open === "portals");
  playDonuts(body);
  runCounters(body);
  watchFrames(body);
  markNav();
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
    if (e.target.closest("[data-quick]")) {
      const grid = document.getElementById("home-grid");
      if (grid) grid.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      return;
    }
    const tab = e.target.closest("[data-tab]");
    if (tab) {
      e.preventDefault();
      const href = safeUrl(tab.getAttribute("href"));
      if (href) window.open(href, "_blank", "noopener,noreferrer");
      if (state.frame) closeFrame();
      return;
    }
    const opener = e.target.closest("[data-open]");
    if (opener && opener.dataset.open) {
      openPanel(opener.dataset.open);
      return;
    }
    const frameBtn = e.target.closest("[data-frame]");
    if (frameBtn && frameBtn.dataset.frame) {
      openFrame(frameBtn.dataset.frame, frameBtn.dataset.title);
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

async function boot() {
  DATA = await loadContent();
  document.getElementById("app").innerHTML = home();
  watchFrames(document);
  bind();
  runCounters(document);
  tickClock();
  setInterval(tickClock, 1000);
  markNav();
}

boot();
