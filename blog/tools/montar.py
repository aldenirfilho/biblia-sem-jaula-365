# -*- coding: utf-8 -*-
"""Monta a versão GitHub Pages (app PWA) do blog "Mensagens que Importam" a partir do HTML do artifact.

Uso:  python3 tools/montar.py <html_do_artifact> [pasta_do_repo]

- <html_do_artifact>: o HTML salvo do artifact (com ou sem o esqueleto <!doctype>…<body>).
- Os PDFs anexados ficam em pdfs/<nome>.pdf (baixados do artifact; o nome vem do bloco dados-anexos).
- Gera index.html, manifest.webmanifest e sw.js (a versão do cache muda sozinha a cada montagem).
- Publicado em https://aldenirfilho.github.io/biblia-sem-jaula-365/blog/ (pasta blog/ do repositório do app).
- O domínio aldenirfilho.github.io é compartilhado por todos os sites: o service worker só apaga caches "mqi-*".

ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
"""
import hashlib, html, json, os, re, sys

AUTOR = "ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X"
SITE = "https://aldenirfilho.github.io/biblia-sem-jaula-365/blog/"
DESCRICAO = ("Blog e app de mensagens bíblicas e inter-religiosas: fólio do dia, diário de estudos, PDFs "
             "e a Bíblia Enxuta para Neurodiversos.")

CABECA = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Mensagens que Importam</title>
<meta name="description" content="{desc}">
<meta name="author" content="{autor}">
<meta name="theme-color" content="#24272c">
<meta name="color-scheme" content="dark light">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mensagens">
<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="Mensagens que Importam">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{site}">
<meta property="og:image" content="{site}icons/icon-512.png">
<style>:root{{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}html{{scroll-padding-top:env(safe-area-inset-top,0px)}}body{{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#24272c;color:#eeeae0}}img{{max-width:100%}}[hidden]:not([hidden=until-found i]){{display:none!important}}</style>
</head>
<body>
"""

RODAPE_APP = ('<span class="rodape-app"><button type="button" class="btn btn--mini" id="instalar-app" hidden>📲 Instalar o app</button>'
              '<span id="dica-ios" hidden>📲 No iPhone: Compartilhar → Adicionar à Tela de Início</span></span>')

SCRIPT_APP = """<script>
/* 📲 App (PWA): service worker + botão de instalar. Só na versão GitHub Pages. */
(function () {
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  var bt = document.getElementById("instalar-app"), ios = document.getElementById("dica-ios"), ev = null;
  var instalado = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); ev = e; if (bt && !instalado) bt.hidden = false; });
  if (bt) bt.addEventListener("click", async function () {
    if (!ev) return;
    ev.prompt();
    try { await ev.userChoice; } catch (_) {}
    ev = null; bt.hidden = true;
  });
  window.addEventListener("appinstalled", function () { if (bt) bt.hidden = true; });
  if (ios && !instalado && /iphone|ipad|ipod/i.test(navigator.userAgent)) ios.hidden = false;
})();
</script>
"""

SW = """/* Service worker · Mensagens que Importam · {autor} */
const VERSAO = "mqi-{versao}";
const BASE = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];
self.addEventListener("install", (e) => {{
  e.waitUntil(caches.open(VERSAO).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
}});
self.addEventListener("activate", (e) => {{
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("mqi-") && k !== VERSAO).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
}});
function guardar(req, resp) {{
  if (resp && resp.ok) {{ const copia = resp.clone(); caches.open(VERSAO).then((c) => c.put(req, copia)); }}
  return resp;
}}
self.addEventListener("fetch", (e) => {{
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {{
    e.respondWith(fetch(req).then((r) => guardar("index.html", r)).catch(() => caches.match("index.html")));
    return;
  }}
  if (url.origin === location.origin || url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {{
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => guardar(req, r))));
  }}
}});
"""

MANIFESTO = {
    "name": "Mensagens que Importam",
    "short_name": "Mensagens",
    "description": DESCRICAO,
    "lang": "pt-BR",
    "dir": "ltr",
    "start_url": "./",
    "scope": "./",
    "display": "standalone",
    "orientation": "portrait-primary",
    "background_color": "#24272c",
    "theme_color": "#24272c",
    "categories": ["books", "education", "lifestyle"],
    "icons": [
        {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"},
        {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
        {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
    ],
}


def troca(s, velho, novo, n=1):
    c = s.count(velho)
    assert c == n, f"esperava {n} ocorrência(s) de {velho[:70]!r}, achei {c}"
    return s.replace(velho, novo)


def montar(entrada, repo):
    h = open(entrada, encoding="utf-8").read()
    # tira o esqueleto da publicação do artifact, se vier junto
    if h.lstrip().lower().startswith("<!doctype"):
        i = h.find("<body>")
        assert i > 0, "esqueleto sem <body>"
        h = h[i + len("<body>"):]
        h = re.sub(r"</body>\s*</html>\s*$", "", h)
    h = h.lstrip()
    h = troca(h, "<title>Mensagens que Importam</title>\n", "")
    # PDFs: /_blob/<id> -> pdfs/<nome>
    i = h.find('id="dados-anexos">') + len('id="dados-anexos">')
    j = h.find("</script>", i)
    anexos = json.loads(h[i:j])
    mapa = {a["url"]: "pdfs/" + a["nome"] for a in anexos if a.get("url", "").startswith("/_blob/")}
    for u, novo in mapa.items():
        h = h.replace(u, novo)
    assert "/_blob/" not in h, "sobrou /_blob/ sem nome em dados-anexos"
    # sem o runtime do Claude: link de download comum (atributo download)
    h = troca(h, "'\">⬇️ Baixar</button>' : \"\")",
              "'\">⬇️ Baixar</button>' : '<a class=\"btn\" href=\"' + esc(a.url) + '\" download=\"' + esc(a.nome || \"\") + '\">⬇️ Baixar</a>')")
    # botões "Baixar o PDF" das seções (dependiam do runtime do Claude): viram link comum
    padrao = re.compile(r'(<a class="btn[^"]*" href="(pdfs/[^"]+)" target="_blank" rel="noopener">📖 Abrir o PDF</a>\s*)'
                        r'<button type="button" class="btn" id="[a-z]+-baixar" hidden>⬇️ Baixar o PDF</button>')
    h, n_botoes = padrao.subn(lambda m: m.group(1) + f'<a class="btn" href="{m.group(2)}" download="{os.path.basename(m.group(2))}">⬇️ Baixar o PDF</a>', h)
    assert n_botoes >= 1 and '-baixar" hidden' not in h, f"botões de baixar convertidos: {n_botoes}"
    # rodapé: instalar o app
    k = h.rfind("</footer>")
    assert k > 0
    h = h[:k] + RODAPE_APP + h[k:]
    pagina = CABECA.format(desc=html.escape(DESCRICAO, quote=True), autor=AUTOR, site=SITE) + h.rstrip() + "\n" + SCRIPT_APP + "</body>\n</html>\n"
    open(os.path.join(repo, "index.html"), "w", encoding="utf-8").write(pagina)
    versao = hashlib.sha1(pagina.encode("utf-8")).hexdigest()[:10]
    open(os.path.join(repo, "sw.js"), "w", encoding="utf-8").write(SW.format(autor=AUTOR, versao=versao))
    with open(os.path.join(repo, "manifest.webmanifest"), "w", encoding="utf-8") as f:
        json.dump(MANIFESTO, f, ensure_ascii=False, indent=2)
        f.write("\n")
    faltam = [p for p in set(mapa.values()) if not os.path.isfile(os.path.join(repo, p))]
    print(f"index.html {len(pagina):,} bytes · PDFs ligados {len(mapa)} · faltando {len(faltam)} · cache mqi-{versao}")
    for p in sorted(faltam):
        print("  FALTA:", p)
    return not faltam


if __name__ == "__main__":
    ok = montar(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.exit(0 if ok else 1)
