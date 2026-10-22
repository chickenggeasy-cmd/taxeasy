// Service worker ของภาษีง่ายๆ: เปิดแอปได้แม้ออฟไลน์
// - ไฟล์แอป: ใช้ของในแคชก่อน แล้วอัปเดตเบื้องหลัง
// - api/: ดึงจากเซิร์ฟเวอร์ก่อนเสมอ (กฎภาษีต้องสดใหม่) ถ้าออฟไลน์แอปจะใช้กฎที่บันทึกไว้เอง
const CACHE = 'taxeasy-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', './index.html', './manifest.webmanifest'])))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== location.origin) return
  if (url.pathname.includes('/api/') || url.pathname.includes('/admin/')) return

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request)
      const network = fetch(event.request)
        .then((res) => {
          if (res.ok) cache.put(event.request, res.clone())
          return res
        })
        .catch(() => cached)
      return cached || network
    }),
  )
})
