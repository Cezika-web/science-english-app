// Regra do César (15/10/2026): o aluno só enxerga o prompt e o context. "My ___ are from the UK."
// aceita friends, parents, colleagues…, e o gabarito só tinha colleagues — inglês certo valeu zero.
// Um único texto, usado nos quatro prompts que geram pergunta escrita do Desafio.
export const OPEN_ANSWER_CLARITY =
  'CLAREZA DA PERGUNTA ESCRITA: o aluno só vê o prompt e o context e precisa chegar à resposta sem adivinhar. ' +
  'Antes de fechar cada format="text", teste: com SÓ o que o aluno vê, existe outra palavra ou frase natural em inglês que também completa ou responde corretamente? Se existir, reescreva até sobrar uma só. ' +
  'Lacuna de vocabulário (substantivo, verbo, adjetivo ou advérbio que a gramática não determina): a frase sozinha NUNCA basta. ' +
  'Escreva logo depois da lacuna, entre parênteses, o significado da palavra no idioma do enunciado (ou uma definição curta em inglês, do nível B1 para cima), ' +
  'por exemplo "My ___ (colegas de trabalho) are from the UK."; é proibido "My ___ are from the UK.", em que friends, parents e colleagues servem. ' +
  'O parêntese dá só o sentido da palavra, nunca nome de tempo verbal, estrutura ou regra. ' +
  // 22/10/2026 (Lorena): "The rooms ___ very clean." — a turma estava no passado, mas a frase aceitava are e were.
  'TEMPO DO VERBO NA LACUNA: se a lacuna é um verbo (inclusive ser/estar, ter e auxiliares) e a frase soaria certa no presente, no passado ou em outro tempo, ela NÃO está fechada — ' +
  '"The rooms ___ very clean." aceita are e were, e o aluno não tem como saber qual tempo se pede. ' +
  'Feche com um marcador de tempo escrito DENTRO da própria frase em inglês (yesterday, last week, "two days ago", "When we arrived,", "In 2019,", "every morning", "right now") ' +
  'que deixe só um tempo possível, e coloque o sentido do verbo entre parênteses: "Last week, the rooms ___ (ser/estar) very clean." ' +
  'O marcador faz parte da frase e o aluno ainda escolhe a forma, então não conta como pista gramatical proibida; continua proibido escrever o NOME do tempo no prompt, no context ou no parêntese. ' +
  'Se a pós-aula trabalhou um tempo (por exemplo o passado), a frase precisa deixar esse tempo evidente pelo marcador, sem o aluno ter de adivinhar. ' +
  'Lacuna de gramática (artigo, possessivo, auxiliar, preposição, concordância): o texto precisa admitir uma única forma; se duas formas naturais servirem (por exemplo "her" e "Anna\'s"), liste TODAS em acceptedAnswers. ' +
  'Se não der para fechar o alvo de uma lacuna ou frase, troque por tradução com a frase exata em context, nunca deixe a pergunta aberta.';
