import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import Anthropic from '@anthropic-ai/sdk';
import { montarTemplate, REGRAS_POS_AULA, garantirAudioPosAula } from './posaula.js';
import { REGRAS_ATIVIDADES, SCHEMA_ATIVIDADES, textoDaPosAula } from './atividades.js';
import { createChallengeFunctions } from './challenge.js';
import { createCobrancaFunctions } from './cobranca.js';

initializeApp();
const db = getFirestore();

// A chave nunca fica no código — é lida do cofre do Firebase.
// Para gravá-la:  firebase functions:secrets:set ANTHROPIC_API_KEY
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

// Mesmos e-mails das regras de segurança do Firestore.
const ADMIN_EMAILS = ['cmo.sep@gmail.com', 'czkenglish@gmail.com'];

// Trocar por 'claude-opus-4-8' se quiser mais qualidade a um custo maior.
const MODEL = 'claude-sonnet-5';

// US$ por milhão de tokens (preço cheio do Sonnet 5 — estimativa conservadora).
const PRECO_ENTRADA = 3.0;
const PRECO_SAIDA = 15.0;
const PRECO_CACHE = 0.3;

// Precos comerciais em centavos. O professor compra saldo em reais e escolhe
// entre resposta imediata (expresso) e Batch API (programado).
const PRECOS_CENTAVOS = Object.freeze({
  posaula:   { expresso: 250, programado: 200 },
  atividade: { expresso: 100, programado: 75 }, // por bloco de ate 3 atividades/aluno
  correcao:  { expresso: 200, programado: 150 }, // por solicitacao/aluno
});

const normalizarPrazo = (value) => value === 'programado' ? 'programado' : 'expresso';
const reais = (centavos) => `R$ ${(Number(centavos || 0) / 100).toFixed(2).replace('.', ',')}`;

async function verificarSaldo(escola, valorCentavos) {
  const saldo = escola?.plan?.saldoCentavos;
  if (typeof saldo !== 'number' && escola?.plan?.trial === true) return;
  const disponivel = typeof saldo === 'number' ? saldo : 0;
  if (disponivel < valorCentavos) {
    throw new HttpsError(
      'failed-precondition',
      `Saldo insuficiente. Esta operacao custa ${reais(valorCentavos)} e seu saldo e ${reais(disponivel)}.`
    );
  }
}

async function debitarSaldo({ escolaId, valorCentavos, tipo, prazo, email, uid = '', descricao = '', extra = {} }) {
  if (!valorCentavos) return { saldoCentavos: null, movimentoId: null };
  const escolaRef = db.doc(`schools/${escolaId}`);
  const movimentoRef = db.collection('_saldoMovimentos').doc();
  let saldoDepois = null;
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(escolaRef);
    if (!snap.exists) throw new HttpsError('not-found', 'Escola nao encontrada.');
    const plan = snap.data().plan || {};
    const saldo = plan.saldoCentavos;
    if (typeof saldo !== 'number' && plan.trial === true) return;
    const disponivel = typeof saldo === 'number' ? saldo : 0;
    if (disponivel < valorCentavos) {
      throw new HttpsError('failed-precondition', `Saldo insuficiente. Faltam ${reais(valorCentavos - disponivel)}.`);
    }
    saldoDepois = disponivel - valorCentavos;
    tx.update(escolaRef, { 'plan.saldoCentavos': saldoDepois });
    tx.set(movimentoRef, {
      escolaId, tipo, prazo, uid, descricao, valorCentavos: -valorCentavos,
      saldoDepoisCentavos: saldoDepois, porEmail: email,
      criadoEm: FieldValue.serverTimestamp(), ...extra,
    });
  });
  return { saldoCentavos: saldoDepois, movimentoId: saldoDepois === null ? null : movimentoRef.id };
}

async function estornarSaldo({ escolaId, valorCentavos, tipo, prazo, email, movimentoId = null, motivo = '' }) {
  if (!valorCentavos || !movimentoId) return;
  const escolaRef = db.doc(`schools/${escolaId}`);
  const movimentoRef = db.collection('_saldoMovimentos').doc();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(escolaRef);
    if (!snap.exists) return;
    const saldo = snap.data().plan?.saldoCentavos;
    if (typeof saldo !== 'number') return;
    const saldoDepois = saldo + valorCentavos;
    tx.update(escolaRef, { 'plan.saldoCentavos': saldoDepois });
    tx.set(movimentoRef, {
      escolaId, tipo: 'estorno', servico: tipo, prazo, motivo,
      valorCentavos, saldoDepoisCentavos: saldoDepois,
      movimentoOriginalId: movimentoId, porEmail: email,
      criadoEm: FieldValue.serverTimestamp(),
    });
  });
}

const REGRAS_DE_CORRECAO = `Você é o professor César, da Science English, corrigindo as atividades de inglês
de um aluno. Escreva o feedback DIRETAMENTE PARA O ALUNO — use "sua resposta" e
"resposta correta". Tom encorajador e direto, em português do Brasil.

## Como classificar cada erro

- "bobo"    → não compromete a compreensão: digitação, ortografia, plural
              esquecido, artigo esquecido, pequenos deslizes.
- "mediano" → gera alguma confusão, mas a mensagem é compreensível: tempo verbal
              inadequado, preposição incorreta, vocabulário inadequado.
- "grave"   → impede ou quase impede a compreensão: frases difíceis de entender,
              construções que alteram o significado.
- "ok"      → acertou.
- "branco"  → o aluno não respondeu nada nesta questão.

Questão em branco NÃO é acerto e NÃO é erro. Use "branco" — nunca "ok". Ela
entra só em "Não respondidas" e fica fora da conta de acertos e de erros.

## O que NÃO é erro

Estas regras valem para TODOS os tipos de exercício, inclusive tradução e texto
livre. NUNCA marque erro por:

- maiúscula ou minúscula, em qualquer posição — inclusive no começo da frase.
  "what time is it?" está CERTO, é "ok".
- ponto final ausente (ou sobrando) no fim da frase. "It's midnight" sem ponto
  está CERTO.
- vírgula, aspas ou apóstrofo ao redor
- espaçamento: espaço a mais, a menos ou fora de lugar entre as palavras.
  "I ' am late" é "I am late" — está CERTO.

A ÚNICA exceção de maiúscula é o pronome "I", que sempre se escreve maiúsculo.
"i am late" é erro bobo; "what time is it?" não é.

Quando a resposta só difere da correta por maiúscula/minúscula, ponto final ou
espaçamento, é "ok" — sem ressalva no comentário, sem citar no relatório e sem entrar
em "patterns". Nesses casos, escreva o campo "correct" na mesma forma que o
aluno usou, para não sugerir que ele errou.

## Consistência obrigatória

O status de cada questão, o placar e o texto do relatório precisam concordar.
Se uma questão está marcada "ok", ela conta como acerto no "summary" e NÃO pode
aparecer como ressalva no comentário. Nunca escreva "só ajuste X" sobre uma
questão que você marcou como correta.

## Questões deixadas em branco

Mesmo tendo finalizado, o aluno pode ter pulado questões. Marque cada uma
dessas como "branco" e NÃO o repreenda por elas. A porcentagem de acertos
considera apenas o que ele respondeu; o que ficou em branco aparece só em
"Não respondidas". No comentário geral, reconheça o que ele fez.

## O campo "correcao"

Para cada parte da atividade, devolva um item por QUESTÃO, na MESMA ORDEM em que
aparecem, de cima para baixo. Conte por linha/questão, não por lacuna: a questão 1
é o primeiro item da lista, a 2 é o segundo, e assim por diante. Cada "_______" e
cada "a) b) c)" conta como um item.

Nos erros, preencha "correct" (a resposta certa) e "explain" (explicação curta,
escrita para o aluno). Em "ok", deixe os dois vazios.

## O campo "report" — relatório de 6 blocos

Texto simples, com esta estrutura exata:

━━━━━━━━━━━━━━━━━━━━
BLOCO 1 - RESULTADO GERAL
━━━━━━━━━━━━━━━━━━━━
Total de questões:
Respondidas:
Não respondidas:
Acertos:
Erros:
Porcentagem de acertos:
Porcentagem de erros:
Porcentagem não respondida:
[Comentário geral — máximo 3 linhas, encorajador e direto]

━━━━━━━━━━━━━━━━━━━━
BLOCO 2 - ERROS BOBOS
━━━━━━━━━━━━━━━━━━━━
[Se não houver: "Nenhum erro bobo encontrado. ✅"]
[Se houver, numerado:]
1.
Sua resposta: [o que o aluno escreveu]
Resposta correta: [versão correta]
Explicação: [breve e didática]

Total de erros bobos:
Porcentagem dos erros bobos em relação ao total de erros:

━━━━━━━━━━━━━━━━━━━━
BLOCO 3 - ERROS MEDIANOS
━━━━━━━━━━━━━━━━━━━━
[Mesmo formato do Bloco 2]

━━━━━━━━━━━━━━━━━━━━
BLOCO 4 - ERROS GRAVES
━━━━━━━━━━━━━━━━━━━━
[Mesmo formato do Bloco 2]

## Os campos "patterns" e "pedagogico" — a SEMANA inteira

São consolidados de TODAS as atividades juntas, não de uma só.

- "patterns"   → padrões de erro do mais frequente ao menos frequente, com número
                 de ocorrências. Ex: "* Ortografia: 4 ocorrências".
- "pedagogico" → máximo 10 linhas: principais pontos fortes, principais
                 dificuldades, e o que priorizar nas próximas aulas.`;

// O schema obriga o modelo a devolver exatamente esta forma — sem risco de JSON quebrado.
const SCHEMA = {
  type: 'object',
  properties: {
    patterns: { type: 'string', description: 'BLOCO 5 consolidado da semana' },
    pedagogico: { type: 'string', description: 'BLOCO 6 consolidado da semana' },
    atividades: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          activityId: { type: 'string' },
          report: { type: 'string' },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer' },
              answered: { type: 'integer' },
              correct: { type: 'integer' },
              errors: {
                type: 'object',
                properties: {
                  bobo: { type: 'integer' },
                  mediano: { type: 'integer' },
                  grave: { type: 'integer' },
                },
                required: ['bobo', 'mediano', 'grave'],
                additionalProperties: false,
              },
              score: { type: 'string' },
            },
            required: ['total', 'answered', 'correct', 'errors', 'score'],
            additionalProperties: false,
          },
          feedback: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                part: { type: 'string', description: 'ex: part-1' },
                comment: { type: 'string' },
                score: { type: 'string', description: 'ex: 4/5' },
              },
              required: ['part', 'comment', 'score'],
              additionalProperties: false,
            },
          },
          correcao: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                part: { type: 'string', description: 'ex: part-1' },
                itens: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', enum: ['ok', 'bobo', 'mediano', 'grave', 'branco'] },
                      correct: { type: 'string' },
                      explain: { type: 'string' },
                    },
                    required: ['status', 'correct', 'explain'],
                    additionalProperties: false,
                  },
                },
              },
              required: ['part', 'itens'],
              additionalProperties: false,
            },
          },
        },
        required: ['activityId', 'report', 'summary', 'feedback', 'correcao'],
        additionalProperties: false,
      },
    },
  },
  required: ['patterns', 'pedagogico', 'atividades'],
  additionalProperties: false,
};

const SCHEMA_RELATORIO_REVISAO90 = {
  type: 'object',
  properties: {
    learned: { type: 'array', items: { type: 'string' }, description: 'Conteúdos que o aluno demonstrou ter aprendido' },
    strengths: { type: 'array', items: { type: 'string' }, description: 'Pontos fortes observados' },
    reviewNext: { type: 'array', items: { type: 'string' }, description: 'Poucos pontos prioritários para revisar' },
    studentSummary: { type: 'string', description: 'Resumo positivo e direto para o aluno, máximo 8 linhas' },
    teacherGuidance: { type: 'string', description: 'Orientação pedagógica objetiva para o professor, máximo 10 linhas' },
  },
  required: ['learned', 'strengths', 'reviewNext', 'studentSummary', 'teacherGuidance'],
  additionalProperties: false,
};

async function gerarRelatorioFinalRevisao90(client, aluno, atividades) {
  let total = 0, answered = 0, correct = 0, wrong = 0;
  const consolidado = atividades.map((activity) => {
    const summary = activity.summary || {};
    const errors = summary.errors || {};
    const activityWrong = Number(errors.bobo || 0) + Number(errors.mediano || 0) + Number(errors.grave || 0);
    total += Number(summary.total || 0);
    answered += Number(summary.answered || 0);
    correct += Number(summary.correct || 0);
    wrong += activityWrong;
    return {
      week: activity.review90Phase || null,
      title: activity.title || '',
      summary,
      patterns: activity.patterns || '',
      pedagogico: activity.pedagogico || '',
      report: activity.report || '',
    };
  });
  const accuracy = correct + wrong ? Math.round(correct / (correct + wrong) * 100) : 0;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 8000,
    system: [{
      type: 'text',
      text: `Você consolida o resultado pedagógico de um desafio de revisão de inglês de 90 dias. ` +
        `O objetivo é incentivar estudo, não dar um veredito de prova. Destaque primeiro o que foi aprendido ` +
        `e os pontos fortes. Depois escolha apenas os pontos mais importantes para revisar. Não invente conteúdo ` +
        `que não esteja nas correções. Escreva em português do Brasil, com clareza e tom encorajador.`,
    }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA_RELATORIO_REVISAO90 } },
    messages: [{
      role: 'user',
      content:
        `Aluno: ${aluno.name || ''} (nível ${aluno.level || 'não informado'})\n` +
        `Resultado numérico: ${correct} acertos, ${wrong} erros, ${accuracy}% de aproveitamento.\n\n` +
        `CORREÇÕES DAS ATIVIDADES DE REVISÃO:\n${JSON.stringify(consolidado, null, 2)}`,
    }],
  });
  const response = await stream.finalMessage();
  if (response.stop_reason === 'max_tokens') throw new Error('O relatório final ficou longo demais.');
  const text = response.content.find((block) => block.type === 'text')?.text;
  if (!text) throw new Error('A API não devolveu o relatório final.');
  return {
    report: {
      ...JSON.parse(text),
      totals: { total, answered, correct, wrong, accuracy },
      activityCount: atividades.length,
    },
    usage: response.usage,
  };
}

/**
 * Carrega o aluno e confere se quem chamou pode agir sobre ele.
 * Admin global age sobre qualquer aluno; professor, só sobre os da escola dele.
 */
async function carregarAlunoEEscola(email, uid) {
  const alunoSnap = await db.doc(`students/${uid}`).get();
  if (!alunoSnap.exists) throw new HttpsError('not-found', 'Aluno não encontrado.');
  const aluno = alunoSnap.data();

  let escola = null;
  if (aluno.schoolId) {
    const escolaSnap = await db.doc(`schools/${aluno.schoolId}`).get();
    if (escolaSnap.exists) escola = { id: escolaSnap.id, ...escolaSnap.data() };
  }

  const ehAdminGlobal = ADMIN_EMAILS.includes(email);
  const ehDonoDaEscola = !!escola && escola.ownerEmail === email;
  if (!ehAdminGlobal && !ehDonoDaEscola) {
    throw new HttpsError('permission-denied', 'Você não tem acesso a este aluno.');
  }

  // Sem escola cadastrada (alunos antigos), usa a marca padrão.
  return {
    aluno,
    escola: escola || { id: 'science-english', name: 'Science English', theme: {} },
  };
}

/**
 * Registra o consumo da API para acompanhar a margem real.
 * `fator` é o multiplicador de preço do modo de envio: 1 no tempo real,
 * 0.5 na Batch API (metade do preço, mesmo modelo).
 */
function registrarUso(lote, { tipo, uid, escolaId, uso, fator = 1, extra = {} }) {
  const custoUSD =
    (((uso.input_tokens || 0) * PRECO_ENTRADA +
      (uso.output_tokens || 0) * PRECO_SAIDA +
      (uso.cache_read_input_tokens || 0) * PRECO_CACHE) *
      fator) /
    1_000_000;

  lote.set(db.collection('_apiUsage').doc(), {
    tipo,
    uid,
    escolaId,
    modelo: MODEL,
    tokensEntrada: uso.input_tokens || 0,
    tokensSaida: uso.output_tokens || 0,
    tokensCache: uso.cache_read_input_tokens || 0,
    custoUSD: Number(custoUSD.toFixed(6)),
    criadoEm: FieldValue.serverTimestamp(),
    ...extra,
  });

  return Number(custoUSD.toFixed(4));
}


/**
 * Converte a data da aula ("DD/MM/YYYY", como o painel envia) na data que vai
 * para o `createdAt`. O app agrupa o histórico por mês e por quinzena olhando
 * esse campo: gravar a hora da publicação jogaria a aula de 31/07 publicada em
 * 01/08 para dentro de agosto. Meio-dia UTC = 09h no Brasil, então o dia não
 * vira para trás em nenhum fuso. Data inválida devolve null (cai no relógio).
 */
function dataDaAulaEmDate(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(texto || '').trim());
  if (!m) return null;
  const [, dia, mes, ano] = m.map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia, 12));
  const valida = d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1 && d.getUTCDate() === dia;
  return valida ? d : null;
}

/**
 * O título é exibido no histórico, mas a data também é um contrato de dados:
 * nunca publicamos uma pós-aula gerada pela IA com apenas o assunto no título.
 * Se o H1 já trouxer uma data, preserva; caso contrário prefixa a data da aula.
 */
function tituloPosAulaComData(data, titulo) {
  const dataLimpa = String(data || '').trim();
  const assunto = String(titulo || '').replace(/\s+/g, ' ').trim();
  const prefixo = dataLimpa ? `Pós-aula ${dataLimpa}` : 'Pós-aula';
  if (!assunto) return prefixo;
  const temData = /(?:^|\D)\d{1,2}[\/-]\d{1,2}[\/-](?:20)?\d{2}(?:\D|$)/.test(assunto);
  if (temData) return assunto;
  if (/^p[oó]s[- ]?aula\b/i.test(assunto)) {
    const complemento = assunto.replace(/^p[oó]s[- ]?aula\s*[-–—:·]?\s*/i, '').trim();
    return complemento ? `${prefixo} · ${complemento}` : prefixo;
  }
  return `${prefixo} · ${assunto}`;
}

/** Extrai do HTML os números do bloco padronizado de Talk Time. */
function extrairTalkTime(html) {
  const linha = (classe) => String(html || '').match(new RegExp(`<tr[^>]*class=["'][^"']*${classe}[^"']*["'][^>]*>([\\s\\S]*?)<\\/tr>`, 'i'))?.[1] || '';
  const numero = (texto) => {
    const match = String(texto || '').replace(',', '.').match(/\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : null;
  };
  const valor = (trecho, classe) => numero(trecho.match(new RegExp(`class=["'][^"']*${classe}[^"']*["'][^>]*>([\\s\\S]*?)<`, 'i'))?.[1]);
  const aluno = linha('row-student');
  const professor = linha('row-teacher');
  const studentPct = valor(aluno, 'talk-percent');
  const teacherPct = valor(professor, 'talk-percent');
  const studentMinutes = valor(aluno, 'talk-time');
  const teacherMinutes = valor(professor, 'talk-time');
  if (studentPct === null && teacherPct === null) return null;
  return {
    ...(studentPct !== null && { studentPct }),
    ...(teacherPct !== null && { teacherPct }),
    ...(studentMinutes !== null && { studentMinutes }),
    ...(teacherMinutes !== null && { teacherMinutes }),
  };
}

/** Converte [{part, ...}] para {part-1: {...}} — a forma que o app já lê. */
function listaParaObjeto(lista, montarValor) {
  const saida = {};
  for (const item of lista || []) saida[item.part] = montarValor(item);
  return saida;
}

export const corrigirAluno = onCall(
  {
    region: 'southamerica-east1',
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 540,
    memory: '512MiB',
    // O admin é servido pelo GitHub Pages — origem diferente do Firebase.
    cors: [
      'https://cezika-web.github.io',
      /^http:\/\/localhost(:\d+)?$/,
      /^http:\/\/127\.0\.0\.1(:\d+)?$/,
    ],
  },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const uid = request.data?.uid;
    if (!uid) throw new HttpsError('invalid-argument', 'Faltou o uid do aluno.');

    const { aluno, escola } = await carregarAlunoEEscola(email, uid);

    // Só entra o que o aluno FINALIZOU. Atividade começada mas não finalizada
    // continua pendente e acumula para a próxima correção — corrigir pela
    // metade tiraria dele a chance de terminar.
    const atividadesSnap = await db.collection(`students/${uid}/activities`).get();
    const todas = atividadesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const paraCorrigir = todas.filter((a) => a.status !== 'corrected' && a.finalizada);
    const emAndamento = todas.filter((a) => a.status !== 'corrected' && !a.finalizada).length;

    if (paraCorrigir.length === 0) {
      return {
        ok: false,
        motivo: emAndamento
          ? `Nenhuma atividade finalizada. ${emAndamento} ainda em andamento — elas ficam pendentes até o aluno finalizar.`
          : 'Nenhuma atividade aguardando correção.',
      };
    }

    const jobsCorrecao = await db.collection('_correcaoJobs').where('uid', '==', uid).limit(20).get();
    if (jobsCorrecao.docs.some(d => d.data().status === 'em_preparo')) {
      return { ok: false, motivo: 'Já existe uma correção programada deste aluno em processamento.' };
    }

    const entrada = paraCorrigir.map((a) => ({
      activityId: a.id,
      week: a.week || '',
      title: a.title || '',
      parts: a.parts || [],
      respostasDoAluno: a.respostas || {},
    }));

    const prazo = normalizarPrazo(request.data?.prazo);
    const valorCentavos = PRECOS_CENTAVOS.correcao[prazo];
    await verificarSaldo(escola, valorCentavos);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const params = {
      model: MODEL,
      max_tokens: 32000,
      system: [
        { type: 'text', text: REGRAS_DE_CORRECAO, cache_control: { type: 'ephemeral' } },
      ],
      output_config: { format: { type: 'json_schema', schema: SCHEMA } },
      messages: [
        {
          role: 'user',
          content:
            `Aluno: ${aluno.name || ''} (nível ${aluno.level || 'não informado'})\n\n` +
            `Corrija todas as atividades abaixo. O campo "parts" traz os enunciados e ` +
            `"respostasDoAluno" traz o que ele respondeu — alinhe cada resposta à sua questão.\n\n` +
            JSON.stringify(entrada, null, 2),
        },
      ],
    };

    if (prazo === 'programado') {
      let batch;
      try {
        batch = await client.messages.batches.create({ requests: [{ custom_id: uid, params }] });
      } catch (erro) {
        throw new HttpsError('internal', `Não consegui programar a correção: ${erro.message}`);
      }
      let cobranca;
      try {
        cobranca = await debitarSaldo({
          escolaId: escola.id, valorCentavos, tipo: 'correcao', prazo, email, uid,
          descricao: `Correção programada de ${aluno.name || 'aluno'}`,
          extra: { batchId: batch.id, atividades: paraCorrigir.length },
        });
      } catch (erro) {
        try { await client.messages.batches.cancel(batch.id); } catch (_) {}
        throw erro;
      }
      await db.doc(`_correcaoJobs/${batch.id}`).set({
        batchId: batch.id, uid, escolaId: escola.id, porEmail: email,
        alunoNome: aluno.name || '', activityIds: paraCorrigir.map(a => a.id),
        valorCentavos, movimentoSaldoId: cobranca.movimentoId,
        saldoCentavos: cobranca.saldoCentavos, status: 'em_preparo', prazo,
        criadoEm: FieldValue.serverTimestamp(),
      });
      return { ok: true, modo: 'batch', status: 'em_preparo', jobId: batch.id, atividades: paraCorrigir.length, valorCentavos, saldoCentavos: cobranca.saldoCentavos };
    }

    let resposta;
    try {
      // Streaming: um aluno com várias atividades gera um relatório longo, e sem
      // stream a requisição estoura o tempo limite antes de terminar.
      const stream = client.messages.stream(params);
      resposta = await stream.finalMessage();
    } catch (erro) {
      console.error('Falha na chamada à API:', erro);
      throw new HttpsError('internal', `A correção não pôde ser gerada: ${erro.message}`);
    }

    if (resposta.stop_reason === 'max_tokens') {
      throw new HttpsError('internal', 'A correção ficou longa demais e foi cortada. Tente corrigir menos atividades de uma vez.');
    }

    const blocoTexto = resposta.content.find((b) => b.type === 'text');
    if (!blocoTexto) throw new HttpsError('internal', 'A API não devolveu correção.');
    const dados = JSON.parse(blocoTexto.text);

    // Se esta correção encerra a última fase do desafio, consolida todas as
    // revisões do ciclo em um relatório permanente para aluno e professor.
    const correctionById = new Map((dados.atividades || []).map((item) => [item.activityId, item]));
    const cycleId = aluno.review90?.cycleId || '';
    const reviewActivities = todas
      .filter((activity) => activity.review90 && (!cycleId || !activity.review90CycleId || activity.review90CycleId === cycleId))
      .map((activity) => {
        const correction = correctionById.get(activity.id);
        return correction ? {
          ...activity,
          status: 'corrected',
          summary: correction.summary,
          report: correction.report,
          patterns: dados.patterns,
          pedagogico: dados.pedagogico,
        } : activity;
      });
    const allReviewCorrected = reviewActivities.length > 0 && reviewActivities.every((activity) => activity.status === 'corrected');
    const reachedLastPhase = reviewActivities.some((activity) => Number(activity.review90Phase || 0) >= 4);
    const challengeEnded = (() => {
      const end = aluno.review90?.endsAt?.toDate ? aluno.review90.endsAt.toDate() : new Date(aluno.review90?.endsAt || 0);
      return !isNaN(end) && new Date() >= end;
    })();
    const finalReportId = cycleId || `review90-${uid}`;
    const finalReportRef = db.doc(`students/${uid}/review90Reports/${finalReportId}`);
    let finalReport = null;
    let finalReportUsage = null;
    if (allReviewCorrected && (reachedLastPhase || challengeEnded) && !(await finalReportRef.get()).exists) {
      try {
        const generated = await gerarRelatorioFinalRevisao90(client, aluno, reviewActivities);
        finalReport = generated.report;
        finalReportUsage = generated.usage;
      } catch (error) {
        console.error('Relatório final da revisão de 90 dias:', error);
        throw new HttpsError('internal', `As atividades foram analisadas, mas o relatório final não pôde ser gerado: ${error.message}`);
      }
    }

    // Grava cada atividade corrigida.
    const lote = db.batch();
    let gravadas = 0;

    for (const item of dados.atividades) {
      const original = paraCorrigir.find((a) => a.id === item.activityId);
      if (!original) continue; // ignora id inventado

      lote.update(db.doc(`students/${uid}/activities/${item.activityId}`), {
        status: 'corrected',
        summary: item.summary,
        report: item.report,
        patterns: dados.patterns,
        pedagogico: dados.pedagogico,
        feedback: listaParaObjeto(item.feedback, (f) => ({ comment: f.comment, score: f.score })),
        correcao: listaParaObjeto(item.correcao, (c) =>
          c.itens.map((i) =>
            i.status === 'ok'
              ? { status: 'ok' }
              : { status: i.status, correct: i.correct, explain: i.explain }
          )
        ),
        correctedAt: FieldValue.serverTimestamp(),
        corrigidoPorIA: true,
      });
      gravadas++;
    }

    if (finalReport) {
      lote.set(finalReportRef, {
        ...finalReport,
        cycleId: finalReportId,
        title: 'Resultado do Desafio de 90 Dias',
        sourceActivityIds: reviewActivities.map((activity) => activity.id),
        createdAt: FieldValue.serverTimestamp(),
        studentViewedAt: null,
        teacherViewedAt: null,
      });
      lote.update(db.doc(`students/${uid}`), {
        'review90.active': false,
        'review90.completedAt': FieldValue.serverTimestamp(),
        'review90.reportId': finalReportId,
      });
      lote.set(db.collection('_apiUsage').doc(), {
        tipo: 'review90_report',
        uid,
        alunoNome: aluno.name || '',
        modelo: MODEL,
        tokensEntrada: finalReportUsage?.input_tokens || 0,
        tokensSaida: finalReportUsage?.output_tokens || 0,
        tokensCache: finalReportUsage?.cache_read_input_tokens || 0,
        criadoEm: FieldValue.serverTimestamp(),
      });
    }

    // Registra o consumo para você acompanhar a margem real.
    const uso = resposta.usage;
    const custoUSD =
      ((uso.input_tokens || 0) * PRECO_ENTRADA +
        (uso.output_tokens || 0) * PRECO_SAIDA +
        (uso.cache_read_input_tokens || 0) * PRECO_CACHE) /
      1_000_000;

    lote.set(db.collection('_apiUsage').doc(), {
      tipo: 'correcao',
      uid,
      alunoNome: aluno.name || '',
      modelo: MODEL,
      atividades: gravadas,
      tokensEntrada: uso.input_tokens || 0,
      tokensSaida: uso.output_tokens || 0,
      tokensCache: uso.cache_read_input_tokens || 0,
      custoUSD: Number(custoUSD.toFixed(6)),
      criadoEm: FieldValue.serverTimestamp(),
    });

    const cobranca = await debitarSaldo({
      escolaId: escola.id, valorCentavos, tipo: 'correcao', prazo, email, uid,
      descricao: `Correção expressa de ${aluno.name || 'aluno'}`,
      extra: { atividades: gravadas },
    });
    await lote.commit();

    return {
      ok: true,
      atividadesCorrigidas: gravadas,
      relatorioRevisao90: !!finalReport,
      custoUSD: Number(custoUSD.toFixed(4)),
      modo: 'sincrono',
      valorCentavos,
      saldoCentavos: cobranca.saldoCentavos,
    };
  }
);

/* ────────────────────────────────────────────────────────────────
   PÓS-AULA — gerar a partir da transcrição e publicar para o aluno
   ──────────────────────────────────────────────────────────────── */

const OPCOES_PADRAO = {
  region: 'southamerica-east1',
  cors: [
    'https://cezika-web.github.io',
    /^http:\/\/localhost(:\d+)?$/,
    /^http:\/\/127\.0\.0\.1(:\d+)?$/,
  ],
};

/**
 * Gera o HTML da pós-aula a partir da transcrição. NÃO publica —
 * devolve para o professor conferir a prévia antes.
 */
export const gerarPosAula = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 3600, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { uids = [], transcricao, youtubeUrl = '', data, observacoes = '', prazo: prazoRecebido = 'expresso' } = request.data || {};
    const alunosIds = Array.isArray(uids) ? uids.filter(Boolean).slice(0, 12) : [];

    if (!alunosIds.length) throw new HttpsError('invalid-argument', 'Escolha ao menos um aluno.');
    if (!transcricao || transcricao.trim().length < 200) {
      throw new HttpsError('invalid-argument', 'A transcrição está muito curta para gerar uma pós-aula.');
    }

    const dataAula = data || new Date().toLocaleDateString('pt-BR');
    const emGrupo = alunosIds.length > 1;

    // Carrega todos antes de gerar: se um aluno não for acessível, o professor
    // descobre agora e não depois de pagar por metade das pós-aulas.
    const turma = [];
    for (const uid of alunosIds) {
      const { aluno, escola } = await carregarAlunoEEscola(email, uid);
      turma.push({ uid, aluno, escola });
    }

    const prazo = normalizarPrazo(prazoRecebido);
    if (prazo !== 'expresso') throw new HttpsError('invalid-argument', 'Use o processamento programado para esta opcao.');
    const valorCentavos = PRECOS_CENTAVOS.posaula.expresso * turma.length;
    await verificarSaldo(turma[0].escola, valorCentavos);

    const nomes = turma.map((t) => t.aluno.name || '').filter(Boolean);
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const resultados = [];
    let custoTotal = 0;
    const lote = db.batch();
    const draftRef = db.collection('_posaulaDrafts').doc();
    const orientacoesProfessor = String(observacoes || '').trim().slice(0, 4000);

    // Uma pós-aula por aluno: mesmo conteúdo de aula, mas as correções, o
    // tempo de fala e os exemplos são os daquele aluno.
    for (const { uid, aluno, escola } of turma) {
      const template = montarTemplate({ escola, aluno, data: dataAula, youtubeUrl: youtubeUrl.trim() });

      const contextoGrupo = emGrupo
        ? `Esta foi uma AULA EM GRUPO, com: ${nomes.join(', ')}.\n` +
          `Você está escrevendo a pós-aula de ${aluno.name}, e só dele.\n` +
          `- O conteúdo ensinado é comum a todos e vale para ele também.\n` +
          `- Mas as CORREÇÕES devem ser apenas dos erros que ${aluno.name} cometeu.\n` +
          `  Nunca mostre a ele o erro de um colega.\n` +
          `- As FRASES MODELO devem priorizar o que ${aluno.name} disse ou tentou dizer.\n` +
          `- No TEMPO DE FALA, compare o professor com ${aluno.name} apenas — a\n` +
          `  porcentagem dele é sobre o total da aula, então numa aula em grupo é\n` +
          `  naturalmente menor. Isso é normal e não deve ser comentado como problema.\n` +
          `- Se ${aluno.name} falou pouco, escreva uma pós-aula mais curta e honesta,\n` +
          `  em vez de encher com o que os outros disseram.\n\n`
        : '';

      let resposta;
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 32000,
          system: [
            { type: 'text', text: REGRAS_POS_AULA, cache_control: { type: 'ephemeral' } },
          ],
          messages: [
            {
              role: 'user',
              content:
                `Aluno: ${aluno.name || ''} (nível ${aluno.level || 'não informado'})\n` +
                `Data da aula: ${dataAula}\n\n` +
                contextoGrupo +
                (orientacoesProfessor
                  ? `OBSERVAÇÕES DO PROFESSOR PARA ESTA PÓS-AULA:\n${orientacoesProfessor}\n` +
                    `Trate estas observações como contexto autorizado pelo professor e dê prioridade a elas.\n\n`
                  : '') +
                `TEMPLATE A PREENCHER (devolva este HTML com o conteúdo real no lugar dos marcadores):\n\n` +
                template +
                `\n\n─────────────\nTRANSCRIÇÃO DA AULA:\n\n${transcricao}`,
            },
          ],
        });
        resposta = await stream.finalMessage();
      } catch (erro) {
        console.error(`Falha ao gerar pós-aula de ${aluno.name}:`, erro);
        throw new HttpsError('internal', `Não consegui gerar a pós-aula de ${aluno.name}: ${erro.message}`);
      }

      if (resposta.stop_reason === 'max_tokens') {
        throw new HttpsError('internal', `A pós-aula de ${aluno.name} ficou longa demais e foi cortada.`);
      }

      const blocoTexto = resposta.content.find((b) => b.type === 'text');
      if (!blocoTexto) throw new HttpsError('internal', `A API não devolveu a pós-aula de ${aluno.name}.`);

      let html = blocoTexto.text.trim();
      const emBloco = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
      if (emBloco) html = emBloco[1].trim();
      html = garantirAudioPosAula(html);

      if (!html.toLowerCase().startsWith('<!doctype html')) {
        throw new HttpsError('internal', `A pós-aula de ${aluno.name} veio num formato inesperado.`);
      }

      const tituloMatch = html.match(/<h1>([\s\S]*?)<\/h1>/i);
      const titulo = tituloMatch
        ? tituloMatch[1].replace(/<[^>]*>/g, '').trim()
        : `Pós-aula ${dataAula}`;

      custoTotal += registrarUso(lote, {
        tipo: 'posaula',
        uid,
        escolaId: escola.id,
        uso: resposta.usage,
        extra: {
          alunoNome: aluno.name || '',
          publicada: false,
          emGrupo,
          ...(emGrupo && { turma: nomes }),
        },
      });

      resultados.push({ uid, nome: aluno.name || '', html, titulo:tituloPosAulaComData(dataAula, titulo), talkTime: extrairTalkTime(html) });
    }

    lote.set(draftRef, {
      escolaId: turma[0].escola.id,
      porEmail: email,
      uids: resultados.map(r => r.uid),
      revisaoUsada: false,
      statusRevisao: 'disponivel',
      criadoEm: FieldValue.serverTimestamp(),
    });

    const cobranca = await debitarSaldo({
      escolaId: turma[0].escola.id, valorCentavos, tipo: 'posaula', prazo,
      email, descricao: `${turma.length} pos-aula(s) expressa(s)`,
      extra: { alunos: turma.length },
    });
    await lote.commit();

    return {
      ok: true,
      emGrupo,
      data: dataAula,
      posaulas: resultados,
      draftId: draftRef.id,
      custoUSD: Number(custoTotal.toFixed(4)),
      valorCentavos,
      saldoCentavos: cobranca.saldoCentavos,
    };
  }
);

/** Uma única revisão por rascunho. Falha técnica devolve a tentativa. */
export const revisarPosAula = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 900, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
    const draftId = String(request.data?.draftId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const instrucao = String(request.data?.instrucao || '').trim().slice(0, 4000);
    const posaulas = Array.isArray(request.data?.posaulas) ? request.data.posaulas.filter(p => p?.uid && p?.html) : [];
    if (!draftId || !instrucao || !posaulas.length) throw new HttpsError('invalid-argument', 'Informe a alteração desejada.');

    const draftRef = db.doc(`_posaulaDrafts/${draftId}`);
    await db.runTransaction(async tx => {
      const snap = await tx.get(draftRef);
      if (!snap.exists) throw new HttpsError('not-found', 'Rascunho não encontrado. Gere uma nova prévia.');
      const draft = snap.data();
      if (draft.porEmail !== email && !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Este rascunho pertence a outro professor.');
      if (draft.revisaoUsada) throw new HttpsError('failed-precondition', 'A revisão com IA deste rascunho já foi utilizada.');
      const inicio = draft.revisaoIniciadaEm?.toMillis?.() || 0;
      if (draft.statusRevisao === 'revisando' && Date.now() - inicio < 20 * 60 * 1000) {
        throw new HttpsError('already-exists', 'A revisão já está em andamento.');
      }
      const permitidos = new Set(draft.uids || []);
      if (posaulas.some(p => !permitidos.has(p.uid))) throw new HttpsError('permission-denied', 'Aluno inválido neste rascunho.');
      tx.update(draftRef, { statusRevisao: 'revisando', revisaoIniciadaEm: FieldValue.serverTimestamp() });
    });

    try {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      const revisadas = [];
      const lote = db.batch();
      let custoTotal = 0;
      for (const p of posaulas) {
        const { escola } = await carregarAlunoEEscola(email, p.uid);
        const resposta = await client.messages.create({
          model: MODEL,
          max_tokens: 32000,
          system: 'Você revisa um HTML de pós-aula. Preserve integralmente o CSS, a estrutura, botões, atributos e scripts. Faça somente as alterações solicitadas pelo professor. Devolva apenas o HTML completo começando em <!DOCTYPE html>.',
          messages: [{ role: 'user', content: `ALTERAÇÃO SOLICITADA:\n${instrucao}\n\nHTML ATUAL:\n${p.html}` }],
        });
        if (resposta.stop_reason === 'max_tokens') throw new Error('A revisão ficou longa demais e foi cortada.');
        const bloco = resposta.content.find(b => b.type === 'text');
        let html = bloco?.text?.trim() || '';
        const cercado = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
        if (cercado) html = cercado[1].trim();
        if (!html.toLowerCase().startsWith('<!doctype html')) throw new Error(`A revisão de ${p.nome || 'um aluno'} veio em formato inválido.`);
        if (html.replace(/\s+/g, ' ') === String(p.html).trim().replace(/\s+/g, ' ')) {
          throw new Error(`A revisão de ${p.nome || 'um aluno'} não aplicou nenhuma alteração.`);
        }
        const tituloMatch = html.match(/<h1>([\s\S]*?)<\/h1>/i);
        html = garantirAudioPosAula(html);
        revisadas.push({ ...p, html, titulo: tituloMatch ? tituloMatch[1].replace(/<[^>]*>/g, '').trim() : p.titulo, talkTime: extrairTalkTime(html) });
        custoTotal += registrarUso(lote, {
          tipo: 'revisao_posaula', uid: p.uid, escolaId: escola.id, uso: resposta.usage,
          extra: { draftId, alunoNome: p.nome || '' },
        });
      }
      lote.update(draftRef, { revisaoUsada: true, statusRevisao: 'concluida', revisadoEm: FieldValue.serverTimestamp() });
      await lote.commit();
      return { ok: true, posaulas: revisadas, custoUSD: Number(custoTotal.toFixed(4)) };
    } catch (erro) {
      await draftRef.set({ statusRevisao: 'disponivel', erroRevisao: erro.message || String(erro) }, { merge: true }).catch(() => {});
      if (erro instanceof HttpsError) throw erro;
      throw new HttpsError('internal', `Não consegui revisar: ${erro.message}`);
    }
  }
);

/** Envia a geração programada para a Batch API e reserva o valor no saldo. */
export const enfileirarPosAula = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 120, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { uids = [], transcricao, youtubeUrl = '', data, observacoes = '' } = request.data || {};
    const alunosIds = Array.isArray(uids) ? uids.filter(Boolean).slice(0, 12) : [];
    if (!alunosIds.length) throw new HttpsError('invalid-argument', 'Escolha ao menos um aluno.');
    if (!transcricao || transcricao.trim().length < 200) {
      throw new HttpsError('invalid-argument', 'A transcrição está muito curta para gerar uma pós-aula.');
    }

    const dataAula = data || new Date().toLocaleDateString('pt-BR');
    const emGrupo = alunosIds.length > 1;
    const turma = [];
    for (const uid of alunosIds) {
      const { aluno, escola } = await carregarAlunoEEscola(email, uid);
      turma.push({ uid, aluno, escola });
    }

    const prazo = 'programado';
    const valorCentavos = PRECOS_CENTAVOS.posaula.programado * turma.length;
    await verificarSaldo(turma[0].escola, valorCentavos);

    const nomes = turma.map((t) => t.aluno.name || '').filter(Boolean);
    const orientacoesProfessor = String(observacoes || '').trim().slice(0, 4000);
    const requests = turma.map(({ uid, aluno, escola }) => {
      const template = montarTemplate({ escola, aluno, data: dataAula, youtubeUrl: youtubeUrl.trim() });
      const contextoGrupo = emGrupo
        ? `Esta foi uma AULA EM GRUPO, com: ${nomes.join(', ')}.\n` +
          `Você está escrevendo a pós-aula de ${aluno.name}, e só dele.\n` +
          `- O conteúdo ensinado é comum a todos e vale para ele também.\n` +
          `- Mas as CORREÇÕES devem ser apenas dos erros que ${aluno.name} cometeu. Nunca mostre a ele o erro de um colega.\n` +
          `- As FRASES MODELO devem priorizar o que ${aluno.name} disse ou tentou dizer.\n` +
          `- No TEMPO DE FALA, compare o professor com ${aluno.name} apenas.\n` +
          `- Se ${aluno.name} falou pouco, escreva uma pós-aula mais curta e honesta.\n\n`
        : '';
      return {
        custom_id: uid,
        params: {
          model: MODEL,
          max_tokens: 32000,
          system: [{ type: 'text', text: REGRAS_POS_AULA, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content:
              `Aluno: ${aluno.name || ''} (nível ${aluno.level || 'não informado'})\n` +
              `Data da aula: ${dataAula}\n\n` + contextoGrupo +
              (orientacoesProfessor
                ? `OBSERVAÇÕES DO PROFESSOR PARA ESTA PÓS-AULA:\n${orientacoesProfessor}\n` +
                  `Trate estas observações como contexto autorizado pelo professor e dê prioridade a elas.\n\n`
                : '') +
              `TEMPLATE A PREENCHER (devolva este HTML com o conteúdo real no lugar dos marcadores):\n\n${template}` +
              `\n\n─────────────\nTRANSCRIÇÃO DA AULA:\n\n${transcricao}`,
          }],
        },
      };
    });

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let batch;
    try {
      batch = await client.messages.batches.create({ requests });
    } catch (erro) {
      console.error('Falha ao enfileirar pós-aula:', erro);
      throw new HttpsError('internal', `Não consegui enviar a pós-aula para Processos: ${erro.message}`);
    }

    let cobranca;
    try {
      cobranca = await debitarSaldo({
        escolaId: turma[0].escola.id, valorCentavos, tipo: 'posaula', prazo,
        email, descricao: `${turma.length} pós-aula(s) programada(s)`,
        extra: { alunos: turma.length, batchId: batch.id },
      });
    } catch (erro) {
      try { await client.messages.batches.cancel(batch.id); } catch (_) {}
      throw erro;
    }

    await db.doc(`_posaulaJobs/${batch.id}`).set({
      tipo: 'geracao',
      batchId: batch.id,
      escolaId: turma[0].escola.id,
      porEmail: email,
      data: dataAula,
      emGrupo,
      alunos: turma.map(({ uid, aluno }) => ({ uid, nome: aluno.name || '' })),
      status: 'gerando',
      etapa: 'gerando',
      prontoVisto: false,
      creditoProfessorDebitado: false,
      valorCentavos,
      movimentoSaldoId: cobranca.movimentoId,
      saldoCentavos: cobranca.saldoCentavos,
      prazo,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    return { ok: true, jobId: batch.id, alunos: turma.length, status: 'gerando', valorCentavos, saldoCentavos: cobranca.saldoCentavos };
  }
);

/** Cancela uma geração programada e estorna o saldo reservado. */
export const cancelarProcessoPosAula = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 90, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
    const jobId = String(request.data?.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    if (!jobId) throw new HttpsError('invalid-argument', 'Processo inválido.');
    const ref = db.doc(`_posaulaJobs/${jobId}`);
    const snap = await ref.get();
    if (!snap.exists) throw new HttpsError('not-found', 'Processo não encontrado.');
    const job = snap.data();
    if (job.porEmail !== email && !ADMIN_EMAILS.includes(email)) throw new HttpsError('permission-denied', 'Este processo pertence a outro professor.');
    if (job.tipo !== 'geracao') throw new HttpsError('failed-precondition', 'Somente uma geração pendente pode ser cancelada.');
    if (job.status === 'publicado') throw new HttpsError('failed-precondition', 'Esta pós-aula já foi publicada.');

    if (job.batchId && ['gerando', 'cancelando'].includes(job.status)) {
      const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
      try { await client.messages.batches.cancel(job.batchId); }
      catch (erro) { console.warn('O batch pode já ter terminado ao cancelar', job.batchId, erro.message); }
    }

    if (job.movimentoSaldoId && !job.saldoEstornado) {
      await estornarSaldo({
        escolaId: job.escolaId, valorCentavos: job.valorCentavos,
        tipo: 'posaula', prazo: 'programado', email,
        movimentoId: job.movimentoSaldoId, motivo: 'Processo cancelado pelo professor',
      });
    }

    await ref.set({
      status: 'cancelado', etapa: 'cancelado', creditoProfessorDebitado: false,
      saldoEstornado: !!job.movimentoSaldoId,
      posaulas: FieldValue.delete(), canceladoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });
    return { ok: true, creditoProfessorDebitado: false };
  }
);

/** Limpa uma pasta da tela de Processos sem apagar pós-aulas já entregues aos alunos. */
export const limparProcessosPosAula = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 180, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');
    const escolaId = String(request.data?.escolaId || '').slice(0, 100);
    const pasta = request.data?.pasta === 'enviados' ? 'enviados' : 'andamento';
    if (!escolaId) throw new HttpsError('invalid-argument', 'Faltou a escola.');
    const escola = await db.doc(`schools/${escolaId}`).get();
    if (!escola.exists) throw new HttpsError('not-found', 'Escola não encontrada.');
    const dataEscola = escola.data();
    const permitido = ADMIN_EMAILS.includes(email) || dataEscola.ownerEmail === email;
    if (!permitido) throw new HttpsError('permission-denied', 'Você não administra esta escola.');

    const snap = await db.collection('_posaulaJobs').where('escolaId', '==', escolaId).limit(200).get();
    const selecionados = snap.docs.filter((doc) => {
      const job = doc.data();
      const geracao = job.tipo === 'geracao';
      return pasta === 'enviados' ? (!geracao || job.status === 'publicado') : geracao && job.status !== 'publicado';
    });
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const lote = db.batch();
    for (const doc of selecionados) {
      const job = doc.data();
      if (pasta === 'andamento' && job.batchId && ['gerando', 'cancelando'].includes(job.status)) {
        try { await client.messages.batches.cancel(job.batchId); } catch (_) {}
      }
      if (pasta === 'andamento' && job.movimentoSaldoId && !job.saldoEstornado && job.status !== 'pronto') {
        await estornarSaldo({
          escolaId, valorCentavos: job.valorCentavos, tipo: 'posaula', prazo: 'programado',
          email, movimentoId: job.movimentoSaldoId, motivo: 'Processo removido pelo professor',
        });
      }
      if (job.draftId) lote.delete(db.doc(`_posaulaDrafts/${job.draftId}`));
      lote.delete(doc.ref);
    }
    await lote.commit();
    return { ok: true, excluidos: selecionados.length };
  }
);

/**
 * Publica a pós-aula já conferida: grava no Firestore e avisa o aluno.
 * Recebe o HTML da prévia — não gera de novo, então não gasta tokens.
 */
export const publicarPosAula = onCall(
  { ...OPCOES_PADRAO, timeoutSeconds: 300, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const requestedJobId = String(request.data?.jobId || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    const jobRef = requestedJobId ? db.doc(`_posaulaJobs/${requestedJobId}`) : db.collection('_posaulaJobs').doc();
    const existingJobSnap = await jobRef.get();
    const existingJob = existingJobSnap.exists ? existingJobSnap.data() : null;
    const origemGeracaoId = String(existingJob?.origemGeracaoId || request.data?.origemGeracaoId || '')
      .replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 100);
    if (existingJob && existingJob.porEmail !== email && !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Este processo pertence a outro professor.');
    }
    if (existingJob?.status === 'concluido') return { ok: true, jobId: jobRef.id, ...existingJob.resultado };

    const { posaulas = [], data } = existingJob || request.data || {};
    const lista = Array.isArray(posaulas) ? posaulas.filter((p) => p?.uid && p?.html) : [];
    if (!lista.length) throw new HttpsError('invalid-argument', 'Faltou o conteúdo para publicar.');

    for (const p of lista) {
      if (!String(p.html).toLowerCase().startsWith('<!doctype html')) {
        throw new HttpsError('invalid-argument', `Conteúdo inválido na pós-aula de ${p.nome || p.uid}.`);
      }
    }

    // Todas as pós-aulas de uma turma são da mesma escola.
    const { escola } = await carregarAlunoEEscola(email, lista[0].uid);
    if (!existingJob) {
      await jobRef.set({
        escolaId: escola.id, porEmail: email, posaulas: lista, data,
        tipo: 'publicacao', ...(origemGeracaoId && { origemGeracaoId }),
        alunos: lista.map(p => ({ uid: p.uid, nome: p.nome || '' })),
        status: 'processando', etapa: 'analisando', salvo: false,
        notificadosUids: [], criadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
      });
    } else {
      await jobRef.set({ status: 'processando', etapa: existingJob.salvo ? 'notificando' : 'analisando', erro: FieldValue.delete(), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    }

    const lote = db.batch();
    let publicadas = existingJob?.publicadas || [];
    const dataAula = dataDaAulaEmDate(data);

    if (!existingJob?.salvo) {
      await jobRef.set({ etapa: 'salvando', 'etapas.analisado': true, atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
    }

    if (!existingJob?.salvo) for (const { uid, html, titulo, nome, talkTime } of lista) {
      const { aluno } = await carregarAlunoEEscola(email, uid);

      const ref = db.doc(`students/${uid}/posaulas/${jobRef.id}-${uid}`);
      lote.set(ref, {
        title: tituloPosAulaComData(data, titulo),
        html,
        createdAt: dataAula || FieldValue.serverTimestamp(),
        ...(dataAula && { classDate: dataAula }),
        publishedAt: FieldValue.serverTimestamp(),
        readAt: null,
        geradaPorIA: true,
        publicationJobId: jobRef.id,
        ...(talkTime || extrairTalkTime(html) ? { talkTime: talkTime || extrairTalkTime(html) } : {}),
        ...(lista.length > 1 && { aulaEmGrupo: true }),
      });

      publicadas.push({ uid, nome: nome || aluno.name || '', posaulaId: ref.id, fcmToken: aluno.fcmToken || null });
    }

    if (!existingJob?.salvo) {
      lote.set(jobRef, {
        status: 'processando', etapa: 'notificando', salvo: true, publicadas,
        'etapas.analisado': true, 'etapas.salvo': true, atualizadoEm: FieldValue.serverTimestamp(),
      }, { merge: true });
      await lote.commit();
    }

    // Notifica depois de gravar: falha no push não desfaz a publicação.
    const notificadosUids = new Set(existingJob?.notificadosUids || []);
    const semTokenUids = new Set(existingJob?.semTokenUids || []);
    const falhasPush = [];
    for (const p of publicadas) {
      if (notificadosUids.has(p.uid) || semTokenUids.has(p.uid)) continue;
      // O token salvo no job pode ter expirado entre a publicação e uma nova
      // tentativa. Sempre consulte o cadastro atual do aluno antes de enviar.
      const alunoRef = db.doc(`students/${p.uid}`);
      const alunoAtualSnap = await alunoRef.get();
      const alunoAtual = alunoAtualSnap.exists ? alunoAtualSnap.data() : {};
      const fcmToken = alunoAtual.fcmToken || p.fcmToken;
      if (!fcmToken) { semTokenUids.add(p.uid); continue; }
      try {
        await getMessaging().send({
          token: fcmToken,
          notification: {
            title: 'Nova pós-aula disponível!',
            body: 'Sua pós-aula já está no app.',
          },
          webpush: {
            fcmOptions: { link: 'https://cezika-web.github.io/science-english-app/' },
          },
        });
        notificadosUids.add(p.uid);
        await jobRef.set({ notificadosUids: [...notificadosUids], atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
      } catch (erro) {
        console.error('Push falhou para', p.uid, erro.message);
        const codigo = String(erro?.code || '');
        const mensagem = String(erro?.message || '');
        const tokenInvalido = codigo.includes('registration-token-not-registered')
          || mensagem.includes('NotRegistered')
          || mensagem.toLowerCase().includes('registration token is not registered');
        if (tokenInvalido) {
          // A pós-aula foi entregue no app. Um token expirado significa apenas
          // que este dispositivo não pode receber o push até se registrar de novo.
          semTokenUids.add(p.uid);
          const limpeza = { fcmTokens: FieldValue.arrayRemove(fcmToken) };
          if (alunoAtual.fcmToken === fcmToken) limpeza.fcmToken = FieldValue.delete();
          await alunoRef.set(limpeza, { merge: true });
        } else {
          falhasPush.push(`${p.nome || p.uid}: ${mensagem}`);
        }
      }
      delete p.fcmToken;
    }

    if (falhasPush.length) {
      const erro = `Pós-aula salva, mas a notificação falhou. ${falhasPush.join(' | ')}`;
      await jobRef.set({ status: 'erro', etapa: 'erro', erro, semTokenUids: [...semTokenUids], atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
      throw new HttpsError('internal', erro);
    }

    const semNotificacao = publicadas
      .filter((p) => semTokenUids.has(p.uid))
      .map((p) => ({ uid: p.uid, nome: p.nome || p.uid }));
    const resultado = {
      publicadas: publicadas.map(({ fcmToken, ...p }) => p),
      total: publicadas.length,
      notificados: notificadosUids.size,
      semToken: semTokenUids.size,
      semNotificacao,
      saldoCentavos: escola.plan?.saldoCentavos ?? null,
    };
    await jobRef.set({
      status: 'concluido', etapa: 'concluido', resultado, publicadas: resultado.publicadas,
      semTokenUids: [...semTokenUids], 'etapas.notificado': semTokenUids.size === 0,
      concluidoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    }, { merge: true });

    if (origemGeracaoId) {
      const origemRef = db.doc(`_posaulaJobs/${origemGeracaoId}`);
      const origem = await origemRef.get();
      if (origem.exists && origem.data().porEmail === email) {
        await origemRef.set({ status: 'publicado', etapa: 'publicado', publicadoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp() }, { merge: true });
      }
    }

    return {
      ok: true,
      jobId: jobRef.id,
      ...resultado,
    };
  }
);

/* ────────────────────────────────────────────────────────────────
   ATIVIDADES — gerar a partir das pós-aulas e publicar
   ──────────────────────────────────────────────────────────────── */

/**
 * Pega o conteúdo de uma pós-aula, venha ela do banco ou de um arquivo.
 * Devolve também id/título/url — é isso que liga a atividade à aula que a originou.
 */
async function conteudoDaPosAula(uid, posaulaId) {
  const snap = await db.doc(`students/${uid}/posaulas/${posaulaId}`).get();
  if (!snap.exists) return null;
  const p = snap.data();
  const base = { id: snap.id, titulo: p.title || '', url: p.url || '', data: p.classDate || p.createdAt || null };

  if (p.html) return { ...base, texto: textoDaPosAula(p.html) };

  if (p.url) {
    try {
      const r = await fetch(p.url);
      if (!r.ok) return null;
      return { ...base, texto: textoDaPosAula(await r.text()) };
    } catch (e) {
      console.error('Não consegui ler a pós-aula', p.url, e.message);
      return null;
    }
  }
  return null;
}

/**
 * Resolve o `sourceIndex` que o modelo devolveu contra as pós-aulas da leva.
 * Índice ausente, fora do intervalo ou leva de uma pós-aula só → a primeira.
 * Nunca lança: publicar não pode quebrar por causa disso.
 */
function posaulaDaAtividade(lista, sourceIndex) {
  if (!Array.isArray(lista) || !lista.length) return null;
  const i = Math.trunc(Number(sourceIndex));
  if (!Number.isFinite(i) || i < 1 || i > lista.length) return lista[0];
  return lista[i - 1] || lista[0];
}

/**
 * Monta a requisição de um aluno. É a MESMA para o modo síncrono e para o
 * batch — muda só o meio de envio, nunca o conteúdo.
 */
function pedidoDeAtividades({ nome, nivel, qtd, observacoes, posaulas, revisao90 = null }) {
  const total = qtd + (revisao90 ? 1 : 0);
  const schemaComQuantidade = {
    ...SCHEMA_ATIVIDADES,
    properties: {
      ...SCHEMA_ATIVIDADES.properties,
      activities: { ...SCHEMA_ATIVIDADES.properties.activities, minItems: total, maxItems: total },
    },
  };
  const instrucaoRevisao = revisao90
    ? `\nDESAFIO DE REVISÃO DE 90 DIAS — obrigatório:\n` +
      `- Gere ${qtd} atividade(s) regular(es) usando prioritariamente as pós-aulas atuais.\n` +
      `- Gere MAIS UMA atividade extra como a ÚLTIMA da lista, totalizando ${total}.\n` +
      `- Essa última atividade se chama "Desafio 90 dias · Semana ${revisao90.phase}" e usa somente as pós-aulas ${revisao90.sourceIndexes.join(', ')}.\n` +
      `- Ela é revisão guiada, não prova: desafie a memória, mas permita consultar os pós-aulas.\n` +
      `- Misture recuperação de vocabulário, aplicação de gramática e produção própria, sempre no nível do aluno.\n` +
      `- Não revele respostas e não repita literalmente os exercícios regulares.\n`
    : '';
  return {
    model: MODEL,
    max_tokens: 32000,
    system: [
      { type: 'text', text: REGRAS_ATIVIDADES, cache_control: { type: 'ephemeral' } },
    ],
    output_config: { format: { type: 'json_schema', schema: schemaComQuantidade } },
    messages: [
      {
        role: 'user',
        content:
          `Aluno: ${nome} — nível ${nivel}\n` +
          `Quantidade total de atividades a gerar: ${total}\n` +
          (observacoes.trim() ? `\nObservações do professor (prioridade sobre o padrão):\n${observacoes.trim()}\n` : '') +
          instrucaoRevisao +
          `\nCONTEÚDO DAS PÓS-AULAS:\n\n` +
          posaulas.map((p, i) => `── Pós-aula ${i + 1}: ${p.titulo} ──\n${p.texto}`).join('\n\n'),
      },
    ],
  };
}

/** Só o que a atividade precisa saber da pós-aula — o texto não vai para o Firestore. */
const referenciaDasPosaulas = (posaulas) =>
  posaulas.map((p, i) => ({ index: i + 1, id: p.id, titulo: p.titulo, url: p.url || '' }));

const dataDoCampo = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const somarDias = (date, days) => new Date(date.getTime() + days * 86400000);

/** Conteúdo cronológico da fase atual do ciclo de revisão de 30 dias. */
async function prepararRevisao90(uid, aluno) {
  const cfg = aluno.review90 || {};
  if (cfg.active !== true) return null;
  const activatedAt = dataDoCampo(cfg.activatedAt);
  const endsAt = dataDoCampo(cfg.endsAt);
  const now = new Date();
  if (!activatedAt || !endsAt || now > endsAt) return null;

  const courseStart = dataDoCampo(cfg.courseStart || aluno.inicioCurso);
  if (!courseStart) return null;
  const first90End = dataDoCampo(cfg.first90End) || somarDias(courseStart, 90);
  const phase = Math.min(4, Math.max(1, Math.floor((now - activatedAt) / (7 * 86400000)) + 1));
  const phaseStart = somarDias(courseStart, (phase - 1) * 22.5);
  const phaseEnd = phase === 4 ? first90End : somarDias(courseStart, phase * 22.5);

  const snap = await db.collection(`students/${uid}/posaulas`).orderBy('createdAt', 'asc').get();
  const within90 = snap.docs.filter((doc) => {
    const p = doc.data();
    const date = dataDoCampo(p.classDate || p.createdAt);
    return date && date >= courseStart && date <= first90End;
  });
  if (!within90.length) return null;

  let selected = within90.filter((doc) => {
    const p = doc.data();
    const date = dataDoCampo(p.classDate || p.createdAt);
    return date >= phaseStart && (phase === 4 ? date <= phaseEnd : date < phaseEnd);
  });
  if (!selected.length) {
    const middle = new Date((phaseStart.getTime() + phaseEnd.getTime()) / 2);
    selected = [...within90].sort((a, b) => {
      const da = dataDoCampo(a.data().classDate || a.data().createdAt);
      const dbb = dataDoCampo(b.data().classDate || b.data().createdAt);
      return Math.abs(da - middle) - Math.abs(dbb - middle);
    }).slice(0, 3).sort((a, b) => {
      const da = dataDoCampo(a.data().classDate || a.data().createdAt);
      const dbb = dataDoCampo(b.data().classDate || b.data().createdAt);
      return da - dbb;
    });
  }

  const contents = (await Promise.all(selected.slice(0, 6).map((doc) => conteudoDaPosAula(uid, doc.id)))).filter(Boolean);
  const cycleId = cfg.cycleId || `review90-${activatedAt.getTime()}`;
  return contents.length ? { phase, cycleId, posaulas: contents } : null;
}

function marcarAtividadeDeRevisao(activities, qtdRegular, revisao90) {
  const list = Array.isArray(activities) ? activities : [];
  if (!revisao90 || list.length <= qtdRegular) return list;
  const index = list.length - 1;
  return list.map((act, i) => i === index ? {
    ...act,
    review90: true,
    review90Phase: revisao90.phase,
    review90CycleId: revisao90.cycleId || '',
    reviewPosaulas: referenciaDasPosaulas(revisao90.posaulas),
    emoji: '🧭',
    title: `Desafio 90 dias · Semana ${revisao90.phase}`,
  } : act);
}

/**
 * Gera as atividades a partir das pós-aulas escolhidas. NÃO publica —
 * o professor confere a prévia antes. Cada nova geração é uma nova operação.
 *
 * O prazo escolhido define Batch API (programado) ou resposta em tempo real
 * (expresso).
 */
export const gerarAtividades = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 3600, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { uids = [], posaulaIds = [], quantidade = 3, observacoes = '', prazo: prazoRecebido = 'programado' } = request.data || {};
    const alunosIds = Array.isArray(uids) ? uids.filter(Boolean).slice(0, 12) : [];
    if (!alunosIds.length) throw new HttpsError('invalid-argument', 'Escolha ao menos um aluno.');

    const qtd = Math.max(1, Math.min(20, Number(quantidade) || 3));
    const emGrupo = alunosIds.length > 1;
    const prazo = normalizarPrazo(prazoRecebido);

    // Carrega tudo antes de chamar a API: o pedido de cada aluno é o mesmo nos
    // dois modos, então monta uma vez só.
    const preparos = [];
    for (const uid of alunosIds) {
      const { aluno, escola } = await carregarAlunoEEscola(email, uid);

      // Um aluno só: o professor escolheu as pós-aulas na tela.
      // Turma: cada aluno tem a própria pós-aula, então usamos a mais recente dele.
      let ids = emGrupo ? [] : posaulaIds.slice(0, 6);
      if (!ids.length) {
        const recentes = await db
          .collection(`students/${uid}/posaulas`)
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get();
        ids = recentes.docs.map((d) => d.id);
      }

      const posaulas = (await Promise.all(ids.map((id) => conteudoDaPosAula(uid, id)))).filter(Boolean);
      if (!posaulas.length) {
        throw new HttpsError('not-found', `${aluno.name || 'O aluno'} não tem pós-aula para servir de base.`);
      }

      const revisao90 = await prepararRevisao90(uid, aluno);
      const todasPosaulas = [...posaulas];
      for (const reviewPost of revisao90?.posaulas || []) {
        if (!todasPosaulas.some((p) => p.id === reviewPost.id)) todasPosaulas.push(reviewPost);
      }
      const revisaoPrompt = revisao90 ? {
        phase: revisao90.phase,
        sourceIndexes: revisao90.posaulas.map((p) => todasPosaulas.findIndex((item) => item.id === p.id) + 1),
      } : null;

      const nome = aluno.name || '';
      const nivel = ((aluno.level || '').match(/\(([^)]+)\)/) || [])[1] || aluno.level || 'A1';

      preparos.push({
        uid,
        nome,
        nivel,
        escolaId: escola.id,
        modoBatch: prazo === 'programado',
        qtdRegular: qtd,
        revisao90: revisao90 ? { phase: revisao90.phase, cycleId: revisao90.cycleId, posaulas: referenciaDasPosaulas(revisao90.posaulas) } : null,
        posaulas: referenciaDasPosaulas(todasPosaulas),
        params: pedidoDeAtividades({ nome, nivel, qtd, observacoes, posaulas: todasPosaulas, revisao90: revisaoPrompt }),
      });
    }

    const blocosCobrados = Math.ceil(qtd / 3) * preparos.length;
    const valorCentavos = PRECOS_CENTAVOS.atividade[prazo] * blocosCobrados;
    const escolaSaldoSnap = await db.doc(`schools/${preparos[0].escolaId}`).get();
    await verificarSaldo(escolaSaldoSnap.data(), valorCentavos);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    // ── Modo batch (opção da escola) ────────────────────────────────────
    // Todas as levas de uma chamada são da mesma escola: basta olhar a primeira.
    if (preparos[0].modoBatch) {
      let batch;
      try {
        batch = await client.messages.batches.create({
          requests: preparos.map((p) => ({ custom_id: p.uid, params: p.params })),
        });
      } catch (erro) {
        console.error('Falha ao enviar o lote para a Batch API:', erro);
        throw new HttpsError('internal', `Não consegui enviar as atividades para processamento: ${erro.message}`);
      }

      let cobranca;
      try {
        cobranca = await debitarSaldo({
          escolaId: preparos[0].escolaId, valorCentavos, tipo: 'atividade', prazo,
          email, descricao: `${preparos.length} leva(s) de atividades programadas`,
          extra: { alunos: preparos.length, blocosCobrados, batchId: batch.id },
        });
      } catch (erro) {
        try { await client.messages.batches.cancel(batch.id); } catch (_) {}
        throw erro;
      }

      await db.doc(`_batchJobs/${batch.id}`).set({
        batchId: batch.id,
        escolaId: preparos[0].escolaId,
        uids: preparos.map((p) => p.uid),
        alunos: preparos.map(({ uid, nome, nivel, posaulas, qtdRegular, revisao90 }) => ({ uid, nome, nivel, posaulas, qtdRegular, revisao90 })),
        quantidade: qtd,
        observacoes: observacoes.trim(),
        emGrupo,
        porEmail: email,
        prazo,
        valorCentavos,
        movimentoSaldoId: cobranca.movimentoId,
        saldoCentavos: cobranca.saldoCentavos,
        status: 'em_preparo',
        criadoEm: FieldValue.serverTimestamp(),
      });

      return {
        ok: true,
        modo: 'batch',
        batchId: batch.id,
        status: 'em_preparo',
        emGrupo,
        alunos: preparos.length,
        valorCentavos,
        saldoCentavos: cobranca.saldoCentavos,
      };
    }

    // ── Modo síncrono (padrão) ──────────────────────────────────────────
    const resultados = [];
    let custoTotal = 0;
    const lote = db.batch();

    for (const { uid, nome, nivel, escolaId, posaulas, qtdRegular, revisao90, params } of preparos) {
      let resposta;
      try {
        const stream = client.messages.stream(params);
        resposta = await stream.finalMessage();
      } catch (erro) {
        console.error(`Falha ao gerar atividades de ${nome}:`, erro);
        throw new HttpsError('internal', `Não consegui gerar as atividades de ${nome}: ${erro.message}`);
      }

      if (resposta.stop_reason === 'max_tokens') {
        throw new HttpsError('internal', `As atividades de ${nome} ficaram longas demais. Tente gerar menos de uma vez.`);
      }

      const blocoTexto = resposta.content.find((b) => b.type === 'text');
      if (!blocoTexto) throw new HttpsError('internal', `A API não devolveu as atividades de ${nome}.`);
      const dados = JSON.parse(blocoTexto.text);

      custoTotal += registrarUso(lote, {
        tipo: 'atividades',
        uid,
        escolaId,
        uso: resposta.usage,
        extra: {
          alunoNome: nome,
          quantidade: dados.activities?.length || 0,
          publicada: false,
          emGrupo,
          modo: 'sincrono',
        },
      });

      resultados.push({
        uid,
        nome,
        nivel,
        week: dados.week,
        activities: marcarAtividadeDeRevisao(dados.activities, qtdRegular, revisao90),
        vocabulario: dados.vocabulario || [],
        posaulas,
      });
    }

    const cobranca = await debitarSaldo({
      escolaId: preparos[0].escolaId, valorCentavos, tipo: 'atividade', prazo,
      email, descricao: `${preparos.length} leva(s) de atividades expressas`,
      extra: { alunos: preparos.length, blocosCobrados },
    });
    await lote.commit();

    return {
      ok: true,
      modo: 'sincrono',
      emGrupo,
      levas: resultados,
      custoUSD: Number(custoTotal.toFixed(4)),
      valorCentavos,
      saldoCentavos: cobranca.saldoCentavos,
    };
  }
);

/** Publica uma leva já cobrada no momento da geração. */
export const publicarAtividades = onCall(
  { ...OPCOES_PADRAO, timeoutSeconds: 300, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { levas = [], batchJobId = null } = request.data || {};
    const lista = Array.isArray(levas)
      ? levas.filter((l) => l?.uid && Array.isArray(l.activities) && l.activities.length)
      : [];
    if (!lista.length) throw new HttpsError('invalid-argument', 'Faltou o aluno ou as atividades.');

    // Todas as levas de uma turma são da mesma escola: basta olhar a primeira.
    const { escola } = await carregarAlunoEEscola(email, lista[0].uid);

    const lote = db.batch();
    const publicadas = [];

    for (const { uid, week, activities, vocabulario = [], nome, posaulas = [] } of lista) {
      const { aluno } = await carregarAlunoEEscola(email, uid);

      for (const act of activities) {
        // De qual pós-aula saiu esta atividade — é o que o botão "Consultar
        // pós-aula" do aluno usa. Índice ruim cai na primeira, nunca quebra.
        const origem = posaulaDaAtividade(posaulas, act.sourceIndex);

        lote.set(db.collection(`students/${uid}/activities`).doc(), {
          week: week || '',
          title: act.title || '',
          emoji: act.emoji || '📚',
          parts: act.parts || [],
          ...(origem && {
            posaulaId: origem.id || '',
            posaulaUrl: origem.url || '',
            posaulaTitulo: origem.titulo || '',
          }),
          ...(act.review90 && {
            review90: true,
            review90Phase: Number(act.review90Phase || 1),
            review90CycleId: act.review90CycleId || '',
            reviewPosaulas: Array.isArray(act.reviewPosaulas) ? act.reviewPosaulas : [],
          }),
          status: 'pending',
          notified: true,   // a notificação sai aqui mesmo, não pelo cron
          geradaPorIA: true,
          ...(lista.length > 1 && { aulaEmGrupo: true }),
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      // O vocabulário da aula vai junto, na mesma leva.
      for (const v of vocabulario) {
        if (!v?.en || !v?.pt) continue;
        lote.set(db.collection(`students/${uid}/vocabulario`).doc(), {
          en: v.en,
          pt: v.pt,
          source: week || '',
          date: FieldValue.serverTimestamp(),
        });
      }

      publicadas.push({
        uid,
        nome: nome || aluno.name || '',
        atividades: activities.length,
        palavras: vocabulario.filter((v) => v?.en && v?.pt).length,
        fcmToken: aluno.fcmToken || null,
      });
    }

    // Leva vinda de um job em batch: marca o job para não ser publicado
    // (e cobrado) duas vezes.
    if (batchJobId) {
      lote.update(db.doc(`_batchJobs/${batchJobId}`), {
        status: 'publicado',
        publicadoEm: FieldValue.serverTimestamp(),
      });
    }

    await lote.commit();

    // Notifica depois de gravar: falha no push não desfaz a publicação.
    let notificados = 0;
    for (const p of publicadas) {
      if (!p.fcmToken) continue;
      try {
        await getMessaging().send({
          token: p.fcmToken,
          notification: {
            title: 'Novas atividades disponíveis!',
            body: `${p.atividades} atividade${p.atividades !== 1 ? 's' : ''} esperando por você.`,
          },
          webpush: {
            fcmOptions: { link: 'https://cezika-web.github.io/science-english-app/' },
          },
        });
        notificados++;
      } catch (erro) {
        console.error('Push falhou para', p.uid, erro.message);
      }
      delete p.fcmToken;
    }

    return {
      ok: true,
      publicadas,
      alunos: publicadas.length,
      notificados,
      saldoCentavos: escola.plan?.saldoCentavos ?? null,
    };
  }
);

/* ────────────────────────────────────────────────────────────────
   BATCH — conclui as gerações enviadas à Batch API

   Roda como scheduled function do Firebase (e não como cron no GitHub
   Actions, igual ao notify-activities.yml) porque aqui é preciso falar com a
   Anthropic: a ANTHROPIC_API_KEY vive no cofre do Firebase e o SDK já está
   instalado em functions/. Um workflow do GitHub exigiria duplicar a chave
   como secret do repositório e reescrever tudo em Python.
   ──────────────────────────────────────────────────────────────── */

/** Avisa o professor que a leva ficou pronta. Mesmo padrão de push do publicarAtividades. */
async function avisarProfessor(escolaId, alunos) {
  const snap = await db.doc(`schools/${escolaId}`).get();
  const tokens = (snap.exists && snap.data().fcmTokens) || [];
  if (!tokens.length) return 0;

  let enviados = 0;
  for (const token of tokens) {
    try {
      await getMessaging().send({
        token,
        notification: {
          title: 'Suas atividades estão prontas para revisão',
          body: `${alunos} aluno${alunos !== 1 ? 's' : ''} — abra o painel para revisar e publicar.`,
        },
        webpush: {
          fcmOptions: { link: 'https://cezika-web.github.io/science-english-app/admin/' },
        },
      });
      enviados++;
    } catch (erro) {
      console.error('Push do batch falhou para a escola', escolaId, erro.message);
    }
  }
  return enviados;
}

/** Conclui uma geração assíncrona de pós-aula sem publicar nem cobrar novamente. */
async function concluirJobPosAula(client, doc) {
  const job = doc.data();
  let batch;
  try { batch = await client.messages.batches.retrieve(job.batchId); }
  catch (erro) {
    console.error('Não consegui consultar o batch de pós-aula', job.batchId, erro.message);
    return false;
  }
  if (batch.processing_status !== 'ended') return false;

  const porUid = new Map();
  for await (const item of await client.messages.batches.results(job.batchId)) {
    porUid.set(item.custom_id, item.result);
  }

  const lote = db.batch();
  const posaulas = [];
  const falhas = [];
  let custoTotal = 0;
  for (const aluno of job.alunos || []) {
    const resultado = porUid.get(aluno.uid);
    if (!resultado || resultado.type !== 'succeeded') {
      falhas.push(`${aluno.nome || aluno.uid}: ${resultado?.type || 'sem resposta'}`);
      continue;
    }
    const resposta = resultado.message;
    if (resposta.stop_reason === 'max_tokens') {
      falhas.push(`${aluno.nome || aluno.uid}: a resposta ficou longa demais e foi cortada.`);
      continue;
    }
    const bloco = resposta.content.find((item) => item.type === 'text');
    let html = bloco?.text?.trim() || '';
    const cercado = html.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/);
    if (cercado) html = cercado[1].trim();
    html = garantirAudioPosAula(html);
    if (!html.toLowerCase().startsWith('<!doctype html')) {
      falhas.push(`${aluno.nome || aluno.uid}: resposta em formato inesperado.`);
      continue;
    }
    const tituloMatch = html.match(/<h1>([\s\S]*?)<\/h1>/i);
    const tituloBruto = tituloMatch ? tituloMatch[1].replace(/<[^>]*>/g, '').trim() : '';
    const titulo = tituloPosAulaComData(job.data, tituloBruto);
    posaulas.push({ uid: aluno.uid, nome: aluno.nome || '', html, titulo, talkTime: extrairTalkTime(html) });
    custoTotal += registrarUso(lote, {
      tipo: 'posaula', uid: aluno.uid, escolaId: job.escolaId, uso: resposta.usage, fator: 0.5,
      extra: { alunoNome: aluno.nome || '', publicada: false, emGrupo: !!job.emGrupo, modo: 'batch', batchId: job.batchId },
    });
  }

  if (!posaulas.length) {
    lote.update(doc.ref, {
      status: 'erro', etapa: 'erro', erro: falhas.join(' · ') || 'A geração terminou sem resultados.',
      creditoProfessorDebitado: false, concluidoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    });
    await lote.commit();
    if (job.movimentoSaldoId && !job.saldoEstornado) {
      await estornarSaldo({
        escolaId: job.escolaId, valorCentavos: job.valorCentavos,
        tipo: 'posaula', prazo: 'programado', email: job.porEmail,
        movimentoId: job.movimentoSaldoId, motivo: 'Falha na geração programada',
      });
      await doc.ref.set({ saldoEstornado: true }, { merge: true });
    }
    return true;
  }
  if (Buffer.byteLength(JSON.stringify(posaulas), 'utf8') > 900_000) {
    lote.update(doc.ref, {
      status: 'erro', etapa: 'erro', erro: 'O resultado ficou grande demais para ser guardado. Gere menos alunos por vez.',
      creditoProfessorDebitado: false, concluidoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
    });
    await lote.commit();
    return true;
  }

  // Evita que um cancelamento feito enquanto os resultados eram lidos seja sobrescrito.
  const atual = await doc.ref.get();
  if (!atual.exists || atual.data().status !== 'gerando') return true;

  const draftRef = db.collection('_posaulaDrafts').doc();
  lote.set(draftRef, {
    escolaId: job.escolaId, porEmail: job.porEmail, uids: posaulas.map((p) => p.uid),
    revisaoUsada: false, statusRevisao: 'disponivel', criadoEm: FieldValue.serverTimestamp(),
  });
  lote.update(doc.ref, {
    status: 'pronto', etapa: 'pronto', posaulas, draftId: draftRef.id,
    custoUSD: Number(custoTotal.toFixed(4)), prontoVisto: false, creditoProfessorDebitado: false,
    ...(falhas.length && { avisos: falhas }), concluidoEm: FieldValue.serverTimestamp(), atualizadoEm: FieldValue.serverTimestamp(),
  });
  await lote.commit();
  return true;
}

export const concluirPosAulasEmBatch = onSchedule(
  {
    region: 'southamerica-east1', schedule: 'every 1 minutes', timeZone: 'America/Sao_Paulo',
    secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 540, memory: '512MiB',
  },
  async () => {
    const pendentes = await db.collection('_posaulaJobs').where('status', '==', 'gerando').limit(20).get();
    if (pendentes.empty) return;
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let concluidos = 0;
    for (const doc of pendentes.docs) {
      try { if (await concluirJobPosAula(client, doc)) concluidos++; }
      catch (erro) { console.error('Falha ao concluir pós-aula', doc.id, erro); }
    }
    console.log(`Pós-aulas em batch: ${pendentes.size} pendente(s), ${concluidos} concluído(s).`);
  }
);

/** Lê um job pendente na Anthropic e, se terminou, grava o resultado. */
async function concluirJob(client, doc) {
  const job = doc.data();

  let batch;
  try {
    batch = await client.messages.batches.retrieve(job.batchId);
  } catch (erro) {
    console.error('Não consegui consultar o batch', job.batchId, erro.message);
    return false;
  }

  if (batch.processing_status !== 'ended') return false;

  // Os resultados voltam fora de ordem — indexa por custom_id (o uid).
  const porUid = new Map();
  for await (const item of await client.messages.batches.results(job.batchId)) {
    porUid.set(item.custom_id, item.result);
  }

  const lote = db.batch();
  const levas = [];
  const falhas = [];
  let custoTotal = 0;

  for (const aluno of job.alunos || []) {
    const resultado = porUid.get(aluno.uid);

    if (!resultado || resultado.type !== 'succeeded') {
      falhas.push(`${aluno.nome || aluno.uid}: ${resultado?.type || 'sem resposta'}`);
      continue;
    }

    const resposta = resultado.message;
    if (resposta.stop_reason === 'max_tokens') {
      falhas.push(`${aluno.nome || aluno.uid}: a resposta ficou longa demais e foi cortada.`);
      continue;
    }

    const blocoTexto = resposta.content.find((b) => b.type === 'text');
    if (!blocoTexto) {
      falhas.push(`${aluno.nome || aluno.uid}: a API não devolveu as atividades.`);
      continue;
    }

    let dados;
    try {
      dados = JSON.parse(blocoTexto.text);
    } catch (erro) {
      falhas.push(`${aluno.nome || aluno.uid}: resposta em formato inesperado.`);
      continue;
    }

    // O custo continua medido — é o que mostra a economia do batch.
    custoTotal += registrarUso(lote, {
      tipo: 'atividades',
      uid: aluno.uid,
      escolaId: job.escolaId,
      uso: resposta.usage,
      fator: 0.5,
      extra: {
        alunoNome: aluno.nome || '',
        quantidade: dados.activities?.length || 0,
        publicada: false,
        emGrupo: !!job.emGrupo,
        modo: 'batch',
        batchId: job.batchId,
      },
    });

    levas.push({
      uid: aluno.uid,
      nome: aluno.nome || '',
      nivel: aluno.nivel || '',
      week: dados.week,
      activities: marcarAtividadeDeRevisao(dados.activities, Number(aluno.qtdRegular || job.quantidade || 0), aluno.revisao90 || null),
      vocabulario: dados.vocabulario || [],
      posaulas: aluno.posaulas || [],
    });
  }

  // Nenhuma leva saiu: devolve automaticamente o saldo reservado.
  if (!levas.length) {
    lote.update(doc.ref, {
      status: 'erro',
      erro: falhas.join(' · ') || 'O batch terminou sem resultados.',
      concluidoEm: FieldValue.serverTimestamp(),
    });
    await lote.commit();
    if (job.movimentoSaldoId && !job.saldoEstornado) {
      await estornarSaldo({
        escolaId: job.escolaId, valorCentavos: job.valorCentavos,
        tipo: 'atividade', prazo: 'programado', email: job.porEmail,
        movimentoId: job.movimentoSaldoId, motivo: 'Falha na geração programada',
      });
      await doc.ref.set({ saldoEstornado: true }, { merge: true });
    }
    return true;
  }

  // O resultado inteiro vai no doc do job, e doc do Firestore tem 1 MB. Uma
  // leva normal tem poucos KB, mas uma turma grande com muitas atividades
  // pode estourar — melhor avisar do que falhar sem explicação na gravação.
  if (Buffer.byteLength(JSON.stringify(levas), 'utf8') > 900_000) {
    lote.update(doc.ref, {
      status: 'erro',
      erro: 'O resultado ficou grande demais para ser guardado. Gere menos atividades ou menos alunos por vez.',
      concluidoEm: FieldValue.serverTimestamp(),
    });
    await lote.commit();
    if (job.movimentoSaldoId && !job.saldoEstornado) {
      await estornarSaldo({
        escolaId: job.escolaId, valorCentavos: job.valorCentavos,
        tipo: 'atividade', prazo: 'programado', email: job.porEmail,
        movimentoId: job.movimentoSaldoId, motivo: 'Resultado excedeu o limite de armazenamento',
      });
      await doc.ref.set({ saldoEstornado: true }, { merge: true });
    }
    return true;
  }

  lote.update(doc.ref, {
    status: 'pronto',
    levas,
    custoUSD: Number(custoTotal.toFixed(4)),
    ...(falhas.length && { avisos: falhas }),
    concluidoEm: FieldValue.serverTimestamp(),
  });
  await lote.commit();

  await avisarProfessor(job.escolaId, levas.length);
  return true;
}

export const concluirAtividadesEmBatch = onSchedule(
  {
    region: 'southamerica-east1',
    schedule: 'every 5 minutes',
    timeZone: 'America/Sao_Paulo',
    secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 540,
    memory: '512MiB',
  },
  async () => {
    const pendentes = await db
      .collection('_batchJobs')
      .where('status', '==', 'em_preparo')
      .limit(20)
      .get();

    if (pendentes.empty) return;

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    let concluidos = 0;

    for (const doc of pendentes.docs) {
      try {
        if (await concluirJob(client, doc)) concluidos++;
      } catch (erro) {
        console.error('Falha ao concluir o job', doc.id, erro);
      }
    }

    console.log(`Batch: ${pendentes.size} pendente(s), ${concluidos} concluído(s).`);
  }
);

async function concluirCorrecaoProgramada(client, doc) {
  const job = doc.data();
  const batch = await client.messages.batches.retrieve(job.batchId);
  if (batch.processing_status !== 'ended') return false;

  let resultado = null;
  for await (const item of await client.messages.batches.results(job.batchId)) {
    if (item.custom_id === job.uid) resultado = item.result;
  }

  const falhar = async (mensagem) => {
    await doc.ref.set({ status: 'erro', erro: mensagem, concluidoEm: FieldValue.serverTimestamp() }, { merge: true });
    if (job.movimentoSaldoId && !job.saldoEstornado) {
      await estornarSaldo({
        escolaId: job.escolaId, valorCentavos: job.valorCentavos,
        tipo: 'correcao', prazo: 'programado', email: job.porEmail,
        movimentoId: job.movimentoSaldoId, motivo: mensagem,
      });
      await doc.ref.set({ saldoEstornado: true }, { merge: true });
    }
    return true;
  };

  if (!resultado || resultado.type !== 'succeeded') return falhar('A correção programada não foi concluída pela IA.');
  const resposta = resultado.message;
  if (resposta.stop_reason === 'max_tokens') return falhar('A correção programada ficou longa demais.');
  const texto = resposta.content.find(b => b.type === 'text')?.text;
  if (!texto) return falhar('A API não devolveu a correção programada.');

  let dados;
  try { dados = JSON.parse(texto); }
  catch (_) { return falhar('A correção programada voltou em formato inesperado.'); }

  const permitidos = new Set(job.activityIds || []);
  const lote = db.batch();
  let gravadas = 0;
  for (const item of dados.atividades || []) {
    if (!permitidos.has(item.activityId)) continue;
    lote.update(db.doc(`students/${job.uid}/activities/${item.activityId}`), {
      status: 'corrected', summary: item.summary, report: item.report,
      patterns: dados.patterns, pedagogico: dados.pedagogico,
      feedback: listaParaObjeto(item.feedback, f => ({ comment: f.comment, score: f.score })),
      correcao: listaParaObjeto(item.correcao, c => c.itens.map(i => i.status === 'ok'
        ? { status: 'ok' }
        : { status: i.status, correct: i.correct, explain: i.explain })),
      correctedAt: FieldValue.serverTimestamp(), corrigidoPorIA: true,
    });
    gravadas++;
  }
  if (!gravadas) return falhar('A correção programada não correspondeu às atividades enviadas.');

  const custoUSD = registrarUso(lote, {
    tipo: 'correcao', uid: job.uid, escolaId: job.escolaId,
    uso: resposta.usage, fator: 0.5,
    extra: { alunoNome: job.alunoNome || '', atividades: gravadas, modo: 'batch', batchId: job.batchId },
  });
  lote.update(doc.ref, {
    status: 'pronto', atividadesCorrigidas: gravadas, custoUSD,
    concluidoEm: FieldValue.serverTimestamp(),
  });
  await lote.commit();
  return true;
}

export const concluirCorrecoesEmBatch = onSchedule(
  {
    region: 'southamerica-east1', schedule: 'every 5 minutes',
    timeZone: 'America/Sao_Paulo', secrets: [ANTHROPIC_API_KEY],
    timeoutSeconds: 540, memory: '512MiB',
  },
  async () => {
    const pendentes = await db.collection('_correcaoJobs').where('status', '==', 'em_preparo').limit(20).get();
    if (pendentes.empty) return;
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    for (const doc of pendentes.docs) {
      try { await concluirCorrecaoProgramada(client, doc); }
      catch (erro) { console.error('Falha ao concluir correção programada', doc.id, erro); }
    }
  }
);

/* ────────────────────────────────────────────────────────────────
   SALDO — só o administrador ajusta a carteira de uma escola
   ──────────────────────────────────────────────────────────────── */
const challengeFunctions = createChallengeFunctions({
  db, getMessaging, adminEmails:ADMIN_EMAILS,
  anthropicApiKey:ANTHROPIC_API_KEY, Anthropic, model:MODEL,
  loadPostLesson:conteudoDaPosAula, registrarUso,
});
export const publicarDesafioSemanal = challengeFunctions.publicarDesafioSemanal;
export const publicarDesafiosPersonalizadosManuais = challengeFunctions.publicarDesafiosPersonalizadosManuais;
export const gerarDesafiosPersonalizados = challengeFunctions.gerarDesafiosPersonalizados;
export const obterDesafioSemanal = challengeFunctions.obterDesafioSemanal;
export const iniciarDesafioSemanal = challengeFunctions.iniciarDesafioSemanal;
export const salvarRespostaDesafio = challengeFunctions.salvarRespostaDesafio;
export const obterStatusDesafioAdmin = challengeFunctions.obterStatusDesafioAdmin;
export const finalizarDesafioSemanal = challengeFunctions.finalizarDesafioSemanal;
export const notificarAberturaDesafio = challengeFunctions.notificarAberturaDesafio;
export const lembrarDesafioManha = challengeFunctions.lembrarDesafioManha;
export const lembrarDesafioNoite = challengeFunctions.lembrarDesafioNoite;
export const gerarDesafiosAtrasados = challengeFunctions.gerarDesafiosAtrasados;
export const gerarDesafioDaSemana = challengeFunctions.gerarDesafioDaSemana;
export const gerarDesafioDaTurma = challengeFunctions.gerarDesafioDaTurma;
export const aceitarRespostaDesafio = challengeFunctions.aceitarRespostaDesafio;
export const ajustarPontuacaoRespostaDesafio = challengeFunctions.ajustarPontuacaoRespostaDesafio;
export const obterPerguntasDesafio = challengeFunctions.obterPerguntasDesafio;
export const reabrirDesafioAluno = challengeFunctions.reabrirDesafioAluno;
export const regerarPerguntaDesafio = challengeFunctions.regerarPerguntaDesafio;
export const obterTemporadaDesafio = challengeFunctions.obterTemporadaDesafio;
export const obterResultadoDesafioAdmin = challengeFunctions.obterResultadoDesafioAdmin;
export const recalcularPontuacaoDesafio = challengeFunctions.recalcularPontuacaoDesafio;
export const premiarCampeoesSemanais = challengeFunctions.premiarCampeoesSemanais;
export const concederSelosDesafio = challengeFunctions.concederSelosDesafio;
export const marcarSelosDesafioVistos = challengeFunctions.marcarSelosDesafioVistos;

const cobrancaFunctions = createCobrancaFunctions({ db, adminEmails:ADMIN_EMAILS });
export const avisarAtrasoNoApp = cobrancaFunctions.avisarAtrasoNoApp;
export const enviarCobrancaManual = cobrancaFunctions.enviarCobrancaManual;

export const ajustarCreditos = onCall(
  { ...OPCOES_PADRAO, timeoutSeconds: 60, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Somente o administrador ajusta saldo.');
    }

    const { escolaId, valorReais = 0, motivo = '' } = request.data || {};
    if (!escolaId) throw new HttpsError('invalid-argument', 'Faltou a escola.');

    const valorCentavos = Math.round(Number(valorReais) * 100);
    if (!Number.isFinite(valorCentavos) || valorCentavos === 0) {
      throw new HttpsError('invalid-argument', 'Informe o valor da recarga.');
    }

    const ref = db.doc(`schools/${escolaId}`);
    const movRef = db.collection('_saldoMovimentos').doc();
    let saldoCentavos;
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new HttpsError('not-found', 'Escola não encontrada.');
      const atual = snap.data().plan?.saldoCentavos;
      saldoCentavos = (typeof atual === 'number' ? atual : 0) + valorCentavos;
      if (saldoCentavos < 0) throw new HttpsError('failed-precondition', 'O ajuste deixaria o saldo negativo.');
      tx.update(ref, { 'plan.saldoCentavos': saldoCentavos });
      tx.set(movRef, {
        escolaId, tipo: valorCentavos > 0 ? 'recarga' : 'ajuste',
        valorCentavos, saldoDepoisCentavos: saldoCentavos,
        motivo, porEmail: email, criadoEm: FieldValue.serverTimestamp(),
      });
    });

    return { ok: true, saldoCentavos };
  }
);
