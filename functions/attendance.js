// Shared by student, admin and server. Live attendance is independent of study usage.
(function (root) {
'use strict';
const semAcento = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const PROGRESS_COLORS = { good:'#16A34A', low:'#DC2626' };
function attendanceStatus(post) {
  return post?.attendanceStatus === 'absent' || post?.attendanceStatus === 'present' ? post.attendanceStatus : null;
}
function dateFrom(value) {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T00:00:00`);
  const raw = value.toDate ? value.toDate() : new Date(value);
  const key = !isNaN(raw) ? new Intl.DateTimeFormat('en-CA', { timeZone:'America/Sao_Paulo', year:'numeric', month:'2-digit', day:'2-digit' }).format(raw) : '';
  const d = key ? new Date(`${key}T00:00:00`) : raw;
  return isNaN(d) ? null : d;
}

function postFilenameDate(post) {
  const sources = [post?.filename, post?.url, post?.id].filter(Boolean).map(String);
  for (const source of sources) {
    let value = source;
    try { value = decodeURIComponent(source); } catch (_) {}
    let match = value.match(/(?:^|[^\d])(\d{2})[-_](\d{2})[-_](20\d{2})(?=[^\d]|$)/);
    let year, month, day;
    if (match) [, month, day, year] = match;
    else {
      match = value.match(/(?:^|[^\d])(20\d{2})[-_](\d{2})[-_](\d{2})(?=[^\d]|$)/);
      if (match) [, year, month, day] = match;
    }
    if (!match) continue;
    const parsed = new Date(Number(year), Number(month)-1, Number(day));
    if (parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month)-1 && parsed.getDate() === Number(day)) return parsed;
  }
  return null;
}

function postReferenceDate(post) {
  const reference = post?.classDate || post?.createdAt;
  return postFilenameDate(post) || dateFrom(reference instanceof Date ? reference.toISOString() : reference);
}

function dateKey(value) {
  const d = dateFrom(value);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function addDays(date, days) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

function easterDate(year) {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19*a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2*e + 2*i - h - k) % 7;
  const m = Math.floor((a + 11*h + 22*l) / 451);
  const month = Math.floor((h + l - 7*m + 114) / 31) - 1;
  const day = ((h + l - 7*m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function nationalHolidayKeys(year) {
  const fixed = [[0,1],[3,21],[4,1],[8,7],[9,12],[10,2],[10,15],[10,20],[11,25]];
  const easter = easterDate(year);
  const moving = [addDays(easter,-48), addDays(easter,-47), addDays(easter,-2), addDays(easter,60)];
  return new Set([
    ...fixed.map(([m,d]) => dateKey(new Date(year,m,d))),
    ...moving.map(dateKey),
  ]);
}

function lessonDaysFromStudent(student, posts = []) {
  const rawStructured = student?.aulaDias;
  const structuredValues = Array.isArray(rawStructured) ? rawStructured : String(rawStructured ?? '').split(/[,;|\s]+/);
  const structured = new Set(structuredValues.filter(value => String(value).trim() !== '').map(Number).filter(day => day >= 0 && day <= 6));
  // Soma todos os formatos antigos e novos. Um array numérico incompleto não
  // pode esconder o segundo dia que ainda está registrado no campo textual.
  const text = semAcento([student?.diasAulas, student?.diasDaAula, student?.diasSemana, student?.diaAula].filter(Boolean).join(' '));
  const names = [
    [0,['domingo','dom','sunday','sun']], [1,['segunda','seg','monday','mon']], [2,['terca','ter','tuesday','tue']],
    [3,['quarta','qua','wednesday','wed']], [4,['quinta','qui','thursday','thu']], [5,['sexta','sex','friday','fri']],
    [6,['sabado','sab','saturday','sat']],
  ];
  names.forEach(([day,aliases]) => {
    if (aliases.some(alias => new RegExp(`(^|[^a-z])${alias}([^a-z]|$)`).test(text))) structured.add(day);
  });
  if (!structured.size) {
    const counts = {};
    posts.forEach(post => {
      const date = postReferenceDate(post);
      if (date) counts[date.getDay()] = (counts[date.getDay()] || 0) + 1;
    });
    Object.entries(counts).forEach(([day,count]) => { if (count >= 2) structured.add(Number(day)); });
  }
  return structured;
}

function calculateAttendance(student, posaulas, now = new Date()) {
  const lessonDays = lessonDaysFromStudent(student, posaulas);
  const startRaw = student?.inicioCurso;
  const courseStart = startRaw
    ? (typeof startRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) ? new Date(`${startRaw}T00:00:00`) : dateFrom(startRaw))
    : null;
  const postDates = (posaulas || []).map(postReferenceDate).filter(Boolean).sort((a,b)=>a-b);
  const legacyStart = postDates.length ? addDays(postDates[0],-3) : null;
  const historicalStart = courseStart && legacyStart
    ? new Date(Math.min(courseStart.getTime(),legacyStart.getTime()))
    : courseStart || legacyStart;
  const scheduleStartRaw = student?.aulaDiasDesde;
  const scheduleStart = scheduleStartRaw
    ? (typeof scheduleStartRaw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(scheduleStartRaw)
      ? new Date(`${scheduleStartRaw}T00:00:00`) : dateFrom(scheduleStartRaw))
    : null;
  const start = historicalStart;
  const cutoff = addDays(dateFrom(student?.archived ? student.archivedAt : now.toISOString()) || now, -1); // o pós-aula normalmente chega no dia seguinte
  const exceptions = new Set((student?.aulaExcecoes || []).map(String));
  const candidateKeys = new Set();
  const attendanceDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`) : dateFrom(value);
  const historicalSchedules = (Array.isArray(student?.aulaDiasHistorico) ? student.aulaDiasHistorico : [])
    .map(item => ({
      days:new Set((Array.isArray(item?.dias) ? item.dias : []).map(Number).filter(day => day >= 0 && day <= 6)),
      from:attendanceDate(item?.desde), to:attendanceDate(item?.ate),
    })).filter(item => item.days.size && item.from && item.to);
  const schedules = [...historicalSchedules, {
    days:lessonDays,
    from:scheduleStart || historicalStart,
    to:cutoff,
  }].filter(item => item.days.size && item.from && item.to);
  // Cada grade vale somente dentro de sua vigência. Assim, a grade nova não
  // inventa sábados no passado e a grade antiga continua preservada no histórico.
  schedules.forEach(schedule => {
    const from = historicalStart
      ? new Date(Math.max(historicalStart.getTime(),schedule.from.getTime())) : schedule.from;
    const to = new Date(Math.min(cutoff.getTime(),schedule.to.getTime()));
    for (let d = new Date(from); d <= to; d = addDays(d,1)) {
      if (schedule.days.has(d.getDay())) candidateKeys.add(dateKey(d));
    }
  });

  // Registros novos têm classDate e entram exatamente no dia da aula. Nos
  // antigos, a data pode ser a da publicação: procuramos a aula agendada mais
  // próxima anteriormente. Cada registro ocupa no máximo uma aula.
  const presentKeys = new Set();
  const extraClassKeys = new Set();
  // A presença continua pertencendo à data prevista, mas guardamos a data
  // real da reposição para explicar o asterisco na linha do tempo.
  const makeupByScheduledKey = new Map();
  const recordedHeld = new Set((posaulas || []).map(p => dateKey(postReferenceDate(p))).filter(Boolean)).size;
  const explicit = new Map();
  const makeupScheduled = new Map(Object.values(student?.attendanceMakeups || {})
    .filter(m => /^\d{4}-\d{2}-\d{2}$/.test(String(m?.scheduledDate || '')))
    .map(m => [String(m.makeupDate || ''), String(m.scheduledDate)]));
  // A correction without a source is also protected as a legacy manual value.
  (posaulas || []).forEach(post => {
    const actual = dateKey(postReferenceDate(post));
    const key = makeupScheduled.get(actual) || actual;
    const status = attendanceStatus(post);
    if (!key || !status) return;
    const priority = post.attendanceSource === 'html' ? 1 : 2;
    const old = explicit.get(key);
    if (!old || priority > old.priority || (priority === old.priority && status === 'absent')) explicit.set(key, { status, priority });
  });
  const absentKeys = new Set([...explicit].filter(([,v]) => v.status === 'absent').map(([k]) => k));
  explicit.forEach((_,key) => candidateKeys.add(key));
  const matchScheduledDate = date => {
    if (!date) return '';
    for (let daysBack = 0; daysBack <= 3; daysBack++) {
      const key = dateKey(addDays(date,-daysBack));
      if (candidateKeys.has(key) && !presentKeys.has(key) && !absentKeys.has(key)) return key;
    }
    return '';
  };
  const orderedPosts = (posaulas || []).map(post => ({ post, reference:postReferenceDate(post) }))
    .sort((a,b) => (a.reference?.getTime() || 0) - (b.reference?.getTime() || 0));
  const unmatchedPosts = [];
  // O pós-aula de uma reposição carrega o dia real da aula (ex.: quarta), que
  // não é dia de aula do aluno. Sem essa checagem ele virava um candidateKey
  // novo e contava a mesma aula duas vezes: uma na reposição (segunda) e outra
  // no classDate exato (quarta). A presença será atribuída à falta prevista
  // quando o pós-aula da reposição entrar, nunca só pelo agendamento.
  const makeupActualDates = new Set(
    Object.values(student?.attendanceMakeups || {})
      .map(makeup => String(makeup?.makeupDate || ''))
      .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
  );

  // Reserva primeiro as datas exatas para um registro legado próximo não
  // ocupar a aula que já possui classDate confiável.
  const seenPostDates = new Set();
  orderedPosts.forEach(entry => {
    const referenceKey = dateKey(entry.reference);
    if (referenceKey && seenPostDates.has(referenceKey)) { entry.exactMatch = true; return; }
    if (referenceKey) seenPostDates.add(referenceKey);
    const scheduledKey = makeupScheduled.get(referenceKey);
    if (scheduledKey && explicit.has(scheduledKey)) {
      if (!absentKeys.has(scheduledKey)) presentKeys.add(scheduledKey);
      entry.exactMatch = true;
      return;
    }
    if (explicit.has(referenceKey)) {
      if (!absentKeys.has(referenceKey) && !makeupActualDates.has(referenceKey)) presentKeys.add(referenceKey);
      entry.exactMatch = !makeupActualDates.has(referenceKey) || absentKeys.has(referenceKey);
      return;
    }
    const explicitKey = dateKey(entry.post.classDate);
    if (explicitKey && !absentKeys.has(explicitKey) && !presentKeys.has(explicitKey) && !makeupActualDates.has(explicitKey)) {
      candidateKeys.add(explicitKey);
      presentKeys.add(explicitKey);
      entry.exactMatch = true;
    }
  });
  orderedPosts.forEach(({ post, reference, exactMatch }) => {
    const explicitKey = dateKey(post.classDate);
    if (exactMatch) return;
    // classDate/createdAt pode representar o envio, não a aula. Se a data não
    // coincidir com a grade, procura a falta prevista mais próxima anteriormente.
    const matched = matchScheduledDate(reference);
    if (matched) presentKeys.add(matched);
    else unmatchedPosts.push({ post, reference, explicitKey });
  });

  const availableKeys = [...candidateKeys].filter(key => !presentKeys.has(key) && !absentKeys.has(key)).sort();
  unmatchedPosts.forEach(({ post, reference, explicitKey }) => {
    const referenceKey = dateKey(reference);
    const limitKey = reference ? dateKey(addDays(reference,14)) : '';
    const availableIndex = referenceKey
      ? availableKeys.findIndex(key => key >= referenceKey && (!limitKey || key <= limitKey))
      : -1;
    if (availableIndex >= 0) {
      presentKeys.add(availableKeys.splice(availableIndex,1)[0]);
    } else {
      const extraKey = explicitKey || dateKey(post.createdAt) || referenceKey;
      if (extraKey && !absentKeys.has(extraKey)) extraClassKeys.add(extraKey);
    }
  });

  // Presenças confirmadas pelo professor podem existir sem um pós-aula nessa
  // data. O registro explícito prevalece sobre a inferência pelo arquivo.
  // Precisa rodar ANTES do bloco de reposição abaixo: uma falta só vira
  // presença coberta por reposição depois que essa marcação manual existe.
  (Array.isArray(student?.attendancePresentDates) ? student.attendancePresentDates : []).forEach(value => {
    const key = String(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(key) && candidateKeys.has(key) && !absentKeys.has(key)) presentKeys.add(key);
  });

  absentKeys.forEach(key => presentKeys.delete(key));

  // O evento da agenda descreve a reposição, mas não confirma presença.
  // Só mostramos o asterisco após existir um pós-aula para o dia real.
  Object.values(student?.attendanceMakeups || {}).forEach(makeup => {
    const scheduledKey = String(makeup?.scheduledDate || '');
    const actualKey = String(makeup?.makeupDate || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledKey) || !candidateKeys.has(scheduledKey)) return;
    if (presentKeys.has(scheduledKey) && orderedPosts.some(({ post, reference }) => dateKey(post.classDate) === actualKey || dateKey(reference) === actualKey)) {
      makeupByScheduledKey.set(scheduledKey, actualKey);
    }
  });

  // Sem data de início/dias fixos (ou com cadastro incompatível com o legado),
  // ainda existe uma certeza: cada pós-aula representa uma aula realizada.
  // Sem calendário suficiente para provar uma ausência, não inventamos faltas.
  if (recordedHeld && !explicit.size && (!start || !schedules.length || !presentKeys.size)) {
    const points = [...new Map((posaulas || []).map(postReferenceDate).filter(Boolean).map(date => [dateKey(date), date])).values()].sort((a,b)=>a-b).map(date => ({
      key:dateKey(date),
      label:date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
      weekday:date.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),
      present:true,
      value:100,
      color:PROGRESS_COLORS.good,
    }));
    return {
      held:recordedHeld,
      misses:0,
      scheduled:recordedHeld,
      attendedScheduled:recordedHeld,
      rate:100,
      points,
      currentStreak:recordedHeld,
      maxStreak:recordedHeld,
      missedDates:[],
      untracked:0,
      trackingStartKey:'',
      inferredOnly:true,
      makeups:[],
    };
  }
  const trackingStartKey = [...presentKeys, ...explicit.keys()].sort()[0] || '';
  const untracked = trackingStartKey ? [...candidateKeys].filter(key => key < trackingStartKey).length : candidateKeys.size;
  const scheduled = [];
  const excused = [];
  if (candidateKeys.size && trackingStartKey) {
    const holidayCache = {};
    for (const key of [...candidateKeys].sort()) {
      if (key < trackingStartKey) continue; // antes do app: sem dados, nunca falta
      const d = new Date(`${key}T00:00:00`);
      holidayCache[d.getFullYear()] ||= nationalHolidayKeys(d.getFullYear());
      // Feriado/cancelamento só sai da conta quando realmente não houve aula.
      // Se existe pós-aula, a aula aconteceu e vale para a sequência.
      const holiday = holidayCache[d.getFullYear()].has(key);
      const cancelled = exceptions.has(key);
      if (!presentKeys.has(key) && !explicit.has(key) && (holiday || cancelled)) {
        excused.push({ date:new Date(d), key, reason:holiday ? 'feriado' : 'aula cancelada' });
        continue;
      }
      scheduled.push({ date:new Date(d), key, present:presentKeys.has(key) });
    }
  }
  const attendanceBaseline = student?.attendanceBaseline || {};
  const baselineThrough = /^\d{4}-\d{2}-\d{2}$/.test(String(attendanceBaseline.through || ''))
    ? String(attendanceBaseline.through) : '';
  const baselineAttended = baselineThrough ? Math.max(0, Number(attendanceBaseline.attended || 0)) : 0;
  const baselineMisses = baselineThrough ? Math.max(0, Number(attendanceBaseline.misses || 0)) : 0;
  const countedSchedule = baselineThrough ? scheduled.filter(item => item.key > baselineThrough) : scheduled;
  let currentStreak = baselineThrough && baselineMisses === 0 ? baselineAttended : 0;
  let maxStreak = currentStreak;
  countedSchedule.forEach(item => {
    currentStreak = item.present ? currentStreak + 1 : 0;
    maxStreak = Math.max(maxStreak, currentStreak);
  });
  const dynamicMisses = countedSchedule.filter(x => !x.present).length;
  const misses = baselineMisses + dynamicMisses;
  const attendedScheduled = baselineAttended + countedSchedule.length - dynamicMisses;
  const scheduledCount = baselineAttended + baselineMisses + countedSchedule.length;
  const rate = scheduledCount ? Math.round(attendedScheduled/scheduledCount*100) : null;
  const held = baselineThrough
    ? baselineAttended + (posaulas || []).filter(post => dateKey(postReferenceDate(post)) > baselineThrough).length
    : recordedHeld;
  // Cada ponto representa a data real prevista da aula. Antes o rótulo usava
  // a segunda-feira que iniciava a semana, parecendo registrar falta no dia errado.
  const points = [...scheduled.map(item => ({
    key:item.key,
    label:`${item.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}${makeupByScheduledKey.has(item.key) ? '*' : ''}`,
    weekday:item.date.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),
    present:item.present,
    makeupDate:makeupByScheduledKey.get(item.key) || '',
    value:item.present ? 100 : 0,
    color:item.present ? PROGRESS_COLORS.good : PROGRESS_COLORS.low,
  })), ...excused.map(item => ({
    key:item.key,
    label:item.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
    weekday:item.date.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),
    present:false,
    excused:true,
    reason:item.reason,
    value:0,
    color:'#F59E0B',
  }))].sort((a,b) => a.key.localeCompare(b.key));
  const missedDates = countedSchedule.filter(item => !item.present).map(item => ({
    key:item.key,
    label:item.date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.', ''),
  }));
  const makeups = scheduled.filter(item => makeupByScheduledKey.has(item.key)).map(item => {
    const actualKey = makeupByScheduledKey.get(item.key);
    return {
      scheduledKey:item.key,
      scheduledLabel:item.date.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
      actualKey,
      actualLabel:new Date(`${actualKey}T00:00:00`).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),
    };
  });
  const excusedDates = excused.map(item => ({
    key:item.key,
    label:item.date.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit'}).replace('.', ''),
    reason:item.reason,
  }));
  return { held, misses, scheduled:scheduledCount, attendedScheduled, rate, points, currentStreak, maxStreak, missedDates, excusedDates, makeups, untracked, trackingStartKey, inferredOnly:false };
}
root.CzkAttendance = { calculateAttendance, attendanceStatus, postReferenceDate, dateKey };
if (typeof module !== 'undefined' && module.exports) module.exports = root.CzkAttendance;
})(globalThis);
