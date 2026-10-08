/* ==========================================================================
   FeeFlow — Import view: paste box first, file upload second, AI workflow
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  FF.views = FF.views || {};

  var lastResult = null;

  function monthOptions() {
    return FF.store.months().map(function (m) {
      var sel = m.month === FF.store.getState().currentMonth ? ' selected' : '';
      return '<option value="' + FF.attr(m.month) + '"' + sel + '>' + FF.esc(FF.monthLabel(m.month)) + ' (' + m.students.length + ')</option>';
    }).join('');
  }

  /* -------------------------------------------------------- analysis --- */

  function analyse(text) {
    var res = { stage: 'empty', issues: [], rows: [], students: [], plan: null, backup: false };
    if (!text || !text.trim()) return res;

    var parsed = FF.importer.parseJSON(text);
    if (!parsed.ok) {
      res.stage = 'invalid';
      res.detail = parsed.detail;
      return res;
    }
    if (FF.importer.looksLikeBackup(parsed.data)) {
      res.stage = 'backup';
      res.backup = parsed.data;
      return res;
    }
    var extracted = FF.importer.extractRecords(parsed.data);
    if (!extracted.records || !extracted.records.length) {
      res.stage = 'norecords';
      return res;
    }

    res.rows = extracted.records.map(function (raw, i) { return FF.importer.normaliseRecord(raw, i); });
    res.students = res.rows.filter(function (r) { return r.ok; }).map(function (r) { return r.student; });
    res.issues = res.rows.filter(function (r) { return !r.ok; }).map(function (r) { return r.issue; });
    res.warnings = res.rows.filter(function (r) { return r.ok && r.warnings.length; });

    if (!res.students.length) { res.stage = 'nostudents'; return res; }

    var mode = (FF.$('#imp-mode') || {}).value || 'merge';
    var target = (FF.$('#imp-month') || {}).value || FF.store.getState().currentMonth;
    res.plan = FF.importer.planImport(FF.store.students(target), res.students, mode);
    res.stage = 'ready';
    return res;
  }

  function checksHTML(res) {
    if (res.stage === 'empty') {
      return '<div class="check check--idle">' + FF.icons.icon('info') + 'Paste JSON above — FeeFlow checks it live as you type.</div>';
    }
    if (res.stage === 'invalid') {
      return (
        '<div class="check check--err">' + FF.icons.icon('alert') + 'Invalid JSON. Please check the format and try again.</div>' +
        (res.detail ? '<div class="check check--idle" style="padding-left:25px">' + FF.esc(res.detail) + '</div>' : '') +
        '<div class="check check--idle">' + FF.icons.icon('sparkles') + 'Tip: copy the JSON again from ChatGPT or Gemini, or load the sample to see the shape.</div>'
      );
    }
    if (res.stage === 'backup') {
      return (
        '<div class="check check--warn">' + FF.icons.icon('shield') + 'This looks like a FeeFlow backup, not a student list.</div>' +
        '<div class="check check--idle"><button type="button" class="btn btn--sm btn--soft" data-restore-backup>' + FF.icons.icon('refresh') + 'Restore this backup instead</button></div>'
      );
    }
    if (res.stage === 'norecords') {
      return '<div class="check check--err">' + FF.icons.icon('alert') + 'No student records were found in this JSON.</div>' +
        '<div class="check check--idle">Expected a list of students, e.g. {"students":[…]} or a plain array [ … ].</div>';
    }
    if (res.stage === 'nostudents') {
      return (
        '<div class="check check--err">' + FF.icons.icon('alert') + 'No usable student rows — every row was missing a name.</div>' +
        res.issues.slice(0, 4).map(function (i) { return '<div class="check check--idle" style="padding-left:25px">' + FF.esc(i) + '</div>'; }).join('')
      );
    }

    var out = [
      '<div class="check check--ok">' + FF.icons.icon('check') + 'JSON is valid</div>',
      '<div class="check check--ok">' + FF.icons.icon('check') + FF.plural(res.students.length, 'student') + ' detected</div>',
    ];
    if (res.issues.length) {
      out.push('<div class="check check--warn">' + FF.icons.icon('alert') + FF.plural(res.issues.length, 'row') + ' skipped: ' + FF.esc(res.issues[0]) + '</div>');
    }
    if (res.warnings && res.warnings.length) {
      out.push('<div class="check check--warn">' + FF.icons.icon('alert') + FF.plural(res.warnings.length, 'row') + ' auto-fixed (' + FF.esc(res.warnings[0].warnings[0]) + ')</div>');
    }
    if (res.plan) {
      out.push(
        '<div class="check check--ok">' + FF.icons.icon('check') + 'Ready to import — ' +
        '<b>' + res.plan.adds.length + ' new</b>, ' + res.plan.updates.length + ' updated, ' + res.plan.skips + ' unchanged</div>'
      );
    }
    return out.join('');
  }

  function previewHTML(res) {
    if (res.stage !== 'ready') return '';
    var rows = res.rows.filter(function (r) { return r.ok; }).slice(0, 40);
    return (
      '<div class="import-preview">' +
      '<div class="import-preview__head"><span class="micro">Preview</span>' +
      '<span class="dim" style="font-size:var(--fs-sm)">' + (res.rows.length > 40 ? 'first 40 of ' + res.rows.length : res.rows.length + ' rows') + '</span></div>' +
      '<div class="preview-rows">' +
      rows.map(function (r) {
        var s = r.student;
        return (
          '<div class="preview-row' + (r.warnings.length ? ' preview-row--warn' : '') + '">' +
          FF.ui.avatar(s.name) +
          '<b>' + FF.esc(s.name) + '</b>' +
          '<span class="muted">' + FF.esc(s.cls || '—') + ' · ' + FF.money.format(s.fee, FF.store.currency()) + ' / ' + FF.money.format(s.paid, FF.store.currency()) + '</span>' +
          FF.ui.pill(s.status) +
          '</div>'
        );
      }).join('') +
      '</div></div>'
    );
  }

  /* ------------------------------------------------------------- html --- */

  function pipelineHTML() {
    var steps = [
      ['camera', 'Photograph', 'Snap the fee register page'],
      ['sparkles', 'Ask AI', 'Upload it to ChatGPT or Gemini'],
      ['copy', 'Copy JSON', 'Copy the reply, fences and all'],
      ['inbox', 'Paste here', 'Import builds every record'],
    ];
    return (
      '<div class="pipeline">' +
      steps.map(function (s, i) {
        return '<div class="pipeline__step"><i>' + (i + 1) + '</i>' + FF.icons.icon(s[0]) + '<b>' + s[1] + '</b><span>' + s[2] + '</span></div>';
      }).join('') +
      '</div>'
    );
  }

  function html() {
    return (
      '<div class="view__head">' +
      '<div><h1 class="view__title">Import fees</h1>' +
      '<p class="view__sub">Copy the JSON from ChatGPT or Gemini, paste it in the box, tap import. No technical knowledge needed.</p></div>' +
      '</div>' +

      '<div class="card card--pad-sm anim-rise" style="margin-bottom:var(--sp-4)">' + pipelineHTML() + '</div>' +

      '<div class="grid-2--wide">' +
      '<div class="card paste-card anim-rise">' +
      '<div class="card__head"><div><h3 class="card__title">Paste JSON here</h3>' +
      '<p class="card__sub">Works with a plain paste from any AI chat</p></div>' +
      '<input type="file" id="imp-file" accept=".json,application/json,text/plain" hidden></div>' +

      '<div class="paste-card__bar">' +
      '<button type="button" class="btn btn--primary" id="imp-go" disabled>' + FF.icons.icon('inbox') + 'Import JSON</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="btn btn--sm btn--soft" data-upload>' + FF.icons.icon('upload') + 'Upload file</button>' +
      '<button type="button" class="btn btn--sm btn--soft" data-load-sample>' + FF.icons.icon('sparkles') + 'Load sample</button>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-copy-sample>' + FF.icons.icon('copy') + 'Copy example</button>' +
      '</div>' +

      '<div class="drop" id="imp-drop">' +
      '<textarea class="textarea" id="imp-input" spellcheck="false" autocapitalize="off" autocomplete="off" ' +
      'placeholder=\'{"students":[{"name":"Ananya Rao","class":"8-A","fee":5000,"paid":2500,"status":"partial"}]}\' ' +
      'aria-label="Paste JSON here"></textarea>' +
      '</div>' +

      '<div class="checks" id="imp-checks">' + checksHTML(analyse('')) + '</div>' +

      '<div class="form-grid form-grid--2" style="margin-top:var(--sp-4)">' +
      '<label class="field"><span class="field__label">Import into</span>' +
      '<select class="select" id="imp-month">' + monthOptions() + '</select></label>' +
      '<label class="field"><span class="field__label">If a student already exists</span>' +
      '<select class="select" id="imp-mode">' +
      '<option value="merge" selected>Update their fee &amp; payment</option>' +
      '<option value="skip">Skip them (keep my data)</option>' +
      '<option value="replace">Replace the whole month</option>' +
      '</select></label>' +
      '</div>' +

      '<div id="imp-preview"></div>' +
      '</div>' +

      '<div class="stack">' +
      '<div class="card card--pad-sm anim-rise">' +
      '<div class="card__head"><div><h3 class="card__title">The AI prompt</h3>' +
      '<p class="card__sub">One tap copies it — send it with your photo</p></div></div>' +
      '<div class="btn-row" style="margin-bottom:var(--sp-3)">' +
      '<button type="button" class="btn btn--primary btn--sm" data-copy-prompt>' + FF.icons.icon('copy') + 'Copy prompt</button>' +
      '<a class="btn btn--soft btn--sm" href="https://chatgpt.com" target="_blank" rel="noopener noreferrer">ChatGPT' + FF.icons.icon('external') + '</a>' +
      '<a class="btn btn--soft btn--sm" href="https://gemini.google.com" target="_blank" rel="noopener noreferrer">Gemini' + FF.icons.icon('external') + '</a>' +
      '</div>' +
      '<details class="help"><summary>Read the prompt first</summary><div class="help__body">' +
      '<pre class="prompt-box" style="max-height:220px">' + FF.esc(FF.importer.AI_PROMPT) + '</pre>' +
      '</div></details>' +
      '</div>' +

      '<div class="card card--pad-sm anim-rise">' +
      '<div class="card__head"><div><h3 class="card__title">Example JSON</h3>' +
      '<p class="card__sub">The exact shape FeeFlow expects</p></div></div>' +
      '<pre class="prompt-box" style="max-height:200px">' + FF.esc(FF.importer.SAMPLE_JSON) + '</pre>' +
      '<div class="btn-row" style="margin-top:var(--sp-3)">' +
      '<button type="button" class="btn btn--soft btn--sm" data-load-sample>' + FF.icons.icon('zap') + 'Load sample JSON</button>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-copy-sample>' + FF.icons.icon('copy') + 'Copy example</button>' +
      '</div></div>' +

      '<details class="help anim-rise"><summary>How the whole workflow works</summary><div class="help__body">' +
      '<ol class="steps">' +
      [['Take a photo of the register', 'Any phone camera is fine — keep the rows readable.'],
       ['Open ChatGPT or Gemini', 'The free versions work perfectly well.'],
       ['Upload the image with the prompt', 'Use “Copy prompt” above so nothing is typed by hand.'],
       ['Copy the generated JSON', 'Select all of the reply and copy it, code fences included.'],
       ['Open FeeFlow', 'Right here, on this page.'],
       ['Paste it into the typing box', 'The big box on the left — tap and hold, then paste.'],
       ['Tap Import JSON', 'FeeFlow validates, de-duplicates and builds the records.'],
       ['Track fees', 'Dashboard, chart and month totals update instantly.']].map(function (s) {
        return '<li><div><b>' + s[0] + '</b><p>' + s[1] + '</p></div></li>';
      }).join('') +
      '</ol></div></details>' +

      '<details class="help anim-rise"><summary>Formats & field names FeeFlow understands</summary><div class="help__body">' +
      '<p>{"students":[…]}, {"data":[…]} or a plain array [ … ] all work.</p>' +
      '<p><b>Name:</b> <span class="code">name</span> <span class="code">student</span> <span class="code">student_name</span></p>' +
      '<p><b>Class:</b> <span class="code">class</span> <span class="code">className</span> <span class="code">section</span> (class + section are combined)</p>' +
      '<p><b>Fee:</b> <span class="code">fee</span> <span class="code">total_fee</span> <span class="code">total</span></p>' +
      '<p><b>Paid:</b> <span class="code">paid</span> <span class="code">amount_paid</span> (missing means 0)</p>' +
      '<p><b>Status:</b> <span class="code">status</span> <span class="code">payment_status</span> — recalculated from the numbers anyway</p>' +
      '<p><b>Extras:</b> <span class="code">roll</span>, <span class="code">phone</span>, <span class="code">note</span> are kept when present. Money like “₹5,000” or “2,500.00” is understood.</p>' +
      '</div></details>' +
      '</div>' +
      '</div>'
    );
  }

  /* ---------------------------------------------------------- actions --- */

  function doImport(host) {
    var res = lastResult;
    if (!res || res.stage !== 'ready') return;
    var mode = FF.$('#imp-mode', host).value;
    var monthKey = FF.$('#imp-month', host).value;
    var out = FF.store.importStudents(res.students, { mode: mode, monthKey: monthKey });

    var msg = '✓ ' + out.added + (out.added === 1 ? ' student' : ' students') + ' imported successfully';
    if (out.updated) msg += ', ' + out.updated + ' updated';
    if (out.skipped) msg += ', ' + out.skipped + ' unchanged';
    FF.toast.show(msg, { type: 'ok', timeout: 5200 });

    var input = FF.$('#imp-input', host);
    input.value = '';
    refresh(host);
    input.focus();
  }

  function refresh(host) {
    var input = FF.$('#imp-input', host);
    lastResult = analyse(input ? input.value : '');
    FF.$('#imp-checks', host).innerHTML = checksHTML(lastResult);
    FF.$('#imp-preview', host).innerHTML = previewHTML(lastResult);
    var go = FF.$('#imp-go', host);
    go.disabled = lastResult.stage !== 'ready';
  }

  function bind(host) {
    var input = FF.$('#imp-input', host);
    var drop = FF.$('#imp-drop', host);
    var file = FF.$('#imp-file', host);

    input.addEventListener('input', FF.debounce(function () { refresh(host); }, 180));
    input.addEventListener('paste', function () { setTimeout(function () { refresh(host); }, 0); });

    FF.$('#imp-go', host).addEventListener('click', function () { doImport(host); });
    FF.$('#imp-mode', host).addEventListener('change', function () { refresh(host); });
    FF.$('#imp-month', host).addEventListener('change', function () { refresh(host); });

    /* drag & drop is a bonus — the paste box and upload button are the main paths */
    ['dragenter', 'dragover'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f, host);
    });

    FF.$('[data-upload]', host).addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      // resetting immediately means picking the same file twice still fires
      file.value = '';
      if (f) handleFile(f, host);
    });

    if (!host.dataset.boundImport) {
      host.dataset.boundImport = '1';
      host.addEventListener('click', function (e) {
        if (e.target.closest('[data-load-sample]')) {
          FF.$('#imp-input', host).value = FF.importer.SAMPLE_JSON;
          refresh(host);
          FF.toast.show('Sample loaded — tap Import JSON to try it.', { type: 'info' });
          return;
        }
        if (e.target.closest('[data-copy-sample]')) {
          FF.copyText(FF.importer.SAMPLE_JSON).then(
            function () { FF.toast.show('Example JSON copied.', { type: 'ok' }); },
            function () { FF.toast.show('Could not copy — select the example text manually.', { type: 'warn' }); }
          );
          return;
        }
        if (e.target.closest('[data-copy-prompt]')) {
          FF.copyText(FF.importer.AI_PROMPT).then(
            function () { FF.toast.show('Prompt copied — paste it into ChatGPT or Gemini with your photo.', { type: 'ok', timeout: 5000 }); },
            function () { FF.toast.show('Could not copy the prompt.', { type: 'warn' }); }
          );
          return;
        }
        if (e.target.closest('[data-restore-backup]')) {
          if (lastResult && lastResult.backup) FF.app.restoreFromObject(lastResult.backup);
        }
      });
    }
  }

  function handleFile(f, host) {
    if (f.size > 4 * 1024 * 1024) {
      FF.toast.show('That file is too large (max 4 MB).', { type: 'err' });
      return;
    }
    FF.readFileAsText(f).then(function (text) {
      var input = FF.$('#imp-input', host);
      input.value = text;
      refresh(host);
      if (lastResult.stage === 'ready') {
        doImport(host);
      } else if (lastResult.stage === 'invalid') {
        FF.toast.show('Invalid JSON in that file. The details are under the paste box.', { type: 'err' });
      } else if (lastResult.stage === 'backup') {
        FF.toast.show('That file is a FeeFlow backup — use “Restore this backup instead”.', { type: 'warn' });
      } else {
        FF.toast.show('No student records were found in that file.', { type: 'err' });
      }
    }).catch(function () {
      FF.toast.show('Could not read that file. Try again or paste the JSON instead.', { type: 'err' });
    });
  }

  FF.views.import = {
    mount: function (host) {
      host.innerHTML = html();
      bind(host);
      refresh(host);
    },
    update: function (host) {
      // keep typed text; only refresh month options + validation
      var monthSel = FF.$('#imp-month', host);
      var keep = monthSel ? monthSel.value : null;
      monthSel.innerHTML = monthOptions();
      if (keep && FF.store.hasMonth(keep)) monthSel.value = keep;
      refresh(host);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
