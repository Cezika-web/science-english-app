import assert from 'node:assert/strict';
import { challengeInternals } from '../challenge.js';

const { prepareManualStudentChallenge } = challengeInternals;

const textQuestion = (id, focus) => ({
  id, type:'text', focus, topic:'Simple Present', prompt:`Escreva a frase ${id}.`,
  context:'Rotina de trabalho.', hint:'Use o presente simples.', options:[], correctOption:'',
  expected:'I work every day.', acceptedAnswers:['I work every day', 'I work every day.'],
  explanation:'O presente simples descreve rotinas.',
});
const trueFalseQuestion = (id, focus) => ({
  id, type:'multipleChoice', focus, topic:'Simple Present', prompt:'A frase está correta?',
  context:'She works every day.', hint:'Observe a terceira pessoa.',
  options:[{ id:'a', text:'True' }, { id:'b', text:'False' }], correctOption:'a',
  expected:'True', acceptedAnswers:[], explanation:'Com she, work recebe -s.',
});
const multipleChoiceQuestion = (id, focus) => ({
  id, type:'multipleChoice', focus, topic:'Simple Present', prompt:'Escolha a forma correta.',
  context:'He ___ at home.', hint:'Observe a terceira pessoa.',
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
assert.deepEqual(prepared.prepared[0].keys[0].acceptedAnswers, ['i work every day']);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-2', studentName:'Incompleto', part1:part('p1').slice(0, 4), part2:part('p2'),
}), /exatamente 5 perguntas/);

assert.throws(() => prepareManualStudentChallenge({
  uid:'student-3', studentName:'Sem foco',
  part1:part('p1').map(question => ({ ...question, focus:'strong' })), part2:part('p2'),
}), /3 perguntas de pontos fracos/);

console.log('Manual challenge package tests passed.');
