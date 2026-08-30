// Service Worker Registration Helper for SPLENDID CHAT

export function registerServiceWorker() {
  if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => {
      const swUrl = '/sw.js';

      navigator.serviceWorker
        .register(swUrl)
        .then(async (registration) => {
          console.log('ServiceWorker registered successfully with scope:', registration.scope);

          // 1. Register Background Sync for outbox synchronization
          if ('sync' in registration) {
            try {
              // Register one-shot sync for outbound offline/network-resumed messages
              await (registration as any).sync.register('sync-messages');
              console.log('[ServiceWorker] Background Sync ("sync-messages") registered successfully!');
            } catch (err) {
              console.warn('[ServiceWorker] Background Sync registration failed:', err);
            }
          }

          // 2. Register Periodic Sync for updating background chat caches (requires permission check)
          if ('periodicSync' in registration) {
            try {
              const status = await (navigator.permissions as any).query({
                name: 'periodic-background-sync'
              });
              if (status.state === 'granted') {
                await (registration as any).periodicSync.register('update-chat-cache', {
                  minInterval: 24 * 60 * 60 * 1000 // Refresh at most once per 24 hours
                });
                console.log('[ServiceWorker] Periodic Sync ("update-chat-cache") registered!');
              }
            } catch (err) {
              console.warn('[ServiceWorker] Periodic Sync registration failed or not allowed:', err);
            }
          }

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker == null) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content is available and will be used when all tabs for this page are closed.');
                } else {
                  console.log('Content is cached for offline use.');
                }
              }
            };
          };
        })
        .catch((error) => {
          console.error('Error during ServiceWorker registration:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
