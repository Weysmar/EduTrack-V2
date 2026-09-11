// Service Worker for EduTrack PWA (Caching, Offline Support, and Notifications)
const CACHE_NAME = 'hubtrack-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/logo.svg',
  '/logo.png',
  '/app-icon.svg',
  '/app-icon.png',
  '/apple-touch-icon.png',
  '/fonts/Inter-Regular.woff2',
  '/fonts/Inter-Bold.woff2',
  '/fonts/JetBrainsMono-Regular.woff2',
  '/fonts/Lexend-Regular.woff2',
  '/fonts/Poppins-Regular.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('PWA Cache prefetch issue:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Ignore non-http/https schemes (e.g. chrome-extension://, blob:, data:)
  if (!url.protocol.startsWith('http')) return;

  // Exclude API / dynamic upload & storage endpoints
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/uploads') ||
    url.pathname.startsWith('/storage') ||
    url.pathname.endsWith('.mjs') ||
    url.pathname.includes('worker')
  ) {
    return;
  }

  // Network first with cache fallback strategy
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((res) => res || caches.match('/index.html')))
  );
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/edu/calendar';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it and navigate
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          return;
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
