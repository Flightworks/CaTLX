const CACHE_NAME = 'catlx-cache-v4';

// Pre-cache the essential parts of the app shell.
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/icon.svg',
  '/manifest.json',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/constants.ts',
  '/assets.ts',
  '/contexts/AppContext.tsx',
  '/hooks/useMockData.ts',
  '/hooks/useLocalStorageData.ts',
  '/hooks/useApiData.ts',
  '/components/layout/Layout.tsx',
  '/components/layout/Header.tsx',
  '/components/ui/Button.tsx',
  '/components/ui/Card.tsx',
  '/components/ui/Modal.tsx',
  '/components/ui/Select.tsx',
  '/components/ui/TlxSlider.tsx',
  '/components/ui/PairwiseWeightsDisplay.tsx',
  '/components/ui/ToggleSwitch.tsx',
  '/pages/LoginPage.tsx',
  '/pages/EvaluatorPage.tsx',
  '/pages/AdminDashboardPage.tsx',
  '/pages/AboutPage.tsx',
  '/pages/admin/ManageEvaluators.tsx',
  '/pages/admin/ManageProjects.tsx',
  '/pages/admin/ViewStats.tsx',
  '/pages/admin/ManageMTEs.tsx',
  '/components/admin/MteStatsCard.tsx',
  '/components/admin/MteDetailModal.tsx',
  '/components/admin/MteComparisonChart.tsx',
  '/components/admin/ScoreDistributionChart.tsx',
];

// Install event: open cache and add app shell files.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching App Shell');
      // Use addAll with a new Request object with cache: 'reload' to bypass HTTP cache.
      const promises = ASSETS_TO_CACHE.map((asset) => {
        return cache.add(new Request(asset, { cache: 'reload' }));
      });
      return Promise.all(promises);
    })
  );
});

// Activate event: clean up old caches.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event: serve assets from cache, falling back to network.
// This strategy is known as "Cache, falling back to Network".
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  // For navigation requests, use a network-first strategy to ensure
  // the user gets the latest version of the app shell.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // If the asset is in the cache, return it.
      if (response) {
        return response;
      }

      // If the asset is not in the cache, fetch it from the network.
      return fetch(event.request).then((response) => {
        // Check if we received a valid response.
        if (!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
          return response;
        }

        // IMPORTANT: Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams.
        const responseToCache = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});