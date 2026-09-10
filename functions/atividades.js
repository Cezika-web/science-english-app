/**
 * Prompt e schema do gerador de atividades.
 * Versão de servidor da skill `alunos-app`, sem nada específico dos alunos do César.
 */

export const REGRAS_ATIVIDADES = `Você é um professor de inglês montando atividades de estudo para um aluno
particular, a partir do conteúdo das pós-aulas dele. As instruções vão em
português do Brasil; os exercícios, em inglês.

## Adapte a dificuldade ao nível (obrigatório)

| Nível | Frases e vocabulário | Gramática típica | Formatos que combinam |
|---|---|---|---|
| A1 | curtas e simples, dia a dia | to be, presente simples, artigos, plurais, there is/are | maioria Completar (com quadro de palavras) e Múltipla escolha (2-3 opções). Pouca escrita. |
| A2 | médias, rotina, comparações | passado simples, comparativos, much/many, can/can't | Completar, Múltipla escolha (3 opções), Correção simples, Tradução curta, 1-2 frases de escrita |
| B1 | mais longas, opinião | presente perfeito, condicional 1, phrasal verbs, conectivos | Correção, Tradução, Reordenar, Escrita (3-5 frases), Compreensão de texto curto |
| B1+/B2 | vocabulário sofisticado, expressões | tempos mistos, voz passiva, reported speech, condicional 2/3 | mais Escrita e Compreensão, correção de erros sutis, tradução complexa |

Quanto mais alto o nível, menos múltipla escolha e mais escrita, correção e
compreensão. Para A1/A2, o contrário.

## Varie os formatos entre as atividades (obrigatório)

Atividades da mesma leva NÃO podem ter a mesma cara. Um formato que aparece
numa atividade não se repete nas outras. Cada atividade tem Part 1 e Part 2,
cobrindo sub-temas diferentes da mesma aula.

Banco de receitas — dê uma diferente a cada atividade, na ordem:

- Receita 1 → Part 1: Arrastar (matching) + Completar · Part 2: Múltipla escolha
- Receita 2 → Part 1: Tradução (PT→EN) · Part 2: Correção de erros
- Receita 3 → Part 1: Reordenar + Múltipla escolha · Part 2: Escrita + Completar
- Receita 4 → Part 1: Verdadeiro/Falso + Completar · Part 2: Compreensão + Tradução

Se houver mais atividades que receitas, continue variando sem repetir a
combinação. Ajuste cada receita ao nível do aluno.

## Regras de formato

- Cada Part usa no máximo DOIS formatos, e a Part 2 usa formatos diferentes da Part 1.
- Use apenas as tags <p>, <ol>, <li>, <strong>, <em>, <br>. Sem classes, sem divs.

## Produção oral (obrigatória)

- No lote padrão de 3 atividades, exatamente 2 atividades precisam ter um
  \`oralExercise\` em uma de suas Parts. A terceira fica sem gravação.
- Cada \`oralExercise\` tem exatamente 3 prompts independentes, ligados ao
  conteúdo real da aula, com até 30 segundos cada.
- A Part com produção oral tem 12 questões respondíveis no HTML + 3 prompts de
  gravação, mantendo 15 questões no total.
- Cada prompt inclui uma dica curta em português, sem entregar uma frase pronta.
- Use \`isQuestion: true\` somente quando o aluno precisar criar uma pergunta.
- Não peça leitura em voz alta, shadowing, repetição ou transcrição. O aluno
  precisa criar a própria resposta oral.

Formatos disponíveis:

- **Completar** — lacuna \`_______\` (com ou sem quadro de palavras).
- **Múltipla escolha** — \`a) ... b) ... c) ...\` na MESMA linha, em texto puro,
  sempre começando em a), de 2 a 4 opções.
- **Verdadeiro/Falso** — \`A frase está correta? a) True b) False\`.
- **Arrastar (matching)** — \`<ol data-match="1">\` com itens \`português | inglês\`.
  O app embaralha e monta o arrasta-e-solta. Ótimo para A1/A2.
- **Correção** — frase errada \`→ _______\`.
- **Tradução** — frase \`→ _______\`.
- **Reordenar** — \`Reordene: name / is / my / Ana → _______\`.
- **Compreensão** — um parágrafo curto em <p> e depois perguntas.
- **Escrita** — parágrafo só com lacunas separadas por <br> vira área de texto.

## Regra de ouro — toda questão precisa ser respondível

O aluno responde dentro do app. Toda questão precisa ter opções \`a) b) c)\`
OU pelo menos uma lacuna \`_______\`. Nunca deixe uma frase sem resposta possível.

❌ \`<li>Traduza: Quanto você cobra por hora?</li>\`
✅ \`<li>Quanto você cobra por hora? → _______________________</li>\`

## Conteúdo

1. **Nunca inclua gabarito ou respostas.**
2. Instruções em português — o aluno estuda sozinho.
3. Emojis nos títulos (📚 🗺️ 🔤 ✍️ 🎯 🔁).
4. Baseie tudo no conteúdo real das pós-aulas: o vocabulário que apareceu, a
   gramática trabalhada e os erros que o aluno cometeu. Não invente tema novo.
5. Se o professor deixar observações, siga-as — elas têm prioridade sobre o padrão.

## De qual pós-aula veio cada atividade (obrigatório)

Para cada atividade, preencha \`sourceIndex\` com o número da pós-aula de onde veio
o conteúdo dela. As pós-aulas chegam numeradas como "Pós-aula 1", "Pós-aula 2",
etc. Se a atividade combinar conteúdo de mais de uma, use a que mais contribuiu.

## Vocabulário da aula

Além das atividades, devolva em "vocabulario" as **3 palavras ou expressões
mais importantes** da aula, cada uma com a tradução. São as que valem a pena o
aluno guardar — não inclua palavras óbvias que ele já domina.`;

export const SCHEMA_ATIVIDADES = {
  type: 'object',
  properties: {
    week: { type: 'string', description: 'Ex: 22 DE JULHO 2026' },
    vocabulario: {
      type: 'array',
      description: 'As 3 palavras-chave da aula, para a lista de vocabulário do aluno',
      items: {
        type: 'object',
        properties: {
          en: { type: 'string', description: 'a palavra ou expressão em inglês' },
          pt: { type: 'string', description: 'a tradução em português' },
        },
        required: ['en', 'pt'],
        additionalProperties: false,
      },
    },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          emoji: { type: 'string' },
          title: { type: 'string' },
          sourceIndex: {
            type: 'integer',
            description: 'Número da pós-aula que originou esta atividade (1 = a primeira do prompt)',
          },
          parts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'part-1 ou part-2' },
                title: { type: 'string' },
                type: { type: 'string', description: 'Vocabulário / Gramática / Correção / Escrita / Tradução' },
                content: { type: 'string', description: 'HTML do exercício' },
                oralExercise: {
                  type: 'object',
                  description: 'Bloco opcional de produção oral. Em um lote de 3 atividades, exatamente 2 devem incluir este objeto.',
                  properties: {
                    id: { type: 'string' },
                    instruction: { type: 'string' },
                    referenceUrl: { type: 'string' },
                    referenceLabel: { type: 'string' },
                    prompts: {
                      type: 'array',
                      minItems: 3,
                      maxItems: 3,
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          prompt: { type: 'string' },
                          hint: { type: 'string' },
                          isQuestion: { type: 'boolean' },
                          maxSeconds: { type: 'integer', minimum: 1, maximum: 30 },
                        },
                        required: ['id', 'prompt', 'hint', 'isQuestion', 'maxSeconds'],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ['id', 'instruction', 'referenceUrl', 'referenceLabel', 'prompts'],
                  additionalProperties: false,
                },
              },
              required: ['id', 'title', 'type', 'content'],
              additionalProperties: false,
            },
          },
        },
        required: ['emoji', 'title', 'sourceIndex', 'parts'],
        additionalProperties: false,
      },
    },
  },
  required: ['week', 'vocabulario', 'activities'],
  additionalProperties: false,
};

/**
 * Protege a publicação contra lotes em que o modelo omitiu ou deformou a
 * produção oral. A regra de distribuição vale para o lote regular padrão;
 * uma atividade extra de revisão de 90 dias não altera essa contagem.
 */
export function problemasProducaoOral(activities) {
  const lista = Array.isArray(activities) ? activities : [];
  const problemas = [];
  const regulares = lista.filter((activity) => activity?.review90 !== true);
  let regularesComOral = 0;

  regulares.forEach((activity, activityIndex) => {
    let temOral = false;
    (activity?.parts || []).forEach((part, partIndex) => {
      if (part?.oralExercise == null) return;
      temOral = true;
      const prompts = part.oralExercise?.prompts;
      if (!Array.isArray(prompts) || prompts.length !== 3) {
        problemas.push(`Atividade ${activityIndex + 1}, parte ${partIndex + 1}: o bloco oral precisa ter exatamente 3 gravações.`);
        return;
      }
      prompts.forEach((prompt, promptIndex) => {
        const limite = Number(prompt?.maxSeconds);
        if (!String(prompt?.prompt || '').trim() || !String(prompt?.hint || '').trim()
          || typeof prompt?.isQuestion !== 'boolean'
          || !Number.isInteger(limite) || limite < 1 || limite > 30) {
          problemas.push(`Atividade ${activityIndex + 1}, parte ${partIndex + 1}, áudio ${promptIndex + 1}: campos obrigatórios inválidos.`);
        }
      });
    });
    if (temOral) regularesComOral++;
  });

  if (regulares.length === 3 && regularesComOral !== 2) {
    problemas.unshift(`O lote padrão precisa ter produção oral em exatamente 2 das 3 atividades; encontrei ${regularesComOral}.`);
  }
  return problemas;
}

/** Tira as tags do HTML da pós-aula — o que importa é o conteúdo, não a marcação. */
export function textoDaPosAula(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}
