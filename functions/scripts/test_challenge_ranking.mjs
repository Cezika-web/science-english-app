import assert from 'node:assert/strict';
import { createChallengeFunctions } from '../challenge.js';

// Firestore falso (o mesmo dos testes de turma e duelo), só com o que o histórico e os rankings usam.
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

class FakeAnthropic { constructor() { this.messages = { create:async () => { throw new Error('a IA não deve ser usada aqui'); } }; } }

const db = firestore();
const aluno = (uid, name, extra = {}) => db.doc(`students/${uid}`).set({ name, firstName:name, schoolId:'school-1', ...extra });
for (const [uid, name] of [['u-ana', 'Ana'], ['u-bia', 'Bia'], ['u-caio', 'Caio'], ['u-dedo', 'Dedo']]) await aluno(uid, name);
await aluno('u-velho', 'Velho', { archived:true });
await db.doc('students/u-fora').set({ name:'Fora', firstName:'Fora', schoolId:'school-2' });
const grupo = async (id, name, uids, names) => {
  await db.doc(`schools/school-1/classGroups/${id}`).set({ name, active:true, automaticChallenge:true, memberUids:uids, memberNames:names });
  for (const uid of uids) await db.doc(`students/${uid}/classGroups/${id}`).set({ schoolId:'school-1', id, active:true });
};
await grupo('g1', 'Ana e Bia', ['u-ana', 'u-bia'], ['Ana', 'Bia']);
await grupo('g2', 'Caio e Dedo', ['u-caio', 'u-dedo'], ['Caio', 'Dedo']);

const fns = createChallengeFunctions({ db, getMessaging:() => null, adminEmails:['prof@example.test'],
  Anthropic:FakeAnthropic, anthropicApiKey:{ value:() => 'fake-no-network' } });
const as = (uid, data) => ({ auth:{ uid, token:{ email:`${uid}@example.test` } }, data });

// Resultado de parte de dupla, igual ao que salvarRespostaDesafio grava.
const resultado = async (groupId, weekKey, part, uid, name, score, extra = {}) => {
  const roundId = `${weekKey}-g-${groupId}-part-${part}`;
  await db.doc(`_challengeResults/${roundId}_${uid}`).set({ uid, studentName:name, roundId, weekKey, part, score, maxScore:500,
    groupId, groupName:'x', details:[{ id:`${uid}-${part}`, prompt:`Pergunta de ${name}`, score }], ...extra });
};

let clock = new Date('2026-11-19T20:00:00-03:00');   // quinta da semana 2026-11-16
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
  static now() { return clock.getTime(); }
};
try {
  // ── Histórico da dupla ────────────────────────────────────────────────
  await resultado('g1', '2026-11-02', 1, 'u-ana', 'Ana', 400);  await resultado('g1', '2026-11-02', 1, 'u-bia', 'Bia', 300);
  await resultado('g1', '2026-11-02', 2, 'u-ana', 'Ana', 300);  await resultado('g1', '2026-11-02', 2, 'u-bia', 'Bia', 450);
  await resultado('g1', '2026-11-09', 1, 'u-ana', 'Ana', 500);  await resultado('g1', '2026-11-09', 1, 'u-bia', 'Bia', 500);
  await resultado('g1', '2026-11-09', 2, 'u-ana', 'Ana', 100);  await resultado('g1', '2026-11-09', 2, 'u-bia', 'Bia', 100);
  // A semana em andamento e resultados de outra identidade não entram no histórico da dupla.
  await resultado('g1', '2026-11-16', 1, 'u-ana', 'Ana', 500);  await resultado('g1', '2026-11-16', 1, 'u-bia', 'Bia', 500);
  await resultado('duelo-1', '2026-11-02', 1, 'u-ana', 'Ana', 999);

  const visto = await fns.obterDesafioDaTurma.run(as('u-ana', { groupId:'g1' }));
  const h = visto.historico;
  assert.equal(h.totalWeeks, 2, 'só as semanas que já terminaram, e só desta dupla');
  assert.deepEqual(h.weeks.map(w => w.weekKey), ['2026-11-09', '2026-11-02'], 'mais recente primeiro');
  assert.equal(h.weeks[0].winner, null);
  assert.equal(h.weeks[0].draw, true, 'empate de semana não dá vitória a ninguém');
  assert.equal(h.weeks[1].winner, 'Bia');
  assert.deepEqual(h.weeks[1].scores.map(s => [s.name, s.total]), [['Ana', 700], ['Bia', 750]]);
  assert.deepEqual(h.members.map(m => [m.name, m.weeksWon, m.points, m.isOwn]), [['Ana', 0, 1300, true], ['Bia', 1, 1350, false]]);
  assert.equal(h.draws, 1);
  assert.equal(h.maxPoints, 2000);
  assert.equal(h.weeks[1].parts[0].details[0].prompt, 'Pergunta de Ana', 'cada aluno recebe as PRÓPRIAS correções');
  assert.equal(JSON.stringify(visto).includes('Pergunta de Bia'), false, 'a correção do colega não circula');
  assert.deepEqual(visto.rankingDuplas, [], 'com uma dupla só não há ranking entre duplas');
  assert.deepEqual(visto.partes.map(p => p.status), ['closed', 'open'], 'a rodada da semana continua igual');

  // ── Ranking entre as duplas: média de pontos por aluno em cada semana ──
  await resultado('g2', '2026-11-09', 1, 'u-caio', 'Caio', 500); await resultado('g2', '2026-11-09', 1, 'u-dedo', 'Dedo', 300);
  await resultado('g2', '2026-11-09', 2, 'u-caio', 'Caio', 300); await resultado('g2', '2026-11-09', 2, 'u-dedo', 'Dedo', 300);
  const comRanking = await fns.obterDesafioDaTurma.run(as('u-ana', { groupId:'g1' }));
  assert.deepEqual(comRanking.rankingDuplas.map(r => [r.position, r.name, r.avg, r.isOwn]),
    [[1, 'Caio e Dedo', 700, false], [2, 'Ana e Bia', 663, true]]);
  const outraVista = await fns.obterDesafioDaTurma.run(as('u-caio', { groupId:'g2' }));
  assert.deepEqual(outraVista.rankingDuplas.map(r => r.isOwn), [true, false], 'cada dupla se enxerga no ranking');
  assert.equal(JSON.stringify(comRanking.rankingDuplas).includes('u-'), false, 'o ranking não expõe ids de aluno');

  // ── O histórico nunca derruba a rodada da semana ──────────────────────
  const original = db.collection.bind(db);
  db.collection = path => path === '_challengeResults' ? { where:() => ({ get:async () => { throw new Error('boom'); } }) } : original(path);
  const semExtras = await fns.obterDesafioDaTurma.run(as('u-ana', { groupId:'g1' }));
  db.collection = original;
  assert.equal(semExtras.historico, null);
  assert.deepEqual(semExtras.rankingDuplas, []);
  assert.equal(semExtras.partes.length, 2, 'a rodada abre do mesmo jeito');
  await assert.rejects(fns.obterDesafioDaTurma.run(as('u-fora', { groupId:'g1' })), e => e.code === 'permission-denied');

  // ── Ranking dos duelos ────────────────────────────────────────────────
  const duelo = async (id, a, b, scoreA, scoreB, extra = {}) => {
    await db.doc(`_challengeDuels/${id}`).set({ schoolId:'school-1', creatorUid:a, invitedUid:b, participantUids:[a, b],
      participantNames:[a, b], status:'accepted', generated:true, roundId:`duel-${id}`, mode:'quick',
      createdAt:new Date('2026-11-10T12:00:00-03:00'), ...extra });
    if (scoreA != null) await db.doc(`_challengeResults/duel-${id}_${a}`).set({ uid:a, score:scoreA, groupId:id, roundId:`duel-${id}` });
    if (scoreB != null) await db.doc(`_challengeResults/duel-${id}_${b}`).set({ uid:b, score:scoreB, groupId:id, roundId:`duel-${id}` });
  };
  await duelo('d1', 'u-ana', 'u-bia', 800, 700);
  await duelo('d2', 'u-ana', 'u-caio', 500, 900);
  await duelo('d3', 'u-bia', 'u-caio', 600, 600);
  await duelo('d4', 'u-ana', 'u-bia', null, null, { status:'pending', generated:false, roundId:undefined });   // convite parado
  await duelo('d5', 'u-ana', 'u-dedo', 900, null);                                                          // só um terminou
  await duelo('d6', 'u-ana', 'u-velho', 100, 400);                                                          // adversário arquivado
  await db.doc('_challengeDuels/d7').set({ schoolId:'school-2', participantUids:['u-fora', 'u-x'], status:'accepted', generated:true, roundId:'duel-d7' });

  const painel = await fns.obterDesafiosEntreAlunos.run(as('u-ana', {}));
  const rk = painel.ranking;
  assert.deepEqual(rk.map(r => [r.position, r.name, r.wins, r.losses, r.draws, r.points, r.duels]), [
    [1, 'Caio', 1, 0, 1, 1500, 2],     // mais vitórias; empate de vitórias decide por pontos
    [2, 'Ana', 1, 2, 0, 1400, 3],
    [3, 'Bia', 0, 1, 1, 1300, 2],
  ].map(row => row), 'só duelo terminado pelos dois conta');
  assert.equal(rk.find(r => r.isOwn).name, 'Ana');
  assert.equal(rk.some(r => r.name === 'Velho'), false, 'aluno arquivado não aparece');
  assert.equal(rk.some(r => r.name === 'Fora' || r.name === 'Dedo'), false);
  assert.ok(painel.duels.length >= 4 && Array.isArray(painel.opponents), 'o painel de duelos continua o mesmo');

  // Falha no ranking não derruba o painel de duelos.
  const duelosSalvos = (await original('_challengeDuels').get()).docs;
  db.collection = path => path === '_challengeDuels'
    ? { where:(field, operator, value) => ({ get:async () => {
        if (operator === '==') throw new Error('boom');
        return { docs:duelosSalvos.filter(doc => (doc.data()[field] || []).includes(value)) };
      } }) }
    : original(path);
  const painelSemRanking = await fns.obterDesafiosEntreAlunos.run(as('u-ana', {}));
  db.collection = original;
  assert.deepEqual(painelSemRanking.ranking, []);
  assert.ok(Array.isArray(painelSemRanking.opponents));
} finally {
  globalThis.Date = NativeDate;
}
console.log('OK — histórico e acumulado da dupla, ranking entre duplas e ranking dos duelos, sem expor correção alheia nem derrubar a tela.');
