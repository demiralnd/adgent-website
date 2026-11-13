/* Account memory (/account-memory): pick a memory, see where it came back.
   The items in the dark block are plain anchors to the three threads; with JS they become
   WAI-ARIA tabs (click, arrows, Home/End) and only the chosen thread shows. The one scripted
   moment: when the stage first scrolls into view, the "fresh session" half of the thread
   arrives after the rest. Local state only; nothing is sent anywhere. */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var st = d.querySelector('[data-am]');
  if (!st) return;
  var list = st.querySelector('.am-list');
  var tabs = Array.prototype.slice.call(st.querySelectorAll('.am-mi'));
  var panels = tabs.map(function (t) { return d.getElementById(t.getAttribute('href').slice(1)); });
  var hint = st.querySelector('.am-hint');
  if (!list || tabs.length !== panels.length || panels.some(function (p) { return !p; })) return;
  var hashPanel = panels.indexOf(d.getElementById(location.hash.slice(1)));
  var cur = hashPanel > -1 ? hashPanel : 0;

  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-orientation', 'vertical');
  function select(i, focus) {
    var sw = i !== cur;
    cur = i;
    tabs.forEach(function (t, j) {
      var on = j === i;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[j].classList.toggle('on', on);
      panels[j].classList.remove('is-sw');
      panels[j].setAttribute('aria-hidden', String(!on));
      Array.prototype.forEach.call(panels[j].querySelectorAll('button'), function (b) { if (on) b.removeAttribute('tabindex'); else b.setAttribute('tabindex', '-1'); });
    });
    if (hint) hint.textContent = 'Showing item ' + (i + 1) + ' of ' + tabs.length + '. Use arrow keys to inspect another.';
    if (sw && !still) { void panels[i].offsetWidth; panels[i].classList.add('is-sw'); }
    if (focus) tabs[i].focus();
  }
  tabs.forEach(function (t, i) {
    t.setAttribute('role', 'tab');
    t.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', t.id);
    panels[i].tabIndex = 0;
    t.addEventListener('click', function (e) { e.preventDefault(); select(i, false); });
    t.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        select(i, false);
        return;
      }
      var n = tabs.length, k = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: n - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      select((k + n) % n, true);
    });
  });
  select(cur, false);
  /* the one scripted moment: the fresh-session half arrives once, on first view.
     Reduced motion, or no observer: shown at once. */
  if (!still && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      st.classList.add('is-first', 'is-played');
    }, { threshold: 0.3 });
    io.observe(st);
  } else {
    st.classList.add('is-played');
  }
})();
