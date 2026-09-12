// Service Worker — cache básico para funcionamento offline (app-shell)
const CACHE = 'synapse-crm-v1';
const APP_SHELL = ['/', '/funil', '/leads', '/clientes', '/apolices', '/tarefas', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL).catch(() => {})),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Nunca cachear API (dados sempre frescos)
  if (url.pathname.startsWith('/api')) return;

  // Network-first para navegação; cache como fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Cache-first para assets estáticos
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
