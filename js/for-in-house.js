/* /for-in-house · the hero report is read a second time: each highlighted line
   gets its margin note, one after another, once. The AI Visibility sample uses
   progressive tabs: without this script every assistant answer remains visible. */
(function () {
  'use strict';

  var aiv = document.getElementById('ih-aiv');
  if (aiv) {
    var tabs = Array.prototype.slice.call(aiv.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(aiv.querySelectorAll('[role="tabpanel"]'));

    function selectTab(tab, moveFocus) {
      tabs.forEach(function (item) {
        var selected = item === tab;
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
        item.tabIndex = selected ? 0 : -1;
      });
      panels.forEach(function (panel) {
        var selected = panel.id === tab.getAttribute('aria-controls');
        panel.hidden = !selected;
        panel.classList.toggle('is-active', selected);
      });
      if (moveFocus) tab.focus();
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { selectTab(tab, false); });
      tab.addEventListener('keydown', function (event) {
        var next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        selectTab(tabs[next], true);
      });
    });
    selectTab(tabs[0], false);
    aiv.classList.add('ih-tabs-ready');
  }

  var doc = document.getElementById('ih-doc');
  if (!doc || matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  doc.classList.add('ih-arm');
  var io = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    io.disconnect();
    requestAnimationFrame(function () { doc.classList.add('ih-play'); });
  }, { threshold: 0.25 });
  io.observe(doc);
})();
