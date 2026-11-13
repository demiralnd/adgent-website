/* Homepage narrative motion: chapters mark the operating story; the product tour moves in the
   chosen direction; the approval thread plays once in view and can be replayed. All content stays
   visible without JavaScript, and reduced motion keeps state feedback without spatial movement. */
(function () {
  'use strict';
  var d = document;
  var motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  var still = motionPreference.matches;

  /* ---- chapter line: a quiet page-level thread, not a blanket content reveal ---- */
  var chapters = Array.prototype.slice.call(d.querySelectorAll('[data-chapter]'));
  if (!still && chapters.length && 'IntersectionObserver' in window) {
    d.documentElement.classList.add('hm-motion');
    var chapterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-seen');
        chapterObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12 });
    chapters.forEach(function (chapter) { chapterObserver.observe(chapter); });
  } else {
    chapters.forEach(function (chapter) { chapter.classList.add('is-seen'); });
  }


  /* ---- creative-analysis film ---- */
  var v = d.querySelector('.hm-vid'), vb = d.querySelector('.hm-vt');
  var held = still, seen = false;
  function syncBtn() {
    if (!vb) return;
    var paused = v.paused;
    vb.classList.toggle('is-paused', paused);
    vb.setAttribute('aria-pressed', String(paused));
    vb.setAttribute('aria-label', paused ? 'Play the video' : 'Pause the video');
  }
  function film() {
    if (!v) return;
    var open = v.closest('[role=tabpanel]').classList.contains('on');
    if (open && seen && !held && !document.hidden) {
      var result = v.play();
      if (result && result.catch) result.catch(syncBtn);
    } else v.pause();
  }
  if (v && vb) {
    vb.addEventListener('click', function () {
      held = !v.paused;
      if (held) v.pause();
      else film();
    });
    v.addEventListener('play', syncBtn);
    v.addEventListener('pause', syncBtn);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        seen = entries[0].isIntersecting;
        film();
      }, { threshold: 0.25 }).observe(v);
    }
    syncBtn();
  }

  /* A trace follows existing evidence from source to output. It never performs a live action. */
  var workStories = Array.prototype.map.call(d.querySelectorAll('[data-work-story]'), function (root) {
    return {
      root: root,
      beats: Array.prototype.slice.call(root.querySelectorAll('[data-work-beat]')),
      status: root.querySelector('[data-work-status]'),
      timer: null
    };
  });
  function workBeat(story, index) {
    story.beats.forEach(function (beat, i) {
      beat.classList.toggle('is-current', i === index);
      beat.classList.toggle('is-traced', i <= index);
    });
    story.root.style.setProperty('--work-progress', (index + 1) / story.beats.length);
    story.status.textContent = story.beats[index].getAttribute('data-work-beat');
  }
  function finishWork(story) {
    clearTimeout(story.timer);
    story.timer = null;
    story.root.classList.remove('is-tracing');
    workBeat(story, story.beats.length - 1);
  }
  function playWork(story) {
    workStories.forEach(function (other) {
      if (other.timer) finishWork(other);
    });
    if (still || document.hidden) { finishWork(story); return; }
    story.root.classList.add('is-tracing');
    var index = 0;
    workBeat(story, index);
    function advance() {
      index += 1;
      workBeat(story, index);
      if (index < story.beats.length - 1) story.timer = setTimeout(advance, 900);
      else { story.timer = null; story.root.classList.remove('is-tracing'); }
    }
    story.timer = setTimeout(advance, 900);
  }
  workStories.forEach(function (story) {
    story.root.querySelector('[data-work-replay]').addEventListener('click', function () { playWork(story); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting && story.timer) finishWork(story);
      }).observe(story.root);
    }
  });
  document.addEventListener('visibilitychange', function () {
    film();
    if (document.hidden) workStories.forEach(finishWork);
  });
  motionPreference.addEventListener('change', function () {
    still = motionPreference.matches;
    if (still) {
      held = true;
      film();
      workStories.forEach(finishWork);
    }
  });

  /* ---- product story: manual WAI-ARIA tabs with directional continuity ---- */
  var st = d.querySelector('[data-story]');
  if (st) {
    var tabs = Array.prototype.slice.call(st.querySelectorAll('[role=tab]'));
    var panels = tabs.map(function (tab) {
      return d.getElementById(tab.getAttribute('aria-controls'));
    });
    var current = -1;

    function select(index, focus) {
      if (index === current) return;
      st.setAttribute('data-dir', current < 0 || index > current ? 'next' : 'prev');
      tabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        tab.classList.toggle('done', i < index);
        panels[i].classList.toggle('on', on);
        panels[i].setAttribute('aria-hidden', String(!on));
        panels[i].tabIndex = on ? 0 : -1;
        Array.prototype.forEach.call(panels[i].querySelectorAll('a,button,video'), function (item) {
          if (on) item.removeAttribute('tabindex');
          else item.setAttribute('tabindex', '-1');
        });
      });
      current = index;
      if (focus) tabs[index].focus();
      film();
      workStories.forEach(function (story) {
        if (panels[index].contains(story.root)) playWork(story);
        else if (story.timer) finishWork(story);
      });
    }

    tabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { select(index, false); });
      tab.addEventListener('keydown', function (event) {
        var n = tabs.length;
        var target = {
          ArrowRight: index + 1,
          ArrowLeft: index - 1,
          Home: 0,
          End: n - 1
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select((target + n) % n, true);
      });
    });
    select(0, false);
  }

  /* ---- illustrative approval playback; a visitor's choice always wins ---- */
  var thread = d.querySelector('.hm-thread');
  var replay = d.querySelector('[data-thread-replay]');
  var threadReversal = thread && thread.querySelector('[data-thread-reversal]');
  var threadPause = d.querySelector('[data-thread-pause]');
  var approvalTimer = 0, automaticStep = null, threadTimers = [];
  var threadPaused = false, followThread = true, threadStarted = false;
  var threadSteps = thread ? ['apply', 'revert'].map(function (kind) {
    var card = thread.querySelector('[data-thread-card="' + kind + '"][data-own]');
    if (!card) return null;
    var turn = card.closest('.hm-turn');
    var note = card.querySelector('.dc-act > span');
    var result = turn.querySelector('[data-thread-result]');
    result.setAttribute('role', 'status');
    result.setAttribute('aria-live', 'polite');
    result.setAttribute('tabindex', '-1');
    return {
      kind: kind,
      card: card,
      note: note,
      pendingNote: note.textContent,
      buttons: Array.prototype.slice.call(card.querySelectorAll('.dc-act [data-act]')),
      diffLabels: Array.prototype.map.call(card.querySelectorAll('.dc-diff > div > span'), function (label) {
        return { element: label, pendingText: label.textContent };
      }),
      choice: turn.querySelector('[data-thread-choice]'),
      result: result,
      ledger: turn.querySelector('[data-thread-ledger]'),
      ledgerNote: turn.querySelector('[data-thread-ledger] span'),
      state: 'pending'
    };
  }).filter(function (step) { return step; }) : [];

  function cancelApproval() {
    clearTimeout(approvalTimer);
    if (automaticStep) automaticStep.card.classList.remove('is-counting');
    automaticStep = null;
  }

  function queueThread(callback, delay) {
    threadTimers.push(setTimeout(callback, delay));
  }

  function stepInView(step) {
    var rect = step.card.getBoundingClientRect();
    return !step.card.closest('[hidden]') && rect.bottom > 100 && rect.top < innerHeight * .8;
  }

  function scheduleApproval() {
    cancelApproval();
    if (threadPaused || d.hidden || thread.contains(d.activeElement)) return;
    var step = threadSteps.find(function (item) { return item.state === 'pending' && stepInView(item); });
    if (!step) return;
    if (!threadStarted) { followThread = true; threadStarted = true; }
    automaticStep = step;
    step.card.classList.add('is-counting');
    approvalTimer = setTimeout(function () {
      if (d.hidden || !stepInView(step)) { cancelApproval(); return; }
      resolveThread(step, 'approve', true);
    }, 4500);
  }

  function revealThread(element) {
    element.hidden = false;
    element.classList.add('is-arriving');
    if (!followThread || d.hidden) return;
    var bounds = thread.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > innerHeight) return;
    var delta = element.getBoundingClientRect().bottom - innerHeight + 32;
    if (delta > 0) window.scrollTo({ top: scrollY + delta, behavior: motionPreference.matches ? 'instant' : 'smooth' });
  }

  function resetThread() {
    cancelApproval();
    threadTimers.forEach(clearTimeout);
    threadTimers = [];
    followThread = true;
    threadStarted = false;
    threadSteps.forEach(function (step) {
      step.state = 'pending';
      step.card.classList.remove('done');
      step.card.setAttribute('data-state', step.state);
      step.note.textContent = step.pendingNote;
      step.diffLabels.forEach(function (label) { label.element.textContent = label.pendingText; });
      step.buttons.forEach(function (button) {
        button.hidden = false;
        button.disabled = false;
      });
      [step.choice, step.result].forEach(function (bubble) {
        bubble.hidden = true;
        bubble.textContent = '';
      });
      step.ledger.hidden = true;
      step.ledgerNote.textContent = step.kind === 'apply'
        ? 'Approved by you · Before-state saved' : 'Approved by you · Reverses entry 1';
      [step.choice, step.result, step.ledger].forEach(function (element) { element.classList.remove('is-arriving'); });
    });
    if (threadReversal) threadReversal.hidden = true;
  }

  resetThread();

  function playThread() {
    if (!thread || still) return;
    thread.classList.remove('is-playing');
    void thread.offsetWidth;
    thread.classList.add('is-playing');
  }
  if (thread && !still && 'IntersectionObserver' in window) {
    var threadObserver = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      threadObserver.disconnect();
      playThread();
    }, { threshold: 0.25 });
    threadObserver.observe(thread);
  }
  if (replay) replay.addEventListener('click', function () {
    resetThread();
    playThread();
    scheduleApproval();
  });

  function resolveThread(step, action, automatic) {
      if (!step || step.state !== 'pending') return;
      if (step.kind === 'revert' && (!threadSteps[0] || threadSteps[0].state !== 'approved')) return;
      cancelApproval();
      var approved = action === 'approve';
      var reverting = step.kind === 'revert';
      step.state = approved ? 'approved' : 'deferred';
      step.card.classList.add('done');
      step.card.setAttribute('data-state', step.state);
      step.note.textContent = approved
        ? (reverting ? 'Reverted and logged: Off → On.' : 'Applied and logged: On → Off.')
        : (reverting ? 'Skipped. Audience Network stays Off.' : 'Skipped. Audience Network stays On.');
      if (approved) step.diffLabels.forEach(function (label, index) {
        label.element.textContent = index === 0 ? 'Before' : 'Applied';
      });
      step.buttons.forEach(function (control) {
        control.disabled = true;
        control.hidden = true;
      });
      step.choice.textContent = approved
        ? (reverting ? 'Approve the reversal.' : 'Approve the exclusion.')
        : (reverting ? 'Keep the exclusion.' : 'Keep Audience Network On.');
      if (automatic) step.ledgerNote.textContent = reverting
        ? 'Example approval · Reverses entry 1' : 'Example approval · Before-state saved';
      revealThread(step.choice);
      step.result.textContent = approved
        ? (reverting
          ? 'Reversal approved and applied: Meta Audience Network Off → On. Logged below.'
          : 'Exclusion approved and applied: Meta Audience Network On → Off. Logged below.')
        : (reverting
          ? 'Reversal skipped. Meta Audience Network remains Off; the exclusion is unchanged. No new ledger entry.'
          : 'Exclusion skipped. Meta Audience Network remains On. No account change or ledger entry.');
      queueThread(function () {
        revealThread(step.result);
      }, 300);
      if (approved) queueThread(function () { revealThread(step.ledger); }, 650);
      if (!reverting && approved && threadReversal) queueThread(function () {
        revealThread(threadReversal);
        scheduleApproval();
      }, 1400);
  }

  if (thread) {
    thread.addEventListener('click', function (event) {
      var button = event.target.closest('[data-act]');
      if (!button || button.disabled || button.hidden) return;
      var step = threadSteps.find(function (item) { return item.buttons.indexOf(button) !== -1; });
      var action = button.getAttribute('data-act');
      if (!step || (action !== 'approve' && action !== 'skip')) return;
      event.preventDefault();
      followThread = true;
      resolveThread(step, action, false);
    });
    thread.addEventListener('focusin', cancelApproval);
    thread.addEventListener('focusout', function () { queueThread(scheduleApproval, 0); });
    if ('IntersectionObserver' in window) {
      var approvalObserver = new IntersectionObserver(scheduleApproval, { threshold: [0, .35, .75] });
      threadSteps.forEach(function (step) { approvalObserver.observe(step.card); });
    }
    /* The observer only reports threshold crossings. A card revealed below the .8 line that smooth-scrolls
       into place crosses none, so re-check on scroll while no countdown is running. */
    window.addEventListener('scroll', function () { if (!automaticStep) scheduleApproval(); }, { passive: true });
    d.addEventListener('visibilitychange', scheduleApproval);
    ['wheel', 'touchstart', 'keydown'].forEach(function (name) {
      window.addEventListener(name, function () { followThread = false; }, { passive: true });
    });
  }
  if (threadPause) threadPause.addEventListener('click', function () {
    threadPaused = !threadPaused;
    threadPause.textContent = threadPaused ? 'Play demo' : 'Pause demo';
    threadPause.setAttribute('aria-pressed', String(threadPaused));
    followThread = !threadPaused;
    scheduleApproval();
  });

  /* ---- AI Visibility: one buyer question becomes a dated product reading ---- */
  var aiFlow = d.querySelector('[data-ai-flow]');
  if (aiFlow) {
    var aiTabs = Array.prototype.slice.call(aiFlow.querySelectorAll('[role=tab]'));
    var aiPanels = aiTabs.map(function (tab) { return d.getElementById(tab.getAttribute('aria-controls')); });
    var aiRows = Array.prototype.slice.call(aiFlow.querySelectorAll('[data-ai-row]'));
    var aiCount = aiFlow.querySelector('[data-ai-count]');
    var aiRecCount = aiFlow.querySelector('[data-ai-rec-count]');
    var aiLevels = [2, 1, 3, 0];
    var aiTimers = [];

    function clearAiTimers() {
      aiTimers.forEach(clearTimeout);
      aiTimers = [];
    }

    function aiReading(index, focus, progressive, animate) {
      aiTabs.forEach(function (tab, i) {
        var on = i === index;
        tab.setAttribute('aria-selected', String(on));
        tab.tabIndex = on ? 0 : -1;
        aiPanels[i].hidden = !on;
        aiRows[i].classList.toggle('is-active', on);
        aiRows[i].classList.toggle('is-done', !progressive || i <= index);
      });

      var read = progressive ? aiLevels.slice(0, index + 1) : aiLevels;
      aiCount.textContent = String(read.filter(function (level) { return level > 0; }).length);
      aiRecCount.textContent = String(read.filter(function (level) { return level === 3; }).length);

      if (animate) {
        aiFlow.classList.remove('is-reading');
        void aiFlow.offsetWidth;
        aiFlow.classList.add('is-reading');
      }
      if (focus) aiTabs[index].focus();
    }

    function chooseAi(index, focus) {
      clearAiTimers();
      aiReading(index, focus, false, !still);
    }

    aiTabs.forEach(function (tab, index) {
      tab.addEventListener('click', function () { chooseAi(index, false); });
      tab.addEventListener('keydown', function (event) {
        var n = aiTabs.length;
        var target = {
          ArrowRight: index + 1,
          ArrowLeft: index - 1,
          Home: 0,
          End: n - 1
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        chooseAi((target + n) % n, true);
      });
    });

    if (still || !('IntersectionObserver' in window)) {
      aiReading(0, false, false, false);
    } else {
      aiFlow.classList.add('is-ready');
      aiRows.forEach(function (row) { row.classList.remove('is-done'); });
      aiCount.textContent = '0';
      aiRecCount.textContent = '0';
      var aiObserver = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        aiObserver.disconnect();
        [0, 1, 2, 3].forEach(function (index) {
          aiTimers.push(setTimeout(function () { aiReading(index, false, true, true); }, 100 + index * 1050));
        });
        aiTimers.push(setTimeout(function () { aiReading(2, false, false, false); }, 4300));
      }, { threshold: 0.25 });
      aiObserver.observe(aiFlow);
    }
  }
})();
