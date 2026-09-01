import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

const sw = self as any;

// Clean old caches
cleanupOutdatedCaches();

// Precache injected assets
// @ts-ignore
precacheAndRoute(self.__WB_MANIFEST || []);

sw.skipWaiting();
clientsClaim();

// Push Notifications
sw.addEventListener('push', (event: any) => {
  let data = { title: 'SPLENDID CHAT', body: 'You have a new notification.' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: { url: '/' }
  };

  event.waitUntil(
    sw.registration.showNotification(data.title, options)
  );
});

sw.addEventListener('notificationclick', (event: any) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: 'window' }).then((clientList: any[]) => {
      for (const client of clientList) {
        if (client.url.includes(sw.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      if (sw.clients.openWindow) {
        return sw.clients.openWindow('/');
      }
    })
  );
});

// Background Sync
sw.addEventListener('sync', (event: any) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      sw.clients.matchAll().then((clients: any[]) => {
        clients.forEach((client) => client.postMessage({ type: 'BACKGROUND_SYNC', tag: event.tag }));
      })
    );
  }
});

// Periodic Sync
sw.addEventListener('periodicsync', (event: any) => {
  if (event.tag === 'update-chat-cache') {
    event.waitUntil(
      sw.clients.matchAll().then((clients: any[]) => {
        clients.forEach((client) => client.postMessage({ type: 'PERIODIC_SYNC', tag: event.tag }));
      })
    );
  }
});
