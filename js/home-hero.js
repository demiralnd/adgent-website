/* Homepage hero: three independent meeting scenarios and a navigable sample app.
   Decisions are local to the demo and require the visitor's explicit approval. */

/* Keep YouTube off the initial page load. The ordinary link also works without JS. */
(function(){
  const trigger=document.getElementById('hh-watch');
  const dialog=document.getElementById('hh-film');
  if(!trigger||!dialog||typeof dialog.showModal!=='function')return;
  const player=document.getElementById('hh-film-player');
  const loading=dialog.querySelector('.hh-film-loading');
  trigger.setAttribute('aria-haspopup','dialog');
  trigger.setAttribute('aria-controls',dialog.id);
  trigger.addEventListener('click',event=>{
    if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    event.preventDefault();
    if(dialog.open)return;
    loading.hidden=false;
    const frame=document.createElement('iframe');
    frame.title='Adgent in action: your AI marketing employee';
    frame.width='1920';
    frame.height='1080';
    frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen=true;
    frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.src='https://www.youtube-nocookie.com/embed/J-24UJivk9Y?autoplay=1&playsinline=1&rel=0';
    frame.addEventListener('load',()=>{loading.hidden=true;},{once:true});
    player.replaceChildren(frame);
    dialog.showModal();
  });
  dialog.addEventListener('close',()=>{player.replaceChildren();});
  if(!('closedBy' in HTMLDialogElement.prototype)){
    let pressedOutside=false;
    const outside=event=>{
      const rect=dialog.getBoundingClientRect();
      return event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom;
    };
    dialog.addEventListener('pointerdown',event=>{pressedOutside=outside(event);});
    dialog.addEventListener('pointerup',event=>{
      if(pressedOutside&&outside(event))dialog.close();
      pressedOutside=false;
    });
  }
})();

/* The sample app window: the menu switches the canvas view and the chat thread beside it.
   Approve on the Decisions card writes a row into the Change ledger view. Local state only. */
(function(){
  const app=document.getElementById('hx');
  if(!app)return;
  const btns=[...app.querySelectorAll('.hx-nav [data-v]')];
  const panes=[...app.querySelectorAll('.hx-th[data-v],.hx-v[data-v]')];
  const card=document.getElementById('hx-dec');
  const note=card.querySelector('.hx-act span');
  const result=card.querySelector('.hx-result');
  const n=document.getElementById('hx-n');
  const summary=document.getElementById('hx-sum');
  const ledger=document.getElementById('hx-lg');
  const said=app.querySelector('.hx-th[data-v="dec"] .hx-ai:last-child');

  function go(view){
    btns.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.v===view)));
    panes.forEach(pane=>{pane.hidden=pane.dataset.v!==view;});
  }


  function resolveDecision(action){
    if(card.classList.contains('done')||(action!=='no'&&action!=='ok'))return;
    card.classList.add('done');
    result.hidden=false;
    result.textContent=action==='ok'?'Approved':'Deferred';
    result.dataset.state=action;
    if(action==='no'){
      note.textContent='Kept as it is.';
      said.textContent='Understood. The ad is still running; the replacement brief stays available.';
      return;
    }
    note.textContent='Applied by Selin and logged in the Change Ledger.';
    said.textContent='Done. “Delivered tomorrow” is paused, and the change is in your ledger.';
    n.textContent='2';
    summary.textContent='2 need you';
    const row=document.createElement('p');
    row.className='hx-lr new';
    row.innerHTML='<span>Just now</span><b>Ad · Delivered tomorrow</b><em><s>Active</s> → Paused</em><small>Owner · Selin · Revert with Agent</small>';
    ledger.prepend(row);
  }

  btns.forEach(button=>button.addEventListener('click',()=>go(button.dataset.v)));
  card.addEventListener('click',event=>{
    const button=event.target.closest('[data-act]');
    if(!button||card.classList.contains('done'))return;
    resolveDecision(button.dataset.act);
    window.dispatchEvent(new CustomEvent('adgent:decision',{detail:{action:button.dataset.act,source:'app'}}));
  });
  window.addEventListener('adgent:decision',event=>{
    if(event.detail?.source==='app')return;
    resolveDecision(event.detail?.action);
  });
})();

/* Scenario selection never approves a change. The brand-memory decision and app
   share one explicit choice; switching views preserves the selected scenario. */
(function(){
  const tabs=[...document.querySelectorAll('.hh-tabs [data-hv]')];
  const views=[...document.querySelectorAll('.hh-views > [data-hv]')];
  const meeting=document.getElementById('mw');
  if(!meeting||!tabs.length)return;
  const status=meeting.querySelector('[data-decision-status]');
  const card=document.getElementById('mw-dec');
  const note=card.querySelector('.hx-act span');
  const result=card.querySelector('.hx-result');
  const scenarios=[...meeting.querySelectorAll('.mw-scenarios [data-scenario]')];
  const panels=[...meeting.querySelectorAll('.mw-dialogue,.mw-map')];
  const report=document.getElementById('creative-report');
  const reportParts=[...meeting.querySelectorAll('[data-report-stage]')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let reportTimers=[], reportReady=false;

  function reportStage(stage){
    reportParts.forEach(part=>{
      part.hidden=Number(part.dataset.reportStage)>stage;
      part.inert=part.hidden;
    });
    if(stage===2)reportReady=true;
  }

  function showView(name){
    tabs.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hv===name)));
    views.forEach(view=>{
      view.hidden=view.dataset.hv!==name;
      view.inert=view.hidden;
    });
  }

  function showScenario(name, immediate=false){
    scenarios.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scenario===name)));
    panels.forEach(panel=>{
      panel.hidden=panel.dataset.scenario!==name;
      panel.inert=panel.hidden;
    });
    reportTimers.forEach(clearTimeout);
    reportTimers=[];
    if(name!=='creative'||reportReady)return;
    if(immediate||reduced.matches){reportStage(2);return;}
    reportStage(0);
    reportTimers.push(setTimeout(()=>reportStage(1),600));
    reportTimers.push(setTimeout(()=>reportStage(2),2300));
  }


  function resolveDecision(action){
    if(card.classList.contains('done')||(action!=='no'&&action!=='ok'))return;
    card.classList.add('done');
    result.hidden=false;
    result.textContent=action==='ok'?'Approved':'Deferred';
    result.dataset.state=action;
    note.textContent=action==='no'?'Kept as it is.':'Applied by Selin and logged in the Change Ledger.';
    status.textContent=action==='no'
      ? 'The brief stays available. No account change was made.'
      : 'Selin approved pausing the ad. The same change is recorded in the app.';
  }

  scenarios.forEach(button=>button.addEventListener('click',()=>showScenario(button.dataset.scenario)));
  tabs.forEach(tab=>tab.addEventListener('click',()=>showView(tab.dataset.hv)));

  function openReport(){
    showView('meet');
    showScenario('creative',true);
    report.focus({preventScroll:true});
    report.scrollIntoView({block:'nearest',behavior:reduced.matches?'instant':'smooth'});
  }
  meeting.querySelector('.mw-report-link').addEventListener('click',event=>{
    event.preventDefault();
    if(location.hash!=='#creative-report')history.pushState(null,'','#creative-report');
    openReport();
  });
  window.addEventListener('hashchange',()=>{
    if(location.hash==='#creative-report')openReport();
  });
  if(location.hash==='#creative-report')openReport();


  card.addEventListener('click',event=>{
    const button=event.target.closest('[data-act]');
    if(!button||card.classList.contains('done'))return;
    resolveDecision(button.dataset.act);
    window.dispatchEvent(new CustomEvent('adgent:decision',{detail:{action:button.dataset.act,source:'meeting'}}));
  });
  window.addEventListener('adgent:decision',event=>{
    if(event.detail?.source==='meeting')return;
    resolveDecision(event.detail?.action);
  });
})();
