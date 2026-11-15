/* features · keeps the compact capability directory aligned with the section in view. */
(function () {
  'use strict';

  var links = Array.prototype.slice.call(document.querySelectorAll('.ft-jumps a[href^="#"]'));
  if (!links.length) return;

  var items = links.map(function (link) {
    var target = document.querySelector(link.getAttribute('href'));
    return target ? { link: link, target: target } : null;
  }).filter(Boolean);
  if (!items.length) return;

  var current = null;
  var queued = false;

  function select(item) {
    if (item === current) return;
    current = item;
    items.forEach(function (entry) {
      if (entry === item) entry.link.setAttribute('aria-current', 'location');
      else entry.link.removeAttribute('aria-current');
    });
    if (matchMedia('(max-width:53.75em)').matches) {
      /* Follow the active item inside the horizontal rail only. scrollIntoView
         also scrolls the document, including during the initial unstyled layout. */
      var strip = item.link.parentElement;
      var linkBox = item.link.getBoundingClientRect();
      var stripBox = strip.getBoundingClientRect();
      strip.scrollTo({ left: strip.scrollLeft + linkBox.left - stripBox.left - (strip.clientWidth - linkBox.width) / 2, behavior: 'instant' });
    }
  }

  function sync() {
    queued = false;
    var marker = Math.min(260, innerHeight * .35);
    var next = items[0];
    items.forEach(function (item) {
      if (item.target.getBoundingClientRect().top <= marker) next = item;
    });
    select(next);
  }

  function requestSync() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }

  items.forEach(function (item) {
    item.link.addEventListener('click', function () { select(item); });
  });
  addEventListener('scroll', requestSync, { passive: true });
  addEventListener('resize', requestSync);
  addEventListener('load', requestSync);
  sync();
})();
