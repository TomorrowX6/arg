/* This template is filled with the complete build manifest by generate-offline.mjs. */
const VERSION = /* __ARCHIVE_VERSION__ */ ''
const ASSETS = /* __ARCHIVE_ASSETS__ */ []
const PREFIX = `echo-archive-offline:${encodeURIComponent(self.registration.scope)}:`
const CACHE = `${PREFIX}${VERSION}`
const urls = ASSETS.map((path) => new URL(path, self.registration.scope).href)

async function announce(data) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true })
  for (const client of clients) {
    if (client.url.startsWith(self.registration.scope)) {
      client.postMessage({ archiveOffline: true, ...data })
    }
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      let cursor = 0
      let completed = 0
      try {
        // Keep parallel network pressure bounded, including the bundled font slices.
        await Promise.all(
          Array.from({ length: Math.min(6, urls.length) }, async () => {
            while (cursor < urls.length) {
              const url = urls[cursor++]
              const response = await fetch(url, { cache: 'reload' })
              if (!response.ok) throw new Error('An archive file could not be downloaded')
              await cache.put(url, response)
              completed++
              if (completed % 5 === 0 || completed === urls.length) {
                await announce({ type: 'progress', completed, total: urls.length })
              }
            }
          }),
        )
        await announce({ type: 'prepared', version: VERSION })
      } catch {
        // A partial archive must never look like a successful offline download.
        await caches.delete(CACHE)
        await announce({ type: 'failed' })
        throw new Error('Offline archive preparation failed')
      }
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const previous = (await caches.keys()).filter(
        (name) => name.startsWith(PREFIX) && name !== CACHE,
      )
      // Retain the most recent old build so another open tab can load its lazy chunks.
      await Promise.all(previous.slice(0, -1).map((name) => caches.delete(name)))
      await self.clients.claim()
      await announce({ type: 'ready', version: VERSION })
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return
  if (url.pathname.endsWith('/sw.js') || url.pathname.endsWith('/offline-info.json')) return
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE)
      if (request.mode === 'navigate') {
        const shell = await cache.match(new URL('./index.html', self.registration.scope).href)
        if (shell) return shell
        return fetch(request)
      }
      // These are same-origin static build files. Preview hosts may add Vary: Origin,
      // while module requests send a different Origin header from the precache fetch.
      const current = await cache.match(request, { ignoreVary: true })
      if (current) return current
      for (const name of (await caches.keys()).filter(
        (name) => name.startsWith(PREFIX) && name !== CACHE,
      )) {
        const previous = await (await caches.open(name)).match(request, { ignoreVary: true })
        if (previous) return previous
      }
      return fetch(request)
    })(),
  )
})
