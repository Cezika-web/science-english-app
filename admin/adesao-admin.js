/* Aba "Adesão" do painel do professor.
 *
 * Mostra quanto cada aluno está envolvido no curso (aulas, pós-aula, atividades,
 * desafio e constância), o que chama atenção, o que o aluno vê na tela dele, o
 * recado do professor e as metas/pesos. O cálculo é o mesmo do app do aluno
 * (../adesao.js), então o número que você vê aqui é o que o aluno vê.
 *
 * Dados: tudo que o painel já leu em loadStudents (pós-aulas, atividades,
 * presença) + `students/{uid}/usage/{dia}` (dias ativos e tempo) +
 * `students/{uid}/challengeSubmissions` + `challengeWeeks`. Configuração e data de
 * liberação ficam em `schools/{escola}.adesao`. O resumo anônimo por faixa
 * (para o gráfico "quem se dedica mais acerta mais") vai para
 * `schools/{escola}/adesaoStats/atual` sempre que a aba é carregada.
 */
const A = window.CzkAdesao;

export function initAdesaoAdmin(ctx) {
  const { db, collection, getDocs, getDoc, doc, setDoc, updateDoc, query, where, serverTimestamp, deleteField } = ctx;
  const U = A.util, KEYS = A.KEYS, PIL = A.PIL, WD = A.WD, WDF = A.WDF;
  const esc = U.esc, fm = U.fm, num1 = U.num1, pct = U.pct;

  const S = {
    loaded: false, loading: false, error: '',
    adesao: {},                 // schools/{escola}.adesao
    cfg: A.cfgOf({}), dirty: false,
    items: [],                  // [{ id, s, c }]
    stats: null,
    tab: 'turma', sub: 'prof', view: 'lista', sort: 'asc', sel: null, selWeek: 2,
    drawer: false, saving: '',
  };
  const root = () => document.getElementById('adesao-root');
  const escola = () => ctx.getEscola();
  const schoolRef = () => doc(db, 'schools', escola());
  const todayKey = () => U.dayKey(new Date());
  const brDate = key => (key && /^\d{4}-\d{2}-\d{2}$/.test(key)) ? key.slice(8, 10) + '/' + key.slice(5, 7) : '';
  const nameOf = s => s.name || s.firstName || 'Aluno';
  const firstOf = s => s.firstName || String(s.name || 'Aluno').split(' ')[0];

  const CSS = `
  #adesao-root{--ok:#15935f;--warn:#d97706;--bad:#dc2626;--ok-bg:#e8f7f0;--warn-bg:#fff7e6;--bad-bg:#fdecec;--h0:#edf1f6;--h1:#cfe3fb;--h2:#93c2f5;--h3:#4f98ea;--h4:#1f6fd1}
  #adesao-root .czad-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
  #adesao-root .czad-head h2{font-size:1.4rem;font-weight:800;letter-spacing:-.3px}
  #adesao-root .czad-head p{color:var(--muted);margin-top:2px;max-width:640px;font-size:.88rem}
  #adesao-root .czad-btn{border:1px solid var(--border);background:#fff;border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;font-size:13px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;color:var(--text)}
  #adesao-root .czad-btn:hover{border-color:var(--accent)}
  #adesao-root .czad-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}
  #adesao-root .czad-btn:disabled{opacity:.5;cursor:default}
  #adesao-root .czad-lock{margin-top:14px;border:1px solid #fde68a;background:#fffbeb;color:#7c4a03;border-radius:12px;padding:12px 14px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;font-size:.88rem}
  #adesao-root .czad-lock.open{background:var(--ok-bg);border-color:#bfe8d4;color:#0d5c3b}
  #adesao-root .czad-lock input[type=date]{font:inherit;border:1px solid #e5d3a3;border-radius:8px;padding:4px 8px;background:#fff}
  #adesao-root .czad-lockbtns{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  #adesao-root .czad-tabs{display:flex;gap:4px;margin-top:16px;border-bottom:1px solid var(--border);overflow-x:auto}
  #adesao-root .czad-tabs button{background:none;border:0;padding:10px 14px;font:inherit;font-weight:700;color:var(--muted);border-bottom:3px solid transparent;white-space:nowrap;cursor:pointer}
  #adesao-root .czad-tabs button.on{color:var(--accent-dark);border-color:var(--accent)}
  #adesao-root .czad-sec{margin-top:16px}
  #adesao-root .czad-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:999px;font-size:11.5px;font-weight:700;border:1px solid;white-space:nowrap}
  #adesao-root .czad-chip.ok{color:var(--ok);background:var(--ok-bg);border-color:#bfe8d4}
  #adesao-root .czad-chip.warn{color:#9a5b05;background:var(--warn-bg);border-color:#f7d9a0}
  #adesao-root .czad-chip.bad{color:var(--bad);background:var(--bad-bg);border-color:#f6c1c1}
  #adesao-root .czad-chip.neutral{color:#475569;background:#f1f5f9;border-color:#e2e8f0}
  #adesao-root .czad-stats{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
  #adesao-root .czad-mrow{display:grid;grid-template-columns:170px 1fr 1fr auto auto;gap:10px;align-items:center;padding:9px 0;border-top:1px solid #eef2f7;font-size:.88rem}
  #adesao-root .czad-mrow:first-of-type{border-top:0}
  #adesao-root .czad-mrow .lab{font-weight:700;color:#334155}
  #adesao-root .czad-mrow em{font-style:normal;font-weight:600;color:var(--muted);font-size:.8rem}
  #adesao-root .czad-ptag{margin:14px 0 -2px;font:700 10px/1 Inter,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#8b7355;background:#efe6d8;border-radius:6px;padding:5px 8px;display:inline-block}
  #adesao-root .czad-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px}
  #adesao-root .czad-stat small{display:block;color:var(--muted);font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
  #adesao-root .czad-stat b{font-size:22px;font-weight:800;letter-spacing:-.4px}
  #adesao-root .czad-stat span{color:var(--muted);font-size:12px;margin-left:4px}
  #adesao-root .czad-toolbar{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin:14px 0 10px}
  #adesao-root .czad-seg{display:inline-flex;background:#e9eff7;border-radius:10px;padding:3px}
  #adesao-root .czad-seg button{border:0;background:none;padding:6px 12px;border-radius:8px;font:inherit;font-weight:700;font-size:12.5px;color:var(--muted);cursor:pointer}
  #adesao-root .czad-seg button.on{background:#fff;color:var(--accent-dark);box-shadow:0 1px 3px rgba(15,23,36,.12)}
  #adesao-root .czad-list{background:var(--card);border:1px solid var(--border);border-radius:14px;overflow:hidden}
  #adesao-root .czad-lhead,#adesao-root .czad-row{display:grid;grid-template-columns:200px 84px 360px 112px minmax(140px,1fr);gap:14px;align-items:center;padding:10px 16px}
  #adesao-root .czad-lhead{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;color:var(--muted);background:#f8fafc;border-bottom:1px solid var(--border)}
  #adesao-root .czad-row{width:100%;text-align:left;background:#fff;border:0;border-bottom:1px solid var(--border);font:inherit;color:var(--text);cursor:pointer}
  #adesao-root .czad-row:last-child{border-bottom:0}
  #adesao-root .czad-row:hover{background:#f5f9ff}
  #adesao-root .czad-who{display:flex;align-items:center;gap:10px;min-width:0}
  #adesao-root .czad-av{width:36px;height:36px;border-radius:50%;background:#dbeafe;color:var(--accent-dark);display:grid;place-items:center;font-weight:800;flex-shrink:0}
  #adesao-root .czad-who b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #adesao-root .czad-who small{color:var(--muted);font-size:12px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #adesao-root .czad-sc{display:flex;align-items:center;gap:6px}
  #adesao-root .czad-sc .tr{font-size:11px;font-weight:800}
  #adesao-root .czad-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
  #adesao-root .czad-strip .wk{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
  #adesao-root .czad-strip i{height:16px;border-radius:3px;background:var(--h0);display:block}
  #adesao-root .czad-strip i.l1{background:var(--h1)}#adesao-root .czad-strip i.l2{background:var(--h2)}#adesao-root .czad-strip i.l3{background:var(--h3)}#adesao-root .czad-strip i.l4{background:var(--h4)}
  #adesao-root .czad-strip i.fut{background:none;border:1px dashed #d7dee8}
  #adesao-root .czad-pb{display:flex;gap:5px;align-items:flex-end;height:36px}
  #adesao-root .czad-pbw{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:2px}
  #adesao-root .czad-pbw i{display:block;width:16px;border-radius:3px 3px 0 0;min-height:3px}
  #adesao-root .czad-pbw i.na{background:none;border:1px dashed #cbd5e1;height:8px!important}
  #adesao-root .czad-pbw em{font-style:normal;font-size:9px;font-weight:800;color:var(--muted)}
  #adesao-root .czad-why{display:flex;gap:5px;flex-wrap:wrap}
  #adesao-root .czad-legend{display:flex;gap:14px;flex-wrap:wrap;color:var(--muted);font-size:12px;margin-top:10px;align-items:center}
  #adesao-root .czad-legend span{display:inline-flex;align-items:center;gap:5px}
  #adesao-root .czad-legend i{width:12px;height:12px;border-radius:3px;display:inline-block;background:var(--h0)}
  #adesao-root details.czad-how{margin-top:14px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px}
  #adesao-root details.czad-how summary{font-weight:800;cursor:pointer}
  #adesao-root details.czad-how ul{margin:10px 0 0 18px;color:#334155;display:grid;gap:5px;font-size:.88rem}
  #adesao-root .czad-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:16px}
  #adesao-root .czad-card h3{font-size:14px;font-weight:800}
  #adesao-root .czad-card .sub{color:var(--muted);font-size:12.5px;margin-top:2px}
  #adesao-root .czad-dtop{display:grid;grid-template-columns:auto 1fr 300px;gap:20px;align-items:center}
  #adesao-root .czad-dtop h2{font-size:1.3rem;font-weight:800}
  #adesao-root .czad-dtop .meta{color:var(--muted);margin-top:2px}
  #adesao-root .czad-evo{display:flex;gap:10px;align-items:flex-end;height:96px}
  #adesao-root .czad-evo div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:3px;font-size:11px;font-weight:700;color:var(--muted)}
  #adesao-root .czad-evo i{display:block;width:100%;border-radius:6px 6px 0 0;min-height:4px}
  #adesao-root .czad-evo i.part{background:repeating-linear-gradient(45deg,#e5eaf1 0 4px,#f6f8fb 4px 8px)!important;border:1px dashed #b9c4d3}
  #adesao-root .czad-evo b{color:var(--text);font-size:13px}
  #adesao-root .czad-diag{display:grid;gap:8px;margin-top:10px}
  #adesao-root .czad-diag div{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;background:#f8fafc;border-radius:10px;border:1px solid #eef2f7;font-size:.9rem}
  #adesao-root .czad-diag span:first-child{font-size:17px;line-height:1.2}
  #adesao-root .czad-cm textarea{width:100%;min-height:112px;border:1px solid var(--border);border-radius:10px;padding:10px 12px;font:inherit;line-height:1.5;resize:vertical;margin-top:10px;color:var(--text)}
  #adesao-root .czad-cm .bar{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:8px;flex-wrap:wrap}
  #adesao-root .czad-hm{margin-top:12px;display:grid;gap:6px}
  #adesao-root .czad-hm-row{display:grid;grid-template-columns:96px repeat(7,1fr) 118px;gap:6px;align-items:center}
  #adesao-root .czad-hm-row.hd{font-size:11px;font-weight:800;color:var(--muted);text-transform:uppercase;text-align:center}
  #adesao-root .czad-hm-row .lab{font-size:12px;font-weight:700;color:#334155}
  #adesao-root .czad-hm-row .sum{font-size:12px;color:#334155}
  #adesao-root .czad-hm-row .sum b{display:block}
  #adesao-root .czad-cell{height:40px;border-radius:7px;background:var(--h0);border:0;font:inherit;font-size:11.5px;font-weight:800;color:#0f3a73;display:grid;place-items:center;width:100%;padding:0;cursor:pointer}
  #adesao-root .czad-cell.l1{background:var(--h1)}#adesao-root .czad-cell.l2{background:var(--h2)}#adesao-root .czad-cell.l3{background:var(--h3);color:#fff}#adesao-root .czad-cell.l4{background:var(--h4);color:#fff}
  #adesao-root .czad-cell.fut{background:repeating-linear-gradient(45deg,transparent 0 4px,#e3e8ef 4px 5px);border:1px dashed #d7dee8;color:transparent;cursor:default}
  #adesao-root .czad-cell.sel{outline:3px solid #0f1724;outline-offset:1px}
  #adesao-root .czad-cell.low{color:#94a3b8;font-weight:700}
  #adesao-root .czad-dayinfo{margin-top:10px;padding:9px 12px;border-radius:10px;background:#f1f6fd;border:1px solid #d6e6fb;color:#1e3a5f;font-size:13px;min-height:38px}
  #adesao-root .czad-pills{display:flex;gap:6px;flex-wrap:wrap}
  #adesao-root .czad-pills button{border:1px solid var(--border);background:#fff;border-radius:99px;padding:5px 12px;font:inherit;font-weight:700;font-size:12.5px;color:var(--muted);cursor:pointer}
  #adesao-root .czad-pills button.on{background:var(--accent);border-color:var(--accent);color:#fff}
  #adesao-root .czad-pgrid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px}
  #adesao-root .czad-pcard{border:1px solid var(--border);border-radius:12px;padding:14px;background:#fff}
  #adesao-root .czad-ph{display:flex;align-items:center;justify-content:space-between;gap:8px}
  #adesao-root .czad-big{font-size:22px;font-weight:800;letter-spacing:-.4px}
  #adesao-root .czad-meter{position:relative;height:9px;background:var(--h0);border-radius:99px;margin:8px 0}
  #adesao-root .czad-meter i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}
  #adesao-root .czad-muted{color:var(--muted)}
  #adesao-root .czad-small{font-size:12.5px}
  #adesao-root .czad-items{display:grid;gap:8px;margin-top:8px}
  #adesao-root .czad-it{font-size:12.5px;color:#334155}
  #adesao-root .czad-it .nm{display:flex;justify-content:space-between;gap:8px;font-weight:700}
  #adesao-root .czad-it .bar{position:relative;height:7px;background:var(--h0);border-radius:99px;margin:4px 0 2px}
  #adesao-root .czad-it .bar i{position:absolute;left:0;top:0;bottom:0;border-radius:99px}
  #adesao-root .czad-it .bar u{position:absolute;top:-3px;bottom:-3px;width:2px;background:#0f1724;opacity:.5}
  #adesao-root .czad-na{margin-top:8px;padding:8px 10px;border-radius:8px;background:#f1f5f9;color:#475569;font-size:12.5px}
  #adesao-root .czad-wdays{display:flex;gap:4px;margin-top:8px}
  #adesao-root .czad-wdays div{flex:1;text-align:center;font-size:10.5px;font-weight:700;color:#64748b}
  #adesao-root .czad-wdays i{display:block;height:8px;border-radius:3px;margin-bottom:4px;background:var(--h0)}
  #adesao-root .czad-wdays i.on{background:var(--h3)}
  #adesao-root .czad-chartbox{background:#fff;border:1px solid var(--border);border-radius:14px;padding:12px}
  #adesao-root .czad-chartbox svg{width:100%;height:auto;display:block}
  #adesao-root .czad-prevgrid{display:grid;grid-template-columns:340px 1fr;gap:28px;align-items:start}
  #adesao-root .czad-notes{display:grid;gap:10px}
  #adesao-root .czad-notes>div{background:#fff;border:1px solid var(--border);border-radius:12px;padding:12px 14px;font-size:13px;color:#334155}
  #adesao-root .czad-notes b{display:block;color:var(--text);margin-bottom:2px}
  #adesao-root .czad-notes ul{margin:6px 0 0 18px;display:grid;gap:3px}
  #adesao-root .czad-phone{width:372px;max-width:100%;height:min(88vh,900px);min-height:640px;margin:0 auto;background:#F6F1EA;border:10px solid #111827;border-radius:44px;overflow:hidden;position:relative;box-shadow:0 20px 40px rgba(15,23,36,.25)}
  #adesao-root .czad-phone .czad-scroll{height:100%;overflow-y:auto;padding:30px 14px 26px}
  #adesao-root .czad-shade{position:fixed;inset:0;background:rgba(15,23,36,.35);z-index:90;display:none}
  #adesao-root .czad-shade.on{display:block}
  #adesao-root .czad-drawer{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:100%;background:#fff;z-index:100;transform:translateX(105%);transition:transform .22s;box-shadow:-8px 0 30px rgba(15,23,36,.2);display:flex;flex-direction:column}
  #adesao-root .czad-drawer.on{transform:none}
  #adesao-root .czad-drawer header{padding:16px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center}
  #adesao-root .czad-drawer header b{font-size:16px}
  #adesao-root .czad-drawer .body{padding:14px 16px;overflow-y:auto;flex:1}
  #adesao-root .czad-drawer h5{font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);margin:14px 0 8px}
  #adesao-root .czad-ctl{margin-bottom:14px}
  #adesao-root .czad-ctl .t{display:flex;justify-content:space-between;font-weight:700;font-size:13px}
  #adesao-root .czad-ctl .t span{color:var(--accent-dark)}
  #adesao-root .czad-ctl small{color:var(--muted);font-size:12px;display:block}
  #adesao-root .czad-ctl input[type=range]{width:100%;accent-color:var(--accent)}
  #adesao-root .czad-drawer footer{padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:space-between;align-items:center}
  #adesao-root .czad-msg{padding:24px;text-align:center;color:var(--muted)}
  @media(max-width:900px){
    #adesao-root .czad-stats{grid-template-columns:repeat(2,1fr)}
    #adesao-root .czad-mrow{grid-template-columns:1fr 1fr;row-gap:4px}
    #adesao-root .czad-lhead{display:none}
    #adesao-root .czad-row{grid-template-columns:auto minmax(0,1fr) auto;grid-template-areas:"who who sc" "strip strip strip" "pb why why";row-gap:10px}
    #adesao-root .czad-row .czad-who{grid-area:who}#adesao-root .czad-row .czad-sc{grid-area:sc}#adesao-root .czad-row .czad-strip{grid-area:strip}#adesao-root .czad-row .czad-pb{grid-area:pb}#adesao-root .czad-row .czad-why{grid-area:why}
    #adesao-root .czad-dtop{grid-template-columns:auto 1fr}
    #adesao-root .czad-dtop .czad-evo{grid-column:1/-1}
    #adesao-root .czad-prevgrid{grid-template-columns:1fr}
    #adesao-root .czad-prevgrid .czad-notes{order:2}
  }
  @media(max-width:640px){
    #adesao-root .czad-pgrid{grid-template-columns:1fr}
    #adesao-root .czad-hm-row{grid-template-columns:52px repeat(7,1fr)}
    #adesao-root .czad-hm-row .sum{grid-column:1/-1;padding-bottom:6px}
    #adesao-root .czad-hm-row.hd .sum{display:none}
    #adesao-root .czad-cell{height:34px}
    #adesao-root .czad-drawer{top:auto;width:100%;height:82vh;border-radius:18px 18px 0 0;transform:translateY(105%)}
    #adesao-root .czad-drawer.on{transform:none}
    #adesao-root .czad-phone{border-width:6px;border-radius:34px;height:760px}
  }`;
  function injectCss() {
    if (document.getElementById('czad-style')) return;
    const st = document.createElement('style');
    st.id = 'czad-style';
    st.textContent = CSS + '\n' + A.studentCss();
    document.head.appendChild(st);
  }

  // ── carga ─────────────────────────────────────────────────────────────
  async function load(force) {
    if (S.loading) return;
    if (S.loaded && !force) { render(); return; }
    S.loading = true; S.error = '';
    injectCss();
    const el = root();
    if (el && !S.loaded) el.innerHTML = '<div class="czad-msg">Carregando adesão dos alunos...</div>';
    try {
      let rows = ctx.getRows();
      if (!rows.length) { await ctx.recarregarAlunos(); rows = ctx.getRows(); }
      const schoolSnap = await getDoc(schoolRef());
      S.adesao = (schoolSnap.exists() && schoolSnap.data().adesao) || {};
      const coletaSalva = S.adesao.coletaDesde || '';
      const savedCfg = S.adesao.cfg || {};
      const weeksSnap = await getDocs(collection(db, 'challengeWeeks')).catch(() => ({ docs: [] }));
      const weekKeys = weeksSnap.docs.map(d => d.id);
      const since = coletaSalva || '2000-01-01';
      const dados = await Promise.all(rows.filter(r => !r.archived).map(async s => {
        const [uso, subs] = await Promise.all([
          getDocs(query(collection(db, 'students', s.uid, 'usage'), where('date', '>=', since))).catch(() => ({ docs: [] })),
          getDocs(collection(db, 'students', s.uid, 'challengeSubmissions')).catch(() => ({ docs: [] })),
        ]);
        return {
          s, usage: uso.docs.map(d => ({ date: d.id, ...d.data() })),
          completed: subs.docs.filter(d => d.data().completed === true).map(d => d.id),
        };
      }));
      let earliest = '';
      dados.forEach(d => d.usage.forEach(u => { if (!earliest || u.date < earliest) earliest = u.date; }));
      const coleta = coletaSalva || earliest || '';
      S.cfg = A.cfgOf({ ...savedCfg, coletaDesde: coleta || null });
      S.raw = { dados, weekKeys };
      S.coleta = coleta;
      S.hasUsage = !!earliest;
      S.loaded = true;
      recompute();
      // A data da coleta é a do primeiro uso registrado; guarda para o app do aluno usar a mesma.
      if (!coletaSalva && earliest) {
        updateDoc(schoolRef(), { 'adesao.coletaDesde': earliest }).then(() => { S.adesao.coletaDesde = earliest; }).catch(() => {});
      }
      writeStats();
    } catch (e) {
      console.error('Adesão:', e);
      S.error = 'Não consegui carregar a adesão: ' + (e && e.message ? e.message : e);
    }
    S.loading = false;
    render();
  }

  function recompute() {
    const now = new Date();
    S.items = S.raw.dados.map(d => {
      const r = d.s, inp = r.adesaoIn || { posts: [], activities: [], attendance: [] };
      const c = A.compute({
        now, student: r, usage: d.usage, posts: inp.posts, activities: inp.activities, attendance: inp.attendance,
        challenge: { enabled: r.challengeEnabled !== false, weeks: S.raw.weekKeys, completed: d.completed },
      }, S.cfg);
      return { id: r.uid, s: r, c };
    });
    S.stats = A.bandStats(S.items.filter(i => i.c.status === 'ok').map(i => ({ band: i.c.band.k, acc: i.c.accLast })));
    if (!S.sel || !S.items.some(i => i.id === S.sel)) S.sel = S.items.length ? S.items[0].id : null;
  }

  let statsTimer = null;
  function writeStats() {
    clearTimeout(statsTimer);
    statsTimer = setTimeout(() => {
      if (!S.stats) return;
      setDoc(doc(db, 'schools', escola(), 'adesaoStats', 'atual'), { geradoEm: serverTimestamp(), faixas: S.stats, alunos: S.items.length })
        .catch(e => console.warn('Resumo da adesão não gravado:', e && e.message));
    }, 400);
  }

  // ── persistência ──────────────────────────────────────────────────────
  async function saveCfg() {
    S.saving = 'cfg';
    render();
    try {
      const c = S.cfg;
      await updateDoc(schoolRef(), { 'adesao.cfg': { minPos: c.minPos, secEx: c.secEx, metaDias: c.metaDias, minDia: c.minDia, limiteSeg: c.limiteSeg, metaDiaMin: c.metaDiaMin, metaDiasEstudo: c.metaDiasEstudo, minTipo: c.minTipo, w: c.w } });
      S.adesao.cfg = { minPos: c.minPos, secEx: c.secEx, metaDias: c.metaDias, minDia: c.minDia, limiteSeg: c.limiteSeg, metaDiaMin: c.metaDiaMin, metaDiasEstudo: c.metaDiasEstudo, minTipo: c.minTipo, w: c.w };
      S.dirty = false;
      writeStats();
    } catch (e) { alert('Não consegui salvar as metas: ' + (e.message || e)); }
    S.saving = '';
    render();
  }
  async function saveRelease(value) {       // value: 'AAAA-MM-DD' ou null
    S.saving = 'rel';
    render();
    try {
      await updateDoc(schoolRef(), { 'adesao.liberadaEm': value || null });
      S.adesao.liberadaEm = value || null;
    } catch (e) { alert('Não consegui alterar a liberação: ' + (e.message || e)); }
    S.saving = '';
    render();
  }
  async function saveRecado(uid, texto) {
    const item = S.items.find(i => i.id === uid);
    const ref = doc(db, 'students', uid);
    try {
      if (texto == null) { await updateDoc(ref, { adesaoRecado: deleteField() }); delete item.s.adesaoRecado; }
      else { await updateDoc(ref, { adesaoRecado: { texto, editadoEm: serverTimestamp() } }); item.s.adesaoRecado = { texto }; }
      const st = document.getElementById('czad-cm-state');
      if (st) st.textContent = texto == null ? 'Sugestão automática' : 'Salvo — o aluno já vê este texto';
    } catch (e) { alert('Não consegui salvar o recado: ' + (e.message || e)); }
  }

  // ── helpers de tela ───────────────────────────────────────────────────
  const bandChip = c => c.band ? (c.band.k === 'alta' ? 'ok' : c.band.k === 'media' ? 'warn' : 'bad') : 'neutral';
  const heat = (m, cfg) => m < cfg.minDia ? 0 : m < 10 ? 1 : m < 25 ? 2 : m < 45 ? 3 : 4;
  const pcol = v => v >= .85 ? 'var(--ok)' : v >= .6 ? 'var(--warn)' : 'var(--bad)';
  const trendTxt = t => t == null ? '' : t >= 3 ? '<span class="tr" style="color:var(--ok)">▲ ' + t + '</span>' : t <= -3 ? '<span class="tr" style="color:var(--bad)">▼ ' + (-t) + '</span>' : '<span class="tr" style="color:var(--muted)">● estável</span>';
  const ringFor = c => c.status === 'ok' ? A.ring(c.index, 50, 6, c.band.color) : '<span class="czad-chip neutral">—</span>';

  function stripHtml(c) {
    let h = '<div class="czad-strip" aria-label="Últimas 4 semanas, um quadrado por dia">';
    c.weeks.forEach(w => {
      h += '<div class="wk">';
      w.days.forEach((m, d) => {
        const fut = w.partial && d >= w.elapsed;
        h += '<i class="' + (fut ? 'fut' : 'l' + heat(m, c.cfg)) + '" title="' + WD[d] + ' ' + U.ddmm(U.addDays(w.start, d)) + (fut ? '' : ' — ' + fm(m)) + '"></i>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }
  function pillarBars(c) {
    return '<div class="czad-pb">' + KEYS.map(k => {
      const v = c.pm[k];
      const t = PIL[k].name + ': ' + (v == null ? 'não se aplica' : pct(v) + '%');
      return '<span class="czad-pbw" title="' + t + '">' + (v == null ? '<i class="na"></i>' : '<i style="height:' + Math.max(8, v * 100) + '%;background:' + pcol(v) + '"></i>') + '<em>' + PIL[k].short + '</em></span>';
    }).join('') + '</div>';
  }

  // ── TURMA ─────────────────────────────────────────────────────────────
  function renderTurma() {
    const items = S.items, ok = items.filter(i => i.c.status === 'ok');
    const avg = ok.length ? Math.round(U.mean(ok.map(i => i.c.index))) : null;
    const baixa = ok.filter(i => i.c.index < 65).length;
    const caindo = ok.filter(i => i.c.trend != null && i.c.trend <= -10).length;
    const conc = ok.filter(i => i.c.tags.some(t => t.t.startsWith('Tudo concentrado'))).length;
    const metaOk = items.filter(i => i.c.weeks[2].goal.atingida).length;       // meta de estudo da semana passada
    const key = i => i.c.status === 'ok' ? i.c.index : null;
    const list = [...items].sort((a, b) => {
      const ka = key(a), kb = key(b);
      if (ka == null && kb == null) return nameOf(a.s).localeCompare(nameOf(b.s), 'pt');
      if (ka == null) return 1; if (kb == null) return -1;
      return S.sort === 'asc' ? ka - kb : S.sort === 'desc' ? kb - ka : nameOf(a.s).localeCompare(nameOf(b.s), 'pt');
    });
    let h = '<div class="czad-stats">'
      + '<div class="czad-stat"><small>Média da turma</small><b>' + (avg == null ? '—' : avg) + '</b><span>de 100</span></div>'
      + '<div class="czad-stat"><small>Adesão baixa</small><b style="color:var(--bad)">' + baixa + '</b><span>abaixo de 65</span></div>'
      + '<div class="czad-stat"><small>Caindo</small><b style="color:var(--warn)">' + caindo + '</b><span>perderam ≥10 pts</span></div>'
      + '<div class="czad-stat"><small>Só num dia</small><b>' + conc + '</b><span>estudam concentrado</span></div>'
      + '<div class="czad-stat"><small>Meta de estudo</small><b style="color:var(--ok)">' + metaOk + '</b><span>de ' + items.length + ' bateram na semana passada</span></div></div>';
    h += '<div class="czad-toolbar"><div class="czad-seg" id="czad-segView"><button data-v="lista" class="' + (S.view === 'lista' ? 'on' : '') + '">Lista</button><button data-v="scatter" class="' + (S.view === 'scatter' ? 'on' : '') + '">Adesão × acertos</button></div>';
    if (S.view === 'lista') h += '<div class="czad-seg" id="czad-segSort"><button data-s="asc" class="' + (S.sort === 'asc' ? 'on' : '') + '">Menor adesão primeiro</button><button data-s="desc" class="' + (S.sort === 'desc' ? 'on' : '') + '">Maior</button><button data-s="nome" class="' + (S.sort === 'nome' ? 'on' : '') + '">Nome</button></div>';
    h += '</div>';
    if (!items.length) return h + '<div class="czad-msg">Nenhum aluno ativo.</div>';
    if (S.view === 'lista') {
      h += '<div class="czad-list"><div class="czad-lhead"><span>Aluno</span><span>Adesão</span><span>Últimas 4 semanas · 1 quadrado = 1 dia</span><span>Pilares</span><span>O que chama atenção</span></div>';
      list.forEach(({ id, s, c }) => {
        const tags = c.status === 'ok' ? c.tags.slice(0, 2) : [{ t: 'Coletando dados', c: 'neutral' }];
        h += '<button type="button" class="czad-row" data-id="' + esc(id) + '">'
          + '<div class="czad-who"><span class="czad-av">' + esc(nameOf(s)[0]) + '</span><div><b>' + esc(nameOf(s)) + '</b><small>' + esc(s.level || '') + '</small></div></div>'
          + '<div class="czad-sc">' + ringFor(c) + trendTxt(c.trend) + '</div>'
          + stripHtml(c) + pillarBars(c)
          + '<div class="czad-why">' + tags.map(t => '<span class="czad-chip ' + t.c + '">' + esc(t.t) + '</span>').join('') + '</div></button>';
      });
      h += '</div>';
      const cfg = S.cfg;
      h += '<div class="czad-legend"><span><i></i> menos de ' + cfg.minDia + ' min (dia não conta)</span><span><i style="background:var(--h1)"></i> leve</span><span><i style="background:var(--h2)"></i> médio</span><span><i style="background:var(--h3)"></i> forte</span><span><i style="background:var(--h4)"></i> muito forte</span><span style="margin-left:auto">Pilares: Co constância · At atividades · Pó pós-aula · Au aulas · De desafio</span></div>';
    } else h += scatterHtml();
    const cfg = S.cfg;
    h += '<details class="czad-how"><summary>Como o número é calculado</summary><ul>'
      + '<li>A adesão de cada semana (seg–dom) é a média ponderada de 5 pilares. A semana em andamento não entra na nota.</li>'
      + '<li><b>Pesos agora:</b> ' + KEYS.map(k => PIL[k].name + ' ' + cfg.w[k]).join(' · ') + '. Pilar que não se aplica (ex.: aluno sem aulas) sai da conta e os pesos se redistribuem.</li>'
      + '<li><b>Pós-aula:</b> soma o tempo de todas as aberturas. Meta: ' + cfg.minPos + ' min por pós-aula. Abrir e fechar não conta.</li>'
      + '<li><b>Atividades:</b> % de exercícios feitos × fator de tempo (tempo real ÷ ' + cfg.secEx + ' s por exercício feito, no máximo 1). Responder rápido demais vale menos.</li>'
      + '<li><b>Constância:</b> dias com pelo menos ' + cfg.minDia + ' min ativos ÷ meta de ' + cfg.metaDias + ' dias.</li>'
      + '<li><b>Meta de estudo:</b> ' + num1(cfg.metaDiaMin) + ' min de estudo por dia, em ' + cfg.metaDiasEstudo + ' dias por semana. O aluno vê a meta de hoje na tela Início e o estudo da semana em Progresso, com o que compôs o tempo (ler pós-aula, chunks e verbos, exercícios). Início, perfil e avisos não contam como estudo.</li>'
      + '<li><b>Como o tempo é medido:</b> o intervalo entre dois movimentos do aluno (toque, clique, rolagem, digitar ou apagar) só conta se tiver até ' + cfg.limiteSeg + ' s. Se ele voltar a mexer dentro desse tempo, o intervalo inteiro entra; se não voltar, o intervalo todo é descartado, então app esquecido aberto não conta. Gravar a fala e ouvir áudio contam o tempo todo. Aba oculta nunca conta.</li>'
      + '<li>O número do aluno é a média das últimas 3 semanas fechadas, com mais peso para a mais recente (1·2·3). Faixas: Alta ≥ 85 · Média 65–84 · Baixa &lt; 65.</li>'
      + '<li>Semanas anteriores à coleta (' + (S.coleta ? 'desde ' + brDate(S.coleta) : 'ainda não começou') + ') não têm tempo nem dias medidos: nelas só entram aulas, atividades e desafio.</li>'
      + '<li>O aluno vê estes mesmos critérios na tela dele (aba “Aluno” → “O que o aluno vê”).</li></ul></details>';
    return h;
  }
  function scatterHtml() {
    const pts = S.items.filter(i => i.c.status === 'ok' && i.c.accLast != null).map(i => ({ id: i.id, n: firstOf(i.s), x: i.c.index, y: i.c.accLast, b: i.c.band }));
    if (pts.length < 3) return '<div class="czad-msg">Precisa de pelo menos 3 alunos com nota de adesão e atividades corrigidas para desenhar este gráfico.</div>';
    const W = 640, H = 380, L = 48, R = 18, T = 16, B = 46, pw = W - L - R, ph = H - T - B;
    const X = v => L + v / 100 * pw, Y = v => T + (100 - v) / 60 * ph;
    const yMin = 40;
    const mx = U.mean(pts.map(p => p.x)), my = U.mean(pts.map(p => p.y));
    const sxy = U.sum(pts.map(p => (p.x - mx) * (p.y - my))), sxx = U.sum(pts.map(p => (p.x - mx) ** 2)), syy = U.sum(pts.map(p => (p.y - my) ** 2));
    const slope = sxx ? sxy / sxx : 0, icpt = my - slope * mx, r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0;
    let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Dispersão: adesão no eixo X e acertos no eixo Y">';
    s += '<rect x="' + X(0) + '" y="' + T + '" width="' + (X(65) - X(0)) + '" height="' + ph + '" fill="#fdecec" opacity=".55"/><rect x="' + X(65) + '" y="' + T + '" width="' + (X(85) - X(65)) + '" height="' + ph + '" fill="#fff7e6" opacity=".7"/><rect x="' + X(85) + '" y="' + T + '" width="' + (X(100) - X(85)) + '" height="' + ph + '" fill="#e8f7f0" opacity=".7"/>';
    [40, 55, 70, 85, 100].forEach(v => { s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="#e2e8f0"/><text x="' + (L - 8) + '" y="' + Y(v) + '" text-anchor="end" dominant-baseline="central" font-size="11" fill="#6b7280">' + v + '%</text>'; });
    [0, 25, 50, 75, 100].forEach(v => { s += '<text x="' + X(v) + '" y="' + (H - B + 18) + '" text-anchor="middle" font-size="11" fill="#6b7280">' + v + '</text>'; });
    s += '<text x="' + (L + pw / 2) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">Adesão (0–100)</text>';
    s += '<text transform="translate(13 ' + (T + ph / 2) + ') rotate(-90)" text-anchor="middle" font-size="12" font-weight="700" fill="#334155">Acertos nas atividades corrigidas</text>';
    const clampY = v => Math.max(yMin, Math.min(100, v));
    s += '<line x1="' + X(0) + '" y1="' + Y(clampY(icpt)) + '" x2="' + X(100) + '" y2="' + Y(clampY(icpt + slope * 100)) + '" stroke="#1f6fd1" stroke-width="2" stroke-dasharray="6 5" opacity=".7"/>';
    pts.forEach(p => {
      const right = p.x <= 80;
      s += '<g style="cursor:pointer" data-id="' + esc(p.id) + '"><circle cx="' + X(p.x) + '" cy="' + Y(clampY(p.y)) + '" r="8" fill="' + p.b.color + '" stroke="#fff" stroke-width="2"/><text x="' + (X(p.x) + (right ? 12 : -12)) + '" y="' + (Y(clampY(p.y)) - 9) + '" text-anchor="' + (right ? 'start' : 'end') + '" font-size="11.5" font-weight="700" fill="#0f1724">' + esc(p.n) + '</text></g>';
    });
    s += '</svg>';
    return '<div class="czad-chartbox">' + s + '</div><p class="czad-small czad-muted" style="margin-top:10px">Correlação r = ' + num1(r) + ' com ' + pts.length + ' alunos. Com poucos alunos e poucas semanas isso é indício, não prova. O aluno vê só a média por faixa, sem nomes, e apenas quando a ordem fecha (alta &gt; média &gt; baixa, com 2 ou mais alunos em cada faixa).</p>';
  }

  // ── ALUNO ─────────────────────────────────────────────────────────────
  function renderAluno() {
    const it = S.items.find(i => i.id === S.sel);
    if (!it) return '<div class="czad-msg">Escolha um aluno na lista da turma.</div>';
    let h = '<div class="czad-toolbar" style="margin-top:0"><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="czad-btn" id="czad-back">← Turma</button>'
      + '<select id="czad-sel" class="czad-btn" aria-label="Aluno">' + S.items.map(i => '<option value="' + esc(i.id) + '"' + (i.id === S.sel ? ' selected' : '') + '>' + esc(nameOf(i.s)) + '</option>').join('') + '</select></div>'
      + '<div class="czad-seg" id="czad-subSeg"><button data-sub="prof" class="' + (S.sub === 'prof' ? 'on' : '') + '">Visão do professor</button><button data-sub="aluno" class="' + (S.sub === 'aluno' ? 'on' : '') + '">👁 O que o aluno vê</button></div></div>';
    h += S.sub === 'prof' ? profHtml(it) : studentView(it);
    return h;
  }
  // Meta de estudo de cada semana: dias que bateram a meta diária, minutos e tipos feitos
  // (ler pós-aula · chunks/verbos/vocabulário · exercício).
  function metaCardHtml(c) {
    const rows = c.weeks.map(w => {
      const g = w.goal;
      const tipos = A.STUDY_TYPES.map(t => '<span class="czad-chip ' + (g.tipos[t.k] ? 'ok' : 'neutral') + '" title="' + esc(t.name + ' (' + t.inclui + ')') + '">' + t.ic + ' ' + (g.tipos[t.k] ? '✓' : '—') + '</span>').join(' ');
      return '<div class="czad-mrow"><span class="lab">' + w.label + (w.partial ? ' <em>em andamento</em>' : '') + '</span>'
        + '<span><b>' + esc(A.goalDaysTxt(g)) + '</b></span><span>' + Math.round(g.minutos) + ' de ' + num1(g.metaSemanaMin) + ' min</span>'
        + '<span>' + tipos + '</span><span>' + (g.atingida ? '<span class="czad-chip ok">meta batida</span>' : w.partial ? '' : '<span class="czad-chip warn">não bateu</span>') + '</span></div>';
    }).join('');
    return '<div class="czad-card czad-sec"><h3>🎯 Meta de estudo (' + num1(c.cfg.metaDiaMin) + ' min por dia, ' + c.cfg.metaDiasEstudo + ' dias por semana)</h3>'
      + '<div class="sub">Só conta tempo de estudo: pós-aula, atividades, desafio, vocabulário, verbos e chunks. Os ícones mostram os tipos feitos na semana (pós-aula · chunks e verbos · exercícios).</div><div style="margin-top:8px">' + rows + '</div></div>';
  }
  function profHtml({ s, c }) {
    const ok = c.status === 'ok', cfg = c.cfg;
    const recadoSalvo = s.adesaoRecado && s.adesaoRecado.texto;
    let h = '<div class="czad-card"><div class="czad-dtop"><div>' + (ok ? A.ring(c.index, 112, 12, c.band.color) : '<span class="czad-chip neutral">Sem nota ainda</span>') + '</div><div>'
      + '<h2>' + esc(nameOf(s)) + '</h2><div class="meta">' + esc(s.level || '') + '</div>';
    if (ok) {
      h += '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap"><span class="czad-chip ' + bandChip(c) + '">Adesão ' + c.band.label.toLowerCase() + '</span>'
        + (c.trend == null ? '' : c.trend >= 3 ? '<span class="czad-chip ok">▲ +' + c.trend + ' vs semana anterior</span>' : c.trend <= -3 ? '<span class="czad-chip bad">▼ ' + c.trend + ' vs semana anterior</span>' : '<span class="czad-chip neutral">estável</span>') + '</div>'
        + '<div class="czad-small czad-muted" style="margin-top:8px">Média das últimas ' + c.used.length + ' semana' + (c.used.length > 1 ? 's' : '') + ' fechada' + (c.used.length > 1 ? 's' : '') + '; a mais recente pesa mais.</div>';
    } else {
      h += '<div class="czad-small czad-muted" style="margin-top:8px">Ainda não há uma semana completa (seg–dom) com dados desde o início da coleta' + (S.coleta ? ' (' + brDate(S.coleta) + ')' : '') + '. A nota aparece sozinha na primeira segunda-feira depois disso.</div>';
    }
    h += '<button type="button" class="czad-btn pri" id="czad-viewAs" style="margin-top:10px">👁 Ver o que ' + esc(firstOf(s)) + ' vê</button></div>';
    if (ok) {
      h += '<div><div class="czad-small czad-muted" style="margin-bottom:6px;font-weight:700">Adesão por semana</div><div class="czad-evo">'
        + c.used.map(w => '<div><b>' + w.total + '</b><i style="height:' + Math.max(4, w.total * .78) + 'px;background:' + A.band(w.total).color + '"></i><span>' + w.short + '</span></div>').join('')
        + '<div><b style="color:var(--muted)">…</b><i class="part" style="height:' + Math.max(4, c.cur.activeDays / cfg.metaDias * 60) + 'px"></i><span>agora</span></div></div></div>';
    }
    h += '</div></div>';
    if (ok) h += '<div class="czad-card czad-sec"><h3>O que chama atenção</h3><div class="sub">Frases geradas a partir dos números, para a conversa com o aluno. Só você vê esta versão técnica.</div><div class="czad-diag">'
      + c.diag.map(d => '<div><span>' + d.ic + '</span><span>' + esc(d.txt) + '</span></div>').join('') + '</div></div>';
    h += '<div class="czad-card czad-sec czad-cm"><h3>💬 Recado para ' + esc(firstOf(s)) + '</h3><div class="sub">É o que o aluno lê na tela dele. A sugestão começa pelo que está bom, dá um foco e um passo pequeno. Edite como quiser; salva ao sair do campo.</div>'
      + '<textarea id="czad-cm" rows="4" maxlength="600" aria-label="Recado para o aluno">' + esc(recadoSalvo || A.suggestComment(c, firstOf(s))) + '</textarea>'
      + '<div class="bar"><span class="czad-small czad-muted" id="czad-cm-state">' + (recadoSalvo ? 'Salvo — o aluno já vê este texto' : 'Sugestão automática (o aluno vê esta sugestão até você salvar outro texto)') + '</span><button type="button" class="czad-btn" id="czad-cm-reset">Restaurar sugestão</button></div></div>';
    h += metaCardHtml(c);
    h += '<div class="czad-card czad-sec"><h3>Mapa de constância</h3><div class="sub">Cada quadrado é um dia. A cor mostra os minutos de estudo (pós-aula, atividades, desafio, vocabulário, verbos e chunks); início, perfil e avisos não contam. Toque num dia para ver o detalhe.</div><div class="czad-hm">'
      + '<div class="czad-hm-row hd"><span></span>' + WD.map(d => '<span>' + d + '</span>').join('') + '<span class="sum">Semana</span></div>';
    c.weeks.forEach((w, wi) => {
      h += '<div class="czad-hm-row"><span class="lab">' + w.short + (w.partial ? '<br><span style="font-weight:600;color:var(--muted)">em andamento</span>' : '') + '</span>';
      w.days.forEach((m, d) => {
        const fut = w.partial && d >= w.elapsed;
        h += '<button type="button" class="czad-cell ' + (fut ? 'fut' : 'l' + heat(m, cfg)) + (!fut && m > 0 && m < cfg.minDia ? ' low' : '') + '" data-w="' + wi + '" data-d="' + d + '" ' + (fut ? 'disabled' : '') + '>' + (fut ? '' : m >= 1 ? Math.round(m) : m > 0 ? '<1' : '') + '</button>';
      });
      h += '<span class="sum"><b>' + w.activeDays + (w.partial ? ' de ' + w.elapsed : ' de ' + cfg.metaDias) + ' dias</b>' + (w.partial ? 'sem nota ainda' : (w.valid && w.total != null ? 'nota ' + w.total : 'sem nota')) + '</span></div>';
    });
    h += '</div><div class="czad-dayinfo" id="czad-dayinfo">Toque num quadrado para ver onde o aluno gastou o tempo naquele dia.</div></div>';
    if (ok) {
      const sw = Math.min(S.selWeek, c.used.length - 1);
      const wc = c.used[sw];
      h += '<div class="czad-card czad-sec"><div class="czad-ph"><div><h3>Os 5 pilares</h3><div class="sub">Detalhe de uma semana fechada.</div></div><div class="czad-pills" id="czad-wk">'
        + c.used.map((w, i) => '<button type="button" data-w="' + i + '" class="' + (sw === i ? 'on' : '') + '">' + w.label + '</button>').join('') + '</div></div><div class="czad-pgrid">'
        + pillarCards(wc, cfg) + '</div></div>';
      h += '<div class="czad-card czad-sec"><h3>Adesão e acertos, semana a semana</h3><div class="sub">É o mesmo gráfico que o aluno vê na tela dele.</div><div style="max-width:520px;margin-top:8px">' + A.lineChartHtml(c) + '</div></div>';
    }
    return h;
  }
  function pillarCards(w, cfg) {
    const p = w.parts, present = {};
    KEYS.forEach(k => { present[k] = p[k] != null; });
    const head = (k, val, big) => '<div class="czad-ph"><b>' + PIL[k].ic + ' ' + PIL[k].name + '</b><span class="czad-chip neutral">peso ' + A.effWeight(present, k, cfg) + '%</span></div>'
      + (val == null ? '' : '<div class="czad-big" style="color:' + pcol(val) + '">' + big + '</div><div class="czad-meter"><i style="width:' + Math.round(val * 100) + '%;background:' + pcol(val) + '"></i></div>');
    const na = (k, msg) => '<div class="czad-pcard"><div class="czad-ph"><b>' + PIL[k].ic + ' ' + PIL[k].name + '</b><span class="czad-chip neutral">não conta</span></div><div class="czad-na">' + msg + '</div></div>';
    let h = '';
    if (p.C == null) h += na('C', 'Semana anterior à coleta: ainda não havia medição de dias e tempo.');
    else h += '<div class="czad-pcard">' + head('C', p.C, pct(p.C) + '%') + '<div class="czad-small">' + w.activeDays + ' dias ativos (meta: ' + cfg.metaDias + ') · ' + fm(w.weekMin) + ' no total</div>'
      + '<div class="czad-wdays">' + w.days.map((m, d) => '<div><i class="' + (m >= cfg.minDia ? 'on' : '') + '"></i>' + WD[d] + '</div>').join('') + '</div></div>';
    if (p.At == null) h += '<div class="czad-pcard"><div class="czad-ph"><b>' + PIL.At.ic + ' Atividades</b></div><div class="czad-na">Sem atividades enviadas nesta semana.</div></div>';
    else h += '<div class="czad-pcard">' + head('At', p.At, pct(p.At) + '%') + '<div class="czad-items">' + w.atItems.map(i => {
      const lento = w.hasTime && i.done && i.fator < .8;
      return '<div class="czad-it"><div class="nm"><span>' + esc(i.name) + '</span><span>' + i.done + '/' + i.n + ' exercícios</span></div><div class="bar"><i style="width:' + Math.round(i.entrega * 100) + '%;background:' + pcol(i.entrega) + '"></i></div>'
        + (w.hasTime ? '<div>Tempo: ' + fm(i.time) + ' · esperado ≥ ' + fm(i.exp) + (lento ? ' <span class="czad-chip warn">rápido demais</span>' : i.done ? ' <span class="czad-chip ok">ok</span>' : '') + '</div>' : '<div>Sem medição de tempo (antes da coleta)</div>') + '</div>';
    }).join('') + '</div></div>';
    if (p.Pos == null) h += na('Pos', w.hasTime ? 'Sem pós-aula nesta semana (sem aula, ou aula ainda sem pós-aula).' : 'Semana anterior à coleta: não dá para medir leitura.');
    else h += '<div class="czad-pcard">' + head('Pos', p.Pos, pct(p.Pos) + '%') + '<div class="czad-items">' + w.posItems.map(i => {
      const sc = Math.max(cfg.minPos * 1.6, i.minutes);
      return '<div class="czad-it"><div class="nm"><span>' + esc(i.name) + '</span><span>' + fm(i.minutes) + ' de ' + cfg.minPos + ' min</span></div>'
        + '<div class="bar"><i style="width:' + Math.min(100, i.minutes / sc * 100) + '%;background:' + pcol(i.score) + '"></i><u style="left:' + (cfg.minPos / sc * 100) + '%"></u></div>'
        + '<div>' + (i.opens ? i.opens + ' abertura' + (i.opens > 1 ? 's' : '') + ' somadas' : 'nunca aberto') + (i.score >= 1 ? ' <span class="czad-chip ok">meta batida</span>' : '') + '</div></div>';
    }).join('') + '</div></div>';
    if (p.Aula == null) h += na('Aula', 'Sem aulas previstas: o pilar sai da conta e os outros ganham peso.');
    else h += '<div class="czad-pcard">' + head('Aula', p.Aula, w.aulas[1] + ' de ' + w.aulas[0]) + '<div class="czad-small czad-muted">aulas realizadas ÷ previstas</div></div>';
    if (p.Des == null) h += na('Des', 'Sem desafio publicado para este aluno nesta semana.');
    else h += '<div class="czad-pcard">' + head('Des', p.Des, w.des[1] + ' de ' + w.des[0]) + '<div class="czad-small czad-muted">partes do desafio concluídas</div></div>';
    return h;
  }
  function dayInfo(wi, d) {
    const it = S.items.find(i => i.id === S.sel), w = it.c.weeks[wi], m = w.days[d];
    const el = document.getElementById('czad-dayinfo');
    if (!el) return;
    el.innerHTML = A.sDayText(it.c, wi, d);        // o mesmo texto que o aluno vê: estudo por tipo + outras telas
  }

  function studentView(it) {
    const { s, c } = it;
    const lib = S.adesao.liberadaEm;
    const liberado = lib && lib <= todayKey();
    const ribbon = liberado ? 'Visível para o aluno' : lib ? 'Prévia: o aluno só verá a partir de ' + brDate(lib) : 'Prévia: ainda não liberado para os alunos';
    // As três telas que o aluno recebe: meta de hoje (Início), Meu estudo e Minha adesão (Progresso).
    const html = '<div class="czad-ptag">Na tela Início</div>' + A.goalTodayHtml(c, { firstName: firstOf(s) })
      + '<div class="czad-ptag">Em Progresso › Meu estudo</div>' + A.goalWeekHtml(c)
      + '<div class="czad-ptag">Em Progresso › Minha adesão</div>'
      + A.studentHtml(c, { firstName: firstOf(s), recado: s.adesaoRecado && s.adesaoRecado.texto, ribbon, ribbonOpen: liberado, stats: S.stats });
    return '<div class="czad-prevgrid"><div class="czad-notes">'
      + '<div><b>👁 O que o aluno vê</b><ul><li><b style="display:inline">Meta de hoje</b> na tela Início e <b style="display:inline">Meu estudo</b> em Progresso (minutos por tipo, dias com meta, o que conta como estudo)</li><li><b style="display:inline">Minha adesão</b>: primeiro só o cartão da nota; ao tocar nele abre tudo o que está abaixo</li><li>A própria nota (0–100) e a faixa</li><li>O mapa segunda a domingo, com os próprios minutos</li><li>O que conta: os 5 pontos, o peso de cada um e a meta</li><li>O que melhorou e o que caiu desde a semana passada</li><li>O recado do professor (você edita na visão do professor)</li><li>Adesão × acertos dele e a média por faixa, sem nomes</li></ul></div>'
      + '<div><b>🔒 Só você vê</b><ul><li>A lista da turma e a comparação entre alunos</li><li>As etiquetas internas (“Quase não abre o app”…): o aluno vê versões em tom de incentivo</li><li>O gráfico Adesão × acertos da turma, com nomes</li><li>Os controles de metas e pesos</li></ul></div>'
      + '<div><b>⏳ Quando aparece</b>' + (liberado ? 'Já está liberado: o aluno vê esta tela em “Meu progresso”.' : lib ? 'Libera para os alunos em ' + brDate(lib) + '. Até lá você vê aqui e no modo espelho.' : 'Ainda não liberado. Defina a data no topo da página.') + '</div>'
      + '<div><button type="button" class="czad-btn" id="czad-mirror" data-uid="' + esc(it.id) + '">Abrir no app como o aluno (modo espelho)</button></div></div>'
      + '<div class="czad-phone"><div class="czad-scroll" id="czad-phone-scroll">' + html + '</div></div></div>';
  }

  // ── cabeçalho: coleta e liberação ─────────────────────────────────────
  function lockHtml() {
    const lib = S.adesao.liberadaEm, hoje = todayKey();
    const liberado = lib && lib <= hoje;
    const dis = S.saving === 'rel' ? ' disabled' : '';
    if (!S.hasUsage) {
      return '<div class="czad-lock"><div>🔒 <b>A coleta ainda não começou.</b> Ela começa sozinha quando o primeiro aluno abrir a versão nova do app. Enquanto isso, aulas, atividades e desafio já entram na conta.</div></div>';
    }
    if (liberado) {
      return '<div class="czad-lock open"><div>✅ <b>Liberado para os alunos</b> desde ' + brDate(lib) + '. Cada aluno vê só a própria adesão, em “Meu progresso”.</div><div class="czad-lockbtns"><button type="button" class="czad-btn" id="czad-unrelease"' + dis + '>Ocultar dos alunos</button></div></div>';
    }
    // Sugestão: 15 dias de coleta; se isso já passou, a própria data de hoje.
    const sug15 = S.coleta ? U.dayKey(U.addDays(U.toDate(S.coleta), 15)) : '';
    const sugestao = sug15 && sug15 >= hoje ? sug15 : hoje;
    return '<div class="czad-lock"><div>🔒 <b>Modo coleta: por enquanto só você vê.</b> Coletando desde <b>' + brDate(S.coleta) + '</b>. '
      + (lib ? 'Os alunos passam a ver em <b>' + brDate(lib) + '</b>.' : 'Defina quando os alunos passam a ver' + (sug15 && sug15 >= hoje ? ' (sugestão: 15 dias de coleta, ' + brDate(sug15) + ')' : '') + '.') + '</div>'
      + '<div class="czad-lockbtns"><label class="czad-small">Liberar em <input type="date" id="czad-reldate" value="' + esc(lib || sugestao) + '" min="' + hoje + '"></label>'
      + '<button type="button" class="czad-btn" id="czad-setrelease"' + dis + '>' + (lib ? 'Alterar data' : 'Agendar') + '</button>'
      + '<button type="button" class="czad-btn pri" id="czad-releasenow"' + dis + '>Liberar agora</button></div></div>';
  }

  // ── metas e pesos ─────────────────────────────────────────────────────
  function drawerHtml() {
    const cfg = S.cfg;
    const ctl = (id, label, min, max, unit, hint) => '<div class="czad-ctl"><div class="t"><label for="czad-c-' + id + '">' + label + '</label><span id="czad-v-' + id + '">' + cfg[id] + unit + '</span></div>' + (hint ? '<small>' + hint + '</small>' : '')
      + '<input type="range" id="czad-c-' + id + '" data-cfg="' + id + '" min="' + min + '" max="' + max + '" value="' + cfg[id] + '"></div>';
    return '<header><b>Metas e pesos</b><button type="button" class="czad-btn" id="czad-cfg-close">Fechar</button></header><div class="body">'
      + '<h5>Metas</h5>'
      + ctl('minPos', 'Minutos mínimos por pós-aula', 1, 15, ' min', 'Soma de todas as vezes que o aluno abriu.')
      + ctl('secEx', 'Tempo esperado por exercício', 5, 60, ' s', 'Abaixo disso, a atividade conta menos.')
      + ctl('metaDias', 'Meta de dias ativos por semana', 1, 7, ' dias', '')
      + ctl('minDia', 'Minutos para o dia contar como ativo', 1, 15, ' min', 'Abrir o app 10 segundos não conta.')
      + ctl('limiteSeg', 'Maior pausa que ainda conta como estudo', 20, 180, ' s', 'Entre dois movimentos do aluno (toque, rolagem, digitar). Se ele voltar a mexer dentro deste tempo, a pausa inteira conta; se passar, é descartada. Vale para a coleta daqui para frente.')
      + '<h5>Meta de estudo do aluno</h5>'
      + ctl('metaDiaMin', 'Meta de estudo por dia', 1, 60, ' min', 'Tempo de estudo (pós-aula, atividades, desafio, vocabulário, verbos e chunks) que o aluno tenta bater todo dia.')
      + ctl('metaDiasEstudo', 'Dias de meta por semana', 1, 7, ' dias', 'Em quantos dias da semana ele precisa bater a meta diária.')
      + ctl('minTipo', 'Mínimo para um tipo contar como feito', 1, 10, ' min', 'Ler pós-aula, chunks/verbos e exercícios aparecem como “feito” com este tempo no dia.')
      + '<h5>Pesos dos pilares</h5>'
      + KEYS.map(k => '<div class="czad-ctl"><div class="t"><label for="czad-w-' + k + '">' + PIL[k].ic + ' ' + PIL[k].name + '</label><span id="czad-vw-' + k + '">' + cfg.w[k] + '</span></div><small>' + PIL[k].desc + '</small><input type="range" id="czad-w-' + k + '" data-w="' + k + '" min="0" max="50" value="' + cfg.w[k] + '"></div>').join('')
      + '<p class="czad-small czad-muted">Só importa a proporção entre os pesos. A tela recalcula na hora. <b>Salvar</b> grava para a escola toda, e o aluno passa a ver o cálculo com estas metas.</p></div>'
      + '<footer><button type="button" class="czad-btn" id="czad-cfg-reset">Restaurar padrão</button><button type="button" class="czad-btn pri" id="czad-cfg-save"' + (S.saving === 'cfg' ? ' disabled' : '') + '>' + (S.dirty ? 'Salvar metas' : 'Salvo') + '</button></footer>';
  }

  // ── montagem ──────────────────────────────────────────────────────────
  function render() {
    const el = root();
    if (!el) return;
    if (S.error) { el.innerHTML = '<div class="czad-msg">' + esc(S.error) + '<br><button type="button" class="czad-btn" id="czad-retry" style="margin-top:12px">Tentar de novo</button></div>'; return; }
    if (!S.loaded) return;
    const keepScroll = document.getElementById('czad-phone-scroll');
    const phoneTop = keepScroll ? keepScroll.scrollTop : 0;
    let h = '<div class="czad-head"><div><h2>Adesão</h2><p>Quanto cada aluno está envolvido no curso: aulas, pós-aula, atividades, desafio, e <b>com que constância</b> e <b>por quanto tempo</b> estuda. O aluno vê a própria versão, com o que conta e onde melhorar.</p></div>'
      + '<div class="czad-lockbtns"><button type="button" class="czad-btn" id="czad-refresh">↻ Atualizar</button><button type="button" class="czad-btn" id="czad-cfg-open">⚙ Metas e pesos' + (S.dirty ? ' •' : '') + '</button></div></div>';
    h += lockHtml();
    if (S.dirty) h += '<div class="czad-lock" style="margin-top:10px"><div>Você mudou as metas e ainda não salvou. Os alunos continuam vendo o cálculo anterior.</div><div class="czad-lockbtns"><button type="button" class="czad-btn pri" id="czad-cfg-save2">Salvar metas</button></div></div>';
    h += '<nav class="czad-tabs" id="czad-tabs"><button type="button" data-tab="turma" class="' + (S.tab === 'turma' ? 'on' : '') + '">Turma</button><button type="button" data-tab="aluno" class="' + (S.tab === 'aluno' ? 'on' : '') + '">Aluno</button></nav>';
    h += '<section class="czad-sec">' + (S.tab === 'turma' ? renderTurma() : renderAluno()) + '</section>';
    h += '<div class="czad-shade' + (S.drawer ? ' on' : '') + '" id="czad-shade"></div><aside class="czad-drawer' + (S.drawer ? ' on' : '') + '" id="czad-drawer" aria-label="Metas e pesos">' + drawerHtml() + '</aside>';
    el.innerHTML = h;
    const ps = document.getElementById('czad-phone-scroll');
    if (ps && phoneTop) ps.scrollTop = phoneTop;
  }

  // ── eventos ───────────────────────────────────────────────────────────
  function bind() {
    const el = root();
    if (!el || el.dataset.bound) return;
    el.dataset.bound = '1';
    el.addEventListener('click', e => {
      const t = e.target;
      const row = t.closest('.czad-row'); if (row) { S.sel = row.dataset.id; S.tab = 'aluno'; S.sub = 'prof'; render(); window.scrollTo(0, 0); return; }
      const g = t.closest('svg g[data-id]'); if (g) { S.sel = g.dataset.id; S.tab = 'aluno'; S.sub = 'prof'; render(); window.scrollTo(0, 0); return; }
      const tb = t.closest('#czad-tabs button'); if (tb) { S.tab = tb.dataset.tab; render(); return; }
      const sv = t.closest('#czad-segView button'); if (sv) { S.view = sv.dataset.v; render(); return; }
      const ss = t.closest('#czad-segSort button'); if (ss) { S.sort = ss.dataset.s; render(); return; }
      const sub = t.closest('#czad-subSeg button'); if (sub) { S.sub = sub.dataset.sub; render(); return; }
      if (t.closest('#czad-viewAs')) { S.sub = 'aluno'; render(); window.scrollTo(0, 0); return; }
      if (t.closest('#czad-back')) { S.tab = 'turma'; render(); return; }
      const wk = t.closest('#czad-wk button'); if (wk) { S.selWeek = +wk.dataset.w; render(); return; }
      const cell = t.closest('.czad-cell'); if (cell && !cell.disabled) { el.querySelectorAll('.czad-cell.sel').forEach(x => x.classList.remove('sel')); cell.classList.add('sel'); dayInfo(+cell.dataset.w, +cell.dataset.d); return; }
      const gtg = t.closest('[data-cza-gtoggle]'); if (gtg) { A.toggleGoalInfo(gtg); return; }
      const gd = t.closest('[data-cza-gday]'); if (gd) {
        const it = S.items.find(i => i.id === S.sel), box = document.getElementById('cza-gdayinfo');
        if (it && box) box.innerHTML = A.sDayText(it.c, 3, +gd.dataset.czaGday);
        return;
      }
      if (t.closest('[data-cza-go]')) return;      // na prévia os atalhos do Início não navegam
      const tg = t.closest('[data-cza-toggle]'); if (tg) { A.toggleDetails(tg.closest('.cza'), tg); return; }
      const sc = t.closest('.cza-cell'); if (sc && !sc.disabled) {
        el.querySelectorAll('.cza-cell.sel').forEach(x => x.classList.remove('sel')); sc.classList.add('sel');
        const it = S.items.find(i => i.id === S.sel), box = document.getElementById('cza-dayinfo');
        if (it && box) box.innerHTML = A.sDayText(it.c, +sc.dataset.czaW, +sc.dataset.czaD);
        return;
      }
      if (t.closest('#czad-cm-reset')) { saveRecado(S.sel, null).then(render); return; }
      if (t.closest('#czad-mirror')) { ctx.abrirEspelho(t.closest('#czad-mirror').dataset.uid); return; }
      if (t.closest('#czad-refresh')) { S.loaded = false; load(true); return; }
      if (t.closest('#czad-retry')) { load(true); return; }
      if (t.closest('#czad-cfg-open')) { S.drawer = true; render(); return; }
      if (t.closest('#czad-cfg-close') || t.id === 'czad-shade') { S.drawer = false; render(); return; }
      if (t.closest('#czad-cfg-reset')) { S.cfg = A.cfgOf({ coletaDesde: S.coleta || null }); S.dirty = true; recompute(); render(); return; }
      if (t.closest('#czad-cfg-save') || t.closest('#czad-cfg-save2')) { saveCfg(); return; }
      if (t.closest('#czad-releasenow')) { saveRelease(todayKey()); return; }
      if (t.closest('#czad-setrelease')) { const v = (document.getElementById('czad-reldate') || {}).value; if (v) saveRelease(v); return; }
      if (t.closest('#czad-unrelease')) { saveRelease(null); return; }
    });
    el.addEventListener('keydown', e => {
      const tg = e.target.closest && e.target.closest('[data-cza-toggle]');
      if (tg && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); A.toggleDetails(tg.closest('.cza'), tg); }
    });
    el.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.cfg) {
        S.cfg = A.cfgOf({ ...S.cfg, [t.dataset.cfg]: +t.value, coletaDesde: S.coleta || null });
        S.dirty = true; recompute();
        const u = { minPos: ' min', secEx: ' s', metaDias: ' dias', minDia: ' min', limiteSeg: ' s', metaDiaMin: ' min', metaDiasEstudo: ' dias', minTipo: ' min' }[t.dataset.cfg];
        const lab = document.getElementById('czad-v-' + t.dataset.cfg); if (lab) lab.textContent = S.cfg[t.dataset.cfg] + u;
        renderBehindDrawer(); return;
      }
      if (t.dataset.w) {
        S.cfg = A.cfgOf({ ...S.cfg, w: { ...S.cfg.w, [t.dataset.w]: +t.value }, coletaDesde: S.coleta || null });
        S.dirty = true; recompute();
        const lab = document.getElementById('czad-vw-' + t.dataset.w); if (lab) lab.textContent = S.cfg.w[t.dataset.w];
        renderBehindDrawer();
      }
    });
    el.addEventListener('change', e => {
      const t = e.target;
      if (t.id === 'czad-sel') { S.sel = t.value; render(); return; }
      if (t.id === 'czad-cm') saveRecado(S.sel, t.value.trim() ? t.value.trim().slice(0, 600) : null);
    });
  }
  // Recalcula a tela atrás da gaveta sem recriá-la (senão o controle perde o foco no meio do arrasto).
  function renderBehindDrawer() {
    const el = root();
    const sec = el.querySelector('.czad-sec');
    if (!sec) return;
    sec.innerHTML = S.tab === 'turma' ? renderTurma() : renderAluno();
    const btn = document.getElementById('czad-cfg-save'); if (btn) btn.textContent = 'Salvar metas';
  }

  return {
    load: () => { bind(); return load(false); },
    reload: () => { S.loaded = false; return load(true); },
  };
}
