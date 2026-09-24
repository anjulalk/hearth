/* hearth's service worker. The app is a utility that people keep open for hours,
   so the shell is cached and opens when the network is down. Navigations are
   network first, because a new deploy should win over the cache. Hashed assets
   are cache first, because the name changes whenever the bytes do. */
const CACHE = 'hearth-shell-v1'
const SHELL = self.registration.scope

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll([SHELL]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(SHELL, copy))
          return response
        } catch {
          const cached = (await caches.match(SHELL)) ?? (await caches.match(request))
          return cached ?? Response.error()
        }
      })(),
    )
    return
  }

  if (url.pathname.includes('/assets/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) {
          const copy = response.clone()
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })(),
    )
  }
})
