const HUE = {
  math: 225,
  rus: 350,
  phys: 265,
  chem: 160,
  inf: 195,
  soc: 30,
  hist: 15,
  bio: 115,
  geo: 175,
  eng: 290,
  lit: 50,
};
const GRADES = [
  { g: 8, exam: "o", year: 2028 },
  { g: 9, exam: "o", year: 2027 },
  { g: 10, exam: "e", year: 2028 },
  { g: 11, exam: "e", year: 2027 },
];
const defDate = (exam, year) => year + (exam === "e" ? "-06-01" : "-06-02");
const KEY = "otschet-gia-v1";
let debtsOpen = false,
  mocksAll = false;
let st = load(),
  sel = null,
  tab = "day",
  calM = null,
  timer = null,
  topSubj = null,
  openTopic = null,
  mockSel = null,
  topQuery = "",
  topNum = "";
function blank() {
  return { plan: null, ans: {}, swap: {}, mist: {}, rev: {}, revLog: {}, mocks: {}, goals: {}, friends: [] };
}
function fix(s) {
  const p = s.plan;
  if (p) {
    if (!p.grade) p.grade = p.exam === "e" ? 11 : 9;
    if (!p.per) {
      p.per = Math.min(3, p.subjects.length);
      p.tasks = 2;
      delete p.load;
    }
    if (!p.ml) p.ml = "p";
  }
  const b = blank();
  for (const k in b) if (!s[k]) s[k] = b[k];
  return s;
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "null");
    if (s && s.plan) return fix(s);
  } catch (e) {}
  return blank();
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(st));
  } catch (e) {}
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dayMs = 864e5;
const dOnly = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const parseD = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d) =>
  d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const daysBetween = (a, b) => Math.round((dOnly(b) - dOnly(a)) / dayMs);
const todayIso = () => iso(dOnly(new Date()));
const addDays = (s, n) => {
  const d = parseD(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const MON = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];
const MON1 = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];
const MONP = [
  "январе",
  "феврале",
  "марте",
  "апреле",
  "мае",
  "июне",
  "июле",
  "августе",
  "сентябре",
  "октябре",
  "ноябре",
  "декабре",
];
const WD = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const human = (d, y) => d.getDate() + " " + MON[d.getMonth()] + (y ? " " + d.getFullYear() : "");
function plural(n, a, b, c) {
  n = Math.abs(n) % 100;
  const n1 = n % 10;
  if (n > 10 && n < 20) return c;
  if (n1 > 1 && n1 < 5) return b;
  if (n1 == 1) return a;
  return c;
}
const hs = (s) => `style="--h:${HUE[s]}"`;
const examName = (e) => (e === "e" ? "ЕГЭ" : "ОГЭ");
const TOP = Object.fromEntries(T.map((t) => [t.id, t]));
const H = (s) => {
  let h = 2166136261;
  for (const c of String(s)) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};
const avail = (t, p) => (t.s === "math" && p.exam === "e" ? t.ex.includes(p.ml || "p") : t.ex.includes(p.exam));
const subjName = (s, p) =>
  s === "math" && p && p.exam === "e" ? (p.ml === "b" ? "Математика (база)" : "Математика (профиль)") : SUBJ[s];
const listFor = (s, p) => T.filter((t) => t.s === s && avail(t, p));
const kimFor = (t, p) => {
  const k = KIM[t.id];
  if (!k || !p) return "";
  return (t.s === "math" && p.exam === "e" ? k[p.ml || "p"] : k[p.exam]) || "";
};
const kimChip = (t, p) => {
  const k = kimFor(t, p);
  return k ? `<span class="chip kim">${examName(p.exam)} № ${k}</span>` : "";
};
const tsize = (t) => (t.g ? Infinity : t.q.length);
const _gc = {};
function taskAt(t, i) {
  if (i < t.q.length) {
    const q = t.q[i];
    return { text: q[0], ans: q[1], fig: q[2] || null, sol: q[3] || null };
  }
  if (!t.g) {
    const q = t.q[i % t.q.length];
    return { text: q[0], ans: q[1], fig: q[2] || null, sol: q[3] || null };
  }
  const k = t.id + "|" + i;
  if (!_gc[k]) {
    const g = t.g(RNG(H(k)));
    _gc[k] = { text: g[0], ans: g[1], fig: g[2] || null, sol: g[3] || null };
  }
  return _gc[k];
}
function roundQs(t, round, per) {
  const base = (round - 1) * per;
  return Array.from({ length: per }, (_, k) => (t.g ? base + k : (base + k) % t.q.length));
}
function topicsFor(p) {
  const lists = p.subjects.map((s) => listFor(s, p));
  const seq = [];
  const max = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < max; i++)
    lists.forEach((l) => {
      if (l[i]) seq.push(l[i]);
    });
  return seq;
}
function build(p, start, n) {
  const S = p.subjects,
    k = Math.min(p.per, S.length),
    lists = {},
    cnt = {};
  let roundEnd = -1;
  const per = p.tasks >= 4 ? 4 : 2;
  S.forEach((s) => {
    lists[s] = listFor(s, p);
    cnt[s] = 0;
  });
  const days = [];
  for (let d = 0; d < n; d++) {
    const items = [];
    for (let j = 0; j < k; j++) {
      const s = S[(d * k + j) % S.length],
        L = lists[s];
      if (!L.length) continue;
      const c = cnt[s]++;
      const round = Math.floor(c / L.length) + 1;
      const t = L[c % L.length];
      items.push({ t, round, qs: roundQs(t, round, per) });
    }
    if (roundEnd < 0 && S.every((s) => cnt[s] >= lists[s].length)) roundEnd = d;
    days.push({ date: new Date(start.getFullYear(), start.getMonth(), start.getDate() + d), items });
  }
  return {
    days,
    roundEnd,
    minRounds: Math.min(...S.map((s) => (lists[s].length ? cnt[s] / lists[s].length : Infinity))),
  };
}
function schedule() {
  const p = st.plan,
    start = parseD(p.start);
  const r = build(p, start, Math.max(0, daysBetween(start, parseD(p.date))));
  return { seq: topicsFor(p), ...r };
}
const akey = (di, id, qi) => di + ":" + id + ":" + qi;
function dayCount(di, day) {
  let total = 0,
    done = 0;
  day.items.forEach((it) =>
    it.qs.forEach((qi) => {
      total++;
      if (st.ans[akey(di, it.t.id, qi)]) done++;
    }),
  );
  return { total, done };
}
function dayStatus(di, day) {
  const { total, done } = dayCount(di, day);
  return done === 0 ? "none" : done === total ? "done" : "part";
}
function norm(a) {
  return String(a)
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[’‘`]/g, "'")
    .replace(/[\s%.]+$/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/,/g, ".")
    .replace(/[−–]/g, "-")
    .replace(/^\+/, "");
}
function check(input, answers) {
  const v = norm(input);
  if (!v) return null;
  const vs = v.replace(/\s/g, "");
  return answers.some((a) => {
    const n = norm(a);
    if (n === v || n.replace(/\s/g, "") === vs) return true;
    const x = parseFloat(vs),
      y = parseFloat(n);
    return /^-?\d+(\.\d+)?$/.test(vs) && !isNaN(y) && Math.abs(x - y) < 1e-9;
  });
}
const parseSlot = (slot) => {
  const parts = slot.split(":"),
    qi = +parts.pop(),
    tid = parts.pop();
  return { tid, qi, prefix: parts.join(":") };
};
function slotTask(slot) {
  const { tid, qi } = parseSlot(slot);
  const r = st.swap[slot];
  if (r) {
    const [id, i] = r.split("|");
    if (TOP[id]) return { t: TOP[id], qi: +i, swapped: true };
  }
  return { t: TOP[tid], qi, swapped: false };
}
function solvedRefs() {
  const s = new Set();
  Object.values(st.ans).forEach((a) => {
    if (a.ok && a.ref) s.add(a.ref);
  });
  return s;
}
function pickIndex(t, seed, exclude) {
  const ok = solvedRefs();
  if (t.g) return t.q.length + 100 + (seed % 100000);
  let c = t.q.map((_, i) => i).filter((i) => !exclude.has(t.id + "|" + i));
  const b = c.filter((i) => !ok.has(t.id + "|" + i));
  if (b.length) c = b;
  return c.length ? c[seed % c.length] : null;
}
function pickAlt(cur, shown) {
  const ex = new Set([...shown, cur.t.id + "|" + cur.qi]);
  const i = pickIndex(cur.t, Math.floor(Math.random() * 1e9), ex);
  if (i !== null) return cur.t.id + "|" + i;
  const L = listFor(cur.t.s, st.plan).filter((t) => t.id !== cur.t.id);
  const i0 = L.findIndex((t) => T.indexOf(t) > T.indexOf(cur.t));
  for (const t of i0 < 0 ? L : [...L.slice(i0), ...L.slice(0, i0)]) {
    const j = pickIndex(t, Math.floor(Math.random() * 1e9), ex);
    if (j !== null) return t.id + "|" + j;
  }
  return null;
}
const REV = [1, 3, 7];
function afterAnswer(slot, tid, ok) {
  const today = todayIso();
  if (slot.startsWith("r")) {
    const r = st.rev[tid] || { step: 0 };
    if (ok) {
      const step = (r.step || 0) + 1;
      if (step >= REV.length) delete st.rev[tid];
      else st.rev[tid] = { due: addDays(today, REV[step]), step };
    } else st.rev[tid] = { due: addDays(today, 1), step: 0 };
    (st.revLog[today] = st.revLog[today] || []).includes(tid) || st.revLog[today].push(tid);
  } else if (!ok) {
    st.rev[tid] = { due: addDays(today, 1), step: 0 };
  }
  if (!ok) st.mist[tid] = (st.mist[tid] || 0) + 1;
}
function reviewToday() {
  const today = todayIso();
  Object.keys(st.revLog).forEach((d) => {
    if (d !== today) delete st.revLog[d];
  });
  const due = Object.entries(st.rev)
    .filter(([id, r]) => r.due <= today && TOP[id] && avail(TOP[id], st.plan))
    .map(([id]) => id);
  const done = (st.revLog[today] || []).filter((id) => TOP[id]);
  return [...new Set([...done, ...due])];
}
function solBlock(t, task, a) {
  if (!a) return "";
  if (task.sol)
    return `<details class="sol" ${a.ok ? "" : "open"}><summary>Разбор решения</summary><p>${esc(task.sol)}</p></details>`;
  const e = EXP[t.id];
  if (!e || !e.k.length) return "";
  return `<details class="sol" ${a.ok ? "" : "open"}><summary>Как решать</summary><ul>${e.k
    .slice(0, 3)
    .map((x) => `<li>${esc(x)}</li>`)
    .join("")}</ul></details>`;
}
function taskHTML(slot, n, cur, a, id, opts = {}) {
  const task = taskAt(cur.t, cur.qi);
  const lines = task.text.split("\n"),
    isCode = lines.length > 1;
  return `<div class="task">
    <div class="num ${a ? (a.ok ? "ok" : "bad") : ""}">${a ? (a.ok ? "✓" : "✗") : n}</div>
    <div class="task-body">
      ${opts.note || ""}
      ${isCode ? `<p>${esc(lines[0])}</p><p class="code">${esc(lines.slice(1).join("\n"))}</p>` : `<p>${esc(task.text)}</p>`}
      ${task.fig ? `<div class="fig">${task.fig}</div>` : ""}
      <div class="ans">
        <input class="blank ${a ? (a.ok ? "ok" : "bad") : ""}" id="${id}" data-slot="${slot}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="Ответ" value="${a ? esc(a.v) : ""}" aria-label="Ответ на задание ${n}" ${a ? "readonly" : ""}>
        ${a ? (a.ok ? '<span class="res ok">Верно</span>' : `<span class="res bad">Правильно: ${esc(task.ans[0])}</span>`) : `<button class="btn" data-check="${id}">Проверить</button>`}
      </div>
      ${solBlock(cur.t, task, a)}
      ${a && !a.ok && !opts.noAlt ? `<div class="ans"><button class="btn" data-alt="${slot}" data-shown="${(opts.shown || []).join(",")}">Другая задача</button><button class="icon-btn" data-redo="${slot}">Решить эту ещё раз</button></div>` : ""}
    </div>
  </div>`;
}
let _uid = 0;
function topicCard(it, prefix, head) {
  const shown = it.qs.map((qi) => {
    const r = slotTask(prefix + it.t.id + ":" + qi);
    return r.t.id + "|" + r.qi;
  });
  return `<article class="topic" ${hs(it.t.s)}>
    <div class="topic-head">
      <div class="chips"><span class="chip s" ${hs(it.t.s)}>${subjName(it.t.s, st.plan)}</span>${kimChip(it.t, st.plan)}${head || ""}</div>
      <h3>${esc(it.t.t)}</h3>
    </div>
    <div class="tip"><b>Коротко:</b> ${esc(it.t.tip)}</div>
    <div class="tasks">${it.qs
      .map((qi0, n) => {
        const slot = prefix + it.t.id + ":" + qi0,
          cur = slotTask(slot),
          a = st.ans[slot];
        const from = cur.swapped && cur.t.id !== it.t.id;
        return taskHTML(slot, n + 1, cur, a, "a" + _uid++, {
          shown,
          note: cur.swapped
            ? `<div class="chips"><span class="chip warn">Новая задача${from ? " · из темы «" + esc(cur.t.t) + "»" : ""}</span></div>`
            : "",
        });
      })
      .join("")}</div>
  </article>`;
}
function bindTasks(root) {
  const rerender = (focusSlot) => {
    const y = window.scrollY;
    renderMain();
    window.scrollTo(0, y);
    const e = focusSlot && document.querySelector(`[data-slot="${focusSlot}"]`);
    if (e && !e.readOnly) {
      e.focus({ preventScroll: true });
      return;
    }
    const next = [...document.querySelectorAll(".blank")].find((x) => !x.value && !x.readOnly);
    if (next) next.focus({ preventScroll: true });
  };
  root.querySelectorAll("[data-check]").forEach((b) => {
    const inp = root.querySelector("#" + b.dataset.check);
    const slot = inp.dataset.slot;
    const run = () => {
      const cur = slotTask(slot);
      const task = taskAt(cur.t, cur.qi);
      const r = check(inp.value, task.ans);
      if (r === null) {
        inp.focus();
        return;
      }
      st.ans[slot] = { v: inp.value.trim(), ok: r, ref: cur.t.id + "|" + cur.qi, d: todayIso() };
      afterAnswer(slot, cur.t.id, r);
      save();
      rerender();
    };
    b.onclick = run;
    inp.onkeydown = (e) => {
      if (e.key === "Enter") run();
    };
  });
  root.querySelectorAll("[data-alt]").forEach(
    (b) =>
      (b.onclick = () => {
        const slot = b.dataset.alt;
        const alt = pickAlt(slotTask(slot), new Set(b.dataset.shown.split(",")));
        if (!alt) {
          b.textContent = "Других задач пока нет";
          b.disabled = true;
          return;
        }
        st.swap[slot] = alt;
        delete st.ans[slot];
        save();
        rerender(slot);
      }),
  );
  root.querySelectorAll("[data-redo]").forEach(
    (b) =>
      (b.onclick = () => {
        delete st.ans[b.dataset.redo];
        save();
        rerender(b.dataset.redo);
      }),
  );
}
const monthKey = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
function firstSat(y, m) {
  const d = new Date(y, m, 1);
  while (d.getDay() !== 6) d.setDate(d.getDate() + 1);
  return d;
}
function mockList() {
  const p = st.plan,
    start = parseD(p.start),
    exam = parseD(p.date);
  const out = [];
  for (
    let d = new Date(start.getFullYear(), start.getMonth(), 1);
    d < exam;
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  ) {
    let m = firstSat(d.getFullYear(), d.getMonth());
    if (m < start) m = new Date(start);
    if (daysBetween(m, exam) < 3) continue;
    out.push({
      mk: monthKey(d),
      date: m,
      label: MON1[d.getMonth()] + " " + d.getFullYear(),
      inMonth: MONP[d.getMonth()],
    });
  }
  return out;
}
function mockVariant(mk, subj) {
  const p = st.plan,
    L = listFor(subj, p);
  const seed = H(mk + subj + p.start + (p.ml || ""));
  const r = RNG(seed);
  const groups = {};
  const num = (t) => {
    const k = kimFor(t, p);
    const m = k.match(/\d+/);
    return m ? +m[0] : null;
  };
  L.forEach((t) => {
    const n = num(t);
    if (n !== null) (groups[n] = groups[n] || []).push(t);
  });
  let picks;
  const nums = Object.keys(groups)
    .map(Number)
    .sort((a, b) => a - b);
  if (nums.length >= 6) picks = nums.slice(0, 20).map((n) => ({ t: r.p(groups[n]), n }));
  else {
    const step = Math.max(1, L.length / 15);
    picks = [];
    for (let x = 0; x < L.length && picks.length < 15; x += step) picks.push({ t: L[Math.floor(x)], n: null });
  }
  return picks.map((pk, k) => ({
    t: pk.t,
    n: pk.n,
    i: pk.t.g ? pk.t.q.length + 5000 + r.i(0, 99999) : r.i(0, pk.t.q.length - 1),
  }));
}
const minsPer = (s) => (s === "math" ? 6 : s === "phys" || s === "chem" || s === "inf" ? 5 : 3);
function mockState(mk, s) {
  const m = (st.mocks[mk] = st.mocks[mk] || {});
  return (m[s] = m[s] || { answers: {}, done: false });
}
function mockResult(mk, s) {
  const m = st.mocks[mk] && st.mocks[mk][s];
  return m && m.done ? m : null;
}
function gradeOGE(pct) {
  return pct >= 0.8 ? 5 : pct >= 0.55 ? 4 : pct >= 0.3 ? 3 : 2;
}
function renderSetup() {
  document.getElementById("tabs").hidden = true;
  clearInterval(timer);
  const p = st.plan || {
    grade: 11,
    exam: "e",
    ml: "p",
    subjects: ["math", "rus", "soc"],
    date: defDate("e", 2027),
    per: 3,
    tasks: 2,
  };
  const dr = { ...p, ml: p.ml || "p", subjects: [...p.subjects] };
  const app = document.getElementById("app");
  function draw() {
    const g = GRADES.find((x) => x.g === dr.grade);
    const cnt = topicsFor(dr).length;
    const days = daysBetween(new Date(), parseD(dr.date));
    const k = Math.min(dr.per, Math.max(1, dr.subjects.length));
    const rounds = days > 0 && dr.subjects.length ? build(dr, dOnly(new Date()), days).minRounds : 0;
    const perDay = k * (dr.tasks >= 4 ? 4 : 2);
    const showMl = dr.exam === "e";
    app.innerHTML = `
    <div class="top"><div class="brand"><span class="logo">ГИА</span>Отсчёт</div>${st.plan ? '<button class="icon-btn" id="cancel">Отмена</button>' : ""}</div>
    <section class="card setup">
      <div><div class="label">${st.plan ? "Настройки плана" : "Новый план подготовки"}</div><h1>Подготовка к экзамену по дням</h1></div>
      <div class="step"><div class="step-t"><i>1</i>В каком ты классе?</div>
        <div class="grid4">${GRADES.map((x) => `<button class="opt" data-g="${x.g}" aria-pressed="${dr.grade === x.g}"><b>${x.g} класс</b><small>${examName(x.exam)} в ${x.year}</small></button>`).join("")}</div>
        ${g.g === 8 || g.g === 10 ? `<p class="note">План растянется до экзамена в ${g.year} году — больше чем на полтора года. Хватит времени пройти все темы несколько раз.</p>` : ""}
      </div>
      <div class="step"><div class="step-t"><i>2</i>Какие предметы сдаёшь (${examName(dr.exam)})?</div>
        <div class="subjs">${Object.entries(SUBJ)
          .map(([s, v]) => {
            const n = listFor(s, dr).length;
            return `<button class="sbtn" ${hs(s)} data-s="${s}" aria-pressed="${dr.subjects.includes(s)}">${v} <small>${n}</small></button>`;
          })
          .join("")}</div>
        <p class="note">Число рядом с предметом — сколько в нём тем.</p>
        ${
          showMl
            ? `<div class="label" style="margin-top:6px">Математика ЕГЭ</div>
        <div class="seg2">
          <button class="opt" data-ml="p" aria-pressed="${dr.ml === "p"}"><b>Профильная</b><small>${T.filter((t) => t.s === "math" && t.ex.includes("p")).length} тем · для технических и экономических вузов</small></button>
          <button class="opt" data-ml="b" aria-pressed="${dr.ml === "b"}"><b>Базовая</b><small>${T.filter((t) => t.s === "math" && t.ex.includes("b")).length} тем · для аттестата и гуманитарных направлений</small></button>
        </div>`
            : ""
        }
      </div>
      <div class="step"><div class="step-t"><i>3</i>Темп и дата</div>
        <div class="row">
          <div class="field"><label class="label" for="per">Предметов в день</label><select class="inp" id="per">${Array.from(
            { length: Math.max(1, dr.subjects.length) },
            (_, i) => i + 1,
          )
            .map(
              (n) =>
                `<option value="${n}" ${n == k ? "selected" : ""}>${n === dr.subjects.length && n > 1 ? "Все " + n : n} ${plural(n, "предмет", "предмета", "предметов")}</option>`,
            )
            .join("")}</select></div>
          <div class="field"><label class="label" for="tasks">Заданий по теме</label><select class="inp" id="tasks"><option value="2" ${dr.tasks < 4 ? "selected" : ""}>2 (на повторении — новые)</option><option value="4" ${dr.tasks >= 4 ? "selected" : ""}>4 сразу</option></select></div>
          <div class="field"><label class="label" for="date">Дата экзамена</label><input class="inp" type="date" id="date" value="${dr.date}"></div>
        </div>
        <p class="note">Каждый день — по одной теме из ${k} ${plural(k, "предмета", "предметов", "предметов")}, всего ${perDay} ${plural(perDay, "задание", "задания", "заданий")}. Раз в месяц — пробный вариант. Если предметов выбрано больше, они чередуются по дням.</p>
        <p class="note">Официального расписания ГИА на ${g.year} год пока нет (проверено 17 октября 2026), поэтому стоит примерная дата: начало июня, как в 2026 году. Когда расписание выйдет, поменяй дату, и план перестроится.</p>
      </div>
      ${!dr.subjects.length ? '<div class="banner warn">Выбери хотя бы один предмет.</div>' : days < 1 ? '<div class="banner warn">Дата экзамена должна быть позже сегодняшней.</div>' : rounds < 1 ? `<div class="banner warn">До экзамена ${days} ${plural(days, "день", "дня", "дней")}, тем ${cnt}. С таким темпом не все темы успеют попасться — увеличь число предметов в день.</div>` : `<div class="banner ok">${days} ${plural(days, "день", "дня", "дней")} до экзамена, ${cnt} ${plural(cnt, "тема", "темы", "тем")}. Каждую тему пройдёшь минимум ${Math.floor(rounds)} ${plural(Math.floor(rounds), "раз", "раза", "раз")}.</div>`}
      <div><button class="btn big" id="go" ${!dr.subjects.length || days < 1 ? "disabled" : ""}>${st.plan ? "Сохранить и перестроить" : "Построить план"}</button></div>
    </section>
    <section class="card setup">
      <div><div class="label">Перенос прогресса</div><h2 class="h2s">Сохранить или загрузить</h2></div>
      <p class="note">Прогресс хранится только в этом браузере. Чтобы перенести его на другой телефон или компьютер, скопируй код и вставь его там в поле ниже.</p>
      <div class="ans"><button class="btn" id="exp" ${st.plan ? "" : "disabled"}>Скопировать код прогресса</button><span class="res ok" id="expok" hidden>Код скопирован</span></div>
      <textarea class="inp code-area" id="impt" rows="3" placeholder="Вставь сюда код прогресса" spellcheck="false"></textarea>
      <div class="ans"><button class="icon-btn" id="imp">Загрузить прогресс</button><span class="res bad" id="imperr" hidden>Код не подходит. Скопируй его целиком ещё раз.</span></div>
    </section>`;
    app.querySelectorAll("[data-g]").forEach(
      (b) =>
        (b.onclick = () => {
          const ng = GRADES.find((x) => x.g === +b.dataset.g);
          dr.grade = ng.g;
          dr.exam = ng.exam;
          dr.date = defDate(ng.exam, ng.year);
          draw();
        }),
    );
    app.querySelectorAll("[data-ml]").forEach(
      (b) =>
        (b.onclick = () => {
          dr.ml = b.dataset.ml;
          draw();
        }),
    );
    app.querySelectorAll("[data-s]").forEach(
      (b) =>
        (b.onclick = () => {
          const s = b.dataset.s;
          const had = dr.subjects.includes(s);
          dr.subjects = had ? dr.subjects.filter((x) => x !== s) : [...dr.subjects, s];
          if (!had && dr.per === dr.subjects.length - 1 && dr.per < 3) dr.per++;
          dr.per = Math.max(1, Math.min(dr.per, dr.subjects.length || 1));
          draw();
        }),
    );
    app.querySelector("#date").onchange = (e) => {
      if (e.target.value) dr.date = e.target.value;
      draw();
    };
    app.querySelector("#per").onchange = (e) => {
      dr.per = +e.target.value;
      draw();
    };
    app.querySelector("#tasks").onchange = (e) => {
      dr.tasks = +e.target.value;
      draw();
    };
    const c = app.querySelector("#cancel");
    if (c) c.onclick = renderMain;
    app.querySelector("#go").onclick = () => {
      const o = st.plan;
      dr.per = Math.min(dr.per, dr.subjects.length);
      const changed =
        !o ||
        o.exam !== dr.exam ||
        o.per !== dr.per ||
        o.tasks !== dr.tasks ||
        (o.ml || "p") !== dr.ml ||
        String(o.subjects) !== String(dr.subjects);
      st.plan = { ...dr, start: changed ? iso(dOnly(new Date())) : o.start };
      if (changed) {
        const keep = { goals: st.goals, friends: st.friends, nick: st.nick, code: st.code };
        st = fix({ ...blank(), ...keep, plan: st.plan });
      }
      save();
      sel = null;
      calM = null;
      tab = "day";
      topSubj = null;
      openTopic = null;
      renderMain();
      window.scrollTo(0, 0);
    };
    app.querySelector("#exp").onclick = () => {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(st))));
      const ta = app.querySelector("#impt");
      ta.value = code;
      const ok = () => {
        app.querySelector("#expok").hidden = false;
      };
      try {
        navigator.clipboard.writeText(code).then(ok, () => {
          ta.select();
          ok();
        });
      } catch (e) {
        ta.select();
        ok();
      }
    };
    app.querySelector("#imp").onclick = () => {
      const v = app.querySelector("#impt").value.trim();
      try {
        const s = JSON.parse(decodeURIComponent(escape(atob(v))));
        if (!s || !s.plan || !s.plan.subjects) throw 0;
        st = fix(s);
        save();
        sel = null;
        calM = null;
        tab = "day";
        renderMain();
        window.scrollTo(0, 0);
      } catch (e) {
        app.querySelector("#imperr").hidden = false;
      }
    };
  }
  draw();
}
function renderMain() {
  if (!st.plan) return renderSetup();
  const p = st.plan,
    sch = schedule(),
    { seq, days } = sch;
  const today = dOnly(new Date());
  const todayIdx = days.findIndex((d) => d.date.getTime() === today.getTime());
  if (sel === null || sel >= days.length || sel < 0)
    sel = todayIdx >= 0 ? todayIdx : Math.max(0, Math.min(days.length - 1, daysBetween(parseD(p.start), today)));
  const total = Math.max(1, daysBetween(parseD(p.start), parseD(p.date)));
  const passed = Math.min(1, Math.max(0, daysBetween(parseD(p.start), today) / total));
  const app = document.getElementById("app");
  app.innerHTML = `
  <div class="top"><div class="brand"><span class="logo">ГИА</span>Отсчёт</div><button class="icon-btn" id="edit"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>Настройки</button></div>
  ${
    tab === "mock"
      ? ""
      : `<section class="hero">
    <div class="label">${examName(p.exam)} ${parseD(p.date).getFullYear()} · ${p.grade} класс · ${human(parseD(p.date))}, 10:00</div>
    <div class="hero-row">
      <div class="big"><b id="cd-d">0</b><span id="cd-dl">дней</span></div>
      <div class="clock"><div><b id="cd-h">00</b><small>часов</small></div><div><b id="cd-m">00</b><small>минут</small></div><div><b id="cd-s">00</b><small>секунд</small></div></div>
    </div>
    <div class="bar"><i style="width:${(passed * 100).toFixed(1)}%"></i></div>
    <div class="hero-foot"><span>Пройдено ${Math.round(passed * 100)}% пути подготовки · ${Math.min(p.per, p.subjects.length)} ${plural(Math.min(p.per, p.subjects.length), "предмет", "предмета", "предметов")} в день</span><span>${p.subjects.map((s) => subjName(s, p)).join(" · ")}</span></div>
  </section>`
  }
  <div id="view"></div>`;
  app.querySelector("#edit").onclick = renderSetup;
  const tabs = document.getElementById("tabs");
  tabs.hidden = false;
  tabs.querySelectorAll(".tab").forEach((b) => {
    b.setAttribute("aria-selected", b.dataset.tab === tab || (tab === "mock" && b.dataset.tab === "stats"));
    b.onclick = () => {
      tab = b.dataset.tab;
      if (tab === "topics") openTopic = null;
      renderMain();
      window.scrollTo(0, 0);
    };
  });
  const view = app.querySelector("#view");
  if (tab === "day") renderDay(view, days, todayIdx);
  else if (tab === "plan") renderPlan(view, seq, days, todayIdx, sch.roundEnd);
  else if (tab === "topics") renderTopics(view);
  else if (tab === "mock") renderMock(view);
  else if (tab === "cheat") renderCheat(view);
  else renderStats(view, seq, days, todayIdx);
  tick();
  clearInterval(timer);
  timer = setInterval(tick, 1000);
}
function tick() {
  if (!st.plan) return;
  const mt = document.getElementById("mock-time");
  if (mt && mockSel) {
    const m = mockState(mockSel.mk, mockSel.s);
    if (m.start && !m.done) {
      const sec = Math.floor((Date.now() - m.start) / 1000);
      mt.textContent = String(Math.floor(sec / 60)).padStart(2, "0") + ":" + String(sec % 60).padStart(2, "0");
    }
  }
  if (!document.getElementById("cd-d")) return;
  const target = parseD(st.plan.date);
  target.setHours(10);
  let ms = Math.max(0, target - new Date());
  const d = Math.floor(ms / dayMs);
  ms -= d * dayMs;
  const h = Math.floor(ms / 36e5);
  ms -= h * 36e5;
  const m = Math.floor(ms / 6e4);
  const s = Math.floor((ms - m * 6e4) / 1e3);
  const set = (id, v) => {
    const e = document.getElementById(id);
    if (e && e.textContent != v) e.textContent = v;
  };
  set("cd-d", d);
  set("cd-dl", plural(d, "день", "дня", "дней"));
  set("cd-h", String(h).padStart(2, "0"));
  set("cd-m", String(m).padStart(2, "0"));
  set("cd-s", String(s).padStart(2, "0"));
}
function mockBanner() {
  const today = dOnly(new Date()),
    mk = monthKey(today);
  const m = mockList().find((x) => x.mk === mk);
  if (!m) return "";
  const p = st.plan,
    left = p.subjects.filter((s) => !mockResult(mk, s));
  if (!left.length) return "";
  const isDay = daysBetween(m.date, today) === 0,
    future = m.date > today;
  return `<section class="card mockb">
    <div class="label">Пробный вариант · ${m.label}</div>
    <h2>${isDay ? "Сегодня день пробника" : future ? "Пробник этого месяца — " + human(m.date) : "Пробник за этот месяц ещё не решён"}</h2>
    <p class="note">Задания в формате экзамена, ответы проверяются в конце. По итогам обновится прогноз балла.</p>
    <div class="subjs">${left.map((s) => `<button class="sbtn" ${hs(s)} data-mock="${mk}|${s}" aria-pressed="false">${subjName(s, p)}</button>`).join("")}</div>
  </section>`;
}
function renderDay(view, days, todayIdx) {
  if (!days.length) {
    view.innerHTML = `<div class="banner warn">Дата экзамена уже наступила. Открой настройки и поставь новую дату.</div>`;
    return;
  }
  const di = sel,
    day = days[di],
    { total, done } = dayCount(di, day);
  const isToday = di === todayIdx;
  const rel = isToday
    ? "Сегодня"
    : di === todayIdx + 1
      ? "Завтра"
      : di === todayIdx - 1
        ? "Вчера"
        : WD[day.date.getDay()][0].toUpperCase() + WD[day.date.getDay()].slice(1);
  const left = days.length - di;
  let debts = [];
  if (isToday)
    for (let j = Math.max(0, di - 7); j < di; j++) {
      const d = days[j];
      d.items.forEach((it) => {
        const qs = it.qs.filter((qi) => !st.ans[akey(j, it.t.id, qi)]);
        if (qs.length) debts.push({ j, d, it: { ...it, qs } });
      });
    }
  const rev = isToday ? reviewToday() : [];
  const today = todayIso();
  view.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:14px">
    ${isToday ? mockBanner() : ""}
    <section class="card">
      <div class="day-head">
        <div><div class="label">День ${di + 1} из ${days.length}${left <= 7 ? " · финишная неделя" : ""}</div><h2>${rel}, ${human(day.date)}</h2></div>
        <div class="nav"><button class="icon-btn" id="prev" ${di === 0 ? "disabled" : ""} aria-label="Предыдущий день">←</button>${todayIdx >= 0 && !isToday ? '<button class="icon-btn" id="tod">Сегодня</button>' : ""}<button class="icon-btn" id="next" ${di === days.length - 1 ? "disabled" : ""} aria-label="Следующий день">→</button></div>
      </div>
      <div class="chips" style="margin-top:12px">${day.items.map((it) => `<span class="chip s" ${hs(it.t.s)}>${subjName(it.t.s, st.plan)}</span>`).join("")}${rev.length ? `<span class="chip warn">Повторение: ${rev.length}</span>` : ""}${debts.length ? `<span class="chip grey">Хвосты: ${debts.length}</span>` : ""}</div>
      <div class="dayprog"><div class="bar"><i style="width:${total ? (done / total) * 100 : 0}%;${done === total && total ? "background:var(--ok)" : ""}"></i></div><span>${done} из ${total}</span></div>
    </section>
    ${day.items.map((it) => topicCard(it, di + ":", it.round === 1 ? '<span class="chip ok">Новая тема</span>' : `<span class="chip grey">Повторение · ${it.round}-й круг</span>`)).join("")}
    ${
      rev.length
        ? `<div class="sec-title"><h3>Повторение ошибок</h3><p class="note">Темы, где была ошибка. Они вернутся через 1, 3 и 7 дней, пока не решишь их правильно три раза подряд.</p></div>
      ${rev
        .map((id) => {
          const t = TOP[id],
            r = st.rev[id];
          const slot = "r" + today + ":" + id + ":0";
          if (!st.swap[slot]) {
            const i = pickIndex(t, H(today + id), new Set());
            st.swap[slot] = id + "|" + (i === null ? 0 : i);
          }
          const a = st.ans[slot];
          const stage = r
            ? `<span class="chip grey">шаг ${(r.step || 0) + 1} из 3</span>`
            : '<span class="chip ok">тема закрыта</span>';
          return `<article class="topic" ${hs(t.s)}><div class="topic-head"><div class="chips"><span class="chip s" ${hs(t.s)}>${subjName(t.s, st.plan)}</span>${kimChip(t, st.plan)}<span class="chip warn">Повторение ошибки</span>${a ? stage : ""}</div><h3>${esc(t.t)}</h3></div>
          <div class="tip"><b>Коротко:</b> ${esc(t.tip)}</div><div class="tasks">${taskHTML(slot, 1, slotTask(slot), a, "a" + _uid++, { noAlt: true })}</div>
          ${a ? `<p class="note rev-note">${a.ok ? (r ? `Верно. Следующее повторение — ${human(parseD(r.due))}.` : "Верно три раза подряд — тема убрана из повторения.") : "Ошибка. Тема вернётся завтра."}</p>` : ""}</article>`;
        })
        .join("")}`
        : ""
    }
    ${
      debts.length
        ? `<details class="debts" id="debts" ${debtsOpen ? "open" : ""}><summary><span><b>Хвосты с прошлых дней</b><span class="note"> · ${debts.length} ${plural(debts.length, "тема", "темы", "тем")}, ${debts.reduce((a, x) => a + x.it.qs.length, 0)} заданий</span></span><span class="arr">›</span></summary>
      <p class="note">Задания, которые не были решены за последнюю неделю.</p>
      <div class="debt-list">${debts.map((x) => topicCard(x.it, x.j + ":", `<span class="chip grey">с ${human(x.d.date)}</span>`)).join("")}</div></details>`
        : ""
    }
    ${total && done === total ? `<section class="card done-card"><b>День выполнен</b><p class="note">${di < days.length - 1 ? "Можно заглянуть в завтрашние темы или отдохнуть." : "Это был последний день плана. Удачи на экзамене!"}</p>${di < days.length - 1 ? '<button class="icon-btn" id="next2">К следующему дню →</button>' : ""}</section>` : ""}
  </div>`;
  save();
  const go = (n) => {
    sel = n;
    renderMain();
    window.scrollTo(0, 0);
  };
  view.querySelector("#prev").onclick = () => go(sel - 1);
  view.querySelector("#next").onclick = () => go(sel + 1);
  const n2 = view.querySelector("#next2");
  if (n2) n2.onclick = () => go(sel + 1);
  const t = view.querySelector("#tod");
  if (t) t.onclick = () => go(todayIdx);
  const dbt = view.querySelector("#debts");
  if (dbt)
    dbt.ontoggle = () => {
      debtsOpen = dbt.open;
    };
  view.querySelectorAll("[data-mock]").forEach(
    (b) =>
      (b.onclick = () => {
        const [mk, s] = b.dataset.mock.split("|");
        mockSel = { mk, s };
        tab = "mock";
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
  bindTasks(view);
}
function renderMock(view) {
  if (!mockSel) {
    tab = "stats";
    return renderMain();
  }
  const { mk, s } = mockSel,
    p = st.plan,
    m = mockState(mk, s),
    V = mockVariant(mk, s);
  const ml = mockList().find((x) => x.mk === mk);
  const rec = V.length * minsPer(s);
  if (!m.done && !m.start) {
    m.start = Date.now();
    save();
  }
  let body;
  if (m.done) {
    const pct = m.ok / m.n;
    body = `<section class="card"><div class="label">Результат</div>
      <div class="facts" style="margin-top:10px">
        <div class="fact"><b>${m.ok} / ${m.n}</b><span>верных ответов</span></div>
        <div class="fact"><b>${Math.round(pct * 100)}%</b><span>выполнено</span></div>
        ${(() => {
          const e = estimate(s, pct, p);
          return `<div class="fact"><b>${e.kind === "test" ? "≈ " + e.val : "«" + e.val + "»"}</b><span>${e.kind === "test" ? "тестовых баллов" : "оценка"} · ≈ ${e.prim} из ${e.max} первичных</span></div>`;
        })()}
      </div>
      <p class="note" style="margin-top:10px">Решено за ${Math.max(1, Math.round(m.time / 60))} мин при рекомендованных ${rec}. Ошибки добавлены в повторение. Баллы пересчитаны по официальной шкале 2026 года так, как если бы ты решил всю работу с той же долей верных ответов; развёрнутые задания здесь не проверяются.</p>
    </section>`;
  } else
    body = `<section class="card mock-head"><div class="mt"><div><div class="label">Прошло времени</div><b id="mock-time">00:00</b></div><div><div class="label">Рекомендуется</div><b>${rec} мин</b></div><div><div class="label">Заданий</div><b>${V.length}</b></div></div>
    <p class="note">Ответы проверяются только в конце. Можно выйти и вернуться — введённое сохранится.</p></section>`;
  view.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
    <div><button class="icon-btn" id="mback">← К прогрессу</button></div>
    <section class="card"><div class="label">Пробный ${examName(p.exam)} · ${ml ? ml.label : mk}</div><h2 class="h2s">${esc(subjName(s, p))}</h2></section>
    ${body}
    <section class="card mock-list">${V.map((x, k) => {
      const task = taskAt(x.t, x.i);
      const lines = task.text.split("\n"),
        isCode = lines.length > 1;
      const v = m.answers[k] || "";
      const res = m.done ? check(v, task.ans) : null;
      return `<div class="task"><div class="num ${m.done ? (res ? "ok" : "bad") : ""}">${x.n || k + 1}</div><div class="task-body">
        <div class="chips"><span class="chip grey">${esc(x.t.t)}</span></div>
        ${isCode ? `<p>${esc(lines[0])}</p><p class="code">${esc(lines.slice(1).join("\n"))}</p>` : `<p>${esc(task.text)}</p>`}
        ${task.fig ? `<div class="fig">${task.fig}</div>` : ""}
        <div class="ans"><input class="blank ${m.done ? (res ? "ok" : "bad") : ""}" data-mk="${k}" value="${esc(v)}" placeholder="Ответ" autocomplete="off" autocapitalize="off" spellcheck="false" ${m.done ? "readonly" : ""} aria-label="Ответ на задание ${x.n || k + 1}">
        ${m.done ? (res ? '<span class="res ok">Верно</span>' : `<span class="res bad">Правильно: ${esc(task.ans[0])}</span>`) : ""}</div>
        ${m.done ? solBlock(x.t, task, { ok: res }) : ""}
      </div></div>`;
    }).join("")}</section>
    ${m.done ? "" : `<div class="ans"><button class="btn big" id="mfin">Завершить и проверить</button><span class="note" id="mleft"></span></div>`}
  </div>`;
  view.querySelector("#mback").onclick = () => {
    tab = "stats";
    mockSel = null;
    renderMain();
    window.scrollTo(0, 0);
  };
  const upd = () => {
    const n = V.length - Object.values(m.answers).filter((x) => x && x.trim()).length;
    const e = view.querySelector("#mleft");
    if (e) e.textContent = n ? `Без ответа: ${n}` : "Все ответы введены";
  };
  upd();
  view.querySelectorAll("[data-mk]").forEach((inp) => {
    inp.oninput = () => {
      m.answers[inp.dataset.mk] = inp.value;
      save();
      upd();
    };
    inp.onkeydown = (e) => {
      if (e.key === "Enter") {
        const all = [...view.querySelectorAll("[data-mk]")];
        const nx = all[all.indexOf(inp) + 1];
        if (nx) nx.focus();
      }
    };
  });
  const f = view.querySelector("#mfin");
  if (f)
    f.onclick = () => {
      let ok = 0;
      V.forEach((x, k) => {
        const task = taskAt(x.t, x.i);
        const r = check(m.answers[k] || "", task.ans);
        if (r) ok++;
        else afterAnswer("m", x.t.id, false);
      });
      m.done = true;
      m.ok = ok;
      m.n = V.length;
      m.time = Math.round((Date.now() - m.start) / 1000);
      m.date = todayIso();
      save();
      renderMain();
      window.scrollTo(0, 0);
    };
}
function explainCard(t) {
  const e = EXP[t.id] || { w: t.tip, k: [], m: "" };
  const task = taskAt(t, 0);
  const lines = task.text.split("\n");
  const isCode = lines.length > 1;
  return `<article class="topic exp" ${hs(t.s)}>
    <div class="topic-head">
      <div class="chips"><span class="chip s" ${hs(t.s)}>${subjName(t.s, st.plan)}</span>${kimChip(t, st.plan)}${st.mist[t.id] ? `<span class="chip warn">ошибок: ${st.mist[t.id]}</span>` : ""}</div>
      <h3>${esc(t.t)}</h3>
      <p class="lead">${esc(e.w)}</p>
    </div>
    <div class="exp-body">
      ${e.k.length ? `<section><h4>Главное</h4><ul class="keys">${e.k.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></section>` : ""}
      <section><h4>Пример с ответом</h4>
        <div class="example">
          ${isCode ? `<p>${esc(lines[0])}</p><p class="code">${esc(lines.slice(1).join("\n"))}</p>` : `<p>${esc(task.text)}</p>`}
          ${task.fig ? `<div class="fig">${task.fig}</div>` : ""}
          <p class="answer">Ответ: <b>${esc(task.ans[0])}</b></p>
          ${task.sol ? `<p class="ex-sol">${esc(task.sol)}</p>` : ""}
        </div>
      </section>
      ${e.m ? `<section class="mistake"><h4>Частая ошибка</h4><p>${esc(e.m)}</p></section>` : ""}
    </div>
  </article>`;
}
function renderTopics(view) {
  const p = st.plan;
  const subs = [...p.subjects, ...Object.keys(SUBJ).filter((s) => !p.subjects.includes(s))];
  if (!topSubj) topSubj = subs[0];
  if (openTopic && TOP[openTopic]) {
    const t = TOP[openTopic],
      L = listFor(t.s, p),
      i = L.findIndex((x) => x.id === t.id);
    const prev = L[i - 1],
      next = L[i + 1];
    view.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
      <div><button class="icon-btn" id="back">← Все темы: ${esc(subjName(t.s, p))}</button></div>
      ${explainCard(t)}
      <div class="pn">${prev ? `<button class="icon-btn" data-ot="${prev.id}">← ${esc(prev.t)}</button>` : "<span></span>"}${next ? `<button class="icon-btn" data-ot="${next.id}">${esc(next.t)} →</button>` : ""}</div>
    </div>`;
    view.querySelector("#back").onclick = () => {
      openTopic = null;
      renderMain();
      window.scrollTo(0, 0);
    };
    view.querySelectorAll("[data-ot]").forEach(
      (b) =>
        (b.onclick = () => {
          openTopic = b.dataset.ot;
          renderMain();
          window.scrollTo(0, 0);
        }),
    );
    return;
  }
  const q = topQuery.trim().toLowerCase().replace(/ё/g, "е");
  const row = (t, i, showSubj) =>
    `<button class="trow" data-ot="${t.id}" ${hs(t.s)}><span class="tn">${kimFor(t, p) ? kimFor(t, p).split(/[,–]/)[0] : i + 1}</span><span class="tt">${esc(t.t)}<small class="tsub">${showSubj ? esc(subjName(t.s, p)) + " · " : ""}${esc((EXP[t.id] || { w: t.tip }).w.split(/(?<=[.!?])\s/)[0])}</small></span>${st.mist[t.id] ? `<span class="chip warn">${st.mist[t.id]}</span>` : '<span class="arr">›</span>'}</button>`;
  let listHTML;
  if (q) {
    const all = T.filter((t) => avail(t, p)).filter((t) => {
      const e = EXP[t.id] || { w: "", k: [] };
      return (t.t + " " + e.w + " " + e.k.join(" ") + " " + t.tip).toLowerCase().replace(/ё/g, "е").includes(q);
    });
    listHTML = `<div class="label" style="margin-bottom:4px">Найдено: ${all.length}</div><div class="tlist">${
      all
        .slice(0, 60)
        .map((t, i) => row(t, i, true))
        .join("") || '<p class="note">Ничего не нашлось. Попробуй другое слово.</p>'
    }</div>`;
  } else {
    let L = listFor(topSubj, p);
    const nums = [
      ...new Set(
        L.map((t) => kimFor(t, p))
          .filter(Boolean)
          .map((k) => parseInt(k)),
      ),
    ].sort((a, b) => a - b);
    if (topNum)
      L = L.filter((t) => {
        const k = kimFor(t, p);
        return (
          k &&
          k.split(/,\s*/).some((part) => {
            const [a, b] = part.split("–").map(Number);
            return b ? +topNum >= a && +topNum <= b : +topNum === a;
          })
        );
      });
    if (nums.length) L = [...L].sort((a, b) => (parseInt(kimFor(a, p)) || 99) - (parseInt(kimFor(b, p)) || 99));
    listHTML = `<div class="tl-head"><div class="label">${esc(subjName(topSubj, p))} · ${examName(p.exam)} · ${L.length} ${plural(L.length, "тема", "темы", "тем")}</div>
      ${nums.length ? `<select class="inp sm" id="knum"><option value="">Все номера</option>${nums.map((n) => `<option value="${n}" ${String(n) === topNum ? "selected" : ""}>№ ${n}</option>`).join("")}</select>` : ""}</div>
      <p class="note" style="margin:6px 0">${nums.length ? "Слева — номер задания в экзамене. " : ""}Нажми на тему, чтобы прочитать объяснение.</p>
      <div class="tlist">${L.map((t, i) => row(t, i, false)).join("")}</div>`;
  }
  view.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
    <section class="card">
      <input class="inp" id="tq" type="search" placeholder="Поиск по темам: например, «проценты» или «Пушкин»" value="${esc(topQuery)}" autocomplete="off">
      ${
        q
          ? ""
          : `<div class="label" style="margin:14px 0 10px">Предметы в плане</div>
      <div class="subjs">${p.subjects.map((s) => `<button class="sbtn" ${hs(s)} data-ts="${s}" aria-pressed="${s === topSubj}">${subjName(s, p)}</button>`).join("")}</div>
      ${
        subs.length > p.subjects.length
          ? `<div class="label" style="margin:14px 0 10px">Другие предметы</div>
      <div class="subjs">${subs
        .filter((s) => !p.subjects.includes(s))
        .map((s) => `<button class="sbtn" ${hs(s)} data-ts="${s}" aria-pressed="${s === topSubj}">${SUBJ[s]}</button>`)
        .join("")}</div>`
          : ""
      }`
      }
    </section>
    <section class="card">${listHTML}</section>
  </div>`;
  const tq = view.querySelector("#tq");
  tq.oninput = () => {
    topQuery = tq.value;
    const pos = tq.selectionStart;
    renderMain();
    const n = document.getElementById("tq");
    n.focus();
    try {
      n.setSelectionRange(pos, pos);
    } catch (e) {}
  };
  view.querySelectorAll("[data-ts]").forEach(
    (b) =>
      (b.onclick = () => {
        topSubj = b.dataset.ts;
        topNum = "";
        renderMain();
      }),
  );
  const kn = view.querySelector("#knum");
  if (kn)
    kn.onchange = () => {
      topNum = kn.value;
      renderMain();
    };
  view.querySelectorAll("[data-ot]").forEach(
    (b) =>
      (b.onclick = () => {
        openTopic = b.dataset.ot;
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
}
function renderPlan(view, seq, days, todayIdx, roundEndIdx) {
  const p = st.plan,
    start = parseD(p.start),
    exam = parseD(p.date);
  if (!calM) {
    const base = days[sel] ? days[sel].date : start;
    calM = new Date(base.getFullYear(), base.getMonth(), 1);
  }
  const first = new Date(start.getFullYear(), start.getMonth(), 1),
    last = new Date(exam.getFullYear(), exam.getMonth(), 1);
  const y = calM.getFullYear(),
    m = calM.getMonth();
  const mocks = mockList();
  const mockDays = new Set(mocks.map((x) => iso(x.date)));
  const lead = (new Date(y, m, 1).getDay() + 6) % 7,
    dim = new Date(y, m + 1, 0).getDate();
  let cells = "";
  for (let i = 0; i < lead; i++) cells += "<div></div>";
  for (let d = 1; d <= dim; d++) {
    const date = new Date(y, m, d),
      di = daysBetween(start, date);
    if (date.getTime() === exam.getTime()) {
      cells += `<div class="c exam" title="Экзамен">${d}<span style="font:600 9px var(--f-body)">ГИА</span></div>`;
      continue;
    }
    if (di < 0 || di >= days.length) {
      cells += `<div class="c off">${d}</div>`;
      continue;
    }
    const day = days[di],
      s = dayStatus(di, day),
      isMock = mockDays.has(iso(date));
    cells += `<button class="c ${s === "done" ? "done" : s === "part" ? "part" : ""} ${di === todayIdx ? "today" : ""} ${isMock ? "mockd" : ""}" data-i="${di}" aria-label="${human(date)}${isMock ? ", пробник" : ""}">${d}<span class="dots">${
      isMock
        ? "<em>П</em>"
        : day.items
            .slice(0, 4)
            .map((it) => `<i ${hs(it.t.s)}></i>`)
            .join("")
    }</span></button>`;
  }
  const doneDays = days.filter((d, i) => dayStatus(i, d) === "done").length;
  const roundEnd = days[roundEndIdx];
  view.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="facts">
      <div class="fact"><b>${days.length}</b><span>${plural(days.length, "день", "дня", "дней")} в плане</span></div>
      <div class="fact"><b>${doneDays}</b><span>${plural(doneDays, "день выполнен", "дня выполнено", "дней выполнено")}</span></div>
      <div class="fact"><b>${roundEnd ? human(roundEnd.date) : "—"}</b><span>${roundEnd ? "все темы пройдены первый раз" : "первый круг не успеет закончиться"}</span></div>
    </div>
    <section class="card">
      <div class="cal-head"><button class="icon-btn" id="pm" ${calM <= first ? "disabled" : ""} aria-label="Предыдущий месяц">←</button><h2>${MON1[m]} ${y}</h2><button class="icon-btn" id="nm" ${calM >= last ? "disabled" : ""} aria-label="Следующий месяц">→</button></div>
      <div class="wd"><span>пн</span><span>вт</span><span>ср</span><span>чт</span><span>пт</span><span>сб</span><span>вс</span></div>
      <div class="month">${cells}</div>
      <div class="legend"><span><i style="background:var(--ok-soft);border:1px solid var(--ok)"></i>выполнен</span><span><i style="background:var(--warn-soft);border:1px solid var(--warn)"></i>начат</span><span><i style="outline:2px solid var(--accent);outline-offset:-2px"></i>сегодня</span><span><i class="lg-mock">П</i>пробник</span><span><i style="background:var(--hero)"></i>экзамен</span></div>
    </section>
    <section class="card"><div class="label" style="margin-bottom:10px">Пробники · ${mocks.length} за период подготовки</div><p class="note">Первая суббота каждого месяца. Пробник месяца можно решить в любой день этого месяца после его даты.</p></section>
  </div>`;
  view.querySelector("#pm").onclick = () => {
    calM = new Date(y, m - 1, 1);
    renderMain();
  };
  view.querySelector("#nm").onclick = () => {
    calM = new Date(y, m + 1, 1);
    renderMain();
  };
  view.querySelectorAll("[data-i]").forEach(
    (b) =>
      (b.onclick = () => {
        sel = +b.dataset.i;
        tab = "day";
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
}
function forecast(s) {
  const p = st.plan;
  const mocks = mockList()
    .map((m) => mockResult(m.mk, s))
    .filter(Boolean);
  if (mocks.length) {
    const m = mocks[mocks.length - 1];
    return { pct: m.ok / m.n, src: "по последнему пробнику" };
  }
  let n = 0,
    ok = 0;
  Object.entries(st.ans).forEach(([k, v]) => {
    const id = v.ref ? v.ref.split("|")[0] : k.split(":")[1];
    const t = TOP[id];
    if (t && t.s === s) {
      n++;
      if (v.ok) ok++;
    }
  });
  if (n < 8) return null;
  return { pct: ok / n, src: `по ${n} ${plural(n, "ответу", "ответам", "ответам")}` };
}
function renderStats(view, seq, days, todayIdx) {
  const p = st.plan;
  let solved = 0,
    right = 0;
  const bySubj = {},
    touched = new Set();
  Object.entries(st.ans).forEach(([k, v]) => {
    const id = v.ref ? v.ref.split("|")[0] : k.split(":")[1],
      t = TOP[id];
    if (!t) return;
    solved++;
    touched.add(id);
    const b = (bySubj[t.s] = bySubj[t.s] || { n: 0, ok: 0 });
    b.n++;
    if (v.ok) {
      right++;
      b.ok++;
    }
  });
  let streak = 0;
  for (let i = todayIdx >= 0 ? todayIdx : days.length - 1; i >= 0; i--) {
    const s = dayStatus(i, days[i]);
    if (s === "done") streak++;
    else if (i === todayIdx) continue;
    else break;
  }
  const weak = seq.filter((t) => st.mist[t.id]).sort((a, b) => st.mist[b.id] - st.mist[a.id]);
  const mocks = mockList(),
    today = dOnly(new Date());
  view.innerHTML = `
  <div style="display:flex;flex-direction:column;gap:14px">
    <div class="facts">
      <div class="fact"><b>${streak}</b><span>${plural(streak, "день", "дня", "дней")} подряд</span></div>
      <div class="fact"><b>${solved ? Math.round((right / solved) * 100) : 0}%</b><span>верных из ${solved} ${plural(solved, "задания", "заданий", "заданий")}</span></div>
      <div class="fact"><b>${Object.keys(st.rev).length}</b><span>${plural(Object.keys(st.rev).length, "тема", "темы", "тем")} на повторении</span></div>
    </div>
    ${friendsCard()}
    <section class="card"><div class="label" style="margin-bottom:6px">Прогноз и цель</div>
      ${p.subjects
        .map((s) => {
          const f = forecast(s);
          const goal = st.goals[s];
          const est = f ? estimate(s, f.pct, p) : null;
          const isE = p.exam === "e" && !(s === "math" && p.ml === "b");
          const val = est ? est.val : null;
          const min = isE ? MINS[s] : null;
          const scale = isE ? 100 : 5;
          return `<div class="goal" ${hs(s)}>
          <div class="goal-top"><span class="subj-name">${subjName(s, p)}</span><span class="goal-val">${f ? (isE ? "≈ " + val + " " + plural(val, "балл", "балла", "баллов") : "≈ «" + val + "»") : "—"}</span></div>
          ${isE ? `<div class="gbar"><i style="width:${f ? val : 0}%"></i>${min ? `<b class="mark min" style="left:${min}%" title="Минимум для вуза"></b>` : ""}${goal ? `<b class="mark goal-m" style="left:${Math.min(100, goal)}%" title="Цель"></b>` : ""}</div>` : ""}
          <div class="goal-foot"><span class="note">${f ? f.src + ` · ≈ ${est.prim} из ${est.max} первичных` : "Решай задания — прогноз появится после 8 ответов или пробника."}${min ? ` · минимум для вуза ${min}` : ""}</span>
            <label class="goal-in">Цель <input class="inp sm" type="number" min="${isE ? 0 : 2}" max="${isE ? 100 : 5}" data-goal="${s}" value="${goal || ""}" placeholder="${isE ? "80" : "5"}" id="goal-${s}"></label></div>
          ${f && goal ? `<p class="note gnote">${val >= goal ? "Цель достигнута — держи уровень." : `До цели не хватает ${isE ? goal - val + " " + plural(goal - val, "балла", "баллов", "баллов") : goal - val + " " + plural(goal - val, "балла", "баллов", "баллов") + " оценки"}.`}</p>` : ""}
        </div>`;
        })
        .join("")}
      <p class="note" style="margin-top:10px">Прогноз пересчитан по официальным шкалам Рособрнадзора 2026 года: доля верных ответов переносится на всю работу, включая развёрнутую часть, которую приложение не проверяет. ${p.exam === "e" ? "Минимальные баллы — для приёма 2026/27, на 2027 год их могут поменять." : "Региональные шкалы ОГЭ могут немного отличаться."}</p>
    </section>
    <section class="card"><div class="label" style="margin-bottom:10px">Пробные варианты</div>
      <div class="mocks">${mocks
        .filter((m, i) => mocksAll || m.date <= today || i === mocks.findIndex((x) => x.date > today))
        .map((m) => {
          const avail2 = m.date <= today;
          return `<div class="mrow"><div class="mname"><b>${m.label}</b><span class="note">${human(m.date)}</span></div><div class="chips">${p.subjects
            .map((s) => {
              const r = mockResult(m.mk, s);
              const started = st.mocks[m.mk] && st.mocks[m.mk][s] && st.mocks[m.mk][s].start;
              return r
                ? `<button class="chip s mchip" ${hs(s)} data-mock="${m.mk}|${s}">${subjName(s, p)}: ${(() => {
                    const e = estimate(s, r.ok / r.n, p);
                    return e.kind === "test" ? e.val + " б." : "«" + e.val + "»";
                  })()}</button>`
                : avail2
                  ? `<button class="chip grey mchip" data-mock="${m.mk}|${s}">${subjName(s, p)}: ${started ? "продолжить" : "начать"}</button>`
                  : `<span class="chip grey dim">${subjName(s, p)}</span>`;
            })
            .join("")}</div></div>`;
        })
        .join("")}</div>
      ${!mocksAll && mocks.filter((m) => m.date > today).length > 1 ? `<button class="icon-btn" id="mall" style="margin-top:8px">Показать все ${mocks.length} пробников</button>` : ""}
      ${
        mocks.some((m) => p.subjects.some((s) => mockResult(m.mk, s)))
          ? `<div class="mhist">${p.subjects
              .map((s) => {
                const rs = mocks.map((m) => ({ m, r: mockResult(m.mk, s) })).filter((x) => x.r);
                if (!rs.length) return "";
                return `<div class="mh" ${hs(s)}><span class="subj-name">${subjName(s, p)}</span><div class="mbars">${rs.map((x) => `<i style="height:${Math.max(6, Math.round((x.r.ok / x.r.n) * 100))}%" title="${x.m.label}: ${Math.round((x.r.ok / x.r.n) * 100)}%"></i>`).join("")}</div></div>`;
              })
              .join("")}</div>`
          : ""
      }
    </section>
    <section class="card"><div class="label" style="margin-bottom:6px">По предметам</div>
      ${p.subjects
        .map((s) => {
          const ts = seq.filter((t) => t.s === s),
            c = ts.filter((t) => touched.has(t.id)).length,
            b = bySubj[s];
          return `<div class="subj-row" ${hs(s)}><span class="subj-name">${subjName(s, p)}</span><div class="bar"><i style="width:${ts.length ? (c / ts.length) * 100 : 0}%"></i></div><span class="pct">${c}/${ts.length} · ${b ? Math.round((b.ok / b.n) * 100) + "%" : "—"}</span></div>`;
        })
        .join("")}
      <p class="note" style="margin-top:8px">Полоска — сколько тем предмета ты уже решал, процент — доля верных ответов.</p>
    </section>
    <section class="card"><div class="label" style="margin-bottom:10px">Слабые темы</div>
      ${weak.length ? `<div class="chips">${weak.map((t) => `<button class="chip s wk" ${hs(t.s)} data-ot="${t.id}">${esc(t.t)} · ${st.mist[t.id]}</button>`).join("")}</div><p class="note" style="margin-top:10px">Число — сколько раз в теме была ошибка. Нажми на тему, чтобы перечитать объяснение.</p>` : '<p class="note">Пока ошибок нет. Темы, где ошибёшься, появятся здесь.</p>'}
    </section>
  </div>`;
  bindFriends(view);
  view.querySelectorAll("[data-ot]").forEach(
    (b) =>
      (b.onclick = () => {
        openTopic = b.dataset.ot;
        topSubj = TOP[openTopic].s;
        tab = "topics";
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
  view.querySelectorAll("[data-mock]").forEach(
    (b) =>
      (b.onclick = () => {
        const [mk, s] = b.dataset.mock.split("|");
        mockSel = { mk, s };
        tab = "mock";
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
  const ma = view.querySelector("#mall");
  if (ma)
    ma.onclick = () => {
      mocksAll = true;
      const y = window.scrollY;
      renderMain();
      window.scrollTo(0, y);
    };
  view.querySelectorAll("[data-goal]").forEach(
    (inp) =>
      (inp.onchange = () => {
        const v = parseInt(inp.value);
        if (v > 0) st.goals[inp.dataset.goal] = v;
        else delete st.goals[inp.dataset.goal];
        save();
        const y = window.scrollY;
        renderMain();
        window.scrollTo(0, y);
      }),
  );
}
function calcStats() {
  const p = st.plan,
    sch = schedule(),
    days = sch.days;
  const today = dOnly(new Date());
  const todayIdx = days.findIndex((d) => d.date.getTime() === today.getTime());
  let solved = 0,
    right = 0;
  Object.values(st.ans).forEach((v) => {
    solved++;
    if (v.ok) right++;
  });
  let streak = 0;
  for (let i = todayIdx >= 0 ? todayIdx : days.length - 1; i >= 0; i--) {
    const s = dayStatus(i, days[i]);
    if (s === "done") streak++;
    else if (i === todayIdx) continue;
    else break;
  }
  const fc = {};
  p.subjects.forEach((s) => {
    const f = forecast(s);
    if (f) {
      const e = estimate(s, f.pct, p);
      fc[s] = e.val;
    }
  });
  let mock = null;
  mockList().forEach((m) => {
    const rs = p.subjects.map((s) => mockResult(m.mk, s)).filter(Boolean);
    if (rs.length)
      mock = { mk: m.mk, label: m.label, pct: Math.round((rs.reduce((a, r) => a + r.ok / r.n, 0) / rs.length) * 100) };
  });
  return { streak, solved, acc: solved ? Math.round((right / solved) * 100) : 0, fc, mock };
}
function mySummary() {
  const p = st.plan,
    c = calcStats();
  return {
    nick: (st.nick || "").slice(0, 24),
    code: myCode(),
    exam: p.exam,
    ml: p.ml || "p",
    grade: p.grade,
    subj: p.subjects,
    streak: c.streak,
    solved: c.solved,
    acc: c.acc,
    fc: c.fc,
    mock: c.mock,
    upd: todayIso(),
  };
}
function myCode() {
  if (!st.code) {
    const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    st.code = Array.from({ length: 6 }, () => A[Math.floor(Math.random() * A.length)]).join("");
    save();
  }
  return st.code;
}
const FR = { db: null, uid: null, ready: false, docs: {}, unsub: null, subKey: "", syncT: null, last: "" };
function initFriends() {
  FR.ready = true;
}
function subFriends() {
  if (!FR.db) return;
  const codes = (st.friends || []).filter((c) => c.length <= 8).slice(0, 30);
  const key = codes.join(",");
  if (key === FR.subKey) return;
  if (FR.unsub) {
    FR.unsub();
    FR.unsub = null;
  }
  FR.subKey = key;
  FR.docs = {};
  if (!codes.length) return;
  FR.unsub = FR.db
    .collection("players")
    .where("code", "in", codes)
    .onSnapshot(
      (snap) => {
        const d = {};
        snap.docs.forEach((x) => {
          if (x.id !== FR.uid) d[x.data().code] = x.data();
        });
        FR.docs = d;
        if (tab === "stats" && st.plan) {
          const y = window.scrollY;
          renderMain();
          window.scrollTo(0, y);
        }
      },
      () => {},
    );
}
function syncMe() {
  if (!FR.db || !FR.uid || !st.plan) return;
  clearTimeout(FR.syncT);
  FR.syncT = setTimeout(async () => {
    const s = mySummary();
    const j = JSON.stringify(s);
    if (j === FR.last) return;
    try {
      await FR.db.doc("players/" + FR.uid).set(s);
      FR.last = j;
    } catch (e) {}
  }, 2500);
}
const _save = save;
save = function () {
  _save();
  syncMe();
};
const encSum = (o) => "GIA1." + btoa(unescape(encodeURIComponent(JSON.stringify(o))));
const decSum = (c) => {
  c = c.trim();
  if (!c.startsWith("GIA1.")) throw 0;
  const o = JSON.parse(decodeURIComponent(escape(atob(c.slice(5)))));
  if (!o || typeof o.streak !== "number") throw 0;
  return o;
};
function friendRows() {
  const me = mySummary();
  const rows = [{ ...me, me: true }];
  (st.friends || []).forEach((c) => {
    if (c.length <= 8) {
      if (FR.docs[c]) rows.push({ ...FR.docs[c], live: true });
      else rows.push({ code: c, pending: true });
    } else {
      try {
        rows.push({ ...decSum(c), card: true, raw: c });
      } catch (e) {}
    }
  });
  return rows;
}
function friendsCard() {
  const p = st.plan,
    rows = friendRows(),
    real = rows.filter((r) => !r.pending);
  const best = (k) => Math.max(...real.map((r) => r[k] || 0));
  const common = p.subjects.filter((s) => real.some((r) => !r.me && r.fc && r.fc[s] != null));
  const mockBest = Math.max(...real.map((r) => (r.mock ? r.mock.pct : -1)));
  const leader = (r, k) => (real.length > 1 && r[k] === best(k) && best(k) > 0 ? " lead" : "");
  const sorted = [...real].sort((a, b) => b.streak - a.streak || b.acc - a.acc);
  const place = sorted.findIndex((r) => r.me) + 1;
  return `<section class="card"><div class="label" style="margin-bottom:6px">Соревнование с друзьями</div>
    ${real.length > 1 ? `<p class="lead-line">Ты на <b>${place}-м месте</b> из ${real.length} по серии дней.</p>` : `<p class="note">Добавь друга и сравнивайте серию дней, долю верных ответов, прогноз баллов и пробники.</p>`}
    <div class="ftab-wrap"><table class="ftab"><thead><tr><th>Игрок</th><th>Серия</th><th>Верных</th><th>Решено</th>${common.map((s) => `<th>${esc(SUBJ[s])}</th>`).join("")}<th>Пробник</th><th></th></tr></thead><tbody>
    ${rows
      .map((r) =>
        r.pending
          ? `<tr><td><b>${esc(r.code)}</b><br><small class="note">нужен код результатов</small></td><td colspan="${4 + common.length}"></td><td><button class="xbtn" data-unf="${esc(r.code)}" aria-label="Удалить">×</button></td></tr>`
          : `<tr class="${r.me ? "me" : ""}">
      <td><b>${esc(r.nick || (r.me ? "Ты" : "Без ника"))}</b>${r.me ? ' <small class="note">ты</small>' : ""}<br><small class="note">${examName(r.exam)} · ${r.grade} кл.${r.card && r.upd ? " · на " + human(parseD(r.upd)) : ""}</small></td>
      <td class="nn${leader(r, "streak")}">${r.streak}</td><td class="nn${leader(r, "acc")}">${r.acc}%</td><td class="nn${leader(r, "solved")}">${r.solved}</td>
      ${common
        .map((s) => {
          const v = r.fc && r.fc[s];
          const b = Math.max(...real.map((x) => (x.fc && x.fc[s] != null ? x.fc[s] : -1)));
          return `<td class="nn${real.length > 1 && v != null && v === b ? " lead" : ""}">${v != null ? v : "—"}</td>`;
        })
        .join("")}
      <td class="nn${real.length > 1 && r.mock && r.mock.pct === mockBest ? " lead" : ""}">${r.mock ? r.mock.pct + "%" : "—"}</td>
      <td>${r.me ? "" : `<button class="xbtn" data-unf="${esc(r.card ? r.raw : r.code)}" aria-label="Удалить друга">×</button>`}</td></tr>`,
      )
      .join("")}
    </tbody></table></div>
    <p class="note" style="margin:6px 0 12px">Зелёным выделен лучший результат в столбце. Прогноз — тестовые баллы ЕГЭ или оценка ОГЭ.</p>
    <div class="row">
      <div class="field"><label class="label" for="nick">Твой ник</label><input class="inp" id="nick" maxlength="24" placeholder="Например, Стёпа" value="${esc(st.nick || "")}"></div>
      <div class="field"><label class="label" for="fadd">Код друга</label><div class="ans"><input class="inp" id="fadd" placeholder="ABC123 или длинный код" autocomplete="off" style="flex:1;min-width:0"><button class="btn" id="faddb">Добавить</button></div></div>
    </div>
    <div class="share-box">
      
      <div><div class="label">Код результатов</div><p class="note">Скопируй и отправь другу, а его код вставь в поле «Код друга». Результаты обновятся, когда обменяетесь кодами снова.</p>
        <div class="ans"><button class="icon-btn" id="fcopy">Скопировать код результатов</button><span class="res ok" id="fcok" hidden>Скопировано</span></div></div>
    </div>
    <span class="res bad" id="ferr" hidden></span>
  </section>`;
}
function bindFriends(view) {
  const nick = view.querySelector("#nick");
  if (!nick) return;
  nick.onchange = () => {
    st.nick = nick.value.trim();
    save();
  };
  const add = () => {
    const v = view.querySelector("#fadd").value.trim();
    const err = view.querySelector("#ferr");
    err.hidden = true;
    if (!v) return;
    let code = v.toUpperCase().replace(/\s/g, "");
    if (code.length <= 8) {
      if (code === myCode()) {
        err.textContent = "Это твой собственный код.";
        err.hidden = false;
        return;
      }
      if (!FR.db) {
        err.textContent = "Короткий код не подходит. Попроси у друга код результатов.";
        err.hidden = false;
        return;
      }
    } else {
      try {
        const o = decSum(v);
        code = v;
        st.friends = (st.friends || []).filter((c) => {
          try {
            return c.length <= 8 || decSum(c).code !== o.code;
          } catch (e) {
            return true;
          }
        });
      } catch (e) {
        err.textContent = "Код не подходит. Скопируй его целиком ещё раз.";
        err.hidden = false;
        return;
      }
    }
    if (!(st.friends || []).includes(code)) st.friends = [...(st.friends || []), code];
    save();
    subFriends();
    const y = window.scrollY;
    renderMain();
    window.scrollTo(0, y);
  };
  view.querySelector("#faddb").onclick = add;
  view.querySelector("#fadd").onkeydown = (e) => {
    if (e.key === "Enter") add();
  };
  view.querySelectorAll("[data-unf]").forEach(
    (b) =>
      (b.onclick = () => {
        st.friends = (st.friends || []).filter((c) => c !== b.dataset.unf);
        save();
        subFriends();
        const y = window.scrollY;
        renderMain();
        window.scrollTo(0, y);
      }),
  );
  view.querySelector("#fcopy").onclick = () => {
    const code = encSum(mySummary());
    const ok = () => {
      view.querySelector("#fcok").hidden = false;
    };
    try {
      navigator.clipboard.writeText(code).then(ok, () => {
        view.querySelector("#fadd").value = code;
        view.querySelector("#fadd").select();
        ok();
      });
    } catch (e) {
      view.querySelector("#fadd").value = code;
      ok();
    }
  };
}
let cheatSubj = null;
function renderCheat(view) {
  const p = st.plan;
  const subs = [...p.subjects, ...Object.keys(SUBJ).filter((s) => !p.subjects.includes(s))];
  if (!cheatSubj || !CHEAT[cheatSubj]) cheatSubj = subs.find((s) => CHEAT[s]) || "math";
  const C = CHEAT[cheatSubj] || [];
  view.innerHTML = `<div style="display:flex;flex-direction:column;gap:14px">
    <nav class="ctabs" aria-label="Предметы">${subs
      .filter((s) => CHEAT[s])
      .map((s) => `<button class="ctab" ${hs(s)} data-cs="${s}" aria-selected="${s === cheatSubj}">${SUBJ[s]}</button>`)
      .join("")}</nav>
    ${C.map((sec) => `<section class="card cheat" ${hs(cheatSubj)}><h3>${esc(sec.h)}</h3><dl>${sec.i.map(([a, b]) => `<div class="ci"><dt>${esc(a)}</dt>${b ? `<dd>${esc(b)}</dd>` : ""}</div>`).join("")}</dl></section>`).join("")}
  </div>`;
  view.querySelectorAll("[data-cs]").forEach(
    (b) =>
      (b.onclick = () => {
        cheatSubj = b.dataset.cs;
        renderMain();
        window.scrollTo(0, 0);
      }),
  );
}
renderMain();
initFriends();
if ("serviceWorker" in navigator)
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
