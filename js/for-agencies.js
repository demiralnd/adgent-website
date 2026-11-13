/* /for-agencies · the approval stage.
   Approve stamps the card, flies it into the Change Ledger and opens a Being measured entry.
   Skip sends it to the back. Revert with agent puts the exact inverse on top of the queue.
   Results are illustrative and revealed on request. Local state only; reduced motion is instant.
   Once, when the stage enters view, a preview walks review → approval → ledger → measurement
   without mutating the queue. Any use of the stage cancels it; the control can replay it. */
(function () {
  'use strict';
  var d = document;
  var stage = d.getElementById('fa-stage');
  if (!stage) return;
  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  var tabsMQ = matchMedia('(max-width:960px)');

  var deck = $('.fa-deck', stage), end = $('.fa-end', deck), lg = $('.fa-lg', stage);
  var fxList = $('.fa-fx-list', stage), status = $('.fa-status', stage);
  var mOut = $('[data-fx="m"]', stage), pOut = $('[data-fx="p"]', stage);
  var tabs = $$('[role=tab]', stage), panels = $$('[role=tabpanel]', stage);

  var MARK = '<svg viewBox="0 0 170 170" aria-hidden="true"><path d="M14 140 L85 6 L156 140 L128 140 L85 58 L42 140 Z"/><path d="M50 140 L85 72 L120 140 L96 140 L85 118 L74 140 Z"/></svg>';
  var ARROW16 = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  var ARROW18 = '<svg viewBox="0 0 18 18" aria-hidden="true"><path d="M3 9h12M11 5l4 4-4 4"/></svg>';
  var REV = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.5-3.5L3 6"/><path d="M3 2.5V6h3.5"/></svg>';
  var STAMP = '<span class="fa-stamp" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M4 10.5l4 4 8-9"/></svg>Approved</span>';
  var POS = ['none', 'translateY(12px) scale(.96)', 'translateY(24px) scale(.92)', 'translateY(24px) scale(.92)'];

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var money = function (n) { return Math.round(n).toLocaleString('en-US'); };
  var clock = function () { var t = new Date(); return ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2); };

  var TPL = $$('.fa-card', deck).map(function (c) { return c.outerHTML; });
  var LG = lg.innerHTML, FX = fxList.innerHTML;
  var M0 = parseFloat(mOut.textContent) || 0;
  var order = [], busy = false, measured = M0, pending = 0, skipped = 0;

  var say = function (t) { status.textContent = t; };

  function setN(key, v, bump) {
    $$('[data-n="' + key + '"]', stage).forEach(function (el) {
      el.textContent = v;
      if (bump && !still.matches) { el.classList.remove('fa-bump'); void el.offsetWidth; el.classList.add('fa-bump'); }
    });
  }
  function recount(bump) {
    setN('q', order.length, bump);
    $('.fa-sk', stage).textContent = skipped ? ' · ' + skipped + ' skipped' : '';
    setN('l', $$('.fa-row', lg).length, bump);
    setN('f', $$('.fa-fx-i', fxList).length, bump);
  }
  function tween(el, from, to) {
    if (still.matches || from === to) { el.textContent = money(to); return; }
    var t0 = performance.now(), dur = 650;
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = money(from + (to - from) * e);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }
  function setMoney(m, p) {
    tween(mOut, measured, m); tween(pOut, pending, p);
    measured = m; pending = p;
  }

  /* ---- deck geometry: every card shares the tallest height so the deck never jumps ---- */
  function fit() {
    if (!deck.offsetParent) return;
    var cards = $$('.fa-card', deck); if (!cards.length) return;
    cards.forEach(function (c) { c.style.height = 'auto'; });
    var h = Math.max.apply(null, cards.map(function (c) { return c.offsetHeight; }));
    cards.forEach(function (c) { c.style.height = ''; });
    stage.style.setProperty('--h', Math.ceil(tabsMQ.matches ? h : Math.max(h, 360)) + 'px');
  }
  function layout() {
    order.forEach(function (c, i) {
      c.setAttribute('data-pos', Math.min(i, 3));
      c.inert = i !== 0;
      if (i === 0) c.removeAttribute('aria-hidden'); else c.setAttribute('aria-hidden', 'true');
    });
    deck.classList.toggle('is-empty', !order.length);
  }
  function build() {
    $$('.fa-card', deck).forEach(function (c) { c.remove(); });
    end.insertAdjacentHTML('beforebegin', TPL.join(''));
    order = $$('.fa-card', deck);
    lg.innerHTML = LG; fxList.innerHTML = FX;
    busy = false; skipped = 0;
    measured = M0; pending = 0; mOut.textContent = money(M0); pOut.textContent = '0';
    layout(); fit(); recount();
  }

  /* ---- tabs (narrow screens): queue · ledger · effect ---- */
  function select(i, focus) {
    tabs.forEach(function (t, k) {
      var on = k === i;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panels[k].classList.toggle('on', on);
    });
    if (focus) tabs[i].focus();
    if (i === 0) fit();
  }
  function mode() {
    stage.classList.toggle('is-tabs', tabsMQ.matches);
    if (tabsMQ.matches) select(0); else panels.forEach(function (p) { p.classList.add('on'); });
    fit();
  }
  var tabOn = function (i) { return !tabsMQ.matches || tabs[i].getAttribute('aria-selected') === 'true'; };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(i); });
    t.addEventListener('keydown', function (e) {
      var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (e.key === 'Home') { e.preventDefault(); select(0, true); return; }
      if (e.key === 'End') { e.preventDefault(); select(tabs.length - 1, true); return; }
      if (k) { e.preventDefault(); select((i + k + tabs.length) % tabs.length, true); }
    });
  });

  /* ---- ledger rows and Being measured entries ---- */
  function rowFor(v, back) {
    var li = d.createElement('li');
    li.className = 'fa-row';
    li.setAttribute('data-id', v.id);
    ['client', 'plat', 'change', 'before', 'after'].forEach(function (k) { li.setAttribute('data-' + k, v[k]); });
    li.innerHTML = '<div class="fa-row-in">' +
      '<p class="fa-row-m"><time>' + clock() + '</time><span class="fa-who"><i>' + MARK + '</i>Adgent · approved by you</span></p>' +
      '<p class="fa-row-c"><b>' + esc(back ? 'Put back: ' + v.change.toLowerCase() : v.change) + '</b><small>' + esc(v.client + ' · ' + v.plat) + '</small></p>' +
      '<p class="lg-d"><s>' + esc(v.before) + '</s>' + ARROW16 + '<b>' + esc(v.after) + '</b></p>' +
      (back ? '<span class="tag grey">Inverse, approved</span>'
            : '<button class="pill line fa-rv" type="button">' + REV + '<span>Revert with agent</span></button>') +
      '</div>';
    return li;
  }
  function fxFor(v) {
    var li = d.createElement('li');
    li.className = 'fa-fx-i';
    ['for', 'est', 'val', 'res'].forEach(function (k) { li.setAttribute('data-' + k, k === 'for' ? v.id : v[k]); });
    li.innerHTML = '<p class="fa-fx-h"><b>' + esc(v.client) + '</b><span>' + esc(v.change + ' · ' + v.before + ' → ' + v.after) + '</span></p>' +
      '<div class="fa-tl" aria-hidden="true"><span>14 days before</span><i></i><span>14 days after</span></div>' +
      '<p class="fa-fx-s"><span class="cls meas"><i></i>Being measured</span><span>first result in 14 days · est. $' + money(v.est) + ' / mo</span></p>' +
      '<button class="fa-fx-go" type="button">Show the result</button>';
    return li;
  }
  function effect(v, back) {
    if (back) {
      var it = $('.fa-fx-i[data-for="' + v.src + '"]', fxList);
      if (!it) return;
      var done = it.classList.contains('is-done');
      if (!done) setMoney(measured, Math.max(0, pending - (parseFloat(it.getAttribute('data-est')) || 0)));
      it.classList.add('is-back');
      $$('.fa-fx-s, .fa-fx-go', it).forEach(function (n) { n.remove(); });
      it.insertAdjacentHTML('beforeend', '<p class="fa-fx-r">' + (done ? 'Inverse returned to the queue after its first result.' : 'Inverse returned to the decision queue. Measurement stopped.') + '</p>');
      return;
    }
    var li = fxFor(v);
    fxList.prepend(li); fxList.scrollTop = 0;
    if (!still.matches) li.classList.add('fa-in');
    setMoney(measured, pending + (parseFloat(v.est) || 0));
  }

  function data(c) {
    var g = function (k) { return c.getAttribute('data-' + k) || ''; };
    return { id: g('id'), src: g('src'), kind: g('kind'), client: g('client'), plat: g('plat'), change: g('change'), before: g('before'), after: g('after'), est: g('est'), val: g('val'), res: g('res') };
  }

  function settle(hadFocus) {
    busy = false; recount(true);
    var f = order[0];
    if (f && hadFocus) $('[data-fa="approve"]', f).focus({ preventScroll: true });
    if (!f) { say('Queue clear. Every completed move is in the ledger and being measured.'); if (hadFocus) $('.fa-again', end).focus({ preventScroll: true }); }
  }

  function approve(c) {
    if (busy || c !== order[0]) return;
    busy = true;
    var hadFocus = c.contains(d.activeElement);
    c.classList.add('is-busy', 'is-stamped');
    var back = c.getAttribute('data-kind') === 'back';
    say(back ? 'Approved. The inverse is in the ledger as its own row.'
             : tabsMQ.matches ? 'Approved. It is in the Ledger tab with the value it replaced, and now being measured.'
                              : 'Approved. In the ledger with the value it replaced, and now being measured.');
    setTimeout(function () { fly(c, back, hadFocus); }, still.matches ? 0 : 420);
  }

  function fly(c, back, hadFocus) {
    var v = data(c), row = rowFor(v, back), today = $('.fa-rows[data-day="today"]', lg), none = $('.fa-none', today);
    if (none) none.remove();
    lg.scrollTop = 0;
    today.prepend(row);
    var target = tabOn(1) ? row : tabs[1];
    var r0 = c.getBoundingClientRect(), r1 = target.getBoundingClientRect();
    order.shift(); layout();
    var done = function () { effect(v, back); settle(hadFocus); };
    if (still.matches) { c.remove(); done(); return; }
    var g = c.cloneNode(true);
    g.removeAttribute('data-pos'); g.inert = true; g.classList.add('fa-ghost');
    g.style.left = r0.left + 'px'; g.style.top = r0.top + 'px'; g.style.width = r0.width + 'px'; g.style.height = r0.height + 'px';
    d.body.appendChild(g); c.remove();
    row.classList.add('arriving'); void row.offsetWidth;
    requestAnimationFrame(function () { row.classList.remove('arriving'); });
    var dx = r1.left - r0.left, dy = r1.top - r0.top;
    var sx = Math.max(.05, r1.width / r0.width), sy = Math.max(.05, Math.min(r1.height, 120) / r0.height);
    setTimeout(function () { g.classList.add('fade'); }, 170);
    g.animate([
      { transform: 'translate(0,0) scale(1,1) rotate(-1deg)', borderRadius: '18px', opacity: 1 },
      { transform: 'translate(' + dx * .55 + 'px,' + (dy * .55 - 36) + 'px) scale(' + (1 - (1 - sx) * .5) + ',' + (1 - (1 - sy) * .5) + ') rotate(1.5deg)', borderRadius: '16px', opacity: 1, offset: .55 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')', borderRadius: '10px', opacity: 0 }
    ], { duration: 680, easing: 'cubic-bezier(.55,0,.25,1)', fill: 'forwards' }).finished.then(function () {
      g.remove(); row.classList.add('flash'); done();
    });
  }

  function skip(c) {
    if (busy || c !== order[0]) return;
    skipped++;
    if (order.length < 2) { recount(true); say('Nothing behind it yet. It stays on top.'); return; }
    busy = true;
    var hadFocus = c.contains(d.activeElement);
    order.push(order.shift());
    var p = Math.min(order.length - 1, 3);
    layout();
    say('Skipped. It comes back after the rest.');
    if (still.matches) { settle(hadFocus); return; }
    c.animate([
      { transform: 'none', zIndex: 9, opacity: 1 },
      { transform: 'translate(0,56%) rotate(-3deg) scale(.95)', zIndex: 9, opacity: 1, offset: .42 },
      { transform: 'translate(0,56%) rotate(-3deg) scale(.95)', zIndex: 0, opacity: 1, offset: .43 },
      { transform: POS[p], zIndex: 0, opacity: p > 2 ? 0 : 1 }
    ], { duration: 620, easing: 'cubic-bezier(.45,0,.2,1)' }).finished.then(function () { settle(hadFocus); });
  }

  function revert(btn) {
    var li = btn.closest('.fa-row'); if (!li || busy) return;
    var v = data(li);
    btn.disabled = true; btn.lastChild.textContent = 'Inverse waiting in the queue';
    var html = '<article class="dc fa-card' + (still.matches ? '' : ' fa-enter') + '" data-id="r-' + esc(v.id) + '" data-kind="back" data-src="' + esc(v.id) + '"' +
      ' data-client="' + esc(v.client) + '" data-plat="' + esc(v.plat) + '" data-change="' + esc(v.change) + '" data-before="' + esc(v.after) + '" data-after="' + esc(v.before) + '">' +
      '<div class="dc-h"><span class="cls"><i></i>Put back</span><span class="dc-k">' + esc(v.client + ' · ' + v.plat) + '</span></div>' +
      '<p class="dc-v">Put the ' + esc(v.change.toLowerCase()) + ' back: the exact inverse of the logged move.</p>' +
      '<div class="dc-diff"><div><span>Current</span><s>' + esc(v.after) + '</s></div>' + ARROW18 + '<div><span>Proposed</span><b>' + esc(v.before) + '</b></div></div>' +
      '<p class="dc-why">Built by the agent from the ledger row, with the original and inverse values side by side.</p>' +
      '<div class="dc-act"><button class="pill line" type="button" data-fa="skip">Skip</button><button class="pill acc" type="button" data-fa="approve">Approve the inverse</button></div>' +
      STAMP + '</article>';
    (order[0] || end).insertAdjacentHTML('beforebegin', html);
    var c = $('.fa-card[data-id="r-' + v.id + '"]', deck);
    order.unshift(c);
    if (tabsMQ.matches) select(0);
    layout(); fit(); recount(true);
    say('The agent drafted the exact inverse. It is on top of the queue, waiting for your word.');
    if (tabsMQ.matches) deck.scrollIntoView({ block: 'center', behavior: still.matches ? 'auto' : 'smooth' });
    $('[data-fa="approve"]', c).focus({ preventScroll: true });
  }

  function result(btn) {
    var li = btn.closest('.fa-fx-i'); if (!li) return;
    var val = parseFloat(li.getAttribute('data-val')) || 0, est = parseFloat(li.getAttribute('data-est')) || 0;
    var parts = (li.getAttribute('data-res') || '{v}').split('{v}');
    li.classList.add('is-done');
    $$('.fa-fx-s, .fa-fx-go', li).forEach(function (n) { n.remove(); });
    var p = d.createElement('p');
    p.className = 'fa-fx-r'; p.tabIndex = -1;
    p.innerHTML = esc(parts[0]) + '<b class="tnum">$' + money(val) + '</b>' + esc(parts.slice(1).join(''));
    li.appendChild(p);
    p.focus({ preventScroll: true });
    setMoney(measured + val, Math.max(0, pending - est));
    say('Result: the window closed and the numbers were read.');
  }

  deck.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fa]'); if (!b) return;
    var c = b.closest('.fa-card'); if (!c) return;
    if (b.getAttribute('data-fa') === 'approve') approve(c); else skip(c);
  });
  stage.addEventListener('click', function (e) {
    var b;
    if ((b = e.target.closest('.fa-rv'))) { revert(b); return; }
    if ((b = e.target.closest('.fa-fx-go'))) { result(b); return; }
    if ((b = e.target.closest('.fa-again'))) {
      build(); say('Back to three ranked decisions.');
      var f = order[0]; if (f) $('[data-fa="approve"]', f).focus({ preventScroll: true });
    }
  });

  addEventListener('resize', fit);
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(fit);
  tabsMQ.addEventListener('change', mode);
  build();
  mode();

  /* ---- the one authored moment: review → approval gate → ledger → measurement ---- */
  var demoBox = $('.fa-demo', stage), demoToggle = $('.fa-demo-toggle', stage);
  var demoSteps = $$('.fa-demo-steps li', stage);
  var demo = { done: still.matches, running: false, anim: null, timers: [], card: null, pill: null };
  var TRY = '<span class="fa-try"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5l8.5 5.5-3.8.9-2.1 3.3z"/></svg>Try it: approve or skip</span>';
  var later = function (fn, ms) { demo.timers.push(setTimeout(fn, ms)); };

  function demoLabel(text, running) {
    if (!demoToggle) return;
    demoToggle.classList.toggle('is-running', !!running);
    $('span', demoToggle).textContent = text;
    demoToggle.setAttribute('aria-label', text);
  }
  function demoStep(name, text) {
    stage.setAttribute('data-demo-step', name);
    demoSteps.forEach(function (step) {
      if (step.getAttribute('data-demo-step') === name) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
    if (text) say(text);
  }
  function hint(on) {
    var f = order[0]; if (!f) return;
    var old = $('.fa-try', deck); if (old) old.remove();
    if (on) {
      $('.dc-act', f).insertAdjacentHTML('afterbegin', TRY);
      requestAnimationFrame(function () { var t = $('.fa-try', f); if (t) t.classList.add('on'); });
    }
    fit();
  }
  function clearDemo() {
    demo.timers.forEach(clearTimeout); demo.timers = [];
    if (demo.anim) { demo.anim.cancel(); demo.anim = null; }
    if (demo.pill) demo.pill.classList.remove('is-pressed');
    if (demo.card) demo.card.classList.remove('is-stamped', 'is-demo');
    var none = $('.fa-none', lg); if (none) none.classList.remove('flash');
    stage.removeAttribute('data-demo-step');
    demoSteps.forEach(function (step) { step.removeAttribute('aria-current'); });
    demo.card = null; demo.pill = null;
  }
  function finishDemo() {
    clearDemo();
    demo.done = true; demo.running = false;
    if (tabsMQ.matches) select(0);
    demoLabel('Replay preview', false);
    say('Try it: approve or skip. Completed moves land in the ledger and measurement queue.');
    hint(true);
  }
  function stopDemo() {
    if (!demo.running) return;
    clearDemo();
    demo.done = true; demo.running = false;
    if (tabsMQ.matches) select(0);
    demoLabel('Replay preview', false);
    say('Preview stopped. The decision card is ready to review.');
    hint(true);
  }
  function playDemo() {
    if (busy) return;
    if (!order.length) build();
    clearDemo(); hint(false);
    var c = order[0]; if (!c) return;
    var pill = $('[data-fa="approve"]', c), none = $('.fa-none', lg);
    demo.done = false; demo.running = true; demo.card = c; demo.pill = pill;
    demoLabel('Stop preview', true);
    if (tabsMQ.matches) select(0);
    demoStep('review', 'Review the finding, the current value and the proposed value.');

    if (still.matches) {
      demoStep('effect', 'The sequence stays the same: review, approve, log, then measure. Motion is reduced.');
      demo.done = true; demo.running = false;
      demoLabel('Replay preview', false);
      return;
    }

    later(function () {
      demoStep('approval', 'The change waits here. Only your approval can send it forward.');
      pill.classList.add('is-pressed');
      later(function () { c.classList.add('is-stamped'); }, 120);
      later(function () { pill.classList.remove('is-pressed'); }, 300);
    }, 900);

    later(function () {
      if (!demo.running) return;
      var target = tabsMQ.matches ? tabs[1] : (none || $('.fa-rows', lg));
      var r0 = c.getBoundingClientRect(), r1 = target.getBoundingClientRect();
      var dx = tabsMQ.matches ? Math.min(24, Math.max(-24, (r1.left - r0.left) * .5)) : (r1.left - r0.left) * .5;
      var dy = tabsMQ.matches ? -18 : (r1.top - r0.top) * .5 - 24;
      c.classList.add('is-demo');
      demo.anim = c.animate([
        { transform: 'none', offset: 0 },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.94) rotate(1.5deg)', offset: .38, easing: 'cubic-bezier(.16,1,.3,1)' },
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.94) rotate(1.5deg)', offset: .66 },
        { transform: 'none', offset: 1 }
      ], { duration: 2100, easing: 'cubic-bezier(.55,0,.25,1)' });
    }, 1600);

    later(function () {
      if (!demo.running) return;
      demoStep('ledger', 'After approval, the ledger keeps who changed it, when, and the value it replaced.');
      if (tabsMQ.matches) select(1);
      if (none) { none.classList.remove('flash'); void none.offsetWidth; none.classList.add('flash'); }
    }, 3300);

    later(function () {
      if (!demo.running) return;
      demoStep('effect', 'Then a measurement window opens. An estimate is not presented as a result.');
      if (tabsMQ.matches) select(2);
    }, 5000);

    later(finishDemo, 6800);
  }

  if (demoBox && demoToggle) {
    demoBox.hidden = false;
    demoToggle.addEventListener('click', function () { if (demo.running) stopDemo(); else playDemo(); });
    ['pointerdown', 'keydown', 'focusin'].forEach(function (ev) {
      stage.addEventListener(ev, function (e) {
        if (e.target.closest && e.target.closest('.fa-demo-toggle')) return;
        if (demo.running) stopDemo();
      }, true);
    });
    deck.addEventListener('pointerdown', function () { hint(false); }, true);
    deck.addEventListener('keydown', function () { hint(false); }, true);
    if ('IntersectionObserver' in window && !still.matches) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (entry) { return entry.isIntersecting; })) {
          io.disconnect(); playDemo();
        }
      }, { threshold: .45 });
      io.observe(stage);
    }
    still.addEventListener('change', function () { if (still.matches) stopDemo(); });
  }
})();
