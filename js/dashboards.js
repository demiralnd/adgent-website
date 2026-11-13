/* /dashboards · the Dashboard / Report toggle (roving tabindex, both views in the DOM), and the
   studio stage (type → build → live → share → export).
   Everything is local state; nothing is fetched or posted. Reduced motion: no autoplay, no typing,
   every state is still reachable from the rail. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------- tabs ---- */
  var views = d.getElementById('db-views');
  if (views) {
    views.classList.add('js');
    var tabs = $$('[role=tab]', views);
    var pick = function (t, focus) {
      tabs.forEach(function (o) {
        var on = o === t;
        o.setAttribute('aria-selected', String(on));
        o.tabIndex = on ? 0 : -1;
        d.getElementById(o.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) t.focus();
    };
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { pick(t, false); });
      t.addEventListener('keydown', function (e) {
        var n = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (n === undefined) return;
        e.preventDefault();
        pick(tabs[(n + tabs.length) % tabs.length], true);
      });
    });
    pick(tabs[0], false);
  }

  /* ------------------------------------------------------------ studio ---- */
  var st = d.getElementById('studio');
  if (st) {
    var typeEl = $('[data-type]', st), full = typeEl.textContent;
    var statusEl = $('[data-status]', st), out = $('.db-out', st);
    var blocks = $$('.db-b, .db-more', st);
    var gos = $$('[data-go]');
    var replay = $('.db-replay');
    var timers = [];
    var STATUS = {
      1: 'Built in 88 s · 19 blocks',
      2: 'Live · every block stamped with its time',
      3: 'Shared · snapshot frozen Sep 30, 02:19 AM',
      4: 'PDF ready · monday-board.pdf'
    };
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var clear = function () { timers.forEach(clearTimeout); timers = []; st.classList.remove('is-typing', 'is-build'); };
    var say = function (t) { statusEl.textContent = t; };

    function setStep(n) {
      st.setAttribute('data-step', n);
      gos.forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-go') === n)); });
      out.setAttribute('aria-hidden', String(n < 3));
      say(STATUS[n]);
    }
    function settle() {
      typeEl.textContent = full;
      blocks.forEach(function (b) { b.classList.add('on'); });
    }

    function build(done, replayPrompt) {
      clear();
      setStep(1);
      st.classList.add('is-build');
      blocks.forEach(function (b) { b.classList.remove('on'); });
      say('Reading the request');
      var i = 0, t = replayPrompt ? 0 : 120;
      if (replayPrompt) {
        st.classList.add('is-typing');
        typeEl.textContent = '';
        while (i < full.length) {
          i = Math.min(full.length, i + 4);
          (function (k) { later(function () { typeEl.textContent = full.slice(0, k); }, t); })(i);
          t += 18;
        }
      } else {
        typeEl.textContent = full;
      }
      t += replayPrompt ? 260 : 120;
      later(function () { st.classList.remove('is-typing'); say('Building · 0 of 19 blocks'); }, t);
      blocks.forEach(function (b, k) {
        t += replayPrompt ? 220 : 150;
        later(function () {
          b.classList.add('on');
          say('Building · ' + Math.round((k + 1) / blocks.length * 19) + ' of 19 blocks');
        }, t);
      });
      later(function () { st.classList.remove('is-build'); say(STATUS[1]); if (done) done(); }, t + 320);
    }

    function autoplay(firstView) {
      if (replay) replay.hidden = true;
      build(function () {
        later(function () { setStep(2); }, 1500);
        later(function () { setStep(3); }, 4300);
        later(function () { setStep(4); }, 6900);
        later(function () { if (replay) replay.hidden = false; }, 7800);
      }, !firstView);
    }

    gos.forEach(function (b) {
      b.addEventListener('click', function () {
        var n = +b.getAttribute('data-go');
        clear();
        if (replay) replay.hidden = false;
        if (n === 1 && !still) { build(null, true); return; }
        settle();
        setStep(n);
      });
    });
    if (replay) replay.addEventListener('click', function () { if (still) { settle(); setStep(1); } else autoplay(false); });

    if (still || !('IntersectionObserver' in window)) {
      settle(); setStep(2);
      if (replay && !still) replay.hidden = false;
    } else {
      /* hold the empty prompt until the stage is in view, then play once */
      typeEl.textContent = '';
      st.classList.add('is-build');
      blocks.forEach(function (b) { b.classList.remove('on'); });
      say('Waiting for a request');
      var sio = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        sio.disconnect();
        autoplay(true);
      }, { threshold: .3 });
      sio.observe(st);
    }
  }
})();
