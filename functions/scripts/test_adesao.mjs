// Confere o cálculo de adesão (adesao.js, compartilhado entre o app e o painel):
// constância, tempo de pós-aula somado, tempo mínimo nas atividades, pilar que
// sai da conta e semanas anteriores à coleta.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const Adesao = require('../../adesao.js');
const { compute } = Adesao;

let n = 0;
const ok = (nome, fn) => { fn(); n += 1; console.log('ok  ', nome); };

// Hoje = terça 20/10/2026. Semanas (seg–dom): 28/09, 05/10, 12/10 (fechadas) e 19/10 (atual).
const NOW = new Date(2026, 9, 20, 12, 0, 0);
const dia = (semana, d) => {   // semana 0..3 → 28/09 + 7*semana; d 0..6 (seg..dom)
  const x = new Date(2026, 8, 28 + semana * 7 + d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
// min = tempo total de uso no dia. O que não for pós-aula/atividade/outros é vocabulário
// (estudo); `extra.outros` é uso fora do estudo (início, perfil...).
const uso = (semana, d, min, extra = {}) => ({
  date: dia(semana, d),
  secs: {
    total: min * 60, posaula: (extra.pos || 0) * 60, atividade: (extra.ativ || 0) * 60, desafio: (extra.des || 0) * 60,
    vocab: Math.max(0, min - (extra.pos || 0) - (extra.ativ || 0) - (extra.des || 0) - (extra.outros || 0)) * 60,
    outros: (extra.outros || 0) * 60,
  },
  items: extra.items || {}, itemOpens: extra.opens || {}, opens: 1,
});
const post = (id, semana, d) => ({ id, title: `Pós ${id}`, classDate: new Date(2026, 8, 28 + semana * 7 + d) });
const ativ = (id, semana, d, exTotal, exFeitos, extra = {}) => ({ id, createdAt: new Date(2026, 8, 28 + semana * 7 + d), exTotal, exFeitos, ...extra });
const pres = (semana, d, present = true) => ({ key: dia(semana, d), present });
const CFG = { coletaDesde: '2026-09-28' };

// Estudante que faz tudo na terça (aula + 90 exercícios + pós-aula) e some o resto da semana.
const maratonista = () => {
  const usage = [], posts = [], activities = [], attendance = [];
  for (let s = 0; s < 3; s++) {
    usage.push(uso(s, 1, 41, { pos: 7, ativ: 34, items: { [`pos_p${s}`]: 7 * 60, [`act_a${s}`]: 34 * 60 } }));
    posts.push(post(`p${s}`, s, 1));
    activities.push(ativ(`a${s}`, s, 1, 90, 90));
    attendance.push(pres(s, 1));
  }
  return { now: NOW, student: {}, usage, posts, activities, attendance, challenge: { enabled: false } };
};

ok('maratonista: 90 exercícios num dia só rendem 1 de 5 dias (constância 20%)', () => {
  const c = compute(maratonista(), CFG);
  assert.equal(c.status, 'ok');
  assert.equal(c.used.length, 3);
  assert.ok(Math.abs(c.pm.C - 0.2) < 1e-9);
  assert.equal(c.pm.At, 1);
  assert.equal(c.pm.Pos, 1);
  assert.equal(c.pm.Aula, 1);
  assert.equal(c.pm.Des, null);                    // desafio desligado: sai da conta
  // (25*.2 + 25 + 20 + 20) / 90 = 78
  assert.equal(c.index, 78);
  assert.equal(c.band.k, 'media');
  assert.ok(c.tags.some(t => t.t.startsWith('Tudo concentrado')));
});

ok('quem estuda 5 dias com o mesmo volume fica acima do maratonista', () => {
  const m = maratonista();
  const constante = maratonista();
  for (let s = 0; s < 3; s++) for (const d of [0, 2, 3, 4]) constante.usage.push(uso(s, d, 15));
  assert.ok(compute(constante, CFG).index > compute(m, CFG).index);
  assert.equal(compute(constante, CFG).pm.C, 1);
});

ok('pós-aula: várias aberturas somam (2 + 1 + 2 min = 5 min bate a meta)', () => {
  const entrada = { now: NOW, student: {}, challenge: { enabled: false }, attendance: [], activities: [],
    posts: [post('p', 1, 1)],
    usage: [uso(1, 1, 2, { items: { pos_p: 120 }, opens: { pos_p: 1 } }), uso(1, 2, 1, { items: { pos_p: 60 }, opens: { pos_p: 1 } }), uso(1, 3, 2, { items: { pos_p: 120 }, opens: { pos_p: 1 } }),
      uso(0, 1, 5), uso(2, 1, 5)] };
  const w = compute(entrada, CFG).weeks[1];
  assert.equal(w.posItems.length, 1);
  assert.equal(w.posItems[0].minutes, 5);
  assert.equal(w.posItems[0].opens, 3);
  assert.equal(w.parts.Pos, 1);
});

ok('pós-aula aberto por 40 s fica muito abaixo da meta de 5 min', () => {
  const entrada = { now: NOW, student: {}, challenge: { enabled: false }, attendance: [], activities: [],
    posts: [post('p', 1, 1)], usage: [uso(1, 1, 1, { items: { pos_p: 40 } }), uso(0, 0, 4), uso(2, 0, 4)] };
  const w = compute(entrada, CFG).weeks[1];
  assert.ok(w.parts.Pos < 0.15);
});

ok('atividade respondida rápido demais perde nota (60 exercícios em 5 min)', () => {
  const entrada = { now: NOW, student: {}, challenge: { enabled: false }, attendance: [], posts: [],
    activities: [ativ('a', 1, 4, 60, 60)],
    usage: [uso(1, 4, 5, { ativ: 5, items: { act_a: 300 } }), uso(0, 0, 4), uso(2, 0, 4)] };
  const w = compute(entrada, CFG).weeks[1];
  assert.equal(w.atItems[0].entrega, 1);
  assert.ok(Math.abs(w.atItems[0].fator - 5 / 15) < 1e-9);   // esperado 15 min (60 × 15 s)
  assert.ok(w.parts.At < 0.4);
});

ok('dia com menos de 3 min de uso não conta como dia ativo', () => {
  const entrada = { now: NOW, student: {}, challenge: { enabled: false }, attendance: [], posts: [], activities: [],
    usage: [uso(1, 0, 2.9), uso(1, 1, 3), uso(1, 2, 0.2), uso(0, 0, 4), uso(2, 0, 4)] };
  assert.equal(compute(entrada, CFG).weeks[1].activeDays, 1);
});

ok('aluno sem aulas: pilar Aulas sai da conta e os pesos se redistribuem', () => {
  const usage = [];
  for (let s = 0; s < 3; s++) for (const d of [0, 1, 2, 3, 4]) usage.push(uso(s, d, 12, { ativ: 12, items: { [`act_t${s}`]: 12 * 60 * 5 } }));
  const activities = [0, 1, 2].map(s => ativ(`t${s}`, s, 0, 30, 30));
  const c = compute({ now: NOW, student: {}, usage, activities, posts: [], attendance: [], challenge: { enabled: false } }, CFG);
  assert.equal(c.pm.Aula, null);
  assert.equal(c.pm.Pos, null);
  assert.equal(c.index, 100);                       // só Constância e Atividades, ambas cheias
  assert.equal(Adesao.effWeight({ C: true, At: true, Pos: false, Aula: false, Des: false }, 'C', Adesao.cfgOf({})), 50);
});

ok('semana anterior à coleta: sem constância nem tempo, só o que já existia', () => {
  const entrada = { now: NOW, student: {}, challenge: { enabled: false },
    usage: [uso(2, 1, 20)], posts: [post('antigo', 0, 1)],
    activities: [ativ('a0', 0, 2, 40, 40)], attendance: [pres(0, 1), pres(1, 1, false)] };
  const c = compute(entrada, { coletaDesde: dia(2, 0) });     // coleta começou na semana 3 (12/10)
  const w0 = c.weeks[0];
  assert.equal(w0.hasTime, false);
  assert.equal(w0.parts.C, null);
  assert.equal(w0.parts.Pos, null);                            // não dá para medir leitura antiga
  assert.equal(w0.atItems[0].fator, 1);                        // tempo desconhecido não penaliza
  assert.equal(w0.parts.At, 1);
  assert.equal(w0.parts.Aula, 1);
  assert.equal(c.weeks[1].parts.Aula, 0);
  assert.equal(c.weeks[2].hasTime, true);
  // semanas sem tempo medido não entram na nota (senão inflam quem estuda num dia só)
  assert.deepEqual(c.used.map(w => w.key), [dia(2, 0)]);
});

ok('sem nenhuma semana completa válida: status coletando e sem nota', () => {
  const c = compute({ now: NOW, student: { createdAt: new Date(2026, 9, 19) }, usage: [uso(3, 0, 20)], posts: [], activities: [], attendance: [], challenge: {} }, CFG);
  assert.equal(c.status, 'coletando');
  assert.equal(c.index, null);
  assert.equal(c.cur.activeDays, 1);
  assert.match(Adesao.suggestComment(c, 'Bia'), /Bia/);
});

ok('semanas antes do cadastro do aluno não entram na nota', () => {
  const entrada = maratonista();
  entrada.student = { createdAt: new Date(2026, 9, 5) };       // entrou em 05/10
  const c = compute(entrada, CFG);
  assert.equal(c.used.length, 2);
  assert.equal(c.used[0].key, dia(1, 0));
});

ok('nota pesa mais a semana recente (1·2·3) e a tendência compara as duas últimas', () => {
  const usage = [], posts = [], activities = [];
  // semana 0 cheia, semana 1 média, semana 2 zerada (só presença)
  for (const d of [0, 1, 2, 3, 4]) usage.push(uso(0, d, 15));
  for (const d of [0, 1]) usage.push(uso(1, d, 15));
  const c = compute({ now: NOW, student: {}, usage, posts, activities, attendance: [], challenge: { enabled: false } }, CFG);
  assert.deepEqual(c.totals, [100, 40, 0]);
  assert.equal(c.index, Math.round((100 * 1 + 40 * 2 + 0 * 3) / 6));
  assert.equal(c.trend, -40);
  assert.ok(c.tags.some(t => t.t.includes('Caindo')));
});

ok('desafio: só conta semana publicada; 1 de 2 partes = 50%', () => {
  const entrada = { now: NOW, student: {}, usage: [uso(1, 1, 10)], posts: [], activities: [], attendance: [],
    challenge: { enabled: true, weeks: [dia(1, 0)], completed: [`${dia(1, 0)}-part-1`] } };
  const c = compute(entrada, CFG);
  assert.deepEqual(c.weeks[1].des, [2, 1]);
  assert.equal(c.weeks[1].parts.Des, 0.5);
  assert.equal(c.weeks[0].parts.Des, null);                    // semana sem desafio publicado
});

ok('aulas: feriado/cancelada (excused) não conta como falta', () => {
  const entrada = { now: NOW, student: {}, usage: [uso(1, 1, 10)], posts: [], activities: [], challenge: {},
    attendance: [pres(1, 1), { key: dia(1, 3), present: false, excused: true }] };
  assert.deepEqual(compute(entrada, CFG).weeks[1].aulas, [1, 1]);
});

ok('postRef lê a data do nome do arquivo (MM-DD-AAAA) antes do createdAt', () => {
  const d = Adesao.util.postRef({ filename: 'pos-aula-gu-10-07-2026.html', createdAt: new Date(2026, 9, 9) });
  assert.equal(Adesao.util.dayKey(d), '2026-10-07');
});

ok('faixa de acertos só aparece quando a ordem fecha (alta > média > baixa, ≥2 por faixa)', () => {
  const dados = [
    { band: 'alta', acc: 90 }, { band: 'alta', acc: 86 }, { band: 'media', acc: 77 }, { band: 'media', acc: 76 },
    { band: 'baixa', acc: 60 }, { band: 'baixa', acc: 52 },
  ];
  assert.equal(Adesao.statsOk(Adesao.bandStats(dados)), true);
  assert.equal(Adesao.statsOk(Adesao.bandStats(dados.slice(1))), false);      // alta com 1 aluno
  assert.equal(Adesao.statsOk(Adesao.bandStats([...dados, { band: 'baixa', acc: 99 }, { band: 'baixa', acc: 99 }])), false); // ordem quebra
});

ok('HTML do aluno sai sem erro nos dois estados e escapa o recado', () => {
  const pronto = compute(maratonista(), CFG);
  const html = Adesao.studentHtml(pronto, { firstName: 'Rafael', recado: '<img src=x onerror=alert(1)> oi', ribbon: 'Prévia', stats: null });
  assert.ok(html.includes('Minha adesão') && html.includes('cza-cell'));
  assert.ok(!html.includes('<img'));
  // aluno: só o cartão da nota aparece; o resto fica escondido até ele tocar
  assert.ok(html.includes('data-cza-toggle') && html.includes('aria-expanded="false"'));
  assert.ok(html.includes('<div class="cza-more" hidden>'));
  assert.ok(html.indexOf('data-cza-toggle') < html.indexOf('cza-more'));
  assert.ok(!Adesao.studentHtml(pronto, { firstName: 'Rafael', collapsible: false }).includes('data-cza-toggle'));
  // abrir/fechar
  const mais = { hidden: true }, gatilho = { v: '', setAttribute(k, v) { this.v = v; } };
  const host = { querySelector: () => mais };
  Adesao.toggleDetails(host, gatilho);
  assert.equal(mais.hidden, false); assert.equal(gatilho.v, 'true');
  Adesao.toggleDetails(host, gatilho);
  assert.equal(mais.hidden, true); assert.equal(gatilho.v, 'false');
  // coleta começou nesta semana: nenhuma semana fechada tem dado ainda
  const vazio = compute({ now: NOW, student: {}, usage: [], posts: [], activities: [], attendance: [], challenge: {} }, { coletaDesde: dia(3, 0) });
  assert.equal(vazio.status, 'coletando');
  assert.ok(Adesao.studentHtml(vazio, { firstName: 'Ana' }).includes('Estamos conhecendo o seu ritmo'));
});

ok('tempo de estudo: início, perfil e avisos (outros) não contam como estudo nem como dia estudado', () => {
  const entrada = { now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [],
    usage: [uso(1, 0, 20, { outros: 20 }), uso(1, 1, 12, { outros: 9 }), uso(0, 0, 4), uso(2, 0, 4)] };
  const c = compute(entrada, CFG), w = c.weeks[1];
  assert.equal(w.days[0], 0);                          // 20 min só em "outros": zero de estudo
  assert.equal(w.df[0], 20);
  assert.equal(w.days[1], 3);                          // 12 min no total, 9 fora do estudo
  assert.equal(w.activeDays, 1);                       // só a terça (3 min de estudo)
  const txt = Adesao.sDayText(c, 1, 0);
  assert.match(txt, /sem estudo/);
  assert.match(txt, /20 min em outras telas \(não conta como estudo\)/);
});

ok('tempo de estudo reúne pós-aula, atividades, desafio e vocabulário/verbos/chunks', () => {
  const entrada = { now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [],
    usage: [uso(1, 2, 20, { pos: 6, ativ: 5, des: 4, outros: 2 }), uso(0, 0, 4), uso(2, 0, 4)] };
  const c = compute(entrada, CFG), w = c.weeks[1];
  assert.equal(w.days[2], 18);                         // 6 + 5 + 4 + 3 de vocabulário
  assert.equal(w.dv[2], 3);
  assert.equal(w.dd[2], 4);
  assert.equal(w.df[2], 2);
  const txt = Adesao.sDayText(c, 1, 2);
  assert.match(txt, /18 min de estudo \(pós-aula 6 min · atividades 5 min · desafio 4 min · vocabulário, verbos e chunks 3 min\)/);
  assert.match(txt, /Meta do dia batida/);
});

ok('meta de estudo: 10 min por dia, dias que bateram a meta e tipos feitos na semana', () => {
  const entrada = { now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [],
    usage: [
      uso(1, 0, 12, { pos: 6, ativ: 6 }),             // bateu: leitura + exercício
      uso(1, 1, 9, { pos: 9 }),                       // 9 min: não bateu
      uso(1, 2, 10, { ativ: 4 }),                     // exatamente 10 (4 de exercício + 6 de vocabulário): bateu
      uso(1, 4, 15, { outros: 12 }),                  // só 3 min de estudo: não bateu
      uso(0, 0, 4), uso(2, 0, 4)] };
  const g = compute(entrada, CFG).weeks[1].goal;
  assert.equal(g.metaDiaMin, 10);
  assert.equal(g.metaDias, 5);
  assert.equal(g.metaSemanaMin, 50);
  assert.equal(g.hits, 2);
  assert.deepEqual(g.dias.map(d => d.hit), [true, false, true, false, false, false, false]);
  assert.equal(Math.round(g.minutos), 12 + 9 + 10 + 3);
  assert.deepEqual(g.tipos, { leitura: true, vocab: true, exercicio: true });
  assert.equal(g.atingida, false);                    // 2 dias de 5
  // metas configuráveis: 3 dias de 8 min
  const g2 = compute(entrada, { ...CFG, metaDiaMin: 8, metaDiasEstudo: 3 }).weeks[1].goal;
  assert.equal(g2.hits, 3);                           // 12, 9 e 10 min
  assert.equal(g2.atingida, true);
  assert.equal(g2.metaSemanaMin, 24);
});

ok('meta: tipo só conta como feito com o mínimo de minutos no dia; semana atual só olha os dias já passados', () => {
  const entrada = { now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [],
    usage: [uso(3, 0, 10, { pos: 0.5 }), uso(3, 1, 12, { ativ: 12 }), uso(3, 4, 50, { ativ: 50 })] };   // sexta ainda não chegou
  const g = compute(entrada, CFG).weeks[3].goal;
  assert.equal(g.tipos.leitura, false);               // 30 s de pós-aula < 1 min
  assert.equal(g.tipos.exercicio, true);
  assert.equal(g.hits, 2);                            // segunda (vocabulário 9,5 + 0,5) e terça; sexta é futuro
  assert.equal(Math.round(g.minutos), 22);
});

const semMeta = (usage, extra = {}) => compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage, ...extra }, CFG);

ok('meta de hoje (Início): 3 estados e os três tipos clicáveis', () => {
  // hoje = terça: 6 min de estudo (pós-aula 4 + exercício 2), segunda bateu a meta
  const parcial = semMeta([uso(3, 0, 12, { pos: 6, ativ: 6 }), uso(3, 1, 6, { pos: 4, ativ: 2 })]);
  const h = Adesao.goalTodayHtml(parcial, { firstName: 'Ana' });
  assert.match(h, /Meta de estudo de hoje/);
  assert.match(h, /Quase lá, Ana!/);                         // 60% da meta
  assert.match(h, /Faltam <em>4 minutos<\/em>/);
  assert.match(h, />6<\/text>/);                             // minutos no centro do anel
  assert.equal((h.match(/data-cza-go=/g) || []).length, 3);
  assert.match(h, /data-cza-go="pos"/); assert.match(h, /data-cza-go="vocab"/); assert.match(h, /data-cza-go="aulas"/);
  assert.match(h, /Hoje: 4 min/);                            // pós-aula
  assert.match(h, /Hoje: 2 min/);                            // exercício
  assert.match(h, /Ainda não hoje/);                         // chunks/verbos
  assert.equal((h.match(/pill ok/g) || []).length, 2);
  assert.match(h, /1 de 5 dias com meta/);                   // só a segunda
  assert.match(h, /cza-gd on"><span>✓/);                     // segunda ✓
  assert.match(h, /cza-gd now today/);                       // hoje em andamento
  // zerado
  assert.match(Adesao.goalTodayHtml(semMeta([]), { firstName: 'Ana' }), /Vamos começar, Ana\?/);
  // meta batida (10 min) e meta da semana batida
  const bateu = semMeta([uso(3, 0, 11, { pos: 11 }), uso(3, 1, 10, { ativ: 10 })]);
  const hb = Adesao.goalTodayHtml(bateu, { firstName: 'Ana' });
  assert.match(hb, /Meta de hoje batida/);
  assert.match(hb, /Faltam <em>3 dias<\/em> para a meta da semana/);
  const semanaOk = Adesao.goalTodayHtml(compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage: [uso(3, 0, 11, { pos: 11 }), uso(3, 1, 10, { ativ: 10 })] }, { ...CFG, metaDiasEstudo: 2 }), {});
  assert.match(semanaOk, /E a meta da semana também/);
});

ok('meta de hoje: nome é escapado e a faixa de prévia aparece', () => {
  const h = Adesao.goalTodayHtml(semMeta([]), { firstName: '<img src=x onerror=alert(1)>', ribbon: 'Prévia: ainda não liberado' });
  assert.ok(!h.includes('<img'));
  assert.match(h, /cza-ribbon/);
});

ok('Meu estudo (Progresso): total, dias com meta, gráfico clicável, tipos feitos e "o que conta"', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 5, ativ: 5 }), uso(3, 1, 14, { pos: 6, ativ: 5 })]);
  const h = Adesao.goalWeekHtml(c);
  assert.match(h, /Meu estudo/);
  assert.match(h, /<b>26 min<\/b><span>de 50 min<\/span>/);
  assert.match(h, /2 de 5 dias com meta batida/);
  assert.match(h, /faltam 3 dias/);
  assert.equal((h.match(/data-cza-gday=/g) || []).length, 7);
  assert.match(h, /id="cza-gdayinfo"/);
  assert.match(h, /14 min de estudo \(pós-aula 6 min · atividades 5 min · vocabulário, verbos e chunks 3 min\)/);
  assert.match(h, /Ler pós-aula ✓/); assert.match(h, /Exercícios ✓/); assert.match(h, /Chunks e verbos ✓/);
  assert.match(h, /pausas de até <b>1 minuto<\/b>/);
  const h30 = Adesao.goalWeekHtml(compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage: [uso(3, 1, 3, { pos: 1 })] }, { ...CFG, limiteSeg: 30 }));
  assert.match(h30, /pausas de até <b>30 segundos<\/b>/);
  assert.match(h30, /Chunks e verbos: ainda não|Chunks e verbos ✓/);
});

ok('dias com meta acima do necessário: "6 dias com meta (a meta é 5)", nunca "6 de 5"', () => {
  assert.equal(Adesao.goalDaysTxt({ hits: 2, metaDias: 5 }), '2 de 5 dias com meta');
  assert.equal(Adesao.goalDaysTxt({ hits: 5, metaDias: 5 }), '5 de 5 dias com meta');
  assert.equal(Adesao.goalDaysTxt({ hits: 6, metaDias: 5 }), '6 dias com meta (a meta é 5)');
  const usage = [0, 1, 2, 3, 4, 5].map(d => uso(2, d, 12, { pos: 12 }));    // semana fechada: 6 dias de meta
  const h = Adesao.goalTodayHtml(semMeta([...usage, uso(3, 1, 3)]), {});
  assert.ok(!/6 de 5/.test(h));
});

ok('"O que conta" abre e fecha', () => {
  const mais = { hidden: true }, gatilho = { v: '', parentElement: { querySelector: () => mais }, setAttribute(k, v) { this.v = v; } };
  Adesao.toggleGoalInfo(gatilho);
  assert.equal(mais.hidden, false); assert.equal(gatilho.v, 'true');
  Adesao.toggleGoalInfo(gatilho);
  assert.equal(mais.hidden, true); assert.equal(gatilho.v, 'false');
});

console.log(`\n${n} testes passaram`);
