// Run under the Firestore emulator, never against production:
// firebase emulators:exec --project demo-attendance --only firestore "node functions/scripts/test_attendance_rules.mjs"
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, getDoc, deleteDoc, deleteField } from 'firebase/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('FIRESTORE_EMULATOR_HOST required; refuses production.');
const [host,port] = process.env.FIRESTORE_EMULATOR_HOST.split(':');
const env = await initializeTestEnvironment({projectId:'demo-attendance',firestore:{host,port:Number(port),rules:fs.readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8')}});
let n=0;
const test=async(name,fn)=>{await fn();n++;console.log('ok',name);};
try {
  await env.withSecurityRulesDisabled(async ctx=>{
    const db=ctx.firestore();
    await setDoc(doc(db,'schools/school-a'),{ownerEmail:'teacher@example.com'});
    await setDoc(doc(db,'students/student-a'),{schoolId:'school-a',name:'Student'});
    await setDoc(doc(db,'students/student-a/posaulas/post-a'),{attendanceStatus:'absent',attendanceSource:'manual',readAt:null,html:'<p>Study</p>'});
  });
  const db=env.authenticatedContext('student-a',{email:'student@example.com'}).firestore();
  const ref=doc(db,'students/student-a/posaulas/post-a');
  await test('student can read absent lesson material',()=>assertSucceeds(getDoc(ref)));
  await test('student cannot mark present',()=>assertFails(updateDoc(ref,{attendanceStatus:'present'})));
  await test('student cannot delete absence field',()=>assertFails(updateDoc(ref,{attendanceStatus:deleteField()})));
  await test('student cannot replace manual source',()=>assertFails(updateDoc(ref,{attendanceSource:'html'})));
  await test('student cannot inject talkTime',()=>assertFails(updateDoc(ref,{talkTime:{studentPct:99}})));
  await test('reading remains allowed',()=>assertSucceeds(updateDoc(ref,{readAt:new Date()})));
  await test('reading leaves absent/manual intact',async()=>{
    const p=(await getDoc(ref)).data();assert.equal(p.attendanceStatus,'absent');assert.equal(p.attendanceSource,'manual');
  });
  await test('student cannot create a post to fake attendance',()=>assertFails(setDoc(doc(db,'students/student-a/posaulas/fake'),{attendanceStatus:'present'})));
  await test('student cannot delete absence document',()=>assertFails(deleteDoc(ref)));
  await test('student cannot inject profile present dates',()=>assertFails(updateDoc(doc(db,'students/student-a'),{attendancePresentDates:['2026-11-13']})));
  await test('other student cannot read material',()=>assertFails(getDoc(doc(env.authenticatedContext('student-b',{email:'other@example.com'}).firestore(),'students/student-a/posaulas/post-a'))));
  for(const [uid,email] of [['teacher','teacher@example.com'],['admin','cmo.sep@gmail.com']]) {
    await test(`${uid} can correct individual attendance`,()=>assertSucceeds(updateDoc(doc(env.authenticatedContext(uid,{email}).firestore(),'students/student-a/posaulas/post-a'),{attendanceStatus:'present',attendanceSource:'manual'})));
  }
  console.log(`${n} emulator security checks passed`);
} finally { await env.cleanup(); }
