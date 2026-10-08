/* ==========================================================================
   FeeFlow — state, persistence (localStorage) and every mutation action
   Data never leaves the browser unless the user exports it themselves.
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var STORAGE_KEY = 'feeflow_v1';
  var ACTIVITY_CAP = 80;

  var state = null;
  var listeners = [];
  var saveTimer = null;
  var saveErrorHook = null;

  /**
   * localStorage can throw just by being touched (private mode, some
   * file:// setups, blocked cookies). Probe once, degrade gracefully:
   * FeeFlow still works for the session, it just cannot persist.
   */
  var storageOK = (function () {
    try {
      var probe = '__feeflow_probe__';
      root.localStorage.setItem(probe, '1');
      root.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function hasStorage() { return storageOK; }

  /* -------------------------------------------------------- lifecycle --- */

  function blankMonth(key) {
    return { month: key, students: [], createdAt: Date.now() };
  }

  function defaults() {
    var key = FF.todayKey();
    return {
      version: 1,
      settings: { theme: 'ink', currency: '₹', org: '' },
      months: [blankMonth(key)],
      currentMonth: key,
      activity: [],
    };
  }

  function sanitizeStudent(raw, i) {
    if (!raw || typeof raw !== 'object') return null;
    var fee = Math.max(0, FF.money.round2(Number(raw.fee) || 0));
    var paid = FF.money.round2(Number(raw.paid) || 0);
    paid = Math.max(0, Math.min(paid, fee));
    var name = String(raw.name || '').replace(/\s+/g, ' ').trim();
    if (!name) return null;
    return {
      id: String(raw.id || FF.uid('s')),
      name: name,
      cls: String(raw.cls != null ? raw.cls : raw.class != null ? raw.class : '').trim(),
      fee: fee,
      paid: paid,
      status: FF.importer.computeStatus(fee, paid),
      roll: String(raw.roll || '').trim(),
      phone: String(raw.phone || '').trim(),
      note: String(raw.note || '').trim(),
      createdAt: Number(raw.createdAt) || Date.now(),
      updatedAt: Number(raw.updatedAt) || Number(raw.createdAt) || Date.now(),
    };
  }

  function sanitizeMonth(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var key = String(raw.month || '').trim();
    if (!FF.keyParts(key)) return null;
    var students = Array.isArray(raw.students)
      ? raw.students.map(function (s, i) { return sanitizeStudent(s, i); }).filter(Boolean)
      : [];
    return { month: key, students: students, createdAt: Number(raw.createdAt) || Date.now() };
  }

  function sanitize(data) {
    var base = defaults();
    if (!data || typeof data !== 'object') return base;
    var out = {
      version: 1,
      settings: Object.assign({}, base.settings, data.settings || {}),
      months: Array.isArray(data.months) ? data.months.map(sanitizeMonth).filter(Boolean) : [],
      currentMonth: String(data.currentMonth || ''),
      activity: Array.isArray(data.activity) ? data.activity.slice(0, ACTIVITY_CAP) : [],
    };
    if (out.settings.theme !== 'paper') out.settings.theme = 'ink';
    out.settings.currency = String(out.settings.currency || '₹').slice(0, 4);
    out.settings.org = String(out.settings.org || '').slice(0, 80);
    if (!out.months.length) out.months = [blankMonth(FF.todayKey())];
    // de-duplicate month keys
    var seen = {};
    out.months = out.months.filter(function (m) {
      if (seen[m.month]) return false;
      seen[m.month] = true;
      return true;
    });
    if (!out.months.some(function (m) { return m.month === out.currentMonth; })) {
      out.currentMonth = out.months[0].month;
    }
    out.months.sort(function (a, b) { return a.month < b.month ? 1 : -1; });
    return out;
  }

  function load() {
    var data = null;
    if (storageOK) {
      try {
        var text = root.localStorage.getItem(STORAGE_KEY);
        if (text) data = JSON.parse(text);
      } catch (e) {
        data = null;
      }
    }
    state = sanitize(data);
    return state;
  }

  function writeNow() {
    if (!storageOK) return false;
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      if (saveErrorHook) saveErrorHook(e);
      return false;
    }
  }

  /** persist soon (coalesces bursts of edits into one write) */
  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(function () {
      saveTimer = null;
      writeNow();
    }, 120);
  }

  function flush() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    writeNow();
  }

  /* ------------------------------------------------------- pub/sub --- */

  function subscribe(fn) {
    listeners.push(fn);
    return function () {
      listeners = listeners.filter(function (l) { return l !== fn; });
    };
  }

  function emit(reason) {
    save();
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](reason, state); } catch (e) { /* one bad listener must not break the app */ }
    }
  }

  /* --------------------------------------------------------- getters --- */

  function getState() { return state; }
  function settings() { return state.settings; }
  function currency() { return state.settings.currency || '₹'; }

  function months() { return state.months; }

  function month(key) {
    var k = key || state.currentMonth;
    return state.months.filter(function (m) { return m.month === k; })[0] || null;
  }

  function currentMonth() { return month(state.currentMonth); }
  function students(key) { var m = month(key); return m ? m.students : []; }
  function currentStudents() { return students(state.currentMonth); }

  function findStudent(id, key) {
    var list = students(key);
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  /** every aggregate the dashboard, chart and report need */
  function stats(key) {
    var list = students(key);
    var s = {
      count: list.length,
      fee: 0, paid: 0, pending: 0,
      counts: { paid: 0, partial: 0, unpaid: 0 },
      rate: 0,
      withPending: 0,
    };
    for (var i = 0; i < list.length; i++) {
      var st = list[i];
      s.fee += st.fee;
      s.paid += st.paid;
      s.pending += Math.max(0, st.fee - st.paid);
      s.counts[st.status] = (s.counts[st.status] || 0) + 1;
      if (st.fee - st.paid > 0.004) s.withPending += 1;
    }
    s.fee = FF.money.round2(s.fee);
    s.paid = FF.money.round2(s.paid);
    s.pending = FF.money.round2(s.pending);
    s.rate = FF.money.pct(s.paid, s.fee);
    return s;
  }

  /** distinct classes in the current month, for filter chips */
  function classList(key) {
    var seen = {};
    students(key).forEach(function (s) {
      var c = s.cls || 'No class';
      seen[c] = (seen[c] || 0) + 1;
    });
    return Object.keys(seen).sort().map(function (c) { return { name: c, count: seen[c] }; });
  }

  function activity() { return state.activity; }

  function log(type, text, amount, monthKey) {
    state.activity.unshift({
      id: FF.uid('a'),
      type: type,
      text: text,
      amount: amount == null ? null : amount,
      month: monthKey || state.currentMonth,
      at: Date.now(),
    });
    if (state.activity.length > ACTIVITY_CAP) state.activity.length = ACTIVITY_CAP;
  }

  /* --------------------------------------------------------- actions --- */

  function touch(s) { s.updatedAt = Date.now(); s.status = FF.importer.computeStatus(s.fee, s.paid); }

  function addStudent(data, monthKey) {
    var m = month(monthKey) || currentMonth();
    var st = sanitizeStudent(Object.assign({ id: FF.uid('s'), createdAt: Date.now() }, data));
    if (!st) return null;
    touch(st);
    m.students.unshift(st);
    log('new', st.name + ' added to ' + FF.monthLabel(m.month, true), null, m.month);
    emit('students');
    return st;
  }

  function updateStudent(id, patch, monthKey) {
    var st = findStudent(id, monthKey);
    if (!st) return null;
    if (patch.name !== undefined) st.name = String(patch.name).replace(/\s+/g, ' ').trim() || st.name;
    if (patch.cls !== undefined) st.cls = String(patch.cls).trim();
    if (patch.roll !== undefined) st.roll = String(patch.roll).trim();
    if (patch.phone !== undefined) st.phone = String(patch.phone).trim();
    if (patch.note !== undefined) st.note = String(patch.note).trim();
    if (patch.fee !== undefined) st.fee = Math.max(0, FF.money.round2(Number(patch.fee) || 0));
    if (patch.paid !== undefined) st.paid = Math.max(0, FF.money.round2(Number(patch.paid) || 0));
    if (st.paid > st.fee) st.paid = st.fee;
    touch(st);
    log('edit', st.name + ' updated', null, monthKey || state.currentMonth);
    emit('students');
    return st;
  }

  function deleteStudent(id, monthKey) {
    var m = month(monthKey) || currentMonth();
    var idx = -1;
    for (var i = 0; i < m.students.length; i++) if (m.students[i].id === id) { idx = i; break; }
    if (idx === -1) return null;
    var removed = m.students.splice(idx, 1)[0];
    log('delete', removed.name + ' removed', null, m.month);
    emit('students');
    return { student: removed, index: idx, month: m.month };
  }

  function restoreStudent(entry) {
    var m = month(entry.month);
    if (!m) return false;
    m.students.splice(Math.min(entry.index, m.students.length), 0, entry.student);
    log('new', entry.student.name + ' restored', null, m.month);
    emit('students');
    return true;
  }

  /** add money against a student; clamped so paid never exceeds fee */
  function recordPayment(id, amount, note, monthKey) {
    var st = findStudent(id, monthKey);
    if (!st) return null;
    var amt = FF.money.round2(Math.max(0, Number(amount) || 0));
    var before = st.paid;
    st.paid = Math.min(st.fee, FF.money.round2(st.paid + amt));
    if (note) st.note = String(note).trim();
    touch(st);
    var got = FF.money.round2(st.paid - before);
    log('payment', st.name + (st.status === 'paid' ? ' settled in full' : ' paid ' + currency() + FF.money.format(got, currency())), got, monthKey || state.currentMonth);
    emit('payment');
    return { student: st, applied: got };
  }

  function setMonth(key) {
    if (!month(key)) return false;
    state.currentMonth = key;
    emit('month');
    return true;
  }

  function hasMonth(key) { return !!month(key); }

  function createMonth(key, opts) {
    if (month(key)) return { ok: false, error: FF.monthLabel(key) + ' already exists.' };
    if (!FF.keyParts(key)) return { ok: false, error: 'Pick a valid month.' };
    var o = opts || {};
    var m = blankMonth(key);
    if (o.copyFrom && month(o.copyFrom)) {
      var src = month(o.copyFrom);
      m.students = src.students.map(function (s) {
        var pending = Math.max(0, FF.money.round2(s.fee - s.paid));
        var fee = s.fee;
        if (o.carryPending) fee = FF.money.round2(s.fee + pending);
        return sanitizeStudent({
          id: FF.uid('s'), name: s.name, cls: s.cls, roll: s.roll, phone: s.phone,
          note: s.note, fee: fee, paid: 0, createdAt: Date.now(),
        });
      }).filter(Boolean);
    }
    state.months.push(m);
    state.months.sort(function (a, b) { return a.month < b.month ? 1 : -1; });
    state.currentMonth = key;
    log('month', FF.monthLabel(key) + ' created', null, key);
    emit('months');
    return { ok: true, month: m };
  }

  function deleteMonth(key) {
    var idx = state.months.findIndex(function (m) { return m.month === key; });
    if (idx === -1) return false;
    var removed = state.months.splice(idx, 1)[0];
    if (!state.months.length) state.months.push(blankMonth(FF.todayKey()));
    if (state.currentMonth === key) state.currentMonth = state.months[0].month;
    log('month', FF.monthLabel(key) + ' deleted (' + removed.students.length + ' records)', null, state.currentMonth);
    emit('months');
    return true;
  }

  /** bulk import already-normalised records into a month */
  function importStudents(records, opts) {
    var o = opts || {};
    var m = month(o.monthKey) || currentMonth();
    var mode = o.mode || 'merge';
    if (mode === 'replace') m.students = [];
    var plan = FF.importer.planImport(m.students, records, mode);

    plan.adds.forEach(function (rec) {
      var st = sanitizeStudent(Object.assign({ id: FF.uid('s'), createdAt: Date.now() }, rec));
      if (st) { touch(st); m.students.unshift(st); }
    });
    plan.updates.forEach(function (u) {
      var st = u.existing;
      st.fee = u.incoming.fee;
      st.paid = u.incoming.paid;
      if (u.incoming.cls) st.cls = u.incoming.cls;
      if (u.incoming.roll) st.roll = u.incoming.roll;
      if (u.incoming.phone) st.phone = u.incoming.phone;
      if (u.incoming.note) st.note = u.incoming.note;
      touch(st);
    });

    state.currentMonth = m.month;
    log('import', plan.adds.length + ' imported, ' + plan.updates.length + ' updated in ' + FF.monthLabel(m.month, true), null, m.month);
    emit('import');
    return { added: plan.adds.length, updated: plan.updates.length, skipped: plan.skips, month: m.month };
  }

  /* --------------------------------------------------------- settings --- */

  function setSettings(patch) {
    Object.assign(state.settings, patch || {});
    emit('settings');
  }

  /* ----------------------------------------------------- backup/restore --- */

  function exportBackup() {
    flush();
    return JSON.stringify(
      { app: 'feeflow', version: 1, exportedAt: new Date().toISOString(), data: state },
      null,
      2
    );
  }

  function restoreBackup(obj) {
    var payload = obj && obj.data && obj.data.months ? obj.data : obj;
    if (!payload || !Array.isArray(payload.months) || !payload.months.length) {
      return { ok: false, error: 'That file is not a FeeFlow backup.' };
    }
    var next = sanitize(payload);
    state.months = next.months;
    state.currentMonth = next.currentMonth;
    state.activity = next.activity;
    state.settings = Object.assign({}, state.settings, next.settings, { theme: state.settings.theme });
    log('month', 'Backup restored (' + next.months.length + ' months)', null, state.currentMonth);
    emit('restore');
    return { ok: true, months: next.months.length };
  }

  function exportMonthCSV(key) {
    var list = students(key);
    var rows = [['Name', 'Class', 'Roll', 'Phone', 'Fee', 'Paid', 'Pending', 'Status']];
    list.forEach(function (s) {
      rows.push([s.name, s.cls, s.roll, s.phone, s.fee, s.paid, Math.max(0, s.fee - s.paid), s.status]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (cell) {
        var v = String(cell == null ? '' : cell);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
      }).join(',');
    }).join('\n');
    return csv;
  }

  function resetAll() {
    state = defaults();
    flush();
    emit('reset');
  }

  function storageBytes() {
    if (!storageOK) return 0;
    try {
      return (root.localStorage.getItem(STORAGE_KEY) || '').length;
    } catch (e) { return 0; }
  }

  function onStorageError(fn) { saveErrorHook = fn; }

  FF.store = {
    KEY: STORAGE_KEY,
    hasStorage: hasStorage,
    load: load,
    save: save,
    flush: flush,
    subscribe: subscribe,
    getState: getState,
    settings: settings,
    currency: currency,
    months: months,
    month: month,
    currentMonth: currentMonth,
    students: students,
    currentStudents: currentStudents,
    findStudent: findStudent,
    stats: stats,
    classList: classList,
    activity: activity,
    addStudent: addStudent,
    updateStudent: updateStudent,
    deleteStudent: deleteStudent,
    restoreStudent: restoreStudent,
    recordPayment: recordPayment,
    setMonth: setMonth,
    hasMonth: hasMonth,
    createMonth: createMonth,
    deleteMonth: deleteMonth,
    importStudents: importStudents,
    setSettings: setSettings,
    exportBackup: exportBackup,
    restoreBackup: restoreBackup,
    exportMonthCSV: exportMonthCSV,
    resetAll: resetAll,
    storageBytes: storageBytes,
    onStorageError: onStorageError,
  };
})(typeof window !== 'undefined' ? window : globalThis);
