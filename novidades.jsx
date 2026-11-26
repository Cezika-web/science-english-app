/* ───────── Novidades do app: apresentações em passos, com Próximo, Voltar e Pular ─────────
 * NovidadePassos        o cartão genérico (várias telas, bolinhas, Próximo / Voltar / Pular)
 * NovidadeEurekIA       a apresentação da EurekIA (assistente de dúvidas de inglês)
 * NovidadeAdesao        a apresentação da Adesão, com os números do próprio aluno
 * Quem mostra e quando é o index.html (uma vez por aluno; ?intro=eurekia ou ?intro=adesao mostra de novo, só para ver).
 * Tudo aqui usa nomes que começam com Novidade/NOV_ (os scripts .jsx dividem o mesmo escopo global).
 */
const NOV_CSS = `
@keyframes novSobe { from { opacity:0; transform: translateY(16px) scale(.97); } to { opacity:1; transform:none; } }
@keyframes novTroca { from { opacity:0; transform: translateX(14px); } to { opacity:1; transform:none; } }
.nov-fundo { position:fixed; inset:0; z-index:10060; background:rgba(15,23,42,.64); display:flex; align-items:center; justify-content:center; padding:14px; }
.nov-card { width:100%; max-width:410px; max-height:100%; overflow:hidden; background:#fff; border-radius:26px; box-shadow:0 24px 60px rgba(0,0,0,.4); animation:novSobe .3s; display:flex; flex-direction:column; font-family:inherit; }
.nov-topo { position:relative; flex-shrink:0; padding:26px 20px 20px; display:flex; align-items:center; justify-content:center; min-height:128px; color:#fff; }
.nov-topo .nov-ilu { font-size:62px; line-height:1; }
.nov-pular { position:absolute; top:12px; right:12px; border:0; background:rgba(255,255,255,.2); color:#fff; font-weight:800; font-size:12.5px; font-family:inherit; padding:7px 13px; border-radius:99px; cursor:pointer; }
.nov-pular:hover { background:rgba(255,255,255,.32); }
.nov-corpo { flex:1; min-height:0; overflow-y:auto; padding:18px 20px 6px; animation:novTroca .22s; }
.nov-titulo { font-size:21px; font-weight:800; line-height:1.2; color:#0F172A; margin-bottom:8px; }
.nov-texto { font-size:14.5px; font-weight:600; line-height:1.55; color:#475569; }
.nov-texto b { color:#0F172A; }
.nov-rodape { flex-shrink:0; padding:12px 20px calc(18px + env(safe-area-inset-bottom, 0px)); }
.nov-pontos { display:flex; gap:6px; justify-content:center; margin-bottom:12px; }
.nov-pontos i { width:7px; height:7px; border-radius:99px; background:#CBD5E1; transition:all .2s; }
.nov-pontos i.on { width:22px; background:#7C3AED; }
.nov-botoes { display:flex; gap:10px; align-items:center; }
.nov-prox { flex:1; border:0; border-radius:16px; padding:14px 16px; background:linear-gradient(180deg,#8B5CF6,#6D28D9); color:#fff; font-weight:800; font-size:15px; font-family:inherit; cursor:pointer; box-shadow:0 8px 20px rgba(109,40,217,.3); }
.nov-voltar { border:0; background:none; color:#64748B; font-weight:800; font-size:14px; font-family:inherit; padding:12px 6px; cursor:pointer; }
.nov-extra { display:block; width:100%; margin-top:8px; border:1.5px solid #DDD6FE; background:#fff; color:#5B21B6; border-radius:16px; padding:12px; font-weight:800; font-size:14px; font-family:inherit; cursor:pointer; }
.nov-lista { display:grid; gap:9px; margin-top:4px; }
.nov-lista > div { display:flex; gap:10px; align-items:flex-start; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:14px; padding:10px 12px; font-size:13.5px; font-weight:600; line-height:1.45; color:#334155; }
.nov-lista > div > span { font-size:18px; line-height:1.2; flex-shrink:0; }
.nov-lista.nao > div { background:#FEF2F2; border-color:#FECACA; color:#7F1D1D; }
.nov-chat { margin-top:12px; background:#F8FAFC; border:1px solid #E2E8F0; border-radius:16px; padding:10px; }
.nov-chat small { display:block; font-size:10.5px; font-weight:800; letter-spacing:.6px; color:#94A3B8; margin:0 2px 6px; }
.nov-bolha { max-width:88%; padding:8px 11px; border-radius:13px; font-size:13px; font-weight:600; line-height:1.45; margin:5px 0; }
.nov-bolha.eu { margin-left:auto; background:#7C3AED; color:#fff; }
.nov-bolha.ia { background:#fff; border:1px solid #E2E8F0; color:#0F172A; }
.nov-num { display:grid; grid-template-columns:1fr 1fr; gap:9px; margin-top:10px; }
.nov-num > div { background:#F5F3FF; border:1px solid #DDD6FE; border-radius:14px; padding:11px 12px; }
.nov-num > div.larga { grid-column:1 / -1; background:#ECFDF5; border-color:#A7F3D0; }
.nov-num b { display:block; font-size:22px; font-weight:800; line-height:1.1; color:#4C1D95; }
.nov-num > div.larga b { color:#065F46; }
.nov-num span { display:block; margin-top:3px; font-size:11.5px; font-weight:700; line-height:1.3; color:#64748B; }
.nov-ops { display:flex; flex-wrap:wrap; gap:8px; margin-top:10px; }
.nov-op { border:1.5px solid #DDD6FE; background:#fff; color:#5B21B6; border-radius:14px; padding:10px 14px; font-weight:800; font-size:15px; font-family:inherit; cursor:pointer; min-width:58px; }
.nov-op small { font-size:11px; font-weight:700; }
.nov-op.on { background:linear-gradient(180deg,#8B5CF6,#6D28D9); border-color:transparent; color:#fff; box-shadow:0 6px 14px rgba(109,40,217,.28); }
.nov-conta { margin-top:12px; border:1px solid #DDD6FE; background:#F5F3FF; border-radius:16px; padding:12px; }
.nov-conta .t { font-size:11px; font-weight:800; letter-spacing:.5px; color:#7C3AED; text-transform:uppercase; margin-bottom:6px; }
.nov-linha { display:flex; justify-content:space-between; gap:10px; font-size:13px; font-weight:700; color:#475569; padding:3px 0; }
.nov-linha b { color:#0F172A; white-space:nowrap; }
.nov-linha.tot { border-top:1px dashed #C4B5FD; margin-top:5px; padding-top:7px; font-size:13.5px; color:#0F172A; }
.nov-meta { margin-top:10px; display:flex; align-items:center; justify-content:space-between; gap:8px; background:#fff; border:1.5px solid #8B5CF6; border-radius:14px; padding:9px 10px; }
.nov-meta .l { font-size:12px; font-weight:800; color:#5B21B6; line-height:1.25; }
.nov-meta .l small { display:block; font-size:11px; font-weight:700; color:#64748B; }
.nov-step { display:flex; align-items:center; gap:8px; }
.nov-step button { width:34px; height:34px; border-radius:11px; border:0; background:#EDE9FE; color:#5B21B6; font-size:20px; font-weight:800; font-family:inherit; cursor:pointer; line-height:1; }
.nov-step b { min-width:74px; text-align:center; font-size:17px; color:#0F172A; }
.nov-usar { margin-top:6px; border:0; background:none; color:#7C3AED; font-weight:800; font-size:12px; font-family:inherit; cursor:pointer; padding:2px 0; }
.nov-nota { margin-top:10px; font-size:12px; font-weight:700; color:#64748B; line-height:1.45; }
.nov-erro { margin-top:10px; background:#FEF2F2; border:1px solid #FECACA; color:#7F1D1D; border-radius:12px; padding:9px 11px; font-size:12.5px; font-weight:700; }
.nov-recado { margin-top:6px; background:#FFFBEB; border:1px solid #FDE68A; border-radius:16px; padding:14px; }
.nov-recado .por { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
.nov-recado .av { width:38px; height:38px; border-radius:50%; background:#16A34A; color:#fff; display:grid; place-items:center; font-weight:800; font-size:16px; }
.nov-recado .por b { display:block; font-size:13.5px; color:#451A03; }
.nov-recado .por small { font-size:11px; font-weight:700; color:#92400E; }
.nov-recado p { font-size:14px; font-weight:600; line-height:1.55; color:#451A03; white-space:pre-wrap; }
.nov-veredito { margin-top:4px; border-radius:14px; padding:11px 12px; font-size:13.5px; font-weight:700; line-height:1.5; }
.nov-veredito.ok { background:#F0FDF4; border:1px solid #BBF7D0; color:#14532D; }
.nov-veredito.meio { background:#FFFBEB; border:1px solid #FDE68A; color:#78350F; }
.nov-veredito.baixo { background:#FFF7ED; border:1px solid #FED7AA; color:#7C2D12; }
.nov-veredito.zero { background:#F1F5F9; border:1px solid #E2E8F0; color:#334155; }
`;

function NovidadePassos({ passos, rotuloFim = 'Entendi', rotuloExtra, onFim, onExtra }) {
  const [i, setI] = React.useState(0);
  const p = passos[i]; const ultimo = i === passos.length - 1;
  return (
    <div className="nov-fundo" role="dialog" aria-modal="true" aria-label={p.titulo}>
      <style>{NOV_CSS}</style>
      <div className="nov-card">
        <div className="nov-topo" style={{ background: p.fundo }}>
          {!ultimo && <button className="nov-pular" onClick={() => onFim('pular')}>Pular</button>}
          <div className="nov-ilu">{p.ilu}</div>
        </div>
        <div className="nov-corpo" key={i}>
          <div className="nov-titulo">{p.titulo}</div>
          <div className="nov-texto">{p.texto}</div>
          {p.extra}
        </div>
        <div className="nov-rodape">
          <div className="nov-pontos">{passos.map((_, k) => <i key={k} className={k === i ? 'on' : ''} />)}</div>
          <div className="nov-botoes">
            {i > 0 && <button className="nov-voltar" onClick={() => setI(i - 1)}>‹ Voltar</button>}
            <button className="nov-prox" onClick={() => (ultimo ? onFim('fim') : setI(i + 1))}>{ultimo ? rotuloFim : 'Próximo ›'}</button>
          </div>
          {ultimo && onExtra && rotuloExtra && <button className="nov-extra" onClick={onExtra}>{rotuloExtra}</button>}
        </div>
      </div>
    </div>
  );
}

/* ───────── EurekIA ───────── */
// A pergunta que já vai escrita no Dr. EurekIA quando o aluno toca em "Experimentar agora".
const NOV_PERGUNTA_INICIAL = 'Dr. EurekIA, o que eu estou aprendendo?';
function NovidadeEurekIA({ onFim, onExperimentar }) {
  const passos = [
    {
      fundo: 'linear-gradient(150deg,#7C3AED,#4C1D95)', ilu: <EurekiaAvatar size={108} />, titulo: 'Conheça o Dr. EurekIA!',
      texto: <>Uma novidade no app: o <b>Dr. EurekIA</b>, um cientista de inteligência artificial que tira as suas <b>dúvidas de inglês</b> aqui dentro, na hora em que você está estudando e fazendo as atividades.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#6366F1,#4338CA)', ilu: '📚', titulo: 'Ele conhece os SEUS estudos',
      texto: <>O Dr. EurekIA foi pensado para <b>você</b>: ele olha as suas <b>últimas pós-aulas</b> e as <b>atividades da última semana</b>. Se o assunto já foi explicado numa aula, ele lembra <b>como foi explicado</b>, mostra mais exemplos e, se você já respondeu um exercício parecido, mostra a sua resposta.</>,
      extra: <div className="nov-chat"><small>EXEMPLO</small>
        <div className="nov-bolha eu">Quando eu uso does?</div>
        <div className="nov-bolha ia">No pós-aula de 21/10 você viu que <b>does</b> vai com he, she e it. Exemplo: <i>Does she work?</i> Na atividade de do/does, você respondeu <i>does</i> para <i>What does he do?</i>.</div></div>,
    },
    {
      fundo: 'linear-gradient(150deg,#0D9488,#115E59)', ilu: '🎯', titulo: 'O que ele faz (e o que não faz)',
      texto: <div className="nov-lista">
        <div><span>✅</span><div><b>Dúvidas das suas atividades e aulas:</b> gramática, palavras, pronúncia e tradução do que você está estudando.</div></div>
        <div><span>🧠</span><div><b>Ensina, não entrega:</b> nos exercícios ele explica a regra e dá exemplos, mas a resposta é sua.</div></div>
        <div className="x"><span>🚫</span><div><b>Só o seu inglês:</b> ele foi feito para as suas atividades, então sobre outros assuntos ele não responde.</div></div>
        <div><span>⚠️</span><div><b>Pode errar.</b> Na dúvida, fale com o César no WhatsApp.</div></div>
      </div>,
    },
    {
      fundo: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', ilu: '👆', titulo: 'Como usar',
      texto: <>Toque no <b>botão roxo com o Dr. EurekIA</b>, no canto da tela, e escreva a sua dúvida. E <b>quando você está fazendo uma atividade</b>, ele aparece em <b>cada exercício</b>, numa bolinha roxa: com dificuldade? É só tocar nela e ele explica o que o exercício pede, sem entregar a resposta.</>,
      extra: onExperimentar ? <div className="nov-chat"><small>QUE TAL COMEÇAR POR AQUI?</small>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: '#334155', margin: '0 2px 6px' }}>Pergunte ao Dr. EurekIA <b>o que você está aprendendo</b> ultimamente. Deixei a pergunta pronta: toque em <b>Experimentar agora</b> e depois em <b>Enviar</b>.</div>
        <div className="nov-bolha eu">{NOV_PERGUNTA_INICIAL}</div></div> : null,
    },
  ];
  return <NovidadePassos passos={passos} rotuloFim={onExperimentar ? 'Experimentar agora' : 'Entendi'} rotuloExtra={onExperimentar ? 'Agora não' : null} onExtra={onExperimentar ? () => onFim('fim') : null}
    onFim={(como) => { if (como === 'fim' && onExperimentar) onExperimentar(); else onFim(como); }} />;
}

/* ───────── Trilha (Entrevista, Business, Viagem) ───────── */
// Abre sozinha uma vez, quando o professor ativa a trilha e a aluna ainda não contou nada. Os textos vêm do TRILHA_CONF (trilha.jsx),
// os mesmos da tela da trilha; o último passo leva direto ao formulário.
function NovidadeTrilha({ tipo, onFim, onComecar }) {
  const tr = TRILHAS[tipo], conf = TRILHA_CONF[tipo];
  if (!tr || !conf) return null;
  const foco = conf.foco;
  const passos = [
    {
      fundo: tr.grad, ilu: tr.ic, titulo: conf.titulo,
      texto: <>Uma novidade no app: um <b>caminho só seu</b>, feito pelo professor. {conf.intro}</>,
    },
    {
      fundo: tr.grad, ilu: '🧭', titulo: 'Como funciona',
      texto: <div className="nov-lista">
        {conf.como.map((c, i) => <div key={i}><span>{c[0]}</span><div><b>{i + 1}. {c[1]}.</b> {c[2]}</div></div>)}
      </div>,
    },
    foco ? {
      fundo: 'linear-gradient(150deg,#0D9488,#115E59)', ilu: '📌', titulo: foco.titulo,
      texto: <><div style={{ marginBottom: 8 }}>{foco.intro}</div><div className="nov-lista">
        {foco.itens.map((it, i) => <div key={i}><span>{it.ic}</span><div><b>{i + 1}. {it.t}.</b> {it.d}
          {it.sub && it.sub.map((s, j) => <div key={j} style={{ marginTop: 6 }}>{s[0]} <b>{String.fromCharCode(97 + j)}) {s[1]}:</b> {s[2]}</div>)}</div></div>)}
      </div></>,
    } : null,
    {
      fundo: 'linear-gradient(150deg,#6366F1,#4338CA)', ilu: '🗺', titulo: `O seu caminho: ${conf.etapas.length} etapas`,
      texto: <>O professor vai <b>liberando uma etapa de cada vez</b>, conforme você avança e as aulas acontecem. As que ainda não abriram aparecem como <b>EM BREVE</b>. Em cada etapa há tarefas de <b>ler, ouvir, falar e escrever</b>, e nas de falar você grava a sua voz por <b>até 1 minuto</b>.</>,
      extra: <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {conf.etapas.map((e, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 700, color: tr.dark, background: tr.bg, border: `1px solid ${tr.line}`, borderRadius: 99, padding: '4px 9px' }}>{i + 1}. {e.n}</span>)}
      </div>,
    },
    {
      fundo: tr.grad, ilu: '📝', titulo: `Primeiro passo: conte sobre ${conf.comecar}`,
      texto: <>São <b>{conf.campos.length} perguntas rápidas</b>, que levam uns <b>3 minutos</b>. Só você sabe as respostas, e é com elas que o professor monta <b>o material feito para você</b>, não um material genérico. Responda com calma: quanto mais você contar, melhor fica o seu caminho.</>,
    },
  ].filter(Boolean);
  return <NovidadePassos passos={passos} rotuloFim="Responder agora" rotuloExtra="Depois" onExtra={() => onFim('fim')}
    onFim={(como) => { if (como === 'fim') onComecar(); else onFim(como); }} />;
}

/* ───────── Adesão ───────── */
const novFm = (m) => (m < 1 ? `${Math.round(m * 60)} s` : `${(Math.round(m * 10) / 10).toString().replace('.', ',')} min`);
const novDdmm = (k) => `${String(k).slice(8, 10)}/${String(k).slice(5, 7)}`;
const novHm = (min) => { min = Math.round(min); const h = Math.floor(min / 60), r = min % 60; return h ? (r ? `${h} h ${r} min` : `${h} h`) : `${r} min`; };

// Uma leitura da média dos últimos dias contra a meta do dia (d vem de CzkAdesao.resumoPeriodo).
function NovidadeAdesaoVeredito(d) {
  const r = d.mediaGeral / d.metaDia, falta = Math.max(0, Math.ceil(d.metaDia - d.mediaGeral));
  if (!(d.dias > 0 && d.total > 0)) return { cls: 'zero', ic: '🌱', t: <>Ainda não há tempo de estudo seu medido, e tudo bem: <b>a contagem segue a partir de hoje</b>. Que tal começar com <b>{d.metaDia} minutos</b> ainda hoje?</> };
  if (r >= 1) return { cls: 'ok', ic: '🎉', t: <>Você está <b>acima</b> da meta de {d.metaDia} min por dia. Parabéns! Se quiser, <b>suba um pouquinho a sua meta</b> na próxima tela.</> };
  if (r >= 0.6) return { cls: 'meio', ic: '👏', t: <>Você está <b>quase lá</b>: faltam só uns <b>{falta} min por dia</b> para chegar à meta de {d.metaDia} min. Dá para chegar!</> };
  if (r >= 0.25) return { cls: 'meio', ic: '🌤️', t: <>Você já tem uma <b>boa base</b>. Para chegar aos {d.metaDia} min por dia faltam uns <b>{falta} min</b>. Com mais alguns dias de estudo, chega lá.</> };
  return { cls: 'baixo', ic: '🌱', t: <>Você está <b>começando</b>, e todo mundo começa. O segredo não é estudar muito, é <b>aparecer mais vezes</b>, mesmo que só {d.metaDia} minutinhos.</> };
}
function NovidadeAdesaoDicas(d) {
  const dicas = [];
  if (d.dias > 0 && d.total > 0 && d.diasEstudados / d.dias < 0.5) dicas.push(['📅', 'Espalhe pela semana', 'Estude também nos dias sem aula, nem que sejam 10 minutos.']);
  dicas.push(['⏰', 'Escolha um horário fixo', 'Depois do café, no almoço ou antes de dormir: o hábito gruda quando tem hora.']);
  dicas.push(['🧩', 'Divida em pedacinhos', '5 minutos de manhã e 5 à noite valem tanto quanto 10 seguidos.']);
  dicas.push(['📖', 'Comece pelo mais leve', 'Reler o pós-aula ou rever o vocabulário é um bom jeito de aquecer.']);
  return dicas.slice(0, 3);
}

// Última tela: o aluno escolhe os minutos por dia e já vê a sugestão da semana e do mês (soma as aulas, um pouquinho abaixo do total).
// v = { dia: minutos por dia, sem: minutos da semana escolhidos (null = a sugestão), mes: idem para o mês }
function NovidadeAdesaoMetas({ AD, aulas, dur, v, setV, erro }) {
  const c = AD.metasSugeridas(v.dia, aulas, dur);
  const sem = v.sem == null ? c.sugSem : v.sem, mes = v.mes == null ? c.sugMes : v.mes;
  const OP = [5, 10, 15, 20, 30];
  const outro = !OP.includes(v.dia);
  return (
    <>
      <div>Quanto você quer estudar <b>no app</b> por dia? Daqui já saem as metas da <b>semana</b> e do <b>mês</b>.</div>
      <div className="nov-ops">
        {OP.map((m) => <button key={m} className={`nov-op${v.dia === m ? ' on' : ''}`} onClick={() => setV({ ...v, dia: m })}>{m}<small> min</small></button>)}
        <button className={`nov-op${outro ? ' on' : ''}`} onClick={() => setV({ ...v, dia: outro ? v.dia : 45 })}>{outro ? <>{v.dia}<small> min</small></> : 'outro'}</button>
      </div>
      {outro && <div className="nov-meta" style={{ marginTop: 8 }}>
        <div className="l">Minutos por dia</div>
        <div className="nov-step"><button onClick={() => setV({ ...v, dia: Math.max(1, v.dia - 5) })}>−</button><b>{v.dia} min</b><button onClick={() => setV({ ...v, dia: Math.min(180, v.dia + 5) })}>+</button></div>
      </div>}

      <div className="nov-conta">
        <div className="t">Na semana</div>
        <div className="nov-linha"><span>No app: {v.dia} min × 7 dias</span><b>{novHm(c.appSem)}</b></div>
        <div className="nov-linha"><span>{aulas ? `Aulas: ${aulas} por semana × ${novHm(dur)}` : 'Aulas: sem dia fixo na semana'}</span><b>{novHm(c.aulasSemMin)}</b></div>
        <div className="nov-linha tot"><span>Total da semana</span><b>{novHm(c.totSem)}</b></div>
      </div>
      <div className="nov-meta">
        <div className="l">Meta da semana<small>sugestão: {novHm(c.sugSem)}</small></div>
        <div className="nov-step"><button onClick={() => setV({ ...v, sem: Math.max(30, sem - 30) })}>−</button><b>{novHm(sem)}</b><button onClick={() => setV({ ...v, sem: Math.min(7200, sem + 30) })}>+</button></div>
      </div>
      {v.sem != null && v.sem !== c.sugSem && <button className="nov-usar" onClick={() => setV({ ...v, sem: null })}>↺ voltar para a sugestão ({novHm(c.sugSem)})</button>}

      <div className="nov-conta" style={{ marginTop: 14 }}>
        <div className="t">No mês</div>
        <div className="nov-linha"><span>No app: {v.dia} min × 30 dias</span><b>{novHm(c.appMes)}</b></div>
        <div className="nov-linha"><span>{aulas ? `Aulas: cerca de ${c.aulasMesN} no mês × ${novHm(dur)}` : 'Aulas: sem dia fixo na semana'}</span><b>{novHm(c.aulasMesMin)}</b></div>
        <div className="nov-linha tot"><span>Total do mês</span><b>{novHm(c.totMes)}</b></div>
      </div>
      <div className="nov-meta">
        <div className="l">Meta do mês<small>sugestão: {novHm(c.sugMes)}</small></div>
        <div className="nov-step"><button onClick={() => setV({ ...v, mes: Math.max(60, mes - 60) })}>−</button><b>{novHm(mes)}</b><button onClick={() => setV({ ...v, mes: Math.min(30000, mes + 60) })}>+</button></div>
      </div>
      {v.mes != null && v.mes !== c.sugMes && <button className="nov-usar" onClick={() => setV({ ...v, mes: null })}>↺ voltar para a sugestão ({novHm(c.sugMes)})</button>}

      <div className="nov-nota">A sugestão fica <b>um pouquinho abaixo</b> do total, para a meta ser possível de bater. Você pode mudar quando quiser, no <b>Perfil</b>.</div>
      {erro ? <div className="nov-erro">{erro}</div> : null}
    </>
  );
}

// A apresentação da Adesão: explica o que é, mostra os números dos últimos 15 dias, o recado do professor e termina
// com a escolha das metas (que grava `metaEstudo`, o mesmo do Perfil).
// aulasSemana = dias de aula por semana do cadastro; durMin = duração da aula; onSalvarMetas(patch) grava no aluno.
function NovidadeAdesao({ AD, result, student, aulasSemana = 0, durMin = 60, onSalvarMetas, onFim, onVer }) {
  const d = (result && AD.resumoPeriodo(result, 15)) || { dias: 0, total: 0, diasEstudados: 0, mediaGeral: 0, mediaEstudados: 0, melhor: null, metaDia: 10 };
  const nome = (student && (student.firstName || String(student.name || '').split(' ')[0])) || '';
  const [v, setV] = React.useState(() => {
    const m = (student && student.metaEstudo) || {};
    return { dia: Number(m.diaMin) > 0 ? Math.round(Number(m.diaMin)) : 10, sem: Number(m.semH) > 0 ? Math.round(Number(m.semH) * 60) : null, mes: Number(m.mesH) > 0 ? Math.round(Number(m.mesH) * 60) : null };
  });
  const [salvando, setSalvando] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const ver = NovidadeAdesaoVeredito(d), dicas = NovidadeAdesaoDicas(d);
  const meu = String((student && student.adesaoRecado && student.adesaoRecado.texto) || '').trim();
  const recado = meu || (result ? AD.suggestComment(result, nome) : '');

  async function salvar() {
    if (salvando) return;
    const c = AD.metasSugeridas(v.dia, aulasSemana, durMin);
    const sem = v.sem == null ? c.sugSem : v.sem, mes = v.mes == null ? c.sugMes : v.mes;
    setSalvando(true); setErro('');
    try {
      if (onSalvarMetas) await onSalvarMetas({ metaEstudo: { diaMin: Math.round(v.dia), semH: Math.round(sem / 6) / 10, mesH: Math.round(mes / 6) / 10 } });
      if (onVer) onVer(); else onFim('fim');
    } catch (e) {
      console.error('Metas da apresentação:', e);
      setErro('Não consegui salvar agora. Tente de novo em instantes.');
      setSalvando(false);
    }
  }

  const passos = [
    {
      fundo: 'linear-gradient(150deg,#16A34A,#064E3B)', ilu: '📈', titulo: nome ? `${nome}, conheça a sua Adesão` : 'Conheça a sua Adesão',
      texto: <>Uma novidade no app: agora você acompanha o <b>seu hábito de estudo</b>. Desde <b>{result && result.measureFrom ? novDdmm(result.measureFrom) : 'o início da medição'}</b> o app vem medindo, com cuidado, quanto tempo você estuda{d.dias > 0 ? <> — já são <b>{d.dias} {d.dias === 1 ? 'dia' : 'dias'}</b> de acompanhamento</> : null}. Nas próximas telas você vê o que é, como funciona e <b>os seus números</b>.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#2563EB,#1E3A8A)', ilu: '🎯', titulo: 'Para que serve',
      texto: <>Não é prova nem castigo: é um <b>espelho do seu hábito</b>. Estudar <b>um pouco todo dia</b> vale mais do que estudar muito num dia só.<div style={{ marginTop: 10 }}>Toda semana (de segunda a domingo) você também ganha uma <b>nota de 0 a 100</b>, feita de 5 pontos: <b>Constância</b>, <b>Atividades</b>, <b>Pós-aula</b>, <b>Aulas</b> e <b>Desafio</b>. Tudo aparece no <b>cartão da Adesão</b>, na tela inicial.</div></>,
    },
    {
      fundo: 'linear-gradient(150deg,#7C3AED,#4C1D95)', ilu: '⏱️', titulo: 'O que conta como estudo',
      texto: <><div className="nov-lista">
        <div><span>📖</span><div>Ler o <b>pós-aula</b></div></div>
        <div><span>✏️</span><div>Fazer as <b>atividades</b> e os extras, e ler a correção</div></div>
        <div><span>🏆</span><div>O <b>Desafio</b> da semana</div></div>
        <div><span>🧩</span><div><b>Vocabulário</b>, lista de verbos e chunks</div></div>
      </div><div style={{ marginTop: 10 }}>O relógio anda enquanto você usa o app. <b>Deixar o app aberto sem mexer</b> ou ficar só na tela inicial não conta.</div></>,
    },
    {
      fundo: 'linear-gradient(150deg,#E11D48,#9F1239)', ilu: '🗓️', titulo: 'Faltou aula? Teve feriado?',
      texto: <>As suas <b>aulas</b> entram na meta da semana e do mês. Por isso, se você <b>faltou</b> ou se caiu um <b>feriado</b>, esse tempo sem aula fica faltando.
        <div className="nov-lista" style={{ marginTop: 10 }}>
          <div><span>🤝</span><div>O app está aqui para <b>te ensinar</b> e também para <b>te cobrar</b>.</div></div>
          <div><span>🔁</span><div>Compense esse tempo <b>de outras maneiras</b>: reler o pós-aula, fazer atividades e vocabulário, o Desafio e tirar dúvidas com o Dr. EurekIA.</div></div>
        </div></>,
    },
    {
      fundo: 'linear-gradient(150deg,#0D9488,#115E59)', ilu: '📊', titulo: 'Os seus números dos últimos 15 dias',
      texto: d.dias > 0 && d.total > 0
        ? <>Nos últimos <b>{d.dias} {d.dias === 1 ? 'dia' : 'dias'}</b>, o app mediu o seu estudo assim:
          <div className="nov-num">
            <div><b>{d.diasEstudados}</b><span>dias em que você estudou</span></div>
            <div><b>{novFm(d.mediaGeral)}</b><span>de média por dia (contando todos os dias)</span></div>
            <div><b>{novFm(d.mediaEstudados)}</b><span>de média nos dias em que estudou</span></div>
            <div><b>{novFm(d.total)}</b><span>de estudo no total</span></div>
            {d.melhor && <div className="larga"><b>{novFm(d.melhor.m)}</b><span>no seu melhor dia, {novDdmm(d.melhor.k)}</span></div>}
          </div></>
        : <>Ainda não há tempo de estudo seu medido{d.dias > 0 ? <> nos últimos <b>{d.dias} {d.dias === 1 ? 'dia' : 'dias'}</b></> : null}. Sem problema: <b>a contagem segue a partir de hoje</b>. Abra um pós-aula ou faça uma atividade e já começa a aparecer aqui.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#D97706,#92400E)', ilu: '💬', titulo: meu ? 'O recado do seu professor' : 'Uma mensagem para você',
      texto: <>{meu ? 'O César olhou os seus números e deixou um recado para você:' : 'Olhando os seus números, o app deixa esta mensagem:'}
        <div className="nov-recado"><div className="por"><div className="av">{meu ? 'C' : '💬'}</div><div><b>{meu ? 'César' : 'Science English'}</b><small>{meu ? 'seu professor' : 'mensagem automática'}</small></div></div><p>{recado}</p></div></>,
    },
    {
      fundo: 'linear-gradient(150deg,#6366F1,#4338CA)', ilu: '🤔', titulo: 'E aí, o que você acha da sua média?',
      texto: <><div className={`nov-veredito ${ver.cls}`}>{ver.ic} {ver.t}</div>
        <div style={{ marginTop: 12, fontWeight: 800, color: '#0F172A' }}>Que tal melhorar por aqui?</div>
        <div className="nov-lista" style={{ marginTop: 6 }}>{dicas.map((x, i) => <div key={i}><span>{x[0]}</span><div><b>{x[1]}.</b> {x[2]}</div></div>)}</div></>,
    },
    {
      fundo: 'linear-gradient(150deg,#8B5CF6,#5B21B6)', ilu: '🎯', titulo: 'Defina as suas metas de estudo',
      texto: <NovidadeAdesaoMetas AD={AD} aulas={aulasSemana} dur={durMin} v={v} setV={setV} erro={erro} />,
    },
  ];
  return <NovidadePassos passos={passos} rotuloFim={salvando ? 'Salvando…' : 'Salvar as minhas metas'} rotuloExtra="Decidir depois" onExtra={() => onFim('depois')}
    onFim={(como) => { if (como === 'fim') salvar(); else onFim(como); }} />;
}
