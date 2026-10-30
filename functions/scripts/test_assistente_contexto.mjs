// Teste do material que o assistente de dúvidas lê (functions/assistente.js). Sem rede e sem banco: dados inventados.
import assert from 'node:assert/strict';
import { tokens, htmlParaLinhas, contextoPosAulas, contextoAtividades, questoesDaParte } from '../assistente.js';

const posaula = (id, data, topic, corpo) => ({ id, topic, title: `Pós-aula ${data}`, createdAt: new Date(`${data}T12:00:00Z`), html: `<html><style>p{color:red}</style><body><h1>Resumo</h1><p>📘 Resumo da Aula</p>${corpo}<script>alert(1)</script></body></html>` });
const aulas = [
  posaula('a2', '2026-10-21', 'Do/does', '<p>1. Foco: depois de does o verbo fica na forma base. Does she work? Yes, she does.</p><p>don&#x27;t e doesn&#x27;t são as formas negativas.</p><table><tr><td>handsome → more handsome</td><td>bonito</td></tr></table>'),
  posaula('a1', '2026-10-14', 'Comparativos', '<p>Comparativos: funny → funnier, tall → taller.</p><p>Vocabulário de família: wife, husband, cousin.</p>'),
];

// 1) limpeza do HTML
const linhas = htmlParaLinhas(aulas[0].html);
assert.ok(!linhas.join(' ').includes('alert(1)') && !linhas.join(' ').includes('color:red'), 'script e estilo saem');
assert.ok(linhas.join(' ').includes("don't"), 'entidade &#x27; vira apóstrofo');

// 2) a pergunta puxa os trechos certos
const a = contextoPosAulas(aulas, 'Quando eu uso does?');
assert.match(a.estatico, /Pós-aula 21\/10/, 'resumo da aula mais nova no bloco fixo');
// resumoPorAula: 1 deixa só o título no bloco fixo; o resto da aula só entra se combinar com a pergunta
const b = contextoPosAulas(aulas, 'Como faço o comparativo de funny?', { resumoPorAula: 1 });
assert.match(b.dinamico, /funny → funnier/, 'trecho do comparativo aparece no dinâmico');
assert.ok(!/cousin/.test(b.dinamico), 'o que não combina com a pergunta fica de fora');
assert.match(contextoPosAulas(aulas, 'O que é handsome?', { resumoPorAula: 1 }).dinamico, /handsome/);
assert.equal(contextoPosAulas([], 'qualquer coisa').estatico, '');

// 3) atividades: só a semana mais recente, com resposta e certo/errado
const atividade = (id, title, week, extra = {}) => ({
  id, title, week, createdAt: new Date(), status: 'pending', finalizada: false,
  parts: [{ id: 'part-1', content: '<ol><li>What _____ she do? [does/do]</li><li>My brother _____ tall. (to be)</li></ol>' }],
  respostas: { 'part-1': { e0: 'does', e1: 'is' } }, ...extra,
});
const ats = [
  atividade('x1', 'Do / does', '23 DE OUTUBRO 2026', { status: 'corrected', correcao: { 'part-1': [{ status: 'ok' }, { status: 'erro', correct: 'is' }] } }),
  atividade('x2', 'Semana velha', '09 DE OUTUBRO 2026'),
];
assert.deepEqual(questoesDaParte(ats[0].parts[0].content).length, 2);
const c = contextoAtividades(ats, 'does');
assert.match(c.estatico, /Do \/ does/);
assert.ok(!c.estatico.includes('Semana velha'), 'só a última semana');
assert.match(c.estatico, /acertou 1 de 2/);
assert.match(c.dinamico, /respondeu: "does" → CERTO/);
assert.ok(tokens('Quando eu uso does e do?').includes('does'), 'does/do não são palavras de parada');
assert.deepEqual(contextoAtividades([], 'x'), { estatico: '', dinamico: '', semana: '' });

console.log('assistente_contexto: ok');
