// Confere o cronômetro de uso do app do aluno (CzkUsage em index.html): só conta
// com a aba visível e atividade recente, soma por área e por item, limita o tempo
// de iframe "cego" e devolve o que não conseguiu gravar. Lê o código direto do
// index.html (nada é copiado), então qualquer mudança lá é testada aqui.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(aqui, '../../index.html'), 'utf8');
const bloco = /const CzkUsage = \(\(\) => \{[\s\S]*?\n\}\)\(\);/.exec(html);
assert.ok(bloco, 'bloco CzkUsage não encontrado no index.html');

let n = 0;
const ok = (nome, fn) => { fn(); n += 1; console.log('ok  ', nome); };

function ambiente() {
  const env = { clock: new Date(2026, 9, 20, 10, 0, 0).getTime(), writes: [], timers: [], visible: 'visible', failWrites: false, listeners: {}, docListeners: {} };
  class FakeDate extends Date {
    constructor(...a) { if (a.length) super(...a); else super(env.clock); }
    static now() { return env.clock; }
  }
  const document = {
    get visibilityState() { return env.visible; },
    addEventListener(t, f) { env.docListeners[t] = f; },
    removeEventListener(t) { delete env.docListeners[t]; },
  };
  const window = {
    addEventListener(t, f) { env.listeners[t] = f; },
    removeEventListener(t) { delete env.listeners[t]; },
  };
  const getFB = async () => ({
    db: 'db', serverTimestamp: () => 'TS', increment: v => ({ inc: v }),
    doc: (...p) => p.slice(1).join('/'),
    setDoc: async (ref, data, opts) => {
      if (env.failWrites) throw new Error('permission-denied');
      // JSON: os objetos nascem dentro do vm (outro "realm") e o assert estrito não os compara.
      env.writes.push({ ref, data: JSON.parse(JSON.stringify(data)), opts: JSON.parse(JSON.stringify(opts)) });
    },
  });
  const contexto = vm.createContext({
    window, document, getFB, Date: FakeDate, console, String, Object, Math,
    setInterval: fn => { env.timers.push(fn); return env.timers.length; }, clearInterval: () => {},
  });
  const CzkUsage = vm.runInContext(`${bloco[0]}; CzkUsage;`, contexto);
  env.U = CzkUsage;
  env.tick = () => env.timers[0]();
  env.flush = () => env.U.flush();
  return env;
}
const soma = (writes, caminho) => writes.reduce((t, w) => t + caminho(w.data), 0);

await (async () => {
  const e = ambiente();
  e.U.start('u1');
  e.U.setBucket({ area: 'posaula', item: 'pos_x', blind: false });
  e.tick(); e.tick(); e.tick();
  await e.flush();
  assert.equal(e.writes.length, 1);
  const w = e.writes[0];
  assert.equal(w.ref, 'students/u1/usage/2026-10-20');
  assert.deepEqual(w.opts, { merge: true });
  assert.equal(w.data.date, '2026-10-20');
  assert.deepEqual(w.data.secs.total, { inc: 15 });
  assert.deepEqual(w.data.secs.posaula, { inc: 15 });
  assert.deepEqual(w.data.items.pos_x, { inc: 15 });
  assert.deepEqual(w.data.itemOpens.pos_x, { inc: 1 });
  assert.deepEqual(w.data.opens, { inc: 1 });
  n += 1; console.log('ok   conta 5 s por tick só com atividade recente, por área e por item');

  // O documento tem só os campos que a regra do Firestore aceita.
  assert.deepEqual(Object.keys(w.data).sort(), ['date', 'itemOpens', 'items', 'opens', 'secs', 'updatedAt']);
  assert.deepEqual(Object.keys(w.data.secs).sort(), ['atividade', 'desafio', 'outros', 'posaula', 'total']);
  n += 1; console.log('ok   o documento gravado só tem os campos permitidos pela regra');

  // parado por mais que o limite da área: não conta
  e.clock += 130 * 1000;
  e.tick(); e.tick();
  await e.flush();
  assert.equal(e.writes.length, 1, 'parado >120 s em pós-aula não deve gravar nada novo');
  n += 1; console.log('ok   leitura parada há mais de 2 min deixa de contar');

  // volta a interagir
  e.U.ping(); e.tick();
  await e.flush();
  assert.equal(e.writes.length, 2);
  assert.deepEqual(e.writes[1].data.secs.total, { inc: 5 });
  assert.equal(e.writes[1].data.opens, undefined);       // só a 1ª gravação leva a abertura do app
  n += 1; console.log('ok   voltou a interagir: soma de novo');

  // aba oculta não conta
  e.visible = 'hidden'; e.U.ping(); e.tick(); e.tick();
  e.visible = 'visible';
  await e.flush();
  assert.equal(e.writes.length, 2);
  n += 1; console.log('ok   aba oculta não conta tempo');

  // tela inicial: idle de 45 s
  e.U.setBucket({ area: 'outros', item: '', blind: false });
  e.clock += 50 * 1000; e.tick();
  await e.flush();
  assert.equal(e.writes.length, 2);
  e.U.ping(); e.tick();
  await e.flush();
  assert.deepEqual(e.writes[2].data.secs.outros, { inc: 5 });
  assert.equal(Object.keys(e.writes[2].data.items).length, 0);
  n += 1; console.log('ok   tela comum: idle de 45 s e sem item');

  // reabrir o mesmo pós-aula conta nova abertura
  e.U.setBucket({ area: 'posaula', item: 'pos_x', blind: false });
  e.tick();
  await e.flush();
  assert.deepEqual(e.writes[3].data.itemOpens.pos_x, { inc: 1 });
  n += 1; console.log('ok   reabrir o pós-aula soma uma abertura');
})();

await (async () => {
  // iframe que não avisa atividade: conta por tempo limitado (10 min)
  const e = ambiente();
  e.U.start('u2');
  e.U.setBucket({ area: 'posaula', item: 'pos_antigo', blind: true });
  e.clock += 4 * 60 * 1000;
  e.tick();                                  // 4 min depois, sem nenhum ping: ainda dentro do idle de 5 min
  e.clock += 7 * 60 * 1000;                  // 11 min desde a abertura
  e.U.ping(); e.tick();                      // mesmo com "atividade", passou do teto de 10 min
  await e.flush();
  assert.equal(e.writes[0].data.secs.total.inc, 5);
  n += 1; console.log('ok   iframe sem aviso: teto de 10 min por abertura');
})();

await (async () => {
  // falha de gravação (regra ainda não publicada): nada se perde e para de insistir
  const e = ambiente();
  e.failWrites = true;
  e.U.start('u3');
  e.U.setBucket({ area: 'atividade', item: 'act_a1', blind: false });
  e.tick(); e.tick();
  await e.flush();
  assert.equal(e.writes.length, 0);
  e.failWrites = false;
  e.tick();
  await e.flush();
  assert.equal(e.writes.length, 1);
  assert.deepEqual(e.writes[0].data.secs.total, { inc: 15 });     // 10 s devolvidos + 5 s novos
  assert.deepEqual(e.writes[0].data.opens, { inc: 1 });
  n += 1; console.log('ok   falha de gravação devolve o que faltou e tenta de novo');

  const f = ambiente();
  f.failWrites = true;
  f.U.start('u4');
  for (let i = 0; i < 8; i++) { f.U.ping(); f.tick(); await f.flush(); }
  f.failWrites = false;
  f.U.ping(); f.tick();
  await f.flush();
  assert.equal(f.writes.length, 0, 'depois de 5 falhas seguidas a coleta pausa até recarregar o app');
  n += 1; console.log('ok   5 falhas seguidas pausam a coleta (não fica insistindo)');

  // parar não deixa ouvintes
  const g = ambiente();
  g.U.start('u5');
  assert.ok(g.listeners.pointerdown && g.docListeners.visibilitychange);
  g.U.stop();
  assert.equal(g.listeners.pointerdown, undefined);
  assert.equal(g.docListeners.visibilitychange, undefined);
  n += 1; console.log('ok   stop() remove os ouvintes');

  // chaves de item iguais às do cálculo
  const Adesao = (await import('node:module')).createRequire(import.meta.url)('../../adesao.js');
  assert.equal(g.U.itemKey('pos', 'abc.D-1 x'), Adesao.itemKey('pos', 'abc.D-1 x'));
  n += 1; console.log('ok   itemKey do cronômetro = itemKey do cálculo');
})();

console.log(`\n${n} testes passaram`);
