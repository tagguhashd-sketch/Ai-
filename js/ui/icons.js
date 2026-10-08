/* ==========================================================================
   FeeFlow — inline SVG icon system (one sprite, zero requests)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;

  var P = {
    grid: '<rect x="3.2" y="3.2" width="7.2" height="7.2" rx="2"/><rect x="13.6" y="3.2" width="7.2" height="7.2" rx="2"/><rect x="3.2" y="13.6" width="7.2" height="7.2" rx="2"/><rect x="13.6" y="13.6" width="7.2" height="7.2" rx="2"/>',
    users: '<circle cx="9.2" cy="8" r="3.4"/><path d="M3.4 19.4c.7-3.4 3-5.2 5.8-5.2s5.1 1.8 5.8 5.2"/><circle cx="17.2" cy="9.2" r="2.7"/><path d="M16.4 14.6c2.4.3 4 1.9 4.5 4.5"/>',
    inbox: '<path d="M12 3.5V12"/><path d="M8.6 8.8 12 12.2l3.4-3.4"/><path d="M4 13.5V18a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 18v-4.5"/><path d="M4 13.5h4.2l1.4 2.4h4.8l1.4-2.4H20"/>',
    calendar: '<rect x="3.2" y="5" width="17.6" height="16" rx="3"/><path d="M3.2 10.2h17.6"/><path d="M8.2 3v4"/><path d="M15.8 3v4"/>',
    plus: '<path d="M12 5.2v13.6"/><path d="M5.2 12h13.6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20.4 20.4 16.6 16.6"/>',
    pencil: '<path d="m4 20 1.1-4.1L16.6 4.4a2.12 2.12 0 0 1 3 3L8.1 18.9Z"/><path d="M14.8 6.2l3 3"/>',
    trash: '<path d="M4 7h16"/><path d="M9.2 7V5.2A1.8 1.8 0 0 1 11 3.4h2a1.8 1.8 0 0 1 1.8 1.8V7"/><path d="m6.2 7 .9 12.6a2 2 0 0 0 2 1.9h5.8a2 2 0 0 0 2-1.9L17.8 7"/><path d="M10.2 11v6"/><path d="M13.8 11v6"/>',
    x: '<path d="m6.4 6.4 11.2 11.2"/><path d="M17.6 6.4 6.4 17.6"/>',
    check: '<path d="m5 12.8 4.4 4.4L19 7.2"/>',
    'chev-down': '<path d="m6.5 9.5 5.5 5.5 5.5-5.5"/>',
    'chev-left': '<path d="M14.5 6.5 9 12l5.5 5.5"/>',
    'chev-right': '<path d="m9.5 6.5 5.5 5.5-5.5 5.5"/>',
    copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.4"/><path d="M5.5 15V5.8A2.3 2.3 0 0 1 7.8 3.5H17"/>',
    upload: '<path d="M12 16.5V6.8"/><path d="M8.4 10.2 12 6.6l3.6 3.6"/><path d="M4.5 17v1.6a2.4 2.4 0 0 0 2.4 2.4h10.2a2.4 2.4 0 0 0 2.4-2.4V17"/>',
    download: '<path d="M12 4v10.4"/><path d="m8.4 11 3.6 3.6L15.6 11"/><path d="M4.8 19.6h14.4"/>',
    camera: '<path d="M4 8.2h2.8l1.9-2.8h6.6l1.9 2.8H20a1.2 1.2 0 0 1 1.2 1.2v9.2A1.2 1.2 0 0 1 20 19.8H4a1.2 1.2 0 0 1-1.2-1.2V9.4A1.2 1.2 0 0 1 4 8.2Z"/><circle cx="12" cy="13.6" r="3.4"/>',
    sparkles: '<path d="M12 4.2 13.6 8.6 18 10.2l-4.4 1.6L12 16.2l-1.6-4.4L6 10.2l4.4-1.6Z"/><path d="m18.6 15.4.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7Z"/>',
    banknote: '<rect x="2.8" y="6" width="18.4" height="12" rx="2.4"/><circle cx="12" cy="12" r="2.7"/><path d="M6.4 12h.01"/><path d="M17.6 12h.01"/>',
    wallet: '<rect x="3" y="6" width="18" height="13" rx="2.6"/><path d="M3 10.4h18"/><path d="M15.6 14.8h2.6"/>',
    clock: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.1 2"/>',
    alert: '<path d="M12 4.2 21 20H3Z"/><path d="M12 10.2v4"/><path d="M12 17.3h.01"/>',
    info: '<circle cx="12" cy="12" r="8.4"/><path d="M12 11.2v5"/><path d="M12 7.8h.01"/>',
    phone: '<path d="M7 3.4h2.6l1.4 3.8-1.9 1.5a12.6 12.6 0 0 0 5.2 5.2l1.5-1.9 3.8 1.4V16a2.4 2.4 0 0 1-2.6 2.4A16.6 16.6 0 0 1 4.6 6 2.4 2.4 0 0 1 7 3.4Z"/>',
    share: '<circle cx="6.4" cy="12" r="2.6"/><circle cx="17.4" cy="6" r="2.6"/><circle cx="17.4" cy="18" r="2.6"/><path d="m8.8 10.7 6.2-3.4"/><path d="m8.8 13.3 6.2 3.4"/>',
    print: '<path d="M7 8V3.8h10V8"/><rect x="3.6" y="8" width="16.8" height="8" rx="2"/><rect x="7" y="13.6" width="10" height="6.6" rx="1"/>',
    sliders: '<path d="M4 8h9"/><path d="M17.6 8H20"/><circle cx="15.2" cy="8" r="2.4"/><path d="M4 16h2.4"/><path d="M11 16h9"/><circle cx="8.6" cy="16" r="2.4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.8v2.2"/><path d="M12 19v2.2"/><path d="m4.6 4.6 1.6 1.6"/><path d="m17.8 17.8 1.6 1.6"/><path d="M2.8 12H5"/><path d="M19 12h2.2"/><path d="m4.6 19.4 1.6-1.6"/><path d="m17.8 6.2 1.6-1.6"/>',
    moon: '<path d="M20 14.6A8.6 8.6 0 1 1 9.4 4a7 7 0 0 0 10.6 10.6Z"/>',
    lock: '<rect x="4.8" y="10.6" width="14.4" height="9.6" rx="2.4"/><path d="M8.2 10.6V8a3.8 3.8 0 0 1 7.6 0v2.6"/>',
    refresh: '<path d="M20.2 12a8.2 8.2 0 1 1-2.4-5.8"/><path d="M20.2 4.2v4.2H16"/>',
    dots: '<circle cx="5.4" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="18.6" cy="12" r="1.5"/>',
    'arrow-right': '<path d="M4.4 12h14.4"/><path d="m13.6 6.8 5.2 5.2-5.2 5.2"/>',
    pie: '<path d="M12 3.4a8.6 8.6 0 1 0 8.6 8.6H12Z"/><path d="M14.6 3.9a8.6 8.6 0 0 1 5.5 5.5h-5.5Z"/>',
    undo: '<path d="M8 5.2 4 9.2l4 4"/><path d="M4 9.2h9.6a6 6 0 0 1 0 12H10"/>',
    book: '<path d="M4.4 5.4A2.4 2.4 0 0 1 6.8 3h12.8v15.6H6.8a2.4 2.4 0 0 0-2.4 2.4Z"/><path d="M4.4 20.4a2.4 2.4 0 0 1 2.4-2.4h12.8"/>',
    image: '<rect x="3.2" y="4.4" width="17.6" height="15.2" rx="2.6"/><circle cx="8.6" cy="9.6" r="1.8"/><path d="m4 16.8 4.8-4.8 3.8 3.8 3-3 4.4 4.4"/>',
    send: '<path d="M20.6 3.6 10.4 13.8"/><path d="M20.6 3.6 14 20.4l-3.6-6.6-6.6-3.6Z"/>',
    receipt: '<path d="M6 3.4h12v17.2l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5Z"/><path d="M9.2 8.4h5.6"/><path d="M9.2 12h5.6"/>',
    shield: '<path d="m12 3.2 7.6 2.8v5.6c0 4.8-3.2 7.8-7.6 9.2-4.4-1.4-7.6-4.4-7.6-9.2V6Z"/><path d="m9.2 11.8 2 2 3.6-3.8"/>',
    zap: '<path d="M13.2 2.8 4.6 13.6h5.6l-1.4 7.6 8.6-10.8h-5.6Z"/>',
    keyboard: '<rect x="2.8" y="6.6" width="18.4" height="11" rx="2.4"/><path d="M6.6 10h.01"/><path d="M10.2 10h.01"/><path d="M13.8 10h.01"/><path d="M17.4 10h.01"/><path d="M8 14h8"/>',
    filter: '<path d="M4 5.4h16l-6.2 7.2v5.6l-3.6 1.8v-7.4Z"/>',
    home: '<path d="m4 10.4 8-6.8 8 6.8"/><path d="M6.4 8.8V19a1.6 1.6 0 0 0 1.6 1.6h8A1.6 1.6 0 0 0 17.6 19V8.8"/>',
    layers: '<path d="m12 3.4 8.6 4.4L12 12.2 3.4 7.8Z"/><path d="m3.4 12.4 8.6 4.4 8.6-4.4"/><path d="m3.4 16.6 8.6 4.4 8.6-4.4"/>',
    target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="0.8"/>',
    'trend-up': '<path d="m3.6 16.8 5.6-5.6 3.6 3.6 7.6-7.6"/><path d="M15.2 7.2h5.2v5.2"/>',
    'trend-down': '<path d="m3.6 7.2 5.6 5.6 3.6-3.6 7.6 7.6"/><path d="M15.2 16.8h5.2v-5.2"/>',
    external: '<path d="M14 4.4h5.6V10"/><path d="M19.6 4.4 11 13"/><path d="M17.6 13.6V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.4a2 2 0 0 1 2-2h4.4"/>',
    eye: '<path d="M2.8 12S6.4 5.8 12 5.8 21.2 12 21.2 12 17.6 18.2 12 18.2 2.8 12 2.8 12Z"/><circle cx="12" cy="12" r="3"/>',
    coins: '<circle cx="9" cy="9" r="5.6"/><path d="M14.8 6.2a5.6 5.6 0 1 1-6.6 8.6"/><path d="M9 6.8v4.4"/><path d="M7 8.2h3.4"/>',
  };

  function mount() {
    if (document.getElementById('ff-sprite')) return;
    var defs = Object.keys(P).map(function (name) {
      return '<symbol id="i-' + name + '" viewBox="0 0 24 24">' + P[name] + '</symbol>';
    }).join('');
    var div = document.createElement('div');
    div.id = 'ff-sprite';
    div.setAttribute('aria-hidden', 'true');
    div.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;';
    div.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" style="fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round">' +
      defs +
      '</svg>';
    document.body.insertBefore(div, document.body.firstChild);
  }

  function icon(name, cls) {
    return '<svg class="' + (cls || 'icon') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  }

  FF.icons = { mount: mount, icon: icon, names: Object.keys(P) };
})(typeof window !== 'undefined' ? window : globalThis);
