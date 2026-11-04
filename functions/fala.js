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
// `resposta` = JSON do Speech-to-Text. Retorna: { ok, ouvi, conf, motivo, partes, dica }
//   motivo: 'ok' | 'silencio' | 'diferente' (ouviu outra palavra) | 'pouco-claro' (ouviu a palavra, mas sem clareza)
export function interpretaPalavra(resposta, alvo, minimo = CONFIANCA_MINIMA) {
  const resultados = (resposta && resposta.results) || [];
  const alts = resultados.map(r => (r.alternatives || [])[0]).filter(Boolean);
  const ouvi = alts.map(a => String(a.transcript || '').trim()).join(' ').trim();
  const palavras = alts.flatMap(a => a.words || []);
  const confs = palavras.map(w => (typeof w.confidence === 'number' ? w.confidence : null)).filter(c => c !== null);
  const conf = confs.length ? Math.min(...confs) : (alts.length && typeof alts[0].confidence === 'number' ? Math.min(...alts.map(a => a.confidence)) : null);
  const alvoTokens = alvo.split(' ').filter(Boolean), ouvidoTokens = normaliza(ouvi).split(' ').filter(Boolean);
  if (!ouvidoTokens.length) return { ok: false, ouvi: '', conf: null, motivo: 'silencio', partes: partesDaPalavra(alvo, ''), dica: 'Não consegui ouvir nada. Fale mais perto do microfone, num lugar sem barulho.' };
  const igual = alvoTokens.length === ouvidoTokens.length && alvoTokens.every((t, i) => t === ouvidoTokens[i]);
  // letras: cada palavra do alvo comparada com a que foi ouvida na mesma posição
  const partes = alvoTokens.flatMap((t, i) => { const p = partesDaPalavra(t, ouvidoTokens[i] || ''); return i ? [{ t: ' ', ok: true }, ...p] : p; });
  if (!igual) return { ok: false, ouvi, conf, motivo: 'diferente', partes, dica: dicaPara(partes) };
  if (conf !== null && conf < minimo) return { ok: false, ouvi, conf, motivo: 'pouco-claro', partes: [{ t: alvo, ok: false }], dica: 'Entendi a palavra, mas sem clareza. Fale mais devagar e pronuncie cada som.' };
  return { ok: true, ouvi, conf, motivo: 'ok', partes: [{ t: alvo, ok: true }], dica: '' };
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
