// Regras do Financeiro do painel (admin/index.html), testadas no código de verdade:
// as funções são extraídas do HTML e rodam aqui com dados de mentira.
//   node functions/scripts/test_finance_rules.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const html = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../admin/index.html'), 'utf8');
const lines = html.split(/\r?\n/);

// Pega "function nome(" ou "const nome =" e vai até fechar as chaves.
function extrair(nome) {
  const inicio = lines.findIndex(l => new RegExp(`^\\s{4}(async )?function ${nome}\\(|^\\s{4}const ${nome}\\s*=`).test(l));
  if (inicio < 0) throw new Error(`não achei ${nome} em admin/index.html`);
  let prof = 0, abriu = false, fim = inicio;
  for (; fim < lines.length; fim += 1) {
    for (const ch of lines[fim]) { if (ch === '{') { prof += 1; abriu = true; } else if (ch === '}') prof -= 1; }
    if ((abriu && prof === 0) || (!abriu && /;\s*$/.test(lines[fim]))) break;
  }
  return lines.slice(inicio, fim + 1).join('\n');
}

const NOMES = ['adminDate', 'adminDateKey', 'calendarDateKey', 'calendarAddDays', 'calendarOccursOn', 'pendChaveSerie', 'pendIndexarEventos',
  'financeMoney', 'financeMonthBounds', 'financeMonthIndex', 'financeFirstChargedMonth', 'financeProfileStartMonth', 'financeBeforeStart',
  'financeDateKeyOf', 'financeUltimaAulaDada', 'financeSaidaDeCobranca', 'financeDesligadoEm', 'financePausas',
  'financeVencimentoDoMes', 'financePatchVencimento', 'financeDataDoPagamento', 'financeMensalidadeDoMes', 'financePatchMensalidade',
  'financeProfilePartsBase', 'financeProfileParts',
  'financeRecebidoDaEtapa', 'financePartStatus', 'financeAnnualTransactions', 'financeAnnualCovers', 'financeIsBogusTuition', 'financeIsPlanned',
  'financeCountsInMonth', 'financeMonthForecast'];
const codigo = `const financeSaidaCache = new Map();\n${NOMES.map(extrair).join('\n')}
return { financeProfileParts, financePartStatus, financeMonthForecast, financeDesligadoEm, financePatchVencimento, financeDataDoPagamento,
  financeUltimaAulaDada, financeVencimentoDoMes, financeCountsInMonth, financeMensalidadeDoMes, financePatchMensalidade,
  set: dados => { Object.assign(estado, dados); financeSaidaCache.clear(); } };`;
const estado = { allStudents: [], financeProfiles: [], financeTransactions: [], financeCalendarEvents: [], hoje: '2026-10-16' };
const financeTodayKey = () => estado.hoje;
const lib = new Function('estado', 'financeTodayKey', `
  let allStudents, financeProfiles, financeTransactions, financeCalendarEvents;
  const sync = () => ({ get allStudents() { return estado.allStudents; } });
  ${codigo.replace(/\ballStudents\b/g, 'estado.allStudents').replace(/\bfinanceProfiles\b/g, 'estado.financeProfiles')
    .replace(/\bfinanceTransactions\b/g, 'estado.financeTransactions').replace(/\bfinanceCalendarEvents\b/g, 'estado.financeCalendarEvents')}
`)(estado, financeTodayKey);

let n = 0;
const ok = (nome, fn) => { fn(); n += 1; console.log('ok  ', nome); };
const tx = (uid, mes, parte, centavos, data) => ({ type:'income', category:'tuition', studentUid:uid, referenceMonth:mes, referencePart:parte, amountCents:centavos, date:data || `${mes}-10` });
const ts = iso => ({ toDate: () => new Date(iso) });
const rotulos = (perfil, mes) => lib.financeProfileParts(perfil, mes).map(p => `${p.short}:${lib.financePartStatus(perfil, mes, p).key}`);

// ── Thifany: quinzenal, última aula 01/10, cadastro arquivado em 10/10 ─────────
const THIF = 't1';
const thifany = () => ({ studentUid:THIF, studentName:'Thifany', active:false, activeBeforeArchive:true, cycle:'biweekly', monthlyCents:25000,
  dueDay:5, dueDay2:20, archivedAt:ts('2026-10-10T10:21:00Z') });
const aulasThifany = [
  { type:'lesson', studentUid:THIF, startTime:'18:00', endTime:'19:00', repeat:'weekly', date:'2026-08-24', repeatUntil:'2026-09-27', canceladas:['2026-09-21'], source:'cadastro' },
  { type:'lesson', studentUid:THIF, startTime:'18:00', endTime:'19:00', repeat:'weekly', date:'2026-10-01', repeatUntil:'2026-10-09', canceladas:['2026-10-08'], source:'cadastro' },
];
const pagosThifany = [tx(THIF, '2026-08', 1, 12500), tx(THIF, '2026-08', 2, 12500), tx(THIF, '2026-09', 1, 12500)];
const cenarioThifany = (extra = {}, pagos = pagosThifany, eventos = aulasThifany) => {
  const perfil = { ...thifany(), ...extra };
  lib.set({ allStudents:[{ uid:THIF, inicioCurso:'2026-08-05' }], financeProfiles:[perfil], financeTransactions:pagos, financeCalendarEvents:eventos });
  return perfil;
};

ok('ex-aluno é cobrado até a última aula dada (01/10), não até o arquivamento (10/10)', () => {
  const perfil = cenarioThifany();
  assert.equal(lib.financeDesligadoEm(perfil), '2026-10-01');
});

ok('etapas: setembro tem a 2ª em aberto; a 1ª de outubro (sem aula) nem existe', () => {
  const perfil = cenarioThifany();
  assert.deepEqual(rotulos(perfil, '2026-09'), ['1ª:paid', '2ª:overdue']);
  assert.deepEqual(rotulos(perfil, '2026-10'), []);
  assert.deepEqual(rotulos(perfil, '2026-11'), []);
});

ok('dar baixa na dívida de ex-aluno SOBE o previsto (ela não estava na conta); o recebido do mês sobe igual', () => {
  const perfil = cenarioThifany();
  const recebidoAntes = 4425_00;
  const antes = lib.financeMonthForecast('2026-09', recebidoAntes);
  assert.equal(antes, recebidoAntes);                       // dívida de ex-aluno fora da previsão
  const comBaixa = [...pagosThifany, tx(THIF, '2026-09', 2, 12500, '2026-10-16')];
  cenarioThifany({}, comBaixa);
  assert.deepEqual(rotulos(perfil, '2026-09'), ['1ª:paid', '2ª:paid']);
  assert.equal(lib.financeMonthForecast('2026-09', recebidoAntes + 12500), antes + 12500);
  assert.equal(lib.financeCountsInMonth(comBaixa.at(-1), '2026-09'), true);    // conta no mês de origem
  assert.equal(lib.financeCountsInMonth(comBaixa.at(-1), '2026-10'), false);   // e não no mês do pagamento
});

ok('data de saída fixada à mão manda: 05/10 traz a 1ª de outubro de volta', () => {
  const perfil = cenarioThifany({ saidaCobranca:'2026-10-05' });
  assert.deepEqual(rotulos(perfil, '2026-10'), ['1ª:overdue']);
  assert.equal(lib.financeMonthForecast('2026-10', 0), 0);   // continua fora da previsão
});

ok('desconsiderar etapa de ex-aluno não mexe na previsão (ela nunca entrou)', () => {
  const perfil = cenarioThifany({ saidaCobranca:'2026-10-05', desconsiderados:['2026-10|1ª quinzena'] });
  assert.deepEqual(rotulos(perfil, '2026-10'), ['1ª:dropped']);
  assert.equal(lib.financeMonthForecast('2026-10', 0), 0);
});

ok('sem aula na agenda, vale o dia do arquivamento', () => {
  const perfil = cenarioThifany({}, pagosThifany, []);
  assert.equal(lib.financeDesligadoEm(perfil), '2026-10-10');
  assert.deepEqual(rotulos(perfil, '2026-10'), ['1ª:overdue']);
});

ok('etapa depois da saída que JÁ foi paga continua na planilha', () => {
  const perfil = cenarioThifany({}, [...pagosThifany, tx(THIF, '2026-10', 1, 12500, '2026-10-06')]);
  assert.deepEqual(rotulos(perfil, '2026-10'), ['1ª:paid']);
});

// ── Aluno ativo: baixa não muda o previsto, só troca "a receber" por "recebido" ─
ok('aluno ativo: dar baixa mantém o previsto igual', () => {
  const ativo = { studentUid:'a1', studentName:'Ana', active:true, cycle:'monthly', monthlyCents:25000, dueDay:10 };
  lib.set({ allStudents:[{ uid:'a1', inicioCurso:'2026-01-01' }], financeProfiles:[ativo], financeTransactions:[], financeCalendarEvents:[] });
  const antes = lib.financeMonthForecast('2026-10', 0);
  assert.equal(antes, 25000);
  lib.set({ financeTransactions:[tx('a1', '2026-10', 0, 25000, '2026-10-12')] });
  assert.equal(lib.financeMonthForecast('2026-10', 25000), antes);
});

// ── Data do pagamento (Dan) ────────────────────────────────────────────────────
ok('Dan: 1ª aula 14/10, pagamento dia 21 — outubro vence 21, nada atrasado no dia 16', () => {
  const dan = { studentUid:'d1', studentName:'Dan', active:true, cycle:'monthly', monthlyCents:25000, dueDay:21,
    vencimentos:[{ desde:'0000-00', dia:14 }, { desde:'2026-10', dia:21 }] };
  lib.set({ allStudents:[{ uid:'d1', inicioCurso:'2026-10-14' }], financeProfiles:[dan], financeTransactions:[], financeCalendarEvents:[] });
  const [etapa] = lib.financeProfileParts(dan, '2026-10');
  assert.equal(etapa.dueKey, '2026-10-21');
  assert.equal(lib.financePartStatus(dan, '2026-10', etapa).key, 'pending');
  assert.deepEqual(lib.financeProfileParts(dan, '2026-09'), []);   // antes do início do curso
});

ok('aluno cadastrado com pagamento só em novembro: outubro não cobra', () => {
  const novo = { studentUid:'n1', active:true, cycle:'monthly', monthlyCents:25000, dueDay:4, vencimentos:[{ desde:'2026-11', dia:4 }] };
  lib.set({ allStudents:[{ uid:'n1', inicioCurso:'2026-10-28' }], financeProfiles:[novo], financeTransactions:[], financeCalendarEvents:[] });
  assert.deepEqual(lib.financeProfileParts(novo, '2026-10'), []);
  assert.equal(lib.financeProfileParts(novo, '2026-11')[0].dueKey, '2026-11-04');
});

ok('trocar a data do pagamento vale do mês dela em diante e preserva o passado', () => {
  const dan = { studentUid:'d1', active:true, cycle:'monthly', monthlyCents:25000, dueDay:21,
    vencimentos:[{ desde:'0000-00', dia:14 }, { desde:'2026-10', dia:21 }] };
  const patch = lib.financePatchVencimento(dan, '2026-12-05', 0, 'monthly');
  const depois = { ...dan, ...patch };
  lib.set({ allStudents:[{ uid:'d1', inicioCurso:'2026-10-14' }], financeProfiles:[depois], financeTransactions:[], financeCalendarEvents:[] });
  assert.equal(lib.financeProfileParts(depois, '2026-11')[0].dueKey, '2026-11-21');
  assert.equal(lib.financeProfileParts(depois, '2026-12')[0].dueKey, '2026-12-05');
  assert.equal(lib.financePatchVencimento(dan, '2026-10-21', 0, 'monthly'), null);   // nada mudou
});

// ── Valor da mensalidade (Rebeca: 2 → 3 aulas por semana, 320 → 390 em novembro) ─
const REB = 'r1';
const rebeca = () => ({ studentUid:REB, studentName:'Rebeca', active:true, cycle:'monthly', monthlyCents:32000, dueDay:19 });
const pagosRebeca = [tx(REB, '2026-08', 0, 32000, '2026-08-19'), tx(REB, '2026-09', 0, 32000, '2026-09-19'), tx(REB, '2026-10', 0, 32000, '2026-10-20')];
const cenarioRebeca = perfil => lib.set({ allStudents:[{ uid:REB, inicioCurso:'2026-08-19' }], financeProfiles:[perfil], financeTransactions:pagosRebeca, financeCalendarEvents:[], hoje:'2026-11-03' });

ok('Rebeca: subir para 390 em novembro não mexe em agosto, setembro e outubro', () => {
  const antes = rebeca();
  const patch = lib.financePatchMensalidade(antes, 39000, '2026-11');
  assert.deepEqual(patch, { valoresAnteriores:[{ ate:'2026-10', cents:32000 }] });
  const depois = { ...antes, monthlyCents:39000, ...patch };
  cenarioRebeca(depois);
  for (const mes of ['2026-08', '2026-09', '2026-10']) {
    assert.equal(lib.financeProfileParts(depois, mes)[0].amount, 32000);
    assert.deepEqual(rotulos(depois, mes), ['Mês:paid']);
  }
  assert.equal(lib.financeProfileParts(depois, '2026-11')[0].amount, 39000);
  assert.deepEqual(rotulos(depois, '2026-11'), ['Mês:pending']);
  assert.equal(lib.financeMonthForecast('2026-10', 32000), 32000);   // outubro continua 320
});

ok('sem o histórico (bug de antes) os meses velhos viram "Parcial" — o histórico resolve', () => {
  const semHistorico = { ...rebeca(), monthlyCents:39000 };
  cenarioRebeca(semHistorico);
  assert.equal(lib.financePartStatus(semHistorico, '2026-10', lib.financeProfileParts(semHistorico, '2026-10')[0]).key, 'overdue');
  const comHistorico = { ...semHistorico, valoresAnteriores:[{ ate:'2026-10', cents:32000 }] };
  cenarioRebeca(comHistorico);
  assert.equal(lib.financePartStatus(comHistorico, '2026-10', lib.financeProfileParts(comHistorico, '2026-10')[0]).key, 'paid');
});

ok('duas mudanças de valor: cada período guarda o seu', () => {
  let perfil = { ...rebeca(), monthlyCents:39000, valoresAnteriores:[{ ate:'2026-10', cents:32000 }] };
  const patch = lib.financePatchMensalidade(perfil, 45000, '2027-02');
  perfil = { ...perfil, monthlyCents:45000, ...patch };
  assert.deepEqual(perfil.valoresAnteriores, [{ ate:'2026-10', cents:32000 }, { ate:'2027-01', cents:39000 }]);
  assert.deepEqual(['2026-09', '2026-10', '2026-11', '2027-01', '2027-02', '2027-03'].map(m => lib.financeMensalidadeDoMes(perfil, m)),
    [32000, 32000, 39000, 39000, 45000, 45000]);
});

ok('virada de ano: mudança em janeiro guarda dezembro como último mês do valor antigo', () => {
  const patch = lib.financePatchMensalidade(rebeca(), 39000, '2027-01');
  assert.deepEqual(patch, { valoresAnteriores:[{ ate:'2026-12', cents:32000 }] });
});

ok('mexer de novo no mesmo mês da mudança só corrige o valor de agora', () => {
  const perfil = { ...rebeca(), monthlyCents:39000, valoresAnteriores:[{ ate:'2026-10', cents:32000 }] };
  assert.deepEqual(lib.financePatchMensalidade(perfil, 40000, '2026-11'), { valoresAnteriores:[{ ate:'2026-10', cents:32000 }] });
  const corrigido = { ...perfil, monthlyCents:40000 };
  assert.equal(lib.financeMensalidadeDoMes(corrigido, '2026-10'), 32000);
  assert.equal(lib.financeMensalidadeDoMes(corrigido, '2026-11'), 40000);
});

ok('valor igual, sem perfil ou valor vazio: nada a gravar', () => {
  assert.equal(lib.financePatchMensalidade(rebeca(), 32000, '2026-11'), null);
  assert.equal(lib.financePatchMensalidade(null, 39000, '2026-11'), null);
  assert.equal(lib.financePatchMensalidade(rebeca(), 0, '2026-11'), null);
});

ok('cadastro antigo, sem histórico: o valor de agora vale em todos os meses', () => {
  assert.equal(lib.financeMensalidadeDoMes(rebeca(), '2026-01'), 32000);
  assert.equal(lib.financeMensalidadeDoMes(rebeca(), '2027-06'), 32000);
});

ok('quinzenal: as duas metades seguem o valor do mês', () => {
  const perfil = { studentUid:'q1', active:true, cycle:'biweekly', monthlyCents:40000, dueDay:5, dueDay2:20, valoresAnteriores:[{ ate:'2026-10', cents:30000 }] };
  lib.set({ allStudents:[{ uid:'q1', inicioCurso:'2026-01-01' }], financeProfiles:[perfil], financeTransactions:[], financeCalendarEvents:[] });
  assert.deepEqual(lib.financeProfileParts(perfil, '2026-10').map(p => p.amount), [15000, 15000]);
  assert.deepEqual(lib.financeProfileParts(perfil, '2026-11').map(p => p.amount), [20000, 20000]);
});

ok('anual não usa o histórico; vindo do anual o histórico antigo é descartado', () => {
  const anual = { studentUid:'a9', cycle:'annual', monthlyCents:25000, annualCents:300000, valoresAnteriores:[{ ate:'2026-10', cents:11111 }] };
  assert.equal(lib.financeMensalidadeDoMes(anual, '2026-05'), 25000);
  assert.deepEqual(lib.financePatchMensalidade(anual, 30000, '2026-11'), { valoresAnteriores:[] });
});

console.log(`\n${n} testes passaram`);
