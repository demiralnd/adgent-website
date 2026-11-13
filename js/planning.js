/* /planning · the example month.
   One selection model covers plan lines, weeks and layers. The document header names the
   current selection and its basis; Escape or Clear returns to the complete month. With
   JavaScript off every basis remains open under its week. */
(function () {
  'use strict';
  var sec = document.getElementById('pl-month');
  if (!sec) return;

  var sheet = sec.querySelector('.pl-sheet');
  var legend = sec.querySelector('.pl-legend');
  var chips = Array.prototype.slice.call(legend.querySelectorAll('button[data-layer]'));
  var evs = Array.prototype.slice.call(sheet.querySelectorAll('.pl-ev'));
  var whs = Array.prototype.slice.call(sheet.querySelectorAll('.pl-wh'));
  var panels = Array.prototype.slice.call(sheet.querySelectorAll('.pl-panel'));
  var state = sheet.querySelector('.pl-docstate');
  var stateKind = document.getElementById('pl-state-kind');
  var stateTitle = document.getElementById('pl-state-title');
  var basis = document.getElementById('pl-basis');
  var clear = document.getElementById('pl-clear');
  var activeControl = null;
  var LAYER = {
    me: {
      title: 'From you',
      basis: 'The budget, dates and goal as typed in chat. The plan works inside them.'
    },
    ad: {
      title: 'Drafted',
      basis: 'Each drafted number names what it was computed from. Thin history stays visible.'
    },
    test: {
      title: 'Test',
      basis: 'One test, with its share, read date and rule for keeping it.'
    },
    guard: {
      title: 'Guardrail',
      basis: 'The limits the plan stays inside before a budget move becomes a decision card.'
    },
    wait: {
      title: 'Account move',
      basis: 'Each recommended change becomes a decision card with its current state, proposed state and rationale.'
    }
  };

  function setState(kind, title, detail, active) {
    stateKind.textContent = kind;
    stateTitle.textContent = title;
    basis.textContent = detail;
    state.classList.toggle('is-active', active);
    clear.hidden = !active;
  }

  function closePanels() {
    panels.forEach(function (panel) {
      panel.classList.remove('open', 'all');
      panel.style.removeProperty('--col');
    });
    sheet.querySelectorAll('.pl-card.open').forEach(function (card) {
      card.classList.remove('open');
    });
    evs.concat(whs).forEach(function (button) {
      button.setAttribute('aria-expanded', 'false');
    });
  }

  function clearLayer() {
    chips.forEach(function (chip) { chip.setAttribute('aria-pressed', 'false'); });
    legend.removeAttribute('data-on');
    sheet.removeAttribute('data-layer');
  }

  function resetSelection() {
    closePanels();
    clearLayer();
    activeControl = null;
    setState(
      'Plan view',
      'Four weeks · $6,000',
      'Select a line, week or layer to inspect its basis.',
      false
    );
  }

  function labelForBlock(button, card) {
    var heading = card.querySelector('.pl-eh > span');
    var label = button.querySelector('.pl-evl');
    return (heading ? heading.textContent : '') + ' · ' + (label ? label.textContent : button.textContent);
  }

  function openBlock(button) {
    var card = document.getElementById(button.getAttribute('aria-controls'));
    var panel = card.closest('.pl-panel');
    closePanels();
    clearLayer();
    panel.style.setProperty('--col', button.getAttribute('data-col'));
    card.classList.add('open');
    panel.classList.add('open');
    button.setAttribute('aria-expanded', 'true');
    activeControl = button;
    setState(
      'Selected line',
      labelForBlock(button, card),
      button.closest('.pl-row').getAttribute('data-basis'),
      true
    );
  }

  function openWeek(button) {
    var panel = document.getElementById(button.getAttribute('aria-controls'));
    var row = button.closest('.pl-row');
    closePanels();
    clearLayer();
    panel.classList.add('open', 'all');
    button.setAttribute('aria-expanded', 'true');
    activeControl = button;
    setState(
      'Selected week',
      button.querySelector('b').textContent + ' · ' + button.querySelector('span').textContent,
      row.getAttribute('data-basis'),
      true
    );
  }

  function toggle(button, open) {
    if (button.getAttribute('aria-expanded') === 'true') {
      resetSelection();
      return;
    }
    open(button);
  }

  evs.forEach(function (button) {
    var card = document.getElementById(button.getAttribute('aria-controls'));
    button.setAttribute('aria-label', labelForBlock(button, card));
    button.addEventListener('click', function () { toggle(button, openBlock); });
  });

  whs.forEach(function (button) {
    button.addEventListener('click', function () { toggle(button, openWeek); });
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var layer = chip.getAttribute('data-layer');
      var wasOn = chip.getAttribute('aria-pressed') === 'true';
      if (wasOn) {
        resetSelection();
        return;
      }
      closePanels();
      clearLayer();
      chip.setAttribute('aria-pressed', 'true');
      legend.setAttribute('data-on', '');
      sheet.setAttribute('data-layer', layer);
      activeControl = chip;
      setState('Selected layer', LAYER[layer].title, LAYER[layer].basis, true);
    });
  });

  clear.addEventListener('click', function () {
    var control = activeControl;
    resetSelection();
    if (control) control.focus({ preventScroll: true });
  });

  sec.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape' || !activeControl) return;
    var control = activeControl;
    resetSelection();
    control.focus({ preventScroll: true });
  });

  var first = sheet.querySelector('.pl-ev.ad');
  if (first) openBlock(first);
})();
