import assert from 'node:assert/strict';
import { challengeInternals } from '../challenge.js';

const { prepareManualStudentChallenge, publicChallengeQuestions, validateQuestion } = challengeInternals;

const textQuestion = (id, focus) => ({
  id, type:'text', focus, topic:'Simple Present', prompt:`Escreva a frase ${id}.`,
  context:'Rotina de trabalho.', hint:'', options:[], correctOption:'',
  expected:'I work every day.', acceptedAnswers:['I work every day', 'I work every day.'],
  explanation:'O presente simples descreve rotinas.',
});
const trueFalseQuestion = (id, focus) => ({
  id, type:'multipleChoice', focus, topic:'Simple Present', prompt:'A frase está correta?',
  context:'She works every day.', hint:'',
  options:[{ id:'a', text:'True' }, { id:'b', text:'False' }], correctOption:'a',
  expected:'True', acceptedAnswers:[], explanation:'Com she, work recebe -s.',
});
const multipleChoiceQuestion = (id, focus) => ({
  id, type:'multipleChoice', focus, topic:'Simple Present', prompt:'Escolha a forma correta.',
  context:'He ___ at home.', hint:'',
  options:[{ id:'a', text:'work' }, { id:'b', text:'works' }, { id:'c', text:'working' }, { id:'d', text:'worked' }],
  correctOption:'b', expected:'works', acceptedAnswers:[], explanation:'Com he, usamos works.',
});

const part = prefix => [
  textQuestion(`${prefix}q1`, 'weak'),
  textQuestion(`${prefix}q2`, 'weak'),
  textQuestion(`${prefix}q3`, 'weak'),
  trueFalseQuestion(`${prefix}q4`, 'strong'),
  multipleChoiceQuestion(`${prefix}q5`, 'strong'),
];

const prepared = prepareManualStudentChallenge({
  uid:'student-1', studentName:'Aluno Teste', part1:part('p1'), part2:part('p2'),
});
assert.equal(prepared.uid, 'student-1');
assert.equal(prepared.prepared.length, 2);
assert.equal(prepared.prepared[0].questions.length, 5);
assert.equal(prepared.prepared[0].keys.length, 5);
assert.equal(prepared.prepared[0].questions[0].acceptedAnswers, undefined,
  'gabarito escrito não pode aparecer na pergunta pública');
assert.equal(prepared.prepared[0].questions[0].hint, undefined,
  'dica não pode aparecer na pergunta pública');
assert.deepEqual(prepared.prepared[0].keys[0].acceptedAnswers, ['i work every day']);

assert.deepEqual(publicChallengeQuestions([
  { id:'legada', prompt:'Complete.', context:'Frase.', hint:'Use -es.' },
]), [{ id:'legada', prompt:'Complete.', context:'Frase.' }],
'rodada antiga também precisa sair do servidor sem hint');

const lacuna = validateQuestion({
  id:'lacuna', type:'text', focus:'weak', topic:'Simple Present',
  prompt:'Complete a frase: My father ___ (watch) TV every night.', context:'', hint:'',
  options:[], correctOption:'', acceptedAnswers:['My father watches TV every night.'],
  expected:'My father watches TV every night.', explanation:'Watch recebe -es.',
}, 0);
assert.ok(lacuna.answerKey.acceptedAnswers.includes('watches'),
  'o conteúdo isolado da lacuna precisa ser aceito como resposta completa');

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-2', studentName:'Incompleto', part1:part('p1').slice(0, 4), part2:part('p2'),
}), /exatamente 5 perguntas/);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-3', studentName:'Sem foco',
  part1:part('p1').map(question => ({ ...question, focus:'strong' })), part2:part('p2'),
}), /3 perguntas de pontos fracos/);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-4', studentName:'Com dica',
  part1:part('p1').map((question, index) => index ? question : ({ ...question, hint:'Use the base form.' })),
  part2:part('p2'),
}), /hint precisa ficar vazio/);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-5', studentName:'Com fórmula',
  part1:part('p1').map((question, index) => index ? question : ({ ...question, prompt:'Use the past participle.' })),
  part2:part('p2'),
}), /dica gramatical explícita/);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-6', studentName:'Tradução escondida',
  part1:part('p1').map((question, index) => index ? question : ({
    ...question, prompt:'Translate to English:', context:'Situação: alguém precisa resolver um problema.',
  })),
  part2:part('p2'),
}), /frase exata que será traduzida/);

console.log('Manual challenge package tests passed.');
