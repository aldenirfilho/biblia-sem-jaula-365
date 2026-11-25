# ✠ Mensagens que Importam — blog e app

**🌐 Abrir:** https://aldenirfilho.github.io/biblia-sem-jaula-365/blog/

Blog de mensagens bíblicas e inter-religiosas no eixo **medieval ↔ aeroespacial**: fólio do dia com as vozes do judaísmo, do cristianismo e do islã (e o Livro de Mórmon como 4ª voz), diário de estudos com postagens e gabarito, PDFs do dia, 📲 App 365 e a seção **♾️ Neurodiversos** (Bíblia Enxuta para Neurodiversos).

**ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X**

## 📲 Instalar como app
- **Android / Chrome / Edge:** botão "📲 Instalar o app" no rodapé (ou menu ⋮ → Instalar app).
- **iPhone / iPad:** abrir no Safari → Compartilhar → **Adicionar à Tela de Início**.
- Depois da primeira abertura, o app funciona **offline** (os PDFs ficam guardados depois de abertos uma vez).

## 🗂️ O que tem aqui
| Arquivo | Para quê |
|---|---|
| `index.html` | o blog completo (gerado; não editar à mão) |
| `pdfs/` | os PDFs do dia, com o nome original |
| `manifest.webmanifest`, `sw.js`, `icons/` | o app (PWA): instalação, ícones e modo offline |
| `tools/montar.py` | monta esta versão a partir do HTML do blog original |

## 🔄 Como atualizar
O original do blog é o artifact "Mensagens que Importam" no Claude. Para trazer uma versão nova:
1. Salvar o HTML do artifact (a leitura do artifact grava o arquivo inteiro).
2. Copiar os PDFs novos para `pdfs/` com o mesmo nome do bloco `dados-anexos`.
3. `python3 tools/montar.py <html-do-artifact> .` (troca os links dos PDFs, liga o download comum, gera `sw.js` com versão nova de cache).
4. Commit e push na `main`: o GitHub Pages publica em cerca de 1 minuto.
