import assert from 'node:assert/strict';
import { problemasProducaoOral } from '../atividades.js';

const prompt = (id, isQuestion = false) => ({
  id,
  prompt: `Fala ${id}`,
  hint: `Ideia ${id}`,
  isQuestion,
  maxSeconds: 30,
});

const oralPart = () => ({
  id: 'part-1',
  oralExercise: {
    id: 'oral-1',
    instruction: 'Grave separadamente.',
    referenceUrl: '',
    referenceLabel: '',
    prompts: [prompt('clip-1'), prompt('clip-2', true), prompt('clip-3')],
  },
});

const textActivity = () => ({ parts: [{ id: 'part-1' }] });
const oralActivity = () => ({ parts: [oralPart()] });

assert.deepEqual(
  problemasProducaoOral([oralActivity(), textActivity(), oralActivity()]),
  [],
  'duas das três atividades regulares devem ser aceitas',
);

assert.match(
  problemasProducaoOral([textActivity(), textActivity(), textActivity()])[0],
  /exatamente 2 das 3 atividades/,
  'um lote padrão sem áudio deve ser bloqueado',
);

const invalid = oralActivity();
invalid.parts[0].oralExercise.prompts[0].maxSeconds = 45;
assert.match(
  problemasProducaoOral([invalid, textActivity(), oralActivity()]).join(' '),
  /campos obrigatórios inválidos/,
  'limites acima de 30 segundos devem ser bloqueados',
);

const review = { ...textActivity(), review90: true };
assert.deepEqual(
  problemasProducaoOral([oralActivity(), textActivity(), oralActivity(), review]),
  [],
  'a atividade extra de revisão não altera a distribuição do lote regular',
);

console.log('Validação de produção oral: OK');
