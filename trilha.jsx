// Trilhas — Entrevista, Business e Viagem (desenho aprovado em _mockup-trilhas.html).
// O professor ativa a trilha no painel (students/{uid}.trilha = { tipo }). A aluna ganha um 3º botão na aba Atividades,
// conta sobre a vaga/trabalho/viagem num formulário (students/{uid}/trilha/briefing) e o professor monta as etapas.
// Cada TAREFA é uma atividade extra comum (students/{uid}/extras) com três campos a mais: trilha, etapa (1, 2, 3...) e
// ordem. Etapa publicada = tem tarefa enviada; sem tarefa aparece "Em breve". O motor de exercícios, a gravação de áudio
// e o "Consultar pós-aula" são os do ExtraModal.
// Cores, rótulos e postTrilha() moram no index.html (valem em qualquer lista de pós-aulas). Nomes aqui começam com
// Trilha/TRILHA_ porque os .jsx compartilham o escopo global (ver plano.jsx).

const TRILHA_CONF = {
  entrevista: {
    titulo: 'Inglês para entrevista',
    intro: 'Vamos preparar você para a sua entrevista: entender as perguntas, responder com segurança e treinar a fala antes do grande dia.',
    como: [['📝', 'Você conta sobre a vaga', 'Lugar, função e o que espera. Leva uns 3 minutos.'],
           ['🛠', 'O professor monta o seu material', 'Perguntas e respostas feitas para ESSA vaga, não genéricas.'],
           ['🎤', 'Você treina e grava', 'Ouve a pergunta, responde falando e recebe retorno.']],
    comecar: 'a sua entrevista',
    principal: 'local',
    campos: [
      { k: 'local', t: 'texto', l: 'Onde vai ser a entrevista?', h: 'Nome do lugar e a cidade.', ph: 'Ex.: Sunrise Care Home, Dublin' },
      { k: 'tipoLugar', t: 'chips', l: 'Que tipo de lugar é?', o: ['Nursing home', 'Hospital', 'Clínica', 'Home care', 'Outro'] },
      { k: 'funcao', t: 'texto', l: 'Qual é a função (o cargo)?', ph: 'Ex.: Care Assistant' },
      { k: 'fazer', t: 'area', l: 'O que você vai fazer nessa função?', h: 'Se não sabe ao certo, escreva o que imagina. A gente completa juntos.', ph: 'Ex.: ajudar os moradores com higiene, refeições, locomoção…' },
      { k: 'espera', t: 'area', l: 'O que você espera dessa vaga?', ph: 'Ex.: horário fixo, equipe boa, crescer na área…' },
      { k: 'quando', t: 'data', l: 'Já tem data para a entrevista?', h: 'Deixe em branco se ainda não sabe. O contador de dias só aparece se você preencher.', opt: 1 },
      { k: 'formato', t: 'chips', l: 'Como vai ser?', o: ['Presencial', 'Vídeo', 'Telefone', 'Ainda não sei'] },
      { k: 'exp', t: 'chips', l: 'Sua experiência na área', o: ['Já trabalhei nessa área', 'Trabalhei em outra área', 'Seria a primeira vez'] },
      { k: 'medo', t: 'multi', l: 'O que mais te preocupa?', h: 'Pode marcar vários.', o: ['Entender as perguntas', 'Entender o sotaque', 'Falar sobre mim', 'Vocabulário da área', 'Nervosismo', 'Responder rápido'] },
      { k: 'vaga', t: 'area', l: 'Tem o anúncio da vaga?', h: 'Cole o texto ou o link. Ajuda muito a gente acertar as perguntas.', ph: 'Cole aqui…', opt: 1 },
    ],
    sub: r => [r.funcao, trilhaCurto(r.local)].filter(Boolean).join(' · '),
    cdRot: 'Entrevista',
    etapas: [
      { ic: '🧭', n: 'Conheça a vaga', d: 'Vocabulário da função e do lugar' },
      { ic: '🗣', n: 'Fale sobre você', d: '“Tell me about yourself”, em blocos' },
      { ic: '❓', n: 'As perguntas que vão cair', d: 'As perguntas clássicas, feitas para a sua vaga' },
      { ic: '🏥', n: 'Situações da função', d: '“O que você faria se…?”' },
      { ic: '👂', n: 'Entenda a pergunta', d: 'Ouvir o entrevistador, vários sotaques' },
      { ic: '🙋', n: 'Suas perguntas para eles', d: '“Do you have any questions for us?”' },
      { ic: '🎬', n: 'Simulação da entrevista', d: 'Tudo junto, com gravação' },
      { ic: '🍀', n: 'Dia da entrevista', d: 'Colinha com frases de segurança' },
    ],
  },
  business: {
    titulo: 'Inglês para o trabalho',
    intro: 'Inglês do dia a dia profissional: reuniões, e-mails, calls e apresentações, com as situações do SEU trabalho.',
    como: [['📝', 'Você conta sobre o seu trabalho', 'Empresa, área e as situações em que precisa do inglês.'],
           ['🛠', 'O professor monta o seu material', 'Reuniões, e-mails e calls com o vocabulário da sua área.'],
           ['🎤', 'Você treina e grava', 'Pratica falando e escrevendo, com retorno.']],
    comecar: 'o seu trabalho',
    principal: 'empresa',
    campos: [
      { k: 'empresa', t: 'texto', l: 'Onde você trabalha (ou quer trabalhar)?', ph: 'Ex.: Acme Logistics' },
      { k: 'area', t: 'texto', l: 'Qual é a sua área ou função?', ph: 'Ex.: Customer Success' },
      { k: 'situacoes', t: 'multi', l: 'Em que situações você precisa do inglês?', h: 'Pode marcar vários.', o: ['Reuniões', 'E-mails e mensagens', 'Calls e videochamadas', 'Apresentações', 'Negociação', 'Small talk com colegas'] },
      { k: 'com', t: 'multi', l: 'Com quem você fala em inglês?', o: ['Clientes', 'Colegas', 'Chefia', 'Fornecedores'] },
      { k: 'trava', t: 'area', l: 'Qual situação em inglês mais te trava hoje?', ph: 'Ex.: dar opinião numa reunião sem perder o raciocínio…' },
      { k: 'dia', t: 'area', l: 'Como é um dia típico do seu trabalho?', ph: 'Conte em poucas linhas…', opt: 1 },
      { k: 'quando', t: 'data', l: 'Tem um prazo? (reunião, apresentação, projeto)', h: 'Deixe em branco se não tem.', opt: 1 },
    ],
    sub: r => [r.area, trilhaCurto(r.empresa)].filter(Boolean).join(' · '),
    cdRot: 'Prazo',
    etapas: [
      { ic: '🏢', n: 'Sua função e sua empresa', d: 'Apresente-se e explique o que faz' },
      { ic: '📅', n: 'Reuniões', d: 'Abrir, opinar e discordar com educação' },
      { ic: '✉️', n: 'E-mails e mensagens', d: 'Pedir, responder e cobrar' },
      { ic: '📞', n: 'Calls e telefone', d: '“Could you repeat that, please?”' },
      { ic: '📊', n: 'Apresentações', d: 'Estrutura, transições e perguntas' },
      { ic: '🤝', n: 'Negociação e small talk', d: 'Conversa com cliente e colegas' },
      { ic: '🎬', n: 'Simulação: um dia de trabalho', d: 'Reunião + e-mail + call, gravado' },
    ],
  },
  viagem: {
    titulo: 'Inglês para viagem',
    intro: 'Inglês para se virar na viagem: aeroporto, hotel, restaurante, transporte e emergências, com o roteiro que você vai fazer.',
    como: [['📝', 'Você conta sobre a viagem', 'Destino, datas e o que pretende fazer por lá.'],
           ['🛠', 'O professor monta o seu material', 'Situações reais do SEU roteiro, com frases prontas.'],
           ['🎤', 'Você treina e grava', 'Ensaia as conversas antes de embarcar.']],
    comecar: 'a sua viagem',
    principal: 'destino',
    campos: [
      { k: 'destino', t: 'texto', l: 'Para onde você vai?', ph: 'Ex.: Dublin, Irlanda' },
      { k: 'quando', t: 'data', l: 'Quando você viaja?', h: 'Deixe em branco se ainda não sabe.', opt: 1 },
      { k: 'com', t: 'chips', l: 'Com quem você vai?', o: ['Sozinho(a)', 'Casal', 'Família', 'Amigos', 'A trabalho'] },
      { k: 'situacoes', t: 'multi', l: 'Em que situações você quer se preparar?', h: 'Pode marcar vários.', o: ['Aeroporto e imigração', 'Hotel', 'Restaurantes', 'Transporte', 'Compras e dinheiro', 'Passeios', 'Saúde e emergências', 'Conversar com locais'] },
      { k: 'medo', t: 'area', l: 'O que mais te preocupa?', ph: 'Ex.: entender o que falam rápido, pedir ajuda…' },
      { k: 'roteiro', t: 'area', l: 'O que quer fazer por lá?', ph: 'Ex.: museus, passeio de ônibus, restaurantes…', opt: 1 },
    ],
    sub: r => trilhaCurto(r.destino),
    cdRot: 'Viagem',
    etapas: [
      { ic: '🗺', n: 'Seu roteiro', d: 'Vocabulário do destino e frases-chave' },
      { ic: '✈️', n: 'Aeroporto e imigração', d: '“What’s the purpose of your visit?”' },
      { ic: '🏨', n: 'Hotel e hospedagem', d: 'Check-in, pedidos e problemas' },
      { ic: '🍽', n: 'Restaurantes e cafés', d: 'Pedir, perguntar e pagar' },
      { ic: '🚌', n: 'Transporte', d: 'Ônibus, táxi, trem e direções' },
      { ic: '🛍', n: 'Compras e dinheiro', d: 'Preços, troco e devoluções' },
      { ic: '🚑', n: 'Saúde e emergências', d: 'Pedir ajuda com clareza' },
      { ic: '🎬', n: 'Simulação: a viagem', d: 'Do aeroporto ao hotel, gravado' },
    ],
  },
};

function trilhaCurto(s) { return String(s || '').split(',')[0].trim(); }
function trilhaDiasAte(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  const hoje = new Date(); hoje.setHours(12, 0, 0, 0);
  return Math.round((d - hoje) / 86400000);
}
function trilhaFmtResp(c, v) {
  if (Array.isArray(v)) return v.join(', ');
  if (c.t === 'data' && v) return String(v).split('-').reverse().join('/');
  return v || '';
}
function trilhaTemResp(v) { return Array.isArray(v) ? v.length > 0 : String(v || '').trim() !== ''; }
// Rótulo curto de cada campo, para o resumo "o que você contou" (as perguntas inteiras são longas demais para a coluna).
const TRILHA_CURTO = { local: 'Local', tipoLugar: 'Tipo de lugar', funcao: 'Função', fazer: 'Vai fazer', espera: 'Espera', formato: 'Formato', exp: 'Experiência', medo: 'Preocupações', vaga: 'Anúncio da vaga', empresa: 'Empresa', area: 'Área / função', situacoes: 'Situações', com: 'Com quem', trava: 'Maior trava', dia: 'Um dia típico', destino: 'Destino', roteiro: 'Roteiro' };
function trilhaRotulo(tipo, c) {
  if (c.k === 'quando') return tipo === 'business' ? 'Prazo' : tipo === 'viagem' ? 'Viagem em' : 'Entrevista em';
  return TRILHA_CURTO[c.k] || c.l;
}
const trilhaFeita = e => !!(e.finalizada || e.status === 'corrected');
const TRILHA_HAB = { listening: ['🎧', 'ouvir'], speaking: ['🎤', 'falar'], reading: ['📖', 'ler'], writing: ['✍️', 'escrever'] };

/* ───────── formulário ───────── */
function TrilhaForm({ tr, conf, inicial, onVoltar, onEnviar }) {
  const [vals, setVals] = React.useState(inicial || {});
  const [enviando, setEnviando] = React.useState(false);
  const set = (k, v) => setVals(a => ({ ...a, [k]: v }));
  const pronto = trilhaTemResp(vals[conf.principal]);
  const entrada = { width: '100%', boxSizing: 'border-box', border: '1.5px solid #E2D9CB', background: '#fff', borderRadius: 13, padding: '11px 12px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', color: '#0F172A', outline: 'none', resize: 'none', lineHeight: 1.4 };
  const campo = c => {
    const v = vals[c.k];
    let corpo = null;
    if (c.t === 'texto') corpo = <input style={entrada} value={v || ''} placeholder={c.ph || ''} onChange={e => set(c.k, e.target.value)} />;
    else if (c.t === 'area') corpo = <textarea style={entrada} rows={3} value={v || ''} placeholder={c.ph || ''} onChange={e => set(c.k, e.target.value)} />;
    else if (c.t === 'data') corpo = <input style={entrada} type="date" value={v || ''} onChange={e => set(c.k, e.target.value)} />;
    else {
      const multi = c.t === 'multi', sel = Array.isArray(v) ? v : (v ? [v] : []);
      corpo = (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
          {c.o.map(o => { const on = sel.includes(o); return (
            <button key={o} type="button" onClick={() => setVals(a => {
              const cur = Array.isArray(a[c.k]) ? a[c.k] : (a[c.k] ? [a[c.k]] : []);
              const tem = cur.includes(o);
              return { ...a, [c.k]: multi ? (tem ? cur.filter(x => x !== o) : cur.concat(o)) : (tem ? '' : o) };
            })}
              style={{ padding: '8px 12px', borderRadius: 999, border: `1.5px solid ${on ? tr.tc : '#E2D9CB'}`, background: on ? tr.bg : '#fff', color: on ? tr.dark : '#475569', fontSize: 12.6, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
              {on ? '✓ ' : ''}{o}
            </button>); })}
        </div>
      );
    }
    return (
      <div key={c.k} style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', marginBottom: 3 }}>{c.l}{c.opt ? <span style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', marginLeft: 5 }}>opcional</span> : null}</div>
        {c.h ? <div style={{ fontSize: 11.4, color: '#64748B', fontWeight: 700, marginBottom: 6, lineHeight: 1.4 }}>{c.h}</div> : null}
        {corpo}
      </div>
    );
  };
  const enviar = async () => {
    if (!pronto || enviando) return;
    setEnviando(true);
    const limpo = {};
    conf.campos.forEach(c => { if (trilhaTemResp(vals[c.k])) limpo[c.k] = typeof vals[c.k] === 'string' ? vals[c.k].trim() : vals[c.k]; });
    const ok = await onEnviar(limpo);
    setEnviando(false);
    if (ok) onVoltar();
  };
  return (
    <div>
      <button onClick={onVoltar} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: tr.dark, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0 10px' }}>&#8249; Voltar</button>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: tr.dark, margin: '0 2px 10px' }}>{tr.ic} Conte para o professor</div>
      {conf.campos.map(campo)}
      <button onClick={enviar} disabled={!pronto || enviando} style={{ width: '100%', border: 'none', borderRadius: 15, padding: 14, marginTop: 4, background: pronto ? tr.grad : '#CBD5E1', color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: pronto && !enviando ? 'pointer' : 'not-allowed' }}>
        {enviando ? 'Enviando…' : 'Enviar para o professor'}
      </button>
      {!pronto && <div style={{ fontSize: 11.5, color: '#D97706', fontWeight: 700, textAlign: 'center', marginTop: 8 }}>Preencha pelo menos o primeiro campo para enviar.</div>}
      <div style={{ height: 72 }} />{/* respiro: o botão flutuante do assistente não cobre o "Enviar" */}
    </div>
  );
}

/* ───────── pedaços do caminho ───────── */
function TrilhaResumo({ tipo, conf, respostas }) {
  const linhas = conf.campos.filter(c => trilhaTemResp(respostas[c.k]));
  return (
    <div style={{ background: '#fff', border: '1px solid #E8DFD2', borderRadius: 16, padding: '6px 14px', margin: '12px 0' }}>
      {linhas.map((c, i) => (
        <div key={c.k} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < linhas.length - 1 ? '1px solid #F1EBE1' : 'none', fontSize: 12.4 }}>
          <span style={{ width: 96, color: '#64748B', fontWeight: 800, flexShrink: 0 }}>{trilhaRotulo(tipo, c)}</span>
          <b style={{ fontWeight: 700, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{trilhaFmtResp(c, respostas[c.k])}</b>
        </div>
      ))}
    </div>
  );
}

function TrilhaNo({ tr, e, st, qtd, feitas, onClick }) {
  const feita = st === 'feita', atual = st === 'atual', vazio = st === 'vazio';
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer',
      background: feita ? '#F0FDF4' : vazio ? 'rgba(255,255,255,.6)' : '#fff', opacity: vazio ? 0.55 : 1,
      border: `1.5px solid ${feita ? '#BBF7D0' : tr.line}`, borderRadius: 16, padding: '10px 12px', marginBottom: 9,
      boxShadow: atual ? `0 0 0 3px ${tr.bg}, 0 8px 18px rgba(15,23,42,.1)` : '0 6px 16px rgba(15,23,42,.06)',
      ...(atual ? { borderColor: tr.tc } : {}),
    }}>
      <span style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 20, fontWeight: 800,
        background: feita ? '#16A34A' : vazio ? '#fff' : tr.bg, color: feita ? '#fff' : 'inherit',
        border: feita ? '2px solid #16A34A' : vazio ? '2px dashed #B8C1CC' : `2px solid ${tr.tc}`, filter: vazio ? 'grayscale(1)' : 'none' }}>{feita ? '✓' : e.ic}</span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <b style={{ display: 'block', fontSize: 13.5, fontWeight: 800, lineHeight: 1.2, color: '#0F172A' }}>{e.n}</b>
        <small style={{ display: 'block', fontSize: 11, color: '#64748B', fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>
          {e.d}{qtd ? ` · ${feitas}/${qtd} tarefa${qtd !== 1 ? 's' : ''}` : ''}
        </small>
      </span>
      {atual && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 999, background: tr.tc, color: '#fff', flexShrink: 0 }}>AGORA</span>}
      {vazio && <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, padding: '3px 8px', borderRadius: 999, background: '#E5E7EB', color: '#6B7280', flexShrink: 0 }}>EM BREVE</span>}
    </button>
  );
}

function TrilhaTarefaLinha({ tr, e, onClick }) {
  const hab = TRILHA_HAB[e.skill] || ['📝', 'tarefa'];
  const feita = trilhaFeita(e);
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: '#fff', border: '1.5px solid #ECE3D5', borderRadius: 14, padding: '11px 12px', marginBottom: 8 }}>
      <span style={{ width: 36, height: 36, borderRadius: 11, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{hab[0]}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 13, fontWeight: 800, lineHeight: 1.25, color: '#0F172A', overflowWrap: 'anywhere' }}>{e.title || 'Tarefa'}</b>
        <small style={{ fontSize: 10.8, fontWeight: 800, color: tr.dark, textTransform: 'uppercase', letterSpacing: 0.4 }}>{hab[1]}</small>
      </span>
      <span style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, flexShrink: 0, background: feita ? 'rgba(var(--brand-rgb),0.12)' : 'rgba(245,158,11,0.12)', color: feita ? 'var(--brand-dark)' : '#92400E' }}>{feita ? '✓ Finalizada' : 'Pendente'}</span>
    </button>
  );
}

/* ───────── a aba ───────── */
function TrilhaTab({ tipo, briefing, onSaveBriefing, extras, posaulas, activities, onAbrirAtividades, onOpenExtra, onReadPost }) {
  const tr = TRILHAS[tipo], conf = TRILHA_CONF[tipo];
  const [tela, setTela] = React.useState('');      // '' = automática | 'form' | 'etapa'
  const [etapa, setEtapa] = React.useState(0);
  const [peek, setPeek] = React.useState(false);

  const minhas = React.useMemo(() => (extras || []).filter(e => e.trilha === tipo), [extras, tipo]);
  const aulas = React.useMemo(() => (posaulas || []).filter(p => postTrilha(p) === tipo), [posaulas, tipo]);
  if (!tr || !conf) return null;

  const porEtapa = conf.etapas.map((_, i) => minhas.filter(e => Number(e.etapa) === i + 1).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)));
  const soltas = minhas.filter(e => !(Number(e.etapa) >= 1 && Number(e.etapa) <= conf.etapas.length));
  const status = porEtapa.map(l => l.length === 0 ? 'vazio' : l.every(trilhaFeita) ? 'feita' : 'aberta');
  const iAtual = status.indexOf('aberta');
  const respostas = (briefing && briefing.respostas) || {};
  const caixa = { background: '#fff', border: `1.5px solid ${tr.line}`, borderRadius: 16, padding: '11px 13px', marginBottom: 8 };

  if (briefing === undefined && minhas.length === 0) {
    return <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>Carregando…</div>;
  }

  const botaoConsulta = (
    <button onClick={() => setPeek(true)} disabled={aulas.length === 0} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: aulas.length ? 'pointer' : 'default',
      background: tr.bg, border: `1.5px solid ${tr.line}`, borderRadius: 15, padding: '10px 13px', marginBottom: 10, opacity: aulas.length ? 1 : 0.7,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', fontSize: 15 }}>&#128196;</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 13, fontWeight: 800, color: tr.dark }}>Consultar pós-aula</b>
        <small style={{ fontSize: 10.8, color: '#64748B', fontWeight: 700 }}>{aulas.length ? `${aulas.length} aula${aulas.length !== 1 ? 's' : ''} de ${tr.nome.toLowerCase()}` : 'As aulas de ' + tr.nome.toLowerCase() + ' aparecem aqui'}</small>
      </span>
      {aulas.length > 0 && <span style={{ fontSize: 18, color: '#94A3B8' }}>›</span>}
    </button>
  );
  const consulta = <PosaulaPeek open={peek} activity={null} posaulas={aulas} titulo={`Pós-aulas · ${tr.nome}`} onClose={() => setPeek(false)} onRead={onReadPost} />;

  // Atividades das AULAS da trilha (as semanais, com correção): ficam só aqui, nunca na lista geral. As tarefas do caminho (extras) são outra coisa.
  const ativs = activities || [];
  const aFazer = ativs.filter(a => a.status !== 'corrected' && !a.finalizada).length;
  const aguardando = ativs.filter(a => a.status !== 'corrected' && a.finalizada).length;
  const corrigidas = ativs.filter(a => a.status === 'corrected').length;
  const resumoAtivs = [aFazer && `${aFazer} pendente${aFazer !== 1 ? 's' : ''}`, aguardando && `${aguardando} aguardando correção`, corrigidas && `${corrigidas} corrigida${corrigidas !== 1 ? 's' : ''}`].filter(Boolean).join(' · ');
  const cartaoAtivs = (
    <button onClick={() => onAbrirAtividades && onAbrirAtividades()} disabled={ativs.length === 0 || !onAbrirAtividades} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: ativs.length ? 'pointer' : 'default',
      background: tr.bg, border: `1.5px solid ${aFazer ? tr.tc : tr.line}`, borderRadius: 15, padding: '10px 13px', marginBottom: 10, opacity: ativs.length ? 1 : 0.7,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', fontSize: 15 }}>&#9999;&#65039;</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 13, fontWeight: 800, color: tr.dark }}>Atividades das aulas de {tr.nome.toLowerCase()}</b>
        <small style={{ fontSize: 10.8, color: '#64748B', fontWeight: 700 }}>{ativs.length ? resumoAtivs : 'As atividades das aulas de ' + tr.nome.toLowerCase() + ' aparecem aqui'}</small>
      </span>
      {aFazer > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 999, flexShrink: 0, background: 'rgba(245,158,11,0.14)', color: '#92400E' }}>{aFazer}</span>}
      {ativs.length > 0 && <span style={{ fontSize: 18, color: '#94A3B8' }}>›</span>}
    </button>
  );

  // 1) Formulário (primeira vez ou "Editar o que contei").
  if (tela === 'form') {
    return <TrilhaForm tr={tr} conf={conf} inicial={respostas} onVoltar={() => setTela('')} onEnviar={onSaveBriefing} />;
  }

  // 2) Ainda não contou e o professor ainda não montou nada: apresentação.
  if (!briefing && minhas.length === 0) {
    return (
      <div>
        <div style={{ background: tr.grad, color: '#fff', borderRadius: 20, padding: '18px 18px 16px', marginBottom: 14, boxShadow: '0 10px 22px rgba(0,0,0,.14)' }}>
          <div style={{ fontSize: 34, lineHeight: 1 }}>{tr.ic}</div>
          <div style={{ fontSize: 19, fontWeight: 800, margin: '8px 0 4px', lineHeight: 1.2 }}>{conf.titulo}</div>
          <div style={{ fontSize: 12.8, fontWeight: 600, lineHeight: 1.5, opacity: 0.95 }}>{conf.intro}</div>
        </div>
        {conf.como.map((c, i) => (
          <div key={i} style={{ ...caixa, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 34, height: 34, borderRadius: 11, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{c[0]}</div>
            <div><b style={{ fontSize: 13.2, fontWeight: 800, display: 'block' }}>{i + 1}. {c[1]}</b><small style={{ fontSize: 11.6, color: '#64748B', fontWeight: 700, lineHeight: 1.4, display: 'block', marginTop: 1 }}>{c[2]}</small></div>
          </div>
        ))}
        {botaoConsulta}
        {cartaoAtivs}
        <button onClick={() => setTela('form')} style={{ width: '100%', border: 'none', borderRadius: 15, padding: 14, marginTop: 4, background: tr.grad, color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,0,0,.14)' }}>
          Começar: conte sobre {conf.comecar}
        </button>
        {consulta}
      </div>
    );
  }

  // 3) Contou, mas o professor ainda não publicou nenhuma etapa.
  if (minhas.length === 0) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '10px 6px 4px' }}>
          <div style={{ fontSize: 44 }}>🎉</div>
          <div style={{ fontSize: 19, fontWeight: 800, margin: '6px 0 4px' }}>Recebido!</div>
          <div style={{ fontSize: 13, color: '#64748B', fontWeight: 700, lineHeight: 1.5 }}>O professor está montando o seu material. Você recebe um aviso quando a primeira etapa estiver no ar.</div>
        </div>
        {botaoConsulta}
        {cartaoAtivs}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438', margin: '12px 2px 4px' }}>O que você contou</div>
        <TrilhaResumo tipo={tipo} conf={conf} respostas={respostas} />
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438', margin: '12px 2px 8px' }}>O que vem por aí</div>
        {conf.etapas.slice(0, 4).map((e, i) => <TrilhaNo key={i} tr={tr} e={e} st="vazio" qtd={0} feitas={0} onClick={() => {}} />)}
        <button onClick={() => setTela('form')} style={{ width: '100%', borderRadius: 15, padding: 13, marginTop: 4, background: '#fff', color: tr.dark, border: `1.5px solid ${tr.line}`, fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Editar o que contei</button>
        {consulta}
      </div>
    );
  }

  // 4) Lista de tarefas de uma etapa.
  if (tela === 'etapa') {
    const e = conf.etapas[etapa] || { ic: '📌', n: 'Outras tarefas', d: '' };
    const lista = etapa >= 0 && etapa < conf.etapas.length ? porEtapa[etapa] : soltas;
    return (
      <div>
        <button onClick={() => setTela('')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: tr.dark, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0 10px' }}>&#8249; Voltar ao caminho</button>
        <div style={{ fontSize: 11, fontWeight: 800, color: tr.dark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{etapa >= 0 && etapa < conf.etapas.length ? `Etapa ${etapa + 1} de ${conf.etapas.length}` : 'Trilha'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 23, flexShrink: 0 }}>{e.ic}</div>
          <div><div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{e.n}</div>{e.d ? <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 700 }}>{e.d}</div> : null}</div>
        </div>
        {botaoConsulta}
        {lista.map(x => <TrilhaTarefaLinha key={x.id} tr={tr} e={x} onClick={() => onOpenExtra(x)} />)}
        {consulta}
      </div>
    );
  }

  // 5) O caminho.
  const feitas = status.filter(s => s === 'feita').length;
  const dias = trilhaDiasAte(respostas.quando);
  const proxima = iAtual >= 0 ? iAtual : -1;
  const subtitulo = conf.sub(respostas);
  return (
    <div>
      <div style={{ background: tr.grad, color: '#fff', borderRadius: 20, padding: '15px 16px', marginBottom: 12, boxShadow: '0 10px 22px rgba(0,0,0,.14)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 46, height: 46, borderRadius: 15, background: 'rgba(255,255,255,.2)', display: 'grid', placeItems: 'center', fontSize: 24, flexShrink: 0 }}>{tr.ic}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <b style={{ display: 'block', fontSize: 16, fontWeight: 800, lineHeight: 1.15 }}>{conf.titulo}</b>
            {subtitulo ? <small style={{ fontSize: 11.8, fontWeight: 700, opacity: 0.92 }}>{subtitulo}</small> : null}
          </div>
          {dias != null && dias >= 0 && (
            <div style={{ textAlign: 'center', background: 'rgba(255,255,255,.2)', borderRadius: 13, padding: '5px 10px', flexShrink: 0 }}>
              <b style={{ fontSize: 19 }}>{dias}</b>
              <small style={{ display: 'block', fontSize: 9.5, letterSpacing: 0.4, textTransform: 'uppercase' }}>dias · {conf.cdRot}</small>
            </div>
          )}
        </div>
        <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,.28)', marginTop: 12, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${Math.round(feitas / conf.etapas.length * 100)}%`, background: '#fff', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, marginTop: 5, opacity: 0.95 }}>{feitas} de {conf.etapas.length} etapas concluídas</div>
      </div>

      {proxima >= 0 && (
        <button onClick={() => { setEtapa(proxima); setTela('etapa'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: '#fff', border: `1.5px solid ${tr.tc}`, borderRadius: 15, padding: '10px 13px', marginBottom: 8 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: tr.bg, display: 'grid', placeItems: 'center', color: tr.dark, fontSize: 13 }}>▶</span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>Continuar de onde parei</b><small style={{ fontSize: 10.8, color: '#64748B', fontWeight: 700 }}>{conf.etapas[proxima].n}</small></span>
          <span style={{ fontSize: 18, color: '#94A3B8' }}>›</span>
        </button>
      )}
      {botaoConsulta}
      {cartaoAtivs}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: tr.dark, margin: '14px 2px 8px' }}>
        <span>Seu caminho</span><small style={{ color: '#64748B', letterSpacing: 0, textTransform: 'none', fontWeight: 700 }}>feito pelo professor para você</small>
      </div>
      {conf.etapas.map((e, i) => {
        const st = status[i] === 'aberta' ? (i === iAtual ? 'atual' : 'aberta') : status[i];
        const qtd = porEtapa[i].length, f = porEtapa[i].filter(trilhaFeita).length;
        return <TrilhaNo key={i} tr={tr} e={e} st={st} qtd={qtd} feitas={f} onClick={() => { if (st === 'vazio') { if (typeof showToast === 'function') showToast('O professor ainda está preparando esta etapa. Ela aparece aqui quando for publicada.'); return; } setEtapa(i); setTela('etapa'); }} />;
      })}

      {soltas.length > 0 && (
        <button onClick={() => { setEtapa(-1); setTela('etapa'); }} style={{ ...caixa, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: tr.dark }}>📌 Outras tarefas da trilha ({soltas.length})</button>
      )}
      <button onClick={() => setTela('form')} style={{ width: '100%', borderRadius: 15, padding: 12, marginTop: 4, background: '#fff', color: tr.dark, border: `1.5px solid ${tr.line}`, fontWeight: 800, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
        {briefing ? 'Ver ou editar o que contei' : 'Contar sobre ' + conf.comecar}
      </button>
      {consulta}
    </div>
  );
}
