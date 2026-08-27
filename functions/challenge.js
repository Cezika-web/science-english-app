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
    + 'Em exercícios com lacuna, aceite obrigatoriamente só a palavra ou trecho que entra na lacuna; nos demais, '
    + 'peça uma resposta curta o suficiente para ser digitada em 45 segundos no celular. A pergunta precisa admitir uma única construção '
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

// A semana pertence ao mês onde cai a quinta-feira. Assim 31/08–06/09 é a
// primeira semana de setembro, e 28/09–04/10 já abre outubro.
function monthKeyForWeek(weekKey) {
  return addDays(weekKey, 3).slice(0, 7);
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

// Mesmo rodadas antigas podem ter `hint` gravado. O aluno nunca deve receber
// esse campo: além de a tela ignorá-lo, removemos a propriedade na resposta do
// servidor para uma dica legada não reaparecer por engano no futuro.
function publicChallengeQuestions(questions) {
  return (Array.isArray(questions) ? questions : []).map(question => {
    const { hint, ...publicQuestion } = question || {};
    return publicQuestion;
  });
}

// Em exercícios de lacuna, responder somente o que falta é uma resposta completa.
// Além de orientar o gerador, inferimos o trecho ausente a partir da frase-modelo
// para proteger o aluno quando um pacote trouxer apenas a sentença inteira no gabarito.
function acceptedAnswersWithBlankFragments(question, acceptedAnswers) {
  const answers = [...new Set((acceptedAnswers || []).map(normalizeAnswer).filter(Boolean))];
  const source = `${String(question?.prompt || '')}\n${String(question?.context || '')}`;
  const blank = /_{2,}|\[\s*blank\s*\]/i.exec(source);
  if (!blank) return answers;

  const before = source.slice(0, blank.index);
  const after = source.slice(blank.index + blank[0].length).replace(/^\s*\([^)]*\)/, '');
  const left = answerTokens(before);
  const right = answerTokens(after);
  const candidates = [...new Set([...answers, normalizeAnswer(question?.expected)].filter(Boolean))];

  candidates.forEach(candidate => {
    const expected = answerTokens(candidate);
    if (expected.length < 2) return;
    let leftMatch = 0;
    for (let size = 1; size < expected.length && size <= left.length; size += 1) {
      if (left.slice(-size).every((token, index) => token === expected[index])) leftMatch = size;
    }
    let rightMatch = 0;
    for (let size = 1; size < expected.length - leftMatch && size <= right.length; size += 1) {
      const expectedSuffix = expected.slice(expected.length - size);
      if (right.slice(0, size).every((token, index) => token === expectedSuffix[index])) rightMatch = size;
    }
    const fragment = expected.slice(leftMatch, expected.length - rightMatch).join(' ');
    if (fragment && (leftMatch > 0 || rightMatch > 0)) answers.push(fragment);
  });
  return [...new Set(answers)];
}

function assertRequiredReferences(question, expected, index) {
  const source = normalizeAnswer(`${question?.prompt || ''} ${question?.context || ''}`);
  const answer = normalizeAnswer(expected);
  const requirements = [
    {
      source:/\b(?:do seu amigo|da sua amiga)\b/,
      answer:/\b(?:your friend's|of your friend)\b/,
      label:"a relação possessiva 'do seu amigo/da sua amiga'",
    },
    {
      source:/\b(?:dos seus amigos|das suas amigas)\b/,
      answer:/\b(?:your friends'|of your friends)\b/,
      label:"a relação possessiva 'dos seus amigos/das suas amigas'",
    },
  ];
  const missing = requirements.find(item => item.source.test(source) && !item.answer.test(answer));
  if (missing) {
    throw new HttpsError('invalid-argument',
      `Pergunta ${index + 1}: a resposta esperada perdeu ${missing.label}.`);
  }
}

function validateQuestion(question, index) {
  const id = String(question?.id || `q${index + 1}`).trim();
  const prompt = String(question?.prompt || '').trim();
  const context = String(question?.context || '').trim();
  const hint = String(question?.hint || '').trim();
  const type = question?.type === 'text' ? 'text' : 'multipleChoice';
  if (!id || !prompt) throw new HttpsError('invalid-argument', `Pergunta ${index + 1} sem id ou enunciado.`);
  // O desafio mede recuperação ativa. Dicas gramaticais antes da resposta
  // entregam justamente o raciocínio que o aluno precisa demonstrar.
  if (hint) {
    throw new HttpsError('invalid-argument', `Pergunta ${index + 1}: o campo hint precisa ficar vazio.`);
  }
  const explicitScaffolding = [
    /\b(base form|past participle|present participle|present perfect|past perfect|simple past|simple present|active causative|passive causative|causative|infinitive|gerund|auxiliary verb|modal verb)\b/i,
    /\b(forma base|partic[ií]pio passado|partic[ií]pio presente|presente perfeito|passado perfeito|passado simples|presente simples|causativo|infinitivo|ger[uú]ndio|verbo auxiliar|verbo modal)\b/i,
  ];
  if (explicitScaffolding.some(pattern => pattern.test(prompt))) {
    throw new HttpsError('invalid-argument',
      `Pergunta ${index + 1}: o enunciado não pode dar uma dica gramatical explícita.`);
  }
  const translation = /\b(translate|traduza|tradução)\b/i.test(prompt);
  if (translation && (!context || /^(situa[cç][aã]o|contexto)\s*:/i.test(context))) {
    throw new HttpsError('invalid-argument',
      `Pergunta ${index + 1}: coloque em context a frase exata que será traduzida, não uma descrição da situação.`);
  }

  const focus = question?.focus === 'strong' ? 'strong' : question?.focus === 'weak' ? 'weak' : '';
  const topic = String(question?.topic || '').trim();
  const publicQuestion = { id, type, prompt, context };
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
    const acceptedAnswers = acceptedAnswersWithBlankFragments(question,
      Array.isArray(question?.acceptedAnswers) ? question.acceptedAnswers : [question?.expected]);
    if (!acceptedAnswers.length) throw new HttpsError('invalid-argument', `Pergunta ${index + 1} não tem resposta esperada.`);
    answerKey.acceptedAnswers = [...new Set(acceptedAnswers)];
  }
  assertRequiredReferences(question, answerKey.expected, index);
  return { publicQuestion, answerKey };
}

function prepareManualStudentChallenge(student, position = 0) {
  const uid = String(student?.uid || '').trim();
  if (!uid) throw new HttpsError('invalid-argument', `Aluno ${position + 1} sem UID.`);
  const prepared = [student?.part1, student?.part2].map((questions, partIndex) => {
    if (!Array.isArray(questions) || questions.length !== 5) {
      throw new HttpsError('invalid-argument',
        `${student?.studentName || uid}: a Parte ${partIndex + 1} precisa ter exatamente 5 perguntas.`);
    }
    const normalized = questions.map((question, questionIndex) => ({
      ...question,
      id:String(question?.id || `p${partIndex + 1}q${questionIndex + 1}`).trim(),
      type:question?.type === 'text' ? 'text' : 'multipleChoice',
    }));
    const ids = normalized.map(question => question.id);
    if (new Set(ids).size !== ids.length) {
      throw new HttpsError('invalid-argument',
        `${student?.studentName || uid}: há IDs repetidos na Parte ${partIndex + 1}.`);
    }
    try {
      assertFocusMix(normalized, partIndex + 1);
      const formats = normalized.map(formatOf);
      const text = formats.filter(item => item === 'text').length;
      const trueFalse = formats.filter(item => item === 'trueFalse').length;
      const multipleChoice = formats.filter(item => item === 'multipleChoice').length;
      const supported = (text === 5 && trueFalse === 0 && multipleChoice === 0)
        || (text === 3 && trueFalse === 1 && multipleChoice === 1);
      if (!supported) throw new Error('use 5 escritas, ou 3 escritas + 1 verdadeiro/falso + 1 múltipla escolha');
    } catch (error) {
      throw new HttpsError('invalid-argument',
        `${student?.studentName || uid}, Parte ${partIndex + 1}: ${error.message}`);
    }
    const checked = normalized.map(validateQuestion);
    return {
      questions:checked.map(item => item.publicQuestion),
      keys:checked.map(item => item.answerKey),
    };
  });
  return {
    uid,
    studentName:String(student?.studentName || '').trim(),
    analysis:student?.analysis && typeof student.analysis === 'object' ? student.analysis : {},
    prepared,
  };
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

function contiguousSubsequence(needle, haystack) {
  if (!needle.length || haystack.length < needle.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((token, index) => token === haystack[start + index])) return true;
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
  // Se a resposta esperada aparece inteira e em sequência, o restante pode ser
  // contexto legítimo: "I haven't tried it, but it looks delicious" contém a
  // resposta correta mesmo tendo uma negação em outra oração. Para sequências
  // não contíguas, a polaridade ainda protege contra "I do not like it".
  return contiguousSubsequence(expected, response)
    || (polarityOf(response) === polarityOf(expected) && orderedSubsequence(expected, response));
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
      ...(question.type === 'multipleChoice' ? {
        selectedOptionId:value,
        options:(question.options || []).map(option => ({ id:option.id, text:option.text })),
      } : {}),
      score, correct, ...(score > 0 && score < 100 ? { parcial:true } : {}),
    };
  });
}

const TEACHER_SCORE_TAGS = new Set([
  'erro_foco', 'erro_secundario', 'conteudo_recente',
  'dificuldade_recorrente', 'resposta_incompleta', 'criterio_professor',
]);

function withTeacherScore(item, value, metadata = {}) {
  const score = Math.max(0, Math.min(100, Math.round(Number(value))));
  const next = { ...item, score, correct:score === 100, teacherScore:score,
    teacherReviewed:true, manualScore:true };
  if (Object.prototype.hasOwnProperty.call(metadata, 'tag')) next.teacherScoreTag = metadata.tag || '';
  if (Object.prototype.hasOwnProperty.call(metadata, 'reason')) next.teacherScoreReason = metadata.reason || '';
  if (metadata.at) next.teacherScoreAt = metadata.at;
  if (score > 0 && score < 100) next.parcial = true;
  else delete next.parcial;
  if (score < 100) next.aceitaPeloProfessor = false;
  return next;
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
    const [postSnaps, activitySnaps, challengeResultSnaps] = await Promise.all([
      studentDoc.ref.collection('posaulas').get(),
      studentDoc.ref.collection('activities').get(),
      db.collection('_challengeResults').where('uid', '==', uid).get(),
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
    const manualAssessments = challengeResultSnaps.docs.flatMap(doc => {
      const data = doc.data();
      const resultDate = dateFrom(data.updatedAt || data.completedAt || data.retakenAt);
      if (!resultDate || resultDate < cutoff || resultDate > now) return [];
      return (data.details || []).filter(item => item.manualScore === true).map(item => ({
        source:'ajuste_manual_desafio', date:resultDate.toISOString(), weekKey:data.weekKey || '',
        topic:item.topic || '', prompt:compact(item.prompt || '', 700),
        answer:compact(item.answer || '', 500), expected:compact(item.expected || '', 500),
        score:Number(item.teacherScore ?? item.score ?? 0),
        criterion:item.teacherScoreTag || '', teacherComment:compact(item.teacherScoreReason || '', 500),
      }));
    }).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
    return { uid, posts:loadedPosts.filter(post => post.text), activityMaterials,
      corrections:[...corrections, ...manualAssessments] };
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
    // Atividades recentes são uma fonte legítima para qualquer aluno que ainda
    // não tenha pós-aula utilizável. Antes só a Amorzinho recebia esse fallback,
    // deixando alunos novos sem desafio nenhum.
    const materials = input.posts.length ? input.posts : input.activityMaterials;
    const sourceKind = input.posts.length ? 'pós-aulas' : 'atividades recentes';
    if (!materials.length) throw new Error('Nenhum pós-aula ou atividade utilizável nos últimos 90 dias.');
    const requestPayload = {
      model,
      system:[{ type:'text', text:
        `Você cria desafios individuais de inglês para o Science English. Use SOMENTE fatos linguísticos, vocabulário e contextos presentes nos ${sourceKind} fornecidos. ` +
        `A dificuldade deve ser HARD em relação ao nível CEFR do aluno${isAmorzinho ? ' e, para a Amorzinho, especialmente exigente' : ''}: exija aplicação, discriminação de nuances e recuperação ativa, sem ensinar conteúdo novo. ` +
        'Use as correções para identificar padrões reais. Ajustes manuais de nota feitos pelo professor são critérios pedagógicos autoritativos: considere a categoria, o comentário e a relação entre erro e pontuação para reconhecer o que é central, secundário ou recorrente para este aluno. Não copie a nota mecanicamente; aplique o padrão ao tópico e ao contexto. Quando não houver correções suficientes, trate conteúdos repetidos ou muito explicados como fragilidades prováveis e deixe isso claro apenas na análise. ' +
        'Em CADA parte, produza exatamente 3 perguntas focus=weak e 2 focus=strong. ' +
        (formato === 'escrita'
          ? 'Em CADA parte, todas as 5 perguntas devem ter format="text" — o aluno digita a resposta. '
          : 'Em CADA parte, o formato é exatamente: 3 perguntas format="text", 1 format="trueFalse" e 1 format="multipleChoice". ') +
        'Em format="multipleChoice": quatro alternativas plausíveis (a, b, c, d), correctOption com a letra certa, acceptedAnswers vazio. ' +
        'Em format="trueFalse": exatamente duas alternativas, {"id":"a","text":"True"} e {"id":"b","text":"False"}, correctOption com a letra certa, acceptedAnswers vazio. ' +
        'Em format="text": options vazio, correctOption vazio, e acceptedAnswers com TODAS as formas corretas de escrever a resposta. ' +
        'IMPORTANTE: hint deve ser SEMPRE uma string vazia. O prompt deve dizer somente a ação neutra (por exemplo, "Translate to English:" ou "Complete the sentence:") e o texto exato da tarefa deve ficar em context. Em tradução, context precisa conter a frase literal completa que o aluno traduzirá — nunca apenas "Situação:" ou uma descrição vaga. Antes da resposta, nunca cite nome de tempo verbal, estrutura gramatical, voz ativa/passiva, causative, infinitive, base form, past participle, fórmula, regra ou qualquer pista de como construir a resposta. ' +
        'Em exercício com lacuna, o aluno pode responder somente a palavra ou o trecho ausente; inclua esse fragmento e a frase completa em acceptedAnswers. Nos demais exercícios escritos, peça uma oração curta, nunca um parágrafo ou redação. Toda resposta deve caber em 45 segundos digitando no celular. ' +
        'A correção é automática e compara construções, então a pergunta precisa admitir um alvo gramatical inequívoco. Preserve obrigatoriamente todas as relações e referências do enunciado na resposta — posse, parentesco e de quem se fala; nunca simplifique "os primos do seu amigo" para "seus primos". Em acceptedAnswers liste EXAUSTIVAMENTE toda variação válida: contração e forma completa ("don\'t" e "do not"), grafia americana e britânica, resposta curta e frase completa, conectores opcionais e palavras mais específicas que mantenham o mesmo sentido e a mesma regra. Não restrinja o gabarito a uma cópia literal quando outra formulação natural também responde corretamente. Se a pergunta admitir sentidos realmente diferentes, reformule para fechar o alvo. Maiúscula, acento e pontuação são ignorados na correção, então não dependa deles. ' +
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
    };
    // Respostas longas às vezes terminam no limite ou chegam com uma das partes
    // incompleta. Valida o pacote inteiro e repete com mais espaço antes de
    // desistir, sem refazer quem já tem as duas rodadas publicadas.
    let generated, prepared, lastError;
    const usage = {};
    for (const maxTokens of [12000, 20000, 24000]) {
      const response = await client.messages.create({ ...requestPayload, max_tokens:maxTokens });
      Object.entries(response.usage || {}).forEach(([key, value]) => {
        if (Number.isFinite(Number(value))) usage[key] = Number(usage[key] || 0) + Number(value);
      });
      const text = response.content.find(block => block.type === 'text')?.text;
      try {
        if (!text) throw new Error('A IA não devolveu as perguntas.');
        generated = JSON.parse(text);
        prepared = [generated.part1, generated.part2].map((questions, partIndex) => {
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
        lastError = null;
        break;
      } catch (error) { lastError = error; }
    }
    if (lastError || !prepared) throw lastError || new Error('Não foi possível montar as duas partes do desafio.');
    return { prepared, analysis:generated.analysis, sourceKind, usage,
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
        'hint deve ser SEMPRE uma string vazia. O prompt deve conter apenas a ação neutra e o texto exato da tarefa deve ficar em context. Em tradução, context precisa conter a frase literal completa que o aluno traduzirá, nunca uma descrição vaga. Antes da resposta, não cite tempo verbal, estrutura gramatical, voz ativa/passiva, causative, infinitive, base form, past participle, fórmula ou regra. ' +
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

  async function publishPeerDuelRounds(client, duelId, duel, weekKey) {
    const membros = (await Promise.all((duel.participantUids || []).map(uid => db.doc(`students/${uid}`).get())))
      .filter(snap => snap.exists && snap.data().archived !== true && snap.data().challengeEnabled !== false);
    if (membros.length !== 2) throw new HttpsError('failed-precondition', 'O duelo precisa ter dois alunos ativos.');
    const output = await generateForGroup(client, { name:duel.title || 'Duelo entre alunos' }, membros, weekKey);
    const schedule = groupScheduleFor(weekKey, duelId);
    const batch = db.batch();
    [schedule.part1, schedule.part2].forEach(item => {
      const index = item.part - 1;
      membros.forEach(membro => {
        batch.set(membro.ref.collection('challengeRounds').doc(item.roundId), {
          roundId:item.roundId, weekKey, part:item.part, personalized:true,
          groupId:duelId, groupName:duel.title || 'Duelo entre alunos', peerDuel:true,
          schoolId:duel.schoolId || '', opensAt:item.opensAt, closesAt:item.closesAt,
          questionCount:5, questions:output.prepared[index].questions,
          difficulty:'duelo', status:'published', updatedAt:FieldValue.serverTimestamp(),
        });
        batch.set(answerKeyRef(membro.id, item.roundId, true), {
          uid:membro.id, roundId:item.roundId, weekKey, part:item.part, groupId:duelId,
          answers:output.prepared[index].keys, analysis:output.analysis,
          sources:output.sources, updatedAt:FieldValue.serverTimestamp(),
        });
      });
    });
    if (registrarUso && output.usage) registrarUso(batch, {
      tipo:'desafio-entre-alunos', uid:membros[0].id, escolaId:duel.schoolId || '',
      uso:output.usage, extra:{ weekKey, duelId },
    });
    await batch.commit();
  }

  async function publicPeerDuel(doc, uid, now = new Date()) {
    const duel = doc.data();
    const opponentIndex = (duel.participantUids || []).findIndex(item => item !== uid);
    const opponentUid = opponentIndex >= 0 ? duel.participantUids[opponentIndex] : '';
    const opponentName = opponentIndex >= 0 ? (duel.participantNames || [])[opponentIndex] || 'Aluno' : 'Aluno';
    const base = {
      id:doc.id, status:duel.status || 'pending', weekKey:duel.weekKey || '',
      creatorUid:duel.creatorUid || '', invitedUid:duel.invitedUid || '', opponentUid, opponentName,
      isCreator:duel.creatorUid === uid, title:duel.title || `Você × ${opponentName}`,
      createdAt:iso(duel.createdAt), generationError:duel.generationError || '',
    };
    if (duel.status !== 'accepted' || duel.generated !== true || !duel.weekKey) return base;
    const schedule = groupScheduleFor(duel.weekKey, doc.id);
    const stage = stageFor(now, schedule);
    const state = {
      enabled:true, peerDuel:true, duelId:doc.id, weekKey:duel.weekKey, title:base.title,
      phase:stage.phase, part:stage.part, startsAt:iso(schedule.startsAt),
      revealAt:iso(schedule.revealAt), endsAt:iso(schedule.endsAt),
    };
    if (stage.phase === 'open') {
      const slot = stage.part === 1 ? schedule.part1 : schedule.part2;
      const [roundSnap, submissionSnap] = await Promise.all([
        db.doc(`students/${uid}/challengeRounds/${slot.roundId}`).get(),
        db.doc(`students/${uid}/challengeSubmissions/${slot.roundId}`).get(),
      ]);
      if (roundSnap.exists) {
        const round = roundSnap.data(), submission = submissionSnap.exists ? submissionSnap.data() : null;
        Object.assign(state, {
          canStart:submission?.completed !== true, completed:submission?.completed === true,
          started:Boolean(submission), nextIndex:Number(submission?.answers?.length || 0),
          round:{ roundId:round.roundId, part:round.part, questionCount:round.questionCount,
            opensAt:iso(round.opensAt), closesAt:iso(round.closesAt), questions:publicChallengeQuestions(round.questions) },
        });
      }
    }
    const resultSnaps = await Promise.all((duel.participantUids || []).flatMap(participantUid => [1, 2].map(part =>
      db.doc(`_challengeResults/${groupScheduleFor(duel.weekKey, doc.id)[`part${part}`].roundId}_${participantUid}`).get())));
    const scores = (duel.participantUids || []).map((participantUid, index) => ({
      uid:participantUid, name:(duel.participantNames || [])[index] || 'Aluno',
      score:resultSnaps.filter(snap => snap.exists && snap.data().uid === participantUid)
        .reduce((sum, snap) => sum + Number(snap.data().score || 0), 0),
    }));
    return { ...base, state, scores };
  }

  const obterDesafiosEntreAlunos = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      const studentSnap = await assertStudent(uid);
      const student = studentSnap.data();
      const [studentsSnap, duelsSnap] = await Promise.all([
        db.collection('students').get(),
        db.collection('_challengeDuels').where('participantUids', 'array-contains', uid).get(),
      ]);
      const opponents = studentsSnap.docs.filter(doc => doc.id !== uid && doc.data().archived !== true
        && doc.data().challengeEnabled !== false && String(doc.data().schoolId || '') === String(student.schoolId || ''))
        .map(doc => ({ uid:doc.id, name:doc.data().firstName || String(doc.data().name || 'Aluno').split(/\s+/)[0] }));
      const duels = await Promise.all(duelsSnap.docs.map(doc => publicPeerDuel(doc, uid)));
      duels.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      return { opponents:opponents.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), duels };
    }
  );

  const criarDesafioEntreAlunos = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      const opponentUid = String(request.data?.opponentUid || '').trim();
      if (!opponentUid || opponentUid === uid) throw new HttpsError('invalid-argument', 'Escolha outro aluno.');
      const [creatorSnap, opponentSnap] = await Promise.all([assertStudent(uid), assertStudent(opponentUid)]);
      const creator = creatorSnap.data(), opponent = opponentSnap.data();
      if (!creator.schoolId || creator.schoolId !== opponent.schoolId) {
        throw new HttpsError('permission-denied', 'Só é possível desafiar alunos da mesma escola.');
      }
      const existing = await db.collection('_challengeDuels').where('participantUids', 'array-contains', uid).get();
      const duplicate = existing.docs.some(doc => {
        const duel = doc.data();
        const activeAccepted = duel.status === 'accepted' && duel.weekKey
          && scheduleFor(duel.weekKey).endsAt.getTime() >= Date.now();
        return (duel.participantUids || []).includes(opponentUid)
          && (['pending','preparing'].includes(duel.status) || activeAccepted);
      });
      if (duplicate) throw new HttpsError('already-exists', 'Já existe um desafio aberto entre vocês.');
      const creatorName = creator.firstName || String(creator.name || 'Aluno').split(/\s+/)[0];
      const opponentName = opponent.firstName || String(opponent.name || 'Aluno').split(/\s+/)[0];
      const ref = db.collection('_challengeDuels').doc();
      await ref.set({
        schoolId:creator.schoolId, creatorUid:uid, invitedUid:opponentUid,
        participantUids:[uid, opponentUid], participantNames:[creatorName, opponentName],
        title:`${creatorName} × ${opponentName}`, status:'pending', generated:false,
        createdAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp(),
      });
      return { ok:true, id:ref.id };
    }
  );

  const responderDesafioEntreAlunos = onCall(
    { region:REGION, secrets:anthropicApiKey ? [anthropicApiKey] : [], timeoutSeconds:600, memory:'1GiB' },
    async request => {
      const uid = requireAuth(request);
      const duelId = String(request.data?.duelId || '').trim();
      const accept = request.data?.accept === true;
      const ref = db.doc(`_challengeDuels/${duelId}`);
      const snap = await ref.get();
      if (!snap.exists) throw new HttpsError('not-found', 'Desafio não encontrado.');
      const duel = snap.data();
      if (duel.invitedUid !== uid) throw new HttpsError('permission-denied', 'Este convite não é seu.');
      if (!['pending','generation_error'].includes(duel.status)) {
        throw new HttpsError('failed-precondition', 'Este convite já foi respondido.');
      }
      if (!accept) {
        await ref.set({ status:'declined', respondedAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }, { merge:true });
        return { ok:true, status:'declined' };
      }
      if (!Anthropic || !anthropicApiKey) throw new HttpsError('failed-precondition', 'A geração do desafio não foi configurada.');
      const weekKey = nextMonday(new Date());
      await ref.set({ status:'preparing', weekKey, generationError:'', respondedAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }, { merge:true });
      try {
        const client = new Anthropic({ apiKey:anthropicApiKey.value() });
        await publishPeerDuelRounds(client, duelId, duel, weekKey);
        await ref.set({ status:'accepted', generated:true, acceptedAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }, { merge:true });
        return { ok:true, status:'accepted', weekKey };
      } catch (error) {
        await ref.set({ status:'generation_error', generationError:String(error.message || error).slice(0, 500), updatedAt:FieldValue.serverTimestamp() }, { merge:true });
        throw new HttpsError('internal', 'O convite foi aceito, mas as perguntas não ficaram prontas. Tente aceitar novamente.');
      }
    }
  );

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
        ? { ...withTeacherScore(item, 100), parcial:false,
            aceitaPeloProfessor:true } : item);
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

  // Ajuste pedagógico pontual: o professor pode manter parte dos pontos ou
  // retirar alguns sem declarar que a variante inteira deve entrar no gabarito.
  const ajustarPontuacaoRespostaDesafio = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const uid = String(request.data?.uid || '').trim();
      const roundId = String(request.data?.roundId || '').trim();
      const questionId = String(request.data?.questionId || '').trim();
      const points = Number(request.data?.points);
      const tag = String(request.data?.tag || '').trim();
      const reason = String(request.data?.reason || '').trim();
      if (!uid || !roundId || !questionId) {
        throw new HttpsError('invalid-argument', 'Faltou aluno, rodada ou pergunta.');
      }
      if (!Number.isInteger(points) || points < 0 || points > 100) {
        throw new HttpsError('invalid-argument', 'A pontuação precisa ser um número inteiro de 0 a 100.');
      }
      if (tag && !TEACHER_SCORE_TAGS.has(tag)) {
        throw new HttpsError('invalid-argument', 'O motivo rápido da pontuação não é válido.');
      }
      if (reason.length > 500) {
        throw new HttpsError('invalid-argument', 'O comentário pode ter no máximo 500 caracteres.');
      }

      const resultRef = db.doc(`_challengeResults/${roundId}_${uid}`);
      const resultSnap = await resultRef.get();
      if (!resultSnap.exists) throw new HttpsError('not-found', 'Resultado não encontrado.');
      const details = resultSnap.data().details || [];
      if (!details.some(item => item.questionId === questionId)) {
        throw new HttpsError('not-found', 'Pergunta não encontrada neste resultado.');
      }
      const nextDetails = details.map(item => item.questionId === questionId
        ? withTeacherScore(item, points, { tag, reason, at:new Date().toISOString() }) : item);
      const score = nextDetails.reduce((sum, item) => sum + Number(item.score || 0), 0);
      await resultRef.set({ details:nextDetails, score,
        teacherReviewedAt:FieldValue.serverTimestamp(), updatedAt:FieldValue.serverTimestamp() }, { merge:true });

      const weekKey = resultSnap.data().weekKey;
      if (weekKey && !resultSnap.data().groupId) {
        const rankingSnap = await db.doc(`challengeRankings/${weekKey}`).get();
        if (rankingSnap.exists) await buildRanking(weekKey);
      }
      return { ok:true, points, score, tag, reason };
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

  // Pacote único criado fora da API paga: uma entrada por aluno, mas uma só
  // publicação no painel. As rodadas são gravadas exatamente no mesmo caminho
  // das rodadas personalizadas geradas pela IA, então o aplicativo, a correção,
  // o ranking e o histórico continuam usando o fluxo já consolidado.
  const publicarDesafiosPersonalizadosManuais = onCall(
    { region:REGION, timeoutSeconds:300, memory:'512MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const data = request.data || {};
      const weekKey = String(data.weekKey || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekKey)
          || new Date(`${weekKey}T12:00:00Z`).getUTCDay() !== 1) {
        throw new HttpsError('invalid-argument', 'Escolha uma segunda-feira válida.');
      }
      if (!Array.isArray(data.students) || !data.students.length || data.students.length > 100) {
        throw new HttpsError('invalid-argument', 'O pacote precisa ter de 1 a 100 alunos.');
      }

      const preparedStudents = data.students.map(prepareManualStudentChallenge);
      const uids = preparedStudents.map(student => student.uid);
      if (new Set(uids).size !== uids.length) {
        throw new HttpsError('invalid-argument', 'O pacote contém o mesmo UID mais de uma vez.');
      }

      const studentsSnap = await db.collection('students').get();
      const activeStudents = studentsSnap.docs.filter(doc => {
        const student = doc.data();
        return student.archived !== true && student.challengeEnabled !== false;
      });
      const activeByUid = new Map(activeStudents.map(doc => [doc.id, doc]));
      const unknown = preparedStudents.filter(student => !activeByUid.has(student.uid));
      if (unknown.length) {
        throw new HttpsError('invalid-argument',
          `UIDs não encontrados ou sem desafio ativo: ${unknown.map(item => item.studentName || item.uid).join(', ')}.`);
      }
      const sentUids = new Set(uids);
      const missing = activeStudents.filter(doc => !sentUids.has(doc.id)).map(doc =>
        doc.data().name || doc.data().firstName || doc.id);
      if (missing.length) {
        throw new HttpsError('failed-precondition',
          `O pacote não contém todos os alunos ativos. Faltando: ${missing.join(', ')}.`);
      }

      const schedule = scheduleFor(weekKey);
      const submissionRefs = preparedStudents.flatMap(student => [schedule.part1, schedule.part2]
        .map(round => db.doc(`students/${student.uid}/challengeSubmissions/${round.roundId}`)));
      const submissions = submissionRefs.length ? await db.getAll(...submissionRefs) : [];
      const started = new Set(submissions.filter(snap => snap.exists).map(snap =>
        snap.ref.parent.parent?.id).filter(Boolean));
      if (started.size) {
        const names = [...started].map(uid => {
          const doc = activeByUid.get(uid);
          return doc?.data().name || doc?.data().firstName || uid;
        });
        throw new HttpsError('failed-precondition',
          `Não dá para substituir perguntas depois que o aluno começou: ${names.join(', ')}.`);
      }

      const settingsRef = db.doc('challengeSettings/auto');
      const settingsSnap = await settingsRef.get();
      const currentManualWeeks = settingsSnap.exists && Array.isArray(settingsSnap.data().manualWeeks)
        ? settingsSnap.data().manualWeeks : [];
      const batch = db.batch();
      batch.set(db.doc(`challengeWeeks/${weekKey}`), {
        weekKey, title:String(data.title || 'Desafio Science English').trim(), active:true,
        personalized:true, manual:true, generatedCount:preparedStudents.length,
        expectedCount:activeStudents.length, startsAt:schedule.startsAt,
        revealAt:schedule.revealAt, endsAt:schedule.endsAt,
        updatedAt:FieldValue.serverTimestamp(), publishedBy:request.auth.token?.email || '',
      }, { merge:true });
      batch.set(settingsRef, {
        manualWeeks:[...new Set([...currentManualWeeks, weekKey])],
        updatedAt:FieldValue.serverTimestamp(),
      }, { merge:true });
      batch.set(db.doc(`_challengeGenerationJobs/${weekKey}`), {
        weekKey, status:'completed', manual:true, total:activeStudents.length,
        completed:preparedStudents.length, failed:0,
        requestedBy:request.auth.token?.email || '', finishedAt:FieldValue.serverTimestamp(),
      }, { merge:true });

      preparedStudents.forEach(student => {
        [schedule.part1, schedule.part2].forEach((round, index) => {
          const profile = activeByUid.get(student.uid).data();
          batch.set(db.doc(`students/${student.uid}/challengeRounds/${round.roundId}`), {
            roundId:round.roundId, weekKey, part:round.part, personalized:true,
            manual:true, source:'pacote-json', opensAt:round.opensAt, closesAt:round.closesAt,
            questionCount:5, questions:student.prepared[index].questions,
            difficulty:'personalizado', status:'published', updatedAt:FieldValue.serverTimestamp(),
          });
          batch.set(answerKeyRef(student.uid, round.roundId, true), {
            uid:student.uid, studentName:profile.name || profile.firstName || student.studentName,
            roundId:round.roundId, weekKey, part:round.part,
            answers:student.prepared[index].keys, analysis:student.analysis,
            source:'pacote-json', updatedAt:FieldValue.serverTimestamp(),
          });
        });
      });
      await batch.commit();
      return {
        ok:true, weekKey, students:preparedStudents.length,
        questions:preparedStudents.length * 10, manual:true,
      };
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
      // Uma reposição individual fica acima da semana corrente até ser concluída.
      // A tentativa antiga continua intacta; só é substituída quando a nova acaba.
      const retrySnap = await studentSnap.ref.collection('challengeRetries').doc('active').get();
      if (retrySnap.exists) {
        const retry = retrySnap.data();
        const expiresAt = retry.expiresAt?.toDate?.() || new Date(retry.expiresAt);
        if (expiresAt > now && retry.roundId) {
          const [roundSnap, submissionSnap] = await Promise.all([
            studentSnap.ref.collection('challengeRounds').doc(retry.roundId).get(),
            studentSnap.ref.collection('challengeSubmissions').doc(retry.roundId).get(),
          ]);
          if (roundSnap.exists) {
            const round = roundSnap.data(), submission = submissionSnap.exists ? submissionSnap.data() : null;
            return {
              enabled:true, retry:true, weekKey:retry.weekKey, title:'Nova tentativa liberada',
              phase:'open', part:Number(retry.part || round.part),
              startsAt:iso(round.opensAt), revealAt:iso(expiresAt), endsAt:iso(expiresAt),
              badges:badgeState.badges, pendingBadges:adminMirror ? [] : badgeState.pendingBadges,
              canStart:submission?.completed !== true, completed:submission?.completed === true,
              started:Boolean(submission), nextIndex:Number(submission?.answers?.length || 0),
              round:{ roundId:round.roundId, part:round.part, questionCount:round.questionCount,
                opensAt:iso(round.opensAt), closesAt:iso(round.closesAt), questions:publicChallengeQuestions(round.questions) },
            };
          }
        }
      }
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
          opensAt:iso(round.opensAt), closesAt:iso(round.closesAt), questions:publicChallengeQuestions(round.questions) },
      };
    }
  );

  const iniciarDesafioSemanal = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      const uid = requireAuth(request);
      await assertStudent(uid);
      const roundId = String(request.data?.roundId || '');
      const { round } = await assertOpenRound(uid, roundId);
      const ref = db.doc(`students/${uid}/challengeSubmissions/${roundId}`);
      const result = await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (snap.exists && snap.data().completed === true) throw new HttpsError('already-exists', 'Esta tentativa já foi concluída.');
        if (!snap.exists) tx.create(ref, {
          roundId, weekKey:round.weekKey || roundId.slice(0, 10), part:Number(round.part || 0), answers:[],
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
      const resultRef = db.doc(`_challengeResults/${round.retryResultId || `${roundId}_${uid}`}`);
      const saved = await db.runTransaction(async tx => {
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
            ...(round.retryOf ? { retryOf:round.retryOf, retakenAt:FieldValue.serverTimestamp() } : {}),
            ...(round.groupId ? { groupId:round.groupId, groupName:round.groupName || '' } : {}),
            details, completedAt:FieldValue.serverTimestamp(),
          });
          if (round.retryOf) tx.delete(db.doc(`students/${uid}/challengeRetries/active`));
        }
        return { saved:true, completed, nextIndex:nextAnswers.length };
      });
      if (saved.completed && round.retryOf) await buildRanking(round.weekKey);
      return saved;
    }
  );

  const obterStatusDesafioAdmin = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const weekKey = String(request.data?.weekKey || weekKeyFor()).trim();
      const schedule = scheduleFor(weekKey);
      const [week, part1, part2, generationJob, students, results] = await Promise.all([
        db.doc(`challengeWeeks/${weekKey}`).get(),
        db.doc(`challengeRounds/${schedule.part1.roundId}`).get(),
        db.doc(`challengeRounds/${schedule.part2.roundId}`).get(),
        db.doc(`_challengeGenerationJobs/${weekKey}`).get(),
        db.collection('students').get(),
        db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
      ]);
      const activeStudents = students.docs.filter(studentDoc => {
        const student = studentDoc.data();
        return student.archived !== true && student.challengeEnabled !== false;
      });
      const submissionPairs = await Promise.all(activeStudents.map(async studentDoc => ({
        uid:studentDoc.id,
        name:studentDoc.data().name || studentDoc.data().firstName || 'Aluno',
        round1:await studentDoc.ref.collection('challengeRounds').doc(schedule.part1.roundId).get(),
        round2:await studentDoc.ref.collection('challengeRounds').doc(schedule.part2.roundId).get(),
        part1:await studentDoc.ref.collection('challengeSubmissions').doc(schedule.part1.roundId).get(),
        part2:await studentDoc.ref.collection('challengeSubmissions').doc(schedule.part2.roundId).get(),
      })));
      const completed = part => submissionPairs.filter(pair => pair[part].exists && pair[part].data().completed === true).length;
      const completedNames = part => submissionPairs
        .filter(pair => pair[part].exists && pair[part].data().completed === true)
        .map(pair => pair.name).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      const resultByStudentPart = new Map();
      results.docs.forEach(doc => {
        const result = doc.data();
        if (!result.uid || ![1, 2].includes(Number(result.part))) return;
        const key = `${result.uid}:${Number(result.part)}`;
        const previous = resultByStudentPart.get(key);
        const time = result.completedAt?.toMillis?.() || result.retakenAt?.toMillis?.() || 0;
        const previousTime = previous?.completedAt?.toMillis?.() || previous?.retakenAt?.toMillis?.() || -1;
        if (!previous || time >= previousTime) resultByStudentPart.set(key, result);
      });
      const completedStudents = part => submissionPairs
        .filter(pair => pair[`part${part}`].exists && pair[`part${part}`].data().completed === true)
        .map(pair => {
          const result = resultByStudentPart.get(`${pair.uid}:${part}`) || {};
          const details = Array.isArray(result.details) ? result.details : [];
          const questions = new Map((pair[`round${part}`].data()?.questions || [])
            .map(question => [String(question.id), question]));
          return {
            uid:pair.uid, name:pair.name, roundId:String(result.roundId || ''),
            answered:details.filter(item => String(item.answer || '').trim()).length,
            correct:details.filter(item => item.correct === true).length,
            partial:details.filter(item => item.correct !== true && Number(item.score || 0) > 0).length,
            wrong:details.filter(item => item.correct !== true && Number(item.score || 0) <= 0).length,
            score:Number(result.score || 0), maxScore:Number(result.maxScore || 0),
            details:details.map(item => {
              const question = questions.get(String(item.questionId || '')) || {};
              const options = Array.isArray(item.options) && item.options.length
                ? item.options : (Array.isArray(question.options) ? question.options : []);
              const selectedOptionId = String(item.selectedOptionId ||
                options.find(option => normalizeAnswer(option.text) === normalizeAnswer(item.answer))?.id || '');
              const correctOptionId = String(options.find(option =>
                normalizeAnswer(option.text) === normalizeAnswer(item.expected))?.id || '');
              return {
                questionId:String(item.questionId || ''),
                prompt:item.prompt || '', context:item.context || question.context || '',
                answer:item.answer || '', expected:item.expected || '',
                type:item.type === 'text' ? 'text' : 'multipleChoice', selectedOptionId, correctOptionId,
                options:options.map(option => ({ id:String(option.id || ''), text:String(option.text || '') })),
                correct:item.correct === true, score:Number(item.score || 0),
                parcial:item.correct !== true && Number(item.score || 0) > 0,
                teacherScoreTag:item.teacherScoreTag || '',
                teacherScoreReason:item.teacherScoreReason || '',
              };
            }),
          };
        }).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      const hasRound = (pair, part) => pair[`round${part}`].exists || (part === 1 ? part1 : part2).exists;
      const fullyReady = submissionPairs.filter(pair => hasRound(pair, 1) && hasRound(pair, 2));
      const missing = submissionPairs.filter(pair => !hasRound(pair, 1) || !hasRound(pair, 2))
        .map(pair => pair.name).sort((a, b) => a.localeCompare(b, 'pt-BR'));
      return {
        weekKey, published:week.exists,
        personalized:generationJob.exists ? { ...generationJob.data(), completed:fullyReady.length,
          total:submissionPairs.length, failed:missing.length, missing } : null,
        part1:{ published:part1.exists || generationJob.data()?.completed > 0, questions:part1.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), total:submissionPairs.length, completed:completed('part1'), completedNames:completedNames('part1'), completedStudents:completedStudents(1) },
        part2:{ published:part2.exists || generationJob.data()?.completed > 0, questions:part2.data()?.questionCount || (generationJob.data()?.completed ? 5 : 0), total:submissionPairs.length, completed:completed('part2'), completedNames:completedNames('part2'), completedStudents:completedStudents(2) },
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
      const currentMonth = monthKeyForWeek(currentWeekKey);
      const currentYear = currentWeekKey.slice(0, 4);
      const semanaRankingCompleto = (semanas.find(item => item.weekKey === currentWeekKey)?.ranking || []);
      // Até o fechamento de domingo, ninguém recebe nomes ou notas dos colegas.
      // O aluno vê somente a própria posição; se houver empate, recebe apenas a
      // quantidade de pessoas escondidas naquela mesma colocação.
      // A classificação semanal é oficial, não uma corrida parcial. Enquanto a
      // semana está aberta ninguém ocupa pódio — nem no espelho do professor.
      // Os resultados já respondidos continuam salvos e entram no domingo.
      const semanaRanking = semanaJaFechou ? semanaRankingCompleto : [];
      // Mês, ano e geral também ignoram a semana ainda aberta. Caso contrário,
      // o acumulado denunciaria a pontuação parcial antes do fechamento.
      const semanasParaRanking = semanasFechadas;
      const mesRanking = rankingAcumulado(semanasParaRanking.filter(item => monthKeyForWeek(item.weekKey) === currentMonth));
      const anoRanking = rankingAcumulado(semanasParaRanking.filter(item => item.weekKey.startsWith(currentYear)));
      const geral = rankingAcumulado(semanasParaRanking);

      const desempenho = new Map();
      const erros = new Map();
      const respostasPorSemana = new Map();
      const weekKeysFechadas = new Set(semanasFechadas.map(semana => semana.weekKey));
      // Resultados antigos guardavam a resposta escolhida, mas não a lista de
      // alternativas. Recupera a rodada original para o histórico também poder
      // reconstruir A/B/C/D sem alterar a nota já fechada.
      const perguntasPorRodada = new Map();
      await Promise.all(meusResultados.docs.map(async doc => {
        const result = doc.data();
        if (result.groupId || !result.roundId || !weekKeysFechadas.has(result.weekKey)) return;
        try {
          const { roundSnap } = await resolveRound(uid, result.roundId);
          if (roundSnap.exists) perguntasPorRodada.set(result.roundId,
            new Map((roundSnap.data().questions || []).map(question => [question.id, question])));
        } catch (error) {
          console.error(`Alternativas históricas de ${result.roundId}:`, error.message);
        }
      }));
      meusResultados.docs.forEach(doc => {
        const result = doc.data();
        if (result.groupId || !weekKeysFechadas.has(result.weekKey)) return;
        const perguntas = perguntasPorRodada.get(result.roundId) || new Map();
        const partes = respostasPorSemana.get(result.weekKey) || [];
        partes.push({
          part:Number(result.part || 0), score:Number(result.score || 0),
          maxScore:Number(result.maxScore || 500),
          details:(result.details || []).map(detail => {
            const pergunta = perguntas.get(detail.questionId) || {};
            const options = Array.isArray(detail.options) && detail.options.length
              ? detail.options : (Array.isArray(pergunta.options) ? pergunta.options : []);
            const selectedOptionId = String(detail.selectedOptionId ||
              options.find(option => normalizeAnswer(option.text) === normalizeAnswer(detail.answer))?.id || '');
            return {
              questionId:String(detail.questionId || ''), prompt:String(detail.prompt || ''),
              context:String(detail.context || ''), answer:String(detail.answer || ''),
              expected:String(detail.expected || ''), explanation:String(detail.explanation || ''),
              type:detail.type === 'text' ? 'text' : 'multipleChoice', selectedOptionId,
              options:options.map(option => ({ id:String(option.id || ''), text:String(option.text || '') })),
              score:Number(detail.score || 0), correct:detail.correct === true,
              ...(detail.parcial === true ? { parcial:true } : {}),
            };
          }),
        });
        respostasPorSemana.set(result.weekKey, partes);
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
      const monthKeys = [...new Set([
        currentMonth,
        ...semanas.filter(item => item.weekKey >= LAUNCH_WEEK).map(item => monthKeyForWeek(item.weekKey)),
      ])].sort((a, b) => b.localeCompare(a));
      const meses = monthKeys.map(monthKey => {
        const fechadasDoMes = semanasFechadas.filter(item => monthKeyForWeek(item.weekKey) === monthKey);
        const semanasDoMes = semanas.filter(item => monthKeyForWeek(item.weekKey) === monthKey)
          .sort((a, b) => b.weekKey.localeCompare(a.weekKey))
          .map(semana => {
            const fechada = semanasFechadas.some(item => item.weekKey === semana.weekKey);
            const lideres = fechada ? (semana.ranking || []).filter(row => row.position === 1) : [];
            return {
              weekKey:semana.weekKey, fechada, participantes:fechada ? Number(semana.participantes || 0) : 0,
              lideres:lideres.map(row => row.name), pontos:lideres.length ? Number(lideres[0].score || 0) : 0,
            };
          });
        const label = new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric', timeZone:'UTC' })
          .format(new Date(`${monthKey}-01T12:00:00Z`));
        return { key:monthKey, label, rows:publicRanking(rankingAcumulado(fechadasDoMes)), semanas:semanasDoMes };
      });
      const badgeState = await loadChallengeBadges(uid);
      return {
        badges:badgeState.badges,
        minhasSemanas:semanasFechadas.map(semana => {
          const linha = (semana.ranking || []).find(row => row.uid === uid);
          return linha ? { weekKey:semana.weekKey, score:linha.score,
            position:linha.position, partesFeitas:linha.partsCompleted,
            participantes:semana.participantes,
            partes:(respostasPorSemana.get(semana.weekKey) || []).sort((a, b) => a.part - b.part) } : null;
        }).filter(Boolean),
        rankings:{
          semana:{ label:'Esta semana', partial:!semanaJaFechou, locked:!semanaJaFechou,
            private:!semanaJaFechou && !adminMirror, rows:publicRanking(semanaRanking) },
          mes:{ label:'Este mês', rows:publicRanking(mesRanking) },
          ano:{ label:'Este ano', rows:publicRanking(anoRanking) },
        },
        meses,
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
          if (item.teacherScore !== undefined && item.teacherScore !== null
            && Number.isFinite(Number(item.teacherScore))) {
            return withTeacherScore(item, Number(item.teacherScore));
          }
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
      const requestedWeekKey = String(request.data?.weekKey || '').trim();
      const season = await loadSeason();
      // Sem semana explícita, o histórico abre no resultado fechado mais recente.
      // A semana corrente nunca ocupa esta área enquanto ainda está em andamento.
      const weekKey = requestedWeekKey || season.semanas[0]?.weekKey || weekKeyFor();
      const [resultSnaps, rankingSnap] = await Promise.all([
        db.collection('_challengeResults').where('weekKey', '==', weekKey).get(),
        db.doc(`challengeRankings/${weekKey}`).get(),
      ]);

      // O tema de cada pergunta mora no gabarito, não no resultado gravado. Sem
      // ele não dá para somar o erro da turma: com rodada personalizada cada
      // aluno vê uma frase diferente do mesmo assunto, e o assunto é a pauta.
      const gabaritos = new Map();
      const perguntasPorResultado = new Map();
      await Promise.all(resultSnaps.docs.map(async doc => {
        const { roundId, uid } = doc.data();
        if (!roundId) return;
        const [pessoal, geral, rodada] = await Promise.all([
          db.doc(`_challengeAnswerKeys/${roundId}_${uid}`).get(),
          db.doc(`_challengeAnswerKeys/${roundId}`).get(),
          resolveRound(uid, roundId),
        ]);
        const respostas = (pessoal.exists ? pessoal : geral).data()?.answers || [];
        gabaritos.set(doc.id, new Map(respostas.map(resposta => [resposta.id, resposta])));
        perguntasPorResultado.set(doc.id, new Map((rodada.roundSnap.data()?.questions || [])
          .map(question => [String(question.id), question])));
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
          const perguntaOriginal = perguntasPorResultado.get(doc.id)?.get(String(item.questionId || '')) || {};
          const opcoes = Array.isArray(item.options) && item.options.length
            ? item.options : (Array.isArray(perguntaOriginal.options) ? perguntaOriginal.options : []);
          const selectedOptionId = String(item.selectedOptionId ||
            opcoes.find(option => normalizeAnswer(option.text) === normalizeAnswer(item.answer))?.id || '');
          const correctOptionId = String(opcoes.find(option =>
            normalizeAnswer(option.text) === normalizeAnswer(item.expected))?.id || '');
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
            teacherScoreTag:item.teacherScoreTag || '',
            teacherScoreReason:item.teacherScoreReason || '',
            type:item.type === 'text' ? 'text' : 'multipleChoice', selectedOptionId, correctOptionId,
            options:opcoes.map(option => ({ id:String(option.id || ''), text:String(option.text || '') })),
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

      const monthKeys = [...new Set(season.semanas.map(semana => monthKeyForWeek(semana.weekKey)))]
        .sort((a, b) => b.localeCompare(a));
      const historicoMeses = monthKeys.map(monthKey => {
        const semanas = season.semanas.filter(semana => monthKeyForWeek(semana.weekKey) === monthKey)
          .sort((a, b) => b.weekKey.localeCompare(a.weekKey));
        const label = new Intl.DateTimeFormat('pt-BR', { month:'long', year:'numeric', timeZone:'UTC' })
          .format(new Date(`${monthKey}-01T12:00:00Z`));
        return {
          key:monthKey,
          label,
          ranking:rankingAcumulado(semanas).map(row => ({
            name:row.name, total:row.score, semanas:row.semanas, position:row.position,
          })),
          semanas:semanas.map(semana => ({
            weekKey:semana.weekKey, participantes:Number(semana.participantes || 0),
          })),
        };
      });

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
        historicoMeses,
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

  const reabrirDesafioAluno = onCall(
    { region:REGION, timeoutSeconds:60, memory:'256MiB' },
    async request => {
      requireAdmin(request, adminEmails);
      const uid = String(request.data?.uid || '').trim();
      const weekKey = String(request.data?.weekKey || '').trim();
      const part = Number(request.data?.part || 0);
      if (!uid || !/^\d{4}-\d{2}-\d{2}$/.test(weekKey) || ![1, 2].includes(part)) {
        throw new HttpsError('invalid-argument', 'Informe aluno, semana e parte válidos.');
      }
      const studentDoc = await db.doc(`students/${uid}`).get();
      if (!studentDoc.exists) throw new HttpsError('not-found', 'Aluno não encontrado.');
      const originalRoundId = `${weekKey}-part-${part}`;
      const { roundSnap, personalized } = await resolveRound(uid, originalRoundId);
      if (!roundSnap.exists) throw new HttpsError('not-found', 'As perguntas originais desta parte não foram encontradas.');
      const keySnap = await answerKeyRef(uid, originalRoundId, personalized).get();
      if (!keySnap.exists) throw new HttpsError('not-found', 'O gabarito original desta parte não foi encontrado.');
      const now = new Date(), expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);
      const retryRoundId = `${originalRoundId}-retry-${Date.now()}`;
      const original = roundSnap.data();
      const batch = db.batch();
      batch.set(studentDoc.ref.collection('challengeRounds').doc(retryRoundId), {
        ...original, roundId:retryRoundId, weekKey, part, personalized:true,
        retryOf:originalRoundId, retryResultId:`${originalRoundId}_${uid}`,
        opensAt:new Date(now.getTime() - 60 * 1000), closesAt:expiresAt,
        status:'published', updatedAt:FieldValue.serverTimestamp(),
      });
      batch.set(answerKeyRef(uid, retryRoundId, true), {
        ...keySnap.data(), uid, roundId:retryRoundId, weekKey, part,
        retryOf:originalRoundId, updatedAt:FieldValue.serverTimestamp(),
      });
      batch.set(studentDoc.ref.collection('challengeRetries').doc('active'), {
        uid, weekKey, part, roundId:retryRoundId, originalRoundId,
        createdAt:FieldValue.serverTimestamp(), expiresAt,
        createdBy:request.auth.token?.email || '',
      });
      await batch.commit();
      return { ok:true, uid, weekKey, part, roundId:retryRoundId, expiresAt:expiresAt.toISOString() };
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
          'hint deve ser SEMPRE uma string vazia. O prompt deve conter apenas a ação neutra e o texto exato da tarefa deve ficar em context. Em tradução, context precisa conter a frase literal completa que o aluno traduzirá, nunca uma descrição vaga. Antes da resposta, não cite tempo verbal, estrutura gramatical, voz ativa/passiva, causative, infinitive, base form, past participle, fórmula ou regra. ' +
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
    publicarDesafioSemanal, publicarDesafiosPersonalizadosManuais,
    gerarDesafiosPersonalizados, obterDesafioSemanal, iniciarDesafioSemanal,
    obterPerguntasDesafio, reabrirDesafioAluno, regerarPerguntaDesafio,
    obterTemporadaDesafio, obterResultadoDesafioAdmin,
    recalcularPontuacaoDesafio,
    salvarRespostaDesafio, obterStatusDesafioAdmin, finalizarDesafioSemanal,
    notificarAberturaDesafio, lembrarDesafioManha, lembrarDesafioNoite,
    gerarDesafiosAtrasados, gerarDesafioDaSemana, gerarDesafioDaTurma,
    aceitarRespostaDesafio, ajustarPontuacaoRespostaDesafio,
    obterDesafiosEntreAlunos, criarDesafioEntreAlunos, responderDesafioEntreAlunos,
    premiarCampeoesSemanais, concederSelosDesafio,
    marcarSelosDesafioVistos,
  };
}

export const challengeInternals = Object.freeze({
  localDateParts, addDays, monthKeyForWeek, weekKeyFor, nextMonday, scheduleFor, stageFor,
  normalizeAnswer, canonicalChallengeTopic, publicChallengeQuestions, acceptedAnswersWithBlankFragments, assertRequiredReferences, validateQuestion, scoreWrittenAnswer, scoreAnswers, withTeacherScore, dateFrom, assertFocusMix,
  assertFormatMix, formatOf, prepareManualStudentChallenge,
  FORMAT_MIX, FORMAT_THRESHOLD, groupScheduleFor,
});
