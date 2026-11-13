/* AI stage · behaviour for every [data-ai-stage] on the page (markup + styles: /css/ai-stage.css).
   On first view, and on a collection-day switch, the answers compose word by word, the brands
   light up as they are named, then the levels land. Reduced motion: everything is shown at once. */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STEP = 24, COL = 420, LAND = 110;
  var each = function (list, fn) { Array.prototype.forEach.call(list, fn); };

  /* wrap every word of an answer in a span; brands keep their <mark> */
  function wrapWords(p) {
    var walker = d.createTreeWalker(p, NodeFilter.SHOW_TEXT, null), nodes = [], n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(function (t) {
      var frag = d.createDocumentFragment();
      t.nodeValue.split(/(\s+)/).forEach(function (s) {
        if (!s) return;
        if (/^\s+$/.test(s)) { frag.appendChild(d.createTextNode(s)); return; }
        var w = d.createElement('span'); w.className = 'ais-w'; w.textContent = s; frag.appendChild(w);
      });
      t.parentNode.replaceChild(frag, t);
    });
  }

  /* set the delay (--t, in ms) on every word, brand, card and level row of one collection day */
  function time(set) {
    each(set.querySelectorAll('.ais-ans'), function (col, s) {
      var start = s * COL, end = start;
      each(col.querySelectorAll('.ais-txt p'), function (p) {
        var ws = p.querySelectorAll('.ais-w');
        each(ws, function (w, i) { w.style.setProperty('--t', start + i * STEP); });
        each(p.querySelectorAll('mark'), function (m) {
          var i = Array.prototype.indexOf.call(ws, m.querySelector('.ais-w'));
          m.style.setProperty('--t', start + Math.max(i, 0) * STEP + 260);
        });
        end = Math.max(end, start + ws.length * STEP + 240);
      });
      each(col.querySelectorAll('.ais-card'), function (c, j) { c.style.setProperty('--t', end + j * LAND); });
      each(col.querySelectorAll('.ais-lvls li'), function (li, j) { li.style.setProperty('--t', end + 200 + j * LAND); });
    });
  }

  function compose(set) {
    if (still) return;
    set.classList.add('pre');
    void set.offsetWidth;
    requestAnimationFrame(function () { requestAnimationFrame(function () { set.classList.remove('pre'); }); });
  }

  function init(stage) {
    var sets = Array.prototype.slice.call(stage.querySelectorAll('.ais-cols'));
    if (!sets.length) return;

    if (!still) {
      each(stage.querySelectorAll('.ais-txt p'), wrapWords);
      sets.forEach(time);
    }

    /* first view: compose the visible day once the stage is on screen */
    var first = sets.filter(function (s) { return !s.hidden; })[0] || sets[0];
    if (still || !('IntersectionObserver' in window)) {
      stage.classList.remove('is-wait');
    } else {
      first.classList.add('pre');
      stage.classList.remove('is-wait');
      var io = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { io.disconnect(); compose(first); }
      }, { threshold: 0.2 });
      io.observe(stage);
    }

    /* collection-day switch: the other day's answers compose in */
    var dayBtns = stage.querySelectorAll('button[data-day]');
    each(dayBtns, function (b) {
      b.addEventListener('click', function () {
        var day = b.getAttribute('data-day');
        if (stage.getAttribute('data-day') === day) return;
        stage.setAttribute('data-day', day);
        each(dayBtns, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        sets.forEach(function (s) {
          var on = s.getAttribute('data-set') === day;
          s.hidden = !on;
          if (on) compose(s);
        });
      });
    });
  }

  each(d.querySelectorAll('[data-ai-stage]'), init);
})();
