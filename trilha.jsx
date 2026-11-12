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
    // O foco de TODAS as tarefas (decisão do professor, 04/11/2026): calma → falar devagar → responder só o que foi perguntado.
    foco: {
      titulo: 'O foco do seu treino',
      intro: 'Em todas as etapas vamos treinar 3 coisas:',
      itens: [
        { ic: '🧘', curto: 'Calma', t: 'Manter a calma', d: 'A calma é o que faz você conseguir se comunicar em inglês. Respire e vá sem pressa: com a cabeça tranquila, as palavras aparecem.' },
        { ic: '🐢', curto: 'Falar devagar', t: 'Falar devagar', d: 'Falar devagar também se treina. E só acontece com calma: sem pressa, cada palavra sai mais clara.' },
        { ic: '🎯', curto: 'Só o que foi perguntado', t: 'Responder só o que foi perguntado', d: 'São duas partes:', sub: [
          ['👂', 'Entender a pergunta', 'Para não responder outra coisa só porque não entendeu.'],
          ['✂️', 'Não acrescentar informação', 'Responda o que foi perguntado e pare. Se a pergunta é de sim ou não, a resposta é sim ou não.'],
        ] },
      ],
    },
    etapas: [
      { ic: '🧭', n: 'Conheça a vaga', d: 'Vocabulário da função e do lugar' },
      { ic: '🗣', n: 'Fale sobre você', d: '“Tell me about yourself”, em blocos' },
      { ic: '❓', n: 'As perguntas que vão cair', d: 'As perguntas clássicas, feitas para a sua vaga' },
      { ic: '⭐', n: 'Por que você?', d: 'Motivação, pontos fortes e “Why this job?”' },
      { ic: '🗓', n: 'Disponibilidade, turnos e documentos', d: '“Can you work nights?”, “When can you start?”' },
      { ic: '💙', n: 'Valores do cuidado', d: 'Dignidade, privacidade e segurança' },
      { ic: '🏥', n: 'Situações da função', d: '“O que você faria se…?”' },
      { ic: '👂', n: 'Entenda a pergunta e ganhe tempo', d: 'Pedir para repetir e “Let me think…”' },
      { ic: '🙋', n: 'Suas perguntas para eles', d: '“Do you have any questions for us?”' },
      { ic: '📖', n: 'Conte uma situação real', d: '“Tell me about a time…”, em passos curtos' },
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

/* ───────── etapa aberta pela aula + resumo curto ───────── */
// A N-ésima pós-aula da trilha (em ordem de data da aula) abre a etapa N sozinha: o professor só sobe o pós-aula, como sempre.
// O resumo curto da etapa é lido do próprio HTML da pós-aula (frases, palavras-chave e vocabulário), sem ninguém preencher nada.
// Se o modelo de uma pós-aula for diferente, cada pedaço que não for encontrado simplesmente não aparece.
const trilhaDataAula = p => { const d = typeof postReferenceDate === 'function' ? postReferenceDate(p) : null; return d ? d.getTime() : 0; };
const trilhaOrdenar = lista => lista.slice().sort((a, b) => trilhaDataAula(a) - trilhaDataAula(b) || String(a.id).localeCompare(String(b.id)));
function trilhaDiaMes(p) {
  const d = typeof postReferenceDate === 'function' ? postReferenceDate(p) : null;
  return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '';
}
const trilhaSemAcento = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const trilhaLimpa = s => String(s || '').replace(/\s+/g, ' ').trim();
const trilhaSemAspas = s => trilhaLimpa(s).replace(/^[“”"‘’']+|[“”"‘’']+$/g, '').trim();
const trilhaSemSeta = s => trilhaLimpa(s).replace(/^[→\-–—:]+\s*/, '').trim();
// Tudo o que vem depois do elemento (irmãos seguintes), em texto: "→ Eu vou te contar."
function trilhaDepoisDe(el) { let n = el && el.nextSibling, r = ''; while (n) { r += n.textContent; n = n.nextSibling; } return trilhaSemSeta(r); }
// <li><strong>“I will tell you.”</strong> → Eu vou te contar.</li>  e  <li><strong>role</strong> — cargo; função</li>
function trilhaPar(li) {
  const forte = li.querySelector('strong');
  const en = trilhaSemAspas(forte ? forte.textContent : li.textContent);
  return en ? { en, pt: forte ? trilhaDepoisDe(forte) : '' } : null;
}
const _trilhaLeituras = new Map();
function trilhaLerAula(post) {
  const html = String((post && post.html) || '');
  if (!html) return null;
  const chave = (post.id || '') + ':' + html.length;
  if (_trilhaLeituras.has(chave)) return _trilhaLeituras.get(chave);
  let out = null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const r = { intro: '', frases: [], chaves: [], vocab: [] };
    const painel = doc.querySelector('section.panel');
    if (painel) r.intro = trilhaLimpa(painel.textContent);
    doc.querySelectorAll('section').forEach(sec => {
      const h = sec.querySelector('h2');
      if (!h) return;
      const t = trilhaSemAcento(h.textContent);
      if (/frases/.test(t)) {
        sec.querySelectorAll('li').forEach(li => { const x = trilhaPar(li); if (x) r.frases.push(x); });
      } else if (/vocabulario.completo/.test(t)) {
        const caixa = sec.querySelector('.outline-card') || sec;
        let g = null;
        Array.from(caixa.children).forEach(n => {
          if (n.tagName === 'H3') { g = { t: trilhaLimpa(n.textContent), itens: [] }; r.vocab.push(g); }
          else if (n.tagName === 'UL') {
            if (!g) { g = { t: '', itens: [] }; r.vocab.push(g); }
            n.querySelectorAll('li').forEach(li => { const x = trilhaPar(li); if (x) g.itens.push(x); });
          }
        });
      } else if (/vocabulario.chave|palavras.chave/.test(t)) {
        sec.querySelectorAll('.vocab').forEach(card => {
          const h3 = card.querySelector('h3'), em = card.querySelector('p em'), ex = card.querySelector('small strong');
          const en = trilhaLimpa(h3 && h3.textContent);
          if (en) r.chaves.push({ en, pt: trilhaLimpa(em && em.textContent), ex: trilhaSemAspas(ex && ex.textContent), exPt: trilhaDepoisDe(ex) });
        });
      }
    });
    r.vocab = r.vocab.filter(g => g.itens.length > 0);
    r.nVocab = r.vocab.reduce((s, g) => s + g.itens.length, 0);
    if (r.intro || r.frases.length || r.chaves.length || r.nVocab) out = r;
  } catch (_) { out = null; }
  _trilhaLeituras.set(chave, out);
  return out;
}

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

function TrilhaFoco({ tr, foco, aberto }) {
  const [open, setOpen] = React.useState(aberto !== false);
  return (
    <div style={{ background: '#fff', border: `1.5px solid ${tr.line}`, borderRadius: 18, padding: '12px 14px', margin: '12px 0' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}>
        <span style={{ width: 34, height: 34, borderRadius: 11, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>📌</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <b style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: '#0F172A' }}>{foco.titulo}</b>
          <small style={{ display: 'block', fontSize: 11.3, color: '#64748B', fontWeight: 700, marginTop: 1, lineHeight: 1.35 }}>{open ? foco.intro : foco.itens.map(i => `${i.ic} ${i.curto}`).join(' · ')}</small>
        </span>
        <span style={{ fontSize: 18, color: '#94A3B8', transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
      </button>
      {open && (
        <div style={{ marginTop: 10 }}>
          {foco.itens.map((it, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '10px 0', borderTop: `1px solid ${tr.line}` }}>
              <span style={{ width: 34, height: 34, borderRadius: 11, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>{it.ic}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{i + 1}. {it.t}</b>
                <small style={{ display: 'block', fontSize: 11.8, color: '#475569', fontWeight: 700, lineHeight: 1.45, marginTop: 2 }}>{it.d}</small>
                {it.sub && it.sub.map((s, j) => (
                  <div key={j} style={{ display: 'flex', gap: 8, marginTop: 7, padding: '7px 9px', background: tr.bg, borderRadius: 11 }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{s[0]}</span>
                    <span style={{ minWidth: 0 }}><b style={{ display: 'block', fontSize: 12.2, fontWeight: 800, color: tr.dark }}>{String.fromCharCode(97 + j)}) {s[1]}</b><small style={{ display: 'block', fontSize: 11.4, color: '#475569', fontWeight: 700, lineHeight: 1.4 }}>{s[2]}</small></span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrilhaNo({ tr, e, st, qtd, feitas, onClick, aula }) {
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
          {e.d}{qtd ? ` · ${feitas}/${qtd} tarefa${qtd !== 1 ? 's' : ''}` : ''}{aula ? ` · aula de ${aula}` : ''}
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

// O que vimos na aula: resumo curto (resumo, frases, palavras-chave, vocabulário) da pós-aula que abriu a etapa.
function TrilhaOuvir({ tr, on, label, onClick }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', fontSize: 15, lineHeight: 1, fontFamily: 'inherit', display: 'grid', placeItems: 'center',
      border: `1px solid ${on ? tr.tc : tr.line}`, background: on ? tr.tc : tr.bg, color: on ? '#fff' : tr.dark }}>&#128266;</button>
  );
}
function TrilhaAulaResumo({ tr, post }) {
  const lei = React.useMemo(() => trilhaLerAula(post), [post && post.id, post && post.html]);
  const [falando, setFalando] = React.useState('');
  const [aviso, setAviso] = React.useState('');
  const [todas, setTodas] = React.useState(false);
  const [vocabAberto, setVocabAberto] = React.useState(false);
  React.useEffect(() => () => { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} }, []);
  const ouvir = (texto, k) => {
    setAviso('');
    const ok = pronounceEnglish(texto, {
      onStart: () => setFalando(k),
      onEnd: () => setFalando(c => (c === k ? '' : c)),
      onError: () => setAviso('A voz não está disponível neste aparelho.'),
    });
    if (!ok) setAviso('A voz não está disponível neste aparelho.');
  };
  const caixa = { background: '#fff', border: `1.5px solid ${tr.line}`, borderRadius: 18, padding: '12px 14px', marginBottom: 10 };
  const rotulo = { fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438', marginBottom: 6 };
  const dia = trilhaDiaMes(post), topico = postTopic(post);
  const FRASES_CURTO = 5;
  const frases = lei ? (todas ? lei.frases : lei.frases.slice(0, FRASES_CURTO)) : [];

  return (
    <div>
      <div style={{ ...caixa, background: tr.bg }}>
        <div style={{ ...rotulo, color: tr.dark }}>📘 O que vimos na aula{dia ? ` de ${dia}` : ''}</div>
        {topico ? <b style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.3 }}>{topico}</b> : null}
        {lei && lei.intro
          ? <div style={{ fontSize: 12.6, color: '#334155', fontWeight: 600, lineHeight: 1.5, marginTop: topico ? 5 : 0 }}>{lei.intro}</div>
          : null}
        {!lei && <div style={{ fontSize: 12.4, color: '#64748B', fontWeight: 700, lineHeight: 1.45, marginTop: 5 }}>O resumo curto desta aula não está disponível. Abra o pós-aula completo no botão abaixo.</div>}
      </div>

      {lei && lei.frases.length > 0 && (
        <div style={caixa}>
          <div style={rotulo}>💬 Frases da aula</div>
          {frases.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: i ? `1px solid ${tr.line}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ display: 'block', fontSize: 13.2, fontWeight: 800, color: '#0F172A', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{f.en}</b>
                {f.pt ? <small style={{ display: 'block', fontSize: 11.8, color: '#64748B', fontWeight: 700, lineHeight: 1.35, marginTop: 1 }}>{f.pt}</small> : null}
              </div>
              <TrilhaOuvir tr={tr} on={falando === 'f' + i} label={`Ouvir: ${f.en}`} onClick={() => ouvir(f.en, 'f' + i)} />
            </div>
          ))}
          {lei.frases.length > FRASES_CURTO && (
            <button onClick={() => setTodas(v => !v)} style={{ width: '100%', marginTop: 6, padding: '8px', background: 'none', border: 'none', borderTop: `1px solid ${tr.line}`, color: tr.dark, fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' }}>
              {todas ? 'Mostrar menos' : `Ver as outras ${lei.frases.length - FRASES_CURTO} frases`}
            </button>
          )}
        </div>
      )}

      {lei && lei.chaves.length > 0 && (
        <div style={caixa}>
          <div style={rotulo}>⭐ Palavras-chave</div>
          {lei.chaves.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', background: tr.bg, borderRadius: 13, marginTop: i ? 7 : 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <b style={{ fontSize: 14, fontWeight: 800, color: tr.dark }}>{c.en}</b>
                {c.pt ? <span style={{ fontSize: 12.2, color: '#475569', fontWeight: 700 }}> · {c.pt}</span> : null}
                {c.ex ? <small style={{ display: 'block', fontSize: 11.6, color: '#64748B', fontWeight: 700, lineHeight: 1.4, marginTop: 2 }}><i>{c.ex}</i>{c.exPt ? ` — ${c.exPt}` : ''}</small> : null}
              </div>
              <TrilhaOuvir tr={tr} on={falando === 'c' + i} label={`Ouvir: ${c.en}`} onClick={() => ouvir(c.en, 'c' + i)} />
            </div>
          ))}
        </div>
      )}

      {lei && lei.nVocab > 0 && (
        <div style={caixa}>
          <button onClick={() => setVocabAberto(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer' }}>
            <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438' }}>📚 Vocabulário · {lei.nVocab} palavras</span>
            <span style={{ fontSize: 18, color: '#94A3B8', transform: vocabAberto ? 'rotate(90deg)' : 'none' }}>›</span>
          </button>
          {vocabAberto && lei.vocab.map((g, gi) => (
            <div key={gi} style={{ marginTop: 10 }}>
              {g.t ? <div style={{ fontSize: 12, fontWeight: 800, color: tr.dark, marginBottom: 3 }}>{g.t}</div> : null}
              {g.itens.map((x, xi) => (
                <div key={xi} style={{ display: 'flex', gap: 8, padding: '5px 0', borderTop: xi ? `1px solid ${tr.line}` : 'none', fontSize: 12.4, lineHeight: 1.4 }}>
                  <b style={{ flexShrink: 0, maxWidth: '45%', fontWeight: 800, color: '#0F172A', overflowWrap: 'anywhere' }}>{x.en}</b>
                  <span style={{ color: '#475569', fontWeight: 600, overflowWrap: 'anywhere' }}>{x.pt}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      {aviso ? <div style={{ fontSize: 11.5, color: '#92400E', fontWeight: 700, textAlign: 'center', margin: '0 0 8px' }}>{aviso}</div> : null}
    </div>
  );
}

/* ───────── a aba ───────── */
function TrilhaTab({ tipo, briefing, onSaveBriefing, extras, posaulas, activities, onAbrirAtividades, onOpenExtra, onReadPost, abrirForm, onFormAberto }) {
  const tr = TRILHAS[tipo], conf = TRILHA_CONF[tipo];
  const [tela, setTela] = React.useState('');      // '' = automática | 'form' | 'etapa'
  const [etapa, setEtapa] = React.useState(0);
  const [peek, setPeek] = React.useState(false);
  const [etapaPeekId, setEtapaPeekId] = React.useState('');   // pós-aula da etapa aberta direto na consulta
  // "Responder agora" da apresentação (novidades.jsx): cai direto no formulário, uma vez.
  React.useEffect(() => { if (abrirForm) { if (!briefing) setTela('form'); if (onFormAberto) onFormAberto(); } }, [abrirForm]);

  const minhas = React.useMemo(() => (extras || []).filter(e => e.trilha === tipo), [extras, tipo]);
  const aulas = React.useMemo(() => (posaulas || []).filter(p => postTrilha(p) === tipo), [posaulas, tipo]);
  const aulasEtapa = React.useMemo(() => trilhaOrdenar(aulas), [aulas]);   // da mais antiga para a mais nova: a 1ª abre a etapa 1, a 2ª a etapa 2...
  const atvPeek = React.useMemo(() => (etapaPeekId ? { posaulaId: etapaPeekId } : null), [etapaPeekId]);
  if (!tr || !conf) return null;

  const porEtapa = conf.etapas.map((_, i) => minhas.filter(e => Number(e.etapa) === i + 1).sort((a, b) => (Number(a.ordem) || 0) - (Number(b.ordem) || 0)));
  const soltas = minhas.filter(e => !(Number(e.etapa) >= 1 && Number(e.etapa) <= conf.etapas.length));
  const aulaDaEtapa = conf.etapas.map((_, i) => aulasEtapa[i] || null);
  // vazio = nada ainda | liberada = já teve a aula, sem tarefa | aberta = tem tarefa pendente | feita = todas as tarefas feitas
  const status = porEtapa.map((l, i) => l.length === 0 ? (aulaDaEtapa[i] ? 'liberada' : 'vazio') : l.every(trilhaFeita) ? 'feita' : 'aberta');
  const iPendente = status.indexOf('aberta');
  const iAtual = iPendente >= 0 ? iPendente : status.lastIndexOf('liberada');   // AGORA: a que tem tarefa pendente; senão a aula mais nova
  const temAula = aulas.length > 0;
  const respostas = (briefing && briefing.respostas) || {};
  const caixa = { background: '#fff', border: `1.5px solid ${tr.line}`, borderRadius: 16, padding: '11px 13px', marginBottom: 8 };

  if (briefing === undefined && minhas.length === 0 && !temAula) {
    return <div style={{ textAlign: 'center', padding: 30, color: '#94A3B8', fontSize: 13, fontWeight: 700 }}>Carregando…</div>;
  }

  const cartaoConsulta = (onClick, sub, ativo) => (
    <button onClick={onClick} disabled={!ativo} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: ativo ? 'pointer' : 'default',
      background: tr.bg, border: `1.5px solid ${tr.line}`, borderRadius: 15, padding: '10px 13px', marginBottom: 10, opacity: ativo ? 1 : 0.7,
    }}>
      <span style={{ width: 32, height: 32, borderRadius: 10, background: '#fff', display: 'grid', placeItems: 'center', fontSize: 15 }}>&#128196;</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b style={{ display: 'block', fontSize: 13, fontWeight: 800, color: tr.dark }}>Consultar pós-aula</b>
        <small style={{ fontSize: 10.8, color: '#64748B', fontWeight: 700 }}>{sub}</small>
      </span>
      {ativo && <span style={{ fontSize: 18, color: '#94A3B8' }}>›</span>}
    </button>
  );
  const botaoConsulta = cartaoConsulta(() => setPeek(true), aulas.length ? `${aulas.length} aula${aulas.length !== 1 ? 's' : ''} de ${tr.nome.toLowerCase()}` : 'As aulas de ' + tr.nome.toLowerCase() + ' aparecem aqui', aulas.length > 0);
  const consulta = <PosaulaPeek open={peek} activity={null} posaulas={aulas} titulo={`Pós-aulas · ${tr.nome}`} onClose={() => setPeek(false)} onRead={onReadPost} />;
  // Dentro de uma etapa: abre direto a pós-aula daquela aula.
  const consultaEtapa = <PosaulaPeek open={!!etapaPeekId} activity={atvPeek} posaulas={aulas} titulo={`Pós-aulas · ${tr.nome}`} onClose={() => setEtapaPeekId('')} onRead={onReadPost} />;

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

  // 2) Ainda não contou e nada foi liberado (nem tarefa, nem aula): apresentação.
  if (!briefing && minhas.length === 0 && !temAula) {
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
        {conf.foco && <TrilhaFoco tr={tr} foco={conf.foco} />}
        {botaoConsulta}
        {cartaoAtivs}
        <button onClick={() => setTela('form')} style={{ width: '100%', border: 'none', borderRadius: 15, padding: 14, marginTop: 4, background: tr.grad, color: '#fff', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,0,0,.14)' }}>
          Começar: conte sobre {conf.comecar}
        </button>
        {consulta}
      </div>
    );
  }

  // 3) Contou, mas ainda não houve aula da trilha nem tarefa publicada: nenhuma etapa liberada.
  if (minhas.length === 0 && !temAula) {
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
        {conf.foco && <TrilhaFoco tr={tr} foco={conf.foco} />}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438', margin: '12px 2px 8px' }}>O que vem por aí</div>
        {conf.etapas.map((e, i) => <TrilhaNo key={i} tr={tr} e={e} st="vazio" qtd={0} feitas={0} onClick={() => {}} />)}
        <button onClick={() => setTela('form')} style={{ width: '100%', borderRadius: 15, padding: 13, marginTop: 4, background: '#fff', color: tr.dark, border: `1.5px solid ${tr.line}`, fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>Editar o que contei</button>
        {consulta}
      </div>
    );
  }

  // 4) Lista de tarefas de uma etapa.
  if (tela === 'etapa') {
    const e = conf.etapas[etapa] || { ic: '📌', n: 'Outras tarefas', d: '' };
    const dentro = etapa >= 0 && etapa < conf.etapas.length;
    const lista = dentro ? porEtapa[etapa] : soltas;
    const aulaE = dentro ? aulaDaEtapa[etapa] : null;
    return (
      <div>
        <button onClick={() => setTela('')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: tr.dark, fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0 10px' }}>&#8249; Voltar ao caminho</button>
        <div style={{ fontSize: 11, fontWeight: 800, color: tr.dark, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>{dentro ? `Etapa ${etapa + 1} de ${conf.etapas.length}` : 'Trilha'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: tr.bg, display: 'grid', placeItems: 'center', fontSize: 23, flexShrink: 0 }}>{e.ic}</div>
          <div><div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>{e.n}</div>{e.d ? <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 700 }}>{e.d}</div> : null}</div>
        </div>
        {aulaE ? (
          <>
            <TrilhaAulaResumo tr={tr} post={aulaE} />
            {lista.length > 0 && <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.8, textTransform: 'uppercase', color: '#9A6438', margin: '4px 2px 8px' }}>Tarefas desta etapa</div>}
            {lista.map(x => <TrilhaTarefaLinha key={x.id} tr={tr} e={x} onClick={() => onOpenExtra(x)} />)}
            {cartaoConsulta(() => setEtapaPeekId(aulaE.id), postTitle(aulaE), true)}
            {cartaoAtivs}
          </>
        ) : (
          <>
            {botaoConsulta}
            {lista.map(x => <TrilhaTarefaLinha key={x.id} tr={tr} e={x} onClick={() => onOpenExtra(x)} />)}
          </>
        )}
        {consulta}
        {consultaEtapa}
      </div>
    );
  }

  // 5) O caminho.
  const feitas = status.filter(s => s === 'feita').length;
  const liberadas = status.filter(s => s !== 'vazio').length;
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
          <div style={{ height: '100%', width: `${Math.round(liberadas / conf.etapas.length * 100)}%`, background: '#fff', borderRadius: 99 }} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, marginTop: 5, opacity: 0.95 }}>{liberadas} de {conf.etapas.length} etapas liberadas{feitas > 0 ? ` · ${feitas} concluída${feitas !== 1 ? 's' : ''}` : ''}</div>
      </div>

      {proxima >= 0 && (
        <button onClick={() => { setEtapa(proxima); setTela('etapa'); }} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer', background: '#fff', border: `1.5px solid ${tr.tc}`, borderRadius: 15, padding: '10px 13px', marginBottom: 8 }}>
          <span style={{ width: 32, height: 32, borderRadius: 10, background: tr.bg, display: 'grid', placeItems: 'center', color: tr.dark, fontSize: 13 }}>▶</span>
          <span style={{ flex: 1, minWidth: 0 }}><b style={{ display: 'block', fontSize: 13, fontWeight: 800 }}>{status[proxima] === 'liberada' ? 'Ver o que vimos na última aula' : 'Continuar de onde parei'}</b><small style={{ fontSize: 10.8, color: '#64748B', fontWeight: 700 }}>{conf.etapas[proxima].n}</small></span>
          <span style={{ fontSize: 18, color: '#94A3B8' }}>›</span>
        </button>
      )}
      {botaoConsulta}
      {cartaoAtivs}
      {conf.foco && <TrilhaFoco tr={tr} foco={conf.foco} aberto={false} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: tr.dark, margin: '14px 2px 8px' }}>
        <span>Seu caminho</span><small style={{ color: '#64748B', letterSpacing: 0, textTransform: 'none', fontWeight: 700 }}>feito pelo professor para você</small>
      </div>
      {conf.etapas.map((e, i) => {
        const st = i === iAtual ? 'atual' : status[i];
        const qtd = porEtapa[i].length, f = porEtapa[i].filter(trilhaFeita).length;
        return <TrilhaNo key={i} tr={tr} e={e} st={st} qtd={qtd} feitas={f} aula={aulaDaEtapa[i] ? trilhaDiaMes(aulaDaEtapa[i]) : ''} onClick={() => { if (st === 'vazio') { if (typeof showToast === 'function') showToast('O professor ainda está preparando esta etapa. Ela aparece aqui quando for publicada.'); return; } setEtapa(i); setTela('etapa'); }} />;
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
