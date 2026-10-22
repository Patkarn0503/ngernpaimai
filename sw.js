// เปลี่ยนเลขเวอร์ชันทุกครั้งที่อัปเดตไฟล์ เพื่อให้มือถือดึงของใหม่
const CACHE = 'ngernpaimai-v3';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const CDN = ['https://cdnjs.cloudflare.com/ajax/libs/echarts/5.5.0/echarts.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(async c => {
    await c.addAll(ASSETS);
    await Promise.all(CDN.map(u => fetch(u, { mode: 'cors' }).then(r => c.put(u, r)).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== 'ngernpaimai-share').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// รับสลิปที่แชร์มาจากแอปอื่น → เก็บไว้ชั่วคราว → เปิดแอป
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'POST' || !u.pathname.endsWith('/share-target')) return;
  e.respondWith((async () => {
    const fd = await e.request.formData(), c = await caches.open('ngernpaimai-share');
    let n = 0;
    for (const f of fd.getAll('slips')) if (f && f.size) await c.put(`./__shared/${Date.now()}_${n++}`, new Response(f, { headers: { 'content-type': f.type || 'image/jpeg' } }));
    return Response.redirect('./?shared=' + n, 303);
  })());
});

// stale-while-revalidate: ใช้ของในแคชก่อน แล้วอัปเดตเบื้องหลัง (ไม่ยุ่งกับ Apps Script)
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname.endsWith('google.com') || u.hostname.endsWith('googleusercontent.com')) return;
  const ok = u.origin === location.origin || /cdnjs\.cloudflare\.com|fonts\.(googleapis|gstatic)\.com/.test(u.hostname);
  if (!ok) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: u.origin === location.origin });
    const net = fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
