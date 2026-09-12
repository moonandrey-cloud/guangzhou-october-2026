// Кэш тренажёра. Версию подставляет скрипт публикации — новая версия = полное обновление офлайн-копии.
// Страница, манифест и список файлов — сеть, потом кэш. Картинки и звук — кэш, потом сеть.
// При установке скачивается весь список из precache.json, чтобы в Китае всё было под рукой без сети.
const CACHE = "zh-trainer-20260912-0948";

async function precache() {
  const cache = await caches.open(CACHE);
  let list = [];
  try { list = await (await fetch("precache.json?v=" + Date.now(), { cache: "no-store" })).json(); } catch (e) { return; }
  // картинки и звук из прошлой версии не качаем заново — переносим
  const olds = await Promise.all((await caches.keys()).filter(k => k !== CACHE && k.startsWith("zh-trainer-")).map(k => caches.open(k)));
  let done = 0;
  const step = 6; // по несколько файлов за раз, чтобы не давить на мобильную сеть
  for (let i = 0; i < list.length; i += step) {
    await Promise.all(list.slice(i, i + step).map(async (url) => {
      try {
        const req = new Request(url, { cache: "no-store" });
        const hit = await cache.match(req, { ignoreSearch: true });
        if (hit) { done++; return; }
        if (/^(memo|audio)\//.test(url)) {
          for (const old of olds) { const o = await old.match(url, { ignoreSearch: true }); if (o) { await cache.put(url, o); done++; return; } }
        }
        const r = await fetch(req);
        if (r.ok) { await cache.put(url, r); done++; }
      } catch (e) {}
    }));
    if (i % (step * 10) === 0) notify(done, list.length);
  }
  notify(done, list.length);
}
async function notify(done, total) {
  const cs = await self.clients.matchAll({ includeUncontrolled: true });
  cs.forEach(c => c.postMessage({ type: "precache", done, total }));
}

self.addEventListener("install", (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isPage = url.pathname.endsWith(".html") || url.pathname.endsWith("/") || url.pathname.endsWith("sw.js") || url.pathname.endsWith(".webmanifest") || url.pathname.endsWith("precache.json");
  if (isPage) {
    e.respondWith(
      fetch(req).then(r => {
        if (r.ok && !url.pathname.endsWith("sw.js")) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
      }).catch(() => caches.match(req, { ignoreSearch: true }))
    );
    return;
  }
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return r;
    }))
  );
});
