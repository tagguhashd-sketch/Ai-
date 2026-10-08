/* ==========================================================================
   FeeFlow — Settings: organisation, appearance, backups, privacy, shortcuts
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  FF.views = FF.views || {};

  var CURRENCIES = ['₹', '$', '€', '£', '¥', '৳', '₨'];

  function storageLabel() {
    var b = FF.store.storageBytes();
    if (!b) return 'empty';
    return b < 1024 ? b + ' B' : (b / 1024).toFixed(1) + ' KB';
  }

  function html() {
    var s = FF.store.settings();
    return (
      '<div class="view__head"><div><h1 class="view__title">Settings</h1>' +
      '<p class="view__sub">Your institute, your look, your backups. Everything lives in this browser.</p></div></div>' +

      '<div class="settings">' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Organisation') +
      '<div class="set-row"><div class="set-row__info"><b>Institute name</b><p>Shown on the dashboard and printed reports</p></div>' +
      '<div class="set-row__control"><input class="input" id="set-org" style="max-width:240px" value="' + FF.attr(s.org) + '" placeholder="e.g. Sharma Tuitions" maxlength="80"></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Currency symbol</b><p>Used everywhere money appears</p></div>' +
      '<div class="set-row__control"><select class="select" id="set-currency" style="max-width:120px">' +
      CURRENCIES.map(function (c) { return '<option' + (c === s.currency ? ' selected' : '') + '>' + c + '</option>'; }).join('') +
      '</select></div></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Appearance') +
      '<div class="set-row"><div class="set-row__info"><b>Theme</b><p>Ink for evenings, paper for daylight</p></div>' +
      '<div class="set-row__control"><div class="segmented" style="min-width:200px">' +
      '<button type="button" class="segmented__btn' + (s.theme === 'ink' ? ' is-active' : '') + '" data-theme-val="ink">' + FF.icons.icon('moon') + 'Ink</button>' +
      '<button type="button" class="segmented__btn' + (s.theme === 'paper' ? ' is-active' : '') + '" data-theme-val="paper">' + FF.icons.icon('sun') + 'Paper</button>' +
      '</div></div></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Backup & data', '', 'Backups are plain JSON files you own') +
      '<input type="file" id="set-restore-file" accept=".json,application/json" hidden>' +
      '<div class="set-row"><div class="set-row__info"><b>Export backup</b><p>Every month, every student, one file</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--soft btn--sm" data-backup>' + FF.icons.icon('download') + 'Export</button></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Restore backup</b><p>Replaces what is on this device with the file</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--soft btn--sm" data-restore>' + FF.icons.icon('upload') + 'Restore</button></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Export this month as CSV</b><p>Opens in Excel or Google Sheets</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--soft btn--sm" data-csv-now>' + FF.icons.icon('download') + 'CSV</button></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Print a fee report</b><p>A clean one-page summary of the current month</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--soft btn--sm" data-print>' + FF.icons.icon('print') + 'Print</button></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Storage used</b><p id="set-storage">localStorage on this device</p></div>' +
      '<div class="set-row__control"><span class="tag num">' + storageLabel() + '</span></div></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Privacy') +
      '<div style="display:flex;gap:12px;align-items:flex-start">' +
      '<span class="stat__icon stat--brand" style="background:var(--brand-soft);color:var(--brand);border-radius:12px;width:38px;height:38px;display:grid;place-items:center;flex:none">' + FF.icons.icon('shield') + '</span>' +
      '<p class="muted" style="line-height:1.65">FeeFlow is local-first. Student names, fees and payments are stored only in this browser’s localStorage and are never sent to any server. ' +
      'The app keeps working offline once loaded. Your data moves only when you export or back it up yourself.</p></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('On this device') +
      '<div class="set-row"><div class="set-row__info"><b>Install FeeFlow as an app</b><p>Adds it to your home screen, works offline</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--soft btn--sm" data-install>' + FF.icons.icon('download') + 'Install</button></div></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Connection</b><p id="set-net">Checking…</p></div>' +
      '<div class="set-row__control"><span class="tag" id="set-net-tag">—</span></div></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Keyboard shortcuts', '', 'For desktop users') +
      '<div class="set-row"><div class="set-row__info"><b>Search students</b></div><span class="kbd">/</span></div>' +
      '<div class="set-row"><div class="set-row__info"><b>New student</b></div><span class="kbd">N</span></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Import JSON</b></div><span class="kbd">I</span></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Months</b></div><span class="kbd">M</span></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Dashboard</b></div><span class="kbd">D</span></div>' +
      '<div class="set-row"><div class="set-row__info"><b>Switch theme</b></div><span class="kbd">T</span></div>' +
      '</section>' +

      '<section class="card anim-rise">' + FF.ui.sectionHead('Danger zone') +
      '<div class="set-row"><div class="set-row__info"><b>Erase everything</b><p>Deletes all months and students from this browser</p></div>' +
      '<div class="set-row__control"><button type="button" class="btn btn--danger btn--sm" data-wipe>' + FF.icons.icon('trash') + 'Erase all data</button></div></div>' +
      '</section>' +

      '<p class="dim" style="font-size:var(--fs-sm);text-align:center;padding-bottom:var(--sp-3)">' +
      'FeeFlow 1.0 · local-first fee tracking for teachers, tutors and coaching centres · ' +
      '<a href="https://github.com/tagguhashd-sketch/Ai-" target="_blank" rel="noopener noreferrer" style="color:var(--brand);font-weight:700">source & hosting guide</a>' +
      '</p>' +
      '</div>'
    );
  }

  function bind(host) {
    FF.$('#set-org', host).addEventListener('change', function (e) {
      FF.store.setSettings({ org: e.target.value.trim() });
      FF.toast.show('Institute name saved.', { type: 'ok' });
    });
    FF.$('#set-currency', host).addEventListener('change', function (e) {
      FF.store.setSettings({ currency: e.target.value });
      FF.toast.show('Currency set to ' + e.target.value, { type: 'ok' });
    });

    FF.$('#set-restore-file', host).addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!f) return;
      FF.readFileAsText(f).then(function (text) {
        try {
          FF.app.restoreFromObject(JSON.parse(text));
        } catch (err) {
          FF.toast.show('That file is not valid JSON, so nothing was changed.', { type: 'err' });
        }
      });
    });

    if (host.dataset.boundSettings) return;
    host.dataset.boundSettings = '1';

    host.addEventListener('click', function (e) {
      var themeBtn = e.target.closest('[data-theme-val]');
      if (themeBtn) { FF.app.setTheme(themeBtn.getAttribute('data-theme-val')); return; }

      if (e.target.closest('[data-backup]')) {
        FF.download('feeflow-backup-' + FF.todayKey() + '.json', FF.store.exportBackup());
        FF.toast.show('Backup downloaded. Keep it somewhere safe.', { type: 'ok' });
        return;
      }
      if (e.target.closest('[data-restore]')) { FF.$('#set-restore-file', host).click(); return; }
      if (e.target.closest('[data-csv-now]')) {
        var k = FF.store.getState().currentMonth;
        FF.download('feeflow-' + k + '.csv', FF.store.exportMonthCSV(k), 'text/csv');
        FF.toast.show('CSV downloaded.', { type: 'ok' });
        return;
      }
      if (e.target.closest('[data-print]')) { FF.app.printReport(); return; }
      if (e.target.closest('[data-install]')) { FF.app.install(); return; }
      if (e.target.closest('[data-wipe]')) {
        FF.modal.confirm({
          title: 'Erase all FeeFlow data?',
          message: 'Every month, student and payment on this device will be permanently deleted. Export a backup first if you might need it.',
          confirmLabel: 'Erase everything',
        }).then(function (yes) {
          if (!yes) return;
          FF.store.resetAll();
          FF.toast.show('All data erased. Fresh start.', { type: 'warn' });
        });
      }
    });

  }

  FF.views.settings = {
    mount: function (host) { host.innerHTML = html(); bind(host); },
    update: function (host) {
      host.innerHTML = html();
      bind(host);
      var net = FF.$('#set-net', host);
      if (net) FF.app.paintNetwork(host);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
