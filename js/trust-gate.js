/* Trust Gate (/trust-gate): the example switch on the gate.
   Two example windows; the gate lights the label, the wires draw, the outcome changes.
   Content is complete without JS (the clean week shows); motion is skipped when reduced. */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gate = d.querySelector('.tg-gate');
  var sw = d.querySelector('.tg-sw');
  if (!gate || !sw) return;
  var btns = Array.prototype.slice.call(sw.querySelectorAll('button'));

  function draw() {
    if (still) { gate.classList.add('is-on'); return; }
    gate.classList.remove('is-on');
    void gate.offsetWidth;
    gate.classList.add('is-on');
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.getAttribute('data-s');
      if (gate.getAttribute('data-state') === s) return;
      btns.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      gate.setAttribute('data-state', s);
      draw();
    });
  });

  if (still || !('IntersectionObserver' in window)) { gate.classList.add('is-on'); return; }
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect(); draw();
  }, { threshold: 0.4 });
  io.observe(gate);
})();
