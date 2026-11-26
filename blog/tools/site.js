/* Mensagens que Importam · site (GitHub Pages) · ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
   Fonte: blog/tools/site.js. O gerador (tools/gerar_site.py) põe a lista MQI_FOLIOS na frente e grava em assets/site.js.
   Cada bloco só liga se a página tiver o elemento dele; sem JavaScript, o conteúdo continua todo legível. */
(function () {
  "use strict";
  const doc = document, raizEl = doc.documentElement;
  const RAIZ = raizEl.getAttribute("data-raiz") || "";
  const ORD = (window.MQI_FOLIOS || []).map(f => ({ n: f[0], data: f[1], caminho: f[2], titulo: f[3] }));
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const reduz = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const mem = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
    del(k) { try { localStorage.removeItem(k); } catch (_) {} }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const puro = s => String(s).replace(/\*\*|==/g, "");
  const zap = s => String(s).replace(/\*\*(.+?)\*\*/g, "*$1*").replace(/==(.+?)==/g, "*$1*");
  const norm = s => puro(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const num3 = n => String(n).padStart(3, "0");
  const p2 = n => String(n).padStart(2, "0");
  const def = (id, txt) => { const el = doc.getElementById(id); if (el) el.textContent = txt; };
  const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  const VOZES = { j: { e: "✡️", n: "Judaísmo" }, c: { e: "✝️", n: "Cristianismo" }, i: { e: "☪️", n: "Islã" } };
  const PILARES = ["💡 a ideia", "📜 a mensagem", "📡 a projeção", "🧭 o autocontrole", "🌱 a vida", "🔁 a redenção"];

  function hojeIso() { const d = new Date(); return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate()); }
  function utc(iso) { const p = iso.split("-").map(Number); return Date.UTC(p[0], p[1] - 1, p[2]); }
  function dataCurta(iso) { const p = iso.split("-"); return p[2] + "." + p[1] + "." + p[0]; }
  function dataDia(iso) { return DIAS[new Date(utc(iso)).getUTCDay()] + " " + dataCurta(iso); }

  /* O fólio em destaque: no dia marcado, o próprio; depois do último, releitura em roda (a mesma conta do blog original). */
  function doDia(iso) {
    if (!ORD.length) return null;
    const exatos = ORD.filter(e => e.data === iso);
    if (exatos.length) return { e: exatos[exatos.length - 1], releitura: false };
    if (iso < ORD[0].data) return { e: ORD[0], releitura: false };
    const dias = Math.round((utc(iso) - utc(ORD[0].data)) / 864e5);
    return { e: ORD[dias % ORD.length], releitura: true };
  }
  function calcHoje() { const iso = hojeIso(), r = doDia(iso); return r ? { iso: iso, e: r.e, releitura: r.releitura } : null; }
  const abertos = iso => ORD.filter((e, i) => e.data <= iso || i === 0);
  const feito = n => mem.get("mqi-feito-" + n) === "1";
  let HOJE = calcHoje();

  function copiar(txt, avisoEl, ok, manualEl) {
    const avisar = msg => { if (avisoEl) avisoEl.textContent = msg; };
    const manual = () => {
      if (!manualEl) { avisar("⚠️ Não deu para copiar aqui. Selecione o texto e copie."); return; }
      manualEl.hidden = false; manualEl.value = txt; manualEl.focus(); manualEl.select();
      avisar("✍️ Selecione o texto abaixo e copie.");
    };
    try { navigator.clipboard.writeText(txt).then(() => avisar(ok), manual); } catch (_) { manual(); }
  }

  /* ---------- App (PWA): service worker e botão de instalar ---------- */
  (function app() {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
      window.addEventListener("load", () => { navigator.serviceWorker.register(RAIZ + "sw.js", { scope: RAIZ || "./" }).catch(() => {}); });
    }
    const bt = doc.getElementById("instalar-app"), ios = doc.getElementById("dica-ios");
    let ev = null;
    const instalado = (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
    window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); ev = e; if (bt && !instalado) bt.hidden = false; });
    if (bt) bt.addEventListener("click", async () => {
      if (!ev) return;
      ev.prompt();
      try { await ev.userChoice; } catch (_) {}
      ev = null; bt.hidden = true;
    });
    window.addEventListener("appinstalled", () => { if (bt) bt.hidden = true; });
    if (ios && !instalado && /iphone|ipad|ipod/i.test(navigator.userAgent)) ios.hidden = false;
  })();

  /* ---------- Trilho (menu), barra de progresso e entrada das seções ---------- */
  (function trilho() {
    const nav = $("#trilho"), pagina = $("#pagina");
    if (nav) {
      const on = $('a[aria-current="page"]', nav);
      if (on) nav.scrollLeft = Math.max(0, on.offsetLeft - nav.clientWidth / 2 + on.clientWidth / 2);
    }
    const secs = $$("main section");
    if ("IntersectionObserver" in window) {
      const vista = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("sec--vista"); vista.unobserve(e.target); } }), { threshold: 0.04 });
      secs.forEach(s => vista.observe(s));
    } else secs.forEach(s => s.classList.add("sec--vista"));
    if (pagina) {
      const prog = () => {
        const d = doc.documentElement;
        pagina.style.setProperty("--prog", (d.scrollTop / Math.max(1, d.scrollHeight - d.clientHeight)).toFixed(4));
      };
      window.addEventListener("scroll", prog, { passive: true });
      prog();
    }
  })();

  /* ---------- Barra de missão: relógio UTC e fase ---------- */
  function relogioUtc() {
    const d = new Date();
    def("mb-utc", p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()) + ":" + p2(d.getUTCSeconds()));
    if (HOJE) def("mb-fase", "fólio " + num3(HOJE.e.n) + "/" + num3(ORD.length));
  }

  /* ---------- Fólio: jogo dos rótulos, copiar, missão cumprida ---------- */
  function textoCompartilhar(e, modo, url) {
    const z = modo === "zap", b = z ? zap : puro, L = [];
    L.push(z ? "*MENSAGENS QUE IMPORTAM* · Fólio " + num3(e.n) : "MENSAGENS QUE IMPORTAM · Fólio " + num3(e.n));
    L.push((e.emoji ? e.emoji + " " : "") + (z ? "*" + e.titulo + "*" : e.titulo));
    L.push("");
    e.vozes.forEach(v => { const m = VOZES[v.t]; L.push(m.e + " " + m.n + " · " + v.ref); L.push(b(v.texto)); L.push(""); });
    if (e.sud) { L.push("📘 Livro de Mórmon · " + e.sud.ref); L.push(b(e.sud.texto)); L.push(""); }
    L.push((z ? "💡 *A ideia:* " : "💡 A ideia: ") + b(e.ideia));
    L.push("");
    L.push((z ? "📡 *Missão de hoje:* " : "📡 Missão de hoje: ") + e.acao);
    L.push("");
    L.push("⚓ " + e.ancora);
    if (url) { L.push(""); L.push("🔗 " + url); }
    return L.join("\n");
  }
  function decodificar(el) {
    if (reduz || !el) return;
    const fim = el.textContent, letras = Array.from(fim), abc = "ABCDEFGHIKLMNOPQRSTVXYZ✠✦◈";
    let i = 0;
    const t = setInterval(() => {
      i += 1.5;
      el.textContent = letras.map((ch, k) => (k < i || ch === " " ? ch : abc[Math.floor(Math.random() * abc.length)])).join("");
      if (i >= letras.length) { clearInterval(t); el.textContent = fim; }
    }, 34);
  }
  function embaralhar() {
    const a = [0, 1, 2];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function ligarFolio(raiz, e) {
    if (!raiz || !e || raiz.dataset.ligado === "1") return;
    raiz.dataset.ligado = "1";
    const url = raiz.getAttribute("data-url") || "";
    const caixa = $(".vozes", raiz), vozes = caixa ? $$(".voz", caixa) : [];
    const orig = vozes.map(v => ({ cab: $(".voz-cab", v).innerHTML, ref: $(".voz-ref", v).innerHTML }));
    const ctrl = $(".controle", raiz), bt = $("#btn-rotulo", raiz), dica = $(".dica", raiz);
    const aviso = $("#aviso", raiz), manual = $("#copia-manual", raiz), caixaFeito = $("#feito", raiz);
    let oculto = mem.get("mqi-oculto") === "1", reveladas = new Set(), ordem = oculto ? embaralhar() : [0, 1, 2];
    $$("[data-js]", raiz).forEach(el => { el.hidden = false; });

    function pintar(recem) {
      ordem.forEach((ix, lugar) => {
        const v = vozes[ix];
        if (!v) return;
        const escondida = oculto && !reveladas.has(ix);
        caixa.appendChild(v);
        v.classList.toggle("voz--oculta", escondida);
        v.classList.toggle("voz--revelada", ix === recem);
        const cab = $(".voz-cab", v), ref = $(".voz-ref", v);
        if (escondida) {
          cab.innerHTML = '<span class="tec voz-nome">❓ Voz ' + (lugar + 1) + '</span><button type="button" class="btn btn--mini" data-revelar="' + ix + '">🔓 Revelar origem</button>';
          ref.textContent = "🔒 origem oculta"; ref.classList.remove("chip--ouro");
        } else { cab.innerHTML = orig[ix].cab; ref.innerHTML = orig[ix].ref; ref.classList.add("chip--ouro"); }
      });
      if (bt) { bt.setAttribute("aria-pressed", String(oculto)); bt.textContent = oculto ? "👁️ Mostrar os rótulos" : "🙈 Ler sem rótulo"; }
      if (dica) dica.textContent = !oculto ? "👀 Esconda os nomes e leia as três vozes sem saber de onde vêm."
        : (reveladas.size === 3 ? "✅ Pronto. Uma ideia, três origens." : "🎯 Qual voz vem de qual tradição? Revele uma a uma.");
      if (recem >= 0) decodificar($(".voz--revelada .voz-nome", raiz));
    }
    if (caixaFeito) caixaFeito.checked = feito(e.n);
    if (vozes.length === 3 && ctrl) pintar(-1);

    raiz.addEventListener("click", ev => {
      const t = ev.target.closest("button");
      if (!t || !raiz.contains(t)) return;
      if (t.dataset.revelar !== undefined) { const ix = Number(t.dataset.revelar); reveladas.add(ix); pintar(ix); return; }
      if (t.id === "btn-rotulo") {
        oculto = !oculto; mem.set("mqi-oculto", oculto ? "1" : "0");
        reveladas = new Set(); ordem = oculto ? embaralhar() : [0, 1, 2];
        pintar(-1); bt.focus({ preventScroll: true });
      } else if (t.id === "btn-zap") copiar(textoCompartilhar(e, "zap", url), aviso, "✅ Copiado. Cole no WhatsApp.", manual);
      else if (t.id === "btn-puro") copiar(textoCompartilhar(e, "puro", url), aviso, "✅ Copiado em texto puro.", manual);
      else if (t.hasAttribute("data-copiar-link")) copiar(url, aviso, "✅ Link copiado.", manual);
    });
    if (caixaFeito) caixaFeito.addEventListener("change", () => {
      if (caixaFeito.checked) mem.set("mqi-feito-" + e.n, "1"); else mem.del("mqi-feito-" + e.n);
      telemetria(); marcarCodice();
    });
    /* selo e data: se este é o fólio em destaque hoje, a página avisa */
    const selo = $("#selo-folio", raiz), chipData = $("#data-folio", raiz);
    if (HOJE && HOJE.e.n === e.n) {
      if (selo) selo.textContent = HOJE.releitura ? "🔁 Releitura de hoje" : "☀️ Fólio de hoje";
      if (chipData) chipData.textContent = "🗓️ " + dataDia(HOJE.iso);
    }
  }
  (function folioDaPagina() {
    const raiz = $("#folio:not([data-hoje])"), dados = $("#dados-folio");
    if (!raiz || !dados) return;
    try { ligarFolio(raiz, JSON.parse(dados.textContent)); } catch (_) {}
  })();

  /* ---------- Início: o fólio de hoje vem da página do próprio fólio (uma fonte só) ---------- */
  let hojeCarregado = null;
  function carregarHoje() {
    const alvo = $("#folio[data-hoje]");
    if (!alvo || !HOJE || hojeCarregado === HOJE.e.n) return;
    const n = HOJE.e.n, base = new URL(RAIZ + HOJE.e.caminho, location.href);
    hojeCarregado = n;
    fetch(base.href, { credentials: "same-origin" }).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.text(); }).then(t => {
      const d = new DOMParser().parseFromString(t, "text/html");
      const f = d.getElementById("folio"), dados = d.getElementById("dados-folio");
      if (!f || !dados) throw new Error("sem fólio");
      $$("a[href]", f).forEach(a => a.setAttribute("href", new URL(a.getAttribute("href"), base).href));
      const h1 = f.querySelector("h1.folio-titulo");
      if (h1) { const h2 = d.createElement("h2"); h2.className = h1.className; h2.innerHTML = h1.innerHTML; h1.replaceWith(h2); }
      $$(".bloco > h2", f).forEach(h => { const h3 = d.createElement("h3"); h3.innerHTML = h.innerHTML; h.replaceWith(h3); });
      const nav = f.querySelector(".acoes-nav");
      if (nav) nav.insertAdjacentHTML("beforeend", '<a class="btn" href="' + esc(base.href) + '">🔗 Página deste fólio</a>');
      const novo = alvo.cloneNode(false);
      novo.innerHTML = f.innerHTML;
      novo.setAttribute("data-n", String(n));
      novo.setAttribute("data-url", f.getAttribute("data-url") || base.href);
      novo.removeAttribute("data-ligado");
      alvo.replaceWith(novo);
      ligarFolio(novo, JSON.parse(dados.textContent));
    }).catch(() => { hojeCarregado = null; });
  }

  /* ---------- Início: telemetria, contagem regressiva, palavra giratória, céu ---------- */
  function telemetria() {
    if (!HOJE || !doc.getElementById("t-dia")) return;
    const dia = Math.max(1, Math.round((utc(HOJE.iso) - utc(ORD[0].data)) / 864e5) + 1);
    def("t-dia", num3(dia));
    def("t-abertos", abertos(HOJE.iso).length + "/" + ORD.length);
    def("t-feitas", String(ORD.filter(e => feito(e.n)).length));
    def("t-rot", HOJE.releitura ? "🚀 T− próxima releitura" : "🚀 T− próximo fólio");
  }
  function relogio() {
    if (!doc.getElementById("t-proximo")) return;
    const a = new Date(), meiaNoite = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1);
    let s = Math.max(0, Math.floor((meiaNoite - a) / 1000));
    const h = Math.floor(s / 3600); s -= h * 3600;
    const m = Math.floor(s / 60); s -= m * 60;
    def("t-proximo", p2(h) + ":" + p2(m) + ":" + p2(s));
  }
  (function palavraGiratoria() {
    const el = $("#gira");
    if (!el || reduz) return;
    let i = 0;
    setInterval(() => {
      if (doc.hidden) return;
      i = (i + 1) % PILARES.length;
      el.classList.remove("gira--entra");
      void el.offsetWidth;
      el.textContent = PILARES[i];
      el.classList.add("gira--entra");
    }, 2400);
  })();
  (function ceu() {
    const c = $("#ceu");
    if (!c || !c.getContext) return;
    const x = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = 0, h = 0, estrelas = [], raf = 0, pal = [];
    const cores = () => {
      const cs = getComputedStyle(doc.documentElement);
      pal = ["--tinta", "--ouro-vivo", "--ciano"].map(v => cs.getPropertyValue(v).trim() || "#cccccc");
    };
    const medir = () => {
      const r = c.getBoundingClientRect();
      w = r.width; h = r.height;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(170, (w * h) / 8500));
      estrelas = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.3 + 0.3, v: Math.random() * 0.14 + 0.03, f: Math.random() * 6.283,
        c: Math.random() < 0.72 ? 0 : (Math.random() < 0.7 ? 1 : 2)
      }));
    };
    const quadro = t => {
      x.clearRect(0, 0, w, h);
      for (const s of estrelas) {
        if (!reduz) { s.x -= s.v; if (s.x < -2) s.x = w + 2; }
        x.globalAlpha = Math.max(0.1, 0.4 + 0.45 * Math.sin((t || 0) / 900 + s.f));
        x.fillStyle = pal[s.c];
        x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill();
      }
      x.globalAlpha = 1;
      if (!reduz) raf = requestAnimationFrame(quadro);
    };
    const religar = () => { cancelAnimationFrame(raf); cores(); medir(); quadro(0); };
    religar();
    let larguraAntes = w;
    window.addEventListener("resize", () => { const r = c.getBoundingClientRect(); if (Math.abs(r.width - larguraAntes) > 2) { larguraAntes = r.width; religar(); } });
    doc.addEventListener("visibilitychange", () => { cancelAnimationFrame(raf); if (!doc.hidden) quadro(0); });
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      if (mq.addEventListener) mq.addEventListener("change", cores);
    }
  })();

  /* ---------- Códice: destaque de hoje, missões cumpridas, filtros e busca ---------- */
  function marcarCodice() {
    const tira = $("#tira"), orbita = $("#orbita");
    if (!tira && !orbita) return;
    ORD.forEach(e => {
      const hoje = !!HOJE && HOJE.e.n === e.n, ok = feito(e.n);
      const q = tira ? $('a[data-n="' + e.n + '"]', tira) : null;
      if (q) { q.classList.toggle("hoje", hoje); q.classList.toggle("feito", ok); if (hoje) q.setAttribute("aria-current", "true"); else q.removeAttribute("aria-current"); }
      const p = orbita ? $('circle.pt[data-n="' + e.n + '"]', orbita) : null;
      if (p) {
        p.classList.toggle("hoje", hoje); p.classList.toggle("feito", ok);
        p.setAttribute("r", hoje ? "10" : "7");
        const velho = $('circle.pulso[data-n="' + e.n + '"]', orbita);
        if (velho) velho.remove();
        if (hoje && !reduz) {
          const pulso = doc.createElementNS("http://www.w3.org/2000/svg", "circle");
          pulso.setAttribute("class", "pulso"); pulso.setAttribute("data-n", String(e.n));
          pulso.setAttribute("cx", p.getAttribute("cx")); pulso.setAttribute("cy", p.getAttribute("cy")); pulso.setAttribute("r", "10");
          p.parentNode.insertBefore(pulso, p);
        }
      }
    });
    const st = $("#status-codice");
    if (st && HOJE) st.textContent = "☀️ Em destaque hoje: fólio " + num3(HOJE.e.n) + " · " + HOJE.e.titulo + ". ✅ Faixa ciano: missão cumprida (" + ORD.filter(e => feito(e.n)).length + " de " + ORD.length + ").";
  }
  (function filtrosCodice() {
    const caixa = $("#filtros"), lista = $("#lista-codice");
    if (!caixa || !lista) return;
    const busca = $("#busca"), itens = $$("li[data-pilar]", lista), vazio = $("#vazio-codice"), conta = $("#conta-codice");
    let filtro = "todos";
    caixa.hidden = false;
    function aplicar() {
      const q = norm(busca ? busca.value : "").trim();
      let n = 0;
      itens.forEach(li => {
        const ok = (filtro === "todos" || li.dataset.pilar === filtro) && (!q || (li.dataset.x || "").indexOf(q) >= 0);
        li.hidden = !ok; if (ok) n++;
      });
      if (vazio) vazio.hidden = n > 0;
      if (conta) conta.textContent = n === itens.length ? "" : " · " + n + " de " + itens.length;
      $$("button[data-f]", caixa).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.f === filtro)));
    }
    function filtrar(f, rolar) {
      filtro = f; aplicar();
      if (rolar) caixa.scrollIntoView({ behavior: reduz ? "auto" : "smooth", block: "start" });
    }
    caixa.addEventListener("click", ev => { const b = ev.target.closest("button[data-f]"); if (b) filtrar(b.dataset.f, false); });
    if (busca) busca.addEventListener("input", aplicar);
    const barras = $("#barras");
    if (barras) barras.addEventListener("click", ev => {
      const b = ev.target.closest("[data-f]");
      if (!b) return;
      ev.preventDefault(); filtrar(b.dataset.f, true);
    });
  })();

  /* ---------- Copiar o link da página (estudos) ---------- */
  $$("button[data-copiar-link]").forEach(b => {
    if (b.closest("#folio")) return;            /* no fólio, quem cuida é o próprio fólio */
    b.hidden = false;
    b.addEventListener("click", () => copiar(b.getAttribute("data-copiar-link") || location.href, $("#aviso-link"), "✅ Link copiado.", null));
  });

  /* ---------- Âncoras: tocar para copiar ---------- */
  (function mural() {
    const m = $("#mural");
    if (!m) return;
    m.addEventListener("click", ev => {
      const b = ev.target.closest("button[data-t]");
      if (b) copiar(b.dataset.t, $("#aviso-mural"), "✅ Âncora copiada.", null);
    });
  })();

  /* ---------- Diário: busca e cards que ampliam ---------- */
  (function diario() {
    const busca = $("#busca-diario"), lista = $("#lista-diario");
    if (busca && lista) {
      const itens = $$("li.dlinha", lista), vazio = $("#vazio-diario"), conta = $("#conta-diario");
      busca.closest(".filtros").hidden = false;
      busca.addEventListener("input", () => {
        const q = norm(busca.value).trim();
        let n = 0;
        itens.forEach(li => { const ok = !q || (li.dataset.x || "").indexOf(q) >= 0; li.hidden = !ok; if (ok) n++; });
        if (vazio) vazio.hidden = n > 0;
        if (conta) conta.textContent = q ? "🔎 " + n + " de " + itens.length + " mensagens." : "";
      });
    }
    doc.addEventListener("click", ev => {
      const b = ev.target.closest(".dcard-b");
      if (!b) return;
      const aberto = b.closest(".dcard").classList.toggle("grande");
      b.setAttribute("aria-expanded", aberto ? "true" : "false");
    });
  })();

  /* ---------- Busca do site ---------- */
  (function buscaSite() {
    const campo = $("#q"), saida = $("#resultados");
    if (!campo || !saida) return;
    const estado = $("#estado-busca");
    let indice = null, pedindo = null;
    $("#form-busca").hidden = false;
    const carregar = () => pedindo || (pedindo = fetch(RAIZ + "assets/busca.json", { credentials: "same-origin" }).then(r => { if (!r.ok) throw new Error("http " + r.status); return r.json(); }).then(j => { indice = j; return j; }));
    function mostrar() {
      const bruto = campo.value.trim(), termos = norm(bruto).split(/\s+/).filter(t => t.length >= 2);
      if (!termos.length) { saida.innerHTML = ""; estado.textContent = "✍️ Digite pelo menos 2 letras: tema, palavra ou referência (ex.: Rute, perdão, Alcorão 2)."; return; }
      if (!indice) { estado.textContent = "⏳ Carregando o índice…"; return; }
      const achados = [];
      indice.forEach(it => {
        const t = norm(it.t), x = it.x;
        let pontos = 0;
        for (const termo of termos) {
          const noTitulo = t.indexOf(termo) >= 0;
          if (!noTitulo && x.indexOf(termo) < 0) return;
          pontos += noTitulo ? 3 : 1;
        }
        achados.push({ it: it, p: pontos });
      });
      achados.sort((a, b) => b.p - a.p);
      estado.textContent = achados.length ? "🔎 " + achados.length + (achados.length === 1 ? " resultado" : " resultados") + " para “" + bruto + "”." : "🔎 Nada encontrado para “" + bruto + "”. Tente outra palavra.";
      saida.innerHTML = achados.slice(0, 60).map(a =>
        '<li><a class="linha" href="' + esc(RAIZ + a.it.u) + '"><span class="linha-meta">' + esc(a.it.k) + '</span><span class="linha-corpo"><span class="linha-titulo">' + esc(a.it.t) +
        '</span><span class="linha-gancho">' + esc(a.it.s || "") + '</span></span><span class="linha-pilar">' + esc(a.it.d || "") + "</span></a></li>").join("");
    }
    const inicial = new URLSearchParams(location.search).get("q");
    if (inicial) campo.value = inicial;
    campo.addEventListener("input", mostrar);
    $("#form-busca").addEventListener("submit", ev => { ev.preventDefault(); mostrar(); });
    carregar().then(mostrar, () => { estado.textContent = "⚠️ Não deu para carregar o índice agora. Recarregue a página."; });
    mostrar();
  })();

  /* ---------- Relógios e virada do dia ---------- */
  function conferirDia() {
    if (!HOJE || hojeIso() === HOJE.iso) return;
    HOJE = calcHoje();
    telemetria(); marcarCodice(); carregarHoje();
  }
  telemetria(); relogio(); relogioUtc(); marcarCodice(); carregarHoje();
  doc.addEventListener("visibilitychange", () => { if (!doc.hidden) conferirDia(); });
  setInterval(() => { relogio(); relogioUtc(); conferirDia(); }, 1000);
})();
