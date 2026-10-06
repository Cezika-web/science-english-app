import assert from 'node:assert/strict';
import { createDemandChallengeService } from '../challenge-demand.js';
import { challengeInternals, createChallengeFunctions } from '../challenge.js';

class TestError extends Error { constructor(code, message) { super(message); this.code = code; } }
function firestore() {
  const docs = new Map(); let queue = Promise.resolve();
  const snapshot = ref => ({ id:ref.path.split('/').at(-1), ref, exists:docs.has(ref.path), data:() => docs.get(ref.path) });
  const write = (ref, data, options) => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
  const db = {
    docs, failPublication:false,
    doc(path) { return { path, get:async () => snapshot(db.doc(path)),
      set:async (data, options) => write(db.doc(path), data, options),
      collection:name => db.collection(`${path}/${name}`) }; },
    collection(path) { return { doc:id => db.doc(`${path}/${id}`),
      where:(field, operator, value) => ({ get:async () => ({ docs:(await db.collection(path).get()).docs.filter(doc => doc.data()[field] === value) }) }),
      get:async () => ({ docs:[...docs.keys()].filter(key => key.startsWith(`${path}/`) && !key.slice(path.length + 1).includes('/')).map(key => snapshot(db.doc(key))) }) }; },
    batch() { const writes = []; return { set:(...args) => writes.push(args), commit:async () => {
      if (db.failPublication && writes.some(([ref]) => ref.path.includes('/challengeRounds/'))) { db.failPublication = false; throw new Error('Firestore temporariamente indisponível'); }
      writes.forEach(args => write(...args));
    } }; },
    runTransaction(callback) { const run = queue.then(async () => {
      const writes = []; const result = await callback({ get:async ref => snapshot(ref),
        set:(...args) => writes.push(args), create:(...args) => writes.push(args) });
      writes.forEach(args => write(...args)); return result;
    }); queue = run.catch(() => {}); return run; },
  }; return db;
}

const q = (id, focus) => ({ id, format:'text', focus, topic:'Simple Present',
  prompt:'Translate to English:', context:'Eu trabalho todos os dias.', hint:'', options:[], correctOption:'',
  expected:'I work every day.', acceptedAnswers:['I work every day', 'I work every day.'], explanation:'Presente simples.' });
const questions = () => [q('1','weak'), q('2','weak'), q('3','weak'),
  { ...q('4','strong'), format:'trueFalse', context:'She works every day.', options:[{ id:'a', text:'True' }, { id:'b', text:'False' }], correctOption:'a', acceptedAnswers:[], expected:'True' },
  { ...q('5','strong'), format:'multipleChoice', context:'He ___ at home.', options:[{ id:'a', text:'work' }, { id:'b', text:'works' }, { id:'c', text:'working' }, { id:'d', text:'worked' }], correctOption:'b', acceptedAnswers:[], expected:'works' }];
const { scheduleFor, weekKeyFor, stageFor, prepareDemandQuestions, publicChallengeQuestions, DEMAND_CHALLENGE_SCHEMA } = challengeInternals;
let clock = new Date('2026-09-14T10:00:00-03:00'), calls = 0, usage = 0, release;
let gate = null, malformed = false, payload; const queue = [];
class FakeAnthropic {
  constructor(options) { assert.equal(options.maxRetries, 0); this.messages = { create:async request => {
    calls++; payload = request;
    if (gate) await gate;
    return { stop_reason:'end_turn', usage:{ input_tokens:100, output_tokens:200 },
      content:[{ type:'text', text:JSON.stringify({ analysis:{ weakPoints:[], strongPoints:[] }, questions:queue.length ? queue.shift() : malformed ? [] : questions() }) }] };
  } }; }
}
const db = firestore(), student = db.doc('students/student-1');
await student.set({ name:'Aluno Teste', level:'A1', schoolId:'school-1' });
const studentDoc = await student.get();
const service = createDemandChallengeService({ db, FieldValue:{ serverTimestamp:() => new Date(clock) },
  HttpsError:TestError, Anthropic:FakeAnthropic, anthropicApiKey:{ value:() => 'fake-no-network' }, model:'test', schema:DEMAND_CHALLENGE_SCHEMA,
  loadInput:async () => ({ posts:[{ id:'post-1', title:'Rotinas', date:'2026-09-10', text:'Simple Present.' }], activityMaterials:[], corrections:[] }),
  previousPerformance:async () => null, prepareQuestions:prepareDemandQuestions, scheduleFor, weekKeyFor, stageFor,
  publicQuestions:publicChallengeQuestions, answerKeyRef:(uid, roundId) => db.doc(`_challengeAnswerKeys/${roundId}_${uid}`),
  registrarUso:(batch, entry) => { usage++; batch.set(db.doc(`_apiUsage/${usage}`), entry); }, now:() => new Date(clock) });

await service.ensureWeek('2026-09-14');
assert.equal(calls, 0, 'abrir a semana não chama a API');
gate = new Promise(resolve => { release = resolve; });
const first = service.prepare(studentDoc.id, '2026-09-14-part-1', studentDoc);
while (!calls) await new Promise(resolve => setTimeout(resolve, 0));
assert.equal((await service.prepare(studentDoc.id, '2026-09-14-part-1', studentDoc)).preparing, true);
assert.equal(calls, 1, 'cliques concorrentes compartilham a geração');
release(); gate = null; await first;
assert.equal(payload.output_config.format.schema.properties.questions.maxItems, undefined, 'schema usa apenas restrições suportadas pela API');
assert.throws(() => prepareDemandQuestions(questions().slice(0, 4), 1, 'assistido'), /incompleta/);
assert.deepEqual(payload.output_config.format.schema.required, ['analysis','questions']);
assert.equal(JSON.parse(payload.messages[0].content).part, 1);
assert.equal(db.docs.has('students/student-1/challengeRounds/2026-09-14-part-2'), false);
const round1 = db.docs.get('students/student-1/challengeRounds/2026-09-14-part-1');
assert.equal(round1.questions.length, 5);
assert.equal(round1.questions[0].expected, undefined);
assert.equal(round1.questions[0].acceptedAnswers, undefined);
assert.equal(round1.questions[0].correctOption, undefined);
assert.equal(db.docs.get('_challengeAnswerKeys/2026-09-14-part-1_student-1').answers.length, 5);
await service.prepare(studentDoc.id, '2026-09-14-part-1', studentDoc);
assert.equal(calls, 1, 'reabrir não gera nem cobra novamente');
assert.equal(usage, 1);

await assert.rejects(service.prepare(studentDoc.id, '2026-09-14-part-2', studentDoc), error => error.code === 'failed-precondition');
await assert.rejects(service.prepare(studentDoc.id, '2026-08-24-part-1', studentDoc), error => error.code === 'failed-precondition');
assert.equal(calls, 1, 'parte futura e semana antiga não chamam a API');
clock = new Date('2026-09-17T10:00:00-03:00');
db.failPublication = true;
await assert.rejects(service.prepare(studentDoc.id, '2026-09-14-part-2', studentDoc));
assert.equal(calls, 2);
await service.prepare(studentDoc.id, '2026-09-14-part-2', studentDoc);
assert.equal(calls, 2, 'falha ao publicar reaproveita a resposta paga');
assert.equal(usage, 2, 'consumo registrado uma vez por parte, inclusive após falha');
assert.equal(JSON.parse(payload.messages[0].content).avoid.length, 5, 'parte 2 evita as perguntas da parte 1');

clock = new Date('2026-09-21T10:00:00-03:00');
await db.doc('challengeSettings/auto').set({ manualWeeks:['2026-09-21'] });
await assert.rejects(service.prepare(studentDoc.id, '2026-09-21-part-1', studentDoc), error => error.code === 'failed-precondition');
assert.equal(calls, 2, 'semana manual não usa IA');
await db.doc('challengeSettings/auto').set({ manualWeeks:[] });
// Resposta recusada pela validação nunca trava o aluno: a própria chamada gera de novo
// (2 tentativas) e cada "Tentar novamente" seguinte recomeça do zero.
const job = id => db.docs.get(`_challengePartGeneration/${id}`);
malformed = true;
await assert.rejects(service.prepare(studentDoc.id, '2026-09-21-part-1', studentDoc), error => error.code === 'unavailable');
assert.equal(calls, 4, 'resposta inválida gera de novo uma vez dentro da mesma chamada');
assert.equal(JSON.parse(payload.messages[0].content).tentativaAnteriorRecusada.motivo.includes('incompleta'), true, 'a 2ª tentativa recebe o motivo da recusa');
assert.equal(job(`2026-09-21-part-1_student-1`).status, 'invalid');
assert.equal(job(`2026-09-21-part-1_student-1`).responseText, '', 'a resposta recusada não fica para reaproveitamento');
await assert.rejects(service.prepare(studentDoc.id, '2026-09-21-part-1', studentDoc), error => error.code === 'unavailable');
assert.equal(calls, 6, 'novo toque em Tentar novamente gera de novo em vez de ficar travado');
assert.equal(usage, 6, 'cada resposta paga recusada entra na contabilidade');
malformed = false;
await service.prepare(studentDoc.id, '2026-09-21-part-1', studentDoc);
assert.equal(calls, 7);
assert.equal(db.docs.get('students/student-1/challengeRounds/2026-09-21-part-1').questions.length, 5, 'depois de recusas, o aluno recebe as perguntas');
assert.equal(job(`2026-09-21-part-1_student-1`).status, 'ready');
assert.match(payload.system[0].text, /NUNCA cite nome de tempo verbal/, 'o prompt proíbe nomear a gramática no enunciado');

// Caso real da Isabelle (06/10/2026): o enunciado citava "presente simples" e o job travava.
const second = db.doc('students/student-2'); await second.set({ name:'Segundo', level:'A1', schoolId:'school-1' });
const naming = questions(); naming[3] = { ...naming[3], prompt:'Julgue a afirmação sobre a formação de perguntas no presente simples.' };
assert.throws(() => prepareDemandQuestions(naming, 1, 'assistido'), /dica gramatical/);
queue.push(naming);
await service.prepare('student-2', '2026-09-21-part-1', await second.get());
assert.equal(calls, 9, 'enunciado recusado é regerado na mesma chamada');
assert.match(JSON.parse(payload.messages[0].content).tentativaAnteriorRecusada.motivo, /dica gramatical/);
assert.equal(db.docs.get('students/student-2/challengeRounds/2026-09-21-part-1').questions.length, 5);

// Teto de custo: só um bug sistemático chega a 10 gerações.
const third = db.doc('students/student-3'); await third.set({ name:'Terceiro', level:'A1' });
await db.doc('_challengePartGeneration/2026-09-21-part-1_student-3').set({ status:'invalid', attempts:10 });
await assert.rejects(service.prepare('student-3', '2026-09-21-part-1', await third.get()), error => error.code === 'failed-precondition');
assert.equal(calls, 9, 'depois do teto não chama a API');

// Job 'invalid' antigo, ainda com a resposta recusada guardada, não pode reutilizá-la.
clock = new Date('2026-09-24T10:00:00-03:00');
await db.doc('_challengePartGeneration/2026-09-21-part-2_student-1').set({ status:'invalid', attempts:1,
  lastError:'Pergunta 5: o enunciado não pode dar uma dica gramatical explícita.', format:'assistido', stopReason:'end_turn',
  responseText:JSON.stringify({ analysis:{ weakPoints:[], strongPoints:[] }, questions:[] }) });
await service.prepare(studentDoc.id, '2026-09-21-part-2', studentDoc);
assert.equal(calls, 10, 'job invalid antigo gera uma resposta nova');
assert.equal(JSON.parse(payload.messages[0].content).tentativaAnteriorRecusada.motivo, 'Pergunta 5: o enunciado não pode dar uma dica gramatical explícita.');
assert.equal(db.docs.get('students/student-1/challengeRounds/2026-09-21-part-2').questions.length, 5);
const baseCalls = calls;

const functions = createChallengeFunctions({ db, getMessaging:() => null, adminEmails:[],
  Anthropic:FakeAnthropic, anthropicApiKey:{ value:() => 'fake' } });
await functions.gerarDesafioDaSemana.run({});
await functions.gerarDesafiosAtrasados.run({});
assert.equal(calls, baseCalls, 'cron de domingo e entradas tardias não geram perguntas');

// Exercise the actual callable handlers, including their lazy placeholder,
// authentication, publication and resuming an already saved answer.
const NativeDate = Date;
globalThis.Date = class extends NativeDate {
  constructor(...args) { super(...(args.length ? args : ['2026-09-28T10:00:00-03:00'])); }
  static now() { return new NativeDate('2026-09-28T10:00:00-03:00').getTime(); }
};
try {
  malformed = false;
  await student.collection('posaulas').doc('recent').set({ title:'Rotina', content:'I work every day.', createdAt:new Date('2026-09-27') });
  const request = { auth:{ uid:studentDoc.id, token:{ email:'student@example.test' } }, data:{} };
  const state = await functions.obterDesafioSemanal.run(request);
  assert.equal(state.needsPreparation, true);
  assert.equal(state.canStart, true);
  assert.equal(state.round.questions.length, 0);
  assert.equal(calls, baseCalls, 'carregar a tela não usa IA');
  await assert.rejects(functions.iniciarDesafioSemanal.run({ data:{ roundId:state.round.roundId } }), error => error.code === 'unauthenticated');
  const startRequest = { ...request, data:{ roundId:state.round.roundId } };
  const started = await functions.iniciarDesafioSemanal.run(startRequest);
  assert.equal(started.round.questions.length, 5);
  assert.equal(started.round.questions[0].expected, undefined);
  assert.equal(calls, baseCalls + 1, 'clicar em participar gera somente uma parte');
  const submissionRef = student.collection('challengeSubmissions').doc(state.round.roundId);
  await submissionRef.set({ answers:[{ questionId:'p1q1', value:'I work every day.' }] }, { merge:true });
  assert.equal((await functions.iniciarDesafioSemanal.run(startRequest)).nextIndex, 1);
  assert.equal((await functions.obterDesafioSemanal.run(request)).started, true);
  assert.equal(calls, baseCalls + 1, 'retomar a tentativa pelo endpoint não gera novamente');
} finally { globalThis.Date = NativeDate; }
console.log('OK — geração de 5 perguntas por parte, concorrência, retomada, falha de gravação, resposta recusada sem travar o aluno, calendário, privacidade, semana manual e crons sem IA.');
