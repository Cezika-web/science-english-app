/**
 * Template e prompt da pós-aula.
 *
 * O template original vive na skill `posaula` (uso local do César). Esta é a
 * versão de servidor: sem marca fixa, sem seções específicas de aluno, e com a
 * gravação condicional ao link do YouTube.
 */

/** Escapa texto que vai para dentro do HTML gerado. */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Só existe quando o professor informou o link. Sem link, a seção inteira
// some — nada de botão morto para quem não grava aula.
const SECAO_GRAVACAO = `
        <section>
          <h2 style="margin-bottom:8px;">Gravação da aula</h2>
          <div class="media-row">
            <a class="media-btn" href="[YOUTUBE_LINK]" target="_blank" rel="noopener noreferrer" role="button"
               style="background:linear-gradient(180deg,var(--accent-dark),var(--accent));color:#fff;border:none;width:100%;flex:1 1 100%;min-width:0;box-sizing:border-box;padding:14px 16px;">
              🎥 Assistir gravação
            </a>
          </div>
        </section>
`;

/** Tom clarinho da cor da escola — é o que deixa a página "verde e branca" ou "azul e branca". */
function tom(hex, alpha) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(String(hex || '').trim());
  if (!m) return `rgba(47,134,230,${alpha})`;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Monta o template já com a marca da escola preenchida — assim o modelo só
 * preenche conteúdo e não tem como errar cor, nome ou rodapé.
 */
export function montarTemplate({ escola, aluno, data, youtubeUrl }) {
  const tema = escola.theme || {};
  const accent = tema.accent || '#2f86e6';
  const accentDark = tema.accentDark || '#1f6fd1';
  const nomeEscola = esc(escola.name || '');
  const professor = esc(escola.teacherName || escola.name || '');

  const gravacao = youtubeUrl
    ? SECAO_GRAVACAO.replace('[YOUTUBE_LINK]', esc(youtubeUrl))
    : '';

  // Toda a página é branca + a cor da escola. Nada de azul fixo: quem define
  // é o theme.accent, então a mesma pós-aula sai verde para uma escola e azul
  // para outra.
  const t04 = tom(accent, 0.04);
  const t08 = tom(accent, 0.08);
  const t16 = tom(accent, 0.16);
  const t30 = tom(accent, 0.30);

  const whatsapp = escola.whatsapp
    ? `
          <div style="margin-top:14px;">
            <a class="btn" href="https://wa.me/${esc(escola.whatsapp)}" style="background:#25D366;border-radius:10px;box-shadow:none;">
              💬 Falar comigo no WhatsApp
            </a>
          </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Resumo Pós-Aula — ${esc(aluno.name)} — ${nomeEscola}</title>
  <style>
:root{
  --page-bg: #f6f8fa;
  --card-bg: #fff;
  --accent: ${accent};
  --accent-dark: ${accentDark};
  --green: #36b37e;
  --muted: #6b7280;
  --border: ${t16};
  --card-width: 720px;
}
html,body{ height:100%; margin:0; padding:0; background:var(--page-bg); font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif; }
.wrap{ min-height:100%; display:flex; align-items:flex-start; justify-content:center; padding:48px 20px; }
.card{ width:100%; max-width:var(--card-width); background:var(--card-bg); border-radius:18px; padding:28px; box-shadow:0 6px 22px rgba(33,47,60,0.06); border:1px solid rgba(15,33,64,0.03); }
header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px; }
.badge{ background:linear-gradient(180deg,#fff,${t08}); border:1px solid var(--border); padding:8px 12px; border-radius:999px; color:var(--accent); font-weight:700; font-size:0.85rem; }
h1{ margin:0; font-size:1.3rem; color:#0f1724; }
.meta{ color:var(--muted); font-size:0.92rem; margin-top:6px; }
.actions{ display:flex; gap:10px; }
.btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:none; background:var(--accent); color:#fff; text-decoration:none; font-weight:600; cursor:pointer; }
main{ margin-top:18px; }
section{ margin-top:18px; }
.panel{ background:${t04}; border-radius:12px; padding:16px; border:1px solid var(--border); }
.outline-card{ border-radius:10px; border:1px solid var(--border); padding:16px; background:#fff; }
.vocab-grid{ display:flex; gap:14px; flex-wrap:wrap; margin-top:10px; }
.vocab{ flex:1; min-width:220px; border-radius:10px; padding:14px; border:2px solid ${t30}; background:#fff; }
.vocab.green{ border-color:${t30}; background:${t04}; }
.vocab.yellow{ border-color:${t16}; background:${t08}; }
.vocab h3{ margin:0; font-size:1rem; color:var(--accent-dark); min-width:0; overflow-wrap:anywhere; }
.vocab p{ margin:8px 0 0 0; color:var(--muted); font-size:0.95rem; }
.vocab-head{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
.vocab-say{ flex:0 0 auto; width:40px; height:40px; padding:0; border-radius:50%; cursor:pointer;
  border:1px solid ${t30}; background:${t08}; color:var(--accent-dark); font-size:1rem; line-height:1;
  display:inline-flex; align-items:center; justify-content:center; font-family:inherit; }
.vocab-say:hover{ background:${t16}; }
.vocab-say[data-czk-speaking="true"]{ background:var(--accent); border-color:var(--accent-dark); color:#fff;
  animation:czk-pulse 0.9s ease-in-out infinite; }
@keyframes czk-pulse{ 0%,100%{ transform:scale(1); } 50%{ transform:scale(1.08); } }
@media (prefers-reduced-motion:reduce){ .vocab-say[data-czk-speaking="true"]{ animation:none; } }
.media-row{ display:flex; gap:14px; margin-top:12px; flex-wrap:wrap; }
.media-btn{ background:#fff; border:1px solid var(--border); padding:12px 16px; border-radius:10px; font-weight:700; color:var(--accent); text-decoration:none; display:inline-flex; align-items:center; gap:10px; min-width:200px; justify-content:center; }
.homework{ background:${t08}; border:1px solid ${t30}; border-radius:10px; padding:14px; margin-top:10px; }
.speaking{ margin-top:18px; padding:16px; border-radius:12px; background:linear-gradient(180deg,#fff,${t04}); border:1px solid var(--border); max-width:640px; }
.speaking h2{ margin:0 0 10px 0; font-size:1.05rem; color:#0f1724; }
.talk-table{ width:100%; border-collapse:collapse; overflow:hidden; background:#fff; border:1px solid ${t16}; font-size:0.9rem; }
.talk-table th,.talk-table td{ padding:8px 10px; text-align:left; }
.talk-table th{ background:${t16}; color:var(--accent-dark); font-weight:700; border-bottom:1px solid ${t30}; }
.row-teacher{ background:${t08}; }
.row-student{ background:#F3F4F6; }
.talk-label{ font-weight:700; }
.talk-percent{ font-weight:700; color:#0f1724; }
.talk-time{ color:var(--muted); }
footer{ margin-top:20px; color:var(--muted); font-size:0.9rem; text-align:center; }
@media (max-width:720px){ .card{padding:18px;border-radius:14px;} .vocab-grid,.media-row{flex-direction:column;} }
  </style>
</head>
<body>
  <div class="wrap">
    <article class="card" role="main">

      <header>
        <div>
          <div style="display:flex;gap:10px;align-items:center;">
            <span class="badge">PÓS-AULA</span>
            <h1>[TÍTULO DA AULA]</h1>
          </div>
          <div class="meta" style="margin-top:8px;">
            <strong>Professor:</strong> ${professor} &nbsp;•&nbsp;
            <strong>Aluno:</strong> ${esc(aluno.name)} &nbsp;•&nbsp;
            <strong>Data:</strong> ${esc(data)}
          </div>
        </div>
        <div class="actions">
          <a class="btn" href="#" data-czk-action="print" role="button">Imprimir / Salvar PDF</a>
        </div>
      </header>

      <main>

        <section class="panel">
          <p style="margin:0;font-weight:600;color:var(--accent-dark);">[RESUMO CURTO — 1 ou 2 linhas]</p>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Resumo da Aula</h2>
          <div class="outline-card">
            <p style="margin:0 0 8px 0;">[PARÁGRAFO 1]</p>
            <p style="margin:0 0 8px 0;">[PARÁGRAFO 2]</p>
            <p style="margin:0;">[PARÁGRAFO 3]</p>
          </div>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Key Vocabulary</h2>
          <div class="vocab-grid">
            <div class="vocab">
              <div class="vocab-head">
                <h3>[Palavra 1]</h3>
                <button type="button" class="vocab-say" data-czk-say="[Palavra 1]"
                        aria-label="Ouvir a pronúncia de [Palavra 1]" aria-pressed="false"
                        title="Ouvir [Palavra 1]">&#128266;</button>
              </div>
              <p><em>(pt) [tradução]</em><br><small>[definição e exemplo]</small></p>
            </div>
            <div class="vocab green">
              <div class="vocab-head">
                <h3>[Palavra 2]</h3>
                <button type="button" class="vocab-say" data-czk-say="[Palavra 2]"
                        aria-label="Ouvir a pronúncia de [Palavra 2]" aria-pressed="false"
                        title="Ouvir [Palavra 2]">&#128266;</button>
              </div>
              <p><em>(pt) [tradução]</em><br><small>[definição e exemplo]</small></p>
            </div>
            <div class="vocab yellow">
              <div class="vocab-head">
                <h3>[Palavra 3]</h3>
                <button type="button" class="vocab-say" data-czk-say="[Palavra 3]"
                        aria-label="Ouvir a pronúncia de [Palavra 3]" aria-pressed="false"
                        title="Ouvir [Palavra 3]">&#128266;</button>
              </div>
              <p><em>(pt) [tradução]</em><br><small>[definição e exemplo]</small></p>
            </div>
          </div>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Vocabulário da aula</h2>
          <div class="outline-card">
            <h3 style="margin-top:0;">[Categoria 1]</h3>
            <ul>
              <li><strong>palavra</strong> – tradução</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Frases modelo da aula</h2>
          <div class="outline-card">
            <ul>
              <li>[Frase em inglês] → [tradução ou contexto]</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Correções importantes</h2>
          <div class="outline-card">
            <p style="margin:0 0 10px 0;"><strong>1. [Título do erro]</strong></p>
            <p style="margin:0 0 4px 0;color:#c53030;">❌ "[versão errada]"</p>
            <p style="margin:0 0 10px 0;color:#276749;">✅ <strong>"[versão correta]"</strong> — [explicação]</p>
          </div>
        </section>
${gravacao}
        <section class="speaking" aria-label="Distribuição de fala">
          <h2>Tempo de Fala (Talk Time)</h2>
          <table class="talk-table">
            <thead>
              <tr><th>Quem falou</th><th>Porcentagem</th><th>Duração aproximada</th></tr>
            </thead>
            <tbody>
              <tr class="row-teacher">
                <td><span class="talk-label">${professor} (Professor)</span></td>
                <td><span class="talk-percent">[X]%</span></td>
                <td class="talk-time">~[N] minutos</td>
              </tr>
              <tr class="row-student">
                <td><span class="talk-label">${esc(aluno.name)}</span></td>
                <td><span class="talk-percent">[Y]%</span></td>
                <td class="talk-time">~[M] minutos</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section>
          <h2 style="margin-bottom:8px;">Homework</h2>
          <div class="homework">
            <p style="margin:0 0 8px 0;">📌 <strong>Lição de casa:</strong></p>
            <ul style="margin:0 0 6px 18px;padding:0;font-size:0.94rem;color:var(--muted);">
              <li>[tarefa 1]</li>
              <li>Leia este pós-aula de <strong>2 a 3 vezes</strong> durante a semana.</li>
            </ul>
          </div>${whatsapp}
        </section>

      </main>

      <footer>
        <p style="margin:18px 0 0 0;color:var(--muted);font-size:0.9rem;">
          © ${new Date().getFullYear()} ${nomeEscola} • Conteúdo exclusivo para fins educacionais.
        </p>
      </footer>

    </article>
  </div>

  <!-- ÁUDIO DAS PALAVRAS-CHAVE — uma única função para o pós-aula inteiro.
       Aberto direto: fala aqui mesmo. Dentro do app: pede ao app e quem fala é ele
       (o app remove este script e injeta o próprio, então nada daqui roda por lá). -->
  <script>
  (function(){
    var host = window.parent === window ? null : window.parent;
    var active = null, pendingId = 0, acked = false, fallbackTimer = null, audioEl = null;

    function mark(btn, on){
      if(!btn) return;
      btn.setAttribute('data-czk-speaking', on ? 'true' : 'false');
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
    function clearActive(){ mark(active, false); active = null; }

    function warn(msg){
      var box = document.getElementById('czk-audio-msg');
      if(!box){
        box = document.createElement('div');
        box.id = 'czk-audio-msg';
        box.setAttribute('role', 'status');
        box.style.cssText = 'position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:92vw;'
          + 'background:#FBF7F1;color:#5C4530;border:1px solid #E3D5C3;border-radius:10px;padding:10px 14px;'
          + 'font:600 0.85rem Inter,"Segoe UI",Roboto,Arial,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.12);z-index:99;';
        document.body.appendChild(box);
      }
      box.textContent = msg;
      box.style.display = 'block';
      clearTimeout(warn._t);
      warn._t = setTimeout(function(){ box.style.display = 'none'; }, 4000);
    }

    function stopAll(){
      if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; }
      if(audioEl){ try{ audioEl.pause(); }catch(e){} audioEl = null; }
      try{ if(window.speechSynthesis) window.speechSynthesis.cancel(); }catch(e){}
      if(host){ try{ host.postMessage({ source:'czk-posaula', type:'stop' }, '*'); }catch(e){} }
      clearActive();
    }

    function localSpeak(text, btn){
      var synth = window.speechSynthesis;
      if(!synth || typeof window.SpeechSynthesisUtterance !== 'function'){
        warn('Este aparelho ainda não tem voz em inglês.');
        clearActive();
        return;
      }
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var isPhrase = text.trim().split(/\\s+/).length > 1;
      u.lang = 'en-US'; u.rate = isPhrase ? 0.95 : 0.88; u.pitch = 1;
      function score(v){
        var n = /^en[-_]US/i.test(v.lang) ? 100 : 0;
        if(/natural|neural|premium|enhanced/i.test(v.name)) n += 80;
        if(/samantha|ava/i.test(v.name)) n += 65;
        if(/google.*(us|english)|aria/i.test(v.name)) n += 55;
        if(/zira/i.test(v.name)) n += 35;
        if(v.localService) n += 5;
        return n;
      }
      var en = synth.getVoices().filter(function(v){ return /^en[-_]/i.test(v.lang); });
      var pick = en.sort(function(a,b){ return score(b) - score(a); })[0];
      if(pick) u.voice = pick;
      u.onstart = function(){ mark(btn, true); };
      u.onend = function(){ if(active === btn) clearActive(); };
      u.onerror = function(ev){
        if(ev.error !== 'canceled' && ev.error !== 'interrupted') warn('Não consegui reproduzir o áudio agora.');
        if(active === btn) clearActive();
      };
      synth.speak(u);
    }

    function requestSpeech(text, btn){
      if(!host){ localSpeak(text, btn); return; }
      acked = false;
      var id = ++pendingId;
      try{ host.postMessage({ source:'czk-posaula', type:'speak', id:id, text:text }, '*'); }
      catch(e){ localSpeak(text, btn); return; }
      fallbackTimer = setTimeout(function(){
        if(!acked && active === btn) localSpeak(text, btn);
      }, 700);
    }

    function play(btn){
      var text = (btn.getAttribute('data-czk-say') || '').trim();
      if(!text) return;
      var wasActive = (active === btn);
      stopAll();
      if(wasActive) return;
      active = btn; mark(btn, true);
      // data-czk-audio já aceita um MP3 pronto (voz clonada do professor).
      var url = btn.getAttribute('data-czk-audio');
      if(url && /^https:\\/\\//i.test(url)){
        audioEl = new Audio(url);
        audioEl.onended = function(){ if(active === btn) clearActive(); };
        audioEl.onerror = function(){ if(active === btn) requestSpeech(text, btn); };
        var p = audioEl.play();
        if(p && p.catch) p.catch(function(){ if(active === btn) requestSpeech(text, btn); });
        return;
      }
      requestSpeech(text, btn);
    }

    window.addEventListener('message', function(ev){
      var d = ev.data;
      if(!d || d.source !== 'czk-app' || d.id !== pendingId) return;
      if(d.type === 'speak-ack'){ acked = true; if(fallbackTimer){ clearTimeout(fallbackTimer); fallbackTimer = null; } return; }
      if(d.type === 'speak-start'){ mark(active, true); return; }
      if(d.type === 'speak-end'){ clearActive(); return; }
      if(d.type === 'speak-error'){ warn('Este aparelho ainda não tem voz em inglês.'); clearActive(); }
    });

    document.addEventListener('click', function(ev){
      var t = ev.target;
      if(!t || !t.closest) return;
      var btn = t.closest('[data-czk-say]');
      if(btn){ ev.preventDefault(); play(btn); return; }
      var pr = t.closest('[data-czk-action="print"]');
      if(pr){ ev.preventDefault(); try{ window.print(); }catch(e){} }
    });
  })();
  </script>
</body>
</html>`;
}

export const REGRAS_POS_AULA = `Você é um professor de inglês experiente escrevendo o resumo pós-aula de um
aluno particular, a partir da transcrição da aula. Escreva em português do
Brasil, dirigindo-se ao aluno com respeito e incentivo.

## Sua tarefa

Leia a transcrição inteira com atenção e produza o HTML da pós-aula, usando
EXATAMENTE o template que vem a seguir. Substitua cada marcador [ASSIM] por
conteúdo real extraído da aula. Não invente conteúdo que não aconteceu.

## O que extrair da transcrição

- **Título da aula** — o tema principal, curto e específico.
- **Resumo curto** — 1 ou 2 linhas, o que a aula cobriu.
- **Resumo detalhado** — 2 ou 3 parágrafos narrando o que foi ensinado,
  na ordem em que aconteceu.
- **Key Vocabulary** — 3 palavras/expressões centrais da aula, com
  tradução, definição curta e exemplo.
- **Vocabulário da aula** — lista completa agrupada por categoria ou tema.
  Crie quantas categorias fizerem sentido; use os nomes que couberem à aula.
- **Frases modelo** — sentenças reais ditas na aula, com tradução.
- **Correções** — erros que o aluno cometeu de verdade na transcrição:
  a versão errada, a correta e uma explicação curta e gentil.
- **Talk time** — estimativa de quanto falou o professor e quanto falou o
  aluno, em porcentagem e minutos aproximados.
- **Homework** — 1 ou 2 tarefas concretas ligadas ao que foi estudado.

## Regras

- Devolva **apenas o HTML**, começando em <!DOCTYPE html>. Sem comentários
  seus, sem blocos de código, sem explicação antes ou depois.
- Preserve o CSS, as classes e a estrutura do template exatamente como estão.
  Mude só o conteúdo dentro das tags.
- Cada palavra do Key Vocabulary tem um botão de áudio. Ao trocar [Palavra N]
  pela palavra real, troque também no data-czk-say, no aria-label e no title
  do botão daquela caixa. O data-czk-say leva **somente o inglês** (a
  expressão inteira, se for mais de uma palavra) — nunca a tradução.
- Não apague nem mexa no bloco <script> do fim do <body>: é ele que faz os
  botões de áudio funcionarem. Um só por pós-aula.
- Nunca escreva onclick nem qualquer atributo on...: o app remove esses
  atributos ao exibir a pós-aula.
- Não altere nome do professor, nome do aluno, data, cores nem rodapé — já
  vêm preenchidos corretamente.
- Repita os blocos que precisarem de mais itens (mais palavras de
  vocabulário, mais correções, mais frases). Remova os que não tiverem
  conteúdo na aula — melhor uma seção a menos que uma seção inventada.
- Se a transcrição for curta ou pobre, produza uma pós-aula honesta e mais
  enxuta. Não encha linguiça.
- As cores usam variáveis CSS (var(--accent)). Nunca escreva cor fixa no
  lugar delas.`;
