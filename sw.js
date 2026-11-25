/* Bíblia Sem Jaula 365 — service worker (offline). ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X */
const VERSAO = 'bsj365-v2-2026-11-23';
const BASE = [
  './', 'index.html', 'assets/app.css', 'assets/app.js', 'assets/emblema.svg', 'data/estudo.json', 'manifest.webmanifest',
  'icons/favicon.svg', 'icons/favicon-32.png', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png',
    "assets/fonts/cinzel-latin-400-normal.woff2",   "assets/fonts/cinzel-latin-700-normal.woff2",   "assets/fonts/cormorant-garamond-latin-600-italic.woff2",   "assets/fonts/cormorant-garamond-latin-600-normal.woff2",   "assets/fonts/cormorant-garamond-latin-700-normal.woff2",   "assets/fonts/lora-latin-400-italic.woff2",   "assets/fonts/lora-latin-400-normal.woff2",   "assets/fonts/lora-latin-500-normal.woff2",   "assets/fonts/lora-latin-700-normal.woff2",   "assets/fonts/opendyslexic-latin-400-normal.woff2",   "assets/fonts/opendyslexic-latin-700-normal.woff2",   "assets/fonts/poppins-latin-400-normal.woff2",   "assets/fonts/poppins-latin-500-normal.woff2",   "assets/fonts/poppins-latin-600-normal.woff2", 
];
self.addEventListener('install', ev => { ev.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', ev => { ev.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('bsj365-') && k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // PDFs: rede primeiro, guarda cópia para ler offline depois
  if (req.url.endsWith('.pdf')) {
    ev.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(req, c)); return r; }).catch(() => caches.match(req)));
    return;
  }
  // demais arquivos: cache primeiro, atualiza em segundo plano
  ev.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => {
    const rede = fetch(req).then(r => { if (r.ok) { const c = r.clone(); caches.open(VERSAO).then(ca => ca.put(req, c)); } return r; }).catch(() => hit);
    return hit || rede;
  }));
});
