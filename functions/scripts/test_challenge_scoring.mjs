import assert from 'node:assert/strict';
import { challengeInternals } from '../challenge.js';

const { scoreWrittenAnswer, withTeacherScore, monthKeyForWeek } = challengeInternals;

const cases = [
  {
    name:'ignora maiúsculas e pontuação opcional',
    answer:'I HOPE NOT!',
    accepted:['I hope not.'],
    expected:100,
  },
  {
    name:'aceita conector natural entre duas respostas',
    answer:'an hour and a university',
    accepted:['an hour / a university'],
    expected:100,
  },
  {
    name:'aceita substantivo mais específico',
    answer:'a basketball game',
    accepted:['a game'],
    expected:100,
  },
  {
    name:'aceita o alvo dentro da frase completa',
    answer:"This novel is so gripping that I stayed up until 3 a.m. reading — I just can't put it down",
    accepted:["can't put it down"],
    expected:100,
  },
  {
    name:'aceita alvo afirmativo em outra oração mesmo com negação no contexto',
    answer:"I haven't tried the cake yet, but based on its appearance, it looks delicious.",
    accepted:['it looks delicious'],
    expected:100,
  },
  {
    name:'não aceita inversão de polaridade',
    answer:'I do not like it',
    accepted:['I like it'],
    maximum:99,
  },
];

for (const item of cases) {
  const score = scoreWrittenAnswer(item.answer, item.accepted);
  if (item.expected != null) assert.equal(score, item.expected, item.name);
  if (item.maximum != null) assert.ok(score <= item.maximum, `${item.name}: recebeu ${score}`);
}

assert.equal(monthKeyForWeek('2026-08-17'), '2026-08', '17/08 fica na 3ª semana de agosto');
assert.equal(monthKeyForWeek('2026-08-24'), '2026-08', '24/08 fica na 4ª semana de agosto');
assert.equal(monthKeyForWeek('2026-08-31'), '2026-09', '31/08 abre a 1ª semana de setembro');
assert.equal(monthKeyForWeek('2026-09-28'), '2026-10', '28/09 abre a 1ª semana de outubro');

assert.deepEqual(withTeacherScore({ score:35, correct:false }, 90), {
  score:90, correct:false, teacherScore:90, teacherReviewed:true, manualScore:true, parcial:true,
  aceitaPeloProfessor:false,
}, 'nota manual parcial fica protegida');
assert.deepEqual(withTeacherScore({ score:90, correct:false, parcial:true }, 100), {
  score:100, correct:true, teacherScore:100, teacherReviewed:true, manualScore:true,
}, '100 pontos vira resposta correta');
assert.deepEqual(withTeacherScore({ score:90, correct:false, parcial:true }, 0), {
  score:0, correct:false, teacherScore:0, teacherReviewed:true, manualScore:true,
  aceitaPeloProfessor:false,
}, 'zero pontos não permanece parcial');
assert.deepEqual(withTeacherScore({ score:35, correct:false }, 45, {
  tag:'erro_foco', reason:'Era o conteúdo principal da aula.', at:'2026-08-27T12:00:00.000Z',
}), {
  score:45, correct:false, teacherScore:45, teacherReviewed:true, manualScore:true,
  teacherScoreTag:'erro_foco', teacherScoreReason:'Era o conteúdo principal da aula.',
  teacherScoreAt:'2026-08-27T12:00:00.000Z', parcial:true, aceitaPeloProfessor:false,
}, 'nota manual guarda o critério pedagógico');

console.log(`OK — ${cases.length} cenários de correção e calendário mensal validados.`);
