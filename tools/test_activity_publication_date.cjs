const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const admin = fs.readFileSync(path.join(root, 'admin/index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const moduleScript = admin.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
const syntax = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: moduleScript, encoding: 'utf8' });
assert.equal(syntax.status, 0, syntax.stderr);
const helperStart = admin.indexOf('    function activityPublicationMetadata(');
const helperEnd = admin.indexOf('    // ── PUBLICAR ATIVIDADES', helperStart);
assert(helperStart >= 0 && helperEnd > helperStart);
const helper = admin.slice(helperStart, helperEnd);
const context = vm.createContext({ Intl, Date });
vm.runInContext(helper + '\nthis.metadata = activityPublicationMetadata;', context);
const metadata = (source, date) => JSON.parse(JSON.stringify(context.metadata(source, new Date(date))));

assert.deepEqual(metadata('24 DE AGOSTO 2026', '2026-09-02T15:00:00Z'), {
  week: '02 DE SETEMBRO 2026', publicationDate: '2026-09-02', sourceWeek: '24 DE AGOSTO 2026',
});
assert.equal(metadata('', '2026-09-02T02:59:59Z').publicationDate, '2026-09-01');
assert.equal(metadata('', '2026-09-02T03:00:00Z').publicationDate, '2026-09-02');
assert.equal(metadata('', '2027-01-01T02:59:59Z').week, '31 DE DEZEMBRO 2026');
assert.equal(metadata('', '2027-01-01T03:00:00Z').week, '01 DE JANEIRO 2027');
assert.equal(metadata('', '2028-02-29T12:00:00Z').week, '29 DE FEVEREIRO 2028');
assert.equal(metadata(null, '2026-09-02T15:00:00Z').sourceWeek, '');

const handlerStart = admin.indexOf("    document.getElementById('btn-publish').onclick = async () => {");
const handlerEnd = admin.indexOf('    // ── APLICAR CORREÇÃO', handlerStart);
assert(handlerStart >= 0 && handlerEnd > handlerStart);
const handler = admin.slice(handlerStart, handlerEnd);

async function publish({ fail = false, emptyUid = false, count = 2 } = {}) {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: id === 'pub-student' && !emptyUid ? 'student-1' : '', style: {}, disabled: false });
    return elements.get(id);
  };
  const writes = [], messages = [];
  let commits = 0, dateCalls = 0;
  const payload = { week: '24 DE AGOSTO 2026', activities: Array.from({ length: count }, (_, i) => ({
    title: `New ${i}`, parts: [{ id: 'part-1', content: '<ol><li>Test _______</li></ol>' }],
    // Imported data must never override publication or completion metadata.
    createdAt: 'old', week: 'old', status: 'corrected', respostas: { 'part-1': { e0: 'answer' } },
  })) };
  const sandbox = vm.createContext({
    parsedActivityJson: payload, document: { getElementById: element }, db: {},
    collection: (_db, ...segments) => segments.join('/'),
    doc: collection => `${collection}/new-${writes.length}`,
    serverTimestamp: () => 'SERVER_TIMESTAMP',
    activityPublicationMetadata: source => { dateCalls++; return metadata(source, '2026-09-02T15:00:00Z'); },
    writeBatch: () => ({ set: (ref, data) => writes.push({ ref, data }), commit: async () => {
      commits++; if (fail) throw new Error('Simulated failure');
    } }),
    showMsg: (...args) => messages.push(args),
  });
  vm.runInContext(handler, sandbox);
  await element('btn-publish').onclick();
  return { writes, messages, commits, dateCalls, sandbox, element, payload };
}

(async () => {
  const { pathToFileURL } = require('node:url');
  const { activityPublicationMetadata: backendMetadata } = await import(pathToFileURL(path.join(root, 'functions/activity-publication.js')).href);
  for (const instant of ['2026-09-02T02:59:59Z', '2026-09-02T03:00:00Z', '2027-01-01T03:00:00Z', '2028-02-29T12:00:00Z']) {
    assert.deepEqual(backendMetadata('24 DE AGOSTO 2026', new Date(instant)), metadata('24 DE AGOSTO 2026', instant));
  }
  const backend = fs.readFileSync(path.join(root, 'functions/index.js'), 'utf8');
  const publisher = backend.slice(backend.indexOf('export const publicarAtividades ='), backend.indexOf('/** Avisa o professor', backend.indexOf('export const publicarAtividades =')));
  assert(publisher.includes('const publicationTime = new Date();'));
  assert(publisher.includes('activityPublicationMetadata(week, publicationTime)'));
  assert(publisher.includes('...publication,'));
  assert(!publisher.includes("week: week || ''"));
  const success = await publish();
  assert.equal(success.commits, 1);
  assert.equal(success.dateCalls, 1);
  assert.equal(success.writes.length, 2);
  for (const { ref, data } of success.writes) {
    assert(ref.startsWith('students/student-1/activities/new-'));
    assert.equal(data.week, '02 DE SETEMBRO 2026');
    assert.equal(data.sourceWeek, '24 DE AGOSTO 2026');
    assert.equal(data.publicationDate, '2026-09-02');
    assert.equal(data.createdAt, 'SERVER_TIMESTAMP');
    assert.equal(data.status, 'pending');
    assert.equal(data.notified, false);
    assert.equal(data.respostas, undefined);
    assert.equal(data.parts.length, 1);
  }
  assert.equal(success.sandbox.parsedActivityJson, null);
  assert.equal(success.element('btn-publish').disabled, false);
  assert(success.messages[0][1].includes('02 DE SETEMBRO 2026'));

  const failed = await publish({ fail: true });
  assert.equal(failed.commits, 1);
  assert.equal(failed.sandbox.parsedActivityJson, failed.payload);
  assert.equal(failed.element('btn-publish').disabled, false);
  assert.equal(failed.messages[0][2], 'err');
  const noStudent = await publish({ emptyUid: true });
  assert.equal(noStudent.commits, 0);
  const oversized = await publish({ count: 501 });
  assert.equal(oversized.commits, 0);
  assert.equal(oversized.writes.length, 0);

  // Exercise the real student grouping function, including old unanswered work.
  const groupStart = app.indexOf('  const groupByWeek = (list) => {');
  const groupEnd = app.indexOf('  const atuaisByWeek', groupStart);
  assert(groupStart >= 0 && groupEnd > groupStart);
  vm.runInContext(app.slice(groupStart, groupEnd) + '\nthis.group = groupByWeek;', context);
  const old = { id: 'old', week: '24 DE AGOSTO 2026', status: 'pending', partsDone: { 'part-1': true }, respostas: { 'part-1': { e0: 'saved' } } };
  const before = JSON.stringify(old);
  const grouped = context.group([...success.writes.map(w => w.data), old]);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].wk, '02 DE SETEMBRO 2026');
  assert.equal(grouped[0].acts.length, 2);
  assert.equal(grouped[1].wk, '24 DE AGOSTO 2026');
  assert.equal(JSON.stringify(old), before);
  assert(admin.includes('Referência da aula no JSON:'));
  console.log('PASS: publication date, São Paulo midnight, atomic upload, original reference, failure recovery and grouping without changing old progress.');
})().catch(error => { console.error(error); process.exitCode = 1; });
