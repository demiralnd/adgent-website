/* Break-even ROAS calculator. Ported from the live page's inline script; the arithmetic is
   unchanged. Everything runs in the browser and nothing is sent anywhere. */
(function () {
  var ids = ['be-aov', 'be-cogs', 'be-fees', 'be-ship', 'be-ret', 'be-profit'];
  var el = {};
  for (var i = 0; i < ids.length; i++) { el[ids[i]] = document.getElementById(ids[i]); if (!el[ids[i]]) return; }
  var out = {};
  ['be-roas', 'be-cm', 'be-margin', 'be-kept', 'be-target', 'be-verdict'].forEach(function (id) { out[id] = document.getElementById(id); });
  var peek = document.getElementById('be-peek');
  var EMPTY = '\u2013';
  var X = '\u00d7';
  var num = function (id) { return el[id].valueAsNumber; };
  var fmt = function (v, d) { return v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); };

  function calc() {
    var invalid = false;
    ids.forEach(function (id) {
      var field = el[id], valid = field.validity.valid && Number.isFinite(field.valueAsNumber);
      field.setAttribute('aria-invalid', String(!valid));
      document.getElementById(id + '-err').textContent = valid ? '' : field.max
        ? 'Enter a number from ' + field.min + ' to ' + field.max + '.'
        : 'Enter a number of ' + field.min + ' or more.';
      if (!valid) invalid = true;
    });
    if (invalid) {
      ['be-roas', 'be-cm', 'be-margin', 'be-kept', 'be-target'].forEach(function (id) { out[id].textContent = EMPTY; });
      if (peek) peek.textContent = EMPTY;
      out['be-verdict'].setAttribute('data-state', 'warn');
      out['be-verdict'].textContent = 'Correct the highlighted inputs to calculate ROAS. Results use the numbers shown in your fields.';
      return;
    }
    var aov = num('be-aov'), cogs = num('be-cogs') / 100, fees = num('be-fees') / 100,
        ship = num('be-ship'), ret = num('be-ret') / 100, profit = num('be-profit') / 100;
    var kept = 1 - ret;
    var cm = kept * (aov * (1 - cogs - fees) - ship) - ret * 2 * ship;
    var head, state, verdict;
    out['be-cm'].textContent = fmt(cm, 2);
    out['be-margin'].textContent = aov > 0 ? fmt((cm / aov) * 100, 1) + '%' : EMPTY;
    out['be-kept'].textContent = fmt(kept * 100, 0);
    if (aov <= 0) {
      head = EMPTY;
      out['be-target'].textContent = EMPTY;
      state = 'warn';
      verdict = 'Enter an average order value to get a break-even.';
    } else if (cm <= 0) {
      head = 'none';
      out['be-target'].textContent = EMPTY;
      state = 'stop';
      verdict = cm === 0
        ? 'The order leaves no contribution before ad spend. Any ad spend makes it loss-making, so no finite ROAS breaks even.'
        : 'No ROAS breaks even on these numbers. The order loses <b>' + fmt(-cm, 2) + '</b> before ad spend. Improve the contribution margin before setting a bid target.';
    } else {
      var be = aov / cm;
      head = fmt(be, 2) + X;
      var want = aov * profit;
      if (cm - want > 0) {
        var target = aov / (cm - want);
        out['be-target'].textContent = fmt(target, 2) + X;
        state = 'ok';
        verdict = 'There is room here: at a ' + fmt(profit * 100, 0) + '% profit target you need <b>' + fmt(target, 2) + X + '</b> on reported revenue, against a break-even of <b>' + fmt(be, 2) + X + '</b>.';
      } else {
        out['be-target'].textContent = 'unreachable';
        state = 'warn';
        verdict = 'Break-even is <b>' + fmt(be, 2) + X + '</b>. The order leaves <b>' + fmt(cm, 2) + '</b> before ad spend, ' + (cm === want ? 'exactly equal to' : 'less than') + ' the ' + fmt(want, 2) + ' of profit you asked to keep. No finite ROAS reaches that profit target at this margin.';
      }
    }
    out['be-roas'].textContent = head;
    if (peek) peek.textContent = head;
    out['be-verdict'].setAttribute('data-state', state);
    out['be-verdict'].innerHTML = verdict;
  }

  ids.forEach(function (id) { el[id].addEventListener('input', calc); });
  var form = document.getElementById('beroas');
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  /* reset restores the value attributes after the event; recompute on the next tick */
  form.addEventListener('reset', function () { setTimeout(calc, 0); });
  calc();

  /* on a phone the result sits below six inputs: a small bar carries it while the inputs are on screen */
  var bar = document.querySelector('.tl-peek'), res = document.getElementById('be-out');
  if (bar && res && 'IntersectionObserver' in window) {
    var formIn = false, resIn = false;
    var sync = function () { bar.classList.toggle('on', formIn && !resIn); };
    new IntersectionObserver(function (e) { formIn = e[0].isIntersecting; sync(); }).observe(form);
    new IntersectionObserver(function (e) { resIn = e[0].isIntersecting; sync(); }, { threshold: 0.35 }).observe(res);
  }
})();
