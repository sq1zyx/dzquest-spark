// Service worker: делает приложение полностью офлайн после первого открытия.
// ВАЖНО: при каждом обновлении файлов приложения нужно менять CACHE_NAME —
// иначе браузер не заметит, что sw.js изменился (это единственный сигнал
// для обновления кэша), и старые версии страницы будут открываться даже
// после переустановки/повторной публикации.
const CACHE_NAME = "spark-v12";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./questions/q5.js",
  "./questions/q6.js",
  "./questions/q7.js",
  "./questions/q8.js",
  "./questions/q9.js",
  "./questions/q10.js",
  "./questions/q11.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/currency-shard.png",
  "./icons/chest-free.png",
  "./icons/pet-seed.png",
  "./icons/pet-sprout.png",
  "./icons/cases/space.jpg",
  "./icons/cases/nature.jpg",
  "./icons/cases/ocean.jpg",
  "./icons/cases/sweet.jpg",
  "./icons/cases/royal.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// Стратегия для самой страницы (HTML): сначала сеть, чтобы обновления
// приложения подхватывались сразу же при первом открытии с интернетом,
// а без интернета — откат на кэш (офлайн по-прежнему работает).
// Для остальных файлов (скрипты, иконки): сначала кэш (быстро и офлайн),
// в фоне обновляем из сети на будущее — как и раньше.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // внешние ссылки (видео, тексты) не кэшируем

  const isNavigation = event.request.mode === "navigate" || url.pathname.endsWith("index.html") || url.pathname.endsWith("/");

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
