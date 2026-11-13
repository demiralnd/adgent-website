/* Decisions (/daily-verdict): class tabs on the board, and the ranking replayed once.
   The list ships in ranked order; with motion allowed, rows start at the order the
   specialists found them in and settle into money order when the board comes into view. */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var board = d.getElementById('board');
  if (!board) return;

  /* ---- tabs: click, arrows, Home/End (roving tabindex) ---- */
  var tabs = Array.prototype.slice.call(board.querySelectorAll('[role=tab]'));
  function select(t, focus) {
    tabs.forEach(function (o) {
      var on = o === t;
      o.setAttribute('aria-selected', String(on));
      o.tabIndex = on ? 0 : -1;
      d.getElementById(o.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) { t.focus(); t.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: still ? 'auto' : 'smooth' }); }
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      select(tabs[(n + tabs.length) % tabs.length], true);
    });
  });

  /* ---- the replayed ranking ---- */
  var list = board.querySelector('[data-rank]');
  if (!list || still || !('IntersectionObserver' in window)) return;
  var label = board.querySelector('.dv-sort');
  var rows = Array.prototype.slice.call(list.children);
  var tops = rows.map(function (r) { return r.offsetTop; });
  rows.forEach(function (r, i) {
    var o = +r.getAttribute('data-o');
    r.style.transform = 'translateY(' + (tops[o] - tops[i]) + 'px)';
    r.style.setProperty('--i', i);
    var bar = r.querySelector('.dv-bar i'); if (bar) bar.style.width = '0';
  });
  if (label) label.textContent = 'In the order the specialists found them';
  var io = new IntersectionObserver(function (es) {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    setTimeout(function () {
      list.classList.add('is-replay');
      rows.forEach(function (r) {
        r.style.transform = '';
        var bar = r.querySelector('.dv-bar i'); if (bar) bar.style.width = '';
      });
      if (label) label.textContent = 'Ranked by money';
    }, 700);
  }, { threshold: 0.45 });
  io.observe(list);
})();
