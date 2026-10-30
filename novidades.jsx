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
// A pergunta que já vai escrita na EurekIA quando o aluno toca em "Experimentar agora".
const NOV_PERGUNTA_INICIAL = 'EurekIA, o que eu estou aprendendo?';
function NovidadeEurekIA({ onFim, onExperimentar }) {
  const passos = [
    {
      fundo: 'linear-gradient(150deg,#7C3AED,#4C1D95)', ilu: <EurekiaAvatar size={108} />, titulo: 'Conheça a EurekIA!',
      texto: <>Uma novidade no app: a <b>EurekIA</b>, uma inteligência artificial que tira as suas <b>dúvidas de inglês</b> aqui dentro, na hora em que você está estudando e fazendo as atividades.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#6366F1,#4338CA)', ilu: '📚', titulo: 'Ela conhece os SEUS estudos',
      texto: <>A EurekIA foi pensada para <b>você</b>: ela olha as suas <b>últimas pós-aulas</b> e as <b>atividades da última semana</b>. Se o assunto já foi explicado numa aula, ela lembra <b>como foi explicado</b>, mostra mais exemplos e, se você já respondeu um exercício parecido, mostra a sua resposta.</>,
      extra: <div className="nov-chat"><small>EXEMPLO</small>
        <div className="nov-bolha eu">Quando eu uso does?</div>
        <div className="nov-bolha ia">No pós-aula de 21/10 você viu que <b>does</b> vai com he, she e it. Exemplo: <i>Does she work?</i> Na atividade de do/does, você respondeu <i>does</i> para <i>What does he do?</i>.</div></div>,
    },
    {
      fundo: 'linear-gradient(150deg,#0D9488,#115E59)', ilu: '🎯', titulo: 'O que ela faz (e o que não faz)',
      texto: <div className="nov-lista">
        <div><span>✅</span><div><b>Dúvidas das suas atividades e aulas:</b> gramática, palavras, pronúncia e tradução do que você está estudando.</div></div>
        <div><span>🧠</span><div><b>Ensina, não entrega:</b> nos exercícios ela explica a regra e dá exemplos, mas a resposta é sua.</div></div>
        <div className="x"><span>🚫</span><div><b>Só o seu inglês:</b> ela foi feita para as suas atividades, então sobre outros assuntos ela não responde.</div></div>
        <div><span>⚠️</span><div><b>Pode errar.</b> Na dúvida, fale com o César no WhatsApp.</div></div>
      </div>,
    },
    {
      fundo: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', ilu: '👆', titulo: 'Como usar',
      texto: <>Toque no <b>botão roxo com a cientista</b>, no canto da tela, e escreva a sua dúvida. E <b>quando você está fazendo uma atividade</b>, ela aparece pequenininha no topo, ao lado do ✕: é só tocar e perguntar, sem sair do exercício.</>,
      extra: onExperimentar ? <div className="nov-chat"><small>QUE TAL COMEÇAR POR AQUI?</small>
        <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: '#334155', margin: '0 2px 6px' }}>Pergunte à EurekIA <b>o que você está aprendendo</b> ultimamente. Deixei a pergunta pronta: toque em <b>Experimentar agora</b> e depois em <b>Enviar</b>.</div>
        <div className="nov-bolha eu">{NOV_PERGUNTA_INICIAL}</div></div> : null,
    },
  ];
  return <NovidadePassos passos={passos} rotuloFim={onExperimentar ? 'Experimentar agora' : 'Entendi'} rotuloExtra={onExperimentar ? 'Agora não' : null} onExtra={onExperimentar ? () => onFim('fim') : null}
    onFim={(como) => { if (como === 'fim' && onExperimentar) onExperimentar(); else onFim(como); }} />;
}

/* ───────── Adesão ───────── */
const novFm = (m) => (m < 1 ? `${Math.round(m * 60)} s` : `${(Math.round(m * 10) / 10).toString().replace('.', ',')} min`);
const novDdmm = (k) => `${String(k).slice(8, 10)}/${String(k).slice(5, 7)}`;

// Os números do aluno desde que o app começou a medir (result vem do CzkAdesao.compute).
function NovidadeAdesaoDados(AD, result) {
  if (!result || !result.measureFrom) return null;
  const hojeK = AD.util.dayKey(new Date()), ini = result.measureFrom;
  const dias = Math.max(1, Math.round((new Date(`${hojeK}T12:00:00`) - new Date(`${ini}T12:00:00`)) / 86400000) + 1);
  const chaves = Object.keys(result.daily || {}).filter((k) => k >= ini && k <= hojeK);
  const minutos = chaves.map((k) => ({ k, m: Number(result.daily[k].min || 0) }));
  const total = minutos.reduce((s, x) => s + x.m, 0);
  const minDia = (result.cfg && result.cfg.minDia) || 3;
  const estudados = minutos.filter((x) => x.m >= minDia);
  const melhor = minutos.reduce((a, x) => (x.m > (a ? a.m : 0) ? x : a), null);
  return {
    ini, dias, total, diasEstudados: estudados.length,
    mediaGeral: total / dias, mediaEstudados: estudados.length ? estudados.reduce((s, x) => s + x.m, 0) / estudados.length : 0,
    melhor: melhor && melhor.m > 0 ? melhor : null, metaDia: (result.cfg && result.cfg.metaDiaMin) || 10,
  };
}

function NovidadeAdesao({ AD, result, student, onFim, onVer }) {
  const d = NovidadeAdesaoDados(AD, result);
  const nome = (student && (student.firstName || String(student.name || '').split(' ')[0])) || '';
  const meta = (student && student.metaEstudo && student.metaEstudo.diaMin) || (d && d.metaDia) || 10;
  const passos = [
    {
      fundo: 'linear-gradient(150deg,#16A34A,#064E3B)', ilu: '📈', titulo: nome ? `${nome}, conheça a sua Adesão` : 'Conheça a sua Adesão',
      texto: <>Uma novidade no app: agora você acompanha o <b>seu hábito de estudo</b>. Desde <b>{d ? novDdmm(d.ini) : 'o início da medição'}</b> o app vem medindo, com cuidado, quanto tempo você estuda{d ? <> — já são <b>{d.dias} {d.dias === 1 ? 'dia' : 'dias'}</b> de acompanhamento</> : null}.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#2563EB,#1E3A8A)', ilu: '🎯', titulo: 'Para que serve',
      texto: <>Não é prova nem castigo: é um <b>espelho do seu hábito</b>. Estudar <b>um pouco todo dia</b> vale mais do que estudar muito num dia só. A sua <b>meta de hoje</b> é de <b>{meta} minutos</b> de estudo no app — e você pode escolher a sua própria meta no <b>Perfil</b>.</>,
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
      fundo: 'linear-gradient(150deg,#0D9488,#115E59)', ilu: '📊', titulo: 'Os seus números até agora',
      texto: d && d.total > 0
        ? <>Desde {novDdmm(d.ini)}, o app mediu o seu estudo assim:
          <div className="nov-num">
            <div><b>{d.dias}</b><span>dias de acompanhamento</span></div>
            <div><b>{d.diasEstudados}</b><span>dias em que você estudou</span></div>
            <div><b>{novFm(d.mediaGeral)}</b><span>de média por dia (contando todos os dias)</span></div>
            <div><b>{novFm(d.mediaEstudados)}</b><span>de média nos dias em que estudou</span></div>
            <div className="larga"><b>{novFm(d.total)}</b><span>de estudo no total{d.melhor ? ` · seu melhor dia: ${novDdmm(d.melhor.k)}, com ${novFm(d.melhor.m)}` : ''}</span></div>
          </div></>
        : <>Já estamos acompanhando{d ? <> há <b>{d.dias} {d.dias === 1 ? 'dia' : 'dias'}</b></> : null}, mas ainda não há tempo de estudo seu medido. Sem problema: <b>a contagem segue a partir de hoje</b>. Abra um pós-aula ou faça uma atividade e veja o seu número aparecer.</>,
    },
    {
      fundo: 'linear-gradient(150deg,#F59E0B,#B45309)', ilu: '🏅', titulo: 'Sua nota e onde ver',
      texto: <>Toda semana (de segunda a domingo) você ganha uma <b>nota de 0 a 100</b>, feita de 5 pontos: <b>Constância</b>, <b>Atividades</b>, <b>Pós-aula</b>, <b>Aulas</b> e <b>Desafio</b>. Para ver tudo, toque no cartão <b>“Meta de estudo de hoje”</b>, na tela Início: lá estão a sua semana, o calendário, o gráfico de evolução e a explicação completa.</>,
    },
  ];
  return <NovidadePassos passos={passos} rotuloFim={onVer ? 'Ver a minha adesão' : 'Entendi'} rotuloExtra={onVer ? 'Fechar' : null} onExtra={onVer ? () => onFim('fim') : null}
    onFim={(como) => { if (como === 'fim' && onVer) onVer(); else onFim(como); }} />;
}
