import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import '../attendance.js';
import { contextoPosAulas, contextoParticipacao } from '../assistente.js';

const { calculateAttendance:calc } = globalThis.CzkAttendance;
const Adesao = createRequire(import.meta.url)('../../adesao.js');
const now = new Date('2026-11-14T15:00:00Z');
const student = { inicioCurso:'2026-11-11', aulaDias:[3,5] };
const post = (day, status, extra={}) => ({ id:`pos-aula-aluno-11-${day}-2026`, filename:`pos-aula-aluno-11-${day}-2026.html`, classDate:`2026-11-${day}T12:00:00Z`, createdAt:`2026-11-${day}T12:00:00Z`, ...(status ? {attendanceStatus:status} : {}), ...extra });
const absent = post('13','absent', { talkTime:{studentPct:88}, studentTalkPct:90 });
const posts = [post('11'), absent];
let n=0;
function test(name, fn) { fn(); n++; console.log('ok',name); }
test('one present + one absent = 1/2 = 50%, no excused', () => {
  const r=calc(student,posts,now);
  assert.equal(r.rate,50); assert.equal(r.scheduled,2); assert.equal(r.attendedScheduled,1); assert.equal(r.misses,1);
  assert.equal(r.points.find(p=>p.key==='2026-11-13').excused,undefined);
});
test('read/video/AI/activity study cannot change attendance', () => {
  const r=calc(student,posts.map(p=>({...p,readAt:now,videoWatched:true,activitiesDone:true,aiUsed:true})),now);
  assert.equal(r.rate,50);
});
test('absence overrides old profile inferred/persisted present date', () => assert.equal(calc({...student,attendancePresentDates:['2026-11-13']},posts,now).rate,50));
test('explicit absence counts without agenda or earlier presence', () => {
  const r=calc({},[absent],now); assert.equal(r.rate,0); assert.equal(r.misses,1); assert.equal(r.scheduled,1);
});
test('explicit absence starts tracking before first presence', () => assert.equal(calc(student,[post('11','absent'),post('13','present')],now).rate,50));
test('absence never becomes excused due to holiday/cancellation', () => assert.equal(calc({...student,aulaExcecoes:['2026-11-13']},posts,now).misses,1));
test('legacy holiday/cancellation still excused', () => {
  const r=calc({...student,aulaExcecoes:['2026-11-13']},[post('11')],now);
  assert.equal(r.rate,100); assert.equal(r.excusedDates.length,1);
});
test('Pedro remains present with oral measurement', () => {
  const pedro=post('13','present',{talkTime:{studentPct:23}});
  assert.equal(calc(student,[post('11'),pedro],now).rate,100); assert.equal(pedro.talkTime.studentPct,23);
});
test('old posts with no marker preserve presence inference', () => assert.equal(calc(student,[post('11'),post('13')],now).rate,100));
test('invalid status never infers absence from title or missing talk time', () => assert.equal(calc(student,[post('11'),post('13','invalid',{title:'Não compareceu'})],now).rate,100));
test('same lesson and agenda/post are counted once', () => {
  const r=calc(student,[...posts,{...absent,id:'duplicate'}],now); assert.equal(r.scheduled,2); assert.equal(r.rate,50);
});
test('manual correction beats imported status on same date', () => {
  assert.equal(calc(student,[post('11'),post('13','present',{attendanceSource:'manual'}),post('13','absent',{attendanceSource:'html'})],now).rate,100);
});
test('baseline totals remain authoritative through baseline date', () => {
  const r=calc({...student,attendanceBaseline:{through:'2026-11-11',attended:10,misses:2}},posts,now);
  assert.equal(r.attendedScheduled,10); assert.equal(r.scheduled,13); assert.equal(r.misses,3);
});
test('makeup without marker preserves one original scheduled lesson', () => {
  const s={inicioCurso:'2026-11-09',aulaDias:[1],attendanceMakeups:{m:{scheduledDate:'2026-11-09',makeupDate:'2026-11-11'}}};
  const r=calc(s,[post('11')],new Date('2026-11-12T15:00:00Z'));
  assert.equal(r.scheduled,1); assert.equal(r.rate,100); assert.equal(r.makeups.length,1);
});
test('makeup with present marker still counts once', () => {
  const s={inicioCurso:'2026-11-09',aulaDias:[1],attendanceMakeups:{m:{scheduledDate:'2026-11-09',makeupDate:'2026-11-11'}}};
  const r=calc(s,[post('11','present')],new Date('2026-11-12T15:00:00Z'));
  assert.equal(r.scheduled,1); assert.equal(r.rate,100);
  assert.equal(r.points[0].key,'2026-11-09'); assert.equal(r.makeups.length,1);
});
test('static and dynamic AI material carry nonattendance context', () => {
  const a={...absent,html:'<h2>Resumo da aula</h2><p>Pedro falou sobre gambling and betting.</p>'};
  assert.match(contextoPosAulas([a],'gambling betting').estatico,/não compareceu/);
  assert.match(contextoPosAulas([a],'gambling betting',{resumoPorAula:0}).dinamico,/não compareceu/);
  assert.match(contextoParticipacao(a),/Não atribua/);
});

const app=fs.readFileSync(new URL('../../index.html',import.meta.url),'utf8');
const admin=fs.readFileSync(new URL('../../admin/index.html',import.meta.url),'utf8');
function extractFunction(src,name) {
  const start=src.indexOf(`function ${name}(`), end=src.indexOf('\n}',start);
  if(end<0 || name.startsWith('admin')) {
    const tail=src.slice(start); const match=tail.match(/\n    }/); return tail.slice(0,match.index+6);
  }
  return src.slice(start,end+2);
}
test('student/admin ignore stale structured or cached talk for absent, retain measured zero', () => {
  for(const [src,name] of [[app,'talkTimeFromPost'],[admin,'adminTalkValue']]) {
    const fn=new Function(`${extractFunction(src,name)}; return ${name};`)();
    assert.equal(fn(absent),null); assert.equal(fn(post('13','present',{talkTime:{studentPct:0}})),0);
    assert.equal(fn(post('13','present',{talkTime:{studentPct:23}})),23);
  }
});
test('absent lesson excluded from talk average; measured zero included', () => {
  const fn=new Function(`${extractFunction(admin,'adminTalkValue')}\n${extractFunction(admin,'adminTalkStats')}; return adminTalkStats;`)();
  assert.equal(fn([absent,post('11','present',{talkTime:{studentPct:40}})]).average,40);
  assert.equal(fn([absent,post('11','present',{talkTime:{studentPct:0}})]).average,0);
  assert.equal(fn([absent]).average,null);
});
test('timestamp date respects Sao Paulo even after UTC midnight', () => {
  assert.equal(globalThis.CzkAttendance.dateKey(globalThis.CzkAttendance.postReferenceDate({classDate:'2026-11-14T01:30:00Z'})),'2026-11-13');
});
test('admin and student use same calculator', () => {
  const window={CzkAttendance:globalThis.CzkAttendance};
  const adminFn=new Function('window',`${extractFunction(admin,'adminAttendanceStats')}; return adminAttendanceStats;`)(window);
  const appFn=new Function('window',`${extractFunction(app,'calculateAttendance')}; return calculateAttendance;`)(window);
  assert.equal(adminFn(student,posts).rate,appFn(student,posts).rate);
  assert.equal(adminFn(student,posts).rate,50);
});
test('Adesao receives false present without excused for explicit absence', () => {
  const attendance=calc(student,posts,now).points;
  assert.deepEqual(attendance.map(p=>[p.key,p.present,!!p.excused]),[['2026-11-11',true,false],['2026-11-13',false,false]]);
  const c=Adesao.compute({now,student,posts,attendance,activities:[],usage:[{date:'2026-11-13',secs:{total:600,posaula:600},items:{[`pos_${absent.id}`]:600}}],challenge:{enabled:false}},{coletaDesde:'2026-11-09'});
  assert.deepEqual(c.cur.aulas,[2,1]); assert.equal(c.cur.parts.Aula,0.5);
  assert.equal(c.hours.aulas.n,1); assert.equal(c.hours.app.total,10);
  assert.equal(c.evo.days.find(d=>d.key==='2026-11-13')?.v.aul ?? c.evo.days.find(d=>d.k==='2026-11-13')?.v.aul,0);
});
console.log(`${n} attendance checks passed`);
