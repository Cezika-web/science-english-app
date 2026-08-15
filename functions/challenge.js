import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';

const REGION = 'southamerica-east1';
const TIME_ZONE = 'America/Sao_Paulo';
const LAUNCH_WEEK = '2026-08-17';
const APP_URL = 'https://cezika-web.github.io/science-english-app/?challenge=1';
const LOOKBACK_DAYS = 90;

const PERSONALIZED_CHALLENGE_SCHEMA = {
  type:'object', additionalProperties:false,
  required:['analysis','part1','part2'],
  properties:{
    analysis:{
      type:'object', additionalProperties:false, required:['weakPoints','strongPoints'],
      properties:{
        weakPoints:{ type:'array', minItems:3, maxItems:6, items:{ type:'string' } },
        strongPoints:{ type:'array', minItems:2, maxItems:6, items:{ type:'string' } },
      },
    },
    part1:{ type:'array', minItems:5, maxItems:5, items:{ $ref:'#/$defs/question' } },
    part2:{ type:'array', minItems:5, maxItems:5, items:{ $ref:'#/$defs/question' } },
  },
  $defs:{ question:{
    type:'object', additionalProperties:false,
    required:['id','prompt','context','hint','focus','topic','options','correctOption','expected','explanation'],
    properties:{
      id:{ type:'string' }, prompt:{ type:'string' }, context:{ type:'string' }, hint:{ type:'string' },
      focus:{ type:'string', enum:['weak','strong'] }, topic:{ type:'string' },
      options:{ type:'array', minItems:4, maxItems:4, items:{
        type:'object', additionalProperties:false, required:['id','text'],
        properties:{ id:{ type:'string', enum:['a','b','c','d'] }, text:{ type:'string' } },
      } },
      correctOption:{ type:'string', enum:['a','b','c','d'] }, expected:{ type:'string' }, explanation:{ type:'string' },
    },
  } },
};

function localDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone:TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit', weekday:'short',
  }).formatToParts(date).reduce((result, item) => ({ ...result, [item.type]:item.value }), {});
  return { date:`${parts.year}-${parts.month}-${parts.day}`, weekday:parts.weekday };
}

function addDays(dateKey, days) {
  const value = new Date(`${dateKey}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function weekKeyFor(date = new Date()) {
  const local = localDateParts(date);
  const weekday = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }[local.weekday];
  const daysSinceMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = addDays(local.date, -daysSinceMonday);
  return monday < LAUNCH_WEEK ? LAUNCH_WEEK : monday;
}

function scheduleFor(weekKey) {
  const thu = addDays(weekKey, 3);
  const sun = addDays(weekKey, 6);
  return {
    weekKey,
    startsAt:new Date(`${weekKey}T00:00:00-03:00`),
    part1:{
      roundId:`${weekKey}-part-1`, part:1,
      opensAt:new Date(`${weekKey}T00:00:00-03:00`),
      closesAt:new Date(`${addDays(weekKey, 2)}T23:59:59.999-03:00`),
    },
    part2:{
      roundId:`${weekKey}-part-2`, part:2,
      opensAt:new Date(`${thu}T00:00:00-03:00`),
      closesAt:new Date(`${addDays(weekKey, 5)}T23:59:59.999-03:00`),
    },
    revealAt:new Date(`${sun}T00:00:00-03:00`),
    endsAt:new Date(`${sun}T23:59:59.999-03:00`),
  };
}

function stageFor(now, schedule) {
  const time = now.getTime();
  if (time < schedule.part1.opensAt.getTime()) return { phase:'upcoming', part:null };
  if (time <= schedule.part1.closesAt.getTime()) return { phase:'open', part:1 };
  if (time < schedule.part2.opensAt.getTime()) return { phase:'between', part:2 };
  if (time <= schedule.part2.closesAt.getTime()) return { phase:'open', part:2 };
  if (time < schedule.revealAt.getTime()) return { phase:'calculating', part:null };
  return { phase:'results', part:null };
}

function iso(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizeAnswer(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[“”‘’]/g, "'").replace(/[^a-z0-9']/g, ' ').replace(/\s+/g, ' ').trim();
}

function validateQuestion(question, index) {
  const id = String(question?.id || `q${index + 1}`).trim();
  const prompt = String(question?.prompt || '').trim();
  const context = String(question?.context || '').trim();
  const hint = String(question?.hint || '').trim();
  const type = question?.type === 'text' ? 'text' : 'multipleChoice';
  if (!id || !prompt) throw new HttpsError('invalid-argument', `Pergunta ${index + 1} sem id ou enunciado.`);

  const focus = question?.focus === 'strong' ? 'strong' : question?.focus === 'weak' ? 'weak' : '';
  const topic = String(question?.topic || '').trim();
  const publicQuestion = { id, type, prompt, context, hint };
  const answerKey = {
    id,
    expected:String(question?.expected || '').trim(),
    explanation:String(question?.explanation || '').trim(),
    ...(focus ? { focus } : {}), ...(topic ? { topic } : {}),
  };

  if (type === 'multipleChoice') {
    const options = Array.isArray(question?.options) ? question.options.map((option, optionIndex) => ({
      id:String(option?.id || String.fromCharCode(97 + optionIndex)).trim(),
      text:String(option?.text || '').trim(),
    })) : [];
    if (options.length < 2 || options.some(option => !option.id || !option.text)) {
      throw new HttpsError('invalid-argument', `Pergunta ${index + 1} precisa de pelo menos duas alternativas completas.`);
    }
    const correctOption = String(question?.correctOption || '').trim();
    if (!options.some(option => option.id === correctOption)) {
      throw new HttpsError('invalid-argument', `Pergunta ${index + 1} tem alternativa correta inválida.`);
    }
    publicQuestion.options = options;
    answerKey.correctOption = correctOption;
    if (!answerKey.expected) answerKey.expected = options.find(option => option.id === correctOption)?.text || '';
  } else {
    const acceptedAnswers = (Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers : [question?.expected])
      .map(normalizeAnswer).filter(Boolean);
    if (!acceptedAnswers.length) throw new HttpsError('invalid-argument', `Pergunta ${index + 1} não tem resposta esperada.`);
    answerKey.acceptedAnswers = [...new Set(acceptedAnswers)];
  }
  return { publicQuestion, answerKey };
}

function scoreAnswers(publicQuestions, keys, answers) {
  const answersById = new Map((answers || []).map(answer => [String(answer.questionId), String(answer.value || '')]));
  const keysById = new Map(keys.map(key => [key.id, key]));
  return publicQuestions.map(question => {
    const key = keysById.get(question.id) || {};
    const value = answersById.get(question.id) || '';
    const correct = question.type === 'multipleChoice'
      ? value === key.correctOption
      : (key.acceptedAnswers || []).includes(normalizeAnswer(value));
    const selectedOption = question.options?.find(option => option.id === value)?.text || value;
    return {
      questionId:question.id, prompt:question.prompt, context:question.context || '',
      answer:selectedOption, expected:key.expected || '', explanation:key.explanation || '',
      score:correct ? 100 : 0, correct,
    };
  });
}

function requireAuth(request) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Entre no aplicativo para acessar o desafio.');
  return request.auth.uid;
}

function requireAdmin(request, adminEmails) {
  requireAuth(request);
  if (!adminEmails.includes(request.auth.token?.email || '')) {
    throw new HttpsError('permission-denied', 'Somente a equipe responsável pode publicar o desafio.');
  }
}

function dateFrom(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const brazilian = typeof value === 'string' && value.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  const date = brazilian
    ? new Date(`${brazilian[3]}-${brazilian[2]}-${brazilian[1]}T12:00:00-03:00`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function compact(value, max = 12000) {
  const text = typeof value === 'string' ? value : JSON.stringify(value || {});
  return text.replace(/\s+/g, ' ').trim().slice(0, max);
}

function assertFocusMix(questions, part) {
  const weak = questions.filter(question => question.focus === 'weak').length;
  const strong = questions.filter(question => question.focus === 'strong').length;
  if (weak !== 3 || strong !== 2) {
    throw new Error(`A Parte ${part} precisa ter exatamente 3 perguntas de pontos fracos e 2 de pontos fortes.`);
  }
}

export function createChallengeFunctions({
  db, getMessaging, adminEmails, anthropicApiKey = null, Anthropic = null,
  model = 'claude-sonnet-5', loadPostLesson = null,
}) {
  async function assertStudent(uid) {
    const snap = await db.doc(`students/${uid}`).get();
    if (!snap.exists || snap.data().archived === true || snap.data().challengeEnabled === false) {
      throw new HttpsError('permission-denied', 'O desafio não está ativo para este aluno.');
    }
    return snap;
  }

  async function resolveRound(uid, roundId) {
    const personalSnap = await db.doc(`students/${uid}/challengeRounds/${roundId}`).get();
    if (personalSnap.exists) return { roundSnap:personalSnap, personalized:true };
    const roundSnap = await db.doc(`challengeRounds/${roundId}`).get();
    return { roundSnap, personalized:false };
  }

  async function assertOpenRound(uid, roundId, now = new Date()) {
    const { roundSnap, personalized } = await resolveRound(uid, roundId);
    if (!roundSnap.exists) throw new HttpsError('not-found', 'Esta rodada ainda não foi publicada.');
    const round = roundSnap.data();
    const opensAt = round.opensAt?.toDate?.() || new Date(round.opensAt);
    const closesAt = round.closesAt?.toDate?.() || new Date(round.closesAt);
    if (now < opensAt) throw new HttpsError('failed-precondition', 'Esta rodada ainda não começou.');
    if (now > closesAt) throw new HttpsError('deadline-exceeded', 'O prazo desta rodada terminou.');
    return { roundSnap, round, opensAt, closesAt, personalized };
  }

  const answerKeyRef = (uid, roundId, personalized) => db.doc(
    personalized ? `_challengeAnswerKeys/${roundId}_${uid}` : `_challengeAnswerKeys/${roundId}`
  );

  async function buildRanking(weekKey) {
    const resultSnaps = await db.collection('_challengeResults').where('weekKey', '==', weekKey).get();
    const totals = new Map();
    resultSnaps.docs.forEach(doc => {
      const result = doc.data();
      const current = totals.get(result.uid) || {
        uid:result.uid, name:result.studentName || 'Aluno', score:0, partsCompleted:0,
        completedAt:result.completedAt,
      };
      current.score += Number(result.score || 0);
      current.partsCompleted += 1;
      if ((result.completedAt?.toMillis?.() || Infinity) < (current.completedAt?.toMillis?.() || Infinity)) current.completedAt = result.completedAt;
      totals.set(result.uid, current);
    });
    const rows = [...totals.values()].sort((a,b) => b.score - a.score
      || b.partsCompleted - a.partsCompleted
      || (a.completedAt?.toMillis?.() || Infinity) - (b.completedAt?.toMillis?.() || Infinity)
      || a.name.localeCompare(b.name, 'pt-BR'));
    let lastScore = null, lastParts = null, position = 0;
    const ranking = rows.map((row, index) => {
      if (row.score !== lastScore || row.partsCompleted !== lastParts) position = index + 1;
      lastScore = row.score; lastParts = row.partsCompleted;
      return { uid:row.uid, name:row.name, score:row.score, partsCompleted:row.partsCompleted, position };
    });
    const schedule = scheduleFor(weekKey);
    await db.doc(`challengeRankings/${weekKey}`).set({
      weekKey, ranking, participantCount:ranking.length, revealAt:schedule.revealAt,
      generatedAt:FieldValue.serverTimestamp(),
    }, { merge:true });
    return ranking;
  }

  async function personalizationInput(studentDoc, now = new Date()) {
    const uid = studentDoc.id;
    const cutoff = new Date(now.getTime() - LOOKBACK_DAYS * 86400000);
    const [postSnaps, activitySnaps] = await Promise.all([
      studentDoc.ref.collection('posaulas').get(),
      studentDoc.ref.collection('activities').get(),
    ]);
    const recentPosts = postSnaps.docs.filter(doc => {
      const data = doc.data();
      const date = dateFrom(data.classDate || data.createdAt);
      return date && date >= cutoff && date <= now;
    }).sort((a,b) => dateFrom(a.data().classDate || a.data().createdAt) - dateFrom(b.data().classDate || b.data().createdAt));
    const loadedPosts = await Promise.all(recentPosts.slice(-12).map(async doc => {
      const loaded = loadPostLesson ? await loadPostLesson(uid, doc.id) : null;
      const data = doc.data();
      const raw = loaded?.texto || data.html || data.content || '';
      return {
        id:doc.id, title:loaded?.titulo || data.title || `Pós-aula ${doc.id}`,
        date:iso(data.classDate || data.createdAt), text:compact(raw, 9000),
      };
    }));
    const corrections = activitySnaps.docs.filter(doc => {
      const data = doc.data();
      const date = dateFrom(data.correctedAt || data.updatedAt || data.createdAt);
      return data.status === 'corrected' && date && date >= cutoff && date <= now;
    }).sort((a,b) => {
      const left = dateFrom(a.data().correctedAt || a.data().updatedAt || a.data().createdAt);
      const right = dateFrom(b.data().correctedAt || b.data().updatedAt || b.data().createdAt);
      return left - right;
    }).slice(-20).map(doc => {
      const data = doc.data();
      return {
        title:data.title || '', score:data.score ?? data.nota ?? null,
        summary:compact(data.summary || data.report || '', 2500),
        patterns:compact(data.patterns || data.pedagogico || data.correcao || '', 3500),
      };
    });
    const activityMaterials = activitySnaps.docs.filter(doc => {
      const data = doc.data();
      const date = dateFrom(data.createdAt || data.publishedAt || data.updatedAt || data.correctedAt);
      return !date || (date >= cutoff && date <= now);
    }).slice(-12).map(doc => {
      const data = doc.data();
      return {
        id:doc.id, title:data.title || `Atividade ${doc.id}`,
        date:iso(data.createdAt || data.publishedAt || data.updatedAt || data.correctedAt),
        text:compact({
          instructions:data.instructions || data.instruction || '', parts:data.parts || [],
          respostas:data.respostas || {}, summary:data.summary || '', report:data.report || '',
          patterns:data.patterns || data.pedagogico || data.correcao || '',
        }, 9000),
      };
    }).filter(activity => activity.text && activity.text !== '{}');
    return { uid, posts:loadedPosts.filter(post => post.text), activityMaterials, corrections };
  }

  async function generateForStudent(client, studentDoc, weekKey) {
    const student = studentDoc.data();
    const input = await personalizationInput(studentDoc);
    const isAmorzinho = student.slug === 'amorzinho' || String(student.name || '').toLowerCase() === 'amorzinho';
    const materials = input.posts.length ? input.posts : isAmorzinho ? input.activityMaterials : [];
    const sourceKind = input.posts.length ? 'pós-aulas' : 'atividades recentes da Amorzinho';
    if (!materials.length) throw new Error('Nenhum pós-aula utilizável nos últimos 90 dias.');
    const response = await client.messages.create({
      model, max_tokens:12000,
      system:[{ type:'text', text:
        `Você cria desafios individuais de inglês para o Science English. Use SOMENTE fatos linguísticos, vocabulário e contextos presentes nos ${sourceKind} fornecidos. ` +
        `A dificuldade deve ser HARD em relação ao nível CEFR do aluno${isAmorzinho ? ' e, para a Amorzinho, especialmente exigente' : ''}: exija aplicação, discriminação de nuances e recuperação ativa, sem ensinar conteúdo novo. ` +
        'Use as correções para identificar padrões reais. Quando não houver correções suficientes, trate conteúdos repetidos ou muito explicados como fragilidades prováveis e deixe isso claro apenas na análise. ' +
        'Em CADA parte, produza exatamente 3 perguntas focus=weak e 2 focus=strong. Todas devem ser multiple choice com quatro alternativas plausíveis, uma única resposta inequívoca e explicação pedagógica curta. ' +
        'Não copie exercícios literalmente. Não mencione ao aluno que um item é fraqueza ou força.' }],
      output_config:{ format:{ type:'json_schema', schema:PERSONALIZED_CHALLENGE_SCHEMA } },
      messages:[{ role:'user', content:
        `Aluno: ${student.name || student.firstName || 'Aluno'}\nNível: ${student.level || 'não informado'}\n` +
        `Semana: ${weekKey}\nJanela analisada: últimos ${LOOKBACK_DAYS} dias.\n\n` +
        `MATERIAIS DE ESTUDO (${sourceKind.toUpperCase()}):\n${materials.map((item, i) => `[${i + 1}] ${item.title} (${item.date || 'sem data'})\n${item.text}`).join('\n\n')}\n\n` +
        `CORREÇÕES E DESEMPENHO:\n${input.corrections.length ? JSON.stringify(input.corrections) : 'Sem correções estruturadas suficientes; faça inferência conservadora a partir dos pós-aulas.'}`
      }],
    });
    const text = response.content.find(block => block.type === 'text')?.text;
    if (!text) throw new Error('A IA não devolveu as perguntas.');
    const generated = JSON.parse(text);
    const prepared = [generated.part1, generated.part2].map((questions, partIndex) => {
      if (!Array.isArray(questions) || questions.length !== 5) throw new Error(`Parte ${partIndex + 1} incompleta.`);
      const normalized = questions.map((question, index) => ({
        ...question, id:`p${partIndex + 1}q${index + 1}`, type:'multipleChoice',
      }));
      assertFocusMix(normalized, partIndex + 1);
      const checked = normalized.map(validateQuestion);
      return { questions:checked.map(item => item.publicQuestion), keys:checked.map(item => item.answerKey) };
    });
    return { prepared, analysis:generated.analysis, sourceKind,
      sources:materials.map(item => ({ id:item.id, title:item.title, date:item.date })) };
  }

  const gerarDesafiosPersonalizados = onCall(
    { region:REGION, secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:3600, memory:'1GiB' },
    async request => {
      requireAdmin(request, adminEmails);
      if (!Anthropic || !anthropicApiKey) throw new HttpsError('failed-precondition', 'A geração por IA não foi configurada.');
      const weekKey = String(request.data?.weekKey || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey) || new Date(`${weekKey}T12:00:00Z`).getUTCDay() !== 1) {
        throw new HttpsError('invalid-argument', 'Escolha uma segunda-feira válida.');
      }
      const requestedUids = Array.isArray(request.data?.uids) ? new Set(request.data.uids.map(String)) : null;
      const schoolId = String(request.data?.schoolId || '').trim();
      const allStudents = await db.collection('students').get();
      const students = allStudents.docs.filter(doc => {
        const data = doc.data();
        return data.archived !== true && data.challengeEnabled !== false
          && (!requestedUids || requestedUids.has(doc.id)) && (!schoolId || data.schoolId === schoolId);
      });
      if (!students.length) throw new HttpsError('not-found', 'Nenhum aluno ativo foi encontrado.');
      const schedule = scheduleFor(weekKey);
      const jobRef = db.doc(`_challengeGenerationJobs/${weekKey}`);
      await jobRef.set({ weekKey, status:'running', total:students.length, completed:0, failed:0,
        startedAt:FieldValue.serverTimestamp(), requestedBy:request.auth.token?.email || '' });
      const client = new Anthropic({ apiKey:anthropicApiKey.value() });
      const generated = [], errors = [];
      for (const studentDoc of students) {
        try {
          const output = await generateForStudent(client, studentDoc, weekKey);
          const batch = db.batch();
          [schedule.part1, schedule.part2].forEach((roundSchedule, index) => {
            batch.set(studentDoc.ref.collection('challengeRounds').doc(roundSchedule.roundId), {
              roundId:roundSchedule.roundId, weekKey, part:roundSchedule.part, personalized:true,
              opensAt:roundSchedule.opensAt, closesAt:roundSchedule.closesAt,
              questionCount:5, questions:output.prepared[index].questions,
              difficulty:'hard', lookbackDays:LOOKBACK_DAYS,
              status:'published', updatedAt:FieldValue.serverTimestamp(),
            });
            batch.set(answerKeyRef(studentDoc.id, roundSchedule.roundId, true), {
              uid:studentDoc.id, roundId:roundSchedule.roundId, weekKey, part:roundSchedule.part,
              answers:output.prepared[index].keys, analysis:output.analysis, sources:output.sources,
              sourceKind:output.sourceKind,
              updatedAt:FieldValue.serverTimestamp(),
            });
          });
          await batch.commit();
          generated.push({ uid:studentDoc.id, name:studentDoc.data().name || studentDoc.data().firstName || 'Aluno' });
        } catch (error) {
          console.error(`Desafio personalizado falhou para ${studentDoc.id}:`, error);
          errors.push({ uid:studentDoc.id, name:studentDoc.data().name || 'Aluno', error:error.message });
        }
        await jobRef.set({ completed:generated.length, failed:errors.length, lastUid:studentDoc.id,
          updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      }
      if (generated.length) {
        await db.doc(`challengeWeeks/${weekKey}`).set({
          weekKey, title:'Desafio Science English', active:true, personalized:true,
          startsAt:schedule.startsAt, revealAt:schedule.revealAt, endsAt:schedule.endsAt,
          generatedCount:generated.length, expectedCount:students.length,
          updatedAt:FieldValue.serverTimestamp(), publishedBy:request.auth.token?.email || '',
        }, { merge:true });
      }
      await jobRef.set({ status:errors.length ? (generated.length ? 'partial' : 'failed') : 'completed',
        completed:generated.length, failed:errors.length, errors, finishedAt:FieldValue.serverTimestamp() }, { merge:true });
      return { ok:errors.length === 0, weekKey, total:students.length, generated, errors };
    }
  );

  const publicarDesafioSemanal = onCall(
    { region:REGION, timeoutSeconds:120, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const data = request.data || {};
      const weekKey = String(data.weekKey || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)) throw new HttpsError('invalid-argument', 'Data da segunda-feira inválida.');
      if (new Date(`${weekKey}T12:00:00Z`).getUTCDay() !== 1) throw new HttpsError('invalid-argument', 'A data precisa ser uma segunda-feira.');
      const schedule = scheduleFor(weekKey);
      const parts = [data.part1, data.part2];
      const prepared = parts.map((questions, partIndex) => {
        if (!Array.isArray(questions) || questions.length !== 5) {
          throw new HttpsError('invalid-argument', `A Parte ${partIndex + 1} precisa ter exatamente 5 perguntas.`);
        }
        const checked = questions.map(validateQuestion);
        return {
          questions:checked.map(item => item.publicQuestion),
          keys:checked.map(item => item.answerKey),
        };
      });
      const batch = db.batch();
      batch.set(db.doc(`challengeWeeks/${weekKey}`), {
        weekKey, title:String(data.title || 'Desafio Science English').trim(), active:true,
        startsAt:schedule.startsAt, revealAt:schedule.revealAt, endsAt:schedule.endsAt,
        updatedAt:FieldValue.serverTimestamp(), publishedBy:request.auth.token?.email || '',
      }, { merge:true });
      [schedule.part1, schedule.part2].forEach((roundSchedule, index) => {
        batch.set(db.doc(`challengeRounds/${roundSchedule.roundId}`), {
          roundId:roundSchedule.roundId, weekKey, part:roundSchedule.part,
          opensAt:roundSchedule.opensAt, closesAt:roundSchedule.closesAt,
          questionCount:prepared[index].questions.length, questions:prepared[index].questions,
          status:'published', updatedAt:FieldValue.serverTimestamp(),
        }, { merge:true });
        batch.set(db.doc(`_challengeAnswerKeys/${roundSchedule.roundId}`), {
          roundId:roundSchedule.roundId, weekKey, part:roundSchedule.part,
          answers:prepared[index].keys, updatedAt:FieldValue.serverTimestamp(),
        }, { merge:true });
      });
      await batch.commit();
      return { ok:true, weekKey, rounds:[schedule.part1.roundId, schedule.part2.roundId] };
    }
  );

  const obterDesafioSemanal = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      const studentSnap = await assertStudent(uid);
      const student = studentSnap.data();
      const now = new Date();
      const weekKey = weekKeyFor(now);
      const schedule = scheduleFor(weekKey);
      const stage = stageFor(now, schedule);
      const weekSnap = await db.doc(`challengeWeeks/${weekKey}`).get();
      const base = {
        enabled:true, weekKey, title:weekSnap.exists ? weekSnap.data().title : 'Desafio Science English',
        phase:weekSnap.exists ? stage.phase : 'unpublished', part:stage.part,
        startsAt:iso(schedule.startsAt), revealAt:iso(schedule.revealAt), endsAt:iso(schedule.endsAt),
      };
      if (!weekSnap.exists) return base;

      if (stage.phase === 'results') {
        let rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        if (!rankingSnap.exists) {
          await buildRanking(weekKey);
          rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        }
        const resultSnaps = await Promise.all([1,2].map(part => db.doc(`_challengeResults/${weekKey}-part-${part}_${uid}`).get()));
        const parts = resultSnaps.filter(snap => snap.exists).map(snap => snap.data()).sort((a,b) => a.part - b.part);
        const ranking = (rankingSnap.data()?.ranking || []).map(row => ({
          name:row.name, score:row.score, partsCompleted:row.partsCompleted, position:row.position, isOwn:row.uid === uid,
        }));
        const own = ranking.find(row => row.isOwn) || null;
        return { ...base, resultReady:true, result:{
          score:parts.reduce((sum, part) => sum + Number(part.score || 0), 0),
          maxScore:1000, parts:parts.map(part => ({ part:part.part, score:part.score, details:part.details || [] })),
          position:own?.position || null,
        }, ranking };
      }

      if (stage.phase !== 'open') return base;
      const roundSchedule = stage.part === 1 ? schedule.part1 : schedule.part2;
      const [{ roundSnap }, submissionSnap] = await Promise.all([
        resolveRound(uid, roundSchedule.roundId),
        db.doc(`students/${uid}/challengeSubmissions/${roundSchedule.roundId}`).get(),
      ]);
      if (!roundSnap.exists) return { ...base, phase:'unpublished' };
      const round = roundSnap.data();
      const submission = submissionSnap.exists ? submissionSnap.data() : null;
      return { ...base,
        canStart:submission?.completed !== true,
        completed:submission?.completed === true,
        started:Boolean(submission), nextIndex:Number(submission?.answers?.length || 0),
        round:{ roundId:round.roundId, part:round.part, questionCount:round.questionCount,
          opensAt:iso(round.opensAt), closesAt:iso(round.closesAt), questions:round.questions || [] },
      };
    }
  );

  const iniciarDesafioSemanal = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      await assertStudent(uid);
      const roundId = String(request.data?.roundId || '');
      await assertOpenRound(uid, roundId);
      const ref = db.doc(`students/${uid}/challengeSubmissions/${roundId}`);
      const result = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data().completed === true) throw new HttpsError('already-exists', 'Esta tentativa já foi concluída.');
        if (!snap.exists) tx.create(ref, {
          roundId, weekKey:roundId.slice(0, 10), part:Number(roundId.slice(-1)), answers:[],
          completed:false, status:'in_progress', startedAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
        });
        return { started:true, nextIndex:Number(snap.data()?.answers?.length || 0) };
      });
      return result;
    }
  );

  const salvarRespostaDesafio = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      const studentSnap = await assertStudent(uid);
      const roundId = String(request.data?.roundId || '');
      const questionId = String(request.data?.questionId || '');
      const value = String(request.data?.value || '').trim().slice(0, 1000);
      const { round, personalized } = await assertOpenRound(uid, roundId);
      const keySnap = await answerKeyRef(uid, roundId, personalized).get();
      if (!keySnap.exists) throw new HttpsError('failed-precondition', 'O gabarito desta rodada não foi publicado.');
      const questions = round.questions || [];
      const keys = keySnap.data().answers || [];
      const submissionRef = db.doc(`students/${uid}/challengeSubmissions/${roundId}`);
      const resultRef = db.doc(`_challengeResults/${roundId}_${uid}`);
      return db.runTransaction(async tx => {
        const snap = await tx.get(submissionRef);
        if (!snap.exists) throw new HttpsError('failed-precondition', 'Comece o desafio antes de responder.');
        const submission = snap.data();
        if (submission.completed === true) throw new HttpsError('already-exists', 'Esta tentativa já foi concluída.');
        const answers = Array.isArray(submission.answers) ? submission.answers : [];
        const expectedQuestion = questions[answers.length];
        if (!expectedQuestion || expectedQuestion.id !== questionId) {
          throw new HttpsError('failed-precondition', 'A ordem das perguntas mudou. Reabra o desafio.');
        }
        const nextAnswers = [...answers, { questionId, value, answeredAt:new Date().toISOString() }];
        const completed = nextAnswers.length === questions.length;
        tx.set(submissionRef, {
          answers:nextAnswers, completed, status:completed ? 'submitted' : 'in_progress',
          updatedAt:FieldValue.serverTimestamp(), ...(completed ? { submittedAt:FieldValue.serverTimestamp() } : {}),
        }, { merge:true });
        if (completed) {
          const details = scoreAnswers(questions, keys, nextAnswers);
          const score = details.reduce((sum, detail) => sum + detail.score, 0);
          tx.set(resultRef, {
            uid, studentName:studentSnap.data().name || studentSnap.data().firstName || 'Aluno',
            roundId, weekKey:round.weekKey, part:round.part, score, maxScore:questions.length * 100,
            details, completedAt:FieldValue.serverTimestamp(),
          });
        }
        return { saved:true, completed, nextIndex:nextAnswers.length };
      });
    }
  );

  const obterStatusDesafioAdmin = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      const schedule = scheduleFor(weekKey);
      const [week, part1, part2, submissions1, submissions2, generationJob] = await Promise.all([
        db.doc(`challengeWeeks/${weekKey}`).get(),
        db.doc(`challengeRounds/${schedule.part1.roundId}`).get(),
        db.doc(`challengeRounds/${schedule.part2.roundId}`).get(),
        db.collectionGroup('challengeSubmissions').where('roundId', '==', schedule.part1.roundId).get(),
        db.collectionGroup('challengeSubmissions').where('roundId', '==', schedule.part2.roundId).get(),
        db.doc(`_challengeGenerationJobs/${weekKey}`).get(),
      ]);
      const completed = snaps => snaps.docs.filter(doc => doc.data().completed === true).length;
      return {
        weekKey, published:week.exists,
        personalized:generationJob.exists ? generationJob.data() : null,
        part1:{ published:part1.exists || generationJob.data()?.completed > 0, questions:part1.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), completed:completed(submissions1) },
        part2:{ published:part2.exists || generationJob.data()?.completed > 0, questions:part2.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), completed:completed(submissions2) },
      };
    }
  );

  const finalizarDesafioSemanal = onSchedule(
    { region:REGION, schedule:'5 0 * * 0', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => buildRanking(weekKeyFor())
  );

  async function sendOpeningNotifications() {
    const now = new Date();
    const weekKey = weekKeyFor(now);
    if (weekKey < LAUNCH_WEEK) return;
    const schedule = scheduleFor(weekKey);
    const stage = stageFor(now, schedule);
    if (stage.phase !== 'open') return;
    const roundId = stage.part === 1 ? schedule.part1.roundId : schedule.part2.roundId;
    const students = await db.collection('students').get();
    for (const studentDoc of students.docs) {
      const student = studentDoc.data();
      if (student.archived === true || student.challengeEnabled === false) continue;
      const { roundSnap } = await resolveRound(studentDoc.id, roundId);
      if (!roundSnap.exists) continue;
      const tokens = [...new Set([student.fcmToken, ...(Array.isArray(student.fcmTokens) ? student.fcmTokens : [])].filter(Boolean))];
      if (!tokens.length) continue;
      const slot = `${roundId}-opening-08`;
      const logRef = studentDoc.ref.collection('challengeReminderLogs').doc(slot);
      const reserved = await db.runTransaction(async tx => {
        const log = await tx.get(logRef);
        if (log.exists) return false;
        tx.create(logRef, { slot, roundId, part:stage.part, period:'opening', status:'sending', createdAt:FieldValue.serverTimestamp() });
        return true;
      });
      if (!reserved) continue;
      try {
        const response = await getMessaging().sendEachForMulticast({
          tokens,
          notification:{
            title:`Parte ${stage.part} do desafio começou`,
            body:'Você tem 5 perguntas difíceis e personalizadas com base nos seus últimos 90 dias de estudo.',
          },
          data:{ type:'challenge-opening', roundId, part:String(stage.part) },
          webpush:{ headers:{ Urgency:'high' }, fcmOptions:{ link:APP_URL } },
        });
        await logRef.update({ status:'sent', sent:response.successCount, failed:response.failureCount, sentAt:FieldValue.serverTimestamp() });
      } catch (error) {
        await logRef.delete().catch(() => {});
        console.error(`Abertura do desafio falhou para ${studentDoc.id}:`, error.message);
      }
    }
  }

  const notificarAberturaDesafio = onSchedule(
    { region:REGION, schedule:'0 8 * * 1,4', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    sendOpeningNotifications
  );

  async function sendReminders(period) {
    const now = new Date();
    const weekKey = weekKeyFor(now);
    if (weekKey < LAUNCH_WEEK) return;
    const schedule = scheduleFor(weekKey);
    const stage = stageFor(now, schedule);
    if (stage.phase !== 'open') return;
    const roundId = stage.part === 1 ? schedule.part1.roundId : schedule.part2.roundId;
    const students = await db.collection('students').get();
    const slot = `${roundId}-${period}`;
    for (const studentDoc of students.docs) {
      const student = studentDoc.data();
      if (student.archived === true || student.challengeEnabled === false) continue;
      const { roundSnap } = await resolveRound(studentDoc.id, roundId);
      if (!roundSnap.exists) continue;
      const tokens = [...new Set([student.fcmToken, ...(Array.isArray(student.fcmTokens) ? student.fcmTokens : [])].filter(Boolean))];
      if (!tokens.length) continue;
      const submission = await studentDoc.ref.collection('challengeSubmissions').doc(roundId).get();
      if (submission.exists && submission.data().completed === true) continue;
      const logRef = studentDoc.ref.collection('challengeReminderLogs').doc(slot);
      const reserved = await db.runTransaction(async tx => {
        const log = await tx.get(logRef);
        if (log.exists) return false;
        tx.create(logRef, { slot, roundId, part:stage.part, period, status:'sending', createdAt:FieldValue.serverTimestamp() });
        return true;
      });
      if (!reserved) continue;
      try {
        const title = period === 'morning' ? 'Seu desafio termina hoje' : 'Última hora do desafio';
        const body = period === 'morning'
          ? `Você ainda não concluiu a parte ${stage.part}. Responda até 23h59 de hoje.`
          : `A parte ${stage.part} termina à meia-noite. Ainda dá tempo de responder.`;
        const response = await getMessaging().sendEachForMulticast({
          tokens, notification:{ title, body }, data:{ type:'challenge-reminder', roundId, part:String(stage.part) },
          webpush:{ headers:{ Urgency:period === 'night' ? 'high' : 'normal' }, fcmOptions:{ link:APP_URL } },
        });
        await logRef.update({ status:'sent', sent:response.successCount, failed:response.failureCount, sentAt:FieldValue.serverTimestamp() });
      } catch (error) {
        await logRef.delete().catch(() => {});
        console.error(`Lembrete do desafio falhou para ${studentDoc.id}:`, error.message);
      }
    }
  }

  const lembrarDesafioManha = onSchedule(
    { region:REGION, schedule:'0 9 * * 3,6', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => sendReminders('morning')
  );
  const lembrarDesafioNoite = onSchedule(
    { region:REGION, schedule:'0 23 * * 3,6', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => sendReminders('night')
  );

  return {
    publicarDesafioSemanal, gerarDesafiosPersonalizados, obterDesafioSemanal, iniciarDesafioSemanal,
    salvarRespostaDesafio, obterStatusDesafioAdmin, finalizarDesafioSemanal,
    notificarAberturaDesafio, lembrarDesafioManha, lembrarDesafioNoite,
  };
}

export const challengeInternals = Object.freeze({
  localDateParts, addDays, weekKeyFor, scheduleFor, stageFor,
  normalizeAnswer, validateQuestion, scoreAnswers, dateFrom, assertFocusMix,
});
