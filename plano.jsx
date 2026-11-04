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
  if (teste && admin) return { ...PLANO_PREVIA, previa: true, forcaFala: q.get('falar') === '1', cursoRef: q.get('curso') ? { id: 'connectivity-1', inicial: q.get('inicial') || q.get('curso'), atual: q.get('curso') } : null };
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
        const faltando = {}; Object.keys(local).forEach(k => { if (!remoto[k]) faltando[k] = local[k]; });
        if (Object.keys(faltando).length) fb.setDoc(ref, { feitas: faltando, atualizadoEm: fb.serverTimestamp() }, { merge: true }).catch(() => {});
        conta.current = { fb, ref };
      }
      setFeitas(dono ? (atual => ({ ...atual, ...uniao })) : uniao);   // espelho: só o que a aluna fez, não o que está neste navegador
    }).catch(() => {});   // sem rede ou sem permissão: segue só com o aparelho
    return () => { vivo = false; };
  }, [uid, nuvem, chave]);
  // `valor` é `true` na maioria; o resumo do vídeo de fim de unidade guarda {texto, em} (chave "resumo:ID") e pode ser reenviado.
  const marcar = React.useCallback((id, valor = true) => {
    setFeitas(atual => {
      if (valor === true && atual[id]) return atual;
      const novo = { ...atual, [id]: valor };
      try { localStorage.setItem(chave, JSON.stringify(novo)); } catch (e) {}
      if (conta.current) conta.current.fb.setDoc(conta.current.ref, { feitas: { [id]: valor }, atualizadoEm: conta.current.fb.serverTimestamp() }, { merge: true }).catch(() => {});
      return novo;
    });
  }, [chave]);
  const zerar = React.useCallback(() => { try { localStorage.removeItem(chave); } catch (e) {} setFeitas({}); }, [chave]);
  return [feitas, marcar, zerar];
}

const PLANO_CSS = `
@keyframes planoPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,.45); } 50% { box-shadow: 0 0 0 14px rgba(124,58,237,0); } }
@keyframes planoPulsoAz { 0%,100% { box-shadow: 0 6px 0 #075985, 0 0 0 0 rgba(14,165,233,.5); } 50% { box-shadow: 0 6px 0 #075985, 0 0 0 14px rgba(14,165,233,0); } }
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
  const expl = t.tipo === 'explicacao';   // nó azul 💡: explicação de gramática que vem antes dos exercícios da página
  const COR = expl ? '#0EA5E9' : PLANO_COR;
  const estilo = e === 'feita' ? { background: 'linear-gradient(150deg,#22C55E,#15803D)', color: '#fff', boxShadow: '0 6px 0 #166534' }
    : e === 'atual' ? (expl ? { background: 'linear-gradient(150deg,#38BDF8,#0284C7)', color: '#fff', boxShadow: '0 6px 0 #075985', animation: 'planoPulsoAz 1.8s infinite' } : { background: 'linear-gradient(150deg,#8B5CF6,#6D28D9)', color: '#fff', boxShadow: '0 6px 0 #4C1D95', animation: 'planoPulso 1.8s infinite' })
    : e === 'aberta' ? { background: '#fff', color: '#0F172A', border: `3px solid ${COR}`, boxShadow: `0 6px 0 ${expl ? '#BAE6FD' : '#DDD6FE'}` }
    : { background: '#E2E8F0', color: '#94A3B8', boxShadow: '0 6px 0 #CBD5E1' };
  return <>
    {e === 'atual' && <div style={{ position: 'absolute', top: it.y - it.r - 36, left: `${(it.x / W) * 100}%`, transform: 'translateX(-50%)', background: '#fff', border: `2px solid ${COR}`, color: expl ? '#075985' : '#5B21B6', borderRadius: 12, padding: '4px 12px', fontSize: 11.5, fontWeight: 800, letterSpacing: .5, whiteSpace: 'nowrap', boxShadow: '0 4px 10px rgba(124,58,237,.18)' }}>
      COMEÇAR<span style={{ position: 'absolute', left: '50%', bottom: -7, width: 10, height: 10, background: '#fff', borderRight: `2px solid ${COR}`, borderBottom: `2px solid ${COR}`, transform: 'translateX(-50%) rotate(45deg)' }} /></div>}
    <button data-atual={e === 'atual' ? '1' : undefined} onClick={() => onTarefa(t, e)} style={{ ...nodeBase, borderRadius: '50%', fontSize: 26, ...estilo }} aria-label={t.titulo}>
      {e === 'feita' ? '✓' : e === 'trancada' ? '🔒' : t.ic}
    </button>
    <div style={{ ...rotulo, opacity: e === 'trancada' ? .6 : 1 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>{t.titulo}</div>
      {t.sub && <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 1 }}>{t.sub}</div>}
    </div>
  </>;
}

function PlanoCaminho({ cfg, feitas, ativOk, onTarefa, onAula, onComoFunciona, onGramatica }) {
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
      {onGramatica && <button onClick={onGramatica} style={{ display: 'block', margin: '12px auto 0', background: '#E0F2FE', border: '1.5px solid #7DD3FC', color: '#075985', borderRadius: 99, padding: '7px 17px', fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer' }}>📘 Gramática: todas as explicações</button>}
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
          {onAsk && <button onClick={onAsk} style={{ border: 0, background: '#F5F3FF', color: '#5B21B6', borderRadius: 12, padding: '8px 11px', fontWeight: 800, fontSize: 12, fontFamily: 'inherit', cursor: 'pointer' }}>💡 Dr. EurekIA</button>}
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
function PlanoVocabCartas({ vocab, titulo, onFeita, onClose, onAsk }) {
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

/* ───────── fala gravada: vocabulário "ouvir e falar" e exercício de falar ─────────
 * Só vale com as chaves do livro ligadas no painel (cursos/{id}: vocabPronuncia e gravarFalas). Desligadas, nada muda.
 * Cada fala é um documento em students/{uid}/falas/{ID} = {audio, dur, em, enunciado, unidade, tarefa, ex?, palavra?}. O áudio vai para o Storage
 * (extras/{uid}/falas-{unidade}/{arquivo}) e a função avaliarFala completa transcricao / ouvi / ok / conf no mesmo documento.
 * Na prévia do painel e no espelho (fala.teste) nada é gravado: o vocabulário só confere (a função não guarda nada) e o exercício só marca como feito. */
const PlanoFalaCtx = React.createContext(null);

// Mesma regra de functions/fala.js (palavraAlvo): "citizen (cidadão)" → "citizen", "single/unmarried" → "single".
function PlanoPalavraAlvo(s) {
  return PlanoNorm(String(s || '').replace(/\([^)]*\)/g, ' ').split(/[\/;,]/)[0]).replace(/[’‘`]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function PlanoNovaChave() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function PlanoUsoGravando(liga) {
  try { if (typeof CzkUsage !== 'undefined') { if (liga) CzkUsage.hold('gravando'); else CzkUsage.release('gravando'); } } catch (e) {}
}

// Áudio gravado (webm/mp4) → WAV PCM 16 kHz mono em base64, que é o que a função manda ao Speech-to-Text.
// A reamostragem é feita aqui, por média de janelas: OfflineAudioContext com sampleRate falha no iOS.
function PlanoLerBytes(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error || new Error('leitura')); r.readAsArrayBuffer(blob); });
}
function PlanoDecodificar(ctx, bytes) {
  return new Promise((res, rej) => { const p = ctx.decodeAudioData(bytes, res, rej); if (p && typeof p.then === 'function') p.then(res, rej); });
}
// `canais` = lista de Float32Array (um por canal) na taxa `taxa`. Devolve Int16Array mono a 16 kHz.
function PlanoPcm16k(canais, taxa) {
  const n = canais.length ? canais[0].length : 0; const razao = taxa / 16000;
  const mono = new Float32Array(n);
  canais.forEach(d => { for (let i = 0; i < n; i++) mono[i] += d[i] / canais.length; });
  const saida = Math.max(1, Math.floor(n / razao)); const pcm = new Int16Array(saida);
  for (let j = 0; j < saida; j++) {
    const i0 = Math.floor(j * razao); const i1 = Math.min(n, Math.max(i0 + 1, Math.ceil((j + 1) * razao)));
    let soma = 0; for (let i = i0; i < i1; i++) soma += mono[i];
    const v = Math.max(-1, Math.min(1, soma / Math.max(1, i1 - i0)));
    pcm[j] = Math.round(v < 0 ? v * 32768 : v * 32767);
  }
  return pcm;
}
function PlanoMontarWav(pcm) {
  const dv = new DataView(new ArrayBuffer(44 + pcm.length * 2));
  const txt = (o, s) => { for (let k = 0; k < s.length; k++) dv.setUint8(o + k, s.charCodeAt(k)); };
  txt(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length * 2, true); txt(8, 'WAVE'); txt(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, 16000, true); dv.setUint32(28, 32000, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); txt(36, 'data'); dv.setUint32(40, pcm.length * 2, true);
  for (let j = 0; j < pcm.length; j++) dv.setInt16(44 + j * 2, pcm[j], true);
  const bytes = new Uint8Array(dv.buffer); let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { base64: btoa(bin), dur: pcm.length / 16000 };
}
async function PlanoParaWav(blob) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) throw new Error('sem AudioContext');
  const ctx = new Ctx();
  try {
    const audio = await PlanoDecodificar(ctx, await PlanoLerBytes(blob));
    const canais = []; for (let c = 0; c < audio.numberOfChannels; c++) canais.push(audio.getChannelData(c));
    return PlanoMontarWav(PlanoPcm16k(canais, audio.sampleRate));
  } finally { try { Promise.resolve(ctx.close()).catch(() => {}); } catch (e) {} }
}

// Gravador curto da palavra: toque para gravar, toque para parar, ou para sozinho em ~4 s. Entrega (blob, extensão).
function PlanoGravadorCurto({ rotulo, onGravou, maxMs = 4000 }) {
  const [gravando, setGravando] = React.useState(false); const [erro, setErro] = React.useState('');
  const mr = React.useRef(null); const fluxo = React.useRef(null); const partes = React.useRef([]); const timer = React.useRef(null); const volta = React.useRef(onGravou);
  volta.current = onGravou;
  const soltar = () => { clearTimeout(timer.current); try { if (fluxo.current) fluxo.current.getTracks().forEach(t => t.stop()); } catch (e) {} fluxo.current = null; PlanoUsoGravando(false); };
  React.useEffect(() => () => { const g = mr.current; if (g && g.state !== 'inactive') { g.onstop = null; try { g.stop(); } catch (e) {} } soltar(); }, []);
  const parar = () => { clearTimeout(timer.current); try { if (mr.current && mr.current.state !== 'inactive') mr.current.stop(); } catch (e) {} };
  const comecar = async () => {
    setErro('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { setErro('Seu navegador não suporta gravação. No iPhone, abra pelo app na tela inicial.'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); fluxo.current = stream;
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac'].find(m => MediaRecorder.isTypeSupported(m)) || '';
      const g = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); partes.current = [];
      g.ondataavailable = e => { if (e.data && e.data.size) partes.current.push(e.data); };
      g.onstop = () => {
        const tipo = g.mimeType || mime || 'audio/webm'; const blob = new Blob(partes.current, { type: tipo });
        soltar(); setGravando(false);
        if (!blob.size) { setErro('A gravação ficou vazia. Confira se o microfone está liberado e tente de novo.'); return; }
        if (volta.current) volta.current(blob, /mp4|aac/.test(tipo) ? 'm4a' : 'webm');
      };
      g.start(); mr.current = g; setGravando(true); PlanoUsoGravando(true);
      timer.current = setTimeout(parar, maxMs);
    } catch (e) {
      soltar();
      const nome = e && e.name;
      setErro(nome === 'NotAllowedError' || nome === 'SecurityError' ? 'O microfone está bloqueado. Abra as permissões deste app/site, permita o microfone e tente novamente.'
        : nome === 'NotFoundError' ? 'Nenhum microfone foi encontrado neste aparelho.'
          : nome === 'NotReadableError' || nome === 'AbortError' ? 'O microfone está sendo usado por outro aplicativo. Feche-o e tente novamente.'
            : 'Não foi possível iniciar a gravação. Reabra o app e confira a permissão do microfone.');
    }
  };
  return (
    <div>
      <button className="plano-btn violeta" onClick={gravando ? parar : comecar} style={gravando ? { background: 'linear-gradient(180deg,#EF4444,#DC2626)', boxShadow: '0 8px 20px rgba(220,38,38,.3)' } : undefined}>{gravando ? '⏹ Parar (para sozinho em 4 s)' : rotulo}</button>
      {erro && <div style={{ fontSize: 12.5, color: '#DC2626', marginTop: 8, fontWeight: 700, lineHeight: 1.4 }}>{erro}</div>}
    </div>
  );
}

// Cada fala é UM documento em students/{uid}/falas/{chave} (não cabe no doc "feitas": limite de 1500 chaves e 1 MB por aluna).
// 1) PlanoCriarFala cria o registro (a aluna só cria; a função avaliarFala completa a transcrição/conferência depois);
// 2) PlanoSubirFala sobe o áudio e preenche o caminho. A ordem importa: a função só pode escrever DEPOIS de a aluna criar o registro.
// Nenhuma das duas lança erro: devolvem true se deu certo.
async function PlanoCriarFala(fala, { chave, dur, meta }) {
  try {
    const fb = await getFB();
    const reg = { audio: '', em: new Date().toISOString(), unidade: fala.unidade || '', tarefa: fala.tarefaId || '', ...meta };
    if (dur) reg.dur = Math.round(dur * 10) / 10;
    Object.keys(reg).forEach(k => { if (reg[k] === undefined || reg[k] === null) delete reg[k]; });   // o Firestore recusa campo undefined
    reg.enunciado = String(reg.enunciado || '').slice(0, 160);
    await fb.setDoc(fb.doc(fb.db, 'students', fala.uid, 'falas', chave), reg);
    return true;
  } catch (e) { console.warn('fala: não consegui registrar a gravação', e); return false; }
}
async function PlanoSubirFala(fala, { chave, blob, ext }) {
  try {
    const fb = await getFB();
    const unidade = String(fala.unidade || 'x').replace(/[^A-Za-z0-9_-]/g, '') || 'x';
    const path = `extras/${fala.uid}/falas-${unidade}/${chave}.${ext || 'webm'}`;
    await fb.uploadBytes(fb.storageRef(fb.storage, path), blob, { contentType: blob.type || 'audio/webm' });
    try { await fb.updateDoc(fb.doc(fb.db, 'students', fala.uid, 'falas', chave), { audio: path }); }
    catch (e) { console.warn('fala: o áudio subiu, mas não consegui registrar o caminho', e); }
    return true;
  } catch (e) { console.warn('fala: não consegui subir o áudio', e); return false; }
}

// Chama a função avaliarFala. `dados` = { modo, palavra?, wav, chave }.
async function PlanoAvaliar(fala, dados) {
  const fb = await getFB();
  const chamar = fb.httpsCallable(fb.functions, 'avaliarFala', { timeout: 30000 });
  const r = await chamar({ ...dados, ...(fala.curso ? { curso: fala.curso } : {}), ...(fala.teste ? { teste: true } : {}) });
  return (r && r.data) || {};
}
function PlanoMsgErroFala(e) {
  const c = String((e && e.code) || '');
  if (c === 'functions/resource-exhausted' && e.message) return e.message;
  if (c === 'functions/failed-precondition' || c === 'functions/not-found') return 'A conferência de fala ainda não está ligada. Você pode seguir.';
  return 'Não consegui conferir agora (confira a internet). Você pode seguir.';
}
function PlanoEsperar(p, ms) { return Promise.race([p, new Promise(res => setTimeout(() => res('tempo'), ms))]); }

// A palavra com as letras que saíram diferentes em vermelho. `partes` = [{t, ok}] vindo da função.
function PlanoPalavraComErros({ partes }) {
  return <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: .5, wordBreak: 'break-word' }}>{(partes || []).map((p, k) => <span key={k} style={p.ok ? { color: '#15803D' } : { color: '#DC2626', textDecoration: 'underline wavy #DC2626', textUnderlineOffset: 5 }}>{p.t}</span>)}</span>;
}

// Só no teste do professor (?planoteste=1&falar=1): mostra a confiança que o serviço de voz deu a cada palavra, para calibrar a exigência.
function PlanoNotaTeste({ res, teste }) {
  if (!teste || !res || res.falha) return null;
  const f = n => (typeof n === 'number' ? String(Math.round(n * 100) / 100).replace('.', ',') : '—');
  const pal = Array.isArray(res.palavras) && res.palavras.length ? res.palavras.map(p => `${p.t} ${f(p.c)}`).join(' · ') : '';
  return <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: '#64748B', textAlign: 'center', overflowWrap: 'anywhere' }}>🔬 Teste do professor · confiança {f(res.conf)} (mínimo {f(typeof res.minimo === 'number' ? res.minimo : 0.8)}){pal ? ` · ${pal}` : ''}</div>;
}

// Vocabulário (modo "ouvir e falar"): a aluna ouve a palavra, grava, e o app confere. Cada tentativa é guardada.
function PlanoVocabFalar({ vocab, titulo, onFeita, onClose, onAsk, fala }) {
  const [fila, setFila] = React.useState(() => vocab.map((_, k) => k)); const [pos, setPos] = React.useState(0);
  const [res, setRes] = React.useState(null); const [enviando, setEnviando] = React.useState(false); const [erros, setErros] = React.useState(0);
  const [recolocadas, setRecolocadas] = React.useState({}); const [avisoAudio, setAvisoAudio] = React.useState('');
  // final[k]: 'ok' | 'fraca' (seguiu sem acertar) | 'sem' (a conferência não respondeu); errosTotal[k]: tentativas erradas
  const final = React.useRef({}); const errosTotal = React.useRef({});
  const vivo = React.useRef(true); React.useEffect(() => { vivo.current = true; return () => { vivo.current = false; }; }, []);
  const idx = fila[pos]; const [en, pt] = vocab[idx]; const alvo = PlanoPalavraAlvo(en); const ultimo = pos === fila.length - 1;
  const liberado = !!res && (res.ok === true || !!res.falha);
  const podeSeguir = !!res && res.ok !== true && !res.falha && erros >= 3;
  const podeRecolocar = !recolocadas[idx] && !ultimo;

  const tentar = async (blob, ext) => {
    setEnviando(true); setRes(null); setAvisoAudio('');
    const chave = PlanoNovaChave();
    const wav = await PlanoParaWav(blob).catch(() => null);
    if (!fala.teste) await PlanoCriarFala(fala, { chave, dur: wav && wav.dur, meta: { enunciado: `Vocabulário: fale “${en}”`, palavra: alvo } });
    const guardar = fala.teste ? Promise.resolve(true) : PlanoSubirFala(fala, { chave, blob, ext });
    guardar.then(ok => { if (!ok && vivo.current) setAvisoAudio('⚠️ Não consegui guardar o áudio desta tentativa. Confira a internet.'); });
    let r;
    if (!wav) r = { falha: 'Não consegui preparar o áudio neste aparelho. Você pode seguir.' };
    else { try { r = await PlanoAvaliar(fala, { modo: 'palavra', palavra: alvo, wav: wav.base64, chave }); } catch (e) { r = { falha: PlanoMsgErroFala(e) }; } }
    if (!vivo.current) return;
    if (!r.falha && typeof r.ok !== 'boolean') r = { falha: PlanoMsgErroFala(null) };
    if (r.falha) { if (final.current[idx] !== 'ok') final.current[idx] = 'sem'; }
    else if (r.ok === true) final.current[idx] = 'ok';
    else { errosTotal.current[idx] = (errosTotal.current[idx] || 0) + 1; setErros(n => n + 1); }
    setRes(r); setEnviando(false);
  };

  const concluir = () => {
    if (!fala.teste) {
      let ok = 0, sem = 0; const fracas = [];
      vocab.forEach(([e], k) => {
        const f = final.current[k];
        if (f === 'ok') ok++; else if (f === 'sem') sem++;
        if (f === 'fraca' || (f === 'ok' && (errosTotal.current[k] || 0) >= 2)) fracas.push(PlanoPalavraAlvo(e));
      });
      fala.marcar('pron:' + fala.tarefaId, { ok, total: vocab.length, fracas, ...(sem ? { sem } : {}), em: new Date().toISOString() });
    }
    onFeita();
  };
  const avancar = pular => {
    if (pular && final.current[idx] !== 'ok') {
      final.current[idx] = 'fraca';
      if (podeRecolocar) { setFila(f => [...f, idx]); setRecolocadas(r => ({ ...r, [idx]: true })); }
    }
    if (ultimo) { concluir(); return; }
    setPos(p => p + 1); setRes(null); setErros(0); setAvisoAudio('');
  };

  const caixa = (cor, fundo, borda) => ({ marginTop: 12, padding: '12px 14px', borderRadius: 16, fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: cor, background: fundo, border: `1px solid ${borda}` });
  return (
    <PlanoCamada titulo={titulo || 'Vocabulário'} sub={`${pos + 1} de ${fila.length} · ouça e fale`} onClose={onClose} onAsk={onAsk}
      rodape={<button className="plano-btn" disabled={!liberado || enviando} onClick={() => avancar(false)}>{ultimo ? 'Concluir ✓' : 'Próxima ›'}</button>}>
      <div style={{ background: '#fff', border: '1px solid rgba(var(--brand-rgb),.12)', borderRadius: 22, boxShadow: '0 12px 30px rgba(15,23,42,.08)', padding: '22px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#64748B' }}>OUÇA E FALE EM INGLÊS</div>
        <div style={{ fontSize: 36, fontWeight: 800, marginTop: 10, color: '#0F172A', lineHeight: 1.15, wordBreak: 'break-word' }}>{en}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#64748B', marginTop: 5 }}>{pt}</div>
        <button className="plano-btn sec" style={{ display: 'inline-block', width: 'auto', margin: '14px auto 0', padding: '9px 20px', fontSize: 15 }} onClick={() => PlanoFalar(en)}>🔊 Ouvir</button>
      </div>

      {enviando && <div style={caixa('#334155', '#F8FAFC', '#E2E8F0')}>⏳ Conferindo a sua pronúncia…</div>}
      {res && res.ok === true && <div style={caixa('#14532D', '#F0FDF4', '#BBF7D0')}>✅ Muito bem! Eu ouvi “{res.ouvi}”.<PlanoNotaTeste res={res} teste={fala.teste} /></div>}
      {res && res.falha && <div style={caixa('#78350F', '#FFFBEB', '#FDE68A')}>⚠️ {res.falha}</div>}
      {res && res.ok === false && !res.falha && <div style={{ ...caixa('#7F1D1D', '#FEF2F2', '#FECACA'), textAlign: 'center' }}>
        <div>❌ Eu ouvi: <b>“{res.ouvi || 'nada'}”</b></div>
        <div style={{ margin: '8px 0 4px' }}><PlanoPalavraComErros partes={res.partes} /></div>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#991B1B' }}>{res.motivo === 'pouco-claro' ? 'Eu entendi a palavra, mas o que está em vermelho não saiu com clareza.' : 'As letras em vermelho saíram diferentes.'}</div>
        {res.dica && <div style={{ marginTop: 8, fontWeight: 700, color: '#7F1D1D' }}>💡 {res.dica}</div>}
        <PlanoNotaTeste res={res} teste={fala.teste} />
        <button className="plano-btn sec" style={{ marginTop: 10, padding: '9px 14px', fontSize: 14 }} onClick={() => PlanoFalar(en)}>🔊 Ouvir de novo</button>
      </div>}
      {avisoAudio && <div style={{ ...caixa('#78350F', '#FFFBEB', '#FDE68A'), fontSize: 12.5 }}>{avisoAudio}</div>}

      {!(res && res.ok === true) && !enviando && <div style={{ marginTop: 14 }}>
        <PlanoGravadorCurto rotulo={res ? '🎤 Tentar de novo' : '🎤 Gravar'} onGravou={tentar} />
        {podeSeguir && <button className="plano-btn sec" style={{ marginTop: 10 }} onClick={() => avancar(true)}>{podeRecolocar ? 'Seguir (volta no fim)' : 'Seguir assim mesmo'}</button>}
      </div>}
    </PlanoCamada>
  );
}

// Com a chave "vocabPronuncia" do livro ligada, o vocabulário é "ouvir e falar"; desligada, são as cartas de sempre.
function PlanoVocab(props) {
  const fala = React.useContext(PlanoFalaCtx);
  return fala && fala.vocab ? <PlanoVocabFalar {...props} fala={fala} /> : <PlanoVocabCartas {...props} />;
}

// Exercício de falar: com "gravarFalas" ligada, grava de verdade (até 30 s), guarda o áudio e transcreve. Desligada, o botão de sempre.
function PlanoFalaExercicio({ ex, feito, onFeito }) {
  const fala = React.useContext(PlanoFalaCtx);
  if (!fala || !fala.falas || typeof AudioRecorder !== 'function') return feito ? null : <button className="plano-btn violeta" onClick={onFeito}>🎤 Já falei em voz alta ✓</button>;
  return <PlanoFalaGravar ex={ex} fala={fala} feito={feito} onFeito={onFeito} />;
}
function PlanoFalaGravar({ ex, fala, feito, onFeito }) {
  const [grav, setGrav] = React.useState(null); const [fase, setFase] = React.useState('gravar');
  const [texto, setTexto] = React.useState(''); const [aviso, setAviso] = React.useState('');
  const enviar = async () => {
    if (!grav || fase !== 'gravar') return;
    setFase('enviando');
    if (fala.teste) { setFase('feito'); onFeito(); return; }
    const chave = PlanoNovaChave();
    const wav = await PlanoParaWav(grav.blob).catch(() => null);
    await PlanoCriarFala(fala, { chave, dur: wav && wav.dur, meta: { enunciado: ex.q, ex: ex.id } });
    const guardar = PlanoSubirFala(fala, { chave, blob: grav.blob, ext: grav.ext });
    let r = null; let msg = '';
    const avaliar = wav ? PlanoAvaliar(fala, { modo: 'livre', wav: wav.base64, chave }).then(x => { r = x; }).catch(e => { msg = PlanoMsgErroFala(e); }) : Promise.resolve();
    const fim = await PlanoEsperar(Promise.all([guardar, avaliar]), 25000);
    const guardou = fim === 'tempo' ? null : fim[0];
    if (fim === 'tempo') msg = 'A internet está lenta: a gravação continua sendo enviada. Não feche o app ainda.';
    else if (!guardou) msg = 'Não consegui guardar o áudio. Confira a internet e fale de novo mais tarde.';
    else if (!wav) msg = 'A gravação foi enviada, mas não consegui transcrever neste aparelho.';
    const dito = r && r.texto ? String(r.texto) : '';
    setTexto(dito);
    setAviso(msg || (r && !dito ? 'Não consegui ouvir palavras na gravação, mas ela foi enviada para o professor.' : ''));
    setFase('feito'); onFeito();
  };
  if (fase === 'feito' || feito) return (
    <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, background: '#F0FDF4', color: '#14532D', border: '1px solid #BBF7D0' }}>
      {fala.teste ? '✔ Prévia: nada foi gravado.' : '✔ Gravação enviada para o professor.'}
      {texto && <div style={{ fontWeight: 600, marginTop: 4 }}>Você disse: “{texto}”</div>}
      {aviso && <div style={{ fontWeight: 600, marginTop: 4, color: '#78350F' }}>{aviso}</div>}
    </div>
  );
  return (
    <div>
      <AudioRecorder maxSeconds={30} onBlob={(blob, ext) => setGrav(blob ? { blob, ext } : null)} />
      <button className="plano-btn violeta" style={{ marginTop: 10 }} disabled={!grav || fase === 'enviando'} onClick={enviar}>{fase === 'enviando' ? 'Enviando…' : 'Enviar gravação ✓'}</button>
    </div>
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
//   segs: [{a, b, t}] (início, fim e frase do que é dito) ou transcricao: texto corrido — o texto do vídeo.
// Como a aluna usa:
//   · vídeo com texto: começa SEM o texto; ela assiste quantas vezes quiser e escreve o que entendeu (qualquer coisa vale, até "não entendi");
//     ao enviar, o texto do vídeo é liberado (com a frase falada em negrito, acompanhando o vídeo).
//   · vídeo do fim da unidade (id termina em -video-3, o Connect TV): nunca tem texto; ela escreve um resumo do que entendeu.
//   · vídeo sem texto ainda: só "Já assisti".
// A resposta fica em feitas['resumo:ID'] = {texto, em}; o professor lê no painel (aba Curso).
function PlanoVideoFinal(t) { return /-video-3$/.test(String((t && t.id) || '')); }
const PLANO_RESUMO_MIN = 1;   // palavras: qualquer resposta vale
const PlanoPalavras = s => (String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0);

// As frases de um texto falado (áudio ou vídeo): a que está sendo dita fica em negrito e, quando ela termina, o destaque desce para a próxima.
// Tocar numa frase leva o som para ela (onIr). `ligado` = já começou a tocar.
function PlanoLinhasTexto({ segs, pos, ligado, onIr }) {
  const caixa = React.useRef(null);
  let ativa = -1; if (ligado) segs.forEach((g, k) => { if (pos >= g.a - 0.05) ativa = k; });   // a última que já começou: não "apaga" entre uma frase e outra
  React.useEffect(() => { const c = caixa.current; const el = c && c.querySelector('[data-ativa="1"]'); if (el) c.scrollTop = Math.max(0, el.offsetTop - 30); }, [ativa]);
  return (
    <div ref={caixa} style={{ maxHeight: 150, overflowY: 'auto', position: 'relative', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 11, padding: '6px 10px', fontSize: 14, lineHeight: 1.5, color: '#0C4A6E' }}>
      {segs.map((g, k) => <div key={k} data-ativa={k === ativa ? '1' : '0'} onClick={() => onIr && onIr(g.a)} style={{ padding: '2px 4px', margin: '1px 0', cursor: onIr ? 'pointer' : 'default', fontWeight: k === ativa ? 800 : 500, color: k === ativa ? '#0F172A' : '#0C4A6E', background: k === ativa ? '#FEF08A' : 'transparent', borderRadius: 6 }}>{g.t}</div>)}
    </div>
  );
}

function PlanoTarefaVideo({ t, onFeita, onResumo, resumoAnterior, onClose, onAsk }) {
  const id = PlanoYoutubeId(t.youtube || t.youtubeId); const url = t.url;
  const final = PlanoVideoFinal(t);
  const segsVideo = (!final && t.segs && t.segs.length) ? t.segs : null;
  const textoVideo = final ? '' : (segsVideo ? segsVideo.map(g => g.t).join(' ') : (t.transcricao || ''));
  const temTexto = !!textoVideo;                 // este vídeo tem texto para liberar depois da resposta
  const pedeResposta = final || temTexto;
  const [resumo, setResumo] = React.useState(resumoAnterior || ''); const [enviou, setEnviou] = React.useState(false);
  const liberado = !final && temTexto && (!!resumoAnterior || enviou);   // já respondeu: o texto aparece
  const palavras = PlanoPalavras(resumo); const pronto = palavras >= PLANO_RESUMO_MIN;
  const caixa = React.useRef(null); const jogador = React.useRef(null); const relogio = React.useRef(null);
  const [terminou, setTerminou] = React.useState(false); const [semApi, setSemApi] = React.useState(false);
  const [pos, setPos] = React.useState(0); const [tocou, setTocou] = React.useState(false);
  const sincroniza = React.useRef(false); sincroniza.current = !!(liberado && segsVideo);
  React.useEffect(() => {
    if (!id || !caixa.current) return undefined;
    let player = null; let vivo = true;
    const le = () => { try { if (sincroniza.current && jogador.current) setPos(jogador.current.getCurrentTime()); } catch (e) {} };
    PlanoCarregarYT().then(YT => {
      if (!vivo || !caixa.current) return;
      const alvo = document.createElement('div'); caixa.current.appendChild(alvo);
      player = new YT.Player(alvo, {
        videoId: id, width: '100%', height: '100%',
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, iv_load_policy: 3, fs: 1, hl: 'pt-BR', cc_load_policy: 0, start: t.inicio || 0, ...(t.fim ? { end: t.fim } : {}) },
        events: { onStateChange: e => {
          if (e.data === 0 && vivo) setTerminou(true);
          clearInterval(relogio.current);
          if (e.data === 1) { if (vivo) setTocou(true); relogio.current = setInterval(le, 300); } else le();   // tocando: confere o tempo a cada 0,3 s
        } },
      });
      jogador.current = player;
    }).catch(() => { if (vivo) setSemApi(true); });   // sem a API o vídeo ainda toca (iframe simples), só não detecta o fim
    return () => { vivo = false; clearInterval(relogio.current); jogador.current = null; try { if (player && player.destroy) player.destroy(); } catch (e) {} };
  }, [id, t.inicio, t.fim]);
  const irPara = tempo => { try { if (jogador.current) { jogador.current.seekTo(tempo, true); jogador.current.playVideo(); setPos(tempo); } } catch (e) {} };
  const enviar = () => {
    const x = resumo.trim();
    if (onResumo) onResumo(x); else if (final) onFeita();
    if (!final) setEnviou(true);   // vídeo com texto: não fecha, libera o texto aqui mesmo
  };
  const moldura = { position: 'relative', paddingTop: '56.25%', borderRadius: 18, overflow: 'hidden', background: '#0F172A', boxShadow: '0 12px 30px rgba(15,23,42,.2)' };
  const botao = (pedeResposta && !liberado)
    ? <button className="plano-btn" disabled={!pronto} onClick={enviar}>{pronto ? (final ? 'Enviar o resumo ✓' : 'Enviar o que entendi ✓') : 'Escreva o que você entendeu'}</button>
    : <button className="plano-btn" onClick={onFeita}>{terminou || liberado ? 'Concluir tarefa ✓' : 'Já assisti ✓'}</button>;
  return (
    <PlanoCamada titulo={t.titulo} sub={t.sub} onClose={onClose} onAsk={onAsk} rodape={botao}>
      {id ? (semApi
        ? <div style={moldura}><iframe title={t.titulo} src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1&playsinline=1`} allow="encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} /></div>
        : <div style={moldura}><div ref={caixa} style={{ position: 'absolute', inset: 0 }} /></div>)
        : url ? <a href={url} target="_blank" rel="noopener noreferrer" className="plano-btn violeta" style={{ textDecoration: 'none', textAlign: 'center' }}>▶ Abrir o vídeo</a>
        : <div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>🎬 Vídeo em breve.</div>}
      {terminou && !pedeResposta && <div style={{ marginTop: 12, padding: '10px 13px', borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', fontWeight: 800, fontSize: 13.5 }}>🎉 Vídeo terminado! Toque em “Concluir tarefa”.</div>}
      {t.oQue && <div style={{ fontSize: 13.5, fontWeight: 700, color: '#475569', lineHeight: 1.5, marginTop: 12 }}>{t.oQue}</div>}
      {pedeResposta && !liberado && <div style={{ marginTop: 14, background: '#fff', borderRadius: 16, padding: '12px 13px', border: '1.5px solid #DDD6FE' }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, color: '#0F172A' }}>{final ? '✍️ Escreva um resumo do que você entendeu' : '✍️ O que você entendeu?'}</div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', margin: '3px 0 8px', lineHeight: 1.4 }}>{final
          ? 'Assista quantas vezes precisar. Aqui não tem texto do que é dito: escreva, em inglês e com as suas palavras, o que você entendeu.'
          : 'Assista quantas vezes precisar, sem texto. Escreva do jeito que der, mesmo que seja pouco ou “não entendi o suficiente”. Depois de enviar, o texto do vídeo aparece.'}</div>
        <textarea value={resumo} onChange={e => setResumo(e.target.value)} placeholder={final ? 'In this video…' : 'I understood…'} rows={final ? 5 : 4} style={{ width: '100%', boxSizing: 'border-box', border: '1.5px solid #CBD5E1', borderRadius: 12, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', lineHeight: 1.5, resize: 'vertical' }} />
        <div style={{ fontSize: 11.5, fontWeight: 800, color: pronto ? '#15803D' : '#94A3B8', marginTop: 4 }}>{palavras} palavra{palavras === 1 ? '' : 's'}{pronto ? ' ✓' : ''}</div>
        {final && resumoAnterior && <div style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B', marginTop: 4 }}>Você já enviou um resumo. Se mudar o texto e enviar de novo, o professor vê a versão nova.</div>}
      </div>}
      {liberado && <div style={{ marginTop: 14 }}>
        {enviou && <div style={{ marginBottom: 10, padding: '10px 13px', borderRadius: 14, background: '#F0FDF4', border: '1px solid #BBF7D0', color: '#14532D', fontWeight: 800, fontSize: 13.5 }}>✅ Resposta enviada! Agora o texto do vídeo está liberado: assista de novo lendo.</div>}
        <div style={{ fontWeight: 800, fontSize: 14, color: '#0369A1', marginBottom: 6 }}>📄 O que é dito no vídeo</div>
        {segsVideo
          ? <PlanoLinhasTexto segs={segsVideo} pos={pos} ligado={tocou && pos > 0} onIr={jogador.current ? irPara : null} />
          : <div style={{ background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: 12, padding: '10px 12px', fontSize: 14.5, lineHeight: 1.6, color: '#0C4A6E', whiteSpace: 'pre-wrap' }}>{textoVideo}</div>}
      </div>}
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

/* ───────── áudios do livro (mp3 que o professor sobe pelo painel): tocam em cima da página ───────── */
// Ficam em livros/{curso}/audio/{unidade}/. Cada áudio pode trazer `segs` = [{a, b, t}] (início, fim em segundos e a frase):
// aí a aluna pode ler o que está sendo dito, com a frase atual em destaque.
const PLANO_AUDIO_URL = {};
function PlanoUrlAudio(caminho) {
  if (!PLANO_AUDIO_URL[caminho]) {
    PLANO_AUDIO_URL[caminho] = (typeof getFB === 'function' ? getFB() : Promise.reject(new Error('sem firebase')))
      .then(fb => fb.getDownloadURL(fb.storageRef(fb.storage, caminho)))
      .catch(e => { delete PLANO_AUDIO_URL[caminho]; throw e; });
  }
  return PLANO_AUDIO_URL[caminho];
}
function PlanoTempo(s) { s = Math.max(0, Math.round(Number(s) || 0)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function PlanoAudiosPagina({ audios }) {
  const chave = audios.map(a => a.caminho).join('|');
  const [urls, setUrls] = React.useState({}); const [erro, setErro] = React.useState(false);
  const [tocando, setTocando] = React.useState(-1); const [sel, setSel] = React.useState(0);
  const [pos, setPos] = React.useState(0); const [durs, setDurs] = React.useState({});
  const [lento, setLento] = React.useState(false); const [texto, setTexto] = React.useState(false); const [aberta, setAberta] = React.useState(true);
  const els = React.useRef([]);
  // Os endereços já vêm prontos antes do toque: o iPhone só deixa tocar dentro do próprio toque do dedo.
  React.useEffect(() => {
    let vivo = true; setErro(false);
    Promise.all(audios.map(a => PlanoUrlAudio(a.caminho).then(u => [a.caminho, u]))).then(ps => { if (vivo) setUrls(Object.fromEntries(ps)); }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; els.current.forEach(e => { try { e && e.pause(); } catch (x) {} }); };
  }, [chave]);
  React.useEffect(() => { els.current.forEach(e => { if (e) e.playbackRate = lento ? 0.75 : 1; }); }, [lento, urls]);
  const tocar = i => {
    const el = els.current[i]; if (!el) return;
    setSel(i); setPos(el.currentTime);
    if (!el.paused) { el.pause(); return; }
    els.current.forEach((e, k) => { if (e && k !== i) { try { e.pause(); } catch (x) {} } });
    el.playbackRate = lento ? 0.75 : 1;
    const p = el.play(); if (p && p.catch) p.catch(() => setErro(true));
  };
  const ir = ev => { const el = els.current[sel]; if (!el || !el.duration) return; const r = ev.currentTarget.getBoundingClientRect(); el.currentTime = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width)) * el.duration; setPos(el.currentTime); };
  const a = audios[sel] || audios[0]; const segs = (a && a.segs) || []; const temTexto = audios.some(x => x.segs && x.segs.length);
  const total = durs[sel] || (a && a.dur) || 0;
  return (
    <div style={{ flexShrink: 0, margin: '8px 10px 0', background: '#fff', borderRadius: 16, boxShadow: '0 4px 14px rgba(15,23,42,.14)', padding: '9px 11px 10px', border: '1px solid #EDE9FE' }}>
      <button onClick={() => setAberta(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', border: 0, background: 'none', padding: 0, fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 17 }}>🔊</span><b style={{ fontSize: 13.5, color: '#0F172A', flex: 1 }}>{audios.length > 1 ? 'Áudios desta página' : 'Áudio desta página'}</b>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: '#64748B' }}>{aberta ? 'toque para ouvir' : '▼'}</span>
      </button>
      {aberta && <>
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {audios.map((x, i) => { const on = tocando === i; return <button key={x.caminho} onClick={() => tocar(i)} disabled={!urls[x.caminho]} style={{ flex: 1, borderRadius: 11, padding: '6px 2px', fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', border: `2px solid ${on || sel === i ? '#6D28D9' : '#DDD6FE'}`, background: on ? '#6D28D9' : '#fff', color: on ? '#fff' : '#5B21B6', opacity: urls[x.caminho] ? 1 : .55 }}>
            {on ? '⏸' : '▶'} {audios.length > 1 ? `Áudio ${i + 1}` : 'Ouvir'}<br /><span style={{ fontWeight: 700, fontSize: 11, opacity: .85 }}>{x.dur ? PlanoTempo(x.dur) : ' '}</span></button>; })}
        </div>
        {a && a.titulo && <div style={{ marginTop: 7, fontSize: 13, fontWeight: 800, color: '#0F172A' }}>🎧 {audios.length > 1 ? `Áudio ${sel + 1}: ` : ''}{a.titulo}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 11.5, fontWeight: 800, color: '#5B21B6' }}>
          <span>{PlanoTempo(pos)}</span>
          <div onClick={ir} style={{ flex: 1, height: 14, display: 'flex', alignItems: 'center', cursor: 'pointer' }}><div style={{ width: '100%', height: 7, borderRadius: 9, background: '#EDE9FE', overflow: 'hidden' }}><div style={{ width: `${total ? Math.min(100, pos / total * 100) : 0}%`, height: '100%', background: '#7C3AED' }} /></div></div>
          <span>{total ? PlanoTempo(total) : '–:––'}</span>
          <button onClick={() => setLento(v => !v)} style={{ border: `1.5px solid ${lento ? '#6D28D9' : '#DDD6FE'}`, background: lento ? '#6D28D9' : '#fff', color: lento ? '#fff' : '#6D28D9', borderRadius: 99, padding: '2px 9px', fontWeight: 800, fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer' }}>🐢 devagar</button>
        </div>
        {temTexto && <button onClick={() => setTexto(v => !v)} style={{ marginTop: 8, border: 0, background: 'none', color: '#0369A1', fontWeight: 800, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}>{texto ? '▼ Esconder o texto' : '📄 Ler o que está sendo dito'}</button>}
        {temTexto && texto && (segs.length
          ? <div style={{ marginTop: 6 }}><PlanoLinhasTexto segs={segs} pos={pos} ligado={tocando >= 0 || pos > 0} onIr={tempo => { const el = els.current[sel]; if (el) { el.currentTime = tempo; setPos(tempo); } }} /></div>
          : <div style={{ marginTop: 6, color: '#64748B', fontSize: 13 }}>Este áudio ainda não tem texto.</div>)}
        {erro && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#B91C1C' }}>Não consegui abrir o áudio agora. Confira a internet e tente de novo.</div>}
      </>}
      {audios.map((x, i) => urls[x.caminho] ? <audio key={x.caminho} ref={e => { els.current[i] = e; }} src={urls[x.caminho]} preload="metadata"
        onPlay={() => { setTocando(i); setSel(i); }} onPause={() => setTocando(c => (c === i ? -1 : c))} onEnded={() => setTocando(c => (c === i ? -1 : c))}
        onTimeUpdate={e => { if (!e.currentTarget.paused) setPos(e.currentTarget.currentTime); }}
        onLoadedMetadata={e => { const d = e.currentTarget.duration || 0; setDurs(m => ({ ...m, [i]: d })); }} /> : null)}
    </div>
  );
}

// A página aparece inteira (largura da tela); dois toques, pinça, roda do mouse ou +/− aproximam; arrastar anda na página.
function PlanoLeitor({ curso, pdf, cobrir }) {
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
      {url && <div ref={img} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', willChange: 'transform' }}>
        <img src={url} alt="Página do livro" draggable="false" onLoad={e => { V.current.w = e.target.naturalWidth; V.current.h = e.target.naturalHeight; e.target.style.width = V.current.w + 'px'; e.target.style.height = V.current.h + 'px'; if (img.current) { img.current.style.width = V.current.w + 'px'; img.current.style.height = V.current.h + 'px'; } ajustar(); }}
          style={{ display: 'block', userSelect: 'none', WebkitUserDrag: 'none', maxWidth: 'none' }} />
        {(cobrir || []).map((c, k) => <div key={k} style={{ position: 'absolute', left: 0, right: 0, top: `${c.y0 * 100}%`, height: `${(c.y1 - c.y0) * 100}%`, background: '#F1EDE6', boxShadow: 'inset 0 0 0 3px #E2DCD2', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94A3B8', fontWeight: 800, fontSize: 30, padding: 40, boxSizing: 'border-box' }}>Este exercício do livro não faz parte do seu curso.</div>)}
      </div>}
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

const PLANO_ROTULO_EX = { conv: 'Completar a conversa', mc: 'Escolher', vf: 'Verdadeiro ou falso', gap: 'Digitar', match: 'Ligar', order: 'Montar a frase', ouvir: 'Ouvir e escolher', ditado: 'Ouvir e escrever', speak: 'Falar' };

// Um exercício por vez. Avisa o resultado uma única vez (onFim) e mostra a correção.
function PlanoExercicio({ ex, onFim }) {
  const [fim, setFim] = React.useState(null); const [sel, setSel] = React.useState(null); const [txt, setTxt] = React.useState('');
  const [montada, setMontada] = React.useState([]); const [ligados, setLigados] = React.useState({}); const [selE, setSelE] = React.useState(null);
  const [erros, setErros] = React.useState(0); const [piscar, setPiscar] = React.useState(null); const [resp, setResp] = React.useState({});
  const banco = React.useMemo(() => ex.t === 'order' ? PlanoEmbaralhar(ex.w.map((w, k) => ({ w, k }))) : [], [ex]);
  const dir = React.useMemo(() => ex.pares ? PlanoEmbaralhar(ex.pares.map((p, k) => ({ x: p[1], k }))) : [], [ex]);
  const certaTxt = ex.t === 'mc' || ex.t === 'ouvir' ? ex.o[ex.c] : ex.t === 'vf' ? (ex.c ? 'Verdadeiro' : 'Falso') : ex.t === 'order' ? ex.w.join(' ') : ex.t === 'conv' ? (ex.a || []).map(x => String(x).split('|')[0]).join(' · ') : (ex.a || [''])[0];
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
  // Conversa com várias lacunas (`linhas` com ____; `a` = uma resposta por lacuna, alternativas separadas por |)
  const conv = ex.t === 'conv' && (() => {
    let n = -1; const vazias = (ex.a || []).some((_, k) => !String(resp[k] || '').trim());
    const certo = k => String((ex.a || [])[k] || '').split('|').map(PlanoNormResp).includes(PlanoNormResp(resp[k] || ''));
    return <div style={{ marginTop: 8 }}>
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '10px 12px' }}>
        {(ex.linhas || []).map((l, i) => <div key={i} style={{ fontSize: 15, fontWeight: 700, lineHeight: 2.1, color: '#0F172A' }}>
          {String(l).split('____').map((p, j, tudo) => { const k = j < tudo.length - 1 ? ++n : -1;
            return <React.Fragment key={j}>{p}{k >= 0 && <span style={{ display: 'inline-block', verticalAlign: 'baseline' }}>
              <input value={resp[k] || ''} disabled={!!fim} onChange={e => setResp(r => ({ ...r, [k]: e.target.value }))} autoCapitalize="none" autoCorrect="off" spellCheck={false}
                style={{ width: Math.max(70, 11 * Math.max(...String((ex.a || [])[k] || '').split('|').map(x => x.length)) + 22), maxWidth: '100%', margin: '0 3px', border: 0, borderBottom: `2.5px solid ${!fim ? '#A78BFA' : certo(k) ? '#22C55E' : '#F87171'}`, background: !fim ? '#F5F3FF' : certo(k) ? '#F0FDF4' : '#FEF2F2', borderRadius: 6, padding: '3px 5px', fontSize: 15, fontWeight: 800, fontFamily: 'inherit', outline: 'none', textAlign: 'center' }} />
              {fim && !certo(k) && <span style={{ fontSize: 11.5, fontWeight: 800, color: '#15803D', marginLeft: 2 }}>✓ {String((ex.a || [])[k]).split('|')[0]}</span>}</span>}</React.Fragment>; })}
        </div>)}
      </div>
      {!fim && <button className="plano-btn" style={{ marginTop: 9 }} disabled={vazias} onClick={() => fechar((ex.a || []).every((_, k) => certo(k)))}>Conferir</button>}
    </div>;
  })();
  const fala = ex.t === 'speak' && <div style={{ marginTop: 6 }}>
    {ex.dica && <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', lineHeight: 1.45, marginBottom: 10 }}>{ex.dica}</div>}
    <PlanoFalaExercicio ex={ex} feito={!!fim} onFeito={() => fechar(true)} />
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
      {opcoes}{caixaTxt}{ordem}{ligar}{conv}{fala}
      {fim && ex.t !== 'speak' && ex.t !== 'match' && <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, background: fim.ok ? '#F0FDF4' : '#FEF2F2', color: fim.ok ? '#14532D' : '#7F1D1D', border: `1px solid ${fim.ok ? '#BBF7D0' : '#FECACA'}` }}>
        {fim.ok ? '✔ Isso!' : `✘ A resposta certa é: ${certaTxt}`}{ex.exp ? <div style={{ fontWeight: 600, marginTop: 3 }}>{ex.exp}</div> : null}</div>}
      {fim && ex.t === 'match' && <div style={{ marginTop: 11, padding: '10px 13px', borderRadius: 14, fontSize: 13.5, fontWeight: 700, background: fim.ok ? '#F0FDF4' : '#FFFBEB', color: fim.ok ? '#14532D' : '#78350F', border: `1px solid ${fim.ok ? '#BBF7D0' : '#FDE68A'}` }}>{fim.ok ? '✔ ' : ''}{fim.extra}</div>}
    </div>
  );
}

/* ───────── Prévia do Dr. EurekIA ao abrir a página do livro ─────────
 * Campo opcional `previa` da tarefa "livro" (cursos/connectivity-1/unidades/uNN, tarefas[]), gravado no banco pelo professor:
 *   { topicos: ['2 a 5 itens curtos, em português, com termos em inglês'], fazer: 'o que o aluno ou a aluna deve fazer (1 a 3 frases)', intro: 'abertura, 1 frase (opcional)' }
 * Sem `previa` (ou sem tópicos e sem "fazer") nada aparece e nada muda. Com ela: um cartão com o Dr. EurekIA na 1ª vez que o aluno ou a aluna
 * abre a tarefa, e o botão "💡 Prévia" no topo da página para rever. O texto também vai para a IA (PlanoPreviaTexto) como o
 * objetivo da página. O texto do professor aceita **negrito** e *itálico* (PlanoMd). */
const PLANO_PERGUNTA_PREVIA = 'O que eu vou aprender nesta página?';
const PLANO_PREVIA_IA_MAX = 700;   // o servidor corta no mesmo tamanho (PREVIA_MAX em functions/assistente.js)
function PlanoPreviaNormaliza(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p)) return null;
  const txt = x => (typeof x === 'string' ? x.replace(/\s+/g, ' ').trim() : '');
  const topicos = (Array.isArray(p.topicos) ? p.topicos : []).map(txt).filter(Boolean).slice(0, 6);
  const fazer = txt(p.fazer);
  return topicos.length || fazer ? { intro: txt(p.intro), topicos, fazer } : null;
}
// A prévia como UMA string para a IA (intro + tópicos + o que fazer), no máximo 700 caracteres. A intro é só abertura: se o
// total estourar, ela sai primeiro. '' quando a tarefa não tem prévia (aí o servidor não muda nada).
function PlanoPreviaTexto(t) {
  const p = t ? PlanoPreviaNormaliza(t.previa) : null; if (!p) return '';
  const ponto = s => (/[.!?…:;]$/.test(s) ? s : s + '.');
  const pag = Number.isFinite(t.pdf) ? `Connectivity 1, página ${t.pdf - 14} do livro. ` : '';
  const intro = p.intro ? ponto(p.intro) + ' ' : '';
  const resto = (p.topicos.length ? `Tópicos da página: ${p.topicos.map(x => x.replace(/[.;]+$/, '')).join('; ')}. ` : '') + (p.fazer ? `O que fazer: ${ponto(p.fazer)}` : '');
  const com = (pag + intro + resto).replace(/\*/g, '');
  return PlanoCorta(com.length <= PLANO_PREVIA_IA_MAX ? com : (pag + resto).replace(/\*/g, ''), PLANO_PREVIA_IA_MAX);
}
function PlanoPreviaFolha({ previa, onEntendi, onPerguntar }) {
  const rotulo = { fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#6D28D9', margin: '0 2px 6px' };
  return (
    <div role="dialog" aria-modal="true" aria-label="Prévia da página, com o Dr. EurekIA" style={{ position: 'absolute', inset: 0, zIndex: 20, background: 'rgba(15,23,42,.64)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div style={{ width: '100%', maxWidth: 410, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: 26, boxShadow: '0 24px 60px rgba(0,0,0,.4)', animation: 'planoSurge .25s' }}>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'linear-gradient(150deg,#7C3AED,#4C1D95)', color: '#fff' }}>
          <EurekiaAvatar size={64} />
          <div><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, opacity: .8 }}>ANTES DE COMEÇAR</div><div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.15 }}>Dr. EurekIA</div></div>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px 6px' }}>
          {previa.intro && <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.5, color: '#0F172A', margin: '0 0 12px' }}><PlanoMd x={previa.intro} /></div>}
          {previa.topicos.length > 0 && <>
            <div style={rotulo}>NESTA PÁGINA</div>
            <div style={{ display: 'grid', gap: 7, margin: '0 0 12px' }}>
              {previa.topicos.map((x, i) => <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: '9px 12px', fontSize: 13.5, fontWeight: 600, lineHeight: 1.45, color: '#334155' }}>
                <span style={{ color: '#7C3AED', fontWeight: 800 }}>•</span><span style={{ minWidth: 0, overflowWrap: 'anywhere' }}><PlanoMd x={x} /></span></div>)}
            </div>
          </>}
          {previa.fazer && <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 14, padding: '10px 12px', margin: '0 0 12px' }}>
            <div style={{ ...rotulo, margin: '0 0 3px' }}>O QUE FAZER</div>
            <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: '#3B0764' }}><PlanoMd x={previa.fazer} /></div>
          </div>}
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.45, color: '#5B21B6', margin: '0 2px 8px' }}>Qualquer dúvida é só falar comigo. 🙂</div>
        </div>
        <div style={{ flexShrink: 0, padding: '10px 18px calc(18px + env(safe-area-inset-bottom, 0px))' }}>
          <button className="plano-btn violeta" onClick={onEntendi}>Entendi, vamos lá</button>
          {onPerguntar && <button className="plano-btn sec" style={{ marginTop: 8 }} onClick={onPerguntar}>💬 Perguntar ao Dr. EurekIA</button>}
        </div>
      </div>
    </div>
  );
}

// Tarefa "Livro": a página do livro em cima, os exercícios dela numa gaveta embaixo.
// `abrirEm` (só a prévia do painel): já abre a gaveta neste exercício, em vez de começar com ela fechada.
// `uid` + `semGravar`: a prévia do Dr. EurekIA aparece na 1ª abertura de cada tarefa por aluno ou aluna (localStorage); com `semGravar`
// (prévia do painel e espelho) ela aparece sempre e nada é gravado.
function PlanoTarefaPagina({ t, cursoId, onFeita, onClose, onAsk, abrirEm, uid, semGravar }) {
  const prev = React.useMemo(() => PlanoPreviaNormaliza(t.previa), [t.previa]);
  const chavePrev = `plano-previa-v1-${uid || 'x'}-${t.id}`;
  const [verPrev, setVerPrev] = React.useState(() => {
    if (!prev || abrirEm !== undefined) return false;   // abrirEm: o professor foi direto a um exercício, a prévia só atrapalharia
    if (semGravar) return true;
    try { return !localStorage.getItem(chavePrev); } catch (e) { return true; }
  });
  const fecharPrev = () => { if (!semGravar) { try { localStorage.setItem(chavePrev, '1'); } catch (e) {} } setVerPrev(false); };
  const perguntarPrev = () => { fecharPrev(); if (onAsk) onAsk(PLANO_PERGUNTA_PREVIA); };
  const exs = t.exercicios || []; const total = exs.length;
  const [pdf, setPdf] = React.useState(t.pdf); const [i, setI] = React.useState(abrirEm >= 0 && abrirEm < total ? abrirEm : 0); const [res, setRes] = React.useState([]);
  const [aberta, setAberta] = React.useState(abrirEm >= 0 && abrirEm < total); const [respondeu, setRespondeu] = React.useState(false);
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
          {prev && <button onClick={() => setVerPrev(true)} aria-label="Rever a prévia desta página" style={{ ...btn, width: 'auto', padding: '0 8px', fontSize: 12, whiteSpace: 'nowrap' }}>💡 Prévia</button>}
          {onAsk && <button onClick={() => onAsk()} aria-label="Dr. EurekIA" style={{ ...btn, width: 'auto', padding: '0 9px', fontSize: 15 }}>💡</button>}
        </div>
        {(t.audios || []).length > 0 && pdf === t.pdf && <PlanoAudiosPagina audios={t.audios} />}
        <PlanoLeitor curso={cursoId} pdf={pdf} cobrir={pdf === t.pdf ? t.cobrir : null} />
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
      {prev && verPrev && <PlanoPreviaFolha previa={prev} onEntendi={fecharPrev} onPerguntar={onAsk ? perguntarPrev : null} />}
    </div>
  );
}

/* ───────── explicação de gramática: o quadro do livro + o que ele quer dizer, em português + mini-exercícios ───────── */
// Mostra só um pedaço da página do livro (o quadro de GRAMMAR): a imagem da página já está no Storage, aqui só se recorta na tela.
// `quadro` = {x0,x1,y0,y1} em fração da página (largura 396,67 × altura 522,08 pontos do PDF).
function PlanoQuadroLivro({ curso, pdf, quadro, largura }) {
  const [url, setUrl] = React.useState(''); const [erro, setErro] = React.useState(false);
  React.useEffect(() => {
    let vivo = true; setUrl(''); setErro(false);
    PlanoUrlPagina(curso, pdf).then(u => { if (vivo) setUrl(u); }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [curso, pdf]);
  const lw = quadro.x1 - quadro.x0, lh = quadro.y1 - quadro.y0;
  return (
    <div style={{ position: 'relative', width: largura || '100%', overflow: 'hidden', background: '#fff', borderRadius: 8, paddingBottom: `${((lh * 1.3162) / lw) * 100}%` }}>
      {url && <img src={url} alt="Quadro de gramática do livro" draggable="false" style={{ position: 'absolute', maxWidth: 'none', width: `${100 / lw}%`, left: `${-(quadro.x0 / lw) * 100}%`, top: `${-(quadro.y0 / lh) * 100}%` }} />}
      {!url && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12, textAlign: 'center', fontWeight: 800, fontSize: 13, color: erro ? '#B91C1C' : '#94A3B8' }}>{erro ? 'Não consegui abrir o quadro agora.' : 'Abrindo o quadro…'}</div>}
    </div>
  );
}

function PlanoBloco({ b }) {
  const tit = b.t ? <div style={{ fontSize: 15, fontWeight: 800, margin: '22px 0 8px', color: '#0F172A' }}><PlanoMd x={b.t} /></div> : null;
  const caixa = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '10px 12px', marginBottom: 8 };
  if (b.k === 'texto') return <>{tit}<div style={{ ...caixa, fontSize: 14, fontWeight: 600, lineHeight: 1.55, color: '#334155' }}><PlanoMd x={b.x} /></div></>;
  if (b.k === 'dica') return <>{tit}<div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '10px 12px', fontSize: 14, fontWeight: 700, lineHeight: 1.55, color: '#78350F' }}><PlanoMd x={b.x} /></div></>;
  if (b.k === 'formula') return <>{tit}<div style={{ background: 'linear-gradient(150deg,#ECFEFF,#E0F2FE)', border: '1.5px solid #7DD3FC', borderRadius: 16, padding: 13, textAlign: 'center' }}>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#075985', lineHeight: 1.45 }}><PlanoMd x={b.f} /></div>
    {b.x && <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: '#0C4A6E', lineHeight: 1.5 }}><PlanoMd x={b.x} /></div>}</div></>;
  if (b.k === 'linhas') return <>{tit}{(b.itens || []).map((l, i) => <div key={i} style={caixa}>
    <span style={{ display: 'inline-block', fontWeight: 800, fontSize: 13, color: '#fff', background: PLANO_COR, borderRadius: 8, padding: '1px 9px', marginRight: 6 }}>{l.w}</span>
    <span style={{ fontWeight: 800, fontSize: 13.5 }}>{l.s}</span>
    <div style={{ fontWeight: 800, fontSize: 14, marginTop: 6 }}><PlanoMd x={l.en} /></div>
    <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, marginTop: 1 }}><PlanoMd x={l.pt} /></div>
    {l.re && <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 700, marginTop: 3 }}>Resposta: <PlanoMd x={l.re} /></div>}</div>)}</>;
  if (b.k === 'duas') return <>{tit}<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{[b.a, b.b].map((c, i) => <div key={i} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 14, padding: '11px 12px', fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: '#1E3A8A' }}>
    <div style={{ fontWeight: 800, marginBottom: 4 }}><PlanoMd x={c.t} /></div><div style={{ whiteSpace: 'pre-line' }}><PlanoMd x={c.x} /></div></div>)}</div></>;
  if (b.k === 'contr') return <>{tit}<div style={{ ...caixa, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', padding: '11px 13px', fontSize: 13, fontWeight: 700 }}>{(b.itens || []).map((c, i) => { const [a, ...r] = String(c).split(' = '); return <span key={i}><b style={{ color: PLANO_COR }}>{a}</b>{r.length ? ` = ${r.join(' = ')}` : ''}</span>; })}</div></>;
  if (b.k === 'erros') return <>{tit}{(b.itens || []).map((e, i) => <div key={i} style={{ display: 'grid', gap: 6, marginBottom: 8 }}>
    <div style={{ background: '#FEF2F2', color: '#7F1D1D', borderRadius: 12, padding: '9px 12px', fontSize: 13.5, fontWeight: 700 }}>❌ <PlanoMd x={e.no} /></div>
    <div style={{ background: '#F0FDF4', color: '#14532D', borderRadius: 12, padding: '9px 12px', fontSize: 13.5, fontWeight: 700 }}>✅ <PlanoMd x={e.ok} />{e.nota ? <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}><PlanoMd x={e.nota} /></div> : null}</div></div>)}</>;
  return null;
}

// Tarefa "Explicação": nó azul 💡 do Caminho, antes dos exercícios da mesma página. Não tem nota: "Já estudei" conclui.
function PlanoTarefaExplicacao({ t, cursoId, onFeita, onClose, onAsk }) {
  const [zoom, setZoom] = React.useState(false); const [res, setRes] = React.useState({});
  const exs = t.exercicios || []; const feitos = Object.keys(res).length; const acertos = Object.values(res).filter(Boolean).length;
  return (
    <PlanoCamada titulo={t.titulo} sub={`Connectivity 1 · página ${t.pagina} · gramática`} onClose={onClose} onAsk={onAsk}
      rodape={<><button className="plano-btn" style={{ background: 'linear-gradient(180deg,#38BDF8,#0284C7)', boxShadow: '0 8px 18px rgba(2,132,199,.3)' }} onClick={onFeita}>Já estudei ✓</button>
        <div style={{ textAlign: 'center', fontSize: 11.5, fontWeight: 700, color: '#64748B', marginTop: 7 }}>Você pode voltar aqui quando quiser, antes ou depois dos exercícios.</div></>}>
      <div style={{ fontSize: 15, fontWeight: 800, margin: '2px 0 8px' }}>📖 O quadro do livro <span style={{ color: '#64748B', fontWeight: 700, fontSize: 12 }}>(toque para ampliar)</span></div>
      <div onClick={() => setZoom(true)} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 8, cursor: 'zoom-in' }}>
        <PlanoQuadroLivro curso={cursoId} pdf={t.pdf} quadro={t.quadro} />
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748B', marginTop: 6 }}>Connectivity 1 · p. {t.pagina}</div>
      </div>
      {(t.blocos || []).map((b, i) => <PlanoBloco key={i} b={b} />)}
      {exs.length > 0 && <>
        <div style={{ fontSize: 15, fontWeight: 800, margin: '22px 0 8px' }}>🎯 Treine rápido <span style={{ color: '#64748B', fontWeight: 700, fontSize: 12 }}>({exs.length} perguntinhas)</span></div>
        {exs.map(ex => <div key={ex.id} style={{ background: '#fff', border: '2px solid #DDD6FE', borderRadius: 18, padding: 13, marginBottom: 10 }}>
          <PlanoExercicio ex={ex} onFim={ok => setRes(r => (r[ex.id] !== undefined ? r : { ...r, [ex.id]: ok }))} /></div>)}
        {feitos === exs.length && <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 14, padding: '11px 13px', fontSize: 13.5, fontWeight: 700, color: '#14532D' }}>🎉 <b>{acertos} de {exs.length}</b> certas. {acertos === exs.length ? 'Já pode ir para os exercícios da página!' : 'Releia o quadro acima e depois vá para os exercícios.'}</div>}
      </>}
      {zoom && <div onClick={() => setZoom(false)} style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(15,23,42,.92)', overflow: 'auto', padding: '56px 10px 24px' }}>
        <button onClick={() => setZoom(false)} style={{ position: 'fixed', top: 12, right: 14, border: 0, borderRadius: 99, background: '#fff', padding: '8px 15px', fontFamily: 'inherit', fontWeight: 800, cursor: 'pointer' }}>✕ Fechar</button>
        <div style={{ width: '230%', maxWidth: 1100 }}><PlanoQuadroLivro curso={cursoId} pdf={t.pdf} quadro={t.quadro} /></div></div>}
    </PlanoCamada>
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

// O Dr. EurekIA: cientista de jaleco, óculos de proteção na testa e balão de ensaio. O desenho é um texto SVG (e não JSX)
// para as bolinhas dos exercícios, que o index.html monta direto no DOM, usarem exatamente o mesmo. Abaixo de 44 px saem
// o balão, o bolso e os brilhos, para o rosto continuar nítido nas bolinhas pequenas.
let EUREKIA_SEQ = 0;
function eurekiaBrilho(x, y, s) {
  return `<path d="M${x} ${y - s} l${s * .28} ${s * .72} ${s * .72} ${s * .28} -${s * .72} ${s * .28} -${s * .28} ${s * .72} -${s * .28} -${s * .72} -${s * .72} -${s * .28} ${s * .72} -${s * .28}z" fill="#FDE047"/>`;
}
function eurekiaSvg(size) {
  const grande = size >= 44, N = '#1E1B4B', id = 'eu' + (EUREKIA_SEQ++);
  let s = '';
  if (grande) s += eurekiaBrilho(52, 12, 5) + eurekiaBrilho(10, 24, 3.4);
  s += `<path d="M28 40 H36 V50 H28Z" fill="#E8A877"/>`;
  s += `<path d="M7 67 C7 53 16 47.5 27 46.5 L37 46.5 C48 47.5 57 53 57 67Z" fill="#fff" stroke="${N}" stroke-width="2" stroke-linejoin="round"/>`;
  s += `<path d="M27 46.8 L32 58 L37 46.8Z" fill="#FBBF24"/>`;
  s += `<path d="M26.6 46.4 L31.2 59 L23.4 54.2 L20.4 48.6Z" fill="#fff" stroke="${N}" stroke-width="1.6" stroke-linejoin="round"/>`;
  s += `<path d="M37.4 46.4 L32.8 59 L40.6 54.2 L43.6 48.6Z" fill="#fff" stroke="${N}" stroke-width="1.6" stroke-linejoin="round"/>`;
  if (grande) {
    s += `<rect x="42" y="56" width="8" height="8" rx="1.3" fill="#fff" stroke="${N}" stroke-width="1.4"/>`;
    s += `<path d="M44.2 56 V52.6" stroke="#EF4444" stroke-width="1.8" stroke-linecap="round"/><path d="M47.4 56 V51.8" stroke="#3B82F6" stroke-width="1.8" stroke-linecap="round"/>`;
  }
  s += `<circle cx="19.4" cy="32.5" r="2.8" fill="#F2B98C" stroke="${N}" stroke-width="1.6"/><circle cx="44.6" cy="32.5" r="2.8" fill="#F2B98C" stroke="${N}" stroke-width="1.6"/>`;
  s += `<ellipse cx="32" cy="31.6" rx="12.8" ry="13.7" fill="#F7C59F" stroke="${N}" stroke-width="1.9"/>`;
  s += `<path d="M19 30.5 C15.8 21 19.6 12.2 28 10.8 C31 7.4 38.4 8.2 40.4 10.8 C48.2 12.4 50.6 22 45 30.5 C44.2 25.8 41.6 22.8 37.6 22 C34 23.2 30 23.2 26.4 22 C22.4 22.8 19.8 25.8 19 30.5Z" fill="#4A2C17" stroke="${N}" stroke-width="1.9" stroke-linejoin="round"/>`;
  s += `<path d="M26.6 13.4 Q31 11.2 35.6 12.4" stroke="#8A5530" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M18.6 20.8 Q32 15.8 45.4 20.8" stroke="${N}" stroke-width="6.2" fill="none"/><path d="M18.6 20.8 Q32 15.8 45.4 20.8" stroke="#F97316" stroke-width="3.8" fill="none"/>`;
  s += `<circle cx="26.2" cy="19.8" r="5.4" fill="#A5F3FC" stroke="${N}" stroke-width="1.9"/><circle cx="37.8" cy="19.8" r="5.4" fill="#A5F3FC" stroke="${N}" stroke-width="1.9"/>`;
  s += `<path d="M23.4 17.8 Q24.8 16.4 26.8 16.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/><path d="M35 17.8 Q36.4 16.4 38.4 16.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="27.4" cy="31.8" r="1.9" fill="${N}"/><circle cx="36.6" cy="31.8" r="1.9" fill="${N}"/><circle cx="28" cy="31.1" r=".6" fill="#fff"/><circle cx="37.2" cy="31.1" r=".6" fill="#fff"/>`;
  s += `<path d="M24.4 28.2 Q27.4 26.6 30 27.8" stroke="#4A2C17" stroke-width="1.4" fill="none" stroke-linecap="round"/><path d="M33.6 27.8 Q36.2 26.6 39.6 28.2" stroke="#4A2C17" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  s += `<circle cx="24" cy="36.2" r="2.3" fill="#F87171" opacity=".38"/><circle cx="40" cy="36.2" r="2.3" fill="#F87171" opacity=".38"/>`;
  s += `<path d="M26.6 38.4 Q32 45.4 37.4 38.4Z" fill="#9F1239" stroke="${N}" stroke-width="1.4" stroke-linejoin="round"/><path d="M27.8 38.9 Q32 40.6 36.2 38.9 L35.8 40.1 Q32 41.6 28.2 40.1Z" fill="#fff"/>`;
  if (grande) {
    s += `<path d="M10.6 42 L10.6 48 L5 58 Q3.8 61 7 61 L19 61 Q22.2 61 21 58 L15.4 48 L15.4 42Z" fill="#ECFEFF" stroke="${N}" stroke-width="1.7" stroke-linejoin="round"/>`;
    s += `<path d="M7.2 54.2 L18.8 54.2 L21 58.2 Q22 60.2 19 60.2 L7 60.2 Q4 60.2 5 58.2Z" fill="#A3E635"/>`;
    s += `<circle cx="10.5" cy="57" r="1.1" fill="#fff"/><circle cx="14.5" cy="58.2" r=".9" fill="#fff"/><circle cx="13.2" cy="51" r="1" fill="#A3E635" stroke="${N}" stroke-width=".6"/>`;
    s += `<path d="M9.6 41.6 H16.4" stroke="${N}" stroke-width="2.2" stroke-linecap="round"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true" style="display:block"><defs><clipPath id="c${id}"><circle cx="32" cy="32" r="32"/></clipPath><radialGradient id="g${id}" cx="35%" cy="22%" r="90%"><stop offset="0" stop-color="#8B5CF6"/><stop offset="1" stop-color="#5B21B6"/></radialGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g${id})"/><g clip-path="url(#c${id})">${s}</g></svg>`;
}
function EurekiaAvatar({ size = 54 }) {
  const html = React.useMemo(() => eurekiaSvg(size), [size]);
  return <span aria-hidden="true" style={{ display: 'block', width: size, height: size, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
}

// O Dr. EurekIA em miniatura, para o cabeçalho das atividades (ao lado do X).
function EurekiaMini({ onClick }) {
  return <button onClick={onClick} aria-label="Perguntar ao Dr. EurekIA" title="Perguntar ao Dr. EurekIA" style={{ width: 34, height: 34, padding: 0, border: 0, borderRadius: '50%', background: 'none', cursor: 'pointer', flexShrink: 0, boxShadow: '0 3px 8px rgba(109,40,217,.35)' }}><EurekiaAvatar size={34} /></button>;
}

// A pergunta que vai para a IA quando o aluno toca na bolinha de um exercício: o que ele escreveu + o enunciado + o
// pedido de explicar sem dar a resposta. O servidor corta a pergunta em 400 caracteres, então tudo é medido aqui.
function PlanoCorta(s, n) {
  s = String(s || '').replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}
function PlanoPerguntaDoExercicio(texto, ex) {
  const fim = ' Explique o que ele pede e como pensar, mas NÃO dê a resposta.';
  const enun = ex.enunciado && ex.enunciado !== ex.item ? PlanoCorta(ex.enunciado, 110) : '';
  const cab = `${PlanoCorta(texto, 120)}${enun ? ` Enunciado: “${enun}”` : ''} Exercício: “`;
  return `${cab}${PlanoCorta(ex.item, Math.max(40, 398 - cab.length - 1 - fim.length))}”${fim}`;
}

// `sugestao`: pergunta já escrita no campo (a da apresentação do Dr. EurekIA, "Experimentar agora").
// `exercicio`: {enunciado, item} da bolinha de um exercício; vai junto na 1ª pergunta e aparece num cartão acima da conversa.
// `previa`: a prévia da página do livro como texto (PlanoPreviaTexto); vai junto em TODAS as perguntas, para a IA saber o objetivo da página.
function PlanoPerguntar({ cfg, student, contexto, onAsk, onClose, z, sugestao, exercicio, previa }) {
  const [texto, setTexto] = React.useState(sugestao || ''); const [msgs, setMsgs] = React.useState([]); const [pensando, setPensando] = React.useState(false);
  const fimRef = React.useRef(null);
  const semIA = cfg.assistente === false;   // o professor desligou o assistente deste aluno (janela do plano no painel)
  React.useEffect(() => { if (fimRef.current) fimRef.current.scrollIntoView({ block: 'end' }); }, [msgs, pensando]);
  const enviar = async () => {
    const pergunta = texto.trim(); if (!pergunta || pensando) return;
    // Na 1ª pergunta de um exercício o enunciado vai junto; o aluno só vê o que escreveu (o cartão acima mostra o exercício).
    const enviada = exercicio && msgs.length === 0 ? PlanoPerguntaDoExercicio(pergunta, exercicio) : pergunta;
    setMsgs(m => [...m, { de: 'eu', x: pergunta, enviada }]); setTexto(''); setPensando(true);
    try {
      let r;
      if (cfg.previa || !onAsk) { await new Promise(res => setTimeout(res, 900)); r = cfg.espelho ? { resposta: 'Você está no **espelho**: é assim que a EurekIA aparece para o aluno. Aqui ela não responde de verdade e a pergunta não é gravada.' } : { resposta: 'Boa pergunta! Depois de **do/does/don’t/doesn’t** o verbo principal fica sempre na forma base: *Does she work?* (e não *Does she works?*).\n\n(Resposta de exemplo — o assistente de verdade ainda não está ligado.)' }; }
      else {
        // A conversa segue: manda a última pergunta e resposta para a IA entender um "e no passado?".
        const ultimaIA = [...msgs].reverse().find(m => m.de === 'ia' && !m.erro);
        r = await onAsk(enviada, contexto, ultima && ultimaIA ? { pergunta: ultima.enviada || ultima.x, resposta: ultimaIA.x } : null, previa || '');
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><EurekiaAvatar size={40} /><div><div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>Dr. EurekIA</div><div style={{ fontSize: 11.5, fontWeight: 700, color: '#6D28D9' }}>Tem uma dúvida de inglês?</div></div></div>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#64748B', margin: '2px 0 12px' }}>{contexto ? `Sobre: ${contexto}` : 'Pergunte sobre o que está estudando em inglês.'}</div>
      {semIA ? <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 14, margin: '0 0 12px', fontSize: 13.5, fontWeight: 600, color: '#475569', lineHeight: 1.5 }}>Para tirar dúvidas, fale direto com o César pelo WhatsApp. Ele responde assim que puder.</div> : <>
      <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, padding: 10, minHeight: 110, maxHeight: 280, overflowY: 'auto' }}>
        {exercicio && <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '9px 11px', margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.45, color: '#4C1D95', fontWeight: 600, overflowWrap: 'anywhere' }}><div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .4, textTransform: 'uppercase', color: '#6D28D9', marginBottom: 2 }}>Exercício</div>{exercicio.enunciado && exercicio.item !== exercicio.enunciado && <div style={{ color: '#64748B', marginBottom: 3 }}>{PlanoCorta(exercicio.enunciado, 160)}</div>}<div>{PlanoCorta(exercicio.item, 220)}</div></div>}
        {msgs.length === 0 && exercicio && <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', padding: 6 }}>A pergunta já está escrita: toque em <b>Enviar</b> e o Dr. EurekIA explica o que o exercício pede, <b>sem entregar a resposta</b>.</div>}
        {msgs.length === 0 && sugestao && !exercicio && <div style={{ fontSize: 13, fontWeight: 700, color: '#5B21B6', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '9px 11px', margin: '0 0 8px', lineHeight: 1.45 }}>{previa ? <>💡 A pergunta já está escrita: toque em <b>Enviar</b> e o Dr. EurekIA explica o que você vai aprender nesta página.</> : <>💡 Que tal começar por aqui? A pergunta já está escrita: toque em <b>Enviar</b> e veja o que o Dr. EurekIA sabe sobre os seus estudos.</>}</div>}
        {msgs.length === 0 && !exercicio && <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', padding: 6 }}>Escreva a sua dúvida de inglês abaixo. O assistente olha as suas últimas aulas e atividades para explicar, em português, com exemplos em inglês. Se precisar do César, toque em WhatsApp.</div>}
        {msgs.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.de === 'eu' ? 'flex-end' : 'flex-start', margin: '6px 0' }}><div style={{ maxWidth: '86%', padding: '9px 12px', borderRadius: 14, fontSize: 13.5, fontWeight: 600, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: m.de === 'eu' ? '#7C3AED' : m.erro ? '#FEF2F2' : '#fff', color: m.de === 'eu' ? '#fff' : '#0F172A', border: m.de === 'eu' ? 0 : '1px solid #E2E8F0' }}>{m.de === 'ia' ? <PlanoMd x={m.x} /> : m.x}</div></div>)}
        {pensando && <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B', padding: 6 }}>O Dr. EurekIA está pensando…</div>}
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

/* ───────── Gramática: todas as explicações das unidades já liberadas, num lugar só (caderno de consulta) ───────── */
function PlanoGramaticaLista({ cfg, feitas, onAbrir, onClose }) {
  const [itens, setItens] = React.useState(null); const [erro, setErro] = React.useState(false);
  React.useEffect(() => {
    let vivo = true; setItens(null); setErro(false);
    const un = cfg.unidadesLista || [];
    Promise.all([PlanoCarregarDoc(cfg.cursoId, ['cursos', cfg.cursoId]), ...un.map(x => PlanoCarregarDoc(`${cfg.cursoId}/${x.id}`, ['cursos', cfg.cursoId, 'unidades', x.id]))])
      .then(([indice, ...docs]) => {
        if (!vivo) return;
        // Cada unidade passa pelo mesmo filtro do Caminho (tarefa tirada, só a explicação tirada, página sem exercícios).
        setItens(un.map((x, k) => (docs[k] ? { u: x, tarefas: PlanoCfgDoCurso(cfg, indice, { ...docs[k], id: x.id }, cfg.cursoRef, () => {}).pacotes[0].tarefas.filter(t => t.tipo === 'explicacao') } : null)).filter(x => x && x.tarefas.length));
      }).catch(() => { if (vivo) setErro(true); });
    return () => { vivo = false; };
  }, [cfg.cursoId, cfg.unidadesLista]);
  const msg = (x, cor) => <div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: cor || '#64748B' }}>{x}</div>;
  return (
    <PlanoCamada titulo="📘 Gramática" sub="Todas as explicações das unidades liberadas" onClose={onClose}>
      {erro ? msg('Não consegui abrir agora. Confira a internet e tente de novo.', '#B91C1C')
        : !itens ? msg('Abrindo…')
        : !itens.length ? msg('Ainda não há explicações nas unidades liberadas.')
        : <>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', lineHeight: 1.5, margin: '0 2px 4px' }}>Toque numa explicação para estudar de novo, quando quiser: antes da aula ou quando travar numa atividade.</div>
          {itens.map(({ u: x, tarefas }) => <div key={x.id}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: .7, color: '#0369A1', margin: '18px 2px 7px' }}>UNIT {x.n} · {String(x.titulo).toUpperCase()}</div>
            {tarefas.map(t => <button key={t.id} onClick={() => onAbrir(t)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '11px 13px', marginBottom: 8, fontFamily: 'inherit', cursor: 'pointer' }}>
              <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 20, color: '#fff', background: feitas[t.id] ? 'linear-gradient(150deg,#22C55E,#15803D)' : 'linear-gradient(150deg,#38BDF8,#0284C7)' }}>{feitas[t.id] ? '✓' : '💡'}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0F172A', lineHeight: 1.25 }}>{String(t.titulo).replace(/^Explicação:\s*/, '')}</span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#64748B', marginTop: 2 }}>{t.sub} · livro p. {t.pagina}</span>
              </span>
              <span style={{ color: '#94A3B8', fontSize: 18, fontWeight: 800 }}>›</span>
            </button>)}
          </div>)}
        </>}
    </PlanoCamada>
  );
}

/* ───────── o conteúdo do plano (troca o miolo do app) ───────── */
function PlanoConteudoBase({ tab, onTab, cfg, student, posaulas, activities, slots, onOpenPost, onAsk, mirror }) {
  const uid = student.uid || 'x';
  const [feitas, marcar, zerar] = usePlanoFeitas(uid, !cfg.previa);
  const chaveBV = `plano-boasvindas-v1-${uid}`;
  const [bv, setBv] = React.useState(() => { try { return !localStorage.getItem(chaveBV); } catch (e) { return false; } });
  const [tarefa, setTarefa] = React.useState(null);
  const [aula, setAula] = React.useState(null);
  const [duvida, setDuvida] = React.useState(null);
  const [gram, setGram] = React.useState(false);   // lista "Gramática" aberta
  const [aviso, setAviso] = React.useState('');
  const nome = student.firstName || String(student.name || '').split(' ')[0] || 'Olá';
  const ativOk = activities.length > 0 && activities.every(a => a.finalizada || a.status === 'corrected');
  const avisar = x => { setAviso(x); setTimeout(() => setAviso(''), 2200); };
  const u = cfg.unidade;
  // Contexto da fala gravada (vocabulário e exercício de falar). Chaves vindas do livro (cursos/{id}); `teste` = prévia do painel ou espelho: nada é gravado.
  const falaCtx = React.useMemo(() => ({
    vocab: !!(cfg.vocabPronuncia || cfg.forcaFala), falas: !!(cfg.gravarFalas || cfg.forcaFala), teste: !!cfg.previa || !!mirror,
    uid, marcar, feitas, curso: cfg.cursoId || '', unidade: (cfg.unidade && cfg.unidade.id) || '', tarefaId: tarefa ? tarefa.id : '',
  }), [cfg, mirror, uid, marcar, feitas, tarefa]);

  const abrirTarefa = (t, estado) => {
    if (estado === 'trancada') { const prox = cfg.aulas.find(a => !a.feita); avisar(`🔒 Libera depois da aula${prox ? ' de ' + PlanoDataCurta(prox.data) : ''}.`); return; }
    if (t.tipo === 'atividade') { onTab('atividades'); avisar('✏️ Faça as atividades e toque em Corrigir.'); return; }
    setTarefa(t);
  };
  const concluir = (id, extra) => { marcar(id); if (extra) marcar(extra); setTarefa(null); avisar(extra ? '🏅 Selo conquistado!' : '✅ Tarefa concluída!'); };
  const fechar = () => setTarefa(null);
  // No espelho (o professor olhando o app do aluno) a EurekIA aparece, mas só avisa: a pergunta iria para a conta do professor.
  const avisarEspelho = () => avisar('👁 Modo espelho — somente leitura');
  // `sugestao`: pergunta já escrita (a da prévia da página). O texto da prévia da tarefa aberta vai SEMPRE junto, pelo botão que for
  // (o 💡 do cabeçalho também), para a IA saber em que página ela está. O typeof protege dos botões que passam o clique (onClick={onAsk}).
  const perguntar = sugestao => { if (mirror) { avisarEspelho(); return; } setDuvida({ contexto: tarefa ? tarefa.titulo : '', previa: PlanoPreviaTexto(tarefa), sugestao: typeof sugestao === 'string' ? sugestao : '' }); };
  const f = () => concluir(tarefa.id);
  const enviarResumo = texto => { marcar('resumo:' + tarefa.id, { texto, em: new Date().toISOString() }); if (PlanoVideoFinal(tarefa)) concluir(tarefa.id); };   // vídeo com texto: só grava a resposta e libera o texto; ela conclui depois

  return (
    <PlanoFalaCtx.Provider value={falaCtx}>
      <style>{PLANO_CSS}</style>
      {tab === 'caminho' && <PlanoCaminho cfg={cfg} feitas={feitas} ativOk={ativOk} onTarefa={abrirTarefa} onAula={setAula} onComoFunciona={() => setBv(true)} onGramatica={cfg.cursoId ? () => setGram(true) : null} />}
      {tab === 'atividades' && slots.atividades}
      {tab === 'aulas' && <PlanoAulasLista posaulas={posaulas} onOpenPost={onOpenPost} />}
      {tab === 'perfil' && <>
        {slots.perfil}
        {cfg.previa && <div style={{ padding: '0 16px 20px' }}><button className="plano-btn sec" onClick={() => { zerar(); try { localStorage.removeItem(chaveBV); } catch (e) {} setBv(true); }}>↺ Reiniciar a prévia do plano</button></div>}
      </>}

      {!tarefa && !aula && !duvida && !gram && tab !== 'perfil' &&
        <button onClick={() => (mirror ? avisarEspelho() : setDuvida({ contexto: '' }))} aria-label="Perguntar ao Dr. EurekIA" style={{ position: 'fixed', bottom: 'calc(84px + env(safe-area-inset-bottom, 0px))', right: 'max(16px, calc(50vw - 224px))', zIndex: 300, width: 54, height: 54, borderRadius: '50%', border: 0, padding: 0, background: 'none', boxShadow: '0 10px 24px rgba(109,40,217,.4)', cursor: 'pointer' }}><EurekiaAvatar size={54} /></button>}

      {gram && <PlanoGramaticaLista cfg={cfg} feitas={feitas} onAbrir={setTarefa} onClose={() => setGram(false)} />}
      {tarefa && tarefa.tipo === 'livro' && (tarefa.pdf
        ? <PlanoTarefaPagina t={tarefa} cursoId={cfg.cursoId} uid={uid} semGravar={!!(cfg.previa || mirror)} onFeita={f} onClose={fechar} onAsk={perguntar} />
        : <PlanoTarefaLivro t={tarefa} unidade={u} onFeita={f} onClose={fechar} onAsk={perguntar} />)}
      {tarefa && tarefa.tipo === 'explicacao' && <PlanoTarefaExplicacao t={tarefa} cursoId={cfg.cursoId} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'revisao' && <PlanoCamada titulo={tarefa.titulo} sub={tarefa.sub} onClose={fechar}><div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>📝 Esta revisão ainda está sendo montada.</div></PlanoCamada>}
      {tarefa && tarefa.tipo === 'posaula' && <PlanoTarefaPosaula t={tarefa} unidade={u} posaulas={posaulas} onOpenPost={onOpenPost} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'estudo' && <PlanoEstudo estudo={u.estudos[tarefa.ref]} unidade={u} posaulas={posaulas} onOpenPost={onOpenPost} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'vocab' && <PlanoVocab vocab={u.vocab[tarefa.ref]} titulo={tarefa.titulo} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'jogo' && <PlanoTarefaJogo t={tarefa} unidade={u} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'video' && <PlanoTarefaVideo t={tarefa} onFeita={f} onResumo={enviarResumo} resumoAnterior={feitas['resumo:' + tarefa.id] && feitas['resumo:' + tarefa.id].texto} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'extra' && <PlanoTarefaExtra t={tarefa} unidade={u} onAbrirExtras={() => { fechar(); onTab('atividades'); }} onFeita={f} onClose={fechar} onAsk={perguntar} />}
      {tarefa && tarefa.tipo === 'teste' && <PlanoTarefaTeste t={tarefa} unidade={u} onFeita={() => concluir(tarefa.id, 'selo:' + u.id)} onClose={fechar} onAsk={perguntar} />}
      {aula && <PlanoAulaFolha aula={aula} student={student} cfg={cfg} onClose={() => setAula(null)} />}
      {duvida && <PlanoPerguntar cfg={cfg} student={student} contexto={duvida.contexto} previa={duvida.previa} sugestao={duvida.sugestao || undefined} onAsk={cfg.previa ? null : onAsk} onClose={() => setDuvida(null)} />}
      {bv && <PlanoBoasVindas cfg={cfg} nome={nome} onFim={() => { try { localStorage.setItem(chaveBV, '1'); } catch (e) {} setBv(false); }} />}
      {aviso && <div style={{ position: 'fixed', left: '50%', bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 700, whiteSpace: 'nowrap', animation: 'planoSurge .2s' }}>{aviso}</div>}
    </PlanoFalaCtx.Provider>
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
  // A explicação de gramática é presa à atividade da página: sai junto se a tarefa foi tirada ou ficou sem nenhum exercício
  // (aí a página fica só para ler). Também some se o professor tirou só a explicação.
  const porId = {}; (un.tarefas || []).forEach(t => { porId[t.id] = t; });
  const paiVivo = id => { const p = porId[id]; return !p || (!oc.has(id) && (!(p.exercicios || []).length || p.exercicios.some(e => !oc.has(e.id)))); };
  const tarefas = (un.tarefas || []).filter(t => !oc.has(t.id) && (t.tipo !== 'explicacao' || paiVivo(t.para)))
    .map(t => {
      const n = t.exercicios ? { ...t, exercicios: t.exercicios.filter(e => !oc.has(e.id) && !(e.bk && oc.has(`${t.id}:${e.bk}`))).map(exercicio) } : { ...t };   // item de um exercício do livro tirado também sai (mesmo se foi acrescentado depois)
      if (t.tipo === 'jogo' && t.formato === 'memoria' && t.jogo) n.jogo = t.jogo.map(par);
      // exercícios do livro tirados no painel (chave "tarefa:bloco" em ocultos): a região sai da imagem da página
      if (t.regioes) n.cobrir = t.regioes.filter(r => oc.has(`${t.id}:${r.id}`)).map(r => ({ y0: r.y0, y1: r.y1 }));
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
  // Chaves de fala do livro (sempre desligadas quando ausentes): vocabPronuncia, gravarFalas e a exigência pronunciaMin (a função é quem aplica).
  const fala = { vocabPronuncia: !!(indice && indice.vocabPronuncia), gravarFalas: !!(indice && indice.gravarFalas), pronunciaMin: indice && typeof indice.pronunciaMin === 'number' ? indice.pronunciaMin : null };
  return { ...cfg, unidade, pacotes, cursoId: ref.id, unidadesLista: lista, onUnidade: setSel, ...fala };
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

/* ───────── prévia do curso no painel (aba Curso): a tarefa do livro como o aluno a vê ─────────
 * index.html?previacurso=u05&tarefa=ID[&ex=EXERCICIO_ID][&ocultos=1]  (só o professor; nada é gravado)
 * É o mesmo código do aluno (PlanoTarefaPagina, PlanoVocab, jogos, vídeo, mini-teste), só que sem o Caminho em volta.
 * Sem `ocultos=1` aparece TUDO (também o que ele marcou para tirar); com `ocultos=1`, os exercícios tirados somem do fluxo. */
function PlanoPreviaCurso({ user }) {
  const q = React.useMemo(() => new URLSearchParams(window.location.search), []);
  const cursoId = q.get('curso') || 'connectivity-1'; const unId = q.get('previacurso'); const tarefaId = q.get('tarefa'); const exId = q.get('ex'); const semOcultos = q.get('ocultos') === '1';
  const admin = PLANO_ADMINS.includes(String((user && user.email) || '').toLowerCase());
  const [dados, setDados] = React.useState(null); const [erro, setErro] = React.useState(''); const [vez, setVez] = React.useState(0); const [aviso, setAviso] = React.useState('');
  React.useEffect(() => {
    if (!admin) return undefined;
    let vivo = true;
    Promise.all([PlanoCarregarDoc(cursoId, ['cursos', cursoId]), PlanoCarregarDoc(`${cursoId}/${unId}`, ['cursos', cursoId, 'unidades', unId])])
      .then(([indice, un]) => { if (!vivo) return; if (!un) setErro('Esta unidade não existe.'); else setDados({ indice, un: { ...un, id: unId } }); })
      .catch(() => { if (vivo) setErro('Não consegui carregar a unidade agora.'); });
    return () => { vivo = false; };
  }, [admin, cursoId, unId]);
  const tela = (x, cor) => <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center', background: '#F6F1EA', fontWeight: 700, color: cor || '#64748B' }}><style>{PLANO_CSS}</style>{x}</div>;
  if (!admin) return tela('Esta prévia é só para o professor.', '#B91C1C');
  if (erro) return tela(erro, '#B91C1C');
  if (!dados) return tela('Abrindo a prévia…');
  // Monta como o Caminho monta, mas SEM esconder nada (ocultos: []), para a prévia mostrar também o que ele está pensando em tirar.
  const cfg = PlanoCfgDoCurso({ previa: true, aulas: [], forcaFala: q.get('falar') === '1' }, dados.indice, { ...dados.un, ocultos: [] }, { id: cursoId, inicial: unId, atual: '' }, () => {});
  const oc = new Set(dados.un.ocultos || []);
  const bruta = cfg.pacotes[0].tarefas.find(x => x.id === tarefaId);
  if (!bruta) return tela('Esta tarefa não aparece para o aluno (ela não tem conteúdo).');
  const tarefa = semOcultos && bruta.exercicios ? { ...bruta, exercicios: bruta.exercicios.filter(e => !oc.has(e.id) && !(e.bk && oc.has(`${bruta.id}:${e.bk}`))), cobrir: (bruta.regioes || []).filter(r => oc.has(`${bruta.id}:${r.id}`)).map(r => ({ y0: r.y0, y1: r.y1 })) } : bruta;
  const u = cfg.unidade;
  const k = exId && tarefa.exercicios ? tarefa.exercicios.findIndex(e => e.id === exId) : -1;
  const abrirEm = exId ? Math.max(0, k) : undefined;
  const recomeca = x => { setAviso(x); setTimeout(() => setAviso(''), 2200); setVez(v => v + 1); };
  const fechar = () => recomeca('↺ Prévia reiniciada');
  const f = () => recomeca('✅ Concluída (na prévia nada é gravado)');
  const falaCtx = { vocab: !!(cfg.vocabPronuncia || cfg.forcaFala), falas: !!(cfg.gravarFalas || cfg.forcaFala), teste: true, uid: 'previa', marcar: () => {}, feitas: {}, curso: cursoId, unidade: unId, tarefaId: tarefa.id };
  return (
    <PlanoFalaCtx.Provider value={falaCtx}>
      <style>{PLANO_CSS}</style>
      <div style={{ position: 'fixed', inset: 0, background: '#F6F1EA' }} />
      <React.Fragment key={vez}>
        {tarefa.tipo === 'livro' && (tarefa.pdf
          ? <PlanoTarefaPagina t={tarefa} cursoId={cursoId} semGravar onFeita={f} onClose={fechar} abrirEm={abrirEm} />
          : <PlanoTarefaLivro t={tarefa} unidade={u} onFeita={f} onClose={fechar} />)}
        {tarefa.tipo === 'explicacao' && <PlanoTarefaExplicacao t={tarefa} cursoId={cursoId} onFeita={f} onClose={fechar} />}
        {tarefa.tipo === 'revisao' && <PlanoCamada titulo={tarefa.titulo} sub={tarefa.sub} onClose={fechar}><div style={{ background: '#fff', borderRadius: 18, padding: 24, textAlign: 'center', fontWeight: 700, color: '#64748B' }}>📝 Esta revisão ainda está sendo montada.</div></PlanoCamada>}
        {tarefa.tipo === 'vocab' && <PlanoVocab vocab={u.vocab[tarefa.ref]} titulo={tarefa.titulo} onFeita={f} onClose={fechar} />}
        {tarefa.tipo === 'jogo' && <PlanoTarefaJogo t={tarefa} unidade={u} onFeita={f} onClose={fechar} />}
        {tarefa.tipo === 'video' && <PlanoTarefaVideo t={tarefa} onFeita={f} onClose={fechar} />}
        {tarefa.tipo === 'extra' && <PlanoTarefaExtra t={tarefa} unidade={u} onAbrirExtras={fechar} onFeita={f} onClose={fechar} />}
        {tarefa.tipo === 'teste' && <PlanoTarefaTeste t={tarefa} unidade={u} onFeita={f} onClose={fechar} />}
      </React.Fragment>
      {aviso && <div style={{ position: 'fixed', left: '50%', bottom: 'calc(40px + env(safe-area-inset-bottom, 0px))', transform: 'translateX(-50%)', background: '#0F172A', color: '#fff', padding: '10px 18px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, zIndex: 700, whiteSpace: 'nowrap', animation: 'planoSurge .2s' }}>{aviso}</div>}
    </PlanoFalaCtx.Provider>
  );
}
