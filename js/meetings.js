/* /meetings · one reveal and one progressive enhancement.
   The meeting panel arrives in the order the conversation produced it. The before/during/after
   controls highlight an already-visible stage without moving the page. */
(function () {
  'use strict';

  var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var win = document.getElementById('mt-win');
  if (win && !still && 'IntersectionObserver' in window) {
    var onScreen = false;
    var syncWave = function () { win.classList.toggle('mt-visible', onScreen && !document.hidden); };
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        onScreen = entry.isIntersecting && entry.intersectionRatio >= .35;
        if (onScreen) win.classList.add('mt-play');
        syncWave();
      });
    }, { threshold: [0, 0.35] });
    io.observe(win);
    document.addEventListener('visibilitychange', syncWave);
  }

  var flow = document.querySelector('.mt-flow-s');
  if (!flow) return;
  var controls = Array.prototype.slice.call(flow.querySelectorAll('[data-mt-stage]'));
  var panels = Array.prototype.slice.call(flow.querySelectorAll('[data-mt-panel]'));
  if (!controls.length || !panels.length) return;
  flow.classList.add('mt-enhanced');

  function select(stage) {
    controls.forEach(function (control) {
      control.setAttribute('aria-pressed', String(control.getAttribute('data-mt-stage') === stage));
    });
    panels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.getAttribute('data-mt-panel') === stage);
    });
  }

  controls.forEach(function (control, index) {
    control.addEventListener('click', function () {
      select(control.getAttribute('data-mt-stage'));
    });
    control.addEventListener('keydown', function (event) {
      var next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % controls.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + controls.length - 1) % controls.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = controls.length - 1;
      else return;
      event.preventDefault();
      controls[next].focus();
      select(controls[next].getAttribute('data-mt-stage'));
    });
  });
})();
