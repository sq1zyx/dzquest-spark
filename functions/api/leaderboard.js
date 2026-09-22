// functions/api/leaderboard.js
// Глобальный топ игроков: по темам, по стрику, по осколкам.
// Хранилище: тот же Workers KV биндинг ACCOUNTS (см. wrangler.toml),
// один ключ lb_index с JSON-массивом записей — этого достаточно для
// масштаба приложения (семья/класс/школа).
//
// POST /api/leaderboard
// body: { action: "submit", code, name, coins, streak, longestStreak, topics, grade, optIn }
// body: { action: "list" }

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

const LB_KEY = "lb_index";
const LB_MAX_ENTRIES = 300;

async function loadIndex(KV){
  const raw = await KV.get(LB_KEY);
  if(!raw) return [];
  try{ const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; }
  catch(e){ return []; }
}

function sanitizeStr(v, maxLen){
  return String(v == null ? "" : v).slice(0, maxLen);
}
function sanitizeNum(v){
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const KV = env.ACCOUNTS;
  if (!KV) return jsonResponse({ ok: false, error: "Хранилище не подключено" }, 500);

  let body;
  try { body = await request.json(); }
  catch(e){ return jsonResponse({ ok: false, error: "Некорректный запрос" }, 400); }

  const action = body.action;

  if(action === "submit"){
    const code = sanitizeStr(body.code, 12).toUpperCase();
    if(!code) return jsonResponse({ ok: false, error: "Нет кода игрока" }, 400);
    let list = await loadIndex(KV);

    if(body.optIn === false){
      list = list.filter(e => e.code !== code);
      await KV.put(LB_KEY, JSON.stringify(list));
      return jsonResponse({ ok: true, removed: true });
    }

    const entry = {
      code,
      name: sanitizeStr(body.name, 24) || "Ученик",
      coins: sanitizeNum(body.coins),
      streak: sanitizeNum(body.streak),
      longestStreak: sanitizeNum(body.longestStreak),
      topics: sanitizeNum(body.topics),
      grade: sanitizeNum(body.grade),
      updatedAt: Date.now(),
    };

    const idx = list.findIndex(e => e.code === code);
    if(idx >= 0) list[idx] = entry; else list.push(entry);

    if(list.length > LB_MAX_ENTRIES){
      list.sort((a,b) => b.updatedAt - a.updatedAt);
      list = list.slice(0, LB_MAX_ENTRIES);
    }

    await KV.put(LB_KEY, JSON.stringify(list));
    return jsonResponse({ ok: true });
  }

  if(action === "list"){
    const cache = caches.default;
    const cacheKey = new Request(new URL("/api/leaderboard-list-cache", request.url), { method: "GET" });
    const cached = await cache.match(cacheKey);
    if(cached) return cached;

    const list = await loadIndex(KV);
    const top = (arr, key, n) => arr.slice().sort((a,b) => b[key] - a[key]).slice(0, n)
      .map(e => ({ name: e.name, code: e.code, coins: e.coins, streak: e.streak, longestStreak: e.longestStreak, topics: e.topics, grade: e.grade }));
    const payload = jsonResponse({
      ok: true,
      byTopics: top(list, "topics", 20),
      byStreak: top(list, "longestStreak", 20),
      byCoins: top(list, "coins", 20),
    });
    payload.headers.set("Cache-Control", "public, max-age=20");
    context.waitUntil(cache.put(cacheKey, payload.clone()));
    return payload;
  }

  return jsonResponse({ ok: false, error: "Неизвестное действие" }, 400);
}

export async function onRequestGet() {
  return jsonResponse({ ok: false, error: "Используйте POST" }, 405);
}
