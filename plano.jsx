// Science Lab — o Caminho: uma trilha em ordem cronológica em que a AULA do mês libera
// as tarefas do mês (agrupadas em semanas). O material é o LIVRO (a aluna faz o exercício
// com o livro aberto e responde aqui) e os PÓS-AULAS dela; o app só traz as perguntas, que
// são nossas — o texto e as imagens do livro nunca são copiados.
//
// Este arquivo só entra em cena quando o aluno tem `plano` no cadastro ou quando um
// administrador abre o app com ?planoteste=1 (prévia: nada é gravado no banco, o
// progresso fica só neste aparelho). Quem não está no plano nunca chega aqui.
//
// Nomes começam com Plano/PLANO_ de propósito: este script divide o escopo global
// com o index.html e o challenge.jsx. Hooks sempre como React.useX (sem desestruturar).

const PLANO_ADMINS = ['cmo.sep@gmail.com', 'czkenglish@gmail.com'];
const PLANO_WHATS_PADRAO = '5515996371614';
const PLANO_COR = '#7C3AED';

/* ───────── conteúdo: Connectivity 1 · Unit 4 (p. 37–48) ───────── */
const PLANO_UNIDADE_4 = {
  id: 'conn1-u04',
  titulo: 'Talking about People',
  livro: 'Connectivity 1 · Unit 4 · p. 37–48',
  semanas: ['Família', 'Presente simples', 'Comparar pessoas', 'Semelhanças e tendências'],
  temas: {
    'do-does': { rotulo: 'Presente simples: do / does', palavras: ['simple present', 'presente simples', 'do/does', 'does', 'auxiliar', 'forma base'] },
    'comparativos': { rotulo: 'Comparativos', palavras: ['comparativ', 'comparative', 'than', 'more', 'better', 'worse'] },
    'familia': { rotulo: 'Família e estado civil', palavras: ['family', 'família', 'in-law', 'in-laws', 'divorced', 'estado civil', 'cousin', 'niece', 'nephew'] },
  },
  estudos: {
    'familia': {
      titulo: 'Parentes por casamento (-in-law)', tema: 'familia',
      blocos: [
        { t: 'p', x: 'Família + adjetivos de personalidade = descrições completas.' },
        { t: 'tab', cab: ['Imediata', 'Estendida', 'Por casamento'], lin: [['parents, brother, sister', 'uncle, aunt, cousin, niece, nephew', 'mother-in-law, father-in-law']] },
        { t: 'ex', en: 'My uncle is hardworking, but my aunt is more outgoing.', pt: 'Meu tio é trabalhador, mas minha tia é mais extrovertida.' },
        { t: 'dica', x: '**-in-law** = parente por casamento: o pai do seu marido é seu *father-in-law*.' },
      ],
      teste: { p: 'O pai do seu marido é seu ___.', o: ['father-in-law', 'grandfather'], c: 0, ok: 'Isso mesmo!', no: 'Parente por casamento leva -in-law: father-in-law.' },
    },
    'do-does': {
      titulo: 'Presente simples: do ou does?', tema: 'do-does',
      blocos: [
        { t: 'p', x: 'O presente simples fala de rotina e de fatos. O truque é olhar o **sujeito**.' },
        { t: 'tab', cab: ['Sujeito', 'Afirmativa', 'Negativa', 'Pergunta'], lin: [['I, you, we, they', 'work', "don't work", 'Do you work?'], ['he, she, it', 'works', "doesn't work", 'Does she work?']] },
        { t: 'ex', en: 'Does your brother live in Miami?', pt: 'Depois de do/does o verbo fica na forma base: live, não lives.' },
        { t: 'dica', x: 'Atenção: **does** também pode ser o verbo “fazer”: *My sister does the laundry.* Aí ele é o verbo principal, não o auxiliar.' },
      ],
      teste: { p: 'Does your brother ___ in Miami?', o: ['live', 'lives'], c: 0, ok: 'Isso! Depois de does, verbo na forma base.', no: 'Depois de does o verbo volta à forma base: live.' },
    },
    'comparativos': {
      titulo: 'Comparativos', tema: 'comparativos',
      blocos: [
        { t: 'p', x: 'Para comparar duas pessoas ou coisas, use o comparativo + **than** (“do que”).' },
        { t: 'tab', cab: ['Tipo', 'Regra', 'Exemplo'], lin: [['Curta', '+ er', 'tall → taller'], ['Termina em y', 'y → ier', 'funny → funnier'], ['Longa', 'more / less', 'more hardworking'], ['Irregular', '—', 'good → better · bad → worse']] },
        { t: 'ex', en: 'My brother is taller than my father.', pt: 'Meu irmão é mais alto que meu pai.' },
        { t: 'dica', x: 'O “than” aparece quando você diz **com quem** compara. Sem o segundo termo, a frase pode terminar no comparativo: *My sister is funnier.*' },
      ],
      teste: { p: 'My sister is ___ than me.', o: ['funnier', 'more funny'], c: 0, ok: 'Certo! Funny termina em y → funnier.', no: 'Funny termina em y: troca por ier → funnier.' },
    },
  },
  vocab: {
    familia: [['grandmother', 'avó'], ['grandfather', 'avô'], ['grandson', 'neto'], ['granddaughter', 'neta'], ['aunt', 'tia'], ['uncle', 'tio'], ['cousin', 'primo(a)'],
      ['niece', 'sobrinha'], ['nephew', 'sobrinho'], ['mother-in-law', 'sogra'], ['father-in-law', 'sogro'], ['son-in-law', 'genro'], ['sister-in-law', 'cunhada'], ['brother-in-law', 'cunhado']],
    civil: [['single', 'solteiro(a)'], ['engaged', 'noivo(a)'], ['married', 'casado(a)'], ['separated', 'separado(a)'], ['divorced', 'divorciado(a)'], ['widowed', 'viúvo(a)'], ['ex-husband', 'ex-marido'], ['ex-wife', 'ex-esposa']],
    adjetivos: [['intelligent', 'inteligente'], ['athletic', 'atlético(a)'], ['friendly', 'simpático(a)'], ['quiet', 'quieto(a), calado(a)'], ['funny', 'engraçado(a)'],
      ['hard-working', 'trabalhador(a)'], ['shy', 'tímido(a)'], ['outgoing', 'extrovertido(a)'], ['younger', 'mais novo(a)'], ['older', 'mais velho(a)']],
  },
  jogos: {
    memoria: [['niece', 'sobrinha'], ['nephew', 'sobrinho'], ['aunt', 'tia'], ['uncle', 'tio'], ['cousin', 'primo(a)'], ['grandson', 'neto']],
    relampago: [
      { f: '___ your sister live here?', o: ['Do', 'Does'], c: 1 }, { f: 'My cousins ___ not work on Sundays.', o: ['do', 'does'], c: 0 },
      { f: 'She ___ two nieces.', o: ['has', 'have'], c: 0 }, { f: '___ they have any kids?', o: ['Do', 'Does'], c: 0 },
      { f: 'My uncle ___ in Miami.', o: ['live', 'lives'], c: 1 }, { f: 'He ___ like hip-hop.', o: ["don't", "doesn't"], c: 1 },
      { f: 'Where ___ your in-laws live?', o: ['do', 'does'], c: 0 }, { f: 'What ___ her ex-husband do?', o: ['do', 'does'], c: 1 },
    ],
    montar: [
      { pt: 'Meu irmão é mais alto que meu pai.', w: ['My', 'brother', 'is', 'taller', 'than', 'my', 'father.'] },
      { pt: 'Minha irmã é mais engraçada que eu.', w: ['My', 'sister', 'is', 'funnier', 'than', 'me.'] },
      { pt: 'Seu tio é mais velho que sua tia?', w: ['Is', 'your', 'uncle', 'older', 'than', 'your', 'aunt?'] },
    ],
    forca: [{ w: 'cousin', d: 'primo(a)' }, { w: 'nephew', d: 'sobrinho' }, { w: 'divorced', d: 'divorciado(a)' }, { w: 'outgoing', d: 'extrovertido(a)' }, { w: 'married', d: 'casado(a)' }],
  },
  // t: 'mc' (escolha), 'vf' (verdadeiro/falso), 'gap' (digitar). Perguntas nossas, com gabarito.
  perguntas: {
    'livro-38': [
      { t: 'mc', q: 'Kim e Matt são casados. Para o Matt, a Kim é a ___.', o: ['wife', 'mother', 'sister'], c: 0 },
      { t: 'mc', q: 'Amy é filha da Kim. Então Amy é a ___ da Kim.', o: ['daughter', 'niece', 'sister'], c: 0 },
      { t: 'mc', q: 'Para o Luke, a Amy é a ___.', o: ['sister', 'cousin', 'niece'], c: 0 },
      { t: 'mc', q: 'Judy é mãe da Kim. Para o Luke e a Amy, a Judy é a ___.', o: ['aunt', 'grandmother', 'mother-in-law'], c: 1 },
      { t: 'mc', q: 'Para a Judy e o Bill, o Luke é o ___.', o: ['nephew', 'son-in-law', 'grandson'], c: 2 },
      { t: 'mc', q: 'Bill é pai da Kim. Para o Matt (marido da Kim), o Bill é o ___.', o: ['father-in-law', 'grandfather', 'uncle'], c: 0 },
      { t: 'mc', q: 'Nina é irmã da Kim. Para o Luke e a Amy, a Nina é a ___.', o: ['grandmother', 'aunt', 'cousin'], c: 1 },
      { t: 'mc', q: 'Beth e Jake são filhos da Nina. Para o Luke e a Amy, eles são ___.', o: ['cousins', 'brothers', 'nephews'], c: 0 },
      { t: 'gap', q: 'Para a Kim, a Beth (filha da irmã dela) é a sua ___ (em inglês).', a: ['niece'], exp: 'Filha do irmão ou da irmã = niece; filho = nephew.' },
    ],
    'livro-39': [
      { t: 'mc', q: 'Emi diz que é “an only child”. Isso quer dizer que ela…', o: ['não tem irmãos', 'tem muitos irmãos', 'tem só um irmão'], c: 0 },
      { t: 'mc', q: '“Tons of cousins” quer dizer…', o: ['nenhum primo', 'muitos primos', 'só dois primos'], c: 1 },
      { t: 'mc', q: '“Keep in touch” quer dizer…', o: ['manter contato', 'brigar', 'morar junto'], c: 0 },
      { t: 'mc', q: '“Get together” quer dizer…', o: ['se despedir', 'se encontrar', 'se mudar'], c: 1 },
      { t: 'mc', q: '“Drop by” quer dizer…', o: ['fazer uma visita rápida', 'cair no chão', 'telefonar'], c: 0 },
      { t: 'mc', q: 'Se alguém é “super outgoing”, essa pessoa é…', o: ['um pouco tímida', 'muito extrovertida', 'muito quieta'], c: 1 },
      { t: 'mc', q: 'Quantos primos a Emi tem do lado do pai?', o: ['3', '12', '15'], c: 0 },
      { t: 'mc', q: 'Quantos anos tem a bisavó da Emi?', o: ['19', '81', '91'], c: 2 },
      { t: 'mc', q: 'Quem é mais extrovertida: a Emi ou a bisavó dela?', o: ['a Emi', 'a bisavó'], c: 1 },
    ],
    'posaula-do': [
      { t: 'mc', q: 'Em “My sister does the laundry”, o does é…', o: ['o verbo principal “fazer”', 'o auxiliar da pergunta', 'parte do sujeito'], c: 0 },
      { t: 'mc', q: 'Qual frase está certa?', o: ["My sister doesn't the laundry.", "My sister doesn't does the laundry.", "My sister doesn't do the laundry."], c: 2 },
      { t: 'mc', q: 'Depois de does/doesn’t (auxiliar), o verbo principal fica…', o: ['na forma base', 'com -s', 'no passado'], c: 0 },
      { t: 'gap', q: '___ your brother work on Sundays?', a: ['does'], exp: 'Com he/she/it (your brother = he) a pergunta começa com Does.' },
      { t: 'mc', q: 'Qual pergunta está certa?', o: ['How long a banana peel does take to decompose?', 'How long does a banana peel take to decompose?', 'How long does a banana peel takes to decompose?'], c: 1 },
    ],
    'livro-44': [
      { t: 'vf', q: 'Paula e Rosie são gêmeas idênticas.', c: true },
      { t: 'vf', q: 'Jonah e Brandon se parecem muito fisicamente.', c: false, exp: 'No texto, os amigos não têm dificuldade em distingui-los.' },
      { t: 'mc', q: 'Quem é mais extrovertido?', o: ['Brandon', 'Jonah'], c: 1 },
      { t: 'mc', q: 'Que estilo de música o Brandon prefere?', o: ['jazz', 'heavy metal', 'classical'], c: 0 },
      { t: 'mc', q: 'Que estilo de música Paula e Rosie adoram?', o: ['jazz', 'heavy metal', 'classical'], c: 2 },
      { t: 'vf', q: 'Jonah e Brandon têm gostos parecidos para comida.', c: true },
      { t: 'mc', q: 'Quem é mais alto e mais atlético?', o: ['Jonah', 'Brandon'], c: 0 },
      { t: 'mc', q: 'Segundo o texto, gêmeos idênticos…', o: ['sempre são iguais em tudo', 'geralmente se parecem, mas nem todos', 'nunca se parecem'], c: 1 },
      { t: 'gap', q: 'Jonah is ___ than Brandon. (friendly)', a: ['friendlier', 'more friendly'], exp: 'Friendly termina em y: friendlier.' },
    ],
    'livro-46': [
      { t: 'mc', q: '“Single-parent household” é uma casa com…', o: ['um só pai ou mãe', 'só avós', 'muitos primos'], c: 0 },
      { t: 'mc', q: '“Multi-generational household” é uma casa onde moram…', o: ['só jovens', 'várias gerações da família', 'só duas pessoas'], c: 1 },
      { t: 'mc', q: '“Trend” quer dizer…', o: ['tendência', 'tradição', 'tamanho'], c: 0 },
      { t: 'mc', q: '“Children leave home when they get a job.” Isso quer dizer que eles saem de casa quando…', o: ['arrumam um emprego', 'perdem o emprego', 'terminam a escola'], c: 0 },
      { t: 'gap', q: 'Families are ___ than before. (small)', a: ['smaller'], exp: 'Small + er = smaller.' },
      { t: 'mc', q: 'Single-parent households are ___ common today.', o: ['more', 'most', 'morer'], c: 0 },
    ],
    'teste': [
      { t: 'mc', q: 'Does she ___ here?', o: ['work', 'works'], c: 0 },
      { t: 'mc', q: 'My cousins ___ not live in Brazil.', o: ['do', 'does'], c: 0 },
      { t: 'mc', q: 'My brother is ___ than me.', o: ['taller', 'more tall'], c: 0 },
      { t: 'mc', q: 'My sister is ___ than my mother. (funny)', o: ['funnier', 'more funny'], c: 0 },
      { t: 'mc', q: 'She is ___ athletic than her brother.', o: ['less', 'least'], c: 0 },
      { t: 'mc', q: 'Como se diz “sobrinho” em inglês?', o: ['nephew', 'niece'], c: 0 },
      { t: 'mc', q: 'O pai da sua esposa é seu ___.', o: ['father-in-law', 'grandfather'], c: 0 },
      { t: 'mc', q: 'He ___ two cousins.', o: ['has', 'have'], c: 0 },
      { t: 'mc', q: 'Qual está certa?', o: ['Does he works here?', 'Does he work here?'], c: 1 },
      { t: 'mc', q: 'Better é o comparativo de…', o: ['good', 'bad'], c: 0 },
    ],
  },
  agoraPosso: ['Responder a boas e más notícias', 'Descrever e comparar pessoas', 'Descrever semelhanças e diferenças', 'Falar de tendências em famílias'],
};

/* ───────── o caminho do mês (a aula libera estas 20 tarefas) ───────── */
const PLANO_PREVIA = {
  nome: 'Science Lab',
  curso: 'Connectivity 1',
  unidade: PLANO_UNIDADE_4,
  aulas: [
    { id: 'a0', rotulo: 'Início do plano', data: '2026-11-02', feita: true },
    { id: 'a1', rotulo: 'Aula do mês', data: '2026-11-11', hora: '19h', feita: false },
  ],
  pacotes: [
    { aula: 'a0', titulo: 'Talking about People', tarefas: [
      // Semana 1 · Família (p. 37–39)
      { id: 't1', sem: 0, tipo: 'livro', ref: 'livro-38', ic: '📘', titulo: 'Livro: a família da Kim', sub: 'p. 38 · exercício A', pagina: 'p. 38 — exercício A',
        oQue: 'Abra o livro na página 38 e olhe as fotos da família da Kim. Depois responda aqui, em vez de escrever no livro.' },
      { id: 't2', sem: 0, tipo: 'vocab', ref: 'familia', ic: '🔤', titulo: 'Vocabulário: família', sub: '14 palavras com áudio' },
      { id: 't3', sem: 0, tipo: 'estudo', ref: 'familia', ic: '👨‍👩‍👧', titulo: 'Parentes por casamento', sub: 'Estudo + teste · 5 min' },
      { id: 't4', sem: 0, tipo: 'jogo', formato: 'memoria', ic: '🃏', titulo: 'Jogo: memória da família', sub: 'Palavra e significado' },
      { id: 't5', sem: 0, tipo: 'livro', ref: 'livro-39', ic: '💬', titulo: 'Livro: a conversa Kyla e Emi', sub: 'p. 39 · Zoom-In', pagina: 'p. 39 — Zoom-In',
        oQue: 'Leia a conversa de Kyla e Emi na página 39 (se quiser, ouça o áudio do livro). Depois responda aqui.' },
      // Semana 2 · Presente simples (p. 40–41)
      { id: 't6', sem: 1, tipo: 'vocab', ref: 'civil', ic: '💍', titulo: 'Vocabulário: estado civil', sub: '8 palavras · p. 40' },
      { id: 't7', sem: 1, tipo: 'estudo', ref: 'do-does', ic: '📖', titulo: 'Do ou does?', sub: 'Estudo + teste · 6 min' },
      { id: 't8', sem: 1, tipo: 'posaula', ref: 'posaula-do', tema: 'do-does', ic: '📄', titulo: 'Reler a sua aula', sub: 'do / does · 5 perguntas',
        oQue: 'Releia o pós-aula que explicou do/does (veja abaixo) e responda.' },
      { id: 't9', sem: 1, tipo: 'jogo', formato: 'relampago', ic: '⚡', titulo: 'Jogo: do ou does?', sub: 'Responda rápido' },
      { id: 't10', sem: 1, tipo: 'extra', ic: '🗣️', titulo: 'Falar: boas e más notícias', sub: 'Extras · grave sua voz', pagina: 'p. 41 — modelo da conversa',
        oQue: 'Leia a conversa-modelo da página 41 (boas e más notícias). Depois, na aba Atividades → Extras, grave você contando uma novidade boa e uma ruim de alguém da família.' },
      // Semana 3 · Comparar pessoas (p. 42–43)
      { id: 't11', sem: 2, tipo: 'vocab', ref: 'adjetivos', ic: '😀', titulo: 'Vocabulário: personalidade', sub: '10 palavras · p. 42' },
      { id: 't12', sem: 2, tipo: 'estudo', ref: 'comparativos', ic: '⚖️', titulo: 'Comparativos', sub: 'Estudo + teste · 6 min' },
      { id: 't13', sem: 2, tipo: 'atividade', ic: '✏️', titulo: 'Atividade: comparativos', sub: 'Corrija ao terminar' },
      { id: 't14', sem: 2, tipo: 'jogo', formato: 'montar', ic: '🧩', titulo: 'Jogo: montar a frase', sub: 'Comparativos' },
      { id: 't15', sem: 2, tipo: 'extra', ic: '🎧', titulo: 'Extra: ditado', sub: 'Listening · Daily Dictation',
        oQue: 'Na aba Atividades → Extras, faça o ditado (Listening): ouça e escreva o que entender.' },
      // Semana 4 · Semelhanças e tendências (p. 44–48)
      { id: 't16', sem: 3, tipo: 'livro', ref: 'livro-44', ic: '👯', titulo: 'Livro: as gêmeas', sub: 'p. 44 · leitura', pagina: 'p. 44 — leitura “Are twins always alike?”',
        oQue: 'Leia o texto sobre os dois pares de gêmeos na página 44. Depois responda aqui.' },
      { id: 't17', sem: 3, tipo: 'extra', ic: '✍️', titulo: 'Escrever: duas pessoas', sub: 'p. 45 · Extras', pagina: 'p. 45 — Writing',
        oQue: 'Escreva de 4 a 6 frases comparando duas pessoas da sua família (use comparativos). Faça na aba Atividades → Extras.' },
      { id: 't18', sem: 3, tipo: 'jogo', formato: 'forca', ic: '🔠', titulo: 'Jogo: forca', sub: 'Vocabulário da unidade' },
      { id: 't19', sem: 3, tipo: 'livro', ref: 'livro-46', ic: '🏠', titulo: 'Livro: tendências', sub: 'p. 46–47', pagina: 'p. 46–47 — rádio e pesquisa',
        oQue: 'Na página 46, ouça o programa de rádio do livro; na 47, veja a pesquisa sobre famílias. Depois responda aqui.' },
      { id: 't20', sem: 3, tipo: 'teste', ref: 'teste', ic: '🏁', titulo: 'Mini-teste da unidade', sub: '10 perguntas · selo' },
    ] },
    { aula: 'a1', futuro: true, titulo: 'Eating in Restaurants', tarefas: [
      { id: 'f1', ic: '📘', titulo: 'Livro' }, { id: 'f2', ic: '🔤', titulo: 'Vocabulário' }, { id: 'f3', ic: '📖', titulo: 'Estudo' },
      { id: 'f4', ic: '🎮', titulo: 'Jogo' }, { id: 'f5', ic: '✏️', titulo: 'Atividade' },
    ] },
  ],
};

/* ───────── modo: quem vê o Caminho ───────── */
function planoModo(student, user, mirror) {
  if (!student) return null;
  const admin = PLANO_ADMINS.includes(String((user && user.email) || '').toLowerCase());
  const q = new URLSearchParams(window.location.search);
  const teste = q.get('planoteste') === '1';
  // ?planoteste=1&curso=u04 (admin): prévia do Caminho do curso (livro no app) nessa unidade, sem gravar nada.
  if (teste && admin) return { ...PLANO_PREVIA, previa: true, cursoRef: q.get('curso') ? { id: 'connectivity-1', inicial: q.get('inicial') || q.get('curso'), atual: q.get('curso') } : null };
  const p = student.plano;
  // Com plano.livro (ex.: 'connectivity-1') o Caminho vem do curso no Firestore; sem ele, o pacote antigo da Unit 4.
  if (p && p.ativo !== false) return { ...PLANO_PREVIA, ...(typeof p === 'object' ? p : {}), previa: false, cursoRef: p.livro ? { id: p.livro, inicial: p.unidadeInicial || p.unidadeAtual, atual: p.unidadeAtual || p.unidadeInicial } : null };
  return null;
}

/* ───────── ajudantes ───────── */
function PlanoHoje() { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }
function PlanoDias(iso) { const [y, m, d] = iso.split('-').map(Number); return Math.round((new Date(y, m - 1, d) - PlanoHoje()) / 86400000); }
function PlanoDataCurta(iso) { const [, m, d] = iso.split('-'); return `${d}/${m}`; }
function PlanoEmDias(iso) { const n = PlanoDias(iso); return n === 0 ? 'hoje' : n === 1 ? 'amanhã' : n < 0 ? `há ${-n} dias` : `em ${n} dias`; }
function PlanoEmbaralhar(a) { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function PlanoNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
// Resposta digitada: ignora maiúscula, ponto, vírgula e espaço sobrando (só o "I" importa, e isso a gente não cobra aqui).
function PlanoNormResp(s) { return PlanoNorm(s).replace(/[’‘`]/g, "'").replace(/[.,!?;:"]/g, '').replace(/\s+/g, ' ').trim(); }
function PlanoTituloAula(p) { return typeof postTitle === 'function' ? postTitle(p) : (p.title || 'Pós-aula'); }
function PlanoTextoAula(p) { return PlanoNorm(String(p.html || '').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')); }
function PlanoWhatsLink(student, texto) {
  const n = String((student && student.whatsapp) || PLANO_WHATS_PADRAO).replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
}

// Acha, nos pós-aulas DA ALUNA, onde o tema foi explicado: pesa mais o título/tópico
// e conta poucas repetições no texto, para uma palavra comum não puxar aula errada.
function PlanoAulasDoTema(tema, posaulas) {
  const kws = tema.palavras.map(PlanoNorm);
  return posaulas.map(p => {
    const cabeca = PlanoNorm(`${p.topic || ''} ${PlanoTituloAula(p)}`);
    const corpo = PlanoTextoAula(p);
    let score = 0;
    kws.forEach(k => {
      if (cabeca.includes(k)) score += 6;
      score += Math.min(corpo.split(k).length - 1, 2);
    });
    return { p, score };
  }).filter(x => x.score >= 6).sort((a, b) => b.score - a.score).slice(0, 3).map(x => x.p);
}

// O que a aluna já fez fica no aparelho (rápido, funciona sem internet) E na conta dela:
// students/{uid}/planoProgresso/feitas. Trocou de celular? Ao abrir, o app junta os dois lados.
// `nuvem` é falso na prévia do admin. No espelho (admin olhando a aluna) só lê, nunca grava.
function usePlanoFeitas(uid, nuvem) {
  const chave = `plano-feitas-v1-${uid || 'x'}`;
  const lerLocal = () => { try { return JSON.parse(localStorage.getItem(chave) || '{}'); } catch (e) { return {}; } };
  const [feitas, setFeitas] = React.useState(lerLocal);
  const conta = React.useRef(null);   // { fb, ref } quando é a própria aluna e o banco respondeu
  React.useEffect(() => {
    if (!nuvem || !uid || uid === 'x' || typeof getFB !== 'function') return undefined;
    let vivo = true;
    getFB().then(async fb => {
      const dono = !!(fb.auth && fb.auth.currentUser && fb.auth.currentUser.uid === uid);
      const ref = fb.doc(fb.db, 'students', uid, 'planoProgresso', 'feitas');
      const snap = await fb.getDoc(ref);
      if (!vivo) return;
      const remoto = snap.exists() ? (snap.data().feitas || {}) : {};
      const local = lerLocal();
      const uniao = dono ? { ...local, ...remoto } : { ...remoto };   // espelho: só o que está na conta
      if (dono) {
        try { localStorage.setItem(chave, JSON.stringify(uniao)); } catch (e) {}
        const faltando = {}; Object.keys(local).forEach(k => { if (!remoto[k]) faltando[k] = true; });
        if (Object.keys(faltando).length) fb.setDoc(ref, { feitas: faltando, atualizadoEm: fb.serverTimestamp() }, { merge: true }).catch(() => {});
        conta.current = { fb, ref };
      }
      setFeitas(dono ? (atual => ({ ...atual, ...uniao })) : uniao);   // espelho: só o que a aluna fez, não o que está neste navegador
    }).catch(() => {});   // sem rede ou sem permissão: segue só com o aparelho
    return () => { vivo = false; };
  }, [uid, nuvem, chave]);
  const marcar = React.useCallback((id) => {
    setFeitas(atual => {
      if (atual[id]) return atual;
      const novo = { ...atual, [id]: true };
      try { localStorage.setItem(chave, JSON.stringify(novo)); } catch (e) {}
      if (conta.current) conta.current.fb.setDoc(conta.current.ref, { feitas: { [id]: true }, atualizadoEm: conta.current.fb.serverTimestamp() }, { merge: true }).catch(() => {});
      return novo;
    });
  }, [chave]);
  const zerar = React.useCallback(() => { try { localStorage.removeItem(chave); } catch (e) {} setFeitas({}); }, [chave]);
  return [feitas, marcar, zerar];
}

const PLANO_CSS = `
@keyframes planoPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,.45); } 50% { box-shadow: 0 0 0 14px rgba(124,58,237,0); } }
@keyframes planoSobe { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes planoSurge { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
.plano-btn { display:block; width:100%; border:0; border-radius:16px; padding:14px 16px; color:#fff; font-weight:800; font-size:15px; font-family:inherit; cursor:pointer;
  background:linear-gradient(180deg,#34D399,var(--brand-light)); box-shadow:0 8px 20px rgba(var(--brand-rgb),.28); }
.plano-btn.sec { background:#fff; color:var(--brand-dark); border:1.5px solid rgba(var(--brand-rgb),.35); box-shadow:none; }
.plano-btn.violeta { background:linear-gradient(180deg,#8B5CF6,#6D28D9); box-shadow:0 8px 20px rgba(109,40,217,.28); }
.plano-btn:disabled { background:#E2E8F0; color:#94A3B8; box-shadow:none; cursor:not-allowed; }
.plano-opt { display:block; width:100%; text-align:left; padding:11px 13px; border-radius:12px; border:1.5px solid #E2E8F0; background:#fff; font-weight:800; font-size:14px; font-family:inherit; margin-top:7px; cursor:pointer; }
.plano-opt.ok { background:#DCFCE7; border-color:#22C55E; color:#14532D; }
.plano-opt.no { background:#FEE2E2; border-color:#F87171; color:#7F1D1D; }
.plano-md b, .plano-md strong { color:#0F172A; }
.plano-tab { width:100%; border-collapse:collapse; font-size:12.5px; font-weight:700; margin:0 0 12px; }
.plano-tab th { background:#F1F5F9; text-align:left; padding:7px 8px; font-size:10.5px; text-transform:uppercase; letter-spacing:.4px; color:#64748B; }
.plano-tab td { padding:7px 8px; border-bottom:1px solid #EEF2F6; vertical-align:top; }
`;

// **negrito** e *itálico* simples (o conteúdo é nosso, não do aluno).
function PlanoMd({ x }) {
  const partes = String(x).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean);
  return <span className="plano-md">{partes.map((s, i) =>
    s.startsWith('**') ? <strong key={i}>{s.slice(2, -2)}</strong> : s.startsWith('*') ? <em key={i}>{s.slice(1, -1)}</em> : <React.Fragment key={i}>{s}</React.Fragment>)}</span>;
}

/* ───────── navegação de baixo ───────── */
const PLANO_ABAS = [
  { id: 'caminho', ic: '🛤️', l: 'Caminho' },
  { id: 'atividades', ic: '✏️', l: 'Atividades' },
  { id: 'aulas', ic: '📄', l: 'Aulas' },
  { id: 'perfil', ic: '👤', l: 'Perfil' },
];
function PlanoNav({ active, onChange }) {
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 200, background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(var(--brand-rgb),.12)', display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 8px)', flexShrink: 0 }}>
      {PLANO_ABAS.map(t => { const on = t.id === active; return (
        <button key={t.id} onClick={() => onChange(t.id)} style={{ flex: 1, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 4px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontFamily: 'inherit' }}>
          <div style={{ width: 44, height: 36, borderRadius: 12, background: on ? 'rgba(124,58,237,.14)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19 }}>{t.ic}</div>
          <span style={{ fontSize: 10, fontWeight: on ? 800 : 500, color: on ? '#5B21B6' : '#94A3B8', lineHeight: 1 }}>{t.l}</span>
        </button>); })}
    </div>
  );
}

/* ───────── o Caminho (trilha) ───────── */
const PLANO_X = [170, 214, 240, 214, 170, 126];
function PlanoLayout(cfg, feitas, ativOk) {
  const itens = []; let y = 14; let primeiraAberta = true; let n = 0;
  const feitaT = t => t.tipo === 'atividade' ? ativOk : !!feitas[t.id];
  cfg.aulas.forEach(aula => {
    const pac = cfg.pacotes.find(p => p.aula === aula.id);
    itens.push({ k: 'aula', aula, x: 170, y: y + 52, h: 120, r: 42 }); y += 120;
    if (!pac) return;
    itens.push({ k: 'cab', pac, y: y + 8, h: 64 }); y += 64;
    let sem = null;
    pac.tarefas.forEach(t => {
      // O curso (livro) agrupa por lição (t.grupo); o pacote antigo agrupa por semana (t.sem).
      const grupo = t.grupo !== undefined ? t.grupo : (t.sem !== undefined ? `SEMANA ${t.sem + 1} · ${String((cfg.unidade.semanas || [])[t.sem] || '').toUpperCase()}` : null);
      if (!pac.futuro && grupo && grupo !== sem) {
        sem = grupo;
        itens.push({ k: 'sem', rotulo: grupo, y: y + 10, h: 60 }); y += 60;
      }
      let estado;
      if (pac.futuro) estado = 'trancada';
      else if (feitaT(t)) estado = 'feita';
      else if (primeiraAberta) { estado = 'atual'; primeiraAberta = false; }
      else estado = 'aberta';
      itens.push({ k: 'tarefa', t, pac, estado, x: PLANO_X[n % PLANO_X.length], y: y + 52, h: 104, r: 32 }); y += 104; n++;
    });
  });
  const nos = itens.filter(i => i.k === 'aula' || i.k === 'tarefa');
  const proxAula = nos.find(no => no.k === 'aula' && !no.aula.feita);
  nos.forEach(no => { if (no.k === 'aula') no.estado = no.aula.feita ? 'feita' : (primeiraAberta ? 'proxima-foco' : 'proxima'); });
  const ultimoFeito = (() => { let u = -1; nos.forEach((no, i) => { if (no.estado === 'feita') u = i; }); return u; })();
  const curva = (a, b) => { const dy = (b.y - a.y) / 2; return `C ${a.x} ${a.y + dy} ${b.x} ${b.y - dy} ${b.x} ${b.y}`; };
  let todo = '', feito = '';
  nos.forEach((no, i) => { if (i === 0) { todo += `M ${no.x} ${no.y}`; feito += `M ${no.x} ${no.y}`; return; } todo += ' ' + curva(nos[i - 1], no); if (i <= ultimoFeito) feito += ' ' + curva(nos[i - 1], no); });
  return { itens, altura: y + 40, todo, feito: ultimoFeito > 0 ? feito : '', proxAula };
}

function PlanoNo({ it, onTarefa, onAula }) {
  const W = 340;
  if (it.k === 'cab') {
    const fut = it.pac.futuro;
    return <div style={{ position: 'absolute', left: 0, right: 0, top: it.y, display: 'flex', justifyContent: 'center' }}>
      <div style={{ padding: '7px 14px', borderRadius: 99, background: fut ? '#F1F5F9' : '#F5F3FF', border: `1px solid ${fut ? '#E2E8F0' : '#DDD6FE'}`, color: fut ? '#64748B' : '#5B21B6', fontSize: 11.5, fontWeight: 800, letterSpacing: .4 }}>
        {fut ? '🔒 DEPOIS DA AULA · ' : '📘 '}{it.pac.titulo}
      </div></div>;
  }
  if (it.k === 'sem') {
    return <div style={{ position: 'absolute', left: 0, right: 0, top: it.y, display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 1, background: '#DDD6FE' }} /><div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .7, color: '#6D28D9' }}>{it.rotulo}</div><div style={{ flex: 1, height: 1, background: '#DDD6FE' }} />
    </div>;
  }
  const lblEsq = it.x >= 200;
  const rotulo = { position: 'absolute', top: it.y - 22, width: `${((lblEsq ? it.x - it.r - 12 : W - (it.x + it.r + 8) - 4) / W) * 100}%`,
    left: lblEsq ? `${(4 / W) * 100}%` : `${((it.x + it.r + 8) / W) * 100}%`, textAlign: lblEsq ? 'right' : 'left', pointerEvents: 'none' };
  const nodeBase = { position: 'absolute', top: it.y - it.r, left: `${(it.x / W) * 100}%`, transform: 'translateX(-50%)', width: it.r * 2, height: it.r * 2, border: 0, fontFamily: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 };

  if (it.k === 'aula') {
    const a = it.aula; const feita = it.estado === 'feita'; const foco = it.estado === 'proxima-foco';
    const fundo = feita ? 'linear-gradient(150deg,#22C55E,#15803D)' : 'linear-gradient(150deg,#3B82F6,#1E40AF)';
    return <>
      <button onClick={() => onAula(a)} style={{ ...nodeBase, borderRadius: 28, background: fundo, color: '#fff', fontSize: 34, boxShadow: foco ? '0 0 0 6px rgba(59,130,246,.25), 0 12px 24px rgba(30,64,175,.35)' : '0 10px 22px rgba(15,23,42,.22)', opacity: !feita && !foco ? .92 : 1 }} aria-label={a.rotulo}>
        {feita ? <span style={{ position: 'relative' }}>🎓<span style={{ position: 'absolute', right: -14, bottom: -8, background: '#fff', color: '#15803D', borderRadius: 99, width: 22, height: 22, fontSize: 14, fontWeight: 800, display: 'grid', placeItems: 'center' }}>✓</span></span> : '🎓'}
      </button>
      <div style={{ ...rotulo, width: `${((W - (it.x + it.r + 10) - 2) / W) * 100}%`, left: `${((it.x + it.r + 10) / W) * 100}%`, textAlign: 'left', top: it.y - 26 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .6, color: feita ? '#15803D' : '#1E40AF' }}>{feita ? 'AULA FEITA' : 'PRÓXIMA AULA'}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{a.rotulo}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B' }}>{PlanoDataCurta(a.data)}{a.hora ? ` · ${a.hora}` : ''}{!feita ? ` · ${PlanoEmDias(a.data)}` : ''}</div>
      </div>
    </>;
  }

  const t = it.t; const e = it.estado;
  const estilo = e === 'feita' ? { background: 'linear-gradient(150deg,#22C55E,#15803D)', color: '#fff', boxShadow: '0 6px 0 #166534' }
    : e === 'atual' ? { background: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', color: '#fff', boxShadow: '0 6px 0 #4C1D95', animation: 'planoPulso 1.8s infinite' }
    : e === 'aberta' ? { background: '#fff', color: '#0F172A', border: `3px solid ${PLANO_COR}`, boxShadow: '0 6px 0 #DDD6FE' }
    : { background: '#E2E8F0', color: '#94A3B8', boxShadow: '0 6px 0 #CBD5E1' };
  return <>
    {e === 'atual' && <div style={{ position: 'absolute', top: it.y - it.r - 36, left: `${(it.x / W) * 100}%`, transform: 'translateX(-50%)', background: '#fff', border: `2px solid ${PLANO_COR}`, color: '#5B21B6', borderRadius: 12, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, letterSpacing: .5, whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(124,58,237,.18)' }}>
      COMEÇAR<span style={{ position: 'absolute', left: '50%', bottom: -7, width: 10, height: 10, background: '#fff', borderRight: `2px solid ${PLANO_COR}`, borderBottom: `2px solid ${PLANO_COR}`, transform: 'translateX(-50%) rotate(45deg)' }} /></div>}
    <button data-atual={e === 'atual' ? '1' : undefined} onClick={() => onTarefa(t, e)} style={{ ...nodeBase, borderRadius: '50%', fontSize: 26, ...estilo }} aria-label={t.titulo}>
      {e === 'feita' ? '✓' : e === 'trancada' ? '🔒' : t.ic}
    </button>
    <div style={{ ...rotulo, opacity: e === 'trancada' ? .6 : 1 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{t.titulo}</div>
      {t.sub && <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 1 }}>{t.sub}</div>}
    </div>
  </>;
}

function PlanoCaminho({ cfg, feitas, ativOk, onTarefa, onAula, onComoFunciona }) {
  const ref = React.useRef(null);
  const L = React.useMemo(() => PlanoLayout(cfg, feitas, ativOk), [cfg, feitas, ativOk]);
  const tarefas = cfg.pacotes.filter(p => !p.futuro).flatMap(p => p.tarefas);
  const feitasN = tarefas.filter(t => t.tipo === 'atividade' ? ativOk : !!feitas[t.id]).length;
  const prox = L.proxAula && L.proxAula.aula;
  const selo = !!feitas['selo:' + cfg.unidade.id];
  React.useEffect(() => { const el = ref.current && ref.current.querySelector('[data-atual="1"]'); if (el) el.scrollIntoView({ block: 'center' }); }, []);
  return (
    <div className="scroll-area" ref={ref} style={{ padding: '14px 16px 24px', position: 'relative' }}>
      <div style={{ background: 'linear-gradient(150deg,#6D28D9,#4C1D95)', color: '#fff', borderRadius: 22, padding: 16, boxShadow: '0 14px 30px rgba(76,29,149,.3)' }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: .8, opacity: .8 }}>{String(cfg.nome).toUpperCase()} · {String(cfg.curso).toUpperCase()}</div>
        <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2, marginTop: 4 }}>{feitasN === tarefas.length && tarefas.length ? 'Tarefas do mês concluídas! 🎉' : 'Seu caminho até a próxima aula'}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{ flex: 1, height: 9, borderRadius: 99, background: 'rgba(255,255,255,.22)', overflow: 'hidden' }}><div style={{ width: `${tarefas.length ? Math.round(feitasN / tarefas.length * 100) : 0}%`, height: '100%', background: '#C4B5FD', borderRadius: 99, transition: 'width .4s' }} /></div>
          <div style={{ fontSize: 12.5, fontWeight: 800 }}>{feitasN}/{tarefas.length}</div>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, opacity: .92, marginTop: 8 }}>{prox ? `Próxima aula ${PlanoEmDias(prox.data)} · ${PlanoDataCurta(prox.data)}${prox.hora ? ' às ' + prox.hora : ''}` : 'Sem aula marcada'}</div>
        {selo && <div style={{ marginTop: 10, display: 'inline-block', background: 'rgba(255,255,255,.18)', borderRadius: 99, padding: '5px 12px', fontSize: 12, fontWeight: 800 }}>🏅 Selo da Unit {cfg.unidade.numero || 4} conquistado</div>}
      </div>
      {cfg.unidadesLista && cfg.unidadesLista.length > 1 && <div style={{ display: 'flex', gap: 7, justifyContent: 'center', flexWrap: 'wrap', marginTop: 10 }}>
        {cfg.unidadesLista.map(u => { const on = u.id === cfg.unidade.id; return <button key={u.id} onClick={() => cfg.onUnidade && cfg.onUnidade(u.id)} style={{ border: `1.5px solid ${on ? '#6D28D9' : '#DDD6FE'}`, background: on ? '#6D28D9' : '#fff', color: on ? '#fff' : '#5B21B6', borderRadius: 99, padding: '5px 13px', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>Unit {u.n}</button>; })}
      </div>}
      <button onClick={onComoFunciona} style={{ display: 'block', margin: '10px auto 0', background: 'none', border: 0, color: '#5B21B6', fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}>Como funciona o caminho</button>
      <div style={{ position: 'relative', width: '100%', maxWidth: 340, margin: '6px auto 0', height: L.altura }}>
        <svg viewBox={`0 0 340 ${L.altura}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
          <path d={L.todo} fill="none" stroke="#CBD5E1" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 11" vectorEffect="non-scaling-stroke" />
          {L.feito && <path d={L.feito} fill="none" stroke="#22C55E" strokeWidth="6" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
        </svg>
        {L.itens.map((it, i) => <PlanoNo key={i} it={it} onTarefa={onTarefa} onAula={onAula} />)}
      </div>
    </div>
  );
}

/* ───────── camadas (tela cheia e folha de baixo) ───────── */
function PlanoCamada({ titulo, sub, onClose, onAsk, children, rodape }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,23,42,.4)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, height: '100%', background: '#F6F1EA', display: 'flex', flexDirection: 'column', animation: 'planoSurge .22s' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(var(--brand-rgb),.12)', padding: '11px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: '#F1F5F9', fontSize: 18, fontWeight: 800, color: '#475569', cursor: 'pointer' }}>✕</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>{titulo}</div>
            {sub && <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{sub}</div>}
          </div>
          {onAsk && <button onClick={onAsk} style={{ border: 0, background: '#F5F3FF', color: '#5B21B6', borderRadius: 12, padding: '8px 11px', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>💡 EurekIA</button>}
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 18px' }}>{children}</div>
        {rodape && <div style={{ padding: '10px 16px calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid rgba(var(--brand-rgb),.12)', flexShrink: 0 }}>{rodape}</div>}
      </div>
    </div>
  );
}

function PlanoFolha({ onClose, children, z }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: z || 450, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '88%', overflowY: 'auto', background: '#fff', borderRadius: '24px 24px 0 0', padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))', animation: 'planoSobe .25s', boxShadow: '0 -12px 40px rgba(0,0,0,.25)' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#CBD5E1', margin: '0 auto 14px' }} />
        {children}
      </div>
    </div>
  );
}

/* ───────── perguntas com correção automática (livro, pós-aula e mini-teste) ───────── */
function PlanoPerguntas({ perguntas, minimo = 0, rotuloFim = 'Concluir tarefa ✓', onFim }) {
  const [i, setI] = React.useState(0); const [sel, setSel] = React.useState(null); const [txt, setTxt] = React.useState('');
  const [ok, setOk] = React.useState(null); const [acertos, setAcertos] = React.useState(0);
  const total = perguntas.length; const fim = i >= total; const q = perguntas[i];
  const responder = valor => {
    if (ok !== null || !q) return;
    const certo = q.t === 'gap' ? q.a.map(PlanoNormResp).includes(PlanoNormResp(valor)) : valor === q.c;
    setSel(valor); setOk(certo); if (certo) setAcertos(a => a + 1);
  };
  const proxima = () => { setI(i + 1); setSel(null); setTxt(''); setOk(null); };
  const recomecar = () => { setI(0); setSel(null); setTxt(''); setOk(null); setAcertos(0); };
  if (fim) {
    const passou = acertos >= minimo;
    return <div style={{ textAlign: 'center', padding: '20px 4px' }}>
      <div style={{ fontSize: 56 }}>{passou ? '🎉' : '💪'}</div>
      <div style={{ fontSize: 22, fontWeight: 800, margin: '4px 0' }}>{acertos} de {total} certas</div>
      <div style={{ color: '#64748B', fontWeight: 700, fontSize: 14, margin: '0 0 16px' }}>{passou ? 'Muito bem!' : `Quase! Para passar você precisa de ${minimo}. Revise e tente de novo.`}</div>
      {passou ? <button className="plano-btn" onClick={() => onFim(acertos, total)}>{rotuloFim}</button> : <button className="plano-btn violeta" onClick={recomecar}>Tentar de novo</button>}
    </div>;
  }
  const respostaCerta = q.t === 'gap' ? q.a[0] : q.t === 'vf' ? (q.c ? 'Verdadeiro' : 'Falso') : q.o[q.c];
  return <div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ flex: 1, height: 8, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden' }}><div style={{ width: `${(i / total) * 100}%`, height: '100%', background: 'linear-gradient(90deg,var(--brand),var(--brand-light))', transition: 'width .3s' }} /></div>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#64748B' }}>{i + 1}/{total}</div>
    </div>
    <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: 15, fontSize: 16.5, fontWeight: 800, lineHeight: 1.4, boxShadow: '0 8px 24px rgba(15,23,42,.05)' }}>{q.q}</div>
    {q.t === 'mc' && q.o.map((o, k) => <button key={k} disabled={ok !== null} onClick={() => responder(k)} className={`plano-opt ${ok !== null ? (k === q.c ? 'ok' : k === sel ? 'no' : '') : ''}`}>{o}</button>)}
    {q.t === 'vf' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 7 }}>{[[true, 'Verdadeiro'], [false, 'Falso']].map(([v, l]) => <button key={l} disabled={ok !== null} onClick={() => responder(v)} className={`plano-opt ${ok !== null ? (v === q.c ? 'ok' : v === sel ? 'no' : '') : ''}`} style={{ textAlign: 'center', marginTop: 0 }}>{l}</button>)}</div>}
    {q.t === 'gap' && <div style={{ marginTop: 10 }}>
      <input value={txt} disabled={ok !== null} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && txt.trim()) responder(txt); }} placeholder="Digite a resposta" autoCapitalize="none" autoCorrect="off" spellCheck="false"
        style={{ width: '100%', border: `2px solid ${ok === null ? '#CBD5E1' : ok ? '#22C55E' : '#F87171'}`, borderRadius: 14, padding: '13px 14px', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', outline: 'none', background: ok === null ? '#fff' : ok ? '#F0FDF4' : '#FEF2F2' }} />
      {ok === null && <button className="plano-btn" style={{ marginTop: 10 }} disabled={!txt.trim()} onClick={() => responder(txt)}>Conferir</button>}
    </div>}
    {ok !== null && <div style={{ marginTop: 12, padding: '11px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, background: ok ? '#F0FDF4' : '#FEF2F2', color: ok ? '#14532D' : '#7F1D1D', border: `1px solid ${ok ? '#BBF7D0' : '#FECACA'}` }}>
      {ok ? '✔ Isso!' : `✘ A resposta certa é: ${respostaCerta}`}{q.exp ? <div style={{ fontWeight: 600, marginTop: 3 }}>{q.exp}</div> : null}
    </div>}
    {ok !== null && <button className="plano-btn" style={{ marginTop: 12 }} onClick={proxima}>{i + 1 >= total ? 'Ver resultado' : 'Continuar ›'}</button>}
  </div>;
}

function PlanoCartaoLivro({ t, unidade }) {
  return <div style={{ background: 'linear-gradient(150deg,#FFFBEB,#fff)', border: '1px solid #FDE68A', borderRadius: 18, padding: 14, marginBottom: 14 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 34 }}>📘</div>
      <div><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#92400E' }}>NO SEU LIVRO</div>
        <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.25 }}>{t.pagina}</div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B' }}>{unidade.livro}</div></div>
    </div>
    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', lineHeight: 1.5, marginTop: 10 }}>{t.oQue}</div>
  </div>;
}

function PlanoTarefaLivro({ t, unidade, onFeita, onClose, onAsk }) {
  return (
    <PlanoCamada titulo={t.titulo} sub={t.pagina} onClose={onClose} onAsk={onAsk}>
      <PlanoCartaoLivro t={t} unidade={unidade} />
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: .6, color: '#64748B', margin: '0 2px 8px' }}>RESPONDA AQUI, NÃO NO LIVRO</div>
      <PlanoPerguntas perguntas={unidade.perguntas[t.ref]} onFim={onFeita} />
    </PlanoCamada>
  );
}

function PlanoTarefaPosaula({ t, unidade, posaulas, onOpenPost, onFeita, onClose, onAsk }) {
  const aulas = React.useMemo(() => PlanoAulasDoTema(unidade.temas[t.tema], posaulas || []), [t, unidade, posaulas]);
  return (
    <PlanoCamada titulo={t.titulo} sub="Pós-aula · suas aulas" onClose={onClose} onAsk={onAsk}>
      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 18, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#5B21B6' }}>RELEIA SUAS AULAS</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', lineHeight: 1.5, margin: '4px 0 6px' }}>{t.oQue}</div>
        {aulas.length ? aulas.map(p => <button key={p.id} onClick={() => onOpenPost(p)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '6px 0 0', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, color: '#5B21B6', textDecoration: 'underline', cursor: 'pointer' }}>📄 {PlanoTituloAula(p)}</button>)
          : <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B' }}>Você ainda não tem um pós-aula sobre este assunto. Use o estudo do caminho como referência.</div>}
      </div>
      <PlanoPerguntas perguntas={unidade.perguntas[t.ref]} onFim={onFeita} />
    </PlanoCamada>
  );
}

/* ───────── estudo (o material mora aqui) ───────── */
function PlanoEstudo({ estudo, unidade, posaulas, onOpenPost, onFeita, onClose, onAsk }) {
  const [resp, setResp] = React.useState(null);
  const tema = unidade.temas[estudo.tema];
  const aulas = React.useMemo(() => PlanoAulasDoTema(tema, posaulas || []), [tema, posaulas]);
  const q = estudo.teste;
  return (
    <PlanoCamada titulo={estudo.titulo} sub={`${unidade.livro}`} onClose={onClose} onAsk={onAsk}
      rodape={<button className="plano-btn" disabled={resp === null} onClick={onFeita}>{resp === null ? 'Responda o teste para concluir' : 'Concluir tarefa ✓'}</button>}>
      {estudo.blocos.map((b, i) => {
        if (b.t === 'p') return <p key={i} style={{ fontSize: 14.5, lineHeight: 1.6, fontWeight: 600, color: '#334155', margin: '0 0 12px' }}><PlanoMd x={b.x} /></p>;
        if (b.t === 'ex') return <div key={i} style={{ background: '#F0FDF4', borderLeft: '4px solid var(--brand)', borderRadius: 10, padding: '9px 12px', margin: '0 0 12px', fontSize: 14.5, fontWeight: 800, lineHeight: 1.5 }}>{b.en}<div style={{ color: '#64748B', fontWeight: 600, fontSize: 12.5, marginTop: 2 }}>{b.pt}</div></div>;
        if (b.t === 'dica') return <div key={i} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '10px 12px', margin: '0 0 12px', fontSize: 13.5, fontWeight: 700, color: '#78350F', lineHeight: 1.5 }}>💡 <PlanoMd x={b.x} /></div>;
        if (b.t === 'tab') return <table key={i} className="plano-tab"><thead><tr>{b.cab.map((c, j) => <th key={j}>{c}</th>)}</tr></thead><tbody>{b.lin.map((l, j) => <tr key={j}>{l.map((c, k) => <td key={k}>{c}</td>)}</tr>)}</tbody></table>;
        return null;
      })}
      {aulas.length > 0 && (
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '10px 12px', margin: '4px 0 12px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#4C1D95' }}>📌 Você viu isso nas suas aulas</div>
          {aulas.map(p => <button key={p.id} onClick={() => onOpenPost(p)} style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 0, padding: '6px 0 0', fontFamily: 'inherit', fontWeight: 800, fontSize: 12.5, color: '#5B21B6', textDecoration: 'underline', cursor: 'pointer' }}>{PlanoTituloAula(p)}</button>)}
        </div>)}
      <div style={{ background: '#fff', border: '1.5px dashed rgba(var(--brand-rgb),.5)', borderRadius: 16, padding: 13 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>✅ Teste rápido: {q.p}</div>
        {q.o.map((o, i) => <button key={i} disabled={resp !== null} onClick={() => setResp(i)} className={`plano-opt ${resp !== null ? (i === q.c ? 'ok' : i === resp ? 'no' : '') : ''}`}>{o}</button>)}
        {resp !== null && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 9, color: resp === q.c ? '#14532D' : '#7F1D1D' }}>{resp === q.c ? q.ok : q.no}</div>}
      </div>
    </PlanoCamada>
  );
}

/* ───────── vocabulário ───────── */
function PlanoFalar(texto, taxa) { try { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(texto); u.lang = 'en-US'; u.rate = taxa || .9; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } } catch (e) {} }
function PlanoVocab({ vocab, titulo, onFeita, onClose, onAsk }) {
  const [i, setI] = React.useState(0); const [vira, setVira] = React.useState(false);
  const [en, pt] = vocab[i]; const ultimo = i === vocab.length - 1;
  return (
    <PlanoCamada titulo={titulo || 'Vocabulário'} sub={`${i + 1} de ${vocab.length}`} onClose={onClose} onAsk={onAsk}
      rodape={<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="plano-btn sec" disabled={i === 0} onClick={() => { setI(i - 1); setVira(false); }}>‹ Anterior</button>
        {ultimo ? <button className="plano-btn" onClick={onFeita}>Concluir ✓</button> : <button className="plano-btn" onClick={() => { setI(i + 1); setVira(false); }}>Próxima ›</button>}
      </div>}>
      <button onClick={() => { setVira(v => !v); if (!vira) PlanoFalar(en); }} style={{ width: '100%', minHeight: 240, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 22, boxShadow: '0 12px 30px rgba(15,23,42,.08)', fontFamily: 'inherit', cursor: 'pointer', display: 'grid', placeItems: 'center', textAlign: 'center', padding: 16 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#64748B' }}>{vira ? 'PORTUGUÊS' : 'INGLÊS · TOQUE PARA VIRAR'}</div>
          <div style={{ fontSize: 36, fontWeight: 800, marginTop: 10, color: vira ? '#15803D' : '#0F172A' }}>{vira ? pt : en}</div>
          {!vira && <div onClick={e => { e.stopPropagation(); PlanoFalar(en); }} style={{ fontSize: 28, marginTop: 10 }} role="button" aria-label="Ouvir">🔊</div>}
        </div>
      </button>
    </PlanoCamada>
  );
}

/* ───────── jogos (cada formato é uma tarefa; o conteúdo vem da unidade) ───────── */
function PlanoJogoMemoria({ pares, onFim }) {
  const [cartas] = React.useState(() => PlanoEmbaralhar(pares.flatMap(([a, b], i) => [{ k: i, t: a }, { k: i, t: b }])));
  const [viradas, setViradas] = React.useState([]); const [achadas, setAchadas] = React.useState([]); const [jogadas, setJogadas] = React.useState(0);
  const trava = React.useRef(false);
  const virar = i => {
    if (trava.current || viradas.includes(i) || achadas.includes(cartas[i].k)) return;
    const nv = [...viradas, i]; setViradas(nv);
    if (nv.length === 2) {
      setJogadas(j => j + 1);
      if (cartas[nv[0]].k === cartas[nv[1]].k) { setAchadas(x => [...x, cartas[nv[0]].k]); setViradas([]); }
      else { trava.current = true; setTimeout(() => { setViradas([]); trava.current = false; }, 800); }
    }
  };
  const fim = achadas.length === pares.length;
  if (fim) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>🎉</div><div style={{ fontSize: 22, fontWeight: 800 }}>Você achou todos!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>{jogadas} jogadas</div><button className="plano-btn" onClick={() => onFim(jogadas)}>Concluir ✓</button></div>;
  return <div>
    <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#64748B', marginBottom: 10 }}>Vire duas cartas: a palavra em inglês e o significado. · {jogadas} jogadas</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 9 }}>
      {cartas.map((c, i) => { const up = viradas.includes(i) || achadas.includes(c.k); const ok = achadas.includes(c.k); return (
        <button key={i} onClick={() => virar(i)} style={{ aspectRatio: '1/1.05', borderRadius: 16, border: up ? `2px solid ${ok ? '#22C55E' : '#E2E8F0'}` : 0, fontFamily: 'inherit', fontWeight: 800, fontSize: up ? 15 : 28, lineHeight: 1.15, padding: 4, cursor: 'pointer',
          background: ok ? '#DCFCE7' : up ? '#fff' : 'linear-gradient(150deg,var(--brand),var(--brand-dark))', color: ok ? '#14532D' : up ? '#0F172A' : 'rgba(255,255,255,.5)', boxShadow: up ? 'none' : '0 6px 14px rgba(6,78,59,.25)' }}>{up ? c.t : '?'}</button>); })}
    </div>
  </div>;
}

function PlanoJogoRelampago({ perguntas, onFim }) {
  const [i, setI] = React.useState(0); const [pts, setPts] = React.useState(0); const [seq, setSeq] = React.useState(0); const [melhor, setMelhor] = React.useState(0);
  const [fb, setFb] = React.useState(null); const [w, setW] = React.useState(100);
  const fim = i >= perguntas.length;
  const responder = React.useCallback((op) => {
    if (fb) return;
    const q = perguntas[i]; const ok = op === q.c; const ns = ok ? seq + 1 : 0;
    setSeq(ns); setMelhor(m => Math.max(m, ns)); if (ok) setPts(p => p + 10 + Math.min(ns - 1, 4) * 2);
    setFb({ op, ok }); setTimeout(() => { setFb(null); setI(x => x + 1); }, 900);
  }, [fb, i, seq, perguntas]);
  React.useEffect(() => {
    if (fb || fim) return undefined;
    const t0 = Date.now();
    const id = setInterval(() => { const f = Math.min(1, (Date.now() - t0) / 8000); setW(100 * (1 - f)); if (f >= 1) { clearInterval(id); responder(-1); } }, 100);
    return () => clearInterval(id);
  }, [i, fb, fim, responder]);
  if (fim) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>⚡</div><div style={{ fontSize: 22, fontWeight: 800 }}>{pts} pontos!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>Melhor sequência: {melhor} acertos seguidos</div><button className="plano-btn" onClick={() => onFim(pts)}>Concluir ✓</button></div>;
  const q = perguntas[i]; const [a, b] = q.f.split('___');
  return <div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>{[[`${i + 1}/${perguntas.length}`, 'pergunta'], [pts, 'pontos'], [`🔥${seq}`, 'sequência']].map(([v, l]) => <div key={l} style={{ flex: 1, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 14, padding: 8, textAlign: 'center' }}><b style={{ display: 'block', fontSize: 18 }}>{v}</b><small style={{ fontSize: 10.5, fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>{l}</small></div>)}</div>
    <div style={{ height: 10, borderRadius: 99, background: '#E5E7EB', overflow: 'hidden', margin: '6px 0 14px' }}><div style={{ width: `${w}%`, height: '100%', background: 'linear-gradient(90deg,#F59E0B,#EF4444)' }} /></div>
    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.35, textAlign: 'center', margin: '10px 0 16px', padding: '20px 10px', background: '#fff', borderRadius: 18, border: '1px solid rgba(var(--brand-rgb),.12)' }}>{a}<span style={{ display: 'inline-block', minWidth: 70, borderBottom: '3px solid var(--brand)', color: fb ? 'var(--brand-dark)' : 'transparent' }}>{fb ? q.o[q.c] : '____'}</span>{b}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>{q.o.map((o, k) => <button key={k} disabled={!!fb} onClick={() => responder(k)} className={`plano-opt ${fb ? (k === q.c ? 'ok' : k === fb.op ? 'no' : '') : ''}`} style={{ textAlign: 'center', fontSize: 18, padding: '16px 8px', marginTop: 0 }}>{o}</button>)}</div>
    {fb && <div style={{ textAlign: 'center', marginTop: 12, fontWeight: 800, color: fb.ok ? '#14532D' : '#7F1D1D' }}>{fb.ok ? '✔ Isso!' : fb.op < 0 ? '⏰ Acabou o tempo' : `✘ Era “${q.o[q.c]}”`}</div>}
  </div>;
}

function PlanoJogoMontar({ frases, onFim }) {
  const [i, setI] = React.useState(0); const [score, setScore] = React.useState(0);
  const novo = idx => PlanoEmbaralhar((frases[idx] ? frases[idx].w : []).map((t, k) => ({ t, k })));
  const [banco, setBanco] = React.useState(() => novo(0)); const [resp, setResp] = React.useState([]); const [res, setRes] = React.useState(null);
  if (i >= frases.length) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>🧩</div><div style={{ fontSize: 22, fontWeight: 800 }}>Frases completas!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>{score} de {frases.length} certas</div><button className="plano-btn" onClick={() => onFim(score)}>Concluir ✓</button></div>;
  const cur = frases[i];
  const palavra = (w, onClick, extra) => <button key={w.k + w.t} onClick={onClick} style={{ padding: '9px 13px', borderRadius: 12, background: '#fff', border: `1.5px solid ${extra ? 'var(--brand)' : '#CBD5E1'}`, boxShadow: `0 2px 0 ${extra ? 'var(--brand)' : '#CBD5E1'}`, fontWeight: 800, fontSize: 15, fontFamily: 'inherit', cursor: 'pointer' }}>{w.t}</button>;
  const conferir = () => { const ok = resp.map(w => w.t).join(' ') === cur.w.join(' '); setRes(ok); if (ok) setScore(s => s + 1); };
  const proxima = () => { const n = i + 1; setI(n); setRes(null); setResp([]); setBanco(novo(n)); };
  return <div>
    <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: 14, marginBottom: 10 }}><div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Monte a frase em inglês ({i + 1}/{frases.length}):</div><div style={{ fontSize: 16.5, fontWeight: 800, marginTop: 4 }}>“{cur.pt}”</div></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 56, padding: 10, borderRadius: 16, background: '#fff', border: '2px dashed #CBD5E1', margin: '8px 0 12px' }}>{resp.map((w, k) => palavra(w, () => { if (res === null) { setBanco(b => [...b, w]); setResp(r => r.filter((_, j) => j !== k)); } }, true))}</div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 56, padding: 10, borderRadius: 16, background: '#F1F5F9' }}>{banco.map((w, k) => palavra(w, () => { if (res === null) { setResp(r => [...r, w]); setBanco(b => b.filter((_, j) => j !== k)); } }, false))}</div>
    {res === null ? <button className="plano-btn" style={{ marginTop: 14 }} disabled={!resp.length} onClick={conferir}>Conferir</button>
      : <div><div style={{ textAlign: 'center', fontWeight: 800, margin: '12px 0', color: res ? '#14532D' : '#7F1D1D' }}>{res ? '✔ Perfeito!' : `✘ Quase! O certo é: ${cur.w.join(' ')}`}</div><button className="plano-btn" onClick={proxima}>Próxima ›</button></div>}
  </div>;
}

// Forca: 6 vidas por palavra; a dica é o significado em português.
function PlanoJogoForca({ palavras, onFim }) {
  const [i, setI] = React.useState(0); const [certas, setCertas] = React.useState([]); const [erradas, setErradas] = React.useState([]);
  const [res, setRes] = React.useState(null); const [pontos, setPontos] = React.useState(0);
  if (i >= palavras.length) return <div style={{ textAlign: 'center', padding: '24px 4px' }}><div style={{ fontSize: 56 }}>🔠</div><div style={{ fontSize: 22, fontWeight: 800 }}>{pontos} de {palavras.length} palavras!</div><div style={{ color: '#64748B', fontWeight: 700, margin: '4px 0 16px' }}>Bom treino de vocabulário.</div><button className="plano-btn" onClick={() => onFim(pontos)}>Concluir ✓</button></div>;
  const alvo = palavras[i]; const w = alvo.w.toLowerCase(); const letras = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const tentar = l => {
    if (res || certas.includes(l) || erradas.includes(l)) return;
    if (w.includes(l)) {
      const nc = [...certas, l]; setCertas(nc);
      if (w.split('').every(c => nc.includes(c))) { setRes('ganhou'); setPontos(p => p + 1); }
    } else { const ne = [...erradas, l]; setErradas(ne); if (ne.length >= 6) setRes('perdeu'); }
  };
  const proxima = () => { setI(i + 1); setCertas([]); setErradas([]); setRes(null); };
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: '#64748B', marginBottom: 8 }}><span>Palavra {i + 1} de {palavras.length}</span><span>{'❤️'.repeat(6 - erradas.length)}{'🤍'.repeat(erradas.length)}</span></div>
    <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: '16px 12px', textAlign: 'center' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B' }}>Significa: <b style={{ color: '#0F172A' }}>{alvo.d}</b></div>
      <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 6, marginTop: 8, fontFamily: 'ui-monospace,Menlo,monospace' }}>{w.split('').map(c => certas.includes(c) || res ? c : '_').join(' ')}</div>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginTop: 14 }}>{letras.map(l => { const c = certas.includes(l), e = erradas.includes(l); return <button key={l} disabled={c || e || !!res} onClick={() => tentar(l)} style={{ padding: '10px 0', borderRadius: 10, border: '1.5px solid ' + (c ? '#22C55E' : e ? '#F87171' : '#CBD5E1'), background: c ? '#DCFCE7' : e ? '#FEE2E2' : '#fff', color: c ? '#14532D' : e ? '#7F1D1D' : '#0F172A', fontWeight: 800, fontSize: 15, fontFamily: 'inherit', textTransform: 'uppercase', cursor: 'pointer', opacity: c || e ? .6 : 1 }}>{l}</button>; })}</div>
    {res && <div style={{ marginTop: 14 }}><div style={{ textAlign: 'center', fontWeight: 800, marginBottom: 10, color: res === 'ganhou' ? '#14532D' : '#7F1D1D' }}>{res === 'ganhou' ? `✔ Isso! ${alvo.w}` : `✘ Era “${alvo.w}”`}</div><button className="plano-btn" onClick={proxima}>{i + 1 >= palavras.length ? 'Ver resultado' : 'Próxima ›'}</button></div>}
  </div>;
}

const PLANO_JOGOS = {
  memoria: { jogo: 'memoria', sub: 'Memória', render: (d, fim) => <PlanoJogoMemoria pares={d.memoria} onFim={fim} /> },
  relampago: { sub: 'Relâmpago', render: (d, fim) => <PlanoJogoRelampago perguntas={d.relampago} onFim={fim} /> },
  montar: { sub: 'Montar a frase', render: (d, fim) => <PlanoJogoMontar frases={d.montar} onFim={fim} /> },
  forca: { sub: 'Forca', render: (d, fim) => <PlanoJogoForca palavras={d.forca} onFim={fim} /> },
};
function PlanoTarefaJogo({ t, unidade, onFeita, onClose, onAsk }) {
  const g = PLANO_JOGOS[t.formato];
  return (
    <PlanoCamada titulo={t.titulo} sub={g ? g.sub : ''} onClose={onClose} onAsk={onAsk}>
      {g ? g.render(t.jogo ? { ...(unidade.jogos || {}), [t.formato]: t.jogo } : unidade.jogos, onFeita) : <div style={{ fontWeight: 700 }}>Este jogo ainda não está disponível.</div>}
    </PlanoCamada>
  );
}

/* ───────── vídeo (YouTube não listado ou link) ───────── */
// Aceita o ID ou qualquer link do YouTube (watch?v=, youtu.be/, /embed/, /shorts/, /live/).
function PlanoYoutubeId(v) {
  const s = String(v || '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : '';
}
// A API do player do YouTube é carregada uma vez só; ela deixa o app saber quando o vídeo terminou.
let PLANO_YT_PROMESSA = null;
function PlanoCarregarYT() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (PLANO_YT_PROMESSA) return PLANO_YT_PROMESSA;
  PLANO_YT_PROMESSA = new Promise((resolve, reject) => {
    const antes = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (typeof antes === 'function') antes(); resolve(window.YT); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
    s.onerror = () => { PLANO_YT_PROMESSA = null; reject(new Error('yt')); };
    document.head.appendChild(s);
  });
  return PLANO_YT_PROMESSA;
}

// O vídeo toca DENTRO do app (YouTube "não listado" incorporado, sem abrir o YouTube). Campos da tarefa:
//   youtube: link ou ID · inicio / fim (segundos, opcionais, para fatiar um vídeo longo em várias tarefas) · url: link externo.
function PlanoTarefaVideo({ t, onFeita, onClose, onAsk }) {
  const id = PlanoYoutubeId(t.youtube || t.youtubeId); const url = t.url;
  const caixa = React.useRef(null);
  const [terminou, setTerminou] = React.useState(false); const [semApi, setSemApi] = React.useState(false);
  React.useEffect(() => {
    if (!id || !caixa.current) return undefined;
    let player = null; let vivo = true;
    PlanoCarregarYT().then(YT => {
      if (!vivo || !caixa.current) return;
      const alvo = document.createElement('div'); caixa.current.appendChild(alvo);
      player = new YT.Player(alvo, {
        videoId: id, width: '100%', height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, fs: 1, hl: 'pt-BR', start: t.inicio || 0, ...(t.fim ? { end: t.fim } : {}) },
        events: { onStateChange: e => { if (e.data === 0 && vivo) setTerminou(true); } },
      });
    }).catch(() => { if (vivo) setSemApi(true); });   // sem a API o vídeo ainda toca (iframe simples), só não detecta o fim
    return () => { vivo = false; try { if (player && player.destroy) player.destroy(); } catch (e) {} };
  }, [id, t.inicio, t.fim]);
  const moldura = { position: 'relative', paddingTop: '56.25%', borderRadius: 18, overflow: 'hidden', background: '#0F172A', boxShadow: '0 12px 30px rgba(15,23,42,.2)' };
  return (
    <PlanoCamada titulo={t.titulo} sub={t.sub} onClose={onClose} onAsk={onAsk}
      rodape={<button className="plano-btn" onClick={onFeita}>{terminou ? 'Concluir tarefa ✓' : 'Já assisti ✓'}</button>}>
      {id ? (semApi
        ? <div style={moldura}><iframe title={t.titulo} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} /></div>
        : <div style={moldura}><div ref={caixa} style={{ position: 'absolute', inset: 0 }} /></div>)
        : url ? <a href={url} target="_blank" rel="noopener noreferrer" className="plano-btn violeta" style={{ textDecoration: 'none', textAlign: 'center' }}>▶ Abrir o vídeo</a>
        : <div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>🎬 Vídeo em breve.</div>}
      {terminou && <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', fontWeight: 800, fontSize: 13.5 }}>🎉 Vídeo terminado! Toque em “Concluir tarefa”.</div>}
      {t.oQue && <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', lineHeight: 1.5, marginTop: 12 }}>{t.oQue}</div>}
    </PlanoCamada>
  );
}

/* ───────── tarefa que se faz em Atividades → Extras ───────── */
/* ───────── livro dentro do app: a página como imagem + exercícios próprios ───────── */
// As páginas ficam no Firebase Storage (só quem está logado lê): livros/{curso}/pdf-NNN.jpg.
const PLANO_IMG = {};
function PlanoUrlPagina(curso, pdf) {
  const caminho = `livros/${curso}/pdf-${String(pdf).padStart(3, '0')}.jpg`;
  if (!PLANO_IMG[caminho]) {
    PLANO_IMG[caminho] = (typeof getFB === 'function' ? getFB() : Promise.reject(new Error('sem firebase')))
      .then(fb => fb.getDownloadURL(fb.storageRef(fb.storage, caminho)))
      .catch(e => { delete PLANO_IMG[caminho]; throw e; });
  }
  return PLANO_IMG[caminho];
}

// A página aparece inteira (largura da tela); dois toques, pinça, roda do mouse ou +/− aproximam; arrastar anda na página.
function PlanoLeitor({ curso, pdf }) {
  const caixa = React.useRef(null); const img = React.useRef(null);
  const V = React.useRef({ s: 1, x: 0, y: 0, w: 0, h: 0, fit: 1 });
  const ptr = React.useRef(new Map()); const pinca = React.useRef(null); const toque = React.useRef({ t: 0, x: 0, y: 0, mov: 0 });
  const [url, setUrl] = React.useState(''); const [erro, setErro] = React.useState(false); const [dica, setDica] = React.useState(true);
  const aplicar = React.useCallback(() => {
    const c = caixa.current, el = img.current, v = V.current; if (!c || !el || !v.w) return;
    const vw = c.clientWidth, vh = c.clientHeight, W = v.w * v.s, H = v.h * v.s;
    v.x = W <= vw ? (vw - W) / 2 : Math.min(0, Math.max(vw - W, v.x));
    v.y = H <= vh ? (vh - H) / 2 : Math.min(0, Math.max(vh - H, v.y));
    el.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`;
  }, []);
  const ajustar = React.useCallback(() => { const c = caixa.current, v = V.current; if (!c || !v.w) return; v.fit = c.clientWidth / v.w; v.s = v.fit; v.x = 0; v.y = 0; aplicar(); }, [aplicar]);
  const zoom = React.useCallback((fator, cx, cy) => {
    const v = V.current; const novo = Math.min(v.fit * 5, Math.max(v.fit, v.s * fator)); const k = novo / v.s;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.s = novo; aplicar();
  }, [aplicar]);
  React.useEffect(() => {
    let vivo = true; setUrl(''); setErro(false);
    PlanoUrlPagina(curso, pdf).then(u => { if (vivo) setUrl(u); }).catch(() => { if (vivo) setErro(true); });
    [pdf - 1, pdf + 1].forEach(p => { if (p >= 15) PlanoUrlPagina(curso, p).catch(() => {}); });
    return () => { vivo = false; };
  }, [curso, pdf]);
  React.useEffect(() => { const t = setTimeout(() => setDica(false), 3500); return () => clearTimeout(t); }, [pdf]);
  React.useEffect(() => {
    const c = caixa.current; if (!c) return undefined;
    const roda = e => { e.preventDefault(); const r = c.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top); };
    c.addEventListener('wheel', roda, { passive: false });
    let ro = null; try { ro = new ResizeObserver(() => aplicar()); ro.observe(c); } catch (e) {}
    return () => { c.removeEventListener('wheel', roda); if (ro) ro.disconnect(); };
  }, [zoom, aplicar]);
  React.useEffect(() => { const f = () => ajustar(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, [ajustar]);
  const desce = e => {
    if (e.target.closest && e.target.closest('[data-zoomctl]')) return;
    try { caixa.current.setPointerCapture(e.pointerId); } catch (x) {}
    ptr.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); pinca.current = null; toque.current.mov = 0;
  };
  const mexe = e => {
    if (!ptr.current.has(e.pointerId)) return;
    const ant = ptr.current.get(e.pointerId); const cur = { x: e.clientX, y: e.clientY };
    if (ptr.current.size === 1) { const v = V.current; v.x += cur.x - ant.x; v.y += cur.y - ant.y; toque.current.mov += Math.abs(cur.x - ant.x) + Math.abs(cur.y - ant.y); ptr.current.set(e.pointerId, cur); aplicar(); }
    else if (ptr.current.size === 2) {
      ptr.current.set(e.pointerId, cur); const [a, b] = [...ptr.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = caixa.current.getBoundingClientRect();
      if (pinca.current) zoom(d / pinca.current, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      pinca.current = d; toque.current.mov += 99;
    }
  };
  const sobe = e => {
    const eraUm = ptr.current.size === 1; ptr.current.delete(e.pointerId); pinca.current = null;
    if (eraUm && toque.current.mov < 8) {   // dois toques seguidos: aproxima ou volta
      const agora = Date.now(); const r = caixa.current.getBoundingClientRect(); const t = toque.current;
      if (agora - t.t < 320 && Math.hypot(e.clientX - t.x, e.clientY - t.y) < 30) { const v = V.current; if (v.s > v.fit * 1.2) ajustar(); else zoom(2.4, e.clientX - r.left, e.clientY - r.top); t.t = 0; }
      else { t.t = agora; t.x = e.clientX; t.y = e.clientY; }
    }
  };
  const meio = () => { const c = caixa.current; return c ? [c.clientWidth / 2, c.clientHeight / 2] : [0, 0]; };
  const bt = { width: 38, height: 38, borderRadius: 12, border: 0, background: 'rgba(255,255,255,.95)', boxShadow: '0 3px 10px rgba(0,0,0,.28)', fontWeight: 800, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer', color: '#0F172A' };
  return (
    <div ref={caixa} onPointerDown={desce} onPointerMove={mexe} onPointerUp={sobe} onPointerCancel={sobe}
      style={{ position: 'relative', flex: 1, minHeight: 90, overflow: 'hidden', background: '#3B3F4A', touchAction: 'none', cursor: 'grab' }}>
      {url && <img ref={img} src={url} alt="Página do livro" draggable="false" onLoad={e => { V.current.w = e.target.naturalWidth; V.current.h = e.target.naturalHeight; e.target.style.width = V.current.w + 'px'; e.target.style.height = V.current.h + 'px'; ajustar(); }}
        style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', userSelect: 'none', WebkitUserDrag: 'none', maxWidth: 'none', willChange: 'transform' }} />}
      {!url && !erro && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#CBD5E1', fontWeight: 800, fontSize: 14 }}>Abrindo a página…</div>}
      {erro && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#FECACA', fontWeight: 800, fontSize: 14, textAlign: 'center', padding: 24 }}>Não consegui abrir a página agora. Confira a internet e tente de novo.</div>}
      <div data-zoomctl="1" style={{ position: 'absolute', right: 8, top: 8, display: 'flex', flexDirection: 'column', gap: 6, zIndex: 2 }}>
        <button style={bt} aria-label="Aproximar" onClick={() => { const [x, y] = meio(); zoom(1.4, x, y); }}>＋</button>
        <button style={bt} aria-label="Afastar" onClick={() => { const [x, y] = meio(); zoom(1 / 1.4, x, y); }}>−</button>
        <button style={bt} aria-label="Ajustar à tela" onClick={ajustar}>⤢</button>
      </div>
      <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(15,23,42,.78)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '5px 10px', borderRadius: 99, pointerEvents: 'none', opacity: dica && url ? 1 : 0, transition: 'opacity .5s' }}>Pince ou dê 2 toques para ampliar</div>
    </div>
  );
}

const PLANO_ROTULO_EX = { mc: 'Escolher', vf: 'Verdadeiro ou falso', gap: 'Digitar', match: 'Ligar', order: 'Montar a frase', ouvir: 'Ouvir e escolher', ditado: 'Ouvir e escrever', speak: 'Falar' };

// Um exercício por vez. Avisa o resultado uma única vez (onFim) e mostra a correção.
function PlanoExercicio({ ex, onFim }) {
  const [fim, setFim] = React.useState(null); const [sel, setSel] = React.useState(null); const [txt, setTxt] = React.useState('');
  const [montada, setMontada] = React.useState([]); const [ligados, setLigados] = React.useState({}); const [selE, setSelE] = React.useState(null);
  const [erros, setErros] = React.useState(0); const [piscar, setPiscar] = React.useState(null);
  const banco = React.useMemo(() => ex.t === 'order' ? PlanoEmbaralhar(ex.w.map((w, k) => ({ w, k }))) : [], [ex]);
  const dir = React.useMemo(() => ex.pares ? PlanoEmbaralhar(ex.pares.map((p, k) => ({ x: p[1], k }))) : [], [ex]);
  const certaTxt = ex.t === 'mc' || ex.t === 'ouvir' ? ex.o[ex.c] : ex.t === 'vf' ? (ex.c ? 'Verdadeiro' : 'Falso') : ex.t === 'order' ? ex.w.join(' ') : (ex.a || [''])[0];
  const fechar = (ok, extra) => { if (fim) return; setFim({ ok, extra }); onFim(ok); };
  const confere = valor => fechar((ex.a || []).map(PlanoNormResp).includes(PlanoNormResp(valor)));
  const opcoes = (ex.t === 'mc' || ex.t === 'ouvir') && ex.o.map((o, k) => <button key={k} disabled={!!fim} onClick={() => { setSel(k); fechar(k === ex.c); }} className={`plano-opt ${fim ? (k === ex.c ? 'ok' : k === sel ? 'no' : '') : ''}`}>{o}</button>);
  const caixaTxt = (ex.t === 'gap' || ex.t === 'ditado') && <div style={{ marginTop: 10 }}>
    <input value={txt} disabled={!!fim} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && txt.trim()) confere(txt); }} placeholder={ex.t === 'ditado' ? 'Escreva o que você ouviu' : 'Digite a resposta'} autoCapitalize="none" autoCorrect="off" spellCheck="false"
      style={{ width: '100%', border: `2px solid ${!fim ? '#CBD5E1' : fim.ok ? '#22C55E' : '#F87171'}`, borderRadius: 14, padding: '12px 14px', fontSize: 16, fontWeight: 700, fontFamily: 'inherit', outline: 'none', background: !fim ? '#fff' : fim.ok ? '#F0FDF4' : '#FEF2F2' }} />
    {!fim && <button className="plano-btn" style={{ marginTop: 9 }} disabled={!txt.trim()} onClick={() => confere(txt)}>Conferir</button>}
  </div>;
  const ordem = ex.t === 'order' && <div style={{ marginTop: 8 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, minHeight: 46, padding: 8, borderRadius: 12, border: '1.5px dashed #CBD5E1', marginBottom: 9 }}>
      {montada.map(c => <button key={c.k} disabled={!!fim} onClick={() => setMontada(m => m.filter(x => x !== c))} style={{ padding: '7px 11px', borderRadius: 10, background: '#F5F3FF', border: '1.5px solid #DDD6FE', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{c.w}</button>)}
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
      {banco.filter(c => !montada.includes(c)).map(c => <button key={c.k} disabled={!!fim} onClick={() => setMontada(m => [...m, c])} style={{ padding: '7px 11px', borderRadius: 10, background: '#fff', border: '1.5px solid #CBD5E1', fontWeight: 800, fontSize: 14, fontFamily: 'inherit', cursor: 'pointer' }}>{c.w}</button>)}
    </div>
    {!fim && <button className="plano-btn" style={{ marginTop: 10 }} disabled={montada.length !== ex.w.length} onClick={() => fechar(PlanoNormResp(montada.map(c => c.w).join(' ')) === PlanoNormResp(ex.w.join(' ')))}>Conferir</button>}
  </div>;
  const ligar = ex.t === 'match' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
    <div>{ex.pares.map((p, k) => <button key={k} disabled={!!ligados[k]} onClick={() => setSelE(k)} className={`plano-opt ${ligados[k] ? 'ok' : selE === k ? '' : ''}`} style={selE === k && !ligados[k] ? { borderColor: '#7C3AED', background: '#F5F3FF' } : undefined}>{p[0]}</button>)}</div>
    <div>{dir.map(c => <button key={c.k} disabled={!!ligados[c.k]} onClick={() => {
      if (selE === null) return;
      if (selE === c.k) { const nl = { ...ligados, [c.k]: true }; setLigados(nl); setSelE(null); if (Object.keys(nl).length === ex.pares.length) fechar(erros === 0, erros ? `Você errou ${erros} ligação(ões), mas completou.` : 'Todas ligadas de primeira.'); }
      else { setErros(n => n + 1); setPiscar(c.k); setTimeout(() => setPiscar(null), 450); }
    }} className={`plano-opt ${ligados[c.k] ? 'ok' : piscar === c.k ? 'no' : ''}`}>{c.x}</button>)}</div>
  </div>;
  const fala = ex.t === 'speak' && <div style={{ marginTop: 6 }}>
    {ex.dica && <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', lineHeight: 1.45, marginBottom: 10 }}>{ex.dica}</div>}
    {!fim && <button className="plano-btn violeta" onClick={() => fechar(true)}>🎤 Já falei em voz alta ✓</button>}
  </div>;
  return (
    <div>
      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: .6, textTransform: 'uppercase', color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '2px 9px', borderRadius: 99, marginBottom: 7 }}>{PLANO_ROTULO_EX[ex.t] || 'Exercício'}</div>
      <div style={{ fontSize: 15.5, fontWeight: 800, lineHeight: 1.4, marginBottom: 6 }}>{ex.q}</div>
      {(ex.t === 'ouvir' || ex.t === 'ditado') && <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <button className="plano-btn sec" style={{ width: 'auto', padding: '9px 14px', fontSize: 14 }} onClick={() => PlanoFalar(ex.fala)}>🔊 Ouvir</button>
        <button className="plano-btn sec" style={{ width: 'auto', padding: '9px 14px', fontSize: 14 }} onClick={() => PlanoFalar(ex.fala, .6)}>🐢 Devagar</button>
      </div>}
      {ex.t === 'vf' && <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 7 }}>{[[true, 'Verdadeiro'], [false, 'Falso']].map(([v, l]) => <button key={l} disabled={!!fim} onClick={() => { setSel(v); fechar(v === ex.c); }} className={`plano-opt ${fim ? (v === ex.c ? 'ok' : v === sel ? 'no' : '') : ''}`} style={{ textAlign: 'center', marginTop: 0 }}>{l}</button>)}</div>}
      {opcoes}{caixaTxt}{ordem}{ligar}{fala}
      {fim && ex.t !== 'speak' && ex.t !== 'match' && <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, background: fim.ok ? '#F0FDF4' : '#FEF2F2', color: fim.ok ? '#14532D' : '#7F1D1D', border: `1px solid ${fim.ok ? '#BBF7D0' : '#FECACA'}` }}>
        {fim.ok ? '✔ Isso!' : `✘ A resposta certa é: ${certaTxt}`}{ex.exp ? <div style={{ fontWeight: 600, marginTop: 3 }}>{ex.exp}</div> : null}</div>}
      {fim && ex.t === 'match' && <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, background: fim.ok ? '#F0FDF4' : '#FFFBEB', color: fim.ok ? '#14532D' : '#78350F', border: `1px solid ${fim.ok ? '#BBF7D0' : '#FDE68A'}` }}>{fim.ok ? '✔ ' : ''}{fim.extra}</div>}
    </div>
  );
}

// Tarefa "Livro": a página do livro em cima, os exercícios dela numa gaveta embaixo.
function PlanoTarefaPagina({ t, cursoId, onFeita, onClose, onAsk }) {
  const exs = t.exercicios || []; const total = exs.length;
  const [pdf, setPdf] = React.useState(t.pdf); const [i, setI] = React.useState(0); const [res, setRes] = React.useState([]);
  const [aberta, setAberta] = React.useState(false); const [respondeu, setRespondeu] = React.useState(false);
  const acabou = total > 0 && i >= total; const acertos = res.filter(r => r === true).length;
  const respondidos = res.filter(r => r !== undefined).length;
  const onFim = ok => { setRes(r => { const n = [...r]; if (n[i] === undefined) n[i] = ok; return n; }); setRespondeu(true); };
  const pagina = pdf - 14; const btn = { width: 34, height: 34, borderRadius: 10, border: 0, background: '#F5F3FF', color: '#5B21B6', fontWeight: 800, fontSize: 18, fontFamily: 'inherit', cursor: 'pointer' };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(15,23,42,.4)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, height: '100%', background: '#F6F1EA', display: 'flex', flexDirection: 'column', animation: 'planoSurge .22s' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid rgba(var(--brand-rgb),.12)', padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={onClose} aria-label="Fechar" style={{ width: 36, height: 36, borderRadius: 12, border: 0, background: '#F1F5F9', fontSize: 18, fontWeight: 800, color: '#475569', cursor: 'pointer' }}>✕</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: '#64748B' }}>Connectivity 1 · página {pagina}</div>
          </div>
          <button style={btn} aria-label="Página anterior" disabled={pdf <= 15} onClick={() => setPdf(p => p - 1)}>‹</button>
          <button style={btn} aria-label="Próxima página" disabled={pdf >= 177} onClick={() => setPdf(p => p + 1)}>›</button>
          {onAsk && <button onClick={onAsk} aria-label="EurekIA" style={{ ...btn, width: 'auto', padding: '0 9px', fontSize: 15 }}>💡</button>}
        </div>
        <PlanoLeitor curso={cursoId} pdf={pdf} />
        {total === 0
          ? <div style={{ padding: '10px 14px calc(12px + env(safe-area-inset-bottom, 0px))', background: '#fff', borderTop: '1px solid rgba(var(--brand-rgb),.12)', flexShrink: 0 }}>
            <button className="plano-btn violeta" onClick={onFeita}>Já li a página ✓</button></div>
          : <div style={{ background: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, boxShadow: '0 -8px 24px rgba(15,23,42,.18)', flexShrink: 0, display: 'flex', flexDirection: 'column', height: aberta ? '54%' : 'auto', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <button onClick={() => setAberta(a => !a)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', border: 0, background: 'none', padding: '11px 14px 10px', fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left', flexShrink: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, flex: 1 }}>✏️ Exercícios desta página</span>
              <span style={{ fontSize: 11.5, fontWeight: 800, color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE', padding: '3px 10px', borderRadius: 99 }}>{respondidos}/{total}</span>
              <span style={{ fontSize: 12, color: '#64748B' }}>{aberta ? '▼' : '▲'}</span>
            </button>
            {aberta && <div style={{ flex: 1, overflowY: 'auto', padding: '2px 14px 16px' }}>
              {acabou
                ? <div style={{ textAlign: 'center', padding: '8px 4px' }}>
                  <div style={{ fontSize: 46 }}>🎉</div>
                  <div style={{ fontSize: 19, fontWeight: 800, margin: '2px 0' }}>{acertos} de {total} certas</div>
                  <div style={{ color: '#64748B', fontWeight: 700, fontSize: 13, margin: '0 0 12px' }}>Você pode rever a página antes de concluir.</div>
                  <button className="plano-btn" onClick={onFeita}>Concluir tarefa ✓</button>
                  <button className="plano-btn sec" style={{ marginTop: 8 }} onClick={() => { setI(0); setRes([]); setRespondeu(false); }}>Refazer os exercícios</button>
                </div>
                : <>
                  <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>{exs.map((e, k) => <div key={e.id || k} style={{ flex: 1, height: 5, borderRadius: 9, background: k < i ? '#22C55E' : k === i ? '#7C3AED' : '#E2E8F0' }} />)}</div>
                  <PlanoExercicio key={exs[i].id || i} ex={exs[i]} onFim={onFim} />
                  {respondeu && <button className="plano-btn" style={{ marginTop: 12 }} onClick={() => { setI(i + 1); setRespondeu(false); }}>{i + 1 >= total ? 'Ver resultado' : 'Continuar ›'}</button>}
                </>}
            </div>}
          </div>}
      </div>
    </div>
  );
}

function PlanoTarefaExtra({ t, unidade, onAbrirExtras, onFeita, onClose, onAsk }) {
  return (
    <PlanoCamada titulo={t.titulo} sub={t.sub} onClose={onClose} onAsk={onAsk}
      rodape={<button className="plano-btn" onClick={onFeita}>Já fiz ✓</button>}>
      {t.pagina && <PlanoCartaoLivro t={{ ...t, oQue: '' }} unidade={unidade} />}
      <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 18, padding: 15, fontSize: 14.5, fontWeight: 700, color: '#334155', lineHeight: 1.55 }}>{t.oQue}</div>
      <button className="plano-btn violeta" style={{ marginTop: 14 }} onClick={onAbrirExtras}>🎧 Abrir os Extras</button>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>Em Atividades, toque na aba “Extras”.</div>
    </PlanoCamada>
  );
}

/* ───────── mini-teste + "Agora eu consigo" + selo ───────── */
function PlanoTarefaTeste({ t, unidade, onFeita, onClose, onAsk }) {
  const [fase, setFase] = React.useState('perguntas'); const [marcas, setMarcas] = React.useState({});
  const perguntas = t.perguntas || unidade.perguntas[t.ref]; const minimo = t.perguntas ? Math.ceil(perguntas.length * 0.7) : 7;
  return (
    <PlanoCamada titulo={t.titulo} sub={fase === 'perguntas' ? `Acerte ${minimo} ou mais para ganhar o selo` : 'Agora eu consigo…'} onClose={onClose} onAsk={onAsk}>
      {fase === 'perguntas'
        ? <PlanoPerguntas perguntas={perguntas} minimo={minimo} rotuloFim="Continuar ›" onFim={() => setFase('selo')} />
        : <div>
          <div style={{ textAlign: 'center', padding: '6px 0 16px' }}><div style={{ fontSize: 64 }}>🏅</div><div style={{ fontSize: 22, fontWeight: 800 }}>Selo da Unit {unidade.numero || 4}!</div><div style={{ color: '#64748B', fontWeight: 700, fontSize: 13.5 }}>Marque o que você já consegue fazer:</div></div>
          {unidade.agoraPosso.map(a => <button key={a} onClick={() => setMarcas(m => ({ ...m, [a]: !m[a] }))} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, textAlign: 'left', background: marcas[a] ? '#F0FDF4' : '#fff', border: `1.5px solid ${marcas[a] ? '#22C55E' : '#E2E8F0'}`, borderRadius: 14, padding: '12px 14px', marginBottom: 8, fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: marcas[a] ? '#22C55E' : '#fff', border: `2px solid ${marcas[a] ? '#22C55E' : '#CBD5E1'}`, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, flexShrink: 0 }}>{marcas[a] ? '✓' : ''}</span>{a}</button>)}
          <button className="plano-btn" style={{ marginTop: 10 }} onClick={onFeita}>Concluir a unidade ✓</button>
        </div>}
    </PlanoCamada>
  );
}

/* ───────── aula, dúvida (IA + WhatsApp) e boas-vindas ───────── */
function PlanoAulaFolha({ aula, student, cfg, onClose }) {
  const feita = aula.feita; const zoom = student && student.zoomLink;
  return (
    <PlanoFolha onClose={onClose}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: feita ? '#15803D' : '#1E40AF' }}>{feita ? 'AULA FEITA' : 'PRÓXIMA AULA'}</div>
      <div style={{ fontSize: 22, fontWeight: 800, margin: '2px 0' }}>{aula.rotulo}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B' }}>{PlanoDataCurta(aula.data)}{aula.hora ? ` às ${aula.hora}` : ''}{!feita ? ` · ${PlanoEmDias(aula.data)}` : ''}</div>
      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '11px 13px', margin: '14px 0', fontSize: 13.5, fontWeight: 700, color: '#1E3A8A', lineHeight: 1.5 }}>
        {feita ? 'Essa aula liberou as tarefas do seu caminho. Faça no seu ritmo até a próxima.' : 'Na aula de 1 hora o César revisa o seu caminho, tira dúvidas e libera as tarefas do próximo mês.'}
      </div>
      {!feita && zoom && <a href={zoom} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', marginBottom: 10, background: 'linear-gradient(180deg,#3B82F6,#1E40AF)', boxShadow: '0 8px 20px rgba(30,64,175,.28)' }}>📹 Entrar na aula (Zoom)</a>}
      <a href={PlanoWhatsLink(student, `Oi, César! Aqui é ${student.firstName || student.name || 'sua aluna'} (${cfg.nome}). Sobre a ${aula.rotulo.toLowerCase()} de ${PlanoDataCurta(aula.data)}: `)} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', background: '#25D366', boxShadow: 'none', marginBottom: 10 }}>💬 Falar com o César no WhatsApp</a>
      <button className="plano-btn sec" onClick={onClose}>Fechar</button>
    </PlanoFolha>
  );
}

// A EurekIA: a cientista que tira as dúvidas de inglês (jaleco, óculos redondos e a lâmpada do "eureka!").
function EurekiaAvatar({ size = 54 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ display: 'block' }}>
      <circle cx="32" cy="32" r="32" fill="#6D28D9" />
      <path d="M13 64 Q14 49 32 47 Q50 49 51 64 Z" fill="#fff" />
      <path d="M32 47 L32 64" stroke="#C4B5FD" strokeWidth="1.5" />
      <circle cx="32" cy="34" r="15" fill="#FDE2C8" />
      <path d="M16 31 Q16 15 32 14 Q48 15 48 31 Q41 23 32 23 Q23 23 16 31 Z" fill="#E5E7EB" />
      <circle cx="26" cy="36" r="6" fill="#fff" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="38" cy="36" r="6" fill="#fff" stroke="#1F2937" strokeWidth="1.8" />
      <line x1="32" y1="36" x2="32" y2="36" stroke="#1F2937" strokeWidth="1.8" />
      <circle cx="26" cy="37" r="2" fill="#1F2937" /><circle cx="38" cy="37" r="2" fill="#1F2937" />
      <path d="M27 44 Q32 49 37 44" fill="none" stroke="#9A3412" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="52" cy="13" r="7.5" fill="#FDE68A" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M49.5 20 L54.5 20" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 12 Q52 9 54 12" fill="none" stroke="#F59E0B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// A EurekIA em miniatura, para o cabeçalho das atividades (ao lado do X).
function EurekiaMini({ onClick }) {
  return <button onClick={onClick} aria-label="Perguntar à EurekIA" title="Perguntar à EurekIA" style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: '50%', background: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 8px rgba(109,40,217,.35)' }}><EurekiaAvatar size={34} /></button>;
}

// `sugestao`: pergunta já escrita no campo (a da apresentação da EurekIA, "Experimentar agora").
function PlanoPerguntar({ cfg, student, contexto, onAsk, onClose, z, sugestao }) {
  const [texto, setTexto] = React.useState(sugestao || ''); const [msgs, setMsgs] = React.useState([]); const [pensando, setPensando] = React.useState(false);
  const fimRef = React.useRef(null);
  const semIA = cfg.assistente === false;   // o professor desligou o assistente deste aluno (janela do plano no painel)
  React.useEffect(() => { if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' }); }, [msgs, pensando]);
  const enviar = async () => {
    const pergunta = texto.trim(); if (!pergunta || pensando) return;
    setMsgs(m => [...m, { de: 'eu', x: pergunta }]); setTexto(''); setPensando(true);
    try {
      let r;
      if (cfg.previa || !onAsk) { await new Promise(res => setTimeout(res, 900)); r = { resposta: 'Boa pergunta! Depois de **do/does/don’t/doesn’t** o verbo principal fica sempre na forma base: *Does she work?* (e não *Does she works?*).\n\n(Resposta de exemplo — o assistente de verdade ainda não está ligado.)' }; }
      else {
        // A conversa segue: manda a última pergunta e resposta para a IA entender um "e no passado?".
        const ultimaIA = [...msgs].reverse().find(m => m.de === 'ia' && !m.erro);
        r = await onAsk(pergunta, contexto, ultima && ultimaIA ? { pergunta: ultima.x, resposta: ultimaIA.x } : null);
      }
      // O servidor conta as perguntas do mês e a aluna não vê contador: só este aviso ao chegar no limite.
      if (r && r.limite) setMsgs(m => [...m, { de: 'ia', x: 'Suas perguntas chegaram ao limite mensal. Se precisar, fale com o César pelo WhatsApp.', erro: true }]);
      else if (r && r.foraDoAssunto) setMsgs(m => [...m, { de: 'ia', x: r.resposta }]);
      else setMsgs(m => [...m, { de: 'ia', x: r.resposta }]);
    } catch (e) { setMsgs(m => [...m, { de: 'ia', x: 'Não consegui responder agora. Pergunte direto ao César no WhatsApp, ele responde assim que puder.', erro: true }]); }
    setPensando(false);
  };
  const ultima = [...msgs].reverse().find(m => m.de === 'eu');
  const wa = PlanoWhatsLink(student, `Oi, César! Aqui é ${student.firstName || student.name || 'sua aluna'} (${cfg.nome}). ${contexto ? `Estou na tarefa “${contexto}”. ` : ''}${ultima ? `Minha dúvida: ${ultima.x}` : 'Tenho uma dúvida: '}`);
  return (
    <PlanoFolha onClose={onClose} z={z}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><EurekiaAvatar size={40} /><div><div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>EurekIA</div><div style={{ fontSize: 11.5, fontWeight: 700, color: '#6D28D9' }}>Tem uma dúvida de inglês?</div></div></div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', margin: '2px 0 12px' }}>{contexto ? `Sobre: ${contexto}` : 'Pergunte sobre o que está estudando em inglês.'}</div>
      {semIA ? <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14, margin: '0 0 12px', fontSize: 13.5, fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>Para tirar dúvidas, fale direto com o César pelo WhatsApp. Ele responde assim que puder.</div> : <>
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 10, minHeight: 110, maxHeight: 280, overflowY: 'auto' }}>
        {msgs.length === 0 && sugestao && <div style={{ fontSize: 13, fontWeight: 700, color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '9px 11px', margin: '0 0 8px', lineHeight: 1.45 }}>💡 Que tal começar por aqui? A pergunta já está escrita: toque em <b>Enviar</b> e veja o que a EurekIA sabe sobre os seus estudos.</div>}
        {msgs.length === 0 && <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', padding: 6 }}>Escreva a sua dúvida de inglês abaixo. O assistente olha as suas últimas aulas e atividades para explicar, em português, com exemplos em inglês. Se precisar do César, toque em WhatsApp.</div>}
        {msgs.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start', margin: '6px 0' }}><div style={{ maxWidth: '86%', padding: '9px 12px', borderRadius: 14, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.de === 'eu' ? '#7C3AED' : m.erro ? '#FEF2F2' : '#fff', color: m.de === 'eu' ? '#fff' : '#0F172A', border: m.de === 'eu' ? 0 : '1px solid #E2E8F0' }}>{m.de === 'ia' ? <PlanoMd x={m.x} /> : m.x}</div></div>)}
        {pensando && <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', padding: 6 }}>A EurekIA está pensando…</div>}
        <div ref={fimRef} />
      </div>
      <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
        <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar(); }} placeholder="Digite sua dúvida…" style={{ flex: 1, border: '1.5px solid #CBD5E1', borderRadius: 14, padding: '12px 13px', fontSize: 14.5, fontFamily: 'inherit', fontWeight: 600, outline: 'none' }} />
        <button onClick={enviar} disabled={!texto.trim() || pensando} style={{ border: 0, borderRadius: 14, padding: '0 16px', background: PLANO_COR, color: '#fff', fontWeight: 800, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', opacity: !texto.trim() || pensando ? .5 : 1 }}>Enviar</button>
      </div>
      </>}
      <a href={wa} target="_blank" rel="noopener noreferrer" className="plano-btn" style={{ textDecoration: 'none', textAlign: 'center', background: '#25D366', boxShadow: 'none' }}>💬 Falar com o César no WhatsApp</a>
      {!semIA && <div style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textAlign: 'center', marginTop: 8 }}>O assistente é uma ajuda automática e pode errar. Na dúvida, fale com o César.</div>}
    </PlanoFolha>
  );
}

function PlanoBoasVindas({ cfg, nome, onFim }) {
  const [s, setS] = React.useState(0);
  const slides = [
    <><div style={{ fontSize: 60 }}>🎉</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>{nome}, seu plano mudou!</h2><p>Agora você estuda no <b>{cfg.nome}</b>: um caminho em ordem, com o livro <b>{cfg.curso}</b>, jogos, atividades e a sua aula de 1 hora por mês com o professor César.</p><p>Suas aulas e pós-aulas <b>continuam com você</b> — agora ligados ao que você estuda.</p></>,
    <><div style={{ fontSize: 60 }}>🛤️</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>Como o caminho funciona</h2>
      {[['1', <>A <b>aula do mês</b> libera as tarefas do mês, em 4 semanas.</>], ['2', <>Muitas tarefas vêm do <b>seu livro</b>: você faz o exercício no livro e responde aqui.</>], ['3', <>Tem estudo, vocabulário, jogos e extras para fixar. Corrige na hora.</>], ['4', <>Ficou com dúvida? Toque em <b>💬</b> para perguntar ou falar com o César.</>]].map(([n, t]) => <div key={n} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'rgba(255,255,255,.12)', borderRadius: 16, padding: '11px 13px', marginBottom: 9, fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}><span style={{ width: 28, height: 28, borderRadius: '50%', background: '#DDD6FE', color: '#4C1D95', display: 'grid', placeItems: 'center', fontWeight: 800, flexShrink: 0 }}>{n}</span><span>{t}</span></div>)}</>,
    <><div style={{ fontSize: 60 }}>🧭</div><h2 style={{ fontSize: 26, margin: '8px 0 12px', lineHeight: 1.2 }}>Onde ficam as coisas</h2>
      {[['🛤️', 'Caminho', 'suas tarefas, na ordem'], ['✏️', 'Atividades', 'exercícios, correção, extras e desafio'], ['📄', 'Aulas', 'todos os seus pós-aulas'], ['👤', 'Perfil', 'seus dados e ajuda']].map(([i, t, d]) => <div key={t} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'rgba(255,255,255,.12)', borderRadius: 14, padding: '9px 12px', marginBottom: 8, fontSize: 13.5, fontWeight: 700 }}><span style={{ fontSize: 22, width: 32, textAlign: 'center' }}>{i}</span><span><b style={{ display: 'block', fontSize: 14.5 }}>{t}</b>{d}</span></div>)}</>,
  ];
  const ultimo = s === slides.length - 1;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'linear-gradient(170deg,#6D28D9,#312E81 75%)', color: '#fff', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', padding: '34px 24px calc(22px + env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>{slides[s]}</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, margin: '14px 0' }}>{slides.map((_, i) => <i key={i} style={{ width: i === s ? 22 : 8, height: 8, borderRadius: 99, background: i === s ? '#fff' : 'rgba(255,255,255,.35)', display: 'block' }} />)}</div>
        <button onClick={() => ultimo ? onFim() : setS(s + 1)} style={{ background: '#fff', color: '#4C1D95', border: 0, borderRadius: 16, padding: 14, fontWeight: 800, fontSize: 16, fontFamily: 'inherit', cursor: 'pointer' }}>{ultimo ? 'Ver meu caminho' : 'Continuar'}</button>
        {!ultimo && <div onClick={onFim} style={{ textAlign: 'center', marginTop: 10, fontSize: 12.5, fontWeight: 700, color: 'rgba(255,255,255,.7)', cursor: 'pointer' }}>Pular</div>}
      </div>
    </div>
  );
}

/* ───────── lista de aulas (pós-aulas) ───────── */
function PlanoAulasLista({ posaulas, onOpenPost }) {
  return (
    <div className="scroll-area" style={{ padding: '14px 16px 24px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', margin: '0 2px 12px' }}>Todas as suas aulas continuam aqui. Dentro de cada tarefa o app também indica onde o assunto foi explicado.</div>
      {posaulas.length === 0 && <div style={{ background: '#fff', borderRadius: 18, padding: 28, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>Nenhum pós-aula ainda.</div>}
      {posaulas.map(p => (
        <div key={p.id} onClick={() => onOpenPost(p)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 14, padding: '11px 14px', marginBottom: 8, cursor: 'pointer' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(var(--brand-rgb),.1)', display: 'grid', placeItems: 'center', fontSize: 15, flexShrink: 0 }}>📄</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.3, color: '#0F172A', overflowWrap: 'anywhere' }}>{PlanoTituloAula(p)}</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 1, color: p.readAt ? 'var(--brand)' : '#D97706' }}>{p.readAt ? '✓ Lido' : 'Não lido'}</div>
          </div>
        </div>))}
    </div>
  );
}

/* ───────── o conteúdo do plano (troca o miolo do app) ───────── */
function PlanoConteudoBase({ tab, onTab, cfg, student, posaulas, activities, slots, onOpenPost, onAsk }) {
  const uid = student.uid || 'x';
  const [feitas, marcar, zerar] = usePlanoFeitas(uid, !cfg.previa);
  const chaveBV = `plano-boasvindas-v1-${uid}`;
  const [bv, setBv] = React.useState(() => { try { return !localStorage.getItem(chaveBV); } catch (e) { return false; } });
  const [tarefa, setTarefa] = React.useState(null);
  const [aula, setAula] = React.useState(null);
  const [duvida, setDuvida] = React.useState(null);
  const [aviso, setAviso] = React.useState('');
  const nome = student.firstName || String(student.name || '').split(' ')[0] || 'Olá';
  const ativOk = activities.length > 0 && activities.every(a => a.finalizada || a.status === 'corrected');
  const avisar = x => { setAviso(x); setTimeout(() => setAviso(''), 2200); };
  const u = cfg.unidade;

  const abrirTarefa = (t, estado) => {
    if (estado === 'trancada') { const prox = cfg.aulas.find(a => !a.feita); avisar(`🔒 Libera depois da aula${prox ? ' de ' + PlanoDataCurta(prox.data) : ''}.`); return; }
    if (t.tipo === 'atividade') { onTab('atividades'); avisar('✏️ Faça as atividades e toque em Corrigir.'); return; }
    setTarefa(t);
  };
  const concluir = (id, extra) => { marcar(id); if (extra) marcar(extra); setTarefa(null); avisar(extra ? '🏅 Selo conquistado!' : '✅ Tarefa concluída!'); };
  const fechar = () => setTarefa(null);
  const perguntar = () => setDuvida({ contexto: tarefa ? tarefa.titulo : '' });
  const f = () => concluir(tarefa.id);

  return (
    <>
      <style>{PLANO_CSS}</style>
      {tab === 'caminho' && <PlanoCaminho cfg={cfg} feitas={feitas} ativOk={ativOk} onTarefa={abrirTarefa} onAula={setAula} onComoFunciona={() => setBv(true)} />}
      {tab === 'atividades' && slots.atividades}
      {tab === 'aulas' && <PlanoAulasLista posaulas={posaulas} onOpenPost={onOpenPost} />}
      {tab === 'perfil' && <>
        {slots.perfil}
        {cfg.previa && <div style={{ padding: '0 16px 20px' }}><button className="plano-btn sec" onClick={() => { zerar(); try { localStorage.removeItem(chaveBV); } catch (e) {} setBv(true); }}>↺ Reiniciar a prévia do plano</button></div>}
      </>}

      {!tarefa && !aula && !duvida && tab !== 'perfil' &&
        <button onClick={() => setDuvida({ contexto: '' })} aria-label="Perguntar à EurekIA" style={{ position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', right: 'max(16px, calc(50vw - 224px))', zIndex: 300, width: 54, height: 54, borderRadius: '50%', border: 0, padding: 0, background: 'none', boxShadow: '0 10px 24px rgba(109,40,217,.4)', cursor: 'pointer' }}><EurekiaAvatar size={54} /></button>}

      {tarefa && tarefa.tipo === 'livro' && (tarefa.pdf
        ? <PlanoTarefaPagina t={tarefa} cursoId={cfg.cursoId} onFeita={f} onClose={fechar} onAsk={perguntar} />
        : <PlanoTarefaLivro t={tarefa} unidade={u} onFeita={f} onClose={fechar} onAsk={perguntar} />)}
      {tarefa && tarefa.tipo === 'revisao' && <PlanoCamada titulo={tarefa.titulo} sub={tarefa.sub} onClose={fechar}><div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>📝 Esta revisão ainda está sendo montada.</div></PlanoCamada>}
      {tarefa && tarefa.tipo === 'posaula' && <PlanoTarefaPosaula t={tarefa} unidade={u} posaulas={posaulas} onOpenPost={onOpenPost} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'estudo' && <PlanoEstudo estudo={u.estudos[tarefa.ref]} unidade={u} posaulas={posaulas} onOpenPost={onOpenPost} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'vocab' && <PlanoVocab vocab={u.vocab[tarefa.ref]} titulo={tarefa.titulo} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'jogo' && <PlanoTarefaJogo t={tarefa} unidade={u} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'video' && <PlanoTarefaVideo t={tarefa} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'extra' && <PlanoTarefaExtra t={tarefa} unidade={u} onAbrirExtras={() => { fechar(); onTab('atividades'); }} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'teste' && <PlanoTarefaTeste t={tarefa} unidade={u} onFeita={() => concluir(tarefa.id, 'selo:' + u.id)} onClose={fechar} onAsk={perguntar} />}
      {aula && <PlanoAulaFolha aula={aula} student={student} cfg={cfg} onClose={() => setAula(null)} />}
      {duvida && <PlanoPerguntar cfg={cfg} student={student} contexto={duvida.contexto} onAsk={cfg.previa ? null : onAsk} onClose={() => setDuvida(null)} />}
      {bv && <PlanoBoasVindas cfg={cfg} nome={nome} onFim={() => { try { localStorage.setItem(chaveBV, '1'); } catch (e) {} setBv(false); }} />}
      {aviso && <div style={{ position: 'fixed', left: '50%', bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 700, whiteSpace: 'nowrap', animation: 'planoSurge .2s' }}>{aviso}</div>}
    </>
  );
}

/* ───────── o curso (livro no app): carrega a unidade do Firestore e monta o Caminho ───────── */
const PLANO_CURSO_CACHE = {};
function PlanoCarregarDoc(chave, caminho) {
  if (!PLANO_CURSO_CACHE[chave]) {
    PLANO_CURSO_CACHE[chave] = (typeof getFB === 'function' ? getFB() : Promise.reject(new Error('sem firebase')))
      .then(fb => fb.getDoc(fb.doc(fb.db, ...caminho)))
      .then(s => (s.exists() ? s.data() : null))
      .catch(e => { delete PLANO_CURSO_CACHE[chave]; throw e; });
  }
  return PLANO_CURSO_CACHE[chave];
}
function PlanoNumUnidade(id) { return parseInt(String(id || '').replace(/\D/g, ''), 10) || 0; }

// Transforma a unidade do curso no mesmo formato de cfg que o Caminho já entende.
// `ocultos` guarda o que o César desligou no painel (tarefas ou exercícios soltos).
function PlanoCfgDoCurso(cfg, indice, un, ref, setSel) {
  const oc = new Set(un.ocultos || []);
  // O Firestore guarda pares como {a, b} (não aceita lista dentro de lista); o resto do app usa [a, b].
  const par = p => (Array.isArray(p) ? p : [p.a, p.b]);
  const exercicio = e => (e.t === 'match' ? { ...e, pares: (e.pares || []).map(par) } : e);
  const tarefas = (un.tarefas || []).filter(t => !oc.has(t.id))
    .map(t => {
      const n = t.exercicios ? { ...t, exercicios: t.exercicios.filter(e => !oc.has(e.id)).map(exercicio) } : { ...t };
      if (t.tipo === 'jogo' && t.formato === 'memoria' && t.jogo) n.jogo = t.jogo.map(par);
      return n;
    })
    .filter(t => !(t.tipo === 'teste' && !(t.perguntas && t.perguntas.length)));
  const vocab = {}; Object.keys(un.vocab || {}).forEach(k => { vocab[k] = un.vocab[k].map(par); });
  const unidade = { id: un.id, numero: un.n, titulo: un.titulo, livro: un.livro, vocab, agoraPosso: un.agoraPosso || [], jogos: {}, perguntas: {}, estudos: {}, temas: {}, semanas: [] };
  const a0 = (cfg.aulas && cfg.aulas[0] && cfg.aulas[0].id) || 'a0'; const a1 = (cfg.aulas && cfg.aulas[1] && cfg.aulas[1].id) || 'a1';
  const lista = ((indice && indice.unidades) || []).filter(u => u.pronta && u.n >= PlanoNumUnidade(ref.inicial) && u.n <= PlanoNumUnidade(ref.atual));
  const prox = ((indice && indice.unidades) || []).find(u => u.n === un.n + 1 && u.pronta);
  const pacotes = [{ aula: a0, titulo: `Unit ${un.n} · ${un.titulo}`, tarefas }];
  if (prox && un.id === ref.atual) pacotes.push({ aula: a1, futuro: true, titulo: `Unit ${prox.n} · ${prox.titulo}`, tarefas: [{ id: 'f1', ic: '📖', titulo: 'Livro' }, { id: 'f2', ic: '🔤', titulo: 'Vocabulário' }, { id: 'f3', ic: '🃏', titulo: 'Jogo' }, { id: 'f4', ic: '🏁', titulo: 'Mini-teste' }] });
  return { ...cfg, unidade, pacotes, cursoId: ref.id, unidadesLista: lista, onUnidade: setSel };
}

function PlanoConteudoCurso(props) {
  const ref = props.cfg.cursoRef;
  const [sel, setSel] = React.useState(ref.atual);
  const [dados, setDados] = React.useState(null); const [erro, setErro] = React.useState('');
  React.useEffect(() => {
    let vivo = true; setDados(null); setErro('');
    Promise.all([PlanoCarregarDoc(`${ref.id}`, ['cursos', ref.id]), PlanoCarregarDoc(`${ref.id}/${sel}`, ['cursos', ref.id, 'unidades', sel])])
      .then(([indice, un]) => { if (!vivo) return; if (!un) setErro('Esta unidade ainda não está pronta.'); else setDados({ indice, un: { ...un, id: sel } }); })
      .catch(() => { if (vivo) setErro('Não consegui carregar o conteúdo agora. Confira a internet e abra o app de novo.'); });
    return () => { vivo = false; };
  }, [ref.id, sel]);
  const cfg = React.useMemo(() => (dados ? PlanoCfgDoCurso(props.cfg, dados.indice, dados.un, ref, setSel) : null), [dados, props.cfg, ref]);
  if (!cfg) {
    if (props.tab !== 'caminho') return <PlanoConteudoBase {...props} />;
    return <div className="scroll-area" style={{ padding: '40px 24px', textAlign: 'center', fontWeight: 700, color: erro ? '#B91C1C' : '#64748B' }}>
      <style>{PLANO_CSS}</style>{erro || 'Carregando o seu caminho…'}</div>;
  }
  return <PlanoConteudoBase {...props} cfg={cfg} />;
}

// Quem tem plano.livro vê o curso (livro no app); os demais continuam com o pacote da Unit 4.
function PlanoConteudo(props) {
  return props.cfg && props.cfg.cursoRef ? <PlanoConteudoCurso {...props} /> : <PlanoConteudoBase {...props} />;
}
