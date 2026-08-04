/* Adgent marketing site — interactions
   reveal-on-scroll · counters · hero chat build · marquee · nav · lead form
   All motion respects prefers-reduced-motion. */
(function () {
  var d = document, root = d.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---- parallax atmosphere + sticky-nav scrim ----
     Three drifting gradient layers behind everything, driven by one --sy
     custom property so the whole background moves on a single rAF tick. */
  (function () {
    var nav = d.querySelector('.nav');
    var para = null;
    if (!d.querySelector('.para')) {
      para = d.createElement('div');
      para.className = 'para';
      para.setAttribute('aria-hidden', 'true');
      ['pgrid', 'p1', 'p2', 'p3'].forEach(function (cls) {
        var l = d.createElement('i');
        l.className = cls;
        para.appendChild(l);
      });
      d.body.insertBefore(para, d.body.firstChild);
    }
    if (!para) para = d.querySelector('.para');
    var t = false, stuck = null;
    function upd() {
      var y = window.pageYOffset;
      /* --sy is written on the parallax host, not :root — a custom property on
         the document element invalidates the style of every node on the page
         each frame, which is what made scrolling feel heavy. */
      if (!reduce && para) para.style.setProperty('--sy', y + 'px');
      var st = y > 8;
      if (nav && st !== stuck) { nav.classList.toggle('stuck', st); stuck = st; }
    }

    window.addEventListener('scroll', function () {
      if (t) return; t = true;
      requestAnimationFrame(function () { upd(); t = false; });
    }, { passive: true });
    upd();
  })();

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
    // Anything already on screen at load reveals immediately. Without this a
    // wide-but-short element (the hero h1) can sit under the 0.12 threshold
    // and stay at opacity 0 forever — the page loads blank.
    requestAnimationFrame(function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
          el.classList.add('in'); io.unobserve(el);
        }
      });
    });
    // Last-resort unhide. Reveal styles set opacity:0, so anything the observer
    // never fires for would be invisible for good — content must not depend on
    // an animation callback arriving. Fires once, well after normal reveals.
    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add('in'); });
    }, 8000);
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
    var rows = Array.prototype.slice.call(wrap.querySelectorAll('[data-stack-list] li:not(.s3-div)'));
    if (!plates.length || !rows.length) return;

    var DEFAULT = 4; // Judgment — the layer the section is arguing for
    var plateGuard = null;
    var SPREAD = 14; // px of extra Z given to plates on either side of the active one
    var cur = -1;
    var deck = wrap.querySelector('[data-stack-deck]');
    var details = Array.prototype.slice.call(
      (wrap.parentNode || d).querySelectorAll('[data-stack-detail] .s3-d'));
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
      details.forEach(function (x) { x.classList.toggle('on', +x.dataset.i === i); });
      if (plateGuard) plateGuard();
    }

    rows.forEach(function (r) {
      var i = +r.dataset.i;
      r.addEventListener('mouseenter', function () { pause(); select(i); });
      r.addEventListener('focus', function () { pause(); select(i); });
      r.addEventListener('click', function () { pause(); select(i); });
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
        pause(); select(i);
      });
      p.addEventListener('click', function () { pause(); select(i); });
    });
    plateGuard = function () { lastSel = Date.now(); };

    // gentle autoplay so the stack shows it's interactive; first hover kills it
    var timer = null, resumeT = null;
    function stop() { if (timer) { clearInterval(timer); timer = null; } clearTimeout(resumeT); }
    // interaction pauses; it resumes so a passing visitor always sees motion
    function pause() { stop(); resumeT = setTimeout(play, 5000); }
    function play() {
      if (reduce || timer) return;
      timer = setInterval(function () { select((cur + 1) % plates.length); }, 2600);
    }

    select(DEFAULT);
    if (hasIO && !reduce) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { play(); } else { stop(); } });
      }, { threshold: 0.35 }).observe(wrap);
      var kick = function () {
        if (timer) { window.removeEventListener('scroll', kick); return; }
        var r = wrap.getBoundingClientRect();
        if (r.top < (window.innerHeight || 0) * 1.2 && r.bottom > 0) {
          play(); window.removeEventListener('scroll', kick);
        }
      };
      window.addEventListener('scroll', kick, { passive: true });
      setTimeout(kick, 1200);
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

  /* ---- report findings: click to expand one at a time ---- */
  (function () {
    var flags = d.querySelectorAll('.report-flags .rflag');
    if (!flags.length) return;
    Array.prototype.forEach.call(flags, function (f) {
      var t = f.querySelector('.rflag-t');
      if (t) { t.setAttribute('role', 'button'); t.setAttribute('tabindex', '0'); }
      function toggle() {
        var wasOpen = f.classList.contains('open');
        Array.prototype.forEach.call(flags, function (o) { o.classList.remove('open'); });
        if (!wasOpen) f.classList.add('open');
      }
      f.addEventListener('click', toggle);
      f.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });
  })();

  /* ---- FAQ: one open at a time ---- */
  (function () {
    var items = d.querySelectorAll('.faq details');
    if (items.length < 2) return;
    Array.prototype.forEach.call(items, function (el) {
      el.addEventListener('toggle', function () {
        if (!el.open) return;
        Array.prototype.forEach.call(items, function (o) { if (o !== el) o.open = false; });
      });
    });
  })();

  /* ---- hero live status feed ---- */
  (function () {
    var feed = d.querySelector('[data-hero-feed]');
    if (!feed || reduce) return;
    var lines = [
      'scanning <b>CBO_CORE_US</b> \u00b7 14,208 impressions',
      'reconciling Meta spend against <b>Shopify revenue</b>',
      'checking <b>PMAX_CATALOG_TR</b> feed health',
      'cross-checking <b>GA4</b> conversions \u00b7 2 mismatches'
    ];
    var i = 0;
    setInterval(function () {
      i = (i + 1) % lines.length;
      var el = d.createElement('span');
      el.className = 'hs-line swap';
      el.innerHTML = lines[i];
      feed.innerHTML = '';
      feed.appendChild(el);
    }, 3200);
  })();



  /* ---- SPINE: one straight story line down the page --------------------
     The old route was measured through individual elements, so any reflow
     left it pointing at empty space. This version is a single vertical
     rail in the left gutter: a static hairline, a progress fill that
     follows the read, a travelling head, and one node per chapter. Every
     section hangs off the same line, so the page reads as one story. */
  (function () {
    var host = d.querySelector('[data-spine]');
    if (!host) return;
    var railFill = host.querySelector('[data-spine-fill]');
    var headDot  = host.querySelector('[data-spine-head]');
    /* the silent-band / glyph cut-outs are a document-coordinate mask. Applying
       it to .spine itself also swallowed the travelling head (a composited
       layer inside an 11k-px masked box), so the rail layers live in their own
       full-height wrapper and only that wrapper gets masked. */
    var cut = d.createElement('div');
    cut.className = 'spine-cut';
    cut.setAttribute('aria-hidden', 'true');
    host.insertBefore(cut, host.firstChild);
    var rail = host.querySelector('.spine-rail');
    if (rail) cut.appendChild(rail);
    if (railFill) cut.appendChild(railFill);


    var chapters = [];
    Array.prototype.forEach.call(d.querySelectorAll('[data-chapter]'), function (sec, i) {
      var n = d.createElement('div');
      n.className = 'spine-node';
      n.setAttribute('data-i', String(i + 1));
      var num = d.createElement('span');
      num.className = 'spine-node-n';
      num.textContent = (i + 1) < 10 ? '0' + (i + 1) : String(i + 1);
      var lab = d.createElement('span');
      lab.className = 'spine-node-l';
      lab.textContent = sec.getAttribute('data-chapter') || '';
      var arm = d.createElement('i');
      arm.className = 'spine-arm';
      n.appendChild(arm); n.appendChild(num); n.appendChild(lab);
      // nodes carry their number + label outside the 2px rail box, and the
      // cut-out mask clips to that box — so they hang off the host, not the cut
      host.appendChild(n);

      // the seam draws the hand-over from the previous section into this one
      if (!sec.querySelector(':scope > .sec-seam')) {
        var seam = d.createElement('i');
        seam.className = 'sec-seam';
        seam.setAttribute('aria-hidden', 'true');
        var cs = window.getComputedStyle(sec);
        if (cs.position === 'static') sec.style.position = 'relative';
        seam.appendChild(d.createElement('i'));
        sec.insertBefore(seam, sec.firstChild);
        // a soft bloom behind the band's opening, fired once on entry
        var bloom = d.createElement('i');
        bloom.className = 'sec-bloom';
        bloom.setAttribute('aria-hidden', 'true');
        sec.insertBefore(bloom, sec.firstChild);
      }
      chapters.push({ sec: sec, el: n });
    });

    function docTop(el) {
      return el.getBoundingClientRect().top + window.pageYOffset;
    }

    var END = 0;
    /* metaphor glyphs (brain, eye) straddle the rail: shift each one sideways
       so its centre lands on the line and the rail runs behind it */
    var glyphs = Array.prototype.slice.call(d.querySelectorAll('.brainwrap, .metafig'));
    glyphs.forEach(function (g) { g.classList.add('mf-burstable'); });

    function placeGlyphs() {
      var railX = host.getBoundingClientRect().left + 1;
      var on = window.innerWidth > 1240 && railX > 60;
      glyphs.forEach(function (g) {
        if (!on) { g.style.removeProperty('--spine-x'); return; }
        var par = g.offsetParent || g.parentNode;
        if (par && window.getComputedStyle(par).position === 'static') par.style.position = 'relative';
        var pr = (g.offsetParent || d.body).getBoundingClientRect();
        var mark = g.querySelector('svg');
        var half = (mark ? mark.getBoundingClientRect().width : g.offsetWidth) / 2;
        var dx = railX - pr.left - g.offsetLeft - half;
        g.style.setProperty('--spine-x', Math.round(dx) + 'px');
      });
    }

    /* every scroll-reactive element's document offset is measured ONCE per
       layout, never per frame — reading geometry inside the scroll loop was
       what made the rail feel heavy. */
    var LIT = [
      ['[data-brain]', 20], ['.gt-line', 60], ['#leadForm .lf-field', 10],
      ['.tg-card', 120], ['.metafig', 40], ['.matrix .mx-us', 30], ['.band-sub', 260]
    ];
    var litItems = [], bandItems = [], darkZones = [], wasDark = null, hideZones = [], wasHidden = false;
    function measure() {
      litItems = [];
      LIT.forEach(function (pair) {
        Array.prototype.forEach.call(d.querySelectorAll(pair[0]), function (el) {
          litItems.push({ el: el, y: docTop(el), pad: pair[1], on: null });
        });
      });
      bandItems = [];
      Array.prototype.forEach.call(d.querySelectorAll('.band, .moat, .hero'), function (sec) {
        bandItems.push({ el: sec, y: docTop(sec), on: null });
      });
      /* dark stages (Memory / golden rules): the head's ring has to switch to
         the dark backdrop there, otherwise it reads as a white disc */
      darkZones = [];
      Array.prototype.forEach.call(d.querySelectorAll('.moat'), function (sec) {
        var top = docTop(sec);
        darkZones.push([top, top + sec.offsetHeight]);
      });
      /* silent gaps: sections where the rail and head should vanish so the
         reader gets a clean break — the marquee band is pure atmosphere */
      hideZones = [];
      Array.prototype.forEach.call(d.querySelectorAll('.marquee-band'), function (sec) {
        var top = docTop(sec);
        hideZones.push([top, top + sec.offsetHeight]);
      });
      /* cut the rail out of those bands with a feathered mask in document
         coordinates, so the drawn line never re-appears over the marquee once
         the head has travelled below it. The same mask carries a tight cut-out
         for every glyph sitting on the rail (eye / brain / question mark), so
         the line disappears inside the mark instead of striping through it. */
      var gaps = [];
      for (var g0 = 0; g0 < hideZones.length; g0++) {
        gaps.push([hideZones[g0][0], hideZones[g0][1], 200]);
      }
      glyphs.forEach(function (gl) {
        if (!gl.style.getPropertyValue('--spine-x')) return; // not on the rail
        var mark = gl.querySelector('svg') || gl;
        var r = mark.getBoundingClientRect();
        if (!r.height) return;
        var top = r.top + window.pageYOffset;
        gaps.push([top + 5, top + r.height - 5, 7]);
      });
      gaps.sort(function (a, b) { return a[0] - b[0]; });
      if (gaps.length) {
        var stops = [];
        for (var m = 0; m < gaps.length; m++) {
          var za = gaps[m][0], zb = gaps[m][1], F = gaps[m][2];
          stops.push('#000 ' + Math.max(0, za - F) + 'px');
          stops.push('transparent ' + za + 'px');
          stops.push('transparent ' + zb + 'px');
          stops.push('#000 ' + (zb + F) + 'px');
        }
        host.style.setProperty('--spine-gap-mask',
          'linear-gradient(to bottom, #000 0, ' + stops.join(', ') + ', #000 100%)');
        host.classList.add('has-gap');
      } else {
        host.classList.remove('has-gap');
      }
    }

    function layout() {
      var foot = d.querySelector('footer');
      END = foot ? docTop(foot) - 56 : d.documentElement.scrollHeight;
      host.style.height = END + 'px';
      chapters.forEach(function (c) {
        var anchor = c.sec.querySelector('.sec-head, h2') || c.sec;
        c.y = docTop(anchor) + 18;
        c.el.style.top = c.y + 'px';
        c.lit = c.now = c.live = null;
      });
      placeGlyphs();
      measure();
      lastPt = -1; lastVis = -1; // geometry changed: force a full redraw
      draw();
    }


    /* the line tracks the read position 1:1 — no easing lag, so the rail is
       exactly synchronised with the scroll while ornaments carry the motion */
    var shown = null, beatT = null, lastBeat = -1;
    function render(y) {
      if (railFill) railFill.style.height = y + 'px';
      if (headDot) headDot.style.transform = 'translateY(' + y + 'px)';
    }
    function glide(target) {
      if (shown !== null && Math.abs(target - shown) < 0.5) return;
      shown = target;
      render(target);
    }
    /* narrative beats: the rail owns a live segment per chapter, runs a packet
       of light from the chapter you left into the one you entered, and fires
       the node (plus that section's seam) at the moment of arrival */
    var seg = d.createElement('i'); seg.className = 'spine-seg';
    var run = d.createElement('i'); run.className = 'spine-run';
    seg.setAttribute('aria-hidden', 'true'); run.setAttribute('aria-hidden', 'true');
    cut.appendChild(seg); cut.appendChild(run);
    /* flow ornaments: a stream of light travelling inside the drawn part of
       the rail plus a few drifting sparks, so the line always feels alive */
    if (!reduce) {
      var flow = d.createElement('i');
      flow.className = 'spine-flow';
      flow.setAttribute('aria-hidden', 'true');
      if (railFill) railFill.appendChild(flow);
      for (var s = 0; s < 4; s++) {
        var sp = d.createElement('i');
        sp.className = 'spine-spark';
        sp.style.setProperty('--d', (s * 1.7).toFixed(2) + 's');
        sp.setAttribute('aria-hidden', 'true');
        (headDot || host).appendChild(sp);
      }
    }

    var fireT = null;

    function liveSegment(i) {
      if (i < 0) { seg.classList.remove('on'); return; }
      var a = chapters[i].y || 0;
      var b = i + 1 < chapters.length ? (chapters[i + 1].y || END) : END;
      seg.style.top = a + 'px';
      seg.style.height = Math.max(0, b - a) + 'px';
      seg.classList.add('on');
    }

    function handOver(from, to) {
      if (reduce) return;
      var a = from >= 0 ? (chapters[from].y || 0) : 0;
      var b = chapters[to].y || 0;
      run.classList.remove('go');
      run.style.setProperty('--from', a + 'px');
      run.style.setProperty('--to', b + 'px');
      void run.offsetWidth; // restart the animation
      run.classList.add('go');
      var node = chapters[to].el, sec = chapters[to].sec;
      node.classList.remove('fired'); void node.offsetWidth;
      node.classList.add('fired');
      // re-fire the seam so the section visibly receives the line
      sec.classList.remove('chapter-live'); void sec.offsetWidth;
      sec.classList.add('chapter-live');
      var bl = sec.querySelector(':scope > .sec-bloom');
      if (bl) { bl.style.animation = 'none'; void bl.offsetWidth; bl.style.animation = ''; }
      clearTimeout(fireT);
      fireT = setTimeout(function () { node.classList.remove('fired'); }, 900);
    }

    /* each chapter node the line crosses gives the line a visible beat */
    function beat(i) {
      if (reduce || i === lastBeat) return;
      var prev = lastBeat;
      lastBeat = i;
      host.classList.add('beat');
      clearTimeout(beatT);
      beatT = setTimeout(function () { host.classList.remove('beat'); }, 520);
      if (i > prev) handOver(prev, i);
      liveSegment(i);
    }

    var wasDone = null, wasComplete = null, lastVis = -1, lastPt = -1;
    var FEATHER = 220; // px of soft ramp on each side of a silent zone
    function draw() {
      var pt = window.pageYOffset + window.innerHeight * 0.52;
      if (pt === lastPt) return; // nothing moved — skip the whole frame
      lastPt = pt;
      var clamped = pt < 0 ? 0 : (pt > END ? END : pt);
      glide(clamped);
      var done = pt >= END;
      if (headDot && done !== wasDone) { headDot.classList.toggle('done', done); wasDone = done; }
      var dark = false;
      for (var z = 0; z < darkZones.length; z++) {
        if (clamped >= darkZones[z][0] && clamped <= darkZones[z][1]) { dark = true; break; }
      }
      if (dark !== wasDark) { host.classList.toggle('on-dark', dark); wasDark = dark; }
      /* silent zones: instead of snapping the rail off at the boundary, the
         visibility ramps from 1 → 0 across FEATHER px before the band and back
         up after it, so entering / leaving the marquee is one soft dissolve */
      var vis = 1;
      for (var h = 0; h < hideZones.length; h++) {
        var a = hideZones[h][0], b = hideZones[h][1];
        var dist = clamped < a ? a - clamped : (clamped > b ? clamped - b : 0);
        var v = dist >= FEATHER ? 1 : dist / FEATHER;
        v = v * v * (3 - 2 * v); // smoothstep
        if (v < vis) vis = v;
      }
      if (Math.abs(vis - lastVis) > 0.01) {
        lastVis = vis;
        host.style.setProperty('--spine-vis', vis.toFixed(3));
        var fading = vis < 0.999;
        if (fading !== wasHidden) { host.classList.toggle('fading', fading); wasHidden = fading; }
      }
      var passed = -1;
      for (var i = 0; i < chapters.length; i++) if (pt > (chapters[i].y || 0)) passed = i;
      if (passed >= 0) beat(passed); else seg.classList.remove('on');

      var comp = pt >= END - 4;
      if (comp !== wasComplete) { host.classList.toggle('complete', comp); wasComplete = comp; }
      /* --read is no longer consumed by any style (the header progress bar is
         gone), so nothing is written to :root during scroll at all. */


      /* class writes only happen on an actual state change, so a scroll frame
         costs a couple of style flips instead of dozens of rewrites */
      for (var q = 0; q < chapters.length; q++) {
        var c = chapters[q], y = c.y || 0;
        var lit = pt > y, now = pt > y - 40 && pt < y + 620, live = pt > y - 300;
        if (lit !== c.lit) { c.el.classList.toggle('lit', lit); c.lit = lit; }
        if (now !== c.now) { c.el.classList.toggle('now', now); c.now = now; }
        if (live !== c.live) { c.sec.classList.toggle('chapter-live', live); c.live = live; }
      }
      for (var k = 0; k < litItems.length; k++) {
        var it = litItems[k], on = it.y < pt + it.pad;
        if (on !== it.on) {
          it.el.classList.toggle('lit', on);
          it.on = on;
          /* arrival burst: every figure standing on the rail (brain, eye,
             question mark, bolt, layers, shield) detonates once as the line
             reaches it — the same beat the Memory brain always had */
          if (on && !reduce && it.el.classList.contains('mf-burstable')) {
            var host_ = it.el;
            host_.classList.remove('pop');
            void host_.offsetWidth;
            host_.classList.add('pop');
            setTimeout(function (n) { return function () { n.classList.remove('pop'); }; }(host_), 1100);
          }
        }
      }

      for (var j = 0; j < bandItems.length; j++) {
        var bi = bandItems[j], bon = bi.y < pt + 320;
        if (bon !== bi.on) { bi.el.classList.toggle('live', bon); bi.on = bon; }
      }
    }


    if (reduce) { host.classList.add('static'); }
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return; ticking = true;
      requestAnimationFrame(function () { ticking = false; draw(); });
    }, { passive: true });
    var rt;
    window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(layout, 160); });
    /* glyph x-offsets only depend on layout width, never on scroll position —
       measuring them per scroll event was pure layout thrash */

    /* reveal animations change the document's height as the reader travels, so
       the glyph cut-outs (measured in document coordinates) would drift and the
       line would strike through the eye / brain / question mark. Re-measure only
       when geometry actually changes, debounced, never per frame. */
    var rm;
    function remeasure() {
      clearTimeout(rm);
      rm = setTimeout(function () { placeGlyphs(); measure(); lastPt = -1; draw(); }, 120);
    }
    if (window.ResizeObserver) { new ResizeObserver(remeasure).observe(d.body); }
    d.addEventListener('transitionend', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.metafig, .brainwrap, section')) remeasure();
    }, true);

    if (d.fonts && d.fonts.ready) { d.fonts.ready.then(layout); }
    layout();
    window.addEventListener('load', layout);
    setTimeout(layout, 1000);

  })();

  /* ---- the oversized "3A" ghost: its inner light band tracks the scroll ----
     One custom property per frame (0 → 1 as the glyph crosses the viewport),
     consumed by background-position in CSS. */
  (function () {
    var gs = Array.prototype.slice.call(
      d.querySelectorAll('.ctx-ghost-text, .mem-ghost, .sec-ghost, .hero-mark-ghost')
    );
    if (!gs.length || reduce) return;
    var t = false, last = [];
    function tick() {
      var h = window.innerHeight || 1;
      for (var i = 0; i < gs.length; i++) {
        var g = gs[i];
        var r = g.getBoundingClientRect();
        if (r.bottom < -400 || r.top > h + 400) continue;
        var p = (h - r.top) / (h + r.height);
        p = p < 0 ? 0 : (p > 1 ? 1 : p);
        var v = Math.round(p * 1000) / 1000;
        if (v !== last[i]) { last[i] = v; g.style.setProperty('--ghost-p', v); }
      }
    }
    window.addEventListener('scroll', function () {
      if (t) return; t = true;
      requestAnimationFrame(function () { t = false; tick(); });
    }, { passive: true });
    tick();
  })();
})();
