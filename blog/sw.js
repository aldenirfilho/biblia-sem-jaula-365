/* Service worker · Mensagens que Importam (site) · ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X */
const VERSAO = "mqi-735715e517";
const NUCLEO = ["./", "assets/site.css?v=8523d8e1", "assets/site.js?v=dd86033b", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
const PAGINAS = ["ancoras/", "biblioteca/", "busca/", "casas/", "codice/", "codice/001-o-rito-sem-a-pratica-e-casca/", "codice/002-uma-vida-um-mundo-inteiro/", "codice/003-forte-e-quem-se-governa/", "codice/004-a-porta-de-volta-fica-aberta/", "codice/005-a-regra-de-ouro-tres-vezes/", "codice/006-fe-que-nao-vira-gesto-nao-chegou/", "codice/007-o-coracao-e-o-que-conta/", "codice/008-o-doente-a-sua-frente/", "codice/009-a-lingua-leme-pequeno-navio-grande/", "codice/010-reconciliar-antes-de-rezar/", "codice/011-o-estrangeiro-e-o-teste/", "codice/012-se-nao-agora-quando/", "codice/013-toda-pessoa-carrega-dignidade/", "codice/014-honrar-quem-nos-trouxe/", "codice/015-rico-e-quem-se-contenta/", "codice/016-depois-do-aperto-vem-a-folga/", "codice/017-justica-sem-torcida/", "codice/018-plante-mesmo-sem-ver-a-sombra/", "codice/019-diferentes-para-se-conhecerem/", "codice/020-responder-ao-mal-com-o-bem/", "codice/021-quem-cuida-da-criacao/", "codice/022-setenta-vezes-sete/", "codice/023-a-mao-esquerda-nao-precisa-saber/", "codice/024-examine-tudo-guarde-o-bom/", "codice/025-nao-julgue-antes-de-estar-no-lugar/", "codice/026-escolhe-a-vida/", "codice/027-ninive-a-cidade-da-segunda-chance/", "codice/028-paz-se-persegue/", "codice/029-balanca-justa/", "codice/030-paciencia-e-forca-em-camera-lenta/", "codice/031-competir-so-no-bem/", "diario/", "estudos/", "estudos/2026-10-24-marcos-2-27-3-5/", "estudos/2026-10-24-rute-1/", "estudos/2026-10-24-rute-2/", "estudos/2026-10-26-rute-3/", "estudos/2026-10-27-livro-de-mormon-s01-portal/", "estudos/2026-10-27-rute-4/", "estudos/2026-10-28-livro-de-mormon-s02-1-nefi-1-2/", "estudos/2026-11-02-1-samuel-1/", "estudos/2026-11-03-1-samuel-3/", "estudos/2026-11-04-alcorao-2-124-129-ibrahim-e-ismail/", "estudos/2026-11-04-kama-sutra-sessao-1/", "estudos/2026-11-04-livro-de-mormon-s03-1-nefi-3-5/", "estudos/2026-11-04-tora-chayei-sara-genesis-23-25/", "estudos/2026-11-05-mp1-vozes-do-oriente/", "estudos/2026-11-08-1-samuel-4-7/", "estudos/2026-11-10-1-nefi-6-9/", "estudos/2026-11-11-alcorao-3-103-14-24-12-92/", "estudos/2026-11-17-1-samuel-8/", "estudos/2026-11-17-alcorao-2-246-251/", "manifesto/", "neurodiversos/", "perguntas/", "realmetaverso/", "universo/", "assets/busca.json"];
const fresco = (u) => new Request(u, { cache: "reload" });   /* na instalação, nada de cópia velha do navegador */
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(NUCLEO.map(fresco)).then(() =>
    /* o resto do site entra aos poucos: se uma página falhar, as outras seguem */
    Promise.all(PAGINAS.map((u) => c.add(fresco(u)).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("mqi-") && k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
function guardar(req, resp) {
  if (resp && resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }
  return resp;
}
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {
    /* páginas: rede primeiro (conteúdo novo), cópia guardada se estiver sem internet */
    e.respondWith(fetch(req).then((r) => guardar(req, r)).catch(() =>
      caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match("./"))));
    return;
  }
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => guardar(req, r))));
  }
});
