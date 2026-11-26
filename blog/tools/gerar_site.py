#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera o SITE do blog "Mensagens que Importam" (várias páginas, GitHub Pages) a partir do HTML do artifact.

Uso:  python3 tools/gerar_site.py <html_do_artifact> [pasta_do_site]

- <html_do_artifact>: o HTML salvo do artifact (com ou sem o esqueleto <!doctype>…<body>). É a fonte única:
  os fólios (dados-codice), o diário (dados-diario), os estudos (dados-posts), os cards e os PDFs (dados-anexos)
  e o texto das seções saem todos dele.
- [pasta_do_site]: padrão, a pasta blog/ deste repositório. Os PDFs ficam em pdfs/<nome>.pdf (baixados do artifact).
- Gera: início, códice (uma página por fólio), estudos (uma página por estudo), diário, biblioteca, âncoras,
  neurodiversos, realmetaverso, manifesto, casas, perguntas, universo 360X, busca, sitemap.xml, feed.xml,
  manifest.webmanifest e sw.js (a versão do cache muda sozinha a cada geração).
- A página inicial mantém os blocos <script id="dados-codice"> e <script id="dados-diario">: o Códice Vivo do
  Realmetaverso lê os dois ao vivo (Mesa das Mensagens). As âncoras antigas (#diario, #realmetaverso, #f12…)
  continuam valendo: a página inicial leva cada uma para a página nova.
- O domínio aldenirfilho.github.io é compartilhado por todos os sites: o service worker só apaga caches "mqi-*".

ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
"""
import base64, datetime, hashlib, html, json, math, os, re, shutil, sys, unicodedata
from urllib.parse import quote

AUTOR = "ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X"
AUTOR_NOME = "Aldenir Rocha de Oliveira Filho"
NOME = "Mensagens que Importam"
SITE = os.environ.get("MQI_SITE", "https://aldenirfilho.github.io/biblia-sem-jaula-365/blog/")
DESCRICAO = ("Três tradições, uma ideia por dia: fólios com judaísmo, cristianismo e islã lado a lado, estudos com "
             "questões e gabarito, diário de mensagens, PDFs e a Bíblia Enxuta para Neurodiversos.")
AQUI = os.path.dirname(os.path.abspath(__file__))
# pastas e arquivos que este gerador cria (e pode apagar antes de gerar de novo). Nunca: pdfs/, icons/, tools/.
PASTAS_GERADAS = ["codice", "estudos", "diario", "biblioteca", "ancoras", "neurodiversos", "realmetaverso",
                  "manifesto", "casas", "perguntas", "universo", "busca", "img"]
ARQUIVOS_GERADOS = ["index.html", "sw.js", "manifest.webmanifest", "sitemap.xml", "feed.xml",
                    "assets/site.css", "assets/site.js", "assets/busca.json"]

PILARES = {
    "ideia": ("💡", "A ideia"), "mensagem": ("📜", "A mensagem"), "projecao": ("📡", "A projeção"),
    "autocontrole": ("🧭", "O autocontrole"), "vida": ("🌱", "A vida"), "redencao": ("🔁", "A redenção"),
}
ORDEM_PILARES = ["ideia", "mensagem", "projecao", "autocontrole", "vida", "redencao"]
VOZES = {"j": ("✡️", "Judaísmo"), "c": ("✝️", "Cristianismo"), "i": ("☪️", "Islã")}
DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

MENU = [
    ("", "☀️ Início"), ("codice/", "📚 Códice"), ("estudos/", "📖 Estudos"), ("diario/", "🗓️ Diário"),
    ("biblioteca/", "📎 Biblioteca"), ("ancoras/", "⚓ Âncoras"), ("neurodiversos/", "♾️ Neurodiversos"),
    ("realmetaverso/", "🔮 Realmetaverso"), ("manifesto/", "📜 Manifesto"), ("casas/", "🏰 Casas + vozes"),
    ("perguntas/", "❓ Perguntas"), ("universo/", "🔗 360X"), ("busca/", "🔎 Busca"),
]
# âncoras do blog de página única -> página nova (a página inicial redireciona)
ANCORAS = {
    "app365": "universo/#app365", "neurodiversos": "neurodiversos/", "realmetaverso": "realmetaverso/",
    "comoler": "manifesto/#comoler", "manifesto": "manifesto/", "casas": "casas/", "oriente": "casas/#oriente",
    "pilares": "codice/#pilares", "codice": "codice/", "ancoras": "ancoras/", "diario": "diario/",
    "astrolabio": "manifesto/#astrolabio", "perguntas": "perguntas/", "glossario": "perguntas/#glossario",
    "conexoes": "universo/",
}

BASE_CSS = (":root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);"
            "padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;padding:0;font:14px -apple-system,"
            "BlinkMacSystemFont,sans-serif;background:#24272c;color:#eeeae0}img{max-width:100%}"
            "[hidden]:not([hidden=until-found i]){display:none!important}")


# ---------- utilidades ----------
def esc(s):
    return html.escape(str(s), quote=True)


def rico(s):
    t = esc(s)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    return re.sub(r"==(.+?)==", r"<mark>\1</mark>", t)


def puro(s):
    return re.sub(r"\*\*|==", "", str(s))


def norm(s):
    t = unicodedata.normalize("NFD", puro(s).lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def slug(s, limite=64):
    t = re.sub(r"[^a-z0-9]+", "-", norm(s)).strip("-")
    return t[:limite].strip("-") or "pagina"


def num3(n):
    return str(n).zfill(3)


def _d(iso):
    return datetime.date.fromisoformat(iso)


def data_curta(iso):
    a, m, d = iso.split("-")
    return f"{d}.{m}.{a}"


def data_dia(iso):
    return DIAS[_d(iso).weekday()] + " " + data_curta(iso)


def ddmm(iso):
    a, m, d = iso.split("-")
    return f"{d}/{m}"


def resumo(s, n=155):
    t = " ".join(puro(s).split())
    if len(t) <= n:
        return t
    c = t[:n].rsplit(" ", 1)[0].rstrip(",;:·")
    return c + "…"


def troca(s, velho, novo, n=1):
    c = s.count(velho)
    assert c == n, f"esperava {n} ocorrência(s) de {velho[:70]!r}, achei {c}"
    return s.replace(velho, novo)


def preencher(s, ident, conteudo):
    """Põe conteúdo dentro do elemento vazio que tem id=ident."""
    padrao = re.compile(r'(<(\w+)\b[^>]*\bid="' + re.escape(ident) + r'"[^>]*>)\s*(</\2>)')
    achados = padrao.findall(s)
    assert len(achados) == 1, f"elemento vazio #{ident}: achei {len(achados)}"
    return padrao.sub(lambda m: m.group(1) + conteudo + m.group(3), s)


def h2_para_h1(s):
    i = s.index("<h2")
    j = s.index("</h2>", i)
    return s[:i] + "<h1" + s[i + 3:j] + "</h1>" + s[j + 5:]


def tamanho(caminho):
    b = os.path.getsize(caminho)
    return f"{b / 1048576:.1f} MB".replace(".", ",") if b >= 1048576 else f"{round(b / 1024)} KB"


def json_script(ident, obj):
    """Bloco JSON seguro dentro de <script> (não deixa fechar a tag por dentro)."""
    return ('<script type="application/json" id="' + ident + '">' +
            json.dumps(obj, ensure_ascii=False).replace("</", "<\\/") + "</script>")


def alias_css(css, pares):
    """Para cada regra com o seletor A, acrescenta o mesmo seletor com B (ex.: '.tira button' -> '.tira a')."""
    def um(m):
        sel = m.group(1)
        if sel.lstrip().startswith("@") or "{" in sel:
            return m.group(0)
        extra = []
        for parte in sel.split(","):
            for a, b in pares:
                if a in parte:
                    extra.append(parte.replace(a, b))
        return (sel.rstrip() + ", " + ", ".join(x.strip() for x in extra) + " {") if extra else m.group(0)
    return re.sub(r"([^{}]+)\{", um, css)


# ---------- leitura da fonte ----------
class Fonte:
    def __init__(self, caminho):
        h = open(caminho, encoding="utf-8").read()
        if h.lstrip().lower().startswith("<!doctype"):          # esqueleto da publicação do artifact
            i = h.find("<body>")
            assert i > 0, "esqueleto sem <body>"
            h = re.sub(r"</body>\s*</html>\s*$", "", h[i + 6:])
        h = h.lstrip()
        assert h.startswith("<title>Mensagens que Importam</title>"), "não parece o HTML do blog"
        self.fontes = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com/[^"]+)">', h).group(1)
        self.css = re.search(r"<style>(.*?)</style>", h, re.S).group(1)
        self.bruto = {m.group(1): m.group(2) for m in
                      re.finditer(r'<script type="application/json" id="([^"]+)">(.*?)</script>', h, re.S)}
        self.dados = {k: json.loads(v) for k, v in self.bruto.items()}
        corpo = re.sub(r"<script\b.*?</script>", "", h[h.index("</style>") + 8:], flags=re.S)
        self.barra = re.search(r'<div class="missao-barra".*?</div>', corpo, re.S).group(0)
        self.hero = re.search(r'<header class="hero">.*?</header>', corpo, re.S).group(0)
        self.emblema = re.search(r'<svg class="astro".*?</svg>', corpo, re.S).group(0)
        ini = [(m.start(), m.group(1)) for m in re.finditer(r'<section\b[^>]*\bid="([^"]+)"', corpo)]
        fim = corpo.index("</main>")
        self.secoes = {}
        for k, (pos, ident) in enumerate(ini):
            s = corpo[pos:(ini[k + 1][0] if k + 1 < len(ini) else fim)].rstrip()
            assert s.endswith("</section>") and s.count("<section") == s.count("</section>") == 1, f"seção {ident} fora do molde"
            self.secoes[ident] = s
        self.blobs = {a["url"]: a["nome"] for a in self.dados["dados-anexos"] if str(a.get("url", "")).startswith("/_blob/")}


class Site:
    def __init__(self, fonte, destino):
        self.f, self.dest = fonte, destino
        d = fonte.dados
        self.codice = d["dados-codice"]
        self.diario = d["dados-diario"]
        self.posts = {k: v for k, v in d["dados-posts"].items() if k != "_fim"}
        self.cards = [c for c in d["dados-cards"] if isinstance(c, dict) and "src" in c]
        self.anexos = [a for a in d["dados-anexos"] if isinstance(a, dict) and "nome" in a]
        self.ord = sorted(self.codice, key=lambda e: (e["data"], e["n"]))
        for e in self.ord:
            e["_cam"] = f"codice/{num3(e['n'])}-{slug(e['titulo'], 56)}/"
        # diário, do mais novo ao mais antigo (empate: a linha escrita por último vem primeiro)
        self.diario_ord = [x for _, x in sorted(enumerate(self.diario), key=lambda p: (p[1]["d"], p[0]), reverse=True)]
        self.estudos = []
        for chave, p in self.posts.items():
            dia, ref = chave.split("|", 1)
            linha = next((x for x in self.diario if x["d"] == dia and x["ref"] == ref), None)
            assert linha, f"estudo sem linha no diário: {chave}"
            self.estudos.append({"d": dia, "ref": ref, "p": p, "tema": linha["tema"], "ancora": linha.get("ancora", ""),
                                 "cam": f"estudos/{dia}-{slug(ref, 56)}/", "ordem": self.diario.index(linha)})
        self.estudos.sort(key=lambda e: (e["d"], e["ordem"]), reverse=True)
        assert len({e["cam"] for e in self.estudos}) == len(self.estudos) and len({e["_cam"] for e in self.ord}) == len(self.ord)
        self.estudo_de = {(e["d"], e["ref"]): e for e in self.estudos}
        self.paginas = []       # (caminho, título, descrição, data de modificação)
        self.busca = []
        self.hoje = datetime.date.today().isoformat()
        self.ultima = max([x["d"] for x in self.diario] + [e["data"] for e in self.ord])

    # ----- arquivos -----
    def gravar(self, rel, texto):
        alvo = os.path.join(self.dest, rel)
        os.makedirs(os.path.dirname(alvo) or ".", exist_ok=True)
        with open(alvo, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(texto)

    def limpar(self):
        for p in PASTAS_GERADAS:
            shutil.rmtree(os.path.join(self.dest, p), ignore_errors=True)
        for a in ARQUIVOS_GERADOS:
            try:
                os.remove(os.path.join(self.dest, a))
            except FileNotFoundError:
                pass

    # ----- moldura -----
    def emblema(self, decorativo=True):
        s = self.f.emblema
        return re.sub(r'role="img" aria-label="[^"]*"', 'aria-hidden="true"', s) if decorativo else s

    def menu(self, R, ativo):
        return "".join(f'<a href="{(R + cam) or "./"}"' + (' aria-current="page"' if cam == ativo else "") + f">{rot}</a>\n    "
                       for cam, rot in MENU)

    def rodape(self, R):
        return ('<footer class="rodape tec"><span>✠ Mensagens que Importam</span><span>🛰️ Do scriptorium à órbita</span>'
                '<span>📅 Um fólio em destaque por dia</span>'
                '<span>🔗 <a href="https://aldenirfilho.github.io/aldenirmed89/" target="_blank" rel="noopener">AldenirMed 360X</a> · '
                '<a href="https://aldenirfilho.github.io/intensivahub/flashcards/" target="_blank" rel="noopener">Códice 360X</a> · '
                '<a href="https://aldenirfilho.github.io/realmetaverso/" target="_blank" rel="noopener">Realmetaverso</a></span>'
                f'<span>🗺️ <a href="{R}busca/">Busca</a> · <a href="{R}sitemap.xml">Mapa do site</a> · <a href="{R}feed.xml">Feed dos estudos</a></span>'
                '<span class="rodape-app"><button type="button" class="btn btn--mini" id="instalar-app" hidden>📲 Instalar o app</button>'
                '<span id="dica-ios" hidden>📲 No iPhone: Compartilhar → Adicionar à Tela de Início</span></span>'
                f'<span class="rodape-autor">{AUTOR}</span></footer>')

    def pagina(self, cam, titulo, desc, corpo, ativo, migalhas=None, topo=None, tipo="website", cabeca="", ld=None,
               data=None, na_busca=None):
        R = "../" * cam.count("/")
        titulo_pag = NOME if not cam else f"{titulo} · {NOME}"
        url = SITE + cam
        lds = [ld] if isinstance(ld, dict) else (ld or [])
        if migalhas is not None:
            lds.append({"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
                {"@type": "ListItem", "position": i + 1, "name": puro(n), "item": SITE + c}
                for i, (c, n) in enumerate([("", "Início")] + migalhas + [(cam, titulo)])]})
        ld_html = "".join('<script type="application/ld+json">' + json.dumps(x, ensure_ascii=False).replace("</", "<\\/") + "</script>\n" for x in lds)
        mig = ""
        if migalhas is not None:
            mig = ('<nav class="migalhas" aria-label="Você está aqui"><a href="' + (R or "./") + '">Início</a>' +
                   "".join(f'<span aria-hidden="true">›</span><a href="{R}{c}">{esc(n)}</a>' for c, n in migalhas) +
                   f'<span aria-hidden="true">›</span><span aria-current="page">{esc(titulo)}</span></nav>\n    ')
        if topo is None:
            topo = ('<header class="topo"><a class="marca" href="' + (R or "./") + '" aria-label="Mensagens que Importam: página inicial">' +
                    self.emblema() + '<span class="marca-nome">Mensagens<br>que importam</span></a>'
                    '<p class="tec topo-tag">✡️ ✝️ ☪️ · Três tradições, uma ideia por dia</p></header>')
        doc = f"""<!doctype html>
<html lang="pt-BR" data-raiz="{R}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(titulo_pag)}</title>
<meta name="description" content="{esc(desc)}">
<meta name="author" content="{AUTOR}">
<meta name="theme-color" content="#24272c">
<meta name="color-scheme" content="dark light">
<link rel="canonical" href="{url}">
<link rel="manifest" href="{R}manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="{R}icons/icon-192.png">
<link rel="apple-touch-icon" href="{R}icons/apple-touch-icon.png">
<link rel="alternate" type="application/atom+xml" title="{NOME} · estudos" href="{R}feed.xml">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mensagens">
<meta property="og:site_name" content="{NOME}">
<meta property="og:type" content="{tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:title" content="{esc(titulo if cam else NOME)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}assets/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Mensagens que Importam: três tradições, uma ideia por dia">
<meta name="twitter:card" content="summary_large_image">
<style>{BASE_CSS}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{esc(self.f.fontes)}">
<link rel="stylesheet" href="{R}assets/site.css?v={self.v_css}">
{cabeca}<script>document.documentElement.classList.add("js")</script>
{ld_html}</head>
<body>
<a class="btn pular" href="#conteudo">Pular para o conteúdo</a>
<div class="pagina{"" if not cam else " pagina--interna"}" id="pagina">
  {self.f.barra}
  {topo}
  <nav class="trilho" id="trilho" aria-label="Páginas do site">
    {self.menu(R, ativo)}</nav>
  <div class="progresso" aria-hidden="true"><span></span></div>
  <main id="conteudo">
    {mig}{corpo}
  </main>
  {self.rodape(R)}
</div>
<script src="{R}assets/site.js?v={self.v_js}" defer></script>
</body>
</html>
"""
        self.gravar(cam + "index.html", doc)
        self.paginas.append((cam, titulo, desc, data or self.ultima))
        if na_busca:
            self.busca.append(dict(na_busca, u=cam))
        return doc

    # ----- peças -----
    def secao(self, ident, R, h1=False):
        s = self.f.secoes[ident]
        for u, nome in self.f.blobs.items():
            s = s.replace(u, R + "pdfs/" + quote(nome))
        assert "/_blob/" not in s, f"sobrou /_blob/ na seção {ident}"
        # botões "Baixar o PDF" dependiam do runtime do Claude: viram link comum
        s = re.sub(r'(<a class="btn[^"]*" href="((?:\.\./)*pdfs/([^"]+))" target="_blank" rel="noopener">📖 Abrir o PDF</a>\s*)'
                   r'<button type="button" class="btn" id="[a-z]+-baixar" hidden>⬇️ Baixar o PDF</button>',
                   lambda m: m.group(1) + f'<a class="btn" href="{m.group(2)}" download="{m.group(3)}">⬇️ Baixar o PDF</a>', s)
        assert '-baixar" hidden' not in s
        return h2_para_h1(s) if h1 else s

    def cab(self, rom, meio, mod, titulo, sub="", nivel="h1", ident=""):
        return ('<div class="sec-cab">\n        <p class="tec capitulo"><span class="rom">✠ ' + rom + "</span><span>" + meio +
                '</span><span class="mod">' + mod + "</span></p>\n        <" + nivel + (f' id="{ident}"' if ident else "") + ">" + titulo + "</" + nivel +
                '>\n        <span class="sec-linha" aria-hidden="true"></span>' +
                (f'\n        <p class="sec-sub">{sub}</p>' if sub else "") + "\n      </div>")

    def ancoras(self):
        lista = [{"t": e["ancora"], "o": f"📜 Fólio {num3(e['n'])} · {e['titulo']}"} for e in reversed(self.ord)]
        lista += [{"t": x["ancora"], "o": f"📖 {x['ref']} · {ddmm(x['d'])}"} for x in self.diario_ord if x.get("ancora")]
        return lista

    def fita(self):
        a = self.ancoras()
        meia = "".join(f'<span class="fita-item">⚓ {esc(x["t"])}</span><span class="fita-sep">✦</span>' for x in a)
        return (f'<div class="fita" aria-label="Âncoras em movimento"><div class="fita-trilho" id="fita" style="--dur:{max(40, len(a) * 6)}s">'
                f'{meia}<span aria-hidden="true">{meia}</span></div></div>')

    def anexos_html(self, itens, R):
        linhas = []
        for a in sorted(itens, key=lambda x: x["d"], reverse=True):
            arq = os.path.join(self.dest, "pdfs", a["nome"])
            tam = tamanho(arq) if os.path.isfile(arq) else ""
            href = R + "pdfs/" + quote(a["nome"])
            linhas.append('<li class="danexo"><span class="danexo-ico" aria-hidden="true">📄</span><div class="danexo-txt"><strong>' + esc(a["titulo"]) +
                          "</strong> · " + data_curta(a["d"]) + '<span class="danexo-leg">' + esc(a["legenda"]) + "</span>"
                          f'<div class="danexo-acoes"><a class="btn" href="{href}" target="_blank" rel="noopener">📖 Abrir o PDF</a>'
                          f'<a class="btn" href="{href}" download="{esc(a["nome"])}">⬇️ Baixar' + (f" · {tam}" if tam else "") + "</a></div></div></li>")
        return '<ul class="danexos">' + "".join(linhas) + "</ul>"

    def cards_html(self, R):
        if not self.cards:
            return ""
        figs = []
        for c in sorted(self.cards, key=lambda x: x["d"], reverse=True):
            m = re.match(r"data:image/(jpeg|png|webp);base64,(.+)$", c["src"], re.S)
            assert m, "card sem imagem embutida"
            nome = f"img/card-{c['d']}-{slug(c['ref'])}.{'jpg' if m.group(1) == 'jpeg' else m.group(1)}"
            alvo = os.path.join(self.dest, nome)
            os.makedirs(os.path.dirname(alvo), exist_ok=True)
            with open(alvo, "wb") as fh:
                fh.write(base64.b64decode(m.group(2)))
            figs.append('<figure class="dcard"><button type="button" class="dcard-b" aria-expanded="false" aria-label="Ampliar o card: ' + esc(c["titulo"]) + '">'
                        f'<img src="{R}{nome}" alt="{esc(c["alt"])}" width="1080" height="1350" loading="lazy"></button>'
                        "<figcaption><strong>" + esc(c["ref"]) + "</strong> · " + data_curta(c["d"]) + "<br>" + esc(c["legenda"]) + "</figcaption></figure>")
        return '<h3 class="sub">🖼️ Cards dos estudos</h3><div class="dcards">' + "".join(figs) + "</div>"

    def linha_diario(self, x, R, k=None):
        est = self.estudo_de.get((x["d"], x["ref"]))
        ler = (f'<a class="btn btn--mini d-ler" href="{R}{est["cam"]}">📖 Ler o estudo · {esc(est["p"].get("tipo") or "Estudo")}</a>' if est else "")
        return ('<li class="dlinha"' + (f' id="d-{k}"' if k is not None else "") + f' data-x="{esc(norm(" ".join([x["d"], data_curta(x["d"]), x["ref"], x["tema"], x.get("ancora", "")])))}">'
                '<span class="d-data">🗓️ ' + data_curta(x["d"]) + '</span><span class="d-ref">📖 ' + esc(x["ref"]) + '</span><span class="d-tema">' + esc(x["tema"]) +
                (f'<span class="d-ancora">⚓ {esc(x["ancora"])}</span>' if x.get("ancora") else "") + "</span>" + ler + "</li>")

    def linha_estudo(self, e, R):
        p = e["p"]
        nq = len(p.get("questoes") or [])
        return (f'<li><a class="linha" href="{R}{e["cam"]}"><span class="linha-meta">🗓️ {data_curta(e["d"])}</span>'
                '<span class="linha-corpo"><span class="linha-titulo">📖 ' + esc(e["ref"]) + '</span><span class="linha-gancho">' + esc(e["tema"]) + "</span>" +
                '<span class="linha-refs">' + esc(p.get("tipo") or "Estudo") + (f" · ✅ {nq} questões com gabarito" if nq else "") +
                (f" · 🤓 {len(p['curiosidades'])} curiosidades" if p.get("curiosidades") else "") + "</span></span>"
                '<span class="linha-pilar">Ler →</span></a></li>')

    # ----- fólio -----
    def folio_html(self, e, R, k):
        pe, pn = PILARES[e["pilar"]]
        vozes = ""
        for v in e["vozes"]:
            em, nome = VOZES[v["t"]]
            vozes += ('<article class="voz"><header class="voz-cab"><span class="tec voz-nome">' + em + " " + nome + '</span><span class="tec voz-fonte">' + esc(v["fonte"]) +
                      "</span></header><blockquote>" + rico(v["texto"]) + '</blockquote><p class="chip chip--ouro voz-ref">📍 ' + esc(v["ref"]) + "</p></article>")
        quarta = ""
        q = e.get("sud")
        if q:
            quarta = ('<article class="voz voz--quarta"><header class="voz-cab"><span class="tec voz-nome">📘 4ª voz · Livro de Mórmon</span><span class="tec voz-fonte">' + esc(q["fonte"]) +
                      "</span></header><blockquote>" + rico(q["texto"]) + "</blockquote>" + (f'<p class="voz-nota">{rico(q["nota"])}</p>' if q.get("nota") else "") +
                      '<p class="chip chip--ouro voz-ref">📍 ' + esc(q["ref"]) + "</p></article>")
        m = re.match(r"^(.*\S)\s*\((\d[^)]*)\)\.?\s*$", e["acao"])
        acao, dur = (e["acao"], "")
        if m:
            acao, dur = m.group(1), m.group(2)
            if not re.search(r'[.?!”"]$', acao):
                acao += "."
        ant = self.ord[k - 1] if k > 0 else None
        prox = self.ord[k + 1] if k + 1 < len(self.ord) else None
        nav = ((f'<a class="btn" href="{R}{ant["_cam"]}" rel="prev">⬅️ Anterior</a>' if ant else "") +
               (f'<a class="btn" href="{R}{prox["_cam"]}" rel="next">Próximo ➡️</a>' if prox else "") +
               f'<a class="btn" href="{R}codice/">📚 Códice</a>')
        return (f'<article class="painel folio" id="folio" data-n="{e["n"]}" data-url="{SITE}{e["_cam"]}">'
                f'<span class="hud-alvo" aria-hidden="true">◎ alvo travado · fólio {num3(e["n"])} · {str(round(e["n"] * 11.6, 1))[:5]}°</span>'
                f'<div class="chips"><span class="chip chip--ouro">📜 Fólio {num3(e["n"])}</span><span class="chip" id="data-folio">🗓️ {data_dia(e["data"])}</span>'
                f'<span class="chip chip--ciano">{pe} {pn}</span><span class="chip chip--ciano" id="selo-folio">📖 Do arquivo</span></div>'
                f'<div class="folio-topo"><span class="folio-num" aria-hidden="true">{num3(e["n"])}</span><div class="folio-cab">'
                f'<h1 class="folio-titulo">{esc(e.get("emoji") or "")} {esc(e["titulo"])}</h1><p class="gancho">{esc(e["gancho"])}</p></div></div>'
                '<div class="controle" data-js hidden><button type="button" class="btn" id="btn-rotulo" aria-pressed="false">🙈 Ler sem rótulo</button>'
                '<span class="dica">👀 Esconda os nomes e leia as três vozes sem saber de onde vêm.</span></div>'
                f'<div class="vozes">{vozes}</div>{quarta}'
                f'<p class="ancora"><span class="ancora-emoji">⚓</span><span class="ancora-texto">{esc(e["ancora"])}</span></p>'
                '<div class="sintese"><div class="coluna">'
                f'<div class="bloco ideia"><h2>💡 A ideia</h2><p class="capitular">{rico(e["ideia"])}</p></div>'
                f'<div class="bloco glosa"><h2>🤓 Glosa de margem</h2><p>{esc(e["nerd"])}</p></div></div><div class="coluna">'
                f'<div class="bloco missao"><h2>📡 Missão de hoje</h2><p>{esc(acao)}</p>' +
                (f'<div class="chips"><span class="chip chip--ouro">⏱️ {esc(dur)}</span></div>' if dur else "") +
                '<label class="feito" for="feito" data-js hidden><input type="checkbox" id="feito"> ✅ Missão cumprida</label></div></div></div>'
                '<div class="acoes"><button type="button" class="btn btn--ouro" id="btn-zap" data-js hidden>📲 Copiar para WhatsApp</button>'
                '<button type="button" class="btn" id="btn-puro" data-js hidden>📋 Copiar texto puro</button>'
                '<button type="button" class="btn" data-copiar-link data-js hidden>🔗 Copiar o link</button>'
                '<span class="aviso" id="aviso" role="status" aria-live="polite"></span>'
                f'<span class="acoes-nav">{nav}</span></div>'
                '<textarea id="copia-manual" class="copia-manual" rows="8" readonly hidden aria-label="Texto para copiar"></textarea></article>')

    def pag_folios(self):
        N = len(self.ord)
        for k, e in enumerate(self.ord):
            cam, R = e["_cam"], "../../"
            pe, pn = PILARES[e["pilar"]]
            limpo = {c: v for c, v in e.items() if not c.startswith("_")}
            corpo = (f'<section class="sec" aria-label="Fólio {num3(e["n"])}">\n      <div class="sec-cab">\n        <p class="tec capitulo">'
                     f'<span class="rom">✠ Códice</span><span>📜 Fólio {num3(e["n"])} de {num3(N)}</span><span class="mod">{pe} {pn}</span></p>\n        '
                     '<span class="sec-linha" aria-hidden="true"></span>\n      </div>\n      ' + self.folio_html(e, R, k) + "\n    </section>\n    " + json_script("dados-folio", limpo))
            refs = " / ".join(v["ref"] for v in e["vozes"])
            ld = {"@context": "https://schema.org", "@type": "Article", "headline": e["titulo"], "description": e["gancho"], "inLanguage": "pt-BR",
                  "datePublished": e["data"], "author": {"@type": "Person", "name": AUTOR_NOME}, "isPartOf": {"@type": "Blog", "name": NOME, "url": SITE},
                  "mainEntityOfPage": SITE + cam}
            self.pagina(cam, f"Fólio {num3(e['n'])} · {e['titulo']}", resumo(f"{e['gancho']} {refs}."), corpo, "codice/",
                        migalhas=[("codice/", "Códice")], tipo="article", ld=ld, data=e["data"],
                        na_busca={"k": f"📜 Fólio {num3(e['n'])}", "t": f"{e.get('emoji', '')} {e['titulo']}".strip(), "s": e["gancho"], "d": f"{pe} {pn}",
                                  "x": norm(" ".join([e["titulo"], e["gancho"], e["ideia"], e["acao"], e["ancora"], e["nerd"]] +
                                                     [v["ref"] + " " + v["fonte"] + " " + v["texto"] for v in e["vozes"]] +
                                                     ([e["sud"]["ref"] + " " + e["sud"]["texto"]] if e.get("sud") else [])))})

    # ----- códice -----
    def orbita(self, R):
        cx, cy, rx, ry, N = 450, 190, 390, 145, len(self.ord)

        def pos(i):
            a = -math.pi / 2 + (i / N) * math.pi * 2
            return round(cx + rx * math.cos(a), 2), round(cy + ry * math.sin(a), 2)
        x0, y0 = pos(0)
        fx, fy = pos(N - 1)
        h = (f'<ellipse class="trajeto" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/><path class="trajeto-feito" d="M{x0} {y0} A{rx} {ry} 0 1 1 {fx} {fy}"/>'
             f'<circle class="nucleo" cx="{cx}" cy="{cy}" r="58"/><text class="nucleo-t" x="{cx}" y="{cy - 4}">✡ ✝ ☪</text>'
             f'<text class="nucleo-s" x="{cx}" y="{cy + 18}">{N}/{N} ABERTOS</text>')
        for i, e in enumerate(self.ord):
            x, y = pos(i)
            ty = y - 15 if y < cy else y + 22
            h += (f'<a href="{R}{e["_cam"]}"><circle class="pt aberto" data-n="{e["n"]}" cx="{x}" cy="{y}" r="7"><title>' + esc(f"Fólio {e['n']}: {e['titulo']}") +
                  f'</title></circle><text class="pt-n aberto" x="{x}" y="{ty}">{e["n"]}</text></a>')
        return h

    def pag_codice(self):
        R, N = "../", len(self.ord)
        s = self.secao("codice", R, h1=True)
        s = s.replace('role="img" aria-label="Trajetória dos 31 fólios"', f'role="group" aria-label="Trajetória dos {N} fólios: cada ponto abre um fólio"')
        s = preencher(s, "orbita", self.orbita(R))
        s = re.sub(r'<p class="sec-sub">.*?</p>', f'<p class="sec-sub">🗝️ Os <strong>{N} fólios</strong> estão abertos. Toque num ponto da órbita, num quadrado ou numa linha para ler. '
                   'O destaque muda todo dia, em releitura.</p>', s, count=1, flags=re.S)
        s = preencher(s, "tira", "".join(f'<li><a class="aberto" href="{R}{e["_cam"]}" data-n="{e["n"]}" title="' + esc(f"Fólio {e['n']}: {e['titulo']}") +
                                         '" aria-label="' + esc(f"Fólio {e['n']}: {e['titulo']}") + f'">{e["n"]}</a></li>' for e in self.ord))
        s = preencher(s, "status-codice", f"🔁 Os {N} fólios estão abertos. O destaque muda todo dia, em releitura. ✅ Faixa ciano: missão cumprida.")
        s = troca(s, '<div class="filtros" id="filtros" role="group"', '<div class="filtros" id="filtros" hidden role="group"')
        linhas = ""
        for e in reversed(self.ord):
            pe, pn = PILARES[e["pilar"]]
            texto = norm(" ".join([e["titulo"], e["gancho"], e["ideia"], e["acao"], e["ancora"], e["nerd"]] + [v["ref"] + " " + v["texto"] for v in e["vozes"]] +
                                  ([e["sud"]["ref"] + " " + e["sud"]["texto"]] if e.get("sud") else [])))
            refs = "  /  ".join([v["ref"] for v in e["vozes"]] + (["📘 " + e["sud"]["ref"]] if e.get("sud") else []))
            linhas += (f'<li data-pilar="{e["pilar"]}" data-x="{esc(texto)}"><a class="linha" href="{R}{e["_cam"]}"><span class="linha-meta">Fólio {num3(e["n"])} · {ddmm(e["data"])}</span>'
                       '<span class="linha-corpo"><span class="linha-titulo">' + esc(e.get("emoji") or "") + " " + esc(e["titulo"]) + '</span><span class="linha-gancho">' + esc(e["gancho"]) +
                       '</span><span class="linha-refs">📍 ' + esc(refs) + f'</span></span><span class="linha-pilar">{pe} {pn}</span></a></li>')
        s = preencher(s, "lista-codice", f'<h2 class="sub">📖 Os {N} fólios · do mais novo ao mais antigo<span id="conta-codice"></span></h2><ul class="lista">{linhas}</ul>'
                      '<p class="vazio" id="vazio-codice" hidden>🔎 Nenhum fólio com esse filtro. Limpe a busca ou escolha outro pilar.</p>')
        # pilares (barras): na mesma página, filtram a lista
        p = self.secao("pilares", R)
        maior = max(sum(1 for e in self.ord if e["pilar"] == k) for k in ORDEM_PILARES) or 1
        barras = ""
        for k in ORDEM_PILARES:
            pe, pn = PILARES[k]
            t = sum(1 for e in self.ord if e["pilar"] == k)
            barras += (f'<li><a class="barra" href="#filtros" data-f="{k}" aria-label="Filtrar o códice por {esc(pn)}"><span class="barra-rot">{pe} {pn}</span>'
                       f'<span class="barra-trilho"><span class="barra-total" style="width:{t / maior * 100:.2f}%"><span class="barra-aberta" style="width:100.00%"></span></span></span>'
                       f'<span class="barra-val">{t} {"fólio" if t == 1 else "fólios"} · {t} {"aberto" if t == 1 else "abertos"}</span></a></li>')
        p = preencher(p, "barras", barras)
        p = re.sub(r'<p class="sec-sub">.*?</p>', '<p class="sec-sub">🎯 Quantos fólios sustentam cada pilar. Toque numa barra para filtrar a lista do códice.</p>', p, count=1, flags=re.S)
        self.pagina("codice/", "Códice · todos os fólios", f"Os {N} fólios do blog: em cada um, judaísmo, cristianismo e islã dizem a mesma ideia com palavras diferentes. "
                    "Com filtro por pilar e busca.", s + "\n\n    " + p, "codice/", migalhas=[],
                    na_busca={"k": "📚 Página", "t": "Códice · todos os fólios", "s": f"Os {N} fólios, com filtro por pilar e busca.", "d": "", "x": norm("codice folios pilares orbita")})

    # ----- estudos -----
    def estudo_corpo(self, p):
        h = "".join("<p>" + rico(t) + "</p>" for t in p.get("leitura") or [])
        qs = p.get("questoes") or []
        if qs:
            h += f'<h2 class="dpost-sub">✅ {len(qs)} questões</h2><ol class="dq">'
            for q in qs:
                h += ('<li><p class="dq-q">' + rico(q["q"]) + '</p><ul class="dq-o">' +
                      "".join('<li><span class="dq-l">' + "abcd"[i] + ")</span> " + rico(o) + "</li>" for i, o in enumerate(q["o"])) + "</ul>"
                      '<details class="dq-r"><summary>🔑 Gabarito</summary><p><strong>' + "abcd"[q["r"]] + "</strong> · " + rico(q["c"]) + "</p></details></li>")
            h += "</ol>"
        if p.get("curiosidades"):
            h += '<h2 class="dpost-sub">🤓 Curiosidades</h2><ul class="dpost-cur">' + "".join("<li>" + rico(t) + "</li>" for t in p["curiosidades"]) + "</ul>"
        if p.get("fontes"):
            h += '<p class="dpost-fontes">🔎 ' + esc(p["fontes"]) + "</p>"
        return h

    def pag_estudos(self):
        n = len(self.estudos)
        R = "../"
        corpo = ('<section class="sec" aria-labelledby="est-tit">\n      ' +
                 self.cab("Estudos", "📖 Leitura, questões e gabarito", f"🛰️ {n} estudos", "Estudos do dia",
                          "🧠 Cada estudo tem o texto para ler, as questões com gabarito comentado, as curiosidades e as fontes. "
                          "Os mais longos têm PDF na <a href=\"../biblioteca/\">Biblioteca</a>.", ident="est-tit") +
                 '\n      <ul class="lista">' + "".join(self.linha_estudo(e, R) for e in self.estudos) + "</ul>\n    </section>")
        self.pagina("estudos/", "Estudos do dia", f"{n} estudos com leitura, questões, gabarito comentado e curiosidades: Rute, 1 Samuel, Livro de Mórmon, "
                    "Alcorão, Torá e Vozes do Oriente.", corpo, "estudos/", migalhas=[],
                    na_busca={"k": "📖 Página", "t": "Estudos do dia", "s": f"{n} estudos com questões e gabarito.", "d": "", "x": norm("estudos questoes gabarito")})
        R = "../../"
        for k, e in enumerate(self.estudos):
            p = e["p"]
            mais_novo = self.estudos[k - 1] if k > 0 else None
            mais_antigo = self.estudos[k + 1] if k + 1 < n else None
            pdfs = [a for a in self.anexos if a["d"] == e["d"]]
            pe = ""
            if e["ancora"]:
                pe += f'<p class="ancora"><span class="ancora-emoji">⚓</span><span class="ancora-texto">{esc(e["ancora"])}</span></p>'
            if pdfs:
                pe += '<div><h2 class="sub">📎 ' + ("PDF do dia" if len(pdfs) == 1 else "PDFs do dia") + "</h2>" + self.anexos_html(pdfs, R) + "</div>"
            pe += ('<div class="acoes"><button type="button" class="btn btn--ouro" data-copiar-link="' + SITE + e["cam"] + '" hidden>🔗 Copiar o link deste estudo</button>'
                   '<span class="aviso" id="aviso-link" role="status" aria-live="polite"></span><span class="acoes-nav">' +
                   (f'<a class="btn" href="{R}{mais_antigo["cam"]}" rel="prev">⬅️ Anterior · {esc(mais_antigo["ref"])}</a>' if mais_antigo else "") +
                   (f'<a class="btn" href="{R}{mais_novo["cam"]}" rel="next">Próximo · {esc(mais_novo["ref"])} ➡️</a>' if mais_novo else "") +
                   f'<a class="btn" href="{R}estudos/">📖 Todos os estudos</a></span></div>')
            corpo = (f'<section class="sec" aria-labelledby="est-tit">\n      ' +
                     self.cab("Estudo", "📖 " + esc(p.get("tipo") or "Estudo"), "🗓️ " + data_dia(e["d"]), esc(e["ref"]), esc(e["tema"]), ident="est-tit") +
                     '\n      <article class="painel estudo"><div class="dpost-corpo">' + self.estudo_corpo(p) + "</div></article>\n      "
                     f'<div class="estudo-pe">{pe}</div>\n    </section>')
            ld = {"@context": "https://schema.org", "@type": "Article", "headline": e["ref"], "description": e["tema"], "inLanguage": "pt-BR",
                  "datePublished": e["d"], "author": {"@type": "Person", "name": AUTOR_NOME}, "isPartOf": {"@type": "Blog", "name": NOME, "url": SITE},
                  "mainEntityOfPage": SITE + e["cam"]}
            self.pagina(e["cam"], e["ref"], resumo(e["tema"]), corpo, "estudos/", migalhas=[("estudos/", "Estudos")], tipo="article", ld=ld, data=e["d"],
                        na_busca={"k": "📖 Estudo", "t": e["ref"], "s": e["tema"], "d": data_curta(e["d"]),
                                  "x": norm(" ".join([e["ref"], e["tema"], e["ancora"], p.get("tipo", "")] + (p.get("leitura") or []) + (p.get("curiosidades") or []) +
                                                     [q["q"] + " " + " ".join(q["o"]) + " " + q["c"] for q in (p.get("questoes") or [])]))})

    # ----- diário, biblioteca, âncoras -----
    def pag_diario(self):
        R, n = "../", len(self.diario_ord)
        s = self.secao("diario", R, h1=True)
        s = re.sub(r'<p class="sec-sub">.*?</p>', '<p class="sec-sub">📖 As “Mensagens de Hoje” escritas no projeto entram aqui no mesmo dia: passagem, tema e âncora. '
                   'Os estudos têm página própria, com o texto, as questões e o gabarito: toque em “Ler o estudo”.</p>', s, count=1, flags=re.S)
        s = preencher(s, "cards-diario", self.cards_html(R))
        s = preencher(s, "anexos-diario", '<h2 class="sub">📎 PDFs do dia</h2>' + self.anexos_html(self.anexos, R))
        linhas = "".join(self.linha_diario(x, R, n - k) for k, x in enumerate(self.diario_ord))
        s = preencher(s, "lista-diario",
                      f'<p class="status">📊 {n} mensagens desde {data_curta(self.diario_ord[-1]["d"])}. 🆕 Última: {data_curta(self.diario_ord[0]["d"])}. <span id="conta-diario"></span></p>'
                      '<div class="filtros" hidden><input type="search" class="busca" id="busca-diario" placeholder="🔎 Buscar no diário: tema, referência ou data" aria-label="Buscar no diário"></div>'
                      f'<ul class="lista">{linhas}</ul><p class="vazio" id="vazio-diario" hidden>🔎 Nenhuma mensagem com essa busca.</p>')
        self.pagina("diario/", "Diário de bordo", f"As {n} mensagens do projeto Bíblia Sagrada desde {data_curta(self.diario_ord[-1]['d'])}: passagem, tema e âncora de cada dia, "
                    "com os estudos e os PDFs.", s, "diario/", migalhas=[],
                    na_busca={"k": "🗓️ Página", "t": "Diário de bordo", "s": f"{n} mensagens: passagem, tema e âncora.", "d": "", "x": norm("diario mensagens de hoje")})
        for k, x in enumerate(self.diario_ord):
            if (x["d"], x["ref"]) not in self.estudo_de:
                self.busca.append({"k": "🗓️ Diário", "t": x["ref"], "s": x["tema"], "d": data_curta(x["d"]), "u": f"diario/#d-{n - k}",
                                   "x": norm(" ".join([x["ref"], x["tema"], x.get("ancora", ""), data_curta(x["d"])]))})

    def pag_biblioteca(self):
        R, n = "../", len(self.anexos)
        corpo = ('<section class="sec" aria-labelledby="bib-tit">\n      ' +
                 self.cab("Biblioteca", "📎 PDFs para ler, salvar e imprimir", f"🛰️ {n} PDFs", "Biblioteca de PDFs",
                          "📄 Os estudos estendidos, os Códices do Dia, a Bíblia Enxuta para Neurodiversos e a edição do Diário Oficial do Realmetaverso. "
                          "Fundo branco e letra escura, do jeito que imprime bem.", ident="bib-tit") +
                 "\n      " + self.anexos_html(self.anexos, R) + "\n      " + self.cards_html(R) +
                 '\n      <p class="nota-site">📲 O plano de leitura de 365 dias tem PDFs próprios no app <a href="https://aldenirfilho.github.io/biblia-sem-jaula-365/" target="_blank" rel="noopener">Bíblia Sem Jaula 365</a>.</p>\n    </section>')
        self.pagina("biblioteca/", "Biblioteca de PDFs", f"{n} PDFs para ler e imprimir: estudos estendidos, Códices do Dia, Bíblia Enxuta para Neurodiversos e a "
                    "Concórdia das Tradições.", corpo, "biblioteca/", migalhas=[],
                    na_busca={"k": "📎 Página", "t": "Biblioteca de PDFs", "s": f"{n} PDFs para ler e imprimir.", "d": "",
                              "x": norm("biblioteca pdf baixar imprimir " + " ".join(a["titulo"] + " " + a["legenda"] for a in self.anexos))})

    def pag_ancoras(self):
        R = "../"
        a = self.ancoras()
        s = self.secao("ancoras", R, h1=True)
        s = preencher(s, "mural", "".join(f'<button type="button" data-t="{esc(x["t"])}"><span class="mural-frase">⚓ {esc(x["t"])}</span>'
                                          f'<span class="mural-origem">{esc(x["o"])}</span></button>' for x in a))
        self.pagina("ancoras/", "Mural de âncoras", f"{len(a)} frases curtas para levar no bolso, uma de cada fólio e de cada mensagem do diário. Toque para copiar.",
                    s, "ancoras/", migalhas=[],
                    na_busca={"k": "⚓ Página", "t": "Mural de âncoras", "s": f"{len(a)} frases para levar no bolso.", "d": "", "x": norm("ancoras frases " + " ".join(x["t"] for x in a))})

    # ----- páginas vindas das seções -----
    def casas_chips(self, s):
        for t in "jci":
            m = {}
            for e in self.codice:
                for v in e["vozes"]:
                    if v["t"] == t:
                        k = v["fonte"].split(" · ")[0].replace("Hadith Qudsi", "Hadith")
                        m[k] = m.get(k, 0) + 1
            s = preencher(s, "casa-" + t, "".join(f'<span class="chip chip--ouro">{esc(k)} · {m[k]}</span>' for k in sorted(m, key=lambda k: -m[k])))
        ms = {}
        for e in self.codice:
            if e.get("sud"):
                partes = e["sud"]["fonte"].split(" · ")
                k = partes[1] if len(partes) > 1 else "Livro de Mórmon"
                ms[k] = ms.get(k, 0) + 1
        return preencher(s, "casa-s", "".join(f'<span class="chip chip--ouro">{esc(k)} · {ms[k]}</span>' for k in sorted(ms, key=lambda k: -ms[k])))

    def pag_secoes(self):
        R = "../"

        def texto(*ids):
            return norm(re.sub(r"<[^>]+>", " ", " ".join(self.f.secoes[i] for i in ids)))
        self.pagina("neurodiversos/", "Bíblia Enxuta para Neurodiversos",
                    "12 aflições do dia a dia de quem tem TDAH, autismo, dislexia e outras neurodivergências: a passagem (ARC), o jeito ND, o jeito convencional, "
                    "uma ponte prática e o limite honesto.", self.secao("neurodiversos", R, h1=True), "neurodiversos/", migalhas=[],
                    na_busca={"k": "♾️ Página", "t": "Bíblia Enxuta para Neurodiversos", "s": "12 aflições, com passagem, ponte prática e limite honesto.", "d": "", "x": texto("neurodiversos")})
        self.pagina("realmetaverso/", "Concórdia das Tradições · o blog no Realmetaverso",
                    "O Ato nº 50 liga o blog ao Realmetaverso, universo de ficção e worldbuilding do autor: o rótulo religioso não é a medida de ninguém; "
                    "contam as atitudes e as ações. Todas as tradições são respeitadas.", self.secao("realmetaverso", R, h1=True), "realmetaverso/", migalhas=[],
                    na_busca={"k": "🔮 Página", "t": "Concórdia das Tradições · Realmetaverso", "s": "O rótulo não pontua. O ato, sim.", "d": "", "x": texto("realmetaverso")})
        astro = preencher(self.secao("astrolabio", R), "emblema-2", self.emblema(False))
        self.pagina("manifesto/", "Manifesto · o que este blog defende",
                    "O nome da fé de alguém diz pouco; o que ele faz com a mensagem diz muito. O manifesto do blog, o rito de leitura em quatro passos e o porquê do astrolábio.",
                    self.secao("manifesto", R, h1=True) + "\n\n    " + self.secao("comoler", R) + "\n\n    " + astro, "manifesto/", migalhas=[],
                    na_busca={"k": "📜 Página", "t": "Manifesto, rito de leitura e o brasão", "s": "O que este blog defende e como ler um fólio em 3 minutos.", "d": "",
                              "x": texto("manifesto", "comoler", "astrolabio")})
        self.pagina("casas/", "As três casas, a 4ª voz e o Oriente",
                    "Quem fala em cada coluna dos fólios: judaísmo, cristianismo, islã, a 4ª voz do Livro de Mórmon e as Vozes do Oriente, com as fontes de cada tradição.",
                    self.casas_chips(self.secao("casas", R, h1=True)), "casas/", migalhas=[],
                    na_busca={"k": "🏰 Página", "t": "As três casas, a 4ª voz e o Oriente", "s": "Quem fala em cada coluna e de que fontes.", "d": "", "x": texto("casas")})
        self.pagina("perguntas/", "Perguntas francas e glossário",
                    "As perguntas que costumam fazer sobre o blog, respondidas sem rodeio, e o glossário de três línguas: hebraico, grego e árabe para as mesmas ideias.",
                    self.secao("perguntas", R, h1=True) + "\n\n    " + self.secao("glossario", R), "perguntas/", migalhas=[],
                    na_busca={"k": "❓ Página", "t": "Perguntas francas e glossário", "s": "Respostas diretas e as palavras em hebraico, grego e árabe.", "d": "", "x": texto("perguntas", "glossario")})
        self.pagina("universo/", "Universo 360X · os sites irmãos",
                    "Os projetos que conversam com o blog: o app Bíblia Sem Jaula 365, o Realmetaverso, a AldenirMed 360X, o Códice 360X e a Neurodiversidade Brasil.",
                    self.secao("conexoes", R, h1=True) + "\n\n    " + self.secao("app365", R), "universo/", migalhas=[],
                    na_busca={"k": "🔗 Página", "t": "Universo 360X · os sites irmãos", "s": "App Bíblia Sem Jaula 365, Realmetaverso e os outros projetos do autor.", "d": "", "x": texto("conexoes", "app365")})

    def pag_busca(self):
        corpo = ('<section class="sec" aria-labelledby="bus-tit">\n      ' +
                 self.cab("Busca", "🔎 No site inteiro", "🛰️ Fólios · estudos · diário", "Buscar no site",
                          "🧭 Procure por tema, palavra ou referência. A busca olha os fólios, os estudos (texto inteiro), o diário e as páginas.", ident="bus-tit") +
                 '\n      <form class="filtros busca-site" id="form-busca" role="search" hidden><input type="search" class="busca" id="q" name="q" '
                 'placeholder="🔎 Ex.: perdão, Rute, Alcorão 2, autocontrole" aria-label="Buscar no site" autocomplete="off"></form>'
                 '\n      <p class="status" id="estado-busca" role="status" aria-live="polite">⚙️ A busca precisa de JavaScript ligado. Sem ele, use o <a href="../sitemap.xml">mapa do site</a>.</p>'
                 '\n      <ul class="lista" id="resultados"></ul>\n    </section>')
        self.pagina("busca/", "Buscar no site", "Busca por tema, palavra ou referência nos fólios, nos estudos, no diário e nas páginas do blog.", corpo, "busca/", migalhas=[])

    # ----- início -----
    def pag_inicio(self):
        N = len(self.ord)
        hero = self.f.hero
        hero = re.sub(r'<div class="hero-acoes">.*?</div>', '<div class="hero-acoes">\n          <a class="btn btn--ouro" href="#hoje">☀️ Ler o fólio de hoje</a>\n          '
                      '<a class="btn" href="codice/">📚 Abrir o códice</a>\n          <a class="btn" href="estudos/">📖 Estudos</a>\n          '
                      '<a class="btn" href="manifesto/">📜 Manifesto</a>\n        </div>', hero, count=1, flags=re.S)
        hero = troca(hero, '<dd id="t-abertos">1/31</dd>', f'<dd id="t-abertos">{N}/{N}</dd>')
        hero = troca(hero, '<dd id="t-diario">0</dd>', f'<dd id="t-diario">{len(self.diario)}</dd>')
        hoje = self.secao("hoje", "")
        hoje = troca(hoje, '<div class="painel folio" id="folio"></div>',
                     '<div class="painel folio" id="folio" data-hoje><p class="gancho">📜 O fólio em destaque muda todo dia: três vozes, uma ideia, uma missão de poucos minutos.</p>'
                     f'<div class="acoes"><a class="btn btn--ouro" href="codice/">📚 Abrir o códice · {N} fólios</a></div></div>')
        ne = len(self.estudos)
        estudos = ('<section class="sec" id="estudos" aria-labelledby="ini-est">\n      ' +
                   self.cab("Capítulo II", "📖 Estudos do dia", f"🛰️ {ne} estudos", "Últimos estudos",
                            "🧠 Leitura, questões com gabarito e curiosidades. Cada estudo tem página e link próprios.", nivel="h2", ident="ini-est") +
                   '\n      <ul class="lista">' + "".join(self.linha_estudo(e, "") for e in self.estudos[:4]) + "</ul>"
                   f'\n      <div class="pe"><a class="btn" href="estudos/">📖 Ver os {ne} estudos</a><a class="btn" href="biblioteca/">📎 Biblioteca de PDFs</a></div>\n    </section>')
        nd = len(self.diario_ord)
        diario = ('<section class="sec" id="ultimas" aria-labelledby="ini-dia">\n      ' +
                  self.cab("Capítulo III", "🗓️ Diário de bordo", f"🛰️ {nd} mensagens", "Últimas do diário",
                           "📖 Passagem, tema e âncora de cada mensagem do projeto.", nivel="h2", ident="ini-dia") +
                  '\n      <ul class="lista">' + "".join(self.linha_diario(x, "") for x in self.diario_ord[:5]) + "</ul>"
                  f'\n      <div class="pe"><a class="btn" href="diario/">🗓️ Abrir o diário · {nd} mensagens</a><a class="btn" href="ancoras/">⚓ Mural de âncoras</a></div>\n    </section>')
        cartoes = [
            ("codice/", "📚", "Códice", f"Os {N} fólios: três vozes, uma ideia e uma missão de poucos minutos em cada um."),
            ("estudos/", "📖", "Estudos", f"{ne} estudos com leitura, questões, gabarito e curiosidades."),
            ("diario/", "🗓️", "Diário de bordo", f"As {nd} mensagens do projeto: passagem, tema e âncora."),
            ("biblioteca/", "📎", "Biblioteca", f"{len(self.anexos)} PDFs para ler, salvar e imprimir."),
            ("neurodiversos/", "♾️", "Neurodiversos", "A Bíblia Enxuta: 12 aflições do dia a dia, com ponte prática e limite honesto."),
            ("realmetaverso/", "🔮", "Realmetaverso", "Concórdia das Tradições: o rótulo não pontua; o ato, sim."),
            ("manifesto/", "📜", "Manifesto", "O que este blog defende, o rito de leitura e o porquê do astrolábio."),
            ("casas/", "🏰", "Casas + vozes", "Quem fala em cada coluna: as três casas, a 4ª voz e o Oriente."),
            ("ancoras/", "⚓", "Âncoras", "Frases curtas para levar no bolso. Toque para copiar."),
            ("perguntas/", "❓", "Perguntas", "Respostas francas e o glossário de três línguas."),
            ("universo/", "🔗", "Universo 360X", "O app Bíblia Sem Jaula 365 e os sites irmãos."),
            ("busca/", "🔎", "Busca", "Ache um tema, uma palavra ou uma referência no site inteiro."),
        ]
        mapa = ('<section class="sec" id="mapa" aria-labelledby="ini-mapa">\n      ' +
                self.cab("Capítulo IV", "🧭 Mapa do site", f"🛰️ {len(cartoes)} portas", "Por onde andar",
                         "🚪 Cada parte do blog agora tem página e endereço próprios: dá para salvar, voltar e mandar o link certo.", nivel="h2", ident="ini-mapa") +
                '\n      <div class="cx-grade">' +
                "".join(f'<a class="painel cx-card" href="{c}"><span class="cx-ico" aria-hidden="true">{i}</span><span class="cx-nome">{n}</span>'
                        f'<span class="cx-desc">{d}</span><span class="cx-ir">Abrir →</span></a>' for c, i, n, d in cartoes) + "</div>\n    </section>")
        # contrato com o Códice Vivo (Mesa das Mensagens): os dois blocos, como no blog de página única
        blocos = ('<script type="application/json" id="dados-codice">' + self.f.bruto["dados-codice"] + "</script>\n    "
                  '<script type="application/json" id="dados-diario">' + self.f.bruto["dados-diario"] + "</script>")
        rotas = {"f": {str(e["n"]): e["_cam"] for e in self.ord}, "a": ANCORAS}
        redir = ("<script>/* âncoras do blog de página única: cada uma leva para a página nova */\n(function(){var R=" + json.dumps(rotas, ensure_ascii=False) +
                 ";var h=location.hash.slice(1);if(!h)return;var m=/^f(\\d{1,3})$/.exec(h);var d=m?R.f[String(Number(m[1]))]:R.a[h];if(d)location.replace(d);})();</script>\n")
        ld = {"@context": "https://schema.org", "@type": "Blog", "name": NOME, "url": SITE, "inLanguage": "pt-BR", "description": DESCRICAO,
              "author": {"@type": "Person", "name": AUTOR_NOME}}
        self.pagina("", NOME, DESCRICAO, hoje + "\n\n    " + estudos + "\n\n    " + diario + "\n\n    " + mapa + "\n\n    " + blocos, "",
                    topo=hero + "\n\n  " + self.fita(), cabeca=redir, ld=ld)

    # ----- arquivos do site -----
    def estaticos(self):
        css = alias_css(self.f.css, [(".tira button", ".tira a"), ("button.linha", "a.linha"), (".bloco h3", ".bloco h2")])
        css = ("/* Mensagens que Importam · site · " + AUTOR + " · gerado por tools/gerar_site.py: não editar aqui */\n" + css.strip() + "\n" +
               open(os.path.join(AQUI, "extra.css"), encoding="utf-8").read())
        folios = [[e["n"], e["data"], e["_cam"], e["titulo"]] for e in self.ord]
        js = ("/* gerado por tools/gerar_site.py: não editar aqui */\nwindow.MQI_FOLIOS=" + json.dumps(folios, ensure_ascii=False, separators=(",", ":")) + ";\n" +
              open(os.path.join(AQUI, "site.js"), encoding="utf-8").read())
        self.v_css = hashlib.sha1(css.encode()).hexdigest()[:8]
        self.v_js = hashlib.sha1(js.encode()).hexdigest()[:8]
        self.gravar("assets/site.css", css)
        self.gravar("assets/site.js", js)

    def finais(self):
        self.gravar("assets/busca.json", json.dumps(self.busca, ensure_ascii=False, separators=(",", ":")))
        # mapa do site
        linhas = "".join(f"  <url><loc>{esc(SITE + c)}</loc><lastmod>{d}</lastmod></url>\n" for c, _, _, d in self.paginas)
        self.gravar("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + linhas + "</urlset>\n")
        # feed dos estudos (Atom)
        itens = ""
        for e in self.estudos:
            itens += (f"  <entry>\n    <title>{esc(e['ref'])}</title>\n    <link href=\"{esc(SITE + e['cam'])}\"/>\n    <id>{esc(SITE + e['cam'])}</id>\n"
                      f"    <updated>{e['d']}T12:00:00-03:00</updated>\n    <summary>{esc(e['tema'])}</summary>\n  </entry>\n")
        self.gravar("feed.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="pt-BR">\n'
                    f"  <title>{NOME} · estudos</title>\n  <subtitle>{esc(DESCRICAO)}</subtitle>\n  <link href=\"{SITE}\"/>\n  <link rel=\"self\" href=\"{SITE}feed.xml\"/>\n"
                    f"  <id>{SITE}</id>\n  <updated>{self.estudos[0]['d']}T12:00:00-03:00</updated>\n  <author><name>{AUTOR_NOME}</name></author>\n" + itens + "</feed>\n")
        # app (PWA)
        manifesto = {
            "name": NOME, "short_name": "Mensagens", "description": DESCRICAO, "lang": "pt-BR", "dir": "ltr", "start_url": "./", "scope": "./",
            "display": "standalone", "orientation": "portrait-primary", "background_color": "#24272c", "theme_color": "#24272c",
            "categories": ["books", "education", "lifestyle"],
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png"},
                      {"src": "icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}],
            "shortcuts": [{"name": "Códice", "url": "codice/"}, {"name": "Estudos", "url": "estudos/"}, {"name": "Diário", "url": "diario/"}],
        }
        self.gravar("manifest.webmanifest", json.dumps(manifesto, ensure_ascii=False, indent=2) + "\n")
        soma = hashlib.sha1()
        for raiz, _, arqs in sorted(os.walk(self.dest)):
            if any(p in raiz for p in (os.sep + "pdfs", os.sep + "tools", os.sep + ".git")):
                continue
            for a in sorted(arqs):
                if a not in ("sw.js",):
                    soma.update(open(os.path.join(raiz, a), "rb").read())
        versao = soma.hexdigest()[:10]
        nucleo = ["./", f"assets/site.css?v={self.v_css}", f"assets/site.js?v={self.v_js}", "manifest.webmanifest", "icons/icon-192.png",
                  "icons/icon-512.png", "icons/apple-touch-icon.png"]
        demais = [c for c, _, _, _ in self.paginas if c] + ["assets/busca.json"]
        sw = SW.replace("__AUTOR__", AUTOR).replace("__VERSAO__", versao).replace("__NUCLEO__", json.dumps(nucleo)).replace("__PAGINAS__", json.dumps(demais))
        self.gravar("sw.js", sw)
        return versao

    def gerar(self):
        self.limpar()
        self.estaticos()
        self.pag_folios()
        self.pag_codice()
        self.pag_estudos()
        self.pag_diario()
        self.pag_biblioteca()
        self.pag_ancoras()
        self.pag_secoes()
        self.pag_busca()
        self.pag_inicio()
        self.paginas.sort(key=lambda p: (p[0] != "", p[0]))
        versao = self.finais()
        faltam = sorted({a["nome"] for a in self.anexos if not os.path.isfile(os.path.join(self.dest, "pdfs", a["nome"]))})
        tem_og = os.path.isfile(os.path.join(self.dest, "assets", "og.jpg"))
        print(f"{len(self.paginas)} páginas · {len(self.ord)} fólios · {len(self.estudos)} estudos · {len(self.diario)} linhas no diário · "
              f"{len(self.anexos)} PDFs (faltando {len(faltam)}) · busca {len(self.busca)} itens · cache mqi-{versao}" + ("" if tem_og else " · FALTA assets/og.jpg"))
        for p in faltam:
            print("  FALTA:", p)
        return not faltam and tem_og


SW = """/* Service worker · Mensagens que Importam (site) · __AUTOR__ */
const VERSAO = "mqi-__VERSAO__";
const NUCLEO = __NUCLEO__;
const PAGINAS = __PAGINAS__;
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
"""


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    destino = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(AQUI)
    sys.exit(0 if Site(Fonte(sys.argv[1]), destino).gerar() else 1)
