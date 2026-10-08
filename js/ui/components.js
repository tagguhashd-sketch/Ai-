/* ==========================================================================
   FeeFlow — shared renderers (stat cards, student cards, pills, empties)
   ========================================================================== */
(function (root) {
  'use strict';

  var FF = root.FF;

  var STATUS_LABEL = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid' };

  function money(n, opts) { return FF.money.html(n, FF.store.currency(), opts); }

  function pill(status) {
    return '<span class="pill pill--' + status + '">' + (STATUS_LABEL[status] || status) + '</span>';
  }

  function avatar(name) {
    var tint = FF.avatarTint(name);
    return (
      '<span class="avatar" style="--av-bg:' + tint[0] + ';--av-fg:' + tint[1] + '" aria-hidden="true">' +
      FF.esc(FF.initials(name)) + '</span>'
    );
  }

  function pending(s) { return Math.max(0, FF.money.round2(s.fee - s.paid)); }

  function statCard(cfg) {
    return (
      '<article class="stat stat--' + (cfg.accent || 'brand') + '">' +
      '<div class="stat__top">' +
      '<span class="stat__icon">' + FF.icons.icon(cfg.icon) + '</span>' +
      (cfg.delta ? '<span class="stat__delta">' + FF.esc(cfg.delta) + '</span>' : '') +
      '</div>' +
      '<div class="stat__value">' + cfg.value + '</div>' +
      '<div class="stat__label">' + FF.esc(cfg.label) + '</div>' +
      '</article>'
    );
  }

  /** phone / card used on mobile + desktop card column */
  function studentCard(s) {
    var due = pending(s);
    return (
      '<article class="scard scard--' + s.status + '" data-id="' + FF.attr(s.id) + '">' +
      '<header class="scard__head">' +
      avatar(s.name) +
      '<div class="scard__id">' +
      '<h3 class="scard__name">' + FF.esc(s.name) + '</h3>' +
      '<p class="scard__meta">' +
      FF.esc(s.cls ? 'Class ' + s.cls : 'No class') +
      (s.roll ? ' · Roll ' + FF.esc(s.roll) : '') +
      '</p></div>' +
      pill(s.status) +
      '</header>' +
      '<div class="scard__nums">' +
      '<div class="kv"><span class="kv__k">Fee</span><span class="kv__v">' + money(s.fee) + '</span></div>' +
      '<div class="kv"><span class="kv__k">Paid</span><span class="kv__v" style="color:var(--paid)">' + money(s.paid) + '</span></div>' +
      '<div class="kv"><span class="kv__k">Pending</span><span class="kv__v" style="color:' + (due ? 'var(--unpaid)' : 'var(--text-3)') + '">' + money(due) + '</span></div>' +
      '</div>' +
      '<footer class="scard__foot">' +
      (due > 0
        ? '<button type="button" class="btn btn--sm btn--brand-soft" data-action="collect" data-id="' + FF.attr(s.id) + '">' + FF.icons.icon('coins') + 'Collect</button>'
        : '<span class="tag">' + FF.icons.icon('check') + 'Settled</span>') +
      '<span class="spacer"></span>' +
      (s.phone
        ? '<a class="icon-btn" href="tel:' + FF.attr(s.phone.replace(/[^\d+]/g, '')) + '" aria-label="Call ' + FF.attr(s.name) + '">' + FF.icons.icon('phone') + '</a>'
        : '') +
      '<button type="button" class="icon-btn" data-action="edit" data-id="' + FF.attr(s.id) + '" aria-label="Edit ' + FF.attr(s.name) + '">' + FF.icons.icon('pencil') + '</button>' +
      '<button type="button" class="icon-btn" data-action="delete" data-id="' + FF.attr(s.id) + '" aria-label="Delete ' + FF.attr(s.name) + '">' + FF.icons.icon('trash') + '</button>' +
      '</footer>' +
      '</article>'
    );
  }

  function studentRow(s) {
    var due = pending(s);
    return (
      '<tr data-id="' + FF.attr(s.id) + '">' +
      '<td><div style="display:flex;align-items:center;gap:10px;min-width:170px">' + avatar(s.name) +
      '<div><div style="font-weight:700">' + FF.esc(s.name) + '</div>' +
      '<div class="dim" style="font-size:var(--fs-sm)">' + FF.esc(s.roll ? 'Roll ' + s.roll : (s.phone || '')) + '</div></div></div></td>' +
      '<td>' + FF.esc(s.cls || '—') + '</td>' +
      '<td class="num">' + money(s.fee) + '</td>' +
      '<td class="num" style="color:var(--paid)">' + money(s.paid) + '</td>' +
      '<td class="num" style="color:' + (due ? 'var(--unpaid)' : 'var(--text-3)') + '">' + money(due) + '</td>' +
      '<td>' + pill(s.status) + '</td>' +
      '<td><div class="row-actions">' +
      (due > 0 ? '<button type="button" class="btn btn--sm btn--brand-soft" data-action="collect" data-id="' + FF.attr(s.id) + '">Collect</button>' : '') +
      '<button type="button" class="icon-btn" data-action="edit" data-id="' + FF.attr(s.id) + '" aria-label="Edit ' + FF.attr(s.name) + '">' + FF.icons.icon('pencil') + '</button>' +
      '<button type="button" class="icon-btn" data-action="delete" data-id="' + FF.attr(s.id) + '" aria-label="Delete ' + FF.attr(s.name) + '">' + FF.icons.icon('trash') + '</button>' +
      '</div></td>' +
      '</tr>'
    );
  }

  function emptyState(cfg) {
    return (
      '<div class="empty">' +
      '<svg class="empty__art" viewBox="0 0 120 90" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect class="stroke" x="18" y="14" width="84" height="62" rx="8" opacity=".55"/>' +
      '<path class="stroke" d="M30 32h44M30 44h60M30 56h36" opacity=".4"/>' +
      '<path class="accent" d="M78 62c6-1 7-8 14-8" stroke-width="3"/>' +
      '<circle class="accent" cx="95" cy="53" r="4" fill="currentColor" stroke="none"/>' +
      '</svg>' +
      '<h3 class="empty__title">' + FF.esc(cfg.title) + '</h3>' +
      '<p class="empty__text">' + FF.esc(cfg.text) + '</p>' +
      (cfg.actions ? '<div class="btn-row" style="justify-content:center">' + cfg.actions + '</div>' : '') +
      '</div>'
    );
  }

  function sectionHead(title, right, sub) {
    return (
      '<div class="section-head">' +
      '<div><h2>' + FF.esc(title) + '</h2>' + (sub ? '<p class="dim" style="font-size:var(--fs-sm)">' + FF.esc(sub) + '</p>' : '') + '</div>' +
      (right || '') +
      '</div>'
    );
  }

  FF.ui = FF.ui || {};
  Object.assign(FF.ui, {
    STATUS_LABEL: STATUS_LABEL,
    money: money,
    pill: pill,
    avatar: avatar,
    pending: pending,
    statCard: statCard,
    studentCard: studentCard,
    studentRow: studentRow,
    emptyState: emptyState,
    sectionHead: sectionHead,
  });
})(typeof window !== 'undefined' ? window : globalThis);
