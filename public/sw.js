/*
 * Mimix service worker. Small on purpose:
 *  - pages: network first; with no connection, the cached offline page
 *  - /_next/static (content-hashed, immutable): cache first
 *  - icons and fonts: stale while revalidate
 *  - everything else, including /api, media and signed URLs: straight to the network, never cached
 * Bump VERSION to drop old caches on the next visit.
 */
const VERSION = 'v1'
const CACHE = `mimix-${VERSION}`
const OFFLINE = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    const res = await fetch(OFFLINE, { cache: 'no-store' })
    if (!res.ok) return
    await cache.put(OFFLINE, res.clone())
    // The offline page's own CSS and JS, so it renders styled with no connection.
    const html = await res.text()
    const assets = [...new Set([...html.matchAll(/(?:href|src)="(\/_next\/static\/[^"]+)"/g)].map((m) => m[1]))]
    await Promise.all([...assets, '/icons/favicon.svg', '/icons/icon-192.png'].map((u) => cache.add(u).catch(() => undefined)))
  })())
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('mimix-') && key !== CACHE) await caches.delete(key)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE)) || Response.error()))
    return
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith((async () => {
      const hit = await caches.match(req)
      if (hit) return hit
      const res = await fetch(req)
      if (res.ok) (await caches.open(CACHE)).put(req, res.clone())
      return res
    })())
    return
  }
  if (url.pathname.startsWith('/icons/') || url.pathname.startsWith('/_next/static/media/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE)
      const hit = await cache.match(req)
      const update = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res }).catch(() => hit)
      return hit || update
    })())
  }
})
