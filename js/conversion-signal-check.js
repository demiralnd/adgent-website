/* Conversion signal check. Ported from the live page's inline script; thresholds and logic are
   unchanged. Everything runs in the browser and nothing is sent anywhere. */
(function () {
  var plat = document.getElementById('cs-plat'), strat = document.getElementById('cs-strat'),
      conv = document.getElementById('cs-conv'), units = document.getElementById('cs-units');
  if (!plat || !strat || !conv || !units) return;
  var stratWrap = document.getElementById('cs-strat-wrap'),
      windowL = document.getElementById('cs-window'), unitL = document.getElementById('cs-unit-l');
  var out = {};
  ['cs-pct', 'cs-headline', 'cs-per', 'cs-floor', 'cs-gap', 'cs-clear', 'cs-verdict'].forEach(function (id) {
    out[id] = document.getElementById(id);
  });
  var bar = document.getElementById('cs-bar'), peek = document.getElementById('cs-peek');
  var fmt = function (v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };

  function calc() {
    var google = plat.value === 'google';
    stratWrap.hidden = google === false;
    var days = google ? 30 : 7;
    var floor = google ? (strat.value === '50' ? 50 : 30) : 50;
    var unit = google ? 'campaign' : 'ad set';
    windowL.textContent = 'in the last ' + days + ' days';
    unitL.textContent = google ? 'Campaigns' : 'Ad sets';
    var total = parseFloat(conv.value); if (!isFinite(total) || total < 0) total = 0;
    var n = Math.floor(parseFloat(units.value)); if (!isFinite(n) || n < 1) n = 1;
    var per = total / n;
    var pct = (per / floor) * 100;
    var could = Math.floor(total / floor);
    out['cs-per'].textContent = fmt(per, 1);
    out['cs-floor'].textContent = String(floor);
    out['cs-gap'].textContent = per >= floor ? 'none' : fmt(floor - per, 1);
    out['cs-clear'].textContent = String(could);
    out['cs-pct'].textContent = fmt(pct, 0) + '%';
    if (peek) peek.textContent = fmt(pct, 0) + '%';
    /* the meter runs from 0 to one and a half floors; the tick marks the floor */
    if (bar) {
      bar.style.setProperty('--v', String(Math.min(pct, 150) / 150));
      bar.setAttribute('data-state', pct >= 100 ? 'ok' : pct >= 50 ? 'warn' : 'stop');
    }
    out['cs-headline'].textContent = fmt(per, 1) + ' conversions per ' + unit + ' per ' + days + ' days, against '
      + (google ? 'Google\u2019s published figure of ' : 'Meta\u2019s stated minimum of ') + floor + '.';
    var state, verdict;
    if (total <= 0) {
      state = 'warn';
      verdict = 'Enter the conversions the account recorded in the window to get a reading.';
    } else if (pct >= 100) {
      state = 'ok';
      verdict = 'Above the floor. The optimizer has enough examples to learn from, which is a different question from whether the numbers are correct (see below).';
    } else if (pct >= 50) {
      state = 'warn';
      verdict = 'Thin. Each ' + unit + ' sits at ' + fmt(pct, 0) + '% of the published figure, so the cost per result will swing on small numbers. '
        + (could >= 1 && could < n
            ? 'Consolidating to ' + could + ' would clear it.'
            : 'Consolidating will not fix it: the account produced ' + fmt(total, 0) + ' in the window against a floor of ' + floor + '.');
    } else {
      state = 'stop';
      verdict = 'Below the floor. '
        + (could >= 1 && could < n
            ? 'Consolidate to ' + could + ' ' + unit + (could > 1 ? 's' : '') + ' or optimize'
            : 'Consolidating will not reach it at this volume, so optimize')
        + ' toward an event higher in the funnel that clears ' + floor
        + ', and treat the current cost per result as unstable rather than as a verdict.';
    }
    out['cs-verdict'].setAttribute('data-state', state);
    out['cs-verdict'].textContent = verdict;
  }

  [plat, strat, conv, units].forEach(function (n) { n.addEventListener('input', calc); n.addEventListener('change', calc); });
  var form = document.getElementById('csc');
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  /* reset restores the value attributes after the event; recompute on the next tick */
  form.addEventListener('reset', function () { setTimeout(calc, 0); });
  calc();

  /* on a phone the result sits below the inputs: a small bar carries it while the inputs are on screen */
  var peekBar = document.querySelector('.tl-peek'), res = document.getElementById('cs-out');
  if (peekBar && res && 'IntersectionObserver' in window) {
    var formIn = false, resIn = false;
    var sync = function () { peekBar.classList.toggle('on', formIn && !resIn); };
    new IntersectionObserver(function (e) { formIn = e[0].isIntersecting; sync(); }).observe(form);
    new IntersectionObserver(function (e) { resIn = e[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(res);
  }
})();
