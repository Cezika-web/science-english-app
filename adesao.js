/* Adesão — cálculo e textos compartilhados entre o app do aluno (index.html) e o
 * painel do professor (admin/). Sem dependência de DOM nem de Firebase: recebe
 * dados já lidos e devolve números e textos. Por isso roda igual nos dois lados
 * (e nos testes em Node).
 *
 * O que entra na nota (por semana, segunda a domingo):
 *   Constância  dias com pelo menos `minDia` min ativos ÷ meta de dias
 *   Atividades  % de exercícios feitos × fator de tempo (tempo real ÷ tempo esperado)
 *   Pós-aula    minutos lidos (somando todas as aberturas) ÷ meta por pós-aula
 *   Aulas       aulas assistidas ÷ aulas previstas
 *   Desafio     partes feitas ÷ partes disponíveis
 * Pilar sem dado (ex.: aluno sem aulas, ou semana anterior à coleta) sai da
 * conta e os pesos dos demais se redistribuem. A nota do aluno é a média das
 * últimas 3 semanas fechadas, com mais peso para a mais recente (1·2·3).
 */
(function (root) {
  'use strict';

  var KEYS = ['C', 'At', 'Pos', 'Aula', 'Des'];
  var PIL = {
    C:    { name: 'Constância', short: 'Co', ic: '📅', desc: 'Dias da semana em que estudou' },
    At:   { name: 'Atividades', short: 'At', ic: '✏️', desc: 'Exercícios feitos, com tempo mínimo' },
    Pos:  { name: 'Pós-aula',   short: 'Pó', ic: '📖', desc: 'Tempo de leitura somado' },
    Aula: { name: 'Aulas',      short: 'Au', ic: '🎓', desc: 'Presença nas aulas' },
    Des:  { name: 'Desafio',    short: 'De', ic: '🏆', desc: 'Partes do desafio feitas' }
  };
  var WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  var WD1 = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
  var WDF = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  var DEFAULTS = {
    minPos: 5, secEx: 15, metaDias: 5, minDia: 3, limiteSeg: 60,
    metaDiaMin: 10, metaDiasEstudo: 5, minTipo: 1,
    w: { C: 25, At: 25, Pos: 20, Aula: 20, Des: 10 }
  };

  // ── utilidades ────────────────────────────────────────────────────────
  function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += a[i]; return s; }
  function mean(a) { return a.length ? sum(a) / a.length : 0; }
  function pct(v) { return Math.round(v * 100); }
  function num1(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }
  function fm(m) { return m < 1 ? Math.round(m * 60) + ' s' : num1(m) + ' min'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function listPt(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' e ' + a[a.length - 1]; }
  function plural(n, s, p) { return n + ' ' + (n === 1 ? s : p); }

  function toDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    if (typeof v.toDate === 'function') { var d0 = v.toDate(); return isNaN(d0) ? null : d0; }
    if (typeof v === 'object' && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, +v.slice(8, 10));
    var d = new Date(v);
    return isNaN(d) ? null : d;
  }
  function dayKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function ddmm(d) { return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'); }
  // Chave do item (pós-aula, atividade, extra) no documento de uso do dia.
  // Mesma regra do cronômetro do app (CzkUsage em index.html).
  function itemKey(kind, id) { return kind + '_' + String(id).replace(/[^A-Za-z0-9_-]/g, '_'); }

  // Mesma regra do app: o nome do arquivo guarda a data real da aula; createdAt
  // pode ser a data da importação. Mantenha igual a postReferenceDate (index.html).
  function postFilenameDate(post) {
    var sources = [post && post.filename, post && post.url, post && post.id].filter(Boolean).map(String);
    for (var i = 0; i < sources.length; i++) {
      var value = sources[i];
      try { value = decodeURIComponent(sources[i]); } catch (e) { /* mantém */ }
      var match = value.match(/(?:^|[^\d])(\d{2})[-_](\d{2})[-_](20\d{2})(?=[^\d]|$)/);
      var year, month, day;
      if (match) { month = match[1]; day = match[2]; year = match[3]; }
      else {
        match = value.match(/(?:^|[^\d])(20\d{2})[-_](\d{2})[-_](\d{2})(?=[^\d]|$)/);
        if (match) { year = match[1]; month = match[2]; day = match[3]; }
      }
      if (!match) continue;
      var parsed = new Date(Number(year), Number(month) - 1, Number(day));
      if (parsed.getFullYear() === Number(year) && parsed.getMonth() === Number(month) - 1 && parsed.getDate() === Number(day)) return parsed;
    }
    return null;
  }
  function postRef(post) { return postFilenameDate(post) || toDate(post && (post.classDate || post.createdAt)); }

  function cfgOf(raw) {
    var c = raw || {}, w = c.w || {};
    function n(v, d, lo, hi) { v = Number(v); if (!isFinite(v)) return d; return Math.max(lo, Math.min(hi, v)); }
    return {
      minPos: n(c.minPos, DEFAULTS.minPos, 1, 30),
      secEx: n(c.secEx, DEFAULTS.secEx, 3, 180),
      metaDias: Math.round(n(c.metaDias, DEFAULTS.metaDias, 1, 7)),
      minDia: n(c.minDia, DEFAULTS.minDia, 1, 60),
      // Maior intervalo entre dois movimentos que ainda conta como estudo. Vale para a
      // coleta daqui para frente (o app do aluno lê este valor); não refaz o que já foi gravado.
      limiteSeg: Math.round(n(c.limiteSeg, DEFAULTS.limiteSeg, 20, 180)),
      // Meta de estudo: minutos por dia, quantos dias da semana precisam bater a meta e
      // quantos minutos um tipo de estudo precisa ter no dia para contar como "feito".
      metaDiaMin: n(c.metaDiaMin, DEFAULTS.metaDiaMin, 1, 180),
      metaDiasEstudo: Math.round(n(c.metaDiasEstudo, DEFAULTS.metaDiasEstudo, 1, 7)),
      minTipo: n(c.minTipo, DEFAULTS.minTipo, 0.5, 30),
      w: {
        C: n(w.C, DEFAULTS.w.C, 0, 100), At: n(w.At, DEFAULTS.w.At, 0, 100), Pos: n(w.Pos, DEFAULTS.w.Pos, 0, 100),
        Aula: n(w.Aula, DEFAULTS.w.Aula, 0, 100), Des: n(w.Des, DEFAULTS.w.Des, 0, 100)
      },
      coletaDesde: /^\d{4}-\d{2}-\d{2}$/.test(c.coletaDesde || '') ? c.coletaDesde : null
    };
  }

  function band(v) {
    if (v >= 85) return { k: 'alta', label: 'Alta', color: '#15935f', soft: '#16A34A' };
    if (v >= 65) return { k: 'media', label: 'Média', color: '#d97706', soft: '#F59E0B' };
    return { k: 'baixa', label: 'Baixa', color: '#dc2626', soft: '#F97316' };
  }
  function combine(parts, cfg) {
    var n = 0, d = 0;
    KEYS.forEach(function (k) { if (parts[k] == null) return; n += cfg.w[k] * parts[k]; d += cfg.w[k]; });
    return d ? Math.round(100 * n / d) : null;
  }
  // Peso efetivo (em %) de um pilar, já redistribuído entre os que se aplicam.
  function effWeight(present, k, cfg) {
    var d = 0;
    KEYS.forEach(function (x) { if (present[x]) d += cfg.w[x]; });
    return d && present[k] ? Math.round(100 * cfg.w[k] / d) : 0;
  }

  // ── cálculo ───────────────────────────────────────────────────────────
  /* input = {
   *   now: Date,
   *   student: { createdAt, challengeEnabled },
   *   usage:   [{ date:'AAAA-MM-DD', secs:{total,posaula,atividade,desafio,outros}, items:{}, itemOpens:{}, opens }],
   *   posts:   [{ id, title, createdAt, classDate, filename, url }],
   *   activities: [{ id, createdAt, finalizada, exTotal, exFeitos, correct, wrong, correctedAt }],
   *   attendance: [{ key:'AAAA-MM-DD', present:bool, excused?:bool }],
   *   challenge: { enabled, weeks:['AAAA-MM-DD'], completed:['AAAA-MM-DD-part-1'] }
   * } */
  function compute(input, cfgRaw) {
    var cfg = cfgOf(cfgRaw);
    var now = input.now || new Date();
    var studentStart = toDate(input.student && input.student.createdAt);
    var usage = input.usage || [];
    var usageByDay = {}, itemSecs = {}, itemOpens = {}, earliest = null, opensTotal = 0;
    usage.forEach(function (u) {
      if (!u || !u.date) return;
      usageByDay[u.date] = u;
      if (!earliest || u.date < earliest) earliest = u.date;
      opensTotal += Number(u.opens || 0);
      var it = u.items || {}, io = u.itemOpens || {};
      Object.keys(it).forEach(function (k) { itemSecs[k] = (itemSecs[k] || 0) + Number(it[k] || 0); });
      Object.keys(io).forEach(function (k) { itemOpens[k] = (itemOpens[k] || 0) + Number(io[k] || 0); });
    });
    var coleta = cfg.coletaDesde || earliest;
    var posts = (input.posts || []).map(function (p) { return { p: p, ref: postRef(p) }; }).filter(function (x) { return x.ref; });
    var acts = (input.activities || []).map(function (a) { return { a: a, at: toDate(a.createdAt) }; }).filter(function (x) { return x.at; });
    var att = input.attendance || [];
    var ch = input.challenge || {};
    var start0 = mondayOf(now);

    function weekCalc(start, isCurrent) {
      var key = dayKey(start), end = addDays(start, 6), endExclusive = addDays(start, 7);
      // days = minutos de ESTUDO por dia: pós-aula + atividades (inclui extras e correção) +
      // desafio + vocabulário/verbos/chunks. df = o resto do uso do app (início, progresso,
      // perfil...), que é uso mas não é estudo e não entra em dia estudado nem na meta.
      var days = [], dp = [], da = [], dd = [], dv = [], df = [], i;
      for (i = 0; i < 7; i++) {
        var u = usageByDay[dayKey(addDays(start, i))];
        var s = (u && u.secs) || {};
        var tot = Number(s.total || 0) / 60, p = Number(s.posaula || 0) / 60, a = Number(s.atividade || 0) / 60;
        var d2 = Number(s.desafio || 0) / 60, v = Number(s.vocab || 0) / 60, st = p + a + d2 + v;
        days.push(st); dp.push(p); da.push(a); dd.push(d2); dv.push(v); df.push(Math.max(0, tot - st));
      }
      var elapsed = isCurrent ? ((now.getDay() + 6) % 7) + 1 : 7;
      var activeDays = days.slice(0, elapsed).filter(function (m) { return m >= cfg.minDia; }).length;
      var hasTime = !!coleta && key >= coleta;

      // Meta de estudo da semana: dias que bateram a meta diária, minutos, e quais tipos de
      // estudo (ler pós-aula, vocabulário/verbos/chunks, exercícios) foram feitos.
      var goalDays = days.map(function (m, k) {
        return { min: m, hit: k < elapsed && m >= cfg.metaDiaMin, leitura: dp[k], vocab: dv[k], exercicio: da[k] + dd[k] };
      });
      var upto = function (fn) { return sum(goalDays.slice(0, elapsed).map(fn)); };
      var tipoFeito = function (fn) { return goalDays.slice(0, elapsed).some(function (g) { return fn(g) >= cfg.minTipo; }); };
      var goal = {
        metaDiaMin: cfg.metaDiaMin, metaDias: cfg.metaDiasEstudo, metaSemanaMin: cfg.metaDiaMin * cfg.metaDiasEstudo,
        hits: goalDays.filter(function (g) { return g.hit; }).length,
        minutos: upto(function (g) { return g.min; }),
        mins: { leitura: upto(function (g) { return g.leitura; }), vocab: upto(function (g) { return g.vocab; }), exercicio: upto(function (g) { return g.exercicio; }) },
        tipos: { leitura: tipoFeito(function (g) { return g.leitura; }), vocab: tipoFeito(function (g) { return g.vocab; }), exercicio: tipoFeito(function (g) { return g.exercicio; }) },
        dias: goalDays
      };
      goal.atingida = goal.hits >= goal.metaDias;

      var posItems = !hasTime ? [] : posts.filter(function (x) { return x.ref >= start && x.ref < endExclusive; }).map(function (x) {
        var pk = itemKey('pos', x.p.id), m = (itemSecs[pk] || 0) / 60;
        return { id: x.p.id, name: x.p.title || 'Pós-aula ' + ddmm(x.ref), ref: x.ref, minutes: m, opens: itemOpens[pk] || 0, score: Math.min(1, m / cfg.minPos) };
      });
      var atItems = acts.filter(function (x) { return x.at >= start && x.at < endExclusive; }).map(function (x) {
        var a = x.a, known = Number(a.exTotal) > 0;
        var n = known ? Number(a.exTotal) : 1;
        var done = known ? Math.min(n, Number(a.exFeitos || 0)) : (a.finalizada ? 1 : 0);
        var t = (itemSecs[itemKey('act', a.id)] || 0) / 60, exp = done * cfg.secEx / 60;
        var entrega = done / n;
        var fator = !hasTime ? 1 : (done ? Math.min(1, t / exp) : 0);
        return { id: a.id, name: a.name || 'Atividade', n: n, done: done, time: t, exp: exp, entrega: entrega, fator: fator, score: entrega * fator };
      });
      var nTot = sum(atItems.map(function (i) { return i.n; }));

      var pts = att.filter(function (x) { return x.key >= key && x.key <= dayKey(end) && !x.excused; });
      var aulas = [pts.length, pts.filter(function (x) { return x.present; }).length];

      var avail = 0, doneParts = 0;
      if (ch.enabled !== false && (ch.weeks || []).indexOf(key) >= 0 && (!studentStart || end >= studentStart)) {
        avail = 2;
        doneParts = [1, 2].filter(function (n) { return (ch.completed || []).indexOf(key + '-part-' + n) >= 0; }).length;
      }

      var parts = {
        C: hasTime ? Math.min(1, activeDays / cfg.metaDias) : null,
        At: nTot ? sum(atItems.map(function (i) { return i.n * i.score; })) / nTot : null,
        Pos: posItems.length ? mean(posItems.map(function (i) { return i.score; })) : null,
        Aula: aulas[0] ? aulas[1] / aulas[0] : null,
        Des: avail ? doneParts / avail : null
      };
      var corr = 0, wrong = 0;
      acts.forEach(function (x) {
        var when = toDate(x.a.correctedAt) || x.at;
        if (!(x.a.correct != null || x.a.wrong != null) || when < start || when >= endExclusive) return;
        corr += Number(x.a.correct || 0); wrong += Number(x.a.wrong || 0);
      });
      return {
        key: key, start: start, label: ddmm(start) + ' – ' + ddmm(end), short: ddmm(start),
        partial: !!isCurrent, elapsed: elapsed, days: days, dp: dp, da: da, dd: dd, dv: dv, df: df, goal: goal,
        activeDays: activeDays, hasTime: hasTime, weekMin: sum(days),
        posItems: posItems, atItems: atItems, aulas: aulas, des: [avail, doneParts],
        parts: parts, total: combine(parts, cfg),
        valid: !isCurrent && (!studentStart || end >= studentStart),
        acc: (corr + wrong) ? Math.round(corr / (corr + wrong) * 100) : null
      };
    }

    var weeks = [-3, -2, -1, 0].map(function (off) { return weekCalc(addDays(start0, off * 7), off === 0); });
    var cur = weeks[3];
    // Só semanas com tempo medido entram na nota: sem constância, quem estuda num dia só
    // pareceria melhor do que é, e as semanas ficariam incomparáveis entre si.
    var used = weeks.slice(0, 3).filter(function (w) { return w.valid && w.hasTime && w.total != null; });
    var res = {
      cfg: cfg, weeks: weeks, cur: cur, used: used, now: now, coleta: coleta,
      status: used.length ? 'ok' : 'coletando',
      opensTotal: opensTotal, hasUsage: usage.length > 0,
      timeReady: used.some(function (w) { return w.hasTime; })
    };
    if (!used.length) { res.pm = {}; res.totals = []; res.index = null; res.band = null; res.trend = null; return res; }

    var totals = used.map(function (w) { return w.total; });
    var wts = used.map(function (_, i) { return 3 - (used.length - 1 - i); });
    res.totals = totals;
    res.index = Math.round(sum(totals.map(function (t, i) { return t * wts[i]; })) / sum(wts));
    res.band = band(res.index);
    res.trend = used.length >= 2 ? totals[totals.length - 1] - totals[totals.length - 2] : null;
    res.pm = {};
    KEYS.forEach(function (k) {
      var v = used.map(function (w) { return w.parts[k]; }).filter(function (x) { return x != null; });
      res.pm[k] = v.length ? mean(v) : null;
    });
    var timed = used.filter(function (w) { return w.hasTime; });
    res.avgDays = timed.length ? mean(timed.map(function (w) { return w.activeDays; })) : null;
    var posTot = [].concat.apply([], used.map(function (w) { return w.posItems.map(function (i) { return i.minutes; }); }));
    res.avgPos = posTot.length ? mean(posTot) : null;
    var at = [].concat.apply([], used.map(function (w) { return w.atItems; }));
    var nAll = sum(at.map(function (i) { return i.n; })), doneAll = sum(at.map(function (i) { return i.done; }));
    res.entrega = nAll ? doneAll / nAll : null;
    var atT = [].concat.apply([], timed.map(function (w) { return w.atItems; }));
    res.timeAll = sum(atT.map(function (i) { return i.time; }));
    res.expAll = sum(atT.map(function (i) { return i.exp; }));
    res.fator = res.expAll ? Math.min(1, res.timeAll / res.expAll) : (sum(atT.map(function (i) { return i.done; })) ? 1 : null);
    var shares = timed.filter(function (w) { return w.weekMin > 0; }).map(function (w) { return Math.max.apply(null, w.days) / w.weekMin; });
    res.topShare = shares.length ? mean(shares) : 0;
    res.aulasPrev = sum(used.map(function (w) { return w.aulas[0]; }));
    res.aulasPres = sum(used.map(function (w) { return w.aulas[1]; }));
    res.desDisp = sum(used.map(function (w) { return w.des[0]; }));
    res.desFeitas = sum(used.map(function (w) { return w.des[1]; }));
    res.acc = used.map(function (w) { return w.acc; });
    res.accLast = (function () { for (var i = res.acc.length - 1; i >= 0; i--) if (res.acc[i] != null) return res.acc[i]; return null; })();
    res.tags = tagsOf(res);
    res.diag = diagOf(res);
    return res;
  }

  // ── etiquetas e frases (visão do professor) ───────────────────────────
  function tagsOf(c) {
    var t = [];
    if (c.trend != null && c.trend <= -10) t.push({ t: '↓ Caindo (' + c.trend + ')', c: 'bad' });
    if (c.avgDays != null && c.avgDays < 1) t.push({ t: 'Quase não abre o app', c: 'bad' });
    if (c.pm.C != null && c.pm.C < .5 && (c.pm.At || 0) >= .75) t.push({ t: 'Tudo concentrado em poucos dias', c: 'warn' });
    if (c.entrega != null && c.entrega >= .7 && c.fator != null && c.fator < .6) t.push({ t: 'Responde rápido demais', c: 'warn' });
    if (c.pm.Pos != null && c.pm.Pos < .5) t.push({ t: 'Quase não lê o pós-aula', c: 'bad' });
    if (c.entrega != null && c.entrega < .5) t.push({ t: 'Faz poucas atividades', c: 'warn' });
    if (!t.length) t.push(c.index >= 85 ? { t: 'Rotina constante', c: 'ok' } : { t: 'Dentro do esperado', c: 'neutral' });
    return t;
  }
  function diagOf(c) {
    var cfg = c.cfg, o = [], n = c.used.length;
    if (c.trend != null && c.trend <= -10) o.push({ ic: '📉', txt: 'A adesão caiu ' + (-c.trend) + ' pontos da semana de ' + c.used[n - 2].short + ' para a de ' + c.used[n - 1].short + '.' });
    if (c.pm.C != null && c.pm.C < .7 && c.avgDays != null) {
      var s = 'Estudou em média ' + num1(c.avgDays) + ' de 7 dias por semana (meta: ' + cfg.metaDias + ').';
      if (c.topShare >= .6) s += ' Em média ' + pct(c.topShare) + '% do tempo da semana ficou concentrado num único dia.';
      o.push({ ic: '📅', txt: s });
    }
    if (c.entrega != null && c.entrega >= .7 && c.fator != null && c.fator < .8) o.push({ ic: '⏱️', txt: 'Faz as atividades, mas rápido: ' + fm(c.timeAll) + ' onde o esperado seria ≥ ' + fm(c.expAll) + '. Vale conferir se está lendo cada questão.' });
    else if (c.entrega != null && c.entrega < .7) o.push({ ic: '✏️', txt: 'Fez só ' + pct(c.entrega) + '% dos exercícios enviados nas últimas ' + n + ' semanas.' });
    if (c.avgPos != null && c.pm.Pos != null && c.pm.Pos < .8) o.push({ ic: '📖', txt: 'Lê cada pós-aula por ' + fm(c.avgPos) + ' em média (mínimo: ' + cfg.minPos + ' min, somando todas as aberturas).' });
    if (c.aulasPrev && c.aulasPres / c.aulasPrev < .8) o.push({ ic: '🎓', txt: 'Esteve em ' + c.aulasPres + ' de ' + c.aulasPrev + ' aulas previstas.' });
    if (c.desDisp && c.desFeitas / c.desDisp < .5) o.push({ ic: '🏆', txt: 'Desafio: fez ' + c.desFeitas + ' de ' + c.desDisp + ' partes disponíveis.' });
    if (!o.length) o.push({ ic: '✅', txt: 'Rotina saudável' + (c.avgDays != null ? ': ' + num1(c.avgDays) + ' dias ativos por semana' : '') + (c.avgPos != null ? ', pós-aula lido por ' + fm(c.avgPos) + ' em média' : '') + ' e atividades em dia.' });
    return o.slice(0, 4);
  }

  // ── textos da visão do aluno ──────────────────────────────────────────
  var GOOD = { C: 'Você estuda em vários dias', At: 'Atividades em dia', Pos: 'Pós-aulas lidos com atenção', Aula: 'Presença nas aulas', Des: 'Boa participação no Desafio' };
  var TINY = {
    C: 'estudar em mais dias da semana, mesmo que sejam 10 minutinhos',
    At: 'fazer as atividades que ainda estão pendentes',
    Pos: 'ler cada pós-aula por uns 5 minutinhos',
    Aula: 'não faltar às aulas',
    Des: 'participar do Desafio da semana'
  };
  function suggestComment(c, firstName) {
    var nm = firstName || 'Oi', cfg = c.cfg;
    if (c.status !== 'ok') return nm + ', bem-vindo(a) à sua adesão! Nas próximas semanas você vai ver aqui como está sua rotina de estudo: dias, pós-aulas, atividades e Desafio. Comece com 10 minutinhos por dia.';
    var ks = KEYS.filter(function (k) { return c.pm[k] != null; });
    var worst = ks.slice().sort(function (a, b) { return c.pm[a] - c.pm[b]; })[0];
    if (c.avgDays != null && c.avgDays < 1) return nm + ', sentimos sua falta por aqui! Sem pressão: que tal começar com 10 minutinhos amanhã? Abra o pós-aula da última aula e leia com calma. Estou por aqui para ajudar.';
    if (c.trend != null && c.trend <= -10) return nm + ', percebi que seu ritmo diminuiu nas últimas semanas. Isso acontece com todo mundo. E você já mostrou que consegue: na semana de ' + c.used[0].short + ' sua adesão estava em ' + c.totals[0] + '. Vamos retomar aos poucos? 10 a 15 minutos por dia já fazem diferença.';
    if (c.pm.C != null && c.pm.C < .5 && (c.pm.At || 0) >= .75) return nm + ', você manda muito bem nos dias de aula: faz as atividades inteiras e lê o pós-aula. O próximo passo é espalhar esse esforço. 15 minutinhos em mais 3 dias da semana fixam muito mais do que tudo num dia só.';
    if (c.entrega != null && c.entrega >= .7 && c.fator != null && c.fator < .6) return nm + ', você completou as atividades, parabéns pela disciplina! Agora vale ir com mais calma: ler cada pergunta e pensar antes de responder é o que faz o inglês ficar.';
    if (c.pm.Pos != null && c.pm.Pos < .5) return nm + ', você tem feito as atividades, ótimo! O pós-aula é onde a aula fica registrada. Reserve uns ' + cfg.minPos + ' minutinhos para ler com calma: vale muito para fixar o que a gente viu.';
    if (c.entrega != null && c.entrega < .5 && (c.pm.Pos || 0) >= .8) return nm + ', você lê os pós-aulas com atenção e esse é um ótimo hábito. Falta colocar em prática: comece pelas atividades. Mesmo 10 exercícios por dia já fazem a diferença.';
    if (c.index >= 85) return nm + ', que rotina bonita! Você aparece em quase tudo que o curso oferece e isso se vê nos seus acertos. Continue assim.';
    return nm + ', você já tem um bom ritmo. O que mais vai render agora é ' + (worst ? TINY[worst] : 'manter a regularidade') + '. Pequenos ajustes, grande efeito.';
  }
  function studentChips(c) {
    var t = [];
    if (c.status !== 'ok') return t;
    if (c.trend != null && c.trend <= -10) t.push({ t: '📉 Seu ritmo caiu nas últimas semanas', c: 'warn' });
    else if (c.trend != null && c.trend >= 8) t.push({ t: '📈 Seu ritmo está subindo', c: 'ok' });
    if (c.avgDays != null && c.avgDays < 1) t.push({ t: '📱 Poucos dias com o app aberto', c: 'warn' });
    if (c.pm.C != null && c.pm.C < .5 && (c.pm.At || 0) >= .75) t.push({ t: '📅 Você estuda forte num dia só', c: 'warn' });
    if (c.entrega != null && c.entrega >= .7 && c.fator != null && c.fator < .6) t.push({ t: '⏱️ Atividades feitas bem rápido', c: 'warn' });
    if (c.pm.Pos != null && c.pm.Pos < .5) t.push({ t: '📖 Pós-aulas lidos por pouco tempo', c: 'warn' });
    if (c.entrega != null && c.entrega < .5) t.push({ t: '✏️ Faltam atividades por fazer', c: 'warn' });
    KEYS.filter(function (k) { return c.pm[k] != null && c.pm[k] >= .9; }).forEach(function (k) { t.push({ t: '✅ ' + GOOD[k], c: 'ok' }); });
    return t.slice(0, 5);
  }
  // Média de minutos por dia da semana, nas semanas usadas e na atual (só dias já passados).
  function wdStats(c) {
    var ws = c.used.concat([c.cur]);
    var avg = WD.map(function (_, d) {
      return mean(ws.filter(function (w) { return !(w.partial && d >= w.elapsed); }).map(function (w) { return w.days[d]; }));
    });
    var max = Math.max.apply(null, avg), minDia = c.cfg.minDia;
    return {
      avg: avg, max: max, best: max >= minDia ? avg.indexOf(max) : -1,
      blanks: avg.map(function (m, d) { return m < minDia ? d : -1; }).filter(function (d) { return d >= 0; })
    };
  }
  function changes(c) {
    var up = [], down = [], n = c.used.length;
    if (n < 2) return { up: up, down: down, from: null, to: null };
    var a = c.used[n - 2], b = c.used[n - 1];
    function posAvg(w) { return w.posItems.length ? mean(w.posItems.map(function (i) { return i.minutes; })) : null; }
    function diff(k) { return (a.parts[k] == null || b.parts[k] == null) ? 0 : b.parts[k] - a.parts[k]; }
    if (diff('C') >= .15) up.push('Você estudou em mais dias: ' + plural(a.activeDays, 'dia', 'dias') + ' → ' + plural(b.activeDays, 'dia', 'dias'));
    if (diff('C') <= -.15) down.push('Você estudou em menos dias: ' + plural(a.activeDays, 'dia', 'dias') + ' → ' + plural(b.activeDays, 'dia', 'dias'));
    if (diff('At') >= .15) up.push('Você avançou nas atividades: ' + pct(a.parts.At) + '% → ' + pct(b.parts.At) + '%');
    if (diff('At') <= -.15) down.push('Menos atividades concluídas: ' + pct(a.parts.At) + '% → ' + pct(b.parts.At) + '%');
    if (diff('Pos') >= .15) up.push('Você leu os pós-aulas por mais tempo: ' + fm(posAvg(a)) + ' → ' + fm(posAvg(b)));
    if (diff('Pos') <= -.15) down.push('Você leu os pós-aulas por menos tempo: ' + fm(posAvg(a)) + ' → ' + fm(posAvg(b)));
    if (diff('Aula') >= .15) up.push('Você voltou a frequentar as aulas');
    if (diff('Aula') <= -.15) down.push('Você faltou a ' + plural(b.aulas[0] - b.aulas[1], 'aula', 'aulas') + ' na semana de ' + b.short);
    if (diff('Des') >= .15) up.push('Mais participação no Desafio: ' + a.des[1] + ' → ' + b.des[1] + ' partes');
    if (diff('Des') <= -.15) down.push('Menos participação no Desafio: ' + a.des[1] + ' → ' + b.des[1] + ' partes');
    return { up: up.slice(0, 3), down: down.slice(0, 3), from: a.short, to: b.short };
  }
  function advice(c) {
    var cfg = c.cfg;
    var lows = KEYS.filter(function (k) { return c.pm[k] != null && c.pm[k] < .85; }).sort(function (a, b) { return c.pm[a] - c.pm[b]; }).slice(0, 2);
    var T = {
      C: function () { return ['Estude um pouco todo dia', '15 min em ' + cfg.metaDias + ' dias valem mais do que 1h30 num dia só.' + (c.avgDays != null ? ' Hoje você estuda em média ' + num1(c.avgDays) + ' dias por semana.' : '')]; },
      At: function () { return c.entrega != null && c.entrega < .7 ? ['Faltam exercícios', 'Você fez ' + pct(c.entrega) + '% do que foi enviado nas últimas semanas. Comece por uma atividade curta.'] : ['Responda com calma', 'Ler cada questão faz diferença. Responder rápido demais vale menos.']; },
      Pos: function () { return ['Leia o pós-aula com calma', 'Pelo menos ' + cfg.minPos + ' min, pode ser em vários momentos.' + (c.avgPos != null ? ' Sua média: ' + fm(c.avgPos) + '.' : '')]; },
      Aula: function () { return ['Venha às aulas', 'Cada aula perdida pesa. Você foi a ' + c.aulasPres + ' de ' + c.aulasPrev + '.']; },
      Des: function () { return ['Participe do Desafio', 'Você fez ' + c.desFeitas + ' de ' + c.desDisp + ' partes. Cada parte conta.']; }
    };
    return lows.map(function (k) { return { k: k, t: T[k]() }; });
  }
  function sDayText(c, wi, d) {
    var w = c.weeks[wi], m = w.days[d], other = w.df[d], cfg = c.cfg;
    var head = '<b>' + cap1(WDF[d]) + ', ' + ddmm(addDays(w.start, d)) + '</b> · ';
    if (m === 0 && other === 0) return head + 'dia em branco. Sem estudo registrado.';
    var parts = [];
    if (w.dp[d] > 0) parts.push('pós-aula ' + fm(w.dp[d]));
    if (w.da[d] > 0) parts.push('atividades ' + fm(w.da[d]));
    if (w.dd[d] > 0) parts.push('desafio ' + fm(w.dd[d]));
    if (w.dv[d] > 0) parts.push('vocabulário, verbos e chunks ' + fm(w.dv[d]));
    var txt = m > 0 ? fm(m) + ' de estudo (' + parts.join(' · ') + ')' : 'sem estudo';
    if (other > 0) txt += (m > 0 ? ' e ' : ' · ') + fm(other) + ' em outras telas (não conta como estudo)';
    var v = m >= cfg.metaDiaMin ? 'Meta do dia batida! 🎯' : m >= cfg.minDia ? 'Dia estudado ✓ (a meta do dia é ' + num1(cfg.metaDiaMin) + ' min)' : m > 0 ? 'Menos de ' + num1(cfg.minDia) + ' min de estudo: não conta como dia estudado.' : '';
    return head + txt + '.' + (v ? ' ' + v : '');
  }

  // ── gráfico de acertos por faixa de adesão (média da turma, sem nomes) ─
  // stats = { baixa:{n,acc}, media:{n,acc}, alta:{n,acc} }. Só mostra quando a
  // ordem fecha (alta > média > baixa) com pelo menos 2 alunos por faixa.
  function statsOk(stats) {
    if (!stats) return false;
    var b = stats.baixa, m = stats.media, a = stats.alta;
    return !!(b && m && a && b.n >= 2 && m.n >= 2 && a.n >= 2 && a.acc > m.acc && m.acc > b.acc);
  }
  function bandStats(list) {            // list = [{ band:'alta'|'media'|'baixa', acc:Number|null }]
    var g = { baixa: [], media: [], alta: [] };
    list.forEach(function (x) { if (x.acc != null && g[x.band]) g[x.band].push(x.acc); });
    var out = {};
    Object.keys(g).forEach(function (k) { out[k] = { n: g[k].length, acc: g[k].length ? Math.round(mean(g[k])) : null }; });
    return out;
  }

  // ── HTML da tela do aluno (classes com prefixo cza- para não colidir) ──
  function ring(v, size, stroke, color) {
    var r = (size - stroke) / 2, cc = 2 * Math.PI * r;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img" aria-label="Adesão ' + v + ' de 100" style="flex-shrink:0">'
      + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="#edf1f6" stroke-width="' + stroke + '"/>'
      + '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + (cc * v / 100) + ' ' + cc + '" transform="rotate(-90 ' + size / 2 + ' ' + size / 2 + ')"/>'
      + '<text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-weight="800" font-size="' + Math.round(size * .34) + '" fill="#0f1724">' + v + '</text></svg>';
  }
  function scol(v) { return v >= .85 ? '#16A34A' : v >= .6 ? '#F59E0B' : '#F97316'; }

  function lineChartHtml(c) {
    var ad = c.totals, ac = c.acc, n = ad.length;
    if (n < 2) return '<div class="cza-cap">O gráfico aparece quando você tiver pelo menos 2 semanas completas.</div>';
    var W = 300, H = 130, L = 26, R = 22, T = 10, B = 22, pw = W - L - R, ph = H - T - B;
    function X(i) { return L + i / (n - 1) * pw; }
    function Y(v) { return T + (100 - v) / 100 * ph; }
    function line(arr, col) {
      var pts = [];
      arr.forEach(function (v, i) { if (v != null) pts.push([X(i), Y(v)]); });
      if (!pts.length) return '';
      return '<polyline fill="none" stroke="' + col + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '"/>'
        + pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="' + col + '"/>'; }).join('');
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Evolução de adesão e acertos por semana">';
    [0, 50, 100].forEach(function (v) { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#E2E8F0"/><text x="' + (L - 5) + '" y="' + Y(v) + '" text-anchor="end" dominant-baseline="central" font-size="9" fill="#94A3B8">' + v + '</text>'; });
    c.used.forEach(function (w, i) { s += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="9.5" font-weight="700" fill="#64748B">' + w.short + '</text>'; });
    s += line(ad, '#16A34A') + line(ac, '#7C3AED') + '</svg>';
    var accOk = ac.filter(function (v) { return v != null; });
    var both = accOk.length >= 2 && ad[n - 1] - ad[0] >= 5 && accOk[accOk.length - 1] - accOk[0] >= 3;
    var bothDown = accOk.length >= 2 && ad[n - 1] - ad[0] <= -5 && accOk[accOk.length - 1] - accOk[0] <= -3;
    var cap = accOk.length < 2 ? 'Os acertos aparecem aqui quando as atividades forem corrigidas.'
      : both ? 'Nas semanas em que sua adesão subiu, seus acertos subiram junto.'
      : bothDown ? 'Quando sua adesão caiu, seus acertos caíram junto. A boa notícia: dá para recuperar, e os dois sobem juntos.'
      : 'Acompanhe: adesão e acertos costumam andar juntos ao longo das semanas.';
    return s + '<div class="cza-lg"><span><i style="background:#16A34A"></i>Adesão</span><span><i style="background:#7C3AED"></i>Acertos (%)</span></div><div class="cza-cap">' + cap + '</div>';
  }
  function groupBarsHtml(c, stats) {
    if (!statsOk(stats)) return '<div class="cza-cap">Ainda estamos juntando dados da turma para comparar adesão e acertos.</div>';
    var cols = { baixa: '#F97316', media: '#F59E0B', alta: '#16A34A' }, lab = { baixa: 'Adesão baixa', media: 'Adesão média', alta: 'Adesão alta' };
    return '<div class="cza-grp">' + ['baixa', 'media', 'alta'].map(function (k) {
      return '<div class="' + (c.band && c.band.k === k ? 'me' : '') + '">' + (c.band && c.band.k === k ? '<em class="cza-you">você</em>' : '')
        + '<span>' + stats[k].acc + '%</span><i class="cza-bar" style="height:' + (stats[k].acc * .85) + 'px;background:' + cols[k] + '"></i><span>' + lab[k] + '</span></div>';
    }).join('') + '</div><div class="cza-cap"><b>Média de acertos dos alunos, por faixa de adesão.</b> Quem se dedica mais costuma acertar mais.</div>';
  }
  function ruleRowsHtml(c) {
    var cfg = c.cfg;
    var present = {};
    KEYS.forEach(function (k) { present[k] = c.pm[k] != null; });
    function row(k, status, goal) {
      var v = c.pm[k];
      var late = (k === 'C' || k === 'Pos') && !c.timeReady;
      if (v == null) {
        return '<div class="cza-rule"><div class="cza-rh"><span>' + PIL[k].ic + ' ' + PIL[k].name + '</span><em>' + (late ? 'coletando' : 'não se aplica') + '</em></div>'
          + '<p class="cza-goal">' + (late ? 'Ainda coletando os seus dias. ' : 'Não conta para você, então não entra na sua nota. ') + 'Meta: ' + goal + '</p></div>';
      }
      return '<div class="cza-rule"><div class="cza-rh"><span>' + PIL[k].ic + ' ' + PIL[k].name + '</span><em>vale ' + effWeight(present, k, cfg) + '%</em></div>'
        + '<div class="cza-mt"><i style="width:' + pct(v) + '%;background:' + scol(v) + '"></i></div>'
        + '<p><b>' + status + '</b></p><p class="cza-goal">Meta: ' + goal + '</p></div>';
    }
    var stAt = c.entrega == null ? 'Sem atividades enviadas' : c.entrega < .7 ? 'Você fez ' + pct(c.entrega) + '% dos exercícios enviados'
      : (c.fator != null && c.fator < .8) ? 'Feitas bem rápido: ' + fm(c.timeAll) + ' para ≥ ' + fm(c.expAll) + ' esperados' : 'Você fez ' + pct(c.entrega) + '%, com tempo adequado';
    return row('C', 'Você estuda em média ' + (c.avgDays != null ? num1(c.avgDays) : '—') + ' dias por semana', 'pelo menos ' + cfg.minDia + ' min de estudo em ' + cfg.metaDias + ' dias da semana. Estudo é pós-aula, atividades, desafio, vocabulário, verbos e chunks, e só conta enquanto você está mexendo no app')
      + row('At', stAt, 'fazer os exercícios enviados, sem pressa (cerca de ' + cfg.secEx + ' s cada)')
      + row('Pos', 'Sua média: ' + (c.avgPos != null ? fm(c.avgPos) : '—') + ' por pós-aula', 'ler cada pós-aula por ' + cfg.minPos + ' min ou mais (pode ser em vários momentos)')
      + row('Aula', 'Você foi a ' + c.aulasPres + ' de ' + c.aulasPrev + ' aulas', 'vir às aulas')
      + row('Des', 'Você fez ' + c.desFeitas + ' de ' + c.desDisp + ' partes do Desafio', 'participar do Desafio da semana');
  }

  /* c = resultado de compute(); o = { firstName, recado, ribbon, ribbonOpen, stats } */
  function studentHtml(c, o) {
    o = o || {};
    var cfg = c.cfg, cur = c.cur, ok = c.status === 'ok';
    var todayIdx = (c.now.getDay() + 6) % 7;
    var recado = o.recado || suggestComment(c, o.firstName);
    var h = '<div class="cza">';
    // Aluno: só o cartão da nota aparece; tocar nele abre o resto (.cza-more).
    var coll = o.collapsible !== false;
    var SUB = '<div class="cza-sub">Quanto você está presente no curso: aulas, pós-aula, atividades, desafio e constância.</div>';
    var HINT = '<div class="cza-hint"><span class="cza-lbl-open">Ver detalhes</span><span class="cza-lbl-close">Ocultar detalhes</span><span class="cza-chev">›</span></div>';
    var TOG = coll ? ' data-cza-toggle role="button" tabindex="0" aria-expanded="false"' : '';
    h += '<div class="cza-title">Minha adesão</div>' + (coll ? '' : SUB);
    if (o.ribbon) h += '<div class="cza-ribbon' + (o.ribbonOpen ? ' open' : '') + '">' + esc(o.ribbon) + '</div>';

    // topo: nota + etiquetas
    if (ok) {
      var b = c.band, d = c.trend;
      var msg = b.k === 'alta' ? ['Ritmo excelente', 'Você aparece em quase tudo que o curso oferece. É isso que faz o inglês fixar.']
        : b.k === 'media' ? ['Bom ritmo, dá para crescer', 'Você já faz bastante coisa. Veja abaixo onde um pequeno ajuste rende mais.']
        : ['Vamos aumentar o ritmo', 'O inglês fixa com prática frequente. Comece pelos passos abaixo: pequenos já contam.'];
      var dt = d == null ? '' : d >= 3 ? '<small style="color:#16A34A">▲ +' + d + ' pts desde a semana passada</small>'
        : d <= -3 ? '<small style="color:#EA580C">▼ ' + d + ' pts desde a semana passada</small>'
        : '<small style="color:#64748B">● estável desde a semana passada</small>';
      var chips = studentChips(c);
      var chipsHtml = chips.length ? '<div class="cza-chs">' + chips.map(function (x) { return '<span class="' + x.c + '">' + esc(x.t) + '</span>'; }).join('') + '</div>' : '';
      h += '<div class="cza-pc cza-herocard"' + TOG + '><div class="cza-hero">' + ring(c.index, 96, 11, b.soft) + '<div class="cza-t"><b>' + msg[0] + '</b>' + msg[1] + dt + '</div></div>' + (coll ? HINT : chipsHtml) + '</div>';
      h += '<div class="cza-more"' + (coll ? ' hidden' : '') + '>' + (coll ? SUB + chipsHtml : '');
    } else {
      h += '<div class="cza-pc cza-herocard"' + TOG + '><div class="cza-hero"><div class="cza-t"><b>Estamos conhecendo o seu ritmo</b>Sua nota aparece depois da primeira semana completa (de segunda a domingo). Toque para ver o que conta e como seus dias estão indo.</div></div>' + (coll ? HINT : '') + '</div>';
      h += '<div class="cza-more"' + (coll ? ' hidden' : '') + '>' + (coll ? SUB : '');
    }
    h += '<div class="cza-pc cza-recado"><div class="cza-by">💬 Recado do seu professor</div><p>' + esc(recado) + '</p></div>';

    // semana atual
    h += '<div class="cza-pc"><h4>Sua semana</h4><div class="cza-hsub">Segunda a domingo. A bolinha verde é um dia estudado.</div><div class="cza-days">' + cur.days.map(function (m, i) {
      var fut = i >= cur.elapsed, on = !fut && m >= cfg.minDia;
      return '<div class="cza-dd ' + (fut ? 'fut' : on ? 'on' : 'off') + (i === todayIdx ? ' today' : '') + '"><span>' + (on ? '✓' : '') + '</span>' + WD1[i] + '</div>';
    }).join('') + '</div><div class="cza-cap">Você estudou <b>' + cur.activeDays + ' de ' + cur.elapsed + ' dias</b> até agora. A meta é ' + cfg.metaDias + ' dias por semana.</div></div>';

    // mapa de 4 semanas
    h += '<div class="cza-pc"><h4>Seu mapa de estudo</h4><div class="cza-hsub">Cada quadrado é um dia, e o número são os minutos de estudo. Toque para ver o que você fez.</div><div class="cza-smap"><div class="cza-sm-row cza-hd"><span></span>' + WD.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>';
    c.weeks.forEach(function (w, wi) {
      h += '<div class="cza-sm-row"><span class="cza-wl">' + w.short + '</span>';
      w.days.forEach(function (m, i) {
        var fut = w.partial && i >= w.elapsed;
        var lv = m < cfg.minDia ? 0 : m < 10 ? 1 : m < 25 ? 2 : m < 45 ? 3 : 4;
        h += '<button type="button" class="cza-cell ' + (fut ? 'fut' : lv ? 'g' + lv : m > 0 ? '' : 'z') + '" data-cza-w="' + wi + '" data-cza-d="' + i + '" ' + (fut ? 'disabled' : '') + ' aria-label="' + WD[i] + ' ' + ddmm(addDays(w.start, i)) + '">' + (fut ? '' : m >= 1 ? Math.round(m) : m > 0 ? '<1' : '·') + '</button>';
      });
      h += '</div>';
    });
    h += '</div><div class="cza-dayinfo" id="cza-dayinfo">Toque num quadrado para ver o dia.</div>';
    var ws = wdStats(c);
    h += '<div class="cza-divider"></div><h4 style="margin-top:8px">Seus dias da semana</h4><div class="cza-hsub">Média de minutos de estudo em cada dia, nas últimas semanas.</div><div class="cza-wdb">'
      + ws.avg.map(function (m, i) {
        return '<div>' + (m >= cfg.minDia ? '<b>' + Math.round(m) + '</b>' : '<b style="color:#94A3B8">' + (m > 0 ? '<1' : '0') + '</b>')
          + '<i class="' + (i === ws.best ? 'best' : m < cfg.minDia ? 'zero' : '') + '" style="height:' + (m < cfg.minDia ? 10 : Math.max(8, m / ws.max * 74)) + 'px"></i>' + WD1[i] + '</div>';
      }).join('') + '</div>'
      + '<div class="cza-cap">' + (ws.best >= 0 ? 'Seu dia mais forte é <b>' + WDF[ws.best] + '</b>. ' : '')
      + (ws.blanks.length ? 'Dias em branco: <b>' + listPt(ws.blanks.map(function (i) { return WDF[i]; })) + '</b>. Que tal escolher um deles para 10 minutinhos?' : 'Você estuda em todos os dias da semana. 👏') + '</div></div>';

    // o que conta
    h += '<div class="cza-pc"><h4>O que conta na sua adesão</h4><div class="cza-hsub">São 5 pontos. Cada um vale uma parte da nota, e a barra mostra como você está.</div>' + ruleRowsHtml(c) + '</div>';

    if (ok) {
      var ch = changes(c), adv = advice(c);
      if (ch.from) {
        h += '<div class="cza-pc"><h4>O que mudou</h4><div class="cza-hsub">Semana de ' + ch.to + ' comparada com a de ' + ch.from + '.</div><div class="cza-chg">'
          + (ch.up.length ? '<h5>Melhorando</h5>' + ch.up.map(function (x) { return '<div class="u"><span>▲</span><span>' + esc(x) + '</span></div>'; }).join('') : '')
          + (ch.down.length ? '<h5>Pede atenção</h5>' + ch.down.map(function (x) { return '<div class="d"><span>▼</span><span>' + esc(x) + '</span></div>'; }).join('') : '')
          + (!ch.up.length && !ch.down.length ? '<div class="n"><span>●</span><span>Seu ritmo ficou estável de uma semana para a outra.</span></div>' : '') + '</div></div>';
      }
      h += '<div class="cza-pc"><h4>Seu próximo passo</h4>' + (adv.length ? adv.map(function (a) { return '<div class="cza-adv"><span style="font-size:20px">' + PIL[a.k].ic + '</span><div><b>' + esc(a.t[0]) + '</b>' + esc(a.t[1]) + '</div></div>'; }).join('')
        : '<div class="cza-adv good"><span style="font-size:20px">🎉</span><div><b>Nada a corrigir</b>Mantenha o ritmo.</div></div>') + '</div>';
      h += '<div class="cza-pc"><h4>Adesão e acertos</h4><div class="cza-hsub">Mais prática, mais acertos. Veja se isso acontece com você.</div>' + lineChartHtml(c) + '<div class="cza-divider"></div>' + groupBarsHtml(c, o.stats) + '</div>';
    }
    return h + '</div></div>';          // fecha .cza-more e .cza
  }

  // Abre/fecha os detalhes. `host` é o elemento que contém o HTML do aluno e `trigger`
  // o cartão da nota (data-cza-toggle). Usado pelo app do aluno e pela prévia do painel.
  function toggleDetails(host, trigger) {
    var more = host.querySelector('.cza-more');
    if (!more || !trigger) return;
    var open = more.hidden;               // estava fechado: vai abrir
    more.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // ── Meta de estudo: cartão "hoje" (Início) e "Meu estudo" (Progresso) ───
  var TYPE_COLOR = { leitura: '#16A34A', vocab: '#F59E0B', exercicio: '#3B82F6' };
  var TYPE_SOFT = { leitura: '#DCFCE7', vocab: '#FEF3C7', exercicio: '#DBEAFE' };
  var TYPE_GO = { leitura: 'pos', vocab: 'vocab', exercicio: 'aulas' };   // para onde o toque leva no app
  var TYPE_SHORT = { leitura: 'Ler pós-aula', vocab: 'Chunks e verbos', exercicio: 'Exercícios' };
  function limiteTxt(sec) { return sec % 60 === 0 ? (sec / 60) + (sec === 60 ? ' minuto' : ' minutos') : sec + ' segundos'; }
  // "2 de 5 dias com meta"; passou da meta da semana: "6 dias com meta (a meta é 5)".
  function goalDaysTxt(g) {
    return g.hits > g.metaDias ? g.hits + ' dias com meta (a meta é ' + g.metaDias + ')' : g.hits + ' de ' + g.metaDias + ' dias com meta';
  }
  function todayOf(c) {
    var cur = c.cur, cfg = c.cfg, idx = (c.now.getDay() + 6) % 7;
    var min = cur.days[idx] || 0;
    var t = { leitura: cur.dp[idx] || 0, vocab: cur.dv[idx] || 0, exercicio: (cur.da[idx] || 0) + (cur.dd[idx] || 0) };
    return {
      idx: idx, min: min, t: t, hit: min >= cfg.metaDiaMin, remaining: Math.max(0, cfg.metaDiaMin - min),
      done: { leitura: t.leitura >= cfg.minTipo, vocab: t.vocab >= cfg.minTipo, exercicio: t.exercicio >= cfg.minTipo }
    };
  }

  /* Início: meta de hoje. o = { firstName, ribbon } */
  function goalTodayHtml(c, o) {
    o = o || {};
    var cfg = c.cfg, td = todayOf(c), g = c.cur.goal, meta = cfg.metaDiaMin;
    var frac = Math.min(1, td.min / meta), nm = o.firstName ? ', ' + esc(o.firstName) : '';
    var title, text;
    if (td.hit) {
      title = 'Meta de hoje batida! 🎯';
      text = 'Você estudou <em>' + Math.floor(td.min) + ' min</em> hoje. ' + (g.atingida ? 'E a meta da semana também. Parabéns! 🎉' : 'Faltam <em>' + plural(g.metaDias - g.hits, 'dia', 'dias') + '</em> para a meta da semana.');
    } else if (td.min < 0.05) {
      title = 'Vamos começar' + nm + '?';
      text = 'São só <em>' + num1(meta) + ' minutos</em> hoje. Pode ser lendo, praticando ou revendo verbos.';
    } else {
      title = (frac >= .6 ? 'Quase lá' : 'Bom começo') + nm + '!';
      text = 'Faltam <em>' + plural(Math.ceil(td.remaining), 'minuto', 'minutos') + '</em> para bater a meta de hoje. Pode ser lendo, praticando ou revendo verbos.';
    }
    var C = 2 * Math.PI * 52;
    var ring = '<svg width="124" height="124" viewBox="0 0 124 124" role="img" aria-label="' + Math.floor(td.min) + ' de ' + num1(meta) + ' minutos" style="flex-shrink:0">'
      + '<circle cx="62" cy="62" r="52" fill="none" stroke="#E5F3EA" stroke-width="13"/>'
      + '<circle cx="62" cy="62" r="52" fill="none" stroke="#16A34A" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + (C * frac).toFixed(1) + ' ' + C.toFixed(1) + '" transform="rotate(-90 62 62)"/>'
      + '<text x="62" y="62" text-anchor="middle" font-size="36" font-weight="800" fill="#0F172A">' + (td.min > 0 && td.min < 1 ? '&lt;1' : Math.floor(td.min)) + '</text>'
      + '<text x="62" y="84" text-anchor="middle" font-size="12.5" font-weight="800" fill="#64748B">de ' + num1(meta) + ' min</text></svg>';
    var rows = A_STUDY_TYPES.map(function (t) {
      var m = td.t[t.k], done = td.done[t.k];
      return '<div class="cza-trow' + (done ? ' done' : '') + '" data-cza-go="' + TYPE_GO[t.k] + '" role="button" tabindex="0">'
        + '<div class="cza-tic" style="background:' + TYPE_SOFT[t.k] + '">' + t.ic + '</div>'
        + '<div class="cza-ttx"><b>' + esc(t.name) + '</b><span>' + (m >= 0.05 ? 'Hoje: ' + fm(m) : 'Ainda não hoje') + '</span></div>'
        + '<span class="cza-pill ' + (done ? 'ok' : 'go') + '">' + (done ? 'feito ✓' : 'Abrir ›') + '</span></div>';
    }).join('');
    var days = c.cur.days.map(function (m, i) {
      var cls, inner = '';
      if (i < td.idx) { cls = g.dias[i].hit ? 'on' : 'off'; inner = cls === 'on' ? '✓' : ''; }
      else if (i === td.idx) { if (td.hit) { cls = 'on'; inner = '✓'; } else cls = 'now'; }
      else cls = 'fut';
      return '<div class="cza-gd ' + cls + (i === td.idx ? ' today' : '') + '"><span' + (cls === 'now' ? ' style="--p:' + Math.round(frac * 100) + '%"' : '') + '>' + inner + '</span>' + WD1[i] + '</div>';
    }).join('');
    return '<div class="cza cza-goal">'
      + (o.ribbon ? '<div class="cza-ribbon">' + esc(o.ribbon) + '</div>' : '')
      + '<div class="cza-pc cza-gfirst"><div class="cza-gtop"><b>🎯 Meta de estudo de hoje</b><span class="cza-gchip muted">' + num1(meta) + ' min por dia</span></div>'
      + '<div class="cza-gbody">' + ring + '<div class="cza-gt"><b class="big">' + title + '</b>' + text + '</div></div></div>'
      + '<div class="cza-pc"><div class="cza-sect">O que dá para fazer agora</div><div class="cza-todo">' + rows + '</div></div>'
      + '<div class="cza-pc"><div class="cza-gtop"><div class="cza-sect" style="margin:0">Sua semana</div><span class="cza-gchip">' + goalDaysTxt(g) + ' ' + (g.atingida ? '🎉' : '✓') + '</span></div>'
      + '<div class="cza-gweekdays">' + days + '</div></div></div>';
  }
  var A_STUDY_TYPES = [
    { k: 'leitura', name: 'Ler um pós-aula', ic: '📖', inclui: 'pós-aula' },
    { k: 'vocab', name: 'Ler chunks, verbos ou vocabulário', ic: '🧩', inclui: 'vocabulário, lista de verbos e chunks' },
    { k: 'exercicio', name: 'Fazer um exercício', ic: '✏️', inclui: 'atividades, extras, correção e desafio' }
  ];

  /* Progresso: "Meu estudo" da semana. o = {} */
  function goalWeekHtml(c) {
    var cfg = c.cfg, w = c.cur, g = w.goal, td = todayOf(c);
    var scale = Math.max(g.metaSemanaMin, g.minutos) || 1;
    var bar = '<div class="cza-gbar">' + A_STUDY_TYPES.map(function (t) {
      return '<i style="width:' + (g.mins[t.k] / scale * 100).toFixed(1) + '%;background:' + TYPE_COLOR[t.k] + '"></i>';
    }).join('') + '</div>';
    var falta = Math.max(0, g.metaDias - g.hits);
    var chips = '<div class="cza-gchips"><span class="cza-gchip">' + goalDaysTxt(g).replace('com meta', 'com meta batida') + '</span>'
      + (g.atingida ? '<span class="cza-gchip">Meta da semana batida 🎉</span>' : '<span class="cza-gchip amber">' + (falta === 1 ? 'falta 1 dia' : 'faltam ' + falta + ' dias') + '</span>') + '</div>';
    // gráfico: minutos de estudo por dia, empilhados por tipo, com a linha da meta
    var W = 434, H = 190, L = 30, R = 8, T = 14, B = 26, pw = W - L - R, ph = H - T - B;
    var ymax = Math.max(cfg.metaDiaMin * 1.6, Math.max.apply(null, w.days) + 2);
    var step = ymax <= 20 ? 5 : ymax <= 50 ? 10 : 20, top = Math.ceil(ymax / step) * step;
    function X(i) { return L + pw / 7 * (i + .5); }
    function Y(v) { return T + ph - (v / top) * ph; }
    var bw = pw / 7 * 0.62, s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="Minutos de estudo por dia">';
    for (var v = 0; v <= top; v += step) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#EEF2F6"/><text x="' + (L - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="10" font-weight="700" fill="#94A3B8">' + v + '</text>';
    s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(cfg.metaDiaMin) + '" y2="' + Y(cfg.metaDiaMin) + '" stroke="#16A34A" stroke-width="2" stroke-dasharray="6 5"/>'
      + '<text x="' + (W - R) + '" y="' + (Y(cfg.metaDiaMin) - 5) + '" text-anchor="end" font-size="10.5" font-weight="800" fill="#15803D">meta ' + num1(cfg.metaDiaMin) + ' min</text>';
    w.days.forEach(function (m, i) {
      var x = X(i) - bw / 2, y0 = Y(0), fut = i >= w.elapsed, parts = [w.dp[i], w.dv[i], w.da[i] + w.dd[i]], cols = [TYPE_COLOR.leitura, TYPE_COLOR.vocab, TYPE_COLOR.exercicio];
      s += '<g class="cza-gbarg" data-cza-gday="' + i + '" style="cursor:pointer"><rect x="' + (X(i) - pw / 14) + '" y="' + T + '" width="' + (pw / 7) + '" height="' + (ph + B) + '" fill="transparent"/>';
      if (!fut && m > 0.05) {
        parts.forEach(function (p, k) { if (p <= 0.01) return; var h = (p / top) * ph; y0 -= h; s += '<rect x="' + x + '" y="' + y0 + '" width="' + bw + '" height="' + h + '" fill="' + cols[k] + '"' + (i === td.idx && !td.hit ? ' opacity=".6"' : '') + ' rx="3"/>'; });
        s += '<text x="' + X(i) + '" y="' + (y0 - 5) + '" text-anchor="middle" font-size="11" font-weight="800" fill="#0F172A">' + Math.round(m) + '</text>';
      } else s += '<rect x="' + x + '" y="' + (Y(0) - 5) + '" width="' + bw + '" height="5" fill="none" stroke="#CBD5E1" stroke-dasharray="3 3" rx="2"/>';
      s += '<text x="' + X(i) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="11" font-weight="800" fill="' + (i === td.idx ? '#0F172A' : '#64748B') + '">' + WD[i] + (i === td.idx ? ' •' : '') + '</text></g>';
    });
    s += '</svg>';
    var legend = '<div class="cza-glegend"><span><i style="background:' + TYPE_COLOR.leitura + '"></i>Pós-aula</span><span><i style="background:' + TYPE_COLOR.vocab + '"></i>Verbos, chunks e vocabulário</span><span><i style="background:' + TYPE_COLOR.exercicio + '"></i>Exercícios</span></div>';
    var tipos = '<div class="cza-gchips" style="margin-top:10px">' + A_STUDY_TYPES.map(function (t) {
      return '<span class="cza-gchip' + (g.tipos[t.k] ? '' : ' amber') + '">' + t.ic + ' ' + TYPE_SHORT[t.k] + (g.tipos[t.k] ? ' ✓' : ': ainda não') + '</span>';
    }).join('') + '</div>';
    var info = '<button type="button" class="cza-gq" data-cza-gtoggle aria-expanded="false">O que conta como tempo de estudo? <span class="cza-chev">›</span></button>'
      + '<div class="cza-gmore" hidden>'
      + '<div class="cza-sect" style="margin-top:12px">Conta como estudo</div><div class="cza-glist">'
      + '<div><span style="background:#DCFCE7">📖</span>Ler o pós-aula</div>'
      + '<div><span style="background:#DBEAFE">✏️</span><div>Fazer as atividades e as atividades extras<small>e ler a correção</small></div></div>'
      + '<div><span style="background:#EDE9FE">🏆</span>O Desafio da semana</div>'
      + '<div><span style="background:#FEF3C7">🧩</span>Meu vocabulário, a lista de verbos e os chunks</div></div>'
      + '<div class="cza-sect" style="margin-top:14px">Não conta</div><div class="cza-glist no">'
      + '<div><span>🏠</span>Ficar na tela inicial, no perfil ou nos avisos</div><div><span>💤</span>Deixar o app aberto sem mexer</div></div>'
      + '<div class="cza-grule"><span style="font-size:18px">⏱️</span><div><b>Como o tempo é contado.</b> O relógio anda enquanto você usa o app: tocando, rolando a página, digitando, ouvindo ou gravando áudio. Pensar um pouco também vale: pausas de até <b>' + limiteTxt(cfg.limiteSeg) + '</b> contam. Passou disso, o app entende que você saiu e não conta.</div></div></div>';
    return '<div class="cza cza-gweek"><div class="cza-title">Meu estudo</div><div class="cza-sub">Quanto tempo você estudou inglês nesta semana.</div>'
      + '<div class="cza-pc"><div class="cza-sect">Esta semana</div>'
      + '<div class="cza-gtot"><b>' + Math.round(g.minutos) + ' min</b><span>de ' + num1(g.metaSemanaMin) + ' min</span></div>' + bar + chips
      + '<div class="cza-gchart">' + s + '</div>' + legend
      + '<div class="cza-gday" id="cza-gdayinfo">' + sDayText(c, 3, td.idx) + '</div>' + tipos + info + '</div></div>';
  }
  // Abre/fecha o "O que conta como tempo de estudo?".
  function toggleGoalInfo(trigger) {
    var more = trigger && trigger.parentElement && trigger.parentElement.querySelector('.cza-gmore');
    if (!more) return;
    var open = more.hidden;
    more.hidden = !open;
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  var STUDENT_CSS = ''
    + '.cza{font-family:inherit;color:#0F172A}'
    + '.cza *{box-sizing:border-box}'
    + '.cza-title{font-size:22px;font-weight:800}'
    + '.cza-sub{font-size:12.5px;color:#64748B;font-weight:600;margin-top:2px}'
    + '.cza-ribbon{margin:10px 0 0;padding:7px 10px;border-radius:10px;background:#FEF3C7;color:#92400E;font-size:11.5px;font-weight:800;text-align:center}'
    + '.cza-ribbon.open{background:#DCFCE7;color:#166534}'
    + '.cza-pc{background:#fff;border:1px solid rgba(22,163,74,.12);border-radius:18px;padding:14px;margin-top:12px}'
    + '.cza-pc h4{font-size:14px;font-weight:800;margin-bottom:2px}'
    + '.cza-hsub{font-size:12px;color:#64748B;font-weight:600;margin-bottom:8px}'
    + '.cza-hero{display:flex;gap:14px;align-items:center;margin-top:6px}'
    + '.cza-hero .cza-t{font-size:13px;color:#475569;font-weight:700;line-height:1.35}'
    + '.cza-hero .cza-t b{display:block;font-size:17px;color:#0F172A;margin-bottom:2px}'
    + '.cza-hero .cza-t small{display:block;margin-top:6px;font-size:11.5px;font-weight:800}'
    + '.cza-chs{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}'
    + '.cza-chs span{display:inline-flex;gap:5px;align-items:center;padding:5px 10px;border-radius:99px;font-size:11.5px;font-weight:800}'
    + '.cza-chs .ok{background:#DCFCE7;color:#14532D}.cza-chs .warn{background:#FFEDD5;color:#7C2D12}'
    + '.cza-recado{background:#FFFBEB;border-color:#FDE68A}'
    + '.cza-by{font-size:12px;font-weight:800;color:#92400E;margin-bottom:6px}'
    + '.cza-recado p{font-size:13.5px;font-weight:600;line-height:1.5;color:#451A03;white-space:pre-wrap}'
    + '.cza-days{display:flex;justify-content:space-between;gap:4px;margin-top:6px}'
    + '.cza-dd{flex:1;text-align:center;font-size:10.5px;font-weight:800;color:#94A3B8}'
    + '.cza-dd span{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;margin:0 auto 4px;background:#EEF2F6;color:#94A3B8;font-size:15px}'
    + '.cza-dd.on span{background:#16A34A;color:#fff}'
    + '.cza-dd.off span{background:#fff;border:2px solid #E2E8F0}'
    + '.cza-dd.today span{box-shadow:0 0 0 3px rgba(22,163,74,.25)}'
    + '.cza-dd.fut span{background:none;border:2px dashed #E2E8F0}'
    + '.cza-smap{display:grid;gap:5px;margin-top:6px}'
    + '.cza-sm-row{display:grid;grid-template-columns:34px repeat(7,1fr);gap:4px;align-items:center}'
    + '.cza-sm-row.cza-hd{font-size:10px;font-weight:800;color:#94A3B8;text-align:center}'
    + '.cza-wl{font-size:10.5px;font-weight:800;color:#64748B}'
    + '.cza-cell{height:32px;border:0;border-radius:9px;background:#EEF2F6;font:inherit;font-size:10.5px;font-weight:800;color:#166534;display:grid;place-items:center;width:100%;padding:0}'
    + '.cza-cell.g1{background:#DCFCE7}.cza-cell.g2{background:#86EFAC}.cza-cell.g3{background:#22C55E;color:#fff}.cza-cell.g4{background:#15803D;color:#fff}'
    + '.cza-cell.z{color:#CBD5E1}'
    + '.cza-cell.fut{background:none;border:2px dashed #E2E8F0;color:transparent}'
    + '.cza-cell.sel{outline:3px solid #0F172A;outline-offset:1px}'
    + '.cza-dayinfo{margin-top:8px;padding:9px 11px;border-radius:12px;background:#F0FDF4;border:1px solid #BBF7D0;font-size:12.5px;font-weight:600;color:#14532D;min-height:38px}'
    + '.cza-wdb{display:flex;gap:6px;align-items:flex-end;height:104px;margin-top:6px}'
    + '.cza-wdb div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px;font-size:10px;font-weight:800;color:#64748B}'
    + '.cza-wdb i{display:block;width:100%;border-radius:6px 6px 0 0;background:#86EFAC;min-height:3px}'
    + '.cza-wdb i.best{background:#16A34A}'
    + '.cza-wdb i.zero{background:#F8FAFC;border:1.5px dashed #CBD5E1;height:10px!important}'
    + '.cza-wdb b{font-size:10px;color:#0F172A}'
    + '.cza-cap{font-size:12px;color:#475569;font-weight:600;margin-top:6px;line-height:1.4}'
    + '.cza-cap b{color:#0F172A}'
    + '.cza-rule{padding:10px 0;border-top:1px solid #F1F5F9}'
    + '.cza-rule:first-of-type{border-top:0;padding-top:4px}'
    + '.cza-rh{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:800;gap:8px}'
    + '.cza-rh em{font-style:normal;font-size:10.5px;font-weight:800;color:#475569;background:#F1F5F9;border-radius:99px;padding:2px 8px;white-space:nowrap}'
    + '.cza-mt{position:relative;height:8px;background:#EEF2F6;border-radius:99px;margin:7px 0 5px}'
    + '.cza-mt i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}'
    + '.cza-rule p{font-size:12px;color:#475569;font-weight:600;line-height:1.35}'
    + '.cza-rule p b{color:#0F172A}'
    + '.cza-goal{color:#64748B}'
    + '.cza-chg{display:grid;gap:6px;margin-top:6px}'
    + '.cza-chg h5{font-size:11px;text-transform:uppercase;letter-spacing:.4px;color:#64748B;margin:6px 0 0}'
    + '.cza-chg div{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:12px;font-size:12.5px;font-weight:700;line-height:1.35}'
    + '.cza-chg .u{background:#F0FDF4;color:#14532D}.cza-chg .d{background:#FFF7ED;color:#7C2D12}.cza-chg .n{background:#F1F5F9;color:#475569}'
    + '.cza-adv{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:14px;background:#FFF7ED;border:1px solid #FED7AA;margin-top:8px;font-size:13px;font-weight:600;color:#7C2D12}'
    + '.cza-adv.good{background:#F0FDF4;border-color:#BBF7D0;color:#14532D}'
    + '.cza-adv b{display:block;margin-bottom:1px}'
    + '.cza-lg{display:flex;gap:14px;font-size:11.5px;font-weight:800;margin-top:4px}'
    + '.cza-lg span{display:inline-flex;align-items:center;gap:5px}'
    + '.cza-lg i{width:14px;height:4px;border-radius:2px;display:inline-block}'
    + '.cza-grp{display:flex;gap:10px;align-items:flex-end;height:150px;margin-top:10px}'
    + '.cza-grp>div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px;font-size:11px;font-weight:800;color:#64748B}'
    + '.cza-grp i.cza-bar{display:block;width:100%;border-radius:8px 8px 0 0}'
    + '.cza-grp .me i.cza-bar{outline:3px solid #0F172A;outline-offset:1px}'
    + '.cza-you{background:#0F172A;color:#fff;border-radius:99px;padding:1px 8px;font-size:9.5px;font-style:normal}'
    + '.cza-divider{height:1px;background:#EEF2F6;margin:12px 0 4px}'
    + '.cza-herocard[data-cza-toggle]{cursor:pointer;-webkit-tap-highlight-color:transparent}'
    + '.cza-herocard[data-cza-toggle]:focus-visible{outline:3px solid rgba(22,163,74,.45);outline-offset:2px}'
    + '.cza-hint{display:flex;align-items:center;justify-content:center;gap:6px;margin-top:10px;padding-top:10px;border-top:1px solid #EEF2F6;font-size:12px;font-weight:800;color:#15803D}'
    + '.cza-chev{display:inline-block;font-size:16px;line-height:1;transition:transform .15s}'
    + '.cza-herocard[aria-expanded="true"] .cza-chev{transform:rotate(90deg)}'
    + '.cza-lbl-close{display:none}'
    + '.cza-herocard[aria-expanded="true"] .cza-lbl-open{display:none}'
    + '.cza-herocard[aria-expanded="true"] .cza-lbl-close{display:inline}'
    + '.cza-more[hidden]{display:none}'
    + '.cza-more>.cza-sub{margin-top:12px}'
    // meta de estudo
    + '.cza-sect{font-size:12px;font-weight:800;color:#475569;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}'
    + '.cza-goal .cza-pc{margin-top:12px}.cza-goal .cza-gfirst{margin-top:0}'
    + '.cza-gtop{display:flex;align-items:center;justify-content:space-between;gap:8px}'
    + '.cza-gtop b{font-size:15px;font-weight:800}'
    + '.cza-gchip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:800;background:#DCFCE7;color:#14532D;white-space:nowrap}'
    + '.cza-gchip.amber{background:#FEF3C7;color:#92400E}.cza-gchip.muted{background:#F1F5F9;color:#475569}'
    + '.cza-gchips{display:flex;gap:8px;flex-wrap:wrap}'
    + '.cza-gbody{display:flex;gap:16px;align-items:center;margin-top:12px}'
    + '.cza-gt{font-size:13.5px;font-weight:700;color:#334155;line-height:1.4}'
    + '.cza-gt b.big{display:block;font-size:19px;font-weight:800;color:#0F172A;margin-bottom:3px}'
    + '.cza-gt em{font-style:normal;color:#15803D;font-weight:800}'
    + '.cza-todo{display:grid;gap:8px;margin-top:4px}'
    + '.cza-trow{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:15px;border:1.5px solid #EEF2F6;background:#fff;cursor:pointer}'
    + '.cza-trow:focus-visible{outline:3px solid rgba(22,163,74,.45);outline-offset:2px}'
    + '.cza-trow.done{background:#F0FDF4;border-color:#BBF7D0}'
    + '.cza-tic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:19px;flex-shrink:0}'
    + '.cza-ttx{flex:1;min-width:0}.cza-ttx b{display:block;font-size:13.5px;font-weight:800}.cza-ttx span{font-size:11.5px;color:#64748B;font-weight:700}'
    + '.cza-pill{font-size:11px;font-weight:800;padding:5px 11px;border-radius:99px;white-space:nowrap}'
    + '.cza-pill.ok{background:#16A34A;color:#fff}.cza-pill.go{background:#FEF3C7;color:#92400E}'
    + '.cza-gweekdays{display:flex;justify-content:space-between;gap:4px;margin-top:10px}'
    + '.cza-gd{flex:1;text-align:center;font-size:10.5px;font-weight:800;color:#94A3B8}'
    + '.cza-gd span{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;margin:0 auto 4px;background:#EEF2F6;color:#94A3B8;font-size:15px}'
    + '.cza-gd.on span{background:#16A34A;color:#fff}'
    + '.cza-gd.off span{background:#fff;border:2px solid #E2E8F0}'
    + '.cza-gd.now span{background:conic-gradient(#16A34A 0 var(--p,0%),#E5E7EB var(--p,0%) 100%);position:relative;color:transparent}'
    + '.cza-gd.now span::after{content:"";position:absolute;inset:5px;border-radius:50%;background:#fff}'
    + '.cza-gd.fut span{background:none;border:2px dashed #E2E8F0}'
    + '.cza-gd.today{color:#0F172A}'
    + '.cza-gtot{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}'
    + '.cza-gtot b{font-size:34px;font-weight:800;letter-spacing:-1px;color:#14532D}.cza-gtot span{font-size:14px;color:#64748B;font-weight:800}'
    + '.cza-gbar{height:12px;border-radius:99px;background:#E5E7EB;margin:10px 0 8px;overflow:hidden;display:flex}.cza-gbar i{display:block;height:100%}'
    + '.cza-gchart{margin-top:6px}'
    + '.cza-glegend{display:flex;gap:14px;flex-wrap:wrap;margin-top:8px;font-size:11.5px;font-weight:800;color:#475569}'
    + '.cza-glegend span{display:inline-flex;align-items:center;gap:6px}.cza-glegend i{width:12px;height:12px;border-radius:4px;display:inline-block}'
    + '.cza-gday{margin-top:12px;padding:11px 13px;border-radius:14px;background:#F0FDF4;border:1px solid #BBF7D0;font-size:12.5px;font-weight:700;color:#14532D;line-height:1.45}'
    + '.cza-gday b{color:#0F172A}'
    + '.cza-gq{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;margin-top:14px;padding:11px 13px;border:1.5px solid #E2E8F0;border-radius:14px;background:#fff;font:inherit;font-size:13px;font-weight:800;color:#15803D;cursor:pointer;text-align:left}'
    + '.cza-gq[aria-expanded="true"] .cza-chev{transform:rotate(90deg)}'
    + '.cza-gmore[hidden]{display:none}'
    + '.cza-glist{display:grid;gap:9px}'
    + '.cza-glist>div{display:flex;gap:11px;align-items:flex-start;font-size:13.5px;font-weight:700;color:#1E293B;line-height:1.35}'
    + '.cza-glist>div>span{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;font-size:17px;flex-shrink:0;background:#F1F5F9}'
    + '.cza-glist small{display:block;font-size:11.5px;color:#64748B;font-weight:700;margin-top:1px}'
    + '.cza-grule{display:flex;gap:11px;align-items:flex-start;padding:12px 13px;border-radius:15px;background:#FFFBEB;border:1px solid #FDE68A;font-size:12.5px;font-weight:700;color:#78350F;line-height:1.45;margin-top:12px}'
    + '.cza-grule b{color:#451A03}';

  var api = {
    KEYS: KEYS, PIL: PIL, WD: WD, WD1: WD1, WDF: WDF, DEFAULTS: DEFAULTS,
    // Os três tipos de estudo da meta diária/semanal e o que cada um reúne.
    STUDY_TYPES: A_STUDY_TYPES,
    goalTodayHtml: goalTodayHtml, goalWeekHtml: goalWeekHtml, toggleGoalInfo: toggleGoalInfo, todayOf: todayOf, goalDaysTxt: goalDaysTxt,
    cfgOf: cfgOf, compute: compute, band: band, effWeight: effWeight, combine: combine, itemKey: itemKey,
    tagsOf: tagsOf, diagOf: diagOf, suggestComment: suggestComment, studentChips: studentChips,
    wdStats: wdStats, changes: changes, advice: advice, sDayText: sDayText,
    statsOk: statsOk, bandStats: bandStats,
    studentHtml: studentHtml, lineChartHtml: lineChartHtml, toggleDetails: toggleDetails, studentCss: function () { return STUDENT_CSS; },
    ring: ring, scol: scol,
    util: { esc: esc, fm: fm, num1: num1, pct: pct, mean: mean, sum: sum, toDate: toDate, dayKey: dayKey, addDays: addDays, mondayOf: mondayOf, ddmm: ddmm, postRef: postRef, listPt: listPt, cap1: cap1 }
  };
  root.CzkAdesao = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
