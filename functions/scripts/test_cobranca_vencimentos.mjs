// Confere que o servidor (Cobrar / aviso) calcula o vencimento igual ao painel:
// lista `vencimentos` (data do pagamento com histórico) e cadastros antigos sem lista.
import assert from 'node:assert/strict';
import { cobrancaInternals } from '../cobranca.js';

const { etapasDoMes, pendenciaDoPerfil } = cobrancaInternals;
const venc = (perfil, mes) => etapasDoMes(perfil, mes).map(item => item.venceEm);
let n = 0;
const ok = (nome, fn) => { fn(); n += 1; console.log('ok  ', nome); };

ok('cadastro antigo (sem lista) segue o dueDay em todo mês', () => {
  const perfil = { cycle:'monthly', monthlyCents:25000, dueDay:14 };
  assert.deepEqual(venc(perfil, '2026-10'), ['2026-10-14']);
  assert.deepEqual(venc(perfil, '2026-01'), ['2026-01-14']);
});

ok('Dan: lista com sentinela e data nova — outubro vence dia 21', () => {
  const perfil = { cycle:'monthly', monthlyCents:25000, dueDay:21,
    vencimentos:[{ desde:'0000-00', dia:14 }, { desde:'2026-10', dia:21 }] };
  assert.deepEqual(venc(perfil, '2026-10'), ['2026-10-21']);
  assert.deepEqual(venc(perfil, '2026-09'), ['2026-09-14']);   // o que já passou não muda
});

ok('mudança agendada para dezembro não mexe em outubro/novembro', () => {
  const perfil = { cycle:'monthly', monthlyCents:25000, dueDay:5,
    vencimentos:[{ desde:'0000-00', dia:14 }, { desde:'2026-10', dia:21 }, { desde:'2026-12', dia:5 }] };
  assert.deepEqual(venc(perfil, '2026-11'), ['2026-11-21']);
  assert.deepEqual(venc(perfil, '2026-12'), ['2026-12-05']);
});

ok('aluno cadastrado com data em novembro: antes disso não há cobrança', () => {
  const perfil = { cycle:'monthly', monthlyCents:25000, dueDay:4, vencimentos:[{ desde:'2026-11', dia:4 }] };
  assert.deepEqual(etapasDoMes(perfil, '2026-10'), []);
  assert.deepEqual(venc(perfil, '2026-11'), ['2026-11-04']);
  assert.equal(pendenciaDoPerfil(perfil, 'u1', [], '2026-10-30'), null);   // não dá para cobrar
});

ok('Dan não está atrasado antes do dia 22 e vira cobrável com 3 dias', () => {
  const perfil = { cycle:'monthly', monthlyCents:25000, dueDay:21,
    vencimentos:[{ desde:'0000-00', dia:14 }, { desde:'2026-10', dia:21 }] };
  assert.equal(pendenciaDoPerfil(perfil, 'dan', [], '2026-10-16'), null);
  assert.equal(pendenciaDoPerfil(perfil, 'dan', [], '2026-10-24'), null);          // 2 dias de atraso
  assert.equal(pendenciaDoPerfil(perfil, 'dan', [], '2026-10-25')?.venceEm, '2026-10-21');   // 3 dias
});

ok('quinzenal com lista: dia e dia2 por mês', () => {
  const perfil = { cycle:'biweekly', monthlyCents:25000, dueDay:5, dueDay2:20,
    vencimentos:[{ desde:'0000-00', dia:5, dia2:20 }, { desde:'2026-11', dia:10, dia2:25 }] };
  assert.deepEqual(venc(perfil, '2026-10'), ['2026-10-05', '2026-10-20']);
  assert.deepEqual(venc(perfil, '2026-11'), ['2026-11-10', '2026-11-25']);
});

ok('anual não é afetado pela lista', () => {
  const perfil = { cycle:'annual', monthlyCents:1000, annualCents:12000, annualMonth:'2026-10', dueDay:10,
    vencimentos:[{ desde:'2026-12', dia:3 }] };
  assert.deepEqual(venc(perfil, '2026-10'), ['2026-10-10']);
});

console.log(`\n${n} testes passaram`);
