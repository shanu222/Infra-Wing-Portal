let draft = null;
let token = localStorage.getItem("infra-token") || "";
let media = [];
let panel = "portals";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const PAGES = [
  ["home", "Home"],
  ["mandate", "Mandate"],
  ["audit", "IAP"],
  ["drim", "DRIM"],
  ["hubs", "Material Hub"],
  ["app360", "360 App"],
  ["field", "Field Visits"],
  ["advisories", "Advisories"],
  ["seminars", "Seminars"],
  ["portals", "Portals"]
];

function apiBase() {
  return String(window.INFRA_API || "").replace(/\/$/, "");
}

async function api(path, options = {}) {
  const headers = Object.assign({}, options.headers || {});
  if (token) headers.Authorization = "Bearer " + token;
  if (options.json) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.json);
  }
  const res = await fetch(apiBase() + path, { method: options.method || "GET", headers, body: options.body });
  if (res.status === 401) {
    token = "";
    localStorage.removeItem("infra-token");
    render();
    throw new Error("unauthorized");
  }
  return res;
}

function textField(label, path, value) {
  return `<label>${label}<input data-path="${path}" value="${esc(value)}"></label>`;
}
function numField(label, path, value) {
  return `<label>${label}<input data-path="${path}" data-num="1" type="number" step="any" value="${esc(value)}"></label>`;
}
function linesField(label, path, list) {
  return `<label>${label}<textarea data-path="${path}" data-lines="1" rows="5">${esc((list || []).join("\n"))}</textarea></label>`;
}
function colorField(label, path, value) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(String(value || "")) ? value : "#1ec87a";
  return `<label>${label}<span class="color-line"><input type="color" data-path="${path}" value="${esc(hex)}"><input data-path="${path}" value="${esc(value || hex)}"></span></label>`;
}
function block(title, inner, remove) {
  return `<section class="admin-block" data-find="${esc(title)}"><b>${esc(title)}</b>${inner}${remove ? `<button class="btn coral" type="button" data-remove="${remove}">Remove</button>` : ""}</section>`;
}

function mediaBlock(id) {
  const files = media.filter((item) => item.id === id);
  const rows = files.map((item) => {
    const src = `${apiBase()}/api/media/${item.key}`;
    const preview = item.kind === "video"
      ? `<video muted controls src="${esc(src)}"></video>`
      : `<img src="${esc(src)}" alt="">`;
    return `<div class="media-edit">${preview}<form data-upload="${esc(item.key)}"><b>${esc(item.title)}</b><p>${esc(item.kind)}</p><input type="file" accept="${item.kind === "video" ? "video/mp4,video/webm" : "image/*"}" required><button class="btn gold" type="submit">Replace</button></form></div>`;
  }).join("");
  return `<h3>Films and photos</h3>${rows || "<p>No film is stored for this page yet.</p>"}<form class="admin-grid" data-new-media><input name="title" placeholder="Name" required><input name="file" type="file" accept="video/mp4,video/webm,image/*" required><button class="btn cyan" type="submit">Add film or photo</button></form>`;
}

function homePanel() {
  const tiles = (draft.tiles || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Title", `tiles.${i}.title`, item.title)}${textField("Line", `tiles.${i}.line`, item.line)}${textField("Second line", `tiles.${i}.line2`, item.line2)}${colorField("Color", `tiles.${i}.color`, item.color)}</div>`)).join("");
  const nav = (draft.nav || []).map((item, i) => block(item.label, `<div class="admin-grid">${textField("Menu name", `nav.${i}.label`, item.label)}${colorField("Color", `nav.${i}.color`, item.color)}</div>`)).join("");
  return `${textField("Wing title", "brand.title", draft.brand.title)}${textField("Wing line", "brand.line", draft.brand.line)}<h3>Home cards</h3>${tiles}<h3>Menu names</h3>${nav}`;
}
function mandatePanel() {
  const pillars = (draft.mandate || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Title", `mandate.${i}.title`, item.title)}${colorField("Color", `mandate.${i}.color`, item.color)}</div>`, `mandate.${i}`)).join("");
  const classes = (draft.classes || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Title", `classes.${i}.title`, item.title)}${textField("Line", `classes.${i}.line`, item.line)}${colorField("Color", `classes.${i}.color`, item.color)}</div>`, `classes.${i}`)).join("");
  return `<h3>Pillars</h3>${pillars}<button class="btn gold" type="button" data-add="mandate">Add pillar</button><h3>Infrastructure classes</h3>${classes}<button class="btn gold" type="button" data-add="classes">Add class</button>${mediaBlock("mandate")}`;
}
function auditPanel() {
  const regions = (draft.regions || []).map((item, i) => block(item.name, `<div class="admin-grid">${textField("Name", `regions.${i}.name`, item.name)}${numField("Net", `regions.${i}.net`, item.net)}${colorField("Color", `regions.${i}.color`, item.color)}</div>`)).join("");
  return `${regions}${linesField("Badges", "badges", draft.badges)}${linesField("Audit steps", "process", draft.process)}${linesField("Objectives", "objectives", draft.objectives)}${mediaBlock("audit")}`;
}
function drimPanel() {
  const d = draft.drim;
  const zones = (d.zones || []).map((item, i) => block(item.name, `<div class="admin-grid">${textField("Name", `drim.zones.${i}.name`, item.name)}${colorField("Color", `drim.zones.${i}.color`, item.color)}</div>${linesField("Models", `drim.zones.${i}.models`, item.models)}`, `drim.zones.${i}`)).join("");
  return `<div class="admin-grid">${numField("Model count", "drim.count", d.count)}${textField("Coverage", "drim.coverage", d.coverage)}${numField("Time saved from", "drim.time.0", d.time[0])}${numField("Time saved to", "drim.time.1", d.time[1])}${numField("Cost saved from", "drim.cost.0", d.cost[0])}${numField("Cost saved to", "drim.cost.1", d.cost[1])}</div>${linesField("Hazards", "drim.hazards", d.hazards)}${zones}<button class="btn gold" type="button" data-add="zones">Add zone</button>${linesField("Publications", "drim.publications", d.publications)}${linesField("Codes", "drim.codes", d.codes)}${mediaBlock("drim")}`;
}
function hubsPanel() {
  const hubs = (draft.hubs || []).map((item, i) => block(item.name, `<div class="admin-grid">${textField("Name", `hubs.${i}.name`, item.name)}${textField("Region", `hubs.${i}.region`, item.region)}${colorField("Color", `hubs.${i}.color`, item.color)}</div><label>Stock counts, in item order<input data-path="hubs.${i}.stock" data-numlist="1" value="${esc((item.stock || []).join(", "))}"></label>`)).join("");
  return `${linesField("Stock item names", "items", draft.items)}${hubs}<p>Hub photos and installation films already play from the material-hub bucket.</p>`;
}
function appPanel() {
  const app = draft.app360 || { link: "", cards: [] };
  const cards = (app.cards || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Title", `app360.cards.${i}.title`, item.title)}${textField("Line", `app360.cards.${i}.line`, item.line || "")}${colorField("Color", `app360.cards.${i}.color`, item.color)}</div>`, `app360.cards.${i}`)).join("");
  return `${textField("App link", "app360.link", app.link || "")}<p>This link opens in a new tab from the 360 App page.</p>${cards}<button class="btn gold" type="button" data-add="cards">Add card</button>${mediaBlock("app360")}`;
}
function fieldPanel() {
  const f = draft.field;
  const rows = (f.rows || []).map((item, i) => block(item.name, `<div class="admin-grid">${textField("Name", `field.rows.${i}.name`, item.name)}${numField("2025", `field.rows.${i}.a`, item.a)}${numField("2026", `field.rows.${i}.b`, item.b)}</div>`, `field.rows.${i}`)).join("");
  const districts = (f.districts || []).map((item, i) => block(item.name, `<div class="admin-grid">${textField("District", `field.districts.${i}.name`, item.name)}${textField("Places", `field.districts.${i}.detail`, item.detail || "")}</div>`, `field.districts.${i}`)).join("");
  return `${rows}<button class="btn gold" type="button" data-add="rows">Add damage row</button>${districts}<button class="btn gold" type="button" data-add="districts">Add district</button>${linesField("Measures", "field.measures", f.measures)}${linesField("Vision 2027", "field.vision", f.vision)}${linesField("Verification chain", "field.chain", f.chain)}${linesField("Residential causes", "field.residential.causes", f.residential.causes)}${linesField("Residential changes", "field.residential.recommendations", f.residential.recommendations)}${linesField("Communication causes", "field.communication.causes", f.communication.causes)}${linesField("Communication changes", "field.communication.recommendations", f.communication.recommendations)}${mediaBlock("field")}`;
}
function advisoryPanel() {
  const books = (draft.advisories || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Title", `advisories.${i}.title`, item.title)}${textField("Kind", `advisories.${i}.kind`, item.kind)}${colorField("Color", `advisories.${i}.color`, item.color)}</div>${textField("Line", `advisories.${i}.line`, item.line)}${textField("Second line", `advisories.${i}.line2`, item.line2)}`, `advisories.${i}`)).join("");
  return `<input id="finder" type="search" placeholder="Find an advisory"><button class="btn gold" type="button" data-add="advisories">Add advisory</button>${books}${mediaBlock("advisories")}`;
}
function seminarPanel() {
  const rows = (draft.seminars || []).map((item, i) => block(item.t, `<div class="admin-grid">${textField("Title", `seminars.${i}.t`, item.t)}${textField("Date", `seminars.${i}.d`, item.d)}${numField("Year", `seminars.${i}.y`, item.y)}${textField("Place", `seminars.${i}.loc`, item.loc)}${numField("People", `seminars.${i}.n`, item.n)}</div>`, `seminars.${i}`)).join("");
  return `${rows}<button class="btn gold" type="button" data-add="seminars">Add seminar</button>${mediaBlock("seminars")}`;
}
function portalPanel() {
  const rows = (draft.portals || []).map((item, i) => block(item.title, `<div class="admin-grid">${textField("Name", `portals.${i}.title`, item.title)}${textField("Link", `portals.${i}.url`, item.url)}${colorField("Color", `portals.${i}.color`, item.color)}</div>${linesField("Introduction", `portals.${i}.items`, item.items)}<p>Open in another page uses this link and opens a new tab.</p>`, `portals.${i}`)).join("");
  return `${rows}<button class="btn gold" type="button" data-add="portals">Add portal</button>${mediaBlock("portals")}`;
}

function pageBody() {
  if (panel === "home") return homePanel();
  if (panel === "mandate") return mandatePanel();
  if (panel === "audit") return auditPanel();
  if (panel === "drim") return drimPanel();
  if (panel === "hubs") return hubsPanel();
  if (panel === "app360") return appPanel();
  if (panel === "field") return fieldPanel();
  if (panel === "advisories") return advisoryPanel();
  if (panel === "seminars") return seminarPanel();
  return portalPanel();
}

function loginView() {
  return `<header class="topbar"><div class="brand"><img src="assets/ndma-logo.png" alt="NDMA" /><div><h1>INFRA WING</h1><p>Admin</p></div></div><a class="btn cyan" href="/">Wing</a></header>
    <form class="card login-card" id="login"><h2>Admin</h2><div class="editor"><label>Password<input type="password" name="password" required /></label><button class="btn" type="submit">Enter</button></div></form>`;
}

function editors() {
  const menu = PAGES.map(([id, label]) => `<button type="button" data-panel="${id}" class="${panel === id ? "is-on" : ""}" title="${esc(label)}"><span>${esc(label)}</span></button>`).join("");
  return `<div class="admin-desk">
    <aside class="admin-side">
      <button class="menu-toggle" type="button" data-menu aria-label="Expand or collapse the menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>
      ${menu}
      <a class="side-admin" href="/">Back to the wing</a>
    </aside>
    <main class="admin-main">
      <div class="actions"><h2>${esc((PAGES.find((item) => item[0] === panel) || PAGES[0])[1])}</h2><button class="btn coral" type="button" id="logout">Leave</button></div>
      <article class="card pad admin-form">${pageBody()}<div class="actions"><button class="btn" type="button" id="save">Save</button><span class="admin-note" id="note"></span></div></article>
    </main>
  </div>`;
}

function setPath(path, value) {
  const parts = path.split(".");
  let node = draft;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
    if (node[key] == null) return;
    node = node[key];
  }
  const last = parts[parts.length - 1];
  node[/^\d+$/.test(last) ? Number(last) : last] = value;
}
function readPanel() {
  if (!draft) return;
  document.querySelectorAll("[data-path]").forEach((el) => {
    if (el.type === "color") return;
    let value = el.value;
    if (el.dataset.lines) value = value.split("\n").map((item) => item.trim()).filter(Boolean);
    else if (el.dataset.num) value = Number(value);
    else if (el.dataset.numlist) value = value.split(",").map((item) => Number(item.trim() || 0));
    setPath(el.dataset.path, value);
  });
}
function removeAt(path) {
  const parts = path.split(".");
  const index = Number(parts.pop());
  let node = draft;
  parts.forEach((part) => { node = node[/^\d+$/.test(part) ? Number(part) : part]; });
  if (Array.isArray(node)) node.splice(index, 1);
}
function addRow(kind) {
  if (kind === "mandate") draft.mandate.push({ title: "New", color: "#f0c14b" });
  if (kind === "classes") draft.classes.push({ title: "New", line: "", color: "#3ad7f5" });
  if (kind === "zones") draft.drim.zones.push({ name: "Zone", color: "#ff9f43", models: [] });
  if (kind === "cards") draft.app360.cards.push({ title: "New", line: "", color: "#6aa4ff" });
  if (kind === "rows") draft.field.rows.push({ name: "New", a: 0, b: 0 });
  if (kind === "districts") draft.field.districts.push({ name: "District", detail: "" });
  if (kind === "advisories") draft.advisories.push({ title: "New advisory", kind: "Advisory", line: "", line2: "", color: "#f0a202", cover: "", file: "" });
  if (kind === "seminars") draft.seminars.push({ t: "Seminar", d: "", y: 2026, loc: "", n: 0 });
  if (kind === "portals") draft.portals.push({ title: "Portal", url: "", color: "#ff8a3d", items: [] });
}

function render() {
  document.getElementById("admin").innerHTML = token && draft ? editors() : loginView();
  bind();
}
function note(text) {
  const el = document.getElementById("note");
  if (el) el.textContent = text;
}

async function save() {
  readPanel();
  const res = await api("/api/content", { method: "PUT", json: draft });
  if (!res.ok) return note("Save failed");
  note("Saved. It is playing on the portal.");
}

async function sendFile(key, file) {
  const body = new FormData();
  body.append("file", file);
  body.append("key", key);
  const res = await api("/api/wing-media", { method: "POST", body });
  if (!res.ok) return null;
  return res.json();
}

function bind() {
  const form = document.getElementById("login");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const res = await fetch(apiBase() + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: data.get("password") }) });
      if (!res.ok) return;
      token = (await res.json()).token;
      localStorage.setItem("infra-token", token);
      draft = await (await api("/api/content")).json();
      media = await (await api("/api/wing-media")).json();
      render();
    });
    return;
  }
  document.getElementById("logout").onclick = () => {
    token = "";
    localStorage.removeItem("infra-token");
    draft = null;
    render();
  };
  document.getElementById("save").onclick = () => save();
  document.querySelectorAll("[data-menu]").forEach((btn) => {
    btn.onclick = () => {
      document.body.classList.toggle("menu-slim");
      localStorage.setItem("wing-menu", document.body.classList.contains("menu-slim") ? "slim" : "open");
    };
  });
  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.onclick = () => {
      readPanel();
      panel = btn.dataset.panel;
      render();
    };
  });
  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.onclick = () => {
      readPanel();
      addRow(btn.dataset.add);
      render();
    };
  });
  document.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.onclick = () => {
      readPanel();
      removeAt(btn.dataset.remove);
      render();
    };
  });
  document.querySelectorAll('input[type="color"]').forEach((picker) => {
    picker.addEventListener("input", () => {
      document.querySelectorAll(`[data-path="${CSS.escape(picker.dataset.path)}"]`).forEach((el) => {
        if (el !== picker) el.value = picker.value;
      });
    });
  });
  const finder = document.getElementById("finder");
  if (finder) finder.addEventListener("input", () => {
    const q = finder.value.trim().toLowerCase();
    document.querySelectorAll(".admin-block").forEach((row) => {
      row.hidden = Boolean(q) && !row.innerText.toLowerCase().includes(q);
    });
  });
  document.querySelectorAll("[data-upload]").forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      const file = form.querySelector("input[type=file]").files[0];
      if (!file) return;
      const saved = await sendFile(form.dataset.upload, file);
      note(saved ? "Saved. It is playing on the portal." : "The file was not saved");
    };
  });
  const fresh = document.querySelector("[data-new-media]");
  if (fresh) fresh.onsubmit = async (e) => {
    e.preventDefault();
    readPanel();
    const file = fresh.querySelector("input[type=file]").files[0];
    const title = fresh.querySelector("input[name=title]").value.trim() || "Media";
    if (!file) return;
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const kind = /mp4|webm|mov/.test(ext) ? "video" : "image";
    const key = `portal/${panel}/${Date.now()}.${ext}`;
    const saved = await sendFile(key, file);
    if (!saved) return note("The file was not saved");
    draft.media = Array.isArray(draft.media) ? draft.media : [];
    draft.media.push({ id: panel, title, kind, key });
    await save();
    media = await (await api("/api/wing-media")).json();
    render();
    note("Saved. It is playing on the portal.");
  };
}

async function boot() {
  if (localStorage.getItem("wing-menu") === "slim") document.body.classList.add("menu-slim");
  if (token) {
    try {
      draft = await (await api("/api/content")).json();
      media = await (await api("/api/wing-media")).json();
    } catch (error) {
      draft = null;
    }
  }
  render();
}

boot();
