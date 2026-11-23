/* Bíblia Sem Jaula 365 · Códice de Estudo
   ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
   App estático (GitHub Pages): progresso, notas e marcações ficam só neste aparelho. */
(() => {
  'use strict';

  const CHAVE = 'bsj365.codice.v1';
  const FA = document.documentElement.dataset.fonteAcessivel || 'OpenDyslexic'; // fonte acessível disponível nesta hospedagem
  const ROTA_EMO = { historia: '📜', exausto: '🛌', injustica: '⚖️', metal: '🤘', jesus: '✝️', casal: '💍', rumo: '🧭', sabedoria: '🦉' };
  const main = document.getElementById('principal');
  let D = null, DIA = {}, SEM = {};

  /* ---------------- estado ---------------- */
  const padrao = () => ({ atual: 1, feitos: {}, missoes: {}, notas: {}, marcas: {}, tema: 'codice', fonte: 'lora', tam: 1, criado: Date.now() });
  let E = padrao();
  try { const raw = localStorage.getItem(CHAVE); if (raw) E = Object.assign(padrao(), JSON.parse(raw)); } catch (e) { /* armazenamento indisponível */ }
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { toast('⚠️ Não consegui salvar neste navegador'); } };
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
  const nFeitos = () => Object.keys(E.feitos).length;
  const feitosSemana = n => SEM[n].d.filter(i => E.feitos[i]).length;
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
    const dias = new Set(Object.values(E.feitos).map(dataLocal));
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

  /* ---------------- views ---------------- */
  function viewDia(n) {
    const d = DIA[n]; if (!d) return viewDia(1);
    if (E.atual !== n) { E.atual = n; salvar(); }
    const s = SEM[d.w];
    const feito = !!E.feitos[n];
    let primeira = true;
    const passagens = d.r.map((r, ri) => {
      const txt = r.v.map(([vn, vt], vi) => {
        const k = `${n}|${ri}|${vn}`;
        let corpo = esc(vt), num = `<span class="vn">${vn}</span>`;
        if (primeira && vi === 0 && /^[A-Za-zÀ-ÿ]/.test(vt)) { corpo = `<span class="capitular" aria-hidden="true">${esc(vt[0])}</span><span class="sr">${esc(vt[0])}</span>${esc(vt.slice(1))}`; num = ''; }
        primeira = false;
        return `<span class="vs${E.marcas[k] ? ' marcado' : ''}" data-k="${k}" tabindex="0" role="button" aria-pressed="${!!E.marcas[k]}">${num}${corpo}</span> `;
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
        <label class="missao"><input type="checkbox" id="missao" ${E.missoes[n] ? 'checked' : ''}><span><b>🎯 Missão do dia</b><span>${esc(d.mis)}</span></span></label>
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
      const alternar = () => {
        const k = el.dataset.k;
        if (E.marcas[k]) delete E.marcas[k]; else E.marcas[k] = Date.now();
        el.classList.toggle('marcado'); el.setAttribute('aria-pressed', String(!!E.marcas[k])); salvar();
        toast(E.marcas[k] ? '⭐ Versículo marcado' : 'Marcação removida');
      };
      el.addEventListener('click', alternar);
      el.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); alternar(); } });
    });
    document.getElementById('missao').addEventListener('change', ev => {
      if (ev.target.checked) E.missoes[n] = Date.now(); else delete E.missoes[n];
      salvar(); toast(ev.target.checked ? '🎯 Missão cumprida!' : 'Missão desmarcada');
    });
    const nota = document.getElementById('nota'), st = document.getElementById('nota-status');
    let tNota;
    nota.addEventListener('input', () => {
      clearTimeout(tNota); st.textContent = '…';
      tNota = setTimeout(() => { const v = nota.value.trim(); if (v) E.notas[n] = nota.value; else delete E.notas[n]; salvar(); st.textContent = '💾 Nota salva neste aparelho'; }, 500);
    });
    main.querySelector('[data-acao="concluir"]').addEventListener('click', () => {
      if (E.feitos[n]) { delete E.feitos[n]; salvar(); atualizarAnel(); toast('Dia desmarcado'); render(); return; }
      E.feitos[n] = Date.now(); salvar(); atualizarAnel();
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
      salvar(); aplicarPrefs();
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
    const d = DIA[i], ok = !!E.feitos[i];
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
      <div class="acoes"><a class="btn ouro" href="#/dia/${s.d.find(i => !E.feitos[i]) || s.d[0]}">📖 Ler agora</a><a class="btn" href="${pdfSemana(n)}" target="_blank" rel="noopener">📄 PDF da semana ${n}</a></div>
      <div class="nav-dias">${n > 1 ? `<a class="btn" href="#/semana/${n - 1}">◀ Semana ${n - 1}</a>` : ''}${n < 53 ? `<a class="btn" href="#/semana/${n + 1}">Semana ${n + 1} ▶</a>` : ''}</div>`;
  }

  function viewRotas() {
    main.innerHTML = `
      <p class="kicker">Escolha pelo momento</p>
      <h1 class="titulo-sec">🧭 Rotas temáticas</h1>
      <p class="sub-sec">Oito caminhos pelo mesmo códice — para o dia que você está vivendo.</p>
      <div class="rotas">${D.rotas.map(r => {
        const dias = r.weekNumbers.flatMap(w => SEM[w].d), ok = dias.filter(i => E.feitos[i]).length;
        return `<article class="codice rota"><span class="emo" aria-hidden="true">${ROTA_EMO[r.id] || '•'}</span><h2>${esc(r.title)}</h2>
          <div class="barra" aria-hidden="true"><i style="width:${(ok / dias.length * 100).toFixed(0)}%"></i></div>
          <p class="aviso">${r.weekNumbers.length} semanas · ${ok}/${dias.length} dias</p>
          <a class="btn peq" href="#/rota/${r.id}">Abrir a rota →</a></article>`;
      }).join('')}</div>`;
  }

  function viewRota(id) {
    const r = D.rotas.find(x => x.id === id); if (!r) return viewRotas();
    const prox = r.weekNumbers.flatMap(w => SEM[w].d).find(i => !E.feitos[i]);
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
    const minutos = Object.keys(E.feitos).reduce((a, i) => a + (DIA[i] ? DIA[i].m : 0), 0);
    const notas = Object.keys(E.notas).map(Number).sort((a, b) => a - b);
    const marcas = Object.keys(E.marcas).sort((a, b) => { const [x] = a.split('|'), [y] = b.split('|'); return x - y; });
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
      <section class="codice bloco"><h2>🛡️ Backup do progresso</h2>
        <p class="aviso">Seu progresso, notas e marcações ficam <b>só neste aparelho</b>. Exporte um backup para levar ao iPhone, iPad ou Mac — ou para não perder nada.</p>
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
    main.querySelectorAll('[data-pref]').forEach(b => b.addEventListener('click', () => { const p = b.dataset.pref; E[p] = p === 'tam' ? +b.dataset.v : b.dataset.v; salvar(); aplicarPrefs(); render(); }));
    document.getElementById('pular').addEventListener('submit', ev => { ev.preventDefault(); const v = Math.min(365, Math.max(1, parseInt(document.getElementById('dia-n').value, 10) || 1)); location.hash = '#/dia/' + v; });
    const pacote = () => JSON.stringify({ app: 'biblia-sem-jaula-365', versao: 1, exportado: new Date().toISOString(), estado: E });
    document.getElementById('exportar').addEventListener('click', () => {
      const blob = new Blob([pacote()], { type: 'application/json' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `biblia-sem-jaula-365_backup_${dataLocal(Date.now())}.json`;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); toast('⬇️ Backup exportado');
    });
    document.getElementById('copiar').addEventListener('click', async () => { try { await navigator.clipboard.writeText(pacote()); toast('📋 Backup copiado'); } catch (e) { toast('⚠️ Não consegui copiar — use Exportar'); } });
    document.getElementById('importar').addEventListener('change', async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      try { const j = JSON.parse(await f.text()); const est = j.estado || j; if (!est || typeof est.feitos !== 'object') throw new Error('formato');
        E = Object.assign(padrao(), est); salvar(); aplicarPrefs(); atualizarAnel(); toast(`✅ Backup restaurado · ${nFeitos()} dias`); render();
      } catch (e) { toast('⚠️ Arquivo de backup inválido'); }
    });
    const zerar = document.getElementById('zerar'); let armado = false, tz;
    zerar.addEventListener('click', () => {
      if (!armado) { armado = true; zerar.textContent = '⚠️ Toque de novo para confirmar'; tz = setTimeout(() => { armado = false; zerar.textContent = '🧹 Zerar progresso'; }, 5000); return; }
      clearTimeout(tz); const prefs = { tema: E.tema, fonte: E.fonte, tam: E.tam }; E = Object.assign(padrao(), prefs); salvar(); atualizarAnel(); toast('🧹 Progresso zerado'); render();
    });
    const bi = document.getElementById('instalar');
    if (bi) bi.addEventListener('click', async () => { instalar.prompt(); await instalar.userChoice; instalar = null; render(); });
  }

  /* ---------------- roteador ---------------- */
  function render() {
    const h = location.hash.replace(/^#\/?/, '');
    const [rota, resto] = h.split('/');
    const [base, qs] = (rota || 'hoje').split('?');
    const aba = { hoje: 'hoje', dia: 'hoje', plano: 'plano', semana: 'plano', rotas: 'rotas', rota: 'rotas', busca: 'busca', caderno: 'caderno' }[base] || 'hoje';
    document.querySelectorAll('.abas a').forEach(a => { if (a.dataset.aba === aba) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (base === 'dia') viewDia(Math.min(365, Math.max(1, parseInt(resto, 10) || 1)));
    else if (base === 'plano') viewPlano();
    else if (base === 'semana') viewSemana(parseInt(resto, 10));
    else if (base === 'rotas') viewRotas();
    else if (base === 'rota') viewRota(resto);
    else if (base === 'busca') viewBusca(qs ? decodeURIComponent((qs.match(/q=([^&]*)/) || [])[1] || '') : '');
    else if (base === 'caderno') viewCaderno();
    else viewDia(E.atual || 1);
    const t = { hoje: `Dia ${E.atual}`, plano: 'Plano', rotas: 'Rotas', busca: 'Busca', caderno: 'Caderno' }[aba];
    document.title = `${t} · Bíblia Sem Jaula 365`;
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); main.focus({ preventScroll: true }); });

  let instalar = null;
  window.addEventListener('beforeinstallprompt', ev => { ev.preventDefault(); instalar = ev; });

  fetch('data/estudo.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(j => {
    D = j; D.dias.forEach(d => { DIA[d.n] = d; }); D.semanas.forEach(s => { SEM[s.n] = s; });
    atualizarAnel(); render();
  }).catch(() => { main.innerHTML = '<div class="carregando"><p>⚠️ Não consegui abrir o códice. Verifique a conexão e recarregue a página.</p></div>'; });

  if ('serviceWorker' in navigator && location.protocol === 'https:' && NO_PAGES) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
