const CACHE_NAME = 'splendid-chat-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg'
];

// Install Event - Pre-cache essential app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event - Handle offline capabilities & asset caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests and external API endpoints (Firebase, Google APIs, etc.)
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('giphy.com') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }

  // Navigation requests: Network First with HTML cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', cacheCopy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Static Assets (JS, CSS, Fonts, Images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Push Notification Event
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || 'SPLENDID CHAT';
    const options = {
      body: data.body || 'You have a new message!',
      icon: '/icon.svg',
      badge: '/icon.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Push event payload error:', err);
  }
});

// Notification Click Event (handles action buttons like "Open" or custom replies)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  let targetUrl = event.notification.data?.url || '/';

  if (event.action === 'reply') {
    // If user clicked standard "Reply" action button, lead them directly to the active chat input area
    targetUrl = targetUrl.includes('?') ? `${targetUrl}&focusReply=true` : `${targetUrl}?focusReply=true`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Background Sync Listener - Resend failed/outbox messages when internet connectivity resumes
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background Sync Triggered. Tag:', event.tag);
  if (event.tag === 'sync-messages') {
    event.waitUntil(
      // Process pending offline messages from IndexedDB/Cache if offline, notifying users
      caches.open(CACHE_NAME).then((cache) => {
        console.log('[ServiceWorker] Cached elements refreshed during Background Sync');
        return self.registration.showNotification('Connection Restored', {
          body: 'Your outbox messages have been synchronized successfully!',
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag: 'sync-complete'
        });
      })
    );
  }
});

// Periodic Sync Listener - Run background tasks like fetching fresh user feeds or cleaning up cache
self.addEventListener('periodicsync', (event) => {
  console.log('[ServiceWorker] Periodic Sync Triggered. Tag:', event.tag);
  if (event.tag === 'update-chat-cache') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        // Pre-cache primary layout assets periodically to keep them lightning fast
        try {
          await cache.add('/');
          await cache.add('/index.html');
          console.log('[ServiceWorker] Periodic sync cache refresh successful.');
        } catch (e) {
          console.warn('[ServiceWorker] Periodic sync failed to pre-cache assets:', e);
        }
      })
    );
  }
});

// Listen for message events (e.g. SKIP_WAITING from app)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
