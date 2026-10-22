let DATA = null;
const state = { hub: "all", region: "all", open: "" };
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
  const stored = localStorage.getItem("infra-api") || "";
  return String(stored || window.INFRA_API || "").replace(/\/$/, "");
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

function home() {
  return `
    <header class="topbar">
      <div class="brand">
        <img src="assets/ndma-logo.png" alt="National Disaster Management Authority" />
        <div><h1>${esc(DATA.brand.title)}</h1><p>${esc(DATA.brand.line)}</p></div>
      </div>
      <div class="clockbox"><b id="clock">--:--:--</b><span>Islamabad</span></div>
    </header>
    <div class="shell">
      <nav class="nav">${DATA.nav.map((item) => `<button type="button" data-open="${esc(item.id)}" style="--dot:${item.color}"><i></i>${esc(item.label)}</button>`).join("")}</nav>
      <main class="main">
        <div class="shot-grid">
          ${DATA.tiles.map((item) => `<article class="card tilt shine shot" data-open="${esc(item.id)}" style="--accent:${item.color}"><img src="${esc(item.image)}" alt="" /><div class="shot-copy"><h3>${esc(item.title)}</h3><p>${esc(item.line)}</p><p>${esc(item.line2)}</p></div></article>`).join("")}
        </div>
        ${pictureRail()}
        <p class="foot"><a href="admin.html">Admin</a><span>15 Oct 2026</span></p>
      </main>
    </div>
    <div id="modal" class="modal" role="dialog" aria-modal="true">
      <div class="sheet">
        <div class="sheet-h"><h2 id="modal-title"></h2><button class="btn coral" type="button" data-close>Close</button></div>
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
    return `${href ? `<a class="btn blue" href="${esc(href)}" target="_blank" rel="noopener">Open 360 App</a>` : ""}${moving}<div class="grid-6 mod-grid" style="margin-top:14px">${cards}</div><div class="pills" style="margin-top:14px">${DATA.users.map((u) => `<span class="pill">${esc(u)}</span>`).join("")}</div>`;
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
  if (id === "portals") {
    return `<div class="grid-3">${DATA.portals.map((p) => {
      const href = safeUrl(p.url);
      return `<article class="card pad portal-card" style="--accent:${p.color || "#ff8a3d"}"><h3>${esc(p.title)}</h3>${chips(p.items)}${href ? `<a class="btn amber" style="margin-top:12px" href="${esc(href)}" target="_blank" rel="noopener">Open</a>` : ""}</article>`;
    }).join("")}</div>`;
  }
  return "";
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
  playDonuts(body);
  runCounters(body);
  markNav();
}

function openPanel(id) {
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
  document.body.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-open]");
    if (opener && opener.dataset.open) {
      openPanel(opener.dataset.open);
      return;
    }
    if (e.target.closest("[data-close]") || e.target.id === "modal") {
      state.open = "";
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
    if (e.key === "Escape" && state.open) {
      state.open = "";
      paintModal();
    }
  });
  const main = document.querySelector(".main");
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
  bind();
  runCounters(document);
  tickClock();
  setInterval(tickClock, 1000);
  markNav();
}

boot();
