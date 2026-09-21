// functions/api/account.js
// Облачные аккаунты Спарк: регистрация, вход, сохранение и загрузка прогресса.
// Хранилище: Workers KV, биндинг ACCOUNTS (см. wrangler.toml).
//
// POST /api/account
// body: { action: "register"|"login"|"save"|"load"|"logout", login, password, token, state }

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normLogin(login) {
  return String(login || "").trim().toLowerCase();
}

function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const saltBytes = new Uint8Array(saltHex.match(/.{1,2}/g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyPassword(password, saltHex, hashHex) {
  const check = await hashPassword(password, saltHex);
  if (check.length !== hashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < check.length; i++) diff |= check.charCodeAt(i) ^ hashHex.charCodeAt(i);
  return diff === 0;
}

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 60; // 60 дней

export async function onRequestPost(context) {
  const { request, env } = context;
  const KV = env.ACCOUNTS;
  if (!KV) return jsonResponse({ ok: false, error: "Хранилище аккаунтов не подключено (нет биндинга ACCOUNTS)" }, 500);

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return jsonResponse({ ok: false, error: "Некорректный запрос" }, 400);
  }

  const action = body.action;

  if (action === "register") {
    const login = normLogin(body.login);
    const password = String(body.password || "");
    if (login.length < 3) return jsonResponse({ ok: false, error: "Логин должен быть не короче 3 символов" }, 400);
    if (!/^[a-z0-9_\-]+$/i.test(login)) return jsonResponse({ ok: false, error: "Логин может содержать только латинские буквы, цифры, _ и -" }, 400);
    if (password.length < 4) return jsonResponse({ ok: false, error: "Пароль должен быть не короче 4 символов" }, 400);

    const key = "user:" + login;
    const existing = await KV.get(key);
    if (existing) return jsonResponse({ ok: false, error: "Такой логин уже занят" }, 409);

    const salt = randomHex(16);
    const hash = await hashPassword(password, salt);
    const now = Date.now();
    const record = { login, salt, hash, state: body.state || null, createdAt: now, updatedAt: now };
    await KV.put(key, JSON.stringify(record));

    const token = randomHex(24);
    await KV.put("token:" + token, login, { expirationTtl: SESSION_TTL_SECONDS });

    return jsonResponse({ ok: true, token, state: record.state });
  }

  if (action === "login") {
    const login = normLogin(body.login);
    const password = String(body.password || "");
    const key = "user:" + login;
    const raw = await KV.get(key);
    if (!raw) return jsonResponse({ ok: false, error: "Неверный логин или пароль" }, 401);
    const record = JSON.parse(raw);
    const valid = await verifyPassword(password, record.salt, record.hash);
    if (!valid) return jsonResponse({ ok: false, error: "Неверный логин или пароль" }, 401);

    const token = randomHex(24);
    await KV.put("token:" + token, login, { expirationTtl: SESSION_TTL_SECONDS });

    return jsonResponse({ ok: true, token, state: record.state });
  }

  if (action === "save" || action === "load" || action === "logout") {
    const token = String(body.token || "");
    if (!token) return jsonResponse({ ok: false, error: "Нет токена сессии" }, 401);
    const login = await KV.get("token:" + token);
    if (!login) return jsonResponse({ ok: false, error: "Сессия истекла, войдите заново" }, 401);

    if (action === "logout") {
      await KV.delete("token:" + token);
      return jsonResponse({ ok: true });
    }

    const key = "user:" + login;
    const raw = await KV.get(key);
    if (!raw) return jsonResponse({ ok: false, error: "Пользователь не найден" }, 404);
    const record = JSON.parse(raw);

    if (action === "load") {
      return jsonResponse({ ok: true, state: record.state, login: record.login });
    }

    // save
    record.state = body.state ?? null;
    record.updatedAt = Date.now();
    await KV.put(key, JSON.stringify(record));
    await KV.put("token:" + token, login, { expirationTtl: SESSION_TTL_SECONDS });
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ ok: false, error: "Неизвестное действие" }, 400);
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "Используйте POST" }, 405);
}
