const KV_KEY = "shopping_list";

function jsonResponse(data, status, extraHeaders) {
  const headers = Object.assign(
    { "content-type": "application/json; charset=utf-8" },
    extraHeaders || {}
  );
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

function checkAuth(request, env) {
  const header = request.headers.get("authorization") || "";
  const expected = "Bearer " + env.HOUSE_CODE;
  return env.HOUSE_CODE && header === expected;
}

async function loadList(env) {
  const raw = await env.KW.get(KV_KEY);
  if (!raw) {
    return { version: 0, items: [] };
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.items) parsed.items = [];
    if (!parsed.version) parsed.version = 0;
    return parsed;
  } catch (e) {
    return { version: 0, items: [] };
  }
}

async function saveList(env, list) {
  await env.KW.put(KV_KEY, JSON.stringify(list));
}

function makeId() {
  return Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export async function onRequestGet(context) {
  const request = context.request;
  const env = context.env;
  if (!checkAuth(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  const list = await loadList(env);
  return jsonResponse(list, 200, { etag: String(list.version) });
}

export async function onRequestPut(context) {
  const request = context.request;
  const env = context.env;
  if (!checkAuth(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  const current = await loadList(env);
  const items = Array.isArray(body.items) ? body.items : [];
  const next = { version: current.version + 1, items: items };
  await saveList(env, next);
  return jsonResponse(next, 200, { etag: String(next.version) });
}

export async function onRequestPost(context) {
  const request = context.request;
  const env = context.env;
  if (!checkAuth(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  if (!body.nome) {
    return jsonResponse({ error: "missing_nome" }, 400);
  }
  const current = await loadList(env);
  const item = {
    id: body.id || makeId(),
    nome: body.nome,
    emoji: body.emoji || "🛒",
    origine: body.origine || "manuale",
    aggiunto_il: new Date().toISOString(),
    comprato: false
  };
  const existingIdx = current.items.findIndex(function (i) {
    return i.id === item.id || (i.nome === item.nome && !i.comprato);
  });
  if (existingIdx >= 0) {
    current.items[existingIdx] = Object.assign({}, current.items[existingIdx], { nome: item.nome, emoji: item.emoji });
  } else {
    current.items.push(item);
  }
  current.version = current.version + 1;
  await saveList(env, current);
  return jsonResponse(current, 200, { etag: String(current.version) });
}

export async function onRequestPatch(context) {
  const request = context.request;
  const env = context.env;
  if (!checkAuth(request, env)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ error: "invalid_json" }, 400);
  }
  if (!body.id || !body.action) {
    return jsonResponse({ error: "missing_id_or_action" }, 400);
  }
  const current = await loadList(env);
  const idx = current.items.findIndex(function (i) {
    return i.id === body.id;
  });

  if (body.action === "remove") {
    if (idx >= 0) {
      current.items.splice(idx, 1);
      current.version = current.version + 1;
      await saveList(env, current);
    }
    return jsonResponse(current, 200, { etag: String(current.version) });
  }

  if (body.action === "toggle") {
    if (idx >= 0) {
      current.items[idx].comprato = typeof body.comprato === "boolean" ? body.comprato : !current.items[idx].comprato;
      current.version = current.version + 1;
      await saveList(env, current);
    }
    return jsonResponse(current, 200, { etag: String(current.version) });
  }

  return jsonResponse({ error: "unknown_action" }, 400);
}
