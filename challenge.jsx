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

function ChallengeCard({ onOpen }) {
  const upcoming = Date.now() < CHALLENGE_LAUNCH_AT.getTime();
  return (
    <button type="button" onClick={onOpen} aria-label="Abrir o Desafio Science English" style={{
      width:'100%', boxSizing:'border-box', border:'1px solid rgba(93,225,255,.35)', borderRadius:22,
      padding:'19px 18px', marginBottom:12, overflow:'hidden', position:'relative', color:'#fff', cursor:'pointer',
      textAlign:'left', fontFamily:'inherit', background:challengeBlue, boxShadow:'0 14px 30px rgba(7,27,58,.24)'
    }}>
      <span aria-hidden="true" style={{ position:'absolute', width:150, height:150, borderRadius:'50%', right:-52, top:-70, background:'rgba(93,225,255,.13)' }} />
      <span style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, position:'relative' }}>
        <span style={{ display:'flex', alignItems:'center', gap:9, fontSize:10.5, fontWeight:900, letterSpacing:1.25, textTransform:'uppercase', color:'#A9EEFF' }}>
          <span style={{ width:30, height:30, borderRadius:10, display:'inline-flex', alignItems:'center', justifyContent:'center', background:'rgba(255,255,255,.13)', fontSize:17 }}>🏆</span>
          Desafio Science English
        </span>
        <span style={{ padding:'5px 8px', borderRadius:999, background:upcoming ? 'rgba(255,255,255,.14)' : '#5DE1FF', color:upcoming ? '#fff' : '#071B3A', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>{upcoming ? 'Em breve' : 'Disponível'}</span>
      </span>
      <span style={{ display:'block', position:'relative', fontSize:20, lineHeight:1.15, fontWeight:900, marginTop:14 }}>{upcoming ? 'A disputa começa segunda-feira' : 'Parte 1 disponível agora'}</span>
      <span style={{ display:'block', position:'relative', color:'rgba(255,255,255,.78)', fontSize:12.5, marginTop:6 }}>5 perguntas · 45 segundos cada · até 500 pontos</span>
      <span style={{ display:'flex', position:'relative', alignItems:'center', justifyContent:'space-between', marginTop:16 }}>
        <span style={{ fontSize:11.5, fontWeight:750, color:'#D8F8FF' }}>{upcoming ? '17 de agosto' : 'Termina quarta-feira, 23:59'}</span>
        <span style={{ padding:'8px 12px', borderRadius:11, background:'#fff', color:'#0B4C91', fontSize:10.5, fontWeight:900 }}>VER DESAFIO →</span>
      </span>
    </button>
  );
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
      <div style={{ padding:17, borderRadius:18, color:'#fff', background:challengeBlue }}><strong style={{ display:'block', fontSize:15 }}>Como funciona</strong><div style={{ fontSize:12.5, lineHeight:1.65, marginTop:8, color:'rgba(255,255,255,.84)' }}>São 5 perguntas, uma por vez, com 45 segundos cada. Há uma única tentativa e não é possível voltar. Se você sair do aplicativo, bloquear a tela ou trocar de aba, a resposta atual será enviada.</div></div>
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
    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:7 }}>{podium.map(row => <div key={`podium-${row.name}`} style={{ minWidth:0, padding:'12px 6px', borderRadius:14, textAlign:'center', background:row.position === 1 ? '#FFF8E1' : row.isOwn ? '#EAF5FF' : '#F5F8FC', border:`1px solid ${row.position === 1 ? '#F1D273' : row.isOwn ? '#82C3F3' : '#DCE7F4'}` }}><span style={{ display:'block', fontSize:row.position === 1 ? 22 : 16 }}>{row.position === 1 ? '👑' : row.position === 2 ? '🥈' : '🥉'}</span><strong style={{ display:'block', marginTop:5, color:row.isOwn ? '#0D3F82' : '#183451', fontSize:10.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.isOwn ? `${row.name} · você` : row.name}</strong><span style={{ display:'block', color:'#0D5AA7', fontSize:10, fontWeight:900, marginTop:3 }}>{row.score.toLocaleString('pt-BR')}</span></div>)}</div>
    {own.position > 3 && <div style={{ marginTop:8 }}><div style={rowStyle(own.position, true)}><span style={{ width:25, textAlign:'center', color:'#0D5AA7', fontSize:12, fontWeight:900 }}>{own.position}º</span><span style={{ flex:1, color:'#0D3F82', fontSize:12, fontWeight:900 }}>Você</span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{own.score.toLocaleString('pt-BR')}</strong></div></div>}
    {showAll && <React.Fragment><div style={{ margin:'15px 2px 2px', color:'#70839A', fontSize:9.5, fontWeight:900, letterSpacing:.8, textTransform:'uppercase' }}>Lista completa · {ranking.length} participantes</div>{shown.map(row => <div key={`all-${row.name}`} style={rowStyle(row.position,row.isOwn)}><span style={{ width:25, textAlign:'center', fontSize:12, fontWeight:900, color:row.position <= 3 ? '#B27D09' : row.isOwn ? '#0D5AA7' : '#64748B' }}>{row.position}º</span><span style={{ flex:1, minWidth:0, color:row.isOwn ? '#0D3F82' : '#213B5B', fontSize:12, fontWeight:row.isOwn ? 900 : 750, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{row.isOwn ? `${row.name} · você` : row.name}</span><strong style={{ color:'#0D5AA7', fontSize:12 }}>{row.score.toLocaleString('pt-BR')}</strong></div>)}</React.Fragment>}
  </div>;
}

function ChallengeCorrections({ week, onClose }) {
  const [filter, setFilter] = React.useState('all');
  const [openIndex, setOpenIndex] = React.useState(null);
  const questions = Array.isArray(week?.questions) ? week.questions : [];
  const filtered = questions.map((question,index) => ({ ...question, originalIndex:index })).filter(question => filter === 'all' || (filter === 'correct' ? question.score >= 80 : question.score < 80));
  const accuracy = Math.round(Number(week?.ownScore || 0) / 10);
  const filterLabel = { all:'Todas', correct:'Acertos', errors:'Erros' };
  return <div style={{ position:'absolute', inset:0, zIndex:5, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title={`${week?.label || 'Semana'} · ${week?.range || ''}`} subtitle={`${week?.ownScore || 0} pontos · ${accuracy}% de aproveitamento`} onClose={onClose} />
    <div style={{ padding:'16px 16px 32px' }}>
      <div style={{ marginBottom:10, padding:'10px 12px', borderRadius:13, background:'#EAF5FF', border:'1px solid #B9DDFB', color:'#0D4F91', fontSize:10.5, lineHeight:1.45 }}><strong>Regra de precisão:</strong> ponto final é opcional e nunca desconta. Apenas vírgula obrigatória e interrogação obrigatória podem perder pontos.</div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:8 }}>
        {[['Aproveitamento',`${accuracy}%`],['Acertos',`${week?.correct || 0}/10`],['Posição',`${week?.ownPosition || '—'}º`]].map(([label,value]) => <div key={label} style={{ padding:'13px 7px', textAlign:'center', borderRadius:14, background:'#fff', border:'1px solid #DCE7F4' }}><strong style={{ display:'block', color:'#0D5AA7', fontSize:16 }}>{value}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:9, marginTop:3 }}>{label}</span></div>)}
      </div>
      <div style={{ display:'flex', padding:4, marginTop:12, borderRadius:14, background:'#E4EDF6' }}>{Object.entries(filterLabel).map(([id,label]) => <button key={id} onClick={() => { setFilter(id); setOpenIndex(null); }} style={{ flex:1, border:0, borderRadius:11, padding:'9px 4px', background:filter === id ? '#fff' : 'transparent', color:filter === id ? '#0D3F82' : '#70839A', boxShadow:filter === id ? '0 3px 9px rgba(7,27,58,.08)' : 'none', fontFamily:'inherit', fontSize:11, fontWeight:900, cursor:'pointer' }}>{label}{id === 'correct' ? ` (${questions.filter(q => q.score >= 80).length})` : id === 'errors' ? ` (${questions.filter(q => q.score < 80).length})` : ''}</button>)}</div>
      <div style={{ display:'grid', gap:9, marginTop:12 }}>{filtered.map(question => {
        const open = openIndex === question.originalIndex;
        const perfect = question.score === 100;
        const correct = question.score >= 80;
        const tone = perfect ? '#0D5AA7' : correct ? '#168C72' : question.score > 0 ? '#B87316' : '#B33A3A';
        const label = perfect ? 'Perfeita' : correct ? 'Acertou' : question.score > 0 ? 'Acerto parcial' : 'Não respondeu';
        return <div key={question.originalIndex} style={{ borderRadius:17, background:'#fff', border:`1px solid ${open ? tone : '#DCE7F4'}`, overflow:'hidden' }}><button onClick={() => setOpenIndex(open ? null : question.originalIndex)} style={{ width:'100%', display:'flex', alignItems:'center', gap:11, padding:'13px 14px', border:0, background:'transparent', textAlign:'left', cursor:'pointer', fontFamily:'inherit' }}><span style={{ width:34, height:34, borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', background:`${tone}16`, color:tone, fontSize:12, fontWeight:900 }}>{question.originalIndex + 1}</span><span style={{ flex:1, minWidth:0 }}><strong style={{ display:'block', color:'#102C4E', fontSize:12.5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{question.prompt}</strong><span style={{ display:'block', color:tone, fontSize:9.5, fontWeight:850, marginTop:3 }}>{label}</span></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', color:tone, fontSize:14 }}>{question.score}%</strong><span style={{ color:'#8CA0B5', fontSize:17 }}>{open ? '⌃' : '⌄'}</span></span></button>{open && <div style={{ padding:'0 14px 15px', borderTop:'1px solid #EDF2F7' }}><div style={{ marginTop:12 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Sua resposta</span><div style={{ marginTop:5, padding:'10px 11px', borderRadius:11, background:correct ? '#F1FBF7' : '#FFF8EA', color:'#253B54', fontSize:12, lineHeight:1.45 }}>{question.answer || 'Sem resposta'}</div></div><div style={{ marginTop:11 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Resposta esperada</span><div style={{ marginTop:5, padding:'10px 11px', borderRadius:11, background:'#EEF6FF', color:'#0D3F82', fontSize:12, lineHeight:1.45 }}>{question.expected}</div></div>{question.deductions?.length > 0 && <div style={{ marginTop:11 }}><span style={{ display:'block', color:'#7B8DA3', fontSize:9, fontWeight:900, textTransform:'uppercase' }}>Onde perdeu pontos</span>{question.deductions.map((deduction,index) => <div key={index} style={{ display:'flex', gap:8, marginTop:6, color:'#8F4C13', fontSize:10.5, lineHeight:1.4 }}><strong style={{ flexShrink:0 }}>−{deduction.points}</strong><span>{deduction.reason}</span></div>)}</div>}<div style={{ marginTop:11, padding:'10px 11px', borderRadius:11, background:'#F7FAFD', color:'#53677E', fontSize:10.5, lineHeight:1.5 }}><strong style={{ color:'#213B5B' }}>Explicação: </strong>{question.explanation}</div></div>}</div>;
      })}</div>
      {!filtered.length && <div style={{ padding:28, textAlign:'center', color:'#8091A5', fontSize:12 }}>Nenhuma pergunta nesta categoria.</div>}
    </div>
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
        return <div key={week.range} style={{ padding:'14px 15px', borderRadius:17, background:'#fff', border:`1px solid ${weeklyWinner ? '#F2CF6B' : '#DCE7F4'}`, boxShadow:weeklyWinner ? '0 7px 18px rgba(194,139,18,.08)' : 'none' }}><div style={{ display:'flex', alignItems:'center', gap:11 }}><span style={{ width:39, height:39, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', background:weeklyWinner ? '#FFF5D6' : '#EBF4FC', fontSize:19 }}>{weeklyWinner ? '👑' : '📅'}</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#102C4E', fontSize:13 }}>{week.label} <span style={{ color:'#8191A3', fontWeight:650 }}>· {week.range}</span></strong><span style={{ display:'block', color:'#70839A', fontSize:10.5, marginTop:3 }}>{week.correct} de 10 perguntas acertadas{week.partial ? ' · parcial' : ''}</span></span><span style={{ textAlign:'right' }}><strong style={{ display:'block', color:'#0D5AA7', fontSize:14 }}>{week.ownScore}</strong><span style={{ color:weeklyWinner ? '#A36E00' : '#70839A', fontSize:9.5, fontWeight:900 }}>{week.ownPosition}º {week.partial ? 'provisório' : 'lugar'}</span></span></div>{weeklyWinner && <div style={{ marginTop:10, padding:'7px 9px', borderRadius:10, background:'#FFF8E5', color:'#966300', fontSize:10, fontWeight:850 }}>🏅 Selo conquistado: Vencedora da Semana</div>}<button onClick={() => setSelectedWeek(week)} style={{ width:'100%', border:0, borderTop:'1px solid #EDF2F7', marginTop:10, padding:'9px 0 0', background:'transparent', color:'#0D5AA7', fontFamily:'inherit', fontSize:10.5, fontWeight:900, cursor:'pointer' }}>VER AS 10 PERGUNTAS →</button></div>;
      })}</div>
      <div style={{ marginTop:20, fontSize:10.5, fontWeight:900, letterSpacing:1, color:'#0D5AA7', textTransform:'uppercase' }}>Ranking de {month.label}</div>
      <div style={{ marginTop:9, padding:12, borderRadius:17, background:'#fff', border:'1px solid #DCE7F4' }}><ChallengeRanking month={month} showAll /></div>
    </div>
    {selectedWeek && <ChallengeCorrections week={selectedWeek} onClose={() => setSelectedWeek(null)} />}
  </div>;
}

function ChallengeHub({ student, simulation, previewAllowed, onBack, onStart }) {
  const [panel, setPanel] = React.useState(null);
  const upcoming = Date.now() < CHALLENGE_LAUNCH_AT.getTime();
  const months = simulation?.months || [];
  const currentMonth = months[months.length - 1] || { label:'Agosto', ranking:[] };
  const currentOwn = currentMonth.ranking.find(row => row.isOwn) || { position:null, score:0 };
  const badges = challengeSimulationBadges(simulation);
  const earnedBadges = badges.filter(badge => badge.earned).length;
  const stats = { monthPosition:currentOwn.position, monthPoints:currentOwn.score, totalPoints:Number(simulation?.totalPoints || 0) };
  return <div style={{ position:'fixed', inset:0, zIndex:10020, background:'#F3F7FC', maxWidth:480, margin:'0 auto', overflowY:'auto' }}>
    <div style={{ minHeight:250, padding:'calc(env(safe-area-inset-top, 0px) + 14px) 18px 28px', color:'#fff', background:'radial-gradient(circle at 88% 8%,rgba(93,225,255,.3),transparent 28%),linear-gradient(145deg,#071B3A,#0D4D91 68%,#087CC1)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><button onClick={onBack} aria-label="Voltar" style={challengeRoundButton}>‹</button><span style={{ fontSize:10.5, fontWeight:900, letterSpacing:1.3, color:'#B9F2FF', textTransform:'uppercase' }}>Science English</span><button onClick={() => setPanel('badges')} aria-label="Meus selos" style={{ ...challengeRoundButton, fontSize:18 }}>🏅</button></div>
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
