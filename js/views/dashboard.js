/* ==========================================================================
   FeeFlow — Dashboard view
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  FF.views = FF.views || {};

  function prevKey() {
    var months = FF.store.months();
    var idx = months.findIndex(function (m) { return m.month === FF.store.getState().currentMonth; });
    return idx > -1 && idx + 1 < months.length ? months[idx + 1].month : null;
  }

  function deltaHTML(cur, prev) {
    if (prev == null) return '';
    var diff = cur - prev;
    if (!diff) return '±0';
    return (diff > 0 ? '+' : '−') + FF.money.compact(Math.abs(diff), FF.store.currency());
  }

  function statsHTML() {
    var s = FF.store.stats();
    var pKey = prevKey();
    var p = pKey ? FF.store.stats(pKey) : null;
    var cur = FF.store.currency();
    return (
      FF.ui.statCard({ icon: 'users', label: 'Students', value: String(s.count), accent: 'brand', delta: p ? deltaHTML(s.count, p.count) : '' }) +
      FF.ui.statCard({ icon: 'banknote', label: 'Total fees', value: FF.money.html(s.fee, cur), accent: 'brand' }) +
      FF.ui.statCard({ icon: 'coins', label: 'Collected', value: FF.money.html(s.paid, cur), accent: 'paid', delta: p ? deltaHTML(s.paid, p.paid) : '' }) +
      FF.ui.statCard({ icon: 'clock', label: 'Pending', value: FF.money.html(s.pending, cur), accent: s.pending ? 'unpaid' : 'paid' })
    );
  }

  function overviewHTML() {
    var s = FF.store.stats();
    var cur = FF.store.currency();
    return (
      '<div class="donut-wrap">' +
      FF.charts.donutHTML(s.counts, s.rate, 'collected') +
      FF.charts.legendHTML(s.counts) +
      '</div>' +
      '<div style="margin-top:var(--sp-4)">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">' +
      '<span class="micro">Collection</span>' +
      '<span class="num" style="font-weight:700">' + FF.money.html(s.paid, cur) +
      '<span class="dim" style="font-weight:500"> of ' + FF.money.html(s.fee, cur) + '</span></span>' +
      '</div>' +
      '<div class="meter" role="img" aria-label="Collection ' + s.rate + ' percent">' +
      '<span class="meter__seg meter__seg--paid" style="width:' + (s.fee ? (s.paid / s.fee) * 100 : 0) + '%"></span>' +
      '<span class="meter__seg meter__seg--partial" style="width:' + (s.fee ? (s.pending / s.fee) * 100 * (s.counts.partial ? 0.35 : 0) : 0) + '%"></span>' +
      '<span class="meter__ticks"></span>' +
      '</div>' +
      '<p class="dim" style="font-size:var(--fs-sm);margin-top:8px">' +
      s.counts.paid + ' of ' + s.count + ' students fully paid · ' + s.rate + '% of ' + FF.money.format(s.fee, cur) + ' collected' +
      '</p>' +
      '</div>'
    );
  }

  function trendHTML() {
    var months = FF.store.months().slice().reverse().slice(-6);
    var entries = months.map(function (m) {
      var s = FF.store.stats(m.month);
      return { key: m.month, label: FF.monthLabel(m.month, true).split(' ')[0], fee: s.fee, paid: s.paid, current: m.month === FF.store.getState().currentMonth };
    });
    if (!entries.length) return '';
    return (
      FF.charts.trendHTML(entries) +
      '<div style="display:flex;gap:var(--sp-4);margin-top:var(--sp-3)" class="dim">' +
      '<span style="display:flex;align-items:center;gap:7px;font-size:var(--fs-sm)"><span style="width:10px;height:10px;border-radius:3px;background:var(--surface-3)"></span>Billed</span>' +
      '<span style="display:flex;align-items:center;gap:7px;font-size:var(--fs-sm)"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand)"></span>Collected</span>' +
      '</div>'
    );
  }

  function attentionHTML() {
    var list = FF.store.currentStudents()
      .filter(function (s) { return s.fee - s.paid > 0.004; })
      .sort(function (a, b) { return (b.fee - b.paid) - (a.fee - a.paid); })
      .slice(0, 5);
    if (!list.length) {
      return '<p class="muted" style="display:flex;gap:9px;align-items:center">' + FF.icons.icon('shield') +
        'Nothing pending this month. Every rupee is accounted for.</p>';
    }
    return (
      '<div class="activity">' +
      list.map(function (s) {
        return (
          '<div class="activity__row">' +
          FF.ui.avatar(s.name) +
          '<div class="activity__text"><b>' + FF.esc(s.name) + '</b><p>' + FF.esc(s.cls ? 'Class ' + s.cls : 'No class') + '</p></div>' +
          '<span style="display:flex;align-items:center;gap:10px">' +
          '<span class="activity__amt" style="color:var(--unpaid)">' + FF.ui.money(FF.ui.pending(s)) + '</span>' +
          '<button type="button" class="btn btn--sm btn--brand-soft" data-action="collect" data-id="' + FF.attr(s.id) + '">Collect</button>' +
          '</span></div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function activityHTML() {
    var rows = FF.store.activity().slice(0, 6);
    if (!rows.length) return '<p class="muted">Activity will appear here as you add students and record payments.</p>';
    var ICONS = { payment: ['coins', 'in'], new: ['plus', 'new'], edit: ['pencil', ''], delete: ['trash', 'out'], import: ['inbox', 'new'], month: ['calendar', ''] };
    return (
      '<div class="activity">' +
      rows.map(function (a) {
        var ic = ICONS[a.type] || ['info', ''];
        return (
          '<div class="activity__row">' +
          '<span class="activity__icon activity__icon--' + ic[1] + '">' + FF.icons.icon(ic[0]) + '</span>' +
          '<div class="activity__text"><b>' + FF.esc(a.text) + '</b><p>' + FF.esc(FF.monthLabel(a.month, true)) + ' · ' + FF.timeAgo(a.at) + '</p></div>' +
          (a.amount ? '<span class="activity__amt activity__amt--in">+' + FF.ui.money(a.amount) + '</span>' : '<span></span>') +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  function listHTML(q) {
    var all = FF.store.currentStudents();
    var list = FF.list.sortStudents(FF.list.filterStudents(all, { q: q }), 'recent').slice(0, 6);
    if (!all.length) {
      return FF.ui.emptyState({
        title: 'No students in ' + FF.monthLabel(FF.store.getState().currentMonth, true),
        text: 'Paste a register from ChatGPT or Gemini, load the sample, or add your first student by hand.',
        actions:
          '<button class="btn btn--primary" data-goto="import">' + FF.icons.icon('inbox') + 'Paste JSON</button>' +
          '<button class="btn btn--soft" data-load-sample>' + FF.icons.icon('sparkles') + 'Load sample</button>' +
          '<button class="btn btn--soft" data-add-student>' + FF.icons.icon('plus') + 'Add student</button>',
      });
    }
    if (!list.length) return '<p class="muted">No student matches “' + FF.esc(q) + '”.</p>';
    return FF.list.renderList(list);
  }

  function html() {
    var st = FF.store.getState();
    var org = st.settings.org;
    return (
      '<section class="hero anim-rise">' +
      '<span class="hero__eyebrow">' + FF.esc(FF.monthLabel(st.currentMonth) + (org ? ' · ' + org : '')) + '</span>' +
      '<h1 class="display">Fees, finally <em>simple.</em></h1>' +
      '<p class="hero__sub">Turn register images into structured fee records, track payments, and see your monthly collection instantly.</p>' +
      '<div class="hero__cta">' +
      '<button type="button" class="btn btn--primary btn--lg" data-goto="import">' + FF.icons.icon('inbox') + 'Paste JSON</button>' +
      '<button type="button" class="btn btn--soft btn--lg" data-add-student>' + FF.icons.icon('plus') + 'Add student</button>' +
      '</div>' +
      '<div class="hero__meta">' +
      '<span class="tag">' + FF.icons.icon('lock') + 'Saved on this device</span>' +
      '<span class="tag">' + FF.icons.icon('layers') + FF.plural(FF.store.months().length, 'month') + ' tracked</span>' +
      '<span class="tag">' + FF.icons.icon('zap') + 'Works offline</span>' +
      '</div>' +
      '</section>' +

      '<div class="stack" style="margin-top:var(--sp-5)">' +
      '<div class="stats stagger" id="d-stats">' + statsHTML() + '</div>' +

      '<div class="grid-2--wide">' +
      '<div class="card anim-rise"><div class="card__head"><div><h3 class="card__title">Payment overview</h3>' +
      '<p class="card__sub">Paid · partial · unpaid for ' + FF.esc(FF.monthLabel(st.currentMonth, true)) + '</p></div>' +
      '<button type="button" class="btn btn--sm btn--ghost" data-goto="months">' + FF.icons.icon('calendar') + 'Months</button></div>' +
      '<div id="d-overview">' + overviewHTML() + '</div></div>' +

      '<div class="card anim-rise"><div class="card__head"><div><h3 class="card__title">Month over month</h3>' +
      '<p class="card__sub">Billed vs collected, last ' + Math.min(6, FF.store.months().length) + ' months</p></div></div>' +
      '<div class="trend" id="d-trend">' + trendHTML() + '</div></div>' +
      '</div>' +

      '<div class="grid-2">' +
      '<div class="card card--pad-sm anim-rise"><div class="card__head"><div><h3 class="card__title">Needs attention</h3>' +
      '<p class="card__sub">Largest pending balances first</p></div></div><div id="d-attention">' + attentionHTML() + '</div></div>' +
      '<div class="card card--pad-sm anim-rise"><div class="card__head"><div><h3 class="card__title">Recent activity</h3>' +
      '<p class="card__sub">Everything you changed, newest first</p></div></div><div id="d-activity">' + activityHTML() + '</div></div>' +
      '</div>' +

      '<section>' +
      FF.ui.sectionHead('Students', '<button type="button" class="btn btn--sm btn--soft" data-goto="students">View all' + FF.icons.icon('arrow-right') + '</button>') +
      '<div class="search" style="margin-bottom:var(--sp-3)">' + FF.icons.icon('search') +
      '<input class="input" id="d-search" type="search" placeholder="Search name, class or roll…" autocomplete="off" aria-label="Search students">' +
      '<button type="button" class="search__clear" data-clear-search hidden aria-label="Clear search">' + FF.icons.icon('x') + '</button></div>' +
      '<div id="d-list">' + listHTML('') + '</div>' +
      '</section>' +
      '</div>'
    );
  }

  function refresh(host, q) {
    var stats = FF.$('#d-stats', host);
    if (!stats) return;
    stats.innerHTML = statsHTML();
    FF.$('#d-overview', host).innerHTML = overviewHTML();
    FF.charts.playDonut(host);
    FF.$('#d-trend', host).innerHTML = trendHTML();
    FF.$('#d-attention', host).innerHTML = attentionHTML();
    FF.$('#d-activity', host).innerHTML = activityHTML();
    FF.$('#d-list', host).innerHTML = listHTML(q || '');
    var eyebrow = FF.$('.hero__eyebrow', host);
    if (eyebrow) eyebrow.textContent = FF.monthLabel(FF.store.getState().currentMonth) + (FF.store.settings().org ? ' · ' + FF.store.settings().org : '');
  }

  FF.views.dashboard = {
    mount: function (host) {
      host.innerHTML = html();
      FF.charts.playDonut(host);
      var search = FF.$('#d-search', host);
      var clear = FF.$('[data-clear-search]', host);
      var onType = FF.debounce(function () {
        FF.$('#d-list', host).innerHTML = listHTML(search.value);
        clear.hidden = !search.value;
      }, 120);
      search.addEventListener('input', onType);
      clear.addEventListener('click', function () { search.value = ''; clear.hidden = true; FF.$('#d-list', host).innerHTML = listHTML(''); search.focus(); });
    },
    update: function (host) {
      var search = FF.$('#d-search', host);
      refresh(host, search ? search.value : '');
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
