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
        weakPoints:{ type:'array', items:{ type:'string' } },
        strongPoints:{ type:'array', items:{ type:'string' } },
      },
    },
    part1:{ type:'array', items:{ $ref:'#/$defs/question' } },
    part2:{ type:'array', items:{ $ref:'#/$defs/question' } },
  },
  $defs:{ question:{
    type:'object', additionalProperties:false,
    required:['id','format','prompt','context','hint','focus','topic','options','correctOption','acceptedAnswers','expected','explanation'],
    properties:{
      id:{ type:'string' },
      format:{ type:'string', enum:['multipleChoice','trueFalse','text'] },
      prompt:{ type:'string' }, context:{ type:'string' }, hint:{ type:'string' },
      focus:{ type:'string', enum:['weak','strong'] }, topic:{ type:'string' },
      options:{ type:'array', items:{
        type:'object', additionalProperties:false, required:['id','text'],
        properties:{ id:{ type:'string', enum:['a','b','c','d'] }, text:{ type:'string' } },
      } },
      correctOption:{ type:'string' },
      acceptedAnswers:{ type:'array', items:{ type:'string' } },
      expected:{ type:'string' }, explanation:{ type:'string' },
    },
  } },
};

// O formato é a alavanca de dificuldade: escolher deixa acertar por eliminação,
// escrever exige recuperação ativa. Quem passou da metade dos pontos na semana
// anterior escreve as cinco; quem ficou abaixo — ou não tem semana anterior —
// ganha um verdadeiro/falso e uma múltipla escolha de apoio.
const FORMAT_THRESHOLD = 500;
const FORMAT_MIX = {
  escrita:{ text:5, trueFalse:0, multipleChoice:0 },
  assistido:{ text:3, trueFalse:1, multipleChoice:1 },
};
const OPTION_COUNT = { multipleChoice:4, trueFalse:2 };

// Uma pergunta só, para quando o César troca um item da rodada sem refazer a parte.
const SINGLE_QUESTION_SCHEMA = {
  type:'object', additionalProperties:false,
  required:['prompt','context','hint','focus','topic','options','correctOption','acceptedAnswers','expected','explanation'],
  properties:{
    prompt:{ type:'string' }, context:{ type:'string' }, hint:{ type:'string' },
    focus:{ type:'string', enum:['weak','strong'] }, topic:{ type:'string' },
    options:{ type:'array', items:{
      type:'object', additionalProperties:false, required:['id','text'],
      properties:{ id:{ type:'string', enum:['a','b','c','d'] }, text:{ type:'string' } },
    } },
    correctOption:{ type:'string' },
    acceptedAnswers:{ type:'array', items:{ type:'string' } },
    expected:{ type:'string' }, explanation:{ type:'string' },
  },
};

// A troca de uma pergunta tem de sair no mesmo formato da que saiu, senão o mix
// da parte (3 escritas + 1 V/F + 1 múltipla, ou 5 escritas) se desfaz.
function formatOf(question) {
  if (question?.type === 'text') return 'text';
  return (question?.options || []).length === 2 ? 'trueFalse' : 'multipleChoice';
}

const FORMAT_RULES = {
  text:'Resposta escrita: o aluno digita. Deixe options vazio e correctOption vazio, e preencha acceptedAnswers '
    + 'com TODAS as formas corretas de escrever a resposta: fragmento que completa a lacuna, frase completa, '
    + 'contrações, formas sem contração, conectores opcionais e versões mais específicas que preservem o mesmo sentido. '
    + 'Mínimo de 3 palavras, nunca uma palavra só, e curta o '
    + 'suficiente para ser digitada em 45 segundos no celular. A pergunta precisa admitir uma única construção '
    + 'natural, porque a correção compara texto — maiúscula, acento e pontuação são ignorados.',
  trueFalse:'Verdadeiro ou falso: exatamente duas alternativas, {"id":"a","text":"True"} e {"id":"b","text":"False"}, '
    + 'correctOption com a letra certa e acceptedAnswers vazio.',
  multipleChoice:'Múltipla escolha com quatro alternativas plausíveis (a, b, c, d), correctOption com a letra certa '
    + 'e acceptedAnswers vazio.',
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

// A segunda-feira que ainda vai chegar. No domingo é o dia seguinte; na própria
// segunda é a de daqui a sete dias — nunca devolve a semana que já começou.
function nextMonday(date = new Date()) {
  const local = localDateParts(date);
  const weekday = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 }[local.weekday];
  return addDays(local.date, (8 - weekday) % 7 || 7);
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

// A rodada da turma usa o MESMO calendário da semanal (mesmas duas partes, mesma
// abertura e mesmo fechamento) e só muda de identidade. Gravada dentro de cada
// aluno, ela atravessa `resolveRound`, `iniciarDesafioSemanal` e
// `responderDesafioSemanal` sem que nada disso precise saber que é de turma.
function groupScheduleFor(weekKey, groupId) {
  const base = scheduleFor(weekKey);
  const marca = parte => `${weekKey}-g-${groupId}-part-${parte}`;
  return {
    ...base,
    part1:{ ...base.part1, roundId:marca(1) },
    part2:{ ...base.part2, roundId:marca(2) },
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

// A IA pode nomear o mesmo ponto gramatical de dezenas de maneiras. Para a
// pauta do professor interessa a família do erro, não cada microvariação. Já
// vocabulário específico é memória lexical e não entra como falha gramatical.
function canonicalChallengeTopic(value) {
  const topic = String(value || '').trim();
  const normalized = normalizeAnswer(topic);
  if (!normalized) return '';
  if (/\b(vocabulary|vocabulario|common responses|farewell)\b/.test(normalized)
    || /\binvent x discover\b/.test(normalized)) return '';
  if (/\b(present perfect|have has been|already|yet|ever|never)\b/.test(normalized)) return 'Present Perfect';
  if (/\btag questions?\b/.test(normalized)) return 'Tag Questions';
  if (/\b(possessive|possessivo|possessivos|apostrophe s|apostrofo s|its vs|your their)\b/.test(normalized)) return 'Possessivos';
  if (/\b(causative|causatives|causativo|causativos|causativa|causativas|have pessoa|get pessoa)\b/.test(normalized)) return 'Causativo';
  if (/\b(going to|will|future|futuro)\b/.test(normalized)) return 'Futuro — will / going to';
  if (/\bthere is\b|\bthere are\b/.test(normalized)) return 'There is / There are';
  if (/\b(to be|verbo be|verb be|is vs are|was vs were|was were|am is are)\b/.test(normalized)) return 'Verbo to be';
  if (/\bwould\b/.test(normalized)) return 'Modal — would';
  if (/\b(can|can't|cannot|could)\b/.test(normalized)) return 'Modal — can / could';
  if (/\bshould\b/.test(normalized)) return 'Modal — should';
  if (/\b(must|have to)\b/.test(normalized)) return 'Modal — must / have to';
  if (/\b(may|might)\b/.test(normalized)) return 'Modal — may / might';
  if (/\b(agreement|concordancia verbal)\b/.test(normalized)) return 'Concordância verbal';
  return topic;
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

function answerTokens(value) {
  return normalizeAnswer(value).split(' ').map(token => token.replace(/^'+|'+$/g, '')).filter(Boolean);
}

function orderedSubsequence(needle, haystack) {
  let index = 0;
  for (const token of haystack) {
    if (token === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return false;
}

function polarityOf(tokens) {
  const negative = tokens.filter(token => token === 'not' || token === 'no' || token === 'never'
    || /n't$/.test(token) || ['cannot','neither','nobody','nothing','nowhere'].includes(token)).length;
  return negative > 0 ? 'negative' : 'positive';
}

// O aluno pode responder só o trecho pedido ou repetir a frase inteira. Também
// pode acrescentar um modificador válido: "a basketball game" continua contendo
// a construção "a game". A ordem das palavras e a polaridade precisam continuar
// iguais, para nunca aceitar "I do not like it" como variante de "I like it".
function preservesExpectedConstruction(response, expected) {
  if (expected.length < 2 || response.length < expected.length) return false;
  return polarityOf(response) === polarityOf(expected) && orderedSubsequence(expected, response);
}

// Distância de edição por palavra. Cada palavra correta preserva uma fração da
// nota, enquanto inserções, trocas e omissões descontam separadamente.
function wordDistance(a, b) {
  const row = Array.from({ length:b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const previous = row[j];
      row[j] = a[i - 1] === b[j - 1] ? diagonal
        : 1 + Math.min(diagonal, row[j], row[j - 1]);
      diagonal = previous;
    }
  }
  return row[b.length];
}

function scoreWrittenAnswer(value, acceptedAnswers) {
  const response = answerTokens(value);
  if (!response.length) return 0;
  const candidates = (acceptedAnswers || []).map(answerTokens).filter(tokens => tokens.length);
  if (!candidates.length) return 0;
  let best = 0;
  candidates.forEach(expected => {
    if (preservesExpectedConstruction(response, expected)) {
      best = 1;
      return;
    }
    const base = Math.max(response.length, expected.length, 1);
    const similarity = Math.max(0, 1 - wordDistance(response, expected) / base);
    best = Math.max(best, similarity);
  });
  // Passos de 5 pontos deixam a nota legível, sem apagar diferenças pequenas.
  return Math.max(0, Math.min(100, Math.round(best * 20) * 5));
}

function scoreAnswers(publicQuestions, keys, answers) {
  const answersById = new Map((answers || []).map(answer => [String(answer.questionId), String(answer.value || '')]));
  const keysById = new Map(keys.map(key => [key.id, key]));
  return publicQuestions.map(question => {
    const key = keysById.get(question.id) || {};
    const value = answersById.get(question.id) || '';
    const score = question.type === 'multipleChoice'
      ? (value === key.correctOption ? 100 : 0)
      : scoreWrittenAnswer(value, key.acceptedAnswers);
    const correct = score === 100;
    const selectedOption = question.options?.find(option => option.id === value)?.text || value;
    return {
      questionId:question.id, prompt:question.prompt, context:question.context || '',
      answer:selectedOption, expected:key.expected || '', explanation:key.explanation || '',
      type:question.type, ...(key.topic ? { topic:key.topic } : {}),
      score, correct, ...(score > 0 && score < 100 ? { parcial:true } : {}),
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

function assertFormatMix(questions, part, nivel) {
  const alvo = FORMAT_MIX[nivel] || FORMAT_MIX.assistido;
  const conta = formato => questions.filter(question => question.format === formato).length;
  if (Object.entries(alvo).some(([formato, quantidade]) => conta(formato) !== quantidade)) {
    throw new Error(`A Parte ${part} precisa de ${alvo.text} escrita(s), `
      + `${alvo.trueFalse} verdadeiro/falso e ${alvo.multipleChoice} múltipla escolha — `
      + `veio ${conta('text')}/${conta('trueFalse')}/${conta('multipleChoice')}.`);
  }
  questions.forEach((question, index) => {
    const esperado = OPTION_COUNT[question.format];
    if (esperado && (!Array.isArray(question.options) || question.options.length !== esperado)) {
      throw new Error(`A pergunta ${index + 1} da Parte ${part} (${question.format}) precisa de ${esperado} alternativas.`);
    }
    if (question.format === 'text' && !(Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length)) {
      throw new Error(`A pergunta ${index + 1} da Parte ${part} é escrita e veio sem respostas aceitas.`);
    }
  });
}

export function createChallengeFunctions({
  db, getMessaging, adminEmails, anthropicApiKey = null, Anthropic = null,
  model = 'claude-sonnet-5', loadPostLesson = null, registrarUso = null,
}) {
  async function loadCurrentStudentProfiles() {
    const snaps = await db.collection('students').get();
    return new Map(snaps.docs.map(doc => {
      const data = doc.data();
      return [doc.id, {
        name:data.name || data.firstName || 'Aluno',
        photo:data.photo || '',
      }];
    }));
  }

  function applyCurrentStudentProfiles(rows = [], profiles = new Map()) {
    return rows.map(row => {
      const profile = profiles.get(row.uid);
      return profile ? { ...row, name:profile.name, photo:profile.photo || row.photo || '' } : row;
    });
  }

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

  // Colocação densa: pontuações iguais ocupam exatamente a mesma posição e o
  // próximo total diferente avança uma casa (1, 1, 2, 3). Assim sempre há
  // primeiro, segundo e terceiro lugares, mesmo quando o pódio tem empates.
  function rankByScore(rows, scoreField = 'score') {
    const ordered = [...rows].sort((a, b) => Number(b[scoreField] || 0) - Number(a[scoreField] || 0)
      || Number(b.partsCompleted || b.semanas || 0) - Number(a.partsCompleted || a.semanas || 0)
      || String(a.name || '').localeCompare(String(b.name || ''), 'pt-BR'));
    let lastScore = null, position = 0;
    return ordered.map(row => {
      const score = Number(row[scoreField] || 0);
      if (lastScore === null || score !== lastScore) position += 1;
      lastScore = score;
      return { ...row, position };
    });
  }

  async function buildRanking(weekKey) {
    const [resultSnaps, profiles] = await Promise.all([
      db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
      loadCurrentStudentProfiles(),
    ]);
    const totals = new Map();
    resultSnaps.docs.forEach(doc => {
      const result = doc.data();
      // Rodada de turma pontua só dentro da turma: no ranking geral ela daria
      // vantagem a quem tem dupla, que joga 20 perguntas contra as 10 dos outros.
      if (result.groupId) return;
      const current = totals.get(result.uid) || {
        uid:result.uid, name:profiles.get(result.uid)?.name || result.studentName || 'Aluno', score:0, partsCompleted:0,
        part1Score:0, part2Score:0, completedAt:result.completedAt,
      };
      current.score += Number(result.score || 0);
      if (Number(result.part) === 1) current.part1Score += Number(result.score || 0);
      if (Number(result.part) === 2) current.part2Score += Number(result.score || 0);
      current.partsCompleted += 1;
      if ((result.completedAt?.toMillis?.() || Infinity) < (current.completedAt?.toMillis?.() || Infinity)) current.completedAt = result.completedAt;
      totals.set(result.uid, current);
    });
    const ranking = rankByScore([...totals.values()]).map(row => ({
      uid:row.uid, name:row.name, score:row.score,
      part1Score:row.part1Score, part2Score:row.part2Score,
      partsCompleted:row.partsCompleted, position:row.position,
    }));
    const schedule = scheduleFor(weekKey);
    await db.doc(`challengeRankings/${weekKey}`).set({
      weekKey, ranking, participantCount:ranking.length, revealAt:schedule.revealAt,
      generatedAt:FieldValue.serverTimestamp(),
    }, { merge:true });
    return ranking;
  }

  const POINT_BADGE_LEVELS = [1000,5000,10000,25000,50000,100000,250000];

  function publicChallengeBadge(doc) {
    const data = doc.data();
    return {
      id:doc.id, kind:data.kind || 'challenge', icon:data.icon || '🏅',
      title:data.title || 'Selo conquistado', message:data.message || '',
      weekKey:data.weekKey || '', score:Number(data.score || 0),
      awardedAt:iso(data.awardedAt), viewed:data.viewedAt != null,
    };
  }

  async function loadChallengeBadges(uid) {
    const snaps = await db.collection(`students/${uid}/challengeBadges`).get();
    const badges = snaps.docs.map(publicChallengeBadge).sort((a, b) =>
      String(b.awardedAt || '').localeCompare(String(a.awardedAt || '')) || a.title.localeCompare(b.title, 'pt-BR')
    );
    return { badges, pendingBadges:badges.filter(item => !item.viewed) };
  }

  async function createBadgeIfMissing(uid, badge) {
    const ref = db.doc(`students/${uid}/challengeBadges/${badge.id}`);
    return db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (snap.exists) return false;
      tx.create(ref, { ...badge, viewedAt:null, awardedAt:FieldValue.serverTimestamp() });
      return true;
    });
  }

  function weeklyBadgesFor(row, results, totalPoints) {
    const badges = [];
    if (row.position === 1) badges.push({
      id:`weekly-champion-${row.weekKey}`, kind:'weekly-champion', icon:'🏆',
      title:'Campeão da semana!', weekKey:row.weekKey, score:row.score,
      message:`Parabéns! Você ficou em 1º lugar no Desafio Science English com ${Number(row.score).toLocaleString('pt-BR')} PTS.`,
    });
    results.sort((a, b) => Number(a.part || 0) - Number(b.part || 0)).forEach(result => {
      const details = result.details || [];
      if (!details.length) return;
      const hits = details.filter(item => Number(item.score || 0) >= 80).length;
      if (hits > 0) badges.push({
        id:`hits-${row.weekKey}-part-${result.part}-${hits}`, kind:'round-hits',
        icon:hits === details.length ? '🎯' : hits >= 4 ? '⭐' : '🏅',
        title:`${hits} de ${details.length} na Parte ${result.part}!`, weekKey:row.weekKey,
        score:Number(result.score || 0),
        message:`Você acertou ${hits} ${hits === 1 ? 'pergunta' : 'perguntas'} na Parte ${result.part} desta semana.`,
      });
      if (details.every(item => Number(item.score || 0) === 100)) badges.push({
        id:`perfect-${row.weekKey}-part-${result.part}`, kind:'perfect-round', icon:'💯',
        title:`100% perfeito · Parte ${result.part}`, weekKey:row.weekKey,
        score:Number(result.score || 0), message:'Todas as cinco respostas receberam 100 PTS. Rodada perfeita!',
      });
    });
    POINT_BADGE_LEVELS.filter(level => totalPoints >= level).forEach(level => badges.push({
      id:`points-${level}`, kind:'points-milestone', icon:'💎',
      title:`${level.toLocaleString('pt-BR')} pontos!`, weekKey:row.weekKey, score:totalPoints,
      message:`Você alcançou ${level.toLocaleString('pt-BR')} pontos acumulados no Desafio Science English.`,
    }));
    return badges;
  }

  async function notifyNewBadges(studentDoc, weekKey, row, created) {
    if (!created.length) return { sent:0, failed:0, skipped:'sem-novos-selos' };
    const student = studentDoc.data();
    const tokens = [...new Set([student.fcmToken,
      ...(Array.isArray(student.fcmTokens) ? student.fcmTokens : [])].filter(Boolean))];
    const logRef = studentDoc.ref.collection('challengeBadgeNotifications').doc(weekKey);
    const reserved = await db.runTransaction(async tx => {
      const snap = await tx.get(logRef);
      if (snap.exists && snap.data().status === 'sent') return false;
      tx.set(logRef, { weekKey, badgeIds:created.map(item => item.id), status:'sending',
        updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      return true;
    });
    if (!reserved) return { sent:0, failed:0, skipped:'ja-enviado' };
    if (!tokens.length) {
      await logRef.set({ status:'sem-token', updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      return { sent:0, failed:0, skipped:'sem-token' };
    }
    const champion = row.position === 1;
    const title = champion ? '🏆 Você ficou em 1º lugar!' : '🏅 Você conquistou novos selos!';
    const body = champion
      ? `Parabéns, ${String(row.name || 'campeão').split(' ')[0]}! Você venceu a semana com ${Number(row.score).toLocaleString('pt-BR')} PTS. Abra o app para receber seu selo.`
      : `Você conquistou ${created.length} ${created.length === 1 ? 'novo selo' : 'novos selos'} no Desafio Science English.`;
    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens, notification:{ title, body },
        data:{ type:'challenge-badges', weekKey, badgeCount:String(created.length) },
        webpush:{ headers:{ Urgency:'high' }, fcmOptions:{ link:APP_URL } },
      });
      await logRef.set({ status:'sent', sent:response.successCount, failed:response.failureCount,
        sentAt:FieldValue.serverTimestamp() }, { merge:true });
      return { sent:response.successCount, failed:response.failureCount };
    } catch (error) {
      await logRef.set({ status:'failed', error:String(error.message || error).slice(0,500),
        updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      throw error;
    }
  }

  async function awardWeeklyBadges(weekKey) {
    const [rankingSnap, resultsSnap, allRankings] = await Promise.all([
      db.doc(`challengeRankings/${weekKey}`).get(),
      db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
      db.collection('challengeRankings').get(),
    ]);
    if (!rankingSnap.exists) return { weekKey, awarded:[], skipped:'ranking-ainda-nao-existe' };
    const resultsByUid = new Map();
    resultsSnap.docs.forEach(doc => {
      const result = doc.data();
      if (result.groupId) return;
      const current = resultsByUid.get(result.uid) || [];
      current.push(result); resultsByUid.set(result.uid, current);
    });
    const totalPointsByUid = new Map();
    allRankings.docs.forEach(doc => (doc.data().ranking || []).forEach(row =>
      totalPointsByUid.set(row.uid, Number(totalPointsByUid.get(row.uid) || 0) + Number(row.score || 0))
    ));
    const awarded = [];
    for (const rankingRow of rankingSnap.data().ranking || []) {
      const studentDoc = await db.doc(`students/${rankingRow.uid}`).get();
      if (!studentDoc.exists) continue;
      const totalPoints = Number(totalPointsByUid.get(rankingRow.uid) || 0);
      const row = { ...rankingRow, weekKey };
      const candidates = weeklyBadgesFor(row, resultsByUid.get(row.uid) || [], totalPoints);
      const created = [];
      for (const badge of candidates) if (await createBadgeIfMissing(row.uid, badge)) created.push(badge);
      const notification = await notifyNewBadges(studentDoc, weekKey, row, created).catch(error => ({ error:error.message }));
      if (created.length) awarded.push({ uid:row.uid, name:row.name, position:row.position,
        badgeIds:created.map(item => item.id), notification });
    }
    return { weekKey, awarded };
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

  // Como a leva roda depois do ranking sair, o resultado da semana anterior já
  // existe. Quem gabaritou recebe perguntas mais duras na semana seguinte —
  // senão a disputa esvazia.
  async function previousWeekPerformance(uid, weekKey) {
    const anterior = addDays(weekKey, -7);
    const snaps = await Promise.all([1, 2].map(part =>
      db.doc(`_challengeResults/${anterior}-part-${part}_${uid}`).get()));
    const partes = snaps.filter(snap => snap.exists).map(snap => snap.data());
    if (!partes.length) return null;
    return {
      weekKey:anterior,
      score:partes.reduce((sum, part) => sum + Number(part.score || 0), 0),
      maxScore:partes.length * 500,
      erros:partes.flatMap(part => (part.details || [])
        .filter(item => !item.correct)
        .map(item => ({ pergunta:item.prompt, correta:item.expected }))),
    };
  }

  async function generateForStudent(client, studentDoc, weekKey) {
    const student = studentDoc.data();
    const anterior = await previousWeekPerformance(studentDoc.id, weekKey);
    const input = await personalizationInput(studentDoc);
    // Sem semana anterior o aluno cai no mix assistido: pode ser alguém que
    // acabou de entrar, e não se joga um A1 direto em cinco perguntas escritas.
    const formato = anterior && Number(anterior.score) >= FORMAT_THRESHOLD ? 'escrita' : 'assistido';
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
        'Em CADA parte, produza exatamente 3 perguntas focus=weak e 2 focus=strong. ' +
        (formato === 'escrita'
          ? 'Em CADA parte, todas as 5 perguntas devem ter format="text" — o aluno digita a resposta. '
          : 'Em CADA parte, o formato é exatamente: 3 perguntas format="text", 1 format="trueFalse" e 1 format="multipleChoice". ') +
        'Em format="multipleChoice": quatro alternativas plausíveis (a, b, c, d), correctOption com a letra certa, acceptedAnswers vazio. ' +
        'Em format="trueFalse": exatamente duas alternativas, {"id":"a","text":"True"} e {"id":"b","text":"False"}, correctOption com a letra certa, acceptedAnswers vazio. ' +
        'Em format="text": options vazio, correctOption vazio, e acceptedAnswers com TODAS as formas corretas de escrever a resposta. ' +
        'A resposta escrita tem no MÍNIMO 3 palavras — nunca uma palavra só. Deve caber em 45 segundos digitando no celular: uma oração curta, não um parágrafo nem redação. ' +
        'A correção é automática e compara construções, então a pergunta precisa admitir um alvo gramatical inequívoco. Em acceptedAnswers liste EXAUSTIVAMENTE toda variação válida: contração e forma completa ("don\'t" e "do not"), grafia americana e britânica, resposta curta e frase completa, conectores opcionais e palavras mais específicas que mantenham o mesmo sentido e a mesma regra. Não restrinja o gabarito a uma cópia literal quando outra formulação natural também responde corretamente. Se a pergunta admitir sentidos realmente diferentes, reformule para fechar o alvo. Maiúscula, acento e pontuação são ignorados na correção, então não dependa deles. ' +
        'Em todos os formatos: uma única resposta inequívoca e explicação pedagógica curta. ' +
        'Quando houver resultado da semana anterior, calibre por ele: acima de 80% dos pontos, suba a dificuldade de forma perceptível (nuance mais fina, distratores mais próximos); abaixo de 40%, mantenha exigente mas alcançável. Os erros da semana passada são pista forte de fragilidade — cubra o mesmo ponto gramatical com contexto novo, nunca repetindo a pergunta. ' +
        'Não copie exercícios literalmente. Não mencione ao aluno que um item é fraqueza ou força.' }],
      output_config:{ format:{ type:'json_schema', schema:PERSONALIZED_CHALLENGE_SCHEMA } },
      messages:[{ role:'user', content:
        `Aluno: ${student.name || student.firstName || 'Aluno'}\nNível: ${student.level || 'não informado'}\n` +
        `Semana: ${weekKey}\nJanela analisada: últimos ${LOOKBACK_DAYS} dias.\n\n` +
        `MATERIAIS DE ESTUDO (${sourceKind.toUpperCase()}):\n${materials.map((item, i) => `[${i + 1}] ${item.title} (${item.date || 'sem data'})\n${item.text}`).join('\n\n')}\n\n` +
        `CORREÇÕES E DESEMPENHO:\n${input.corrections.length ? JSON.stringify(input.corrections) : 'Sem correções estruturadas suficientes; faça inferência conservadora a partir dos pós-aulas.'}\n\n` +
        `DESAFIO DA SEMANA ANTERIOR:\n${anterior
          ? `${anterior.score} de ${anterior.maxScore} pontos (${Math.round(anterior.score / anterior.maxScore * 100)}%). Errou: ${anterior.erros.length ? JSON.stringify(anterior.erros) : 'nada'}.`
          : 'Primeira semana dele no desafio — use o nível CEFR como referência.'}`
      }],
    });
    const text = response.content.find(block => block.type === 'text')?.text;
    if (!text) throw new Error('A IA não devolveu as perguntas.');
    const generated = JSON.parse(text);
    const prepared = [generated.part1, generated.part2].map((questions, partIndex) => {
      if (!Array.isArray(questions) || questions.length !== 5) throw new Error(`Parte ${partIndex + 1} incompleta.`);
      const normalized = questions.map((question, index) => ({
        ...question, id:`p${partIndex + 1}q${index + 1}`,
        // trueFalse é múltipla escolha de duas alternativas — nem o app do aluno
        // nem a correção precisam de um terceiro caminho para ele.
        type:question.format === 'text' ? 'text' : 'multipleChoice',
      }));
      assertFocusMix(normalized, partIndex + 1);
      assertFormatMix(normalized, partIndex + 1, formato);
      const checked = normalized.map(validateQuestion);
      return { questions:checked.map(item => item.publicQuestion), keys:checked.map(item => item.answerKey) };
    });
    return { prepared, analysis:generated.analysis, sourceKind, usage:response.usage,
      sources:materials.map(item => ({ id:item.id, title:item.title, date:item.date })) };
  }

  // Uma rodada por turma, igual para os dois: a graça da dupla é comparar quem
  // acertou o quê na MESMA pergunta. Sai do material somado dos integrantes e
  // fica no formato assistido — o desafio da turma é o leve, o duro é o geral.
  async function generateForGroup(client, grupo, membros, weekKey) {
    const materiais = [];
    for (const membro of membros) {
      const entrada = await personalizationInput(membro);
      entrada.posts.forEach(post => materiais.push({
        ...post, title:`${membro.data().firstName || membro.data().name || 'Aluno'} — ${post.title}`,
      }));
    }
    if (!materiais.length) throw new Error('Nenhum pós-aula dos integrantes nos últimos 90 dias.');
    const nomes = membros.map(item => item.data().firstName || item.data().name || 'Aluno');
    const response = await client.messages.create({
      model, max_tokens:12000,
      system:[{ type:'text', text:
        `Você cria o desafio de uma turma do Science English: ${nomes.join(' e ')} fazem aula JUNTOS. ` +
        'Use SOMENTE fatos linguísticos, vocabulário e contextos presentes nos pós-aulas fornecidos, que são das aulas em comum. ' +
        'As perguntas são as MESMAS para todos os integrantes, então cubra o que a turma viu junto — nada que só um deles tenha estudado. ' +
        'Em CADA parte, produza exatamente 3 perguntas focus=weak e 2 focus=strong. ' +
        'Em CADA parte o formato é exatamente: 3 perguntas format="text", 1 format="trueFalse" e 1 format="multipleChoice". ' +
        FORMAT_RULES.multipleChoice + ' ' + FORMAT_RULES.trueFalse + ' ' + FORMAT_RULES.text + ' ' +
        'Em todos os formatos: uma única resposta inequívoca e explicação pedagógica curta em português. Não copie exercícios literalmente.' }],
      output_config:{ format:{ type:'json_schema', schema:PERSONALIZED_CHALLENGE_SCHEMA } },
      messages:[{ role:'user', content:
        `Turma: ${grupo.name || nomes.join(' e ')}
Integrantes: ${nomes.join(', ')}
Semana: ${weekKey}

` +
        `PÓS-AULAS DAS AULAS EM COMUM:
${materiais.map((item, i) => `[${i + 1}] ${item.title} (${item.date || 'sem data'})
${item.text}`).join('\n\n')}`
      }],
    });
    const text = response.content.find(block => block.type === 'text')?.text;
    if (!text) throw new Error('A IA não devolveu as perguntas da turma.');
    const generated = JSON.parse(text);
    const prepared = [generated.part1, generated.part2].map((questions, partIndex) => {
      if (!Array.isArray(questions) || questions.length !== 5) throw new Error(`Parte ${partIndex + 1} da turma incompleta.`);
      const normalized = questions.map((question, index) => ({
        ...question, id:`g${partIndex + 1}q${index + 1}`,
        type:question.format === 'text' ? 'text' : 'multipleChoice',
      }));
      assertFocusMix(normalized, partIndex + 1);
      assertFormatMix(normalized, partIndex + 1, 'assistido');
      const checked = normalized.map(validateQuestion);
      return { questions:checked.map(item => item.publicQuestion), keys:checked.map(item => item.answerKey) };
    });
    return { prepared, analysis:generated.analysis, usage:response.usage,
      sources:materiais.map(item => ({ id:item.id, title:item.title, date:item.date })) };
  }

  // A mesma rodada é gravada dentro de CADA integrante. Assim o aluno abre e
  // responde pelo caminho de sempre, e cada um tem o próprio gabarito e a
  // própria pontuação — o que muda é que as perguntas são as mesmas.
  async function publishGroupRounds(client, escolaId, groupId, grupo, { force = false, now = new Date() } = {}) {
    const membros = (await Promise.all((grupo.memberUids || []).map(uid => db.doc(`students/${uid}`).get())))
      .filter(snap => snap.exists && snap.data().archived !== true && snap.data().challengeEnabled !== false);
    if (membros.length < 2) return { skipped:'turma-sem-dois-alunos' };

    const weekKey = weekKeyFor(now);
    const schedule = groupScheduleFor(weekKey, groupId);
    const rounds = [schedule.part1, schedule.part2].filter(item => item.closesAt.getTime() >= now.getTime());
    if (!rounds.length) return { skipped:'semana-encerrada' };
    if (!force) {
      const existentes = await Promise.all(rounds.map(item =>
        db.doc(`students/${membros[0].id}/challengeRounds/${item.roundId}`).get()));
      if (existentes.every(snap => snap.exists)) return { skipped:'ja-publicado' };
    }

    const output = await generateForGroup(client, grupo, membros, weekKey);
    const batch = db.batch();
    rounds.forEach(item => {
      const index = item.part - 1;
      membros.forEach(membro => {
        batch.set(membro.ref.collection('challengeRounds').doc(item.roundId), {
          roundId:item.roundId, weekKey, part:item.part, personalized:true,
          groupId, groupName:grupo.name || '', schoolId:escolaId,
          opensAt:item.opensAt, closesAt:item.closesAt,
          questionCount:5, questions:output.prepared[index].questions,
          difficulty:'turma', status:'published', updatedAt:FieldValue.serverTimestamp(),
        });
        batch.set(answerKeyRef(membro.id, item.roundId, true), {
          uid:membro.id, roundId:item.roundId, weekKey, part:item.part, groupId,
          answers:output.prepared[index].keys, analysis:output.analysis,
          sources:output.sources, updatedAt:FieldValue.serverTimestamp(),
        });
      });
    });
    if (registrarUso && output.usage) {
      registrarUso(batch, { tipo:'desafio-turma', uid:membros[0].id, escolaId:escolaId || '',
        uso:output.usage, extra:{ weekKey, groupId, partes:rounds.map(item => item.part) } });
    }
    await batch.commit();
    return { written:rounds.map(item => item.part), membros:membros.length };
  }

  // Criar a dupla tem de fazer o desafio dela aparecer na hora, e não só na leva
  // de domingo — foi o que ele pediu: "assim que for criado, já tem que aparecer
  // no aplicativo deles os dois desafios".
  const gerarDesafioDaTurma = onCall(
    { region:REGION, secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:600, memory:'1GiB' },
    async request => {
      requireAdmin(request, adminEmails);
      if (!Anthropic || !anthropicApiKey) throw new HttpsError('failed-precondition', 'A geração por IA não foi configurada.');
      const schoolId = String(request.data?.schoolId || '').trim();
      const groupId = String(request.data?.groupId || '').trim();
      if (!schoolId || !groupId) throw new HttpsError('invalid-argument', 'Faltou a escola ou a turma.');
      const grupoSnap = await db.doc(`schools/${schoolId}/classGroups/${groupId}`).get();
      if (!grupoSnap.exists) throw new HttpsError('not-found', 'Turma não encontrada.');
      const client = new Anthropic({ apiKey:anthropicApiKey.value() });
      const saida = await publishGroupRounds(client, schoolId, groupId, grupoSnap.data(),
        { force:request.data?.force === true });
      return { ok:true, ...saida };
    }
  );

  // Variante válida que o gabarito não previu ("Chris' father" e "Chris's
  // father" são as duas corretas). Em vez de o aluno perder ponto por isso, o
  // professor dá como certa: corrige a nota dele E ensina o gabarito, para que
  // ninguém mais erre a mesma coisa pelo mesmo motivo.
  const aceitarRespostaDesafio = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const uid = String(request.data?.uid || '').trim();
      const roundId = String(request.data?.roundId || '').trim();
      const questionId = String(request.data?.questionId || '').trim();
      if (!uid || !roundId || !questionId) throw new HttpsError('invalid-argument', 'Faltou aluno, rodada ou pergunta.');

      const resultRef = db.doc(`_challengeResults/${roundId}_${uid}`);
      const resultSnap = await resultRef.get();
      if (!resultSnap.exists) throw new HttpsError('not-found', 'Resultado não encontrado.');
      const detalhes = resultSnap.data().details || [];
      const alvo = detalhes.find(item => item.questionId === questionId);
      if (!alvo) throw new HttpsError('not-found', 'Pergunta não encontrada neste resultado.');

      const novos = detalhes.map(item => item.questionId === questionId
        ? { ...item, score:100, correct:true, parcial:false,
            aceitaPeloProfessor:true, teacherReviewed:true } : item);
      const score = novos.reduce((soma, item) => soma + Number(item.score || 0), 0);

      // O gabarito também aprende: a mesma variante deixa de ser erro para quem
      // ainda vai responder, e some do "erro coletivo" na próxima atualização.
      let noGabarito = false;
      const resposta = String(alvo.answer || '').trim();
      let chaveRef = null;
      let respostasAtualizadas = null;
      if (resposta) {
        const chavePessoal = answerKeyRef(uid, roundId, true);
        const chaveGeral = answerKeyRef(uid, roundId, false);
        const [pessoalSnap, geralSnap] = await Promise.all([chavePessoal.get(), chaveGeral.get()]);
        const chaveSnap = pessoalSnap.exists ? pessoalSnap : geralSnap;
        chaveRef = pessoalSnap.exists ? chavePessoal : geralSnap.exists ? chaveGeral : null;
        if (chaveSnap.exists) {
          const respostas = chaveSnap.data().answers || [];
          respostasAtualizadas = respostas.map(item => item.id === questionId
            ? { ...item, acceptedAnswers:[...new Set([...(item.acceptedAnswers || []), normalizeAnswer(resposta)])].filter(Boolean) }
            : item);
          noGabarito = true;
        }
      }

      const batch = db.batch();
      batch.set(resultRef, {
        details:novos, score, teacherReviewedAt:FieldValue.serverTimestamp(),
        updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
      if (chaveRef && respostasAtualizadas) {
        batch.set(chaveRef, { answers:respostasAtualizadas,
          updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      }
      await batch.commit();

      // A semana já fechada precisa do ranking refeito, senão a posição fica
      // com a nota velha.
      const weekKey = resultSnap.data().weekKey;
      if (weekKey && !resultSnap.data().groupId) {
        const rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        if (rankingSnap.exists) await buildRanking(weekKey);
      }
      return { ok:true, score, noGabarito, jaEstavaCerta:alvo.correct === true };
    }
  );

  // Aviso de abertura de uma parte. O documento de log reserva a vaga antes do
  // envio, então cada aluno recebe este aviso uma única vez por rodada — não
  // importa se quem disparou foi o cron das 8h ou uma publicação atrasada.
  async function notifyRoundOpen(studentDoc, roundId, part) {
    const student = studentDoc.data();
    if (student.archived === true || student.challengeEnabled === false) return false;
    const tokens = [...new Set([student.fcmToken, ...(Array.isArray(student.fcmTokens) ? student.fcmTokens : [])].filter(Boolean))];
    if (!tokens.length) return false;
    const slot = `${roundId}-opening-08`;
    const logRef = studentDoc.ref.collection('challengeReminderLogs').doc(slot);
    const reserved = await db.runTransaction(async tx => {
      const log = await tx.get(logRef);
      if (log.exists) return false;
      tx.create(logRef, { slot, roundId, part, period:'opening', status:'sending', createdAt:FieldValue.serverTimestamp() });
      return true;
    });
    if (!reserved) return false;
    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens,
        notification:{
          title:`Parte ${part} do desafio começou`,
          body:'Você tem 5 perguntas difíceis e personalizadas com base nos seus últimos 90 dias de estudo.',
        },
        data:{ type:'challenge-opening', roundId, part:String(part) },
        webpush:{ headers:{ Urgency:'high' }, fcmOptions:{ link:APP_URL } },
      });
      await logRef.update({ status:'sent', sent:response.successCount, failed:response.failureCount, sentAt:FieldValue.serverTimestamp() });
      return true;
    } catch (error) {
      await logRef.delete().catch(() => {});
      console.error(`Abertura do desafio falhou para ${studentDoc.id}:`, error.message);
      return false;
    }
  }

  // Grava as rodadas de um aluno. Só entra parte que ainda não fechou: quem
  // começa a estudar na quarta não recebe a Parte 1, que já passou — recebe
  // apenas a Parte 2, de quinta a sábado. Se a parte já estiver aberta na hora
  // da gravação, o aviso sai na mesma hora, porque o cron das 8h já passou.
  async function publishStudentRounds(client, studentDoc, weekKey, { force = false, now = new Date() } = {}) {
    const schedule = scheduleFor(weekKey);
    const rounds = [schedule.part1, schedule.part2].filter(item => item.closesAt.getTime() >= now.getTime());
    if (!rounds.length) return { written:[], notified:[], skipped:'semana-encerrada' };
    const existing = await Promise.all(rounds.map(item =>
      studentDoc.ref.collection('challengeRounds').doc(item.roundId).get()
    ));
    const pending = rounds.filter((item, index) =>
      force || !(existing[index].exists && existing[index].data().questionCount === 5));
    if (!pending.length) return { written:[], notified:[], skipped:'ja-publicado' };

    const output = await generateForStudent(client, studentDoc, weekKey);
    const batch = db.batch();
    pending.forEach(item => {
      const index = item.part - 1;
      batch.set(studentDoc.ref.collection('challengeRounds').doc(item.roundId), {
        roundId:item.roundId, weekKey, part:item.part, personalized:true,
        opensAt:item.opensAt, closesAt:item.closesAt,
        questionCount:5, questions:output.prepared[index].questions,
        difficulty:'hard', lookbackDays:LOOKBACK_DAYS,
        status:'published', updatedAt:FieldValue.serverTimestamp(),
      });
      batch.set(answerKeyRef(studentDoc.id, item.roundId, true), {
        uid:studentDoc.id, roundId:item.roundId, weekKey, part:item.part,
        answers:output.prepared[index].keys, analysis:output.analysis, sources:output.sources,
        sourceKind:output.sourceKind, updatedAt:FieldValue.serverTimestamp(),
      });
    });
    // O desafio era a única chamada de IA que não entrava no _apiUsage, então o
    // gasto semanal não aparecia na contabilidade. Vai na mesma gravação das
    // rodadas: se o commit falhar, não fica cobrança registrada sem pergunta.
    if (registrarUso && output.usage) {
      registrarUso(batch, {
        tipo:'desafio', uid:studentDoc.id, escolaId:studentDoc.data().schoolId || '',
        uso:output.usage, extra:{ weekKey, partes:pending.map(item => item.part) },
      });
    }
    await batch.commit();

    const openNow = pending.filter(item => item.opensAt.getTime() <= now.getTime());
    const notified = [];
    for (const item of openNow) {
      if (await notifyRoundOpen(studentDoc, item.roundId, item.part)) notified.push(item.part);
    }
    return { written:pending.map(item => item.part), notified };
  }

  // Monta a semana inteira: cada aluno ativo ganha as duas partes, em blocos de
  // três para não estourar a concorrência da IA. É o mesmo caminho para o botão
  // do painel e para o agendamento de domingo — quem já tem perguntas é pulado,
  // então repetir a chamada não gera nada de novo nem cobra de novo.
  async function runWeeklyGeneration({ weekKey, force = false, requestedBy = '', uids = null, schoolId = '' }) {
    const allStudents = await db.collection('students').get();
    const students = allStudents.docs.filter(doc => {
      const data = doc.data();
      return data.archived !== true && data.challengeEnabled !== false
        && (!uids || uids.has(doc.id)) && (!schoolId || data.schoolId === schoolId);
    });
    if (!students.length) return { ok:false, weekKey, total:0, generated:[], errors:[], reason:'sem-alunos' };

    const schedule = scheduleFor(weekKey);
    const jobRef = db.doc(`_challengeGenerationJobs/${weekKey}`);
    await jobRef.set({ weekKey, status:'running', total:students.length, completed:0, failed:0,
      startedAt:FieldValue.serverTimestamp(), requestedBy });
    const client = new Anthropic({ apiKey:anthropicApiKey.value() });
    const generated = [], errors = [];
    const processStudent = async studentDoc => {
      const studentName = studentDoc.data().name || studentDoc.data().firstName || 'Aluno';
      try {
        const result = await publishStudentRounds(client, studentDoc, weekKey, { force });
        return { kind:'generated', row:result.written.length
          ? { uid:studentDoc.id, name:studentName, parts:result.written }
          : { uid:studentDoc.id, name:studentName, existing:true } };
      } catch (error) {
        console.error(`Desafio personalizado falhou para ${studentDoc.id}:`, error);
        return { kind:'error', row:{ uid:studentDoc.id, name:studentName, error:error.message } };
      }
    };
    for (let index = 0; index < students.length; index += 3) {
      const chunk = students.slice(index, index + 3);
      const results = await Promise.all(chunk.map(processStudent));
      results.forEach(result => (result.kind === 'generated' ? generated : errors).push(result.row));
      await jobRef.set({ completed:generated.length, failed:errors.length,
        lastUid:chunk[chunk.length - 1].id, updatedAt:FieldValue.serverTimestamp() }, { merge:true });
    }
    // As turmas entram na mesma leva. Falha de turma não derruba a semana dos
    // alunos: quem tem dupla continua com o desafio individual de qualquer jeito.
    const turmas = [];
    try {
      const escolas = await db.collection('schools').get();
      for (const escola of escolas.docs) {
        const grupos = await escola.ref.collection('classGroups').get();
        for (const grupo of grupos.docs) {
          const dado = grupo.data();
          if (dado.active === false || dado.automaticChallenge === false) continue;
          try {
            const saida = await publishGroupRounds(client, escola.id, grupo.id, dado, { force });
            if (saida.written) turmas.push({ groupId:grupo.id, name:dado.name || '', parts:saida.written });
          } catch (error) {
            console.error(`Desafio da turma ${grupo.id} falhou:`, error.message);
            errors.push({ groupId:grupo.id, name:dado.name || '', error:error.message });
          }
        }
      }
    } catch (error) { console.error('Desafios de turma:', error.message); }

    if (generated.length) {
      await db.doc(`challengeWeeks/${weekKey}`).set({
        weekKey, title:'Desafio Science English', active:true, personalized:true,
        startsAt:schedule.startsAt, revealAt:schedule.revealAt, endsAt:schedule.endsAt,
        generatedCount:generated.length, expectedCount:students.length,
        updatedAt:FieldValue.serverTimestamp(), publishedBy:requestedBy,
      }, { merge:true });
    }
    await jobRef.set({ status:errors.length ? (generated.length ? 'partial' : 'failed') : 'completed',
      completed:generated.length, failed:errors.length, errors, finishedAt:FieldValue.serverTimestamp() }, { merge:true });
    return { ok:errors.length === 0, weekKey, total:students.length, generated, turmas, errors };
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
      const result = await runWeeklyGeneration({
        weekKey,
        force:request.data?.force === true,
        requestedBy:request.auth.token?.email || '',
        uids:Array.isArray(request.data?.uids) ? new Set(request.data.uids.map(String)) : null,
        schoolId:String(request.data?.schoolId || '').trim(),
      });
      if (result.reason === 'sem-alunos') throw new HttpsError('not-found', 'Nenhum aluno ativo foi encontrado.');
      return result;
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
      // Cada parte é opcional: dá para publicar só as 5 da Parte 1 à mão (sem
      // custo de IA) e deixar a Parte 2 para a geração personalizada.
      const prepared = [data.part1, data.part2].map((questions, partIndex) => {
        if (questions === undefined || questions === null) return null;
        if (!Array.isArray(questions) || questions.length !== 5) {
          throw new HttpsError('invalid-argument', `A Parte ${partIndex + 1} precisa ter exatamente 5 perguntas, ou ficar de fora do JSON.`);
        }
        const checked = questions.map(validateQuestion);
        return {
          questions:checked.map(item => item.publicQuestion),
          keys:checked.map(item => item.answerKey),
        };
      });
      if (!prepared.some(Boolean)) throw new HttpsError('invalid-argument', 'Informe part1, part2, ou as duas.');
      const batch = db.batch();
      batch.set(db.doc(`challengeWeeks/${weekKey}`), {
        weekKey, title:String(data.title || 'Desafio Science English').trim(), active:true,
        startsAt:schedule.startsAt, revealAt:schedule.revealAt, endsAt:schedule.endsAt,
        updatedAt:FieldValue.serverTimestamp(), publishedBy:request.auth.token?.email || '',
      }, { merge:true });
      [schedule.part1, schedule.part2].forEach((roundSchedule, index) => {
        if (!prepared[index]) return;
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
      return { ok:true, weekKey, rounds:[schedule.part1, schedule.part2]
        .filter((_, index) => prepared[index]).map(item => item.roundId) };
    }
  );

  const obterDesafioSemanal = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const quemChamou = requireAuth(request);
      // O César abre o app do aluno pelo espelho do painel. Ali o desafio tem de
      // ser o DO ALUNO — antes vinha o de quem chamou, e como ele não é aluno a
      // chamada quebrava. Só admin pode pedir por outro uid.
      const alvo = String(request.data?.uid || '').trim();
      const adminMirror = Boolean(alvo && adminEmails.includes(request.auth.token?.email || ''));
      const uid = adminMirror ? alvo : quemChamou;
      const studentSnap = await assertStudent(uid);
      const student = studentSnap.data();
      const badgeState = await loadChallengeBadges(uid);
      const now = new Date();
      const weekKey = weekKeyFor(now);
      const schedule = scheduleFor(weekKey);
      const stage = stageFor(now, schedule);
      const weekSnap = await db.doc(`challengeWeeks/${weekKey}`).get();
      const base = {
        enabled:true, weekKey, title:weekSnap.exists ? weekSnap.data().title : 'Desafio Science English',
        phase:weekSnap.exists ? stage.phase : 'unpublished', part:stage.part,
        startsAt:iso(schedule.startsAt), revealAt:iso(schedule.revealAt), endsAt:iso(schedule.endsAt),
        badges:badgeState.badges, pendingBadges:adminMirror ? [] : badgeState.pendingBadges,
      };
      if (!weekSnap.exists) return base;

      if (stage.phase === 'results') {
        let rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        if (!rankingSnap.exists) {
          await buildRanking(weekKey);
          rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        }
        const [resultSnaps, profiles] = await Promise.all([
          Promise.all([1,2].map(part => db.doc(`_challengeResults/${weekKey}-part-${part}_${uid}`).get())),
          loadCurrentStudentProfiles(),
        ]);
        const parts = resultSnaps.filter(snap => snap.exists).map(snap => snap.data()).sort((a,b) => a.part - b.part);
        const ranking = applyCurrentStudentProfiles(rankingSnap.data()?.ranking || [], profiles).map(row => ({
          name:row.name, score:row.score, partsCompleted:row.partsCompleted, position:row.position, isOwn:row.uid === uid,
        }));
        const own = ranking.find(row => row.isOwn) || null;
        return { ...base, resultReady:true, result:{
          score:parts.reduce((sum, part) => sum + Number(part.score || 0), 0),
          maxScore:1000, parts:parts.map(part => ({ part:part.part, score:part.score, details:part.details || [] })),
          position:own?.position || null,
        }, ranking };
      }

      // Quarta vira quinta: a Parte 1 fecha e o resultado dela sai na hora, sem
      // esperar domingo. Quem não respondeu perdeu — a nota é a que ficou.
      if ((stage.phase === 'open' && stage.part === 2) || stage.phase === 'between') {
        try {
          const parte1 = await db.doc(`_challengeResults/${schedule.part1.roundId}_${uid}`).get();
          base.parte1 = parte1.exists
            ? { concluida:true, score:Number(parte1.data().score || 0), maxScore:500,
                details:parte1.data().details || [] }
            : { concluida:false, score:0, maxScore:500, details:[] };
        } catch (error) {
          // Nunca derrubar a tela do desafio por causa do extra: sem isto, uma
          // falha nesta leitura tiraria o desafio do ar para todo mundo.
          console.error('Resultado da Parte 1:', error.message);
        }
      }

      if (stage.phase !== 'open') return base;
      const roundSchedule = stage.part === 1 ? schedule.part1 : schedule.part2;
      const [{ roundSnap }, submissionSnap] = await Promise.all([
        resolveRound(uid, roundSchedule.roundId),
        db.doc(`students/${uid}/challengeSubmissions/${roundSchedule.roundId}`).get(),
      ]);
      // A semana está publicada, mas este aluno ainda não tem perguntas: entrou
      // depois da geração. Ele entra na próxima parte, assim que tiver pós-aula.
      if (!roundSnap.exists) return { ...base, phase:'waiting' };
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
            ...(round.groupId ? { groupId:round.groupId, groupName:round.groupName || '' } : {}),
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
      const [week, part1, part2, generationJob, students] = await Promise.all([
        db.doc(`challengeWeeks/${weekKey}`).get(),
        db.doc(`challengeRounds/${schedule.part1.roundId}`).get(),
        db.doc(`challengeRounds/${schedule.part2.roundId}`).get(),
        db.doc(`_challengeGenerationJobs/${weekKey}`).get(),
        db.collection('students').get(),
      ]);
      const submissionPairs = await Promise.all(students.docs.map(async studentDoc => ({
        part1:await studentDoc.ref.collection('challengeSubmissions').doc(schedule.part1.roundId).get(),
        part2:await studentDoc.ref.collection('challengeSubmissions').doc(schedule.part2.roundId).get(),
      })));
      const completed = part => submissionPairs.filter(pair => pair[part].exists && pair[part].data().completed === true).length;
      return {
        weekKey, published:week.exists,
        personalized:generationJob.exists ? generationJob.data() : null,
        part1:{ published:part1.exists || generationJob.data()?.completed > 0, questions:part1.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), completed:completed('part1') },
        part2:{ published:part2.exists || generationJob.data()?.completed > 0, questions:part2.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), completed:completed('part2') },
      };
    }
  );

  const finalizarDesafioSemanal = onSchedule(
    { region:REGION, schedule:'5 0 * * 0', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => buildRanking(weekKeyFor())
  );

  // O ranking fecha à meia-noite, mas o selo só sai no domingo à noite. Essa
  // janela permite que o professor revise respostas duvidosas sem anunciar um
  // campeão e precisar retirar o troféu depois.
  const premiarCampeoesSemanais = onSchedule(
    { region:REGION, schedule:'0 18 * * 0', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    async () => awardWeeklyBadges(weekKeyFor())
  );

  const concederSelosDesafio = onCall(
    { region:REGION, timeoutSeconds:300, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      return awardWeeklyBadges(weekKey);
    }
  );

  const marcarSelosDesafioVistos = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      const badgeIds = [...new Set((Array.isArray(request.data?.badgeIds) ? request.data.badgeIds : [])
        .map(String).map(item => item.trim()).filter(Boolean).slice(0, 30))];
      if (!badgeIds.length) return { ok:true, updated:0 };
      const refs = badgeIds.map(id => db.doc(`students/${uid}/challengeBadges/${id}`));
      const snaps = await db.getAll(...refs);
      const batch = db.batch();
      const existing = snaps.filter(snap => snap.exists);
      existing.forEach(snap => batch.update(snap.ref, { viewedAt:FieldValue.serverTimestamp() }));
      await batch.commit();
      return { ok:true, updated:existing.length };
    }
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
      await notifyRoundOpen(studentDoc, roundId, stage.part);
    }
  }

  const notificarAberturaDesafio = onSchedule(
    { region:REGION, schedule:'0 8 * * 1,4', timeZone:TIME_ZONE, timeoutSeconds:300, memory:'256MiB' },
    sendOpeningNotifications
  );

  // Aluno que entra no meio da semana (primeira aula na quarta, matrícula no
  // meio do mês) não tinha pós-aula quando a leva da semana foi gerada. Este job
  // roda toda manhã, procura quem ainda está sem perguntas para a parte que está
  // aberta e gera só para essa parte — a parte que já fechou não é recriada.
  // Sem candidato utilizável ele encerra sem chamar a IA, então não gasta nada.
  async function generateLateEntries() {
    if (!Anthropic || !anthropicApiKey) return;
    const now = new Date();
    const weekKey = weekKeyFor(now);
    if (weekKey < LAUNCH_WEEK) return;
    const stage = stageFor(now, scheduleFor(weekKey));
    if (stage.phase !== 'open') return;
    const roundId = stage.part === 1 ? `${weekKey}-part-1` : `${weekKey}-part-2`;

    const settings = await db.doc('challengeSettings/auto').get();
    if (settings.exists && settings.data().lateEntries === false) return;
    if (await semanaManual(weekKey)) return;
    // Com rodada geral publicada todo mundo já está coberto por ela — gerar
    // personalizada por cima seria gastar exatamente o que o JSON economiza.
    const geral = await db.doc(`challengeRounds/${roundId}`).get();
    if (geral.exists) return;

    const students = await db.collection('students').get();
    const waiting = [];
    for (const studentDoc of students.docs) {
      const student = studentDoc.data();
      if (student.archived === true || student.challengeEnabled === false) continue;
      const snap = await studentDoc.ref.collection('challengeRounds').doc(roundId).get();
      if (snap.exists && snap.data().questionCount === 5) continue;
      waiting.push(studentDoc);
    }
    if (!waiting.length) return;

    const client = new Anthropic({ apiKey:anthropicApiKey.value() });
    const generated = [], stillWaiting = [];
    for (const studentDoc of waiting) {
      const name = studentDoc.data().name || studentDoc.data().firstName || 'Aluno';
      try {
        const result = await publishStudentRounds(client, studentDoc, weekKey, { now });
        if (result.written.length) generated.push({ uid:studentDoc.id, name, parts:result.written, notified:result.notified });
      } catch (error) {
        console.error(`Entrada tardia no desafio falhou para ${studentDoc.id}:`, error.message);
        stillWaiting.push({ uid:studentDoc.id, name, reason:error.message });
      }
    }
    await db.doc(`_challengeLateEntries/${weekKey}`).set({
      weekKey, part:stage.part, runAt:FieldValue.serverTimestamp(), generated, stillWaiting,
    }, { merge:true });
  }

  const gerarDesafiosAtrasados = onSchedule(
    { region:REGION, schedule:'0 7 * * *', timeZone:TIME_ZONE,
      secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:1800, memory:'1GiB' },
    generateLateEntries
  );

  // A semana nasce sozinha: domingo 1h da manhã, quando a rodada anterior já
  // fechou e o ranking das 00h05 já saiu. Nessa hora o resultado da semana
  // passada existe, então quem foi muito bem recebe perguntas mais duras — e o
  // César ainda tem o domingo inteiro para revisar antes da Parte 1 abrir na
  // segunda à meia-noite. Quem entrar depois cai no gerarDesafiosAtrasados.
  // Para voltar ao manual, grave weekly:false em challengeSettings/auto.
  // Semana marcada como manual: o César publica o JSON único da turma e a IA
  // não roda, nem na leva de domingo nem no cron de entradas tardias.
  async function semanaManual(weekKey) {
    const settings = await db.doc('challengeSettings/auto').get();
    const manuais = settings.exists ? settings.data().manualWeeks : null;
    return Array.isArray(manuais) && manuais.includes(weekKey);
  }

  async function generateNextWeek() {
    if (!Anthropic || !anthropicApiKey) return;
    const settings = await db.doc('challengeSettings/auto').get();
    if (settings.exists && settings.data().weekly === false) return;
    const weekKey = nextMonday();
    if (await semanaManual(weekKey)) {
      console.log(`Semana ${weekKey} marcada como manual — nada gerado por IA.`);
      return;
    }
    const result = await runWeeklyGeneration({ weekKey, requestedBy:'agendamento de domingo' });
    console.log(`Desafio ${weekKey}: ${result.generated.length} aluno(s) prontos, ${result.errors.length} sem material.`);
  }

  // 1800s é o teto de uma função agendada. A turma inteira roda em blocos de
  // três e leva bem menos que isso; quem sobrar entra no cron diário.
  const gerarDesafioDaSemana = onSchedule(
    { region:REGION, schedule:'0 1 * * 0', timeZone:TIME_ZONE,
      secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:1800, memory:'1GiB' },
    generateNextWeek
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

  // Temporada: a semana isolada esquece tudo na segunda-feira. Aqui a pontuação
  // de cada semana revelada é somada, montando o acumulado e o ranking geral.
  // Sai dos documentos de ranking (um por semana), não dos resultados soltos.
  async function loadSeason(now = new Date()) {
    const [snaps, profiles] = await Promise.all([
      db.collection('challengeRankings').get(),
      loadCurrentStudentProfiles(),
    ]);
    const semanas = [], totais = new Map();
    snaps.docs.forEach(doc => {
      const data = doc.data();
      const revealAt = data.revealAt?.toDate?.() || new Date(data.revealAt);
      if (!(revealAt <= now)) return;                    // semana ainda não revelada
      const rankingAtualizado = applyCurrentStudentProfiles(data.ranking || [], profiles);
      semanas.push({ weekKey:data.weekKey, participantes:data.participantCount || 0,
        ranking:rankingAtualizado });
      rankingAtualizado.forEach(row => {
        const atual = totais.get(row.uid) || { uid:row.uid, name:row.name || 'Aluno', total:0, semanas:0, melhor:null };
        atual.total += Number(row.score || 0);
        atual.semanas += 1;
        if (row.name) atual.name = row.name;
        if (atual.melhor === null || row.position < atual.melhor) atual.melhor = row.position;
        totais.set(row.uid, atual);
      });
    });
    semanas.sort((a, b) => b.weekKey.localeCompare(a.weekKey));
    const geral = rankByScore([...totais.values()], 'total');
    return { semanas, geral };
  }

  function rankingAcumulado(semanas) {
    const totais = new Map();
    semanas.forEach(semana => (semana.ranking || []).forEach(row => {
      const atual = totais.get(row.uid) || {
        uid:row.uid, name:row.name || 'Aluno', score:0, semanas:0,
      };
      atual.score += Number(row.score || 0);
      atual.semanas += 1;
      if (row.name) atual.name = row.name;
      totais.set(row.uid, atual);
    }));
    return rankByScore([...totais.values()]);
  }

  async function rankingParcialDaSemana(weekKey) {
    const [resultSnaps, studentSnaps] = await Promise.all([
      db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
      db.collection('students').get(),
    ]);
    const totais = new Map();
    // O cadastro só serve para completar nome e foto. A pessoa entra no
    // ranking apenas quando existe resultado de pelo menos uma parte.
    const alunos = new Map();
    studentSnaps.docs.forEach(doc => {
      const data = doc.data();
      if (data.archived === true || data.challengeEnabled === false) return;
      alunos.set(doc.id, { name:data.name || data.firstName || 'Aluno', photo:data.photo || '' });
    });
    resultSnaps.docs.forEach(doc => {
      const result = doc.data();
      if (result.groupId) return;
      const cadastro = alunos.get(result.uid) || {};
      const atual = totais.get(result.uid) || {
        uid:result.uid, name:cadastro.name || result.studentName || 'Aluno',
        photo:cadastro.photo || '', score:0, part1Score:0, part2Score:0, partsCompleted:0,
      };
      atual.score += Number(result.score || 0);
      if (Number(result.part) === 1) atual.part1Score += Number(result.score || 0);
      if (Number(result.part) === 2) atual.part2Score += Number(result.score || 0);
      atual.partsCompleted += 1;
      if (cadastro.name) atual.name = cadastro.name;
      totais.set(result.uid, atual);
    });
    return { ranking:rankByScore([...totais.values()]), resultSnaps };
  }

  const obterTemporadaDesafio = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const quemChamou = requireAuth(request);
      const alvo = String(request.data?.uid || '').trim();
      // Repete a mesma regra do estado semanal: somente administradores podem
      // consultar a temporada de outro UID, usada pelo modo espelho.
      const adminMirror = Boolean(alvo && adminEmails.includes(request.auth.token?.email || ''));
      const uid = adminMirror ? alvo : quemChamou;
      await assertStudent(uid);
      const now = new Date();
      const currentWeekKey = weekKeyFor(now);
      const [{ semanas:fechadas }, parcial, meusResultados] = await Promise.all([
        loadSeason(now),
        rankingParcialDaSemana(currentWeekKey),
        db.collection('_challengeResults').where('uid', '==', uid).get(),
      ]);
      const semanaJaFechou = fechadas.some(semana => semana.weekKey === currentWeekKey);
      const semanasFechadas = fechadas.map(semana => ({ ...semana,
        ranking:rankByScore(semana.ranking || []),
      }));
      const semanasBase = semanaJaFechou ? semanasFechadas : [{
        weekKey:currentWeekKey, participantes:parcial.ranking.length,
        ranking:parcial.ranking, partial:true,
      }, ...semanasFechadas];
      // Também normaliza documentos antigos, gravados antes da regra de empate
      // denso, para a interface nunca mostrar dois critérios de posição.
      const semanas = semanasBase.map(semana => ({ ...semana,
        ranking:rankByScore(semana.ranking || []),
      }));
      const currentMonth = currentWeekKey.slice(0, 7);
      const currentYear = currentWeekKey.slice(0, 4);
      const semanaRankingCompleto = (semanas.find(item => item.weekKey === currentWeekKey)?.ranking || []);
      // Até o fechamento de domingo, ninguém recebe nomes ou notas dos colegas.
      // O aluno vê somente a própria posição; se houver empate, recebe apenas a
      // quantidade de pessoas escondidas naquela mesma colocação.
      const minhaLinhaSemanal = semanaRankingCompleto.find(row => row.uid === uid);
      const semanaRanking = (semanaJaFechou || adminMirror) ? semanaRankingCompleto : (minhaLinhaSemanal ? [{
        ...minhaLinhaSemanal,
        hiddenPeers:Math.max(0, semanaRankingCompleto.filter(row => row.position === minhaLinhaSemanal.position).length - 1),
      }] : []);
      // Mês, ano e geral também ignoram a semana ainda aberta. Caso contrário,
      // a diferença no acumulado denunciaria quanto cada colega já pontuou.
      const semanasParaRanking = adminMirror ? semanas : semanasFechadas;
      const mesRanking = rankingAcumulado(semanasParaRanking.filter(item => item.weekKey.startsWith(currentMonth)));
      const anoRanking = rankingAcumulado(semanasParaRanking.filter(item => item.weekKey.startsWith(currentYear)));
      const geral = rankingAcumulado(semanasParaRanking);

      const desempenho = new Map();
      const erros = new Map();
      const weekKeysFechadas = new Set(semanasFechadas.map(semana => semana.weekKey));
      meusResultados.docs.forEach(doc => {
        const result = doc.data();
        if (result.groupId || !weekKeysFechadas.has(result.weekKey)) return;
        const linha = desempenho.get(result.weekKey) || { weekKey:result.weekKey, score:0, acertos:0, erros:0 };
        linha.score += Number(result.score || 0);
        (result.details || []).forEach(detail => {
          if (detail.correct) linha.acertos += 1;
          else {
            linha.erros += 1;
            const tema = String(detail.topic || detail.prompt || 'Revisão geral').trim();
            erros.set(tema, Number(erros.get(tema) || 0) + 1);
          }
        });
        desempenho.set(result.weekKey, linha);
      });
      const evolucao = [...desempenho.values()].sort((a, b) => a.weekKey.localeCompare(b.weekKey));
      const acertos = evolucao.reduce((sum, row) => sum + row.acertos, 0);
      const totalErros = evolucao.reduce((sum, row) => sum + row.erros, 0);
      const respondidas = acertos + totalErros;
      const melhoresPosicoes = semanasFechadas.map(semana => (semana.ranking || [])
        .find(row => row.uid === uid)?.position).filter(Number.isFinite);
      const publicRanking = ranking => ranking.map(row => ({
        name:row.name, photo:row.photo || parcial.ranking.find(item => item.uid === row.uid)?.photo || '',
        score:Number(row.score || 0), semanas:Number(row.semanas || 0),
        ...(row.part1Score != null || row.part2Score != null ? {
          part1Score:Number(row.part1Score || 0), part2Score:Number(row.part2Score || 0),
        } : {}),
        position:row.position, isOwn:row.uid === uid,
        ...(row.hiddenPeers ? { hiddenPeers:Number(row.hiddenPeers) } : {}),
      }));
      const badgeState = await loadChallengeBadges(uid);
      return {
        badges:badgeState.badges,
        minhasSemanas:semanasFechadas.map(semana => {
          const linha = (semana.ranking || []).find(row => row.uid === uid);
          return linha ? { weekKey:semana.weekKey, score:linha.score,
            position:linha.position, partesFeitas:linha.partsCompleted,
            participantes:semana.participantes } : null;
        }).filter(Boolean),
        rankings:{
          semana:{ label:'Esta semana', partial:!semanaJaFechou,
            private:!semanaJaFechou && !adminMirror, rows:publicRanking(semanaRanking) },
          mes:{ label:'Este mês', rows:publicRanking(mesRanking) },
          ano:{ label:'Este ano', rows:publicRanking(anoRanking) },
        },
        geral:geral.map(row => ({ name:row.name, total:row.score, semanas:row.semanas,
          position:row.position, isOwn:row.uid === uid })),
        meuTotal:geral.find(row => row.uid === uid)?.score || 0,
        minhaPosicao:geral.find(row => row.uid === uid)?.position || null,
        melhorPosicao:melhoresPosicoes.length ? Math.min(...melhoresPosicoes) : null,
        analytics:{
          respondidas, acertos, erros:totalErros,
          percentualErro:respondidas ? Math.round(totalErros * 100 / respondidas) : 0,
          evolucao,
          principaisErros:[...erros.entries()].map(([tema, quantidade]) => ({ tema, quantidade }))
            .sort((a, b) => b.quantidade - a.quantidade).slice(0, 5),
        },
      };
    }
  );

  // Reaplica a regra proporcional aos resultados já gravados. É uma ação
  // administrativa explícita: útil quando a régua de correção escrita muda.
  const recalcularPontuacaoDesafio = onCall(
    { region:REGION, timeoutSeconds:120, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      const snaps = await db.collection('_challengeResults').where('weekKey', '==', weekKey).get();
      const preparados = await Promise.all(snaps.docs.map(async doc => {
        const result = doc.data();
        const roundId = String(result.roundId || '');
        const [pessoal, geral] = roundId ? await Promise.all([
          answerKeyRef(result.uid, roundId, true).get(),
          answerKeyRef(result.uid, roundId, false).get(),
        ]) : [{ exists:false }, { exists:false }];
        const keySnap = pessoal.exists ? pessoal : geral;
        const keys = new Map((keySnap.data?.()?.answers || []).map(item => [item.id, item]));
        const details = (result.details || []).map(item => {
          // A decisão explícita do professor é final: um recálculo nunca pode
          // retirar os pontos, a posição ou um selo que já foram confirmados.
          if (item.teacherReviewed === true || item.aceitaPeloProfessor === true) {
            return { ...item, score:100, correct:true, parcial:false };
          }
          if (item.type === 'multipleChoice') {
            return { ...item, score:item.correct === true ? 100 : Number(item.score || 0),
              correct:item.correct === true };
          }
          const key = keys.get(item.questionId) || {};
          const acceptedAnswers = Array.isArray(key.acceptedAnswers) && key.acceptedAnswers.length
            ? key.acceptedAnswers : [key.expected || item.expected];
          const score = scoreWrittenAnswer(item.answer, acceptedAnswers);
          const next = { ...item, score, correct:score === 100 };
          if (score > 0 && score < 100) next.parcial = true;
          else delete next.parcial;
          return next;
        });
        const score = details.reduce((sum, item) => sum + Number(item.score || 0), 0);
        return { doc, result, details, score };
      }));
      const batch = db.batch();
      const atualizados = [];
      preparados.forEach(({ doc, result, details, score }) => {
        batch.set(doc.ref, { details, score, rescoredAt:FieldValue.serverTimestamp() }, { merge:true });
        atualizados.push({ uid:result.uid, name:result.studentName || 'Aluno',
          part:Number(result.part || 0), before:Number(result.score || 0), score });
      });
      if (snaps.size) await batch.commit();
      const rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
      if (rankingSnap.exists) await buildRanking(weekKey);
      return { ok:true, weekKey, documents:snaps.size, atualizados };
    }
  );

  // Visão do professor: como foi a semana, quem pontuou e — o mais útil — qual
  // pergunta a turma errou junto, que vira pauta de aula.
  const obterResultadoDesafioAdmin = onCall(
    { region:REGION, timeoutSeconds:120, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      const [resultSnaps, rankingSnap, season] = await Promise.all([
        db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
        db.doc(`challengeRankings/${weekKey}`).get(),
        loadSeason(),
      ]);

      // O tema de cada pergunta mora no gabarito, não no resultado gravado. Sem
      // ele não dá para somar o erro da turma: com rodada personalizada cada
      // aluno vê uma frase diferente do mesmo assunto, e o assunto é a pauta.
      const gabaritos = new Map();
      await Promise.all(resultSnaps.docs.map(async doc => {
        const { roundId, uid } = doc.data();
        if (!roundId) return;
        const [pessoal, geral] = await Promise.all([
          db.doc(`_challengeAnswerKeys/${roundId}_${uid}`).get(),
          db.doc(`_challengeAnswerKeys/${roundId}`).get(),
        ]);
        const respostas = (pessoal.exists ? pessoal : geral).data()?.answers || [];
        gabaritos.set(doc.id, new Map(respostas.map(resposta => [resposta.id, resposta])));
      }));

      const perguntas = new Map();
      const temas = new Map();
      const alunos = new Map();
      resultSnaps.docs.forEach(doc => {
        const resultado = doc.data();
        if (resultado.groupId) return; // rodada de turma tem lugar próprio
        const gabarito = gabaritos.get(doc.id) || new Map();
        const quem = resultado.studentName || 'Aluno';
        const aluno = alunos.get(resultado.uid) || {
          uid:resultado.uid, name:quem, score:0, part1Score:0, part2Score:0,
          partes:0, acertos:0, erros:0 };
        aluno.score += Number(resultado.score || 0);
        if (Number(resultado.part) === 1) aluno.part1Score += Number(resultado.score || 0);
        if (Number(resultado.part) === 2) aluno.part2Score += Number(resultado.score || 0);
        aluno.partes += 1;
        (resultado.details || []).forEach(item => {
          const chaveItem = gabarito.get(item.questionId) || {};
          const temaOriginal = String(item.topic || chaveItem.topic || '').trim();
          const tema = canonicalChallengeTopic(temaOriginal);
          if (item.correct) aluno.acertos += 1; else aluno.erros += 1;

          // Agrupa pelo enunciado, não pelo id. Rodada personalizada dá o mesmo
          // id (p1q1) para perguntas diferentes, então agrupar por id juntava
          // quem errou uma coisa com quem acertou outra, na mesma linha.
          const chave = `${resultado.part}|${normalizeAnswer(item.prompt)}|${normalizeAnswer(item.context || '')}`;
          const pergunta = perguntas.get(chave) || { part:resultado.part, prompt:item.prompt,
            context:item.context || '', expected:item.expected || '',
            explanation:item.explanation || chaveItem.explanation || '', tema,
            acertos:0, erros:0, respostas:[] };
          if (item.correct) pergunta.acertos += 1; else pergunta.erros += 1;
          pergunta.respostas.push({ aluno:quem, resposta:String(item.answer || '').trim(), acertou:item.correct === true,
            score:Number(item.score || 0), parcial:item.parcial === true,
            uid:resultado.uid, roundId:resultado.roundId || '', questionId:item.questionId || '' });
          perguntas.set(chave, pergunta);

          if (!tema) return;
          const linha = temas.get(tema) || { tema, acertos:0, erros:0, quemErrou:[] };
          if (item.correct) linha.acertos += 1;
          else { linha.erros += 1; if (!linha.quemErrou.includes(quem)) linha.quemErrou.push(quem); }
          temas.set(tema, linha);
        });
        alunos.set(resultado.uid, aluno);
      });

      // Dentro da pergunta, quem errou primeiro: é o que o professor procura.
      const comRespostasEmOrdem = pergunta => ({ ...pergunta,
        respostas:pergunta.respostas.sort((a, b) => a.acertou === b.acertou
          ? a.aluno.localeCompare(b.aluno, 'pt-BR') : (a.acertou ? 1 : -1)) });

      return {
        weekKey,
        revelado:rankingSnap.exists,
        ranking:(rankingSnap.data()?.ranking || []),
        alunos:[...alunos.values()].sort((a, b) => b.score - a.score),
        perguntas:[...perguntas.values()].map(comRespostasEmOrdem)
          .sort((a, b) => b.erros - a.erros || a.part - b.part),
        temas:[...temas.values()].sort((a, b) => b.erros - a.erros
          || (b.erros + b.acertos) - (a.erros + a.acertos)
          || a.tema.localeCompare(b.tema, 'pt-BR')),
        temporada:season.geral.map(row => ({ name:row.name, total:row.total,
          semanas:row.semanas, position:row.position })),
      };
    }
  );

  // O painel precisa ver pergunta E gabarito juntos, e o gabarito mora numa
  // coleção sem regra de leitura — fechada inclusive para o admin, para nenhum
  // aluno conseguir puxar as respostas. Por isso a revisão passa por aqui.
  const obterPerguntasDesafio = onCall(
    { region:REGION, timeoutSeconds:120, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      const uid = String(request.data?.uid || '').trim();
      const schedule = scheduleFor(weekKey);

      if (!uid) {
        const students = await db.collection('students').get();
        const linhas = [];
        for (const studentDoc of students.docs) {
          const student = studentDoc.data();
          if (student.archived === true || student.challengeEnabled === false) continue;
          const [round1, round2, sub1, sub2] = await Promise.all([
            resolveRound(studentDoc.id, schedule.part1.roundId),
            resolveRound(studentDoc.id, schedule.part2.roundId),
            studentDoc.ref.collection('challengeSubmissions').doc(schedule.part1.roundId).get(),
            studentDoc.ref.collection('challengeSubmissions').doc(schedule.part2.roundId).get(),
          ]);
          const resolved = [round1, round2].filter(item => item.roundSnap.exists);
          linhas.push({ uid:studentDoc.id, name:student.name || student.firstName || 'Aluno',
            level:student.level || '', prontas:resolved.length,
            gerais:resolved.filter(item => !item.personalized).length,
            iniciadas:[sub1, sub2].filter(snap => snap.exists).length });
        }
        return { weekKey, students:linhas.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')) };
      }

      const partes = [];
      for (const item of [schedule.part1, schedule.part2]) {
        const [{ roundSnap, personalized }, submissionSnap] = await Promise.all([
          resolveRound(uid, item.roundId),
          db.doc(`students/${uid}/challengeSubmissions/${item.roundId}`).get(),
        ]);
        if (!roundSnap.exists) { partes.push({ part:item.part, roundId:item.roundId, publicada:false }); continue; }
        const keySnap = await answerKeyRef(uid, item.roundId, personalized).get();
        const chaves = new Map((keySnap.data()?.answers || []).map(answer => [answer.id, answer]));
        partes.push({
          part:item.part, roundId:item.roundId, publicada:true, personalizada:personalized,
          travada:submissionSnap.exists,
          abre:iso(item.opensAt), fecha:iso(item.closesAt),
          questions:(roundSnap.data().questions || []).map(question => ({ ...question, ...(chaves.get(question.id) || {}) })),
        });
      }
      return { weekKey, uid, partes };
    }
  );

  // Troca UMA pergunta, mantendo as outras quatro. O tema é opcional: sem ele a
  // IA só refaz no mesmo grau de dificuldade e no mesmo foco da original.
  const regerarPerguntaDesafio = onCall(
    { region:REGION, secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:300, memory:'512MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      if (!Anthropic || !anthropicApiKey) throw new HttpsError('failed-precondition', 'A geração por IA não foi configurada.');
      const uid = String(request.data?.uid || '').trim();
      const roundId = String(request.data?.roundId || '').trim();
      const questionId = String(request.data?.questionId || '').trim();
      const tema = String(request.data?.tema || '').trim().slice(0, 300);
      if (!uid || !roundId || !questionId) throw new HttpsError('invalid-argument', 'Faltou aluno, rodada ou pergunta.');

      const studentDoc = await db.doc(`students/${uid}`).get();
      if (!studentDoc.exists) throw new HttpsError('not-found', 'Aluno não encontrado.');
      const roundRef = db.doc(`students/${uid}/challengeRounds/${roundId}`);
      const [roundSnap, keySnap, submissionSnap] = await Promise.all([
        roundRef.get(), answerKeyRef(uid, roundId, true).get(),
        db.doc(`students/${uid}/challengeSubmissions/${roundId}`).get(),
      ]);
      if (!roundSnap.exists) throw new HttpsError('not-found', 'Esta rodada ainda não foi publicada.');
      // Trocar pergunta de rodada já começada deixaria a resposta do aluno
      // pendurada num enunciado que não existe mais.
      if (submissionSnap.exists) throw new HttpsError('failed-precondition', 'O aluno já começou esta parte — não dá para trocar a pergunta agora.');

      const questions = roundSnap.data().questions || [];
      const index = questions.findIndex(question => question.id === questionId);
      if (index < 0) throw new HttpsError('not-found', 'Pergunta não encontrada nesta rodada.');
      const chaves = keySnap.data()?.answers || [];
      const chaveAtual = chaves.find(answer => answer.id === questionId) || {};
      const formatoOriginal = formatOf(questions[index]);

      const input = await personalizationInput(studentDoc);
      const materials = input.posts.length ? input.posts : input.activityMaterials;
      if (!materials.length) throw new HttpsError('failed-precondition', 'Sem material recente deste aluno para gerar outra pergunta.');

      const student = studentDoc.data();
      const client = new Anthropic({ apiKey:anthropicApiKey.value() });
      const response = await client.messages.create({
        model, max_tokens:2000,
        system:[{ type:'text', text:
          'Você reescreve UMA pergunta de um desafio de inglês. Use somente fatos linguísticos, vocabulário e contextos presentes nos materiais fornecidos. ' +
          `${FORMAT_RULES[formatoOriginal]} Uma única resposta inequívoca e explicação pedagógica curta em português. ` +
          'A nova pergunta não pode repetir a que está sendo trocada nem nenhuma das outras da rodada. ' +
          'Mantenha o mesmo grau de dificuldade e o mesmo foco da original, a menos que o professor peça outra coisa.' }],
        output_config:{ format:{ type:'json_schema', schema:SINGLE_QUESTION_SCHEMA } },
        messages:[{ role:'user', content:
          `Aluno: ${student.name || 'Aluno'}\nNível: ${student.level || 'não informado'}\n` +
          `Foco da pergunta original: ${chaveAtual.focus || 'weak'}\n` +
          (tema ? `PEDIDO DO PROFESSOR: ${tema}\n` : '') +
          `\nPERGUNTA A SUBSTITUIR:\n${JSON.stringify({ ...questions[index], ...chaveAtual })}\n\n` +
          `OUTRAS PERGUNTAS DA RODADA (não repita nenhuma):\n${JSON.stringify(questions.filter((_, i) => i !== index).map(question => `${question.prompt} ${question.context || ''}`))}\n\n` +
          `MATERIAIS DE ESTUDO:\n${materials.map((item, i) => `[${i + 1}] ${item.title}\n${item.text}`).join('\n\n')}`
        }],
      });
      const text = response.content.find(block => block.type === 'text')?.text;
      if (!text) throw new HttpsError('internal', 'A IA não devolveu a pergunta.');
      const { publicQuestion, answerKey } = validateQuestion(
        { ...JSON.parse(text), id:questionId, type:formatoOriginal === 'text' ? 'text' : 'multipleChoice' }, index);

      const batch = db.batch();
      batch.set(roundRef, {
        questions:questions.map((question, i) => i === index ? publicQuestion : question),
        updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
      batch.set(answerKeyRef(uid, roundId, true), {
        answers:chaves.some(answer => answer.id === questionId)
          ? chaves.map(answer => answer.id === questionId ? answerKey : answer)
          : [...chaves, answerKey],
        updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
      if (registrarUso && response.usage) {
        registrarUso(batch, { tipo:'desafio-pergunta', uid, escolaId:student.schoolId || '',
          uso:response.usage, extra:{ roundId, questionId } });
      }
      await batch.commit();
      return { ok:true, question:{ ...publicQuestion, ...answerKey } };
    }
  );

  return {
    publicarDesafioSemanal, gerarDesafiosPersonalizados, obterDesafioSemanal, iniciarDesafioSemanal,
    obterPerguntasDesafio, regerarPerguntaDesafio,
    obterTemporadaDesafio, obterResultadoDesafioAdmin,
    recalcularPontuacaoDesafio,
    salvarRespostaDesafio, obterStatusDesafioAdmin, finalizarDesafioSemanal,
    notificarAberturaDesafio, lembrarDesafioManha, lembrarDesafioNoite,
    gerarDesafiosAtrasados, gerarDesafioDaSemana, gerarDesafioDaTurma,
    aceitarRespostaDesafio, premiarCampeoesSemanais, concederSelosDesafio,
    marcarSelosDesafioVistos,
  };
}

export const challengeInternals = Object.freeze({
  localDateParts, addDays, weekKeyFor, nextMonday, scheduleFor, stageFor,
  normalizeAnswer, canonicalChallengeTopic, validateQuestion, scoreWrittenAnswer, scoreAnswers, dateFrom, assertFocusMix,
  assertFormatMix, formatOf, FORMAT_MIX, FORMAT_THRESHOLD, groupScheduleFor,
});
