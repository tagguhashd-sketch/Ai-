/* ==========================================================================
   FeeFlow — JSON import engine
   Parse → extract → normalise → validate → plan (de-duplicate) → hand to store
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;

  var NAME_KEYS = ['name', 'student', 'student_name', 'studentname', 'full_name', 'fullname', 'student_name_', 'candidate', 'child'];
  var CLASS_KEYS = ['class', 'classname', 'class_name', 'cls', 'section', 'standard', 'grade', 'batch', 'group', 'div', 'division'];
  var SECTION_KEYS = ['section', 'sec', 'division', 'div'];
  var FEE_KEYS = ['fee', 'total_fee', 'totalfee', 'total', 'fees', 'amount', 'fee_amount', 'monthly_fee', 'tuition', 'tuition_fee', 'total_amount', 'due_amount', 'billed'];
  var PAID_KEYS = ['paid', 'amount_paid', 'amountpaid', 'paid_amount', 'received', 'collected', 'deposit', 'payment', 'payments', 'paid_amount_', 'advance'];
  var STATUS_KEYS = ['status', 'payment_status', 'paymentstatus', 'state', 'fee_status'];
  var ROLL_KEYS = ['roll', 'roll_no', 'rollno', 'sr', 'sr_no', 'sno', 's_no', 'id', 'student_id', 'adm', 'admission_no'];
  var PHONE_KEYS = ['phone', 'mobile', 'contact', 'phone_no', 'mobileno', 'guardian_phone', 'whatsapp'];
  var NOTE_KEYS = ['note', 'notes', 'remark', 'remarks', 'comment', 'comments'];

  var ARRAY_KEYS = ['students', 'data', 'records', 'rows', 'list', 'entries', 'fees', 'fee_records', 'items', 'results'];

  var SAMPLE_JSON = JSON.stringify(
    {
      students: [
        { name: 'Ananya Rao', class: '8-A', fee: 5000, paid: 5000, status: 'paid' },
        { name: 'Rahul Kumar', class: '8-A', fee: 5000, paid: 2500, status: 'partial' },
        { name: 'Meera Singh', class: '8-B', fee: 4500, paid: 0, status: 'unpaid' },
      ],
    },
    null,
    2
  );

  var AI_PROMPT = [
    'Read this student-fee register image and convert it into FeeFlow JSON.',
    '',
    'Return ONLY valid JSON. Do not include markdown or explanations.',
    '',
    'Use this exact format:',
    '',
    '{',
    '  "students": [',
    '    {',
    '      "name": "Ananya Rao",',
    '      "class": "8-A",',
    '      "fee": 5000,',
    '      "paid": 2500,',
    '      "status": "partial"',
    '    }',
    '  ]',
    '}',
    '',
    'For every visible student, copy:',
    '',
    '- name',
    '- class/section',
    '- total fee',
    '- amount paid',
    '',
    'The status must be exactly one of:',
    '',
    'paid',
    'partial',
    'unpaid',
    '',
    'Rules:',
    '',
    'paid = fee → paid',
    '',
    'paid between 1 and fee-1 → partial',
    '',
    'paid = 0 → unpaid',
    '',
    'Use numbers only for fee and paid.',
    '',
    'Do not guess unreadable values.',
    '',
    'If the paid amount is missing or unreadable, use 0.',
    '',
    'Keep the visible student name and class.',
    '',
    'Return one students array containing every visible student row.',
  ].join('\n');

  /* ------------------------------------------------------------- parse --- */

  function parseJSON(text) {
    var raw = String(text == null ? '' : text);
    var cleaned = raw.replace(/^\uFEFF/, '').trim();
    if (!cleaned) return { ok: false, error: 'empty' };

    // tolerate ```json fences copied out of ChatGPT / Gemini
    cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();

    try {
      return { ok: true, data: JSON.parse(cleaned) };
    } catch (err) {
      return { ok: false, error: 'syntax', detail: friendlySyntaxError(err, cleaned) };
    }
  }

  function friendlySyntaxError(err, text) {
    var m = /position (\d+)/i.exec(err && err.message ? err.message : '');
    if (!m) return 'The JSON could not be read. Check for missing commas, quotes or brackets.';
    var pos = Math.min(Number(m[1]), text.length);
    var from = Math.max(0, pos - 40);
    var snippet = text.slice(from, pos + 40).replace(/\s+/g, ' ');
    return 'Stopped near “…' + snippet + '…". Check for a missing comma, quote or bracket around there.';
  }

  /** true when the payload is a FeeFlow backup rather than a student list */
  function looksLikeBackup(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
    if (data.app === 'feeflow' || data.__feeflow) return true;
    return Array.isArray(data.months) && data.months.some(function (m) {
      return m && typeof m === 'object' && Array.isArray(m.students);
    });
  }

  /** pull the record array out of any supported envelope */
  function extractRecords(data) {
    if (Array.isArray(data)) return { records: data, source: 'array' };
    if (!data || typeof data !== 'object') return { records: null, source: 'none' };

    for (var i = 0; i < ARRAY_KEYS.length; i++) {
      var v = data[ARRAY_KEYS[i]];
      if (Array.isArray(v)) return { records: v, source: ARRAY_KEYS[i] };
    }
    // last resort: any array-of-objects property
    var keys = Object.keys(data);
    for (var k = 0; k < keys.length; k++) {
      var candidate = data[keys[k]];
      if (Array.isArray(candidate) && candidate.length && candidate.every(function (r) { return r && typeof r === 'object' && !Array.isArray(r); })) {
        return { records: candidate, source: keys[k] };
      }
    }
    return { records: null, source: 'none' };
  }

  /* -------------------------------------------------------- normalise --- */

  function pick(obj, keys) {
    var lower = {};
    Object.keys(obj).forEach(function (k) { lower[k.toLowerCase().replace(/[\s.-]/g, '_')] = obj[k]; });
    for (var i = 0; i < keys.length; i++) {
      if (lower[keys[i]] !== undefined && lower[keys[i]] !== null && String(lower[keys[i]]).trim() !== '') {
        return lower[keys[i]];
      }
    }
    return undefined;
  }

  function cleanName(v) {
    return String(v).replace(/\s+/g, ' ').trim();
  }

  function cleanClass(obj) {
    var cls = pick(obj, CLASS_KEYS);
    var sec = pick(obj, SECTION_KEYS);
    var clsStr = cls === undefined || cls === null ? '' : cleanName(cls);
    var secStr = sec === undefined || sec === null ? '' : cleanName(sec);
    if (clsStr && secStr && clsStr.toLowerCase().indexOf(secStr.toLowerCase()) === -1) {
      return clsStr + '-' + secStr;
    }
    return clsStr || secStr;
  }

  function normKey(name, cls) {
    return (cleanName(name).toLowerCase() + '|' + cleanName(cls).toLowerCase());
  }

  function coerceAmount(value, warnings, label) {
    if (value === undefined) return 0;
    var n = FF.money.toNumber(value);
    if (isNaN(n)) {
      warnings.push(label + ' "' + String(value).slice(0, 24) + '" could not be read, using 0');
      return 0;
    }
    if (n < 0) {
      warnings.push(label + ' was negative, using 0');
      return 0;
    }
    return FF.money.round2(n);
  }

  function normaliseStatus(text, fee, paid) {
    var s = String(text || '').trim().toLowerCase();
    if (!s) return null;
    if (s === 'paid' || s === 'full' || s === 'complete' || s === 'completed' || s === 'settled' || s === 'yes') return 'paid';
    if (s === 'partial' || s === 'part' || s === 'half' || s === 'partially paid') return 'partial';
    if (s === 'unpaid' || s === 'due' || s === 'pending' || s === 'no' || s === 'not paid') return 'unpaid';
    return null;
  }

  /** status is always derived from the numbers — single source of truth */
  function computeStatus(fee, paid) {
    if (paid >= fee) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
  }

  function normaliseRecord(raw, index) {
    var warnings = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false, issue: 'Row ' + (index + 1) + ' is not a student object.' };
    }

    var name = cleanName(pick(raw, NAME_KEYS) || '');
    if (!name) {
      return { ok: false, issue: 'Row ' + (index + 1) + ' has no student name, so it was skipped.' };
    }

    var cls = cleanClass(raw);
    var fee = coerceAmount(pick(raw, FEE_KEYS), warnings, 'Fee');
    var paid = coerceAmount(pick(raw, PAID_KEYS), warnings, 'Paid amount');
    var statusHint = normaliseStatus(pick(raw, STATUS_KEYS), fee, paid);

    // let an explicit status repair missing numbers
    if (statusHint === 'paid' && paid === 0 && fee > 0) {
      paid = fee;
      warnings.push('Marked paid with no amount, so paid was set to the full fee');
    }
    if (paid > fee && fee > 0) {
      warnings.push('Paid was more than the fee, so it was capped at the fee');
      paid = fee;
    }

    var phoneRaw = pick(raw, PHONE_KEYS);
    var phone = phoneRaw === undefined ? '' : String(phoneRaw).replace(/[^\d+()-\s]/g, '').trim();

    return {
      ok: true,
      warnings: warnings,
      student: {
        name: name,
        cls: cls,
        fee: fee,
        paid: paid,
        status: computeStatus(fee, paid),
        roll: cleanName(pick(raw, ROLL_KEYS) || ''),
        phone: phone,
        note: cleanName(pick(raw, NOTE_KEYS) || ''),
      },
    };
  }

  function normaliseAll(records) {
    var students = [], issues = [], warnings = 0;
    (records || []).forEach(function (raw, i) {
      var res = normaliseRecord(raw, i);
      if (!res.ok) { issues.push(res.issue); return; }
      warnings += res.warnings.length;
      students.push(res.student);
    });
    return { students: students, issues: issues, warnings: warnings };
  }

  /* ------------------------------------------------------------- plan --- */

  /**
   * Decide what an import will do before doing it.
   * mode: 'merge' (default) | 'skip' | 'replace'
   */
  function planImport(existing, incoming, mode) {
    var index = {};
    (existing || []).forEach(function (s) { index[normKey(s.name, s.cls)] = s; });

    var adds = [], updates = [], skips = 0;
    var seen = {};

    incoming.forEach(function (rec) {
      var key = normKey(rec.name, rec.cls);
      if (seen[key]) { skips += 1; return; } // duplicate inside the same paste
      seen[key] = true;

      var match = mode !== 'replace' ? index[key] : null;
      if (!match) { adds.push(rec); return; }
      if (mode === 'skip') { skips += 1; return; }
      if (match.fee === rec.fee && match.paid === rec.paid && (match.cls || '') === (rec.cls || '')) {
        skips += 1;
        return;
      }
      updates.push({ existing: match, incoming: rec });
    });

    return { adds: adds, updates: updates, skips: skips };
  }

  FF.importer = {
    parseJSON: parseJSON,
    looksLikeBackup: looksLikeBackup,
    extractRecords: extractRecords,
    normaliseRecord: normaliseRecord,
    normaliseAll: normaliseAll,
    computeStatus: computeStatus,
    planImport: planImport,
    normKey: normKey,
    SAMPLE_JSON: SAMPLE_JSON,
    AI_PROMPT: AI_PROMPT,
  };
})(typeof window !== 'undefined' ? window : globalThis);
