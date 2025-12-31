const CACHE_NAME = 'seismic-core-v3';
const DATA_CACHE_NAME = 'seismic-data-v1';

const STATIC_ASSETS = [
    './',
    'seismic_index.html',
    'css/seismic.css',
    'js/seismic-app.js',
    'js/seismic-data.js',
    'js/globe.js',
    'js/report.js',
    'js/chatbot.js',
    'js/music.js',
    'icon-512.png',
    'manifest.json'
];

// Install Event: Cache Core Assets
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching App Shell');
                return cache.addAll(STATIC_ASSETS);
            })
    );
});

// Activate Event: Cleanup Old Caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
                    console.log('[SW] Removing old cache', key);
                    return caches.delete(key);
                }
            })
        )).then(() => self.clients.claim())
    );
});

// Fetch Event: Smart Strategy
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // 1. API Requests: Network First -> Cache Fallback
    if (url.href.includes('earthquake.usgs.gov')) {
        event.respondWith(
            caches.open(DATA_CACHE_NAME).then(cache => {
                return fetch(event.request)
                    .then(response => {
                        // If successful, clone and cache
                        if (response.status === 200) {
                            cache.put(event.request.url, response.clone());
                        }
                        return response;
                    })
                    .catch(() => {
                        // Network failed, try cache
                        console.warn('[SW] Network failed, serving cached API data');
                        return cache.match(event.request);
                    });
            })
        );
        return;
    }

    // 2. Static Assets: Stale-While-Revalidate
    // Return cached version immediately, but fetch update in background for next time
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            const fetchPromise = fetch(event.request).then(networkResponse => {
                return caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            });
            // Return cached response if available, otherwise wait for network
            return cachedResponse || fetchPromise;
        })
    );
});
