import assert from 'node:assert/strict';
import {
  HAIKU_ASSISTENTE, SONNET_ASSISTENTE, lerPerguntaAssistente, classificarPerguntaAssistente,
  gerarRespostaAssistente, textoRespostaAssistente, reservarPerguntaAssistente, custoAssistenteUSD,
  contextoPosAulas,
} from '../assistente.js';

function simularClaude(...textos) {
  const chamadas = [];
  const client = { messages: { create: async (opcoes) => {
    chamadas.push(opcoes);
    assert.ok(textos.length, 'chamada extra à API');
    return { model: opcoes.model, content: [{ type: 'text', text: textos.shift() }] };
  } } };
  return { client, chamadas };
}

const consultaProibida = () => assert.fail('tradução não deve consultar o material');
const pergunta = 'Como se diz fim de semana mesmo?';
const exercicio = { enunciado: 'Complete com o verbo', item: 'Peter ___ home' };
const anterior = { pergunta: 'Como se diz ontem?', resposta: 'yesterday' };
const exemplos = [
  [{ pergunta, exercicio, contexto: 'Peter Gets Away', previa: 'Leia a página', dadosEstudo: { nota: 99 }, anterior }, pergunta, 'weekend'],
  [{ pergunta: 'O que significa which?' }, 'O que significa which?', 'qual / quais\nque / o qual / a qual / os quais / as quais'],
  [{ pergunta: "Para perguntar o que a pessoa fez ontem, posso falar 'What did you have yesterday?'" }, "Para perguntar o que a pessoa fez ontem, posso falar 'What did you have yesterday?'", 'What did you do yesterday?'],
  [{ pergunta: 'Como se diz fim de semana mesmo? Enunciado: “Complete com o verbo” Exercício: “Peter ___ home” Explique o que ele pede e como pensar, mas NÃO dê a resposta.' }, pergunta, 'weekend'],
];
for (const [dados, esperado, traducao] of exemplos) {
  const { client, chamadas } = simularClaude('TRADUCAO', traducao);
  const entrada = lerPerguntaAssistente(dados);
  assert.equal(entrada.pergunta, esperado);
  const { rota } = await classificarPerguntaAssistente(client, entrada);
  const res = await gerarRespostaAssistente(client, { rota, modelo: HAIKU_ASSISTENTE, entrada, carregarContexto: consultaProibida });
  assert.equal(textoRespostaAssistente(res.retorno), traducao);
  assert.deepEqual(res.aulas, []);
  assert.equal(res.semanaAtividades, '');
  assert.equal(chamadas.length, 2);
  for (const c of chamadas) {
    assert.equal(c.model, HAIKU_ASSISTENTE);
    assert.deepEqual(c.thinking, { type: 'disabled' });
    assert.deepEqual(JSON.parse(c.messages[0].content), { pergunta: esperado });
  }
  assert.match(chamadas[1].system, /uma por linha/);
  assert.match(chamadas[1].system, /Sem saudação, explicação, exemplos/);
}

const continuacao = simularClaude('TRADUCAO_CONT', 'weekend');
const dependente = lerPerguntaAssistente({ pergunta: 'E essa?', anterior, exercicio });
const { rota } = await classificarPerguntaAssistente(continuacao.client, dependente);
await gerarRespostaAssistente(continuacao.client, { rota, modelo: HAIKU_ASSISTENTE, entrada: dependente, carregarContexto: consultaProibida });
assert.deepEqual(JSON.parse(continuacao.chamadas[1].messages[0].content), { pergunta: 'E essa?', anterior });

const explicacao = simularClaude('GERAL', 'Use do para perguntar sobre o que alguém fez.');
const entradaExplicacao = lerPerguntaAssistente({ pergunta: 'Por quê?', anterior, exercicio });
const { rota: rotaExplicacao } = await classificarPerguntaAssistente(explicacao.client, entradaExplicacao);
await gerarRespostaAssistente(explicacao.client, {
  rota: rotaExplicacao, modelo: HAIKU_ASSISTENTE, entrada: entradaExplicacao, regras: 'Prompt pedagógico',
  carregarContexto: (rota) => {
    assert.equal(rota, 'GERAL');
    return { blocos: [], aulas: [], semanaAtividades: '' };
  },
});
assert.match(explicacao.chamadas[1].messages[0].content, /Conversa anterior.*Como se diz ontem/);
assert.doesNotMatch(explicacao.chamadas[1].messages[0].content, /Peter/);

const ajuda = simularClaude('EXERCICIO', 'Pista: procure o verbo que indica movimento.');
const entradaAjuda = lerPerguntaAssistente({ pergunta: 'Estou com dificuldade nesse exercício.', exercicio });
const { rota: rotaAjuda } = await classificarPerguntaAssistente(ajuda.client, entradaAjuda);
await gerarRespostaAssistente(ajuda.client, {
  rota: rotaAjuda, modelo: HAIKU_ASSISTENTE, entrada: entradaAjuda, regras: 'Não dê o gabarito',
  carregarContexto: () => ({ blocos: [], aulas: [], semanaAtividades: '' }),
});
assert.match(ajuda.chamadas[1].messages[0].content, /Enunciado: Complete com o verbo\n\nExercício: Peter ___ home/);
assert.equal(ajuda.chamadas[1].system[0].text, 'Não dê o gabarito');

const pos = contextoPosAulas([
  { id: 'uma', html: '<p>Comparativo: funny vira funnier.</p>' },
  { id: 'outra', html: '<p>Vocabulário de família: wife, husband, cousin.</p>' },
], 'Explique funny', { resumoPorAula: 0 });
assert.equal(pos.estatico, '');
assert.match(pos.dinamico, /funnier/);
assert.doesNotMatch(pos.dinamico, /husband/);
assert.deepEqual(pos.ids, ['uma']);

// Imita a repetição de transações do Firestore quando dois leitores disputam o mesmo documento.
function bancoEmMemoria(inicial) {
  const docs = new Map(Object.entries(inicial));
  let revisao = 0;
  let conflitos = 0;
  return {
    docs,
    conflitos: () => conflitos,
    async runTransaction(fn) {
      for (;;) {
        const anterior = revisao;
        const escritas = new Map();
        const retorno = await fn({
          async get(ref) {
            const d = docs.get(ref);
            return { get: (campo) => d?.[campo] };
          },
          set(ref, dados) { escritas.set(ref, { ...docs.get(ref), ...dados }); },
        });
        if (anterior !== revisao) { conflitos++; continue; }
        for (const [ref, dados] of escritas) docs.set(ref, dados);
        if (escritas.size) revisao++;
        return retorno;
      }
    },
  };
}

const reservar = (db, uid, rota = 'DIFICIL', limite = 30) => reservarPerguntaAssistente(db, {
  usoRef: uid, mesRef: 'geral', uid, mes: '2026-11', limite, rota, atualizadoEm: 'agora',
});
const db = bancoEmMemoria({ geral: { haiku: 18, sonnet: 1 }, aluna: { perguntas: 30 } });
assert.equal(await reservar(bancoEmMemoria({ aluna: { perguntas: 20 } }), 'aluna', 'TRADUCAO'), HAIKU_ASSISTENTE, 'aluna que já fez 20 pode continuar');
assert.equal(await reservar(db, 'aluna'), null, 'cota padrão de 30');
assert.equal(await reservar(db, 'aluna', 'TRADUCAO', 40), HAIKU_ASSISTENTE, 'cota personalizada de 40');
const reservados = await Promise.all([reservar(db, 'aluno-a'), reservar(db, 'aluno-b', 'DIFICIL_MATERIAL')]);
assert.deepEqual(reservados.sort(), [HAIKU_ASSISTENTE, SONNET_ASSISTENTE]);
assert.ok(db.conflitos() > 0);
assert.deepEqual(db.docs.get('geral'), { haiku: 18, sonnet: 2 });
assert.equal(await reservar(db, 'aluno-c'), HAIKU_ASSISTENTE, 'fallback quando o Sonnet esgota');
assert.equal(await reservar(bancoEmMemoria({ geral: { haiku: 8 } }), 'aluno-d'), HAIKU_ASSISTENTE);
assert.equal(await reservar(bancoEmMemoria({ geral: { haiku: 9 } }), 'aluno-d'), SONNET_ASSISTENTE);

// ── Cota compartilhada: quem chega nos 30 recebe de 5 em 5, tirado de quem não usou ──
const BASE = 30;
const turma = (ids) => async () => ids.map((id) => ({ uid: id, base: BASE, ref: id }));
const pedir = (banco, uid, ids, rota = 'GERAL') => reservarPerguntaAssistente(banco, {
  usoRef: uid, mesRef: 'geral', uid, mes: '2026-11', limite: BASE, rota, atualizadoEm: 'agora', carregarColegas: turma(ids),
});
const limitesSomados = (banco, ids) => ids.reduce((soma, id) => {
  const d = banco.docs.get(id) || {};
  return soma + BASE + (d.extras || 0) - (d.emprestou || 0);
}, 0);
const parados = ['p1', 'p2', 'p3', 'p4'];
const todos = ['gu', ...parados];

// dentro do limite: não mexe em ninguém
let cota = bancoEmMemoria({ gu: { perguntas: 29 } });
assert.equal(await pedir(cota, 'gu', todos), HAIKU_ASSISTENTE);
assert.deepEqual(cota.docs.get('gu'), { perguntas: 30, uid: 'gu', mes: '2026-11', atualizadoEm: 'agora' });
assert.equal(cota.docs.has('p1'), false, 'não tira de ninguém antes de precisar');

// no 31º pedido recebe 5, espalhados entre os parados, e a soma dos limites não muda
cota = bancoEmMemoria({ gu: { perguntas: 30 } });
assert.equal(await pedir(cota, 'gu', todos), HAIKU_ASSISTENTE);
assert.equal(cota.docs.get('gu').perguntas, 31);
assert.equal(cota.docs.get('gu').extras, 5);
const cedidos = parados.map((id) => cota.docs.get(id)?.emprestou || 0);
assert.equal(cedidos.reduce((a, b) => a + b, 0), 5);
assert.ok(Math.max(...cedidos) <= 2, 'empréstimo espalhado: ' + cedidos);
assert.equal(cota.docs.get('gu').emprestou, undefined, 'o aluno não cede a si mesmo');
assert.equal(limitesSomados(cota, todos), BASE * todos.length);

// as 4 perguntas seguintes já estão pagas; a 6ª pede mais um bloco de 5
for (let i = 0; i < 4; i++) assert.equal(await pedir(cota, 'gu', todos), HAIKU_ASSISTENTE);
assert.equal(cota.docs.get('gu').extras, 5, 'ainda dentro do bloco');
assert.equal(await pedir(cota, 'gu', todos), HAIKU_ASSISTENTE);
assert.equal(cota.docs.get('gu').extras, 10);
assert.equal(limitesSomados(cota, todos), BASE * todos.length);

// quem emprestou fica com menos: usa só o que sobrou (e guarda sempre a reserva de 10)
cota = bancoEmMemoria({ gu: { perguntas: 30 }, p1: { emprestou: 20, perguntas: 10 }, p2: { emprestou: 20, perguntas: 10 } });
assert.equal(await pedir(cota, 'gu', ['gu', 'p1', 'p2']), null, 'ninguém pode ceder: p1 e p2 já estão na reserva');
assert.equal(await pedir(cota, 'p1', ['gu', 'p1', 'p2']), null, 'p1 gastou o que lhe restou depois de emprestar');

// a reserva de 10 é intocável: quem tem exatamente 10 sobrando não cede, quem tem 11 cede uma
cota = bancoEmMemoria({ gu: { perguntas: 30 }, p1: { perguntas: 20 }, p2: { perguntas: 20 } });
assert.equal(await pedir(cota, 'gu', ['gu', 'p1', 'p2']), null, 'reserva de 10 protegida');
cota = bancoEmMemoria({ gu: { perguntas: 30 }, p1: { perguntas: 19 }, p2: { perguntas: 20 } });
assert.equal(await pedir(cota, 'gu', ['gu', 'p1', 'p2']), HAIKU_ASSISTENTE, 'cede só o que passa da reserva');
assert.deepEqual([cota.docs.get('gu').extras, cota.docs.get('p1').emprestou], [1, 1]);
assert.equal(await pedir(cota, 'gu', ['gu', 'p1', 'p2']), null, 'acabou o que dava para ceder');

// teto de 30 extras por aluno (60 no mês) e ninguém sobrando
cota = bancoEmMemoria({ gu: { perguntas: 60, extras: 30 } });
assert.equal(await pedir(cota, 'gu', todos), null, 'teto de 30 extras');
cota = bancoEmMemoria({ gu: { perguntas: 30 }, p1: { perguntas: 30 }, p2: { perguntas: 30 } });
assert.equal(await pedir(cota, 'gu', ['gu', 'p1', 'p2']), null, 'todos zeraram');

// sem lista de alunos continua valendo o limite
assert.equal(await reservar(bancoEmMemoria({ gu: { perguntas: 30 } }), 'gu'), null);

// dois alunos estourando ao mesmo tempo: cada um recebe os seus 5 e a conta fecha
const seis = ['a', 'b', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
cota = bancoEmMemoria({ a: { perguntas: 30 }, b: { perguntas: 30 } });
assert.deepEqual(await Promise.all([pedir(cota, 'a', seis), pedir(cota, 'b', seis)]), [HAIKU_ASSISTENTE, HAIKU_ASSISTENTE]);
assert.ok(cota.conflitos() > 0);
assert.equal(cota.docs.get('a').extras + cota.docs.get('b').extras, 10);
assert.equal(['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].reduce((s, id) => s + (cota.docs.get(id)?.emprestou || 0), 0), 10);
assert.equal(limitesSomados(cota, seis), BASE * seis.length);

const uso = {
  input_tokens: 1_000_000, output_tokens: 1_000_000, cache_read_input_tokens: 1_000_000,
  cache_creation_input_tokens: 2_000_000,
  cache_creation: { ephemeral_5m_input_tokens: 1_000_000, ephemeral_1h_input_tokens: 1_000_000 },
};
assert.equal(custoAssistenteUSD(SONNET_ASSISTENTE, uso), 18.7);
assert.equal(custoAssistenteUSD(HAIKU_ASSISTENTE, uso), 0.935);
assert.equal(custoAssistenteUSD(HAIKU_ASSISTENTE, { cache_creation_input_tokens: 1_000_000 }), 0.125);
console.log('assistente_roteamento: ok');
