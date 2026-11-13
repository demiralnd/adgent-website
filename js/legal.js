/* legal · reading aids for privacy, terms, data use, data deletion, business information and security.
   The text is the live site's, untouched: this only marks the section you are in, adds a link to
   each section heading, and folds the contents list on a phone. The ids sit on the live markup's
   <section> (and the contact block), so anchors match the live URLs. Without JS the page reads the same. */
(function () {
  var toc = document.querySelector('.lgl-toc');
  var heads = [].slice.call(document.querySelectorAll('.legal-body > [id]'));
  if (!toc || !heads.length) return;
  var links = [].slice.call(toc.querySelectorAll('a[href^="#"]'));
  var byId = {};
  links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });

  /* 1 · a link on every section heading; a click also copies the address */
  var ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3"/><path d="M7.5 4.5l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1"/><path d="M8.5 11.5l-1 1A2.5 2.5 0 0 1 4 9l1-1"/></svg>';
  heads.forEach(function (sec) {
    var h = sec.querySelector('h2, h3');
    if (!h) return;
    var a = document.createElement('a');
    a.className = 'lgl-a';
    a.href = '#' + sec.id;
    a.setAttribute('aria-label', 'Section link');
    a.title = 'Copy a link to this section';
    a.innerHTML = ICON;
    a.addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + sec.id;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          a.setAttribute('data-copied', '');
          setTimeout(function () { a.removeAttribute('data-copied'); }, 1600);
        }, function () {});
      }
    });
    h.appendChild(a);
  });

  /* 2 · the contents list marks the section on screen */
  var current = null, ticking = false;
  function mark() {
    ticking = false;
    var line = window.innerHeight * 0.28, id = null;
    for (var i = 0; i < heads.length; i++) {
      if (heads[i].getBoundingClientRect().top <= line) id = heads[i].id; else break;
    }
    if (id === current) return;
    if (current && byId[current]) byId[current].removeAttribute('aria-current');
    current = id;
    if (id && byId[id]) byId[id].setAttribute('aria-current', 'location');
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(mark); } }, { passive: true });
  window.addEventListener('resize', mark);
  mark();

  /* 3 · on a phone the contents fold behind one button */
  var label = toc.querySelector('.lgl-toc-h');
  var list = document.createElement('div');
  list.className = 'lgl-toc-l';
  list.id = 'lgl-toc-l';
  links.forEach(function (a) { list.appendChild(a); });
  toc.appendChild(list);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'lgl-toc-b';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', list.id);
  btn.innerHTML = '<span>' + (label ? label.textContent : 'Contents') + '</span><small>' + links.length + ' sections</small><i aria-hidden="true"></i>';
  toc.insertBefore(btn, toc.firstChild);
  toc.classList.add('js');
  btn.addEventListener('click', function () {
    var open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    toc.classList.toggle('open', open);
  });
  list.addEventListener('click', function (e) {
    if (e.target.closest('a') && toc.classList.contains('open')) {
      btn.setAttribute('aria-expanded', 'false');
      toc.classList.remove('open');
    }
  });
})();
