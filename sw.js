// ============================================================================
// File Name:    sw.js
// Description:  Service Worker for Strive Habit Tracker PWA.
//               Caches static assets for offline execution.
// ============================================================================

const CACHE_NAME = 'strive-v1';
const ASSETS = [
    'index.html',
    'index.css',
    'app.js',
    'manifest.json',
    'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install Service Worker and cache essential files
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching application assets...');
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Service Worker and clean up stale caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Serve cached assets when offline, falling back to network
self.addEventListener('fetch', (e) => {
    // Only cache GET requests
    if (e.request.method !== 'GET') return;

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            
            return fetch(e.request).then((networkResponse) => {
                // If valid response, add clone to cache dynamically
                if (networkResponse && networkResponse.status === 200) {
                    const cacheCopy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        // Do not cache external APIs/analytics other than fonts/font-awesome
                        const url = e.request.url;
                        if (url.startsWith(self.location.origin) || url.includes('fonts.googleapis') || url.includes('cloudflare')) {
                            cache.put(e.request, cacheCopy);
                        }
                    });
                }
                return networkResponse;
            }).catch(() => {
                // If offline and request is HTML, we can return the cached index
                if (e.request.headers.get('accept').includes('text/html')) {
                    return caches.match('index.html');
                }
            });
        })
    );
});
