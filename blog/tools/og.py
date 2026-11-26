#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gera assets/og.jpg (1200x630), a imagem que aparece quando um link do site é compartilhado.
Uso: python3 tools/og.py   (precisa do Playwright; roda depois de tools/gerar_site.py, que cria assets/site.css)
ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
"""
import os, re
from playwright.sync_api import sync_playwright

AQUI = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.dirname(AQUI)
inicio = open(os.path.join(SITE, "index.html"), encoding="utf-8").read()
emblema = re.search(r'<svg class="astro".*?</svg>', inicio, re.S).group(0)
fontes = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/[^"]+">', inicio).group(0)
css = open(os.path.join(SITE, "assets", "site.css"), encoding="utf-8").read()
HTML = f"""<!doctype html><html lang="pt-BR" data-theme="dark"><head><meta charset="utf-8">{fontes}<style>{css}
html,body{{width:1200px;height:630px;overflow:hidden}}
.og{{position:relative;box-sizing:border-box;width:1200px;height:630px;padding:56px 64px;display:grid;grid-template-columns:1fr 300px;gap:40px;align-items:center}}
.og h1{{font-size:118px;margin:14px 0 22px;animation:none}}
.og .tec{{color:var(--ciano);font-size:19px;letter-spacing:.12em}}
.og .tese{{font-family:var(--f-citacao);font-style:italic;font-weight:600;font-size:40px;line-height:1.12;color:var(--tinta);margin:0;max-width:720px}}
.og .tese b{{color:var(--ouro-vivo)}}
.og .astro{{width:300px;height:auto}}
.og .autor{{position:absolute;left:64px;bottom:34px;font-family:var(--f-tec);font-size:17px;letter-spacing:.14em;color:var(--ouro)}}
.og::before{{content:"";position:absolute;inset:20px;border:1px solid var(--ouro);pointer-events:none}}
*{{animation-play-state:paused!important}}
</style></head><body><div class="og"><div><p class="tec">✡️ ✝️ ☪️ · TRÊS TRADIÇÕES · UMA IDEIA POR DIA</p><h1>Mensagens<br>que importam</h1>
<p class="tese">O rótulo abre a porta. <b>Quem entra é a prática.</b></p></div>{emblema}
<p class="autor">ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X</p></div></body></html>"""
with sync_playwright() as p:
    nav = p.chromium.launch()
    pg = nav.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1)
    pg.set_content(HTML, wait_until="networkidle")
    pg.evaluate("document.fonts.ready")
    pg.wait_for_timeout(400)
    pg.screenshot(path=os.path.join(SITE, "assets", "og.jpg"), type="jpeg", quality=88, clip={"x": 0, "y": 0, "width": 1200, "height": 630})
    nav.close()
print("assets/og.jpg", os.path.getsize(os.path.join(SITE, "assets", "og.jpg")), "bytes")
