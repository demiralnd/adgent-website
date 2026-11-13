/* Ground truth (/ground-truth): pick a source, see what it answers.
   The sources on the dark field are tabs; the white block shows the picked one. The first is
   selected in the markup. Once, when the desk is in view and motion is allowed, the selection
   advances to the second source after 2.5 s so a first-time visitor sees the items switch the
   panel; any click, key or touch before that cancels it. Hovering a sentence in an answer
   points at the source it came from. With script off every panel stays on the page. */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var desk = d.getElementById('desk');
  if (!desk) return;
  var tablist = desk.querySelector('[role=tablist]');
  var tabs = Array.prototype.slice.call(desk.querySelectorAll('[role=tab]'));
  var panels = tabs.map(function (t) { return d.getElementById(t.getAttribute('aria-controls')); });
  var directoryLinks = Array.prototype.slice.call(d.querySelectorAll('[data-open-src]'));
  var marks = Array.prototype.slice.call(desk.querySelectorAll('.gt-room [data-src], .gt-tab[data-src]'));
  var byKey = {};
  marks.forEach(function (n) { byKey[n.getAttribute('data-src')] = n; });

  var compactTabs = matchMedia('(max-width: 1100px)');
  function updateOrientation() {
    tablist.setAttribute('aria-orientation', compactTabs.matches ? 'horizontal' : 'vertical');
  }
  updateOrientation();
  if (compactTabs.addEventListener) compactTabs.addEventListener('change', updateOrientation);
  else addEventListener('resize', updateOrientation, { passive: true });

  function select(t, focus) {
    var key = t.getAttribute('data-src');
    tabs.forEach(function (o, i) {
      var on = o === t;
      o.setAttribute('aria-selected', String(on));
      o.tabIndex = on ? 0 : -1;
      o.querySelector('.gt-tab-cue').textContent = on ? 'Viewing' : 'Open';
      panels[i].hidden = !on;
      panels[i].classList.toggle('is-on', on);
      panels[i].classList.remove('is-in');
    });
    directoryLinks.forEach(function (link) {
      var on = link.getAttribute('data-open-src') === key;
      link.classList.toggle('is-current', on);
      if (on) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
      var action = link.querySelector('.gt-conn-action');
      if (action) action.firstChild.nodeValue = on ? 'In desk' : 'See answer';
    });
    var p = panels[tabs.indexOf(t)];
    if (!still) { void p.offsetWidth; p.classList.add('is-in'); }
    /* The phone row scrolls sideways: keep the picked tab in view without moving the page. */
    var list = t.parentNode;
    if (list.scrollWidth > list.clientWidth + 1) {
      var left = t.offsetLeft - 16;
      if (left < list.scrollLeft || t.offsetLeft + t.offsetWidth > list.scrollLeft + list.clientWidth) {
        list.scrollTo({ left: left, behavior: still ? 'auto' : 'smooth' });
      }
    }
    if (focus) t.focus({ preventScroll: true });
  }
  select(tabs[0], false);

  /* The one authored moment: advance once so the switch is seen, then leave it to the visitor. */
  var demo = null;
  function cancel() { if (demo) { clearTimeout(demo); demo = null; } }
  if (!still && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      if (!es[0].isIntersecting) return;
      io.disconnect();
      demo = setTimeout(function () {
        demo = null;
        if (tabs[0].getAttribute('aria-selected') === 'true') select(tabs[1], false);
      }, 2500);
    }, { threshold: 0.6 });
    io.observe(desk);
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) { desk.addEventListener(ev, cancel, { passive: true }); });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) {
      e.preventDefault();
      select(t, false);
    });
    t.addEventListener('keydown', function (e) {
      var n = { ArrowRight: i + 1, ArrowDown: i + 1, ArrowLeft: i - 1, ArrowUp: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (n === undefined) return;
      e.preventDefault();
      select(tabs[(n + tabs.length) % tabs.length], true);
    });
  });

  directoryLinks.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      var key = link.getAttribute('data-open-src');
      var target = tabs.filter(function (t) { return t.getAttribute('data-src') === key; })[0];
      if (!target) return;
      cancel();
      select(target, true);
      desk.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' });
    });
  });

  /* An evidence phrase points back to every source used for it. */
  desk.addEventListener('pointerover', function (e) {
    var c = e.target.closest('.gt-cite'); if (!c) return;
    c.classList.add('is-hot');
    c.getAttribute('data-src').split(' ').forEach(function (k) { if (byKey[k]) byKey[k].classList.add('is-hot'); });
  });
  desk.addEventListener('pointerout', function (e) {
    var c = e.target.closest('.gt-cite'); if (!c || c.contains(e.relatedTarget)) return;
    c.classList.remove('is-hot');
    marks.forEach(function (n) { n.classList.remove('is-hot'); });
  });
})();
