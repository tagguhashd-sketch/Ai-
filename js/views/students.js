/* ==========================================================================
   FeeFlow — Students view (search, filters, sort, pagination)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  FF.views = FF.views || {};
  var PAGE = 30;

  function fresh() {
    return { q: '', status: 'all', cls: 'all', sort: 'recent', shown: PAGE };
  }

  var state = fresh();

  function counts() {
    var all = FF.store.currentStudents();
    return {
      all: all.length,
      paid: all.filter(function (s) { return s.status === 'paid'; }).length,
      partial: all.filter(function (s) { return s.status === 'partial'; }).length,
      unpaid: all.filter(function (s) { return s.status === 'unpaid'; }).length,
    };
  }

  function filtered() {
    return FF.list.sortStudents(FF.list.filterStudents(FF.store.currentStudents(), state), state.sort);
  }

  function toolsHTML() {
    var c = counts();
    var classes = FF.store.classList();
    return (
      '<div class="search">' + FF.icons.icon('search') +
      '<input class="input" id="s-search" type="search" value="' + FF.attr(state.q) + '" placeholder="Search by name, class, section or roll…" autocomplete="off" aria-label="Search students">' +
      '<button type="button" class="search__clear" data-clear ' + (state.q ? '' : 'hidden') + ' aria-label="Clear search">' + FF.icons.icon('x') + '</button></div>' +

      '<div class="segmented" role="tablist" aria-label="Filter by status" style="margin-top:var(--sp-3)">' +
      [['all', 'All', c.all], ['paid', 'Paid', c.paid], ['partial', 'Partial', c.partial], ['unpaid', 'Unpaid', c.unpaid]].map(function (t) {
        return '<button type="button" class="segmented__btn' + (state.status === t[0] ? ' is-active' : '') + '" data-status="' + t[0] + '" role="tab" aria-selected="' + (state.status === t[0]) + '">' +
          t[1] + ' <span class="count">' + t[2] + '</span></button>';
      }).join('') +
      '</div>' +

      '<div style="display:flex;gap:var(--sp-2);align-items:center;margin-top:var(--sp-3);flex-wrap:wrap">' +
      '<div class="chips" style="flex:1;min-width:0">' +
      '<button type="button" class="chip' + (state.cls === 'all' ? ' is-active' : '') + '" data-cls="all">All classes</button>' +
      classes.map(function (cl) {
        return '<button type="button" class="chip' + (state.cls === cl.name ? ' is-active' : '') + '" data-cls="' + FF.attr(cl.name) + '">' +
          FF.esc(cl.name) + ' <span class="count">' + cl.count + '</span></button>';
      }).join('') +
      '</div>' +
      '<label class="field" style="min-width:150px"><span class="sr-only">Sort</span>' +
      '<select class="select" id="s-sort" style="min-height:38px;font-size:var(--fs-sm)">' +
      [['recent', 'Newest first'], ['name', 'Name A–Z'], ['pending', 'Highest pending'], ['fee', 'Highest fee'], ['class', 'By class']]
        .map(function (o) { return '<option value="' + o[0] + '"' + (state.sort === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') +
      '</select></label>' +
      '</div>'
    );
  }

  function summaryHTML(list) {
    var all = FF.store.currentStudents();
    var pendingSum = FF.sum(list, function (s) { return FF.ui.pending(s); });
    return (
      '<p class="dim" style="font-size:var(--fs-sm)">' +
      'Showing <b class="num">' + Math.min(state.shown, list.length) + '</b> of <b class="num">' + list.length + '</b>' +
      (list.length !== all.length ? ' filtered from ' + all.length : '') +
      ' · pending in view <b style="color:var(--unpaid)">' + FF.ui.money(pendingSum) + '</b>' +
      '</p>'
    );
  }

  function listHTML() {
    var list = filtered();
    if (!FF.store.currentStudents().length) {
      return FF.ui.emptyState({
        title: 'This month is empty',
        text: 'Import a register with one paste, or add students one by one. Everything stays on this device.',
        actions:
          '<button class="btn btn--primary" data-goto="import">' + FF.icons.icon('inbox') + 'Paste JSON</button>' +
          '<button class="btn btn--soft" data-add-student>' + FF.icons.icon('plus') + 'Add student</button>',
      });
    }
    if (!list.length) {
      return FF.ui.emptyState({
        title: 'No matches',
        text: 'Try a different name, class or filter — or clear the search to see everyone.',
        actions: '<button class="btn btn--soft" data-reset-filters>' + FF.icons.icon('refresh') + 'Clear filters</button>',
      });
    }
    var shown = list.slice(0, state.shown);
    return (
      FF.list.renderList(shown) +
      (list.length > shown.length
        ? '<button type="button" class="btn btn--soft btn--block more-btn" data-more>Show ' +
          Math.min(PAGE, list.length - shown.length) + ' more of ' + (list.length - shown.length) + ' remaining</button>'
        : '')
    );
  }

  function html() {
    var st = FF.store.getState();
    return (
      '<div class="view__head">' +
      '<div><h1 class="view__title">Students</h1>' +
      '<p class="view__sub">' + FF.esc(FF.monthLabel(st.currentMonth)) + ' · every record, payment and pending balance.</p></div>' +
      '<div class="btn-row">' +
      '<button type="button" class="btn btn--soft" data-export-csv>' + FF.icons.icon('download') + 'CSV</button>' +
      '<button type="button" class="btn btn--primary" data-add-student>' + FF.icons.icon('plus') + 'Add student</button>' +
      '</div></div>' +
      '<div class="card card--pad-sm" id="s-tools" style="margin-bottom:var(--sp-4)">' + toolsHTML() + '</div>' +
      '<div id="s-summary" style="margin-bottom:var(--sp-3)">' + summaryHTML(filtered()) + '</div>' +
      '<div id="s-list">' + listHTML() + '</div>'
    );
  }

  function renderListOnly(host) {
    FF.$('#s-summary', host).innerHTML = summaryHTML(filtered());
    FF.$('#s-list', host).innerHTML = listHTML();
  }

  function bind(host) {
    var tools = FF.$('#s-tools', host);

    tools.addEventListener('input', FF.debounce(function (e) {
      if (!e.target || e.target.id !== 's-search') return;
      state.q = e.target.value;
      state.shown = PAGE;
      var clear = FF.$('[data-clear]', tools);
      if (clear) clear.hidden = !state.q;
      renderListOnly(host);
    }, 110));

    tools.addEventListener('click', function (e) {
      if (e.target.closest('[data-clear]')) {
        state.q = '';
        state.shown = PAGE;
        FF.$('#s-tools', host).innerHTML = toolsHTML();
        bindTools(host);
        renderListOnly(host);
        var inp = FF.$('#s-search', host);
        if (inp) inp.focus();
        return;
      }
      var statusBtn = e.target.closest('[data-status]');
      if (statusBtn) {
        state.status = statusBtn.getAttribute('data-status');
        state.shown = PAGE;
        repaint(host);
        return;
      }
      var clsBtn = e.target.closest('[data-cls]');
      if (clsBtn) {
        state.cls = clsBtn.getAttribute('data-cls');
        state.shown = PAGE;
        repaint(host);
      }
    });

    tools.addEventListener('change', function (e) {
      if (e.target.id === 's-sort') {
        state.sort = e.target.value;
        renderListOnly(host);
      }
    });

    if (host.dataset.boundStudents) return;
    host.dataset.boundStudents = '1';
    host.addEventListener('click', function (e) {
      if (e.target.closest('[data-more]')) {
        state.shown += PAGE;
        renderListOnly(host);
        return;
      }
      if (e.target.closest('[data-reset-filters]')) {
        state = fresh();
        repaint(host, true);
      }
    });
  }

  function bindTools(host) { /* listeners live on #s-tools which persists; nothing extra needed */ }

  function repaint(host, remountTools) {
    if (remountTools) {
      FF.$('#s-tools', host).innerHTML = toolsHTML();
    } else {
      // keep the typed search text while refreshing counts
      var input = FF.$('#s-search', host);
      var val = input ? input.value : state.q;
      FF.$('#s-tools', host).innerHTML = toolsHTML();
      var next = FF.$('#s-search', host);
      if (next) next.value = val;
    }
    renderListOnly(host);
  }

  FF.views.students = {
    mount: function (host) {
      host.innerHTML = html();
      bind(host);
    },
    update: function (host) {
      host.innerHTML = html();
      bind(host);
    },
    resetFilters: function () { state = fresh(); },
    showAll: function (host) {
      state.shown = 100000;
      if (host) {
        FF.$('#s-summary', host).innerHTML = summaryHTML(filtered());
        FF.$('#s-list', host).innerHTML = listHTML();
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
