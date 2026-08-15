import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { FieldValue } from 'firebase-admin/firestore';

const REGION = 'southamerica-east1';
const TIME_ZONE = 'America/Sao_Paulo';
const LAUNCH_WEEK = '2026-08-17';
const APP_URL = 'https://cezika-web.github.io/science-english-app/?challenge=1';

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

  const publicQuestion = { id, type, prompt, context, hint };
  const answerKey = {
    id,
    expected:String(question?.expected || '').trim(),
    explanation:String(question?.explanation || '').trim(),
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

export function createChallengeFunctions({ db, getMessaging, adminEmails }) {
  async function assertStudent(uid) {
    const snap = await db.doc(`students/${uid}`).get();
    if (!snap.exists || snap.data().archived === true || snap.data().challengeEnabled === false) {
      throw new HttpsError('permission-denied', 'O desafio não está ativo para este aluno.');
    }
    return snap;
  }

  async function assertOpenRound(roundId, now = new Date()) {
    const roundSnap = await db.doc(`challengeRounds/${roundId}`).get();
    if (!roundSnap.exists) throw new HttpsError('not-found', 'Esta rodada ainda não foi publicada.');
    const round = roundSnap.data();
    const opensAt = round.opensAt?.toDate?.() || new Date(round.opensAt);
    const closesAt = round.closesAt?.toDate?.() || new Date(round.closesAt);
    if (now < opensAt) throw new HttpsError('failed-precondition', 'Esta rodada ainda não começou.');
    if (now > closesAt) throw new HttpsError('deadline-exceeded', 'O prazo desta rodada terminou.');
    return { roundSnap, round, opensAt, closesAt };
  }

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
      const [roundSnap, submissionSnap] = await Promise.all([
        db.doc(`challengeRounds/${roundSchedule.roundId}`).get(),
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
      await assertOpenRound(roundId);
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
      const { round } = await assertOpenRound(roundId);
      const keySnap = await db.doc(`_challengeAnswerKeys/${roundId}`).get();
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
      const [week, part1, part2, submissions1, submissions2] = await Promise.all([
        db.doc(`challengeWeeks/${weekKey}`).get(),
        db.doc(`challengeRounds/${schedule.part1.roundId}`).get(),
        db.doc(`challengeRounds/${schedule.part2.roundId}`).get(),
        db.collectionGroup('challengeSubmissions').where('roundId', '==', schedule.part1.roundId).get(),
        db.collectionGroup('challengeSubmissions').where('roundId', '==', schedule.part2.roundId).get(),
      ]);
      const completed = snaps => snaps.docs.filter(doc => doc.data().completed === true).length;
      return {
        weekKey, published:week.exists,
        part1:{ published:part1.exists, questions:part1.data()?.questionCount || 0, completed:completed(submissions1) },
        part2:{ published:part2.exists, questions:part2.data()?.questionCount || 0, completed:completed(submissions2) },
      };
    }
  );

  const finalizarDesafioSemanal = onSchedule(
    { region:REGION, schedule:'5 0 * * 0', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => buildRanking(weekKeyFor())
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
    publicarDesafioSemanal, obterDesafioSemanal, iniciarDesafioSemanal,
    salvarRespostaDesafio, obterStatusDesafioAdmin, finalizarDesafioSemanal,
    lembrarDesafioManha, lembrarDesafioNoite,
  };
}

export const challengeInternals = Object.freeze({
  localDateParts, addDays, weekKeyFor, scheduleFor, stageFor,
  normalizeAnswer, validateQuestion, scoreAnswers,
});
