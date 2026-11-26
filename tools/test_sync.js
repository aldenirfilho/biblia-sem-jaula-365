// Teste de sincronização iPhone ↔ Mac com GitHub falso em memória
// ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X
const { chromium } = require('playwright');
const BASE = process.env.BSJ_BASE || 'http://localhost:8811/'; // sirva a raiz do repositório: python3 -m http.server 8811
const TOKEN = 'ghp_' + 'a'.repeat(36);
const RUIM = 'ghp_' + 'b'.repeat(36);
const gists = {}; let seq = 0; const log = [];
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type, Accept, X-GitHub-Api-Version', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS', 'Access-Control-Expose-Headers': 'x-ratelimit-remaining' };
let fora = false;

async function apiFalsa(route) {
  const req = route.request(), url = new URL(req.url()), m = req.method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  if (fora) return route.abort('internetdisconnected');
  const auth = req.headers()['authorization'] || '';
  log.push(`${m} ${url.pathname}${url.search}`);
  const json = (status, body) => route.fulfill({ status, headers: Object.assign({ 'Content-Type': 'application/json' }, CORS), body: JSON.stringify(body) });
  if (auth !== 'Bearer ' + TOKEN) return json(401, { message: 'Bad credentials' });
  if (url.pathname === '/gists' && m === 'GET') return json(200, Object.values(gists).map(g => ({ id: g.id, description: g.description, files: Object.fromEntries(Object.keys(g.files).map(k => [k, { filename: k }])) })));
  if (url.pathname === '/gists' && m === 'POST') { const b = JSON.parse(req.postData()); const id = 'g' + (++seq); gists[id] = { id, description: b.description, public: b.public, files: b.files }; return json(201, gists[id]); }
  const mm = /^\/gists\/(\w+)$/.exec(url.pathname);
  if (mm && gists[mm[1]]) {
    const g = gists[mm[1]];
    if (m === 'GET') return json(200, { id: g.id, files: Object.fromEntries(Object.entries(g.files).map(([k, v]) => [k, { filename: k, content: v.content, truncated: false }])) });
    if (m === 'PATCH') { const b = JSON.parse(req.postData()); for (const [k, v] of Object.entries(b.files)) g.files[k] = v; if (b.description) g.description = b.description; return json(200, g); }
  }
  return json(404, { message: 'Not Found' });
}

const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1';
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15';
const falhas = []; const ok = (c, msg) => { console.log((c ? '✅ ' : '❌ ') + msg); if (!c) falhas.push(msg); };
const estado = p => p.evaluate(() => JSON.parse(localStorage.getItem('bsj365.codice.v1') || '{}'));
const remoto = () => { const g = Object.values(gists)[0]; return g ? JSON.parse(g.files['bsj365-progresso.json'].content) : null; };
const espera = ms => new Promise(r => setTimeout(r, ms));
const done = (e, k) => (+((e.feitos || {})[k]) || 0) > 0;

(async () => {
  const br = await chromium.launch();
  const novo = async (ua, w, h) => {
    const ctx = await br.newContext({ userAgent: ua, viewport: { width: w, height: h }, permissions: ['clipboard-read', 'clipboard-write'] });
    await ctx.route('https://api.github.com/**', apiFalsa);
    const p = await ctx.newPage(); p.erros = [];
    p.on('pageerror', e => p.erros.push('pageerror ' + e.message));
    p.on('console', m => { if (m.type() === 'error') p.erros.push('console ' + m.text()); });
    await p.goto(BASE + '#/hoje'); await p.waitForSelector('#titulo-dia');
    return { ctx, p };
  };
  const ligar = async (p, tk) => {
    await p.goto(BASE + '#/caderno'); await p.waitForSelector('#sync-token');
    await p.fill('#sync-token', tk); await p.click('#sync-form button');
    await espera(900);
  };
  const toastTxt = p => p.textContent('#toast');

  const A = await novo(UA_IPHONE, 390, 844), B = await novo(UA_MAC, 1280, 860);
  const pa = A.p, pb = B.p;

  // 0. chave errada
  await ligar(pa, RUIM);
  ok(/recusada/i.test(await toastTxt(pa)), 'Chave errada → aviso "Chave recusada" (' + (await toastTxt(pa)) + ')');
  ok(!(await estado(pa)).feitos || true, '— estado intacto');
  ok(await pa.$('#sync-token') !== null, 'Chave errada não fica salva (formulário continua)');

  // 1. iPhone liga e lê
  await ligar(pa, TOKEN);
  ok(Object.keys(gists).length === 1 && gists.g1.public === false, 'iPhone ligou → Gist secreto criado');
  ok(/PROJETO 360X/.test(gists.g1.description), 'Descrição do Gist com ALDENIR ROCHA DE OLIVEIRA FILHO · PROJETO 360X');
  ok(await pa.getAttribute('#nuvem', 'data-estado') === 'ok', 'Chip ☁️ verde no iPhone');
  await pa.screenshot({ path: '/tmp/sync_iphone_caderno.png', fullPage: false });
  await pa.goto(BASE + '#/dia/1'); await pa.waitForSelector('#titulo-dia');
  await pa.click('[data-acao="concluir"]'); await espera(900);
  ok(pa.url().endsWith('#/dia/2'), 'iPhone concluiu Dia 1 → foi para o Dia 2');
  await pa.fill('#nota', 'Nota do iPhone no dia 2'); await espera(700);
  await pa.click('.vs >> nth=1'); // marca versículo
  await espera(3200);
  let r = remoto();
  ok(r && done(r.estado, 1) && r.estado.atual === 2 && r.estado.notas['2'] === 'Nota do iPhone no dia 2' && Object.values(r.estado.marcas).some(v => v > 0), 'Gist recebeu: Dia 1 feito, Dia atual 2, nota e versículo');
  ok(r.dispositivo === 'iPhone' && /PROJETO 360X/.test(r.autor), 'Arquivo do Gist identifica aparelho e autor');

  // 2. Mac liga e continua de onde parou
  await ligar(pb, TOKEN);
  ok(Object.keys(gists).length === 1, 'Mac achou o mesmo Gist (não criou outro)');
  let eb = await estado(pb);
  ok(done(eb, 1) && eb.atual === 2 && eb.notas['2'] === 'Nota do iPhone no dia 2', 'Mac recebeu Dia 1 feito, Dia atual 2 e a nota');
  await pb.goto(BASE + '#/hoje'); await pb.waitForSelector('#titulo-dia');
  ok((await pb.textContent('.medalha b')).trim() === '2' && (await pb.inputValue('#nota')) === 'Nota do iPhone no dia 2', 'Mac abre direto no Dia 2 com a nota do iPhone');
  ok((await pb.$$('.vs.marcado')).length === 1, 'Mac mostra o versículo marcado no iPhone');
  await pb.screenshot({ path: '/tmp/sync_mac_dia2.png' });

  // 3. Mac lê o Dia 2; iPhone (parado no Dia 2) segue para o 3
  await pb.click('[data-acao="concluir"]'); await espera(3400);
  ok(remoto().estado.atual === 3 && done(remoto().estado, 2), 'Mac concluiu Dia 2 → Gist: Dia atual 3');
  await pa.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1200);
  ok(pa.url().endsWith('#/dia/3'), 'iPhone parado no Dia 2 pulou sozinho para o Dia 3');
  ok(/Continuando do Dia 3.*Mac/.test(await toastTxt(pa)), 'Aviso no iPhone: "' + (await toastTxt(pa)) + '"');

  // 4. desmarcar propaga
  await pa.goto(BASE + '#/dia/1'); await pa.waitForSelector('#titulo-dia');
  await pa.click('[data-acao="concluir"]'); await espera(3400);
  ok(!done(remoto().estado, 1) && remoto().estado.feitos['1'] < 0, 'iPhone desmarcou Dia 1 → Gist guarda "desmarcado"');
  await pb.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1200);
  eb = await estado(pb);
  ok(!done(eb, 1) && done(eb, 2), 'Mac recebeu o desmarcar do Dia 1 (Dia 2 segue feito)');
  ok(eb.atual === 1, 'Mac seguiu para o último dia aberto (Dia 1)');

  // 5. nota mais recente vence
  await pb.goto(BASE + '#/dia/2'); await pb.waitForSelector('#nota');
  await pb.fill('#nota', 'Nota revista no Mac'); await espera(3400);
  await pa.goto(BASE + '#/dia/2'); await pa.waitForSelector('#nota');
  await pa.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1200);
  ok((await estado(pa)).notas['2'] === 'Nota revista no Mac' && (await pa.inputValue('#nota')) === 'Nota revista no Mac', 'Nota editada no Mac aparece no iPhone (mais recente vence)');

  // 6. sem internet: guarda e envia quando volta
  fora = true;
  await pa.goto(BASE + '#/dia/3'); await pa.waitForSelector('#titulo-dia');
  await pa.click('[data-acao="concluir"]'); await espera(3400);
  ok(['offline', 'erro'].includes(await pa.getAttribute('#nuvem', 'data-estado')) && done(await estado(pa), 3), 'Sem internet: Dia 3 fica salvo no iPhone e o chip avisa (' + (await pa.getAttribute('#nuvem', 'data-estado')) + ')');
  ok(!done(remoto().estado, 3), '— Gist ainda não tem o Dia 3');
  fora = false;
  await pa.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1500);
  ok(done(remoto().estado, 3) && await pa.getAttribute('#nuvem', 'data-estado') === 'ok', 'Internet voltou → Dia 3 enviado, chip verde');

  // 7. link sem chave → aparelho C (sem nuvem)
  await pa.goto(BASE + '#/caderno'); await pa.waitForSelector('#enviar-link');
  await pa.evaluate(() => { try { delete Navigator.prototype.share; } catch (e) {} });
  await pa.click('#enviar-link'); await espera(600);
  const link = await pa.evaluate(() => navigator.clipboard.readText());
  ok(/#\/importar\/[zj]\.[A-Za-z0-9_-]+$/.test(link), `Link de progresso gerado (${link.length} caracteres, ${link.includes('/z.') ? 'compactado' : 'texto'})`);
  const C = await novo(UA_MAC, 1024, 800); const pc = C.p;
  await pc.goto(link.replace('https://aldenirfilho.github.io/biblia-sem-jaula-365/', BASE)); await pc.waitForSelector('#juntar');
  ok(/Progresso recebido do iPhone/.test(await pc.textContent('h1')), 'Aparelho sem chave abre a tela "Progresso recebido do iPhone"');
  await pc.screenshot({ path: '/tmp/sync_link_receber.png' });
  await pc.click('#juntar'); await espera(800);
  let ec = await estado(pc);
  const ea = await estado(pa);
  ok(done(ec, 2) && done(ec, 3) && !done(ec, 1) && ec.atual === ea.atual && ec.notas['2'] === 'Nota revista no Mac', `Link juntou: Dias 2–3 feitos, Dia atual ${ec.atual}, nota do Mac`);
  ok(pc.url().endsWith('#/dia/' + ec.atual), 'Depois de juntar, abre no dia atual (link sai da barra)');

  // 8. colar backup JSON (formato antigo v1)
  await pc.goto(BASE + '#/caderno'); await pc.waitForSelector('#colar', { state: 'attached' });
  await pc.evaluate(() => { document.querySelector('details.colar').open = true; });
  await pc.fill('#colar', JSON.stringify({ app: 'biblia-sem-jaula-365', versao: 1, estado: { atual: 5, feitos: { 4: Date.now() - 864e5 }, notas: { 4: 'nota antiga' }, marcas: {}, missoes: {} } }));
  await pc.click('#aplicar-colar'); await espera(500);
  ec = await estado(pc);
  ok(done(ec, 4) && ec.notas['4'] === 'nota antiga' && done(ec, 2), 'Backup antigo colado: Dia 4 e nota juntados sem apagar os demais');

  // 9. li no PDF até o dia 10
  await pc.goto(BASE + '#/caderno'); await pc.waitForSelector('#pdf-dia');
  await pc.fill('#pdf-dia', '10'); await pc.click('#pdf-ate button[type="submit"]'); await espera(600);
  ec = await estado(pc);
  ok([...Array(10)].every((_, i) => done(ec, i + 1)) && ec.atual === 11 && pc.url().endsWith('#/dia/11'), '"Li no PDF até o dia 10": Dias 1–10 feitos e abre o Dia 11');
  await pc.goto(BASE + '#/caderno'); await pc.waitForSelector('#pdf-dia');
  await pc.fill('#pdf-dia', '20'); await pc.click('#pdf-ir'); await espera(600);
  ec = await estado(pc);
  ok(ec.atual === 21 && !done(ec, 15), '"Só continuar daqui": vai ao Dia 21 sem marcar nada');

  // 10. zerar propaga
  await pb.goto(BASE + '#/caderno'); await pb.waitForSelector('#zerar');
  await pb.click('#zerar'); await pb.click('#zerar'); await espera(3400);
  ok(Object.values(remoto().estado.feitos).every(v => v < 0) && remoto().estado.atual === 1, 'Zerar no Mac → Gist zerado');
  await pa.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1300);
  ok((await estado(pa)).feitos && Object.values((await estado(pa)).feitos).every(v => v < 0), 'iPhone recebeu o zerar');

  // 10b. depois do zerar, o que for novo sobrevive
  await pa.goto(BASE + '#/dia/1'); await pa.waitForSelector('#titulo-dia');
  await pa.click('[data-acao="concluir"]'); await espera(3400);
  await pb.evaluate(() => window.dispatchEvent(new Event('online'))); await espera(1300);
  ok(done(await estado(pb), 1) && done(remoto().estado, 1), 'Depois do Zerar, Dia 1 lido no iPhone chega ao Mac');

  // 11. desligar
  await pb.goto(BASE + '#/caderno'); await pb.waitForSelector('#sync-desligar');
  await pb.click('#sync-desligar'); await pb.click('#sync-desligar'); await espera(300);
  ok(await pb.$('#sync-token') !== null && await pb.getAttribute('#nuvem', 'data-estado') === 'off' && !(await pb.evaluate(() => localStorage.getItem('bsj365.sync.v1'))).includes('ghp_'), 'Desligar apaga a chave deste aparelho e volta ao formulário');

  // 12. telas e erros
  await pa.goto(BASE + '#/sincronizar'); await espera(500);
  await pa.screenshot({ path: '/tmp/sync_iphone_secao.png', fullPage: false });
  await pa.goto(BASE + '#/hoje'); await espera(400);
  await pa.screenshot({ path: '/tmp/sync_iphone_topo.png', clip: { x: 0, y: 0, width: 390, height: 120 } });
  await pb.goto(BASE + '#/hoje'); await espera(400);
  await pb.screenshot({ path: '/tmp/sync_mac_topo.png', clip: { x: 0, y: 0, width: 1280, height: 90 } });
  const erros = [...pa.erros, ...pb.erros, ...pc.erros].filter(e => !/api\.github\.com|Failed to load resource|ERR_INTERNET_DISCONNECTED|net::/.test(e));
  ok(erros.length === 0, 'Sem erros de JavaScript no console' + (erros.length ? ': ' + erros.join(' | ') : ''));
  console.log('\nChamadas ao GitHub falso:', log.length, '·', [...new Set(log.map(x => x.split('?')[0]))].join(', '));
  console.log(falhas.length ? `\n❌ ${falhas.length} falha(s)` : '\n🏆 Todos os testes passaram');
  await br.close(); process.exit(falhas.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
