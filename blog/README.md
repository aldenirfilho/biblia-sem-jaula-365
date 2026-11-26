# ✠ Mensagens que Importam — site e app

**🌐 Abrir:** https://aldenirfilho.github.io/biblia-sem-jaula-365/blog/

Blog inter-religioso no eixo **medieval ↔ aeroespacial**, agora como **site de várias páginas**: cada fólio e cada estudo tem página e link próprios, com busca, biblioteca de PDFs, mapa do site e feed. Continua instalável como app e abre sem internet.

**ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X**

## 🧭 Páginas
| Página | Endereço | O que tem |
|---|---|---|
| ☀️ Início | `/blog/` | fólio em destaque do dia, últimos estudos, últimas do diário, mapa do site |
| 📚 Códice | `/blog/codice/` | os 31 fólios (órbita, filtro por pilar, busca) e uma página por fólio: `/blog/codice/001-…/` |
| 📖 Estudos | `/blog/estudos/` | uma página por estudo, com leitura, questões, gabarito, curiosidades e o PDF do dia |
| 🗓️ Diário | `/blog/diario/` | todas as mensagens do projeto, com busca |
| 📎 Biblioteca | `/blog/biblioteca/` | os PDFs para abrir e baixar |
| ⚓ Âncoras | `/blog/ancoras/` | mural de frases; tocar copia |
| ♾️ Neurodiversos | `/blog/neurodiversos/` | Bíblia Enxuta para Neurodiversos |
| 🔮 Realmetaverso | `/blog/realmetaverso/` | Concórdia das Tradições (ficção e worldbuilding do autor) |
| 📜 Manifesto · 🏰 Casas · ❓ Perguntas · 🔗 360X | `/blog/manifesto/` · `/blog/casas/` · `/blog/perguntas/` · `/blog/universo/` | o que o blog defende, quem fala em cada coluna, perguntas e glossário, sites irmãos |
| 🔎 Busca | `/blog/busca/` | busca no site inteiro (`?q=palavra`) |

Também: `sitemap.xml` (mapa do site) e `feed.xml` (feed Atom dos estudos).

## 🔗 Links antigos continuam valendo
O blog era uma página só, com âncoras. A página inicial leva cada âncora antiga para a página nova: `#diario` → `diario/`, `#realmetaverso` → `realmetaverso/`, `#neurodiversos` → `neurodiversos/`, `#f12` → a página do fólio 012, e assim por diante.

A página inicial mantém os blocos `<script id="dados-codice">` e `<script id="dados-diario">`: o **Códice Vivo do Realmetaverso** lê os dois ao vivo (Mesa das Mensagens). Não remover.

## 📲 Instalar como app
- **Android / Chrome / Edge:** botão "📲 Instalar o app" no rodapé (ou menu ⋮ → Instalar app).
- **iPhone / iPad:** abrir no Safari → Compartilhar → **Adicionar à Tela de Início**.
- Depois da primeira abertura, o site inteiro fica guardado e abre **sem internet** (os PDFs ficam guardados depois de abertos uma vez).

## 🗂️ O que tem nesta pasta
| Arquivo | Para quê |
|---|---|
| `index.html` e as pastas das páginas | o site (gerado; não editar à mão) |
| `assets/site.css`, `assets/site.js`, `assets/busca.json` | estilo, comportamento e índice da busca (gerados) |
| `assets/og.jpg` | imagem que aparece quando um link do site é compartilhado |
| `pdfs/`, `img/` | os PDFs do dia e os cards dos estudos |
| `manifest.webmanifest`, `sw.js`, `icons/` | o app (PWA): instalação, ícones e modo sem internet |
| `tools/gerar_site.py` | gera o site inteiro a partir do HTML do blog original |
| `tools/site.js`, `tools/extra.css` | fonte do comportamento e do estilo próprios do site |
| `tools/og.py` | gera `assets/og.jpg` (só quando o visual mudar) |

## 🔄 Como atualizar
A fonte única é o artifact "Mensagens que Importam" no Claude (fólios, diário, estudos, PDFs e o texto das seções). Para trazer uma versão nova:
1. Salvar o HTML do artifact (a leitura do artifact grava o arquivo inteiro).
2. Copiar os PDFs novos para `pdfs/` com o mesmo nome do bloco `dados-anexos`.
3. `python3 tools/gerar_site.py <html-do-artifact>`: apaga as páginas geradas, gera tudo de novo, troca os links dos PDFs e põe versão nova no cache do app. Sai com erro se faltar algum PDF.
4. Commit e push na `main`: o GitHub Pages publica em cerca de 1 minuto.

O domínio `aldenirfilho.github.io` é compartilhado por todos os sites do autor: o service worker daqui só apaga caches `mqi-*`.
