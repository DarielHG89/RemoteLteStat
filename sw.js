const cacheName = 'lte-stat-v1';
const assets = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/jquery.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(res => res || fetch(event.request))
  );
});
