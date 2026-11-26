/* Bíblia Sem Jaula 365 · Códice de Estudo
   ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
   App estático (GitHub Pages): progresso, notas e marcações ficam neste aparelho
   e, se você ligar, sincronizam entre iPhone e Mac por um Gist secreto do GitHub. */
(() => {
  'use strict';

  const CHAVE = 'bsj365.codice.v1';
  const FA = document.documentElement.dataset.fonteAcessivel || 'OpenDyslexic'; // fonte acessível disponível nesta hospedagem
  const ROTA_EMO = { historia: '📜', exausto: '🛌', injustica: '⚖️', metal: '🤘', jesus: '✝️', casal: '💍', rumo: '🧭', sabedoria: '🦉' };
  const main = document.getElementById('principal');
  let D = null, DIA = {}, SEM = {};

  /* ---------------- estado ---------------- */
  // Padrão pedido em 23/11/2026: visualização clara (Pergaminho) e leitura em OpenDyslexic
  // feitos/missoes/marcas: valor > 0 = marcado em (ms); valor < 0 = desmarcado em (ms). Assim a sincronização sabe o que é mais recente.
  // zerado: data do último "Zerar"; tudo anterior a ela some em todos os aparelhos
  const padrao = () => ({ atual: 1, atualT: 0, zerado: 0, feitos: {}, missoes: {}, notas: {}, notasT: {}, marcas: {}, tema: 'pergaminho', fonte: 'dislexia', tam: 1, prefs2: 1, criado: Date.now() });
  let E = padrao();
  try {
    const raw = localStorage.getItem(CHAVE);
    if (raw) {
      const salvo = JSON.parse(raw);
      E = Object.assign(padrao(), salvo);
      // quem abriu antes de 23/11 passa uma vez para o claro + OpenDyslexic (depois pode trocar à vontade)
      if (!salvo.prefs2) { E.tema = 'pergaminho'; E.fonte = 'dislexia'; E.prefs2 = 1; localStorage.setItem(CHAVE, JSON.stringify(E)); }
      // notas antigas (antes da sincronização) ganham carimbo mínimo
      Object.keys(E.notas).forEach(k => { if (!E.notasT[k]) E.notasT[k] = 1; });
    }
  } catch (e) { /* armazenamento indisponível */ }
  const salvarLocal = () => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { toast('⚠️ Não consegui salvar neste navegador'); } };
  const salvar = () => { salvarLocal(); agendarSync(); };
  const on = (o, k) => (+o[k] || 0) > 0;
  const carimbo = (o, k) => Math.max(Date.now(), Math.abs(+o[k] || 0) + 1, (E.zerado || 0) + 1);
  const alternar = (o, k, liga) => { o[k] = liga ? carimbo(o, k) : -carimbo(o, k); };
  const irPara = n => { if (E.atual !== n) { E.atualT = Math.max(Date.now(), (E.atualT || 0) + 1); E.atual = n; salvar(); } };
  const aplicarPrefs = () => {
    document.documentElement.dataset.tema = E.tema;
    document.documentElement.dataset.fonte = E.fonte;
    document.documentElement.style.setProperty('--tam', E.tam);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = E.tema === 'pergaminho' ? '#EDE4CF' : '#0E1217';
  };
  aplicarPrefs();

  /* ---------------- utilidades ---------------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const nFeitos = () => Object.keys(E.feitos).filter(k => on(E.feitos, k)).length;
  const feitosSemana = n => SEM[n].d.filter(i => on(E.feitos, i)).length;
  let tToast;
  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('on'), 2400);
  }
  // No GitHub Pages os PDFs ficam ao lado do app; em outra hospedagem, apontam para o GitHub Pages
  const NO_PAGES = /github\.io$/.test(location.hostname) || location.hostname === 'localhost';
  const PDF_BASE = NO_PAGES ? 'pdf/' : 'https://aldenirfilho.github.io/biblia-sem-jaula-365/pdf/';
  const pdfSemana = n => `${PDF_BASE}semana-${String(n).padStart(2, '0')}.pdf`;
  const PDF_VOLUME = `${PDF_BASE}Biblia-Sem-Jaula-365_Volume-Completo.pdf`;
  const dataLocal = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

  function sequencias() {
    const dias = new Set(Object.values(E.feitos).filter(v => v > 0).map(dataLocal));
    if (!dias.size) return { atual: 0, maior: 0 };
    const ord = [...dias].sort();
    let maior = 1, corrida = 1;
    for (let i = 1; i < ord.length; i++) {
      const diff = (new Date(ord[i] + 'T12:00') - new Date(ord[i - 1] + 'T12:00')) / 864e5;
      corrida = Math.round(diff) === 1 ? corrida + 1 : 1; maior = Math.max(maior, corrida);
    }
    let atual = 0; const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
    const ontem = new Date(hoje - 864e5);
    let cursor = dias.has(dataLocal(hoje)) ? hoje : dias.has(dataLocal(ontem)) ? ontem : null;
    while (cursor && dias.has(dataLocal(cursor))) { atual++; cursor = new Date(cursor - 864e5); }
    return { atual, maior };
  }

  function atualizarAnel() {
    const n = nFeitos();
    document.getElementById('anel-txt').textContent = n;
    document.getElementById('anel-arco').style.strokeDashoffset = String(119.4 * (1 - n / 365));
    document.getElementById('anel').setAttribute('aria-label', `Progresso: ${n} de 365 dias concluídos`);
  }


  /* ---------------- sincronização entre aparelhos ---------------- */
  // Regra: em cada dia, nota, missão e versículo vale a mudança mais recente; o "dia atual" é o último aberto.
  // Tema, fonte e tamanho da letra ficam por aparelho (o iPhone e o Mac podem ter leituras diferentes).
  const CHAVE_SYNC = 'bsj365.sync.v1';
  const ARQ = 'bsj365-progresso.json';
  const DESC_GIST = '📖🔥 BÍBLIA SEM JAULA 365 · progresso (sincronização) · ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X';
  const AUTOR = 'ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X';
  const LINK_TOKEN = 'https://github.com/settings/tokens/new?scopes=gist&description=BIBLIA%20SEM%20JAULA%20365%20sync';
  const APP_GITHUB = 'https://aldenirfilho.github.io/biblia-sem-jaula-365/';
  const ua = navigator.userAgent;
  const APARELHO = /iPhone/.test(ua) ? 'iPhone' : (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) ? 'iPad' : /Macintosh|Mac OS X/.test(ua) ? 'Mac' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : 'navegador';
  let S = { token: '', gist: '', ultimo: 0 };
  try { S = Object.assign(S, JSON.parse(localStorage.getItem(CHAVE_SYNC) || '{}')); } catch (e) { /* sem config */ }
  const salvarS = () => { try { localStorage.setItem(CHAVE_SYNC, JSON.stringify({ token: S.token, gist: S.gist, ultimo: S.ultimo })); } catch (e) { /* ignora */ } };
  const SY = { estado: S.token ? 'ok' : 'off', msg: '', rodando: null, denovo: false, pendente: false, t: null, mud: 0 };

  const ordenar = o => Object.keys(o || {}).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).reduce((r, k) => (r[k] = o[k], r), {});
  const estadoSync = x => ({ atual: x.atual || 1, atualT: x.atualT || 0, zerado: x.zerado || 0, feitos: ordenar(x.feitos), missoes: ordenar(x.missoes), marcas: ordenar(x.marcas), notas: ordenar(x.notas), notasT: ordenar(x.notasT) });
  const canon = x => JSON.stringify(estadoSync(x));

  // limpa o que vem de fora (Gist, link, arquivo): só dias 1–365, números e carimbos plausíveis
  function sanear(x) {
    const lim = Date.now() + 864e5, okDia = k => /^\d{1,3}$/.test(k) && +k >= 1 && +k <= 365;
    const mapa = (o, okK) => { const r = {}; if (o && typeof o === 'object') for (const k of Object.keys(o)) { const v = +o[k]; if (okK(k) && Number.isFinite(v) && v !== 0 && Math.abs(v) <= lim) r[k] = Math.round(v); } return r; };
    const okMarca = k => { const m = /^(\d{1,3})\|\d{1,2}\|\d{1,3}$/.exec(k); return !!m && okDia(m[1]); };
    const notas = {}, notasT = {};
    if (x.notas && typeof x.notas === 'object') for (const k of Object.keys(x.notas)) if (okDia(k) && typeof x.notas[k] === 'string' && x.notas[k].trim()) notas[k] = x.notas[k].slice(0, 20000);
    const nt = mapa(x.notasT, okDia); for (const k of Object.keys(nt)) if (nt[k] > 0) notasT[k] = nt[k];
    for (const k of Object.keys(notas)) if (!notasT[k]) notasT[k] = 1;
    const atual = Math.min(365, Math.max(1, parseInt(x.atual, 10) || 1));
    const atualT = Math.min(lim, Math.max(0, +x.atualT || 0)), zerado = Math.min(lim, Math.max(0, +x.zerado || 0));
    return { atual, atualT, zerado, feitos: mapa(x.feitos, okDia), missoes: mapa(x.missoes, okDia), marcas: mapa(x.marcas, okMarca), notas, notasT };
  }

  function mesclarMapa(x = {}, y = {}) {
    const r = {};
    for (const k of new Set([...Object.keys(x), ...Object.keys(y)])) {
      const vx = +x[k] || 0, vy = +y[k] || 0;
      r[k] = Math.abs(vx) !== Math.abs(vy) ? (Math.abs(vx) > Math.abs(vy) ? vx : vy) : Math.max(vx, vy);
    }
    return r;
  }
  // a = local (mantém tema/fonte/tamanho), b = de fora (já saneado)
  function mesclar(a, b) {
    const r = Object.assign({}, a);
    r.feitos = mesclarMapa(a.feitos, b.feitos); r.missoes = mesclarMapa(a.missoes, b.missoes); r.marcas = mesclarMapa(a.marcas, b.marcas);
    r.notas = {}; r.notasT = {};
    const an = a.notas || {}, aT = a.notasT || {}, bn = b.notas || {}, bT = b.notasT || {};
    for (const k of new Set([...Object.keys(an), ...Object.keys(aT), ...Object.keys(bn), ...Object.keys(bT)])) {
      const ta = aT[k] || (an[k] ? 1 : 0), tb = bT[k] || (bn[k] ? 1 : 0);
      const txt = ta !== tb ? (ta > tb ? an[k] : bn[k]) : ((an[k] || '') >= (bn[k] || '') ? an[k] : bn[k]);
      if (txt) r.notas[k] = txt;
      const t = Math.max(ta, tb); if (t) r.notasT[k] = t;
    }
    const at = a.atualT || 0, bt = b.atualT || 0;
    if (bt > at || (bt === at && (b.atual || 1) > (a.atual || 1))) { r.atual = b.atual || 1; r.atualT = bt; }
    else { r.atual = a.atual || 1; r.atualT = at; }
    // "Zerar" feito em qualquer aparelho apaga tudo o que for anterior a ele
    const z = r.zerado = Math.max(a.zerado || 0, b.zerado || 0);
    if (z) {
      ['feitos', 'missoes', 'marcas'].forEach(m => Object.keys(r[m]).forEach(k => { if (Math.abs(r[m][k]) <= z) delete r[m][k]; }));
      Object.keys(r.notasT).forEach(k => { if (r.notasT[k] <= z) { delete r.notasT[k]; delete r.notas[k]; } });
      Object.keys(r.notas).forEach(k => { if (!r.notasT[k]) delete r.notas[k]; });
      if (r.atualT <= z) { r.atual = 1; r.atualT = z; }
    }
    return r;
  }

  const pacoteSync = () => JSON.stringify({ app: 'biblia-sem-jaula-365', v: 2, autor: AUTOR, atualizado: new Date().toISOString(), dispositivo: APARELHO, estado: estadoSync(E) }, null, 1);
  const digitalDia = n => [on(E.feitos, n), on(E.missoes, n), E.notas[n] || '', Object.keys(E.marcas).filter(k => k.startsWith(n + '|') && on(E.marcas, k)).sort().join(',')].join('§');

  // aplica um estado vindo de fora; devolve quantos dias concluídos a mais apareceram
  function aplicarDeFora(b, origem) {
    const antes = { atual: E.atual, n: nFeitos(), c: canon(E) };
    const rota = location.hash.replace(/^#\/?/, '').split('/');
    const diaVisto = rota[0] === 'dia' ? parseInt(rota[1], 10) : (!rota[0] || rota[0] === 'hoje') ? E.atual : 0;
    const dig = diaVisto ? digitalDia(diaVisto) : '';
    const novo = mesclar(E, b);
    if (canon(novo) === antes.c) return { mudou: false, ganhou: 0 };
    E = novo; salvarLocal(); atualizarAnel();
    const ganhou = nFeitos() - antes.n;
    if (!D) return { mudou: true, ganhou };
    const ae = document.activeElement, digitando = !!ae && /^(TEXTAREA|INPUT)$/.test(ae.tagName) && main.contains(ae);
    if (E.atual !== antes.atual && (!rota[0] || rota[0] === 'hoje' || (rota[0] === 'dia' && diaVisto === antes.atual))) {
      toast(`☁️ Continuando do Dia ${E.atual}${origem ? ' · vindo do ' + origem : ''}`);
      if (!digitando) { if (rota[0] === 'dia') location.hash = '#/dia/' + E.atual; else render(); }
    } else if (digitando) { /* não atrapalha quem está escrevendo; aparece no próximo redesenho */ }
    else if (diaVisto) { if (digitalDia(diaVisto) !== dig) render(); }
    else if (!['busca', 'importar'].includes(rota[0])) render();
    return { mudou: true, ganhou };
  }

  function pintarNuvem() {
    const c = document.getElementById('nuvem'); if (!c) return;
    const txt = { off: 'Sincronização desligada — toque para ligar', sync: 'Sincronizando…', ok: 'Sincronizado' + (S.ultimo ? ' às ' + new Date(S.ultimo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''), erro: SY.msg || 'Erro na sincronização', offline: 'Sem internet — guardado neste aparelho' }[SY.estado];
    c.dataset.estado = SY.estado; c.title = txt; c.setAttribute('aria-label', '☁️ ' + txt);
    const st = document.getElementById('sync-status');
    if (st) st.innerHTML = SY.estado === 'off' ? '' : `<b>${{ sync: '🔄', ok: '✅', erro: '⚠️', offline: '⏸️' }[SY.estado]}</b> ${esc(txt)} · neste ${esc(APARELHO)}`;
  }
  function estadoNuvem(e, msg) { SY.estado = e; SY.msg = msg || ''; pintarNuvem(); }

  const PODE_NUVEM = NO_PAGES || location.protocol === 'file:';
  async function gh(caminho, opts = {}) {
    const h = { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + S.token, 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) h['Content-Type'] = 'application/json';
    const r = await fetch('https://api.github.com' + caminho, Object.assign({ cache: 'no-store' }, opts, { headers: h }));
    if (!r.ok) { const e = new Error('HTTP ' + r.status); e.status = r.status; e.limite = r.headers.get('x-ratelimit-remaining') === '0'; throw e; }
    return r.status === 204 ? null : r.json();
  }
  function msgErro(e) {
    if (!e.status) return navigator.onLine === false ? null : '🌐 GitHub fora do ar ou bloqueado nesta rede — guardado neste aparelho';
    if (e.status === 401) return '🔑 Chave recusada pelo GitHub (expirada, apagada ou digitada errada)';
    if (e.status === 403 && e.limite) return '⏳ Limite de acessos do GitHub — tento de novo daqui a pouco';
    if ((e.status === 403 || e.status === 404) && /^github_pat_/.test(S.token)) return '🔑 Essa chave é "fine-grained": gere uma chave classic com só a caixa gist marcada';
    if (e.status === 403 || e.status === 404) return '🔑 A chave não tem a permissão gist — gere outra marcando a caixa gist';
    return `⚠️ GitHub respondeu ${e.status} — tento de novo depois`;
  }
  async function lerGist() {
    const g = await gh('/gists/' + S.gist);
    const f = g.files && g.files[ARQ];
    if (!f) return null;
    let txt = f.content;
    if (f.truncated && f.raw_url) txt = await (await fetch(f.raw_url, { cache: 'no-store' })).text();
    try { return JSON.parse(txt); } catch (e) { return null; }
  }
  async function acharOuCriarGist() {
    for (let p = 1; p <= 5; p++) {
      const lista = await gh(`/gists?per_page=100&page=${p}`);
      const g = lista.find(x => x.files && x.files[ARQ]);
      if (g) return g.id;
      if (lista.length < 100) break;
    }
    const g = await gh('/gists', { method: 'POST', body: JSON.stringify({ description: DESC_GIST, public: false, files: { [ARQ]: { content: pacoteSync() } } }) });
    return g.id;
  }

  function sincronizar() {
    if (!S.token || !PODE_NUVEM) return Promise.resolve();
    if (SY.rodando) { if (SY.pendente) SY.denovo = true; return SY.rodando; }
    const mud0 = SY.mud;
    SY.rodando = (async () => {
      estadoNuvem('sync');
      try {
        if (!S.gist) { S.gist = await acharOuCriarGist(); salvarS(); }
        let remoto;
        try { remoto = await lerGist(); }
        catch (e) { if (e.status === 404) { S.gist = await acharOuCriarGist(); salvarS(); remoto = await lerGist(); } else throw e; }
        const b = remoto && remoto.estado ? sanear(remoto.estado) : null;
        if (b) aplicarDeFora(b, remoto.dispositivo && remoto.dispositivo !== APARELHO ? remoto.dispositivo : '');
        if (!b || canon(E) !== canon(b)) await gh('/gists/' + S.gist, { method: 'PATCH', body: JSON.stringify({ description: DESC_GIST, files: { [ARQ]: { content: pacoteSync() } } }) });
        SY.pendente = SY.mud !== mud0; S.ultimo = Date.now(); salvarS(); estadoNuvem('ok');
      } catch (e) {
        const m = msgErro(e);
        if (m === null) estadoNuvem('offline'); else estadoNuvem('erro', m);
      } finally {
        SY.rodando = null;
        if (SY.denovo) { SY.denovo = false; setTimeout(sincronizar, 400); }
      }
    })();
    return SY.rodando;
  }
  function agendarSync() {
    if (!S.token || !PODE_NUVEM) return;
    SY.pendente = true; SY.mud++; clearTimeout(SY.t); SY.t = setTimeout(sincronizar, 2500);
  }
  // ao sair do app com mudança ainda não enviada: envio rápido (o outro aparelho repõe o que for dele na próxima vez)
  function envioRapido() {
    if (!S.token || !S.gist || !SY.pendente || !PODE_NUVEM) return;
    clearTimeout(SY.t); SY.pendente = false;
    try { fetch('https://api.github.com/gists/' + S.gist, { method: 'PATCH', keepalive: true, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + S.token, 'Content-Type': 'application/json' }, body: JSON.stringify({ files: { [ARQ]: { content: pacoteSync() } } }) }).catch(() => {}); } catch (e) { /* ignora */ }
  }
  async function conectar(token) {
    S.token = token; S.gist = '';
    estadoNuvem('sync');
    try {
      await gh('/gists?per_page=1');
      S.gist = await acharOuCriarGist(); salvarS();
      await sincronizar();
      if (SY.estado === 'ok') { toast(`☁️ Sincronização ligada · ${nFeitos()} dias · Dia atual ${E.atual}`); return true; }
      return false;
    } catch (e) {
      const m = msgErro(e) || '⏸️ Sem internet agora — tente ligar quando a conexão voltar';
      S.token = ''; S.gist = ''; salvarS(); estadoNuvem('erro', m); toast(m); return false;
    }
  }
  function desligar() { S.token = ''; S.gist = ''; S.ultimo = 0; salvarS(); clearTimeout(SY.t); SY.pendente = false; estadoNuvem('off'); }

  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar(); else envioRapido(); });
  window.addEventListener('pagehide', envioRapido);
  window.addEventListener('online', () => sincronizar());
  window.addEventListener('focus', () => { if (S.token && Date.now() - (S.ultimo || 0) > 20000) sincronizar(); });
  setInterval(() => { if (document.visibilityState === 'visible') sincronizar(); }, 90000);

  // ---- link de transferência (sem chave): #/importar/<código> ----
  const b64url = bytes => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const deB64url = s => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  async function codificar() {
    const json = JSON.stringify({ app: 'bsj365', v: 2, dispositivo: APARELHO, estado: estadoSync(E) });
    const bytes = new TextEncoder().encode(json);
    if (typeof CompressionStream === 'function') {
      try { const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); return 'z.' + b64url(z); } catch (e) { /* sem compressão */ }
    }
    return 'j.' + b64url(bytes);
  }
  async function decodificar(cod) {
    cod = String(cod || '').trim();
    const m = /#\/importar\/([A-Za-z0-9._-]+)/.exec(cod); if (m) cod = m[1];
    if (/^[zj]\.[A-Za-z0-9_-]+$/.test(cod)) {
      let bytes = deB64url(cod.slice(2));
      if (cod[0] === 'z') {
        if (typeof DecompressionStream !== 'function') throw new Error('Este navegador não abre o código compactado — atualize-o ou use o backup em arquivo');
        bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
      }
      cod = new TextDecoder().decode(bytes);
    }
    const j = JSON.parse(cod), est = j.estado || j;
    if (!est || typeof est !== 'object' || typeof est.feitos !== 'object') throw new Error('Código ou backup não reconhecido');
    return { est: sanear(est), dispositivo: typeof j.dispositivo === 'string' ? j.dispositivo.slice(0, 30) : '' };
  }
  async function enviarPorLink() {
    const cod = await codificar();
    const url = `${APP_GITHUB}#/importar/${cod}`;
    const texto = `📖🔥 Meu progresso na Bíblia Sem Jaula 365 · ${nFeitos()} dias · Dia atual ${E.atual}`;
    try { if (navigator.share) { await navigator.share({ title: 'Bíblia Sem Jaula 365 · progresso', text: texto, url }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('📋 Link copiado — abra no outro aparelho'); }
    catch (e) { const t = document.getElementById('colar'); if (t) { t.value = url; t.closest('details').open = true; t.select(); } toast('📋 Copie o link do quadro abaixo'); }
  }

  async function viewImportar(cod) {
    main.innerHTML = '<div class="carregando"><p>📥 Lendo o progresso recebido…</p></div>';
    let r;
    try { r = await decodificar(cod); }
    catch (e) { main.innerHTML = `<section class="codice bloco"><h1 class="titulo-sec">📥 Receber progresso</h1><p class="aviso">⚠️ ${esc(e.message || 'Link incompleto ou corrompido')}.</p><div class="acoes"><a class="btn ouro" href="#/hoje">📖 Voltar à leitura</a></div></section>`; return; }
    const n = Object.keys(r.est.feitos).filter(k => r.est.feitos[k] > 0).length;
    main.innerHTML = `<section class="codice bloco"><p class="kicker">Continuar de onde parou</p><h1 class="titulo-sec">📥 Progresso recebido${r.dispositivo ? ' do ' + esc(r.dispositivo) : ''}</h1>
      <div class="resumo"><div class="stat"><b>${n}</b><span>dias concluídos</span></div><div class="stat"><b>${r.est.atual}</b><span>dia atual</span></div><div class="stat"><b>${Object.keys(r.est.notas).length}</b><span>notas</span></div></div>
      <p class="aviso">🛡️ <b>Junta</b> com o que já está aqui — nada se apaga; em cada dia vale a mudança mais recente.</p>
      <div class="acoes"><button class="btn ouro grande" id="juntar">✅ Juntar e continuar</button><a class="btn" href="#/hoje">Cancelar</a></div></section>`;
    document.getElementById('juntar').addEventListener('click', () => {
      const x = aplicarDeFora(r.est, '');
      agendarSync();
      toast(x.mudou ? `✅ Progresso juntado · ${nFeitos()} dias · continue no Dia ${E.atual}` : '✅ Já estava tudo igual aqui');
      history.replaceState(null, '', '#/dia/' + E.atual); render();
    });
  }

  /* ---------------- views ---------------- */
  function viewDia(n) {
    const d = DIA[n]; if (!d) return viewDia(1);
    irPara(n);
    const s = SEM[d.w];
    const feito = on(E.feitos, n);
    let primeira = true;
    const passagens = d.r.map((r, ri) => {
      const txt = r.v.map(([vn, vt], vi) => {
        const k = `${n}|${ri}|${vn}`;
        let corpo = esc(vt), num = `<span class="vn">${vn}</span>`;
        if (primeira && vi === 0 && /^[A-Za-zÀ-ÿ]/.test(vt)) { corpo = `<span class="capitular" aria-hidden="true">${esc(vt[0])}</span><span class="sr">${esc(vt[0])}</span>${esc(vt.slice(1))}`; num = ''; }
        primeira = false;
        return `<span class="vs${on(E.marcas, k) ? ' marcado' : ''}" data-k="${k}" tabindex="0" role="button" aria-pressed="${on(E.marcas, k)}">${num}${corpo}</span> `;
      }).join('');
      return `<div class="passagem"><h3>${esc(r.ref)}</h3><p class="texto">${txt}</p></div>`;
    }).join('');
    const conceitos = d.c.map(([t, x]) => `<div class="conceito"><b>${esc(t)}</b><span>${esc(cap(x))}.</span></div>`).join('');
    main.innerHTML = `
      <div class="ajustes" role="group" aria-label="Ajustes de leitura">
        <button class="btn peq" data-acao="menor" aria-label="Diminuir letra">A−</button>
        <button class="btn peq" data-acao="maior" aria-label="Aumentar letra">A+</button>
        <button class="btn peq" data-acao="fonte" aria-pressed="${E.fonte === 'dislexia'}">🔤 ${E.fonte === 'dislexia' ? FA : 'Lora'}</button>
        <button class="btn peq" data-acao="tema">${E.tema === 'pergaminho' ? '🌙 Códice' : '☀️ Pergaminho'}</button>
      </div>
      <article class="codice folio" aria-labelledby="titulo-dia">
        <header class="folio-cabeca">
          <div class="medalha${feito ? ' feito' : ''}"><small>DIA</small><b>${n}</b></div>
          <div class="folio-info">
            <p class="semana"><a href="#/semana/${d.w}">Semana ${d.w}</a> · ${esc(s.t)} · dia ${d.dw} de ${s.d.length}</p>
            <h1 id="titulo-dia">${esc(d.t)}</h1>
            <p class="meta">📖 ${esc(d.l)} · ⏱️ ~${d.m} min</p>
          </div>
        </header>
        <h2 class="rotulo">📖 Leitura</h2>
        ${passagens}
        <p class="dica-vs">✨ Toque num versículo para marcá-lo no seu caderno.</p>
        <h2 class="rotulo">💡 3 conceitos</h2>
        <div class="conceitos">${conceitos}</div>
        <figure class="sabedoria"><q>${esc(d.sab)}</q><small>⚔️ palavra de sabedoria · conteúdo editorial</small></figure>
        <label class="missao"><input type="checkbox" id="missao" ${on(E.missoes, n) ? 'checked' : ''}><span><b>🎯 Missão do dia</b><span>${esc(d.mis)}</span></span></label>
        <section class="nota">
          <h2 class="rotulo">✍️ Minha nota <span class="sr">do dia ${n}</span></h2>
          <textarea id="nota" placeholder="1 linha basta…" aria-label="Minha nota do dia ${n}">${esc(E.notas[n] || '')}</textarea>
          <small id="nota-status"></small>
        </section>
        <div class="acoes">
          <button class="btn grande ${feito ? 'feito' : 'ouro'}" data-acao="concluir">${feito ? '✅ Dia concluído · desmarcar' : `✅ Concluir o dia ${n}`}</button>
          <button class="btn" data-acao="compartilhar">📤 Compartilhar</button>
          <a class="btn" href="${pdfSemana(d.w)}" target="_blank" rel="noopener">📄 PDF da semana ${d.w}</a>
        </div>
        <div class="nav-dias">
          ${n > 1 ? `<a class="btn" href="#/dia/${n - 1}">◀ Dia ${n - 1}</a>` : ''}
          ${n < 365 ? `<a class="btn" href="#/dia/${n + 1}">Dia ${n + 1} ▶</a>` : ''}
        </div>
      </article>`;
    // eventos
    main.querySelectorAll('.vs').forEach(el => {
      const marcarVs = () => {
        const k = el.dataset.k, liga = !on(E.marcas, k);
        alternar(E.marcas, k, liga);
        el.classList.toggle('marcado', liga); el.setAttribute('aria-pressed', String(liga)); salvar();
        toast(liga ? '⭐ Versículo marcado' : 'Marcação removida');
      };
      el.addEventListener('click', marcarVs);
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); marcarVs(); } });
    });
    document.getElementById('missao').addEventListener('change', ev => {
      alternar(E.missoes, n, ev.target.checked);
      salvar(); toast(ev.target.checked ? '🎯 Missão cumprida!' : 'Missão desmarcada');
    });
    const nota = document.getElementById('nota'), st = document.getElementById('nota-status');
    let tNota;
    nota.addEventListener('input', () => {
      clearTimeout(tNota); st.textContent = '…';
      tNota = setTimeout(() => { const v = nota.value.trim(); if (v) E.notas[n] = nota.value; else delete E.notas[n]; E.notasT[n] = carimbo(E.notasT, n); salvar(); st.textContent = S.token ? '💾 Nota salva · ☁️ vai para os outros aparelhos' : '💾 Nota salva neste aparelho'; }, 500);
    });
    main.querySelector('[data-acao="concluir"]').addEventListener('click', () => {
      if (on(E.feitos, n)) { alternar(E.feitos, n, false); salvar(); atualizarAnel(); toast('Dia desmarcado'); render(); return; }
      alternar(E.feitos, n, true); salvar(); atualizarAnel();
      const prox = n < 365 ? n + 1 : n;
      toast(n === 365 ? '🏆 Ciclo completo! 365 de 365' : `🔥 Dia ${n} concluído · ${nFeitos()} de 365`);
      if (prox !== n) setTimeout(() => { location.hash = `#/dia/${prox}`; }, 700); else render();
    });
    main.querySelector('[data-acao="compartilhar"]').addEventListener('click', () => compartilhar(d));
    ligarAjustes();
  }

  function ligarAjustes() {
    main.querySelectorAll('[data-acao="menor"],[data-acao="maior"],[data-acao="fonte"],[data-acao="tema"]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.acao;
      if (a === 'menor') E.tam = Math.max(0.85, +(E.tam - 0.1).toFixed(2));
      if (a === 'maior') E.tam = Math.min(1.6, +(E.tam + 0.1).toFixed(2));
      if (a === 'fonte') E.fonte = E.fonte === 'dislexia' ? 'lora' : 'dislexia';
      if (a === 'tema') E.tema = E.tema === 'pergaminho' ? 'codice' : 'pergaminho';
      salvarLocal(); aplicarPrefs();
      if (a === 'fonte' || a === 'tema') render();
    }));
  }

  async function compartilhar(d) {
    const url = `${location.origin}${location.pathname}#/dia/${d.n}`;
    const txt = `📖🔥 Bíblia Sem Jaula 365 — Dia ${d.n}: ${d.t}\n📖 ${d.l}\n⚔️ “${d.sab}”\n🎯 Missão: ${d.mis}\n🔗 ${url}`;
    try {
      if (navigator.share) { await navigator.share({ title: `Bíblia Sem Jaula 365 · Dia ${d.n}`, text: txt }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(txt); toast('📋 Texto copiado — cole no WhatsApp'); }
    catch (e) { window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank', 'noopener'); }
  }

  function linhaDia(i) {
    const d = DIA[i], ok = on(E.feitos, i);
    return `<li><a href="#/dia/${i}" class="${E.atual === i ? 'atual' : ''}"><span class="ck${ok ? ' ok' : ''}" aria-label="${ok ? 'concluído' : 'pendente'}">${ok ? '✅' : '☐'}</span><span class="dn">Dia ${i}</span><span class="dt">${esc(d.t)}<small>${esc(d.l)}</small></span></a></li>`;
  }

  function viewPlano() {
    const n = nFeitos(), sq = sequencias();
    const semAtual = DIA[E.atual].w;
    main.innerHTML = `
      <p class="kicker">Mapa do caminho</p>
      <h1 class="titulo-sec">🗺️ O plano em 53 semanas</h1>
      <p class="sub-sec">52 semanas temáticas + 1 dia de encerramento.</p>
      <div class="resumo">
        <div class="stat"><b>${n}</b><span>dias concluídos de 365</span></div>
        <div class="stat"><b>${Math.round(n / 3.65)}%</b><span>do ciclo</span></div>
        <div class="stat"><b>${sq.atual}</b><span>dias seguidos 🔥</span></div>
        <div class="stat"><b>${semAtual}</b><span>semana atual</span></div>
      </div>
      <div class="barra" aria-hidden="true"><i style="width:${(n / 365 * 100).toFixed(1)}%"></i></div>
      <div class="acoes"><a class="btn ouro" href="#/dia/${E.atual}">📖 Continuar no Dia ${E.atual}</a><a class="btn" href="${PDF_VOLUME}" target="_blank" rel="noopener">📚 PDF completo (365 dias)</a></div>
      <hr class="filete">
      <div class="semanas">${D.semanas.map(s => {
        const k = feitosSemana(s.n), tot = s.d.length;
        return `<details class="semana" id="s${s.n}" ${s.n === semAtual ? 'open' : ''}>
          <summary><span class="sem-num${k === tot ? ' completa' : ''}">${s.n}</span><span class="sem-tit"><b>${esc(s.t)}</b><small>Dias ${s.d[0]}${tot > 1 ? '–' + s.d[tot - 1] : ''}</small></span><span class="sem-prog">${k}/${tot}</span></summary>
          <div class="sem-corpo"><p class="sub">${esc(s.s)}</p><ul class="lista-dias">${s.d.map(linhaDia).join('')}</ul>
          <div class="acoes"><a class="btn peq" href="#/semana/${s.n}">🛡️ Abrir a semana</a><a class="btn peq" href="${pdfSemana(s.n)}" target="_blank" rel="noopener">📄 PDF da semana</a></div></div>
        </details>`;
      }).join('')}</div>`;
    const aberta = document.getElementById('s' + semAtual);
    if (aberta && semAtual > 1) setTimeout(() => aberta.scrollIntoView({ block: 'start' }), 60);
  }

  function viewSemana(n) {
    const s = SEM[n]; if (!s) return viewPlano();
    const rotas = D.rotas.filter(r => r.id !== 'historia' && r.weekNumbers.includes(n));
    const k = feitosSemana(n);
    main.innerHTML = `
      <section class="cab-semana"><p class="kicker">Semana ${n} de 53</p><h1>${esc(s.t)}</h1><p>${esc(s.s)}</p></section>
      <div class="barra" aria-hidden="true"><i style="width:${(k / s.d.length * 100).toFixed(0)}%"></i></div>
      <p class="aviso">✅ ${k} de ${s.d.length} dias concluídos</p>
      <h2 class="rotulo">✅ Checklist da semana</h2>
      <ul class="lista-dias">${s.d.map(linhaDia).join('')}</ul>
      ${rotas.length ? `<h2 class="rotulo">🧭 Também faz parte das rotas</h2><div class="chips">${rotas.map(r => `<a class="chip" href="#/rota/${r.id}">${ROTA_EMO[r.id] || '•'} ${esc(r.title)}</a>`).join('')}</div>` : ''}
      <div class="acoes"><a class="btn ouro" href="#/dia/${s.d.find(i => !on(E.feitos, i)) || s.d[0]}">📖 Ler agora</a><a class="btn" href="${pdfSemana(n)}" target="_blank" rel="noopener">📄 PDF da semana ${n}</a></div>
      <div class="nav-dias">${n > 1 ? `<a class="btn" href="#/semana/${n - 1}">◀ Semana ${n - 1}</a>` : ''}${n < 53 ? `<a class="btn" href="#/semana/${n + 1}">Semana ${n + 1} ▶</a>` : ''}</div>`;
  }

  function viewRotas() {
    main.innerHTML = `
      <p class="kicker">Escolha pelo momento</p>
      <h1 class="titulo-sec">🧭 Rotas temáticas</h1>
      <p class="sub-sec">Oito caminhos pelo mesmo códice — para o dia que você está vivendo.</p>
      <div class="rotas">${D.rotas.map(r => {
        const dias = r.weekNumbers.flatMap(w => SEM[w].d), ok = dias.filter(i => on(E.feitos, i)).length;
        return `<article class="codice rota"><span class="emo" aria-hidden="true">${ROTA_EMO[r.id] || '•'}</span><h2>${esc(r.title)}</h2>
          <div class="barra" aria-hidden="true"><i style="width:${(ok / dias.length * 100).toFixed(0)}%"></i></div>
          <p class="aviso">${r.weekNumbers.length} semanas · ${ok}/${dias.length} dias</p>
          <a class="btn peq" href="#/rota/${r.id}">Abrir a rota →</a></article>`;
      }).join('')}</div>`;
  }

  function viewRota(id) {
    const r = D.rotas.find(x => x.id === id); if (!r) return viewRotas();
    const prox = r.weekNumbers.flatMap(w => SEM[w].d).find(i => !on(E.feitos, i));
    main.innerHTML = `
      <p class="kicker">Rota temática</p>
      <h1 class="titulo-sec">${ROTA_EMO[r.id] || '•'} ${esc(r.title)}</h1>
      <div class="acoes">${prox ? `<a class="btn ouro" href="#/dia/${prox}">📖 Próximo dia da rota: ${prox}</a>` : '<span class="aviso">🏆 Rota completa!</span>'}<a class="btn" href="#/rotas">◀ Todas as rotas</a></div>
      <hr class="filete">
      <div class="semanas">${r.weekNumbers.map(w => { const s = SEM[w], k = feitosSemana(w);
        return `<details class="semana"><summary><span class="sem-num${k === s.d.length ? ' completa' : ''}">${w}</span><span class="sem-tit"><b>${esc(s.t)}</b><small>${esc(s.s)}</small></span><span class="sem-prog">${k}/${s.d.length}</span></summary><div class="sem-corpo"><ul class="lista-dias">${s.d.map(linhaDia).join('')}</ul></div></details>`; }).join('')}</div>`;
  }

  function viewBusca(q) {
    main.innerHTML = `
      <p class="kicker">Procurar no códice</p>
      <h1 class="titulo-sec">🔎 Busca</h1>
      <form class="campo-busca" role="search"><label class="sr" for="q">Buscar</label><input id="q" type="search" placeholder="Ex.: luz, perdão, Rute, coragem…" value="${esc(q || '')}" autocomplete="off"><button class="btn ouro" type="submit">Buscar</button></form>
      <p class="aviso">Procura em títulos, leituras, conceitos, sabedoria e missões, sem ligar para acentos. 📜 O texto bíblico está na grafia de 1911 — tente também <i>creou</i>, <i>elle</i>, <i>Christo</i>.</p>
      <div id="resultados" aria-live="polite"></div>`;
    const input = document.getElementById('q'), out = document.getElementById('resultados');
    const buscar = () => {
      const termo = input.value.trim(); history.replaceState(null, '', '#/busca' + (termo ? '?q=' + encodeURIComponent(termo) : ''));
      if (termo.length < 2) { out.innerHTML = ''; return; }
      const nt = norm(termo), res = [];
      const marca = txt => { const t = norm(txt); const i = t.indexOf(nt); if (i < 0) return null; const a = Math.max(0, i - 60), b = Math.min(txt.length, i + nt.length + 80);
        return (a > 0 ? '…' : '') + esc(txt.slice(a, i)) + '<mark>' + esc(txt.slice(i, i + nt.length)) + '</mark>' + esc(txt.slice(i + nt.length, b)) + (b < txt.length ? '…' : ''); };
      for (const d of D.dias) {
        const campos = [['Título', d.t], ['Leitura', d.l], ...d.c.map(c => ['Conceito', c[0] + ' — ' + c[1]]), ['Sabedoria', d.sab], ['Missão', d.mis]];
        d.r.forEach(r => r.v.forEach(([vn, vt]) => campos.push([`${r.ref.split(':')[0]}:${vn}`, vt])));
        for (const [onde, txt] of campos) { const m = marca(txt); if (m) { res.push({ d, onde, m }); break; } }
        if (res.length >= 80) break;
      }
      out.innerHTML = res.length ? `<p class="aviso">${res.length}${res.length >= 80 ? '+' : ''} resultado(s)</p>` + res.map(x => `<a class="resultado" href="#/dia/${x.d.n}"><b>Dia ${x.d.n} · ${esc(x.d.t)}</b><small>${esc(x.onde)} · Semana ${x.d.w}</small><p>${x.m}</p></a>`).join('') : '<p class="vazio">Nada encontrado. Tente outra palavra ou a grafia antiga.</p>';
    };
    main.querySelector('form').addEventListener('submit', ev => { ev.preventDefault(); buscar(); });
    let tb; input.addEventListener('input', () => { clearTimeout(tb); tb = setTimeout(buscar, 250); });
    if (q) buscar(); else input.focus({ preventScroll: true });
  }

  function viewCaderno() {
    const n = nFeitos(), sq = sequencias();
    const minutos = Object.keys(E.feitos).filter(i => on(E.feitos, i)).reduce((a, i) => a + (DIA[i] ? DIA[i].m : 0), 0);
    const notas = Object.keys(E.notas).filter(i => E.notas[i] && DIA[i]).map(Number).sort((a, b) => a - b);
    const marcas = Object.keys(E.marcas).filter(k => on(E.marcas, k)).sort((a, b) => { const [x] = a.split('|'), [y] = b.split('|'); return x - y; });
    const textoMarca = k => { const [d, ri, vn] = k.split('|').map(Number); const r = DIA[d] && DIA[d].r[ri]; if (!r) return null; const v = r.v.find(x => x[0] === vn); return v ? { d, ref: `${r.ref.split(':')[0]}:${vn}`, t: v[1] } : null; };
    main.innerHTML = `
      <p class="kicker">Seu registro</p>
      <h1 class="titulo-sec">✍️ Caderno</h1>
      <div class="resumo">
        <div class="stat"><b>${n}</b><span>dias concluídos</span></div>
        <div class="stat"><b>${sq.atual}</b><span>sequência atual 🔥</span></div>
        <div class="stat"><b>${sq.maior}</b><span>maior sequência</span></div>
        <div class="stat"><b>${Math.round(minutos / 60 * 10) / 10}h</b><span>de leitura (≈ ${minutos} min)</span></div>
      </div>
      <section class="codice bloco"><h2>📝 Notas (${notas.length})</h2>
        <div class="notas-lista">${notas.length ? notas.map(i => `<a class="nota-item" href="#/dia/${i}"><small>Dia ${i} · ${esc(DIA[i].t)}</small><p>${esc(E.notas[i])}</p></a>`).join('') : '<p class="vazio">Suas notas do dia aparecem aqui.</p>'}</div></section>
      <section class="codice bloco"><h2>⭐ Versículos marcados (${marcas.length})</h2>
        <div class="notas-lista">${marcas.length ? marcas.map(textoMarca).filter(Boolean).map(m => `<a class="nota-item" href="#/dia/${m.d}"><small>${esc(m.ref)} · Dia ${m.d}</small><p>${esc(m.t)}</p></a>`).join('') : '<p class="vazio">Toque num versículo durante a leitura para guardá-lo aqui.</p>'}</div></section>
      <section class="codice bloco"><h2>⚙️ Preferências</h2>
        <div class="preferencias">
          <div class="pref"><span>🎨 Tema</span><div class="seg" role="group" aria-label="Tema"><button data-pref="tema" data-v="codice" aria-pressed="${E.tema === 'codice'}">🌙 Códice</button><button data-pref="tema" data-v="pergaminho" aria-pressed="${E.tema === 'pergaminho'}">☀️ Pergaminho</button></div></div>
          <div class="pref"><span>🔤 Fonte de leitura</span><div class="seg" role="group" aria-label="Fonte"><button data-pref="fonte" data-v="lora" aria-pressed="${E.fonte === 'lora'}">Lora</button><button data-pref="fonte" data-v="dislexia" aria-pressed="${E.fonte === 'dislexia'}">${FA}</button></div></div>
          <div class="pref"><span>🔠 Tamanho da letra</span><div class="seg" role="group" aria-label="Tamanho"><button data-pref="tam" data-v="0.9" aria-pressed="${E.tam <= 0.95}">P</button><button data-pref="tam" data-v="1" aria-pressed="${E.tam > 0.95 && E.tam < 1.15}">M</button><button data-pref="tam" data-v="1.2" aria-pressed="${E.tam >= 1.15 && E.tam < 1.35}">G</button><button data-pref="tam" data-v="1.4" aria-pressed="${E.tam >= 1.35}">GG</button></div></div>
          <div class="pref"><span>🧭 Ir para o dia</span><form class="pular-dia" id="pular"><label class="sr" for="dia-n">Número do dia</label><input id="dia-n" type="number" min="1" max="365" inputmode="numeric" value="${E.atual}"><button class="btn peq" type="submit">Ir</button></form></div>
        </div></section>
      <section class="codice bloco" id="sec-sync"><h2>☁️ Continuar em outro aparelho</h2>
        <p class="aviso">Use o jeito que der <b>no momento</b> — os três juntam o progresso, sem apagar nada. Em cada dia vale a mudança <b>mais recente</b>; o app abre no <b>último dia que você leu</b>.</p>
        <h3 class="sync-tit">1 · ☁️ Automático · iPhone ↔ Mac</h3>
        ${!PODE_NUVEM ? `<p class="aviso">⚠️ Nesta cópia a nuvem não funciona. Abra o app pelo link do GitHub: <a href="${APP_GITHUB}" target="_blank" rel="noopener">${APP_GITHUB.replace('https://', '')}</a></p>`
        : S.token ? `<p class="sync-status" id="sync-status" aria-live="polite"></p>
          <div class="acoes"><button class="btn ouro" id="sync-agora">🔄 Sincronizar agora</button><button class="btn" id="sync-desligar">🔌 Desligar neste aparelho</button></div>
          <p class="aviso">Liga uma vez em cada aparelho. Depois é sozinho: ao abrir, ao voltar ao app e alguns segundos após cada mudança.</p>`
        : `<p class="sync-status" id="sync-status" aria-live="polite"></p><ol class="passos">
            <li>Gere a chave no GitHub: <a href="${LINK_TOKEN}" target="_blank" rel="noopener">🔑 abrir a página da chave</a> — marque <b>só “gist”</b> e validade <b>No expiration</b>. Já tem a chave do <b>Códice 360X</b>? Pode usar a mesma.</li>
            <li>Cole a chave aqui e toque em Ligar:
              <form class="linha-sync" id="sync-form"><label class="sr" for="sync-token">Chave do GitHub</label><input id="sync-token" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="ghp_…" required><button class="btn ouro" type="submit">☁️ Ligar</button></form></li>
            <li>Faça o mesmo no outro aparelho (iPhone e Mac). Pronto.</li></ol>
          <p class="aviso">🔒 A chave fica só neste navegador e só vai para o GitHub. O progresso fica num <b>Gist secreto</b> da sua conta (arquivo ${ARQ}).</p>`}
        <h3 class="sync-tit">2 · 📲 Por link (sem chave, sem cadastro)</h3>
        <div class="acoes"><button class="btn" id="enviar-link">📲 Enviar meu progresso</button></div>
        <p class="aviso">Gera um link: mande por <b>AirDrop</b>, WhatsApp para você mesmo ou Notas, e abra no outro aparelho.</p>
        <details class="colar"><summary>📥 Colar link, código ou backup recebido</summary>
          <label class="sr" for="colar">Link, código ou backup</label><textarea id="colar" rows="3" placeholder="Cole aqui o link ou o texto do backup"></textarea>
          <div class="acoes"><button class="btn ouro" id="aplicar-colar">✅ Juntar ao meu progresso</button></div></details>
        <h3 class="sync-tit">3 · 📄 Li no PDF / no papel</h3>
        <form class="linha-sync" id="pdf-ate"><label for="pdf-dia">Li até o dia</label><input id="pdf-dia" type="number" min="1" max="365" inputmode="numeric" value="${Math.max(1, E.atual - 1)}">
          <button class="btn ouro" type="submit">✅ Marcar 1→X e seguir</button><button class="btn" type="button" id="pdf-ir">📍 Só continuar daqui</button></form>
        <p class="aviso">“Marcar” conclui os dias de 1 até X que estavam abertos e abre o dia seguinte. “Só continuar” apenas leva você ao dia X+1.</p></section>
      <section class="codice bloco"><h2>🛡️ Backup em arquivo</h2>
        <p class="aviso">Cópia de segurança completa (inclui tema e letra). Importar <b>junta</b> com o que já está aqui.</p>
        <div class="acoes">
          <button class="btn" id="exportar">⬇️ Exportar backup</button>
          <label class="btn" for="importar">⬆️ Importar backup</label><input id="importar" type="file" accept="application/json,.json" class="sr">
          <button class="btn" id="copiar">📋 Copiar backup</button>
          <button class="btn perigo" id="zerar">🧹 Zerar progresso</button>
        </div></section>
      <section class="codice bloco"><h2>📲 Instalar como app</h2>
        <p class="aviso"><b>iPhone/iPad:</b> Safari → Compartilhar → <i>Adicionar à Tela de Início</i>. <b>Mac:</b> Safari → Arquivo → <i>Adicionar ao Dock</i>. <b>Android/Chrome:</b> menu ⋮ → <i>Instalar app</i>. Depois da primeira abertura, funciona sem internet.</p>
        ${instalar ? '<div class="acoes"><button class="btn ouro" id="instalar">📲 Instalar agora</button></div>' : ''}
        <div class="acoes"><a class="btn" href="${PDF_VOLUME}" target="_blank" rel="noopener">📚 PDF completo (439 páginas)</a></div></section>`;
    main.querySelectorAll('[data-pref]').forEach(b => b.addEventListener('click', () => { const p = b.dataset.pref; E[p] = p === 'tam' ? +b.dataset.v : b.dataset.v; salvarLocal(); aplicarPrefs(); render(); }));
    // ---- sincronização ----
    pintarNuvem();
    const fs = document.getElementById('sync-form');
    if (fs) fs.addEventListener('submit', async ev => {
      ev.preventDefault();
      const inp = document.getElementById('sync-token'), tk = inp.value.trim(), bt = fs.querySelector('button');
      if (!/^(ghp_|github_pat_|gho_)?[A-Za-z0-9_]{20,}$/.test(tk)) { toast('⚠️ Isso não parece uma chave do GitHub'); return; }
      bt.disabled = true; bt.textContent = '⏳ Ligando…';
      const ok = await conectar(tk); inp.value = '';
      if (ok) render(); else { bt.disabled = false; bt.textContent = '☁️ Ligar'; }
    });
    const ba = document.getElementById('sync-agora');
    if (ba) ba.addEventListener('click', async () => { ba.disabled = true; await sincronizar(); ba.disabled = false; toast(SY.estado === 'ok' ? `✅ Sincronizado · ${nFeitos()} dias · Dia atual ${E.atual}` : (SY.msg || '⏸️ Sem internet — tento de novo sozinho')); });
    const bd = document.getElementById('sync-desligar'); let armD = false;
    if (bd) bd.addEventListener('click', () => {
      if (!armD) { armD = true; bd.textContent = '⚠️ Toque de novo para desligar'; setTimeout(() => { armD = false; bd.textContent = '🔌 Desligar neste aparelho'; }, 5000); return; }
      desligar(); toast('🔌 Sincronização desligada neste aparelho · o progresso continua aqui'); render();
    });
    document.getElementById('enviar-link').addEventListener('click', () => enviarPorLink().catch(() => toast('⚠️ Não consegui gerar o link — use Copiar backup')));
    document.getElementById('aplicar-colar').addEventListener('click', async () => {
      const t = document.getElementById('colar');
      try { const r = await decodificar(t.value); const x = aplicarDeFora(r.est, ''); agendarSync(); t.value = ''; toast(x.mudou ? `✅ Juntado · ${nFeitos()} dias · continue no Dia ${E.atual}` : '✅ Já estava tudo igual aqui'); render(); }
      catch (e) { toast('⚠️ ' + (e.message && !/JSON|Unexpected|atob|character/i.test(e.message) ? e.message : 'Não reconheci esse link ou backup')); }
    });
    const fp = document.getElementById('pdf-ate');
    const aplicarPdf = modo => {
      const x = Math.min(365, Math.max(1, parseInt(document.getElementById('pdf-dia').value, 10) || 1));
      let novos = 0;
      if (modo === 'marcar') for (let i = 1; i <= x; i++) if (!on(E.feitos, i)) { alternar(E.feitos, i, true); novos++; }
      const prox = Math.min(365, x + 1);
      E.atualT = Math.max(Date.now(), (E.atualT || 0) + 1); E.atual = prox; salvar(); atualizarAnel();
      toast(modo === 'marcar' ? `✅ ${novos} dia(s) marcados · continue no Dia ${prox}` : `📍 Continue no Dia ${prox}`);
      location.hash = '#/dia/' + prox;
    };
    fp.addEventListener('submit', ev => { ev.preventDefault(); aplicarPdf('marcar'); });
    document.getElementById('pdf-ir').addEventListener('click', () => aplicarPdf('ir'));
    document.getElementById('pular').addEventListener('submit', ev => { ev.preventDefault(); const v = Math.min(365, Math.max(1, parseInt(document.getElementById('dia-n').value, 10) || 1)); location.hash = '#/dia/' + v; });
    const pacote = () => JSON.stringify({ app: 'biblia-sem-jaula-365', versao: 2, autor: AUTOR, exportado: new Date().toISOString(), dispositivo: APARELHO, estado: E });
    document.getElementById('exportar').addEventListener('click', () => {
      const blob = new Blob([pacote()], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `biblia-sem-jaula-365_backup_${dataLocal(Date.now())}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('⬇️ Backup exportado');
    });
    document.getElementById('copiar').addEventListener('click', async () => { try { await navigator.clipboard.writeText(pacote()); toast('📋 Backup copiado'); } catch (e) { toast('⚠️ Não consegui copiar — use Exportar'); } });
    document.getElementById('importar').addEventListener('change', async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); const est = j.estado || j; if (!est || typeof est.feitos !== 'object') throw new Error('formato');
        const x = aplicarDeFora(sanear(est), ''); agendarSync();
        toast(x.mudou ? `✅ Backup juntado · ${nFeitos()} dias · Dia atual ${E.atual}` : (E.zerado ? '✅ Nada novo — ou o backup é de antes do último Zerar' : '✅ Já estava tudo igual aqui')); render();
      } catch (e) { toast('⚠️ Arquivo de backup inválido'); }
    });
    const zerar = document.getElementById('zerar'); let armado = false, tz;
    zerar.addEventListener('click', () => {
      if (!armado) { armado = true; zerar.textContent = '⚠️ Toque de novo para confirmar'; tz = setTimeout(() => { armado = false; zerar.textContent = '🧹 Zerar progresso'; }, 5000); return; }
      clearTimeout(tz);
      // guarda a data do zerar: vale também para o que estiver em outros aparelhos sincronizados
      const z = Math.max(Date.now(), (E.zerado || 0) + 1, (E.atualT || 0) + 1);
      E.zerado = z; E.feitos = {}; E.missoes = {}; E.marcas = {}; E.notas = {}; E.notasT = {}; E.atual = 1; E.atualT = z;
      salvar(); atualizarAnel(); toast(S.token ? '🧹 Progresso zerado aqui e nos aparelhos sincronizados' : '🧹 Progresso zerado'); render();
    });
    const bi = document.getElementById('instalar');
    if (bi) bi.addEventListener('click', async () => { instalar.prompt(); await instalar.userChoice; instalar = null; render(); });
  }

  /* ---------------- roteador ---------------- */
  function render() {
    const h = location.hash.replace(/^#\/?/, '');
    const [rota, resto] = h.split('/');
    const [base, qs] = (rota || 'hoje').split('?');
    const aba = { hoje: 'hoje', dia: 'hoje', plano: 'plano', semana: 'plano', rotas: 'rotas', rota: 'rotas', busca: 'busca', caderno: 'caderno', sincronizar: 'caderno', importar: 'caderno' }[base] || 'hoje';
    document.querySelectorAll('.abas a').forEach(a => { if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (base === 'dia') viewDia(Math.min(365, Math.max(1, parseInt(resto, 10) || 1)));
    else if (base === 'plano') viewPlano();
    else if (base === 'semana') viewSemana(parseInt(resto, 10));
    else if (base === 'rotas') viewRotas();
    else if (base === 'rota') viewRota(resto);
    else if (base === 'busca') viewBusca(qs ? decodeURIComponent((qs.match(/q=([^&]*)/) || [])[1] || '') : '');
    else if (base === 'caderno') viewCaderno();
    else if (base === 'sincronizar') { viewCaderno(); const sec = document.getElementById('sec-sync'); if (sec) setTimeout(() => sec.scrollIntoView({ block: 'start' }), 60); }
    else if (base === 'importar') viewImportar(resto);
    else viewDia(E.atual || 1);
    const t = { hoje: `Dia ${E.atual}`, plano: 'Plano', rotas: 'Rotas', busca: 'Busca', caderno: 'Caderno' }[aba];
    document.title = `${t} · Bíblia Sem Jaula 365`;
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); });

  let instalar = null;
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); instalar = ev; });

  fetch('data/estudo.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
    D = j; D.dias.forEach(d => { DIA[d.n] = d; }); D.semanas.forEach(s => { SEM[s.n] = s; });
    atualizarAnel(); render(); pintarNuvem(); sincronizar();
  }).catch(() => { main.innerHTML = '<div class="carregando"><p>⚠️ Não consegui abrir o códice. Verifique a conexão e recarregue a página.</p></div>'; });

  if ('serviceWorker' in navigator && location.protocol === 'https:' && NO_PAGES) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
