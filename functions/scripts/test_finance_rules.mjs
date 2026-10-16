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
  'financeVencimentoDoMes', 'financePatchVencimento', 'financeDataDoPagamento', 'financeProfilePartsBase', 'financeProfileParts',
  'financeRecebidoDaEtapa', 'financePartStatus', 'financeAnnualTransactions', 'financeAnnualCovers', 'financeIsBogusTuition', 'financeIsPlanned',
  'financeCountsInMonth', 'financeMonthForecast'];
const codigo = `const financeSaidaCache = new Map();\n${NOMES.map(extrair).join('\n')}
return { financeProfileParts, financePartStatus, financeMonthForecast, financeDesligadoEm, financePatchVencimento, financeDataDoPagamento,
  financeUltimaAulaDada, financeVencimentoDoMes, financeCountsInMonth,
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

console.log(`\n${n} testes passaram`);
