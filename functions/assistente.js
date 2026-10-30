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

/* ───────────────────────── Dados de estudo e de curso do aluno ─────────────────────────
 * O aluno pode perguntar "qual a minha média de estudo?", "quanto está a minha adesão?", "em que unidade eu estou?".
 * Duas fontes, ambas só do PRÓPRIO aluno:
 *   - dadosEstudo: o resumo que o app já calcula e mostra na tela de Adesão (CzkAdesao.assistantSummary em adesao.js).
 *     Vem do aplicativo, então é tratado como entrada não confiável: limpaDadosEstudo() só deixa passar números nos
 *     limites e datas AAAA-MM-DD (nenhum texto livre chega ao prompt) e o servidor ainda confere a liberação.
 *   - perfil/curso: lido do cadastro do aluno e das atividades no próprio servidor.
 */
const DIA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const PILARES = [
  ['C', 'Constância (dias da semana em que estudou)'], ['At', 'Atividades (exercícios feitos, com tempo mínimo)'],
  ['Pos', 'Pós-aula (tempo de leitura)'], ['Aula', 'Aulas (presença)'], ['Des', 'Desafio (partes feitas)'],
];
const DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];
const FAIXAS = { alta: 'Alta', media: 'Média', baixa: 'Baixa' };

const dataBR = (iso) => (DIA_ISO.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
const diaMes = (iso) => (DIA_ISO.test(iso || '') ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const vazio = (v) => v === null || v === undefined;
const virgula = (v) => String(Math.round(v * 10) / 10).replace('.', ',');
function fmMin(v) {
  if (vazio(v)) return 'sem dado';
  const m = Math.round(v);
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}min` : `${m} min`;
}
const media = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
/** Texto vindo de cadastro: uma linha só, sem caracteres de controle, com tamanho máximo. */
const textoCurto = (s, n = 60) => cortar(String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim(), n);

/** Aceita só o formato que o app manda; qualquer outra coisa vira null. Nunca devolve texto livre. */
export function limpaDadosEstudo(bruto) {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return null;
  const n = (v, lo = 0, hi = 100000) => {
    if (vazio(v) || v === '' || typeof v === 'boolean') return null;
    const x = Number(v);
    return Number.isFinite(x) && x >= lo && x <= hi ? Math.round(x * 10) / 10 : null;
  };
  const dia = (v) => (typeof v === 'string' && DIA_ISO.test(v) ? v : null);
  const obj = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const lista = (v, max) => (Array.isArray(v) ? v.slice(0, max) : []);
  const porPilar = (o, hi) => Object.fromEntries(PILARES.map(([k]) => [k, n(obj(o)[k], 0, hi)]));
  const atual = obj(bruto.atual); const horas = obj(bruto.horas); const pres = obj(bruto.presenca);
  const des = obj(bruto.desafio); const metas = obj(bruto.metasAluno);
  return {
    status: bruto.status === 'ok' ? 'ok' : 'coletando',
    indice: n(bruto.indice, 0, 100),
    faixa: Object.hasOwn(FAIXAS, bruto.faixa) ? bruto.faixa : null,
    tendencia: n(bruto.tendencia, -100, 100),
    primeiraNota: dia(bruto.primeiraNota),
    pilares: porPilar(bruto.pilares, 100), pesos: porPilar(bruto.pesos, 100),
    semanas: lista(bruto.semanas, 3).map((w) => ({ de: dia(obj(w).de), nota: n(obj(w).nota, 0, 100), min: n(obj(w).min, 0, 10080), dias: n(obj(w).dias, 0, 7) })),
    atual: bruto.atual ? {
      de: dia(atual.de), min: n(atual.min, 0, 10080), dias: n(atual.dias, 0, 7), passados: n(atual.passados, 1, 7),
      porDia: lista(atual.porDia, 7).map((v) => n(v, 0, 1440)),
      metaDiaMin: n(atual.metaDiaMin, 0, 600), metaDias: n(atual.metaDias, 0, 7), bateram: n(atual.bateram, 0, 7),
    } : null,
    horas: bruto.horas ? {
      durAula: n(horas.durAula, 0, 600), aulaMin: n(horas.aulaMin, 0, 1e6), aulaSemMin: n(horas.aulaSemMin, 0, 1e6), aulaMesMin: n(horas.aulaMesMin, 0, 1e6),
      appMin: n(horas.appMin, 0, 1e6), appSemMin: n(horas.appSemMin, 0, 1e6), appMesMin: n(horas.appMesMin, 0, 1e6),
    } : null,
    mediaDiasAtivos: n(bruto.mediaDiasAtivos, 0, 7), mediaMinPos: n(bruto.mediaMinPos, 0, 600),
    entrega: n(bruto.entrega, 0, 100), acertoUltima: n(bruto.acertoUltima, 0, 100),
    presenca: bruto.presenca ? { prevista: n(pres.prevista, 0, 1000), presente: n(pres.presente, 0, 1000) } : null,
    desafio: { ligado: des.ligado !== false, disponiveis: n(des.disponiveis, 0, 1000), feitas: n(des.feitas, 0, 1000) },
    metasAluno: { diaMin: n(metas.diaMin, 0, 600), semH: n(metas.semH, 0, 200), mesH: n(metas.mesH, 0, 800) },
  };
}

/**
 * Bloco "DADOS DE ESTUDO" do prompt. `liberada`: o professor já liberou a Adesão (schools/{id}.adesao.liberadaEm <= hoje);
 * antes disso nenhum número pode ser citado, porque o aluno também não os vê no app. `hoje`: AAAA-MM-DD (São Paulo).
 */
export function contextoDadosEstudo(bruto, { liberada, hoje }) {
  const cab = `DADOS DE ESTUDO DO ALUNO (calculados pelo app, os mesmos da tela de Adesão dele; hoje é ${dataBR(hoje)})`;
  if (!liberada) {
    return `${cab}\nA Adesão (nota, semanas e tempo de estudo) ainda NÃO foi liberada para este aluno. Se ele perguntar por esses números, diga que eles aparecem no app quando o César liberar. Não cite nenhum número de estudo e não estime.`;
  }
  const d = limpaDadosEstudo(bruto);
  if (!d) {
    return `${cab}\nOs números de estudo não chegaram nesta pergunta. Se ele perguntar por eles, diga que não consegue vê-los agora e que ele pode conferir na aba Progresso do app. Não invente nenhum número.`;
  }
  const l = [cab];
  const usadas = d.semanas.length;
  if (d.status === 'ok' && !vazio(d.indice)) {
    l.push(`Adesão: ${d.indice} de 100${d.faixa ? ` (faixa ${FAIXAS[d.faixa]})` : ''}. É a média das últimas ${usadas} semana(s) fechada(s) (segunda a domingo), com mais peso para a mais recente.`);
    if (!vazio(d.tendencia)) l.push(`Tendência: ${d.tendencia > 0 ? '+' : ''}${virgula(d.tendencia)} ponto(s) da penúltima para a última semana fechada.`);
    const pil = PILARES.filter(([k]) => !vazio(d.pilares[k])).map(([k, nome]) => `${nome} ${d.pilares[k]}% (peso ${vazio(d.pesos[k]) ? '?' : d.pesos[k]})`);
    if (pil.length) l.push(`Pilares da nota (média das semanas usadas): ${pil.join('; ')}. Pilar sem dado (ex.: sem aula ou sem desafio na semana) não entra na conta e os pesos dos outros se redistribuem.`);
  } else {
    l.push(`Adesão: ainda sem nota. O app está juntando as primeiras semanas completas (segunda a domingo)${d.primeiraNota ? `; a primeira nota aparece em ${dataBR(d.primeiraNota)}` : ''}. Não invente nota.`);
  }
  d.semanas.forEach((w) => l.push(`- Semana de ${diaMes(w.de)}: nota ${vazio(w.nota) ? 'sem dado' : w.nota}, ${fmMin(w.min)} de estudo no app, ${vazio(w.dias) ? '?' : w.dias} dia(s) ativo(s).`));
  const mins = d.semanas.map((w) => w.min).filter((v) => !vazio(v));
  if (mins.length) {
    const mSem = media(mins);
    const dias = !vazio(d.mediaDiasAtivos) ? d.mediaDiasAtivos : media(d.semanas.map((w) => w.dias).filter((v) => !vazio(v)));
    l.push(`Média de estudo no app (últimas ${mins.length} semana(s) fechada(s)): ${fmMin(mSem)} por semana, cerca de ${fmMin(mSem / 7)} por dia (somando os 7 dias)${vazio(dias) ? '' : `; em média ${virgula(dias)} dia(s) ativo(s) por semana`}.`);
  }
  const a = d.atual;
  if (a && !vazio(a.min)) {
    const porDia = a.porDia.slice(0, a.passados || 7).map((v, i) => `${DIAS_SEMANA[i]} ${vazio(v) ? '?' : Math.round(v)}`).join(', ');
    l.push(`Esta semana (desde ${diaMes(a.de)}${a.passados ? `, ${a.passados} de 7 dias já passados` : ''}): ${fmMin(a.min)} de estudo no app, ${vazio(a.dias) ? '?' : a.dias} dia(s) ativo(s).`
      + `${vazio(a.metaDiaMin) || vazio(a.metaDias) ? '' : ` Meta de estudo: ${a.metaDiaMin} min por dia em ${a.metaDias} dia(s) da semana; bateu a meta em ${vazio(a.bateram) ? '?' : a.bateram} dia(s).`}`
      + `${porDia ? ` Minutos por dia: ${porDia}.` : ''}`);
  }
  const h = d.horas;
  if (h && !vazio(h.appMin)) {
    const soma = (x, y) => (vazio(x) || vazio(y) ? null : x + y);
    l.push(`Horas de estudo (tempo das aulas, ${vazio(h.durAula) ? '?' : h.durAula} min por pós-aula, mais o tempo no app): esta semana ${fmMin(soma(h.aulaSemMin, h.appSemMin))}, este mês ${fmMin(soma(h.aulaMesMin, h.appMesMin))}, total desde que o app começou a medir ${fmMin(soma(h.aulaMin, h.appMin))} (${fmMin(h.appMin)} só no app).`);
  }
  const m = d.metasAluno;
  const metas = [!vazio(m.diaMin) && `${m.diaMin} min por dia`, !vazio(m.semH) && `${virgula(m.semH)} h por semana`, !vazio(m.mesH) && `${virgula(m.mesH)} h por mês`].filter(Boolean);
  if (metas.length) l.push(`Metas que o próprio aluno definiu no Perfil: ${metas.join(', ')}.`);
  if (d.presenca && d.presenca.prevista > 0) l.push(`Presença nas aulas (semanas usadas): presente em ${d.presenca.presente ?? '?'} de ${d.presenca.prevista} aula(s) prevista(s).`);
  if (!vazio(d.entrega)) l.push(`Atividades entregues (semanas usadas): ${d.entrega}% dos exercícios.`);
  if (!vazio(d.acertoUltima)) l.push(`Acerto nas atividades da última semana corrigida: ${d.acertoUltima}%.`);
  if (!vazio(d.mediaMinPos)) l.push(`Tempo médio de leitura por pós-aula: ${virgula(d.mediaMinPos)} min.`);
  if (!d.desafio.ligado) l.push('Desafio da semana: desligado para este aluno.');
  else if (!vazio(d.desafio.disponiveis) && d.desafio.disponiveis > 0) l.push(`Desafio da semana (semanas usadas): ${d.desafio.feitas ?? '?'} de ${d.desafio.disponiveis} parte(s) feita(s).`);
  return l.join('\n');
}

/**
 * Bloco "PERFIL E CURSO" do prompt, só com o que o app mostra ao aluno (nada de financeiro).
 * aluno: documento students/{uid}; totalPosAulas: contagem de pós-aulas (ou null); atividades: as mais recentes.
 */
export function contextoPerfil(aluno, { totalPosAulas = null, atividades = [] } = {}) {
  const l = ['PERFIL E CURSO DO ALUNO (do cadastro dele)'];
  l.push(`Nível: ${textoCurto(aluno.level) || 'não informado'}.`);
  if (DIA_ISO.test(aluno.inicioCurso || '')) l.push(`No curso desde ${dataBR(aluno.inicioCurso)}.`);
  const aulas = textoCurto(aluno.diasAulas, 80);
  if (aulas) l.push(`Aulas: ${aulas}${aluno.aulaHora ? ` (${textoCurto(aluno.aulaHora, 10)})` : ''}.`);
  if (Number(aluno.metaAnual) > 0) l.push(`Meta de aulas no ano: ${Math.round(Number(aluno.metaAnual))}.`);
  const plano = aluno.plano && typeof aluno.plano === 'object' && aluno.plano.ativo !== false ? aluno.plano : null;
  if (plano) l.push(`Plano: ${textoCurto(plano.nome) || 'Science Lab'}${plano.unidadeRotulo ? `, unidade atual ${textoCurto(plano.unidadeRotulo, 30)}` : ''}.`);
  if (Number.isFinite(totalPosAulas)) l.push(`Pós-aulas registradas no app: ${totalPosAulas} no total (não é o mesmo que aulas do ano: não calcule % da meta anual com isso).`);
  if (atividades.length) {
    const corrigidas = atividades.filter((a) => a.status === 'corrected').length;
    const finalizadas = atividades.filter((a) => a.finalizada || a.status === 'corrected').length;
    l.push(`Atividades (as ${atividades.length} mais recentes): ${finalizadas} finalizada(s), ${corrigidas} já corrigida(s), ${atividades.length - finalizadas} ainda em andamento.`);
  }
  return l.join('\n');
}
