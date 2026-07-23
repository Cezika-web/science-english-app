import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import Anthropic from '@anthropic-ai/sdk';
import { montarTemplate, REGRAS_POS_AULA } from './posaula.js';
import { REGRAS_ATIVIDADES, SCHEMA_ATIVIDADES, textoDaPosAula } from './atividades.js';

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

Questões em branco não contam como acerto nem como erro — entram em
"Não respondidas". Marque-as com status "ok" no campo "correcao" (o app não
pinta de vermelho o que o aluno não chegou a fazer).

## O que NÃO é erro

Em exercícios de lacuna (completar, arrastar, múltipla escolha), o aluno copia a
palavra de um quadro, onde ela aparece fora do contexto da frase. Nesses casos,
só o conteúdo da palavra importa. NÃO marque erro por:

- maiúscula ou minúscula ("good" quando a frase pediria "Good")
- ponto final, vírgula ou aspas ao redor
- espaço a mais ou a menos

Se a palavra escolhida está certa, é "ok" — sem ressalva no comentário.

Em texto livre (escrever uma frase ou parágrafo do zero), aí sim maiúscula no
começo da frase e pontuação contam como erro bobo.

## Consistência obrigatória

O status de cada questão, o placar e o texto do relatório precisam concordar.
Se uma questão está marcada "ok", ela conta como acerto no "summary" e NÃO pode
aparecer como ressalva no comentário. Nunca escreva "só ajuste X" sobre uma
questão que você marcou como correta.

## Atividades incompletas

Quando "finalizadaPeloAluno" for false, o aluno parou no meio — muitas vezes
porque a aula acabou. Corrija normalmente o que ele fez e NÃO o repreenda pelo
que ficou em branco. A porcentagem de acertos deve considerar apenas o que ele
respondeu; o que ficou em branco aparece só em "Não respondidas". No comentário
geral, reconheça o que ele fez e convide a terminar o resto.

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
                      status: { type: 'string', enum: ['ok', 'bobo', 'mediano', 'grave'] },
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

/** Registra o consumo da API para acompanhar a margem real. */
function registrarUso(lote, { tipo, uid, escolaId, uso, extra = {} }) {
  const custoUSD =
    ((uso.input_tokens || 0) * PRECO_ENTRADA +
      (uso.output_tokens || 0) * PRECO_SAIDA +
      (uso.cache_read_input_tokens || 0) * PRECO_CACHE) /
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

/** O aluno respondeu ao menos uma coisa? (áudio conta) */
function temAlgumaResposta(atividade) {
  const respostas = atividade.respostas || {};
  if (respostas.audioUrl) return true;
  return Object.keys(respostas).some(
    (chave) =>
      chave !== 'audioUrl' &&
      chave !== 'audioPath' &&
      String(respostas[chave] ?? '').trim() !== ''
  );
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
    if (!email || !ADMIN_EMAILS.includes(email)) {
      throw new HttpsError('permission-denied', 'Somente o administrador pode corrigir.');
    }

    const uid = request.data?.uid;
    if (!uid) throw new HttpsError('invalid-argument', 'Faltou o uid do aluno.');

    // Por padrão só corrige o que o aluno finalizou. Quando ligado, inclui também
    // as atividades que ele deixou pela metade (desde que tenha respondido algo).
    const incluirNaoFinalizadas = request.data?.incluirNaoFinalizadas === true;

    const alunoSnap = await db.doc(`students/${uid}`).get();
    if (!alunoSnap.exists) throw new HttpsError('not-found', 'Aluno não encontrado.');
    const aluno = alunoSnap.data();

    const atividadesSnap = await db.collection(`students/${uid}/activities`).get();
    const paraCorrigir = atividadesSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((a) => {
        if (a.status === 'corrected') return false;
        if (a.finalizada) return true;
        return incluirNaoFinalizadas && temAlgumaResposta(a);
      });

    if (paraCorrigir.length === 0) {
      return { ok: false, motivo: 'Nenhuma atividade aguardando correção.' };
    }

    const entrada = paraCorrigir.map((a) => ({
      activityId: a.id,
      week: a.week || '',
      title: a.title || '',
      finalizadaPeloAluno: !!a.finalizada,
      parts: a.parts || [],
      respostasDoAluno: a.respostas || {},
    }));

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let resposta;
    try {
      // Streaming: um aluno com várias atividades gera um relatório longo, e sem
      // stream a requisição estoura o tempo limite antes de terminar.
      const stream = client.messages.stream({
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
      });
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

    await lote.commit();

    return {
      ok: true,
      atividadesCorrigidas: gravadas,
      custoUSD: Number(custoUSD.toFixed(4)),
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

    const { uids = [], transcricao, youtubeUrl = '', data } = request.data || {};
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

    const nomes = turma.map((t) => t.aluno.name || '').filter(Boolean);
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const resultados = [];
    let custoTotal = 0;
    const lote = db.batch();

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

      resultados.push({ uid, nome: aluno.name || '', html, titulo });
    }

    await lote.commit();

    return {
      ok: true,
      emGrupo,
      data: dataAula,
      posaulas: resultados,
      custoUSD: Number(custoTotal.toFixed(4)),
    };
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

    const { posaulas = [], data } = request.data || {};
    const lista = Array.isArray(posaulas) ? posaulas.filter((p) => p?.uid && p?.html) : [];
    if (!lista.length) throw new HttpsError('invalid-argument', 'Faltou o conteúdo para publicar.');

    for (const p of lista) {
      if (!String(p.html).toLowerCase().startsWith('<!doctype html')) {
        throw new HttpsError('invalid-argument', `Conteúdo inválido na pós-aula de ${p.nome || p.uid}.`);
      }
    }

    const publicadas = [];
    for (const { uid, html, titulo, nome } of lista) {
      const { aluno } = await carregarAlunoEEscola(email, uid);

      const doc = await db.collection(`students/${uid}/posaulas`).add({
        title: titulo || `Pós-aula ${data || ''}`.trim(),
        html,
        createdAt: FieldValue.serverTimestamp(),
        readAt: null,
        geradaPorIA: true,
        ...(lista.length > 1 && { aulaEmGrupo: true }),
      });

      // Falha no push não invalida a publicação — a pós-aula já está lá.
      let notificado = false;
      if (aluno.fcmToken) {
        try {
          await getMessaging().send({
            token: aluno.fcmToken,
            notification: {
              title: 'Nova pós-aula disponível!',
              body: titulo || 'Sua pós-aula já está no app.',
            },
            webpush: {
              fcmOptions: { link: 'https://cezika-web.github.io/science-english-app/' },
            },
          });
          notificado = true;
        } catch (erro) {
          console.error('Push falhou para', uid, erro.message);
        }
      }

      publicadas.push({ uid, nome: nome || aluno.name || '', posaulaId: doc.id, notificado });
    }

    return {
      ok: true,
      publicadas,
      total: publicadas.length,
      notificados: publicadas.filter((p) => p.notificado).length,
    };
  }
);

/* ────────────────────────────────────────────────────────────────
   ATIVIDADES — gerar a partir das pós-aulas e publicar
   ──────────────────────────────────────────────────────────────── */

/** Pega o conteúdo de uma pós-aula, venha ela do banco ou de um arquivo. */
async function conteudoDaPosAula(uid, posaulaId) {
  const snap = await db.doc(`students/${uid}/posaulas/${posaulaId}`).get();
  if (!snap.exists) return null;
  const p = snap.data();

  if (p.html) return { titulo: p.title || '', texto: textoDaPosAula(p.html) };

  if (p.url) {
    try {
      const r = await fetch(p.url);
      if (!r.ok) return null;
      return { titulo: p.title || '', texto: textoDaPosAula(await r.text()) };
    } catch (e) {
      console.error('Não consegui ler a pós-aula', p.url, e.message);
      return null;
    }
  }
  return null;
}

/**
 * Gera as atividades a partir das pós-aulas escolhidas. NÃO publica —
 * o professor confere a prévia antes. Gerar de novo não consome crédito.
 */
export const gerarAtividades = onCall(
  { ...OPCOES_PADRAO, secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 3600, memory: '512MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { uids = [], posaulaIds = [], quantidade = 3, observacoes = '' } = request.data || {};
    const alunosIds = Array.isArray(uids) ? uids.filter(Boolean).slice(0, 12) : [];
    if (!alunosIds.length) throw new HttpsError('invalid-argument', 'Escolha ao menos um aluno.');

    const qtd = Math.max(1, Math.min(20, Number(quantidade) || 3));
    const emGrupo = alunosIds.length > 1;

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
    const resultados = [];
    let custoTotal = 0;
    const lote = db.batch();

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

      const nivel = ((aluno.level || '').match(/\(([^)]+)\)/) || [])[1] || aluno.level || 'A1';

      let resposta;
      try {
        const stream = client.messages.stream({
          model: MODEL,
          max_tokens: 32000,
          system: [
            { type: 'text', text: REGRAS_ATIVIDADES, cache_control: { type: 'ephemeral' } },
          ],
          output_config: { format: { type: 'json_schema', schema: SCHEMA_ATIVIDADES } },
          messages: [
            {
              role: 'user',
              content:
                `Aluno: ${aluno.name || ''} — nível ${nivel}\n` +
                `Quantidade de atividades a gerar: ${qtd}\n` +
                (observacoes.trim() ? `\nObservações do professor (prioridade sobre o padrão):\n${observacoes.trim()}\n` : '') +
                `\nCONTEÚDO DAS PÓS-AULAS:\n\n` +
                posaulas.map((p, i) => `── Pós-aula ${i + 1}: ${p.titulo} ──\n${p.texto}`).join('\n\n'),
            },
          ],
        });
        resposta = await stream.finalMessage();
      } catch (erro) {
        console.error(`Falha ao gerar atividades de ${aluno.name}:`, erro);
        throw new HttpsError('internal', `Não consegui gerar as atividades de ${aluno.name}: ${erro.message}`);
      }

      if (resposta.stop_reason === 'max_tokens') {
        throw new HttpsError('internal', `As atividades de ${aluno.name} ficaram longas demais. Tente gerar menos de uma vez.`);
      }

      const blocoTexto = resposta.content.find((b) => b.type === 'text');
      if (!blocoTexto) throw new HttpsError('internal', `A API não devolveu as atividades de ${aluno.name}.`);
      const dados = JSON.parse(blocoTexto.text);

      custoTotal += registrarUso(lote, {
        tipo: 'atividades',
        uid,
        escolaId: escola.id,
        uso: resposta.usage,
        extra: {
          alunoNome: aluno.name || '',
          quantidade: dados.activities?.length || 0,
          publicada: false,
          emGrupo,
        },
      });

      resultados.push({
        uid,
        nome: aluno.name || '',
        nivel,
        week: dados.week,
        activities: dados.activities,
        vocabulario: dados.vocabulario || [],
      });
    }

    await lote.commit();

    return {
      ok: true,
      emGrupo,
      levas: resultados,
      custoUSD: Number(custoTotal.toFixed(4)),
    };
  }
);

/**
 * Publica a leva de atividades e desconta UM crédito — independente de
 * quantas atividades tem a leva.
 */
export const publicarAtividades = onCall(
  { ...OPCOES_PADRAO, timeoutSeconds: 300, memory: '256MiB' },
  async (request) => {
    const email = request.auth?.token?.email;
    if (!email) throw new HttpsError('unauthenticated', 'Faça login para continuar.');

    const { levas = [] } = request.data || {};
    const lista = Array.isArray(levas)
      ? levas.filter((l) => l?.uid && Array.isArray(l.activities) && l.activities.length)
      : [];
    if (!lista.length) throw new HttpsError('invalid-argument', 'Faltou o aluno ou as atividades.');

    // Todas as levas de uma turma são da mesma escola: basta olhar a primeira.
    const { escola } = await carregarAlunoEEscola(email, lista[0].uid);

    // Um crédito por aluno que recebe material — numa turma de 3, são 3.
    const creditos = escola.plan?.creditosAtividade;
    const controlaCredito = typeof creditos === 'number';
    if (controlaCredito && creditos < lista.length) {
      throw new HttpsError(
        'failed-precondition',
        `Você tem ${creditos} crédito(s) e precisa de ${lista.length} para esta turma. Fale com o administrador para recarregar.`
      );
    }

    const lote = db.batch();
    const publicadas = [];

    for (const { uid, week, activities, vocabulario = [], nome } of lista) {
      const { aluno } = await carregarAlunoEEscola(email, uid);

      for (const act of activities) {
        lote.set(db.collection(`students/${uid}/activities`).doc(), {
          week: week || '',
          title: act.title || '',
          emoji: act.emoji || '📚',
          parts: act.parts || [],
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

      lote.set(db.collection('_creditos').doc(), {
        escolaId: escola.id,
        tipo: 'atividade',
        quantidade: 1,
        atividadesNaLeva: activities.length,
        uid,
        alunoNome: nome || aluno.name || '',
        porEmail: email,
        criadoEm: FieldValue.serverTimestamp(),
      });

      publicadas.push({
        uid,
        nome: nome || aluno.name || '',
        atividades: activities.length,
        palavras: vocabulario.filter((v) => v?.en && v?.pt).length,
        fcmToken: aluno.fcmToken || null,
      });
    }

    if (controlaCredito) {
      lote.update(db.doc(`schools/${escola.id}`), {
        'plan.creditosAtividade': FieldValue.increment(-lista.length),
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
      creditosUsados: lista.length,
      creditosRestantes: controlaCredito ? creditos - lista.length : null,
    };
  }
);
