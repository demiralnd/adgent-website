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

  /* ---- mobile menu toggle ---- */
  var burger = d.querySelector('.nav-burger');
  if (burger && nav) {
    var closeMenu = function () {
      nav.classList.remove('menu-open');
      d.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('menu-open');
      d.body.classList.toggle('menu-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    /* close when a menu link is tapped, or on resize back to desktop */
    var mm = d.querySelector('.mobile-menu');
    if (mm) mm.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
    /* must match the CSS breakpoint that shows .nav-burger, or the drawer
       closes itself at widths where it's still the only nav */
    window.addEventListener('resize', function () { if (window.innerWidth > 920) closeMenu(); });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---- product dropdown ----
     CSS handles hover and focus-within. This covers touch, where hover would
     otherwise make the first tap follow the link instead of opening the menu. */
  var drop = d.querySelector('.nav-drop');
  if (drop && window.matchMedia('(hover: none)').matches) {
    var trigger = drop.querySelector('.nav-drop-t');
    trigger.addEventListener('click', function (e) {
      if (drop.classList.contains('open')) return;   /* second tap follows the link */
      e.preventDefault();
      drop.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
    });
    d.addEventListener('click', function (e) {
      if (!drop.contains(e.target)) {
        drop.classList.remove('open');
        trigger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- lead / subscribe form (Web3Forms) ----
     Progressive enhancement: posts via fetch and shows an inline thank-you.
     If JS is off or fetch fails, the plain <form> POST still reaches Web3Forms.
     Optional Cloudflare Turnstile: drop <div class="cf-turnstile" data-sitekey="…"></div>
     inside the form and include Turnstile's script; Web3Forms validates the token. */
  ['leadForm', 'subForm'].forEach(function (id) {
    var form = d.getElementById(id);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      // Guard: if the access key wasn't set yet, let the native POST surface the setup error.
      var key = form.querySelector('[name="access_key"]');
      if (!key || key.value.indexOf('WEB3FORMS_ACCESS_KEY') === 0) return;
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"]');
      var note = d.getElementById('leadNote');
      var card = d.getElementById('leadCard');
      if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = 'Sending…'; }
      fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok && j.success, j: j }; }); })
        .then(function (res) {
          if (res.ok) {
            if (card) card.classList.add('sent');
            form.reset();
            if (note) note.textContent = 'Thanks — we\'ll be in touch within a couple of working days.';
          } else {
            throw new Error((res.j && res.j.message) || 'error');
          }
        })
        .catch(function () {
          if (note) note.textContent = 'Something went wrong. Please email osman@adgent.app directly.';
          if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label || 'Request a demo'; }
        });
    });
  });

  /* ---- article reading progress bar ---- */
  (function () {
    var art = d.querySelector('.article');
    if (!art) return;
    var bar = d.createElement('div');
    bar.className = 'readbar';
    bar.innerHTML = '<i></i>';
    d.body.appendChild(bar);
    var fill = bar.firstChild;
    var ticking = false;
    function update() {
      // progress across the article body only — not the nav or the footer,
      // so the bar hits 100% when the reading actually ends
      var r = art.getBoundingClientRect();
      var total = r.height - window.innerHeight;
      var p = total > 0 ? (-r.top) / total : 1;
      fill.style.transform = 'scaleX(' + Math.max(0, Math.min(1, p)) + ')';
    }
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ---- blog listing: topic filter ---- */
  (function () {
    var topics = Array.prototype.slice.call(d.querySelectorAll('.topics .topic'));
    var cards = Array.prototype.slice.call(d.querySelectorAll('.grid-posts .pcard'));
    if (!topics.length || !cards.length) return;
    topics.forEach(function (t) {
      t.addEventListener('click', function (e) {
        e.preventDefault();
        var want = t.textContent.trim().toLowerCase();
        topics.forEach(function (o) { o.classList.toggle('on', o === t); });
        cards.forEach(function (c) {
          var tag = c.querySelector('.post-tag');
          var show = want === 'all' || (tag && tag.textContent.trim().toLowerCase() === want);
          c.classList.toggle('hide', !show);
        });
      });
    });
  })();

  /* ---- the stack: isometric layers ↔ text column ---- */
  (function () {
    var wrap = d.querySelector('[data-stack]');
    if (!wrap) return;
    var plates = Array.prototype.slice.call(wrap.querySelectorAll('.s3-plate'));
    var rows = Array.prototype.slice.call(wrap.querySelectorAll('[data-stack-list] li'));
    if (!plates.length || !rows.length) return;

    var DEFAULT = 4; // Judgment — the layer the section is arguing for
    var plateGuard = null;
    var SPREAD = 14; // px of extra Z given to plates on either side of the active one
    var cur = -1;
    var deck = wrap.querySelector('[data-stack-deck]');
    function select(i) {
      if (i === cur) return;
      cur = i;
      if (deck) deck.classList.add('focused');
      plates.forEach(function (p) {
        var pi = +p.dataset.i;
        p.classList.toggle('on', pi === i);
        // above the active plate → push up, below → push down, so the active
        // layer gains air on both sides. Set as a length (not a multiplier)
        // so the registered --off property can interpolate it smoothly.
        var off = pi > i ? SPREAD : pi < i ? -SPREAD : 0;
        p.style.setProperty('--off', off + 'px');
      });
      rows.forEach(function (r) { r.classList.toggle('on', +r.dataset.i === i); });
      if (plateGuard) plateGuard();
    }

    rows.forEach(function (r) {
      var i = +r.dataset.i;
      r.addEventListener('mouseenter', function () { stop(); select(i); });
      r.addEventListener('focus', function () { stop(); select(i); });
      r.addEventListener('click', function () { stop(); select(i); });
    });
    // Plates move when selected, so a naive mouseenter loops: the plate slides
    // out from under the pointer and re-triggers a neighbour. Guard it — ignore
    // a hover that lands within a moment of the last selection, which is when
    // plates are still travelling.
    var lastSel = 0;
    plates.forEach(function (p) {
      var i = +p.dataset.i;
      p.addEventListener('mouseenter', function () {
        if (Date.now() - lastSel < 450) return;   // still animating; ignore
        stop(); select(i);
      });
      p.addEventListener('click', function () { stop(); select(i); });
    });
    plateGuard = function () { lastSel = Date.now(); };

    // gentle autoplay so the stack shows it's interactive; first hover kills it
    var timer = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      if (reduce || timer) return;
      timer = setInterval(function () { select((cur + 1) % plates.length); }, 2600);
    }

    // Reserve the tallest row's height once, so opening any row can never
    // change the column height and reflow the grid.
    function lockHeight() {
      var list = wrap.querySelector('[data-stack-list]');
      if (!list) return;
      var prev = list.style.minHeight;
      list.style.minHeight = '';
      // measure with the collapse transition off, or we capture mid-flight
      list.style.transition = 'none';
      // total = every row closed, plus the largest single expansion
      var closed = 0, grow = 0;
      rows.forEach(function (r) { closed += r.getBoundingClientRect().height; });
      closed += 6 * (rows.length - 1);   // flex gap
      rows.forEach(function (r) {
        var body = r.querySelector('.s3-li-body > div');
        if (body) grow = Math.max(grow, body.scrollHeight);
      });
      var max = closed + grow;
      list.style.transition = '';
      list.style.minHeight = max ? Math.ceil(max) + 'px' : prev;
    }
    // fonts change line counts, so lock after they resolve
    if (d.fonts && d.fonts.ready) { d.fonts.ready.then(lockHeight); } else { lockHeight(); }
    window.addEventListener('resize', function () { clearTimeout(lockT); lockT = setTimeout(lockHeight, 200); });
    var lockT;

    select(DEFAULT);
    if (hasIO && !reduce) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { play(); } else { stop(); } });
      }, { threshold: 0.35 }).observe(wrap);
    }
  })();

  /* ---- the math: spend slider → recoverable leak ---- */
  (function () {
    var input = d.querySelector('[data-math-spend]');
    if (!input) return;
    var out = d.querySelector('[data-math-spend-out]');
    // shares must total the 9.5% quoted in the section footnote
    var SHARES = [
      ['[data-math-leak]', 0.045],
      ['[data-math-fatigue]', 0.030],
      ['[data-math-overlap]', 0.020]
    ];
    var total = d.querySelector('[data-math-total]');
    var fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

    function render() {
      var spend = +input.value;
      if (out) out.innerHTML = '₺' + fmt.format(spend) + '<span>/mo</span>';
      var sum = 0;
      SHARES.forEach(function (s) {
        var el = d.querySelector(s[0]);
        var v = Math.round(spend * s[1]);
        sum += v;
        if (el) el.textContent = '₺' + fmt.format(v);
      });
      if (total) total.textContent = '₺' + fmt.format(sum);
    }
    input.addEventListener('input', render);
    render();
  })();

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
      if (pin) {
        // pinned mode: scroll the page, the pin handler moves the track
        var s = pinStart();
        window.scrollTo({ top: s + (i / Math.max(1, pageCount() - 1)) * spacer.offsetHeight, behavior: reduce ? 'auto' : 'smooth' });
      } else {
        track.scrollTo({ left: i * pageWidth(), behavior: reduce ? 'auto' : 'smooth' });
      }
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
      requestAnimationFrame(function () { sync(); depth(); ticking = false; });
    });
    var rt;
    window.addEventListener('resize', function () {
      clearTimeout(rt); rt = setTimeout(function () { layout(); buildDots(); sync(); }, 150);
    });
    /* --- pinned scroll: vertical page scroll drives the track sideways --- */
    var pinSection = d.querySelector('[data-builds-pin]');
    var spacer = d.querySelector('[data-builds-spacer]');
    var sticky = pinSection && pinSection.querySelector('.builds-sticky');
    // needs a real overflow to be worth pinning; skip on touch/reduced-motion
    // (there a native swipe is better than hijacking the page scroll)
    var coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    var pin = !!(pinSection && spacer && sticky) && !reduce && !coarse;

    function overflow() { return track.scrollWidth - track.clientWidth; }
    // rect-based, so a positioned ancestor can't throw the offset off
    function pinStart() { return pinSection.getBoundingClientRect().top + window.pageYOffset; }

    // page scroll per pixel of track travel. >1 slows the cards down so each
    // one gets read; at 1:1 four cards flick past in about one screen.
    var PIN_PACE = 1.15;

    function layout() {
      if (!pin) { if (spacer) spacer.style.height = '0px'; return; }
      spacer.style.height = Math.max(0, overflow() * PIN_PACE) + 'px';
    }

    function depth() {
      // --p = how far this card is from the centre of the viewport, 0..1
      var mid = track.clientWidth / 2;
      cards.forEach(function (c) {
        var d = Math.abs((c.offsetLeft - track.scrollLeft + c.offsetWidth / 2) - mid);
        c.style.setProperty('--p', Math.min(1, d / (track.clientWidth * 0.75)).toFixed(3));
      });
    }

    function onPinScroll() {
      if (!pin) return;
      var range = spacer.offsetHeight;
      if (range <= 0) return;
      var p = (window.pageYOffset - pinStart()) / range;
      track.scrollLeft = Math.max(0, Math.min(1, p)) * overflow();
      depth();
    }

    if (pin) {
      // scroll-snap fights the programmatic scrollLeft — drop it while pinned
      track.style.scrollSnapType = 'none';
      track.style.scrollBehavior = 'auto';
      track.style.overflowX = 'hidden';
      window.addEventListener('scroll', function () {
        if (ticking) return; ticking = true;
        requestAnimationFrame(function () { onPinScroll(); sync(); ticking = false; });
      }, { passive: true });
      layout();
      onPinScroll();
      depth();
    }

    buildDots();
    sync();
    depth();
  })();
})();
