// Commute Coach — 오프라인에서도 앱이 열리도록 파일을 이 기기에 보관합니다.
// (GitHub API 요청은 건드리지 않음)
const CACHE = 'coach-v4-1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.png', './prompt.txt', './tts.yml'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('coach-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // 앱 파일: 보관본을 바로 보여주고, 인터넷이 되면 뒤에서 최신으로 바꿔 둠 (다음에 열 때 반영)
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req)
      .then((res) => { if (res.ok && res.type === 'basic') cache.put(key, res.clone()); return res; })
      .catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('오프라인이에요', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  })());
});
