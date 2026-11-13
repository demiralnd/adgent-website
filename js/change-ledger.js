/* /change-ledger · the round trip in the hero.
   0: one row written, nothing drafted · 1: the agent drafted the inverse, waiting for approval ·
   2: approved, the put-back is its own row. Without script the finished trip shows statically. */
(function () {
  'use strict';
  var trip = document.querySelector('.cl-trip');
  if (!trip) return;
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var live = trip.querySelector('[data-cl-live]');
  var revert = trip.querySelector('[data-cl="revert"]');
  var demoToggle = trip.querySelector('[data-cl-demo]');
  var timers = [];
  var demoRunning = false;
  function set(state, msg, focusSel) {
    trip.setAttribute('data-state', state);
    revert.disabled = state !== '0';
    if (msg && live) live.textContent = msg;
    if (focusSel) {
      var el = trip.querySelector(focusSel);
      if (el) {
        el.focus({ preventScroll: true });
      }
    }
  }
  function later(fn, delay) { timers.push(setTimeout(fn, delay)); }

  function demoLabel(text, running) {
    if (!demoToggle) return;
    demoToggle.classList.toggle('is-running', running);
    demoToggle.querySelector('span').textContent = text;
    demoToggle.setAttribute('aria-label', text);
    demoToggle.setAttribute('aria-pressed', String(running));
  }

  function clearDemo() {
    timers.forEach(clearTimeout);
    timers = [];
    demoRunning = false;
    trip.classList.remove('is-demo');
  }

  function finishDemo() {
    clearDemo();
    set('0');
    trip.classList.add('is-ready');
    demoLabel('Replay round trip', false);
  }

  function stopDemo() {
    clearDemo();
    set('0');
    demoLabel('Preview round trip', false);
  }

  function playDemo() {
    clearDemo();
    trip.classList.remove('is-ready');
    trip.classList.add('is-demo');
    demoRunning = true;
    set('0');
    demoLabel('Stop preview', true);
    if (still) {
      set('1', 'The exact inverse is ready from this ledger row.');
      clearDemo();
      demoLabel('Replay round trip', false);
      return;
    }
    later(function () { set('1'); }, 900);
    later(function () { set('2'); }, 2200);
    later(finishDemo, 3800);
  }


  set('0');

  trip.addEventListener('click', function (e) {
    if (e.target.closest('[data-cl-demo]')) {
      if (demoRunning) stopDemo();
      else playDemo();
      return;
    }
    if (demoRunning) stopDemo();
    trip.classList.remove('is-ready');
    var b = e.target.closest('[data-cl]');
    if (!b || b.disabled) return;
    var a = b.getAttribute('data-cl');
    if (a === 'revert') set('1', 'The agent read the row and prepared the exact inverse.', '[data-cl="approve"]');
    else if (a === 'skip') set('0', 'Original state kept.', '[data-cl="revert"]');
    else if (a === 'approve') set('2', 'The inverse executed at 22:33:54 and landed on the ledger as its own row.', '[data-cl="replay"]');
    else if (a === 'replay') set('0', 'Back to the original row.', '[data-cl="revert"]');
  });

  if (demoToggle && 'IntersectionObserver' in window && !still) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      playDemo();
    }, { threshold: .45 });
    observer.observe(trip);
  }
})();
