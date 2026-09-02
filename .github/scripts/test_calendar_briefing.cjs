const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const html = fs.readFileSync(path.join(__dirname, '../../admin/index.html'), 'utf8');
const moduleScript = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: moduleScript, encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
function extractFunction(name) {
  const match = moduleScript.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n    }`));
  assert(match, name);
  return match[0];
}
function extractHandler(id) {
  const begin = moduleScript.indexOf(`document.getElementById('${id}').onclick =`);
  assert(begin >= 0);
  return moduleScript.slice(begin, moduleScript.indexOf('\n    };', begin) + 7);
}
const elements = Object.fromEntries(['pop', 'event'].flatMap(context => ['briefing', 'briefing-notice', 'student'].map(suffix => {
  const id = `calendar-${context}-${suffix}`;
  assert(html.includes(`id="${id}"`));
  return [id, { style: {}, value: '' }];
})));
let opened = null;
const context = vm.createContext({
  allStudents: [{ uid: 'a', name: 'Aluno A' }, { uid: 'b', name: 'Aluno B' }, { uid: 'old', archived: true }],
  document: { getElementById: id => { assert(elements[id], id); return elements[id]; } },
  briefingAplicarEstado: button => { button.disabled = false; },
  calendarPopDraft: { id: 'lesson-1', studentUid: 'a', type: 'lesson', notes: 'Lembrete' },
  closeCalendarPop: () => {},
  openBriefing: (...args) => { opened = args; }
});
vm.runInContext(extractFunction('calendarSyncBriefing') + '\n' + extractFunction('calendarSyncPopBriefing') + '\n' + extractHandler('calendar-pop-briefing'), context);
for (const surface of ['pop', 'event']) {
  for (const uid of ['', 'missing', 'old']) {
    context.calendarSyncBriefing(surface, 'lesson', uid);
    assert.equal(elements[`calendar-${surface}-briefing-notice`].style.display, 'block');
    assert.equal(elements[`calendar-${surface}-briefing`].style.display, 'none');
  }
  context.calendarSyncBriefing(surface, 'lesson', 'a');
  assert.equal(elements[`calendar-${surface}-briefing-notice`].style.display, 'none');
  assert.notEqual(elements[`calendar-${surface}-briefing`].style.display, 'none');
  for (const type of ['personal', 'available', 'blocked', 'experimental', 'reposicao']) {
    context.calendarSyncBriefing(surface, type, '');
    assert.equal(elements[`calendar-${surface}-briefing-notice`].style.display, 'none');
    assert.equal(elements[`calendar-${surface}-briefing`].style.display, 'none');
  }
}
elements['calendar-pop-student'].value = 'b';
context.calendarSyncPopBriefing();
assert.equal(elements['calendar-pop-briefing'].style.display, 'block');
elements['calendar-pop-briefing'].onclick();
assert.deepEqual(opened, ['b', 'Aluno B', 'Lembrete'], 'Use current selection, not stale draft student');
elements['calendar-pop-student'].value = '';
context.calendarSyncPopBriefing();
assert.equal(elements['calendar-pop-briefing-notice'].style.display, 'block');
opened = null;
elements['calendar-pop-briefing'].onclick();
assert.equal(opened, null, 'No briefing for an unlinked event');
elements['calendar-pop-student'].value = 'a';
context.calendarPopDraft.id = '';
context.calendarSyncPopBriefing();
assert.equal(elements['calendar-pop-briefing'].style.display, 'none', 'Unsaved new event');
console.log('PASS: admin module syntax; missing/invalid/archived links; linked lessons; unrelated event types; student switching; empty selection; unsaved event.');
