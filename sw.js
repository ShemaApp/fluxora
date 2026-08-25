/* sw.js — service worker de la PWA.
   Lista de precaché generada a partir de los archivos reales del
   proyecto (no es una plantilla genérica). Si agregas o quitas un
   archivo .js/.html del proyecto, actualiza APP_SHELL y sube CACHE_VERSION
   para forzar la actualización en los dispositivos ya instalados. */

const CACHE_VERSION = 'v1.6.8';
const CACHE_NAME = `app-shell-${CACHE_VERSION}`;

const APP_SHELL = [
  './',
  './index.html',
  './visual-fluxora.css',
  './offline.html',
  './manifest.json',
  './firebase-init.js',
  './brand.config.js',
  './assets/brand/fluxora-logo.svg',
  './assets/brand/fluxora-logo.png',
  './app-core.js',
  './db/colecciones.js',
  './referencias-operativas.js',
  './db/semillas.js',
  './ventas-offline.js',
  './cargas-agua.js',
  './servicios-relleno.js',
  './sesion.js',
  './hooks/useSesion.js',
  './auth.js',
  './dashboard.js',
  './productos.js',
  './clientes.js',
  './creditos.js',
  './ruta.js',
  './jerarquia.js',
  './jornada.js',
  './medicion.js',
  './gestion-flota.js',
  './config.js',
  './app.js',
  './repartidores.js',
  './inventario.js',
  './reportes.js',
  './gerencia.js',
  './permisos.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(err => console.warn('SW: no se pudo precachear todo el app shell', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(nombres =>
      Promise.all(
        nombres
          .filter(n => n !== CACHE_NAME)
          .map(n => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;

  // Solo intercepta peticiones GET del mismo origen. Deja pasar todo lo
  // demás (Firestore, Auth, App Check, CDNs) sin tocarlo — Firestore ya
  // trae su propia persistencia offline (ver firebase-init.js).
  if (request.method !== 'GET' || new URL(request.url).origin !== location.origin) {
    return;
  }

  // Navegación (abrir/recargar la app): red primero, con caché y luego
  // offline.html como respaldo.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
          return resp;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('./offline.html'))
        )
    );
    return;
  }

  // Resto de archivos del app shell: caché primero, red de respaldo.
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copia));
        return resp;
      });
    })
  );
});
