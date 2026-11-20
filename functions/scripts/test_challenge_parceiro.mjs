import assert from 'node:assert/strict';
import { createChallengeFunctions } from '../challenge.js';

// Firestore falso mínimo (get/set/create em transação) — o gatilho só lê e reserva o log.
function firestore() {
  const docs = new Map();
  const snapshot = ref => ({ id:ref.path.split('/').at(-1), ref, exists:docs.has(ref.path), data:() => docs.get(ref.path) });
  const write = (ref, data, options) => docs.set(ref.path, options?.merge ? { ...docs.get(ref.path), ...data } : data);
  const db = {
    docs,
    doc(path) { return { path, id:path.split('/').at(-1), get:async () => snapshot(db.doc(path)),
      set:async (data, options) => write(db.doc(path), data, options),
      collection:name => db.collection(`${path}/${name}`) }; },
    collection(path) { return { doc:id => db.doc(`${path}/${id}`) }; },
    runTransaction(callback) { return (async () => {
      const writes = []; const result = await callback({ get:async ref => snapshot(ref), set:(...args) => writes.push(args), create:(...args) => writes.push(args) });
      writes.forEach(args => write(...args)); return result;
    })(); },
  };
  return db;
}

const db = firestore();
const sent = [];
let fcmBroken = false;
const messaging = { sendEachForMulticast:async message => {
  if (fcmBroken) throw new Error('FCM fora do ar');
  sent.push(message); return { successCount:message.tokens.length, failureCount:0 };
} };
const aluno = (uid, name, extra = {}) => db.doc(`students/${uid}`).set({ name, firstName:name.split(' ')[0], schoolId:'s1', fcmToken:`token-${uid}`, ...extra });
await aluno('u-karlla', 'Karlla Raissa'); await aluno('u-vitor', 'Vitor Pereira'); await aluno('u-gu', 'Gu');
await aluno('u-sem', 'Sem Token', { fcmToken:undefined });
await aluno('u-velho', 'Velho', { archived:true });
await db.doc('schools/s1/classGroups/g1').set({ name:'Karlla e Vitor', active:true, memberUids:['u-karlla', 'u-vitor'], memberNames:['Karlla', 'Vitor'] });
await db.doc('schools/s1/classGroups/g3').set({ name:'Trio', active:true, memberUids:['u-karlla', 'u-vitor', 'u-gu'], memberNames:['Karlla', 'Vitor', 'Gu'] });
await db.doc('schools/s1/classGroups/g4').set({ name:'Com problemas', active:true, memberUids:['u-karlla', 'u-sem', 'u-velho'], memberNames:['Karlla', 'Sem', 'Velho'] });

const rodada = async (uid, roundId, groupId, part, extra = {}) =>
  db.doc(`students/${uid}/challengeRounds/${roundId}`).set({ roundId, groupId, part, schoolId:'s1', personalized:true, ...extra });
const fez = (uid, roundId) => db.doc(`students/${uid}/challengeSubmissions/${roundId}`).set({ completed:true, answers:[] });
// Evento do gatilho: o resultado recém-criado, como o Firestore entrega.
const resultado = (uid, name, roundId, groupId, part, extra = {}) => ({
  params:{ resultId:`${roundId}_${uid}` },
  data:{ id:`${roundId}_${uid}`, data:() => ({ uid, studentName:name, roundId, weekKey:'2026-11-16', part, score:420, maxScore:500, groupId, ...extra }) },
});
const fns = createChallengeFunctions({ db, getMessaging:() => messaging, adminEmails:['prof@example.test'] });
const avisar = event => fns.avisarParceiroDaDupla.run(event);
const antes = () => sent.length;

// 1. Karlla termina a Parte 1: só o Vitor é avisado, sem nota, com o prazo da parte.
const r1 = '2026-11-16-g-g1-part-1';
await rodada('u-karlla', r1, 'g1', 1); await rodada('u-vitor', r1, 'g1', 1);
await fez('u-karlla', r1);
await avisar(resultado('u-karlla', 'Karlla Raissa', r1, 'g1', 1));
assert.equal(sent.length, 1);
assert.deepEqual(sent[0].tokens, ['token-u-vitor'], 'só quem ainda não fez');
assert.equal(sent[0].notification.title, '⚔️ Karlla já fez a Parte 1');
assert.match(sent[0].notification.body, /Falta você! Vale até quarta, 23h59/);
assert.equal(/\d{3}|pts|pontos/i.test(sent[0].notification.title + sent[0].notification.body.replace(/23h59/, '')), false, 'nunca revela nota');
assert.equal(sent[0].data.type, 'turma-parceiro-fez');
assert.equal(db.docs.get(`students/u-vitor/challengeReminderLogs/${r1}-parceiro-u-karlla`).status, 'sent');

// 2. O mesmo evento de novo (reentrega) não manda um segundo aviso.
await avisar(resultado('u-karlla', 'Karlla Raissa', r1, 'g1', 1));
assert.equal(sent.length, 1);

// 3. Quem já fez a parte não é avisado de novo; Parte 2 fala em sábado.
const r2 = '2026-11-16-g-g1-part-2';
await rodada('u-karlla', r2, 'g1', 2); await rodada('u-vitor', r2, 'g1', 2);
await fez('u-vitor', r2); await fez('u-karlla', r2);
await avisar(resultado('u-karlla', 'Karlla Raissa', r2, 'g1', 2));
assert.equal(sent.length, 1, 'o parceiro já tinha feito: não há o que avisar');
const r2b = '2026-11-16-g-g1-part-2b';
await rodada('u-karlla', r2b, 'g1', 2); await rodada('u-vitor', r2b, 'g1', 2);
await fez('u-vitor', r2b);
await avisar(resultado('u-vitor', 'Vitor Pereira', r2b, 'g1', 2));
assert.equal(sent.length, 2);
assert.deepEqual(sent[1].tokens, ['token-u-karlla']);
assert.match(sent[1].notification.body, /até sábado, 23h59/);

// 4. Turma de três: avisa os dois que faltam, não o que já fez.
const r3 = '2026-11-16-g-g3-part-1';
for (const uid of ['u-karlla', 'u-vitor', 'u-gu']) await rodada(uid, r3, 'g3', 1);
await fez('u-vitor', r3); await fez('u-karlla', r3);
await avisar(resultado('u-karlla', 'Karlla Raissa', r3, 'g3', 1));
assert.deepEqual(sent.slice(2).flatMap(m => m.tokens), ['token-u-gu'], 'só o Gu falta');

// 5. Não avisa em duelo, no desafio individual, nem sem rodada/turma.
const base = antes();
await rodada('u-karlla', 'duel-d1', 'd1', 1, { peerDuel:true });
await avisar(resultado('u-karlla', 'Karlla Raissa', 'duel-d1', 'd1', 1));
await avisar(resultado('u-karlla', 'Karlla Raissa', '2026-11-16-part-1', undefined, 1));
await avisar(resultado('u-karlla', 'Karlla Raissa', 'rodada-que-nao-existe', 'g1', 1));
await avisar({ params:{}, data:undefined });
assert.equal(sent.length, base, 'duelo, individual e evento vazio não geram aviso');

// 6. Parceiro sem notificação ou arquivado: nada é enviado e nada quebra.
const r4 = '2026-11-16-g-g4-part-1';
for (const uid of ['u-karlla', 'u-sem', 'u-velho']) await rodada(uid, r4, 'g4', 1);
await fez('u-karlla', r4);
await avisar(resultado('u-karlla', 'Karlla Raissa', r4, 'g4', 1));
assert.equal(sent.length, base);
assert.equal(db.docs.get(`students/u-sem/challengeReminderLogs/${r4}-parceiro-u-karlla`).status, 'not-sent');

// 7. FCM fora do ar não derruba o gatilho (que também não pode travar a resposta do aluno).
const r5 = '2026-11-16-g-g1-part-1c';
await rodada('u-karlla', r5, 'g1', 1); await rodada('u-vitor', r5, 'g1', 1);
await fez('u-karlla', r5);
fcmBroken = true;
await avisar(resultado('u-karlla', 'Karlla Raissa', r5, 'g1', 1));
fcmBroken = false;
assert.equal(sent.length, base);
console.log('OK — aviso ao parceiro: só quem falta, uma vez por parte, sem nota, e nunca em duelo, individual ou com FCM fora do ar.');
