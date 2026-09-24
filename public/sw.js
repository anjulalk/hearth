/* hearth's service worker. The app is a utility that people keep open for hours,
   so the shell is cached and opens when the network is down. Navigations are
   network first, because a new deploy should win over the cache. Hashed assets
   and the fonts are cache first, because their names change when the bytes do. */
const CACHE = 'hearth-shell-v3'
const SHELL = self.registration.scope
/* The three families, latin subset. Small enough to keep, so the app opens
   offline with its own type rather than a fallback. */
const FONTS = [
  'fonts/inter-100_900-latin.woff2',
  'fonts/jetbrains-mono-100_800-latin.woff2',
  'fonts/source-serif-4-200_900-latin.woff2',
]
/* A new build renames its assets, so the cache would grow forever without a
   ceiling. Forty entries is several builds' worth of a small app. */
const MAX_ENTRIES = 40

async function put(request, response) {
  const cache = await caches.open(CACHE)
  await cache.put(request, response)
  const keys = await cache.keys()
  if (keys.length > MAX_ENTRIES) {
    for (const key of keys.slice(0, keys.length - MAX_ENTRIES)) await cache.delete(key)
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        // One missing file must not stop the worker from installing.
        Promise.all([SHELL, ...FONTS].map((url) => cache.add(url).catch(() => undefined))),
      )
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
          void put(SHELL, response.clone())
          return response
        } catch {
          const cached = (await caches.match(SHELL)) ?? (await caches.match(request))
          return cached ?? Response.error()
        }
      })(),
    )
    return
  }

  if (url.pathname.includes('/assets/') || url.pathname.includes('/fonts/')) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request)
        if (cached) return cached
        const response = await fetch(request)
        if (response.ok) void put(request, response.clone())
        return response
      })(),
    )
  }
})
