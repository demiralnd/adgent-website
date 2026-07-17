/* Adgent marketing site — interactions
   reveal-on-scroll · counters · hero chat build · marquee · nav · lead form
   All motion respects prefers-reduced-motion. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---- auto-stagger: mark children of [data-stagger] as reveal targets ---- */
  d.querySelectorAll('[data-stagger]').forEach(function (p) {
    Array.prototype.forEach.call(p.children, function (c, i) {
      if (!c.hasAttribute('data-reveal')) c.setAttribute('data-reveal', '');
      c.style.setProperty('--rd', (i * 80) + 'ms');
    });
  });

  /* ---- reveal on scroll ---- */
  var revealEls = d.querySelectorAll('[data-reveal]');
  if (hasIO && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- count-up numbers ---- */
  function fmt(v, dec) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function count(el) {
    var target = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10),
        pre = el.dataset.prefix || '', suf = el.dataset.suffix || '', dur = 1500, st = null;
    if (reduce) { el.textContent = pre + fmt(target, dec) + suf; return; }
    function tick(now) {
      st = st || now;
      var p = Math.min(1, (now - st) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(target * e, dec) + suf;
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = pre + fmt(target, dec) + suf;
    }
    requestAnimationFrame(tick);
  }
  var counters = d.querySelectorAll('[data-count]');
  if (hasIO && !reduce) {
    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { count(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(count);
  }

  /* ---- hero chat build-in ---- */
  (function () {
    var c = d.querySelector('[data-hero-chat]'); if (!c) return;
    var user = c.querySelector('[data-user]'),
        typing = c.querySelector('[data-typing]'),
        bot = c.querySelector('[data-bot]'),
        input = c.querySelector('[data-input]');
    function show(el) { if (el) el.classList.add('show'); }
    if (reduce) { [user, bot, input].forEach(show); if (typing) typing.style.display = 'none'; return; }
    setTimeout(function () { show(user); }, 350);
    setTimeout(function () { show(typing); }, 850);
    setTimeout(function () { if (typing) typing.style.display = 'none'; show(bot); }, 2000);
    setTimeout(function () { show(input); }, 2400);
  })();

  /* ---- marquee: duplicate row content for a seamless -50% loop ---- */
  d.querySelectorAll('.marquee-row').forEach(function (r) {
    if (!reduce) r.innerHTML = r.innerHTML + r.innerHTML;
  });

  /* ---- nav shadow on scroll ---- */
  var nav = d.querySelector('.nav');
  if (nav) {
    var onScroll = function () { nav.classList.toggle('scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- lead / subscribe form ---- */
  ['leadForm', 'subForm'].forEach(function (id) {
    var form = d.getElementById(id);
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var card = d.getElementById('leadCard');
      if (card) card.classList.add('sent');
    });
  });

  /* ---- builds slider: scroll-snap track + dots + arrows ---- */
  (function () {
    var track = d.querySelector('[data-builds-track]');
    if (!track) return;
    var dotsWrap = d.querySelector('[data-builds-dots]');
    var prev = d.querySelector('[data-builds-prev]');
    var next = d.querySelector('[data-builds-next]');
    var cards = Array.prototype.slice.call(track.children);
    if (!cards.length) return;

    // how many cards fit per view (1 on mobile, 2 on desktop) → page count
    function perView() { return track.clientWidth < cards[0].offsetWidth * 1.5 ? 1 : 2; }
    function pageCount() { return Math.max(1, Math.ceil(cards.length / perView())); }

    // build dots
    var dots = [];
    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      dots = [];
      for (var i = 0; i < pageCount(); i++) {
        var b = d.createElement('button');
        b.className = 'builds-dot' + (i === 0 ? ' on' : '');
        b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
        (function (idx) { b.addEventListener('click', function () { goTo(idx); }); })(i);
        dotsWrap.appendChild(b);
        dots.push(b);
      }
    }
    function pageWidth() { return track.clientWidth + 18; } // view + gap
    function current() { return Math.round(track.scrollLeft / pageWidth()); }
    function goTo(i) {
      i = Math.max(0, Math.min(pageCount() - 1, i));
      track.scrollTo({ left: i * pageWidth(), behavior: reduce ? 'auto' : 'smooth' });
    }
    function sync() {
      var cur = current();
      dots.forEach(function (dt, i) { dt.classList.toggle('on', i === cur); });
      if (prev) prev.disabled = cur <= 0;
      if (next) next.disabled = cur >= pageCount() - 1;
    }

    if (prev) prev.addEventListener('click', function () { goTo(current() - 1); });
    if (next) next.addEventListener('click', function () { goTo(current() + 1); });
    var ticking = false;
    track.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { sync(); ticking = false; });
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { buildDots(); sync(); }, 150);
    });
    buildDots();
    sync();
  })();
})();
