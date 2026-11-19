import assert from 'node:assert/strict';
import { createChallengeFunctions } from '../challenge.js';

// Firestore falso, igual ao do teste de demanda, só com o que a turma usa.
function firestore() {
  const docs = new Map();
  const snapshot = ref => ({ id:ref.path.split('/').at(-1), ref, exists:docs.has(ref.path), data:() => docs.get(ref.path) });
  const write = (ref, data, options) => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
  let queue = Promise.resolve();
  const db = {
    docs,
    doc(path) { return { path, get:async () => snapshot(db.doc(path)),
      set:async (data, options) => write(db.doc(path), data, options),
      collection:name => db.collection(`${path}/${name}`) }; },
    collection(path) { return { doc:id => db.doc(`${path}/${id}`),
      where:(field, operator, value) => ({ get:async () => ({ docs:(await db.collection(path).get()).docs.filter(doc => doc.data()[field] === value) }) }),
      get:async () => ({ docs:[...docs.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(key => snapshot(db.doc(key))) }) }; },
    batch() { const writes = []; return { set:(...args) => writes.push(args), commit:async () => writes.forEach(args => write(...args)) }; },
    runTransaction(callback) { const run = queue.then(async () => {
      const writes = []; const result = await callback({ get:async ref => snapshot(ref), set:(...args) => writes.push(args), create:(...args) => writes.push(args) });
      writes.forEach(args => write(...args)); return result;
    }); queue = run.catch(() => {}); return run; },
  };
  return db;
}

const q = (id, focus) => ({ id, format:'text', focus, topic:'Simple Present',
  prompt:'Translate to English:', context:'Eu trabalho todos os dias.', hint:'', options:[], correctOption:'',
  expected:'I work every day.', acceptedAnswers:['I work every day', 'I work every day.'], explanation:'Presente simples.' });
const part = () => [q('1','weak'), q('2','weak'), q('3','weak'),
  { ...q('4','strong'), format:'trueFalse', context:'She works every day.', options:[{ id:'a', text:'True' }, { id:'b', text:'False' }], correctOption:'a', acceptedAnswers:[], expected:'True' },
  { ...q('5','strong'), format:'multipleChoice', context:'He ___ at home.', options:[{ id:'a', text:'work' }, { id:'b', text:'works' }, { id:'c', text:'working' }, { id:'d', text:'worked' }], correctOption:'b', acceptedAnswers:[], expected:'works' }];

let calls = 0, gate = null, breakAi = false;
class FakeAnthropic {
  constructor() { this.messages = { create:async () => {
    calls++;
    if (gate) await gate;
    if (breakAi) throw new Error('boom: erro interno da API que o aluno não deve ver');
    return { stop_reason:'end_turn', usage:{ input_tokens:100, output_tokens:200 },
      content:[{ type:'text', text:JSON.stringify({ analysis:{ weakPoints:['Present'], strongPoints:[] }, part1:part(), part2:part() }) }] };
  } }; }
}

const db = firestore();
const post = { title:'Rotina', content:'I work every day.', createdAt:new Date('2026-11-08T12:00:00-03:00') };
const aluno = async (uid, name) => {
  await db.doc(`students/${uid}`).set({ name, firstName:name, schoolId:'school-1' });
  await db.doc(`students/${uid}/posaulas/p1`).set(post);
  await db.doc(`students/${uid}/classGroups/g1`).set({ schoolId:'school-1', id:'g1', active:true });
};
await aluno('u-karlla', 'Karlla'); await aluno('u-vitor', 'Vitor');
await db.doc('students/u-fora').set({ name:'Fora', schoolId:'school-1' });
await db.doc('schools/school-1/classGroups/g1').set({ name:'Karlla e Vitor', active:true, automaticChallenge:true,
  memberUids:['u-karlla', 'u-vitor'], memberNames:['Karlla', 'Vitor'] });

const fns = createChallengeFunctions({ db, getMessaging:() => null, adminEmails:['prof@example.test'],
  Anthropic:FakeAnthropic, anthropicApiKey:{ value:() => 'fake-no-network' } });
const as = (uid, data, email = `${uid}@example.test`) => ({ auth:{ uid, token:{ email } }, data });

let clock = new Date('2026-11-10T10:00:00-03:00');   // terça: Parte 1 aberta
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
  static now() { return clock.getTime(); }
};
try {
  // 1. Sem rodada ainda: a tela sabe disso, e ninguém de fora enxerga a turma.
  const antes = await fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  assert.equal(antes.weekKey, '2026-11-09');
  assert.equal(antes.partes[0].status, 'open');
  assert.equal(antes.partes[0].published, false);
  assert.equal(antes.partes[0].game, undefined, 'sem rodada não há jogo para começar');
  assert.equal(antes.partes[1].status, 'upcoming');
  await assert.rejects(fns.obterDesafioDaTurma.run(as('u-fora', { groupId:'g1' })), e => e.code === 'permission-denied');
  await assert.rejects(fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'nao-existe' })), e => e.code === 'permission-denied');
  await assert.rejects(fns.obterDesafioDaTurma.run({ data:{ groupId:'g1' } }), e => e.code === 'unauthenticated');
  // O espelho gravado dentro do aluno não basta: quem decide é o documento da escola.
  await db.doc('students/u-fora/classGroups/g1').set({ schoolId:'school-1', active:true });
  await assert.rejects(fns.obterDesafioDaTurma.run(as('u-fora', { groupId:'g1' })), e => e.code === 'permission-denied');
  await assert.rejects(fns.prepararDesafioDaTurma.run(as('u-fora', { groupId:'g1' })), e => e.code === 'permission-denied');
  assert.equal(calls, 0, 'abrir a tela e tentativas de fora não usam IA');

  // 2. Dois integrantes abrindo juntos pagam UMA chamada de IA.
  let release; gate = new Promise(resolve => { release = resolve; });
  const primeira = fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  await new Promise(resolve => setTimeout(resolve, 20));
  const segunda = await fns.prepararDesafioDaTurma.run(as('u-vitor', { groupId:'g1' }));
  assert.deepEqual(segunda, { preparing:true }, 'quem chega durante a geração só espera');
  release(); gate = null;
  const pronta = await primeira;
  assert.equal(pronta.ready, true);
  assert.equal(calls, 1);
  for (const uid of ['u-karlla', 'u-vitor']) {
    for (const parte of [1, 2]) {
      const id = `2026-11-09-g-g1-part-${parte}`;
      assert.equal(db.docs.get(`students/${uid}/challengeRounds/${id}`).groupId, 'g1');
      assert.equal(db.docs.get(`_challengeAnswerKeys/${id}_${uid}`).answers.length, 5);
    }
  }
  assert.equal((await fns.prepararDesafioDaTurma.run(as('u-vitor', { groupId:'g1' }))).ready, true);
  assert.equal(calls, 1, 'rodada já publicada não gera de novo');

  // 3. O estado entrega o jogo sem gabarito, e ninguém vê nota antes de a parte fechar.
  const k1 = await fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  const p1 = k1.partes[0];
  assert.equal(p1.published, true);
  assert.equal(p1.game.turma, true);
  assert.equal(p1.game.canStart, true);
  assert.equal(p1.game.round.roundId, '2026-11-09-g-g1-part-1');
  assert.equal(p1.game.round.questions.length, 5);
  assert.equal(p1.game.round.questions[0].expected, undefined, 'a pergunta não leva o gabarito');
  assert.equal(p1.game.round.questions[0].acceptedAnswers, undefined);
  assert.equal(p1.game.round.questions[0].hint, undefined);
  assert.equal(p1.placar, undefined);
  assert.equal(k1.partes[1].game, undefined, 'a Parte 2 ainda não abriu');

  // 4. Karlla joga a Parte 1 pelo caminho de sempre.
  const roundId = p1.roundId;
  const jogada = as('u-karlla', { roundId });
  const iniciou = await fns.iniciarDesafioSemanal.run(jogada);
  assert.equal(iniciou.round.questions.length, 5);
  assert.equal(calls, 1, 'iniciar a rodada da turma não gera nada novo');
  const certas = ['I work every day', 'I work every day', 'I work every day', 'a', 'b'];
  let ultima;
  for (let i = 0; i < 5; i++) {
    ultima = await fns.salvarRespostaDesafio.run(as('u-karlla', { roundId, questionId:`g1q${i + 1}`, value:certas[i] }));
  }
  assert.equal(ultima.completed, true);
  const resultado = db.docs.get(`_challengeResults/${roundId}_u-karlla`);
  assert.equal(resultado.score, 500);
  assert.equal(resultado.groupId, 'g1', 'o resultado fica marcado como de turma e fora do ranking geral');

  // 5. Só se sabe QUEM respondeu: nem nota, nem resposta, até a parte fechar.
  const v1 = await fns.obterDesafioDaTurma.run(as('u-vitor', { groupId:'g1' }));
  assert.deepEqual(v1.partes[0].membros.map(item => [item.name, item.done, item.isOwn]),
    [['Karlla', true, false], ['Vitor', false, true]]);
  assert.equal(v1.partes[0].game.canStart, true, 'o Vitor ainda pode jogar');
  assert.equal(JSON.stringify(v1).includes('"score"'), false, 'nenhuma nota vaza antes de fechar');
  const k2 = await fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  assert.equal(k2.partes[0].completed, true);
  assert.equal(k2.partes[0].game.canStart, false);
  assert.equal(k2.partes[0].details, undefined);

  // 6. O espelho do professor vê o aluno pedido; aluno comum não escolhe o uid.
  const espelho = await fns.obterDesafioDaTurma.run(as('prof', { groupId:'g1', uid:'u-vitor' }, 'prof@example.test'));
  assert.equal(espelho.partes[0].membros.find(item => item.isOwn).name, 'Vitor');
  const curioso = await fns.obterDesafioDaTurma.run(as('u-vitor', { groupId:'g1', uid:'u-karlla' }));
  assert.equal(curioso.partes[0].membros.find(item => item.isOwn).name, 'Vitor');

  // 7. Quinta: a Parte 1 fecha, o placar da dupla e as correções aparecem.
  clock = new NativeDate('2026-11-12T10:00:00-03:00');
  const quinta = await fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  assert.equal(quinta.partes[0].status, 'closed');
  assert.deepEqual(quinta.partes[0].placar.map(item => [item.name, item.done, item.score]),
    [['Karlla', true, 500], ['Vitor', false, 0]]);
  assert.equal(quinta.partes[0].details.length, 5);
  assert.equal(quinta.partes[0].details[0].expected, 'I work every day.');
  assert.equal(quinta.partes[0].game, undefined);
  assert.equal(quinta.partes[1].status, 'open');
  assert.equal(quinta.partes[1].game.round.roundId, '2026-11-09-g-g1-part-2');
  assert.equal(quinta.partes[1].game.canStart, true);

  // 8. Quem entra na turma depois recebe a MESMA rodada, sem IA nova.
  clock = new NativeDate('2026-11-10T10:00:00-03:00');
  await aluno('u-novo', 'Novo');
  const grupo = db.docs.get('schools/school-1/classGroups/g1');
  db.docs.set('schools/school-1/classGroups/g1', { ...grupo, memberUids:[...grupo.memberUids, 'u-novo'], memberNames:[...grupo.memberNames, 'Novo'] });
  const copiada = await fns.prepararDesafioDaTurma.run(as('u-novo', { groupId:'g1' }));
  assert.equal(copiada.copied, true);
  assert.equal(calls, 1);
  assert.deepEqual(db.docs.get('students/u-novo/challengeRounds/2026-11-09-g-g1-part-1').questions,
    db.docs.get('students/u-karlla/challengeRounds/2026-11-09-g-g1-part-1').questions);

  // 9. Falha da IA: mensagem neutra ao aluno, e não repete a chamada a cada toque.
  await db.doc('schools/school-1/classGroups/g2').set({ name:'Outra', active:true, automaticChallenge:true,
    memberUids:['u-karlla', 'u-vitor'], memberNames:['Karlla', 'Vitor'] });
  await db.doc('students/u-karlla/classGroups/g2').set({ schoolId:'school-1', active:true });
  breakAi = true;
  const antesFalha = calls;
  const falha = await fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g2' })).catch(e => e);
  assert.equal(falha.code, 'failed-precondition');
  assert.equal(/boom/.test(falha.message), false, 'o erro interno da API não chega ao aluno');
  assert.equal(calls, antesFalha + 1);
  await assert.rejects(fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g2' })), e => e.code === 'failed-precondition');
  assert.equal(calls, antesFalha + 1, 'falha recente espera dez minutos antes de tentar de novo');
  clock = new NativeDate('2026-11-10T10:11:00-03:00');
  breakAi = false;
  assert.equal((await fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g2' }))).ready, true);

  // 10. Turma desligada e semana encerrada não geram nada.
  await db.doc('schools/school-1/classGroups/g3').set({ name:'Desligada', active:true, automaticChallenge:false,
    memberUids:['u-karlla', 'u-vitor'], memberNames:['Karlla', 'Vitor'] });
  await db.doc('students/u-karlla/classGroups/g3').set({ schoolId:'school-1', active:true });
  await assert.rejects(fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g3' })), e => e.code === 'failed-precondition');
  clock = new NativeDate('2026-11-15T12:00:00-03:00');   // domingo: tudo fechado
  const domingo = await fns.obterDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }));
  assert.equal(domingo.partes.every(item => item.status === 'closed'), true);
  assert.equal((await fns.prepararDesafioDaTurma.run(as('u-karlla', { groupId:'g1' }))).skipped, 'semana-encerrada');
} finally { globalThis.Date = NativeDate; }
console.log('OK — turma: estado sem gabarito, geração única sob demanda, jogo pelo caminho de sempre, placar só depois de fechar, espelho do professor, entrada tardia, falha da IA e semana encerrada.');
