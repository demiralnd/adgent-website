/* Ask an AI about Adgent. One component under the FAQ of /, /for-agencies, /for-in-house and the
   product and sector pages listed in PAGES: the page holds
   <div class="askai" data-askai="PAGE"></div> and this file renders the label and four buttons.

   Two configs, edited independently:
   - PAGES: each page's question variants and the active one. Switch a page by changing `use`.
     The question is the visitor's own words, public and visible in the assistant; never add
     hidden instructions, source directions or claims to it.
  - PROVIDERS: how each assistant opens; the question always travels in the URL. `draft`: the
     assistant shows it as an unsent, editable draft. `ask`: the assistant runs it at once (no
     draft exists; GoMarble links Perplexity the same way).
     Behaviour verified in a browser on 2026-11-01 (website-v2/README.md); recheck before changing.

   Analytics, through the consent-gated gtag from site.js: `ask_ai_view` fires once when half of the
   row is on screen, `ask_ai_click` on each button. A click is not a sent question or an answer. */
(function () {
  'use strict';

  var TAIL = ' If you know our workflow from past chats, what might a typical week look like?';
  var PAGES = {
    home: {
      use: 'A2',
      q: {
        A1: 'How could Adgent (adgent.app) help our team and agency make decisions with Adgent\'s Aida in meetings and follow through?' + TAIL,
        A2: 'How could Adgent (adgent.app) help our team and agency challenge campaign assumptions with Adgent\'s Aida in meetings and follow through?' + TAIL
      }
    },
    'for-agencies': {
      use: 'B1',
      q: {
        B1: 'How could Adgent (adgent.app) help us and clients make Meta/Google Ads decisions with Adgent\'s Aida in meetings and follow through?' + TAIL,
        B2: 'How could Adgent (adgent.app) help clients question our Meta/Google Ads recommendations in meetings with Adgent\'s Aida and follow through?' + TAIL
      }
    },
    'for-in-house': {
      use: 'C1',
      q: {
        C1: 'How could Adgent (adgent.app) help our in-house team make Meta/Google Ads decisions with Adgent\'s Aida in meetings and follow through?' + TAIL,
        C2: 'How could Adgent (adgent.app) help our in-house team challenge assumptions and prioritise with Adgent\'s Aida in meetings and follow through?' + TAIL
      }
    },
    /* Product and sector pages: owner-approved 2026-11-01, one variant each. "Adgent's Aida" (owner,
       2026-11-01): signed-out ChatGPT read a bare "Aida" as aida-ads.com, a colleague or a chatbot. */
    meetings: { use: 'MT1', q: { MT1: 'How could Adgent (adgent.app) bring our Meta/Google Ads data and brand memory into meetings with Adgent\'s Aida and follow through?' + TAIL } },
    agents: { use: 'AG1', q: { AG1: 'How could Adgent (adgent.app) agents watch our Meta/Google Ads accounts and report back after decisions we make with Adgent\'s Aida?' + TAIL } },
    'campaign-build': { use: 'CB1', q: { CB1: 'How could Adgent (adgent.app) help us turn a decision made with Adgent\'s Aida in meetings into a Meta/Google Ads campaign?' + TAIL } },
    dashboards: { use: 'DB1', q: { DB1: 'How could Adgent (adgent.app) turn what we discuss with Adgent\'s Aida into a shareable Meta/Google Ads dashboard or report?' + TAIL } },
    ecommerce: { use: 'EC1', q: { EC1: 'How could Adgent (adgent.app) help our ecommerce team judge Meta/Google Ads on margin after returns with Adgent\'s Aida in meetings?' + TAIL } },
    'lead-generation': { use: 'LG1', q: { LG1: 'How could Adgent (adgent.app) help our lead-gen team judge Meta/Google Ads on lead quality with Adgent\'s Aida in meetings?' + TAIL } },
    marketplaces: { use: 'MP1', q: { MP1: 'How could Adgent (adgent.app) help our marketplace team judge Meta/Google Ads on net revenue with Adgent\'s Aida in meetings?' + TAIL } },
    'travel-hospitality': { use: 'TH1', q: { TH1: 'How could Adgent (adgent.app) help our hospitality team judge Meta/Google Ads on completed stays with Adgent\'s Aida in meetings?' + TAIL } },
    'account-memory': { use: 'AM1', q: { AM1: 'How could Adgent (adgent.app) keep our confirmed brand goals and decisions so Adgent\'s Aida brings them into Meta/Google Ads meetings?' + TAIL } },
    'daily-verdict': { use: 'DV1', q: { DV1: 'How could Adgent (adgent.app) bring its daily Meta/Google Ads verdict into our meetings with Adgent\'s Aida and follow through?' + TAIL } },
    'creative-intelligence': { use: 'CI1', q: { CI1: 'How could Adgent (adgent.app) help us judge running Meta/Google Ads creative with Adgent\'s Aida in meetings and brief new ads?' + TAIL } },
    planning: { use: 'PL1', q: { PL1: 'How could Adgent (adgent.app) turn a media plan we agree with Adgent\'s Aida in meetings into Meta/Google Ads work?' + TAIL } },
    'mobile-apps': { use: 'MA1', q: { MA1: 'How could Adgent (adgent.app) help our app growth team judge Meta/Google Ads creative with Adgent\'s Aida in meetings?' + TAIL } },
    'local-multi-location': { use: 'LO1', q: { LO1: 'How could Adgent (adgent.app) help our multi-location team judge each location\'s Meta/Google Ads with Adgent\'s Aida in meetings?' + TAIL } },
    'why-adgent': { use: 'WA1', q: { WA1: 'How could Adgent (adgent.app) help our agency and brand work on the same Meta/Google Ads answer with Adgent\'s Aida?' + TAIL } },
    /* AI Visibility is a separate product, so its question has no Aida. */
    'ai-visibility': { use: 'AV1', q: { AV1: 'How could Adgent (adgent.app) show where ChatGPT, Gemini and Google AI Mode recommend our brand, and who they recommend instead?' + TAIL } }
  };

  /* Verified 2026-11-01. ChatGPT: `?prompt=` drafts signed in and out; `?q=` sends at once when signed
     out, so never use it. Claude (`/new?q=` drafts) is off by owner decision 2026-11-01: its web search
     found adgent.app in 2 of 13 test runs and described other "Adgent" companies; Brave, the index
     it is believed to use, still shows the old homepage title. Retest before restoring it.
     Perplexity runs every `q` variant on load: `ask` by owner decision 2026-11-01.
     Gemini ignores every URL question, so by owner decision 2026-11-01 the fourth button is Google
     AI Mode (`udm=50`), which runs the question at once.
     Icons are used by owner decision (2026-11-01); sources and terms in assets/ask-ai/SOURCES.md. */
  var PROVIDERS = [
    { id: 'chatgpt', name: 'ChatGPT', icon: '/assets/ask-ai/chatgpt.svg', open: 'draft', url: 'https://chatgpt.com/', param: 'prompt' },
    { id: 'perplexity', name: 'Perplexity', icon: '/assets/ask-ai/perplexity.svg', open: 'ask', url: 'https://www.perplexity.ai/search/new', param: 'q' },
    { id: 'google-ai-mode', name: 'Google AI Mode', icon: '/assets/ask-ai/google-ai-mode.svg', open: 'ask', url: 'https://www.google.com/search?udm=50', param: 'q' }
  ];

  var LABEL = 'Ask an AI about Adgent';
  var d = document;

  function el(tag, cls, text) {
    var n = d.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function vh(text) { return el('span', 'vh', text); }

  /* URLSearchParams encodes spaces, "?", "/", parentheses and the domain safely; fixed params in
     `url` (udm=50) are kept. */
  function href(p, question) {
    var u = new URL(p.url);
    if (p.param) u.searchParams.set(p.param, question);
    return u.toString();
  }

  function render(root) {
    var key = root.getAttribute('data-askai');
    var page = PAGES[key];
    if (!page || !page.q[page.use]) return;
    var promptId = page.use;
    var question = page.q[promptId];
    var hid = 'askai-h-' + key;

    var h = el('h3', 'askai-h', LABEL);
    h.id = hid;
    var list = el('ul', 'askai-g');
    list.setAttribute('aria-labelledby', hid);
    PROVIDERS.forEach(function (p) {
      var a = el('a', 'btn btn-line askai-b');
      a.href = href(p, question);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      if (p.icon) {
        var img = el('img');
        img.src = p.icon;
        img.alt = '';
        img.width = 18;
        img.height = 18;
        img.decoding = 'async';
        a.appendChild(img);
      }
      a.appendChild(el('span', '', p.name));
      a.appendChild(vh(' (new tab)'));

      a.addEventListener('click', function () {
        if (window.gtag) window.gtag('event', 'ask_ai_click', { page_key: key, ai_provider: p.id, prompt_id: promptId, open_method: p.open });
      });
      var li = el('li');
      li.appendChild(a);
      list.appendChild(li);
    });

    root.textContent = '';
    root.append(h, list);

    if ('IntersectionObserver' in window) {
      var seen = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        seen.disconnect();
        if (window.gtag) window.gtag('event', 'ask_ai_view', { page_key: key, prompt_id: promptId });
      }, { threshold: 0.5 });
      seen.observe(root);
    }
  }

  Array.prototype.forEach.call(d.querySelectorAll('[data-askai]'), render);
})();
