import assert from 'node:assert/strict';
import { createChallengeFunctions } from '../challenge.js';

// Firestore falso (mesmo do teste da turma): só o que o duelo e o painel usam.
function firestore() {
  const docs = new Map();
  let autoId = 0;
  const snapshot = ref => ({ id:ref.path.split('/').at(-1), ref, exists:docs.has(ref.path), data:() => docs.get(ref.path) });
  const write = (ref, data, options) => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
  const db = {
    docs,
    doc(path) { return { path, id:path.split('/').at(-1), get:async () => snapshot(db.doc(path)),
      set:async (data, options) => write(db.doc(path), data, options),
      collection:name => db.collection(`${path}/${name}`) }; },
    collection(path) { return { doc:id => db.doc(`${path}/${id ?? `auto-${++autoId}`}`),
      where:(field, operator, value) => ({ get:async () => ({ docs:(await db.collection(path).get()).docs
        .filter(doc => (operator === 'array-contains' ? (doc.data()[field] || []).includes(value) : doc.data()[field] === value)) }) }),
      get:async () => ({ docs:[...docs.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(key => snapshot(db.doc(key))) }) }; },
    batch() { const writes = []; return { set:(...args) => writes.push(args), commit:async () => writes.forEach(args => write(...args)) }; },
    runTransaction(callback) { return (async () => {
      const writes = []; const result = await callback({ get:async ref => snapshot(ref), set:(...args) => writes.push(args), create:(...args) => writes.push(args) });
      writes.forEach(args => write(...args)); return result;
    })(); },
  };
  return db;
}

const q = (id, focus) => ({ id, format:'text', focus, topic:'Simple Present',
  prompt:'Translate to English:', context:'Eu trabalho todos os dias.', hint:'', options:[], correctOption:'',
  expected:'I work every day.', acceptedAnswers:['I work every day', 'I work every day.'], explanation:'Presente simples.' });
const part = () => [q('1','weak'), q('2','weak'), q('3','weak'),
  { ...q('4','strong'), format:'trueFalse', context:'She works every day.', options:[{ id:'a', text:'True' }, { id:'b', text:'False' }], correctOption:'a', acceptedAnswers:[], expected:'True' },
  { ...q('5','strong'), format:'multipleChoice', context:'He ___ at home.', options:[{ id:'a', text:'work' }, { id:'b', text:'works' }, { id:'c', text:'working' }, { id:'d', text:'worked' }], correctOption:'b', acceptedAnswers:[], expected:'works' }];
let breakAi = false;
class FakeAnthropic {
  constructor() { this.messages = { create:async () => {
    if (breakAi) throw new Error('boom');
    return { stop_reason:'end_turn', usage:{ input_tokens:100, output_tokens:200 },
      content:[{ type:'text', text:JSON.stringify({ analysis:{ weakPoints:['Present'], strongPoints:[] }, part1:part(), part2:part() }) }] };
  } }; }
}

const db = firestore();
const sent = [];
let pushBroken = false;
const messaging = { sendEachForMulticast:async message => {
  if (pushBroken) throw new Error('FCM fora do ar');
  sent.push(message); return { successCount:message.tokens.length, failureCount:0 };
} };
const post = { title:'Rotina', content:'I work every day.', createdAt:new Date('2026-11-08T12:00:00-03:00') };
const aluno = async (uid, name, extra = {}) => {
  await db.doc(`students/${uid}`).set({ name, firstName:name, schoolId:'school-1', ...extra });
  await db.doc(`students/${uid}/posaulas/p1`).set(post);
};
await aluno('u-ana', 'Ana', { fcmToken:'token-ana' });
await aluno('u-bia', 'Bia', { fcmToken:'token-bia' });
await aluno('u-caio', 'Caio');                                     // sem notificação ligada
await db.doc('schools/school-1/classGroups/g1').set({ name:'Ana e Bia', active:true, automaticChallenge:true,
  memberUids:['u-ana', 'u-bia'], memberNames:['Ana', 'Bia'] });
await db.doc('schools/school-1/classGroups/g-velha').set({ name:'Arquivada', active:false, memberUids:[], memberNames:[] });

const fns = createChallengeFunctions({ db, getMessaging:() => messaging, adminEmails:['prof@example.test'],
  Anthropic:FakeAnthropic, anthropicApiKey:{ value:() => 'fake-no-network' } });
const as = (uid, data, email = `${uid}@example.test`) => ({ auth:{ uid, token:{ email } }, data });
const prof = data => as('u-prof', data, 'prof@example.test');

let clock = new Date('2026-11-19T20:00:00-03:00');   // quinta: Parte 1 fechada, Parte 2 aberta
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
  static now() { return clock.getTime(); }
};
try {
  // 1. Convite: o convidado recebe o aviso e o registro fica no duelo.
  const criado = await fns.criarDesafioEntreAlunos.run(as('u-ana', { opponentUid:'u-bia', mode:'quick' }));
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].tokens, ['token-bia'], 'o aviso vai só para quem foi convidado');
  assert.match(sent[0].notification.title, /Ana desafiou você/);
  assert.match(sent[0].notification.body, /Desafiar alguém/);
  assert.equal(sent[0].data.type, 'duel-invite');
  assert.equal(sent[0].data.duelId, criado.id);
  assert.equal(db.docs.get(`_challengeDuels/${criado.id}`).inviteNotified, true);
  assert.equal(db.docs.get(`_challengeDuels/${criado.id}`).status, 'pending');

  // 2. Aviso nunca atrapalha: aluno sem notificação e FCM fora do ar criam o convite do mesmo jeito.
  const semToken = await fns.criarDesafioEntreAlunos.run(as('u-ana', { opponentUid:'u-caio', mode:'live' }));
  assert.equal(db.docs.get(`_challengeDuels/${semToken.id}`).inviteNotified, false);
  assert.equal(sent.length, 1, 'sem token não há envio');
  pushBroken = true;
  await aluno('u-dedo', 'Dedo', { fcmToken:'token-dedo' });
  const fcmFora = await fns.criarDesafioEntreAlunos.run(as('u-ana', { opponentUid:'u-dedo', mode:'quick' }));
  pushBroken = false;
  assert.equal(fcmFora.ok, true);
  assert.equal(db.docs.get(`_challengeDuels/${fcmFora.id}`).status, 'pending');
  assert.equal(db.docs.get(`_challengeDuels/${fcmFora.id}`).inviteNotified, false);

  // 3. Aceite: quem criou é avisado de que já pode jogar. Recusa não avisa ninguém.
  sent.length = 0;
  const aceite = await fns.responderDesafioEntreAlunos.run(as('u-bia', { duelId:criado.id, accept:true }));
  assert.equal(aceite.status, 'accepted');
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].tokens, ['token-ana']);
  assert.match(sent[0].notification.title, /Bia aceitou o duelo/);
  assert.equal(sent[0].data.type, 'duel-accepted');
  sent.length = 0;
  await fns.responderDesafioEntreAlunos.run(as('u-caio', { duelId:semToken.id, accept:false }));
  assert.equal(sent.length, 0);

  // 4. Falha da IA ao aceitar: o aviso de "pode jogar" não sai.
  breakAi = true;
  await assert.rejects(fns.responderDesafioEntreAlunos.run(as('u-dedo', { duelId:fcmFora.id, accept:true })), e => e.code === 'internal');
  breakAi = false;
  assert.equal(sent.length, 0);
  assert.equal(db.docs.get(`_challengeDuels/${fcmFora.id}`).status, 'generation_error');

  // 5. Painel do professor: só admin, só da escola pedida, com nota e quem terminou.
  await assert.rejects(fns.obterDuelosAdmin.run(as('u-ana', { schoolId:'school-1' })), e => e.code === 'permission-denied');
  await assert.rejects(fns.obterDuelosAdmin.run(prof({})), e => e.code === 'invalid-argument');
  await db.doc('_challengeDuels/de-outra-escola').set({ schoolId:'school-2', participantUids:['x', 'y'], participantNames:['X', 'Y'], status:'pending' });
  const duelRound = db.docs.get(`_challengeDuels/${criado.id}`).roundId;
  await db.doc(`students/u-ana/challengeSubmissions/${duelRound}`).set({ completed:true, answers:[] });
  await db.doc(`_challengeResults/${duelRound}_u-ana`).set({ uid:'u-ana', score:700, roundId:duelRound });
  const painel = await fns.obterDuelosAdmin.run(prof({ schoolId:'school-1' }));
  assert.equal(painel.weekKey, '2026-11-16');
  assert.equal(painel.duels.length, 3, 'duelo de outra escola não aparece');
  const duelo = painel.duels.find(item => item.id === criado.id);
  assert.equal(duelo.status, 'accepted');
  assert.equal(duelo.inviteNotified, true);
  assert.deepEqual(duelo.players.map(p => [p.name, p.isCreator, p.done, p.score]), [['Ana', true, true, 700], ['Bia', false, false, null]]);
  assert.equal(painel.duels.find(item => item.id === fcmFora.id).status, 'generation_error');
  assert.equal(painel.duels.find(item => item.id === semToken.id).status, 'declined');
  assert.equal(JSON.stringify(painel).includes('expected'), false, 'o painel não carrega gabarito');

  // 6. Duplas: só as ativas; Parte 1 fechada sem rodada, Parte 2 aberta ainda sem perguntas.
  assert.equal(painel.turmas.length, 1);
  const turma = painel.turmas[0];
  assert.equal(turma.name, 'Ana e Bia');
  assert.deepEqual(turma.members, ['Ana', 'Bia']);
  assert.deepEqual(turma.partes.map(item => [item.part, item.status, item.published]), [[1, 'closed', false], [2, 'open', false]]);

  // 7. Depois de "Preparar agora" (gerarDesafioDaTurma) a Parte 2 aparece publicada, e a Parte 1 segue fechada.
  await assert.rejects(fns.gerarDesafioDaTurma.run(as('u-ana', { schoolId:'school-1', groupId:'g1' })), e => e.code === 'permission-denied');
  const gerou = await fns.gerarDesafioDaTurma.run(prof({ schoolId:'school-1', groupId:'g1' }));
  assert.deepEqual(gerou.written, [2], 'só a Parte 2 está aberta na quinta');
  const depois = (await fns.obterDuelosAdmin.run(prof({ schoolId:'school-1' }))).turmas[0];
  assert.deepEqual(depois.partes.map(item => [item.part, item.published]), [[1, false], [2, true]]);
  assert.deepEqual(depois.partes[1].membros.map(item => [item.name, item.done]), [['Ana', false], ['Bia', false]]);
  const repetiu = await fns.gerarDesafioDaTurma.run(prof({ schoolId:'school-1', groupId:'g1' }));
  assert.equal(repetiu.skipped, 'ja-publicado', 'apertar de novo não gera nem cobra outra vez');
} finally {
  globalThis.Date = NativeDate;
}
console.log('OK — duelos: aviso de convite e de aceite sem atrapalhar nada, painel do professor e preparar a dupla na hora.');
