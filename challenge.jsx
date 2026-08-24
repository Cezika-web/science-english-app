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
function ChallengeSeason({ carregar, initialData, onClose }) {
  const [dados, setDados] = React.useState(initialData || null);
  const [erro, setErro] = React.useState('');
  const [semanaAberta, setSemanaAberta] = React.useState(null);
  // Ref para o efeito rodar uma vez só: se dependesse de `carregar`, uma função
  // recriada a cada render deixaria o painel buscando em laço.
  const carregarRef = React.useRef(carregar);
  carregarRef.current = carregar;
  React.useEffect(() => {
    // O hub começa a buscar a temporada antes de esta tela abrir. Se o aluno
    // entrar aqui durante essa busca, initialData chega depois da montagem —
    // useState não acompanha mudanças da prop sozinho e a tela ficava presa em
    // "Carregando..." mesmo com a resposta já disponível no componente pai.
    if (initialData) {
      setDados(initialData);
      setErro('');
      return undefined;
    }
    let vivo = true;
    Promise.resolve(carregarRef.current())
      .then(resultado => { if (vivo) setDados(resultado || { minhasSemanas:[], geral:[] }); })
      .catch(falha => { if (vivo) setErro(falha?.message || 'Não foi possível carregar agora.'); });
    return () => { vivo = false; };
  }, [initialData]);

  const semanaLabel = key => {
    const [, mes, dia] = String(key || '').split('-');
    return dia && mes ? `Semana de ${dia}/${mes}` : key;
  };

  return <div className="challenge-season-screen" style={{ position:'fixed', inset:0, zIndex:10030, width:'100%', maxWidth:480, height:'100dvh', margin:'0 auto', boxSizing:'border-box', background:'#F3F7FC', overflowY:'auto', overflowX:'hidden', overscrollBehavior:'contain' }}>
    <ChallengeSubpageHeader title="Minha temporada" subtitle="Todas as semanas somadas" onClose={onClose} />
    <div className="challenge-season-content" style={{ padding:'18px 16px 32px' }}>
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

        <div style={{ marginTop:16, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Meus selos</div>
        {(dados.badges || []).length
          ? <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:9 }}>{dados.badges.map(badge => <div key={badge.id} style={{ minWidth:0, padding:'14px 10px', borderRadius:16, textAlign:'center', background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ display:'block', fontSize:30 }}>{badge.icon || '🏅'}</span><strong style={{ display:'block', color:'#173654', fontSize:11.5, lineHeight:1.3, marginTop:7 }}>{badge.title}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:9, lineHeight:1.35, marginTop:4 }}>{badge.weekKey ? `Semana ${String(badge.weekKey).slice(8,10)}/${String(badge.weekKey).slice(5,7)}` : 'Conquista acumulada'}</span></div>)}</div>
          : <div style={{ marginTop:9, padding:14, borderRadius:15, background:'#fff', border:'1px solid #DCE7F4', color:'#64748B', fontSize:11.5, lineHeight:1.5 }}>Seus selos de acertos, pontuação e vitórias aparecerão aqui.</div>}

        <ChallengeSeasonAnalytics analytics={dados.analytics} />

        <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Suas semanas</div>
        {dados.minhasSemanas.length
          ? <div style={{ display:'grid', gap:7, marginTop:9 }}>{dados.minhasSemanas.map(semana => {
              const aberta = semanaAberta === semana.weekKey;
              return <div key={semana.weekKey} style={{ borderRadius:14, background:'#fff', border:'1px solid #DCE7F4', overflow:'hidden' }}>
                <button type="button" onClick={() => setSemanaAberta(aberta ? null : semana.weekKey)} aria-expanded={aberta} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'11px 12px', border:0, background:'#fff', fontFamily:'inherit', textAlign:'left' }}>
                  <span style={{ flex:1, minWidth:0 }}>
                    <strong style={{ display:'block', color:'#213B5B', fontSize:12.5 }}>{semanaLabel(semana.weekKey)}</strong>
                    <span style={{ color:'#64748B', fontSize:10.5 }}>{semana.position}º entre {semana.participantes} · {semana.partesFeitas || 0} de 2 partes</span>
                  </span>
                  <strong style={{ color:'#0D5AA7', fontSize:13 }}>{Number(semana.score || 0).toLocaleString('pt-BR')}</strong>
                  <span style={{ color:'#8293A7', fontSize:16 }}>{aberta ? '⌃' : '⌄'}</span>
                </button>
                {aberta && <ChallengeSeasonAnswers partes={semana.partes || []} />}
              </div>;
            })}</div>
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

function ChallengeSeasonAnswers({ partes = [] }) {
  if (!partes.length) return <div style={{ padding:'11px 12px', borderTop:'1px solid #E6EDF5', color:'#64748B', fontSize:11.5 }}>As respostas desta semana ainda não estão disponíveis.</div>;
  return <div style={{ padding:'4px 12px 12px', borderTop:'1px solid #E6EDF5', background:'#F8FBFF' }}>
    {partes.map(parte => <div key={parte.part} style={{ marginTop:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', color:'#0D5AA7', fontSize:10.5, fontWeight:900 }}><span>PARTE {parte.part}</span><span>{parte.score} / {parte.maxScore} PTS</span></div>
      <div style={{ display:'grid', gap:7, marginTop:7 }}>{(parte.details || []).map((detail, index) => {
        const parcial = detail.parcial === true || (!detail.correct && Number(detail.score || 0) > 0);
        const tone = detail.correct ? '#168C72' : parcial ? '#A7630B' : '#B33A3A';
        return <div key={detail.questionId || index} style={{ padding:10, borderRadius:11, border:'1px solid #DCE7F4', background:'#fff', color:'#53677E', fontSize:10.5, lineHeight:1.45 }}>
          <div style={{ display:'flex', gap:7, alignItems:'flex-start' }}><span>{detail.correct ? '✅' : parcial ? '🟡' : '❌'}</span><strong style={{ flex:1, color:'#213B5B' }}>{detail.prompt}</strong><strong style={{ color:tone }}>{detail.score}</strong></div>
          {detail.context && <div style={{ marginTop:6, color:'#7B8DA3', fontStyle:'italic' }}>{detail.context}</div>}
          {detail.type === 'multipleChoice' && (detail.options || []).length > 0 && <div style={{ display:'grid', gap:5, marginTop:8 }}>{detail.options.map(option => {
            const selected = String(detail.selectedOptionId || '') === String(option.id || '') || (!detail.selectedOptionId && String(option.text || '').trim().toLowerCase() === String(detail.answer || '').trim().toLowerCase());
            const correta = String(option.text || '').trim().toLowerCase() === String(detail.expected || '').trim().toLowerCase();
            const border = correta ? '#86D7B8' : selected ? '#F0A69A' : '#DCE7F4';
            const background = correta ? '#EAF9F3' : selected ? '#FFF1EE' : '#F8FAFC';
            const color = correta ? '#126B51' : selected ? '#A43B2E' : '#53677E';
            return <div key={option.id} style={{ display:'flex', gap:7, alignItems:'center', padding:'7px 8px', borderRadius:9, border:`1px solid ${border}`, background, color }}>
              <strong style={{ width:19, height:19, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', background:correta ? '#BCEBDB' : selected ? '#FFD5CE' : '#E8EEF5', fontSize:9 }}>{String(option.id || '').toUpperCase()}</strong>
              <span style={{ flex:1 }}>{option.text}</span>
              {correta && <strong>✓ correta</strong>}{selected && !correta && <strong>marcou</strong>}
            </div>;
          })}</div>}
          <div style={{ marginTop:7 }}><strong>Sua resposta:</strong> {detail.answer || 'Sem resposta'}</div>
          <div style={{ marginTop:3 }}><strong>Resposta correta:</strong> {detail.expected || '—'}</div>
          {detail.explanation && <div style={{ marginTop:6, padding:'7px 8px', borderRadius:8, background:'#F2F6FA' }}><strong>Por quê:</strong> {detail.explanation}</div>}
        </div>;
      })}</div>
    </div>)}
  </div>;
}

function ChallengeSeasonAnalytics({ analytics = {} }) {
  const evolution = analytics.evolucao || [];
  const maxScore = Math.max(...evolution.map(item => Number(item.score || 0)), 1);
  return <div style={{ marginTop:16 }}>
    <div style={{ fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Seu desempenho</div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:9 }}>
      {[
        ['Perguntas',analytics.respondidas || 0],
        ['Erros',analytics.erros || 0],
        ['% de erro',`${analytics.percentualErro || 0}%`],
      ].map(([label,value]) => <div key={label} style={{ padding:'13px 6px', textAlign:'center', borderRadius:14, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:17 }}>{value}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:9.5, marginTop:3 }}>{label}</span></div>)}
    </div>
    <div style={{ marginTop:10, padding:14, borderRadius:16, background:'#fff', border:'1px solid #DCE7F4' }}>
      <strong style={{ color:'#213B5B', fontSize:12.5 }}>Evolução semanal</strong>
      {evolution.length ? <div style={{ height:96, display:'flex', alignItems:'flex-end', gap:8, marginTop:12 }}>{evolution.map(item => <div key={item.weekKey} style={{ flex:1, minWidth:0, textAlign:'center' }}><strong style={{ display:'block', color:'#0D5AA7', fontSize:9.5, marginBottom:4 }}>{item.score}</strong><div style={{ height:Math.max(12,Math.round(Number(item.score || 0) / maxScore * 58)), borderRadius:'7px 7px 3px 3px', background:'linear-gradient(180deg,#5DE1FF,#147AE0)' }} /><span style={{ display:'block', color:'#7B8DA3', fontSize:8, marginTop:4 }}>{String(item.weekKey).slice(5)}</span></div>)}</div> : <p style={{ color:'#7B8DA3', fontSize:11, lineHeight:1.5, margin:'9px 0 0' }}>O gráfico começa a ganhar forma conforme novas semanas forem concluídas.</p>}
    </div>
    <div style={{ marginTop:10, padding:14, borderRadius:16, background:'#fff', border:'1px solid #DCE7F4' }}>
      <strong style={{ color:'#213B5B', fontSize:12.5 }}>Principais erros</strong>
      {(analytics.principaisErros || []).length ? <div style={{ display:'grid', gap:7, marginTop:10 }}>{analytics.principaisErros.map(item => <div key={item.tema} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 10px', borderRadius:11, background:'#FFF7F3' }}><span style={{ flex:1, minWidth:0, color:'#6B3E31', fontSize:10.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.tema}</span><strong style={{ color:'#B33A3A', fontSize:11 }}>{item.quantidade}×</strong></div>)}</div> : <p style={{ color:'#7B8DA3', fontSize:11, margin:'9px 0 0' }}>Ainda não há erros suficientes para identificar um padrão.</p>}
    </div>
  </div>;
}

function ChallengeRanking({ ranking = [], privateMode = false }) {
  if (!ranking.length) return <div style={{ padding:20, color:'#7B8DA3', fontSize:11.5, textAlign:'center' }}>{privateMode ? 'Você ainda não tem posição nesta semana.' : 'Nenhuma classificação disponível ainda.'}</div>;
  const podiumGroups = [2,1,3].map(position => ({ position, people:ranking.filter(row => row.position === position) }));
  const others = ranking.filter(row => row.position > 3);
  return <div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:6, alignItems:'end', padding:'10px 2px 0' }}>
      {podiumGroups.map(group => <ChallengePodiumPlace key={group.position} position={group.position} people={group.people} />)}
    </div>
    {others.length > 0 && <div style={{ display:'grid', gap:7, marginTop:11 }}>{others.map((row,index) => <div key={`${row.position}-${row.name}-${index}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13, background:row.isOwn ? '#E9F5FF' : '#F7FAFD', border:`1px solid ${row.isOwn ? '#82C3F3' : '#E5EDF5'}` }}><span style={{ width:26, textAlign:'center', fontWeight:900, color:row.isOwn ? '#0D5AA7' : '#64748B' }}>{row.position}º</span><ChallengeAvatar person={row} size={34} /><span style={{ flex:1, minWidth:0 }}><strong style={{ display:'block', color:row.isOwn ? '#0D3F82' : '#213B5B', fontSize:12, fontWeight:row.isOwn ? 900 : 750, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.name}{row.isOwn ? ' · você' : ''}</strong><ChallengePartScores row={row} /></span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{Number(row.score || 0).toLocaleString('pt-BR')} <small>PTS</small></strong></div>)}</div>}
  </div>;
}

function ChallengePartScores({ row = {}, centered = false }) {
  if (row.part1Score == null && row.part2Score == null) return null;
  return <span style={{ display:'block', color:'#70839A', fontSize:centered ? 7.5 : 9, marginTop:3, textAlign:centered ? 'center' : 'left', whiteSpace:'nowrap' }}>P1 {Number(row.part1Score || 0)} · P2 {Number(row.part2Score || 0)}</span>;
}

function ChallengeAvatar({ person = {}, size = 46 }) {
  const [failed, setFailed] = React.useState(false);
  const initial = String(person.name || '?').trim().charAt(0).toUpperCase() || '?';
  const style = { width:size, height:size, flexShrink:0, borderRadius:'50%', border:'3px solid #fff', boxShadow:'0 4px 12px rgba(7,27,58,.16)', objectFit:'cover', background:'#DCE9F5' };
  return person.photo && !failed
    ? <img src={person.photo} alt={`Foto de ${person.name || 'participante'}`} onError={() => setFailed(true)} style={style} />
    : <span aria-label={`${person.name || 'Participante'} sem foto`} style={{ ...style, display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#52708F', fontSize:Math.round(size * .38), fontWeight:900 }}>{initial}</span>;
}

function challengeCompactName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts[0] || '—';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

function ChallengePodiumPlace({ position, people = [] }) {
  const config = {
    1:{ medal:'🥇', height:82, color:'#F4C84A', background:'linear-gradient(180deg,#FFE88C,#EAB52F)' },
    2:{ medal:'🥈', height:61, color:'#AEB9C7', background:'linear-gradient(180deg,#E7EDF3,#AAB7C7)' },
    3:{ medal:'🥉', height:46, color:'#C9864B', background:'linear-gradient(180deg,#E9B27A,#BD7540)' },
  }[position];
  const shown = people.slice(0, 3);
  const hiddenPeers = people.reduce((total, person) => total + Number(person.hiddenPeers || 0), 0);
  const topScore = people[0]?.score || 0;
  return <div style={{ minWidth:0, textAlign:'center', opacity:people.length ? 1 : .42 }}>
    <div style={{ minHeight:78, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end' }}>
      <div style={{ display:'flex', justifyContent:'center', paddingLeft:shown.length > 1 ? 12 : 0 }}>{shown.map((person,index) => <span key={`${person.name}-${index}`} title={person.name} style={{ marginLeft:index ? -12 : 0, position:'relative', zIndex:shown.length-index }}><ChallengeAvatar person={person} size={position === 1 ? 54 : 46} /></span>)}</div>
      {(hiddenPeers > 0 || people.length > 3) && <span style={{ marginTop:-8, zIndex:5, padding:'2px 6px', borderRadius:999, background:'#0D3F82', color:'#fff', fontSize:8, fontWeight:900 }}>+{hiddenPeers || people.length - 3}</span>}
      <strong style={{ display:'block', width:'100%', marginTop:5, color:'#173654', fontSize:9.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{people.length ? people.map(person => challengeCompactName(person.name)).join(' · ') : '—'}</strong>
      <span style={{ display:'block', color:'#0D5AA7', fontSize:9, fontWeight:900 }}>{Number(topScore).toLocaleString('pt-BR')} PTS</span>
      {people.length === 1 && <ChallengePartScores row={people[0]} centered />}
      {people.length > 1 && people.some(person => person.part1Score != null || person.part2Score != null) && <span style={{ display:'block', color:'#70839A', fontSize:7, lineHeight:1.35, marginTop:3 }}>{people.slice(0,3).map(person => `${challengeCompactName(person.name)}: P1 ${Number(person.part1Score || 0)} · P2 ${Number(person.part2Score || 0)}`).join(' | ')}</span>}
    </div>
    <div style={{ height:config.height, display:'flex', alignItems:'flex-start', justifyContent:'center', marginTop:5, paddingTop:9, borderRadius:'10px 10px 3px 3px', color:'#fff', background:config.background, boxShadow:'inset 0 1px rgba(255,255,255,.45)' }}><strong style={{ fontSize:20, textShadow:'0 1px 2px rgba(0,0,0,.18)' }}>{config.medal}<span style={{ display:'block', fontSize:10, marginTop:2 }}>{position}º LUGAR</span></strong></div>
  </div>;
}

function ChallengeRankingsHome({ data, loading, error }) {
  const [period, setPeriod] = React.useState('semana');
  const [monthKey, setMonthKey] = React.useState('');
  const periods = data?.rankings || {};
  const months = data?.meses || [];
  React.useEffect(() => {
    if (months.length && !months.some(month => month.key === monthKey)) setMonthKey(months[0].key);
  }, [data, monthKey]);
  const selectedMonth = months.find(month => month.key === monthKey) || months[0] || null;
  const selected = period === 'mes' && selectedMonth
    ? { ...(periods.mes || {}), rows:selectedMonth.rows || [] }
    : (periods[period] || { rows:[] });
  const own = key => (key === 'mes' && selectedMonth ? selectedMonth.rows : periods[key]?.rows)?.find(row => row.isOwn) || {};
  const weekLabel = key => {
    const [,month,day] = String(key || '').split('-');
    return day && month ? `Semana de ${day}/${month}` : key;
  };
  return <div style={{ padding:16, borderRadius:20, background:'#fff', border:'1px solid #DCE7F4', boxShadow:'0 10px 24px rgba(7,27,58,.08)' }}>
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}><div><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:1, textTransform:'uppercase' }}>Classificação</span><strong style={{ display:'block', color:'#071B3A', fontSize:17, marginTop:3 }}>Onde você está agora</strong></div>{selected.partial && <span style={{ padding:'6px 8px', borderRadius:9, background:'#FFF4D8', color:'#906100', fontSize:8.5, fontWeight:900 }}>{selected.locked ? 'EM ANDAMENTO' : 'PARCIAL'}</span>}</div>
    {loading && <div style={{ padding:22, textAlign:'center', color:'#7B8DA3', fontSize:11.5 }}>Carregando posições…</div>}
    {error && <div style={{ marginTop:10, padding:11, borderRadius:12, background:'#FFF1F2', color:'#B3261E', fontSize:11 }}>{error}</div>}
    {data && <React.Fragment>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7, marginTop:13 }}>{[['semana','Semana'],['mes','Mês'],['ano','Ano']].map(([key,label]) => <button key={key} onClick={() => setPeriod(key)} style={{ padding:'11px 4px', borderRadius:13, border:`1px solid ${period === key ? '#82C3F3' : '#E1E9F2'}`, background:period === key ? '#EAF5FF' : '#F8FAFC', fontFamily:'inherit' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:17 }}>{own(key).position ? `${own(key).position}º` : '—'}</strong><span style={{ display:'block', color:'#70839A', fontSize:9, marginTop:3 }}>{label}</span></button>)}</div>
      <div style={{ display:'flex', padding:4, marginTop:12, borderRadius:13, background:'#E5EDF6' }}>{[['semana','Semana'],['mes','Mês'],['ano','Ano']].map(([key,label]) => <button key={key} onClick={() => setPeriod(key)} style={{ flex:1, padding:8, border:0, borderRadius:10, background:period === key ? '#fff' : 'transparent', color:period === key ? '#0D3F82' : '#70839A', fontFamily:'inherit', fontSize:10.5, fontWeight:900 }}>{label}</button>)}</div>
      {period === 'mes' && months.length > 0 && <div style={{ display:'flex', gap:7, overflowX:'auto', marginTop:10, paddingBottom:2 }}>{months.map(month => <button key={month.key} onClick={() => setMonthKey(month.key)} style={{ flex:'0 0 auto', border:`1px solid ${selectedMonth?.key === month.key ? '#82C3F3' : '#DCE7F4'}`, borderRadius:999, padding:'7px 11px', background:selectedMonth?.key === month.key ? '#EAF5FF' : '#fff', color:'#0D3F82', fontFamily:'inherit', fontSize:10, fontWeight:900, textTransform:'capitalize' }}>{month.label}</button>)}</div>}
      {selected.private && <div style={{ marginTop:9, padding:'9px 11px', borderRadius:11, background:'#F0F7FF', color:'#41617F', fontSize:10, lineHeight:1.45 }}>Até domingo, somente sua posição e seus pontos ficam visíveis. Os outros participantes permanecem ocultos.</div>}
      {period === 'mes' && selectedMonth && <div style={{ marginTop:12, color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Ranking geral de {selectedMonth.label}</div>}
      {selected.locked && !(selected.rows || []).length
        ? <div style={{ marginTop:9, padding:'18px 14px', borderRadius:15, background:'#F7FAFD', border:'1px solid #E1E9F2', color:'#64748B', fontSize:11.5, lineHeight:1.55, textAlign:'center' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:13 }}>Classificação semanal zerada</strong>Ninguém ocupa o pódio enquanto a semana está em andamento. O ranking oficial entra no fechamento.</div>
        : <div style={{ marginTop:9 }}><ChallengeRanking ranking={selected.rows || []} privateMode={selected.private === true} /></div>}
      {period === 'mes' && selectedMonth && <div style={{ marginTop:16 }}>
        <div style={{ color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Semanas de {selectedMonth.label}</div>
        <div style={{ display:'grid', gap:7, marginTop:8 }}>{(selectedMonth.semanas || []).map(week => <div key={week.weekKey} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:13, background:'#F7FAFD', border:'1px solid #E1E9F2' }}>
          <span style={{ flex:1, minWidth:0 }}><strong style={{ display:'block', color:'#213B5B', fontSize:11.5 }}>{weekLabel(week.weekKey)}</strong><span style={{ display:'block', color:'#70839A', fontSize:9.5, marginTop:2 }}>{week.fechada ? `${(week.lideres || []).join(' · ') || 'Sem vencedor'} · ${week.participantes} participante(s)` : 'Em andamento · classificação zerada'}</span></span>
          <strong style={{ color:week.fechada ? '#0D5AA7' : '#94A3B8', fontSize:11 }}>{Number(week.pontos || 0).toLocaleString('pt-BR')} PTS</strong>
        </div>)}</div>
      </div>}
    </React.Fragment>}
  </div>;
}

function ChallengeResults({ state }) {
  const result = state.result || { score:0, maxScore:1000, parts:[] };
  const [openQuestion, setOpenQuestion] = React.useState(null);
  return <div>
    <div style={{ padding:18, borderRadius:20, color:'#fff', background:challengeBlue }}><span style={{ color:'#A9EEFF', fontSize:9.5, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>Seu resultado semanal</span><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginTop:8 }}><span><strong style={{ fontSize:30 }}>{Number(result.score).toLocaleString('pt-BR')}</strong><small style={{ marginLeft:4, color:'#BDEFFF' }}>de {result.maxScore} PTS</small></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', fontSize:22 }}>{result.position ? `${result.position}º` : '—'}</strong><small style={{ color:'#BDEFFF' }}>posição</small></span></div></div>
    {result.parts.map(part => <div key={part.part} style={{ marginTop:13, padding:14, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><div style={{ display:'flex', justifyContent:'space-between' }}><strong style={{ color:'#0D3F82' }}>Parte {part.part}</strong><strong style={{ color:'#168C72' }}>{part.score} PTS</strong></div><div style={{ display:'grid', gap:7, marginTop:10 }}>{(part.details || []).map((detail,index) => {
      const key = `${part.part}-${index}`, open = openQuestion === key;
      const partial = detail.parcial === true || (!detail.correct && Number(detail.score || 0) > 0);
      const tone = detail.correct ? '#168C72' : partial ? '#B87316' : '#B33A3A';
      return <div key={key} style={{ border:`1px solid ${detail.correct ? '#B8E8D5' : partial ? '#F2D18A' : '#F0D1C8'}`, borderRadius:13, overflow:'hidden' }}><button onClick={() => setOpenQuestion(open ? null : key)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:11, border:0, background:detail.correct ? '#F1FBF7' : partial ? '#FFF8EA' : '#FFF7F3', textAlign:'left', fontFamily:'inherit' }}><span>{detail.correct ? '✅' : partial ? '🟡' : '❌'}</span><span style={{ flex:1, color:'#213B5B', fontSize:11.5, fontWeight:750 }}>{detail.prompt}</span><strong style={{ color:tone }}>{detail.score}</strong></button>{open && <div style={{ padding:11, color:'#53677E', fontSize:11, lineHeight:1.5 }}><div><strong>Sua resposta:</strong> {detail.answer || 'Sem resposta'}</div><div style={{ marginTop:5 }}><strong>Resposta correta:</strong> {detail.expected}</div>{partial && <div style={{ marginTop:5, color:'#9A5B10', fontWeight:800 }}>Acerto parcial: as partes corretas da frase foram pontuadas.</div>}{detail.explanation && <div style={{ marginTop:5 }}><strong>Explicação:</strong> {detail.explanation}</div>}</div>}</div>;
    })}</div></div>)}
  </div>;
}

function ChallengePrivateHub({ challenge, onBack, onJoin }) {
  return <div style={{ position:'fixed', inset:0, zIndex:10020, maxWidth:480, margin:'0 auto', background:'#F3F7FC', overflowY:'auto' }}><div style={{ padding:'calc(env(safe-area-inset-top,0px) + 14px) 18px 30px', color:'#fff', background:'linear-gradient(135deg,#073D43,#087982,#20A9A0)' }}><button onClick={onBack} style={challengeRoundButton}>‹</button><div style={{ textAlign:'center', marginTop:20 }}><div style={{ fontSize:36 }}>⚔️</div><h1 style={{ fontSize:23 }}>{challenge?.title || 'Desafio da turma'}</h1><p style={{ color:'rgba(255,255,255,.75)' }}>{challenge?.participantLabel || `${challenge?.participantCount || 2} participantes`}</p></div></div><div style={{ margin:-20, marginTop:-20, padding:36 }}><div style={{ padding:17, borderRadius:20, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ color:'#0D3F82' }}>Desafio coletivo cadastrado</strong><p style={{ color:'#64748B', fontSize:12, lineHeight:1.5 }}>As rodadas coletivas serão ativadas depois do lançamento do desafio geral.</p>{!challenge?.joined && <button onClick={() => onJoin?.(challenge)} style={{ width:'100%', border:0, borderRadius:13, padding:13, background:'#087982', color:'#fff', fontWeight:900 }}>PARTICIPAR</button>}</div></div></div>;
}

// Quinta-feira a Parte 1 fecha e a nota dela sai na hora, sem esperar domingo.
// Quem nao respondeu ve o zero: e o preco de nao ter entrado ate quarta.
function ChallengeParte1({ parte1 }) {
  const [openQuestion, setOpenQuestion] = React.useState(null);
  if (!parte1) return null;
  const acertos = (parte1.details || []).filter(item => item.correct).length;
  const total = (parte1.details || []).length;
  const bom = parte1.concluida && parte1.score >= 300;
  return <div style={{ padding:15, marginTop:12, borderRadius:18, background:'#fff', border:`1px solid ${parte1.concluida ? '#CFE9DC' : '#F3C9C9'}` }}>
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', gap:10 }}>
      <span style={{ color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:1.1 }}>PARTE 1 · ENCERRADA</span>
      <strong style={{ fontSize:19, color:parte1.concluida ? (bom ? '#15713A' : '#B45309') : '#B91C1C' }}>{parte1.score}<span style={{ fontSize:11, color:'#94A3B8' }}> / {parte1.maxScore}</span></strong>
    </div>
    <p style={{ margin:'6px 0 0', color:'#64748B', fontSize:12, lineHeight:1.5 }}>
      {parte1.concluida
        ? `Você acertou ${acertos} de ${total}. Confira cada pergunta abaixo.`
        : 'Você não respondeu a Parte 1 até quarta, então ela ficou zerada. A Parte 2 ainda dá tempo, até sábado.'}
    </p>
    {(parte1.details || []).length > 0 && <div style={{ display:'grid', gap:7, marginTop:11 }}>{parte1.details.map((detail,index) => {
      const open = openQuestion === index;
      const partial = detail.parcial === true || (!detail.correct && Number(detail.score || 0) > 0);
      const tone = detail.correct ? '#168C72' : partial ? '#B87316' : '#B33A3A';
      return <div key={detail.questionId || index} style={{ border:`1px solid ${detail.correct ? '#B8E8D5' : partial ? '#F2D18A' : '#F0D1C8'}`, borderRadius:13, overflow:'hidden' }}><button onClick={() => setOpenQuestion(open ? null : index)} style={{ width:'100%', display:'flex', alignItems:'center', gap:9, padding:11, border:0, background:detail.correct ? '#F1FBF7' : partial ? '#FFF8EA' : '#FFF7F3', textAlign:'left', fontFamily:'inherit' }}><span>{detail.correct ? '✅' : partial ? '🟡' : '❌'}</span><span style={{ flex:1, minWidth:0, color:'#213B5B', fontSize:11.5, fontWeight:750 }}>Pergunta {index + 1}{partial ? ' · parcial' : ''}</span><strong style={{ color:tone }}>{detail.score} PTS</strong><span style={{ color:'#8293A7' }}>{open ? '⌃' : '⌄'}</span></button>{open && <div style={{ padding:11, color:'#53677E', fontSize:11, lineHeight:1.5 }}><strong style={{ display:'block', color:'#213B5B', marginBottom:7 }}>{detail.prompt}</strong><div><strong>Sua resposta:</strong> {detail.answer || 'Sem resposta'}</div><div style={{ marginTop:5 }}><strong>Resposta correta:</strong> {detail.expected}</div>{partial && <div style={{ marginTop:5, color:'#9A5B10', fontWeight:800 }}>As partes corretas da frase receberam pontos.</div>}{detail.explanation && <div style={{ marginTop:7, padding:'8px 9px', borderRadius:9, background:'#F4F7FA' }}><strong>Por quê:</strong> {detail.explanation}</div>}</div>}</div>;
    })}</div>}
  </div>;
}

function ChallengeHub({ challengeState, selectedChallenge, onBack, onStart, onJoinChallenge, onRefresh, onLoadSeason }) {
  const [panel, setPanel] = React.useState(null);
  const [seasonData, setSeasonData] = React.useState(null);
  const [seasonError, setSeasonError] = React.useState('');
  const loadSeasonRef = React.useRef(onLoadSeason);
  loadSeasonRef.current = onLoadSeason;
  React.useEffect(() => {
    if (selectedChallenge?.kind === 'private') return undefined;
    let alive = true;
    Promise.resolve(loadSeasonRef.current()).then(data => { if (alive) setSeasonData(data); })
      .catch(error => { if (alive) setSeasonError(error?.message || 'Não foi possível carregar as posições.'); });
    return () => { alive = false; };
  }, [selectedChallenge?.kind]);
  if (selectedChallenge?.kind === 'private') return <ChallengePrivateHub challenge={selectedChallenge} onBack={onBack} onJoin={onJoinChallenge} />;
  // Temporada é uma tela, não um painel por cima do hub. Renderizar só ela
  // impede o conteúdo anterior de reaparecer atrás no desktop durante o scroll.
  if (panel === 'season') return <ChallengeSeason carregar={onLoadSeason} initialData={seasonData} onClose={() => setPanel(null)} />;
  const state = challengeStatus(challengeState);
  const canStart = challengeState?.phase === 'open' && challengeState?.canStart && !challengeState?.completed;
  return <div className="challenge-hub-screen" style={{ position:'fixed', inset:0, zIndex:10020, background:'#F3F7FC', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
    <div style={{ minHeight:174, padding:'calc(env(safe-area-inset-top,0px) + 14px) 18px 26px', color:'#fff', background:challengeBlue }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><button onClick={onBack} style={challengeRoundButton}>‹</button><span style={{ fontSize:10.5, fontWeight:900, color:'#B9F2FF', letterSpacing:1.3 }}>SCIENCE ENGLISH</span><button onClick={() => setPanel('rules')} aria-label="Regras" style={{ ...challengeRoundButton, fontSize:15 }}>?</button></div><div style={{ marginTop:20 }}><div style={{ color:'#A9EEFF', fontSize:9.5, fontWeight:900, letterSpacing:1.3 }}>🏆 DESAFIO SCIENCE ENGLISH</div><h1 style={{ fontSize:23, margin:'6px 0 3px' }}>Classificação e desafio</h1><p style={{ margin:0, color:'rgba(255,255,255,.73)', fontSize:11.5 }}>Veja sua posição e acompanhe sua evolução.</p></div></div>
    <div className="challenge-hub-content" style={{ padding:'0 16px 28px', marginTop:-24 }}>
      <ChallengeRankingsHome data={seasonData} loading={!seasonData && !seasonError} error={seasonError} />
      <div className="challenge-hub-actions">
        {challengeState?.phase === 'results' ? <div style={{ marginTop:12 }}><ChallengeResults state={challengeState} /></div> : <React.Fragment><div style={{ marginTop:12, padding:18, background:'#fff', border:'1px solid #DCE7F4', borderRadius:20 }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><div><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, textTransform:'uppercase' }}>{state.badge}</span><strong style={{ display:'block', color:'#071B3A', fontSize:17, marginTop:3 }}>{state.title}</strong></div>{challengeState?.part && <span style={{ padding:'7px 9px', height:'fit-content', borderRadius:10, color:'#0D5AA7', background:'#E8F3FF', fontSize:10.5, fontWeight:900 }}>PARTE {challengeState.part}</span>}</div><p style={{ color:'#64748B', fontSize:11.5, lineHeight:1.5 }}>{state.detail}</p>{canStart && <button onClick={onStart} style={{ width:'100%', border:0, borderRadius:14, padding:14, color:'#fff', background:'linear-gradient(135deg,#147AE0,#0757A5)', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>{challengeState.started ? 'CONTINUAR DESAFIO' : 'COMEÇAR DESAFIO'} →</button>}{challengeState?.completed && <div style={{ padding:12, borderRadius:13, background:'#E7F8F1', color:'#14745C', fontSize:12, fontWeight:850, textAlign:'center' }}>✓ Parte concluída e respostas confirmadas</div>}{(challengeState?.phase === 'unpublished' || challengeState?.phase === 'waiting') && <button onClick={onRefresh} style={{ width:'100%', border:'1px solid #D7E3F1', borderRadius:13, padding:12, background:'#fff', color:'#0D5AA7', fontWeight:850 }}>ATUALIZAR</button>}</div><ChallengeParte1 parte1={challengeState?.parte1} /></React.Fragment>}
        <button onClick={() => setPanel('season')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, marginTop:12, padding:'14px 15px', borderRadius:17, border:'1px solid #DCE7F4', background:'#fff', fontFamily:'inherit', textAlign:'left' }}><span style={{ width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:'#E7F3FF', fontSize:20 }}>📊</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#071B3A', fontSize:13.5 }}>Minha temporada</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10.5, marginTop:2 }}>Gráfico, erros, porcentagem e histórico</span></span><span style={{ color:'#8EA0B5', fontSize:20 }}>›</span></button>
      </div>
    </div>
    {panel === 'rules' && <ChallengeRules onClose={() => setPanel(null)} />}
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

  const sendCurrent = React.useCallback(async (allowBlank = false) => {
    if (savingRef.current || !question) return;
    if (!allowBlank && !answerRef.current.trim()) return;
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
    const timer = setInterval(() => setSeconds(value => {
      if (value <= 1) {
        clearInterval(timer);
        if (answerRef.current.trim()) setTimeout(() => sendCurrent(false), 0);
        else setError('O tempo acabou, mas não enviamos uma resposta vazia. Digite sua resposta ou toque em Pular.');
        return 0;
      }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [phase, questionIndex, sendCurrent]);

  React.useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'hidden' && phase === 'question') sendCurrent(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [phase, sendCurrent]);

  const start = async () => {
    setPhase('saving');
    try { const result = await onStart(challengeState.round.roundId); setQuestionIndex(Math.min(Number(result?.nextIndex || initialIndex), questions.length - 1)); setSeconds(CHALLENGE_TIME_SECONDS); setPhase('question'); }
    catch (failure) { retryRef.current = start; setError(failure?.message || 'Não foi possível iniciar.'); setPhase('save-error'); }
  };
  const close = async () => { if (phase === 'question') await sendCurrent(false); onExit(); };
  const timerTone = seconds <= 10 ? '#FF7B7B' : '#5DE1FF';

  return <div style={{ position:'fixed', inset:0, zIndex:10040, maxWidth:480, margin:'0 auto', color:'#fff', background:'linear-gradient(160deg,#06162F,#071F43 54%,#092B56)', overflow:'hidden' }}>
    {phase === 'intro' && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top,0px) + 20px) 22px calc(env(safe-area-inset-bottom,0px) + 22px)' }}><button onClick={onExit} aria-label="Fechar" style={{ ...challengeRoundButton, alignSelf:'flex-end' }}>×</button><div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}><div style={{ width:76, height:76, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:24, background:'linear-gradient(145deg,#238BFF,#0A5BB4)', fontSize:37 }}>🏆</div><div style={{ color:'#7DE7FF', fontSize:10.5, fontWeight:900, letterSpacing:1.7, marginTop:24 }}>PARTE {challengeState?.part}</div><h2 style={{ fontSize:27, margin:'8px 0 10px' }}>{challengeState?.started ? 'Continue de onde parou' : 'Você está pronto?'}</h2><p style={{ color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55 }}>{questions.length} perguntas. 45 segundos para cada uma. Uma única tentativa.</p></div><button onClick={start} style={{ width:'100%', border:0, borderRadius:16, padding:16, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13.5, fontWeight:900 }}>{challengeState?.started ? 'CONTINUAR' : 'COMEÇAR AGORA'} →</button></div>}
    {phase === 'question' && question && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top,0px) + 18px) 18px calc(env(safe-area-inset-bottom,0px) + 18px)' }}><div style={{ display:'flex', alignItems:'center', gap:12 }}><div style={{ flex:1, display:'flex', gap:5 }}>{questions.map((_,i) => <span key={i} style={{ flex:1, height:4, borderRadius:4, background:i <= questionIndex ? '#5DE1FF' : 'rgba(255,255,255,.16)' }} />)}</div><strong style={{ color:timerTone, minWidth:44, textAlign:'right', fontSize:18 }}>0:{String(seconds).padStart(2,'0')}</strong></div><button onClick={close} style={{ position:'absolute', top:50, right:18, border:0, background:'transparent', color:'rgba(255,255,255,.55)', fontSize:11 }}>SAIR</button><div style={{ color:'#8DEBFF', fontSize:10, fontWeight:900, letterSpacing:1.1, marginTop:25 }}>PERGUNTA {questionIndex + 1} DE {questions.length}</div><div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', minHeight:0, overflowY:'auto' }}><h2 style={{ fontSize:19, lineHeight:1.38, margin:'0 0 14px' }}>{question.prompt}</h2>{question.context && <div style={{ padding:'17px 16px', borderRadius:17, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.13)', fontSize:15, lineHeight:1.45 }}>{question.context}</div>}{question.hint && <div style={{ color:'rgba(255,255,255,.52)', fontSize:10.5, marginTop:9 }}>{question.hint}</div>}{question.type === 'multipleChoice' ? <div style={{ display:'grid', gap:9, marginTop:18 }}>{question.options.map(option => <button key={option.id} onClick={() => { setAnswer(option.id); setError(''); }} style={{ display:'flex', gap:10, alignItems:'center', padding:'13px 14px', borderRadius:14, border:`1.5px solid ${answer === option.id ? '#5DE1FF' : 'rgba(255,255,255,.18)'}`, background:answer === option.id ? 'rgba(93,225,255,.17)' : 'rgba(255,255,255,.07)', color:'#fff', textAlign:'left', fontFamily:'inherit', fontSize:13 }}><span style={{ width:25, height:25, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', background:answer === option.id ? '#5DE1FF' : 'rgba(255,255,255,.12)', color:answer === option.id ? '#06162F' : '#fff', fontWeight:900 }}>{option.id.toUpperCase()}</span>{option.text}</button>)}</div> : <textarea autoFocus inputMode="text" enterKeyHint="done" value={answer} onChange={event => { setAnswer(event.target.value); setError(''); }} onFocus={event => { const field=event.currentTarget; setTimeout(() => field.scrollIntoView({ block:'center', behavior:'smooth' }), 150); }} placeholder="Toque aqui e digite sua resposta…" style={{ width:'100%', minHeight:120, boxSizing:'border-box', marginTop:18, padding:15, borderRadius:17, border:'2px solid #5DE1FF', background:'#fff', color:'#071B3A', caretColor:'#071B3A', WebkitTextFillColor:'#071B3A', touchAction:'manipulation', fontFamily:'inherit', fontSize:16, lineHeight:1.45 }} />}{error && <div role="alert" style={{ marginTop:9, padding:'9px 11px', borderRadius:10, background:'rgba(255,183,77,.16)', color:'#FFD79A', fontSize:11.5, lineHeight:1.4 }}>{error}</div>}</div><div style={{ display:'flex', gap:8 }}>{seconds === 0 && !answer.trim() && <button onClick={() => sendCurrent(true)} style={{ flex:'0 0 auto', border:'1px solid rgba(255,255,255,.25)', borderRadius:15, padding:'15px 13px', color:'#fff', background:'transparent', fontFamily:'inherit', fontSize:12, fontWeight:900 }}>PULAR</button>}<button disabled={!answer.trim()} onClick={() => sendCurrent(false)} style={{ flex:1, border:0, borderRadius:15, padding:15, color:'#06162F', background:answer.trim() ? 'linear-gradient(135deg,#5DE1FF,#E5FBFF)' : '#8CA3B9', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>ENVIAR RESPOSTA →</button></div></div>}
    {phase === 'transition' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}><div style={{ width:62, height:62, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'#168C72', fontSize:29 }}>✓</div><strong style={{ fontSize:18, marginTop:14 }}>Resposta confirmada</strong></div>}
    {phase === 'saving' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}><div style={{ fontSize:34 }}>↻</div><strong style={{ marginTop:14 }}>Salvando com segurança…</strong></div>}
    {phase === 'save-error' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:24 }}><div style={{ fontSize:38 }}>⚠️</div><strong style={{ fontSize:20, marginTop:14 }}>Não conseguimos salvar</strong><span style={{ color:'rgba(255,255,255,.65)', fontSize:12.5, marginTop:7 }}>{error}</span><button onClick={() => retryRef.current?.()} style={{ border:0, borderRadius:14, padding:'13px 18px', marginTop:20, color:'#06162F', background:'#5DE1FF', fontFamily:'inherit', fontWeight:900 }}>TENTAR NOVAMENTE</button></div>}
    {phase === 'done' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'30px 24px' }}><div style={{ width:82, height:82, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#168C72,#35C69F)', fontSize:39 }}>✓</div><div style={{ color:'#8DEBFF', fontSize:10.5, fontWeight:900, letterSpacing:1.4, marginTop:24 }}>DESAFIO FINALIZADO</div><h2 style={{ fontSize:26, margin:'8px 0' }}>Suas respostas foram confirmadas</h2><p style={{ maxWidth:320, color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55 }}>O resultado, sua posição e as correções serão liberados no domingo.</p><button onClick={onFinish} style={{ width:'100%', maxWidth:330, border:0, borderRadius:16, padding:15, marginTop:22, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13, fontWeight:900 }}>VOLTAR AO DESAFIO</button></div>}
  </div>;
}
