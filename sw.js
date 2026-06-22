// CZK English — Service Worker
const CACHE = 'czk-v3';
const SHELL = ['/', '/index.html', '/manifest.json'];

// Install: cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for API calls, cache-first for shell
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Always network for Firebase, Notion, pós-aula HTML files
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('notion.so') ||
      url.hostname.includes('github.io')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }

  // Cache-first for the app shell
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Push Notifications
self.addEventListener('push', e => {
  const data  = e.data?.json() || {};
  const title = data.notification?.title || 'Science English';
  const body  = data.notification?.body  || 'Novo pós-aula disponível!';
  // FCM v1 webpush sends the link in data.fcmOptions.link or data.data.url
  const url   = data.fcmOptions?.link || data.data?.url || '/science-english-app/';

  e.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/science-english-app/icons/icon-192.png',
      badge: '/science-english-app/icons/icon-192.png',
      data: { url },
      requireInteraction: false,
      vibrate: [200, 100, 200]
    })
  );
});

// Click on notification → open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url === url && 'focus' in c);
      if (match) return match.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
