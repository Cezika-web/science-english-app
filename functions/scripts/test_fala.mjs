// Teste da conferência de fala com respostas de exemplo do Speech-to-Text (sem rede).  node scripts/test_fala.mjs
import assert from 'node:assert/strict';
import { interpretaPalavra, interpretaLivre, palavraAlvo, partesDaPalavra, duracaoWav, corpoSpeech } from '../fala.js';

const resp = (transcript, conf = 0.95) => ({ results: [{ alternatives: [{ transcript, confidence: conf, words: transcript.split(' ').map(w => ({ word: w, confidence: conf })) }] }] });

// 1) falou certo, com clareza → vale
let r = interpretaPalavra(resp('birthplace', 0.93), palavraAlvo('birthplace'));
assert.equal(r.ok, true); assert.equal(r.motivo, 'ok');

// 2) falou OUTRA palavra → não vale, mostra o que ouviu e onde difere
r = interpretaPalavra(resp('birthday', 0.97), palavraAlvo('birthplace'));
assert.equal(r.ok, false); assert.equal(r.motivo, 'diferente'); assert.equal(r.ouvi, 'birthday');
assert.ok(r.partes.some(p => !p.ok), 'deveria marcar letras diferentes');
assert.equal(r.partes.map(p => p.t).join(''), 'birthplace');

// 3) a palavra certa, mas com pouca clareza → NÃO vale (exigente)
r = interpretaPalavra(resp('nationality', 0.62), palavraAlvo('nationality'));
assert.equal(r.ok, false); assert.equal(r.motivo, 'pouco-claro');

// 4) silêncio
r = interpretaPalavra({}, palavraAlvo('passport'));
assert.equal(r.ok, false); assert.equal(r.motivo, 'silencio');
r = interpretaPalavra({ results: [] }, 'passport'); assert.equal(r.motivo, 'silencio');

// 5) duas palavras: as duas têm que estar certas, na ordem
assert.equal(interpretaPalavra(resp('native language', 0.9), palavraAlvo('native language')).ok, true);
r = interpretaPalavra(resp('native', 0.9), palavraAlvo('native language')); assert.equal(r.ok, false);
r = interpretaPalavra(resp('language native', 0.9), palavraAlvo('native language')); assert.equal(r.ok, false);
r = interpretaPalavra(resp('marital status', 0.55), palavraAlvo('marital status')); assert.equal(r.motivo, 'pouco-claro');

// 6) maiúscula, ponto e acento não contam
assert.equal(interpretaPalavra(resp('Passport.', 0.9), 'passport').ok, true);

// 7) th virou t → mostra onde e dá a dica do th
r = interpretaPalavra(resp('tink', 0.9), palavraAlvo('think'));
assert.equal(r.ok, false); assert.match(r.dica, /th/);
const p = partesDaPalavra('think', 'tink'); assert.deepEqual(p.filter(x => !x.ok).map(x => x.t), ['h']);

// 8) referência com parênteses e barra
assert.equal(palavraAlvo('citizen (cidadão)'), 'citizen'); assert.equal(palavraAlvo('single/unmarried'), 'single'); assert.equal(palavraAlvo('Hometown'), 'hometown');

// 9) transcrição livre
const livre = interpretaLivre({ results: [{ alternatives: [{ transcript: 'Everyone calls me Chris.', confidence: 0.9 }] }, { alternatives: [{ transcript: " I'm originally from Brazil.", confidence: 0.8 }] }] });
assert.equal(livre.texto, "Everyone calls me Chris. I'm originally from Brazil."); assert.equal(livre.conf, 0.85);

// 10) WAV: confere formato e duração
const dados = Buffer.alloc(32000);   // 1 s
const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + dados.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
h.writeUInt32LE(16000, 24); h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(dados.length, 40);
assert.equal(duracaoWav(Buffer.concat([h, dados]).toString('base64')), 1);
assert.equal(duracaoWav('AAAA'), null);

// 11) por padrão o pedido não leva "dicas" (conferência exigente); com `alvoDica` a palavra esperada vai como dica, só na conferência de palavra
const c = corpoSpeech('AAAA', 'palavra'); assert.equal(c.config.speechContexts, undefined); assert.equal(c.config.enableWordConfidence, true);
assert.deepEqual(corpoSpeech('AAAA', 'palavra', 'aunt').config.speechContexts, [{ phrases: ['aunt'], boost: 10 }], 'com dica: a palavra esperada, peso 10');
assert.equal(corpoSpeech('AAAA', 'livre', 'aunt').config.speechContexts, undefined, 'fala livre nunca leva dica');
assert.equal(corpoSpeech('AAAA', 'palavra', '').config.speechContexts, undefined, 'dica vazia = sem dica');
// 12) frase com palavrinha ("an appetizer"): a confiança baixa de "an" NÃO reprova (caso real do professor, 04/11/2026); a da palavra de sentido, sim
const porPalavra = (transcript, notas) => ({ results: [{ alternatives: [{ transcript, confidence: 0.8, words: transcript.split(' ').map((w, k) => ({ word: w, confidence: notas[k] })) }] }] });
r = interpretaPalavra(porPalavra('an appetizer', [0.52, 0.91]), palavraAlvo('an appetizer'));
assert.equal(r.ok, true, '"an" com nota baixa não reprova'); assert.equal(r.conf, 0.91); assert.equal(r.minimo, 0.8);
assert.deepEqual(r.palavras, [{ t: 'an', c: 0.52 }, { t: 'appetizer', c: 0.91 }], 'devolve a nota de cada palavra para o professor calibrar');
r = interpretaPalavra(porPalavra('an appetizer', [0.9, 0.61]), palavraAlvo('an appetizer'));
assert.equal(r.ok, false); assert.equal(r.motivo, 'pouco-claro'); assert.equal(r.conf, 0.61);
assert.deepEqual(r.partes.filter(x => !x.ok).map(x => x.t), ['appetizer'], 'marca só a palavra sem clareza, não a frase toda');
assert.deepEqual(r.partes.filter(x => x.ok && x.t !== ' ').map(x => x.t), ['an']);
assert.match(r.dica, /appetizer/); assert.match(r.dica, /an appetizer/);
// duas palavras de sentido: reprova a que ficou fraca e só ela
r = interpretaPalavra(porPalavra('marital status', [0.95, 0.5]), palavraAlvo('marital status'));
assert.equal(r.motivo, 'pouco-claro'); assert.deepEqual(r.partes.filter(x => !x.ok).map(x => x.t), ['status']);
// só palavrinhas ("the"): elas contam, senão nunca reprovaria nada
r = interpretaPalavra(porPalavra('the', [0.4]), 'the'); assert.equal(r.motivo, 'pouco-claro');
// o serviço sem nota por palavra: cai na nota geral e marca a frase inteira
r = interpretaPalavra({ results: [{ alternatives: [{ transcript: 'an appetizer', confidence: 0.6 }] }] }, 'an appetizer');
assert.equal(r.motivo, 'pouco-claro'); assert.equal(r.conf, 0.6); assert.deepEqual(r.palavras, [{ t: 'an', c: null }, { t: 'appetizer', c: null }]);
assert.deepEqual(r.partes, [{ t: 'an appetizer', ok: false }]);
// o professor baixou a exigência: 0,6 aceita a palavra de nota 0,61
r = interpretaPalavra(porPalavra('an appetizer', [0.9, 0.61]), palavraAlvo('an appetizer'), 0.6); assert.equal(r.ok, true);
// outra palavra (th→t) continua marcando letras e devolve as notas
r = interpretaPalavra(porPalavra('tink', [0.9]), 'think'); assert.equal(r.motivo, 'diferente'); assert.deepEqual(r.palavras, [{ t: 'tink', c: 0.9 }]);
console.log('fala: todos os testes passaram');
