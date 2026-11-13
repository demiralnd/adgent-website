/* /agents · selectable Outputs inbox. The examples never leave the page. */
(function () {
  'use strict';

  var inbox = document.querySelector('.ag-inbox');
  if (!inbox) return;

  var buttons = Array.prototype.slice.call(inbox.querySelectorAll('[data-ag-output]'));
  var detail = inbox.querySelector('.ag-detail');
  if (!buttons.length || !detail) return;

  var parts = {
    kind: detail.querySelector('[data-ag-detail-kind]'),
    time: detail.querySelector('[data-ag-detail-time]'),
    title: detail.querySelector('[data-ag-detail-title]'),
    summary: detail.querySelector('[data-ag-detail-summary]'),
    wake: detail.querySelector('[data-ag-detail-wake]'),
    reads: detail.querySelector('[data-ag-detail-reads]'),
    next: detail.querySelector('[data-ag-detail-next]')
  };
  var wakeLink = detail.querySelector('[data-ag-wake-link]');

  var outputs = [
    {
      kind: 'Schedule', time: 'Mon 09:00',
      title: 'Agency referee: 3 findings this week',
      summary: 'Two campaigns are stuck in learning; one losing campaign is still scaled.',
      wake: 'Mondays, 09:00', reads: 'Meta Ads · Google Ads',
      next: 'Open all three findings', target: '#ag-wake-schedule'
    },
    {
      kind: 'Condition', time: 'Thu 07:40',
      title: 'Prospecting on Meta is 24% above its two-week CPA',
      summary: 'The condition crossed its threshold. The agent prepared a lower-budget move with the evidence attached.',
      wake: 'CPA 20% over its two-week average', reads: 'Meta Ads · Google Ads · GA4',
      next: 'Review the proposed budget change', target: '#ag-wake-condition'
    },
    {
      kind: 'Event', time: 'Tue 14:32',
      title: '“Autumn sale” optimises for link clicks',
      summary: 'The new campaign differs from the other sales campaigns, which optimise for purchases.',
      wake: 'A campaign is created', reads: 'Meta Ads · Google Ads',
      next: 'Compare its setup with the rest of the account', target: '#ag-wake-event'
    },
    {
      kind: 'Schedule', time: 'Fri 08:30 · CSV',
      title: 'Pacing check: 3 campaigns below plan',
      summary: 'Three active campaigns spent less than half their daily budget on the last full day.',
      wake: 'Daily, 08:30', reads: 'Google Ads',
      next: 'Open the CSV and affected campaigns', target: '#ag-wake-schedule'
    }
  ];

  function select(index, moveFocus) {
    var output = outputs[index];
    if (!output) return;

    buttons.forEach(function (button, i) {
      button.setAttribute('aria-pressed', String(i === index));
    });

    Object.keys(parts).forEach(function (key) {
      parts[key].textContent = output[key];
    });
    if (wakeLink) wakeLink.setAttribute('href', output.target);

    detail.classList.remove('is-changing');
    void detail.offsetWidth;
    detail.classList.add('is-changing');
    if (moveFocus) buttons[index].focus({ preventScroll: true });
  }

  buttons.forEach(function (button, index) {
    button.addEventListener('click', function () { select(index, false); });
    button.addEventListener('keydown', function (event) {
      var next = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === null) return;
      event.preventDefault();
      select(next, true);
    });
  });

  select(0, false);
}());
