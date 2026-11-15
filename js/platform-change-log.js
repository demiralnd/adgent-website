/* /platform-change-log · the example board in the hero.
   Pick a change on the left; the right panel shows what was done and what it led to, from daily
   results (an inline SVG chart drawn at the panel's real width). Filter by who made the change.
   Values are illustrative except event `a`, a real approved write (18 Aug 2026) that was put back
   38 s later, so it has no daily result and no chart. The source line under the board says so. On
   one-column layouts the panel sits below the log, so a pick brings it into view. */
(function () {
  'use strict';
  var board = document.querySelector('.pcl-board');
  if (!board) return;

  var DAYS = ['Sep 30', 'Oct 1', 'Oct 2', 'Oct 3', 'Oct 4', 'Oct 5', 'Oct 6', 'Oct 7', 'Oct 8', 'today'];
  var ARROW = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>';
  var EV = {
    a: { when: 'Aug 18 · 22:42 · Adgent, owner: you', what: 'Daily budget, Search campaign: $30.99 → $34.09',
      metric: 'No daily result: the change was put back 38 seconds later',
      delta: [['Daily budget', '$30.99', '$34.09'], ['After the put-back', '$34.09', '$30.99']],
      read: 'A test on a live account. The budget moved from $30.99 to $34.09 and was put back 38 seconds later as its own row. Both rows are in the <a href="/change-ledger">Change Ledger</a>. No day ran on the new budget, so there is no result to read.' },
    b: { when: 'Oct 8 · 21:05 · an automated rule on Meta', what: 'Ad status, “UGC hook 03”: Active → Paused',
      metric: 'Cost per purchase, the ad set it runs in', money: true, at: 8.88,
      series: [24.1, 23.6, 25.0, 24.4, 23.9, 24.8, 24.2, 25.1, 26.0],
      delta: [['Cost per purchase', '$24.70', null], ['Ads running in the ad set', '4', '3']],
      read: 'One partial day so far. Tomorrow\'s read is the first that can show what the pause did to the ad set.' },
    c: { when: 'Oct 8 · 16:20 · a person in Google Ads', what: 'Bid strategy, brand search: Max conversions → Target CPA $6',
      metric: 'Cost per conversion, brand search', money: true, at: 8.68,
      series: [6.1, 5.8, 6.3, 6.0, 5.9, 6.2, 6.0, 6.1, 6.4],
      delta: [['Cost per conversion', '$6.10', null]],
      read: 'Too early for a new bid strategy. The change is on record with who made it, so when the number moves, the reason is already next to it.' },
    d: { when: 'Oct 6 · 17:58 · a person in Ads Manager', what: 'Daily budget, spring sale campaign: $120.00 → $20.00',
      metric: 'Spend per day, spring sale campaign', money: true, at: 6.75,
      series: [117, 121, 116, 119, 122, 118, 94, 21, 20],
      delta: [['Spend per day', '$120', '$21'], ['Purchases per day', '10', '2'], ['Cost per purchase', '$12.00', '$10.50']],
      read: 'Spend fell to about a sixth, and purchases with it. Cost per purchase barely moved: the campaign got less to spend, the ads did not get worse. If the cut was not deliberate, Adgent can prepare the exact budget restoration from the recorded before-state.' },
    e: { when: 'Oct 4 · 03:14 · auto-applied by Google Ads', what: 'Keyword match type, generic search, 14 keywords: Phrase → Broad',
      metric: 'Cost per conversion, generic search', money: true, at: 4.13,
      series: [18.2, 17.9, 18.4, 18.1, 21.6, 22.9, 23.4, 22.8, 23.1],
      delta: [['Clicks per day', '212', '293'], ['Conversions per day', '11.7', '11.8'], ['Cost per conversion', '$18.13', '$23.05']],
      read: 'Clicks rose 38% after broad match went in; conversions did not. Each conversion now costs about $4.90 more. The platform applied it at 03:14, not a person.' },
    f: { when: 'Oct 3 · 11:47 · actor not reported', what: 'Audience, lookalike 2% ad set: no before or after reported',
      metric: 'Cost per purchase, lookalike 2% ad set', money: true, at: 3.49,
      series: [14.2, 14.6, 13.9, 14.4, 14.1, 14.5, 14.0, 14.3, 14.2],
      delta: [['Cost per purchase', '$14.23', '$14.22']],
      read: 'The platform did not say who made this or what it was before, and the record shows that gap instead of guessing. Cost per purchase held steady: nothing to decide.' }
  };

  var $ = function (s, c) { return (c || board).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || board).querySelectorAll(s)); };
  var f = function (k) { return $('[data-f="' + k + '"]'); };
  var live = $('[data-pcl-live]');
  var box = f('chart');
  var demoToggle = $('[data-pcl-demo]');
  var demoTimers = [];
  var demoRunning = false;
  var cur = 'd';

  function nice(v) {
    var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p;
    return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
  }
  function money(v, hi) { return '$' + (hi >= 20 ? Math.round(v) : v.toFixed(v % 1 ? 1 : 0)); }

  function draw(ev) {
    box.hidden = !ev.series;
    var foot = $('.pcl-foot');
    if (foot) foot.hidden = !ev.series;
    if (!ev.series) { box.innerHTML = ''; return; }
    var W = Math.max(280, Math.round(box.clientWidth || 520));
    var H = W < 460 ? 168 : 196, L = 42, R = 6, T = 18, B = 26;
    var n = DAYS.length, w = (W - L - R) / n;
    var hi = nice(Math.max.apply(null, ev.series) * 1.18);
    var y = function (v) { return T + (H - T - B) * (1 - v / hi); };
    var x = function (i) { return L + (i + 0.5) * w; };
    var pts = ev.series.map(function (v, i) { return x(i).toFixed(1) + ' ' + y(v).toFixed(1); });
    var line = 'M' + pts.join('L');
    var base = y(0).toFixed(1);
    var area = line + 'L' + x(ev.series.length - 1).toFixed(1) + ' ' + base + 'L' + x(0).toFixed(1) + ' ' + base + 'Z';
    var mx = L + ev.at * w, endX = L + 9 * w;
    var s = '';
    [0, hi / 2, hi].forEach(function (g) {
      s += '<line class="pcl-gl" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(g).toFixed(1) + '" y2="' + y(g).toFixed(1) + '"/>';
      s += '<text class="pcl-ax" x="' + (L - 8) + '" y="' + (y(g) + 4).toFixed(1) + '" text-anchor="end">' + money(g, hi) + '</text>';
    });
    s += '<rect class="pcl-today" x="' + endX.toFixed(1) + '" y="' + T + '" width="' + w.toFixed(1) + '" height="' + (H - T - B) + '" rx="6"/>';
    if (mx < endX) s += '<rect class="pcl-after" x="' + mx.toFixed(1) + '" y="' + T + '" width="' + (endX - mx).toFixed(1) + '" height="' + (H - T - B) + '"/>';
    s += '<path class="pcl-ar" d="' + area + '"/><path class="pcl-ln" d="' + line + '"/>';
    var last = ev.series.length - 1;
    s += '<circle class="pcl-pt" cx="' + x(last).toFixed(1) + '" cy="' + y(ev.series[last]).toFixed(1) + '" r="3.5"/>';
    s += '<line class="pcl-mkl" x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + (T - 2) + '" y2="' + (H - B) + '"/>';
    s += '<circle class="pcl-mkd" cx="' + mx.toFixed(1) + '" cy="' + (T - 2) + '" r="4.5"/>';
    var right = mx > W - 70;
    s += '<text class="pcl-mkt" x="' + (right ? mx - 9 : mx + 9).toFixed(1) + '" y="' + (T + 2) + '" text-anchor="' + (right ? 'end' : 'start') + '">change</text>';
    var step = w < 34 ? 3 : w < 52 ? 2 : 1;
    DAYS.forEach(function (d, i) {
      if (i % step && i !== n - 1) return;
      if (step > 1 && i === n - 2) return;
      s += '<text class="pcl-ax" x="' + x(i).toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + d + '</text>';
    });
    var day = DAYS[Math.floor(ev.at)] === 'today' ? 'today' : DAYS[Math.floor(ev.at)];
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' +
      ev.metric + ', daily from Sep 30 to Oct 8. The change is marked on ' + day + '.">' + s + '</svg>';
  }

  function show(id, announce) {
    var ev = EV[id]; if (!ev) return;
    cur = id;
    $$('.pcl-ev').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-ev') === id)); });
    f('when').textContent = ev.when;
    f('what').textContent = ev.what;
    f('metric').textContent = ev.metric;
    f('delta').innerHTML = ev.delta.map(function (r) {
      return '<div><dt>' + r[0] + '</dt><dd><s>' + r[1] + '</s>' + ARROW + (r[2] === null ? '<b class="pcl-na">not in yet</b>' : '<b>' + r[2] + '</b>') + '</dd></div>';
    }).join('');
    f('read').innerHTML = ev.read;
    draw(ev);
    if (announce && live) live.textContent = 'Showing what the change on ' + ev.when.split(' · ').slice(0, 2).join(' at ') + ' led to.';
  }
  function allChanges() {
    $$('.pcl-filter button').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.getAttribute('data-f') === 'all'));
    });
    $$('.pcl-list li').forEach(function (li) { li.hidden = false; });
    $$('.pcl-gh').forEach(function (heading) { heading.hidden = false; });
    $('.pcl-empty').hidden = true;
  }

  function demoLabel(text, running) {
    if (!demoToggle) return;
    demoToggle.classList.toggle('is-running', running);
    demoToggle.querySelector('span').textContent = text;
    demoToggle.setAttribute('aria-label', text);
    demoToggle.setAttribute('aria-pressed', String(running));
  }

  function clearDemo() {
    demoTimers.forEach(clearTimeout);
    demoTimers = [];
    demoRunning = false;
    board.classList.remove('is-demo');
  }

  function finishDemo() {
    clearDemo();
    allChanges();
    show('d', false);
    demoLabel('Replay the read', false);
  }

  function stopDemo() {
    clearDemo();
    demoLabel('Preview the read', false);
  }

  function playDemo() {
    clearDemo();
    allChanges();
    board.classList.add('is-demo');
    demoRunning = true;
    demoLabel('Stop preview', true);
    show('b', false);
    if (still.matches) {
      show('e', true);
      clearDemo();
      demoLabel('Replay the read', false);
      return;
    }
    demoTimers.push(setTimeout(function () { show('c', false); }, 1100));
    demoTimers.push(setTimeout(function () { show('e', false); }, 2300));
    demoTimers.push(setTimeout(function () { show('d', false); }, 3500));
    demoTimers.push(setTimeout(finishDemo, 4700));
  }


  var narrow = matchMedia('(max-width: 68.75em)');
  var still = matchMedia('(prefers-reduced-motion: reduce)');
  board.addEventListener('click', function (e) {
    if (e.target.closest('[data-pcl-demo]')) {
      if (demoRunning) stopDemo();
      else playDemo();
      return;
    }
    if (demoRunning) stopDemo();
    var b = e.target.closest('.pcl-ev');
    if (b) {
      show(b.getAttribute('data-ev'), true);
      var panel = $('.pcl-cause');
      if (narrow.matches && panel && panel.getBoundingClientRect().top > innerHeight * 0.6) {
        panel.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' });
      }
      return;
    }
    var fb = e.target.closest('.pcl-filter button');
    if (!fb) return;
    var who = fb.getAttribute('data-f');
    $$('.pcl-filter button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === fb)); });
    var first = null, any = false;
    $$('.pcl-list li').forEach(function (li) {
      var on = who === 'all' || li.getAttribute('data-who') === who;
      li.hidden = !on;
      if (on) { any = true; if (!first) first = li.querySelector('.pcl-ev').getAttribute('data-ev'); }
    });
    $$('.pcl-gh').forEach(function (h) {
      var list = h.nextElementSibling;
      h.hidden = !list || !list.querySelector('li:not([hidden])');
    });
    $('.pcl-empty').hidden = any;
    var sel = $('.pcl-ev[data-ev="' + cur + '"]');
    if (first && (!sel || sel.closest('li').hidden)) show(first, true);
  });

  var raf = 0;
  addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { draw(EV[cur]); });
  });

  show('d', false);
  if (demoToggle && 'IntersectionObserver' in window && !still.matches) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      playDemo();
    }, { threshold: .45 });
    observer.observe(board);
  }
})();
