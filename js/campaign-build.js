/* /campaign-build · inspect a drafted build field by field. Local preview only. */
(function () {
  'use strict';

  var sheet = document.querySelector('.cb-sheet');
  var inspector = document.querySelector('[data-cb-inspector]');
  if (!sheet || !inspector) return;

  var fields = Array.prototype.slice.call(sheet.querySelectorAll('[data-cb-field]'));
  if (!fields.length) return;

  var source = inspector.querySelector('[data-cb-source]');
  var label = inspector.querySelector('[data-cb-label]');
  var value = inspector.querySelector('[data-cb-value]');
  var reason = inspector.querySelector('[data-cb-reason]');
  var position = inspector.querySelector('[data-cb-position]');
  var prev = inspector.querySelector('[data-cb-prev]');
  var next = inspector.querySelector('[data-cb-next]');
  var current = 0;

  function directReason(sourceText) {
    if (sourceText === 'You said') return 'Directly from your request.';
    if (sourceText === 'Set by objective') return 'This value follows the objective you chose.';
    if (sourceText === 'Said up front') return 'Kept from your request.';
    if (sourceText === 'Required') return 'The build waits until this is supplied.';
    return 'Drafted from the brief.';
  }

  function select(index, moveFocus) {
    current = (index + fields.length) % fields.length;
    fields.forEach(function (field, i) {
      var on = i === current;
      field.classList.toggle('is-inspected', on);
      field.setAttribute('aria-pressed', String(on));
    });

    var field = fields[current];
    var fieldLabel = field.querySelector('.cb-l');
    var fieldValue = field.querySelector('.cb-v');
    var fieldSource = field.querySelector('.tag');
    var fieldReason = field.querySelector(':scope > small');
    var sourceText = fieldSource ? fieldSource.textContent.trim() : 'Build field';

    label.textContent = fieldLabel ? fieldLabel.textContent.trim() : 'Build field';
    value.textContent = fieldValue ? fieldValue.textContent.trim() : '';
    reason.textContent = fieldReason ? fieldReason.textContent.trim() : directReason(sourceText);
    source.textContent = sourceText;
    source.className = fieldSource ? fieldSource.className : 'tag grey';
    position.textContent = (current + 1) + ' of ' + fields.length;
    if (moveFocus) field.focus({ preventScroll: true });
  }

  function show(index) {
    select(index, false);
  }

  /* "Change a field" is a click, so bringing the inspector on screen is the expected move. */
  function open(index) {
    select(index, false);
    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    inspector.setAttribute('tabindex', '-1');
    inspector.focus({ preventScroll: true });
    inspector.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }

  fields.forEach(function (field, index) {
    field.setAttribute('role', 'button');
    field.setAttribute('tabindex', '0');
    field.setAttribute('aria-pressed', 'false');
    field.addEventListener('click', function () { select(index, false); });
    field.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select(index, false);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        select(index + 1, true);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        select(index - 1, true);
      }
    });
  });

  document.querySelectorAll('[data-cb-jump]').forEach(function (jump) {
    jump.addEventListener('click', function (event) {
      var index = fields.findIndex(function (field) {
        return field.getAttribute('data-cb-field') === jump.getAttribute('data-cb-jump');
      });
      if (index < 0) return;
      event.preventDefault();
      show(index);
    });
  });

  document.querySelectorAll('[data-cb-open]').forEach(function (button) {
    button.addEventListener('click', function () { open(current || 1); });
  });

  var statuses = Array.prototype.slice.call(document.querySelectorAll('[data-cb-action-status]'));
  var approvals = Array.prototype.slice.call(document.querySelectorAll('[data-cb-preview]'));
  statuses.forEach(function (status) { status.dataset.default = status.textContent; });
  approvals.forEach(function (button) {
    button.addEventListener('click', function () {
      var approved = !sheet.classList.contains('is-preview-approved');
      sheet.classList.toggle('is-preview-approved', approved);
      statuses.forEach(function (status) {
        status.textContent = approved ? 'Build accepted. Ready for account handoff.' : status.dataset.default;
      });
      approvals.forEach(function (approval) {
        approval.textContent = approved ? 'Reset build' : 'Approve';
        approval.setAttribute('aria-pressed', String(approved));
      });
    });
  });

  prev.addEventListener('click', function () { select(current - 1, true); });
  next.addEventListener('click', function () { select(current + 1, true); });

  var hashIndex = fields.findIndex(function (field) { return '#' + field.id === location.hash; });
  select(hashIndex > -1 ? hashIndex : 0, false);
}());
