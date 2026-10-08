/* ==========================================================================
   FeeFlow — money parsing & formatting
   Accepts the messy shapes people paste out of registers:
   "₹5,000", "5,000.00", "Rs 2500", "2 500", "—", "", 2500, "2500/-"
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;

  var CURRENCY_WORDS = /rs\.?|inr|usd|\$|₹|rupees?|rs|pkr|bdt|aed|sar|eur|£|€|¥/gi;

  /**
   * Coerce anything into a number of currency units.
   * Returns NaN only when the value genuinely carries no numeric meaning.
   */
  function toNumber(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return isFinite(value) ? value : NaN;
    if (typeof value !== 'string') return NaN;

    var s = value.trim();
    if (!s) return 0;
    if (/^(-{1,2}|—|–|n\/?a|nil|none|\.{1,3})$/i.test(s)) return 0;

    // keep only digits, separators, minus
    var cleaned = s.replace(CURRENCY_WORDS, '').replace(/[\s,_]/g, '');
    cleaned = cleaned.replace(/[^\d.\-+eE]/g, '');
    cleaned = cleaned.replace(/^([-+])[-+]+/, '$1').replace(/[-+]+$/, ''); // "5000/-" style
    if (!cleaned || cleaned === '-' || cleaned === '+' || cleaned === '.') return NaN;

    // multiple dots are thousands separators ("1.200.50" → 1200.50, "1.200.500" → 1200500)
    var parts = cleaned.split('.');
    if (parts.length > 2) {
      var lastSeg = parts[parts.length - 1];
      cleaned = lastSeg.length <= 2 ? parts.slice(0, -1).join('') + '.' + lastSeg : parts.join('');
    }

    var n = Number(cleaned);
    return isFinite(n) ? n : NaN;
  }

  /** round to whole units unless the value genuinely has paise */
  function round2(n) { return Math.round(n * 100) / 100; }

  function isWhole(n) { return Math.abs(n - Math.round(n)) < 0.005; }

  function localeFor(currency) { return currency === '₹' ? 'en-IN' : 'en-US'; }

  /** 1234567 -> "12,34,567" (₹) or "1,234,567" (others) */
  function group(n, currency) {
    var whole = Math.floor(Math.abs(n));
    var loc = localeFor(currency);
    var s;
    if (loc === 'en-IN') {
      var str = String(whole);
      if (str.length > 3) {
        var last3 = str.slice(-3);
        var rest = str.slice(0, -3);
        rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
        s = rest + ',' + last3;
      } else s = str;
    } else {
      s = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return (n < 0 ? '-' : '') + s;
  }

  /** format with decimals only when needed */
  function formatMoney(n, currency, opts) {
    var v = round2(Number(n) || 0);
    var o = opts || {};
    var dec = !isWhole(v) ? 2 : (o.decimals || 0);
    var body = group(Math.abs(v) < 0.005 ? 0 : v, currency);
    if (dec) {
      body += '.' + String(Math.round(Math.abs(v) * 100) % 100).padStart(2, '0');
    }
    return body;
  }

  /** HTML with a quiet currency glyph: <span class="cur">₹</span>5,000 */
  function moneyHTML(n, currency, opts) {
    var o = opts || {};
    var cur = currency == null ? '₹' : currency;
    return (
      '<span class="num">' +
      (o.plain ? '' : '<span class="cur">' + FF.esc(cur) + '</span>') +
      FF.esc(formatMoney(n, cur, o)) +
      '</span>'
    );
  }

  /** compact labels for charts: 1.2L, 45K, 3Cr */
  function compact(n, currency) {
    var v = Math.abs(Number(n) || 0);
    var sign = n < 0 ? '-' : '';
    var unit = '';
    if (v >= 1e7) { v /= 1e7; unit = 'Cr'; }
    else if (v >= 1e5) { v /= 1e5; unit = 'L'; }
    else if (v >= 1e3) { v /= 1e3; unit = 'K'; }
    var str = v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
    return sign + str + unit;
  }

  /** percentage, rounded, clamped 0-100 */
  function pct(part, total) {
    if (!total) return 0;
    return Math.round((part / total) * 1000) / 10;
  }

  FF.money = {
    toNumber: toNumber,
    round2: round2,
    format: formatMoney,
    html: moneyHTML,
    compact: compact,
    pct: pct,
    group: group,
  };
})(typeof window !== 'undefined' ? window : globalThis);
