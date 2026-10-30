/**
 * Material do aluno para o assistente de dúvidas de inglês.
 *
 * A IA é uma só para todos os alunos, mas cada pergunta é respondida com o que ESTE aluno estudou:
 * as últimas 5 pós-aulas e as atividades da última semana (com o que ele respondeu e se estava certo).
 * O resto, a IA responde pelo conhecimento dela. Nada aqui chama a IA nem o banco: são só funções puras,
 * fáceis de testar (functions/scripts/test_assistente_contexto.mjs).
 *
 * Duas partes:
 *   estatico  → resumo das 5 pós-aulas + lista das atividades da semana. Muda pouco, então vai com cache do prompt
 *               (perguntas seguidas do mesmo aluno ficam mais baratas e rápidas).
 *   dinamico  → só os trechos que combinam com ESTA pergunta (explicações, tabelas, exercícios já respondidos).
 */

const PARADAS = new Set((
  'de da das dos em no na nos nas um uma uns umas por para pra com sem que qual quais quando como onde porque pq se eu me meu minha ' +
  'isso essa esse esta este ao aos ou mas ser ter tem uso usar usa posso pode significa quer dizer diferenca entre frase palavra ingles ' +
  'the a an of to and in on'
).split(' '));

export function normaliza(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function tokens(s) {
  return [...new Set(normaliza(s).split(/[^a-z0-9']+/).map((t) => t.replace(/^'+|'+$/g, '')).filter((t) => t.length >= 2 && !PARADAS.has(t)))];
}

function decodifica(s) {
  return s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

/** HTML da pós-aula → lista de linhas de texto (uma por parágrafo, item ou linha de tabela). */
export function htmlParaLinhas(html) {
  const limpo = String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|ul|ol|table|br)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodifica(limpo).split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).filter((l) => l.length >= 8);
}

function dataCurta(valor) {
  const d = valor && typeof valor.toDate === 'function' ? valor.toDate() : valor ? new Date(valor) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' });
}

/** Pontua cada linha pela raridade das palavras da pergunta que ela contém (palavra rara pesa mais). */
export function pontuarLinhas(linhas, pergunta) {
  const q = tokens(pergunta);
  if (!q.length) return linhas.map(() => 0);
  const toks = linhas.map((l) => new Set(tokens(l)));
  const N = linhas.length || 1;
  const peso = new Map(q.map((t) => [t, Math.log(1 + N / (1 + toks.filter((s) => s.has(t)).length))]));
  return toks.map((s) => {
    let pontos = 0; let achou = 0;
    for (const t of q) if (s.has(t)) { pontos += peso.get(t); achou += 1; }
    return achou > 1 ? pontos * (1 + 0.25 * (achou - 1)) : pontos;
  });
}

const cortar = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * posaulas: até 5 documentos { id, title, topic, createdAt, html }, do mais novo para o mais antigo.
 * Devolve { estatico, dinamico, ids }.
 */
export function contextoPosAulas(posaulas, pergunta, { resumoPorAula = 2000, orcamentoDinamico = 4200 } = {}) {
  const fixos = []; const todas = [];
  posaulas.forEach((p, i) => {
    const linhas = htmlParaLinhas(p.html);
    const data = dataCurta(p.createdAt);
    const rotulo = `[${data || `aula ${i + 1}`}]`;
    const inicio = Math.max(0, linhas.findIndex((l) => /resumo da aula/i.test(l)));
    const corpo = linhas.slice(inicio); const usadas = new Set(); let tamanho = 0;
    corpo.forEach((l, k) => { if (tamanho < resumoPorAula) { usadas.add(k); tamanho += l.length + 1; } });
    fixos.push(`### Pós-aula ${data} — ${p.topic || p.title || ''}\n${corpo.filter((_, k) => usadas.has(k)).map((l) => cortar(l, 700)).join('\n')}`);
    corpo.forEach((l, k) => { if (!usadas.has(k)) todas.push({ aula: i, rotulo, texto: l }); });
  });
  const pontos = pontuarLinhas(todas.map((t) => t.texto), pergunta);
  const ordem = todas.map((t, k) => ({ ...t, k, pontos: pontos[k] })).filter((t) => t.pontos > 0).sort((a, b) => b.pontos - a.pontos);
  let gasto = 0; const escolhidas = [];
  for (const t of ordem) {
    const linha = `${t.rotulo} ${cortar(t.texto, 420)}`;
    if (gasto + linha.length > orcamentoDinamico) continue;
    escolhidas.push({ ...t, linha }); gasto += linha.length + 1;
  }
  escolhidas.sort((a, b) => a.aula - b.aula || a.k - b.k);
  return { estatico: fixos.join('\n\n'), dinamico: escolhidas.map((t) => t.linha).join('\n'), ids: posaulas.map((p) => p.id) };
}

/** Texto de cada <li> de uma parte da atividade, na ordem em que o aluno respondeu (e0, e1, ...). */
export function questoesDaParte(html) {
  return [...String(html || '').matchAll(/<li>([\s\S]*?)<\/li>/gi)].map((m) => decodifica(m[1].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim());
}

function rotuloStatus(a) {
  if (a.status === 'corrected') return 'corrigida pelo professor';
  if (a.finalizada) return 'finalizada, aguardando correção';
  return 'em andamento';
}

/**
 * atividades: documentos { id, title, week, createdAt, parts, respostas, correcao, status, finalizada, summary },
 * do mais novo para o mais antigo. Considera só a semana da atividade mais recente.
 */
export function contextoAtividades(atividades, pergunta, { orcamentoDinamico = 3000 } = {}) {
  if (!atividades.length) return { estatico: '', dinamico: '', semana: '' };
  const semana = atividades[0].week;
  const daSemana = atividades.filter((a) => a.week === semana).slice(0, 5);
  const fixos = []; const exercicios = [];
  daSemana.forEach((a) => {
    let total = 0; let certas = 0; let respondidas = 0;
    (a.parts || []).forEach((parte) => {
      const qs = questoesDaParte(parte.content);
      const resp = (a.respostas && a.respostas[parte.id]) || {};
      const corr = (a.correcao && a.correcao[parte.id]) || [];
      qs.forEach((q, i) => {
        total += 1;
        const r = resp[`e${i}`];
        if (r === undefined || r === null || String(r).trim() === '') return;
        respondidas += 1;
        const c = corr[i];
        const marca = c ? (c.status === 'ok' ? ' → CERTO' : ` → ERRADO${c.correct ? ` (certo: ${c.correct})` : ''}`) : '';
        if (c && c.status === 'ok') certas += 1;
        exercicios.push({ rotulo: `[${a.title}]`, texto: `${cortar(q, 220)} → o aluno respondeu: "${cortar(String(r).trim(), 80)}"${marca}` });
      });
    });
    const placar = a.status === 'corrected' ? `, acertou ${certas} de ${respondidas}` : '';
    fixos.push(`- "${a.title}" (${rotuloStatus(a)}; respondeu ${respondidas} de ${total}${placar})${a.summary ? ` — ${cortar(String(a.summary), 220)}` : ''}`);
  });
  const pontos = pontuarLinhas(exercicios.map((e) => e.texto), pergunta);
  const ordem = exercicios.map((e, k) => ({ ...e, pontos: pontos[k] })).filter((e) => e.pontos > 0).sort((a, b) => b.pontos - a.pontos);
  let gasto = 0; const escolhidos = [];
  for (const e of ordem) {
    const linha = `${e.rotulo} ${e.texto}`;
    if (gasto + linha.length > orcamentoDinamico || escolhidos.length >= 12) continue;
    escolhidos.push(linha); gasto += linha.length + 1;
  }
  return { estatico: `Atividades da última semana (${semana}):\n${fixos.join('\n')}`, dinamico: escolhidos.join('\n'), semana };
}
