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
  ['🌱','Primeiro Acerto','Acerte 1 das 5 perguntas'],
  ['✌️','Dupla Certeira','Acerte 2 das 5 perguntas'],
  ['🔺','Trinca de Acertos','Acerte 3 das 5 perguntas'],
  ['⭐','Quase Perfeito','Acerte 4 das 5 perguntas'],
  ['🖐️','Cinco de Ouro','Acerte as 5 perguntas'],
  ['💎','100% Perfeito','Faça 500 de 500 pontos'],
  ['🔵','Marca dos 10 Mil','Acumule 10.000 pontos'],
  ['🥉','Mestre dos 50 Mil','Acumule 50.000 pontos'],
  ['🥈','Elite Science English','Acumule 100.000 pontos'],
  ['🏆','Campeão do Mês','Termine o mês em 1º lugar'],
];

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

function ChallengeBadges({ onClose }) {
  return <div style={{ position:'absolute', inset:0, zIndex:4, background:'#F3F7FC', overflowY:'auto' }}>
    <ChallengeSubpageHeader title="Meus selos" subtitle="Suas conquistas ficam guardadas aqui" onClose={onClose} />
    <div style={{ padding:'18px 16px 32px', display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:10 }}>
      {CHALLENGE_BADGES.map(([icon,title,detail]) => <div key={title} style={{ padding:'16px 12px', textAlign:'center', borderRadius:18, background:'#fff', border:'1px solid #DCE7F4', opacity:.68 }}>
        <div style={{ width:54, height:54, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', background:'#E8EFF7', filter:'grayscale(1)', fontSize:27 }}>{icon}</div>
        <strong style={{ display:'block', color:'#213B5B', fontSize:12.5 }}>{title}</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10, lineHeight:1.35, marginTop:5 }}>{detail}</span>
        <span style={{ display:'inline-block', marginTop:9, padding:'4px 7px', borderRadius:999, background:'#EDF2F7', color:'#8291A3', fontSize:8.5, fontWeight:900, textTransform:'uppercase' }}>Bloqueado</span>
      </div>)}
    </div>
  </div>;
}

function ChallengeHub({ student, previewAllowed, onBack, onStart }) {
  const [panel, setPanel] = React.useState(null);
  const upcoming = Date.now() < CHALLENGE_LAUNCH_AT.getTime();
  const stats = student?.challengeStats || {};
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
      <button onClick={() => setPanel('badges')} style={{ width:'100%', display:'flex', alignItems:'center', gap:12, marginTop:12, padding:'14px 15px', borderRadius:17, border:'1px solid #DCE7F4', background:'#fff', cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}><span style={{ width:40, height:40, borderRadius:13, display:'flex', alignItems:'center', justifyContent:'center', background:'#FFF5D9', fontSize:21 }}>🏅</span><span style={{ flex:1 }}><strong style={{ display:'block', color:'#071B3A', fontSize:13.5 }}>Meus selos</strong><span style={{ display:'block', color:'#7B8DA3', fontSize:10.5, marginTop:2 }}>Descubra todas as conquistas</span></span><span style={{ color:'#8EA0B5', fontSize:20 }}>›</span></button>
    </div>
    {panel === 'rules' && <ChallengeRules onClose={() => setPanel(null)} />}
    {panel === 'badges' && <ChallengeBadges onClose={() => setPanel(null)} />}
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
