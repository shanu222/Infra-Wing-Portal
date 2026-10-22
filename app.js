const REGIONS = [
  { id: "ict", name: "ICT", net: 64, color: "#3ad7f5" },
  { id: "gb", name: "GB", net: 53, color: "#1ec87a" },
  { id: "ajk", name: "AJK", net: 61, color: "#f0c14b" },
  { id: "punjab", name: "Punjab", net: 52, color: "#6aa4ff" },
  { id: "sindh", name: "Sindh", net: 46, color: "#ff6d6d" },
  { id: "kp", name: "KP", net: 62, color: "#b08cff" },
  { id: "bln", name: "Balochistan", net: 44, color: "#ff9f43" }
];

const ATTRS = [
  "Building codes",
  "Land-use planning",
  "Resilience value",
  "Local materials",
  "Eco designs",
  "Climate friendly",
  "Stability index",
  "Site parameters",
  "Build back better",
  "Work environment"
];

const MATRIX = [
  [8, 4, 6, 6, 4, 7, 4.3],
  [7, 4, 5, 5, 3, 5, 4.4],
  [6, 7, 6, 5, 4, 8, 3.9],
  [3, 8, 8, 4, 7, 6, 6.2],
  [4, 5, 8, 5, 7, 7, 5.0],
  [7, 8, 5, 5, 5, 6, 5.3],
  [8, 5, 7, 5, 3, 6, 4.0],
  [8, 3, 4, 6, 4, 5, 4.5],
  [6, 5, 8, 5, 4, 7, 4.3],
  [7, 4, 4, 6, 5, 5, 4.4]
];

const NETS = [64, 53, 61, 52, 46, 62, 44];

const ITEMS = [
  "Bamboo 12 ft",
  "Bamboo 6 ft",
  "Bamboo 8 ft",
  "Chick mats",
  "Polythene sheet",
  "Cotton rope (kg)",
  "Steel girder",
  "CGI sheets",
  "Planks 8×1×1",
  "Planks 8×4×1",
  "EPS panels",
  "Wheelbarrows",
  "Shovels",
  "Pickaxes"
];

const FAMILIES = [
  { name: "Bamboo", idx: [0, 1, 2], color: "#1ec87a" },
  { name: "Mats, sheet, rope", idx: [3, 4, 5], color: "#3ad7f5" },
  { name: "Steel & CGI", idx: [6, 7], color: "#f0c14b" },
  { name: "Timber planks", idx: [8, 9], color: "#d7b899" },
  { name: "EPS panels", idx: [10], color: "#b08cff" },
  { name: "Tools", idx: [11, 12, 13], color: "#ff9f43" }
];

const HUBS = [
  { id: "sukkur", name: "Sukkur", region: "Sindh", color: "#3ad7f5", x: 62, y: 78, stock: [1060, 2530, 1060, 1720, 130, 13, 35, 0, 160, 160, 330, 0, 0, 0] },
  { id: "muzaffargarh", name: "Muzaffargarh", region: "Punjab", color: "#f0c14b", x: 48, y: 58, stock: [1070, 2530, 1070, 1740, 130, 14, 30, 200, 169, 170, 330, 0, 0, 0] },
  { id: "gilgit", name: "Gilgit", region: "Gilgit-Baltistan", color: "#1ec87a", x: 58, y: 18, stock: [1080, 2540, 1070, 1750, 141, 13, 35, 400, 171, 168, 345, 0, 0, 0] },
  { id: "jallozai", name: "Jallozai", region: "Khyber Pakhtunkhwa", color: "#b08cff", x: 32, y: 34, stock: [1227, 2914, 1227, 7360, 154, 0, 39, 230, 192, 192, 39, 50, 100, 100] }
];

const SEMINARS = [
  { t: "National Seminar on Disaster Resilient Infrastructure", d: "Sep 2024", y: 2024, loc: "Bahria University", n: 116 },
  { t: "Sustainable Smart Construction Solutions", d: "Dec 2024", y: 2024, loc: "NEOC, NDMA", n: 61 },
  { t: "Role of Development Organisations in Infra Resilience", d: "Feb 2025", y: 2025, loc: "NEOC, NDMA", n: 174 },
  { t: "Seismic Resilient Infrastructure — Global Insights", d: "Mar 2025", y: 2025, loc: "NDMA Board Room", n: 38 },
  { t: "Strengthening Infra Resilience for Sustainable Development", d: "May 2025", y: 2025, loc: "NDMA Auditorium", n: 230 },
  { t: "Build Back Better — Post 2025 Monsoon Rebuilding", d: "Nov 2025", y: 2025, loc: "NDMA Auditorium", n: 305 },
  { t: "National Infrastructure Audit Program 2026", d: "Jan 2026", y: 2026, loc: "NEOC, NDMA", n: 55 },
  { t: "Capacity Building for the National Infra Audit", d: "Jul 2026", y: 2026, loc: "COE, NDMA", n: 53 },
  { t: "Urban Flood Resilience Measures — Vision 2027", d: "Sep 2026", y: 2026, loc: "NEOC, NDMA", n: 60 },
  { t: "Climate Responsive Infrastructure", d: "Oct 2026", y: 2026, loc: "NEOC, NDMA", n: 40 }
];

const NAV = [
  ["wing", "Wing", "#1ec87a"],
  ["mandate", "Mandate", "#f0c14b"],
  ["audit", "Audit", "#3ad7f5"],
  ["drim", "Models", "#ff9f43"],
  ["hubs", "Hubs", "#b08cff"],
  ["app360", "360 App", "#6aa4ff"],
  ["field", "Field", "#ff6d6d"],
  ["seminars", "Seminars", "#ff6fa8"],
  ["response", "Response", "#8dffc8"]
];

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const state = { hub: "all", region: "all" };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (n) => {
  const num = Number(n);
  if (Number.isInteger(num)) return num.toLocaleString("en-US");
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
};
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
const hubTotal = (h) => sum(h.stock);
const totalUnits = () => HUBS.reduce((a, h) => a + hubTotal(h), 0);
const seminarTotal = () => SEMINARS.reduce((a, s) => a + s.n, 0);

function heatColor(v, max) {
  const t = Math.max(0, Math.min(1, v / max));
  const hue = 6 + t * 138;
  const light = 32 + t * 16;
  return { bg: `hsl(${hue} 72% ${light}%)`, fg: t > 0.62 ? "#062018" : "#f5fffb" };
}

function section(id, num, title, accent, inner) {
  return `<section id="${id}" class="section" style="--accent:${accent}">
    <div class="sec-h"><span class="idx">${num}</span><h2>${title}</h2></div>
    ${inner}
  </section>`;
}

function donut(slices, center, sub) {
  const clean = slices.filter((s) => s.value > 0);
  const total = clean.reduce((a, s) => a + s.value, 0) || 1;
  const r = 68;
  const circ = 2 * Math.PI * r;
  let off = 0;
  const rings = clean.map((s) => {
    const len = (s.value / total) * circ;
    const gap = clean.length > 1 ? 2.5 : 0;
    const dash = Math.max(0, len - gap);
    const node = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${s.color}" stroke-width="18" data-len="${dash.toFixed(2)}" data-circ="${circ.toFixed(2)}" style="stroke-dasharray:0 ${circ.toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"></circle>`;
    off += len;
    return node;
  }).join("");
  const legend = clean.map((s) => `<li><i style="background:${s.color}"></i><span>${esc(s.name)}</span><b>${fmt(s.value)}</b></li>`).join("");
  return `<div class="donut">
    <svg class="donut-svg" viewBox="0 0 200 200" role="img" aria-label="${esc(sub)}">
      <ellipse cx="100" cy="168" rx="64" ry="10" fill="rgba(0,0,0,.35)"></ellipse>
      <g transform="rotate(-90 100 100)">
        <circle cx="100" cy="100" r="${r}" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="18"></circle>
        ${rings}
      </g>
      <text class="donut-n" x="100" y="98" text-anchor="middle">${esc(center)}</text>
      <text class="donut-s" x="100" y="116" text-anchor="middle">${esc(sub)}</text>
    </svg>
    <ul class="legend">${legend}</ul>
  </div>`;
}

function hBars(rows) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return `<div class="bars">${rows.map((r) => `
    <div class="barline">
      <span>${esc(r.name)}</span>
      <div class="track"><i class="fill" style="--w:${(r.value / max) * 100}%;--c:${r.color}"></i></div>
      <em>${fmt(r.value)}</em>
    </div>`).join("")}</div>`;
}

function provinceBars() {
  return `<div class="vwrap"><div class="vbars" aria-hidden="false">
    <div class="yaxis"><span>100</span><span>50</span><span>0</span></div>
    ${REGIONS.map((r) => `<div class="vbar">
      <div class="vn" style="color:${r.color}" data-count="${r.net}">${r.net}</div>
      <div class="vtrack"><i class="vfill" style="--h:${r.net}%;--c:${r.color}"></i></div>
      <div class="vl">${esc(r.name)}</div>
    </div>`).join("")}
  </div></div>`;
}

function heatmap() {
  const heads = REGIONS.map((r) => `<div class="hh" style="color:${r.color}">${esc(r.name)}</div>`).join("");
  const body = ATTRS.map((name, i) => {
    const cells = MATRIX[i].map((v, c) => {
      const tone = heatColor(v, 10);
      return `<div class="cell" data-col="${c}" style="--d:${(i * 7 + c) * 18}ms;background:${tone.bg};color:${tone.fg}">${fmt(v)}</div>`;
    }).join("");
    return `<div class="hl">${esc(name)}</div>${cells}`;
  }).join("");
  const nets = NETS.map((v, c) => {
    const tone = heatColor(v, 100);
    return `<div class="cell" data-col="${c}" style="--d:${200 + c * 20}ms;background:${tone.bg};color:${tone.fg}">${v}%</div>`;
  }).join("");
  return `<div class="heat-scroll"><div class="heat" id="heat">
    <div class="hh"></div>${heads}
    ${body}
    <div class="hl">Net valuation</div>${nets}
  </div></div>
  <div class="scale"><span>0</span><i></i><span>10</span></div>`;
}

function hubViz(id) {
  if (id === "all") {
    const slices = HUBS.map((h) => ({ name: h.name, value: hubTotal(h), color: h.color }));
    const rows = ITEMS.map((name, i) => ({
      name,
      value: HUBS.reduce((a, h) => a + h.stock[i], 0),
      color: "#1ec87a"
    })).filter((r) => r.value > 0);
    return `${donut(slices, fmt(totalUnits()), "Units")}<div style="margin-top:16px">${hBars(rows)}</div>`;
  }
  const hub = HUBS.find((h) => h.id === id);
  const slices = FAMILIES.map((f) => ({
    name: f.name,
    value: f.idx.reduce((a, i) => a + hub.stock[i], 0),
    color: f.color
  }));
  const rows = ITEMS.map((name, i) => ({ name, value: hub.stock[i], color: hub.color })).filter((r) => r.value > 0);
  const issue = id === "gilgit"
    ? `<div class="pill" style="margin:12px 0">Issued to GBDMA · 39 shelters · Diamer · July 2026</div>`
    : "";
  return `${donut(slices, fmt(hubTotal(hub)), hub.name)}${issue}<div style="margin-top:16px">${hBars(rows)}</div>`;
}

function yearSlices() {
  const colors = { 2024: "#f0c14b", 2025: "#3ad7f5", 2026: "#1ec87a" };
  const map = { 2024: 0, 2025: 0, 2026: 0 };
  SEMINARS.forEach((s) => { map[s.y] += s.n; });
  return [2024, 2025, 2026].map((y) => ({ name: String(y), value: map[y], color: colors[y] }));
}

function seminarList() {
  const max = Math.max(...SEMINARS.map((s) => s.n));
  const colors = { 2024: "#f0c14b", 2025: "#3ad7f5", 2026: "#1ec87a" };
  return SEMINARS.map((s) => `<div class="sem-row">
    <span>${esc(s.d)}</span>
    <div class="meta">
      <strong title="${esc(s.t)}">${esc(s.t)}</strong>
      <span>${esc(s.loc)}</span>
      <div class="track" style="margin-top:4px"><i class="fill" style="--w:${(s.n / max) * 100}%;--c:${colors[s.y]}"></i></div>
    </div>
    <em class="delta">${s.n}</em>
  </div>`).join("");
}

function gbBlock() {
  const rows = [
    { name: "Houses", a: 1260, b: 535 },
    { name: "Roads (km)", a: 290.17, b: 24.61 },
    { name: "Bridges", a: 92, b: 35 }
  ];
  return `<div class="gb">${rows.map((r) => {
    const max = Math.max(r.a, r.b);
    const delta = Math.round(((r.b - r.a) / r.a) * 100);
    return `<div>
      <div class="two"><b>${esc(r.name)}</b><span class="delta">${delta}%</span></div>
      <div class="pairbars">
        <div class="barline"><span>2025</span><div class="track"><i class="fill" style="--w:${(r.a / max) * 100}%;--c:#ff9f43"></i></div><em>${fmt(r.a)}</em></div>
        <div class="barline"><span>2026</span><div class="track"><i class="fill" style="--w:${(r.b / max) * 100}%;--c:#3ad7f5"></i></div><em>${fmt(r.b)}</em></div>
      </div>
    </div>`;
  }).join("")}</div>`;
}

function nodeMap() {
  const lines = [[0, 1], [1, 2], [1, 3], [0, 3]].map(([a, b]) => {
    const A = HUBS[a];
    const B = HUBS[b];
    return `<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}"></line>`;
  }).join("");
  const nodes = HUBS.map((h, i) => `<button class="node" type="button" data-hub="${h.id}" style="--c:${h.color};left:${h.x}%;top:${h.y}%;animation-delay:${i * 0.4}s">
    <b>${fmt(hubTotal(h))}</b><span>${esc(h.name)}</span>
  </button>`).join("");
  return `<div class="nodes"><svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>${nodes}</div>`;
}

function page() {
  const units = totalUnits();
  const people = seminarTotal();
  return `
  <header class="topbar">
    <div class="brand">
      <img src="assets/ndma-logo.png" alt="National Disaster Management Authority" />
      <div>
        <h1>INFRA WING</h1>
        <p>NDMA · Disaster resilient infrastructure</p>
      </div>
    </div>
    <div class="clockbox">
      <b id="clock">--:--:--</b>
      <span>Islamabad · 33.7°N 73.0°E</span>
    </div>
  </header>
  <div class="shell">
    <nav class="nav" id="nav">
      ${NAV.map(([id, label, color]) => `<a href="#${id}" data-link="${id}" style="--dot:${color}"><i></i>${label}</a>`).join("")}
    </nav>
    <main class="main">
      <section id="wing" class="section">
        <div class="hero">
          <div class="wordmark">
            <div class="eyebrow">National Disaster Management Authority</div>
            <h2>INFRA WING</h2>
            <p class="sub">Built to survive, save lives, reduce losses</p>
            <div class="actions">
              <a class="btn" href="#audit">Audit index</a>
              <a class="btn violet" href="#hubs">Material hubs</a>
              <a class="btn cyan" href="#field">Field picture</a>
              <a class="btn gold" href="#drim">17 models</a>
            </div>
          </div>
          <article class="card tilt shine ratio">
            <div class="tag">UNDRR</div>
            <div class="pair">
              <div class="numblock" style="--c:#3ad7f5"><b>1</b><span>US$ invested</span></div>
              <div class="arrow">→</div>
              <div class="numblock" style="--c:#f0c14b"><b>6</b><span>US$ saved</span></div>
            </div>
            <div class="src">Disaster-resilient infrastructure</div>
          </article>
        </div>
        <div class="stats reveal">
          ${[
            [REGIONS.length, "Regions indexed", "#3ad7f5"],
            [17, "Resilient models", "#ff9f43"],
            [HUBS.length, "Material hubs", "#b08cff"],
            [units, "Units stocked", "#1ec87a"],
            [people, "Seminar participants", "#ff6fa8"],
            [39, "Shelters issued", "#f0c14b"]
          ].map(([n, label, color]) => `<article class="card tilt shine stat" style="--accent:${color}"><strong data-count="${n}">${fmt(n)}</strong><em>${label}</em></article>`).join("")}
        </div>
        <div class="grid-3" style="margin-top:14px">
          <article class="card tilt shine pad" style="--accent:#3ad7f5">
            <div class="k">01 · Risk</div>
            <h3>National infra disaster risk</h3>
            <ul class="list">
              <li><b>Dynamic risk layers</b><span>Real-time geospatial risk data</span></li>
              <li><b>Threat alert mapping</b><span>Structures affected by alerts</span></li>
              <li><b>Encroachment tracking</b><span>District and tehsil expansion</span></li>
            </ul>
          </article>
          <article class="card tilt shine pad" style="--accent:#f0c14b">
            <div class="k">02 · Outlook</div>
            <h3>Built-up growth to 2047</h3>
            <ul class="list">
              <li><b>Long-range projection</b><span>Population and built-up, district level</span></li>
              <li><b>Growth concentration</b><span>Spatial spread and density hotspots</span></li>
              <li><b>Land conversion</b><span>Farmland lost to construction</span></li>
            </ul>
          </article>
          <article class="card tilt shine pad" style="--accent:#1ec87a">
            <div class="k">03 · Solutions</div>
            <h3>Resilient infrastructure atlas</h3>
            <ul class="list">
              <li><b>Needs analysis</b><span>Present and future infrastructure</span></li>
              <li><b>AI hazard identifier</b><span>Environmental risk detection</span></li>
              <li><b>Engineering solutions</b><span>Designs by topographic region</span></li>
              <li><b>Policy directives</b><span>Digitised manual and national framework</span></li>
            </ul>
          </article>
        </div>
      </section>

      ${section("mandate", "02", "Mandate & classes", "#f0c14b", `
        <div class="grid-3">
          ${[
            ["Strengthen", "Practical strengthening, rehabilitation and rebuild"],
            ["Innovate", "Response to local infrastructure resilience needs"],
            ["Localise", "Local skills, materials and cost-effective design"]
          ].map(([t, s], i) => `<article class="card tilt shine pad" style="--accent:${["#f0c14b", "#ff9f43", "#1ec87a"][i]}"><div class="k">0${i + 1}</div><h3>${t}</h3><p class="muted">${s}</p></article>`).join("")}
        </div>
        <div class="grid-6" style="margin-top:14px">
          ${[
            ["Communication", "Roads, bridges, culverts", "#3ad7f5"],
            ["Public", "Schools, hospitals, offices", "#6aa4ff"],
            ["Industrial", "Factories, plants, warehouses", "#ff9f43"],
            ["Hydraulic", "Dams, barrages, channels", "#1ec87a"],
            ["Residential", "Urban and rural housing", "#ff6fa8"],
            ["Commercial", "Malls and plazas", "#f0c14b"]
          ].map(([t, s, c]) => `<article class="card tilt shine pad" style="--accent:${c}"><div class="k">${t}</div><h3>${s}</h3></article>`).join("")}
        </div>
        <div class="grid-2" style="margin-top:14px">
          <article class="card tilt shine pad" style="--accent:#3ad7f5">
            <div class="k">Pre-disaster</div>
            <h3>IA&PD roles</h3>
            <ul class="list">
              ${["Infrastructure awareness advisories", "Infrastructure audit mechanism", "Material hubs", "National resilient-infrastructure seminars", "Global practice applied in Pakistan", "Region-wise implementable designs", "Cost of exposed infrastructure", "Pre-disaster damage projection"].map((t) => `<li><b>${t}</b></li>`).join("")}
            </ul>
          </article>
          <article class="card tilt shine pad" style="--accent:#ff6d6d">
            <div class="k">Post-disaster</div>
            <h3>IA&PD roles</h3>
            <ul class="list">
              ${["Damage verification — district and province", "Reconstruction through material hubs", "Technical support for temporary camps", "Temporary infrastructure", "Strengthening and retrofitting with communities"].map((t) => `<li><b>${t}</b></li>`).join("")}
            </ul>
          </article>
        </div>
        <div class="grid-2" style="margin-top:14px">
          <article class="card tilt shine pad" style="--accent:#ff6d6d">
            <div class="k">When it fails</div>
            <div class="chips" style="margin-top:10px">
              ${["Infrastructure damage", "Lives disrupted", "Services halt", "Recovery delayed"].map((t) => `<span class="chip">${t}</span>`).join("")}
            </div>
          </article>
          <article class="card tilt shine pad" style="--accent:#1ec87a">
            <div class="k">Built to survive</div>
            <div class="chips" style="margin-top:10px">
              ${["Survive the hazard", "Save lives", "Reduce losses"].map((t) => `<span class="chip">${t}</span>`).join("")}
            </div>
          </article>
        </div>
      `)}

      ${section("audit", "03", "Provincial resilience index", "#3ad7f5", `
        <div class="badges">
          <span class="badge" style="--accent:#3ad7f5">PMO approved</span>
          <span class="badge" style="--accent:#f0c14b">First in Pakistan</span>
        </div>
        <article class="card pad reveal" style="--accent:#3ad7f5">
          <div class="panel-head"><div><div class="k">Net valuation</div><h3>Score out of 100</h3></div></div>
          ${provinceBars()}
        </article>
        <article class="card pad reveal" style="--accent:#3ad7f5;margin-top:14px">
          <div class="panel-head">
            <div><div class="k">Ten attributes</div><h3>Score out of 10</h3></div>
          </div>
          <div class="switch" id="regSwitch">
            <button class="btn cyan is-on" type="button" data-region="all">All regions</button>
            ${REGIONS.map((r) => `<button class="btn ghost" type="button" data-region="${r.id}">${r.name}</button>`).join("")}
          </div>
          ${heatmap()}
        </article>
        <div class="flow" style="margin-top:14px">
          ${[
            ["01", "Policy & governance"],
            ["02", "Pilot infrastructure audits"],
            ["03", "IRI rating & digital platform"],
            ["04", "Engagement and monitoring"],
            ["05", "Retrofit demonstrations"],
            ["06", "Capacity development"]
          ].map(([n, t]) => `<article class="card tilt shine" style="--accent:#3ad7f5"><div class="n">${n}</div><b>${t}</b></article>`).join("")}
        </div>
        <div class="grid-6" style="margin-top:14px">
          ${[
            "Vulnerable regions and structures",
            "Safety in extreme conditions",
            "Upgrades and retrofitting",
            "Early damage detection",
            "Preparedness decisions",
            "Post-disaster safe reuse"
          ].map((t) => `<article class="card tilt shine pad" style="--accent:#6aa4ff"><h3>${t}</h3></article>`).join("")}
        </div>
      `)}

      ${section("drim", "04", "Disaster resilient models", "#ff9f43", `
        <div class="stats cols-4 reveal">
          <article class="card tilt shine stat" style="--accent:#ff9f43"><strong data-count="17">17</strong><em>Models</em></article>
          <article class="card tilt shine stat" style="--accent:#1ec87a"><strong>40–60%</strong><em>Faster construction</em></article>
          <article class="card tilt shine stat" style="--accent:#f0c14b"><strong>15–45%</strong><em>Cost saved</em></article>
          <article class="card tilt shine stat" style="--accent:#3ad7f5"><strong>All</strong><em>Pakistan coverage</em></article>
        </div>
        <div class="grid-2" style="margin-top:14px">
          <article class="card pad reveal" style="--accent:#ff9f43">
            <div class="k">Hazards covered</div>
            <div class="chips" style="margin:12px 0">
              ${["Flood", "Earthquake", "Landslide", "Water management"].map((t) => `<span class="chip">${t}</span>`).join("")}
            </div>
            <div class="range"><div class="range-lab"><span>Time saved</span><b>40–60%</b></div><div class="range-track"><i style="--a:40%;--b:60%;--c:#1ec87a"></i></div></div>
            <div class="range"><div class="range-lab"><span>Cost saved</span><b>15–45%</b></div><div class="range-track"><i style="--a:15%;--b:45%;--c:#f0c14b"></i></div></div>
          </article>
          <div class="models">
            ${[
              ["Hilly", "#ff6d6d", ["Confined concrete block masonry", "Geogrid reinforced retaining wall"]],
              ["Hilly / plain", "#ff9f43", ["Bamboo with wattle & daub", "Light gauge steel"]],
              ["Plain", "#f0c14b", ["Rat-trap bond masonry", "Timber with lath & plaster"]],
              ["Coastal / plain", "#3ad7f5", ["Elevated structure", "Floating structure"]]
            ].map(([zone, color, items]) => `<article class="card tilt shine model" style="--accent:${color}"><h3>${zone}</h3><div class="chips">${items.map((t) => `<span class="chip">${t}</span>`).join("")}</div></article>`).join("")}
          </div>
        </div>
        <div class="grid-2" style="margin-top:14px">
          <article class="card tilt shine pad" style="--accent:#b08cff">
            <div class="k">Publications</div>
            <div class="chips" style="margin-top:10px">
              ${["Disaster resilient construction practices", "Resilient infra guidelines", "Zone-specific construction", "Risk-smart leaflets"].map((t) => `<span class="chip">${t}</span>`).join("")}
            </div>
          </article>
          <article class="card tilt shine pad" style="--accent:#6aa4ff">
            <div class="k">Building Code of Pakistan</div>
            <ul class="list">
              <li><b>Technical input</b><span>Update the code for resilience</span></li>
              <li><b>Nationwide audits</b><span>Check implementation</span></li>
              <li><b>Non-compliance</b><span>Report for safer construction</span></li>
            </ul>
          </article>
        </div>
      `)}

      ${section("hubs", "05", "Material hubs", "#b08cff", `
        <div class="grid-2">
          <article class="card pad" style="--accent:#b08cff">
            <div class="k">Stock position</div>
            <h3 id="hubTitle">Four hubs</h3>
            <div class="switch" id="hubSwitch">
              <button class="btn violet is-on" type="button" data-hub="all">All hubs</button>
              ${HUBS.map((h) => `<button class="btn ghost" type="button" data-hub="${h.id}">${h.name}</button>`).join("")}
            </div>
            <div id="hubViz" class="reveal">${hubViz("all")}</div>
          </article>
          <div>
            ${nodeMap()}
            <article class="card tilt shine pad" style="--accent:#1ec87a;margin-top:14px">
              <div class="k">Gilgit issuance · Monsoon 2026</div>
              <h3>39 shelters · Diamer</h3>
              <div class="chips" style="margin-top:10px">
                ${["Sandwich panels", "Wooden planks", "CGI sheets", "Pre-engineered components", "Light gauge", "Bamboo"].map((t) => `<span class="chip">${t}</span>`).join("")}
              </div>
            </article>
          </div>
        </div>
      `)}

      ${section("app360", "06", "Infra Resilience 360", "#6aa4ff", `
        <div class="grid-6 mod-grid">
          ${[
            ["Retrofit guide", "#6aa4ff"],
            ["Resilient models", "#1ec87a"],
            ["Building codes", "#f0c14b"],
            ["Smart construction", "#3ad7f5"],
            ["Design toolkit", "#ff9f43"],
            ["Disaster dashboard", "#ff6d6d"],
            ["Learn & train", "#b08cff"],
            ["Best practices", "#ff6fa8"],
            ["Readiness calculator", "#8dffc8"],
            ["Material hubs", "#f0c14b"]
          ].map(([t, c]) => `<article class="card tilt shine pad" style="--accent:${c}"><h3>${t}</h3></article>`).join("")}
        </div>
        <div class="pills" style="margin-top:14px">
          ${["Architects", "Engineers", "Planners", "Builders", "Common people"].map((t) => `<span class="pill">${t}</span>`).join("")}
        </div>
      `)}

      ${section("field", "07", "Gilgit-Baltistan & damage", "#ff6d6d", `
        <div class="grid-2">
          <article class="card pad reveal" style="--accent:#ff9f43">
            <div class="k">Monsoon damage</div>
            <h3>2025 and 2026</h3>
            ${gbBlock()}
          </article>
          <article class="card tilt shine pad" style="--accent:#1ec87a">
            <div class="k">Districts visited</div>
            <ul class="list">
              <li><b>Skardu</b></li>
              <li><b>Astore</b><span>Louse Pain · Louse Bala</span></li>
              <li><b>Ghizer</b><span>Mullabad · Talidas · Gupis / Punial · Mulaabad · Gahkuch</span></li>
              <li><b>Gilgit</b><span>Naltar Bala · Naltar Dalan</span></li>
              <li><b>FCNA</b></li>
            </ul>
          </article>
        </div>
        <article class="card tilt shine pad" style="--accent:#3ad7f5;margin-top:14px">
          <div class="k">Recommended measures</div>
          <div class="chips" style="margin-top:10px">
            ${["Parallel chord truss", "Space frame truss", "Howe truss", "Sloped water-resistant roof", "Raised plinth", "Timber section restoration", "Steel wire-mesh crack repair"].map((t) => `<span class="chip">${t}</span>`).join("")}
          </div>
        </article>
        <div class="grid-3" style="margin-top:14px">
          <article class="card tilt shine pad span-2" style="--accent:#6aa4ff">
            <div class="k">Vision 2027</div>
            <h3>Urban flood resilience</h3>
            <div class="chips" style="margin-top:10px">
              ${["Forwarded to PMO", "CDA", "WASA", "RDA", "Drainage", "Nature-based solutions", "Resilient planning"].map((t) => `<span class="chip">${t}</span>`).join("")}
            </div>
          </article>
          <article class="card tilt shine pad" style="--accent:#f0c14b">
            <div class="k">Verification chain</div>
            <ul class="list">
              ${["PDMA & DDMA rapid data", "Satellite and third-party check", "Detailed assessment report", "Compile and archive", "C&W and local government detail"].map((t) => `<li><b>${t}</b></li>`).join("")}
            </ul>
          </article>
        </div>
        <div class="cause" style="margin-top:14px">
          <article class="card tilt shine pad" style="--accent:#ff6d6d">
            <div class="k">Residential</div>
            <div class="stack"><div>Roof collapse</div><div>Construction in the flood plain</div></div>
            <div class="k" style="margin-top:12px">Recommendations</div>
            <div class="stack"><div>Sloped roof</div><div>Land-use planning</div></div>
          </article>
          <article class="card tilt shine pad" style="--accent:#ff9f43">
            <div class="k">Communication</div>
            <div class="stack"><div>Landslide debris</div><div>Debris collision</div><div>Embankment failure</div></div>
            <div class="k" style="margin-top:12px">Recommendations</div>
            <div class="stack"><div>Culverts and retaining walls</div><div>Freeboard</div><div>Cross drainage</div></div>
          </article>
        </div>
      `)}

      ${section("seminars", "08", "National seminars", "#ff6fa8", `
        <div class="grid-2">
          <article class="card pad reveal" style="--accent:#ff6fa8">
            <div class="panel-head"><div><div class="k">Participants</div><h3 data-count="${people}">${fmt(people)}</h3></div></div>
            ${seminarList()}
          </article>
          <article class="card pad reveal" style="--accent:#f0c14b">
            <div class="k">By year</div>
            <h3>Share of participants</h3>
            ${donut(yearSlices(), fmt(people), "People")}
          </article>
        </div>
      `)}

      ${section("response", "09", "Threat response", "#1ec87a", `
        <div class="grid-6 steps-grid">
          ${[
            "Disaster early warning",
            "Academia best practice",
            "Risk communication & mobile alerts",
            "Anticipatory action",
            "National narrative & media",
            "Resilient infra & national audit",
            "Logistics stock & operational plans",
            "Humanitarian support — UN, NGOs",
            "National resource",
            "International coordination",
            "Regional & military assistance",
            "Risk finance — national & global",
            "Review for next impacts — CoE"
          ].map((t, i) => `<article class="card tilt shine step" style="--accent:${["#1ec87a", "#3ad7f5", "#f0c14b", "#ff9f43", "#ff6d6d", "#b08cff", "#6aa4ff", "#ff6fa8", "#8dffc8", "#f0c14b", "#3ad7f5", "#1ec87a", "#ff9f43"][i]};animation-delay:${i * 60}ms"><b class="n">${String(i + 1).padStart(2, "0")}</b><div>${t}</div></article>`).join("")}
        </div>
      `)}

      <footer class="foot">
        <span>NDMA · Infrastructure Wing</span>
        <span>Standard brief · 15 Oct 2026</span>
      </footer>
    </main>
  </div>
  <a class="btn to-top" href="#wing">Top</a>`;
}

function playDonuts(root) {
  root.querySelectorAll("circle[data-len]").forEach((node) => {
    const circ = Number(node.dataset.circ);
    const len = Number(node.dataset.len);
    if (reduce) {
      node.style.strokeDasharray = `${len} ${circ - len}`;
      return;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        node.style.transition = "stroke-dasharray 1.15s cubic-bezier(.2,.8,.2,1)";
        node.style.strokeDasharray = `${len} ${circ - len}`;
      });
    });
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

const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("inview");
    playDonuts(en.target);
    runCounters(en.target);
    io.unobserve(en.target);
  });
}, { threshold: 0.18 });

function watch(root) {
  root.querySelectorAll(".reveal").forEach((el) => {
    if (!el.classList.contains("inview")) io.observe(el);
  });
  root.querySelectorAll(".reveal.inview").forEach((el) => {
    playDonuts(el);
    runCounters(el);
  });
}

function tickClock() {
  const el = document.getElementById("clock");
  if (!el) return;
  el.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date());
}

function setHub(id) {
  state.hub = id;
  document.querySelectorAll("#hubSwitch [data-hub]").forEach((b) => {
    const on = b.dataset.hub === id;
    b.classList.toggle("is-on", on);
    b.classList.toggle("ghost", !on);
    b.classList.toggle("violet", on);
    b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  document.querySelectorAll(".node").forEach((n) => n.classList.toggle("is-on", n.dataset.hub === id));
  const title = document.getElementById("hubTitle");
  const hub = HUBS.find((h) => h.id === id);
  title.textContent = hub ? `${hub.name} · ${hub.region}` : "Four hubs";
  const box = document.getElementById("hubViz");
  box.classList.remove("inview");
  box.innerHTML = hubViz(id);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      box.classList.add("inview");
      playDonuts(box);
    });
  });
}

function setRegion(id) {
  state.region = id;
  document.querySelectorAll("[data-region]").forEach((b) => {
    const on = b.dataset.region === id;
    b.classList.toggle("is-on", on);
    b.classList.toggle("ghost", !on);
    b.classList.toggle("cyan", on);
  });
  const heat = document.getElementById("heat");
  heat.classList.toggle("is-filter", id !== "all");
  const idx = REGIONS.findIndex((r) => r.id === id);
  heat.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.toggle("on", id !== "all" && Number(cell.dataset.col) === idx);
  });
}

function bind() {
  document.getElementById("hubSwitch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hub]");
    if (b) setHub(b.dataset.hub);
  });
  document.querySelector(".nodes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-hub]");
    if (!b) return;
    setHub(b.dataset.hub);
    document.getElementById("hubs").scrollIntoView({ behavior: "smooth", block: "start" });
  });
  document.getElementById("regSwitch").addEventListener("click", (e) => {
    const b = e.target.closest("[data-region]");
    if (b) setRegion(b.dataset.region);
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
  const links = [...document.querySelectorAll("[data-link]")];
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle("active", a.dataset.link === en.target.id));
    });
  }, { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 });
  document.querySelectorAll("section[id]").forEach((s) => spy.observe(s));
  const current = (location.hash || "#wing").slice(1);
  links.forEach((a) => a.classList.toggle("active", a.dataset.link === current));
}

function boot() {
  document.getElementById("app").innerHTML = page();
  bind();
  watch(document);
  tickClock();
  setInterval(tickClock, 1000);
  const topBtn = document.querySelector(".to-top");
  const onScroll = () => { topBtn.classList.toggle("show", window.scrollY > 500); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  if (location.hash) {
    const el = document.querySelector(location.hash);
    if (el) el.scrollIntoView();
  }
}

boot();
