/* ==========================================================================
   FeeFlow — tiny hash router (works on any static host, even file://)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var ROUTES = ['dashboard', 'students', 'import', 'months', 'settings'];
  var onChange = null;

  function current() {
    var h = String(root.location ? root.location.hash : '').replace(/^#\/?/, '');
    return ROUTES.indexOf(h) === -1 ? 'dashboard' : h;
  }

  function navigate(name, replace) {
    if (ROUTES.indexOf(name) === -1) name = 'dashboard';
    var target = '#/' + name;
    if (root.location.hash === target) {
      if (onChange) onChange(name);
      return;
    }
    if (replace && root.history && root.history.replaceState) {
      root.history.replaceState(null, '', target);
      if (onChange) onChange(name);
    } else {
      root.location.hash = target;
    }
  }

  function start(handler) {
    onChange = handler;
    root.addEventListener('hashchange', function () { onChange(current()); });
    onChange(current());
  }

  function markActive(name) {
    FF.$$('[data-nav]').forEach(function (el) {
      var on = el.getAttribute('data-nav') === name;
      el.classList.toggle('is-active', on);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  FF.router = { ROUTES: ROUTES, current: current, navigate: navigate, start: start, markActive: markActive };
})(typeof window !== 'undefined' ? window : globalThis);
