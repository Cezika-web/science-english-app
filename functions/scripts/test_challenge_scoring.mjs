import assert from 'node:assert/strict';
import { challengeInternals } from '../challenge.js';

const { scoreWrittenAnswer } = challengeInternals;

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

console.log(`OK — ${cases.length} cenários de correção validados.`);
