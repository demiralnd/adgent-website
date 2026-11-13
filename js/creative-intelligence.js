/* /creative-intelligence · floating creatives (gentle drift, reads open on hover/focus/tap),
   the views tabs, and the motion piece (pause control, reduced motion, offscreen pause). */
(function () {
  'use strict';
  var d = document;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = matchMedia('(min-width:1101px)');
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };

  /* ---------------------------------------------------- floating creatives */
  var stage = d.querySelector('.ci-stage');
  if (stage) {
    var crs = $$('.ci-cr', stage);
    var pinned = null;

    var setOpen = function (cr, on) {
      cr.classList.toggle('is-open', on);
      cr.querySelector('.ci-cr-b').setAttribute('aria-expanded', on ? 'true' : 'false');
    };
    var closeAll = function (except) {
      crs.forEach(function (c) { if (c !== except && c.classList.contains('is-open')) setOpen(c, false); });
      if (pinned && pinned !== except) pinned = null;
    };

    /* narrow: each card shows Hook + Concept; a "Full read" toggle opens the rest */
    crs.forEach(function (cr) {
      var rd = cr.querySelector('.ci-read');
      var mb = d.createElement('button');
      mb.type = 'button';
      mb.className = 'ci-more';
      mb.setAttribute('aria-controls', rd.id);
      mb.setAttribute('aria-expanded', 'false');
      mb.innerHTML = '<span>Full read</span><svg viewBox="0 0 12 8" aria-hidden="true"><path d="M1 2l5 4 5-4"/></svg>';
      mb.addEventListener('click', function () {
        var on = !cr.classList.contains('is-full');
        cr.classList.toggle('is-full', on);
        mb.setAttribute('aria-expanded', on ? 'true' : 'false');
        mb.firstChild.textContent = on ? 'Less' : 'Full read';
      });
      rd.after(mb);
      cr.classList.add('is-col');
    });

    /* wide: reads open on demand on hover / focus / tap */
    var applyMode = function () {
      crs.forEach(function (cr) {
        var b = cr.querySelector('.ci-cr-b');
        if (wide.matches) {
          b.removeAttribute('tabindex');
          b.setAttribute('aria-controls', cr.querySelector('.ci-read').id);
          b.setAttribute('aria-expanded', cr.classList.contains('is-open') ? 'true' : 'false');
        } else {
          cr.classList.remove('is-open');
          b.setAttribute('tabindex', '-1');
          b.removeAttribute('aria-expanded');
          b.removeAttribute('aria-controls');
        }
      });
      pinned = null;
    };
    applyMode();
    wide.addEventListener('change', function () { applyMode(); drift(); });

    crs.forEach(function (cr) {
      var b = cr.querySelector('.ci-cr-b');
      cr.addEventListener('pointerenter', function (e) {
        if (!wide.matches || e.pointerType !== 'mouse') return;
        closeAll(cr); setOpen(cr, true);
      });
      cr.addEventListener('pointerleave', function (e) {
        if (!wide.matches || e.pointerType !== 'mouse' || pinned === cr) return;
        if (!cr.contains(d.activeElement)) setOpen(cr, false);
      });
      cr.addEventListener('focusin', function () {
        if (!wide.matches) return;
        closeAll(cr); setOpen(cr, true);
      });
      cr.addEventListener('focusout', function (e) {
        if (!wide.matches || cr.contains(e.relatedTarget) || pinned === cr) return;
        setOpen(cr, false);
      });
      b.addEventListener('click', function () {
        if (!wide.matches) return;
        if (pinned === cr) { pinned = null; setOpen(cr, false); return; }
        closeAll(cr); pinned = cr; setOpen(cr, true);
      });
    });
    d.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var open = crs.filter(function (c) { return c.classList.contains('is-open'); })[0];
      closeAll(null); pinned = null;
      if (open && open.contains(d.activeElement)) open.querySelector('.ci-cr-b').blur();
    });
    d.addEventListener('pointerdown', function (e) {
      if (pinned && !pinned.contains(e.target)) { setOpen(pinned, false); pinned = null; }
    });

    /* drift: transform-only parallax while the stage is on screen */
    var speeds = crs.map(function (c) { return parseFloat(c.getAttribute('data-drift')) || 0; });
    var onScreen = false, raf = 0;
    var drift = function () {
      raf = 0;
      if (still || !wide.matches) { crs.forEach(function (c) { c.style.transform = ''; }); return; }
      var r = stage.getBoundingClientRect();
      var off = r.top + r.height / 2 - innerHeight / 2;
      crs.forEach(function (c, i) {
        var y = Math.max(-90, Math.min(90, off * speeds[i]));
        c.style.transform = 'translate3d(0,' + y.toFixed(1) + 'px,0)';
      });
    };
    var queue = function () { if (onScreen && !raf) raf = requestAnimationFrame(drift); };
    if (!still && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { onScreen = es[0].isIntersecting; queue(); }, { rootMargin: '200px 0px' }).observe(stage);
      addEventListener('scroll', queue, { passive: true });
      addEventListener('resize', queue);
    }
  }

  /* --------------------------------------------------------------- views tabs */
  var tabs = $$('.ci-tabs [role=tab]');
  var select = function (tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      d.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, n = tabs.length, j = -1;
      if (k === 'ArrowRight') j = (i + 1) % n;
      else if (k === 'ArrowLeft') j = (i - 1 + n) % n;
      else if (k === 'Home') j = 0;
      else if (k === 'End') j = n - 1;
      if (j < 0) return;
      e.preventDefault();
      select(tabs[j], true);
    });
  });

  /* ------------------------------------------------------------- motion piece
     Nothing downloads until the frame is near the viewport: preload="none", the poster is set
     from data-poster on approach, and playback starts only while a quarter of it is on screen.
     Reduced motion: poster only, the button plays it. */
  var v = d.querySelector('.ci-video');
  if (v) {
    var fr = v.closest('.ci-vid-fr');
    var pp = fr.querySelector('.ci-vid-pp');
    var userPaused = still;
    var sync = function () {
      var paused = v.paused;
      pp.classList.toggle('is-paused', paused);
      pp.setAttribute('aria-label', paused ? 'Play the video' : 'Pause the video');
    };
    var poster = function () {
      var p = v.getAttribute('data-poster');
      if (p) { v.poster = p; v.removeAttribute('data-poster'); }
    };
    var play = function () { poster(); var p = v.play(); if (p && p.catch) p.catch(function () {}); };
    var off = function () { fr.classList.add('is-off'); };
    v.addEventListener('play', sync);
    v.addEventListener('pause', sync);
    pp.addEventListener('click', function () {
      if (v.paused) { userPaused = false; play(); }
      else { userPaused = true; v.pause(); }
    });
    var srcs = $$('source', v);
    if (srcs.length) srcs[srcs.length - 1].addEventListener('error', off);
    v.addEventListener('error', off);
    if ('IntersectionObserver' in window) {
      var near = new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) { poster(); near.disconnect(); }
      }, { rootMargin: '400px 0px' });
      near.observe(fr);
      new IntersectionObserver(function (es) {
        var e = es[0];
        if (!e.isIntersecting) { if (!v.paused) v.pause(); }
        else if (!userPaused && v.paused) play();
      }, { threshold: 0.25 }).observe(fr);
    } else {
      poster();
      if (!userPaused) play();
    }
    sync();
  }
})();
