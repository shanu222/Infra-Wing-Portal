let draft = null;
let token = localStorage.getItem("infra-token") || "";
let panel = "portals";
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function apiBase() {
  const stored = localStorage.getItem("infra-api") || "";
  return String(stored || window.INFRA_API || "").replace(/\/$/, "");
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

function input(value, attrs, on) {
  return `<input ${attrs} value="${esc(value)}">`;
}

function panelButton(id, label, color) {
  return `<button class="btn ${panel === id ? "" : "ghost"}" type="button" data-panel="${id}" style="${panel === id ? `--face:${color};--lip:#111` : ""}">${label}</button>`;
}

function loginView() {
  return `<header class="topbar"><div class="brand"><img src="assets/ndma-logo.png" alt="NDMA" /><div><h1>INFRA WING</h1><p>Admin</p></div></div><a class="btn cyan" href="/">Wing</a></header>
    <form class="card login-card" id="login">
      <h2>Admin</h2>
      <div class="editor"><label>Password<input type="password" name="password" required /></label><label>Backend URL<input name="api" value="${esc(localStorage.getItem("infra-api") || "")}" placeholder="https://your-api.up.railway.app" /></label><button class="btn" type="submit">Enter</button></div>
    </form>`;
}

function stringRows(list, key) {
  return `<div class="editor" data-strings="${key}">${list.map((item, i) => `<div class="row-edit"><input data-i="${i}" value="${esc(item)}" /><button class="btn coral" type="button" data-del="${i}">Remove</button></div>`).join("")}<button class="btn gold" type="button" data-add>Add</button></div>`;
}

function editors() {
  const colors = ["#1ec87a", "#f0c14b", "#3ad7f5", "#ff9f43", "#b08cff", "#ff6d6d", "#6aa4ff", "#ff6fa8", "#ff8a3d", "#8dffc8"];
  const menus = [["brand", "Brand", colors[0]], ["stats", "Stats", colors[1]], ["mandate", "Mandate", colors[2]], ["drim", "DRIM", colors[3]], ["portals", "Portals", colors[4]], ["media", "Media", colors[5]], ["seminars", "Seminars", colors[6]], ["hubs", "Hubs", colors[7]], ["json", "All data", colors[8]]];
  let body = "";
  if (panel === "brand") {
    body = `<div class="editor"><label>Title<input id="brand-title" value="${esc(draft.brand.title)}" /></label><label>Line<input id="brand-line" value="${esc(draft.brand.line)}" /></label></div>`;
  } else if (panel === "stats") {
    body = `<div class="editor" id="stats">${draft.stats.map((s, i) => `<div class="row-edit"><input data-k="label" data-i="${i}" value="${esc(s.label)}" /><input data-k="n" data-i="${i}" value="${esc(s.n)}" /><input data-k="color" data-i="${i}" value="${esc(s.color)}" /><button class="btn coral" type="button" data-del="${i}">Remove</button></div>`).join("")}<button class="btn gold" type="button" data-add>Add</button></div>`;
  } else if (panel === "mandate") {
    body = `<div class="editor" id="mandate">${draft.mandate.map((s, i) => `<div class="row-edit"><input data-k="title" data-i="${i}" value="${esc(s.title)}" /><input data-k="color" data-i="${i}" value="${esc(s.color)}" /><button class="btn coral" type="button" data-del="${i}">Remove</button></div>`).join("")}<button class="btn gold" type="button" data-add>Add</button></div>`;
  } else if (panel === "drim") {
    body = `<div class="editor" id="zones">${draft.drim.zones.map((z, i) => `<div class="card pad" style="--accent:${z.color}"><div class="row-edit"><input data-k="name" data-i="${i}" value="${esc(z.name)}" /><input data-k="color" data-i="${i}" value="${esc(z.color)}" /><button class="btn coral" type="button" data-del="${i}">Remove</button></div><label>Models<textarea data-k="models" data-i="${i}">${esc(z.models.join("\n"))}</textarea></label></div>`).join("")}<button class="btn gold" type="button" data-add>Add zone</button></div>`;
  } else if (panel === "portals") {
    body = `<div class="editor" id="portals">${draft.portals.map((p, i) => `<div class="card pad" style="--accent:${p.color || "#ff8a3d"}"><div class="row-edit"><input data-k="title" data-i="${i}" value="${esc(p.title)}" /><input data-k="url" data-i="${i}" value="${esc(p.url)}" placeholder="https://" /><input data-k="color" data-i="${i}" value="${esc(p.color || "#ff8a3d")}" /><button class="btn coral" type="button" data-del="${i}">Remove</button></div><label>Items<textarea data-k="items" data-i="${i}">${esc((p.items || []).join("\n"))}</textarea></label></div>`).join("")}<button class="btn amber" type="button" data-add>Add portal</button></div>`;
  } else if (panel === "media") {
    body = `<form class="editor" id="upload"><label>Title<input name="title" /></label><label>File<input name="file" type="file" accept="image/*,video/*" /></label><label>Or video URL<input name="url" placeholder="https://" /></label><button class="btn cyan" type="submit">Add media</button></form><div class="media-grid" style="margin-top:14px">${draft.media.map((m, i) => `<article class="card pad" style="--accent:#7ee0c6"><b>${esc(m.type)}</b><h3>${esc(m.title)}</h3><button class="btn coral" type="button" data-del-media="${i}">Remove</button></article>`).join("")}</div>`;
  } else if (panel === "seminars") {
    body = `<div class="editor" id="seminars">${draft.seminars.map((s, i) => `<div class="row-edit"><input data-k="t" data-i="${i}" value="${esc(s.t)}" /><input data-k="d" data-i="${i}" value="${esc(s.d)}" /><input data-k="n" data-i="${i}" value="${esc(s.n)}" /><button class="btn coral" type="button" data-del="${i}">Remove</button><input data-k="loc" data-i="${i}" value="${esc(s.loc)}" /><input data-k="y" data-i="${i}" value="${esc(s.y)}" /></div>`).join("")}<button class="btn pink" type="button" data-add>Add seminar</button></div>`;
  } else if (panel === "hubs") {
    body = `<div class="editor" id="hubs">${draft.hubs.map((h, i) => `<label>${esc(h.name)} · ${esc(h.region)}<input data-i="${i}" value="${esc(h.stock.join(", "))}" /></label>`).join("")}</div>`;
  } else if (panel === "json") {
    body = `<div class="editor"><textarea id="raw" rows="22">${esc(JSON.stringify(draft, null, 2))}</textarea><button class="btn violet" type="button" id="apply-json">Apply</button></div>`;
  }
  return `<header class="topbar"><div class="brand"><img src="assets/ndma-logo.png" alt="NDMA" /><div><h1>INFRA WING</h1><p>Admin</p></div></div><div class="actions"><a class="btn cyan" href="/">Wing</a><button class="btn coral" type="button" id="logout">Leave</button></div></header>
    <main class="admin-wrap">
      <div class="switch">${menus.map(([id, label, color]) => panelButton(id, label, color)).join("")}</div>
      <article class="card pad" style="--accent:${(menus.find((m) => m[0] === panel) || menus[0])[2]}">${body}<div class="actions" style="margin-top:14px"><button class="btn" type="button" id="save">Save</button><span id="note"></span></div></article>
    </main>`;
}

function readPanel() {
  if (!draft) return;
  if (panel === "brand") {
    const title = document.getElementById("brand-title");
    const line = document.getElementById("brand-line");
    if (title) draft.brand.title = title.value;
    if (line) draft.brand.line = line.value;
  } else if (panel === "stats") {
    document.querySelectorAll("#stats [data-k]").forEach((el) => {
      const row = draft.stats[Number(el.dataset.i)];
      if (!row) return;
      row[el.dataset.k] = el.dataset.k === "n" ? Number(el.value) : el.value;
    });
  } else if (panel === "mandate") {
    document.querySelectorAll("#mandate [data-k]").forEach((el) => {
      const row = draft.mandate[Number(el.dataset.i)];
      if (row) row[el.dataset.k] = el.value;
    });
  } else if (panel === "drim") {
    document.querySelectorAll("#zones [data-k]").forEach((el) => {
      const row = draft.drim.zones[Number(el.dataset.i)];
      if (!row) return;
      if (el.dataset.k === "models") row.models = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
      else row[el.dataset.k] = el.value;
    });
  } else if (panel === "portals") {
    document.querySelectorAll("#portals [data-k]").forEach((el) => {
      const row = draft.portals[Number(el.dataset.i)];
      if (!row) return;
      if (el.dataset.k === "items") row.items = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
      else row[el.dataset.k] = el.value;
    });
  } else if (panel === "seminars") {
    document.querySelectorAll("#seminars [data-k]").forEach((el) => {
      const row = draft.seminars[Number(el.dataset.i)];
      if (!row) return;
      row[el.dataset.k] = el.dataset.k === "n" || el.dataset.k === "y" ? Number(el.value) : el.value;
    });
  } else if (panel === "hubs") {
    document.querySelectorAll("#hubs input").forEach((el) => {
      const row = draft.hubs[Number(el.dataset.i)];
      if (row) row.stock = el.value.split(",").map((n) => Number(n.trim() || 0));
    });
  }
}

function render() {
  document.getElementById("admin").innerHTML = token && draft ? editors() : loginView();
  bind();
}

function bind() {
  const form = document.getElementById("login");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(form);
      localStorage.setItem("infra-api", String(data.get("api") || "").trim());
      const res = await fetch(apiBase() + "/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: data.get("password") }) });
      if (!res.ok) return;
      const body = await res.json();
      token = body.token;
      localStorage.setItem("infra-token", token);
      draft = await (await api("/api/content")).json();
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
  document.querySelectorAll("[data-panel]").forEach((btn) => {
    btn.onclick = () => {
      readPanel();
      panel = btn.dataset.panel;
      render();
    };
  });
  const add = document.querySelector("[data-add]");
  if (add) add.onclick = () => {
    readPanel();
    if (panel === "stats") draft.stats.push({ n: 0, label: "New", color: "#1ec87a" });
    if (panel === "mandate") draft.mandate.push({ title: "New", color: "#f0c14b" });
    if (panel === "drim") draft.drim.zones.push({ name: "Zone", color: "#ff9f43", models: [] });
    if (panel === "portals") draft.portals.push({ title: "Portal", url: "", color: "#ff8a3d", items: [] });
    if (panel === "seminars") draft.seminars.push({ t: "Seminar", d: "", y: 2026, loc: "", n: 0 });
    render();
  };
  document.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = () => {
      readPanel();
      const i = Number(btn.dataset.del);
      const key = panel === "drim" ? null : panel;
      if (panel === "stats") draft.stats.splice(i, 1);
      if (panel === "mandate") draft.mandate.splice(i, 1);
      if (panel === "drim") draft.drim.zones.splice(i, 1);
      if (panel === "portals") draft.portals.splice(i, 1);
      if (panel === "seminars") draft.seminars.splice(i, 1);
      if (key) void key;
      render();
    };
  });
  document.querySelectorAll("[data-del-media]").forEach((btn) => {
    btn.onclick = () => {
      draft.media.splice(Number(btn.dataset.delMedia), 1);
      render();
    };
  });
  const upload = document.getElementById("upload");
  if (upload) upload.onsubmit = async (e) => {
    e.preventDefault();
    const data = new FormData(upload);
    const title = String(data.get("title") || "Media");
    const url = String(data.get("url") || "").trim();
    const file = upload.querySelector("input[type=file]").files[0];
    if (file) {
      const body = new FormData();
      body.append("file", file);
      body.append("title", title);
      const res = await api("/api/upload", { method: "POST", body });
      draft.media.push(await res.json());
    } else if (url) {
      draft.media.push({ id: String(Date.now()), type: "video", title, url });
    }
    await save();
  };
  const apply = document.getElementById("apply-json");
  if (apply) apply.onclick = () => {
    try {
      draft = JSON.parse(document.getElementById("raw").value);
      note("Applied");
    } catch (error) {
      note("Invalid data");
    }
  };
}

function note(text) {
  const el = document.getElementById("note");
  if (el) el.textContent = text;
}

async function save() {
  readPanel();
  const res = await api("/api/content", { method: "PUT", json: draft });
  if (res.ok) note("Saved");
}

async function boot() {
  if (token) {
    try {
      const res = await api("/api/content");
      draft = await res.json();
    } catch (error) {
      draft = null;
    }
  }
  render();
}

boot();
