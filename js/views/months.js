/* ==========================================================================
   FeeFlow — Months view: every month is its own ledger
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  FF.views = FF.views || {};

  function cardHTML(m) {
    var s = FF.store.stats(m.month);
    var isCurrent = m.month === FF.store.getState().currentMonth;
    var cur = FF.store.currency();
    return (
      '<article class="mcard' + (isCurrent ? ' is-current' : '') + '" data-month="' + FF.attr(m.month) + '">' +
      '<div class="mcard__head"><div><h3 class="mcard__name">' + FF.esc(FF.monthLabel(m.month)) + '</h3>' +
      '<p class="dim" style="font-size:var(--fs-sm)">' + FF.plural(m.students.length, 'student') + '</p></div>' +
      (isCurrent ? '<span class="pill pill--paid mcard__badge">Current</span>' : '') +
      '</div>' +
      '<div class="mcard__nums">' +
      '<div class="kv"><span class="kv__k">Collected</span><span class="kv__v" style="color:var(--paid)">' + FF.money.html(s.paid, cur) + '</span></div>' +
      '<div class="kv"><span class="kv__k">Pending</span><span class="kv__v" style="color:' + (s.pending ? 'var(--unpaid)' : 'var(--text-3)') + '">' + FF.money.html(s.pending, cur) + '</span></div>' +
      '<div class="kv"><span class="kv__k">Rate</span><span class="kv__v">' + s.rate + '%</span></div>' +
      '</div>' +
      '<div class="meter" aria-hidden="true">' +
      '<span class="meter__seg meter__seg--paid" style="width:' + (s.fee ? (s.paid / s.fee) * 100 : 0) + '%"></span>' +
      '<span class="meter__ticks"></span></div>' +
      '<div class="mcard__foot">' +
      '<button type="button" class="btn btn--sm ' + (isCurrent ? 'btn--soft' : 'btn--brand-soft') + '" data-open="' + FF.attr(m.month) + '">' +
      (isCurrent ? 'Viewing' : 'Open') + '</button>' +
      '<span class="spacer"></span>' +
      '<button type="button" class="icon-btn" data-csv="' + FF.attr(m.month) + '" aria-label="Export ' + FF.attr(FF.monthLabel(m.month)) + ' as CSV">' + FF.icons.icon('download') + '</button>' +
      '<button type="button" class="icon-btn" data-copy-month="' + FF.attr(m.month) + '" aria-label="Copy ' + FF.attr(FF.monthLabel(m.month)) + ' into a new month">' + FF.icons.icon('copy') + '</button>' +
      '<button type="button" class="icon-btn" data-del-month="' + FF.attr(m.month) + '" aria-label="Delete ' + FF.attr(FF.monthLabel(m.month)) + '">' + FF.icons.icon('trash') + '</button>' +
      '</div></article>'
    );
  }

  function html() {
    var months = FF.store.months();
    return (
      '<div class="view__head">' +
      '<div><h1 class="view__title">Months</h1>' +
      '<p class="view__sub">Each month keeps its own students, payments and dashboard. Nothing overwrites anything.</p></div>' +
      '<button type="button" class="btn btn--primary" data-new-month>' + FF.icons.icon('plus') + 'New month</button>' +
      '</div>' +
      '<div class="months-grid stagger">' +
      months.map(cardHTML).join('') +
      '<button type="button" class="mcard mcard--new" data-new-month>' +
      '<i>' + FF.icons.icon('plus') + '</i><b>Start a new month</b>' +
      '<span class="dim" style="font-size:var(--fs-sm)">Empty, or carried over from an earlier month</span>' +
      '</button>' +
      '</div>'
    );
  }

  /* ------------------------------------------------------------ sheets --- */

  function newMonthSheet(prefillFrom) {
    var latest = FF.store.months()[0] ? FF.store.months()[0].month : FF.todayKey();
    var suggested = FF.addMonths(latest, 1);
    while (FF.store.hasMonth(suggested)) suggested = FF.addMonths(suggested, 1);

    var api = FF.modal.sheet({
      title: 'Start a new month',
      sub: 'Previous months stay exactly as they are.',
      body:
        '<label class="field"><span class="field__label">Month</span>' +
        '<input class="input" type="month" id="nm-key" value="' + FF.attr(suggested) + '" data-autofocus></label>' +
        '<div class="field"><span class="field__label">Students</span>' +
        '<div class="segmented" id="nm-copy-wrap">' +
        '<button type="button" class="segmented__btn is-active" data-copy="none">Start empty</button>' +
        '<button type="button" class="segmented__btn" data-copy="yes">Carry students over</button>' +
        '</div></div>' +
        '<div id="nm-from-wrap" hidden>' +
        '<label class="field"><span class="field__label">Copy from</span><select class="select" id="nm-from">' +
        FF.store.months().map(function (m) {
          return '<option value="' + FF.attr(m.month) + '"' + (m.month === (prefillFrom || latest) ? ' selected' : '') + '>' +
            FF.esc(FF.monthLabel(m.month)) + ' (' + m.students.length + ')</option>';
        }).join('') +
        '</select></label>' +
        '<label class="field" style="margin-top:var(--sp-3)">' +
        '<span class="field__label" style="display:flex;align-items:center;gap:10px">' +
        '<button type="button" class="switch" id="nm-carry" role="switch" aria-checked="false" aria-label="Add unpaid balances to the new fee"></button>' +
        'Add each student’s unpaid balance to the new fee</span>' +
        '<span class="field__hint">Useful when last month’s pending rolls into this month’s bill.</span></label>' +
        '</div>' +
        '<p id="nm-error" class="field-error" hidden></p>',
      footer:
        '<button type="button" class="btn btn--soft" data-close>Cancel</button>' +
        '<button type="button" class="btn btn--primary" id="nm-create">' + FF.icons.icon('check') + 'Create month</button>',
      onMount: function (panel, a) {
        var mode = 'none';
        var wrap = FF.$('#nm-copy-wrap', panel);
        var fromWrap = FF.$('#nm-from-wrap', panel);
        var carry = FF.$('#nm-carry', panel);
        wrap.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-copy]');
          if (!btn) return;
          mode = btn.getAttribute('data-copy');
          FF.$$('[data-copy]', wrap).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
          fromWrap.hidden = mode !== 'yes';
        });
        carry.addEventListener('click', function () {
          carry.setAttribute('aria-checked', carry.getAttribute('aria-checked') === 'true' ? 'false' : 'true');
        });
        if (prefillFrom) {
          mode = 'yes';
          FF.$$('[data-copy]', wrap).forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-copy') === 'yes'); });
          fromWrap.hidden = false;
        }
        FF.$('#nm-create', panel).addEventListener('click', function () {
          var key = FF.$('#nm-key', panel).value;
          var err = FF.$('#nm-error', panel);
          var res = FF.store.createMonth(key, {
            copyFrom: mode === 'yes' ? FF.$('#nm-from', panel).value : null,
            carryPending: carry.getAttribute('aria-checked') === 'true',
          });
          if (!res.ok) {
            err.textContent = res.error;
            err.hidden = false;
            return;
          }
          a.close();
          FF.toast.show(FF.monthLabel(key) + ' is ready.', { type: 'ok' });
          FF.router.navigate('dashboard');
        });
      },
    });
    return api;
  }

  function bind(host) {
    if (host.dataset.boundMonths) return;
    host.dataset.boundMonths = '1';
    host.addEventListener('click', function (e) {
      var open = e.target.closest('[data-open]');
      if (open) {
        FF.store.setMonth(open.getAttribute('data-open'));
        FF.router.navigate('dashboard');
        return;
      }
      if (e.target.closest('[data-new-month]')) { newMonthSheet(); return; }

      var csv = e.target.closest('[data-csv]');
      if (csv) {
        var k = csv.getAttribute('data-csv');
        FF.download('feeflow-' + k + '.csv', FF.store.exportMonthCSV(k), 'text/csv');
        FF.toast.show('CSV for ' + FF.monthLabel(k, true) + ' downloaded.', { type: 'ok' });
        return;
      }
      var copy = e.target.closest('[data-copy-month]');
      if (copy) { newMonthSheet(copy.getAttribute('data-copy-month')); return; }

      var del = e.target.closest('[data-del-month]');
      if (del) {
        var key = del.getAttribute('data-del-month');
        var m = FF.store.month(key);
        FF.modal.confirm({
          title: 'Delete ' + FF.monthLabel(key) + '?',
          message: 'This removes ' + FF.plural(m.students.length, 'student record') + ' and its payments. Other months are untouched. This cannot be undone.',
          confirmLabel: 'Delete month',
        }).then(function (yes) {
          if (!yes) return;
          FF.store.deleteMonth(key);
          FF.toast.show(FF.monthLabel(key) + ' deleted.', { type: 'warn' });
        });
      }
    });
  }

  FF.views.months = {
    mount: function (host) { host.innerHTML = html(); bind(host); },
    update: function (host) { host.innerHTML = html(); bind(host); },
    newMonth: function (from) { return newMonthSheet(from); },
  };
})(typeof window !== 'undefined' ? window : globalThis);
