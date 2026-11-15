/* Articles · the contents rail marks the section you are in and fills its line as you read;
   on narrow screens the contents list folds behind its label, and comparison tables get
   per-cell labels so CSS can stack them. State only: nothing animates from here. */
(function () {
  'use strict';

  /* comparison tables: each body cell carries its column head, so a stacked row still reads.
     Explicit roles keep the table semantics when CSS changes the display of its parts. */
  Array.prototype.forEach.call(document.querySelectorAll('.ar-col .ar-tbl'), function (t) {
    /* every cell of the head row, th or td, so a td corner cell cannot shift the labels */
    var headRow = t.querySelector('thead tr');
    var heads = headRow ? headRow.children : [];
    if (!heads.length) return;
    t.setAttribute('role', 'table');
    Array.prototype.forEach.call(t.querySelectorAll('thead, tbody'), function (g) { g.setAttribute('role', 'rowgroup'); });
    Array.prototype.forEach.call(heads, function (h) { if (h.tagName === 'TH') h.setAttribute('role', 'columnheader'); });
    Array.prototype.forEach.call(t.querySelectorAll('tr'), function (tr) {
      tr.setAttribute('role', 'row');
      Array.prototype.forEach.call(tr.children, function (c, i) {
        if (c.tagName === 'TH') { if (c.getAttribute('scope') === 'row') c.setAttribute('role', 'rowheader'); return; }
        c.setAttribute('role', 'cell');
        if (heads[i]) c.setAttribute('data-label', heads[i].textContent.trim());
      });
    });
  });

  var toc = document.querySelector('.ar-toc');
  var col = document.querySelector('.ar-col');
  if (!toc || !col) return;
  var list = toc.querySelector('ol');
  var label = toc.querySelector(':scope > p');
  var links = Array.prototype.slice.call(toc.querySelectorAll('a[href^="#"]'));
  var heads = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); });

  function update() {
    var top = (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--navh')) || 64) + 48;
    var cur = -1;
    heads.forEach(function (h, i) { if (h && h.getBoundingClientRect().top <= top) cur = i; });
    links.forEach(function (a, i) { if (i === cur) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    var r = col.getBoundingClientRect();
    var p = Math.min(1, Math.max(0, (top - r.top) / Math.max(1, r.height - innerHeight + top)));
    list.style.setProperty('--p', p.toFixed(3));
  }
  var queued = false;
  addEventListener('scroll', function () {
    if (queued) return; queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }, { passive: true });
  addEventListener('resize', update);
  update();

  /* narrow screens: the label becomes a disclosure button and the list starts folded */
  if (!label || !list) return;
  var narrow = matchMedia('(max-width:68.75em)');
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'ar-toc-t';
  list.id = list.id || 'ar-toc-list';
  btn.setAttribute('aria-controls', list.id);
  btn.innerHTML = '<span></span><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
  btn.firstChild.textContent = label.textContent;
  btn.addEventListener('click', function () {
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    list.hidden = !open;
  });
  function fold(on) {
    if (on && label.parentNode) {
      label.replaceWith(btn);
      btn.setAttribute('aria-expanded', 'false');
      list.hidden = true;
    } else if (!on && btn.parentNode) {
      btn.replaceWith(label);
      list.hidden = false;
      update();
    }
  }
  fold(narrow.matches);
  narrow.addEventListener('change', function (e) { fold(e.matches); });
})();
