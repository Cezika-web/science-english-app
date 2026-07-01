// CZK English — Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDgDlLyU15p8wQ1YtCN8NebGes_oq3atU8",
  authDomain:        "scienceenglish.firebaseapp.com",
  projectId:         "scienceenglish",
  storageBucket:     "scienceenglish.firebasestorage.app",
  messagingSenderId: "152554774632",
  appId:             "1:152554774632:web:c43dfd4698efb136ed9bdd"
});

const messaging = firebase.messaging();
const CACHE = 'czk-v6';
const SHELL = [
  '/science-english-app/',
  '/science-english-app/index.html',
  '/science-english-app/manifest.json'
];
const DEFAULT_URL = '/science-english-app/';

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

// Fetch: network-first for the app HTML (always fresh), cache-first for other assets
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // App HTML / navigations: ALWAYS network-first so the app never gets stuck on an old build
  if (req.mode === 'navigate' ||
      url.pathname.endsWith('/') ||
      url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/science-english-app/')))
    );
    return;
  }

  // Firebase / CDNs / external HTML (pós-aulas): network-first
  if (url.hostname.includes('firebase') ||
      url.hostname.includes('gstatic') ||
      url.hostname.includes('unpkg') ||
      url.hostname.includes('notion.so') ||
      url.hostname.includes('github.io')) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Everything else: cache-first
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || payload.data?.title || 'Science English';
  const body  = payload.notification?.body  || payload.data?.body  || 'Novo pós-aula disponível!';
  const url   = payload.fcmOptions?.link || payload.data?.url || DEFAULT_URL;

  return self.registration.showNotification(title, {
    body,
    icon: '/science-english-app/icons/icon-192.png',
    badge: '/science-english-app/icons/icon-192.png',
    data: { url },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  });
});

// Click on notification → open the app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || DEFAULT_URL;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url === url && 'focus' in c);
      if (match) return match.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
