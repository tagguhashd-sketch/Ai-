/* ==========================================================================
   FeeFlow — core utilities (no dependencies, no build step)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = (root.FF = root.FF || {});

  /* ------------------------------------------------------------- DOM --- */

  /** querySelector shortcut scoped to an optional root */
  function $(sel, scope) { return (scope || document).querySelector(sel); }
  /** querySelectorAll as a real array */
  function $$(sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); }

  /** HTML-escape any string before it touches innerHTML */
  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function attr(value) { return esc(value); }

  /* --------------------------------------------------------- strings --- */

  var uidCounter = 0;
  /** short, collision-safe id: time + counter + randomness */
  function uid(prefix) {
    uidCounter += 1;
    return (
      (prefix || 's') +
      Date.now().toString(36) +
      uidCounter.toString(36) +
      Math.random().toString(36).slice(2, 7)
    );
  }

  function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function sum(list, pick) {
    var total = 0;
    for (var i = 0; i < list.length; i++) total += pick ? pick(list[i]) : list[i];
    return total;
  }

  function initials(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** stable muted tint per name, so avatars feel personal but never loud */
  var AVATAR_TINTS = [
    ['#134e3d', '#5fe0b0'], ['#123c46', '#66d3e8'], ['#4a3413', '#e9b45c'],
    ['#46261f', '#ef8f77'], ['#2b2f45', '#a5b0f0'], ['#3a2b45', '#d3a2e8'],
  ];
  function avatarTint(name) {
    var h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length];
  }

  function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function plural(n, word, pluralWord) { return n + ' ' + (n === 1 ? word : pluralWord || word + 's'); }

  /* ------------------------------------------------------------ dates --- */

  var MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  /** "2026-10" */
  function monthKeyOf(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }

  function todayKey() { return monthKeyOf(new Date()); }

  function keyParts(key) {
    var m = /^(\d{4})-(\d{2})$/.exec(String(key || ''));
    return m ? { year: +m[1], month: +m[2] } : null;
  }

  function monthLabel(key, short) {
    var p = keyParts(key);
    if (!p) return String(key || '—');
    var name = MONTH_NAMES[p.month - 1] || 'Month';
    return (short ? name.slice(0, 3) : name) + ' ' + p.year;
  }

  function addMonths(key, delta) {
    var p = keyParts(key) || keyParts(todayKey());
    var idx = p.year * 12 + (p.month - 1) + delta;
    var y = Math.floor(idx / 12), m = (idx % 12 + 12) % 12;
    return y + '-' + String(m + 1).padStart(2, '0');
  }

  function shiftKey(key, delta) { return addMonths(key, delta); }

  function timeAgo(ts) {
    var diff = Date.now() - ts;
    var min = Math.round(diff / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + 'm ago';
    var hrs = Math.round(min / 60);
    if (hrs < 24) return hrs + 'h ago';
    var days = Math.round(hrs / 24);
    if (days < 7) return days + 'd ago';
    var d = new Date(ts);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  }

  function dateTime(ts) {
    return new Date(ts).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }

  /* --------------------------------------------------------- clipboard --- */

  function copyText(text) {
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok ? Promise.resolve() : Promise.reject(new Error('copy failed'));
  }

  /* -------------------------------------------------------- downloads --- */

  function download(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }

  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result || '')); };
      fr.onerror = function () { reject(new Error('Could not read that file.')); };
      fr.readAsText(file);
    });
  }

  /* ------------------------------------------------------------ misc --- */

  function prefersReducedMotion() {
    return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function isCoarse() {
    return !!(root.matchMedia && root.matchMedia('(pointer: coarse)').matches);
  }

  /** keeps focus inside a container (used by sheets) */
  function trapFocus(container, e) {
    var focusables = $$(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      container
    ).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  FF.$ = $;
  FF.$$ = $$;
  FF.esc = esc;
  FF.attr = attr;
  FF.uid = uid;
  FF.clamp = clamp;
  FF.debounce = debounce;
  FF.sum = sum;
  FF.initials = initials;
  FF.avatarTint = avatarTint;
  FF.escapeRegExp = escapeRegExp;
  FF.plural = plural;
  FF.monthKeyOf = monthKeyOf;
  FF.todayKey = todayKey;
  FF.keyParts = keyParts;
  FF.monthLabel = monthLabel;
  FF.addMonths = addMonths;
  FF.shiftKey = shiftKey;
  FF.timeAgo = timeAgo;
  FF.dateTime = dateTime;
  FF.copyText = copyText;
  FF.download = download;
  FF.readFileAsText = readFileAsText;
  FF.prefersReducedMotion = prefersReducedMotion;
  FF.isCoarse = isCoarse;
  FF.trapFocus = trapFocus;
  FF.MONTH_NAMES = MONTH_NAMES;
})(typeof window !== 'undefined' ? window : globalThis);
