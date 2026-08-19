// Service worker mínimo: estratégia "network-first" com fallback pro cache.
// Objetivo é tornar o app instalável e sobreviver a uma queda rápida de rede,
// SEM servir assets velhos (a rede sempre tem prioridade quando disponível).
const CACHE = 'alemao-do-corte-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return

  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copia = resp.clone()
        caches.open(CACHE).then((cache) => cache.put(req, copia)).catch(() => {})
        return resp
      })
      .catch(() => caches.match(req).then((c) => c || caches.match('/agenda')))
  )
})
