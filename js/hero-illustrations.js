/* Literal hero illustrations for product, audience and company pages.
   Decorative only: each scene complements the page's real proof and never replaces it. */
(function () {
  'use strict';

  var path = location.pathname.replace(/\/$/, '') || '/';
  var scenes = {
    '/daily-verdict': { host: '.dv-hero', anchor: '.dv-board', art: 'morning', r: '-4deg' },
    '/trust-gate': { host: '.tg-hero', anchor: '.tg-board', art: 'gate', r: '3deg' },
    '/change-ledger': { host: '.cl-hero', anchor: '.cl-trip', art: 'ledger', r: '-3deg' },
    '/platform-change-log': { host: '.pcl-hero', anchor: '.pcl-board', art: 'timeline', r: '3deg' },
    '/account-memory': { host: '.am-hero', anchor: '.am-stage', art: 'memory', r: '-4deg' },
    '/ground-truth': { host: '.gt-hero', anchor: '.gt-desk', art: 'sources', r: '3deg' },
    '/agents': { host: '.ag-hero', anchor: '.ag-inbox', art: 'agents', r: '4deg' },
    '/specialists': { host: '.sp-card', anchor: '.sp-q', art: 'specialists', r: '-4deg' },
    '/campaign-build': { host: '.cb-hero', anchor: '.cb-chat', art: 'blueprint', r: '-3deg' },
    '/planning': { host: '.pl-hero', anchor: '.pl-hero-chat', art: 'plan', r: '3deg' },
    '/dashboards': { host: '.db-hero', anchor: '.db-views', art: 'dashboard', r: '-3deg' },
    '/meetings': { host: '.mt-hero', anchor: '.mt-win', art: 'meeting', r: '3deg' },
    '/creative-intelligence': { host: '.ci-stage', anchor: '.ci-mid', art: 'creative', r: '-5deg', after: true, afterDy: 8, dx: 24, mobileGap: true },
    '/ai-visibility': { host: '.aiv-hero', anchor: '.ais', art: 'answers', r: '4deg' },
    '/features': { host: '.ft-hero', anchor: '.ft-hero-in', art: 'modules', r: '-4deg', after: true, afterDy: 12, pad: true },
    '/for-agencies': { host: '.fa-hero', anchor: '.fa-stage', art: 'agency', r: '-3deg' },
    '/for-in-house': { host: '.ih-hero', anchor: '.ih-doc', art: 'second-read', r: '4deg' },
    '/why-adgent': { host: '.wy-hero', anchor: '.wy-mx-wrap', art: 'bridge', r: '-3deg' },
    '/pricing': { host: '.pr-hero', anchor: '.pr-sheet', art: 'quote', r: '4deg' },
    '/about': { host: '.ab-hero', anchor: '.ab-head', art: 'compass', r: '-4deg', lift: .06, mobileAfter: true, mobilePad: true }
  };

  function svg(body) {
    return '<svg viewBox="0 0 240 160" aria-hidden="true">' + body + '</svg>';
  }

  var art = {
    morning: svg('<circle class="sh-shade" cx="55" cy="45" r="24"/><path class="sh-accent" d="M55 8v13M55 69v13M18 45h13M79 45h13M29 19l9 9M72 62l9 9M29 71l9-9M72 28l9-9"/><path class="sh-paper" d="M83 31h116v35H83zM68 72h131v35H68zM51 113h148v35H51z"/><g class="sh-line"><path d="M83 31h116v35H83zM68 72h131v35H68zM51 113h148v35H51z"/><path d="M97 48h65M82 89h82M65 130h98"/></g><path class="sh-accent sh-draw" pathLength="1" d="M166 48l9 8 16-19M168 89l9 8 16-19M166 130l9 8 16-19"/>'),
    gate: svg('<path class="sh-paper" d="M75 18h91v124H75z"/><path class="sh-shade" d="M88 31h65v98H88z"/><g class="sh-line"><path d="M75 18h91v124H75zM88 31h65v98H88z"/><path d="M25 80h63M153 80h62"/><path d="M36 66l-15 14 15 14M204 66l15 14-15 14"/></g><path class="sh-accent sh-draw" pathLength="1" d="M120 47l24 10v20c0 20-10 34-24 42-14-8-24-22-24-42V57z"/><path class="sh-accent" d="M108 80l9 9 17-22"/><g class="sh-solid"><circle cx="25" cy="80" r="5"/><circle cx="215" cy="80" r="5"/></g>'),
    ledger: svg('<path class="sh-paper" d="M25 35c34-8 64-2 95 15v91c-31-17-61-23-95-15z"/><path class="sh-paper" d="M120 50c31-17 61-23 95-15v91c-34-8-64-2-95 15z"/><g class="sh-line"><path d="M25 35c34-8 64-2 95 15v91c-31-17-61-23-95-15zM120 50c31-17 61-23 95-15v91c-34-8-64-2-95 15z"/><path d="M43 58c21-3 38 1 58 10M43 78c21-3 38 1 58 10M139 68c19-9 37-12 58-9M139 88c19-9 37-12 58-9"/></g><path class="sh-accent sh-draw" pathLength="1" d="M179 111c-13 24-45 32-68 17-14-9-20-23-18-38"/><path class="sh-accent" d="M84 98l9-10 9 10"/><path class="sh-solid" d="M174 105h12v12h-12z"/>'),
    timeline: svg('<path class="sh-paper" d="M27 31h187v96H27z"/><g class="sh-line"><path d="M27 31h187v96H27zM48 55h144M48 79h144M48 103h144"/><path d="M70 43v72M133 43v72M181 43v72"/></g><path class="sh-accent sh-draw" pathLength="1" d="M43 106c28-9 42-35 68-29 24 6 37 27 64 13 14-7 23-19 33-37"/><g class="sh-solid"><circle cx="44" cy="106" r="5"/><circle cx="111" cy="77" r="5"/><circle cx="175" cy="90" r="5"/><circle cx="208" cy="53" r="5"/></g><path class="sh-shade" d="M151 10h65v35h-65z"/><path class="sh-line" d="M164 24h38M164 33h27"/>'),
    memory: svg('<path class="sh-paper" d="M55 17h120c9 0 16 7 16 16v111H55z"/><path class="sh-shade" d="M69 17h91v127H69z"/><g class="sh-line"><path d="M55 17h120c9 0 16 7 16 16v111H55zM69 17h91v127H69z"/><path d="M88 49h53M88 70h53M88 91h38"/></g><path class="sh-solid" d="M119 17h24v43l-12-9-12 9z"/><path class="sh-accent sh-draw" pathLength="1" d="M43 121c-24-27-12-69 22-80M39 107l4 15 15-4"/><path class="sh-paper" d="M21 93h55v40H21z"/><path class="sh-line" d="M31 106h35M31 117h24"/>'),
    sources: svg('<g class="sh-paper"><path d="M17 24h52v34H17zM17 103h52v34H17zM88 13h52v34H88zM88 114h52v34H88z"/></g><g class="sh-line"><path d="M17 24h52v34H17zM17 103h52v34H17zM88 13h52v34H88zM88 114h52v34H88z"/><path d="M69 41c46 0 68 30 86 45M69 120c43 0 62-17 86-34M114 47c8 14 16 24 41 39M114 114c8-12 18-22 41-28"/></g><circle class="sh-shade" cx="178" cy="79" r="34"/><circle class="sh-line" cx="178" cy="79" r="34"/><path class="sh-accent sh-draw" pathLength="1" d="M202 103l24 24M164 79l10 10 19-23"/><g class="sh-solid"><circle cx="43" cy="41" r="4"/><circle cx="43" cy="120" r="4"/><circle cx="114" cy="30" r="4"/><circle cx="114" cy="131" r="4"/></g>'),
    agents: svg('<path class="sh-paper" d="M34 55h171v86H34z"/><path class="sh-shade" d="M34 100h171v41H34z"/><g class="sh-line"><path d="M34 55h171v86H34zM34 100h48l10 14h55l11-14h47"/><path d="M66 23v44M120 12v55M175 29v38"/></g><g class="sh-paper"><circle cx="66" cy="23" r="18"/><circle cx="120" cy="12" r="18"/><circle cx="175" cy="29" r="18"/></g><g class="sh-line"><circle cx="66" cy="23" r="18"/><circle cx="120" cy="12" r="18"/><circle cx="175" cy="29" r="18"/></g><path class="sh-accent sh-draw" pathLength="1" d="M57 24l7 7 12-15M111 13l7 7 12-15M166 30l7 7 12-15"/><path class="sh-line" d="M57 76h126M57 87h92"/>'),
    specialists: svg('<path class="sh-paper" d="M25 22h190v120H25z"/><g class="sh-line"><path d="M25 22h190v120H25zM25 62h190M25 102h190M88 22v120M151 22v120"/><path d="M45 42h22M108 42h22M171 42h22M45 82h22M108 82h22M171 82h22M45 122h22M108 122h22M171 122h22"/></g><g class="sh-solid"><circle cx="56" cy="42" r="5"/><circle cx="119" cy="82" r="5"/><circle cx="182" cy="122" r="5"/></g><path class="sh-accent sh-draw" pathLength="1" d="M56 42c25 5 37 36 63 40 25 4 38 28 63 40"/><path class="sh-accent" d="M174 116l9 6-9 7"/>'),
    blueprint: svg('<path class="sh-paper" d="M29 18h164v124H29z"/><g class="sh-line"><path d="M29 18h164v124H29zM48 40h58M48 58h96M48 76h45M48 100h96M48 118h72"/><path d="M160 18v124"/></g><path class="sh-shade" d="M108 34h36v42h-36z"/><path class="sh-accent sh-draw" pathLength="1" d="M120 34v42M108 55h36"/><path class="sh-paper" d="M151 108l50-69 18 13-50 69-23 8z"/><g class="sh-line"><path d="M151 108l50-69 18 13-50 69-23 8zM201 39l18 13M151 108l18 13"/></g><path class="sh-solid" d="M146 129l5-21 18 13z"/>'),
    plan: svg('<path class="sh-paper" d="M26 35h175v107H26z"/><g class="sh-line"><path d="M26 35h175v107H26zM26 62h175M61 35v107M96 35v107M131 35v107M166 35v107M26 89h175M26 116h175"/><path d="M61 19v32M166 19v32"/></g><path class="sh-accent sh-draw" pathLength="1" d="M44 130c14-36 35-56 63-45 25 10 38-31 67-22"/><g class="sh-solid"><circle cx="44" cy="130" r="5"/><circle cx="107" cy="85" r="5"/><circle cx="174" cy="63" r="5"/></g><path class="sh-accent" d="M174 38v25M174 38h26l-8 9 8 9h-26"/>'),
    dashboard: svg('<path class="sh-paper" d="M22 26h181v116H22z"/><g class="sh-line"><path d="M22 26h181v116H22zM22 51h181"/><path d="M43 70h56v51H43zM116 70h65v21h-65zM116 100h65v21h-65z"/></g><path class="sh-shade" d="M51 79h11v33H51zM69 91h11v21H69zM87 72h11v40H87z"/><path class="sh-accent sh-draw" pathLength="1" d="M121 111l14-9 13 4 15-19 14 6"/><path class="sh-accent" d="M168 83l11 9-12 6"/><path class="sh-paper" d="M161 6h58v39h-58z"/><path class="sh-line" d="M174 19h31M174 29h22"/>'),
    meeting: svg('<path class="sh-paper" d="M31 27h176v111H31z"/><g class="sh-line"><path d="M31 27h176v111H31zM31 52h176M135 52v86"/><circle cx="82" cy="88" r="19"/><path d="M53 124c7-21 17-30 29-30s22 9 29 30"/><circle cx="159" cy="74" r="10"/><circle cx="184" cy="74" r="10"/></g><path class="sh-shade" d="M145 97h52v25h-52z"/><path class="sh-accent sh-draw" pathLength="1" d="M58 14h61c10 0 18 8 18 18v9H78l-15 12 3-12h-8c-8 0-14-6-14-14s6-13 14-13z"/><path class="sh-line" d="M65 26h49"/><path class="sh-solid" d="M77 84h10v10H77z"/>'),
    creative: svg('<path class="sh-paper" d="M28 31h62v92H28zM98 19h62v92H98zM168 40h53v79h-53z"/><g class="sh-line"><path d="M28 31h62v92H28zM98 19h62v92H98zM168 40h53v79h-53z"/><path d="M38 84l15-17 13 11 14-21M108 77l14-20 12 13 16-28M177 88l12-17 20 18"/><path d="M18 31h-9v13M90 21V8H77M221 119h10v-13"/></g><path class="sh-accent sh-draw" pathLength="1" d="M42 137c39-6 76-7 110-1 25 5 47 3 67-7"/><path class="sh-paper" d="M147 117l52-79 17 12-52 79-22 10z"/><path class="sh-solid" d="M142 139l5-22 17 12z"/>'),
    answers: svg('<path class="sh-paper" d="M18 25h112v65H46l-21 18 5-18H18z"/><path class="sh-shade" d="M99 70h123v62h-12l5 17-21-17H99z"/><g class="sh-line"><path d="M18 25h112v65H46l-21 18 5-18H18zM99 70h123v62h-12l5 17-21-17H99z"/><path d="M38 46h72M38 61h54M119 91h82M119 107h63"/></g><path class="sh-accent sh-draw" pathLength="1" d="M148 18c17 0 30 13 30 30s-13 30-30 30-30-13-30-30 13-30 30-30z"/><path class="sh-accent" d="M168 69l22 22M138 48l7 7 15-18"/><g class="sh-solid"><circle cx="199" cy="41" r="5"/><circle cx="215" cy="24" r="4"/></g>'),
    modules: svg('<path class="sh-paper" d="M25 24h63v50H25zM99 24h48v50H99zM158 24h57v50h-57zM25 85h48v51H25zM84 85h74v51H84zM169 85h46v51h-46z"/><g class="sh-line"><path d="M25 24h63v50H25zM99 24h48v50H99zM158 24h57v50h-57zM25 85h48v51H25zM84 85h74v51H84zM169 85h46v51H169z"/><path d="M56 74v11M123 74v11M186 74v11M73 110h11M158 110h11"/></g><g class="sh-solid"><circle cx="56" cy="49" r="6"/><circle cx="123" cy="49" r="6"/><circle cx="186" cy="49" r="6"/><circle cx="49" cy="110" r="6"/><circle cx="121" cy="110" r="6"/><circle cx="192" cy="110" r="6"/></g><path class="sh-accent sh-draw" pathLength="1" d="M56 49h67 63M49 110h72 71"/>'),
    agency: svg('<path class="sh-paper" d="M21 47h165v92H21z"/><path class="sh-shade" d="M38 29h165v92H38z"/><path class="sh-paper" d="M55 13h165v92H55z"/><g class="sh-line"><path d="M21 47h165v92H21zM38 29h165v92H38zM55 13h165v92H55z"/><path d="M72 34h59M72 51h121M72 68h91"/><path d="M64 91h135"/></g><path class="sh-accent sh-draw" pathLength="1" d="M74 116c25-14 45-8 66 3 25 14 46 11 70-11"/><g class="sh-solid"><circle cx="74" cy="116" r="5"/><circle cx="140" cy="119" r="5"/><circle cx="210" cy="108" r="5"/></g><path class="sh-accent" d="M200 104l11 4-7 9"/>'),
    'second-read': svg('<path class="sh-paper" d="M37 17h136v126H37z"/><g class="sh-line"><path d="M37 17h136v126H37zM57 43h91M57 64h91M57 85h72M57 106h84"/></g><path class="sh-shade" d="M51 58h106v18H51z"/><circle class="sh-paper" cx="172" cy="93" r="38"/><circle class="sh-line" cx="172" cy="93" r="38"/><path class="sh-accent sh-draw" pathLength="1" d="M198 119l27 27M156 94l10 10 21-27"/><path class="sh-accent" d="M24 44c8-14 17-22 30-27"/><path class="sh-solid" d="M20 41l5 11 10-7z"/>'),
    bridge: svg('<path class="sh-paper" d="M17 40h64v76H17zM159 40h64v76h-64z"/><g class="sh-line"><path d="M17 40h64v76H17zM159 40h64v76h-64zM38 62h23M38 79h23M180 62h23M180 79h23"/><path d="M81 96h78"/></g><path class="sh-shade" d="M90 76h60v40H90z"/><path class="sh-accent sh-draw" pathLength="1" d="M48 129c21-27 42-39 72-39s51 12 72 39"/><path class="sh-accent" d="M183 123l10 6-9 7"/><circle class="sh-solid" cx="48" cy="129" r="5"/><circle class="sh-solid" cx="192" cy="129" r="5"/>'),
    quote: svg('<path class="sh-paper" d="M44 18h142v124H44z"/><g class="sh-line"><path d="M44 18h142v124H44zM62 43h84M62 63h106M62 83h73M62 113h106"/><circle cx="162" cy="43" r="10"/></g><path class="sh-shade" d="M132 91h55v39h-55z"/><path class="sh-accent sh-draw" pathLength="1" d="M16 101c19 0 30 7 42 22M58 123c15 19 40 22 59 9"/><path class="sh-accent" d="M108 127l10 5-8 8"/><path class="sh-solid" d="M146 104h27v6h-27zM146 116h18v6h-18z"/>'),
    compass: svg('<circle class="sh-paper" cx="120" cy="81" r="66"/><circle class="sh-line" cx="120" cy="81" r="66"/><circle class="sh-shade" cx="120" cy="81" r="48"/><g class="sh-line"><path d="M120 15v16M120 131v16M54 81h16M170 81h16"/><path d="M120 42l19 39-19 39-19-39z"/></g><path class="sh-solid" d="M120 42l19 39-19-8z"/><path class="sh-accent sh-draw" pathLength="1" d="M120 81l43-36"/><circle class="sh-solid" cx="120" cy="81" r="6"/><path class="sh-accent" d="M154 43l11 1-3 11"/>')
  };

  var scene = scenes[path];
  if (!scene || !art[scene.art]) return;
  var host = document.querySelector(scene.host);
  var anchor = document.querySelector(scene.anchor);
  if (!host || !anchor) return;

  host.classList.add('page-sketch-host');
  if (scene.mobilePad) host.classList.add('page-sketch-mobile-pad');
  if (scene.pad) host.classList.add('page-sketch-pad');
  if (scene.mobileGap) anchor.classList.add('page-sketch-anchor-gap');
  /* Reserve a real gap above the proof surface instead of lifting art into the
     preceding CTA. After-anchor scenes already have their own reserved space. */
  var reserved = !scene.after && !scene.mobileAfter;
  if (reserved) anchor.classList.add('page-sketch-anchor');
  var sketch = document.createElement('div');
  sketch.className = 'page-sketch sketch-art page-sketch-' + scene.art;
  sketch.setAttribute('aria-hidden', 'true');
  sketch.style.setProperty('--sk-r', scene.r || '-3deg');
  sketch.innerHTML = art[scene.art];
  host.appendChild(sketch);

  var placeFrame = 0;
  function place() {
    if (placeFrame) return;
    placeFrame = requestAnimationFrame(function () {
      placeFrame = 0;
      var hostBox = host.getBoundingClientRect();
      var anchorBox = anchor.getBoundingClientRect();
      var width = sketch.getBoundingClientRect().width || 220;
      var left = anchorBox.right - hostBox.left - width * .84 + (scene.dx || 0);
      var useAfter = scene.after || (scene.mobileAfter && hostBox.width <= 520);
      var lift = scene.lift == null ? .36 : scene.lift;
      var top = useAfter
        ? anchorBox.bottom - hostBox.top + (scene.afterDy == null ? 12 : scene.afterDy)
        : anchorBox.top - hostBox.top - (reserved ? width * 2 / 3 + 24 : width * lift) + (scene.dy || 0);
      left = Math.max(12, Math.min(hostBox.width - width - 12, left));
      top = Math.max(8, Math.min(hostBox.height - width * .62, top));
      sketch.style.setProperty('--sk-left', left.toFixed(1) + 'px');
      sketch.style.setProperty('--sk-top', top.toFixed(1) + 'px');
    });
  }
  place();
  addEventListener('resize', place);
  if ('ResizeObserver' in window) new ResizeObserver(place).observe(anchor);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);

  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function reveal() { sketch.classList.add('is-live'); }
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      observer.disconnect();
      requestAnimationFrame(reveal);
    }, { threshold: .08 });
    observer.observe(host);
  } else {
    reveal();
  }

  if (reduced || !matchMedia('(pointer:fine)').matches) return;
  host.addEventListener('pointermove', function (event) {
    var box = host.getBoundingClientRect();
    sketch.style.setProperty('--sk-x', ((event.clientX - box.left) / box.width * 2 - 1).toFixed(3));
    sketch.style.setProperty('--sk-y', ((event.clientY - box.top) / box.height * 2 - 1).toFixed(3));
  });
  host.addEventListener('pointerleave', function () {
    sketch.style.setProperty('--sk-x', '0');
    sketch.style.setProperty('--sk-y', '0');
  });
})();
