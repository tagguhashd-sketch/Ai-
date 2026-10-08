/* ==========================================================================
   FeeFlow — sheets & confirms (bottom sheet on phones, dialog on desktop)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;
  var openCount = 0;
  var lastFocus = null;

  function lockScroll(on) {
    openCount = Math.max(0, openCount + (on ? 1 : -1));
    document.body.style.overflow = openCount ? 'hidden' : '';
  }

  /**
   * Open a sheet.
   * options: {title, sub, body, footer, onMount(root, api), dismissible=true}
   * returns api {el, close}
   */
  function sheet(options) {
    var o = options || {};
    var previous = document.activeElement;
    if (!lastFocus) lastFocus = previous;

    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="sheet' + (o.wide ? ' sheet--wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + FF.attr(o.title || 'Dialog') + '">' +
      '<div class="sheet__grab"></div>' +
      '<div class="sheet__head">' +
      '<div><h2 class="sheet__title">' + FF.esc(o.title || '') + '</h2>' +
      (o.sub ? '<p class="sheet__sub">' + FF.esc(o.sub) + '</p>' : '') +
      '</div>' +
      '<button type="button" class="icon-btn sheet__close" data-close aria-label="Close">' + FF.icons.icon('x') + '</button>' +
      '</div>' +
      '<div class="sheet__body">' + (o.body || '') + '</div>' +
      (o.footer ? '<div class="sheet__foot">' + o.footer + '</div>' : '') +
      '</div>';

    document.body.appendChild(scrim);
    lockScroll(true);

    var panel = scrim.firstElementChild;
    var api = {
      el: panel,
      scrim: scrim,
      closed: false,
      close: function (result) {
        if (api.closed) return;
        api.closed = true;
        panel.style.transition = 'opacity 180ms ease, transform 180ms ease';
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(12px) scale(.98)';
        scrim.style.transition = 'opacity 180ms ease';
        scrim.style.opacity = '0';
        setTimeout(function () {
          scrim.remove();
          lockScroll(false);
          if (lastFocus && document.body.contains(lastFocus)) lastFocus.focus();
          lastFocus = null;
        }, 190);
        if (o.onClose) o.onClose(result);
      },
    };

    scrim.addEventListener('mousedown', function (e) {
      if (e.target === scrim && o.dismissible !== false) api.close();
    });
    scrim.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]') && o.dismissible !== false) api.close();
    });
    scrim.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && o.dismissible !== false) { e.stopPropagation(); api.close(); }
      if (e.key === 'Tab') FF.trapFocus(panel, e);
    });

    // focus the first field (or the close button) so keyboards land somewhere sane
    setTimeout(function () {
      var target = panel.querySelector('[data-autofocus]') ||
        panel.querySelector('input, textarea, select') ||
        panel.querySelector('[data-close]');
      if (target) target.focus({ preventScroll: true });
    }, 60);

    if (o.onMount) o.onMount(panel, api);
    return api;
  }

  function confirmBox(options) {
    var o = options || {};
    return new Promise(function (resolve) {
      var done = false;
      var api = sheet({
        title: o.title || 'Are you sure?',
        sub: o.sub,
        body: '<p class="muted" style="font-size:var(--fs-md);line-height:1.6">' + (o.html || FF.esc(o.message || '')) + '</p>',
        footer:
          '<button type="button" class="btn btn--soft" data-close>' + FF.esc(o.cancelLabel || 'Cancel') + '</button>' +
          '<button type="button" class="btn ' + (o.danger === false ? 'btn--primary' : 'btn--danger') + '" data-confirm>' + FF.esc(o.confirmLabel || 'Delete') + '</button>',
        onClose: function () { if (!done) { done = true; resolve(false); } },
        onMount: function (panel, a) {
          panel.querySelector('[data-confirm]').addEventListener('click', function () {
            done = true;
            a.close();
            resolve(true);
          });
        },
      });
      // ensure resolve(false) when closed via scrim/esc (onClose handles it)
      void api;
    });
  }

  function alertBox(options) {
    var o = options || {};
    return sheet({
      title: o.title || 'Heads up',
      body: o.html || '<p class="muted">' + FF.esc(o.message || '') + '</p>',
      footer: '<button type="button" class="btn btn--primary" data-close>OK</button>',
    });
  }

  FF.modal = { sheet: sheet, confirm: confirmBox, alert: alertBox };
})(typeof window !== 'undefined' ? window : globalThis);
