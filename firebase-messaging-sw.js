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

messaging.onBackgroundMessage(payload => {
  const title = payload.notification?.title || 'Science English';
  const body  = payload.notification?.body  || 'Novo pós-aula disponível!';
  const url   = payload.fcmOptions?.link || payload.data?.url || '/science-english-app/';
  self.registration.showNotification(title, {
    body,
    icon:  '/science-english-app/icons/icon-192.png',
    badge: '/science-english-app/icons/icon-192.png',
    data:  { url }
  });
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/science-english-app/';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url === url && 'focus' in c);
      if (match) return match.focus();
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
