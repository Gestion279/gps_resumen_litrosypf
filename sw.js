// Service worker: cachea el "app shell" para que la app instalada abra
// rápido y funcione offline para la interfaz (los datos siempre se piden
// en vivo a Supabase, así que hace falta conexión para eso).
//
// IMPORTANTE: usa estrategia "red primero" (no "caché primero") para el
// HTML/manifest, así cada vez que se sube una versión nueva a GitHub/Vercel,
// los usuarios la reciben enseguida en vez de quedar pegados a una copia
// vieja cacheada. La caché solo se usa como respaldo si no hay conexión.
//
// Cada vez que se publique un cambio importante, conviene subir también
// el número de esta constante (v2, v3, ...) para forzar a los navegadores
// a descartar cachés viejas de una.
const CACHE = 'gps-modulo-v2';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // nunca cachear llamadas a Supabase ni a CDNs externos: siempre en vivo
  if(url.origin !== self.location.origin){
    return;
  }

  // RED PRIMERO para navegación y para el propio app shell: así una
  // actualización subida al repo se ve enseguida. Si falla (sin conexión),
  // se cae a lo último que quedó guardado en caché.
  event.respondWith(
    fetch(event.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      return resp;
    }).catch(() => caches.match(event.request))
  );
});
