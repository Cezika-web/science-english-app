// Desafio Science English — experiência semanal oficial.
// As perguntas vêm do servidor sem gabarito; cada resposta é confirmada por
// uma Cloud Function e os resultados só são devolvidos no domingo.
const CHALLENGE_TIME_SECONDS = 45;
const challengeBlue = 'linear-gradient(135deg,#071B3A 0%,#0D3F82 58%,#087CC1 100%)';
const challengeRoundButton = { width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:20, cursor:'pointer', fontFamily:'inherit' };

function challengeStatus(state = {}) {
  if (state.phase === 'open') {
    if (state.completed) return { badge:'CONCLUÍDA', title:`Parte ${state.part} concluída`, detail:state.part === 1 ? 'Suas respostas estão salvas. A nota desta parte sai na quinta.' : 'Suas respostas estão salvas. O resultado sai no domingo.', tone:'#DFF7E8', color:'#15713A' };
    return { badge:'DISPONÍVEL', title:`Parte ${state.part} disponível agora`, detail:`${state.round?.questionCount || 5} perguntas · 45 segundos cada`, tone:'#5DE1FF', color:'#071B3A' };
  }
  if (state.phase === 'results') return { badge:'RESULTADO', title:'Resultado semanal disponível', detail:'Confira sua pontuação, posição e correções.', tone:'#FFE8A3', color:'#684800' };
  if (state.phase === 'calculating') return { badge:'ENCERRADO', title:'Calculando o resultado', detail:'O ranking será liberado neste domingo.', tone:'rgba(255,255,255,.16)', color:'#fff' };
  if (state.phase === 'upcoming') return { badge:'EM BREVE', title:'A disputa começa segunda-feira', detail:'Parte 1 · segunda a quarta', tone:'rgba(255,255,255,.16)', color:'#fff' };
  if (state.phase === 'waiting') return { badge:'EM BREVE', title:'Você entra na próxima rodada', detail:'Suas perguntas nascem das suas aulas. Depois do seu primeiro pós-aula elas aparecem aqui.', tone:'rgba(255,255,255,.16)', color:'#fff' };
  return { badge:'PREPARANDO', title:'Primeira rodada em preparação', detail:'As perguntas serão publicadas antes da abertura.', tone:'rgba(255,255,255,.16)', color:'#fff' };
}

function ChallengeCard({ onOpen, challenge, challengeState }) {
  const personal = challenge?.kind === 'private';
  const state = challengeStatus(challengeState);
  const title = personal ? challenge.title : 'Desafio Science English';
  const questionCount = personal ? Number(challenge.questionCount || 10) : Number(challengeState?.round?.questionCount || 5);
  return <button type="button" onClick={() => onOpen(challenge || null)} aria-label={`Abrir ${title}`} style={{
    width:'100%', boxSizing:'border-box', border:'1px solid rgba(93,225,255,.35)', borderRadius:22,
    padding:'19px 18px', marginBottom:12, overflow:'hidden', position:'relative', color:'#fff', cursor:'pointer',
    textAlign:'left', fontFamily:'inherit', background:personal ? 'linear-gradient(135deg,#073D43,#087982,#20A9A0)' : challengeBlue,
    boxShadow:'0 14px 30px rgba(7,27,58,.24)'
  }}>
    <span aria-hidden="true" style={{ position:'absolute', width:150, height:150, borderRadius:'50%', right:-52, top:-70, background:'rgba(93,225,255,.13)' }} />
    <span style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, position:'relative' }}>
      <span style={{ display:'flex', alignItems:'center', gap:9, fontSize:10.5, fontWeight:900, letterSpacing:1.2, textTransform:'uppercase', color:'#A9EEFF' }}><span style={{ width:30, height:30, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.13)', fontSize:17 }}>🏆</span>{personal ? 'Desafio da turma' : 'Desafio semanal'}</span>
      <span style={{ padding:'5px 8px', borderRadius:999, background:personal ? 'rgba(255,255,255,.18)' : state.tone, color:personal ? '#fff' : state.color, fontSize:9, fontWeight:900 }}>{personal ? 'OPCIONAL' : state.badge}</span>
    </span>
    <span style={{ display:'block', position:'relative', fontSize:20, lineHeight:1.15, fontWeight:900, marginTop:14 }}>{personal ? title : state.title}</span>
    <span style={{ display:'block', position:'relative', color:'rgba(255,255,255,.78)', fontSize:12.5, marginTop:6 }}>{personal ? `${questionCount} perguntas por rodada` : state.detail}</span>
    <span style={{ display:'flex', position:'relative', alignItems:'center', justifyContent:'space-between', marginTop:16 }}><span style={{ fontSize:11.5, fontWeight:750, color:'#D8F8FF' }}>{personal ? `${challenge.participantCount || 2} participantes` : challengeState?.phase === 'results' ? 'Atualizado no domingo' : 'Até 500 PTS por parte'}</span><span style={{ padding:'8px 12px', borderRadius:11, background:'#fff', color:'#0B4C91', fontSize:10.5, fontWeight:900 }}>ABRIR →</span></span>
  </button>;
}

function ChallengeCarousel({ simulation, onOpen, challengeState }) {
  const [index, setIndex] = React.useState(0);
  const scrollRef = React.useRef(null);
  const items = [{ id:'general', kind:'general' }, ...(simulation?.activeChallenges || [])];
  return <div style={{ margin:'0 -16px 12px' }}>
    <div ref={scrollRef} onScroll={event => setIndex(Math.round(event.currentTarget.scrollLeft / (event.currentTarget.clientWidth || 1)))} style={{ display:'flex', overflowX:'auto', scrollSnapType:'x mandatory', scrollbarWidth:'none' }}>
      {items.map(item => <div key={item.id} style={{ flex:'0 0 100%', boxSizing:'border-box', padding:'0 16px', scrollSnapAlign:'start' }}><ChallengeCard challenge={item.kind === 'general' ? null : item} challengeState={challengeState} onOpen={onOpen} /></div>)}
    </div>
    {items.length > 1 && <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:-3 }}>{items.map((item,itemIndex) => <button key={item.id} aria-label={`Mostrar desafio ${itemIndex + 1}`} onClick={() => scrollRef.current?.scrollTo({ left:(scrollRef.current.clientWidth || 0) * itemIndex, behavior:'smooth' })} style={{ width:index === itemIndex ? 18 : 7, height:7, padding:0, border:0, borderRadius:999, background:index === itemIndex ? '#0D5AA7' : '#B7C5D4' }} />)}</div>}
  </div>;
}

function ChallengeSubpageHeader({ title, subtitle, onClose }) {
  return <div style={{ position:'sticky', top:0, zIndex:3, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'rgba(243,247,252,.96)', borderBottom:'1px solid #DCE7F4' }}><button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', border:'1px solid #D7E3F1', background:'#fff', color:'#0D3F82', fontSize:20 }}>‹</button><div><strong style={{ display:'block', color:'#071B3A', fontSize:16 }}>{title}</strong><span style={{ color:'#64748B', fontSize:11.5 }}>{subtitle}</span></div></div>;
}

function ChallengeRules({ onClose }) {
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Regras e pontuação" subtitle="Leia antes de começar" onClose={onClose} />
    <div style={{ padding:'18px 16px 32px' }}>
      <div style={{ padding:17, borderRadius:18, color:'#fff', background:challengeBlue }}><strong style={{ display:'block', fontSize:15 }}>Como funciona</strong><div style={{ fontSize:12.5, lineHeight:1.65, marginTop:8, color:'rgba(255,255,255,.84)' }}>A semana tem 10 perguntas, divididas em duas partes de 5. Cada pergunta dura 45 segundos. Há uma única tentativa e não é possível voltar. Ao sair, bloquear a tela ou trocar de aba, a resposta atual é enviada.</div></div>
      <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Calendário</div>
      <div style={{ display:'grid', gap:8, marginTop:9 }}>{[
        ['1️⃣','Parte 1 · segunda a quarta','Abre segunda-feira à 00h e termina quarta às 23h59. Na quinta a nota dela já aparece — quem não respondeu fica com zero.'],
        ['2️⃣','Parte 2 · quinta a sábado','Abre quinta-feira à 00h e termina sábado às 23h59.'],
        ['🏆','Resultado · domingo','Ranking e correções da semana são liberados no domingo.'],
      ].map(([icon,title,text]) => <div key={title} style={{ display:'flex', gap:11, alignItems:'center', padding:13, borderRadius:15, background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ width:38, height:38, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'#E7F3FF', fontSize:18 }}>{icon}</span><span><strong style={{ display:'block', color:'#0D3F82', fontSize:12.5 }}>{title}</strong><span style={{ display:'block', color:'#64748B', fontSize:10.5, lineHeight:1.45, marginTop:3 }}>{text}</span></span></div>)}</div>
      <div style={{ marginTop:18, padding:15, borderRadius:16, background:'#fff', border:'1px solid #DCE7F4', color:'#53677E', fontSize:11.5, lineHeight:1.55 }}><strong style={{ color:'#0D3F82' }}>Pontuação:</strong> cada resposta correta vale 100 pontos. São até 500 pontos por parte e 1.000 pontos por semana.</div>
    </div>
  </div>;
}

// A semana isolada esquece tudo na segunda. Aqui ficam as semanas anteriores e
// o acumulado — é o que transforma o desafio em temporada e faz o aluno voltar.
function ChallengeSeason({ carregar, onClose }) {
  const [dados, setDados] = React.useState(null);
  const [erro, setErro] = React.useState('');
  // Ref para o efeito rodar uma vez só: se dependesse de `carregar`, uma função
  // recriada a cada render deixaria o painel buscando em laço.
  const carregarRef = React.useRef(carregar);
  carregarRef.current = carregar;
  React.useEffect(() => {
    let vivo = true;
    Promise.resolve(carregarRef.current())
      .then(resultado => { if (vivo) setDados(resultado || { minhasSemanas:[], geral:[] }); })
      .catch(falha => { if (vivo) setErro(falha?.message || 'Não foi possível carregar agora.'); });
    return () => { vivo = false; };
  }, []);

  const semanaLabel = key => {
    const [, mes, dia] = String(key || '').split('-');
    return dia && mes ? `Semana de ${dia}/${mes}` : key;
  };

  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Minha temporada" subtitle="Todas as semanas somadas" onClose={onClose} />
    <div style={{ padding:'18px 16px 32px' }}>
      {erro && <div style={{ padding:14, borderRadius:14, background:'#FFF1F2', color:'#B3261E', fontSize:12.5 }}>{erro}</div>}
      {!dados && !erro && <div style={{ padding:24, textAlign:'center', color:'#7B8DA3', fontSize:12.5 }}>Carregando…</div>}
      {dados && <React.Fragment>
        <div style={{ padding:18, borderRadius:20, color:'#fff', background:challengeBlue }}>
          <span style={{ color:'#A9EEFF', fontSize:9.5, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>Total acumulado</span>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:8 }}>
            <span><strong style={{ fontSize:30 }}>{Number(dados.meuTotal || 0).toLocaleString('pt-BR')}</strong><small style={{ marginLeft:4, color:'#BDEFFF' }}>PTS</small></span>
            <span style={{ textAlign:'right' }}>
              <strong style={{ display:'block', fontSize:22 }}>{dados.minhaPosicao ? `${dados.minhaPosicao}º` : '—'}</strong>
              <small style={{ color:'#BDEFFF' }}>na temporada</small>
            </span>
          </div>
          {dados.melhorPosicao && <div style={{ marginTop:10, paddingTop:9, borderTop:'1px solid rgba(255,255,255,.14)', color:'#BDEFFF', fontSize:10.5, fontWeight:800 }}>
            Melhor posição numa semana: {dados.melhorPosicao}º · {dados.minhasSemanas.length} semana(s) disputada(s)
          </div>}
        </div>

        <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Suas semanas</div>
        {dados.minhasSemanas.length
          ? <div style={{ display:'grid', gap:7, marginTop:9 }}>{dados.minhasSemanas.map(semana =>
              <div key={semana.weekKey} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 12px', borderRadius:14, background:'#fff', border:'1px solid #DCE7F4' }}>
                <span style={{ flex:1, minWidth:0 }}>
                  <strong style={{ display:'block', color:'#213B5B', fontSize:12.5 }}>{semanaLabel(semana.weekKey)}</strong>
                  <span style={{ color:'#64748B', fontSize:10.5 }}>{semana.position}º entre {semana.participantes} · {semana.partesFeitas || 0} de 2 partes</span>
                </span>
                <strong style={{ color:'#0D5AA7', fontSize:13 }}>{Number(semana.score || 0).toLocaleString('pt-BR')}</strong>
              </div>)}</div>
          : <div style={{ marginTop:9, padding:15, borderRadius:15, background:'#fff', border:'1px solid #DCE7F4', color:'#64748B', fontSize:11.5, lineHeight:1.55 }}>
              Sua primeira semana ainda não fechou. O resultado sai no domingo e entra aqui.
            </div>}

        <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Ranking geral</div>
        <div style={{ marginTop:9, padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}>
          <ChallengeRanking ranking={(dados.geral || []).map(row => ({ ...row, score:row.total }))} />
        </div>
      </React.Fragment>}
    </div>
  </div>;
}

function ChallengeRanking({ ranking = [] }) {
  if (!ranking.length) return <div style={{ padding:20, color:'#7B8DA3', fontSize:11.5, textAlign:'center' }}>Nenhum participante nesta semana.</div>;
  return <div style={{ display:'grid', gap:7 }}>{ranking.map(row => <div key={`${row.position}-${row.name}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13, background:row.isOwn ? '#E9F5FF' : '#F7FAFD', border:`1px solid ${row.isOwn ? '#B9DDFB' : '#E5EDF5'}` }}><span style={{ width:26, textAlign:'center', fontWeight:900, color:row.position <= 3 ? '#B27D09' : '#64748B' }}>{row.position}º</span><span style={{ flex:1, minWidth:0, color:row.isOwn ? '#0D3F82' : '#213B5B', fontSize:12, fontWeight:row.isOwn ? 900 : 750, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.name}{row.isOwn ? ' · você' : ''}</span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{Number(row.score || 0).toLocaleString('pt-BR')} <small>PTS</small></strong></div>)}</div>;
}

function ChallengeResults({ state }) {
  const result = state.result || { score:0, maxScore:1000, parts:[] };
  const [openQuestion, setOpenQuestion] = React.useState(null);
  return <div>
    <div style={{ padding:18, borderRadius:20, color:'#fff', background:challengeBlue }}><span style={{ color:'#A9EEFF', fontSize:9.5, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>Seu resultado semanal</span><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:8 }}><span><strong style={{ fontSize:30 }}>{Number(result.score).toLocaleString('pt-BR')}</strong><small style={{ marginLeft:4, color:'#BDEFFF' }}>de {result.maxScore} PTS</small></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', fontSize:22 }}>{result.position ? `${result.position}º` : '—'}</strong><small style={{ color:'#BDEFFF' }}>posição</small></span></div></div>
    {result.parts.map(part => <div key={part.part} style={{ marginTop:13, padding:14, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><div style={{ display:'flex', justifyContent:'space-between' }}><strong style={{ color:'#0D3F82' }}>Parte {part.part}</strong><strong style={{ color:'#168C72' }}>{part.score} PTS</strong></div><div style={{ display:'grid', gap:7, marginTop:10 }}>{(part.details || []).map((detail,index) => {
      const key = `${part.part}-${index}`, open = openQuestion === key;
      return <div key={key} style={{ border:`1px solid ${detail.correct ? '#B8E8D5' : '#F0D1C8'}`, borderRadius:13, overflow:'hidden' }}><button onClick={() => setOpenQuestion(open ? null : key)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:11, border:0, background:detail.correct ? '#F1FBF7' : '#FFF7F3', textAlign:'left', fontFamily:'inherit' }}><span>{detail.correct ? '✅' : '❌'}</span><span style={{ flex:1, color:'#213B5B', fontSize:11.5, fontWeight:750 }}>{detail.prompt}</span><strong style={{ color:detail.correct ? '#168C72' : '#B33A3A' }}>{detail.score}</strong></button>{open && <div style={{ padding:11, color:'#53677E', fontSize:11, lineHeight:1.5 }}><div><strong>Sua resposta:</strong> {detail.answer || 'Sem resposta'}</div><div style={{ marginTop:5 }}><strong>Resposta correta:</strong> {detail.expected}</div>{detail.explanation && <div style={{ marginTop:5 }}><strong>Explicação:</strong> {detail.explanation}</div>}</div>}</div>;
    })}</div></div>)}
    <div style={{ marginTop:16, color:'#0D5AA7', fontSize:10, fontWeight:900, textTransform:'uppercase', letterSpacing:.9 }}>Ranking da semana</div>
    <div style={{ marginTop:8, padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><ChallengeRanking ranking={state.ranking || []} /></div>
  </div>;
}

function ChallengePrivateHub({ challenge, onBack, onJoin }) {
  return <div style={{ position:'fixed', inset:0, zIndex:10020, maxWidth:480, margin:'0 auto', background:'#F3F7FC', overflowY:'auto' }}><div style={{ padding:'calc(env(safe-area-inset-top,0px) + 14px) 18px 30px', color:'#fff', background:'linear-gradient(135deg,#073D43,#087982,#20A9A0)' }}><button onClick={onBack} style={challengeRoundButton}>‹</button><div style={{ textAlign:'center', marginTop:20 }}><div style={{ fontSize:36 }}>⚔️</div><h1 style={{ fontSize:23 }}>{challenge?.title || 'Desafio da turma'}</h1><p style={{ color:'rgba(255,255,255,.75)' }}>{challenge?.participantLabel || `${challenge?.participantCount || 2} participantes`}</p></div></div><div style={{ margin:-20, marginTop:-20, padding:36 }}><div style={{ padding:17, borderRadius:20, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ color:'#0D3F82' }}>Desafio coletivo cadastrado</strong><p style={{ color:'#64748B', fontSize:12, lineHeight:1.5 }}>As rodadas coletivas serão ativadas depois do lançamento do desafio geral.</p>{!challenge?.joined && <button onClick={() => onJoin?.(challenge)} style={{ width:'100%', border:0, borderRadius:13, padding:13, background:'#087982', color:'#fff', fontWeight:900 }}>PARTICIPAR</button>}</div></div></div>;
}

// Quinta-feira a Parte 1 fecha e a nota dela sai na hora, sem esperar domingo.
// Quem nao respondeu ve o zero: e o preco de nao ter entrado ate quarta.
function ChallengeParte1({ parte1 }) {
  if (!parte1) return null;
  const acertos = (parte1.details || []).filter(item => item.correct).length;
  const total = (parte1.details || []).length;
  const bom = parte1.concluida && parte1.score >= 300;
  return <div style={{ padding:15, marginBottom:12, borderRadius:18, background:'#fff', border:`1px solid ${parte1.concluida ? '#CFE9DC' : '#F3C9C9'}` }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
      <span style={{ color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:1.1 }}>PARTE 1 · ENCERRADA</span>
      <strong style={{ fontSize:19, color:parte1.concluida ? (bom ? '#15713A' : '#B45309') : '#B91C1C' }}>{parte1.score}<span style={{ fontSize:11, color:'#94A3B8' }}> / {parte1.maxScore}</span></strong>
    </div>
    <p style={{ margin:'6px 0 0', color:'#64748B', fontSize:12, lineHeight:1.5 }}>
      {parte1.concluida
        ? `Voce acertou ${acertos} de ${total}. A Parte 2 esta valendo ate sabado.`
        : 'Voce nao respondeu a Parte 1 ate quarta, entao ela ficou zerada. A Parte 2 ainda da tempo, ate sabado.'}
    </p>
  </div>;
}

function ChallengeHub({ challengeState, selectedChallenge, onBack, onStart, onJoinChallenge, onRefresh, onLoadSeason }) {
  const [panel, setPanel] = React.useState(null);
  if (selectedChallenge?.kind === 'private') return <ChallengePrivateHub challenge={selectedChallenge} onBack={onBack} onJoin={onJoinChallenge} />;
  const state = challengeStatus(challengeState);
  const canStart = challengeState?.phase === 'open' && challengeState?.canStart && !challengeState?.completed;
  return <div style={{ position:'fixed', inset:0, zIndex:10020, background:'#F3F7FC', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
    <div style={{ minHeight:225, padding:'calc(env(safe-area-inset-top,0px) + 14px) 18px 28px', color:'#fff', background:challengeBlue }}><div style={{ display:'flex', justifyContent:'space-between' }}><button onClick={onBack} style={challengeRoundButton}>‹</button><span style={{ fontSize:10.5, fontWeight:900, color:'#B9F2FF', letterSpacing:1.3 }}>SCIENCE ENGLISH</span><span style={{ width:36 }} /></div><div style={{ textAlign:'center', marginTop:22 }}><div style={{ fontSize:38 }}>🏆</div><div style={{ color:'#A9EEFF', fontSize:10.5, fontWeight:900, letterSpacing:1.4, marginTop:7 }}>DESAFIO SEMANAL</div><h1 style={{ fontSize:25, margin:'7px 0 5px' }}>Desafio Science English</h1><p style={{ margin:0, color:'rgba(255,255,255,.73)', fontSize:12.5 }}>O que vale é dominar o que você já estudou.</p></div></div>
    <div style={{ padding:'0 16px 28px', marginTop:-24 }}>
      {challengeState?.phase === 'results' ? <ChallengeResults state={challengeState} /> : <React.Fragment><ChallengeParte1 parte1={challengeState?.parte1} /><div style={{ padding:18, background:'#fff', border:'1px solid #DCE7F4', borderRadius:22, boxShadow:'0 12px 28px rgba(7,27,58,.1)' }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, textTransform:'uppercase' }}>{state.badge}</span><strong style={{ display:'block', color:'#071B3A', fontSize:17, marginTop:3 }}>{state.title}</strong></div>{challengeState?.part && <span style={{ padding:'7px 9px', height:'fit-content', borderRadius:10, color:'#0D5AA7', background:'#E8F3FF', fontSize:10.5, fontWeight:900 }}>PARTE {challengeState.part}</span>}</div><p style={{ color:'#64748B', fontSize:11.5, lineHeight:1.5 }}>{state.detail}</p>{canStart && <button onClick={onStart} style={{ width:'100%', border:0, borderRadius:14, padding:14, color:'#fff', background:'linear-gradient(135deg,#147AE0,#0757A5)', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>{challengeState.started ? 'CONTINUAR DESAFIO' : 'COMEÇAR DESAFIO'} →</button>}{challengeState?.completed && <div style={{ padding:12, borderRadius:13, background:'#E7F8F1', color:'#14745C', fontSize:12, fontWeight:850, textAlign:'center' }}>✓ Parte concluída e respostas confirmadas</div>}{(challengeState?.phase === 'unpublished' || challengeState?.phase === 'waiting') && <button onClick={onRefresh} style={{ width:'100%', border:'1px solid #D7E3F1', borderRadius:13, padding:12, background:'#fff', color:'#0D5AA7', fontWeight:850 }}>ATUALIZAR</button>}<div style={{ display:'flex', gap:8, marginTop:12 }}><button onClick={() => setPanel('rules')} style={{ flex:1, border:0, background:'transparent', color:'#0D5AA7', fontFamily:'inherit', fontSize:11.5, fontWeight:800 }}>Regras e pontuação</button><button onClick={() => setPanel('season')} style={{ flex:1, border:0, background:'transparent', color:'#0D5AA7', fontFamily:'inherit', fontSize:11.5, fontWeight:800 }}>Minha temporada</button></div></div></React.Fragment>}
    </div>
    {panel === 'rules' && <ChallengeRules onClose={() => setPanel(null)} />}
    {panel === 'season' && <ChallengeSeason carregar={onLoadSeason} onClose={() => setPanel(null)} />}
  </div>;
}

function ChallengeProgressPanel({ challengeState, onOpenChallenge }) {
  if (!challengeState?.enabled) return null;
  const status = challengeStatus(challengeState);
  const score = challengeState?.result?.score || 0;
  return <button onClick={onOpenChallenge} style={{ width:'100%', marginTop:11, padding:14, border:0, borderRadius:18, color:'#fff', background:challengeBlue, boxShadow:'0 9px 22px rgba(7,27,58,.16)', textAlign:'left', fontFamily:'inherit' }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><span><span style={{ color:'#A9EEFF', fontSize:8.5, fontWeight:900, letterSpacing:.8 }}>DESAFIO SCIENCE ENGLISH</span><strong style={{ display:'block', fontSize:16, marginTop:3 }}>{status.title}</strong><span style={{ display:'block', color:'rgba(255,255,255,.68)', fontSize:9.5, marginTop:3 }}>{challengeState.phase === 'results' ? `${score} pontos nesta semana` : status.detail}</span></span><span style={{ width:36, height:36, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.12)', fontSize:18 }}>🏆</span></div><span style={{ display:'block', marginTop:10, paddingTop:9, borderTop:'1px solid rgba(255,255,255,.14)', color:'#BDEFFF', fontSize:9.5, fontWeight:900 }}>ABRIR DESAFIO →</span></button>;
}

function ChallengeGame({ challengeState, onFinish, onExit, onStart, onSaveAnswer }) {
  const questions = challengeState?.round?.questions || [];
  const initialIndex = Math.min(Number(challengeState?.nextIndex || 0), Math.max(questions.length - 1, 0));
  const [phase, setPhase] = React.useState('intro');
  const [questionIndex, setQuestionIndex] = React.useState(initialIndex);
  const [answer, setAnswer] = React.useState('');
  const [seconds, setSeconds] = React.useState(CHALLENGE_TIME_SECONDS);
  const [error, setError] = React.useState('');
  const savingRef = React.useRef(false);
  const retryRef = React.useRef(null);
  const answerRef = React.useRef(''); answerRef.current = answer;
  const question = questions[questionIndex];

  const sendCurrent = React.useCallback(async () => {
    if (savingRef.current || !question) return;
    savingRef.current = true; setPhase('saving'); setError('');
    try {
      const result = await onSaveAnswer({ roundId:challengeState.round.roundId, questionId:question.id, value:answerRef.current });
      if (result?.completed || questionIndex >= questions.length - 1) { setPhase('done'); return; }
      setQuestionIndex(index => index + 1); setAnswer(''); setSeconds(CHALLENGE_TIME_SECONDS); setPhase('transition');
      setTimeout(() => setPhase('question'), 550);
    } catch (failure) {
      retryRef.current = sendCurrent;
      setError(failure?.message || 'Não foi possível salvar.'); setPhase('save-error');
    } finally { savingRef.current = false; }
  }, [question, questionIndex, questions.length, challengeState?.round?.roundId, onSaveAnswer]);

  React.useEffect(() => {
    if (phase !== 'question') return;
    const timer = setInterval(() => setSeconds(value => { if (value <= 1) { clearInterval(timer); setTimeout(sendCurrent, 0); return 0; } return value - 1; }), 1000);
    return () => clearInterval(timer);
  }, [phase, questionIndex, sendCurrent]);

  React.useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden' && phase === 'question') sendCurrent(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase, sendCurrent]);

  const start = async () => {
    setPhase('saving');
    try { const result = await onStart(challengeState.round.roundId); setQuestionIndex(Math.min(Number(result?.nextIndex || initialIndex), questions.length - 1)); setSeconds(CHALLENGE_TIME_SECONDS); setPhase('question'); }
    catch (failure) { retryRef.current = start; setError(failure?.message || 'Não foi possível iniciar.'); setPhase('save-error'); }
  };
  const close = async () => { if (phase === 'question') await sendCurrent(); onExit(); };
  const timerTone = seconds <= 10 ? '#FF7B7B' : '#5DE1FF';

  return <div style={{ position:'fixed', inset:0, zIndex:10040, maxWidth:480, margin:'0 auto', color:'#fff', background:'linear-gradient(160deg,#06162F,#071F43 54%,#092B56)', overflow:'hidden' }}>
    {phase === 'intro' && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top,0px) + 20px) 22px calc(env(safe-area-inset-bottom,0px) + 22px)' }}><button onClick={onExit} aria-label="Fechar" style={{ ...challengeRoundButton, alignSelf:'flex-end' }}>×</button><div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}><div style={{ width:76, height:76, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:24, background:'linear-gradient(145deg,#238BFF,#0A5BB4)', fontSize:37 }}>🏆</div><div style={{ color:'#7DE7FF', fontSize:10.5, fontWeight:900, letterSpacing:1.7, marginTop:24 }}>PARTE {challengeState?.part}</div><h2 style={{ fontSize:27, margin:'8px 0 10px' }}>{challengeState?.started ? 'Continue de onde parou' : 'Você está pronto?'}</h2><p style={{ color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55 }}>{questions.length} perguntas. 45 segundos para cada uma. Uma única tentativa.</p></div><button onClick={start} style={{ width:'100%', border:0, borderRadius:16, padding:16, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13.5, fontWeight:900 }}>{challengeState?.started ? 'CONTINUAR' : 'COMEÇAR AGORA'} →</button></div>}
    {phase === 'question' && question && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top,0px) + 18px) 18px calc(env(safe-area-inset-bottom,0px) + 18px)' }}><div style={{ display:'flex', alignItems:'center', gap:12 }}><div style={{ flex:1, display:'flex', gap:5 }}>{questions.map((_,i) => <span key={i} style={{ flex:1, height:4, borderRadius:4, background:i <= questionIndex ? '#5DE1FF' : 'rgba(255,255,255,.16)' }} />)}</div><strong style={{ color:timerTone, minWidth:44, textAlign:'right', fontSize:18 }}>0:{String(seconds).padStart(2,'0')}</strong></div><button onClick={close} style={{ position:'absolute', top:50, right:18, border:0, background:'transparent', color:'rgba(255,255,255,.55)', fontSize:11 }}>SAIR</button><div style={{ color:'#8DEBFF', fontSize:10, fontWeight:900, letterSpacing:1.1, marginTop:25 }}>PERGUNTA {questionIndex + 1} DE {questions.length}</div><div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}><h2 style={{ fontSize:19, lineHeight:1.38, margin:'0 0 14px' }}>{question.prompt}</h2>{question.context && <div style={{ padding:'17px 16px', borderRadius:17, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.13)', fontSize:15, lineHeight:1.45 }}>{question.context}</div>}{question.hint && <div style={{ color:'rgba(255,255,255,.52)', fontSize:10.5, marginTop:9 }}>{question.hint}</div>}{question.type === 'multipleChoice' ? <div style={{ display:'grid', gap:9, marginTop:18 }}>{question.options.map(option => <button key={option.id} onClick={() => setAnswer(option.id)} style={{ display:'flex', gap:10, alignItems:'center', padding:'13px 14px', borderRadius:14, border:`1.5px solid ${answer === option.id ? '#5DE1FF' : 'rgba(255,255,255,.18)'}`, background:answer === option.id ? 'rgba(93,225,255,.17)' : 'rgba(255,255,255,.07)', color:'#fff', textAlign:'left', fontFamily:'inherit', fontSize:13 }}><span style={{ width:25, height:25, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:answer === option.id ? '#5DE1FF' : 'rgba(255,255,255,.12)', color:answer === option.id ? '#06162F' : '#fff', fontWeight:900 }}>{option.id.toUpperCase()}</span>{option.text}</button>)}</div> : <textarea autoFocus value={answer} onChange={event => setAnswer(event.target.value)} placeholder="Digite sua resposta…" style={{ width:'100%', minHeight:112, boxSizing:'border-box', marginTop:18, padding:15, borderRadius:17, border:'1.5px solid rgba(93,225,255,.48)', fontFamily:'inherit', fontSize:15 }} />}</div><button disabled={!answer.trim()} onClick={sendCurrent} style={{ width:'100%', border:0, borderRadius:15, padding:15, color:'#06162F', background:answer.trim() ? 'linear-gradient(135deg,#5DE1FF,#E5FBFF)' : '#8CA3B9', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>ENVIAR RESPOSTA →</button></div>}
    {phase === 'transition' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}><div style={{ width:62, height:62, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'#168C72', fontSize:29 }}>✓</div><strong style={{ fontSize:18, marginTop:14 }}>Resposta confirmada</strong></div>}
    {phase === 'saving' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}><div style={{ fontSize:34 }}>↻</div><strong style={{ marginTop:14 }}>Salvando com segurança…</strong></div>}
    {phase === 'save-error' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24 }}><div style={{ fontSize:38 }}>⚠️</div><strong style={{ fontSize:20, marginTop:14 }}>Não conseguimos salvar</strong><span style={{ color:'rgba(255,255,255,.65)', fontSize:12.5, marginTop:7 }}>{error}</span><button onClick={() => retryRef.current?.()} style={{ border:0, borderRadius:14, padding:'13px 18px', marginTop:20, color:'#06162F', background:'#5DE1FF', fontFamily:'inherit', fontWeight:900 }}>TENTAR NOVAMENTE</button></div>}
    {phase === 'done' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'30px 24px' }}><div style={{ width:82, height:82, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#168C72,#35C69F)', fontSize:39 }}>✓</div><div style={{ color:'#8DEBFF', fontSize:10.5, fontWeight:900, letterSpacing:1.4, marginTop:24 }}>DESAFIO FINALIZADO</div><h2 style={{ fontSize:26, margin:'8px 0' }}>Suas respostas foram confirmadas</h2><p style={{ maxWidth:320, color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55 }}>O resultado, sua posição e as correções serão liberados no domingo.</p><button onClick={onFinish} style={{ width:'100%', maxWidth:330, border:0, borderRadius:16, padding:15, marginTop:22, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>VOLTAR AO DESAFIO</button></div>}
  </div>;
}
