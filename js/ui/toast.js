/* ==========================================================================
   FeeFlow — toasts (the only way we talk back to the user)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var ICONS = { ok: 'check', warn: 'alert', err: 'alert', info: 'info' };

  function host() {
    var el = document.getElementById('toasts');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toasts';
      el.className = 'toasts';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * FF.toast.show('Saved', {type:'ok', action:{label:'Undo', fn}})
   */
  function show(message, opts) {
    var o = opts || {};
    var type = o.type || 'ok';
    var el = document.createElement('div');
    el.className = 'toast toast--' + type;
    el.innerHTML =
      '<span class="toast__icon">' + FF.icons.icon(ICONS[type] || 'info') + '</span>' +
      '<span class="toast__msg">' + FF.esc(message) + '</span>' +
      (o.action ? '<button type="button" class="toast__action" data-act="1">' + FF.esc(o.action.label) + '</button>' : '') +
      '<button type="button" class="toast__x" aria-label="Dismiss">' + FF.icons.icon('x') + '</button>';

    var timer = null;
    function dismiss() {
      clearTimeout(timer);
      el.classList.add('is-leaving');
      setTimeout(function () { el.remove(); }, 220);
    }

    el.addEventListener('click', function (e) {
      if (e.target.closest('.toast__x')) dismiss();
      var act = e.target.closest('.toast__action');
      if (act) { dismiss(); if (o.action && o.action.fn) o.action.fn(); }
    });

    host().appendChild(el);
    timer = setTimeout(dismiss, o.timeout || 4200);
    return { el: el, dismiss: dismiss };
  }

  FF.toast = { show: show };
})(typeof window !== 'undefined' ? window : globalThis);
