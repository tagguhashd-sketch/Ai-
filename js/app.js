/* ==========================================================================
   FeeFlow — bootstrap, shell, global actions
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var viewHost = null;
  var currentView = 'dashboard';
  var installPrompt = null;

  /* ------------------------------------------------------------- shell --- */

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = FF.$('#theme-btn');
    if (btn) btn.innerHTML = FF.icons.icon(theme === 'ink' ? 'sun' : 'moon');
    var meta = FF.$('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'ink' ? '#0a0f0e' : '#f4f2ec');
  }

  function setTheme(theme) {
    FF.store.setSettings({ theme: theme });
    applyTheme(theme);
  }

  function paintMonthChip() {
    var label = FF.$('#month-chip .month-chip__label');
    if (label) label.textContent = FF.monthLabel(FF.store.getState().currentMonth);
  }

  function monthPopover() {
    var old = FF.$('#month-pop');
    if (old) { old.remove(); return; }
    var chip = FF.$('#month-chip');
    var pop = document.createElement('div');
    pop.id = 'month-pop';
    pop.className = 'month-pop';
    pop.innerHTML =
      '<div class="month-pop__head"><span class="micro">Switch month</span>' +
      '<button type="button" class="btn btn--sm btn--brand-soft" data-pop-new>' + FF.icons.icon('plus') + 'New</button></div>' +
      '<div class="month-pop__list">' +
      FF.store.months().map(function (m) {
        var active = m.month === FF.store.getState().currentMonth;
        var s = FF.store.stats(m.month);
        return '<button type="button" class="month-pop__item' + (active ? ' is-active' : '') + '" data-pop-month="' + FF.attr(m.month) + '">' +
          '<span class="month-pop__name">' + FF.esc(FF.monthLabel(m.month)) + '</span>' +
          '<span class="month-pop__meta">' + m.students.length + ' · ' + s.rate + '%</span></button>';
      }).join('') +
      '</div>';
    document.body.appendChild(pop);
    chip.setAttribute('aria-expanded', 'true');

    function close(e) {
      if (pop.contains(e.target) || chip.contains(e.target)) return;
      pop.remove();
      chip.setAttribute('aria-expanded', 'false');
      document.removeEventListener('mousedown', close);
    }
    setTimeout(function () { document.addEventListener('mousedown', close); }, 0);

    pop.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pop-month]');
      if (b) {
        FF.store.setMonth(b.getAttribute('data-pop-month'));
        pop.remove();
        chip.setAttribute('aria-expanded', 'false');
        return;
      }
      if (e.target.closest('[data-pop-new]')) {
        pop.remove();
        chip.setAttribute('aria-expanded', 'false');
        FF.router.navigate('months');
        setTimeout(function () { FF.views.months.newMonth(); }, 60);
      }
    });
  }

  /* --------------------------------------------------- student sheets --- */

  function fieldError(id, msg) {
    var el = FF.$('#' + id);
    if (!el) return;
    el.textContent = msg || '';
    el.hidden = !msg;
  }

  function studentSheet(mode, existing) {
    var s = existing || { name: '', cls: '', roll: '', phone: '', fee: 0, paid: 0, note: '' };
    var cur = FF.store.currency();

    function statusLine(fee, paid) {
      var status = FF.importer.computeStatus(fee, paid);
      var pending = Math.max(0, FF.money.round2(fee - paid));
      return { status: status, pending: pending };
    }

    var api = FF.modal.sheet({
      title: mode === 'edit' ? 'Edit student' : 'Add student',
      sub: mode === 'edit' ? s.name : FF.monthLabel(FF.store.getState().currentMonth),
      body:
        '<div class="form-grid">' +
        '<label class="field"><span class="field__label">Student name</span>' +
        '<input class="input" id="sf-name" data-autofocus value="' + FF.attr(s.name) + '" placeholder="e.g. Ananya Rao" autocomplete="off">' +
        '<span class="field-error" id="sf-err-name" hidden></span></label>' +

        '<div class="form-grid form-grid--2">' +
        '<label class="field"><span class="field__label">Class / section</span>' +
        '<input class="input" id="sf-class" value="' + FF.attr(s.cls) + '" placeholder="e.g. 8-A" autocomplete="off"></label>' +
        '<label class="field"><span class="field__label">Roll no. <span class="field__hint">optional</span></span>' +
        '<input class="input" id="sf-roll" value="' + FF.attr(s.roll) + '" placeholder="12" autocomplete="off"></label>' +
        '</div>' +

        '<div class="form-grid form-grid--2">' +
        '<label class="field"><span class="field__label">Total fee</span>' +
        '<span class="money"><span class="cur">' + FF.esc(cur) + '</span>' +
        '<input class="input input--num" id="sf-fee" type="number" inputmode="decimal" min="0" step="any" value="' + (s.fee || '') + '" placeholder="5000"></span>' +
        '<span class="field-error" id="sf-err-fee" hidden></span></label>' +
        '<label class="field"><span class="field__label">Amount paid</span>' +
        '<span class="money"><span class="cur">' + FF.esc(cur) + '</span>' +
        '<input class="input input--num" id="sf-paid" type="number" inputmode="decimal" min="0" step="any" value="' + (s.paid || '') + '" placeholder="0"></span>' +
        '<span class="field-error" id="sf-err-paid" hidden></span></label>' +
        '</div>' +

        '<div class="card card--pad-sm" style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap;background:var(--surface-2)">' +
        '<div class="kv"><span class="kv__k">Pending</span><span class="kv__v" id="sf-pending" style="font-size:var(--fs-xl)">' + FF.money.html(0, cur) + '</span></div>' +
        '<span style="flex:1"></span><span id="sf-status">' + FF.ui.pill('unpaid') + '</span></div>' +

        '<label class="field"><span class="field__label">Phone <span class="field__hint">optional, for call / reminders</span></span>' +
        '<input class="input" id="sf-phone" type="tel" value="' + FF.attr(s.phone) + '" placeholder="+91 98…" autocomplete="off"></label>' +

        '<label class="field"><span class="field__label">Note <span class="field__hint">optional</span></span>' +
        '<input class="input" id="sf-note" value="' + FF.attr(s.note) + '" placeholder="Paid by UPI, receipt 44…" autocomplete="off"></label>' +
        '</div>',
      footer:
        '<button type="button" class="btn btn--soft" data-close>Cancel</button>' +
        '<button type="button" class="btn btn--primary" id="sf-save">' + FF.icons.icon('check') + (mode === 'edit' ? 'Save changes' : 'Add student') + '</button>',
      onMount: function (panel, a) {
        var fee = FF.$('#sf-fee', panel), paid = FF.$('#sf-paid', panel);

        function live() {
          var f = Math.max(0, FF.money.toNumber(fee.value) || 0);
          var p = Math.max(0, FF.money.toNumber(paid.value) || 0);
          if (p > f) p = f;
          var line = statusLine(f, p);
          FF.$('#sf-pending', panel).innerHTML = FF.money.html(line.pending, cur);
          FF.$('#sf-status', panel).innerHTML = FF.ui.pill(line.status);
        }
        fee.addEventListener('input', live);
        paid.addEventListener('input', live);
        live();

        FF.$('#sf-save', panel).addEventListener('click', function () {
          var name = FF.$('#sf-name', panel).value.trim();
          var f = FF.money.toNumber(fee.value);
          var p = FF.money.toNumber(paid.value);
          var ok = true;

          fieldError('sf-err-name');
          fieldError('sf-err-fee');
          fieldError('sf-err-paid');
          FF.$('#sf-name', panel).classList.remove('is-invalid');
          fee.classList.remove('is-invalid');
          paid.classList.remove('is-invalid');

          if (!name) { fieldError('sf-err-name', 'A student name is required.'); FF.$('#sf-name', panel).classList.add('is-invalid'); ok = false; }
          if (isNaN(f) || f < 0) { fieldError('sf-err-fee', 'Fee cannot be negative.'); fee.classList.add('is-invalid'); ok = false; }
          if (isNaN(p) || p < 0) { fieldError('sf-err-paid', 'Paid cannot be negative.'); paid.classList.add('is-invalid'); ok = false; }
          if (ok && p > f) { fieldError('sf-err-paid', 'Paid cannot exceed the total fee.'); paid.classList.add('is-invalid'); ok = false; }
          if (!ok) return;

          var data = {
            name: name,
            cls: FF.$('#sf-class', panel).value.trim(),
            roll: FF.$('#sf-roll', panel).value.trim(),
            phone: FF.$('#sf-phone', panel).value.trim(),
            note: FF.$('#sf-note', panel).value.trim(),
            fee: FF.money.round2(f),
            paid: FF.money.round2(p),
          };
          if (mode === 'edit') {
            FF.store.updateStudent(s.id, data);
            FF.toast.show(name + ' saved.', { type: 'ok' });
          } else {
            FF.store.addStudent(data);
            FF.toast.show(name + ' added to ' + FF.monthLabel(FF.store.getState().currentMonth, true) + '.', { type: 'ok' });
          }
          a.close();
        });
      },
    });
    return api;
  }

  function collectSheet(student) {
    var cur = FF.store.currency();
    var due = FF.ui.pending(student);
    if (due <= 0) {
      FF.toast.show(student.name + ' has nothing pending.', { type: 'info' });
      return;
    }
    var api = FF.modal.sheet({
      title: 'Record a payment',
      sub: student.name + ' · ' + (student.cls ? 'Class ' + student.cls : 'No class'),
      body:
        '<div class="card card--pad-sm" style="background:var(--surface-2);display:grid;gap:10px">' +
        '<div style="display:flex;justify-content:space-between"><span class="muted">Total fee</span><b class="num">' + FF.money.html(student.fee, cur) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between"><span class="muted">Already paid</span><b class="num" style="color:var(--paid)">' + FF.money.html(student.paid, cur) + '</b></div>' +
        '<div style="display:flex;justify-content:space-between"><span class="muted">Pending now</span><b class="num" style="color:var(--unpaid)" id="cs-due">' + FF.money.html(due, cur) + '</b></div>' +
        '</div>' +
        '<label class="field"><span class="field__label">Amount received</span>' +
        '<span class="money"><span class="cur">' + FF.esc(cur) + '</span>' +
        '<input class="input input--num" id="cs-amount" type="number" inputmode="decimal" min="0" step="any" value="' + due + '" data-autofocus></span>' +
        '<span class="field-error" id="cs-err" hidden></span></label>' +
        '<div class="btn-row">' +
        [500, 1000, 2000].map(function (v) { return '<button type="button" class="chip" data-quick="' + v + '">+' + v + '</button>'; }).join('') +
        '<button type="button" class="chip" data-quick="full">Full ' + FF.money.format(due, cur) + '</button>' +
        '</div>' +
        '<label class="field"><span class="field__label">Note <span class="field__hint">optional</span></span>' +
        '<input class="input" id="cs-note" placeholder="UPI, cash, cheque no…"></label>',
      footer:
        '<button type="button" class="btn btn--soft" data-close>Cancel</button>' +
        '<button type="button" class="btn btn--primary" id="cs-save">' + FF.icons.icon('coins') + 'Save payment</button>',
      onMount: function (panel, a) {
        var amount = FF.$('#cs-amount', panel);
        panel.addEventListener('click', function (e) {
          var q = e.target.closest('[data-quick]');
          if (!q) return;
          var v = q.getAttribute('data-quick');
          amount.value = v === 'full' ? due : Math.min(due, (FF.money.toNumber(amount.value) || 0) + v);
        });
        FF.$('#cs-save', panel).addEventListener('click', function () {
          var amt = FF.money.toNumber(amount.value);
          var err = FF.$('#cs-err', panel);
          if (isNaN(amt) || amt <= 0) { err.textContent = 'Enter an amount greater than zero.'; err.hidden = false; return; }
          if (amt > due) { err.textContent = 'That is more than the pending ' + FF.money.format(due, cur) + '.'; err.hidden = false; return; }
          var res = FF.store.recordPayment(student.id, amt, FF.$('#cs-note', panel).value);
          a.close();
          FF.toast.show(
            res.student.status === 'paid'
              ? '✓ ' + student.name + ' is fully paid. Lovely.'
              : '✓ ' + FF.money.format(res.applied, cur) + ' recorded for ' + student.name + '. ' + FF.money.format(FF.ui.pending(res.student), cur) + ' still pending.',
            { type: 'ok', timeout: 5000 }
          );
        });
      },
    });
    return api;
  }

  function deleteStudentFlow(student) {
    FF.modal.confirm({
      title: 'Delete ' + student.name + '?',
      message: 'Their fee record for ' + FF.monthLabel(FF.store.getState().currentMonth) + ' will be removed. You can undo this right after.',
      confirmLabel: 'Delete',
    }).then(function (yes) {
      if (!yes) return;
      var entry = FF.store.deleteStudent(student.id);
      if (!entry) return;
      FF.toast.show(student.name + ' deleted.', {
        type: 'warn',
        timeout: 6500,
        action: {
          label: 'Undo',
          fn: function () {
            FF.store.restoreStudent(entry);
            FF.toast.show(student.name + ' restored.', { type: 'ok' });
          },
        },
      });
    });
  }

  /* ---------------------------------------------------- global actions --- */

  function globalClicks() {
    document.addEventListener('click', function (e) {
      var gotoEl = e.target.closest('[data-goto]');
      if (gotoEl) { FF.router.navigate(gotoEl.getAttribute('data-goto')); return; }

      if (e.target.closest('[data-add-student]')) { studentSheet('add'); return; }

      var act = e.target.closest('[data-action]');
      if (act) {
        var id = act.getAttribute('data-id');
        var student = FF.store.findStudent(id);
        if (!student) return;
        var kind = act.getAttribute('data-action');
        if (kind === 'edit') studentSheet('edit', student);
        else if (kind === 'collect') collectSheet(student);
        else if (kind === 'delete') deleteStudentFlow(student);
      }
    });
  }

  function shortcuts() {
    document.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (FF.$('.scrim')) return;
      switch (e.key) {
        case '/': e.preventDefault(); FF.router.navigate('students'); setTimeout(function () { var i = FF.$('#s-search'); if (i) i.focus(); }, 80); break;
        case 'n': case 'N': e.preventDefault(); studentSheet('add'); break;
        case 'i': case 'I': FF.router.navigate('import'); break;
        case 'm': case 'M': FF.router.navigate('months'); break;
        case 'd': case 'D': FF.router.navigate('dashboard'); break;
        case 's': case 'S': FF.router.navigate('students'); break;
        case 't': case 'T': setTheme(FF.store.settings().theme === 'ink' ? 'paper' : 'ink'); break;
        default: break;
      }
    });
  }

  /* -------------------------------------------------------------- misc --- */

  function printReport() {
    // the students view is the report: full list, cards on paper
    FF.router.navigate('students');
    FF.views.students.showAll(FF.$('#view'));
    var st = FF.store.getState();
    var s = FF.store.stats();
    var old = FF.$('.print-only');
    if (old) old.remove();
    var div = document.createElement('div');
    div.className = 'print-only';
    div.innerHTML =
      '<h1>' + FF.esc(st.settings.org || 'FeeFlow') + ' — fee report</h1>' +
      '<p>' + FF.esc(FF.monthLabel(st.currentMonth)) + ' · generated ' + FF.esc(FF.dateTime(Date.now())) + '</p>' +
      '<p>Students ' + s.count + ' · Billed ' + FF.money.format(s.fee, FF.store.currency()) + ' · Collected ' + FF.money.format(s.paid, FF.store.currency()) +
      ' · Pending ' + FF.money.format(s.pending, FF.store.currency()) + ' (' + s.rate + '% collected)</p>' +
      '<p>Paid ' + s.counts.paid + ' · Partial ' + s.counts.partial + ' · Unpaid ' + s.counts.unpaid + '</p>' +
      '<div class="rule"></div>';
    document.body.appendChild(div);
    var cleanup = function () { div.remove(); root.removeEventListener('afterprint', cleanup); };
    root.addEventListener('afterprint', cleanup);
    setTimeout(function () { root.print(); }, 60);
  }

  function restoreFromObject(obj) {
    var res = FF.store.restoreBackup(obj);
    if (!res.ok) {
      FF.toast.show(res.error || 'That file is not a FeeFlow backup.', { type: 'err' });
      return;
    }
    FF.toast.show('Backup restored — ' + res.months + ' months loaded.', { type: 'ok', timeout: 5000 });
    FF.router.navigate('dashboard');
  }

  function install() {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === 'accepted') FF.toast.show('FeeFlow installed on this device.', { type: 'ok' });
        installPrompt = null;
      });
    } else {
      FF.modal.alert({
        title: 'Install FeeFlow',
        html: '<p class="muted" style="line-height:1.65">Use your browser menu: on iPhone tap <b>Share → Add to Home Screen</b>; ' +
          'on Android or desktop Chrome tap <b>⋮ → Install app</b>. FeeFlow then opens full-screen and works offline.</p>',
      });
    }
  }

  function paintNetwork(host) {
    var scope = host || document;
    var text = FF.$('#set-net', scope);
    var tag = FF.$('#set-net-tag', scope);
    if (!text || !tag) return;
    var on = root.navigator ? navigator.onLine : true;
    text.textContent = on ? 'Online — but nothing is uploaded, ever.' : 'Offline — FeeFlow keeps working from this device.';
    tag.textContent = on ? 'Online' : 'Offline';
    tag.style.color = on ? 'var(--paid)' : 'var(--partial)';
  }

  /* -------------------------------------------------------------- boot --- */

  function render(name) {
    currentView = name;
    FF.router.markActive(name);
    var view = FF.views[name];
    viewHost.innerHTML = '';
    view.mount(viewHost);
    document.title = 'FeeFlow — ' + name.charAt(0).toUpperCase() + name.slice(1);
    paintMonthChip();
    if (typeof root.scrollTo === 'function') {
      try { root.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) { /* ignore */ }
    }
  }

  function onStoreChange() {
    paintMonthChip();
    var view = FF.views[currentView];
    if (view && view.update) view.update(viewHost);
    paintNetwork(viewHost);
  }

  function boot() {
    FF.icons.mount();
    FF.store.load();
    FF.store.onStorageError(function () {
      FF.toast.show('Storage is full — export a backup and remove old months.', { type: 'err', timeout: 7000 });
    });

    viewHost = FF.$('#view');
    applyTheme(FF.store.settings().theme);

    FF.$('#month-chip').addEventListener('click', monthPopover);
    FF.$('#theme-btn').addEventListener('click', function () {
      setTheme(FF.store.settings().theme === 'ink' ? 'paper' : 'ink');
    });

    globalClicks();
    shortcuts();

    FF.store.subscribe(onStoreChange);
    FF.router.start(render);

    // sample loader used from empty states
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-load-sample]')) return;
      if (currentView === 'import') return; // the view handles its own
      FF.router.navigate('import');
      setTimeout(function () {
        var input = FF.$('#imp-input');
        if (input) {
          input.value = FF.importer.SAMPLE_JSON;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }, 90);
    });

    root.addEventListener('beforeinstallprompt', function (e) {
      e.preventDefault();
      installPrompt = e;
    });

    ['online', 'offline'].forEach(function (ev) {
      root.addEventListener(ev, function () {
        paintNetwork(viewHost);
        FF.toast.show(navigator.onLine ? 'Back online.' : 'Offline — your data is safe on this device.', { type: navigator.onLine ? 'ok' : 'warn' });
      });
    });

    root.addEventListener('pagehide', function () { FF.store.flush(); });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') FF.store.flush();
    });

    if ('serviceWorker' in navigator && root.location.protocol !== 'file:') {
      root.addEventListener('load', function () {
        navigator.serviceWorker.register('sw.js').catch(function () { /* offline support is a bonus, never a blocker */ });
      });
    }
  }

  FF.app = {
    boot: boot,
    setTheme: setTheme,
    studentSheet: studentSheet,
    collectSheet: collectSheet,
    printReport: printReport,
    restoreFromObject: restoreFromObject,
    install: install,
    paintNetwork: paintNetwork,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
