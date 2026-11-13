/* /specialists: the ten sit in one horizontal strip that sticks under the nav. Scrolling the card
   walks the strip (the pill slides to the specialist being read and the strip scrolls it into
   view); clicking or arrow-keying a tab scrolls to that specialist's band. Evidence grows once as
   each band arrives, never under reduced motion. Without JS the strip is plain anchor links and
   the ten read in sequence. */
(function () {
  var card = document.getElementById('sp-card');
  var rail = document.getElementById('sp-rail');
  if (!card || !rail) return;
  var strip = rail.querySelector('.sp-strip'), tw = rail.querySelector('.sp-tw'), ind = rail.querySelector('.sp-ind');
  var meta = rail.querySelector('.sp-rail-meta span');
  var tabs = Array.prototype.slice.call(rail.querySelectorAll('.sp-tab'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('href').slice(1)); });
  if (!strip || !tw || !ind || !tabs.length || panels.some(function (p) { return !p; })) return;

  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var top = document.getElementById('top');
  var cur = -1, raf = 0;

  if (!still) card.classList.add('sp-anim');
  panels.forEach(function (p) { p.setAttribute('tabindex', '-1'); });

  function navh() { return top ? top.offsetHeight : 64; }
  function railh() { return rail.offsetHeight; }
  function measure() { card.style.setProperty('--sp-rail', railh() + 'px'); }

  /* the pill is a clip window over a sheet the size of the strip, so it slides and resizes on
     clip-path alone: no layout animation, and the round ends never stretch */
  function place() {
    var t = tabs[cur];
    if (!t) return;
    var W = tw.offsetWidth, H = tw.offsetHeight;
    ind.style.width = W + 'px';
    ind.style.height = H + 'px';
    var x = t.offsetLeft, y = t.offsetTop;
    ind.style.clipPath = 'inset(' + y + 'px ' + (W - x - t.offsetWidth) + 'px ' + (H - y - t.offsetHeight) + 'px ' + x + 'px round 999px)';
  }

  /* fade only the edge that has more strip past it */
  function fades() {
    var max = strip.scrollWidth - strip.clientWidth;
    strip.style.setProperty('--sp-fl', strip.scrollLeft > 2 ? '28px' : '0px');
    strip.style.setProperty('--sp-fr', max - strip.scrollLeft > 2 ? '28px' : '0px');
  }

  function show(t) {
    var l = t.offsetLeft - strip.scrollLeft, w = strip.clientWidth;
    if (l < 24 || l + t.offsetWidth > w - 24) {
      strip.scrollTo({ left: Math.max(0, t.offsetLeft - (w - t.offsetWidth) / 2), behavior: still ? 'auto' : 'smooth' });
    }
  }

  function set(i) {
    if (i === cur) return;
    cur = i;
    tabs.forEach(function (t, k) { t.setAttribute('aria-current', String(k === i)); });
    place();
    show(tabs[i]);
    if (meta) meta.innerHTML = '<b>' + (i + 1) + '</b> of ' + tabs.length;
  }

  /* which band is being read: the last one whose top has crossed a line a third of the way down */
  function spy() {
    var line = navh() + railh() + innerHeight * 0.3, i = 0;
    panels.forEach(function (p, k) { if (p.getBoundingClientRect().top <= line) i = k; });
    var last = panels[panels.length - 1].getBoundingClientRect();
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4 && last.bottom < innerHeight) i = panels.length - 1;
    set(i);
    rail.classList.toggle('stuck', rail.getBoundingClientRect().top <= navh() + 1);
  }

  function go(i, focusPanel) {
    var p = panels[i];
    scrollTo({ top: scrollY + p.getBoundingClientRect().top - navh() - railh() + 1, behavior: still ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', '#' + p.id);
    if (focusPanel) p.focus({ preventScroll: true });
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function (e) { e.preventDefault(); go(i); });
    t.addEventListener('keydown', function (e) {
      var n = tabs.length, k = -1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') k = (i + 1) % n;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') k = (i - 1 + n) % n;
      else if (e.key === 'Home') k = 0;
      else if (e.key === 'End') k = n - 1;
      if (k < 0) return;
      e.preventDefault();
      tabs[k].focus({ preventScroll: true });
      go(k);
    });
  });

  /* queue rows and "works beside" links open their specialist the same way */
  card.querySelectorAll('a[href^="#"]:not(.sp-tab)').forEach(function (a) {
    var i = panels.findIndex(function (p) { return '#' + p.id === a.getAttribute('href'); });
    if (i < 0) return;
    a.addEventListener('click', function (e) { e.preventDefault(); go(i, true); });
  });

  /* evidence grows once, when its band arrives */
  if (!still && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('grow'); io.unobserve(e.target);
      });
    }, { threshold: 0.3 });
    panels.forEach(function (p) { io.observe(p); });
  } else {
    panels.forEach(function (p) { p.classList.add('grow'); });
  }

  measure(); spy(); fades();
  requestAnimationFrame(function () { tw.classList.add('ready'); });
  addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(function () { raf = 0; spy(); }); }, { passive: true });
  strip.addEventListener('scroll', fades, { passive: true });
  addEventListener('resize', function () { measure(); place(); spy(); fades(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { place(); fades(); });
})();
