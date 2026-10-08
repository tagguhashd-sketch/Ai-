/* ==========================================================================
   FeeFlow — hand-rolled SVG charts (no chart library, no canvas)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var R = 15.9155; // circumference = 100

  function seg(pct, start, gap) {
    var len = Math.max(0, pct - gap);
    return {
      dash: FF.clamp(len, 0, 100).toFixed(2) + ' ' + (100 - FF.clamp(len, 0, 100)).toFixed(2),
      offset: (-(start + gap / 2)).toFixed(2),
    };
  }

  /**
   * Donut for {paid, partial, unpaid} counts.
   * Center shows the collection rate.
   */
  function donutHTML(counts, rate, centerLabel) {
    var total = counts.paid + counts.partial + counts.unpaid;
    var parts = [
      ['paid', counts.paid],
      ['partial', counts.partial],
      ['unpaid', counts.unpaid],
    ].filter(function (p) { return p[1] > 0; });

    var gap = parts.length > 1 ? 1.6 : 0;
    var start = 0;
    var circles = parts.map(function (p) {
      var pctv = total ? (p[1] / total) * 100 : 0;
      var s = seg(pctv, start, gap);
      start += pctv;
      return (
        '<circle class="donut__' + p[0] + '" cx="21" cy="21" r="' + R + '"' +
        ' data-final="' + s.dash + '" stroke-dashoffset="' + s.offset + '"' +
        ' stroke-dasharray="0 100"></circle>'
      );
    }).join('');

    if (!total) {
      circles = '<circle class="donut__track" cx="21" cy="21" r="' + R + '" stroke-dasharray="100 0"></circle>';
    }

    return (
      '<div class="donut" role="img" aria-label="Payment split: ' +
      counts.paid + ' paid, ' + counts.partial + ' partial, ' + counts.unpaid + ' unpaid">' +
      '<svg viewBox="0 0 42 42" aria-hidden="true">' +
      '<circle class="donut__track" cx="21" cy="21" r="' + R + '"></circle>' +
      circles +
      '</svg>' +
      '<div class="donut__center">' +
      '<span class="donut__value">' + (total ? rate + '%' : '—') + '</span>' +
      '<span class="micro">' + FF.esc(centerLabel || 'collected') + '</span>' +
      '</div></div>'
    );
  }

  /** animate donut segments from zero to their values */
  function playDonut(scope) {
    var hostEl = scope || document;
    var circles = FF.$$('.donut circle[data-final]', hostEl);
    if (!circles.length) return;
    if (FF.prefersReducedMotion()) {
      circles.forEach(function (c) { c.setAttribute('stroke-dasharray', c.getAttribute('data-final')); });
      return;
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        circles.forEach(function (c) { c.setAttribute('stroke-dasharray', c.getAttribute('data-final')); });
      });
    });
  }

  /**
   * Month-over-month bars: ghost bar = billed, bright bar = collected.
   * entries: [{key, label, fee, paid, current}]
   */
  function trendHTML(entries) {
    if (!entries.length) return '';
    var max = Math.max.apply(null, entries.map(function (e) { return Math.max(e.fee, e.paid, 1); }));
    var cols = entries.map(function (e) {
      var fh = Math.max(4, Math.round((e.fee / max) * 100));
      var ph = Math.max(4, Math.round((e.paid / max) * 100));
      return (
        '<div class="trend__col' + (e.current ? ' is-current' : '') + '" title="' + FF.attr(FF.monthLabel(e.key)) +
        ': collected ' + FF.money.format(e.paid, FF.store.currency()) + ' of ' + FF.money.format(e.fee, FF.store.currency()) + '">' +
        '<div class="trend__bars">' +
        '<span class="trend__bar" style="height:' + fh + '%"></span>' +
        '<span class="trend__bar trend__bar--got" style="height:' + ph + '%"></span>' +
        '</div>' +
        '<span class="trend__label">' + FF.esc(e.label) + '</span>' +
        '</div>'
      );
    }).join('');
    return '<div class="trend__chart">' + cols + '</div>';
  }

  /** legend rows under/next to the donut */
  function legendHTML(counts) {
    var total = counts.paid + counts.partial + counts.unpaid;
    var rows = [
      ['paid', 'Paid', counts.paid],
      ['partial', 'Partial', counts.partial],
      ['unpaid', 'Unpaid', counts.unpaid],
    ];
    return (
      '<div class="donut__legend">' +
      rows.map(function (r) {
        return (
          '<div class="legend-row legend-row--' + r[0] + '">' +
          '<span class="legend-row__dot"></span>' +
          '<span class="legend-row__label">' + r[1] + '</span>' +
          '<span class="legend-row__count">' + FF.plural(r[2], 'student') + '</span>' +
          '<span class="legend-row__pct">' + (total ? FF.money.pct(r[2], total) + '%' : '0%') + '</span>' +
          '</div>'
        );
      }).join('') +
      '</div>'
    );
  }

  FF.charts = { donutHTML: donutHTML, playDonut: playDonut, trendHTML: trendHTML, legendHTML: legendHTML };
})(typeof window !== 'undefined' ? window : globalThis);
