/* Adgent v2 · shared behaviour. No framework, no dependencies.
   top bar + reading trail · nav dropdowns · drawer · reveal · split compare · mirror pairs ·
   decision-card buttons · lead forms · dev accent switch.
   Page-specific behaviour lives in /js/<slug>.js, never here. */
(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = matchMedia('(max-width:860px)');

  /* ---- dev accent switch: ?accent=NN (01-10) sets and remembers; ?accent=off clears.
     Local preview only: on adgent.app a shared ?accent= link would show visitors an
     off-brand palette (02 and 05 fail AA), so production ignores it and drops any stale key. ---- */
  (function () {
    var KEY = 'adgent-accent', dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    var q = new URLSearchParams(location.search).get('accent'), v = null;
    if (!dev) {
      try { localStorage.removeItem(KEY); } catch (e) {}
      root.removeAttribute('data-accent');
      return;
    }
    try { v = localStorage.getItem(KEY); } catch (e) {}
    if (q !== null) {
      v = /^(0[1-9]|10)$/.test(q) ? q : null;
      try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch (e) {}
    }
    if (v) root.setAttribute('data-accent', v); else root.removeAttribute('data-accent');
  })();

  /* ---- top bar: hairline + reading trail once scrolled, --navh for sticky scenes ---- */
  var top = $('.topbar');
  if (top) {
    var readFrame = 0;
    var setH = function () { root.style.setProperty('--navh', top.offsetHeight + 'px'); };
    var onS = function () {
      if (readFrame) return;
      readFrame = requestAnimationFrame(function () {
        readFrame = 0;
        var max = Math.max(1, d.documentElement.scrollHeight - innerHeight);
        var progress = Math.max(0, Math.min(1, scrollY / max));
        top.classList.toggle('scrolled', scrollY > 8);
        top.style.setProperty('--read-progress', progress.toFixed(4));
        top.style.setProperty('--read-active', scrollY > 8 ? '1' : '0');
      });
    };
    setH(); onS();
    /* Styles/fonts can settle after initialization; sticky offsets follow the rendered bar. */
    new ResizeObserver(setH).observe(top);
    addEventListener('resize', function () { setH(); onS(); });
    addEventListener('scroll', onS, { passive: true });
  }

  /* ---- dropdowns: hover (CSS), click/Enter/Space toggle, ArrowDown opens into the menu,
         Esc closes and returns focus, focus leaving the menu closes it ---- */
  var drops = $$('.topbar .drop');
  function place(dr) {
    var m = $('.menu', dr); if (!m) return;
    var pad = 16;
    var left = dr.getBoundingClientRect().left + m.offsetLeft;
    var right = left + m.offsetWidth;
    var shift = right > innerWidth - pad ? innerWidth - pad - right : 0;
    if (left + shift < pad) shift = pad - left;
    m.style.setProperty('--mx', Math.round(shift) + 'px');
  }
  function closeDrop(dr) {
    dr.classList.remove('open');
    var t = $('.drop-t', dr); if (t) t.setAttribute('aria-expanded', 'false');
  }
  function openDrop(dr) {
    drops.forEach(function (o) { if (o !== dr) closeDrop(o); });
    dr.classList.remove('shut'); place(dr);
    dr.classList.add('open'); $('.drop-t', dr).setAttribute('aria-expanded', 'true');
  }
  drops.forEach(function (dr) {
    var t = $('.drop-t', dr);
    dr.addEventListener('pointerenter', function () { dr.classList.remove('shut'); place(dr); });
    dr.addEventListener('mouseleave', function () { dr.classList.remove('shut'); if (!dr.contains(d.activeElement)) closeDrop(dr); });
    t.addEventListener('click', function () { dr.classList.contains('open') ? closeDrop(dr) : openDrop(dr); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); openDrop(dr); var a = $('.menu a', dr); if (a) a.focus(); }
    });
    dr.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      closeDrop(dr); dr.classList.add('shut'); t.focus();
    });
    dr.addEventListener('focusout', function (e) { if (!dr.contains(e.relatedTarget)) closeDrop(dr); });
  });
  /* keep closed menus inside the viewport too, so they never widen the page */
  var placeAll = function () { drops.forEach(place); };
  placeAll(); addEventListener('resize', placeAll);
  d.addEventListener('click', function (e) { if (!e.target.closest('.topbar .drop')) drops.forEach(closeDrop); });

  /* ---- mobile drawer ---- */
  var burger = $('.burger'), drawer = $('#drawer');
  if (burger && drawer) {
    var drawerGroups = $$('details', drawer);
    drawerGroups.forEach(function (group) {
      group.addEventListener('toggle', function () {
        if (!group.open) return;
        drawerGroups.forEach(function (other) { if (other !== group) other.open = false; });
      });
    });
    var isolated = [], previousOverflow = '';
    var drawerFocusables = function () {
      return [burger].concat($$('a[href], summary, button, [tabindex="0"]', drawer).filter(function (el) {
        var closed = el.closest('details:not([open])');
        return !el.disabled && (!closed || el === $('summary', closed)) && el.getClientRects().length;
      }));
    };
    var shut = function (restoreFocus) {
      if (drawer.hidden) return;
      drawer.hidden = true;
      burger.setAttribute('aria-expanded', 'false');
      isolated.forEach(function (el) { el.inert = false; });
      isolated = [];
      d.body.style.overflow = previousOverflow;
      if (restoreFocus) burger.focus();
    };
    burger.addEventListener('click', function () {
      if (!drawer.hidden) { shut(true); return; }
      if (top) root.style.setProperty('--navh', top.offsetHeight + 'px');
      previousOverflow = d.body.style.overflow;
      /* Isolate every sibling on the path to the drawer and its close control.
         Preserve pre-existing inert state, including page-owned demo panels. */
      function isolate(parent) {
        Array.prototype.forEach.call(parent.children, function (el) {
          if (el === drawer || el === burger || /^(SCRIPT|STYLE|LINK)$/.test(el.tagName)) return;
          if (el.contains(drawer) || el.contains(burger)) { isolate(el); return; }
          if (!el.inert) { el.inert = true; isolated.push(el); }
        });
      }
      isolate(d.body);
      drawer.hidden = false;
      burger.setAttribute('aria-expanded', 'true');
      d.body.style.overflow = 'hidden';
      var first = drawerFocusables()[1];
      if (first) first.focus();
    });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) shut(true); });
    addEventListener('keydown', function (e) {
      if (drawer.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); shut(true); return; }
      if (e.key !== 'Tab') return;
      var items = drawerFocusables(), first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (d.activeElement === first || items.indexOf(d.activeElement) < 0)) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (d.activeElement === last || items.indexOf(d.activeElement) < 0)) {
        e.preventDefault(); first.focus();
      }
    });
    matchMedia('(min-width:1101px)').addEventListener('change', function (e) {
      if (!e.matches || drawer.hidden) return;
      var hadFocus = drawer.contains(d.activeElement) || d.activeElement === burger;
      shut(false);
      if (hadFocus && top) { var brand = $('.brand', top); if (brand) brand.focus(); }
    });
  }

  /* ---- reveal on scroll: .rv gets .in once; [data-count] counts up when it arrives ---- */
  function count(el) {
    var n = +el.getAttribute('data-count'), dec = (el.getAttribute('data-count').split('.')[1] || '').length;
    var fmt = function (v) { return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); };
    if (still) { el.textContent = fmt(n); return; }
    var t0 = performance.now() + 250, D = 1200;
    (function f(now) {
      var p = Math.min(1, Math.max(0, (now - t0) / D));
      el.textContent = fmt(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(f);
    })(performance.now());
  }
  var rvs = $$('.rv');
  if ('IntersectionObserver' in window && !still) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in'); $$('[data-count]', e.target).forEach(count); io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    rvs.forEach(function (el) { io.observe(el); el.classList.add('rv-ready'); });
  } else {
    rvs.forEach(function (el) { el.classList.add('in'); });
    $$('[data-count]').forEach(count);
  }
  d.addEventListener('focusin', function (e) {
    var reveal = e.target.closest('.rv');
    if (reveal) reveal.classList.add('in');
  });

  /* ---- split compare: --cmp-x is today's share; the lit layer is clipped at it.
         Wide: continuous, starts in the middle. Narrow: snaps to a side via the toggle. ---- */
  $$('.cmp').forEach(function (st) {
    var h = $('.cmp-h', st); if (!h) return;
    var prev = st.previousElementSibling, tog = prev && prev.classList.contains('cmp-tog') ? $$('button', prev) : [];
    var before = tog.length ? tog[0].textContent.trim() : 'Today', after = tog.length > 1 ? tog[1].textContent.trim() : 'With Adgent';
    var x = 50, drag = false, touched = false, timers = [];
    var clear = function () { touched = true; timers.forEach(clearTimeout); timers = []; };
    function set(v, anim) {
      x = Math.max(0, Math.min(100, v));
      st.classList.toggle('anim', !!anim && !still);
      st.style.setProperty('--cmp-x', x);
      st.classList.toggle('edge', x <= 0 || x >= 100);
      var r = Math.round(x);
      h.setAttribute('aria-valuenow', r);
      h.setAttribute('aria-valuetext', r >= 100 ? before + ' only' : r <= 0 ? after + ' only' : before + ' ' + r + '%, ' + after + ' ' + (100 - r) + '%');
      tog.forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-s') === 'today') === (x >= 50))); });
    }
    var home = function () { set(narrow.matches ? 100 : 50, false); };
    home();
    narrow.addEventListener('change', function () { clear(); home(); });
    var at = function (e) { var r = st.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    h.addEventListener('pointerdown', function (e) { clear(); drag = true; h.setPointerCapture(e.pointerId); st.classList.add('drag'); set(at(e), false); e.preventDefault(); });
    h.addEventListener('pointermove', function (e) { if (drag) set(at(e), false); });
    var end = function () { if (!drag) return; drag = false; st.classList.remove('drag'); if (narrow.matches) set(x < 50 ? 0 : 100, true); };
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
    h.addEventListener('keydown', function (e) {
      var step = narrow.matches ? 100 : 5;
      var m = { ArrowLeft: -step, ArrowDown: -step, ArrowRight: step, ArrowUp: step, PageDown: -25, PageUp: 25 }[e.key];
      if (m !== undefined) { e.preventDefault(); clear(); set(narrow.matches ? (m < 0 ? 0 : 100) : x + m, true); }
      else if (e.key === 'Home') { e.preventDefault(); clear(); set(0, true); }
      else if (e.key === 'End') { e.preventDefault(); clear(); set(100, true); }
    });
    tog.forEach(function (b) { b.addEventListener('click', function () { clear(); set(b.getAttribute('data-s') === 'today' ? 100 : 0, true); }); });
    /* one nudge, the first time the stage is properly in view, to teach the gesture */
    if (still || narrow.matches || !('IntersectionObserver' in window)) return;
    var nio = new IntersectionObserver(function (es) {
      if (es[0].intersectionRatio < .55) return;
      nio.disconnect(); if (touched || drag) return;
      var a = [40, 57, 50], dl = [350, 800, 750], t = 0;
      a.forEach(function (v, i) { t += dl[i]; timers.push(setTimeout(function () { set(v, true); }, t)); });
    }, { threshold: .6 });
    nio.observe(st);
  });

  /* ---- mirror pairs: the lit half wipes in once as the pair enters.
         Narrow: one surface with a Today / With Adgent toggle. ---- */
  var pio = null;
  function setW(p, w, anim) {
    p.classList.toggle('anim', !!anim && !still);
    p.style.setProperty('--ps-w', w);
    p.classList.toggle('is-today', w >= .5);
    if (narrow.matches) {
      var today = $('.ps-today', p), lit = $('.ps-lw', p);
      if (today) { today.inert = w < .5; today.setAttribute('aria-hidden', String(w < .5)); }
      if (lit) { lit.inert = w >= .5; lit.setAttribute('aria-hidden', String(w >= .5)); }
    }
    var t = p.previousElementSibling;
    if (t && t.classList.contains('ps-tog')) $$('button', t).forEach(function (b) { b.setAttribute('aria-pressed', String((b.getAttribute('data-s') === 'today') === (w >= .5))); });
  }
  var pairs = $$('.ps-pair');
  pairs.forEach(function (p) {
    setW(p, 0, false);
    var t = p.previousElementSibling;
    if (t && t.classList.contains('ps-tog')) t.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (pio) pio.unobserve(p);
      setW(p, b.getAttribute('data-s') === 'today' ? 1 : 0, true);
    });
  });
  if (!still && 'IntersectionObserver' in window) {
    pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; pio.unobserve(e.target); setW(e.target, 0, true); });
    }, { threshold: .3 });
    pairs.forEach(function (p) { if (p.getBoundingClientRect().top > innerHeight * .85) { setW(p, 1, false); pio.observe(p); } });
  }
  narrow.addEventListener('change', function () {
    pairs.forEach(function (p) {
      if (narrow.matches) { setW(p, p.classList.contains('is-today') ? 1 : 0, false); return; }
      $$('.ps-today,.ps-lw', p).forEach(function (panel) { panel.inert = false; panel.removeAttribute('aria-hidden'); });
      setW(p, 0, false);
    });
  });

  /* ---- decision cards: Approve / Skip are demonstrations, local state only.
         A page that scripts its own cards marks the .dc with data-own. ---- */
  $$('.dc:not([data-own]) [data-act]').forEach(function (b) {
    b.addEventListener('click', function () {
      var c = b.closest('.dc'), a = b.getAttribute('data-act'), s = $('.dc-act > span', c);
      c.classList.toggle('is-approved', a === 'approve'); c.classList.toggle('is-skipped', a === 'skip');
      if (s) s.textContent = a === 'approve' ? 'Approved. Logged with the state it replaced.' : 'Skipped. Nothing changed.';
    });
  });

  /* ---- lead forms (.form and .qf): validate, then post to Web3Forms (mails the team).
         build.py makes every one a plain POST to Web3Forms with its hidden fields (key, per-page
         subject, page, form_location, redirect, honeypot), so a visitor without this script still
         sends the lead. Here the same fields go by fetch as FormData (multipart: no preflight),
         without `redirect`. The confirmation shows only when the service says it was received;
         a failure keeps the form, says so inline and leaves the button ready to try again. ---- */
  var MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var FAIL = 'We couldn\u2019t send that just now. Check your connection and try again, or write to <a href="mailto:osman@adgent.app">osman@adgent.app</a>.';
  $$('form.form, form.qf').forEach(function (f, n) {
    f.setAttribute('novalidate', '');
    var em = f.elements.email, nm = f.elements.name, err = $('.err', f), btn = $('[type=submit]', f);
    var label = btn ? btn.textContent : '';
    if (!err) {
      err = d.createElement('p'); err.className = 'err'; err.setAttribute('aria-live', 'polite');
      var row = btn && btn.closest('.qf-row');
      f.insertBefore(err, row ? row.nextSibling : btn || null);
    }
    /* tie the message to the fields so a screen reader reads it with them */
    if (!err.id) err.id = 'lead-err-' + n;
    [em, nm].forEach(function (i) { if (i && !i.hasAttribute('aria-describedby')) i.setAttribute('aria-describedby', err.id); });
    var hidden = function (k) { var el = f.elements[k]; return el ? el.value : ''; };
    var busy = function (on) {
      if (!btn) return;
      btn.disabled = on; btn.setAttribute('aria-busy', String(on));
      if (on) btn.textContent = 'Sending\u2026';
    };
    var done = function () {
      f.classList.add('sent');
      var ok = $('[role=status]', f); if (ok) { ok.setAttribute('tabindex', '-1'); ok.focus(); }
    };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (btn && btn.disabled) return;
      var nameOk = !nm || nm.value.trim().length > 1, v = em ? em.value.trim() : '', mailOk = MAIL.test(v);
      if (nm) nm.setAttribute('aria-invalid', String(!nameOk));
      if (em) em.setAttribute('aria-invalid', String(!mailOk));
      err.textContent = !nameOk && !mailOk ? 'Add your name and a work email we can reply to.' : !nameOk ? 'Add your name so we know who to reply to.' : !mailOk ? (v ? "That doesn't look like an email address. Check it and try again." : 'Enter a work email we can reply to.') : '';
      f.classList.toggle('bad', !(nameOk && mailOk));
      if (!nameOk) { nm.focus(); return; }
      if (!mailOk) { em.focus(); return; }
      if (f.elements.botcheck && f.elements.botcheck.checked) { done(); return; }
      var data = new FormData(f), empty = [];
      data.set('email', v);
      data.delete('redirect');
      data.delete('botcheck');
      data.forEach(function (val, k) { if (typeof val === 'string' && !val.trim()) empty.push(k); });
      empty.forEach(function (k) { data.delete(k); });
      busy(true);
      var ctl = 'AbortController' in window ? new AbortController() : null;
      var timer = ctl && setTimeout(function () { ctl.abort(); }, 15000);
      fetch(f.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
        signal: ctl ? ctl.signal : undefined
      })
        .then(function (r) { return r.json().then(function (j) { return r.ok && j && j.success === true; }, function () { return false; }); })
        .then(function (ok) {
          if (!ok) throw new Error('not sent');
          busy(false); if (btn) btn.textContent = label;
          f.reset(); done();
          /* form_id stays "leadForm", the live site's value, so GA4/Ads filters keyed on it keep matching */
          if (window.gtag) window.gtag('event', 'generate_lead', { form_id: 'leadForm', form_location: hidden('form_location') || location.pathname + '#' + n, page_path: location.pathname });
        })
        .catch(function () {
          busy(false); if (btn) btn.textContent = 'Try again';
          err.innerHTML = FAIL;
        })
        .then(function () { clearTimeout(timer); });
    });
    $$('input', f).forEach(function (i) {
      i.addEventListener('input', function () {
        i.removeAttribute('aria-invalid'); f.classList.remove('bad'); err.textContent = '';
        if (btn && !btn.disabled && btn.textContent !== label) btn.textContent = label;
      });
    });
  });

  /* ---- footer year ---- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
