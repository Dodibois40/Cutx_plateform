// CutX Service Worker
// Version: 1.0.0

const CACHE_NAME = 'cutx-cache-v1';
const STATIC_CACHE_NAME = 'cutx-static-v1';
const API_CACHE_NAME = 'cutx-api-v1';

// Assets statiques à pré-cacher
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Patterns pour les différentes stratégies de cache
const API_PATTERN = /\/api\//;
const STATIC_PATTERN = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico)$/;
const NEXT_STATIC_PATTERN = /\/_next\/static\//;
const NEXT_IMAGE_PATTERN = /\/_next\/image/;

// Installation - pré-cache des assets statiques
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Activer immédiatement le nouveau SW
  self.skipWaiting();
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => {
            // Supprimer les anciens caches
            return (
              name.startsWith('cutx-') &&
              name !== CACHE_NAME &&
              name !== STATIC_CACHE_NAME &&
              name !== API_CACHE_NAME
            );
          })
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );

  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Fetch - stratégies de cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes cross-origin (sauf images)
  if (url.origin !== self.location.origin && !isImageRequest(url)) {
    return;
  }

  // Stratégie basée sur le type de ressource
  if (API_PATTERN.test(url.pathname)) {
    // API: Network First (données fraîches prioritaires)
    event.respondWith(networkFirst(request, API_CACHE_NAME));
  } else if (
    STATIC_PATTERN.test(url.pathname) ||
    NEXT_STATIC_PATTERN.test(url.pathname)
  ) {
    // Assets statiques: Cache First (performance)
    event.respondWith(cacheFirst(request, STATIC_CACHE_NAME));
  } else if (NEXT_IMAGE_PATTERN.test(url.pathname) || isImageRequest(url)) {
    // Images: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE_NAME));
  } else {
    // Pages HTML: Network First avec fallback
    event.respondWith(networkFirst(request, CACHE_NAME));
  }
});

// === Stratégies de Cache ===

// Network First: essaie le réseau, fallback sur cache
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Mettre en cache si succès
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Fallback sur cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Si page HTML, retourner la page d'accueil
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/');
    }

    throw error;
  }
}

// Cache First: essaie le cache, fallback sur réseau
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first failed for:', request.url);
    throw error;
  }
}

// Stale While Revalidate: retourne cache immédiatement, met à jour en background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  // Fetch en background
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  // Retourner cache si disponible, sinon attendre le réseau
  return cachedResponse || fetchPromise;
}

// === Helpers ===

function isImageRequest(url) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname);
}

// Message handler pour communication avec l'app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearCache') {
    caches.keys().then((names) => {
      names.forEach((name) => {
        if (name.startsWith('cutx-')) {
          caches.delete(name);
        }
      });
    });
  }
});

console.log('[SW] Service Worker loaded');
