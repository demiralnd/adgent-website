/* Industry pages · one concept-specific control per page, plus the receipt reveal.
   Every model is complete without script; reduced motion keeps the controls and skips motion. */
(function () {
  'use strict';

  var main = document.querySelector('main[data-industry]');
  if (!main) return;
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var page = main.getAttribute('data-industry');

  /* The hero scene pairs the evidence card with one literal industry drawing and a quieter
     data trace. Both are decorative, inert and complete without text. They enter together
     once; only a fine pointer can shift them by a few pixels. */
  var sketches = {
    ecommerce: '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-shade" d="M76 64l62-20 53 25-67 24z"/><path class="sh-paper" d="M76 64l48 29v49l-48-30z"/><path class="sh-paper" d="M124 93l67-24v48l-67 25z"/><g class="sh-line"><path d="M76 64l48 29 67-24-53-25z"/><path d="M76 64v48l48 30 67-25V69"/><path d="M124 93v49"/><path d="M76 64l-17 24 48 27 17-22"/><path d="M191 69l17 18-67 25-17-19"/><path d="M138 44l-17-18-62 19 17 19"/></g><path class="sh-accent sh-draw" pathLength="1" d="M50 113C23 76 38 34 84 20c42-13 91 2 111 37"/><path class="sh-accent" d="M184 51l13 7 3-15"/><path class="sh-solid" d="M112 97l12 7 13-5v15l-13 5-12-7z"/></svg>',
    'lead-generation': '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-paper" d="M35 33h105c8 0 14 6 14 14v79c0 8-6 14-14 14H35c-8 0-14-6-14-14V47c0-8 6-14 14-14z"/><g class="sh-line"><path d="M35 33h105c8 0 14 6 14 14v79c0 8-6 14-14 14H35c-8 0-14-6-14-14V47c0-8 6-14 14-14z"/><circle cx="74" cy="68" r="16"/><path d="M45 111c5-18 16-27 29-27s24 9 29 27"/><path d="M115 61h19M115 77h25M115 93h17"/><circle cx="190" cy="48" r="29"/><path d="M190 33v17l12 8"/></g><path class="sh-accent sh-draw" pathLength="1" d="M102 122c23-2 36-18 50-24 18-8 35 3 56-8"/><g class="sh-solid"><circle cx="111" cy="120" r="5"/><circle cx="154" cy="98" r="5"/><circle cx="207" cy="90" r="5"/></g><path class="sh-accent" d="M201 84l8 6-9 6"/></svg>',
    'travel-hospitality': '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-paper" d="M62 42h105c9 0 16 7 16 16v79H46V58c0-9 7-16 16-16z"/><g class="sh-line"><path d="M62 42h105c9 0 16 7 16 16v79H46V58c0-9 7-16 16-16z"/><path d="M86 42V29c0-7 5-12 12-12h33c7 0 12 5 12 12v13"/><path d="M83 58v79M146 58v79"/><path d="M46 74h137"/><circle cx="68" cy="147" r="7"/><circle cx="161" cy="147" r="7"/></g><path class="sh-shade" d="M151 19l47 12-11 50-47-12z"/><g class="sh-line"><path d="M151 19l47 12-11 50-47-12z"/><circle cx="174" cy="32" r="4"/><path d="M158 48l24 6M155 59l18 5"/></g><path class="sh-accent sh-draw" pathLength="1" d="M28 113c20-9 38-7 52 6 14 14 40 17 62 5 22-13 41-11 65 5"/><path class="sh-accent" d="M199 122l9 7-10 5"/></svg>',
    marketplaces: '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-paper" d="M25 64h118v74H25z"/><path class="sh-shade" d="M17 45h134l-8 30H25z"/><g class="sh-line"><path d="M17 45h134l-8 30H25z"/><path d="M25 75v63h118V75"/><path d="M45 75v63M119 75v63"/><path d="M61 45l-4 30M85 45v30M109 45l4 30M133 45l8 30"/><path d="M59 99h42v39H59z"/></g><path class="sh-paper" d="M163 62h56v64h-56z"/><g class="sh-line"><path d="M163 62h56v64h-56z"/><path d="M176 62c0-13 6-21 15-21s15 8 15 21"/></g><path class="sh-accent sh-draw" pathLength="1" d="M139 96c15-18 29-23 48-15"/><path class="sh-accent" d="M179 74l10 7-11 5"/><path class="sh-solid" d="M184 91h14v14h-14z"/></svg>',
    'local-multi-location': '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-paper" d="M20 42l62-21 66 22 72-22v101l-72 22-66-22-62 21z"/><g class="sh-line"><path d="M20 42l62-21 66 22 72-22v101l-72 22-66-22-62 21z"/><path d="M82 21v101M148 43v101"/><path d="M31 91c27-18 46-17 67-4 24 15 46 17 75-4 13-9 24-12 38-8"/><path d="M53 38c8 25 16 39 38 56 17 13 28 27 32 43"/><path d="M174 34c-11 24-15 41-11 63 2 12 1 23-4 34"/></g><g class="sh-accent"><path d="M58 51c0-12 9-21 21-21s21 9 21 21c0 15-21 34-21 34S58 66 58 51z"/><circle class="sh-solid" cx="79" cy="51" r="6"/><path d="M153 71c0-10 8-18 18-18s18 8 18 18c0 13-18 29-18 29s-18-16-18-29z"/><circle class="sh-solid" cx="171" cy="71" r="5"/></g><path class="sh-accent sh-draw" pathLength="1" d="M79 85c24 9 49 2 74-12"/></svg>',
    'mobile-apps': '<svg viewBox="0 0 240 160" aria-hidden="true"><path class="sh-paper" d="M48 12h94c10 0 18 8 18 18v112c0 10-8 18-18 18H48c-10 0-18-8-18-18V30c0-10 8-18 18-18z"/><g class="sh-line"><path d="M48 12h94c10 0 18 8 18 18v112c0 10-8 18-18 18H48c-10 0-18-8-18-18V30c0-10 8-18 18-18z"/><path d="M72 27h46"/><path d="M79 145h32"/></g><g class="sh-pixels"><path d="M52 50h20v20H52zM82 50h20v20H82zM112 50h20v20h-20zM52 80h20v20H52zM82 80h20v20H82zM112 80h20v20h-20zM52 110h20v20H52zM82 110h20v20H82zM112 110h20v20h-20z"/></g><g class="sh-solid"><path d="M52 50h20v20H52zM112 50h20v20h-20zM82 80h20v20H82zM52 110h20v20H52z"/></g><path class="sh-accent sh-draw" pathLength="1" d="M150 55c21-4 31 3 43 17 8 9 17 12 29 10"/><path class="sh-accent" d="M214 76l9 6-9 7"/><g class="sh-pixels"><path d="M179 27h20v20h-20zM202 105h17v17h-17zM171 119h13v13h-13z"/></g></svg>'
  };

  (function mountHeroScene() {
    var hero = main.querySelector('.in-hero');
    if (!hero || !sketches[page]) return;
    var grid = hero.querySelector('.in-hero-g');
    var visual = grid && grid.lastElementChild;
    var stage = null;
    var sketch = null;
    if (visual) {
      stage = document.createElement('div');
      stage.className = 'in-hero-stage';
      visual.parentNode.insertBefore(stage, visual);
      stage.appendChild(visual);
      sketch = document.createElement('div');
      sketch.className = 'in-sketch sketch-art in-sketch-' + page;
      sketch.setAttribute('aria-hidden', 'true');
      sketch.innerHTML = sketches[page];
      stage.insertBefore(sketch, visual);
    }

    var atmo = document.createElement('div');
    atmo.className = 'in-atmo in-atmo-' + page;
    atmo.setAttribute('aria-hidden', 'true');
    function add(styles, className) {
      var item = document.createElement('i');
      item.style.setProperty('--i', atmo.children.length);
      Object.keys(styles || {}).forEach(function (key) { item.style.setProperty(key, styles[key]); });
      if (className) item.className = className;
      atmo.appendChild(item);
    }
    if (page === 'ecommerce') {
      [26, 38, 52, 71, 88, 78, 56, 32].forEach(function (height) { add({ '--h': height + '%' }); });
    } else if (page === 'lead-generation') {
      [24, 56, 88].forEach(function (position) { add({ '--x': position + '%' }); });
    } else if (page === 'travel-hospitality') {
      for (var day = 0; day < 40; day += 1) add();
    } else if (page === 'marketplaces') {
      [12, 18, 24, 31, 42].forEach(function (share) { add({ '--p': share + '%' }); });
    } else if (page === 'local-multi-location') {
      [['82%', '10%', '65%'], ['64%', '72%', '18%'], ['46%', '28%', '8%'], ['28%', '82%', '54%']]
        .forEach(function (ring) { add({ '--s': ring[0], '--dx': ring[1], '--dy': ring[2] }); });
    } else if (page === 'mobile-apps') {
      for (var bit = 0; bit < 64; bit += 1) add({}, ((bit * 7 + Math.floor(bit / 8) * 3) % 11) < 5 ? 'on' : '');
    }
    hero.insertBefore(atmo, hero.firstChild);

    function reveal() {
      atmo.classList.add('is-live');
      if (stage) stage.classList.add('is-live');
    }
    if ('IntersectionObserver' in window) {
      var sceneObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        sceneObserver.disconnect();
        requestAnimationFrame(reveal);
      }, { threshold: .15 });
      sceneObserver.observe(hero);
    } else {
      reveal();
    }

    if (reduced || !matchMedia('(pointer:fine)').matches) return;
    hero.addEventListener('pointermove', function (event) {
      var box = hero.getBoundingClientRect();
      var x = ((event.clientX - box.left) / box.width * 2 - 1).toFixed(3);
      var y = ((event.clientY - box.top) / box.height * 2 - 1).toFixed(3);
      atmo.style.setProperty('--in-x', x);
      atmo.style.setProperty('--in-y', y);
      if (sketch) {
        sketch.style.setProperty('--sk-x', x);
        sketch.style.setProperty('--sk-y', y);
      }
    });
    hero.addEventListener('pointerleave', function () {
      atmo.style.setProperty('--in-x', '0');
      atmo.style.setProperty('--in-y', '0');
      if (sketch) {
        sketch.style.setProperty('--sk-x', '0');
        sketch.style.setProperty('--sk-y', '0');
      }
    });
  })();

  function setPressed(group, button) {
    Array.prototype.forEach.call(group.querySelectorAll('[data-lens]'), function (item) {
      item.setAttribute('aria-pressed', item === button ? 'true' : 'false');
    });
  }

  function setView(target, view) {
    if (target) target.setAttribute('data-view', view);
  }

  function activate(button) {
    var group = button.closest('.in-lens');
    var page = main.getAttribute('data-industry');
    var view = button.getAttribute('data-lens');
    setPressed(group, button);

    if (page === 'ecommerce') {
      setView(button.closest('.ec-math'), view);
    } else if (page === 'lead-generation') {
      var clocks = button.closest('.lg-clocks');
      setView(clocks, view);
      var leadIndex = { form: 0, id: 1, revenue: 2 }[view];
      Array.prototype.forEach.call(clocks.querySelectorAll('.lg-tl-m li'), function (item, index) {
        item.classList.toggle('is-active', index === leadIndex);
      });
    } else if (page === 'travel-hospitality') {
      setView(button.closest('.in-viz'), view);
    } else if (page === 'marketplaces') {
      var body = main.querySelector('.in-tbl tbody');
      if (!body) return;
      var rows = Array.prototype.slice.call(body.rows);
      rows.forEach(function (row, index) {
        if (!row.hasAttribute('data-filed')) row.setAttribute('data-filed', index);
      });
      rows.sort(function (a, b) {
        if (view === 'filed') return +a.getAttribute('data-filed') - +b.getAttribute('data-filed');
        var av = parseFloat(a.cells[a.cells.length - 1].textContent);
        var bv = parseFloat(b.cells[b.cells.length - 1].textContent);
        return view === 'low' ? av - bv : bv - av;
      });
      rows.forEach(function (row) { body.appendChild(row); });
      setView(body.closest('.in-tbl-w'), view);
    } else if (page === 'local-multi-location') {
      var notes = {
        desk: 'At the front desk, 59% of callers reach a person and only 43% of those are asked to book.',
        catchment: 'Google’s default reaches people in your area and people who have only shown interest in it.',
        capacity: 'Near full capacity, more budget buys no-shows. The rota is yours.'
      };
      var section = button.closest('.in-gap');
      setView(section.querySelector('.in-viz'), view);
      section.querySelector('.lo-lens-note').textContent = notes[view];
    } else if (page === 'mobile-apps') {
      setView(button.closest('.in-rc'), view);
    }
  }

  Array.prototype.forEach.call(main.querySelectorAll('.in-lens'), function (group) {
    var initial = group.querySelector('[aria-pressed="true"]');
    if (initial) activate(initial);
    group.addEventListener('click', function (event) {
      var button = event.target.closest('[data-lens]');
      if (button && group.contains(button)) activate(button);
    });
  });

  if (reduced) return;
  var rc = main.querySelector('.in-rc');
  if (!rc || !('IntersectionObserver' in window)) return;

  var rows = Array.prototype.slice.call(rc.querySelectorAll('li'));
  var end = rc.querySelector('.in-rc-end');
  rows.forEach(function (li, i) { li.style.setProperty('--i', i); });
  if (end) end.style.setProperty('--i', rows.length + 1);
  rc.classList.add('is-arm');

  function roll(el, delay) {
    var from = +el.getAttribute('data-from'), to = +el.getAttribute('data-to');
    var dec = (el.getAttribute('data-to').split('.')[1] || '').length;
    var fmt = function (value) {
      return value.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    el.textContent = fmt(from);
    var start = performance.now() + delay, duration = 1100;
    (function frame(now) {
      var progress = Math.min(1, Math.max(0, (now - start) / duration));
      el.textContent = fmt(from + (to - from) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  var observer = new IntersectionObserver(function (entries) {
    if (!entries[0].isIntersecting) return;
    observer.disconnect();
    requestAnimationFrame(function () {
      rc.classList.add('is-run');
      var number = rc.querySelector('[data-to]');
      if (number) roll(number, (rows.length + 1) * 170 + 260);
    });
  }, { threshold: .25 });
  observer.observe(rc);
})();
