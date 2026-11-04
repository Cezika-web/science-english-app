// Fala do aluno no curso (Connectivity): conferência das palavras do vocabulário e transcrição das gravações livres.
// Tudo aqui é lógica pura (sem rede), para poder ser testada com respostas de exemplo do serviço de voz.
//
// Serviço de voz: Google Cloud Speech-to-Text (v1), chamado pela própria função com a conta de serviço do projeto
// (sem chave para guardar; basta a API estar ligada no projeto). `chamarSpeech` recebe o áudio WAV 16 kHz mono.

export const CONFIANCA_MINIMA = 0.8;   // palavra reconhecida com menos certeza que isso NÃO vale (muito exigente de propósito)
export const LIMITE_DIA = 400;         // tentativas por aluno por dia (protege o custo)

export const normaliza = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();

// "citizen" ← "citizen (cidadão)" / "single/unmarried": fica só a primeira forma, sem parênteses.
export function palavraAlvo(s) { return normaliza(String(s || '').replace(/\([^)]*\)/g, ' ').split(/[\/;,]/)[0]); }

// ───────── pedido ao serviço de voz ─────────
export function corpoSpeech(wavBase64, modo) {
  const palavra = modo === 'palavra';
  return {
    config: {
      encoding: 'LINEAR16', sampleRateHertz: 16000, languageCode: 'en-US', audioChannelCount: 1,
      model: palavra ? 'latest_short' : 'latest_long',
      enableWordConfidence: true, maxAlternatives: 1,
      enableAutomaticPunctuation: !palavra,
      // sem "dicas" de palavras (speechContexts): elas deixariam o reconhecimento mais bonzinho com o que foi dito.
    },
    audio: { content: wavBase64 },
  };
}

// ───────── alinhamento letra a letra (para mostrar ONDE a palavra saiu diferente) ─────────
function lcs(a, b) {
  const m = a.length, n = b.length, t = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) t[i][j] = a[i - 1] === b[j - 1] ? t[i - 1][j - 1] + 1 : Math.max(t[i - 1][j], t[i][j - 1]);
  const dentro = new Array(m).fill(false); let i = m, j = n;
  while (i > 0 && j > 0) { if (a[i - 1] === b[j - 1]) { dentro[i - 1] = true; i--; j--; } else if (t[i - 1][j] >= t[i][j - 1]) i--; else j--; }
  return dentro;
}
// Letras da palavra certa que NÃO apareceram no que foi ouvido → [{t:'bir', ok:true}, {t:'th', ok:false}, ...]
export function partesDaPalavra(alvo, ouvido) {
  const a = [...alvo], ok = ouvido ? lcs(a, [...ouvido]) : a.map(() => false); const partes = [];
  a.forEach((ch, i) => { const u = partes[partes.length - 1]; if (u && u.ok === ok[i]) u.t += ch; else partes.push({ t: ch, ok: ok[i] }); });
  return partes;
}

// Dicas em português para os erros mais comuns de quem fala português. Só aparecem para o trecho que saiu diferente.
const DIGRAFOS = [
  ['th', 'th: ponha a pontinha da língua entre os dentes e solte o ar (não é “t”, “s” nem “f”).'],
  ['sh', 'sh: lábios para a frente, um “chhh” sem o “t” de “tch”.'],
  ['ng', 'ng: som nasal no fundo da boca, sem soltar um “g” no fim.'],
];
const INICIAIS = { h: 'h: é só um sopro de ar, como um suspiro (não é o “r” de “rato”).', r: 'r: a língua vai para trás, sem encostar e sem vibrar (não é o “rr” do português).',
  w: 'w: lábios em “u”, sem encostar os dentes (não é “v”).', v: 'v: os dentes de cima tocam o lábio de baixo.' };
export function dicaPara(partes) {
  const alvo = partes.map(p => p.t).join(''); const erradas = partes.filter(p => !p.ok);
  if (!erradas.length) return '';
  for (const [dig, txt] of DIGRAFOS) if (alvo.includes(dig) && erradas.some(p => [...p.t].every(c => dig.includes(c)))) return txt;
  if (!partes[0].ok && INICIAIS[alvo[0]]) return INICIAIS[alvo[0]];
  if (!partes[partes.length - 1].ok && /[a-z]$/.test(alvo)) return 'fim da palavra: não engula o último som.';
  return 'Escute de novo e repita mais devagar, sílaba por sílaba.';
}

// ───────── a conferência da palavra ─────────
// `resposta` = JSON do Speech-to-Text. Retorna: { ok, ouvi, conf, minimo, palavras, motivo, partes, dica }
//   motivo: 'ok' | 'silencio' | 'diferente' (ouviu outra palavra) | 'pouco-claro' (ouviu a palavra, mas sem clareza)
//   palavras: [{ t, c }] = cada palavra ouvida e a confiança do serviço (c = null se o serviço não informou); serve para o professor calibrar.
// A confiança da frase é a MENOR entre as palavras que carregam sentido: "an", "the", "to"... são palavrinhas curtas que o serviço quase
// sempre reconhece com menos certeza, e não podem reprovar a aluna que falou "appetizer" direito.
const PALAVRAS_DE_LIGACAO = new Set(['a', 'an', 'the', 'to', 'of', 'in', 'on', 'at', 'and', 'or', 'for', 'my', 'your']);
const arred2 = n => Math.round(n * 100) / 100;
export function interpretaPalavra(resposta, alvo, minimo = CONFIANCA_MINIMA) {
  const resultados = (resposta && resposta.results) || [];
  const alts = resultados.map(r => (r.alternatives || [])[0]).filter(Boolean);
  const ouvi = alts.map(a => String(a.transcript || '').trim()).join(' ').trim();
  const palavras = alts.flatMap(a => a.words || []);
  const confs = palavras.map(w => (typeof w.confidence === 'number' ? w.confidence : null)).filter(c => c !== null);
  const confGeral = confs.length ? Math.min(...confs) : (alts.length && typeof alts[0].confidence === 'number' ? Math.min(...alts.map(a => a.confidence)) : null);
  const alvoTokens = alvo.split(' ').filter(Boolean), ouvidoTokens = normaliza(ouvi).split(' ').filter(Boolean);
  if (!ouvidoTokens.length) return { ok: false, ouvi: '', conf: null, minimo, palavras: [], motivo: 'silencio', partes: partesDaPalavra(alvo, ''), dica: 'Não consegui ouvir nada. Fale mais perto do microfone, num lugar sem barulho.' };
  // confiança de cada palavra ouvida (só quando o serviço devolveu uma por palavra, na mesma ordem do texto)
  const alinhado = palavras.length === ouvidoTokens.length && palavras.every(w => normaliza(w.word) === '' || normaliza(w.word).split(' ').length === 1);
  const porPalavra = ouvidoTokens.map((t, k) => ({ t, c: alinhado && typeof palavras[k].confidence === 'number' ? arred2(palavras[k].confidence) : null }));
  const igual = alvoTokens.length === ouvidoTokens.length && alvoTokens.every((t, k) => t === ouvidoTokens[k]);
  // letras: cada palavra do alvo comparada com a que foi ouvida na mesma posição
  const partes = alvoTokens.flatMap((t, k) => { const q = partesDaPalavra(t, ouvidoTokens[k] || ''); return k ? [{ t: ' ', ok: true }, ...q] : q; });
  if (!igual) return { ok: false, ouvi, conf: confGeral, minimo, palavras: porPalavra, motivo: 'diferente', partes, dica: dicaPara(partes) };
  // palavras que contam: as de sentido (se a frase só tiver palavrinhas, todas contam)
  let contam = alvoTokens.map((t, k) => k).filter(k => !PALAVRAS_DE_LIGACAO.has(alvoTokens[k]));
  if (!contam.length) contam = alvoTokens.map((t, k) => k);
  const comNota = contam.filter(k => porPalavra[k].c !== null);
  const conf = comNota.length ? Math.min(...comNota.map(k => porPalavra[k].c)) : confGeral;
  if (conf !== null && conf < minimo) {
    const fracas = comNota.length ? comNota.filter(k => porPalavra[k].c < minimo) : [];
    const marcadas = new Set(fracas);
    // mostra QUAIS palavras ficaram sem clareza (e não a frase toda); sem nota por palavra, marca a frase inteira
    const partesClareza = fracas.length
      ? alvoTokens.flatMap((t, k) => { const q = { t, ok: !marcadas.has(k) }; return k ? [{ t: ' ', ok: true }, q] : [q]; })
      : [{ t: alvo, ok: false }];
    const quais = fracas.length ? fracas.map(k => `“${alvoTokens[k]}”`) : [];
    const dica = quais.length === 1 ? `Entendi “${ouvi}”, mas ${quais[0]} não saiu com clareza. Fale mais devagar e pronuncie cada som.`
      : quais.length > 1 ? `Entendi “${ouvi}”, mas ${quais.join(' e ')} não saíram com clareza. Fale mais devagar e pronuncie cada som.`
      : 'Entendi a palavra, mas sem clareza. Fale mais devagar e pronuncie cada som.';
    return { ok: false, ouvi, conf, minimo, palavras: porPalavra, motivo: 'pouco-claro', partes: partesClareza, dica };
  }
  return { ok: true, ouvi, conf, minimo, palavras: porPalavra, motivo: 'ok', partes: [{ t: alvo, ok: true }], dica: '' };
}

// ───────── a gravação livre (falar 30 s) ─────────
export function interpretaLivre(resposta) {
  const resultados = (resposta && resposta.results) || [];
  const texto = resultados.map(r => ((r.alternatives || [])[0] || {}).transcript || '').map(s => s.trim()).filter(Boolean).join(' ').trim();
  const confs = resultados.map(r => ((r.alternatives || [])[0] || {}).confidence).filter(c => typeof c === 'number');
  return { texto, conf: confs.length ? Math.round(confs.reduce((a, b) => a + b, 0) / confs.length * 100) / 100 : null };
}

// WAV PCM 16 kHz mono: confere o cabeçalho e a duração (o app manda esse formato).
export function duracaoWav(base64) {
  const b = Buffer.from(String(base64 || ''), 'base64');
  if (b.length < 46 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') return null;
  const canais = b.readUInt16LE(22), taxa = b.readUInt32LE(24), bits = b.readUInt16LE(34);
  if (canais !== 1 || taxa !== 16000 || bits !== 16) return null;
  return (b.length - 44) / (taxa * 2);
}

// ───────── exigência por livro (cursos/{id}.pronunciaMin) ─────────
// O professor muda pelo painel (0,5 a 0,95). Ausente ou inválido: o padrão. Fora da faixa: encosta no limite mais próximo.
export function exigencia(valor) {
  const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (valor === null || valor === undefined || valor === '' || !Number.isFinite(n)) return CONFIANCA_MINIMA;
  return Math.min(0.95, Math.max(0.5, n));
}

// ───────── cota por aluno por dia (o contador mora em students/{uid}/planoProgresso/quotaFala) ─────────
export const diaSP = (data = new Date()) => data.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
export function proximaCota(atual, dia, limite = LIMITE_DIA) {
  const n = atual && atual.dia === dia ? Number(atual.n) || 0 : 0;
  return n >= limite ? { liberado: false, dia, n } : { liberado: true, dia, n: n + 1 };
}

// ───────── o pedido que o app manda ─────────
export const DURACAO_MAX = { palavra: 6, livre: 62 };   // segundos (a fala livre do app para em 30 s; sobra margem)
const MAX_BASE64 = 3000000;                              // ~62 s de WAV 16 kHz mono em base64 é ~2,6 MB
export function validarPedido(dados) {
  const d = dados && typeof dados === 'object' ? dados : {};
  const modo = d.modo === 'palavra' || d.modo === 'livre' ? d.modo : '';
  if (!modo) return { erro: 'Faltou dizer se é uma palavra ou uma fala livre.' };
  const chave = String(d.chave || '');
  if (!/^[A-Za-z0-9_-]{6,60}$/.test(chave)) return { erro: 'Identificador da gravação inválido.' };
  const wav = typeof d.wav === 'string' ? d.wav : '';
  if (!wav) return { erro: 'Faltou o áudio.' };
  if (wav.length > MAX_BASE64) return { erro: 'O áudio é grande demais.' };
  const duracao = duracaoWav(wav);
  if (duracao === null) return { erro: 'O áudio precisa ser WAV de 16 kHz, mono, 16 bits.' };
  if (duracao > DURACAO_MAX[modo]) return { erro: modo === 'palavra' ? 'Grave só a palavra (no máximo 6 segundos).' : 'A gravação passou do tempo máximo.' };
  let alvo = '';
  if (modo === 'palavra') {
    alvo = palavraAlvo(String(d.palavra || '').slice(0, 120));
    if (!alvo) return { erro: 'Faltou a palavra a conferir.' };
  }
  const curso = d.curso === undefined || d.curso === null || d.curso === '' ? '' : String(d.curso);
  if (curso && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(curso)) return { erro: 'Curso inválido.' };
  return { valor: { modo, chave, wav, alvo, curso, duracao, teste: d.teste === true } };
}

// ───────── a chamada HTTP ao serviço de voz (o `fetch` vem por parâmetro, para testar com respostas simuladas) ─────────
export const URL_TOKEN = 'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token';
export const URL_SPEECH = 'https://speech.googleapis.com/v1/speech:recognize';

// tipo: 'desligada' (API não ligada / sem permissão) | 'limite' (cota do Google) | 'audio' (áudio recusado) | 'servico' (rede ou erro do Google)
export class ErroFala extends Error {
  constructor(tipo, mensagem, detalhe = '') { super(mensagem); this.name = 'ErroFala'; this.tipo = tipo; this.detalhe = String(detalhe || ''); }
}

// Token da conta de serviço da própria função, pelo servidor de metadados (sem chave para guardar). Fica em cache até perto de vencer.
export function criarFonteDeToken(fetchFn, agora = () => Date.now()) {
  let guardado = null;
  return async function token() {
    if (guardado && guardado.vence > agora()) return guardado.valor;
    let r;
    try { r = await fetchFn(URL_TOKEN, { headers: { 'Metadata-Flavor': 'Google' } }); }
    catch (e) { throw new ErroFala('servico', 'Não consegui a credencial do projeto.', e && e.message); }
    if (!r.ok) throw new ErroFala('servico', 'Não consegui a credencial do projeto.', `metadados HTTP ${r.status}`);
    let j = null; try { j = await r.json(); } catch (e) { /* cai no teste abaixo */ }
    if (!j || !j.access_token) throw new ErroFala('servico', 'Não consegui a credencial do projeto.', 'resposta sem access_token');
    guardado = { valor: j.access_token, vence: agora() + Math.max(0, (Number(j.expires_in) || 0) - 60) * 1000 };
    return guardado.valor;
  };
}

export async function chamarSpeech(fetchFn, token, wavBase64, modo) {
  let r;
  try {
    r = await fetchFn(URL_SPEECH, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(corpoSpeech(wavBase64, modo)) });
  } catch (e) { throw new ErroFala('servico', 'Não consegui falar com o serviço de voz.', e && e.message); }
  let j = null; try { j = JSON.parse(await r.text()); } catch (e) { /* corpo vazio ou não-JSON */ }
  if (r.ok) return j || {};
  const erro = (j && j.error) || {};
  const razao = ((erro.details || []).map(d => d && d.reason).find(Boolean)) || '';
  const detalhe = `HTTP ${r.status} ${erro.status || ''} ${razao} ${erro.message || ''}`.replace(/\s+/g, ' ').trim();
  if (r.status === 403 || erro.status === 'PERMISSION_DENIED' || razao === 'SERVICE_DISABLED') throw new ErroFala('desligada', 'A conferência de fala ainda não foi ligada.', detalhe);
  if (r.status === 429 || erro.status === 'RESOURCE_EXHAUSTED') throw new ErroFala('limite', 'O serviço de voz está ocupado. Tente de novo daqui a pouco.', detalhe);
  if (r.status === 400) throw new ErroFala('audio', 'O serviço de voz não aceitou esse áudio.', detalhe);
  throw new ErroFala('servico', 'O serviço de voz não respondeu direito.', detalhe);
}

// Junta tudo: chama o serviço e interpreta. Palavra → { ok, ouvi, conf, motivo, partes, dica }; livre → { texto, conf }.
export async function conferirFala(fetchFn, fonteDeToken, { modo, alvo, wav, minimo }) {
  const resposta = await chamarSpeech(fetchFn, await fonteDeToken(), wav, modo);
  return modo === 'palavra' ? interpretaPalavra(resposta, alvo, minimo) : interpretaLivre(resposta);
}
