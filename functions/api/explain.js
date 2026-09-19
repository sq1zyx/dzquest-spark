// Cloudflare Pages Function: POST /api/explain
//
// Это единственная часть приложения, которая обращается к серверу — сама
// страница по-прежнему полностью офлайн (кэшируется service worker'ом).
// Функция вызывается, когда ученик отвечает неправильно и нажимает
// «Объяснить с ИИ» в разборе ошибок.
//
// Работает через Workers AI (нейросеть от Cloudflare, встроенная в платформу):
// ключ API не нужен, нужен только биндинг с именем "AI".
// Как включить биндинг:
//   Cloudflare Dashboard → Workers & Pages → ваш проект → Settings →
//   Functions → "AI" bindings → Add binding → имя переменной: AI.
// (или так же через wrangler.toml — см. файл рядом с этим проектом).
//
// Если вместо Workers AI вы хотите использовать другую модель (например,
// Anthropic Claude через API), замените блок вызова env.AI.run(...) ниже на
// fetch к нужному API и сохраните секретный ключ через
// Settings → Environment variables → Secrets (никогда не кладите ключ в код).

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fp8";
const MAX_LEN = 500;

function clip(value, max = MAX_LEN) {
  if (typeof value !== "string") return "";
  return value.slice(0, max);
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

export async function onRequestOptions(context) {
  return new Response(null, { headers: corsHeaders(context.request.headers.get("Origin")) });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get("Origin");

  if (!env.AI) {
    return json(
      { error: "На сервере не настроен ИИ-биндинг (AI). Смотрите инструкцию в functions/api/explain.js." },
      500,
      origin
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Некорректный запрос" }, 400, origin);
  }

  const grade = Number(body.grade) || null;
  const subject = clip(body.subject, 80);
  const topic = clip(body.topic, 200);
  const question = clip(body.question, 500);
  const yourAnswer = clip(body.yourAnswer, 300);
  const correctAnswer = clip(body.correctAnswer, 300);
  const options = Array.isArray(body.options)
    ? body.options.slice(0, 6).map((o) => clip(String(o), 200))
    : [];

  if (!question || !correctAnswer) {
    return json({ error: "Не хватает данных о задании" }, 400, origin);
  }

  const gradeLine = grade ? `${grade} класс` : "школьник (класс не указан)";
  const optionsLine = options.length ? `Варианты ответа были: ${options.join(" | ")}.` : "";

  const systemPrompt =
    "Ты — доброжелательный школьный репетитор, который помогает ученику разобраться " +
    "в теме после того, как он ответил на задание неправильно. Объясняй по-русски, " +
    "просто и понятно для указанного класса, без канцелярита и сложных терминов без " +
    "объяснения. Структура ответа: сначала коротко — в чём именно ошибка в его " +
    "рассуждении; затем — само правило или понятие своими словами (2-4 предложения); " +
    "при необходимости — один короткий похожий пример с другими числами или словами " +
    "(не подсказывай прямой ответ на то же самое задание). Не используй markdown, " +
    "звёздочки или списки — только обычный связный текст, не длиннее 6-8 предложений.";

  const userPrompt =
    `Предмет: ${subject || "не указан"}. Тема: ${topic || "не указана"}. Класс: ${gradeLine}.\n` +
    `Задание: ${question}\n${optionsLine}\n` +
    `Ответ ученика (неверный): ${yourAnswer || "не выбран"}\n` +
    `Правильный ответ: ${correctAnswer}\n` +
    "Объясни ученику, в чём его ошибка, и разбери тему так, чтобы он понял правило.";

  try {
    const result = await env.AI.run(MODEL, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 400,
    });

    const explanation = String((result && (result.response ?? result.result ?? "")) || "").trim();
    if (!explanation) {
      return json({ error: "ИИ вернул пустой ответ, попробуй ещё раз" }, 502, origin);
    }
    return json({ explanation }, 200, origin);
  } catch (err) {
    return json({ error: "Ошибка при обращении к ИИ" }, 502, origin);
  }
}
