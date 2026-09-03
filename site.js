/* Adgent marketing site — interactions
   reveal-on-scroll · counters · hero chat build · marquee · nav · lead form
   All motion respects prefers-reduced-motion. */

/* Optional measurement stays off until the visitor explicitly enables it. */
(function () {
  var d = document;
  var dataLayer = window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { dataLayer.push(arguments); };

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    personalization_storage: 'denied',
    security_storage: 'granted'
  });
  window.gtag('set', 'ads_data_redaction', true);

  function loadGoogleAnalytics() {
    if (d.querySelector('script[data-adgent-ga]')) return;
    var script = d.createElement('script');
    script.async = true;
    /* First-party path, not googletagmanager.com: /metrics is rewritten in
       vercel.json to g-1ncs2zfmlr.fps.goog, the tag gateway origin for this
       measurement ID. No trailing slash — trailingSlash:false would 308 it
       away, and the origin 404s the slashless path, so the rewrite adds the
       slash on the way out. Verified 2026-09-03: /metrics/healthy and
       /metrics/?validate_geo=healthy both answer "ok". */
    script.src = '/metrics';
    script.setAttribute('data-adgent-ga', '');
    d.head.appendChild(script);
    window.gtag('js', new Date());
    window.gtag('config', 'G-1NCS2ZFMLR');
    window.gtag('config', 'G-7BSLN2NWVP');
  }

  function loadGoogleTagManager() {
    if (d.querySelector('script[data-adgent-gtm]')) return;
    dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var script = d.createElement('script');
    script.async = true;
    /* Same first-party pattern as loadGoogleAnalytics: /tagging is rewritten
       to gtm-mwr4pvrf.fps.goog, this container's gateway origin. The container
       ID lives in the origin, so no ?id= is needed. */
    script.src = '/tagging';
    script.setAttribute('data-adgent-gtm', '');
    d.head.appendChild(script);
  }

  // The consent stylesheet used to be an @import at the top of site.css, so the
  // browser could not discover it until site.css had downloaded and parsed — the
  // same chained-request problem the webfonts had, and it sat in the render path
  // for every visitor. It is only needed once the banner exists, so it loads here,
  // beside the module that draws it, and blocks nothing.
  (function () {
    var l = d.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/assets/vendor/cookieconsent-3.1.0.css';
    d.head.appendChild(l);
  })();

  import('/assets/vendor/cookieconsent-3.1.0.esm.js').then(function (cc) {
    function syncConsent() {
      var analytics = cc.acceptedCategory('analytics');
      var advertising = cc.acceptedCategory('advertising');
      window.gtag('consent', 'update', {
        analytics_storage: analytics ? 'granted' : 'denied',
        ad_storage: advertising ? 'granted' : 'denied',
        ad_user_data: advertising ? 'granted' : 'denied',
        ad_personalization: advertising ? 'granted' : 'denied'
      });
      if (analytics) loadGoogleAnalytics();
      if (advertising) loadGoogleTagManager();
    }

    return cc.run({
      mode: 'opt-in',
      revision: 1,
      cookie: {
        name: 'adgent_cookie_consent',
        expiresAfterDays: 182,
        sameSite: 'Lax'
      },
      guiOptions: {
        consentModal: {
          layout: 'cloud inline',
          position: 'bottom center',
          equalWeightButtons: true
        },
        preferencesModal: {
          layout: 'box',
          equalWeightButtons: true
        }
      },
      categories: {
        necessary: {
          readOnly: true
        },
        analytics: {
          autoClear: {
            cookies: [{ name: /^_ga/ }, { name: '_gid' }],
            reloadPage: false
          }
        },
        advertising: {
          autoClear: {
            cookies: [{ name: /^_gcl/ }, { name: '_fbp' }],
            reloadPage: false
          }
        }
      },
      onConsent: syncConsent,
      onChange: syncConsent,
      language: {
        default: 'en',
        translations: {
          en: {
            consentModal: {
              label: 'Cookie consent',
              title: 'Your choice, before measurement.',
              description: 'Analytics and advertising tags stay off until you allow them.',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject optional',
              showPreferencesBtn: 'Choose',
              footer: '<a href="/privacy">Privacy policy</a>'
            },
            preferencesModal: {
              title: 'Cookie settings',
              acceptAllBtn: 'Accept all',
              acceptNecessaryBtn: 'Reject optional',
              savePreferencesBtn: 'Save choice',
              closeIconLabel: 'Close cookie settings',
              sections: [
                {
                  description: 'Optional tags are off unless you enable them. You can change this choice anytime from Cookie settings in the footer.'
                },
                {
                  title: 'Necessary',
                  description: 'Remembers your cookie choice and supports essential security. Always on.',
                  linkedCategory: 'necessary'
                },
                {
                  title: 'Analytics',
                  description: 'Google Analytics measures visits and page use only after you enable it.',
                  linkedCategory: 'analytics'
                },
                {
                  title: 'Advertising',
                  description: 'Google Tag Manager may load advertising measurement tags only after you enable it.',
                  linkedCategory: 'advertising'
                }
              ]
            }
          }
        }
      }
    }).then(function () {
      d.querySelectorAll('[data-cookie-settings]').forEach(function (button) {
        button.addEventListener('click', function () { cc.showPreferences(); });
      });
    });
  }).catch(function (error) {
    console.error('Cookie settings failed to load; optional measurement remains disabled.', error);
  });
})();

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
    // Read every rect first, then apply every class. Interleaving them made each
    // classList.add() invalidate layout for the getBoundingClientRect() that
    // followed it — 23 forced synchronous reflows in one frame on the homepage,
    // 136 ms of the 1,100 ms LCP render delay under 4x CPU. Measure all, mutate all.
    requestAnimationFrame(function () {
      var onscreen = [];
      var vh = window.innerHeight || 0;
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < vh && r.bottom > 0) onscreen.push(el);
      });
      onscreen.forEach(function (el) { el.classList.add('in'); io.unobserve(el); });
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

  /* ---- figures: draw once on entry --------------------------------------
     site.css animates [data-anim] against [data-anim].in; build.py stamps the
     attribute. Two jobs are left for here:

     1. Measure each stroked path so the draw covers exactly its own length.
        A fixed dasharray would make short connectors finish instantly and
        long curves stop short, and the length is only knowable at runtime.
     2. Add `.in` when the figure reaches the viewport, with the same
        belt-and-braces the reveal observer uses above: anything already on
        screen at load draws immediately, and a timeout guarantees nothing
        stays hidden if the observer never fires. Evidence must never depend
        on an animation callback arriving.
  ---------------------------------------------------------------------- */
  (function () {
    var figs = d.querySelectorAll('[data-anim]');
    if (!figs.length) return;
    var DRAWN = '.sc-line-acc,.sc-line-dim,.sc-axis,.mo-line,.mr-join,.sp-span,.mo-helix path';

    function measure(fig) {
      fig.querySelectorAll(DRAWN).forEach(function (p) {
        var len = 0;
        try { len = p.getTotalLength(); } catch (e) { return; }
        // a hairline or an unrendered path gets no dash treatment at all,
        // otherwise it would be stuck invisible behind a 0-length offset
        if (!len || len < 2) { p.style.strokeDasharray = 'none'; return; }
        p.style.setProperty('--len', Math.ceil(len + 1));
      });
    }

    if (reduce) { figs.forEach(function (f) { f.classList.add('in'); }); return; }
    figs.forEach(measure);

    if (hasIO) {
      var fio = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); fio.unobserve(e.target); }
        });
      }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
      figs.forEach(function (f) { fio.observe(f); });
      requestAnimationFrame(function () {
        figs.forEach(function (f) {
          var r = f.getBoundingClientRect();
          if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
            f.classList.add('in'); fio.unobserve(f);
          }
        });
      });
      setTimeout(function () {
        figs.forEach(function (f) { f.classList.add('in'); });
      }, 8000);
    } else {
      figs.forEach(function (f) { f.classList.add('in'); });
    }
  })();

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
    /* Was 350/850/2000/2400ms — for the first two seconds the card sat almost
       empty, then filled. Halved; the card reserves its height in CSS so
       nothing reflows as the lines land. */
    setTimeout(function () { show(user); }, 200);
    setTimeout(function () { show(typing); }, 500);
    setTimeout(function () { if (typing) typing.style.display = 'none'; show(bot); }, 1100);
    setTimeout(function () { show(input); }, 1350);
  })();

  /* ---- built-from-a-sentence: four artefacts, one click apart ----
     Replaced a sticky-over-300vh-spacer scroll pin (2026-08-23). That mechanic
     could only ever show one artefact at a time, while the section's claim is
     that ONE conversation produced FOUR — so it hid the argument and charged
     three screens of scroll for the privilege. Plain tabs: all four named on
     arrival, no scroll cost, and it degrades to the first panel with JS off. */
  (function () {
    var stage = d.querySelector('[data-bstage]'); if (!stage) return;
    var tabs = stage.querySelectorAll('[data-btab]');
    var panels = stage.querySelectorAll('[data-bpanel]');
    if (!tabs.length || tabs.length !== panels.length) return;

    function select(i, focus) {
      Array.prototype.forEach.call(tabs, function (t, k) {
        var on = k === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      Array.prototype.forEach.call(panels, function (pnl, k) {
        var on = k === i;
        pnl.hidden = !on;
        pnl.classList.toggle('on', on);
      });
      if (focus) tabs[i].focus();
    }

    stage.addEventListener('click', function (e) {
      var t = e.target.closest('[data-btab]'); if (!t) return;
      select(+t.getAttribute('data-btab'), false);
    });

    /* Arrow-key roving focus is what makes a tablist a tablist for anyone not
       using a mouse; without it the pattern is only half-implemented. */
    stage.addEventListener('keydown', function (e) {
      var t = e.target.closest('[data-btab]'); if (!t) return;
      var i = +t.getAttribute('data-btab'), n = tabs.length, j = null;
      if (e.key === 'ArrowRight') j = (i + 1) % n;
      else if (e.key === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (e.key === 'Home') j = 0;
      else if (e.key === 'End') j = n - 1;
      if (j === null) return;
      e.preventDefault(); select(j, true);
    });
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

  /* ---- nav dropdowns ----
     CSS handles hover and focus-within. This covers touch, where hover would
     otherwise make the first tap follow the link instead of opening the menu.
     querySelectorAll, not querySelector: there is more than one dropdown. */
  var drops = [].slice.call(d.querySelectorAll('.nav-drop'));
  if (drops.length && window.matchMedia('(hover: none)').matches) {
    drops.forEach(function (drop) {
      var trigger = drop.querySelector('.nav-drop-t');
      if (!trigger) return;
      trigger.addEventListener('click', function (e) {
        if (drop.classList.contains('open')) return;   /* second tap follows the link */
        e.preventDefault();
        /* only one open at a time, or two panels overlap */
        drops.forEach(function (o) {
          if (o !== drop) {
            o.classList.remove('open');
            var t = o.querySelector('.nav-drop-t');
            if (t) t.setAttribute('aria-expanded', 'false');
          }
        });
        drop.classList.add('open');
        trigger.setAttribute('aria-expanded', 'true');
      });
    });
    d.addEventListener('click', function (e) {
      drops.forEach(function (drop) {
        if (!drop.contains(e.target)) {
          drop.classList.remove('open');
          var t = drop.querySelector('.nav-drop-t');
          if (t) t.setAttribute('aria-expanded', 'false');
        }
      });
    });
  }

  /* ---- keep aria-expanded honest on hover-opened dropdowns ----
     CSS opens these on :hover and :focus-within, which the attribute knew
     nothing about — it was hardcoded "false" and stayed false while the menu
     was visibly open, so a screen reader was told the opposite of the truth.
     The touch branch above owns the .open class; this only mirrors the
     pointer/keyboard states it does not handle. */
  drops.forEach(function (drop) {
    var trigger = drop.querySelector('.nav-drop-t');
    if (!trigger) return;
    var sync = function () {
      var open = drop.classList.contains('open') ||
                 drop.matches(':hover') || drop.contains(d.activeElement);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    ['mouseenter', 'mouseleave', 'focusin', 'focusout'].forEach(function (ev) {
      drop.addEventListener(ev, function () { setTimeout(sync, 0); });
    });
  });

  /* ---- mega-menu visual panel ----
     Each link carries data-mega="<key>"; the panel holds one .mega-panel-art
     per key and shows the hovered one. Pure enhancement: with JS off the
     panel simply keeps its default art and every link still works.
     There is one panel per mega-menu (Product, Solutions), so each is wired to
     the links inside its own dropdown — a single global lookup would let a
     Solutions link try to drive the Product panel and silently do nothing. */
  [].forEach.call(d.querySelectorAll('[data-mega-panel]'), function (megaPanel) {
    var scope = megaPanel.closest('.nav-drop-mega') || d;
    var arts = {}, caption = megaPanel.querySelector('.mega-panel-cap');
    [].forEach.call(megaPanel.querySelectorAll('.mega-panel-art'), function (a) {
      arts[a.getAttribute('data-art')] = a;
    });
    var showArt = function (key) {
      var hit = arts[key];
      if (!hit) return;
      for (var k in arts) arts[k].classList.toggle('on', k === key);
      if (caption) {
        caption.querySelector('.mp-t').textContent = hit.getAttribute('data-t') || '';
        caption.querySelector('.mp-d').textContent = hit.getAttribute('data-d') || '';
      }
    };
    [].forEach.call(scope.querySelectorAll('[data-mega]'), function (link) {
      var key = link.getAttribute('data-mega');
      link.addEventListener('mouseenter', function () { showArt(key); });
      link.addEventListener('focus', function () { showArt(key); });
    });
  });

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
            /* The one number gtm/07 §7.8 asks for is the audit-request rate, and
               nothing was reporting it: GA4 saw form_start from enhanced
               measurement and no submission event at all, so 90 days of data had
               no conversion in it. Fire it here, on the success branch only.

               Sent with gtag, not dataLayer.push. GA4 is loaded directly by
               loadGoogleAnalytics() above, and gtag only interprets its own
               command arrays — a bare {event: ...} object is GTM's language, not
               gtag's, so it would have sat in the queue unread. The container
               holds one Clarity tag and no GA4 configuration, so routing through
               it would mean standing up a second GA4 loading path for one event.
               The gtag stub queues commands until gtag.js lands, so this is safe
               before consent resolves. */
            window.gtag('event', 'generate_lead', {
              form_id: id,
              page_path: location.pathname
            });
            /* Success hides the form, which destroys the button the user was
               focused on — focus falls to <body> and a screen reader is told
               nothing at all. Move focus to the thank-you so the outcome is
               both announced and navigable. */
            var done = card && card.querySelector('.lead-done h3');
            if (done) {
              done.setAttribute('tabindex', '-1');
              done.focus();
            }
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
      /* focusin, not focus: the focusable element is the <button> inside the
         row, and focus does not bubble. Without this the whole widget was
         mouse-only — a keyboard user reached exactly one of the seven layers,
         which is the entire argument of the page. */
      r.addEventListener('focusin', function () { pause(); select(i); });
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

  /* ---- report findings: always open ----
     These were a click-to-expand accordion, one at a time. There are only two
     of them and each one IS the argument of the section — a reader who has to
     click to discover the refusal usually doesn't. Both stay open; the class is
     set here so the collapsed state never paints. */
  (function () {
    var flags = d.querySelectorAll('.report-flags .rflag');
    Array.prototype.forEach.call(flags, function (f) { f.classList.add('open'); });
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

    // Three passes, not one interleaved loop. Writing par.style.position and then
    // reading the next glyph's rect in the same iteration forced a synchronous
    // layout per glyph; after the reveal pass was fixed this became the largest
    // remaining reflow source in the trace. Position first, measure second,
    // write third — one layout for the whole set.
    function placeGlyphs() {
      var railX = host.getBoundingClientRect().left + 1;
      var on = window.innerWidth > 1240 && railX > 60;
      if (!on) {
        glyphs.forEach(function (g) { g.style.removeProperty('--spine-x'); });
        return;
      }
      glyphs.forEach(function (g) {
        var par = g.offsetParent || g.parentNode;
        if (par && window.getComputedStyle(par).position === 'static') par.style.position = 'relative';
      });
      var offsets = glyphs.map(function (g) {
        var pr = (g.offsetParent || d.body).getBoundingClientRect();
        var mark = g.querySelector('svg');
        var half = (mark ? mark.getBoundingClientRect().width : g.offsetWidth) / 2;
        return Math.round(railX - pr.left - g.offsetLeft - half);
      });
      glyphs.forEach(function (g, i) { g.style.setProperty('--spine-x', offsets[i] + 'px'); });
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

    /* the one section that pins itself over a spacer — its node has to travel
       with the pin instead of staying put in document space (see draw()) */
    var pinnedChapter = null;

    function layout() {
      var foot = d.querySelector('footer');
      END = foot ? docTop(foot) - 56 : d.documentElement.scrollHeight;
      host.style.height = END + 'px';
      chapters.forEach(function (c) {
        var anchor = c.sec.querySelector('.sec-head, h2') || c.sec;
        c.y = docTop(anchor) + 18;
        c.el.style.top = c.y + 'px';
        c.lit = c.now = c.live = null;
        c.el.style.transform = '';
        c.el.classList.remove('pinned-hold');
      });
      pinnedChapter = null;
      var pinSec = d.querySelector('[data-builds-pin]');
      var pinSpacer = d.querySelector('[data-builds-spacer]');
      if (pinSec && pinSpacer && pinSpacer.offsetHeight > 0) {
        for (var k = 0; k < chapters.length; k++) {
          if (chapters[k].sec === pinSec) {
            pinnedChapter = chapters[k];
            pinnedChapter.travel = function () { return pinSpacer.offsetHeight; };
            break;
          }
        }
      }
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
      /* A pinned section holds its heading still on screen while the document
         scrolls a whole spacer's worth underneath it. Its chapter node is
         placed in document space like every other one, so it slid ~2000px off
         the top while the section it labels was still the thing being read —
         the label and the thing it labels came apart. Carry the node with the
         pin for as long as the pin lasts. */
      if (pinnedChapter) {
        var pc = pinnedChapter;
        var off = pc.sec.getBoundingClientRect().top;   // 0 → -travel while stuck
        var stuck = off <= 0 && -off <= pc.travel();
        pc.el.style.transform = stuck ? 'translateY(' + Math.round(-off) + 'px)' : '';
        pc.el.classList.toggle('pinned-hold', stuck);
        /* While the pin holds, this chapter IS the one being read — the
           read-position marker is already past its heading by then, so the
           active styling would otherwise drop off mid-section. */
        if (stuck) {
          pc.el.classList.add('now', 'lit');
          pc.held = true;
        } else if (pc.held) {
          /* hand the active state back to the normal chapter logic once the
             pin lets go, or the node stays lit for the rest of the page */
          pc.el.classList.remove('now');
          pc.held = false;
        }
      }

      var passed = -1;
      for (var i = 0; i < chapters.length; i++) if (pt > (chapters[i].y || 0)) passed = i;
      if (passed >= 0) beat(passed); else seg.classList.remove('on');

      /* `pt` is the read position — the middle of the viewport, not its bottom —
         so on a page whose rail ends just above the footer it stops roughly half
         a screen short of END and the rail never registered as finished. Treat
         "the reader is as far down as the page goes" as arrival too, otherwise
         .complete can never fire and the end of the line has no ending. */
      var atBottom = window.pageYOffset + window.innerHeight >=
                     d.documentElement.scrollHeight - 2;
      var comp = pt >= END - 4 || atBottom;
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
