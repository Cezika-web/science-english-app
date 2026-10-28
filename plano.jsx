// Plano de R$100 — o Caminho: uma trilha em ordem cronológica em que a AULA do mês
// libera de 5 a 6 tarefas, e o material de estudo vem dentro de cada tarefa.
//
// Este arquivo só entra em cena quando o aluno tem `plano` no cadastro ou quando um
// administrador abre o app com ?planoteste=1 (prévia: nada é gravado no banco, o
// progresso fica só neste aparelho). Quem não está no plano nunca chega aqui.
//
// Nomes começam com Plano/PLANO_ de propósito: este script divide o escopo global
// com o index.html e o challenge.jsx. Hooks sempre como React.useX (sem desestruturar).

const PLANO_ADMINS = ['cmo.sep@gmail.com', 'czkenglish@gmail.com'];
const PLANO_WHATS_PADRAO = '5515996371614';
const PLANO_COR = '#7C3AED';

/* ───────── conteúdo: Connectivity 1 · Unit 4 (o mesmo do exemplo-unidade-conn1-u04.json) ───────── */
const PLANO_UNIDADE_4 = {
  id: 'conn1-u04',
  titulo: 'Talking about People',
  livro: 'Connectivity 1 · Unit 4 · p. 37–48',
  temas: {
    'do-does': { rotulo: 'Presente simples: do / does', palavras: ['simple present', 'presente simples', 'do/does', 'does', 'auxiliar', 'forma base'] },
    'comparativos': { rotulo: 'Comparativos', palavras: ['comparativ', 'comparative', 'than', 'more', 'better', 'worse'] },
    'familia': { rotulo: 'Família e estado civil', palavras: ['family', 'família', 'in-law', 'in-laws', 'divorced', 'estado civil', 'cousin', 'niece', 'nephew'] },
  },
  estudos: {
    'do-does': {
      titulo: 'Presente simples: do ou does?', tema: 'do-does',
      blocos: [
        { t: 'p', x: 'O presente simples fala de rotina e de fatos. O truque é olhar o **sujeito**.' },
        { t: 'tab', cab: ['Sujeito', 'Afirmativa', 'Negativa', 'Pergunta'], lin: [['I, you, we, they', 'work', "don't work", 'Do you work?'], ['he, she, it', 'works', "doesn't work", 'Does she work?']] },
        { t: 'ex', en: 'Does your brother live in Miami?', pt: 'Depois de do/does o verbo fica na forma base: live, não lives.' },
        { t: 'dica', x: 'Atenção: **does** também pode ser o verbo “fazer”: *My sister does the laundry.* Aí ele é o verbo principal, não o auxiliar.' },
      ],
      teste: { p: 'Does your brother ___ in Miami?', o: ['live', 'lives'], c: 0, ok: 'Isso! Depois de does, verbo na forma base.', no: 'Depois de does o verbo volta à forma base: live.' },
    },
    'comparativos': {
      titulo: 'Comparativos', tema: 'comparativos',
      blocos: [
        { t: 'p', x: 'Para comparar duas pessoas ou coisas, use o comparativo + **than** (“do que”).' },
        { t: 'tab', cab: ['Tipo', 'Regra', 'Exemplo'], lin: [['Curta', '+ er', 'tall → taller'], ['Termina em y', 'y → ier', 'funny → funnier'], ['Longa', 'more / less', 'more hardworking'], ['Irregular', '—', 'good → better · bad → worse']] },
        { t: 'ex', en: 'My brother is taller than my father.', pt: 'Meu irmão é mais alto que meu pai.' },
        { t: 'dica', x: 'O “than” aparece quando você diz **com quem** compara. Sem o segundo termo, a frase pode terminar no comparativo: *My sister is funnier.*' },
      ],
      teste: { p: 'My sister is ___ than me.', o: ['funnier', 'more funny'], c: 0, ok: 'Certo! Funny termina em y → funnier.', no: 'Funny termina em y: troca por ier → funnier.' },
    },
    'familia': {
      titulo: 'Família e descrição de pessoas', tema: 'familia',
      blocos: [
        { t: 'p', x: 'Família + adjetivos de personalidade = descrições completas.' },
        { t: 'tab', cab: ['Imediata', 'Estendida', 'Por casamento'], lin: [['parents, brother, sister', 'uncle, aunt, cousin, niece, nephew', 'mother-in-law, father-in-law']] },
        { t: 'ex', en: 'My uncle is hardworking, but my aunt is more outgoing.', pt: 'Meu tio é trabalhador, mas minha tia é mais extrovertida.' },
        { t: 'dica', x: '**-in-law** = parente por casamento: o pai do seu marido é seu *father-in-law*.' },
      ],
      teste: { p: 'O pai do seu marido é seu ___.', o: ['father-in-law', 'grandfather'], c: 0, ok: 'Isso mesmo!', no: 'Parente por casamento leva -in-law: father-in-law.' },
    },
  },
  vocab: [['niece', 'sobrinha'], ['nephew', 'sobrinho'], ['cousin', 'primo(a)'], ['mother-in-law', 'sogra'], ['divorced', 'divorciado(a)'], ['single', 'solteiro(a)'],
    ['hardworking', 'trabalhador(a)'], ['outgoing', 'extrovertido(a)'], ['athletic', 'atlético(a)'], ['funny', 'engraçado(a)'], ['younger', 'mais novo(a)'], ['older', 'mais velho(a)']],
  jogos: {
    memoria: [['niece', 'sobrinha'], ['nephew', 'sobrinho'], ['cousin', 'primo(a)'], ['aunt', 'tia'], ['divorced', 'divorciado(a)'], ['hardworking', 'trabalhador(a)']],
    relampago: [
      { f: '___ your sister live here?', o: ['Do', 'Does'], c: 1 }, { f: 'My cousins ___ not work on Sundays.', o: ['do', 'does'], c: 0 },
      { f: 'She ___ two nieces.', o: ['has', 'have'], c: 0 }, { f: 'He is ___ than his brother.', o: ['taller', 'more tall'], c: 0 },
      { f: 'My sister is ___ than me.', o: ['funnier', 'more funny'], c: 0 }, { f: '___ they have any cousins?', o: ['Do', 'Does'], c: 0 },
      { f: 'She is ___ hardworking than me.', o: ['more', 'most'], c: 0 }, { f: 'My brother ___ not like soccer.', o: ['do', 'does'], c: 1 },
    ],
    montar: [
      { pt: 'Sua irmã mora em Miami?', w: ['Does', 'your', 'sister', 'live', 'in', 'Miami?'] },
      { pt: 'Meu irmão é mais alto que meu pai.', w: ['My', 'brother', 'is', 'taller', 'than', 'my', 'father.'] },
      { pt: 'Meus primos não trabalham aos domingos.', w: ['My', 'cousins', "don't", 'work', 'on', 'Sundays.'] },
    ],
  },
};

/* ───────── caminho de exemplo (prévia e ponto de partida do plano) ───────── */
const PLANO_PREVIA = {
  nome: 'Science Connect',
  curso: 'Connectivity 1',
  unidade: PLANO_UNIDADE_4,
  aulas: [
    { id: 'a0', rotulo: 'Início do plano', data: '2026-11-02', feita: true },
    { id: 'a1', rotulo: 'Aula do mês', data: '2026-11-11', hora: '19h', feita: false },
  ],
  pacotes: [
    { aula: 'a0', titulo: 'Talking about People', tarefas: [
      { id: 't1', tipo: 'estudo', ref: 'do-does', titulo: 'Presente simples: do ou does?', sub: 'Estudo + teste · 6 min', ic: '📖' },
      { id: 't2', tipo: 'estudo', ref: 'comparativos', titulo: 'Comparativos', sub: 'Estudo + teste · 6 min', ic: '⚖️' },
      { id: 't3', tipo: 'estudo', ref: 'familia', titulo: 'Família e descrição', sub: 'Estudo + teste · 5 min', ic: '👨‍👩‍👧' },
      { id: 't4', tipo: 'vocab', titulo: 'Vocabulário', sub: '12 palavras com áudio', ic: '🔤' },
      { id: 't5', tipo: 'jogos', titulo: 'Jogos', sub: '3 jogos para fixar', ic: '🎮' },
      { id: 't6', tipo: 'atividades', titulo: 'Atividades e extras', sub: 'Corrija ao terminar', ic: '✏️' },
    ] },
    { aula: 'a1', futuro: true, titulo: 'Eating in Restaurants', tarefas: [
      { id: 'f1', ic: '📖', titulo: 'Estudo' }, { id: 'f2', ic: '📖', titulo: 'Estudo' }, { id: 'f3', ic: '📖', titulo: 'Estudo' },
      { id: 'f4', ic: '🔤', titulo: 'Vocabulário' }, { id: 'f5', ic: '🎮', titulo: 'Jogos' }, { id: 'f6', ic: '✏️', titulo: 'Atividades' },
    ] },
  ],
};

/* ───────── modo: quem vê o Caminho ───────── */
function planoModo(student, user, mirror) {
  if (!student) return null;
  const admin = PLANO_ADMINS.includes(String((user && user.email) || '').toLowerCase());
  const teste = new URLSearchParams(window.location.search).get('planoteste') === '1';
  if (teste && admin) return { ...PLANO_PREVIA, previa: true };
  const p = student.plano;
  if (p && p.ativo !== false) return { ...PLANO_PREVIA, ...(typeof p === 'object' ? p : {}), previa: false };
  return null;
}

/* ───────── ajudantes ───────── */
function PlanoHoje() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function PlanoDias(iso) { const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - PlanoHoje()) / 86400000); }
function PlanoDataCurta(iso) { const [, m, d] = iso.split('-'); return `${d}/${m}`; }
function PlanoEmDias(iso) { const n = PlanoDias(iso); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n < 0 ? `há ${-n} dias` : `em ${n} dias`; }
function PlanoEmbaralhar(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function PlanoNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function PlanoTituloAula(p) { return typeof postTitle === 'function' ? postTitle(p) : (p.title || 'Pós-aula'); }
function PlanoTextoAula(p) { return PlanoNorm(String(p.html || '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')); }
function PlanoWhatsLink(student, texto) {
  const n = String((student && student.whatsapp) || PLANO_WHATS_PADRAO).replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// Acha, nos pós-aulas DA ALUNA, onde o tema foi explicado: pesa mais o título/tópico
// e conta poucas repetições no texto, para uma palavra comum não puxar aula errada.
function PlanoAulasDoTema(tema, posaulas) {
  const kws = tema.palavras.map(PlanoNorm);
  return posaulas.map(p => {
    const cabeca = PlanoNorm(`${p.topic || ''} ${PlanoTituloAula(p)}`);
    const corpo = PlanoTextoAula(p);
    let score = 0;
    kws.forEach(k => {
      if (cabeca.includes(k)) score += 6;
      score += Math.min(corpo.split(k).length - 1, 2);
    });
    return { p, score };
  }).filter(x => x.score >= 6).sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.p);
}

function usePlanoFeitas(uid) {
  const chave = `plano-feitas-v1-${uid || 'x'}`;
  const [feitas, setFeitas] = React.useState(() => { try { return JSON.parse(localStorage.getItem(chave) || '{}'); } catch (e) { return {}; } });
  const marcar = React.useCallback((id) => {
    setFeitas(atual => {
      if (atual[id]) return atual;
      const novo = { ...atual, [id]: true };
      try { localStorage.setItem(chave, JSON.stringify(novo)); } catch (e) {}
      return novo;
    });
  }, [chave]);
  const zerar = React.useCallback(() => { try { localStorage.removeItem(chave); } catch (e) {} setFeitas({}); }, [chave]);
  return [feitas, marcar, zerar];
}

const PLANO_CSS = `
@keyframes planoPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,.45); } 50% { box-shadow: 0 0 0 14px rgba(124,58,237,0); } }
@keyframes planoSobe { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes planoSurge { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.plano-btn { display:block; width:100%; border:0; border-radius:16px; padding:14px 16px; color:#fff; font-weight:800; font-size:15px; font-family:inherit; cursor:pointer;
  background:linear-gradient(180deg,#34D399,var(--brand-light)); box-shadow:0 8px 20px rgba(var(--brand-rgb),.28); }
.plano-btn.sec { background:#fff; color:var(--brand-dark); border:1.5px solid rgba(var(--brand-rgb),.35); box-shadow:none; }
.plano-btn.violeta { background:linear-gradient(180deg,#8B5CF6,#6D28D9); box-shadow:0 8px 20px rgba(109,40,217,.28); }
.plano-btn:disabled { background:#E2E8F0; color:#94A3B8; box-shadow:none; cursor:not-allowed; }
.plano-opt { display:block; width:100%; text-align:left; padding:11px 13px; border-radius:12px; border:1.5px solid #E2E8F0; background:#fff; font-weight:800; font-size:14px; font-family:inherit; margin-top:7px; cursor:pointer; }
.plano-opt.ok { background:#DCFCE7; border-color:#22C55E; color:#14532D; }
.plano-opt.no { background:#FEE2E2; border-color:#F87171; color:#7F1D1D; }
.plano-md b, .plano-md strong { color:#0F172A; }
.plano-tab { width:100%; border-collapse:collapse; font-size:12.5px; font-weight:700; margin:0 0 12px; }
.plano-tab th { background:#F1F5F9; text-align:left; padding:7px 8px; font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; color:#64748B; }
.plano-tab td { padding:7px 8px; border-bottom:1px solid #EEF2F6; vertical-align:top; }
`;

// **negrito** e *itálico* simples (o conteúdo é nosso, não do aluno).
function PlanoMd({ x }) {
  const partes = String(x).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return <span className="plano-md">{partes.map((s, i) =>
    s.startsWith('**') ? <strong key={i}>{s.slice(2, -2)}</strong> : s.startsWith('*') ? <em key={i}>{s.slice(1, -1)}</em> : <React.Fragment key={i}>{s}</React.Fragment>)}</span>;
}

/* ───────── navegação de baixo ───────── */
const PLANO_ABAS = [
  { id: 'caminho', ic: '🛤️', l: 'Caminho' },
  { id: 'atividades', ic: '✏️', l: 'Atividades' },
  { id: 'aulas', ic: '📄', l: 'Aulas' },
  { id: 'perfil', ic: '👤', l: 'Perfil' },
];
function PlanoNav({ active, onChange }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 200, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(var(--brand-rgb),.12)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 8px)', flexShrink: 0 }}>
      {PLANO_ABAS.map(t => { const on = t.id === active; return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
          <div style={{ width: 44, height: 36, borderRadius: 12, background: on ? 'rgba(124,58,237,.14)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{t.ic}</div>
          <span style={{ fontSize: 10, fontWeight: on ? 800 : 500, color: on ? '#5B21B6' : '#94A3B8', lineHeight: 1 }}>{t.l}</span>
        </button>); })}
    </div>
  );
}

/* ───────── o Caminho (trilha) ───────── */
const PLANO_X = [170, 214, 240, 214, 170, 126];
function PlanoLayout(cfg, feitas, ativOk) {
  const itens = []; let y = 14; let primeiraAberta = true; let idxNo = 0;
  const feitaT = t => t.tipo === 'atividades' ? ativOk : !!feitas[t.id];
  cfg.aulas.forEach(aula => {
    const pacAnt = cfg.pacotes.find(p => p.aula === aula.id);
    itens.push({ k: 'aula', aula, x: 170, y: y + 52, h: 120, r: 42 }); y += 120;
    if (!pacAnt) return;
    itens.push({ k: 'cab', pac: pacAnt, y: y + 8, h: 64 }); y += 64;
    pacAnt.tarefas.forEach((t, i) => {
      let estado;
      if (pacAnt.futuro) estado = 'trancada';
      else if (feitaT(t)) estado = 'feita';
      else if (primeiraAberta) { estado = 'atual'; primeiraAberta = false; }
      else estado = 'aberta';
      itens.push({ k: 'tarefa', t, pac: pacAnt, estado, x: PLANO_X[i % PLANO_X.length], y: y + 52, h: 104, r: 32 }); y += 104;
    });
  });
  // a próxima aula só fica "em foco" quando todas as tarefas do pacote atual acabaram
  const nos = itens.filter(i => i.k === 'aula' || i.k === 'tarefa');
  const proxAula = nos.find(n => n.k === 'aula' && !n.aula.feita);
  nos.forEach(n => { if (n.k === 'aula') n.estado = n.aula.feita ? 'feita' : (primeiraAberta ? 'proxima-foco' : 'proxima'); });
  const ultimoFeito = (() => { let u = -1; nos.forEach((n, i) => { if ((n.k === 'tarefa' && n.estado === 'feita') || (n.k === 'aula' && n.estado === 'feita')) u = i; }); return u; })();
  const curva = (a, b) => { const dy = (b.y - a.y) / 2; return `C ${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`; };
  let todo = '', feito = '';
  nos.forEach((n, i) => { if (i === 0) { todo += `M ${n.x} ${n.y}`; feito += `M ${n.x} ${n.y}`; return; } todo += ' ' + curva(nos[i - 1], n); if (i <= ultimoFeito) feito += ' ' + curva(nos[i - 1], n); });
  return { itens, altura: y + 40, todo, feito: ultimoFeito > 0 ? feito : '', proxAula };
}

function PlanoNo({ it, onTarefa, onAula }) {
  const W = 340;
  if (it.k === 'cab') {
    const fut = it.pac.futuro;
    return <div style={{ position: 'absolute', left: 0, right: 0, top: it.y, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '7px 14px', borderRadius: 99, background: fut ? '#F1F5F9' : '#F5F3FF', border: `1px solid ${fut ? '#E2E8F0' : '#DDD6FE'}`, color: fut ? '#64748B' : '#5B21B6', fontSize: 11.5, fontWeight: 800, letterSpacing: .4 }}>
        {fut ? '🔒 DEPOIS DA AULA · ' : '📘 '}{it.pac.titulo}
      </div></div>;
  }
  const dir = it.x >= 200;
  const lblEsq = dir;
  const rotulo = { position: 'absolute', top: it.y - 22, width: `${((lblEsq ? it.x - it.r - 12 : W - (it.x + it.r + 8) - 4) / W) * 100}%`,
    left: lblEsq ? `${(4 / W) * 100}%` : `${((it.x + it.r + 8) / W) * 100}%`, textAlign: lblEsq ? 'right' : 'left', pointerEvents: 'none' };
  const nodeBase = { position: 'absolute', top: it.y - it.r, left: `${(it.x / W) * 100}%`, transform: 'translateX(-50%)', width: it.r * 2, height: it.r * 2, border: 0, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };

  if (it.k === 'aula') {
    const a = it.aula; const feita = it.estado === 'feita'; const foco = it.estado === 'proxima-foco';
    const fundo = feita ? 'linear-gradient(150deg,#22C55E,#15803D)' : 'linear-gradient(150deg,#3B82F6,#1E40AF)';
    return <>
      <button onClick={() => onAula(a)} style={{ ...nodeBase, borderRadius: 28, background: fundo, color: '#fff', fontSize: 34, boxShadow: foco ? '0 0 0 6px rgba(59,130,246,.25), 0 12px 24px rgba(30,64,175,.35)' : '0 10px 22px rgba(15,23,42,.22)', opacity: !feita && !foco ? .92 : 1 }} aria-label={a.rotulo}>
        {feita ? <span style={{ position: 'relative' }}>🎓<span style={{ position: 'absolute', right: -14, bottom: -8, background: '#fff', color: '#15803D', borderRadius: 99, width: 22, height: 22, fontSize: 14, fontWeight: 800, display: 'grid', placeItems: 'center' }}>✓</span></span> : '🎓'}
      </button>
      <div style={{ ...rotulo, width: `${((W - (it.x + it.r + 10) - 2) / W) * 100}%`, left: `${((it.x + it.r + 10) / W) * 100}%`, textAlign: 'left', top: it.y - 26 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .6, color: feita ? '#15803D' : '#1E40AF' }}>{feita ? 'AULA FEITA' : 'PRÓXIMA AULA'}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{a.rotulo}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B' }}>{PlanoDataCurta(a.data)}{a.hora ? ` · ${a.hora}` : ''}{!feita ? ` · ${PlanoEmDias(a.data)}` : ''}</div>
      </div>
    </>;
  }

  const t = it.t; const e = it.estado;
  const estilo = e === 'feita' ? { background: 'linear-gradient(150deg,#22C55E,#15803D)', color: '#fff', boxShadow: '0 6px 0 #166534' }
    : e === 'atual' ? { background: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', color: '#fff', boxShadow: '0 6px 0 #4C1D95', animation: 'planoPulso 1.8s infinite' }
    : e === 'aberta' ? { background: '#fff', color: '#0F172A', border: `3px solid ${PLANO_COR}`, boxShadow: '0 6px 0 #DDD6FE' }
    : { background: '#E2E8F0', color: '#94A3B8', boxShadow: '0 6px 0 #CBD5E1' };
  return <>
    {e === 'atual' && <div style={{ position: 'absolute', top: it.y - it.r - 36, left: `${(it.x / W) * 100}%`, transform: 'translateX(-50%)', background: '#fff', border: `2px solid ${PLANO_COR}`, color: '#5B21B6', borderRadius: 12, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, letterSpacing: .5, whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(124,58,237,.18)' }}>
      COMEÇAR<span style={{ position: 'absolute', left: '50%', bottom: -7, width: 10, height: 10, background: '#fff', borderRight: `2px solid ${PLANO_COR}`, borderBottom: `2px solid ${PLANO_COR}`, transform: 'translateX(-50%) rotate(45deg)' }} /></div>}
    <button data-atual={e === 'atual' ? '1' : undefined} onClick={() => onTarefa(t, e)} style={{ ...nodeBase, borderRadius: '50%', fontSize: 26, ...estilo }} aria-label={t.titulo}>
      {e === 'feita' ? '✓' : e === 'trancada' ? '🔒' : t.ic}
    </button>
    <div style={{ ...rotulo, opacity: e === 'trancada' ? .6 : 1 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{t.titulo}</div>
      {t.sub && <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 1 }}>{t.sub}</div>}
    </div>
  </>;
}

function PlanoCaminho({ cfg, feitas, ativOk, onTarefa, onAula, onComoFunciona }) {
  const ref = React.useRef(null);
  const L = React.useMemo(() => PlanoLayout(cfg, feitas, ativOk), [cfg, feitas, ativOk]);
  const tarefas = cfg.pacotes.filter(p => !p.futuro).flatMap(p => p.tarefas);
  const feitasN = tarefas.filter(t => t.tipo === 'atividades' ? ativOk : !!feitas[t.id]).length;
  const prox = L.proxAula && L.proxAula.aula;
  React.useEffect(() => { const el = ref.current && ref.current.querySelector('[data-atual="1"]'); if (el) el.scrollIntoView({ block: 'center' }); }, []);
  return (
    <div className="scroll-area" ref={ref} style={{ padding: '14px 16px 24px', position: 'relative' }}>
      <div style={{ background: 'linear-gradient(150deg,#6D28D9,#4C1D95)', color: '#fff', borderRadius: 22, padding: 16, boxShadow: '0 14px 30px rgba(76,29,149,.3)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .8, opacity: .8 }}>{String(cfg.nome).toUpperCase()} · {String(cfg.curso).toUpperCase()}</div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{feitasN === tarefas.length && tarefas.length ? 'Tarefas do mês concluídas! 🎉' : 'Seu caminho até a próxima aula'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 9, borderRadius: 99, background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}><div style={{ width: `${tarefas.length ? Math.round(feitasN / tarefas.length * 100) : 0}%`, height: '100%', background: '#C4B5FD', borderRadius: 99, transition: 'width .4s' }} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{feitasN}/{tarefas.length}</div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .92, marginTop: 8 }}>{prox ? `Próxima aula ${PlanoEmDias(prox.data)} · ${PlanoDataCurta(prox.data)}${prox.hora ? ' às ' + prox.hora : ''}` : 'Sem aula marcada'}</div>
      </div>
      <button onClick={onComoFunciona} style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 0, color: '#5B21B6', fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Como funciona o caminho</button>
      <div style={{ position: 'relative', width: '100%', maxWidth: 340, margin: '6px auto 0', height: L.altura }}>
        <svg viewBox={`0 0 340 ${L.altura}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <path d={L.todo} fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" vectorEffect="non-scaling-stroke" />
          {L.feito && <path d={L.feito} fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {L.itens.map((it, i) => <PlanoNo key={i} it={it} onTarefa={onTarefa} onAula={onAula} />)}
      </div>
    </div>
  );
}

/* ───────── camadas (tela cheia e folha de baixo) ───────── */
function PlanoCamada({ titulo, sub, onClose, onAsk, children, rodape }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,23,42,.4)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, height: '100%', background: '#F6F1EA', display: 'flex', flexDirection: 'column', animation: 'planoSurge .22s' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(var(--brand-rgb),.12)', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: '#F1F5F9', fontSize: 18, fontWeight: 800, color: '#475569', cursor: 'pointer' }}>✕</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>{titulo}</div>
            {sub && <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{sub}</div>}
          </div>
          {onAsk && <button onClick={onAsk} style={{ border: 0, background: '#F5F3FF', color: '#5B21B6', borderRadius: 12, padding: '8px 11px', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>💬 Dúvida?</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 18px' }}>{children}</div>
        {rodape && <div style={{ padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid rgba(var(--brand-rgb),.12)', flexShrink: 0 }}>{rodape}</div>}
      </div>
    </div>
  );
}

function PlanoFolha({ onClose, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))', animation: 'planoSobe .25s', boxShadow: '0 -12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#CBD5E1', margin: '0 auto 14px' }} />
        {children}
      </div>
    </div>
  );
}

/* ───────── tarefa: estudo (o material mora aqui) ───────── */
function PlanoEstudo({ estudo, unidade, posaulas, onOpenPost, onFeita, onClose, onAsk }) {
  const [resp, setResp] = React.useState(null);
  const tema = unidade.temas[estudo.tema];
  const aulas = React.useMemo(() => PlanoAulasDoTema(tema, posaulas || []), [tema, posaulas]);
  const q = estudo.teste;
  return (
    <PlanoCamada titulo={estudo.titulo} sub={`${unidade.livro}`} onClose={onClose} onAsk={onAsk}
      rodape={<button className="plano-btn" disabled={resp === null} onClick={onFeita}>{resp === null ? 'Responda o teste para concluir' : 'Concluir tarefa ✓'}</button>}>
      {estudo.blocos.map((b, i) => {
        if (b.t === 'p') return <p key={i} style={{ fontSize: 14.5, lineHeight: 1.6, fontWeight: 600, color: '#334155', margin: '0 0 12px' }}><PlanoMd x={b.x} /></p>;
        if (b.t === 'ex') return <div key={i} style={{ background: '#F0FDF4', borderLeft: '4px solid var(--brand)', borderRadius: 10, padding: '9px 12px', margin: '0 0 12px', fontSize: 14.5, fontWeight: 800, lineHeight: 1.5 }}>{b.en}<div style={{ color: '#64748B', fontWeight: 600, fontSize: 12.5, marginTop: 2 }}>{b.pt}</div></div>;
        if (b.t === 'dica') return <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 12px', margin: '0 0 12px', fontSize: 13.5, fontWeight: 700, color: '#78350F', lineHeight: 1.5 }}>💡 <PlanoMd x={b.x} /></div>;
        if (b.t === 'tab') return <table key={i} className="plano-tab"><thead><tr>{b.cab.map((c, j) => <th key={j}>{c}</th>)}</tr></thead><tbody>{b.lin.map((l, j) => <tr key={j}>{l.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table>;
        return null;
      })}
      {aulas.length > 0 && (
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '10px 12px', margin: '4px 0 12px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#4C1D95' }}>📌 Você viu isso nas suas aulas</div>
          {aulas.map(p => <button key={p.id} onClick={() => onOpenPost(p)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '6px 0 0', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: '#5B21B6', textDecoration: 'underline', cursor: 'pointer' }}>{PlanoTituloAula(p)}</button>)}
        </div>)}
      <div style={{ background: '#fff', border: '1.5px dashed rgba(var(--brand-rgb),.5)', borderRadius: 16, padding: 13 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>✅ Teste rápido: {q.p}</div>
        {q.o.map((o, i) => <button key={i} disabled={resp !== null} onClick={() => setResp(i)} className={`plano-opt ${resp !== null ? (i === q.c ? 'ok' : i === resp ? 'no' : '') : ''}`}>{o}</button>)}
        {resp !== null && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 9, color: resp === q.c ? '#14532D' : '#7F1D1D' }}>{resp === q.c ? q.ok : q.no}</div>}
      </div>
    </PlanoCamada>
  );
}

/* ───────── tarefa: vocabulário ───────── */
function PlanoFalar(texto) { try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(texto); u.lang = 'en-US'; u.rate = .9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } } catch (e) {} }
function PlanoVocab({ vocab, unidade, onFeita, onClose, onAsk }) {
  const [i, setI] = React.useState(0); const [vira, setVira] = React.useState(false);
  const [en, pt] = vocab[i]; const ultimo = i === vocab.length - 1;
  return (
    <PlanoCamada titulo="Vocabulário" sub={`${i + 1} de ${vocab.length}`} onClose={onClose} onAsk={onAsk}
      rodape={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="plano-btn sec" disabled={i === 0} onClick={() => { setI(i - 1); setVira(false); }}>‹ Anterior</button>
        {ultimo ? <button className="plano-btn" onClick={onFeita}>Concluir ✓</button> : <button className="plano-btn" onClick={() => { setI(i + 1); setVira(false); }}>Próxima ›</button>}
      </div>}>
      <button onClick={() => { setVira(v => !v); if (!vira) PlanoFalar(en); }} style={{ width: '100%', minHeight: 240, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 22, boxShadow: '0 12px 30px rgba(15,23,42,.08)', fontFamily: 'inherit', cursor: 'pointer', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#64748B' }}>{vira ? 'PORTUGUÊS' : 'INGLÊS · TOQUE PARA VIRAR'}</div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 10, color: vira ? '#15803D' : '#0F172A' }}>{vira ? pt : en}</div>
          {!vira && <div onClick={e => { e.stopPropagation(); PlanoFalar(en); }} style={{ fontSize: 28, marginTop: 10 }} role="button" aria-label="Ouvir">🔊</div>}
        </div>
      </button>
    </PlanoCamada>
  );
}

/* ───────── tarefa: jogos ───────── */
function PlanoJogoMemoria({ pares, onFim }) {
  const [cartas] = React.useState(() => PlanoEmbaralhar(pares.flatMap(([a, b], i) => [{ k: i, t: a }, { k: i, t: b }])));
  const [viradas, setViradas] = React.useState([]); const [achadas, setAchadas] = React.useState([]); const [jogadas, setJogadas] = React.useState(0);
  const trava = React.useRef(false);
  const virar = i => {
    if (trava.current || viradas.includes(i) || achadas.includes(cartas[i].k)) return;
    const nv = [...viradas, i]; setViradas(nv);
    if (nv.length === 2) {
      setJogadas(j => j + 1);
      if (cartas[nv[0]].k === cartas[nv[1]].k) { setAchadas(x => [...x, cartas[nv[0]].k]); setViradas([]); }
      else { trava.current = true; setTimeout(() => { setViradas([]); trava.current = false; }, 800); }
    }
  };
  const fim = achadas.length === pares.length;
  if (fim) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>🎉</div><div style={{ fontSize: 22, fontWeight: 800 }}>Você achou todos!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>{jogadas} jogadas</div><button className="plano-btn" onClick={() => onFim(jogadas)}>Concluir ✓</button></div>;
  return <div>
    <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>Vire duas cartas: a palavra em inglês e o significado. · {jogadas} jogadas</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
      {cartas.map((c, i) => { const up = viradas.includes(i) || achadas.includes(c.k); const ok = achadas.includes(c.k); return (
        <button key={i} onClick={() => virar(i)} style={{ aspectRatio: '1/1.05', borderRadius: 16, border: up ? `2px solid ${ok ? '#22C55E' : '#E2E8F0'}` : 0, fontFamily: 'inherit', fontWeight: 800, fontSize: up ? 15 : 28, lineHeight: 1.15, padding: 4, cursor: 'pointer',
          background: ok ? '#DCFCE7' : up ? '#fff' : 'linear-gradient(150deg,var(--brand),var(--brand-dark))', color: ok ? '#14532D' : up ? '#0F172A' : 'rgba(255,255,255,.5)', boxShadow: up ? 'none' : '0 6px 14px rgba(6,78,59,.25)' }}>{up ? c.t : '?'}</button>); })}
    </div>
  </div>;
}

function PlanoJogoRelampago({ perguntas, onFim }) {
  const [i, setI] = React.useState(0); const [pts, setPts] = React.useState(0); const [seq, setSeq] = React.useState(0); const [melhor, setMelhor] = React.useState(0);
  const [fb, setFb] = React.useState(null); const [w, setW] = React.useState(100);
  const fim = i >= perguntas.length;
  const responder = React.useCallback((op) => {
    if (fb) return;
    const q = perguntas[i]; const ok = op === q.c; const ns = ok ? seq + 1 : 0;
    setSeq(ns); setMelhor(m => Math.max(m, ns)); if (ok) setPts(p => p + 10 + Math.min(ns - 1, 4) * 2);
    setFb({ op, ok }); setTimeout(() => { setFb(null); setI(x => x + 1); }, 900);
  }, [fb, i, seq, perguntas]);
  React.useEffect(() => {
    if (fb || fim) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => { const f = Math.min(1, (Date.now() - t0) / 8000); setW(100 * (1 - f)); if (f >= 1) { clearInterval(id); responder(-1); } }, 100);
    return () => clearInterval(id);
  }, [i, fb, fim, responder]);
  if (fim) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>⚡</div><div style={{ fontSize: 22, fontWeight: 800 }}>{pts} pontos!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>Melhor sequência: {melhor} acertos seguidos</div><button className="plano-btn" onClick={() => onFim(pts)}>Concluir ✓</button></div>;
  const q = perguntas[i]; const [a, b] = q.f.split('___');
  return <div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>{[[`${i + 1}/${perguntas.length}`, 'pergunta'], [pts, 'pontos'], [`🔥${seq}`, 'sequência']].map(([v, l]) => <div key={l} style={{ flex: 1, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 14, padding: 8, textAlign: 'center' }}><b style={{ display: 'block', fontSize: 18 }}>{v}</b><small style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{l}</small></div>)}</div>
    <div style={{ height: 10, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden', margin: '6px 0 14px' }}><div style={{ width: `${w}%`, height: '100%', background: 'linear-gradient(90deg,#F59E0B,#EF4444)' }} /></div>
    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.35, textAlign: 'center', margin: '10px 0 16px', padding: '20px 10px', background: '#fff', borderRadius: 18, border: '1px solid rgba(var(--brand-rgb),.12)' }}>{a}<span style={{ display: 'inline-block', minWidth: 70, borderBottom: '3px solid var(--brand)', color: fb ? 'var(--brand-dark)' : 'transparent' }}>{fb ? q.o[q.c] : '____'}</span>{b}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{q.o.map((o, k) => <button key={k} disabled={!!fb} onClick={() => responder(k)} className={`plano-opt ${fb ? (k === q.c ? 'ok' : k === fb.op ? 'no' : '') : ''}`} style={{ textAlign: 'center', fontSize: 18, padding: '16px 8px', marginTop: 0 }}>{o}</button>)}</div>
    {fb && <div style={{ textAlign: 'center', marginTop: 12, fontWeight: 800, color: fb.ok ? '#14532D' : '#7F1D1D' }}>{fb.ok ? '✔ Isso!' : fb.op < 0 ? '⏰ Acabou o tempo' : `✘ Era “${q.o[q.c]}”`}</div>}
  </div>;
}

function PlanoJogoMontar({ frases, onFim }) {
  const [i, setI] = React.useState(0); const [score, setScore] = React.useState(0);
  const novo = idx => PlanoEmbaralhar((frases[idx] ? frases[idx].w : []).map((t, k) => ({ t, k })));
  const [banco, setBanco] = React.useState(() => novo(0)); const [resp, setResp] = React.useState([]); const [res, setRes] = React.useState(null);
  if (i >= frases.length) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>🧩</div><div style={{ fontSize: 22, fontWeight: 800 }}>Frases completas!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>{score} de {frases.length} certas</div><button className="plano-btn" onClick={() => onFim(score)}>Concluir ✓</button></div>;
  const cur = frases[i];
  const palavra = (w, onClick, extra) => <button key={w.k + w.t} onClick={onClick} style={{ padding: '9px 13px', borderRadius: 12, background: '#fff', border: `1.5px solid ${extra ? 'var(--brand)' : '#CBD5E1'}`, boxShadow: `0 2px 0 ${extra ? 'var(--brand)' : '#CBD5E1'}`, fontWeight: 800, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{w.t}</button>;
  const conferir = () => { const ok = resp.map(w => w.t).join(' ') === cur.w.join(' '); setRes(ok); if (ok) setScore(s => s + 1); };
  const proxima = () => { const n = i + 1; setI(n); setRes(null); setResp([]); setBanco(novo(n)); };
  return <div>
    <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: 14, marginBottom: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Monte a frase em inglês ({i + 1}/{frases.length}):</div><div style={{ fontSize: 16.5, fontWeight: 800, marginTop: 4 }}>“{cur.pt}”</div></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 56, padding: 10, borderRadius: 16, background: '#fff', border: '2px dashed #CBD5E1', margin: '8px 0 12px' }}>{resp.map((w, k) => palavra(w, () => { if (res === null) { setBanco(b => [...b, w]); setResp(r => r.filter((_, j) => j !== k)); } }, true))}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 56, padding: 10, borderRadius: 16, background: '#F1F5F9' }}>{banco.map((w, k) => palavra(w, () => { if (res === null) { setResp(r => [...r, w]); setBanco(b => b.filter((_, j) => j !== k)); } }, false))}</div>
    {res === null ? <button className="plano-btn" style={{ marginTop: 14 }} disabled={!resp.length} onClick={conferir}>Conferir</button>
      : <div><div style={{ textAlign: 'center', fontWeight: 800, margin: '12px 0', color: res ? '#14532D' : '#7F1D1D' }}>{res ? '✔ Perfeito!' : `✘ Quase! O certo é: ${cur.w.join(' ')}`}</div><button className="plano-btn" onClick={proxima}>Próxima ›</button></div>}
  </div>;
}

function PlanoJogos({ jogos, feitas, onJogoFeito, onClose, onAsk }) {
  const [ativo, setAtivo] = React.useState(null);
  const lista = [
    { id: 'memoria', ic: '🃏', bg: '#DCFCE7', t: 'Family Match', d: 'Memória: palavra e significado' },
    { id: 'relampago', ic: '⚡', bg: '#FEF3C7', t: 'Speed Quiz', d: 'Do ou does? Comparativos? Rápido!' },
    { id: 'montar', ic: '🧩', bg: '#DBEAFE', t: 'Build It!', d: 'Monte a frase tocando nas palavras' },
  ];
  const sair = () => ativo ? setAtivo(null) : onClose();
  const fim = id => () => { onJogoFeito(id); setAtivo(null); };
  const j = lista.find(x => x.id === ativo);
  return (
    <PlanoCamada titulo={j ? j.t : 'Jogos'} sub={j ? j.d : 'Termine ao menos um para concluir a tarefa'} onClose={sair} onAsk={onAsk}>
      {!ativo && lista.map(g => (
        <button key={g.id} onClick={() => setAtivo(g.id)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: 13, marginBottom: 10, fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer', boxShadow: '0 8px 24px rgba(15,23,42,.06)' }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: g.bg, display: 'grid', placeItems: 'center', fontSize: 27, flexShrink: 0 }}>{g.ic}</div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 15, fontWeight: 800 }}>{g.t}</div><div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>{g.d}</div>
            <span style={{ display: 'inline-block', marginTop: 5, fontSize: 10, fontWeight: 800, letterSpacing: .7, padding: '3px 9px', borderRadius: 99, background: feitas['t5:' + g.id] ? '#DCFCE7' : '#F5F3FF', color: feitas['t5:' + g.id] ? '#166534' : '#5B21B6' }}>{feitas['t5:' + g.id] ? 'FEITO ✓' : 'NOVO'}</span></div>
          <span style={{ color: '#94A3B8', fontSize: 22 }}>›</span>
        </button>))}
      {ativo === 'memoria' && <PlanoJogoMemoria pares={jogos.memoria} onFim={fim('memoria')} />}
      {ativo === 'relampago' && <PlanoJogoRelampago perguntas={jogos.relampago} onFim={fim('relampago')} />}
      {ativo === 'montar' && <PlanoJogoMontar frases={jogos.montar} onFim={fim('montar')} />}
    </PlanoCamada>
  );
}

/* ───────── aula, dúvida (IA + WhatsApp) e boas-vindas ───────── */
function PlanoAulaFolha({ aula, student, cfg, onClose, onAsk }) {
  const feita = aula.feita; const zoom = student && student.zoomLink;
  return (
    <PlanoFolha onClose={onClose}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: feita ? '#15803D' : '#1E40AF' }}>{feita ? 'AULA FEITA' : 'PRÓXIMA AULA'}</div>
      <div style={{ fontSize: 22, fontWeight: 800, margin: '2px 0' }}>{aula.rotulo}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{PlanoDataCurta(aula.data)}{aula.hora ? ` às ${aula.hora}` : ''}{!feita ? ` · ${PlanoEmDias(aula.data)}` : ''}</div>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '11px 13px', margin: '14px 0', fontSize: 13.5, fontWeight: 700, color: '#1E3A8A', lineHeight: 1.5 }}>
        {feita ? 'Essa aula liberou as tarefas do seu caminho. Faça no seu ritmo até a próxima.' : 'Na aula de 1 hora o César revisa o seu caminho, tira dúvidas e libera as próximas 5 ou 6 tarefas.'}
      </div>
      {!feita && zoom && <a href={zoom} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', marginBottom: 10, background: 'linear-gradient(180deg,#3B82F6,#1E40AF)', boxShadow: '0 8px 20px rgba(30,64,175,.28)' }}>📹 Entrar na aula (Zoom)</a>}
      <a href={PlanoWhatsLink(student, `Oi, César! Aqui é ${student.firstName || student.name || 'sua aluna'} (${cfg.nome}). Sobre a ${aula.rotulo.toLowerCase()} de ${PlanoDataCurta(aula.data)}: `)} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', background: '#25D366', boxShadow: 'none', marginBottom: 10 }}>💬 Falar com o César no WhatsApp</a>
      <button className="plano-btn sec" onClick={onClose}>Fechar</button>
    </PlanoFolha>
  );
}

function PlanoPerguntar({ cfg, student, contexto, onAsk, onClose }) {
  const [texto, setTexto] = React.useState(''); const [msgs, setMsgs] = React.useState([]); const [pensando, setPensando] = React.useState(false);
  const fimRef = React.useRef(null);
  React.useEffect(() => { if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' }); }, [msgs, pensando]);
  const enviar = async () => {
    const pergunta = texto.trim(); if (!pergunta || pensando) return;
    setMsgs(m => [...m, { de: 'eu', x: pergunta }]); setTexto(''); setPensando(true);
    try {
      let r;
      if (cfg.previa || !onAsk) { await new Promise(res => setTimeout(res, 900)); r = { resposta: 'Boa pergunta! Depois de **do/does/don’t/doesn’t** o verbo principal fica sempre na forma base: *Does she work?* (e não *Does she works?*).\n\n(Resposta de exemplo — o assistente de verdade ainda não está ligado.)' }; }
      else r = await onAsk(pergunta, contexto);
      setMsgs(m => [...m, { de: 'ia', x: r.resposta }]);
    } catch (e) { setMsgs(m => [...m, { de: 'ia', x: 'Não consegui responder agora. Pergunte direto ao César no WhatsApp, ele responde assim que puder.', erro: true }]); }
    setPensando(false);
  };
  const ultima = [...msgs].reverse().find(m => m.de === 'eu');
  const wa = PlanoWhatsLink(student, `Oi, César! Aqui é ${student.firstName || student.name || 'sua aluna'} (${cfg.nome}). ${contexto ? `Estou na tarefa “${contexto}”. ` : ''}${ultima ? `Minha dúvida: ${ultima.x}` : 'Tenho uma dúvida: '}`);
  return (
    <PlanoFolha onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800 }}>💬 Tem uma dúvida?</div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', margin: '2px 0 12px' }}>{contexto ? `Sobre: ${contexto}` : 'Pergunte sobre o que está estudando.'}</div>
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 10, minHeight: 110, maxHeight: 280, overflowY: 'auto' }}>
        {msgs.length === 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', padding: 6 }}>Escreva a sua dúvida abaixo. O assistente responde em português, com exemplos em inglês. Se precisar do César, toque em WhatsApp.</div>}
        {msgs.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start', margin: '6px 0' }}><div style={{ maxWidth: '86%', padding: '9px 12px', borderRadius: 14, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.de === 'eu' ? '#7C3AED' : m.erro ? '#FEF2F2' : '#fff', color: m.de === 'eu' ? '#fff' : '#0F172A', border: m.de === 'eu' ? 0 : '1px solid #E2E8F0' }}>{m.de === 'ia' ? <PlanoMd x={m.x} /> : m.x}</div></div>)}
        {pensando && <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', padding: 6 }}>Pensando…</div>}
        <div ref={fimRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar(); }} placeholder="Digite sua dúvida…" style={{ flex: 1, border: '1.5px solid #CBD5E1', borderRadius: 14, padding: '12px 13px', fontSize: 14.5, fontFamily: 'inherit', fontWeight: 600, outline: 'none' }} />
        <button onClick={enviar} disabled={!texto.trim() || pensando} style={{ border: 0, borderRadius: 14, padding: '0 16px', background: PLANO_COR, color: '#fff', fontWeight: 800, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', opacity: !texto.trim() || pensando ? .5 : 1 }}>Enviar</button>
      </div>
      <a href={wa} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', background: '#25D366', boxShadow: 'none' }}>💬 Falar com o César no WhatsApp</a>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>O assistente é uma ajuda automática e pode errar. Na dúvida, fale com o César.</div>
    </PlanoFolha>
  );
}

function PlanoBoasVindas({ cfg, nome, onFim }) {
  const [s, setS] = React.useState(0);
  const slides = [
    <><div style={{ fontSize: 60 }}>🎉</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>{nome}, seu plano mudou!</h2><p>Agora você estuda no <b>{cfg.nome}</b>: um caminho em ordem, com o livro <b>{cfg.curso}</b>, jogos, atividades e a sua aula de 1 hora por mês com o professor César.</p><p>Suas aulas e pós-aulas <b>continuam com você</b> — agora ligados ao que você estuda.</p></>,
    <><div style={{ fontSize: 60 }}>🛤️</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>Como o caminho funciona</h2>
      {[['1', <>A <b>aula do mês</b> libera de 5 a 6 tarefas.</>], ['2', <>O <b>estudo está dentro de cada tarefa</b>: explicação, exemplos e teste.</>], ['3', <>Faça no seu ritmo até a próxima aula. Os jogos e extras ajudam a fixar.</>], ['4', <>Ficou com dúvida? Toque em <b>💬</b> para perguntar ou falar com o César.</>]].map(([n, t]) => <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: '11px 13px', marginBottom: 9, fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}><span style={{ width: 28, height: 28, borderRadius: '50%', background: '#DDD6FE', color: '#4C1D95', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>{n}</span><span>{t}</span></div>)}</>,
    <><div style={{ fontSize: 60 }}>🧭</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>Onde ficam as coisas</h2>
      {[['🛤️', 'Caminho', 'suas tarefas, na ordem'], ['✏️', 'Atividades', 'exercícios, correção, extras e desafio'], ['📄', 'Aulas', 'todos os seus pós-aulas'], ['👤', 'Perfil', 'seus dados e ajuda']].map(([i, t, d]) => <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: '9px 12px', marginBottom: 8, fontSize: 13.5, fontWeight: 700 }}><span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{i}</span><span><b style={{ display: 'block', fontSize: 14.5 }}>{t}</b>{d}</span></div>)}</>,
  ];
  const ultimo = s === slides.length - 1;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'linear-gradient(170deg,#6D28D9,#312E81 75%)', color: '#fff', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', padding: '34px 24px calc(22px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>{slides[s]}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '14px 0' }}>{slides.map((_, i) => <i key={i} style={{ width: i === s ? 22 : 8, height: 8, borderRadius: 99, background: i === s ? '#fff' : 'rgba(255,255,255,.35)', display: 'block' }} />)}</div>
        <button onClick={() => ultimo ? onFim() : setS(s + 1)} style={{ background: '#fff', color: '#4C1D95', border: 0, borderRadius: 16, padding: 14, fontWeight: 800, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{ultimo ? 'Ver meu caminho' : 'Continuar'}</button>
        {!ultimo && <div onClick={onFim} style={{ textAlign: 'center', marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', cursor: 'pointer' }}>Pular</div>}
      </div>
    </div>
  );
}

/* ───────── lista de aulas (pós-aulas) ───────── */
function PlanoAulasLista({ posaulas, onOpenPost }) {
  return (
    <div className="scroll-area" style={{ padding: '14px 16px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', margin: '0 2px 12px' }}>Todas as suas aulas continuam aqui. Dentro de cada tarefa o app também indica onde o assunto foi explicado.</div>
      {posaulas.length === 0 && <div style={{ background: '#fff', borderRadius: 18, padding: 28, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>Nenhum pós-aula ainda.</div>}
      {posaulas.map(p => (
        <div key={p.id} onClick={() => onOpenPost(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 14, padding: '11px 14px', marginBottom: 8, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(var(--brand-rgb),.1)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: '#0F172A', overflowWrap: 'anywhere' }}>{PlanoTituloAula(p)}</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 1, color: p.readAt ? 'var(--brand)' : '#D97706' }}>{p.readAt ? '✓ Lido' : 'Não lido'}</div>
          </div>
        </div>))}
    </div>
  );
}

/* ───────── o conteúdo do plano (troca o miolo do app) ───────── */
function PlanoConteudo({ tab, onTab, cfg, student, posaulas, activities, slots, onOpenPost, onAsk }) {
  const uid = student.uid || 'x';
  const [feitas, marcar, zerar] = usePlanoFeitas(uid);
  const chaveBV = `plano-boasvindas-v1-${uid}`;
  const [bv, setBv] = React.useState(() => { try { return !localStorage.getItem(chaveBV); } catch (e) { return false; } });
  const [tarefa, setTarefa] = React.useState(null);   // { t, pac }
  const [aula, setAula] = React.useState(null);
  const [duvida, setDuvida] = React.useState(null);   // { contexto }
  const [aviso, setAviso] = React.useState('');
  const nome = student.firstName || String(student.name || '').split(' ')[0] || 'Olá';
  const ativOk = activities.length > 0 && activities.every(a => a.finalizada || a.status === 'corrected');
  const avisar = x => { setAviso(x); setTimeout(() => setAviso(''), 2200); };

  const abrirTarefa = (t, estado) => {
    if (estado === 'trancada') { const prox = cfg.aulas.find(a => !a.feita); avisar(`🔒 Libera depois da aula${prox ? ' de ' + PlanoDataCurta(prox.data) : ''}.`); return; }
    if (t.tipo === 'atividades') { onTab('atividades'); return; }
    setTarefa(t);
  };
  const concluir = id => { marcar(id); setTarefa(null); avisar('✅ Tarefa concluída!'); };
  const fechar = () => setTarefa(null);
  const perguntar = () => setDuvida({ contexto: tarefa ? tarefa.titulo : '' });
  const u = cfg.unidade;

  return (
    <>
      <style>{PLANO_CSS}</style>
      {tab === 'caminho' && <PlanoCaminho cfg={cfg} feitas={feitas} ativOk={ativOk} onTarefa={abrirTarefa} onAula={setAula} onComoFunciona={() => setBv(true)} />}
      {tab === 'atividades' && slots.atividades}
      {tab === 'aulas' && <PlanoAulasLista posaulas={posaulas} onOpenPost={onOpenPost} />}
      {tab === 'perfil' && <>
        {slots.perfil}
        {cfg.previa && <div style={{ padding: '0 16px 20px' }}><button className="plano-btn sec" onClick={() => { zerar(); try { localStorage.removeItem(chaveBV); } catch (e) {} setBv(true); }}>↺ Reiniciar a prévia do plano</button></div>}
      </>}

      {!tarefa && !aula && !duvida && tab !== 'perfil' &&
        <button onClick={() => setDuvida({ contexto: '' })} aria-label="Tirar dúvida" style={{ position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', right: 'max(16px, calc(50vw - 224px))', zIndex: 300, width: 54, height: 54, borderRadius: '50%', border: 0, background: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', color: '#fff', fontSize: 24, boxShadow: '0 10px 24px rgba(109,40,217,.4)', cursor: 'pointer' }}>💬</button>}

      {tarefa && tarefa.tipo === 'estudo' && <PlanoEstudo estudo={u.estudos[tarefa.ref]} unidade={u} posaulas={posaulas} onOpenPost={onOpenPost} onFeita={() => concluir(tarefa.id)} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'vocab' && <PlanoVocab vocab={u.vocab} unidade={u} onFeita={() => concluir(tarefa.id)} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'jogos' && <PlanoJogos jogos={u.jogos} feitas={feitas} onJogoFeito={id => { marcar('t5:' + id); marcar(tarefa.id); avisar('🎮 Jogo concluído!'); }} onClose={fechar} onAsk={perguntar} />}
      {aula && <PlanoAulaFolha aula={aula} student={student} cfg={cfg} onClose={() => setAula(null)} />}
      {duvida && <PlanoPerguntar cfg={cfg} student={student} contexto={duvida.contexto} onAsk={cfg.previa ? null : onAsk} onClose={() => setDuvida(null)} />}
      {bv && <PlanoBoasVindas cfg={cfg} nome={nome} onFim={() => { try { localStorage.setItem(chaveBV, '1'); } catch (e) {} setBv(false); }} />}
      {aviso && <div style={{ position: 'fixed', left: '50%', bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 700, whiteSpace: 'nowrap', animation: 'planoSurge .2s' }}>{aviso}</div>}
    </>
  );
}
