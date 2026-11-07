// Teste da chamada ao Speech-to-Text com respostas SIMULADAS (sem rede).  node scripts/test_fala_http.mjs
import assert from 'node:assert/strict';
import { ErroFala, URL_SPEECH, URL_TOKEN, chamarSpeech, conferirFala, criarFonteDeToken, diaSP, exigencia, proximaCota, validarPedido, LIMITE_DIA, CONFIANCA_MINIMA } from '../fala.js';

// Resposta simulada do `fetch`: { ok, status, json() , text() }
const resposta = (status, corpo) => ({ ok: status >= 200 && status < 300, status, json: async () => corpo, text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)) });
// `fetch` falso que anota as chamadas e responde conforme a URL.
function fetchFalso(rotas) {
  const chamadas = [];
  const f = async (url, opcoes = {}) => { chamadas.push({ url, opcoes }); const r = rotas[url]; if (!r) throw new Error('rota inesperada ' + url); return typeof r === 'function' ? r(opcoes, chamadas.length) : r; };
  f.chamadas = chamadas; return f;
}
const wav = segundos => {
  const dados = Buffer.alloc(Math.round(32000 * segundos)); const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + dados.length, 4); h.write('WAVE', 8); h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(16000, 24); h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(dados.length, 40);
  return Buffer.concat([h, dados]).toString('base64');
};
const speechOk = (transcript, conf = 0.95) => ({ results: [{ alternatives: [{ transcript, confidence: conf, words: transcript.split(' ').map(w => ({ word: w, confidence: conf })) }] }] });
const token = { access_token: 'tok-1', expires_in: 3600, token_type: 'Bearer' };

// 1) token: usa o servidor de metadados com o cabeçalho certo e guarda em cache até perto de vencer
{
  let agora = 1000000; const f = fetchFalso({ [URL_TOKEN]: resposta(200, token) });
  const fonte = criarFonteDeToken(f, () => agora);
  assert.equal(await fonte(), 'tok-1'); assert.equal(await fonte(), 'tok-1');
  assert.equal(f.chamadas.length, 1, 'deveria reaproveitar o token');
  assert.equal(f.chamadas[0].opcoes.headers['Metadata-Flavor'], 'Google');
  agora += 3600 * 1000;   // venceu (com a folga de 60 s)
  await fonte(); assert.equal(f.chamadas.length, 2, 'deveria pedir outro token depois de vencer');
}

// 2) token: falha do servidor de metadados vira ErroFala 'servico'
{
  const f = fetchFalso({ [URL_TOKEN]: resposta(500, 'erro') });
  await assert.rejects(criarFonteDeToken(f)(), e => e instanceof ErroFala && e.tipo === 'servico');
  const g = fetchFalso({ [URL_TOKEN]: resposta(200, {}) });
  await assert.rejects(criarFonteDeToken(g)(), e => e instanceof ErroFala && e.tipo === 'servico');
  const h = async () => { throw new Error('sem rede'); };
  await assert.rejects(criarFonteDeToken(h)(), e => e instanceof ErroFala && /sem rede/.test(e.detalhe));
}

// 3) o pedido ao Speech: URL, método, token e corpo (sem "dicas" de palavras)
{
  const f = fetchFalso({ [URL_SPEECH]: resposta(200, speechOk('birthplace', 0.93)) });
  const r = await chamarSpeech(f, 'tok-1', 'QUJD', 'palavra');
  assert.equal(r.results[0].alternatives[0].transcript, 'birthplace');
  const c = f.chamadas[0]; assert.equal(c.opcoes.method, 'POST'); assert.equal(c.opcoes.headers.Authorization, 'Bearer tok-1');
  const corpo = JSON.parse(c.opcoes.body);
  assert.equal(corpo.audio.content, 'QUJD'); assert.equal(corpo.config.encoding, 'LINEAR16'); assert.equal(corpo.config.sampleRateHertz, 16000);
  assert.equal(corpo.config.model, 'latest_short'); assert.equal(corpo.config.speechContexts, undefined); assert.equal(corpo.config.enableWordConfidence, true);
  const f2 = fetchFalso({ [URL_SPEECH]: resposta(200, {}) });
  await chamarSpeech(f2, 't', 'QUJD', 'livre'); assert.equal(JSON.parse(f2.chamadas[0].opcoes.body).config.model, 'latest_long');
  assert.deepEqual(await chamarSpeech(fetchFalso({ [URL_SPEECH]: resposta(200, '') }), 't', 'QUJD', 'livre'), {}, 'corpo vazio = nada reconhecido');
}

// 4) API desligada (403 / SERVICE_DISABLED) → ErroFala 'desligada', com o motivo no detalhe (vai para o log)
{
  const desligada = { error: { code: 403, status: 'PERMISSION_DENIED', message: 'Cloud Speech-to-Text API has not been used in project 152554774632 before or it is disabled.', details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason: 'SERVICE_DISABLED' }] } };
  await assert.rejects(chamarSpeech(fetchFalso({ [URL_SPEECH]: resposta(403, desligada) }), 't', 'QUJD', 'palavra'),
    e => e instanceof ErroFala && e.tipo === 'desligada' && /SERVICE_DISABLED/.test(e.detalhe) && /ainda não foi ligada/.test(e.message));
  await assert.rejects(chamarSpeech(fetchFalso({ [URL_SPEECH]: resposta(403, 'Forbidden') }), 't', 'QUJD', 'palavra'), e => e.tipo === 'desligada');
  await assert.rejects(chamarSpeech(fetchFalso({ [URL_SPEECH]: resposta(400, { error: { status: 'PERMISSION_DENIED' } }) }), 't', 'QUJD', 'palavra'), e => e.tipo === 'desligada');
}

// 5) outros erros do Google
{
  const tipo = async (status, corpo) => { try { await chamarSpeech(fetchFalso({ [URL_SPEECH]: resposta(status, corpo) }), 't', 'QUJD', 'palavra'); } catch (e) { return e.tipo; } return 'nenhum'; };
  assert.equal(await tipo(429, { error: { status: 'RESOURCE_EXHAUSTED' } }), 'limite');
  assert.equal(await tipo(400, { error: { status: 'INVALID_ARGUMENT', message: 'Sync input too long.' } }), 'audio');
  assert.equal(await tipo(500, { error: { status: 'INTERNAL' } }), 'servico');
  assert.equal(await tipo(503, '<html>'), 'servico');
  const caiu = async () => { throw new Error('ECONNRESET'); };
  await assert.rejects(chamarSpeech(caiu, 't', 'QUJD', 'palavra'), e => e.tipo === 'servico' && /ECONNRESET/.test(e.detalhe));
}

// 6) conferirFala de ponta a ponta com respostas simuladas
{
  const rotas = fala => ({ [URL_TOKEN]: resposta(200, token), [URL_SPEECH]: resposta(200, fala) });
  const conferir = (fala, extra) => { const f = fetchFalso(rotas(fala)); return conferirFala(f, criarFonteDeToken(f), { modo: 'palavra', alvo: 'birthplace', wav: 'QUJD', minimo: CONFIANCA_MINIMA, ...extra }); };
  let r = await conferir(speechOk('birthplace', 0.93)); assert.equal(r.ok, true); assert.equal(r.motivo, 'ok');
  r = await conferir(speechOk('birthday', 0.97)); assert.equal(r.ok, false, 'falou outra palavra: nunca vale'); assert.equal(r.ouvi, 'birthday'); assert.ok(r.partes.some(p => !p.ok));
  r = await conferir(speechOk('birthplace', 0.7)); assert.equal(r.ok, false); assert.equal(r.motivo, 'pouco-claro');
  r = await conferir(speechOk('birthplace', 0.7), { minimo: 0.6 }); assert.equal(r.ok, true, 'com exigência menor passa');
  r = await conferir({}); assert.equal(r.ok, false); assert.equal(r.motivo, 'silencio');
  const f = fetchFalso(rotas({ results: [{ alternatives: [{ transcript: 'Everyone calls me Chris.', confidence: 0.9 }] }] }));
  r = await conferirFala(f, criarFonteDeToken(f), { modo: 'livre', wav: 'QUJD' }); assert.deepEqual(r, { texto: 'Everyone calls me Chris.', conf: 0.9 });
  const g = fetchFalso({ [URL_TOKEN]: resposta(200, token), [URL_SPEECH]: resposta(403, { error: { status: 'PERMISSION_DENIED', details: [{ reason: 'SERVICE_DISABLED' }] } }) });
  await assert.rejects(conferirFala(g, criarFonteDeToken(g), { modo: 'palavra', alvo: 'x', wav: 'QUJD' }), e => e.tipo === 'desligada');
}

// 7) exigência do livro: 0–0,95, padrão 0,8 (até 06/11/2026 o piso era 0,5)
assert.equal(exigencia(undefined), CONFIANCA_MINIMA); assert.equal(exigencia(null), CONFIANCA_MINIMA); assert.equal(exigencia(''), CONFIANCA_MINIMA); assert.equal(exigencia('abc'), CONFIANCA_MINIMA);
assert.equal(exigencia(0.9), 0.9); assert.equal(exigencia('0,7'), 0.7); assert.equal(exigencia(0.99), 0.95); assert.equal(exigencia(0.1), 0.1);
assert.equal(exigencia(0.25), 0.25); assert.equal(exigencia('0,25'), 0.25); assert.equal(exigencia(0), 0); assert.equal(exigencia(-1), 0);

// 7b) a dica vai ao Google só quando pedida, e o mínimo 0,25 deixa passar "cousin" ouvido certo com nota baixa (caso real da Fátima, 06/11/2026)
{
  const corpoEnviado = f => JSON.parse(f.chamadas.find(c => c.url === URL_SPEECH).opcoes.body);
  const rotas = fala => ({ [URL_TOKEN]: resposta(200, token), [URL_SPEECH]: resposta(200, fala) });
  const conferir = async (fala, extra) => { const f = fetchFalso(rotas(fala)); const r = await conferirFala(f, criarFonteDeToken(f), { modo: 'palavra', alvo: 'cousin', wav: 'QUJD', ...extra }); return { r, corpo: corpoEnviado(f) }; };
  let x = await conferir(speechOk('cousin', 0.29), { minimo: 0.25, dica: true });
  assert.equal(x.r.ok, true); assert.equal(x.r.minimo, 0.25); assert.deepEqual(x.corpo.config.speechContexts, [{ phrases: ['cousin'], boost: 10 }]);
  x = await conferir(speechOk('cousin', 0.04), { minimo: 0.25, dica: true }); assert.equal(x.r.ok, false, 'nota 0,04 não passa com mínimo 0,25'); assert.equal(x.r.motivo, 'pouco-claro');
  x = await conferir(speechOk('causing', 0.9), { minimo: 0.25, dica: true }); assert.equal(x.r.ok, false, 'outra palavra nunca vale, mesmo com nota alta e dica'); assert.equal(x.r.motivo, 'diferente');
  x = await conferir(speechOk('cousin', 0.04), { minimo: 0 }); assert.equal(x.r.ok, true, 'mínimo 0: vale a palavra ouvida igual');
  x = await conferir(speechOk('cousin', 0.9), { minimo: 0.8 }); assert.equal(x.corpo.config.speechContexts, undefined, 'sem `dica`, nada de speechContexts');
  x = await conferir(speechOk('cousin', 0.9), { minimo: 0.8, dica: false }); assert.equal(x.corpo.config.speechContexts, undefined);
  const f = fetchFalso(rotas(speechOk('hello', 0.9))); await conferirFala(f, criarFonteDeToken(f), { modo: 'livre', alvo: '', wav: 'QUJD', dica: true });
  assert.equal(corpoEnviado(f).config.speechContexts, undefined, 'fala livre nunca leva dica');
}

// 8) cota por dia
{
  assert.deepEqual(proximaCota(null, '2026-11-04'), { liberado: true, dia: '2026-11-04', n: 1 });
  assert.deepEqual(proximaCota({ dia: '2026-11-04', n: 7 }, '2026-11-04'), { liberado: true, dia: '2026-11-04', n: 8 });
  assert.equal(proximaCota({ dia: '2026-11-04', n: LIMITE_DIA }, '2026-11-04').liberado, false);
  assert.deepEqual(proximaCota({ dia: '2026-11-03', n: LIMITE_DIA }, '2026-11-04'), { liberado: true, dia: '2026-11-04', n: 1 }, 'dia novo zera');
  assert.equal(diaSP(new Date('2026-11-04T02:00:00Z')), '2026-11-03', 'dia vira no horário de São Paulo, não em UTC');
}

// 9) validação do pedido que o app manda
{
  const ok = { modo: 'palavra', palavra: 'Citizen (cidadão)', wav: wav(1.5), chave: 'k9x2abc123', curso: 'connectivity-1' };
  let v = validarPedido(ok); assert.ok(v.valor, v.erro); assert.equal(v.valor.alvo, 'citizen'); assert.equal(v.valor.duracao, 1.5); assert.equal(v.valor.teste, false);
  assert.equal(validarPedido({ ...ok, teste: true }).valor.teste, true);
  assert.ok(validarPedido({ modo: 'livre', wav: wav(30), chave: 'abc-123_XYZ' }).valor, 'fala livre de 30 s vale sem palavra nem curso');
  assert.ok(validarPedido({ ...ok, modo: 'livre', wav: wav(61) }).valor, 'livre aceita até 62 s');
  for (const [rotulo, ruim] of [
    ['modo desconhecido', { ...ok, modo: 'x' }], ['sem modo', { ...ok, modo: undefined }], ['chave curta', { ...ok, chave: 'abc' }], ['chave com ponto', { ...ok, chave: 'abc.defgh' }],
    ['sem áudio', { ...ok, wav: '' }], ['áudio que não é WAV', { ...ok, wav: 'AAAA' }], ['palavra longa demais (7 s)', { ...ok, wav: wav(7) }], ['livre longa demais (63 s)', { ...ok, modo: 'livre', wav: wav(63) }],
    ['palavra vazia', { ...ok, palavra: '  ' }], ['palavra só de símbolos', { ...ok, palavra: '(...)' }], ['curso inválido', { ...ok, curso: '../x' }], ['áudio enorme', { ...ok, wav: 'A'.repeat(3000001) }],
  ]) assert.ok(validarPedido(ruim).erro, `deveria recusar: ${rotulo}`);
  assert.ok(validarPedido(null).erro);
}
console.log('fala (chamada ao Speech, cota e pedido): todos os testes passaram');
