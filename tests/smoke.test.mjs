/* ==========================================================================
   FeeFlow — browser smoke test (jsdom)
   Boots the real index.html, drives the real UI: paste → validate → import
   → dashboard → add student sheet. Run: npm test
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

let JSDOM, VirtualConsole;
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'));
} catch {
  test('smoke test (needs `npm install` for jsdom)', { skip: 'jsdom not installed' }, () => {});
  process.exit(0);
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const problems = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', (err) => {
  const msg = String(err && err.message ? err.message : err);
  if (/Not implemented|Could not parse CSS|stylesheet/i.test(msg)) return; // jsdom gaps, not app bugs
  problems.push(msg);
});
virtualConsole.on('error', (...args) => problems.push(args.join(' ')));

const dom = new JSDOM(readFileSync(join(rootDir, 'index.html'), 'utf8'), {
  url: 'https://feeflow.test/',
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  virtualConsole,
});

const { window } = dom;
const { document } = window;

// jsdom gaps that real browsers provide (downloads only; never used for logic)
window.URL.createObjectURL = () => 'blob:mock';
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = function () {};

// run the app's classic scripts in the exact order index.html declares them
const scripts = [...readFileSync(join(rootDir, 'index.html'), 'utf8').matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
for (const src of scripts) {
  window.eval(readFileSync(join(rootDir, src), 'utf8'));
}
await sleep(200);

const FF = window.FF;

test('app boots with no console errors and renders the dashboard', () => {
  assert.ok(FF, 'FeeFlow namespace exists');
  assert.match(document.querySelector('.hero h1').textContent, /Fees, finally/);
  assert.equal(document.querySelectorAll('.bottomnav > *').length, 5);
  assert.ok(document.querySelector('#month-chip .month-chip__label').textContent.length > 3);
  assert.equal(problems.length, 0, 'no page errors: ' + problems.join(' | '));
});

test('paste → validate → import builds records and saves to localStorage', async () => {
  FF.router.navigate('import');
  await sleep(60);
  const box = document.querySelector('#imp-input');
  assert.ok(box, 'paste box exists');
  assert.equal(document.querySelector('#imp-go').disabled, true, 'import disabled while empty');

  box.value = FF.importer.SAMPLE_JSON;
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(320); // debounce + render

  const checks = document.querySelector('#imp-checks').textContent;
  assert.match(checks, /JSON is valid/);
  assert.match(checks, /3 students detected/);
  assert.match(checks, /Ready to import/);
  assert.equal(document.querySelector('#imp-go').disabled, false);
  assert.ok(document.querySelectorAll('#imp-preview .preview-row').length === 3);

  document.querySelector('#imp-go').click();
  await sleep(120);

  assert.equal(FF.store.currentStudents().length, 3);
  const saved = JSON.parse(window.localStorage.getItem('feeflow_v1'));
  assert.equal(saved.months[0].students.length, 3, 'persisted immediately');
  assert.match(document.querySelector('.toasts').textContent, /3 students imported successfully/);

  const stats = FF.store.stats();
  // cross-realm objects: compare structurally via JSON
  assert.equal(JSON.stringify(stats.counts), JSON.stringify({ paid: 1, partial: 1, unpaid: 1 }));
  assert.equal(stats.pending, 7000);
});

test('invalid JSON shows a friendly error, never a crash', async () => {
  const box = document.querySelector('#imp-input');
  box.value = '{"students": [ oops';
  box.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(320);
  const checks = document.querySelector('#imp-checks').textContent;
  assert.match(checks, /Invalid JSON/);
  assert.equal(document.querySelector('#imp-go').disabled, true);
  assert.equal(problems.length, 0, problems.join(' | '));
});

test('dashboard reflects imported data (stats, donut, list)', async () => {
  FF.router.navigate('dashboard');
  await sleep(80);
  const stats = document.querySelector('#d-stats').textContent;
  assert.match(stats, /3/);
  assert.match(stats, /14,500/); // 5000 + 5000 + 4500, grouped
  assert.ok(document.querySelectorAll('#d-overview .donut circle[data-final]').length >= 3);
  assert.ok(document.querySelectorAll('#d-list .scard').length === 3);
  assert.match(document.querySelector('#d-attention').textContent, /Meera Singh/);
});

test('add-student sheet validates and saves', async () => {
  FF.app.studentSheet('add');
  await sleep(120);
  const scrim = document.querySelector('.scrim');
  assert.ok(scrim, 'sheet opened');

  document.querySelector('#sf-save').click();
  await sleep(40);
  assert.match(document.querySelector('#sf-err-name').textContent, /name is required/);

  document.querySelector('#sf-name').value = 'Test Kid';
  document.querySelector('#sf-fee').value = '1000';
  document.querySelector('#sf-paid').value = '4000';
  document.querySelector('#sf-save').click();
  await sleep(40);
  assert.match(document.querySelector('#sf-err-paid').textContent, /cannot exceed/);

  document.querySelector('#sf-paid').value = '250';
  document.querySelector('#sf-paid').dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(20);
  assert.match(document.querySelector('#sf-status').textContent, /Partial/);

  document.querySelector('#sf-save').click();
  await sleep(300);
  assert.equal(FF.store.currentStudents().length, 4);
  assert.equal(document.querySelector('.scrim'), null, 'sheet closed');
});

test('search filters instantly and collect updates the chart', async () => {
  FF.router.navigate('students');
  await sleep(60);
  const search = document.querySelector('#s-search');
  search.value = 'meera';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(200);
  assert.equal(document.querySelectorAll('#s-list .scard').length, 1);

  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  await sleep(200);
  assert.equal(document.querySelectorAll('#s-list .scard').length, 4);

  const target = FF.store.currentStudents().find((s) => s.name === 'Meera Singh');
  FF.app.collectSheet(target);
  await sleep(120);
  document.querySelector('#cs-save').click();
  await sleep(300);
  assert.equal(FF.store.findStudent(target.id).status, 'paid');
  assert.equal(document.querySelector('.scrim'), null);
});

test('months stay separate and the switcher works', async () => {
  const first = FF.store.getState().currentMonth;
  const next = FF.addMonths(first, 1);
  FF.store.createMonth(next, { copyFrom: first });
  await sleep(60);
  assert.equal(FF.store.getState().currentMonth, next);
  assert.equal(FF.store.students(next).length, 4);
  assert.equal(FF.store.students(first).length, 4, 'source month untouched');
  assert.ok(FF.store.students(next).every((s) => s.paid === 0), 'carried students start unpaid');

  FF.store.setMonth(first);
  await sleep(60);
  assert.equal(FF.store.getState().currentMonth, first);
  assert.match(document.querySelector('#month-chip .month-chip__label').textContent, new RegExp(FF.monthLabel(first, true).slice(0, 3)));
});

test('file upload reads, validates and imports — same file twice still works', async () => {
  FF.router.navigate('import');
  await sleep(80);
  const mode = document.querySelector('#imp-mode');
  mode.value = 'replace';
  mode.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(60);

  const file = new window.File([FF.importer.SAMPLE_JSON], 'register.json', { type: 'application/json' });
  const drop = document.querySelector('#imp-drop');
  const ev = new window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev, 'dataTransfer', { value: { files: [file] } });
  drop.dispatchEvent(ev);
  await sleep(500); // FileReader + auto-import

  assert.equal(FF.store.currentStudents().length, 3, 'file was read, validated and imported');
  assert.match(document.querySelector('.toasts').textContent, /imported successfully/);

  // same file again, now in merge mode → everything de-duplicated
  mode.value = 'merge';
  mode.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(40);
  const ev2 = new window.Event('drop', { bubbles: true, cancelable: true });
  Object.defineProperty(ev2, 'dataTransfer', { value: { files: [file] } });
  drop.dispatchEvent(ev2);
  await sleep(500);
  assert.equal(FF.store.currentStudents().length, 3, 'duplicates skipped on second upload');
});

test('delete shows an undo toast that restores the record', async () => {
  FF.router.navigate('students');
  await sleep(80);
  const before = FF.store.currentStudents().length;
  document.querySelector('[data-action="delete"]').click();
  await sleep(100);
  document.querySelector('[data-confirm]').click();
  await sleep(320);
  assert.equal(FF.store.currentStudents().length, before - 1);
  document.querySelector('.toast__action').click();
  await sleep(150);
  assert.equal(FF.store.currentStudents().length, before, 'undo restored the student');
});

test('backup restore through the settings UI brings data back', async () => {
  FF.router.navigate('settings');
  await sleep(80);
  const backupText = FF.store.exportBackup();

  FF.store.resetAll();
  await sleep(120);
  assert.equal(FF.store.currentStudents().length, 0);

  const input = document.querySelector('#set-restore-file');
  const file = new window.File([backupText], 'feeflow-backup.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { value: [file] });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(500);

  assert.ok(FF.store.currentStudents().length >= 2, 'backup restored');
  assert.match(document.querySelector('.toasts').textContent, /Backup restored/);
});

test('month popover switches months and the theme persists', async () => {
  const first = FF.store.getState().currentMonth;
  const other = FF.addMonths(first, 1);
  FF.store.createMonth(other, {});
  await sleep(80);

  FF.store.setMonth(first);
  await sleep(60);
  document.querySelector('#month-chip').click();
  await sleep(60);
  const pop = document.querySelector('#month-pop');
  assert.ok(pop, 'popover opened');
  const item = pop.querySelector('[data-pop-month="' + other + '"]');
  assert.ok(item);
  item.click();
  await sleep(100);
  assert.equal(FF.store.getState().currentMonth, other);
  assert.equal(document.querySelector('#month-pop'), null, 'popover closed');

  document.querySelector('#theme-btn').click();
  await sleep(60);
  assert.equal(document.documentElement.getAttribute('data-theme'), 'paper');
  assert.equal(JSON.parse(window.localStorage.getItem('feeflow_v1')).settings.theme, 'paper');
  document.querySelector('#theme-btn').click();
  await sleep(40);
  assert.equal(document.documentElement.getAttribute('data-theme'), 'ink');
});

test('each view keeps its own handlers after visiting other views', async () => {
  // settings: guarded (bind-once) handler still fires after many navigations
  FF.router.navigate('settings');
  await sleep(80);
  document.querySelector('[data-backup]').click();
  await sleep(60);
  assert.match(document.querySelector('.toasts').textContent, /Backup downloaded/);

  // students: status tabs filter the list
  FF.router.navigate('students');
  await sleep(80);
  document.querySelector('[data-status="paid"]').click();
  await sleep(60);
  const paidCount = FF.store.stats().counts.paid;
  assert.equal(document.querySelectorAll('#s-list .scard').length, paidCount);
  document.querySelector('[data-status="all"]').click();
  await sleep(60);
  assert.equal(document.querySelectorAll('#s-list .scard').length, FF.store.currentStudents().length);

  // import: its guarded handlers (copy prompt) survive too
  FF.router.navigate('import');
  await sleep(80);
  document.querySelector('[data-copy-prompt]').click();
  await sleep(60);
  assert.match(document.querySelector('.toasts').textContent, /Prompt copied|Could not copy/);
});

test('no runtime errors accumulated during the whole session', () => {
  assert.equal(problems.length, 0, problems.join(' | '));
});

test.onFinish?.(() => dom.window.close());
