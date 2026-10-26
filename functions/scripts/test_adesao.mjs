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

ok('estado do dia: ✕ só para dia que já passou e que o app media; hoje nunca é ✕', () => {
  // hoje = terça 20/10. Sexta 16/10 = 12 min, sábado 17/10 = 4 min, domingo 18/10 = 30 s; segunda 19/10 sem uso.
  const c = semMeta([uso(2, 4, 12, { pos: 12 }), uso(2, 5, 4, { pos: 4 }), uso(2, 6, 1, { pos: 0.5, outros: 0.5 })]);
  assert.equal(c.measureFrom, '2026-09-28');
  const st = k => Adesao.dayStatus(c, k).st;
  assert.equal(st('2026-10-16'), 'hit');
  assert.equal(st('2026-10-17'), 'part');
  assert.equal(st('2026-10-18'), 'x');        // 30 s: menos de 1 minuto de estudo
  assert.equal(st('2026-10-19'), 'x');        // sem nenhum uso
  assert.equal(st('2026-10-20'), 'now');      // hoje sem estudo ainda: o dia corre, não é ✕
  assert.equal(st('2026-10-21'), 'fut');
  assert.equal(st('2026-09-20'), 'pre');      // antes de o app medir: não dá para dizer que não estudou
  // aluno que entrou depois do início da coleta: dias antes do cadastro são "sem medição"
  const novo = semMeta([], { student: { createdAt: new Date(2026, 9, 15) } });
  assert.equal(novo.measureFrom, '2026-10-15');
  assert.equal(Adesao.dayStatus(novo, '2026-10-14').st, 'pre');
  assert.equal(Adesao.dayStatus(novo, '2026-10-15').st, 'x');
  // dia com uso gravado antes da data de início continua contando (existe medição)
  const cedo = semMeta([uso(0, 0, 8, { pos: 8 })], { student: { createdAt: new Date(2026, 9, 15) } });
  assert.equal(Adesao.dayStatus(cedo, '2026-09-28').st, 'part');
});

ok('cartão do Início: anel, frase curta e a semana com os minutos; tudo abre a página', () => {
  // hoje = terça: 6 min (pós-aula 4 + exercício 2); segunda bateu a meta com 12 min
  const c = semMeta([uso(3, 0, 12, { pos: 6, ativ: 6 }), uso(3, 1, 6, { pos: 4, ativ: 2 })]);
  const h = Adesao.goalHomeHtml(c, { firstName: 'Ana' });
  assert.match(h, /Meta de estudo de hoje/);
  assert.match(h, /Quase lá, Ana!/);                              // 60% da meta
  assert.match(h, /Faltam <em>4 minutos<\/em> para a meta de hoje/);
  assert.match(h, />6<\/text>/);                                  // minutos no centro do anel
  assert.match(h, />min<\/text>/);                                // e a unidade, para não parecer dia do mês
  assert.equal((h.match(/class="cza-bb /g) || []).length, 7);
  assert.equal((h.match(/data-cza-open/g) || []).length, 8);      // cartão + 7 bolinhas
  assert.ok(!h.includes('data-cza-go'));                          // sem a lista de atalhos
  assert.match(h, /cza-bb hit" data-cza-open data-cza-k="2026-10-19" aria-label="segunda 19\/10"><span><b>12<small>m<\/small><\/b><\/span><i>Seg<\/i>/);
  assert.match(h, /cza-bb now today" data-cza-open data-cza-k="2026-10-20"[^>]*><span style="--p:60%"><b>6<small>m<\/small><\/b>/);
  assert.match(h, /cza-bb fut" data-cza-open data-cza-k="2026-10-21" disabled/);
  // zerado: o dia anterior sem estudo (medido) leva ✕
  const zero = Adesao.goalHomeHtml(semMeta([]), { firstName: 'Ana' });
  assert.match(zero, /Vamos começar, Ana\?/);
  assert.match(zero, /cza-bb x" data-cza-open data-cza-k="2026-10-19"[^>]*><span>✕<\/span>/);
  // meta batida
  const bateu = semMeta([uso(3, 0, 11, { pos: 11 }), uso(3, 1, 10, { ativ: 10 })]);
  assert.match(Adesao.goalHomeHtml(bateu, { firstName: 'Ana' }), /Meta de hoje batida/);
  assert.match(Adesao.goalMsg(bateu, 'Ana').text, /Faltam <em>3 dias<\/em> para a meta da semana/);
  const semanaOk = compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage: [uso(3, 0, 11, { pos: 11 }), uso(3, 1, 10, { ativ: 10 })] }, { ...CFG, metaDiasEstudo: 2 });
  assert.match(Adesao.goalMsg(semanaOk, 'Ana').text, /E a meta da semana também/);
});

ok('cartão do Início: nome é escapado e a faixa de prévia aparece', () => {
  const h = Adesao.goalHomeHtml(semMeta([]), { firstName: '<img src=x onerror=alert(1)>', ribbon: 'Prévia: ainda não liberado' });
  assert.ok(!h.includes('<img'));
  assert.match(h, /cza-ribbon/);
});

ok('cartão "Meu estudo" (Progresso): total da semana e só os dias', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 5, ativ: 5 }), uso(3, 1, 14, { pos: 6, ativ: 5 })]);
  const h = Adesao.goalProgressHtml(c);
  assert.match(h, /Meu estudo/);
  assert.match(h, /26 min no app/);
  assert.match(Adesao.goalProgressHtml(compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage: [uso(3, 0, 12, { pos: 5, ativ: 5 }), uso(3, 1, 14, { pos: 6, ativ: 5 })], metas: { semH: 3 } }, CFG)), /26 min de 3 h/);
  assert.equal((h.match(/class="cza-bb /g) || []).length, 7);
  assert.equal((h.match(/data-cza-open/g) || []).length, 8);
  assert.ok(!/cza-gchart|cza-gbar/.test(h));
});

ok('detalhe do dia: tipos, itens com nome (escapado) e uso fora do estudo', () => {
  const c = semMeta([uso(3, 0, 22, { pos: 5, ativ: 12, des: 3, outros: 1, items: { pos_p1: 5 * 60, act_a1: 8 * 60, act_a2: 4 * 60, vocab_verbs: 60 } })], {
    posts: [{ id: 'p1', title: 'Pós-aula 12/10 · Present <b>perfect</b>', classDate: new Date(2026, 9, 12) }],
    activities: [{ id: 'a1', name: 'Habits & Plans', createdAt: new Date(2026, 9, 19), exTotal: 10, exFeitos: 10 }],
  });
  const h = Adesao.dayDetailHtml(c, '2026-10-19');
  assert.match(h, /Segunda, 19\/10/);
  assert.match(h, /data-cza-close[^>]*aria-label="Fechar o dia"/);          // X para fechar o dia
  assert.match(Adesao.dayDetailHtml(c, '2026-10-18'), /data-cza-close/);
  assert.match(h, /Meta batida ✓/);
  assert.match(h, /21 min <small>de estudo/);
  assert.match(h, /<b>Pós-aula<\/b><em>5 min<\/em>/);
  assert.match(h, /<b>Atividades<\/b><em>12 min<\/em>/);
  assert.match(h, /<b>Desafio da semana<\/b><em>3 min<\/em>/);
  assert.match(h, /<b>Verbos, chunks e vocabulário<\/b><em>1 min<\/em>/);
  assert.match(h, /Habits &amp; Plans<\/span><span>8 min/);       // nome da atividade, escapado
  assert.match(h, /<span>Atividade<\/span><span>4 min/);           // atividade que não veio na lista: nome genérico
  assert.match(h, /Verbos irregulares<\/span><span>1 min/);
  assert.ok(!h.includes('<b>perfect'));
  assert.match(h, /Present &lt;b&gt;perfect&lt;\/b&gt;/);
  assert.match(h, /Mais 1 min em outras telas/);
  assert.match(Adesao.dayDetailHtml(c, '2026-10-18'), /Não estudou nenhum minuto/);
  assert.match(Adesao.dayDetailHtml(c, '2026-09-20'), /ainda não media/);
  assert.equal(Adesao.dayDetailHtml(c, '2026-10-22'), '');
  assert.match(Adesao.dayDetailHtml(c, '2026-10-20'), /Hoje ainda não teve estudo/);
  const pouco = semMeta([uso(2, 6, 1, { pos: 0.5, outros: 0.5 })]);
  assert.match(Adesao.dayDetailHtml(pouco, '2026-10-18'), /Estudou menos de 1 minuto/);
  const parcial = semMeta([uso(2, 5, 4, { pos: 4 })]);
  assert.match(Adesao.dayDetailHtml(parcial, '2026-10-17'), /estudou um pouco/);
  assert.match(Adesao.dayDetailHtml(parcial, '2026-10-17'), /a meta é 10 min/);
});

ok('calendário: mês certo, dias futuros travados e navegação só dentro do período medido', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 12 })]);
  const h = Adesao.calendarHtml(c, '2026-10');
  assert.match(h, /Outubro de 2026/);
  assert.equal((h.match(/data-cza-pick="cal"/g) || []).length, 31);
  assert.equal((h.match(/cza-cc blank/g) || []).length, 3);        // 1º de outubro de 2026 é quinta
  assert.equal((h.match(/cza-cc fut/g) || []).length, 11);         // 21 a 31
  assert.match(h, /cza-cc hit" data-cza-pick="cal" data-cza-k="2026-10-19"[^>]*><em>19<\/em><b>12<small>m<\/small><\/b>/);
  assert.match(h, /cza-cc x" data-cza-pick="cal" data-cza-k="2026-10-18"[^>]*><em>18<\/em><b>✕<\/b>/);
  assert.match(h, /data-cza-month="next" disabled/);               // não passa do mês de hoje
  assert.ok(!/data-cza-month="prev" disabled/.test(h));            // setembro ainda tem dias medidos
  const set = Adesao.calendarHtml(c, '2026-09');
  assert.match(set, /Setembro de 2026/);
  assert.match(set, /data-cza-month="prev" disabled/);             // antes de 28/09 não há medição
  assert.match(set, /cza-cc pre" data-cza-pick="cal" data-cza-k="2026-09-27"/);
});

ok('página de adesão: tudo reunido, dia pré-aberto e sem título repetido', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 6, ativ: 6 }), uso(3, 1, 6, { pos: 4, ativ: 2 })]);
  const h = Adesao.pageHtml(c, { firstName: 'Ana', sel: '2026-10-19' });
  assert.match(h, /Meta de estudo de hoje/);
  assert.match(h, /O que dá para fazer agora/);
  assert.equal((h.match(/data-cza-go=/g) || []).length, 3);
  assert.match(h, /Sua semana/);
  assert.match(h, /cza-bb hit sel" data-cza-pick="week" data-cza-k="2026-10-19"/);
  assert.match(h, /data-cza-box="week"><div class="cza-dy">.*Segunda, 19\/10/);
  assert.match(h, /Calendário/);
  assert.match(h, /data-cza-cal aria-expanded="false"/);
  assert.match(h, /<div class="cza-cal" hidden>/);
  assert.match(h, /Esta semana/);
  assert.match(h, /18 de 50 min|<b>18 min<\/b>/);
  assert.match(h, /O que conta como tempo de estudo\?/);
  assert.ok(!h.includes('data-cza-toggle'));                      // a nota já vem aberta
  assert.ok(!h.includes('class="cza-title"'));                    // o título "Minha adesão" é da página
  assert.match(Adesao.pageHtml(c, {}), /Toque num dia para ver o detalhe/);
  assert.ok(!/6 de 5/.test(Adesao.pageHtml(semMeta([...[0, 1, 2, 3, 4, 5].map(d => uso(2, d, 12, { pos: 12 })), uso(3, 1, 3)]), {})));
});

ok('antes da primeira nota: cada ponto mostra o motivo (coletando ou não se aplica), sem precisar abrir nada', () => {
  // Aluno com aula, Desafio e pós-aula, mas sem atividades; a medição começou quarta 14/10 (semana 12/10 não conta).
  const base = {
    now: NOW, student: {}, usage: [uso(3, 0, 8, { pos: 8, items: { pos_p1: 8 * 60 } })],
    posts: [post('p1', 3, 0)], activities: [],
    attendance: [pres(3, 0)], challenge: { enabled: true, weeks: [dia(3, 0)], completed: [`${dia(3, 0)}-part-1`] },
  };
  const c = compute(base, { coletaDesde: '2026-10-14' });
  assert.equal(c.status, 'coletando');
  assert.equal(c.firstNota, '2026-10-26');            // a semana de 19/10 fecha domingo; a nota sai na segunda
  assert.equal(c.live.aulasPres, 1); assert.equal(c.live.desFeitas, 1); assert.equal(c.live.desDisp, 2); assert.equal(c.live.atN, 0);
  const h = Adesao.studentHtml(c, { firstName: 'Mateus', collapsible: false });
  assert.match(h, /A medição começou em 14\/10, então a primeira nota aparece em 26\/10/);
  assert.match(h, /Esta semana: 1 de 2 dias estudados|Esta semana: 1 dia estudado|Esta semana: 0 de 2 dias estudados/);
  assert.match(h, /Nenhuma atividade foi enviada para você nas últimas semanas/);        // Atividades: não se aplica, com o motivo
  assert.match(h, /Você foi a 1 de 1 aulas nas últimas semanas/);                        // Aulas: coletando, com o número de hoje
  assert.match(h, /Você fez 1 de 2 partes do Desafio nas últimas semanas/);              // Desafio: coletando, com o número de hoje
  assert.match(h, /Até agora: 8 min de leitura por pós-aula/);
  assert.match(h, /a nota aparece em 26\/10/);
  assert.equal((h.match(/<em>coletando<\/em>/g) || []).length, 4);                      // constância, pós-aula, aulas e desafio
  assert.equal((h.match(/<em>não se aplica<\/em>/g) || []).length, 1);                  // só atividades
  // Desafio desligado e sem aulas: o motivo é dito
  const off = compute({ ...base, attendance: [], challenge: { enabled: false } }, { coletaDesde: '2026-10-14' });
  const ho = Adesao.studentHtml(off, { collapsible: false });
  assert.match(ho, /O Desafio não está ligado para você/);
  assert.match(ho, /Não houve aulas previstas para você nas últimas semanas/);
});

ok('página de adesão: a nota já vem aberta (sem "Ver detalhes") e não repete o mapa de 4 semanas', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 6, ativ: 6 }), uso(3, 1, 6, { pos: 4, ativ: 2 })]);
  const h = Adesao.pageHtml(c, { firstName: 'Ana' });
  assert.ok(!h.includes('Ver detalhes') && !h.includes('data-cza-toggle'));
  assert.match(h, /O que conta na sua adesão/);
  assert.match(h, /Seus dias da semana/);
  assert.ok(!h.includes('Seu mapa de estudo'));        // o calendário da página já faz esse papel
  assert.ok(!h.includes('<h4>Sua semana</h4>'));        // e a semana em bolinhas também
  assert.match(h, /Recado do seu professor/);
});

ok('toques na página: dia abre o detalhe ali mesmo; atalho e cartão avisam o app', () => {
  const c = semMeta([uso(3, 0, 12, { pos: 12 })]);
  const el = (attrs) => ({ classList: { add() {}, remove() {} }, getAttribute: n => (n in attrs ? attrs[n] : null), ...attrs.props });
  const tap = (sel, attrs) => ({ target: { closest: s => (s === sel ? el(attrs) : null) } });
  const box = { innerHTML: '' }, host = { querySelector: s => (s === '[data-cza-box="week"]' ? box : null), querySelectorAll: () => [] };
  assert.deepEqual(Adesao.pageClick(tap('[data-cza-pick]', { 'data-cza-pick': 'week', 'data-cza-k': '2026-10-19' }), host, c), {});
  assert.match(box.innerHTML, /Segunda, 19\/10/);
  assert.match(box.innerHTML, /12 min/);
  assert.equal(Adesao.pageClick(tap('[data-cza-go]', { 'data-cza-go': 'pos' }), host, c).go, 'pos');
  assert.equal(Adesao.pageClick(tap('[data-cza-open]', { 'data-cza-k': '2026-10-19' }), host, c).open, '2026-10-19');
  assert.equal(Adesao.pageClick(tap('[data-cza-open]', {}), host, c).open, null);
  assert.equal(Adesao.pageClick({ target: { closest: () => null } }, host, c), null);
});

ok('horas de estudo: cada pós-aula publicado soma a duração da aula (só desde a medição), mais o estudo no app', () => {
  const posts = [post('p0', 0, 1), post('p2', 2, 1), post('p1', 3, 0), post('pf', 3, 5)];   // 29/09, 13/10, 19/10 e uma aula ainda no futuro (25/10)
  const base = { now: NOW, student: { aulaDuracao: 90 }, usage: [uso(3, 0, 12, { pos: 12 }), uso(2, 2, 30, { ativ: 30 })], posts, activities: [], attendance: [], challenge: { enabled: false } };
  const c = compute(base, CFG);
  const H = c.hours;
  assert.equal(H.dur, 90);
  assert.deepEqual([H.aulas.n, H.aulas.nSem, H.aulas.nMes], [3, 1, 2]);       // futura não conta; 29/09 é de setembro
  assert.deepEqual([H.aulas.min, H.aulas.minSem, H.aulas.minMes], [270, 90, 180]);
  assert.deepEqual([H.app.total, H.app.sem, H.app.mes], [42, 12, 42]);
  assert.deepEqual([H.total, H.sem, H.mes], [312, 102, 222]);
  const h = Adesao.hoursHtml(c);
  assert.match(h, /<b>5 h 12 min<\/b><span>no total/);
  assert.match(h, /3 aulas × 1 h 30 min/);
  assert.equal((h.match(/Escolha a sua meta no Perfil/g) || []).length, 2);      // sem meta escolhida: só o tempo
  assert.ok(!h.includes('de 3 h'));
  const com = Adesao.hoursHtml(compute({ ...base, metas: { semH: 3, mesH: 12 } }, CFG));
  assert.match(com, /1 h 42 min de 3 h/);
  assert.match(com, /3 h 42 min de 12 h/);
  assert.match(com, /Faltam <b>8 h 18 min<\/b>/);
  assert.ok(!com.includes('Escolha a sua meta no Perfil'));
  // sem duração no cadastro vale 60 min; aula antes da medição não entra
  assert.equal(compute({ ...base, student: {} }, CFG).hours.dur, 60);
  const tarde = compute(base, { coletaDesde: '2026-10-14' });
  assert.equal(tarde.hours.aulas.n, 1);                                         // 29/09 e 13/10 ficam de fora
  // sem pós-aula nenhum: "entra com cada pós-aula" e total só do app
  const sem = compute({ ...base, posts: [] }, CFG);
  assert.equal(sem.hours.total, 42);
  assert.match(Adesao.hoursHtml(sem), /entra com cada pós-aula/);
});

ok('metas do aluno: a meta por dia troca a da escola nas telas dele e não mexe na nota', () => {
  const dados = (metas) => ({ ...maratonista(), metas });
  const sem = compute(dados(undefined), CFG), com = compute(dados({ diaMin: 20, semH: 3, mesH: 12 }), CFG);
  assert.equal(sem.cfg.metaDiaMin, 10);
  assert.equal(com.cfg.metaDiaMin, 20);
  assert.deepEqual(com.metas, { diaMin: 20, semH: 3, mesH: 12 });
  assert.equal(com.index, sem.index);                                           // a nota de adesão é a mesma
  // meta por dia de 20: 6 min hoje faltam 14
  const c = compute({ now: NOW, student: {}, challenge: {}, posts: [], activities: [], attendance: [], usage: [uso(3, 1, 6, { pos: 6 })], metas: { diaMin: 20 } }, CFG);
  assert.match(Adesao.goalMsg(c, 'Ana').short, /Faltam <em>14 minutos<\/em>/);
  assert.equal(Adesao.todayOf(c).hit, false);
  // valores fora do limite ou vazios ficam em aberto
  assert.deepEqual(Adesao.metasOf({ diaMin: 0, semH: 'x', mesH: 700 }), { diaMin: null, semH: null, mesH: null });
  assert.deepEqual(Adesao.metasOf(null), { diaMin: null, semH: null, mesH: null });
  assert.deepEqual(Adesao.metasOf({ diaMin: 600, semH: 0.5, mesH: 500 }), { diaMin: 600, semH: 0.5, mesH: 500 });
});

ok('"Escolha a sua meta no Perfil" avisa o app', () => {
  const tap = { target: { closest: sel => (sel === '[data-cza-perfil]' ? {} : null) } };
  assert.deepEqual(Adesao.pageClick(tap, {}, semMeta([])), { perfil: true });
});

ok('dias com meta acima do necessário: "6 dias com meta (a meta é 5)", nunca "6 de 5"', () => {
  assert.equal(Adesao.goalDaysTxt({ hits: 2, metaDias: 5 }), '2 de 5 dias com meta');
  assert.equal(Adesao.goalDaysTxt({ hits: 5, metaDias: 5 }), '5 de 5 dias com meta');
  assert.equal(Adesao.goalDaysTxt({ hits: 6, metaDias: 5 }), '6 dias com meta (a meta é 5)');
});

ok('"O que conta" abre e fecha', () => {
  const mais = { hidden: true }, gatilho = { v: '', parentElement: { querySelector: () => mais }, setAttribute(k, v) { this.v = v; } };
  Adesao.toggleGoalInfo(gatilho);
  assert.equal(mais.hidden, false); assert.equal(gatilho.v, 'true');
  Adesao.toggleGoalInfo(gatilho);
  assert.equal(mais.hidden, true); assert.equal(gatilho.v, 'false');
});

console.log(`\n${n} testes passaram`);
