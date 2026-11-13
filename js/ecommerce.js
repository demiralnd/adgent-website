/* /ecommerce · the hero chart: weekly revenue as the platforms report it against the store's
   own figure from the Drive file. Drawn by assets/charts/adgent-charts.js over the static table
   that stays in place when script is off; the library skips its draw under reduced motion. */
(function () {
  'use strict';
  var el = document.getElementById('ec-chart');
  if (!el || !window.AdgentCharts) return;

  var weeks = ['Nov 1', 'Nov 2', 'Nov 3', 'Nov 4', 'Dec 1', 'Dec 2', 'Dec 3', 'Dec 4', 'Jan 1', 'Jan 2', 'Jan 3', 'Jan 4'];
  var reported = [42, 46, 58, 74, 88, 96, 102, 71, 44, 40, 38, 39];
  var store = [40, 43, 54, 66, 74, 78, 82, 57, 36, 32, 31, 32];
  var pts = function (a) { return a.map(function (y) { return { y: y }; }); };

  AdgentCharts.comparison(el, {
    legend: false,
    replay: false,
    width: 640,
    height: 236,
    margin: { l: 8, r: 8, t: 16, b: 12 },
    gridLines: 3,
    xLabels: weeks,
    yFormat: { prefix: '$', suffix: 'k' },
    series: [
      { name: 'Reported by Meta and Google', data: pts(reported), color: 'var(--primary)' },
      { name: 'Your store, from the Drive file', data: pts(store), color: 'var(--accent)' }
    ]
  });
})();
