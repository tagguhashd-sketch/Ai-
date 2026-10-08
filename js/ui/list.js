/* ==========================================================================
   FeeFlow — student list helpers (filter, sort, dual card/table rendering)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;

  function filterStudents(list, f) {
    var q = (f.q || '').trim().toLowerCase();
    return list.filter(function (s) {
      if (f.status && f.status !== 'all' && s.status !== f.status) return false;
      if (f.cls && f.cls !== 'all' && (s.cls || 'No class') !== f.cls) return false;
      if (q) {
        var hay = (s.name + ' ' + s.cls + ' ' + s.roll + ' ' + s.phone).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  var SORTS = {
    name: function (a, b) { return a.name.localeCompare(b.name); },
    pending: function (a, b) { return (b.fee - b.paid) - (a.fee - a.paid) || a.name.localeCompare(b.name); },
    fee: function (a, b) { return b.fee - a.fee; },
    recent: function (a, b) { return b.createdAt - a.createdAt; },
    class: function (a, b) { return (a.cls || '').localeCompare(b.cls || '') || a.name.localeCompare(b.name); },
  };

  function sortStudents(list, sort) {
    var fn = SORTS[sort] || SORTS.recent;
    return list.slice().sort(fn);
  }

  /** renders BOTH representations; CSS picks cards on phones, table on desktop */
  function renderList(list) {
    if (!list.length) return '';
    var cards = list.map(FF.ui.studentCard).join('');
    var rows = list.map(FF.ui.studentRow).join('');
    return (
      '<div class="slist slist--cards stagger">' + cards + '</div>' +
      '<div class="slist slist--table table-wrap"><table class="table"><thead><tr>' +
      '<th>Student</th><th>Class</th><th>Fee</th><th>Paid</th><th>Pending</th><th>Status</th><th style="text-align:right">Actions</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>'
    );
  }

  FF.list = { filterStudents: filterStudents, sortStudents: sortStudents, renderList: renderList, SORTS: Object.keys(SORTS) };
})(typeof window !== 'undefined' ? window : globalThis);
