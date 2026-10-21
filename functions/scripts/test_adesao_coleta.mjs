// Confere o cronômetro de uso do app do aluno (CzkUsage em index.html).
// Regra: o intervalo entre dois movimentos só conta se tiver até o limite (60 s);
// se o aluno voltar a mexer dentro do limite o intervalo INTEIRO entra, senão é
// descartado. Gravar a fala e ouvir áudio contam o tempo todo; aba oculta nunca.
// Lê o código direto do index.html (nada é copiado), então qualquer mudança lá é testada aqui.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(aqui, '../../index.html'), 'utf8');
const bloco = /const CzkUsage = \(\(\) => \{[\s\S]*?\n\}\)\(\);/.exec(html);
assert.ok(bloco, 'bloco CzkUsage não encontrado no index.html');
const Adesao = createRequire(import.meta.url)('../../adesao.js');

let n = 0;
const ok = nome => { n += 1; console.log('ok  ', nome); };
const S = 1000;

// Reproduz o que o Firestore faz num setDoc com { merge: true }: mapas se fundem campo a campo e
// increment() soma, MAS um mapa vazio SUBSTITUI o campo inteiro (o SDK o coloca na máscara).
// Foi assim que gravações sem item apagavam os itens do dia em produção (21/10/2026).
function aplicaMerge(atual, patch) {
  const out = { ...(atual || {}) };
  for (const [k, v] of Object.entries(patch)) {
    if (v && typeof v === 'object' && 'inc' in v) out[k] = (Number(out[k]) || 0) + v.inc;
    else if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = Object.keys(v).length === 0 ? {} : aplicaMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

function ambiente() {
  const env = { clock: new Date(2026, 9, 20, 10, 0, 0).getTime(), writes: [], store: {}, timers: [], visible: 'visible', failWrites: false, win: {}, doc: {} };
  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(env.clock); }
    static now() { return env.clock; }
  }
  const document = {
    get visibilityState() { return env.visible; },
    addEventListener(t, f) { env.doc[t] = f; },
    removeEventListener(t) { delete env.doc[t]; },
  };
  env.events = [];
  const window = {
    addEventListener(t, f) { env.win[t] = f; }, removeEventListener(t) { delete env.win[t]; },
    dispatchEvent(ev) { env.events.push(ev.type); },
  };
  const getFB = async () => ({
    db: 'db', serverTimestamp: () => 'TS', increment: v => ({ inc: v }),
    doc: (...p) => p.slice(1).join('/'),
    setDoc: async (ref, data, opts) => {
      if (env.failWrites) throw new Error('permission-denied');
      // JSON: os objetos nascem dentro do vm (outro "realm") e o assert estrito não os compara.
      env.writes.push({ ref, data: JSON.parse(JSON.stringify(data)), opts: JSON.parse(JSON.stringify(opts)) });
      env.store[ref] = aplicaMerge(env.store[ref], JSON.parse(JSON.stringify(data)));
    },
  });
  const contexto = vm.createContext({
    window, document, getFB, Date: FakeDate, console, String, Object, Math, Number, isFinite,
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    setInterval: fn => { env.timers.push(fn); return env.timers.length; }, clearInterval: () => {},
  });
  env.U = vm.runInContext(`${bloco[0]}; CzkUsage;`, contexto);
  env.tick = () => env.timers[0]();
  env.flush = () => env.U.flush();
  env.avanca = ms => { env.clock += ms; };
  env.total = () => env.writes.reduce((t, w) => t + w.data.secs.total.inc, 0);
  env.soma = (campo, k) => env.writes.reduce((t, w) => t + ((w.data[campo] && w.data[campo][k] && w.data[campo][k].inc) || 0), 0);
  env.area = k => env.writes.reduce((t, w) => t + w.data.secs[k].inc, 0);
  return env;
}
const audio = () => ({ tagName: 'AUDIO', isConnected: true, paused: false, ended: false });

// 1) O caso descrito: parou, mas voltou dentro do limite → o intervalo todo conta
let e = ambiente();
e.U.start('u1');
e.U.setBucket({ area: 'posaula', item: 'pos_x', blind: false });
e.avanca(10 * S); e.U.ping();               // 10 s lendo
e.avanca(45 * S); e.U.ping();               // parou 45 s e voltou: os 45 s inteiros entram
await e.flush();
assert.equal(e.writes.length, 1);
const w = e.writes[0];
assert.equal(w.ref, 'students/u1/usage/2026-10-20');
assert.deepEqual(w.opts, { merge: true });
assert.equal(w.data.date, '2026-10-20');
assert.deepEqual(w.data.secs.total, { inc: 55 });
assert.deepEqual(w.data.secs.posaula, { inc: 55 });
assert.deepEqual(w.data.items.pos_x, { inc: 55 });
assert.deepEqual(w.data.itemOpens.pos_x, { inc: 1 });
assert.deepEqual(w.data.opens, { inc: 1 });
ok('parou 45 s e voltou a mexer: o intervalo inteiro conta (10 + 45 = 55 s)');

// o documento só tem os campos que a regra do Firestore aceita
assert.deepEqual(Object.keys(w.data).sort(), ['date', 'itemOpens', 'items', 'opens', 'secs', 'updatedAt']);
assert.deepEqual(Object.keys(w.data.secs).sort(), ['atividade', 'desafio', 'outros', 'posaula', 'total', 'vocab']);
ok('o documento gravado só tem os campos permitidos pela regra');

// 2) Passou do limite: o intervalo inteiro é descartado (nem os primeiros 30 s contam)
e = ambiente();
e.U.start('u1');
e.U.setBucket({ area: 'atividade', item: 'act_1', blind: false });
e.avanca(61 * S); e.U.ping();
e.avanca(5 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 5);
ok('parou 61 s: o intervalo todo é descartado; só os 5 s seguintes contam');

e = ambiente(); e.U.start('u1');
e.avanca(60 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 60);
ok('exatamente no limite (60 s) ainda conta');

// 3) App esquecido aberto: sem movimento depois do último toque, nada entra
e = ambiente(); e.U.start('u1');
e.avanca(8 * S); e.U.ping();
for (let i = 0; i < 600; i++) { e.avanca(S); e.tick(); }      // 10 min parado, nada se move
await e.flush();
assert.equal(e.total(), 8);
ok('app esquecido aberto: depois do último movimento nada conta');

// 4) Aba oculta nunca conta, e o que estava pendente se perde
e = ambiente(); e.U.start('u1');
e.avanca(5 * S); e.U.ping();
e.avanca(20 * S);
e.visible = 'hidden'; e.doc.visibilitychange();
e.avanca(300 * S);
e.visible = 'visible'; e.doc.visibilitychange();
e.U.ping();                                  // voltou: começa um intervalo novo, nada a creditar
e.avanca(4 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 9);                  // 5 + 4 (os 20 s antes de sair e os 300 s fora não entram)
ok('aba oculta não conta e descarta a pausa pendente');

// 5) Ouvindo áudio sem encostar na tela: conta o tempo todo
e = ambiente(); e.U.start('u1');
const a = audio();
e.doc.play({ target: a });
for (let i = 0; i < 90; i++) { e.avanca(S); e.tick(); }
a.paused = true; e.doc.pause({ target: a });
e.avanca(120 * S);                           // depois que parou, sem mexer: não conta
await e.flush();
assert.equal(e.total(), 90);
ok('áudio tocando conta o tempo todo; parado depois, não');

// áudio removido da tela sem evento de pause não fica contando para sempre
e = ambiente(); e.U.start('u1');
const b = audio();
e.doc.play({ target: b });
for (let i = 0; i < 10; i++) { e.avanca(S); e.tick(); }
b.isConnected = false;
for (let i = 0; i < 50; i++) { e.avanca(S); e.tick(); }
await e.flush();
assert.equal(e.total(), 10);
ok('áudio que sai da tela deixa de contar');

// 6) Gravando a fala: conta o tempo todo, mesmo com o limite curto
e = ambiente(); e.U.start('u1');
e.U.configure({ limitSec: 20 });
e.U.hold('gravando');
for (let i = 0; i < 30; i++) { e.avanca(S); e.tick(); }
e.U.release('gravando');
e.avanca(100 * S);
await e.flush();
assert.equal(e.total(), 30);
ok('gravando a fala conta os 30 s inteiros, mesmo com limite de 20 s');

// 7) Pós-aula aberto por URL (iframe que não avisa): conta, com teto de 10 min por abertura
e = ambiente(); e.U.start('u2');
e.U.setBucket({ area: 'posaula', item: 'pos_antigo', blind: true });
for (let i = 0; i < 700; i++) { e.avanca(S); e.tick(); }
await e.flush();
assert.equal(e.area('posaula'), 600);
ok('iframe sem aviso: conta, com teto de 10 min por abertura');

// 8) A área e o item certos: o intervalo pertence à tela em que ele estava
e = ambiente(); e.U.start('u1');
e.U.setBucket({ area: 'posaula', item: 'pos_a', blind: false });
e.avanca(20 * S);
e.U.setBucket({ area: 'atividade', item: 'act_b', blind: false });   // trocar de tela é movimento
e.avanca(10 * S); e.U.ping();
await e.flush();
assert.equal(e.area('posaula'), 20);
assert.equal(e.area('atividade'), 10);
assert.equal(e.soma('items', 'pos_a'), 20);
assert.equal(e.soma('items', 'act_b'), 10);
assert.equal(e.soma('itemOpens', 'pos_a'), 1);
assert.equal(e.soma('itemOpens', 'act_b'), 1);
ok('o intervalo vai para a tela em que o aluno estava; abrir de novo soma uma abertura');

// 8b) Vocabulário, verbos e chunks são estudo e ficam separados de "outros"
e = ambiente(); e.U.start('u1');
e.U.setBucket({ area: 'vocab', item: 'vocab_verbs', blind: false });
e.avanca(25 * S); e.U.ping();
e.U.setBucket({ area: 'vocab', item: 'vocab_chunks', blind: false });
e.avanca(15 * S); e.U.ping();
e.U.setBucket({ area: 'outros', item: '', blind: false });
e.avanca(8 * S); e.U.ping();
await e.flush();
assert.equal(e.area('vocab'), 40);
assert.equal(e.area('outros'), 8);
assert.equal(e.soma('items', 'vocab_verbs'), 25);
assert.equal(e.soma('items', 'vocab_chunks'), 15);
ok('verbos e chunks contam como vocab (estudo), separados de outros');

// 8c) A tela da meta soma o que ainda não foi gravado e é avisada quando uma gravação termina
e = ambiente(); e.U.start('u1');
e.U.setBucket({ area: 'posaula', item: 'pos_a', blind: false });
e.avanca(12 * S); e.U.ping();
e.U.setBucket({ area: 'vocab', item: 'vocab_chunks', blind: false });
e.avanca(5500); e.U.ping();
let p = e.U.pendingToday();
assert.equal(p.posaula, 12); assert.equal(p.vocab, 5.5); assert.equal(p.total, 17.5); assert.equal(p.outros, 0);
assert.equal(e.events.length, 0);
await e.flush();
assert.deepEqual(e.events, ['czk-usage-flushed']);
p = e.U.pendingToday();
assert.equal(p.total, 0.5);                  // sobra de 0,5 s que não fechou um segundo inteiro
ok('minutos ainda não gravados aparecem em pendingToday e a gravação avisa a tela');

// 8d) Regressão (produção, 21/10): gravação sem item NÃO pode apagar os itens já gravados no dia
e = ambiente(); e.U.start('u1');
e.U.setBucket({ area: 'posaula', item: 'pos_a', blind: false });
e.avanca(10 * S); e.U.ping();
await e.flush();                                               // 1: pós-aula (com item)
e.U.setBucket({ area: 'outros', item: '', blind: false });
e.avanca(8 * S); e.U.ping();
await e.flush();                                               // 2: tela inicial (SEM item)
assert.equal(e.writes[1].data.items, undefined);               // não manda mapa vazio
assert.equal(e.writes[1].data.itemOpens, undefined);
e.U.setBucket({ area: 'posaula', item: 'pos_a', blind: false });
e.avanca(5 * S); e.U.ping();
await e.flush();                                               // 3: voltou ao pós-aula
const dia = e.store['students/u1/usage/2026-10-20'];
assert.equal(dia.items.pos_a, 15);                             // 10 + 5: nada foi apagado
assert.equal(dia.itemOpens.pos_a, 2);
assert.equal(dia.secs.posaula, 15); assert.equal(dia.secs.outros, 8); assert.equal(dia.secs.total, 23);
ok('gravação sem item não apaga os itens do dia (mapa vazio no merge substitui o campo)');

// 9) Limite configurável pela escola
e = ambiente(); e.U.start('u1');
e.U.configure({ limitSec: 30 });
e.avanca(45 * S); e.U.ping();                // passou de 30 s: descartado
e.avanca(25 * S); e.U.ping();                // cabe em 30 s: conta
await e.flush();
assert.equal(e.total(), 25);
e.U.configure({ limitSec: 5 });              // fora da faixa: vira 20 s
e.avanca(21 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 25);
e.avanca(19 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 44);
ok('limite configurável (20 a 180 s)');

// 10) Precisão: milissegundos não se perdem e movimentos colados não somem com tempo
e = ambiente(); e.U.start('u1');
e.avanca(100); e.U.ping();                   // colado: ignorado sem perder tempo
e.avanca(3000); e.U.ping();                  // o intervalo conta desde o movimento anterior: 3,1 s
await e.flush();
assert.equal(e.total(), 3);
e.avanca(900); e.U.ping();                   // 3,1 + 0,9 = 4,0 s no total
await e.flush();
assert.equal(e.total(), 4);
ok('milissegundos acumulam e só segundos inteiros são gravados');

// 11) Digitar e apagar são movimento; arrastar também; passar o mouse parado não
e = ambiente(); e.U.start('u1');
e.avanca(12 * S); e.win.input({});
e.avanca(12 * S); e.win.keydown({});
e.avanca(10 * S); e.win.pointermove({ buttons: 1 });    // arrastando
e.avanca(40 * S); e.win.pointermove({ buttons: 0 });    // só passou o mouse: não é movimento
e.avanca(3 * S); e.win.click({});
await e.flush();
assert.equal(e.total(), 12 + 12 + 10 + 43);
ok('digitar/apagar/arrastar contam; mouse passando sem clicar não zera a pausa');

// 12) Falha de gravação devolve o que faltou e tenta de novo
e = ambiente(); e.failWrites = true; e.U.start('u3');
e.avanca(10 * S); e.U.ping();
await e.flush();
assert.equal(e.writes.length, 0);
e.failWrites = false;
e.avanca(5 * S); e.U.ping();
await e.flush();
assert.equal(e.total(), 15);
assert.deepEqual(e.writes[0].data.opens, { inc: 1 });
ok('falha de gravação devolve o que faltou e tenta de novo');

e = ambiente(); e.failWrites = true; e.U.start('u4');
for (let i = 0; i < 8; i++) { e.avanca(5 * S); e.U.ping(); await e.flush(); }
e.failWrites = false;
e.avanca(5 * S); e.U.ping();
await e.flush();
assert.equal(e.writes.length, 0);
ok('5 falhas seguidas pausam a coleta (não fica insistindo)');

// 13) stop() não deixa ouvintes e o modo espelho (que nunca chama start) não conta
e = ambiente(); e.U.start('u5');
for (const t of ['pointerdown', 'scroll', 'input', 'pointermove', 'pagehide']) assert.ok(e.win[t], t);
for (const t of ['visibilitychange', 'play', 'pause']) assert.ok(e.doc[t], t);
e.U.stop();
assert.equal(Object.keys(e.win).length + Object.keys(e.doc).length, 0);
ok('stop() remove todos os ouvintes');

e = ambiente();                              // espelho: ninguém chama start()
e.U.ping(); e.avanca(10 * S); e.U.ping(); e.tick && e.timers.length;
await e.flush();
assert.equal(e.writes.length, 0);
ok('sem start() (modo espelho) nada é contado nem gravado');

assert.equal(e.U.itemKey('pos', 'abc.D-1 x'), Adesao.itemKey('pos', 'abc.D-1 x'));
ok('itemKey do cronômetro = itemKey do cálculo');

console.log(`\n${n} testes passaram`);
