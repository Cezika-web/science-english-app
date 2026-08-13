// Desafio Science English — pré-lançamento visual.
// A rodada oficial abre em 17/08/2026. Antes disso, só o professor e o modo
// espelho percorrem as perguntas demonstrativas; nenhuma resposta é gravada.
const CHALLENGE_LAUNCH_AT = new Date('2026-08-17T00:00:00-03:00');
const CHALLENGE_TIME_SECONDS = 45;

const CHALLENGE_PREVIEW_QUESTIONS = [
  { type:'Tradução com restrições', prompt:'Traduza usando “used to” e “take care of”:', context:'Você costumava cuidar dos seus irmãos quando era adolescente?', hint:'Escreva uma pergunta completa em inglês.' },
  { type:'Reconstrução de sentença', prompt:'Organize e ajuste as palavras para formar uma frase correta:', context:'never · has · she · this · before · tried', hint:'Use todas as palavras. Você pode alterar maiúsculas.' },
  { type:'Correção completa', prompt:'Reescreva a frase corrigindo todos os erros:', context:'He don’t went to work because he was sick', hint:'Entregue a sentença inteira, não apenas os erros.' },
  { type:'Resposta contextual', prompt:'Responda naturalmente usando “would rather”:', context:'Your friend asks: “Do you want to stay home or go out tonight?”', hint:'Escreva uma sentença completa.' },
  { type:'Formação de pergunta', prompt:'Crie a pergunta correspondente a esta resposta:', context:'I have lived here for three years.', hint:'A interrogação é obrigatória.' },
];

const CHALLENGE_BADGES = [
  { icon:'🌱', title:'Primeiro Acerto', detail:'Acerte 1 das 5 perguntas', earned:false },
  { icon:'✌️', title:'Dupla Certeira', detail:'Acerte 2 das 5 perguntas', earned:false },
  { icon:'🔺', title:'Trinca de Acertos', detail:'Acerte 3 das 5 perguntas', earned:false },
  { icon:'⭐', title:'Quase Perfeito', detail:'Acerte 4 das 5 perguntas', earned:false },
  { icon:'🖐️', title:'Cinco de Ouro', detail:'Acerte as 5 perguntas', earned:false },
  { icon:'💎', title:'100% Perfeito', detail:'Faça 500 de 500 pontos', earned:false },
  { icon:'🔥', title:'Sequência de 4 Semanas', detail:'Participe por 4 semanas seguidas', earned:false },
  { icon:'👑', title:'Vencedora da Semana', detail:'Termine uma semana em 1º lugar', earned:false },
  { icon:'🏆', title:'Campeã do Mês', detail:'Termine o mês em 1º lugar', earned:false },
  { icon:'🟢', title:'Marca dos 5 Mil', detail:'Acumule 5.000 pontos', earned:false },
  { icon:'🔵', title:'Marca dos 10 Mil', detail:'Acumule 10.000 pontos', earned:false },
  { icon:'🥉', title:'Mestre dos 50 Mil', detail:'Acumule 50.000 pontos', earned:false },
  { icon:'🥈', title:'Elite Science English', detail:'Acumule 100.000 pontos', earned:false },
];

function challengeSimulationBadges(simulation) {
  return Array.isArray(simulation?.badges) && simulation.badges.length ? simulation.badges : CHALLENGE_BADGES;
}

const challengeBlue = 'linear-gradient(135deg,#071B3A 0%,#0D3F82 58%,#087CC1 100%)';
const challengeRoundButton = { width:36, height:36, borderRadius:'50%', border:'1px solid rgba(255,255,255,.22)', background:'rgba(255,255,255,.1)', color:'#fff', fontSize:20, cursor:'pointer', fontFamily:'inherit' };

const CHALLENGE_CARD_THEMES = {
  general:'linear-gradient(135deg,#071B3A 0%,#0D3F82 58%,#087CC1 100%)',
  violet:'linear-gradient(135deg,#25124D 0%,#6136A8 58%,#9564DD 100%)',
  coral:'linear-gradient(135deg,#54251D 0%,#B6533D 58%,#E88856 100%)',
  teal:'linear-gradient(135deg,#073D43 0%,#087982 58%,#20A9A0 100%)',
};

function ChallengeCard({ onOpen, challenge }) {
  const upcoming = Date.now() < CHALLENGE_LAUNCH_AT.getTime();
  const personal = challenge?.kind === 'private';
  const gradient = CHALLENGE_CARD_THEMES[challenge?.theme] || CHALLENGE_CARD_THEMES.general;
  const title = personal ? challenge.title : 'Desafio Science English';
  const questionCount = personal ? Number(challenge.questionCount || 10) : 5;
  return (
    <button type="button" onClick={() => onOpen(challenge || null)} aria-label={`Abrir ${title}`} style={{
      width:'100%', boxSizing:'border-box', border:'1px solid rgba(93,225,255,.35)', borderRadius:22,
      padding:'19px 18px', marginBottom:12, overflow:'hidden', position:'relative', color:'#fff', cursor:'pointer',
      textAlign:'left', fontFamily:'inherit', background:gradient, boxShadow:'0 14px 30px rgba(7,27,58,.24)'
    }}>
      <span aria-hidden="true" style={{ position:'absolute', width:150, height:150, borderRadius:'50%', right:-52, top:-70, background:'rgba(93,225,255,.13)' }} />
      <span style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, position:'relative' }}>
        <span style={{ display:'flex', alignItems:'center', gap:9, fontSize:10.5, fontWeight:900, letterSpacing:1.25, textTransform:'uppercase', color:'#A9EEFF' }}>
          <span style={{ width:30, height:30, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.13)', fontSize:17 }}>🏆</span>
          {challenge?.source === 'class-group' ? 'Desafio da turma' : personal ? 'Desafio particular' : 'Desafio Science English'}
        </span>
        <span style={{ padding:'5px 8px', borderRadius:999, background:personal ? 'rgba(255,255,255,.18)' : upcoming ? 'rgba(255,255,255,.14)' : '#5DE1FF', color:personal || upcoming ? '#fff' : '#071B3A', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>{personal ? 'Ativo' : upcoming ? 'Em breve' : 'Disponível'}</span>
      </span>
      <span style={{ display:'block', position:'relative', fontSize:20, lineHeight:1.15, fontWeight:900, marginTop:14 }}>{personal ? title : upcoming ? 'A disputa começa segunda-feira' : 'Parte 1 disponível agora'}</span>
      <span style={{ display:'block', position:'relative', color:'rgba(255,255,255,.78)', fontSize:12.5, marginTop:6 }}>{questionCount} perguntas{personal ? ' por rodada' : ''} · 45 segundos cada · até {(questionCount * 100).toLocaleString('pt-BR')} PTS</span>
      <span style={{ display:'flex', position:'relative', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
        <span style={{ fontSize:11.5, fontWeight:750, color:'#D8F8FF' }}>{personal ? `${challenge.participantCount || challenge.participants?.length || 2} participantes · termina em 3 dias` : upcoming ? '17 de agosto' : 'Termina quarta-feira, 23:59'}</span>
        <span style={{ padding:'8px 12px', borderRadius:11, background:'#fff', color:personal ? '#59318E' : '#0B4C91', fontSize:10.5, fontWeight:900 }}>ABRIR →</span>
      </span>
    </button>
  );
}

function ChallengeCarousel({ simulation, onOpen }) {
  const [index, setIndex] = React.useState(0);
  const scrollRef = React.useRef(null);
  const items = [{ id:'general', kind:'general' }, ...(simulation?.activeChallenges || [])];
  const onScroll = event => {
    const width = event.currentTarget.clientWidth || 1;
    setIndex(Math.max(0, Math.min(items.length - 1, Math.round(event.currentTarget.scrollLeft / width))));
  };
  return <div style={{ margin:'0 -16px 12px' }}>
    <div ref={scrollRef} onScroll={onScroll} style={{ display:'flex', overflowX:'auto', scrollSnapType:'x mandatory', scrollbarWidth:'none', overscrollBehaviorX:'contain' }}>
      {items.map((item,itemIndex) => <div key={item.id} style={{ flex:'0 0 100%', boxSizing:'border-box', padding:'0 16px', scrollSnapAlign:'start' }}><ChallengeCard challenge={item.kind === 'general' ? null : item} onOpen={onOpen} /></div>)}
    </div>
    {items.length > 1 && <div aria-label={`${items.length} desafios disponíveis`} style={{ display:'flex', justifyContent:'center', gap:6, marginTop:-3 }}>{items.map((item,itemIndex) => <button key={`dot-${item.id}`} aria-label={`Mostrar desafio ${itemIndex + 1}`} onClick={() => scrollRef.current?.scrollTo({ left:(scrollRef.current.clientWidth || 0) * itemIndex, behavior:'smooth' })} style={{ width:index === itemIndex ? 18 : 7, height:7, padding:0, border:0, borderRadius:999, background:index === itemIndex ? '#0D5AA7' : '#B7C5D4', transition:'width .2s', cursor:'pointer' }} />)}</div>}
  </div>;
}

function ChallengeSubpageHeader({ title, subtitle, onClose }) {
  return <div style={{ position:'sticky', top:0, zIndex:2, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'rgba(243,247,252,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid #DCE7F4' }}>
    <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', border:'1px solid #D7E3F1', background:'#fff', color:'#0D3F82', fontSize:20, cursor:'pointer' }}>‹</button>
    <div><strong style={{ display:'block', color:'#071B3A', fontSize:16 }}>{title}</strong><span style={{ color:'#64748B', fontSize:11.5 }}>{subtitle}</span></div>
  </div>;
}

function ChallengeRules({ onClose }) {
  const deductions = [
    ['Sentido principal alterado','−20 a −30'], ['Estrutura gramatical principal','−15'],
    ['Palavra-chave estudada','−10'], ['Verbo, artigo ou preposição','−5 a −8'],
    ['Ordem ou palavra ausente','−4 a −6'], ['Maiúscula/minúscula','−2'],
    ['Vírgula obrigatória','−2'], ['Interrogação obrigatória','−3'],
  ];
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Regras e pontuação" subtitle="Leia antes de começar" onClose={onClose} />
    <div style={{ padding:'18px 16px 32px' }}>
      <div style={{ padding:17, borderRadius:18, color:'#fff', background:challengeBlue }}><strong style={{ display:'block', fontSize:15 }}>Como funciona</strong><div style={{ fontSize:12.5, lineHeight:1.65, marginTop:8, color:'rgba(255,255,255,.84)' }}>A semana tem 10 perguntas, divididas em duas partes de 5. As perguntas aparecem uma por vez, com 45 segundos cada. Há uma única tentativa e não é possível voltar. Se você sair do aplicativo, bloquear a tela ou trocar de aba, a resposta atual será enviada.</div></div>
      <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Calendário da semana</div>
      <div style={{ display:'grid', gap:8, marginTop:9 }}>
        <div style={{ display:'flex', gap:11, alignItems:'center', padding:'13px', borderRadius:15, background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ width:38, height:38, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'#E7F3FF', fontSize:18 }}>1️⃣</span><span><strong style={{ display:'block', color:'#0D3F82', fontSize:12.5 }}>Parte 1 · segunda a quarta</strong><span style={{ display:'block', color:'#64748B', fontSize:10.5, lineHeight:1.45, marginTop:3 }}>Abre segunda-feira à 00h e termina quarta-feira às 23h59.</span></span></div>
        <div style={{ display:'flex', gap:11, alignItems:'center', padding:'13px', borderRadius:15, background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ width:38, height:38, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'#E7F3FF', fontSize:18 }}>2️⃣</span><span><strong style={{ display:'block', color:'#0D3F82', fontSize:12.5 }}>Parte 2 · quinta a sábado</strong><span style={{ display:'block', color:'#64748B', fontSize:10.5, lineHeight:1.45, marginTop:3 }}>Abre quinta-feira à 00h e termina sábado às 23h59.</span></span></div>
        <div style={{ display:'flex', gap:11, alignItems:'center', padding:'13px', borderRadius:15, background:'#FFF8E1', border:'1px solid #F2D989' }}><span style={{ width:38, height:38, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, background:'#FFEDB4', fontSize:18 }}>🏆</span><span><strong style={{ display:'block', color:'#835900', fontSize:12.5 }}>Resultado · domingo</strong><span style={{ display:'block', color:'#7A6740', fontSize:10.5, lineHeight:1.45, marginTop:3 }}>A pontuação, o ranking semanal e as correções são atualizados todo domingo.</span></span></div>
      </div>
      <div style={{ marginTop:18, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>O que conta como acerto</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:9 }}>
        {[['100','Resposta perfeita','#0D5AA7'],['80–99','Pergunta acertada','#168C72'],['1–79','Acerto parcial','#B87316'],['0','Não acertou','#B33A3A']].map(([score,label,color]) => <div key={score} style={{ padding:'13px 12px', borderRadius:14, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color, fontSize:17 }}>{score}</strong><span style={{ display:'block', color:'#64748B', fontSize:10.5, marginTop:3 }}>{label}</span></div>)}
      </div>
      <div style={{ marginTop:20, fontSize:11, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Possíveis descontos</div>
      <div style={{ marginTop:9, background:'#fff', border:'1px solid #DCE7F4', borderRadius:17, overflow:'hidden' }}>{deductions.map(([label,value],i) => <div key={label} style={{ display:'flex', justifyContent:'space-between', gap:12, padding:'11px 13px', borderTop:i ? '1px solid #EDF2F7' : 'none', fontSize:12 }}><span style={{ color:'#334155' }}>{label}</span><strong style={{ color:'#B33A3A', flexShrink:0 }}>{value}</strong></div>)}</div>
      <p style={{ fontSize:11.5, color:'#64748B', lineHeight:1.55, marginTop:13 }}>O ponto final é opcional. A mesma falha nunca será descontada duas vezes. O resultado e as correções completas são liberados no domingo.</p>
    </div>
  </div>;
}

function ChallengeBadges({ badges, onClose }) {
  const earnedCount = badges.filter(badge => badge.earned).length;
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Meus selos" subtitle={`${earnedCount} conquistados · ${badges.length - earnedCount} bloqueados`} onClose={onClose} />
    <div style={{ padding:'18px 16px 32px', display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
      {badges.map(badge => <div key={badge.title} style={{ padding:'16px 12px', textAlign:'center', borderRadius:18, background:badge.earned ? 'linear-gradient(180deg,#fff,#F4FAFF)' : '#fff', border:`1px solid ${badge.earned ? '#B9DDFB' : '#DCE7F4'}`, opacity:badge.earned ? 1 : .62 }}>
        <div style={{ width:54, height:54, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', background:badge.earned ? 'linear-gradient(145deg,#DFF6FF,#B7E4FF)' : '#E8EFF7', filter:badge.earned ? 'none' : 'grayscale(1)', fontSize:27, boxShadow:badge.earned ? '0 7px 17px rgba(13,90,167,.13)' : 'none' }}>{badge.icon}</div>
        <strong style={{ display:'block', color:badge.earned ? '#0D3F82' : '#213B5B', fontSize:12.5 }}>{badge.title}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10, lineHeight:1.35, marginTop:5 }}>{badge.detail}</span>
        <span style={{ display:'inline-block', marginTop:9, padding:'4px 7px', borderRadius:999, background:badge.earned ? '#DDF4EC' : '#EDF2F7', color:badge.earned ? '#15745F' : '#8291A3', fontSize:8.5, fontWeight:900, textTransform:'uppercase' }}>{badge.earned ? `${badge.count > 1 ? `${badge.count}× · ` : ''}${badge.date}` : 'Bloqueado'}</span>
      </div>)}
    </div>
  </div>;
}

function ChallengeRanking({ month, compact = false, showAll = false }) {
  const ranking = month?.ranking || [];
  const own = ranking.find(row => row.isOwn) || { position:'—', score:0 };
  const podium = ranking.slice(0, 3);
  const shown = showAll ? ranking : podium;
  const rowStyle = (position, ownRow = false) => ({ display:'flex', alignItems:'center', gap:10, padding:compact ? '9px 11px' : '11px 12px', borderRadius:13, marginTop:7, background:ownRow ? '#E9F5FF' : '#F7FAFD', border:`1px solid ${ownRow ? '#B9DDFB' : '#E5EDF5'}` });
  return <div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7 }}>{podium.map(row => <div key={`podium-${row.name}`} style={{ minWidth:0, padding:'12px 6px', borderRadius:14, textAlign:'center', background:row.position === 1 ? '#FFF8E1' : row.isOwn ? '#EAF5FF' : '#F5F8FC', border:`1px solid ${row.position === 1 ? '#F1D273' : row.isOwn ? '#82C3F3' : '#DCE7F4'}` }}><span style={{ display:'block', fontSize:row.position === 1 ? 22 : 16 }}>{row.position === 1 ? '👑' : row.position === 2 ? '🥈' : '🥉'}</span><strong style={{ display:'block', marginTop:5, color:row.isOwn ? '#0D3F82' : '#183451', fontSize:10.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.isOwn ? `${row.name} · você` : row.name}</strong><span style={{ display:'block', color:'#0D5AA7', fontSize:10, fontWeight:900, marginTop:3 }}>{row.score.toLocaleString('pt-BR')}<small style={{ marginLeft:2, fontSize:7 }}>PTS</small></span></div>)}</div>
    {own.position > 3 && <div style={{ marginTop:8 }}><div style={rowStyle(own.position, true)}><span style={{ width:25, textAlign:'center', color:'#0D5AA7', fontSize:12, fontWeight:900 }}>{own.position}º</span><span style={{ flex:1, color:'#0D3F82', fontSize:12, fontWeight:900 }}>Você</span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{own.score.toLocaleString('pt-BR')}<small style={{ marginLeft:3, fontSize:7.5 }}>PTS</small></strong></div></div>}
    {showAll && <React.Fragment><div style={{ margin:'15px 2px 2px', color:'#70839A', fontSize:9.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Lista completa · {ranking.length} participantes</div>{shown.map(row => <div key={`all-${row.name}`} style={rowStyle(row.position,row.isOwn)}><span style={{ width:25, textAlign:'center', fontSize:12, fontWeight:900, color:row.position <= 3 ? '#B27D09' : row.isOwn ? '#0D5AA7' : '#64748B' }}>{row.position}º</span><span style={{ flex:1, minWidth:0, color:row.isOwn ? '#0D3F82' : '#213B5B', fontSize:12, fontWeight:row.isOwn ? 900 : 750, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.isOwn ? `${row.name} · você` : row.name}</span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{row.score.toLocaleString('pt-BR')}<small style={{ marginLeft:3, fontSize:7.5 }}>PTS</small></strong></div>)}</React.Fragment>}
  </div>;
}

function ChallengeWeeklyResult({ week, onClose }) {
  const ranking = Array.isArray(week?.ranking) ? week.ranking : [];
  const own = ranking.find(row => row.isOwn) || { position:week?.ownPosition, score:Number(week?.ownScore || 0) };
  const second = ranking.find(row => row.position === 2);
  const gap = second ? Math.abs(Number(own.score || 0) - Number(second.score || 0)) : null;
  const gapMessage = gap == null ? '' : own.position === 1
    ? `Você venceu com ${gap} PTS de vantagem sobre ${second.name}, o 2º colocado.`
    : `Você ficou ${gap} PTS atrás do 2º colocado, ${second.name}.`;
  return <div style={{ position:'fixed', inset:0, zIndex:10040, maxWidth:480, margin:'0 auto', background:'#F3F7FC', overflowY:'auto', overscrollBehavior:'contain' }}>
    <ChallengeSubpageHeader title="Resultado geral" subtitle={`${week?.label || 'Semana'} · ${week?.range || ''}`} onClose={onClose} />
    <div style={{ padding:'16px 16px 34px' }}>
      <div style={{ padding:17, borderRadius:19, color:'#fff', background:challengeBlue }}><span style={{ display:'block', color:'#A9EEFF', fontSize:9.5, fontWeight:900, letterSpacing:1, textTransform:'uppercase' }}>Seu resultado semanal</span><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:12, marginTop:7 }}><span><strong style={{ fontSize:29 }}>{Number(week?.ownScore || 0).toLocaleString('pt-BR')}</strong><small style={{ marginLeft:4, color:'#BDEFFF', fontSize:10, fontWeight:900 }}>PTS</small></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', fontSize:21 }}>{own.position || '—'}º</strong><small style={{ color:'#BDEFFF', fontSize:9.5 }}>posição</small></span></div></div>
      {gapMessage && <div style={{ marginTop:10, padding:'11px 12px', borderRadius:13, background:own.position === 1 ? '#FFF7DB' : '#EAF5FF', border:`1px solid ${own.position === 1 ? '#F2D989' : '#B9DDFB'}`, color:own.position === 1 ? '#916200' : '#0D4F91', fontSize:11, lineHeight:1.45, fontWeight:850 }}>{own.position === 1 ? '👑 ' : '📊 '}{gapMessage}</div>}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, margin:'18px 2px 8px' }}><span style={{ color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Ranking desta semana</span><span style={{ color:'#70839A', fontSize:9.5 }}>{ranking.length} participantes</span></div>
      <div style={{ padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><ChallengeRanking month={{ ranking }} showAll /></div>
    </div>
  </div>;
}

function ChallengeCorrections({ week, onClose }) {
  const [filter, setFilter] = React.useState('all');
  const [openIndex, setOpenIndex] = React.useState(null);
  const [showResult, setShowResult] = React.useState(false);
  const questions = Array.isArray(week?.questions) ? week.questions : [];
  const filtered = questions.map((question,index) => ({ ...question, originalIndex:index })).filter(question => filter === 'all' || (filter === 'correct' ? question.score >= 80 : question.score < 80));
  const weeklyRanking = Array.isArray(week?.ranking) ? week.ranking : [];
  const filterLabel = { all:'Todas', correct:'Acertos', errors:'Erros' };
  return <div style={{ position:'fixed', inset:0, zIndex:10030, maxWidth:480, margin:'0 auto', background:'#F3F7FC', overflowY:'auto', overscrollBehavior:'contain' }}>
    <ChallengeSubpageHeader title={`${week?.label || 'Semana'} · ${week?.range || ''}`} subtitle={`${Number(week?.ownScore || 0).toLocaleString('pt-BR')} PTS no total`} onClose={onClose} />
    <div style={{ padding:'16px 16px 32px' }}>
      <div style={{ marginBottom:10, padding:'10px 12px', borderRadius:13, background:'#EAF5FF', border:'1px solid #B9DDFB', color:'#0D4F91', fontSize:10.5, lineHeight:1.45 }}><strong>Regra de precisão:</strong> ponto final é opcional e nunca desconta. Apenas vírgula obrigatória e interrogação obrigatória podem perder pontos.</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
        {[['Total',Number(week?.ownScore || 0).toLocaleString('pt-BR'),'PTS'],['Acertos',`${week?.correct || 0}/10`,''],['Posição',`${week?.ownPosition || '—'}º`,'']].map(([label,value,suffix]) => <div key={label} style={{ padding:'13px 7px', textAlign:'center', borderRadius:14, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color:'#0D5AA7', fontSize:16 }}>{value}{suffix && <small style={{ marginLeft:3, fontSize:8.5 }}>{suffix}</small>}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:9, marginTop:3 }}>{label}</span></div>)}
      </div>
      <div style={{ marginTop:16, color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Perguntas e correções</div>
      <div style={{ display:'flex', padding:4, marginTop:12, borderRadius:14, background:'#E4EDF6' }}>{Object.entries(filterLabel).map(([id,label]) => <button key={id} onClick={() => { setFilter(id); setOpenIndex(null); }} style={{ flex:1, border:0, borderRadius:11, padding:'9px 4px', background:filter === id ? '#fff' : 'transparent', color:filter === id ? '#0D3F82' : '#70839A', boxShadow:filter === id ? '0 3px 9px rgba(7,27,58,.08)' : 'none', fontFamily:'inherit', fontSize:11, fontWeight:900, cursor:'pointer' }}>{label}{id === 'correct' ? ` (${questions.filter(q => q.score >= 80).length})` : id === 'errors' ? ` (${questions.filter(q => q.score < 80).length})` : ''}</button>)}</div>
      <div style={{ display:'grid', gap:9, marginTop:12 }}>{filtered.map(question => {
        const open = openIndex === question.originalIndex;
        const perfect = question.score === 100;
        const correct = question.score >= 80;
        const tone = perfect ? '#0D5AA7' : correct ? '#168C72' : question.score > 0 ? '#B87316' : '#B33A3A';
        const label = perfect ? 'Perfeita' : correct ? 'Acertou' : question.score > 0 ? 'Acerto parcial' : 'Não respondeu';
        return <div key={question.originalIndex} style={{ borderRadius:17, background:'#fff', border:`1px solid ${open ? tone : '#DCE7F4'}`, overflow:'hidden' }}><button onClick={() => setOpenIndex(open ? null : question.originalIndex)} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'13px 14px', border:0, background:'transparent', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}><span style={{ width:34, height:34, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', background:`${tone}16`, color:tone, fontSize:12, fontWeight:900 }}>{question.originalIndex + 1}</span><span style={{ flex:1, minWidth:0 }}><strong style={{ display:'block', color:'#102C4E', fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{question.prompt}</strong><span style={{ display:'block', color:tone, fontSize:9.5, fontWeight:850, marginTop:3 }}>{label}</span></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', color:tone, fontSize:15 }}>{question.score}<small style={{ marginLeft:3, fontSize:8, fontWeight:900 }}>PTS</small></strong><span style={{ color:'#8CA0B5', fontSize:17 }}>{open ? '⌃' : '⌄'}</span></span></button>{open && <div style={{ padding:'0 14px 15px', borderTop:'1px solid #EDF2F7' }}><div style={{ marginTop:12 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Sua resposta</span><div style={{ marginTop:5, padding:'10px 11px', borderRadius:11, background:correct ? '#F1FBF7' : '#FFF8EA', color:'#253B54', fontSize:12, lineHeight:1.45 }}>{question.answer || 'Sem resposta'}</div></div><div style={{ marginTop:11 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Resposta esperada</span><div style={{ marginTop:5, padding:'10px 11px', borderRadius:11, background:'#EEF6FF', color:'#0D3F82', fontSize:12, lineHeight:1.45 }}>{question.expected}</div></div>{question.deductions?.length > 0 && <div style={{ marginTop:11 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Onde perdeu pontos</span>{question.deductions.map((deduction,index) => <div key={index} style={{ display:'flex', gap:8, marginTop:6, color:'#8F4C13', fontSize:10.5, lineHeight:1.4 }}><strong style={{ flexShrink:0 }}>−{deduction.points} PTS</strong><span>{deduction.reason}</span></div>)}</div>}<div style={{ marginTop:11, padding:'10px 11px', borderRadius:11, background:'#F7FAFD', color:'#53677E', fontSize:10.5, lineHeight:1.5 }}><strong style={{ color:'#213B5B' }}>Explicação: </strong>{question.explanation}</div></div>}</div>;
      })}</div>
      {!filtered.length && <div style={{ padding:28, textAlign:'center', color:'#8091A5', fontSize:12 }}>Nenhuma pergunta nesta categoria.</div>}
      {weeklyRanking.length > 0 && <button onClick={() => setShowResult(true)} style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:16, color:'#fff', background:'linear-gradient(135deg,#147AE0,#0757A5)', boxShadow:'0 8px 18px rgba(20,122,224,.2)', fontFamily:'inherit', fontSize:11.5, fontWeight:900, cursor:'pointer' }}>VER RESULTADO GERAL →</button>}
    </div>
    {showResult && <ChallengeWeeklyResult week={week} onClose={() => setShowResult(false)} />}
  </div>;
}

function ChallengeHistory({ simulation, onClose }) {
  const [monthIndex, setMonthIndex] = React.useState(2);
  const [selectedWeek, setSelectedWeek] = React.useState(null);
  const months = simulation?.months || [];
  const safeIndex = Math.min(monthIndex, Math.max(0, months.length - 1));
  const month = months[safeIndex] || { label:'—', range:'', weeks:[], ranking:[] };
  const ownMonth = month.ranking.find(row => row.isOwn) || { position:'—', score:0 };
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Meu histórico" subtitle="Resultados desde 11 de junho" onClose={onClose} />
    <div style={{ padding:'16px 16px 32px' }}>
      <div style={{ marginBottom:14, padding:14, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Pontuação por mês</span><div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.max(months.length,1)},minmax(0,1fr))`, gap:7, marginTop:9 }}>{months.map(item => { const row=item.ranking?.find(entry => entry.isOwn); return <button key={`summary-${item.id}`} onClick={() => setMonthIndex(months.indexOf(item))} style={{ minWidth:0, padding:'10px 5px', borderRadius:12, border:`1px solid ${item.id === month.id ? '#82C3F3' : '#E1E9F2'}`, background:item.id === month.id ? '#EAF5FF' : '#F8FAFC', cursor:'pointer', fontFamily:'inherit' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:12.5 }}>{Number(row?.score || 0).toLocaleString('pt-BR')}</strong><span style={{ display:'block', color:'#70839A', fontSize:9.5, marginTop:3 }}>{item.label}</span></button>; })}</div></div>
      <div style={{ display:'flex', padding:4, borderRadius:14, background:'#E5EDF6' }}>{months.map((item,index) => <button key={item.id} onClick={() => setMonthIndex(index)} style={{ flex:1, padding:'9px 4px', border:0, borderRadius:11, background:index === safeIndex ? '#fff' : 'transparent', color:index === safeIndex ? '#0D3F82' : '#70839A', boxShadow:index === safeIndex ? '0 3px 9px rgba(7,27,58,.09)' : 'none', fontSize:11.5, fontWeight:900, cursor:'pointer', fontFamily:'inherit' }}>{item.label}</button>)}</div>
      <div style={{ marginTop:12, padding:17, borderRadius:19, color:'#fff', background:challengeBlue }}><div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}><div><span style={{ display:'block', color:'#A9EEFF', fontSize:9.5, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>{month.current ? 'Mês em andamento' : 'Resultado mensal'}</span><strong style={{ display:'block', fontSize:21, marginTop:4 }}>{month.label}</strong><span style={{ display:'block', color:'rgba(255,255,255,.66)', fontSize:10.5, marginTop:3 }}>{month.range}</span></div><div style={{ textAlign:'right' }}><strong style={{ display:'block', fontSize:23 }}>{ownMonth.position}º</strong><span style={{ color:'#A9EEFF', fontSize:9.5 }}>de 22 alunos</span></div></div><div style={{ display:'flex', alignItems:'baseline', gap:7, marginTop:16 }}><strong style={{ fontSize:28 }}>{ownMonth.score.toLocaleString('pt-BR')}</strong><span style={{ color:'rgba(255,255,255,.67)', fontSize:11 }}>pontos no mês</span></div></div>
      <div style={{ marginTop:18, fontSize:10.5, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Resultado por semana</div>
      <div style={{ display:'grid', gap:9, marginTop:9 }}>{month.weeks.map((week,weekIndex) => {
        const weeklyWinner = week.ownPosition === 1 && !week.partial;
        return <div key={week.range} style={{ padding:'14px 15px', borderRadius:17, background:'#fff', border:`1px solid ${weeklyWinner ? '#F2CF6B' : '#DCE7F4'}`, boxShadow:weeklyWinner ? '0 7px 18px rgba(194,139,18,.08)' : 'none' }}><div style={{ display:'flex', alignItems:'center', gap:11 }}><span style={{ width:39, height:39, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:weeklyWinner ? '#FFF5D6' : '#EBF4FC', fontSize:19 }}>{weeklyWinner ? '👑' : '📅'}</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#102C4E', fontSize:13 }}>{week.label} <span style={{ color:'#8191A3', fontWeight:650 }}>· {week.range}</span></strong><span style={{ display:'block', color:'#70839A', fontSize:10.5, marginTop:3 }}>{week.correct} de 10 perguntas acertadas{week.partial ? ' · parcial' : ''}</span></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', color:'#0D5AA7', fontSize:14 }}>{week.ownScore}<small style={{ marginLeft:3, fontSize:7.5 }}>PTS</small></strong><span style={{ color:weeklyWinner ? '#A36E00' : '#70839A', fontSize:9.5, fontWeight:900 }}>{week.ownPosition}º {week.partial ? 'provisório' : 'lugar'}</span></span></div>{weeklyWinner && <div style={{ marginTop:10, padding:'7px 9px', borderRadius:10, background:'#FFF8E5', color:'#966300', fontSize:10, fontWeight:850 }}>🏅 Selo conquistado: Vencedora da Semana</div>}<button onClick={() => setSelectedWeek(week)} style={{ width:'100%', border:0, borderTop:'1px solid #EDF2F7', marginTop:10, padding:'9px 0 0', background:'transparent', color:'#0D5AA7', fontFamily:'inherit', fontSize:10.5, fontWeight:900, cursor:'pointer' }}>VER RESULTADO E PERGUNTAS →</button></div>;
      })}</div>
      <div style={{ marginTop:20, fontSize:10.5, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Ranking de {month.label}</div>
      <div style={{ marginTop:9, padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><ChallengeRanking month={month} showAll /></div>
    </div>
    {selectedWeek && <ChallengeCorrections week={selectedWeek} onClose={() => setSelectedWeek(null)} />}
  </div>;
}

function ChallengeDuels({ simulation, onClose }) {
  const [tab, setTab] = React.useState('create');
  const [duration, setDuration] = React.useState('week');
  const [questionCount, setQuestionCount] = React.useState(10);
  const [selected, setSelected] = React.useState([]);
  const [sent, setSent] = React.useState(false);
  const [inviteStatus, setInviteStatus] = React.useState('pending');
  const latestMonth = simulation?.months?.[simulation.months.length - 1];
  const students = (latestMonth?.ranking || []).filter(row => !row.isOwn).map(row => ({
    name:row.name,
    firstName:String(row.name || '').trim().split(/\s+/)[0] || 'Aluno',
  }));
  const sampleChallenger = students[0]?.firstName || 'Um aluno';
  const sampleOpponent = students[1]?.firstName || 'Outro aluno';
  const toggleStudent = name => setSelected(current => current.includes(name) ? current.filter(item => item !== name) : [...current, name]);
  const tabs = [['create','Criar'],['invites','Convites'],['mine','Meus desafios']];
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Desafiar alguém" subtitle="Crie disputas particulares entre alunos" onClose={onClose} />
    <div style={{ padding:'16px 16px 34px' }}>
      <div style={{ display:'flex', padding:4, borderRadius:14, background:'#E3ECF6' }}>{tabs.map(([id,label]) => <button key={id} onClick={() => setTab(id)} style={{ flex:1, border:0, borderRadius:11, padding:'9px 3px', background:tab === id ? '#fff' : 'transparent', color:tab === id ? '#0D3F82' : '#70839A', boxShadow:tab === id ? '0 3px 9px rgba(7,27,58,.09)' : 'none', fontFamily:'inherit', fontSize:10.5, fontWeight:900, cursor:'pointer' }}>{label}{id === 'invites' && inviteStatus === 'pending' ? ' · 1' : ''}</button>)}</div>

      {tab === 'create' && <React.Fragment>
        <div style={{ marginTop:14, padding:16, borderRadius:18, color:'#fff', background:challengeBlue }}><span style={{ color:'#A9EEFF', fontSize:9.5, fontWeight:900, letterSpacing:1, textTransform:'uppercase' }}>Novo desafio particular</span><strong style={{ display:'block', fontSize:18, marginTop:5 }}>Quem você quer desafiar?</strong><p style={{ margin:'6px 0 0', color:'rgba(255,255,255,.72)', fontSize:11.5, lineHeight:1.5 }}>Os pontos e o ranking ficam separados do desafio geral.</p></div>
        <div style={{ marginTop:15, color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.9, textTransform:'uppercase' }}>Escolha a duração</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:8 }}>{[
          ['week','Uma semana','2 rodadas de 3 dias'],['month','Quatro semanas','8 rodadas de 3 dias']
        ].map(([id,title,detail]) => <button key={id} onClick={() => setDuration(id)} style={{ padding:'13px 10px', borderRadius:14, border:`1.5px solid ${duration === id ? '#147AE0' : '#DCE7F4'}`, background:duration === id ? '#EAF4FF' : '#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}><strong style={{ display:'block', color:duration === id ? '#0D5AA7' : '#213B5B', fontSize:12.5 }}>{title}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10, marginTop:3 }}>{detail}</span></button>)}</div>
        <div style={{ marginTop:15, color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.9, textTransform:'uppercase' }}>Perguntas por rodada</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:7, marginTop:8 }}>{[5,10,15,20].map(count => <button key={count} onClick={() => setQuestionCount(count)} style={{ padding:'11px 3px', borderRadius:12, border:`1.5px solid ${questionCount === count ? '#147AE0' : '#DCE7F4'}`, background:questionCount === count ? '#EAF4FF' : '#fff', color:questionCount === count ? '#0D5AA7' : '#53677E', fontFamily:'inherit', fontSize:13, fontWeight:900, cursor:'pointer' }}>{count}<small style={{ display:'block', marginTop:2, fontSize:7.5 }}>PERG.</small></button>)}</div>
        <div style={{ marginTop:7, color:'#70839A', fontSize:10.5, lineHeight:1.45 }}>A quantidade escolhida vale para cada rodada. O prazo permanece o mesmo: três dias.</div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:17 }}><span style={{ color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.9, textTransform:'uppercase' }}>Alunos cadastrados</span><span style={{ color:'#70839A', fontSize:10 }}>{selected.length} selecionado{selected.length === 1 ? '' : 's'}</span></div>
        <div style={{ display:'grid', gap:7, marginTop:8, maxHeight:310, overflowY:'auto' }}>{students.map(student => {
          const active = selected.includes(student.name);
          return <button key={student.name} onClick={() => toggleStudent(student.name)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 11px', borderRadius:14, border:`1px solid ${active ? '#8BC9F5' : '#DCE7F4'}`, background:active ? '#EDF7FF' : '#fff', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}><span style={{ width:34, height:34, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:active ? '#147AE0' : '#E7EFF8', color:active ? '#fff' : '#49627D', fontSize:12, fontWeight:900 }}>{student.firstName.slice(0,1).toUpperCase()}</span><span style={{ flex:1, color:'#183451', fontSize:12.5, fontWeight:800 }}>{student.firstName}</span><span style={{ width:20, height:20, borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', border:`1.5px solid ${active ? '#147AE0' : '#B9C8D8'}`, background:active ? '#147AE0' : '#fff', color:'#fff', fontSize:12 }}>{active ? '✓' : ''}</span></button>;
        })}</div>
        <button disabled={!selected.length} onClick={() => setSent(true)} style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:13, background:selected.length ? 'linear-gradient(135deg,#147AE0,#0757A5)' : '#DCE5EF', color:selected.length ? '#fff' : '#7F91A5', fontFamily:'inherit', fontSize:12.5, fontWeight:900, cursor:selected.length ? 'pointer' : 'default' }}>ENVIAR DESAFIO · {questionCount} PERGUNTAS POR RODADA</button>
        {sent && <div style={{ marginTop:10, padding:'11px 12px', borderRadius:13, background:'#E7F8F1', border:'1px solid #B8E8D5', color:'#14745C', fontSize:11.5, lineHeight:1.45 }}><strong>Convite preparado!</strong> Nesta prévia nada foi enviado. O desafio começará na próxima segunda depois que os convidados aceitarem.</div>}
      </React.Fragment>}

      {tab === 'invites' && <div style={{ marginTop:14 }}>
        <div style={{ padding:16, borderRadius:18, background:'#fff', border:'1px solid #B9DDFB', boxShadow:'0 8px 20px rgba(13,90,167,.08)' }}><div style={{ display:'flex', gap:11 }}><span style={{ width:42, height:42, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:'#E7F3FF', fontSize:20 }}>⚔️</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#071B3A', fontSize:13.5 }}>{sampleChallenger} desafiou você</strong><span style={{ display:'block', color:'#64748B', fontSize:10.5, lineHeight:1.45, marginTop:3 }}>40 perguntas · quatro semanas · começa na próxima segunda</span></span></div>{inviteStatus === 'pending' ? <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:8, marginTop:13 }}><button onClick={() => setInviteStatus('declined')} style={{ border:'1px solid #D8E2EC', borderRadius:12, padding:10, background:'#fff', color:'#6B7E93', fontFamily:'inherit', fontSize:11, fontWeight:900, cursor:'pointer' }}>RECUSAR</button><button onClick={() => setInviteStatus('accepted')} style={{ border:0, borderRadius:12, padding:10, background:'#147AE0', color:'#fff', fontFamily:'inherit', fontSize:11, fontWeight:900, cursor:'pointer' }}>ACEITAR</button></div> : <div style={{ marginTop:12, padding:'9px 10px', borderRadius:11, background:inviteStatus === 'accepted' ? '#E7F8F1' : '#F1F5F9', color:inviteStatus === 'accepted' ? '#14745C' : '#64748B', fontSize:11, fontWeight:800 }}>{inviteStatus === 'accepted' ? '✓ Desafio aceito. O criador será avisado.' : 'Convite recusado. O criador será avisado.'}</div>}</div>
      </div>}

      {tab === 'mine' && <div style={{ display:'grid', gap:9, marginTop:14 }}>
        <div style={{ padding:15, borderRadius:17, background:'#fff', border:'1px solid #B9DDFB' }}><div style={{ display:'flex', justifyContent:'space-between', gap:10 }}><span><span style={{ display:'block', color:'#0D5AA7', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Em andamento</span><strong style={{ display:'block', color:'#102C4E', fontSize:13.5, marginTop:4 }}>Você × {sampleOpponent}</strong></span><span style={{ padding:'6px 8px', height:'fit-content', borderRadius:9, background:'#E8F3FF', color:'#0D5AA7', fontSize:9, fontWeight:900 }}>SEMANA 2/4</span></div><div style={{ display:'flex', justifyContent:'space-between', marginTop:13, paddingTop:11, borderTop:'1px solid #EDF2F7', color:'#64748B', fontSize:10.5 }}><span>40 perguntas no total</span><strong style={{ color:'#0D5AA7' }}>Ver placar →</strong></div></div>
        <div style={{ padding:15, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><span style={{ display:'block', color:'#B87316', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Aguardando resposta</span><strong style={{ display:'block', color:'#102C4E', fontSize:13.5, marginTop:4 }}>{selected.length ? selected.map(name => name.split(/\s+/)[0]).join(', ') : sampleChallenger}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10.5, marginTop:4 }}>O desafio só começa depois da aceitação.</span></div>
      </div>}
    </div>
  </div>;
}

function ChallengePrivateHub({ challenge, onBack, onJoin }) {
  const [showQuestions, setShowQuestions] = React.useState(false);
  const week = challenge?.currentWeek || {};
  const isClassGroup = challenge?.source === 'class-group';
  const ranking = week.ranking?.length ? week.ranking : (challenge?.memberNames || []).map((name,index) => ({ name, position:index + 1, score:0 }));
  const own = ranking.find(row => row.isOwn) || { position:week.ownPosition || '—', score:week.ownScore || 0 };
  const gradient = CHALLENGE_CARD_THEMES[challenge?.theme] || CHALLENGE_CARD_THEMES.violet;
  return <div style={{ position:'fixed', inset:0, zIndex:10020, maxWidth:480, margin:'0 auto', background:'#F3F7FC', overflowY:'auto' }}>
    <div style={{ minHeight:235, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px 28px', color:'#fff', background:gradient }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><button onClick={onBack} aria-label="Voltar" style={challengeRoundButton}>‹</button><span style={{ fontSize:10.5, fontWeight:900, letterSpacing:1.2, color:'#fff', textTransform:'uppercase' }}>{isClassGroup ? 'Desafio da turma' : 'Desafio particular'}</span><span style={{ width:36 }} /></div>
      <div style={{ textAlign:'center', marginTop:22 }}><div style={{ fontSize:36 }}>⚔️</div><h1 style={{ fontSize:23, margin:'9px 0 5px', lineHeight:1.15 }}>{challenge?.title || 'Desafio particular'}</h1><p style={{ margin:0, color:'rgba(255,255,255,.74)', fontSize:12 }}>{challenge?.participantLabel || `${challenge?.participantCount || ranking.length} participantes`}</p></div>
    </div>
    <div style={{ padding:'0 16px 30px', marginTop:-24 }}>
      <div style={{ padding:17, borderRadius:21, background:'#fff', border:'1px solid #DCE7F4', boxShadow:'0 12px 28px rgba(7,27,58,.1)' }}><div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}><span><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, textTransform:'uppercase' }}>{isClassGroup ? 'Criado automaticamente pela aula' : 'Rodada atual · três dias'}</span><strong style={{ display:'block', color:'#102C4E', fontSize:16, marginTop:4 }}>{challenge?.questionCount || week.questions?.length || 10} perguntas</strong><span style={{ display:'block', color:'#70839A', fontSize:10.5, marginTop:4 }}>{challenge?.scheduleLabel || 'Segunda 00h até quarta 23h59'}</span></span><span style={{ padding:'6px 8px', borderRadius:9, background:challenge?.joined ? '#DFF7E8' : '#E8F3FF', color:challenge?.joined ? '#15713A' : '#0D5AA7', fontSize:9, fontWeight:900 }}>{challenge?.joined ? 'PARTICIPANDO' : 'OPCIONAL'}</span></div>{isClassGroup && !challenge?.joined ? <button onClick={() => onJoin?.(challenge)} style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:14, color:'#fff', background:gradient, fontFamily:'inherit', fontSize:11.5, fontWeight:900, cursor:'pointer' }}>PARTICIPAR DESTA RODADA →</button> : <button onClick={() => setShowQuestions(true)} style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:14, color:'#fff', background:gradient, fontFamily:'inherit', fontSize:11.5, fontWeight:900, cursor:'pointer' }}>VER PERGUNTAS E PONTUAÇÃO →</button>}</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:12 }}>{[
        ['Seus pontos',Number(own.score || 0).toLocaleString('pt-BR'),'PTS'],['Posição',Number.isFinite(Number(own.position)) ? `${own.position}º` : '—',''],['Perguntas',String(challenge?.questionCount || week.questions?.length || 0),'']
      ].map(([label,value,suffix]) => <div key={label} style={{ padding:'13px 6px', textAlign:'center', borderRadius:15, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:15 }}>{value}{suffix && <small style={{ marginLeft:2, fontSize:7.5 }}>{suffix}</small>}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:8.8, marginTop:4 }}>{label}</span></div>)}</div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', margin:'18px 2px 8px' }}><span style={{ color:'#0D5AA7', fontSize:10, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Placar particular</span><span style={{ color:'#70839A', fontSize:9.5 }}>{ranking.length} participantes</span></div>
      <div style={{ padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><ChallengeRanking month={{ ranking }} showAll /></div>
    </div>
    {showQuestions && <ChallengeCorrections week={week} onClose={() => setShowQuestions(false)} />}
  </div>;
}

function ChallengeProgressPanel({ simulation, onOpenChallenge }) {
  const months = simulation?.months || [];
  if (!months.length) return null;
  const ownRows = months.map(month => ({
    label:month.label,
    score:Number(month.ranking?.find(row => row.isOwn)?.score || 0),
    weeks:month.weeks || [],
  }));
  const maxScore = Math.max(...ownRows.map(item => item.score), 1);
  const total = Number(simulation?.totalPoints || ownRows.reduce((sum,item) => sum + item.score, 0));
  const best = ownRows.reduce((winner,item) => item.score > winner.score ? item : winner, ownRows[0]);
  const allWeeks = ownRows.flatMap(month => month.weeks.map(week => ({ label:week.range, score:Number(week.ownScore || 0) })));
  const weeklyMax = Math.max(...allWeeks.map(week => week.score), 1);
  const graphWidth = 300, graphHeight = 52;
  const points = allWeeks.map((week,index) => `${allWeeks.length === 1 ? graphWidth/2 : index * graphWidth/(allWeeks.length-1)},${graphHeight - (week.score/weeklyMax)*(graphHeight-12) - 6}`).join(' ');
  return <div style={{ marginTop:11, padding:14, borderRadius:18, color:'#fff', background:'radial-gradient(circle at 90% 0,rgba(93,225,255,.28),transparent 32%),linear-gradient(145deg,#071B3A,#0D4D91 68%,#087CC1)', boxShadow:'0 9px 22px rgba(7,27,58,.16)', overflow:'hidden' }}>
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:10 }}><div><span style={{ color:'#A9EEFF', fontSize:8.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Desafio Science English</span><strong style={{ display:'block', fontSize:16, marginTop:3 }}>Seu desempenho</strong><span style={{ display:'block', color:'rgba(255,255,255,.68)', fontSize:9.5, marginTop:2 }}>Evolução desde o primeiro mês</span></div><span style={{ width:36, height:36, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.12)', fontSize:18 }}>🏆</span></div>
    <div style={{ display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:7, marginTop:11 }}><div style={{ padding:'8px 10px', borderRadius:11, background:'rgba(255,255,255,.1)' }}><span style={{ display:'block', color:'#BDEFFF', fontSize:8.5 }}>Total acumulado</span><strong style={{ display:'block', fontSize:16, marginTop:2 }}>{total.toLocaleString('pt-BR')}</strong></div><div style={{ padding:'8px 10px', borderRadius:11, background:'rgba(255,255,255,.1)' }}><span style={{ display:'block', color:'#BDEFFF', fontSize:8.5 }}>Melhor mês</span><strong style={{ display:'block', fontSize:12.5, marginTop:3 }}>{best.label} · {best.score.toLocaleString('pt-BR')}</strong></div></div>
    <div style={{ marginTop:11, color:'#BDEFFF', fontSize:8.5, fontWeight:900, letterSpacing:.7, textTransform:'uppercase' }}>Pontos por mês</div>
    <div style={{ display:'grid', gridTemplateColumns:`repeat(${ownRows.length},minmax(0,1fr))`, alignItems:'end', gap:7, height:82, marginTop:5 }}>{ownRows.map(item => <div key={item.label} style={{ minWidth:0, textAlign:'center' }}><strong style={{ display:'block', fontSize:9, marginBottom:3 }}>{item.score.toLocaleString('pt-BR')}</strong><div style={{ height:Math.max(14,Math.round(item.score/maxScore*48)), borderRadius:'7px 7px 3px 3px', background:'linear-gradient(180deg,#5DE1FF,#42A9F0)', boxShadow:'0 4px 10px rgba(93,225,255,.16)' }} /><span style={{ display:'block', color:'rgba(255,255,255,.7)', fontSize:8.5, marginTop:3 }}>{item.label}</span></div>)}</div>
    <div style={{ marginTop:11, padding:'8px 8px 5px', borderRadius:12, background:'rgba(255,255,255,.08)' }}><div style={{ display:'flex', justifyContent:'space-between', color:'#BDEFFF', fontSize:8.3, fontWeight:850 }}><span>Evolução semanal</span><span>{allWeeks.length} semanas</span></div><svg viewBox={`0 0 ${graphWidth} ${graphHeight}`} preserveAspectRatio="none" width="100%" height="52" style={{ display:'block', marginTop:3, overflow:'visible' }}><polyline points={points} fill="none" stroke="#5DE1FF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{allWeeks.map((week,index) => { const x=allWeeks.length === 1 ? graphWidth/2 : index*graphWidth/(allWeeks.length-1); const y=graphHeight-(week.score/weeklyMax)*(graphHeight-12)-6; return <circle key={`${week.label}-${index}`} cx={x} cy={y} r="3" fill="#fff" stroke="#5DE1FF" strokeWidth="2" />; })}</svg></div>
    <button onClick={onOpenChallenge} style={{ width:'100%', border:'1px solid rgba(255,255,255,.22)', borderRadius:11, padding:9, marginTop:10, background:'rgba(255,255,255,.11)', color:'#fff', fontFamily:'inherit', fontSize:9.5, fontWeight:900, cursor:'pointer' }}>ABRIR HISTÓRICO DO DESAFIO →</button>
  </div>;
}

function ChallengeHub({ student, simulation, selectedChallenge, previewAllowed, onBack, onStart, onJoinChallenge }) {
  const [panel, setPanel] = React.useState(null);
  if (selectedChallenge?.kind === 'private') return <ChallengePrivateHub challenge={selectedChallenge} onBack={onBack} onJoin={onJoinChallenge} />;
  const upcoming = Date.now() < CHALLENGE_LAUNCH_AT.getTime();
  const months = simulation?.months || [];
  const currentMonth = months[months.length - 1] || { label:'Agosto', ranking:[] };
  const currentOwn = currentMonth.ranking.find(row => row.isOwn) || { position:null, score:0 };
  const badges = challengeSimulationBadges(simulation);
  const earnedBadges = badges.filter(badge => badge.earned).length;
  const stats = { monthPosition:currentOwn.position, monthPoints:currentOwn.score, totalPoints:Number(simulation?.totalPoints || 0) };
  return <div style={{ position:'fixed', inset:0, zIndex:10020, background:'#F3F7FC', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
    <div style={{ minHeight:250, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px 28px', color:'#fff', background:'radial-gradient(circle at 88% 8%,rgba(93,225,255,.3),transparent 28%),linear-gradient(145deg,#071B3A,#0D4D91 68%,#087CC1)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><button onClick={onBack} aria-label="Voltar" style={challengeRoundButton}>‹</button><span style={{ fontSize:10.5, fontWeight:900, letterSpacing:1.3, color:'#B9F2FF', textTransform:'uppercase' }}>Science English</span><button onClick={() => setPanel('duels')} aria-label="Desafiar alguém" style={{ ...challengeRoundButton, fontSize:17 }}>⚔️</button></div>
      <div style={{ textAlign:'center', marginTop:22 }}><div style={{ fontSize:38 }}>🏆</div><div style={{ fontSize:10.5, fontWeight:900, letterSpacing:1.5, color:'#A9EEFF', textTransform:'uppercase', marginTop:7 }}>Desafio semanal</div><h1 style={{ fontSize:25, margin:'7px 0 5px', lineHeight:1.1 }}>Desafio Science English</h1><p style={{ margin:0, color:'rgba(255,255,255,.73)', fontSize:12.5 }}>O que vale é dominar o que você já estudou.</p></div>
    </div>
    <div style={{ padding:'0 16px 28px', marginTop:-26 }}>
      <div style={{ padding:18, background:'#fff', border:'1px solid #DCE7F4', borderRadius:22, boxShadow:'0 12px 28px rgba(7,27,58,.1)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}><div><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, letterSpacing:1, textTransform:'uppercase' }}>{upcoming ? 'Próxima rodada' : 'Parte 1 disponível'}</span><strong style={{ display:'block', color:'#071B3A', fontSize:17, marginTop:3 }}>{upcoming ? 'Começa segunda-feira' : 'Valendo até quarta-feira'}</strong></div><span style={{ padding:'7px 9px', borderRadius:10, color:'#0D5AA7', background:'#E8F3FF', fontSize:10.5, fontWeight:900 }}>5 PERGUNTAS</span></div>
        <div style={{ display:'flex', gap:8, marginTop:14 }}><div style={{ flex:1, padding:'10px 11px', borderRadius:12, background:'#F4F8FC' }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9.5 }}>Tempo</span><strong style={{ color:'#213B5B', fontSize:12.5 }}>45s por pergunta</strong></div><div style={{ flex:1, padding:'10px 11px', borderRadius:12, background:'#F4F8FC' }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9.5 }}>Valor</span><strong style={{ color:'#213B5B', fontSize:12.5 }}>Até 500 pontos</strong></div></div>
        {previewAllowed ? <button onClick={onStart} style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:14, color:'#fff', background:'linear-gradient(135deg,#147AE0,#0757A5)', boxShadow:'0 8px 18px rgba(20,122,224,.23)', fontFamily:'inherit', fontSize:13, fontWeight:900, cursor:'pointer' }}>{upcoming ? 'TESTAR EXPERIÊNCIA' : 'COMEÇAR DESAFIO'} →</button> : <button disabled style={{ width:'100%', border:0, borderRadius:14, padding:14, marginTop:14, color:'#6D8199', background:'#E7EEF6', fontFamily:'inherit', fontSize:12.5, fontWeight:900 }}>LIBERA EM 17 DE AGOSTO</button>}
        {previewAllowed && upcoming && <div style={{ color:'#7B8DA3', fontSize:10.5, textAlign:'center', marginTop:8 }}>Prévia do professor · respostas não serão registradas</div>}
        <button onClick={() => setPanel('rules')} style={{ width:'100%', border:0, background:'transparent', color:'#0D5AA7', fontFamily:'inherit', fontSize:11.5, fontWeight:800, marginTop:12, cursor:'pointer' }}>Ver regras e pontuação</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8, marginTop:12 }}>
        {[['Posição mensal',stats.monthPosition ? `${stats.monthPosition}º` : '—'],['Pontos do mês',Number(stats.monthPoints || 0).toLocaleString('pt-BR')],['Total acumulado',Number(stats.totalPoints || 0).toLocaleString('pt-BR')]].map(([label,value]) => <div key={label} style={{ minWidth:0, padding:'13px 8px', textAlign:'center', borderRadius:15, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color:'#0D3F82', fontSize:15 }}>{value}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:8.8, lineHeight:1.25, marginTop:4 }}>{label}</span></div>)}
      </div>
      <div style={{ marginTop:16, padding:'15px', borderRadius:18, background:'#fff', border:'1px solid #DCE7F4' }}><div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}><div><span style={{ display:'block', color:'#0D5AA7', fontSize:9.5, fontWeight:900, textTransform:'uppercase', letterSpacing:.9 }}>Ranking de {currentMonth.label.toLowerCase()}</span><strong style={{ display:'block', color:'#071B3A', fontSize:14, marginTop:3 }}>{currentMonth.ranking.length || 0} participantes</strong></div><span style={{ padding:'6px 8px', borderRadius:9, background:'#E8F3FF', color:'#0D5AA7', fontSize:9.5, fontWeight:900 }}>ATUALIZA DOMINGO</span></div><div style={{ marginTop:5 }}>{simulation ? <ChallengeRanking month={currentMonth} compact /> : <div style={{ padding:'18px 4px', color:'#7B8DA3', fontSize:11.5, textAlign:'center' }}>Carregando a simulação...</div>}</div></div>
      <button onClick={() => setPanel('history')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, marginTop:12, padding:'14px 15px', borderRadius:17, border:'1px solid #DCE7F4', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}><span style={{ width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:'#E7F3FF', fontSize:20 }}>📊</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#071B3A', fontSize:13.5 }}>Meu histórico</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10.5, marginTop:2 }}>Junho, julho e agosto · semana por semana</span></span><span style={{ color:'#8EA0B5', fontSize:20 }}>›</span></button>
      <button onClick={() => setPanel('badges')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, marginTop:9, padding:'14px 15px', borderRadius:17, border:'1px solid #DCE7F4', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}><span style={{ width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:'#FFF5D9', fontSize:21 }}>🏅</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#071B3A', fontSize:13.5 }}>Meus selos</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10.5, marginTop:2 }}>{earnedBadges} conquistados · veja sua coleção</span></span><span style={{ color:'#8EA0B5', fontSize:20 }}>›</span></button>
    </div>
    {panel === 'rules' && <ChallengeRules onClose={() => setPanel(null)} />}
    {panel === 'duels' && <ChallengeDuels simulation={simulation} onClose={() => setPanel(null)} />}
    {panel === 'badges' && <ChallengeBadges badges={badges} onClose={() => setPanel(null)} />}
    {panel === 'history' && <ChallengeHistory simulation={simulation} onClose={() => setPanel(null)} />}
  </div>;
}

function ChallengeGame({ onFinish, onExit }) {
  const [phase, setPhase] = React.useState('intro');
  const [questionIndex, setQuestionIndex] = React.useState(0);
  const [answer, setAnswer] = React.useState('');
  const [seconds, setSeconds] = React.useState(CHALLENGE_TIME_SECONDS);

  const completeCurrent = React.useCallback(() => {
    if (questionIndex >= CHALLENGE_PREVIEW_QUESTIONS.length - 1) { setPhase('done'); return; }
    setQuestionIndex(i => i + 1); setAnswer(''); setSeconds(CHALLENGE_TIME_SECONDS); setPhase('transition');
    setTimeout(() => setPhase('question'), 650);
  }, [questionIndex]);

  React.useEffect(() => {
    if (phase !== 'question') return;
    const timer = setInterval(() => setSeconds(value => {
      if (value <= 1) { clearInterval(timer); setTimeout(completeCurrent, 0); return 0; }
      return value - 1;
    }), 1000);
    return () => clearInterval(timer);
  }, [phase, questionIndex, completeCurrent]);

  const start = () => { setQuestionIndex(0); setAnswer(''); setSeconds(CHALLENGE_TIME_SECONDS); setPhase('question'); };
  const question = CHALLENGE_PREVIEW_QUESTIONS[questionIndex];
  const timerTone = seconds <= 10 ? '#FF7B7B' : '#5DE1FF';

  return <div style={{ position:'fixed', inset:0, zIndex:10040, maxWidth:480, margin:'0 auto', color:'#fff', background:'radial-gradient(circle at 80% 4%,rgba(35,139,255,.34),transparent 28%),linear-gradient(160deg,#06162F,#071F43 54%,#092B56)', overflow:'hidden' }}>
    {phase === 'intro' && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top, 0px) + 20px) 22px calc(env(safe-area-inset-bottom, 0px) + 22px)' }}>
      <button onClick={onExit} aria-label="Fechar prévia" style={{ ...challengeRoundButton, alignSelf:'flex-end' }}>×</button>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}><div style={{ width:76, height:76, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:24, background:'linear-gradient(145deg,#238BFF,#0A5BB4)', boxShadow:'0 16px 38px rgba(35,139,255,.35)', fontSize:37 }}>🏆</div><div style={{ color:'#7DE7FF', fontSize:10.5, fontWeight:900, textTransform:'uppercase', letterSpacing:1.7, marginTop:24 }}>Parte 1 · prévia</div><h2 style={{ fontSize:27, margin:'8px 0 10px' }}>Você está pronto?</h2><p style={{ color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55, maxWidth:310 }}>5 perguntas. 45 segundos para cada uma. Depois de enviar, não será possível voltar.</p><div style={{ display:'flex', gap:7, marginTop:15 }}>{CHALLENGE_PREVIEW_QUESTIONS.map((_,i) => <span key={i} style={{ width:8, height:8, borderRadius:'50%', background:i === 0 ? '#5DE1FF' : 'rgba(255,255,255,.2)' }} />)}</div></div>
      <button onClick={start} style={{ width:'100%', border:0, borderRadius:16, padding:16, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13.5, fontWeight:900, cursor:'pointer' }}>COMEÇAR AGORA →</button>
    </div>}
    {phase === 'transition' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center' }}><div style={{ width:62, height:62, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'#168C72', fontSize:29 }}>✓</div><strong style={{ fontSize:18, marginTop:14 }}>Resposta enviada</strong><span style={{ color:'rgba(255,255,255,.6)', fontSize:12, marginTop:5 }}>Preparando a próxima…</span></div>}
    {phase === 'question' && <div style={{ height:'100%', display:'flex', flexDirection:'column', padding:'calc(env(safe-area-inset-top, 0px) + 18px) 18px calc(env(safe-area-inset-bottom, 0px) + 18px)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:12 }}><div style={{ flex:1, display:'flex', gap:5 }}>{CHALLENGE_PREVIEW_QUESTIONS.map((_,i) => <span key={i} style={{ flex:1, height:4, borderRadius:4, background:i <= questionIndex ? '#5DE1FF' : 'rgba(255,255,255,.16)' }} />)}</div><strong style={{ color:timerTone, minWidth:44, textAlign:'right', fontSize:18, fontVariantNumeric:'tabular-nums' }}>0:{String(seconds).padStart(2,'0')}</strong></div>
      <div style={{ color:'#8DEBFF', fontSize:10, fontWeight:900, letterSpacing:1.1, textTransform:'uppercase', marginTop:24 }}>Pergunta {questionIndex + 1} de 5 · {question.type}</div>
      <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', minHeight:0 }}><h2 style={{ fontSize:19, lineHeight:1.38, margin:'0 0 14px' }}>{question.prompt}</h2><div style={{ padding:'17px 16px', borderRadius:17, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.13)', fontSize:16, fontWeight:700, lineHeight:1.45 }}>{question.context}</div><div style={{ color:'rgba(255,255,255,.52)', fontSize:10.5, marginTop:9 }}>{question.hint}</div><textarea autoFocus value={answer} onChange={e => setAnswer(e.target.value)} spellCheck="false" autoCorrect="off" autoCapitalize="sentences" placeholder="Digite sua resposta…" style={{ width:'100%', minHeight:112, boxSizing:'border-box', resize:'none', marginTop:18, padding:'15px', borderRadius:17, border:'1.5px solid rgba(93,225,255,.48)', outline:'none', color:'#071B3A', background:'#F7FCFF', fontFamily:'inherit', fontSize:15, lineHeight:1.45, boxShadow:'0 10px 24px rgba(0,0,0,.15)' }} /></div>
      <button onClick={completeCurrent} style={{ width:'100%', border:0, borderRadius:15, padding:15, color:'#06162F', background:answer.trim() ? 'linear-gradient(135deg,#5DE1FF,#E5FBFF)' : '#8CA3B9', fontFamily:'inherit', fontSize:13, fontWeight:900, cursor:'pointer' }}>ENVIAR RESPOSTA →</button>
    </div>}
    {phase === 'done' && <div style={{ height:'100%', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'30px 24px' }}><div style={{ width:82, height:82, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'linear-gradient(145deg,#168C72,#35C69F)', boxShadow:'0 18px 40px rgba(22,140,114,.3)', fontSize:39 }}>✓</div><div style={{ color:'#8DEBFF', fontSize:10.5, fontWeight:900, letterSpacing:1.4, textTransform:'uppercase', marginTop:24 }}>Desafio finalizado</div><h2 style={{ fontSize:26, margin:'8px 0' }}>Suas 5 respostas foram enviadas</h2><p style={{ maxWidth:320, color:'rgba(255,255,255,.66)', fontSize:13, lineHeight:1.55 }}>O resultado, sua posição e as correções serão liberados no domingo, 23 de agosto.</p><div style={{ width:'100%', maxWidth:330, marginTop:14, padding:'14px 15px', borderRadius:16, background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.13)' }}><span style={{ display:'block', color:'#8DEBFF', fontSize:9.5, fontWeight:900, textTransform:'uppercase' }}>Próximo desafio</span><strong style={{ display:'block', fontSize:14, marginTop:4 }}>Quinta-feira, 20 de agosto</strong></div><button onClick={onFinish} style={{ width:'100%', maxWidth:330, border:0, borderRadius:16, padding:15, marginTop:22, color:'#06162F', background:'linear-gradient(135deg,#5DE1FF,#E5FBFF)', fontFamily:'inherit', fontSize:13, fontWeight:900, cursor:'pointer' }}>VOLTAR AO DESAFIO</button><span style={{ color:'rgba(255,255,255,.42)', fontSize:10, marginTop:13 }}>Prévia: nenhuma resposta foi registrada</span></div>}
  </div>;
}
