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

const SECAO_GRAVACAO = `
        <!-- GRAVAÇÃO — só existe quando há link do YouTube -->
        <section>
          <h2 style="margin-bottom:8px;">Gravação da aula</h2>
          <div class="media-row">
            <a class="media-btn" href="[YOUTUBE_LINK]" target="_blank" rel="noopener noreferrer" role="button"
               style="background:linear-gradient(180deg,var(--accent-dark),var(--accent));color:#fff;border:none;min-width:260px;">
              🎥 Assistir gravação
            </a>
          </div>
        </section>
`;

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
  --page-bg: #f4f7fa;
  --card-bg: #fff;
  --accent: ${accent};
  --accent-dark: ${accentDark};
  --green: #36b37e;
  --muted: #6b7280;
  --border: #e6eef8;
  --card-width: 720px;
}
html,body{ height:100%; margin:0; padding:0; background:var(--page-bg); font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif; }
.wrap{ min-height:100%; display:flex; align-items:flex-start; justify-content:center; padding:48px 20px; }
.card{ width:100%; max-width:var(--card-width); background:var(--card-bg); border-radius:18px; padding:28px; box-shadow:0 6px 22px rgba(33,47,60,0.06); border:1px solid rgba(15,33,64,0.03); }
header{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:8px; }
.badge{ background:linear-gradient(180deg,#fff,#f2fbff); border:1px solid var(--border); padding:8px 12px; border-radius:999px; color:var(--accent); font-weight:700; font-size:0.85rem; }
h1{ margin:0; font-size:1.3rem; color:#0f1724; }
.meta{ color:var(--muted); font-size:0.92rem; margin-top:6px; }
.actions{ display:flex; gap:10px; }
.btn{ display:inline-flex; align-items:center; gap:8px; padding:10px 14px; border-radius:10px; border:none; background:var(--accent); color:#fff; text-decoration:none; font-weight:600; cursor:pointer; }
main{ margin-top:18px; }
section{ margin-top:18px; }
.panel{ background:#fbfdff; border-radius:12px; padding:16px; border:1px solid var(--border); }
.outline-card{ border-radius:10px; border:1px solid var(--border); padding:16px; background:#fff; }
.vocab-grid{ display:flex; gap:14px; flex-wrap:wrap; margin-top:10px; }
.vocab{ flex:1; min-width:220px; border-radius:10px; padding:14px; border:2px solid #dfeefe; background:#fff; }
.vocab.green{ border-color:#c9f3dc; background:#f5fff6; }
.vocab.yellow{ border-color:#fde68a; background:#fffdf0; }
.vocab h3{ margin:0; font-size:1rem; color:#154360; }
.vocab p{ margin:8px 0 0 0; color:var(--muted); font-size:0.95rem; }
.media-row{ display:flex; gap:14px; margin-top:12px; flex-wrap:wrap; }
.media-btn{ background:#fff; border:1px solid var(--border); padding:12px 16px; border-radius:10px; font-weight:700; color:var(--accent); text-decoration:none; display:inline-flex; align-items:center; gap:10px; min-width:200px; justify-content:center; }
.homework{ background:#f3fff6; border:1px solid #d7f5df; border-radius:10px; padding:14px; margin-top:10px; }
.speaking{ margin-top:18px; padding:16px; border-radius:12px; background:linear-gradient(180deg,#fff,#fbfdff); border:1px solid var(--border); max-width:640px; }
.speaking h2{ margin:0 0 10px 0; font-size:1.05rem; color:#0f1724; }
.talk-table{ width:100%; border-collapse:collapse; overflow:hidden; background:#fff; border:1px solid #e1e9f5; font-size:0.9rem; }
.talk-table th,.talk-table td{ padding:8px 10px; text-align:left; }
.talk-table th{ background:#eef4ff; color:#1b3556; font-weight:700; border-bottom:1px solid #dde6fa; }
.row-teacher{ background:#e7f2ff; }
.row-student{ background:#e8f7ef; }
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
          <a class="btn" href="#" onclick="window.print();return false;">Imprimir / Salvar PDF</a>
        </div>
      </header>

      <main>

        <section class="panel">
          <p style="margin:0;font-weight:600;color:#08325a;">[RESUMO CURTO — 1 ou 2 linhas]</p>
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
              <h3>[Palavra 1]</h3>
              <p><em>(pt) [tradução]</em><br><small>[definição e exemplo]</small></p>
            </div>
            <div class="vocab green">
              <h3>[Palavra 2]</h3>
              <p><em>(pt) [tradução]</em><br><small>[definição e exemplo]</small></p>
            </div>
            <div class="vocab yellow">
              <h3>[Palavra 3]</h3>
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
- **Key Vocabulary** — 2 ou 3 palavras/expressões centrais da aula, com
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
- Não altere nome do professor, nome do aluno, data, cores nem rodapé — já
  vêm preenchidos corretamente.
- Repita os blocos que precisarem de mais itens (mais palavras de
  vocabulário, mais correções, mais frases). Remova os que não tiverem
  conteúdo na aula — melhor uma seção a menos que uma seção inventada.
- Se a transcrição for curta ou pobre, produza uma pós-aula honesta e mais
  enxuta. Não encha linguiça.
- As cores usam variáveis CSS (var(--accent)). Nunca escreva cor fixa no
  lugar delas.`;
