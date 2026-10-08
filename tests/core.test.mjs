/* ==========================================================================
   FeeFlow — core logic tests (run: npm test)
   The browser scripts are plain scripts; importing them in Node executes
   their IIFEs against globalThis, which is exactly what we want to test.
   ========================================================================== */
import test from 'node:test';
import assert from 'node:assert/strict';

import '../js/core/util.js';
import '../js/core/money.js';
import '../js/core/importer.js';
import '../js/core/store.js';

const FF = globalThis.FF;

/* ---------------------------------------------------------------- money --- */

test('money.toNumber understands register mess', () => {
  assert.equal(FF.money.toNumber('₹5,000'), 5000);
  assert.equal(FF.money.toNumber('2,500.00'), 2500);
  assert.equal(FF.money.toNumber('Rs 500'), 500);
  assert.equal(FF.money.toNumber('5000/-'), 5000);
  assert.equal(FF.money.toNumber(''), 0);
  assert.equal(FF.money.toNumber(null), 0);
  assert.equal(FF.money.toNumber('—'), 0);
  assert.equal(FF.money.toNumber('  '), 0);
  assert.equal(FF.money.toNumber(2500), 2500);
  assert.equal(FF.money.toNumber('-50'), -50);
  assert.equal(FF.money.toNumber('1.200.50'), 1200.5);
  assert.ok(Number.isNaN(FF.money.toNumber('twelve')));
});

test('money.format groups Indian-style for ₹ and western for others', () => {
  assert.equal(FF.money.format(1234567, '₹'), '12,34,567');
  assert.equal(FF.money.format(1234567, '$'), '1,234,567');
  assert.equal(FF.money.format(5000, '₹'), '5,000');
  assert.equal(FF.money.format(2500.5, '₹'), '2,500.50');
  assert.equal(FF.money.format(0, '₹'), '0');
});

test('money.compact uses L / K / Cr', () => {
  assert.equal(FF.money.compact(120000, '₹'), '1.2L');
  assert.equal(FF.money.compact(45000, '₹'), '45K');
  assert.equal(FF.money.compact(30000000, '₹'), '3Cr');
  assert.equal(FF.money.compact(850, '₹'), '850');
});

test('status is always derived from the numbers', () => {
  assert.equal(FF.importer.computeStatus(5000, 5000), 'paid');
  assert.equal(FF.importer.computeStatus(5000, 2500), 'partial');
  assert.equal(FF.importer.computeStatus(5000, 0), 'unpaid');
  assert.equal(FF.importer.computeStatus(0, 0), 'paid');
  assert.equal(FF.importer.computeStatus(5000, 6000), 'paid');
});

/* ------------------------------------------------------------- importer --- */

test('parseJSON tolerates markdown fences from AI chats', () => {
  const fenced = '```json\n{"students":[{"name":"A","fee":10,"paid":0}]}\n```';
  const res = FF.importer.parseJSON(fenced);
  assert.equal(res.ok, true);
  assert.equal(res.data.students.length, 1);
  assert.equal(FF.importer.parseJSON('{oops').ok, false);
  assert.equal(FF.importer.parseJSON('   ').ok, false);
});

test('extractRecords supports {students}, {data} and bare arrays', () => {
  const row = { name: 'A', fee: 1 };
  assert.equal(FF.importer.extractRecords({ students: [row] }).records.length, 1);
  assert.equal(FF.importer.extractRecords({ data: [row] }).records.length, 1);
  assert.equal(FF.importer.extractRecords([row]).records.length, 1);
  assert.equal(FF.importer.extractRecords({ nope: 1 }).records, null);
  assert.equal(FF.importer.looksLikeBackup({ months: [{ month: '2026-01', students: [] }] }), true);
  assert.equal(FF.importer.looksLikeBackup({ students: [] }), false);
});

test('normaliseRecord maps aliases, combines class+section, repairs values', () => {
  const rec = FF.importer.normaliseRecord({
    student_name: '  Ananya   Rao ',
    className: '8',
    section: 'A',
    total_fee: '₹5,000',
    amount_paid: '2,500.00',
    payment_status: 'PARTIAL',
    roll_no: 12,
    phone: '+91 98765 43210',
  }, 0);
  assert.equal(rec.ok, true);
  assert.equal(rec.student.name, 'Ananya Rao');
  assert.equal(rec.student.cls, '8-A');
  assert.equal(rec.student.fee, 5000);
  assert.equal(rec.student.paid, 2500);
  assert.equal(rec.student.status, 'partial');
  assert.equal(rec.student.roll, '12');

  const missing = FF.importer.normaliseRecord({ name: 'X', fee: 900, status: 'paid' }, 0);
  assert.equal(missing.student.paid, 900, 'status paid repairs a missing amount');

  const over = FF.importer.normaliseRecord({ name: 'Y', fee: 100, paid: 400 }, 0);
  assert.equal(over.student.paid, 100);
  assert.ok(over.warnings.length > 0);

  const neg = FF.importer.normaliseRecord({ name: 'Z', fee: -5, paid: -1 }, 0);
  assert.equal(neg.student.fee, 0);
  assert.equal(neg.student.paid, 0);

  const noName = FF.importer.normaliseRecord({ fee: 10 }, 3);
  assert.equal(noName.ok, false);
  assert.match(noName.issue, /Row 4/);
});

test('planImport de-duplicates by name+class and honours modes', () => {
  const existing = [{ name: 'Ananya Rao', cls: '8-A', fee: 5000, paid: 1000 }];
  const incoming = [
    { name: 'ananya rao', cls: '8-a', fee: 5000, paid: 2500 },
    { name: 'New Kid', cls: '9-B', fee: 4000, paid: 0 },
    { name: 'New Kid', cls: '9-B', fee: 4000, paid: 0 },
  ];
  const merge = FF.importer.planImport(existing, incoming, 'merge');
  assert.equal(merge.updates.length, 1);
  assert.equal(merge.adds.length, 1);
  assert.equal(merge.skips, 1, 'duplicate inside the paste is skipped');

  const skip = FF.importer.planImport(existing, incoming, 'skip');
  assert.equal(skip.updates.length, 0);
  assert.equal(skip.adds.length, 1);

  const replace = FF.importer.planImport(existing, incoming, 'replace');
  assert.equal(replace.updates.length, 0);
  assert.equal(replace.adds.length, 2);
});

/* ---------------------------------------------------------------- store --- */

test('store: add / status / payment / undo flows', () => {
  FF.store.resetAll();
  const s = FF.store.addStudent({ name: 'Ananya Rao', cls: '8-A', fee: 5000, paid: 0 });
  assert.equal(s.status, 'unpaid');

  FF.store.recordPayment(s.id, 2500);
  assert.equal(FF.store.findStudent(s.id).status, 'partial');
  assert.equal(FF.store.findStudent(s.id).paid, 2500);

  FF.store.recordPayment(s.id, 99999, 'final');
  assert.equal(FF.store.findStudent(s.id).paid, 5000, 'paid is clamped to fee');
  assert.equal(FF.store.findStudent(s.id).status, 'paid');

  const entry = FF.store.deleteStudent(s.id);
  assert.equal(FF.store.currentStudents().length, 0);
  FF.store.restoreStudent(entry);
  assert.equal(FF.store.currentStudents().length, 1);
});

test('store: stats aggregate correctly', () => {
  FF.store.resetAll();
  FF.store.addStudent({ name: 'A', cls: '1', fee: 1000, paid: 1000 });
  FF.store.addStudent({ name: 'B', cls: '1', fee: 1000, paid: 500 });
  FF.store.addStudent({ name: 'C', cls: '2', fee: 2000, paid: 0 });
  const st = FF.store.stats();
  assert.equal(st.count, 3);
  assert.equal(st.fee, 4000);
  assert.equal(st.paid, 1500);
  assert.equal(st.pending, 2500);
  assert.deepEqual(st.counts, { paid: 1, partial: 1, unpaid: 1 });
  assert.equal(st.rate, 37.5);
});

test('store: months are independent and can carry balances forward', () => {
  FF.store.resetAll();
  const first = FF.store.getState().currentMonth;
  FF.store.addStudent({ name: 'A', cls: '1', fee: 1000, paid: 400 });

  const next = FF.addMonths(first, 1);
  const res = FF.store.createMonth(next, { copyFrom: first, carryPending: true });
  assert.equal(res.ok, true);
  assert.equal(FF.store.getState().currentMonth, next);
  const carried = FF.store.currentStudents()[0];
  assert.equal(carried.fee, 1600, 'unpaid 600 rolled into the new fee');
  assert.equal(carried.paid, 0);

  assert.equal(FF.store.students(first).length, 1, 'previous month untouched');
  assert.equal(FF.store.students(first)[0].fee, 1000);

  assert.equal(FF.store.createMonth(next, {}).ok, false, 'duplicate month refused');

  FF.store.deleteMonth(next);
  assert.equal(FF.store.getState().currentMonth, first);
});

test('store: import merges by name+class and updates the dashboard numbers', () => {
  FF.store.resetAll();
  FF.store.addStudent({ name: 'Ananya Rao', cls: '8-A', fee: 5000, paid: 1000 });

  const out = FF.store.importStudents([
    { name: 'Ananya Rao', cls: '8-A', fee: 5000, paid: 5000 },
    { name: 'Meera Singh', cls: '8-B', fee: 4500, paid: 0 },
  ], { mode: 'merge' });

  assert.deepEqual({ a: out.added, u: out.updated }, { a: 1, u: 1 });
  const st = FF.store.stats();
  assert.equal(st.count, 2);
  assert.equal(st.paid, 5000);
  assert.equal(st.counts.paid, 1);
  assert.equal(st.counts.unpaid, 1);
});

test('store: backup round-trip keeps months and settings', () => {
  FF.store.resetAll();
  FF.store.setSettings({ org: 'Sharma Tuitions', currency: '₹' });
  FF.store.addStudent({ name: 'A', cls: '1', fee: 10, paid: 0 });
  const backup = JSON.parse(FF.store.exportBackup());

  FF.store.resetAll();
  assert.equal(FF.store.settings().org, '');

  const res = FF.store.restoreBackup(backup);
  assert.equal(res.ok, true);
  assert.equal(FF.store.settings().org, 'Sharma Tuitions');
  assert.equal(FF.store.currentStudents()[0].name, 'A');
  assert.equal(FF.store.restoreBackup({ nope: true }).ok, false);
});

test('store: validation rules for manual edits', () => {
  FF.store.resetAll();
  const s = FF.store.addStudent({ name: 'A', cls: '1', fee: 1000, paid: 0 });
  FF.store.updateStudent(s.id, { paid: 5000 });
  assert.equal(FF.store.findStudent(s.id).paid, 1000, 'paid cannot exceed fee');
  FF.store.updateStudent(s.id, { fee: -5 });
  assert.equal(FF.store.findStudent(s.id).fee, 0, 'fee cannot be negative');
});

test('csv export escapes commas and quotes', () => {
  FF.store.resetAll();
  FF.store.addStudent({ name: 'Rao, Ananya "Anu"', cls: '8-A', fee: 1000, paid: 0 });
  const csv = FF.store.exportMonthCSV();
  assert.match(csv, /"Rao, Ananya ""Anu"""/);
});
