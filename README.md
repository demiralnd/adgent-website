# website-v2: the live marketing site

The redesign is live at **https://adgent.app** since 2026-10-19. This directory is the
canonical source; `~/adgent-website` contains the synchronized deployment worktree.
`website/` in this company-brain repo is the pre-v2 snapshot, not the current live mirror.
Pages are indexable, forms post to Web3Forms, and Google measurement is consent-gated.

```bash
cd website-v2
python3 build.py          # chrome, asset stamps, generated heads, sitemap/feed/llms files
python3 build.py --check  # the pre-deploy gate: exit 1 if anything is stale or audit() fails
python3 serve.py 8900     # http://127.0.0.1:8900 with clean URLs
```

## What changed, and why

**2026-11-15, Modern Web Guidance review corrections (owner-authorized commit and push).**

- Consent keyboard handling now runs after component handlers. Escape rejects optional
  cookies only from inside the banner; open menus and native dialogs retain their own
  Escape/focus behavior. The nonblocking banner no longer intercepts menu Tab handlers.
- Desktop dropdown visibility, chevrons and `aria-expanded` share the `.open` state.
  Hover previews can be pinned by a click; the next click closes them until re-entry.
  Touch pointers do not trigger hover previews. Existing drawer focus/inert behavior stays.
- Lead forms use native `ValidityState` alongside the existing dotted-domain policy.
  Malformed addresses such as `review@-example.com` remain inline errors, not POSTs.
  Trimmed input, first-invalid focus, error descriptions and failure/retry behavior remain.
- Homepage creative-analysis media now uses `preload="none"`, native lazy loading and an
  observer-deferred poster. Playback remains viewport-controlled. A noscript poster keeps
  the static example visible without JavaScript; the custom inactive play control is hidden.
- Creative Intelligence listens for reduced-motion changes: enabling reduction pauses the
  film and clears parallax transforms. Disabling reduction does not force video playback;
  explicit play remains available.
- Reader typography and controls use relative font sizes without overriding the root.
  Text-aware CSS and matching JavaScript breakpoints use em. Normal 16px-default heading
  curves remain unchanged; enlarged text can grow controls and reflow layouts. SVG/chart
  coordinate text and media geometry remain fixed. Grid minimums, wrapping, skip-link
  positioning and the homepage navy background were corrected after enlarged-text checks.
- Six creative cards now have responsive `srcset`/`sizes`, retaining their original high-DPR
  sources. Sixteen WebP variants were resized from the existing originals with Pillow
  LANCZOS, quality 85, method 6: widths 192/320 and, for originals wider than 600px, 480.
  At 1440px/DPR 1, the browser selected 59,686 bytes of images instead of 282,098 bytes.
  This measures those six images, not whole-page speed or field Core Web Vitals.
- Local Chrome proof: all 62 sitemap routes returned 200 and stayed at scroll position zero
  without document overflow at 390px with the browser default font set to 32px. Normal-size
  route checks also passed. Home, pricing, Creative Intelligence and the November article
  were visually reviewed at 390/768/1440 in light/dark preferences and default fonts 16/32
  (48 states); targeted heading/form text-overlap checks passed in the same states.
- Exercised menu hover/click/keyboard dismissal, drawer Escape/focus restoration, invalid
  email rejection, intercepted failure/retry responses, dialog dismissal, deferred video
  loading/play/pause, live reduced-motion changes, high-DPR image selection and no-JS poster.
  No form was delivered. New fallback alt text passed humanizer/copy-lint review.
  Physical Safari/iPhone and screen-reader speech were not tested; no SVG checker is
  present in either current website worktree.

**2026-11-13, homepage product video (owner-approved placement and release).**

- Added **Watch Adgent in action · 1:50** below the email form, inside the navy circle.
  The existing meeting/app selector and demo remain unchanged. Video:
  `https://www.youtube.com/watch?v=J-24UJivk9Y`.
- The normal link works without JavaScript; enhancement opens a native `<dialog>` with
  a responsive 16:9 YouTube privacy-enhanced embed, capped at 960px. No iframe or YouTube
  resource is requested until the visitor clicks. Closing destroys the iframe and stops
  playback; native focus handling returns to the invoker. Close button, Escape and backdrop
  dismissal are supported, with a pointer-boundary fallback where `closedby` is unavailable.
  A permanent **Watch on YouTube** link remains usable if the embed is blocked.
- `frame-src` in the report-only CSP now permits only `https://www.youtube-nocookie.com`.
  This is not a claim that YouTube playback is tracking-free. Dialog/backdrop scroll
  containment follows Modern Web Guidance as progressive enhancement; older Safari may
  still scroll the background. No third-party player library or new measurement event.
- Local proof: real embedded playback advanced; close/reopen, keyboard Enter/Escape,
  backdrop dismissal, focus return, iframe removal, no-JS link and blocked-embed fallback
  exercised. Hero and open player visually checked at actual CSS widths 390/768/1440 in
  light/dark settings: no horizontal overflow, 44px trigger and close target, 20px form gap.
  Palette intentionally stays fixed. Physical iPhone/Safari not exercised.
- Build and generated-head audit passed for 63 pages. Added copy passed humanizer/copy-lint
  review (no new claims, filler or banned wording). Impeccable's existing sample-UI
  typography/container warnings were not used to redesign unrelated content; its contrast
  warnings assume paper behind text that is rendered on the navy pseudo-element.
- Deployment backup: `~/adgent-website-backup-2026-11-13-video.tgz`; rollback target:
  `dpl_8mQzTZDRNWZwg7uC7a6FwMmF92zB`.
- Published as `dpl_3Fvcvst7ZVqA4KiNVzX7Z7nLPM4M`, promoted to `https://adgent.app`.
  Live proof: embedded playback advanced, mobile close stopped the player and restored
  focus, initial load requested no YouTube resources. All 62 sitemap URLs returned 200;
  stamped hero CSS/JS, feed and robots returned 200; metrics health returned `ok`;
  README/build/BACKLOG returned 404. Trigger/small duration contrast on navy measured
  15.92:1 / 8.71:1. The company-brain commit is task-scoped; the publication repository
  also records the previously deployed v2 cutover so Git cannot redeploy the retired site.

**2026-11-13, mobile entry scroll corrections (owner-authorized fix and release).**

- `site.js` now waits for both consent stylesheets before running CookieConsent. The
  vendor focuses its banner 100ms after opening; previously, a slow stylesheet left that
  banner in normal flow at the end of the document and focus scrolled the page to it.
  With consent CSS delayed 2.5s, `/pricing` opened at 2,734px in Chromium and WebKit;
  after the fix both open at 0px. A stylesheet failure leaves optional measurement off
  and does not mount an unstyled banner.
- `/features` had a separate WebKit jump: the initial active-section update called
  `scrollIntoView()` on its directory link and landed at 6,543px. `js/features.js` now
  scrolls only the directory's horizontal container and refreshes section tracking on
  load. It does not reset document scroll or override browser history restoration.
- Browser smoke: all 62 sitemap URLs opened at 0px, without horizontal document overflow,
  at 390px in Chromium and WebKit with delayed consent CSS (124 visits). Exercised Reject
  optional + reload, Accept all + measurement requests, footer preferences open/close,
  new-page link navigation, direct feature fragments, directory clicks, ordinary Back
  restoration, reading while CSS is pending, and failed vendor CSS. Measurement responses
  were intercepted locally; no analytics traffic or form submission was sent.
- Visually inspected `/pricing` and `/features` at 390/768/1440px in light/dark preferences:
  hero remains at the top, consent card is fixed at the bottom, no clipped consent controls.
  The site keeps its existing palette in both preferences. Physical iPhone Safari was not
  exercised. WebKit Back to a fragment-bearing URL reselected the fragment rather than
  the later reading position; that native-history behavior is not overridden by this fix.
- Reproduction for future changes: fresh consent state, mobile viewport, delay
  `/assets/vendor/cookieconsent-3.1.0.css` and `/consent.css` independently, then open
  `/pricing` and `/features`. No consent DOM may mount before both CSS loads complete;
  opening an ordinary URL must not move document scroll. No permanent browser suite exists
  here; these checks were run through the local preview and browser automation.
- Published as `dpl_8mQzTZDRNWZwg7uC7a6FwMmF92zB`, promoted to `adgent.app`.
  Live Chromium and WebKit repeated the full 62-URL delayed-CSS mobile sweep: 124/124
  responses were 200, all opened at 0px, none overflowed horizontally. Every page loaded
  `site.js?v=861946f0`; `/features` loaded `js/features.js?v=5020e14d`.
  Live rejection/reload, footer-to-page navigation and acceptance passed in both engines;
  measurement scripts were intercepted to avoid recording test visits.
  Browser health probes: both revised scripts 200, `/metrics/healthy` returned `ok`,
  `README.md`, `build.py` and `BACKLOG.md` returned 404. Generic Python HTTP probes were
  blocked with 403; the browser probes above reached the deployed site.
- Build/generated-head audit passed for 63 pages. Backup:
  `~/adgent-website-backup-2026-11-13-scroll.tgz`; rollback deployment:
  `dpl_EfVULqRxMJDazsnSkS2g7Vu7wQ8q`. Deployment mirror synchronized; no commit or push.

**2026-11-11, Safari article contents rail (owner-authorized fix and release).**

- WebKit captured an initial unstyled top-bar height of 5,824px in `--navh`, although the
  rendered bar was 65px. The stale value pushed article rails and fragment offsets below
  the viewport. `app.js` now observes the bar's rendered size with `ResizeObserver`;
  the shared offset follows layout/font changes rather than waiting for a window resize.
- Reproduced in WebKit before the fix; afterward the desktop rail starts beside the
  article and sticks at 101px while reading. Checked 390/768/1440px in light/dark preferences,
  mobile contents disclosure, fragment navigation, active-section tracking and a dynamic
  header resize. Chromium scroll smoke passed; no rail overlap or document overflow.
- Build and generated-head audit passed for 63 pages. CSS, article content and mobile
  disclosure behavior are unchanged.
- Production `dpl_EfVULqRxMJDazsnSkS2g7Vu7wQ8q` promoted to `adgent.app`.
  Live Chromium confirmed `app.js?v=84555c88`, the 65px header offset and 101px sticky rail.
  Page/script 200, www 308, internal README/build tooling 404, metrics health `ok`.
  Backup: `~/adgent-website-backup-2026-11-11-sticky.tgz`; rollback deployment:
  `dpl_6UvwGYro4ePz1CTap2zB63erayWF`.

**2026-11-10, November research article (owner-authorized publication; editorial date 11 November).**

- Published [`/11-11-vs-black-friday-turkey`](https://adgent.app/11-11-vs-black-friday-turkey)
  and made it the featured blog article. Research cutoff stays 10 November; search years
  2023–2025, transaction years 2024–2025 and Meta observations 3–8 November remain separate.
- Intent-led, free keyword research selected the 11.11/Black Friday comparison, not deal or
  date-shopping queries. SEO title/description, BlogPosting, canonical, OG/Twitter artwork,
  internal links, RSS, sitemap and existing LLM-readable exports are included. No English
  keyword-volume or ranking estimate was invented. Research decision:
  [`analysis-tr.md`](../marketing/content/kasim-2026/reanalysis-v2/analysis-tr.md#publication-and-search-discovery-10-november-2026).
- Reused the article layout, responsive tables and TOC; embedded the 2023 daily/trailing-average
  chart. Verified article and index at 390/768/1440 with both theme attributes (the site's
  palette is fixed), mobile TOC and keyboard chart scrolling. No body overflow, actual text
  fragment overlap or article runtime errors. Humanizer/copy-lint review: no prohibited wording
  or em dashes; the exact owner-selected multiplayer claim is retained.
- `build.py --check`: 63 pages, clean audit. Live article/index/artwork, RSS (25 items), sitemap
  (62 URLs), robots and `/metrics/healthy` returned 200; private build/docs/OG registry returned
  404. Live metadata and visible publication date are 2026-11-11. Python urllib probes returned
  403; native curl and Chromium confirmed public 200 responses.
- Production `dpl_6UvwGYro4ePz1CTap2zB63erayWF`
  (`https://adgent-website-g8gdq0ju3-nurettin-demirals-projects.vercel.app`, promoted to `adgent.app`).
  Backup: `~/adgent-website-backup-2026-11-10-november-research.tgz`. Rollback target:
  `dpl_FrtAHCBRkE1KCMm9tRj8NYZvHbuv`. Unrelated `assets/email/` was excluded from staging.
  No commit, push, form submission or social publication. The seven-page research PDF now links
  to the live article; its source/QA record is in `marketing/content/kasim-2026/reanalysis-v2/carousel-en.md`.

**2026-11-07, calmer `/creative-intelligence` hero (owner: "çok kaotik, sakinleştirelim, farklı
şeyleri öne çıkaralım"; deployed).**

- **12 floating creatives → 6, in a mirrored grid.** Each side has an outer column (4:5 over 1:1)
  and one 9:16 set lower: Saltbay, Dermaleaf, Trailstep left; Roomly, Headline Academy, Forge Club
  right. Right-side creatives anchor from the right (`.ci-cr.is-r`), so both sides share one set
  of positions. Removed from the hero: Doorstep Eats, Ember Roast (the next section is the same
  coffee ad), Pocketly, Warmknit, Skyward, Mirel. The phone swipe strip carries the same six.
- **The always-on chip shows the verdict, not the taxonomy.** The h1 already says hook, concept
  and angle, so the two-line Hook/Concept chip is gone. Each creative now carries one pill:
  Scaling or Wearing out with its metric vs concept average (values unchanged from each read).
  Under 1340px the metric is dropped so chips never overlap a neighbour. The full read still
  opens on hover, focus or tap.
- **Less motion.** The typed-chip animation is removed; drift is two uniform speeds (0.05 outer,
  0.09 inner) instead of twelve mixed-direction ones. Stage height is now
  `clamp(540px,40vw,600px)` to fit six creatives without a dead band.
- Verified locally: no chip or creative crosses the text column or another creative from
  1101 to 1940px (40px sweep); reads open by Tab and hover, Escape closes; 390px strip shows six
  cards; no console errors; `build.py --check` clean for 62 pages.
- Published at the owner's instruction. Backup `~/adgent-website-backup-2026-11-07.tgz`; sync
  diff was only this change (the untracked `assets/email/` was left out). Production
  `dpl_FrtAHCBRkE1KCMm9tRj8NYZvHbuv`
  (`https://adgent-website-krto0y79g-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
  Rollback: promote `dpl_51Lyewf1mRgVjmjboFddpN6xrSKu`. Live: the page 200 with six creatives and
  their verdict chips, its stamped CSS/JS 200, www 308, `README.md`/`build.py`/`BACKLOG.md` 404,
  `/metrics/healthy` ok, sitemap 61 URLs.

**2026-11-01, closing demo email forms + footer X/YouTube (owner request; deployed).**

- **Closing CTAs take a work email again.** The 21 closing bands that the 2026-10-29 form
  removal had left with a single **Pricing** button (about, agents, ai-visibility,
  campaign-build, change-ledger, creative-intelligence, daily-verdict, dashboards, features,
  ground-truth, planning, platform-change-log, specialists, trust-gate, why-adgent and the six
  industry pages) now carry the one-line `form.qf.demo`: **Work email** + **Request a demo**,
  posting to Web3Forms as `<slug>/qf-1` with subject "Adgent demo request · <slug>". This
  supersedes the closing-CTA part of the 2026-10-29 removal; the Pricing button is gone from
  these bands (Pricing stays in the navigation and footer). `app.css` keys the closing layout to
  `.qf` instead of `.btns`/`.btn` (steps right at ≥1101px, one column below); error text and
  the success pill use the homepage-hero colours on the dark band. Dead `.in-cta .done-msg` rule
  removed.
- **Footer:** `_partials/footer.html` now links all four accounts already in Organization
  `sameAs`: LinkedIn, Instagram, X (`x.com/adgentapp`) and YouTube (`youtube.com/@adgentapp`).
- Verified locally: `build.py --check` clean for 62 pages; no horizontal overflow on the four CTA
  variants at 1440 and 390; empty and malformed email show their messages; an intercepted POST
  (no real submission) reached Web3Forms and showed the success pill.
- Published at the owner's instruction. Backup `~/adgent-website-backup-2026-11-01h.tgz`; sync
  diff was only this change. Production `dpl_51Lyewf1mRgVjmjboFddpN6xrSKu`
  (`https://adgent-website-4uqwngjo5-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
  Rollback: promote `dpl_FKSUJG4YEWao47cU9pwA8tBqyd7V`. Live: 61/61 sitemap pages 200, the
  closing form on the sampled pages, four footer social links, `README.md`/`build.py`/`BACKLOG.md`
  404, www 308, `/metrics/healthy` ok.

**2026-11-01, "Ask an AI about Adgent" row (owner brief 2026-10-31; deployed 2026-11-01).**

- The owner brief is the decision the withdrawn 31 October module lacked. One component,
  `js/ask-ai.js`, mounted under the FAQ heading (`<div class="askai" data-askai="…">`, the FAQ
  block gets `.faq-ask`) on `/`, `/for-agencies`, `/for-in-house` and, since the same day,
  `/meetings`, `/agents`, `/campaign-build`, `/dashboards`, `/ecommerce`, `/lead-generation`,
  `/marketplaces`, `/travel-hospitality`, `/account-memory`, `/daily-verdict`,
  `/creative-intelligence`, `/planning`, `/mobile-apps`, `/local-multi-location`, `/why-adgent`
  and `/ai-visibility` (19 pages); styles under `.askai` / `.faq-ask` in `app.css`. Left out on
  purpose: `/change-ledger`, `/platform-change-log`, `/trust-gate` (would steer answers into the
  approval/audit story), `/ground-truth` (invented-integration risk), `/pricing` (invented
  prices), the free tools, `/features`, `/specialists`, legal pages and articles.
- Three providers: ChatGPT, Perplexity and **Google AI Mode**. The brief's set was four; the owner
  swapped Gemini in, then back to Google AI Mode on 2026-11-01 because Gemini ignores every URL
  question, and took **Claude off** the same day: its web search found adgent.app in 2 of 13 test
  runs and described other "Adgent" companies. Brave Search (believed, not confirmed, to back
  Claude's search) still shows the old homepage title "Generate High-Impact Ad Creatives…", and a
  topical query returns Ryze's blog before any adgent.app page. Retest Claude before restoring it.
  With three buttons the odd last one spans the row (two columns), or all three sit in one row on
  the tablet breakpoint. Questions: **A2** / B1 / C1 on the three original pages (homepage moved A1 → A2
  by owner decision after the answer test: Gemini answered A1 as a generic note-taker and A2
  correctly); one owner-approved question per product/sector page (MT1, AG1, CB1, DB1, EC1, LG1,
  MP1, TH1, AM1, DV1, CI1, PL1, MA1, LO1, WA1, AV1; AV1 has no Aida because AI Visibility is a
  separate product). Every Aida question says **"Adgent's Aida"** (owner, 2026-11-01, after ChatGPT read a
  bare "Aida" as aida-ads.com, a colleague or a chatbot); four were trimmed to stay ≤35 words
  (DB1 "shareable", MP1 "net revenue", TH1 "hospitality team", C2 "prioritise"). Switch a page by
  changing its `use` in `PAGES`.
- Opening behaviour (the question always travels in the URL): ChatGPT `/?prompt=` opens an
  editable draft (`?q=` sends at once when signed out, never use it). Perplexity `/search/new?q=`
  and Google AI Mode `/search?udm=50&q=` answer at once (`open_method: ask`; Perplexity has no
  draft URL, GoMarble links it the same way). Copy-and-open and its fallback were removed with
  Gemini.
- Answer test on the product/sector questions (2026-11-01, stopped by the owner before AI Mode
  finished): ChatGPT signed out 5 correct / 2 partly / 1 wrong, and every answer read adgent.app;
  its weak point is **who Aida is** (agents: matched to aida-ads.com; marketplaces: a human
  colleague; dashboards: a chatbot). Claude (owner account) found adgent.app once in eight;
  AdCrunch's "Adgent" crowded the rest. No provider invented past chats or integrations.
- Icons: from the providers' own brand files or sites, used without prior approval by owner
  decision 2026-11-01. Sources, terms and dates: `assets/ask-ai/SOURCES.md`.
- Analytics through the existing consent-gated gtag: `ask_ai_view` (`page_key`, `prompt_id`)
  fires once per page load when half of the row is on screen; `ask_ai_click` (`page_key`,
  `ai_provider`, `prompt_id`, `open_method`) on each button. A click is not a sent question.
  **Review 2026-11-22** (`.omp/reminders.md`): click/view rate together with a retest of answer
  quality decides the header "Ask AI" link; no automatic threshold.
- Published at the owner's instruction. Backup `~/adgent-website-backup-2026-11-01.tgz`; the
  worktree diff before sync was only this change (three mounts, the script, CSS, stamps, lastmod).
  `assets/ask-ai/SOURCES.md` added to `.vercelignore` (internal note; first deploy served it, the
  redeploy returns 404). Production `dpl_JAeKaKzbH6Xx1eiHPaYiPiz64Vah`
  (`https://adgent-website-7gaqxuqce-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
  Rollback: promote `dpl_9Zps4Pyrf2fyoMpV7pmaEpoQdwzG`. Live: 61/61 sitemap pages 200, redirects
  308, private files 404, security headers present, feed 24, `/metrics/healthy` ok, the row renders
  on all three pages at 390 and 1440, and a fresh load of `/for-in-house` makes no third-party
  request. Same day, the A2 switch and the Claude/Gemini icons were published the same way:
  backup `~/adgent-website-backup-2026-11-01b.tgz`, production `dpl_67bVEDGyARur1JrthqQLDUaAfGKg`
  (`https://adgent-website-pva47k49w-nurettin-demirals-projects.vercel.app`), rollback: promote
  `dpl_JAeKaKzbH6Xx1eiHPaYiPiz64Vah`. Live: script serves `use: 'A2'` and both icons (200
  `image/svg+xml`), 61/61 sitemap pages 200, `SOURCES.md` 404, `/metrics/healthy` ok.
  Perplexity `ask` went out as `dpl_CY7mphiAg742PZL5kXx681wtBbDv`. The eight product/sector
  mounts and Google AI Mode went out as `dpl_CyKgrbHgtd3eEyccZV2M2PXJEnNB`
  (`https://adgent-website-hrgaibt1e-nurettin-demirals-projects.vercel.app`; backup
  `~/adgent-website-backup-2026-11-01d.tgz`; rollback: promote `dpl_CY7mphiAg742PZL5kXx681wtBbDv`).
  Live: all 11 pages carry their mount, the script serves `udm=50`, 61/61 sitemap pages 200,
  `/metrics/healthy` ok. "Adgent's Aida" questions: `dpl_H938tgeYpko2mLizPr1Y4Y5EvY4Z` (rollback
  `dpl_CyKgrbHgtd3eEyccZV2M2PXJEnNB`); live script carries all 14. The eight further pages
  (AM1…AV1) went out as `dpl_BHPYBDPqTC7h6aRXnf6JvVDHGXct` (backup
  `~/adgent-website-backup-2026-11-01f.tgz`; rollback `dpl_H938tgeYpko2mLizPr1Y4Y5EvY4Z`); live:
  8/8 mounts, 19 pages in `PAGES`, 61/61 sitemap pages 200, `/metrics/healthy` ok. Claude off +
  `ask_ai_view`: `dpl_FKSUJG4YEWao47cU9pwA8tBqyd7V` (backup `~/adgent-website-backup-2026-11-01g.tgz`;
  rollback `dpl_BHPYBDPqTC7h6aRXnf6JvVDHGXct`); live script has three providers and the view
  event, 61/61 sitemap pages 200. Local check: the view event fires once per load at 1440/820/390.

**2026-10-31 (third release), Cloudflare beacon gone; Ask AI module withdrawn.**

- Cloudflare Web Analytics removed by the owner; a fresh load now makes **no** third-party
  request before consent.
- An "Ask an AI assistant about Adgent" homepage module (from the GoMarble growth X-ray) was
  shipped without an owner decision and removed the same day at the owner's instruction. It stays
  an open owner decision with the X-ray's other items (PH launch tool/date, introducer commission).

**2026-10-31 (second release), search consoles, sources and headers (deployed).**

- **Search Console** (owner's browser session; the service-account key file is still empty, the
  service account itself is already a Full user): Pages report 6 indexed / 62 not, 55 of them
  "Discovered – currently not indexed". `feed.xml` submitted beside `sitemap.xml`; indexing
  requested for 8 priority URLs. Finding recorded in `marketing/content/seo-keywords.md`.
- **Bing Webmaster Tools:** site imported from Search Console, `sitemap.xml` and `feed.xml`
  submitted; IndexNow pushed the 12 URLs changed in this release (200).
- **Articles:** 10 carry 1–2 verified official sources (Google Ads Help, Meta developer docs)
  and a visible "Updated 31 October 2026". Three statements the sources contradicted were
  corrected: Google's default attribution is data-driven, not last click
  (`/meta-vs-google-ads-which-first`); PMax's channel split is in the Channel performance report
  (data from June 2025), not script-only (`/how-to-audit-performance-max`); Meta's 50-event
  learning threshold is per ad set (`/cbo-vs-abo-vs-advantage-plus`). Four titles now carry the
  measured search phrase (R15 §3): learning phase, ad fatigue, attribution window, Audience
  Network; H1s and social cards unchanged. The MCP article waits for the R14 test and for the
  index finding above.
- **Headers:** `Content-Security-Policy-Report-Only` added (no blocking). Live check before and
  after "Accept all": zero violations. Enforce after a few clean days. HSTS
  `includeSubDomains; preload` deliberately not added: it would bind every adgent.app subdomain
  to HTTPS and preload removal takes months.
- **Form delivery verified:** a real homepage submission (31 Oct, 18:32 TRT) returned
  `success:true` and arrived at osman@adgent.app (owner confirmed).
- Production `dpl_4r3YFfcbgw67ifEMuHE7SnKzmwzJ`; rollback `dpl_YFZWMbNbHNk487BCMTeHWx4q1xCV`;
  backup `~/adgent-website-backup-2026-10-31b.tgz`. 61/61 pages 200, private files 404.
- **Cloudflare AI crawlers (owner changed the dashboard, re-measured same day):** GPTBot,
  ClaudeBot, CCBot, Bytespider, Amazonbot, cohere-ai, anthropic-ai, Applebot-Extended and
  Meta-ExternalAgent now get 200, matching `robots.txt`. A spoofed `Applebot` UA still gets the
  Cloudflare challenge page (403); likely verified-bot impersonation protection, so real Applebot
  from Apple's IPs should pass [inference, not observed]. The Cloudflare Web Analytics beacon
  still loads before consent.

**2026-10-31, owner-requested follow-ups (deployed).**

- **IndexNow:** key file `/311fd7d9f5dca39edbe9dfd199c3e691.txt` at the root (keep it; it proves
  ownership). After deploy all 61 sitemap URLs were submitted: `api.indexnow.org` 202,
  `bing.com/indexnow` 200. Resubmit changed URLs after future releases with the same key. Bing
  Webmaster Tools itself needs the owner's sign-in (import from Search Console).
- **"Same Adgent" scoped:** `/pricing` and homepage FAQ, `/for-agencies` meta description and
  `llms.txt` now say the shared work happens in the meeting and that separate client logins
  and roles are not built yet (`roadmap/current-state.md` seats/roles; `gtm/03` 2026-10-15
  product-status boundary).
- **Phones:** footer groups flow inline (each link still 44px), footer 1,115px at 390 (was
  ~1,500–1,900). Blog archive uses a 96px thumbnail beside each title with a two-line summary;
  `/blog` at 390 is 8,002px (was 14,485). `/for-in-house` at ≤640 hides the chat panel beside
  the AI Visibility reading, the Live/Pilot/Exploring strip (now an FAQ answer on every width),
  the two read visuals and the meeting summary list: 9,415px (was 11,917). Desktop unchanged.
  Aida's photo avatar stays (owner).
- `build.py --check` passed; no horizontal overflow at 390/768/1440 on the three pages; blog and
  for-in-house AI section inspected at 390. Published: backup
  `~/adgent-website-backup-2026-10-31.tgz`, production `dpl_YFZWMbNbHNk487BCMTeHWx4q1xCV`
  (`https://adgent-website-k6edpd0li-nurettin-demirals-projects.vercel.app`). Rollback: promote
  `dpl_FEFDZiBaVQibfPXYAPtJERJt6U3x`. Live: 61/61 pages 200, redirects 308, private files 404,
  four security headers, feed 24, `/metrics/healthy` ok, key file served.

**2026-10-30, audit fixes and owner decisions (deployed).**

From the 2026-10-30 three-way site audit (technical/logic, visual, SEO/GEO). The first five
bullets needed no decision; the owner's same-day decisions follow them.

- **Copy and logic:** `/features` FAQ no longer reads "Pricing about your team's workflow." (the
  2026-10-19 rename had dropped the verb; FAQPage JSON-LD and `llms-full.txt` regenerate from it).
  `/meetings` attributes report-building and account moves to Adgent, not "she" (gtm/03
  2026-10-30 pronoun rule). Homepage FAQ opens with **What is Adgent?**, worded from the
  2026-10-25 subhead; approval-gated writes per `roadmap/current-state.md:221`. The 15 product
  and team ledes open with a one-sentence definition. `/planning` has a FAQ, answered from the
  page itself and its Pilot status. `/daily-verdict`, `/trust-gate`, `/ground-truth` and
  `/ecommerce` list two related articles under the FAQ heading (shared `.rel`). Six titles over
  60 characters were shortened; the 12-point count matches the article's 12 items.
- **Build:** fonts are no longer `?v=`-stamped, so the preload URL equals the `@font-face` URL
  and each face downloads once (it downloaded twice; `/pricing` lab CLS was 0.146). Sitemap
  `lastmod` hashes `<main>` only, so chrome and schema edits stop bumping every page; existing
  dates were kept on migration. Every page links `/llms.txt`. Organization `sameAs` adds X and
  YouTube. The feed sorts by `dateModified` and `lastBuildDate` follows it; `vercel.json`
  serves it as `application/rss+xml`.
- **Visual:** form-less closing CTAs (15 pages, emptied by the 2026-10-29 form removal) follow
  the features/about layout on wide screens: copy and button left, steps right; one column
  below 1101px. Article responsive tables label cells from every head cell, so the audit
  article's comparison no longer tags each row "Automated". Travel's day calendar and hero
  squares are visible on paper. Creative-analysis chips sit above neighbouring creatives.
  `/agents` hero button spacing; coarse-pointer 44px targets extended to `.btn`, `a.pill`, tabs
  and `.go`; smaller wrap fixes on dashboards, meetings, planning and pricing; for-agencies
  Approved stamp no longer covers the card meta. `.btn-acc` hover is visible.
- **Behaviour and accessibility:** the homepage lower chat now auto-approves the reversal on
  desktop too (a scroll recheck replaces the single observer crossing that smooth scroll could
  skip). `/ai-visibility` decorative suggestion buttons are inert spans. `/campaign-build`
  "Change a field" scrolls to and focuses the inspector. The cookie banner no longer traps Tab
  (the vendor's `<html>` listener is bypassed while only the inline banner is open), Escape
  rejects optional cookies, and its buttons are 44px on touch. Drawer is a labelled dialog;
  nested `aside` landmarks became labelled groups; duplicate nav/form names were split. The
  `?accent=` palette switch works only on localhost.
- Verified locally on `serve.py`: `build.py --check` passed for 62 pages. Lower-chat autoplay
  reached two approvals and two ledger entries at 1440x900, 1440x1200 and 390x844. Banner: 44px
  buttons, Tab continues into the page, Escape writes `categories:["necessary"]`. Visually
  inspected the CTA variants at 1440/1024/390, the audit table at 390, `/agents`,
  travel calendar, creative-analysis hero, planning/homepage FAQs and the related-reading block.
  No horizontal overflow on 16 changed pages at 390/768/1440; no console errors on clean loads.
- **Owner decisions, same day:** homepage meeting card no longer reserves the tallest scenario's
  height (`css/home-hero.css`: inactive views/scenarios are `display:none`; the output card fills
  the side column), so no empty band opens under shorter scenarios. Measured at 390/768/1440 in
  all three scenarios: 20–32px under the last bubble and 24–28px under the side panel (was
  122–181px). `/for-in-house` hero is an email form like `/for-agencies` (the closing form is now
  "Request a demo (bottom)"). Microsoft Clarity stays and is named in the consent panel and
  `/privacy` §02 (last updated 30 October 2026); `business/legal/security-and-privacy.md` §3
  records it as a website-only tool. The founder's name stays off the site until the owner
  leaves his employer (`gtm/geo-tracking/README.md`): no Person author. Not touched by owner
  instruction: `/security` revoke sentence, storyboard "Live" label, pricing.
- **Published** with authorization. Backup `~/adgent-website-backup-2026-10-30-audit.tgz`;
  staging copy, CLI 65.2.0, `deploy --prod --skip-domain`, then promote. Production:
  `dpl_FEFDZiBaVQibfPXYAPtJERJt6U3x`
  (`https://adgent-website-pugtaf6a8-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
  Rollback: promote `dpl_8jJyP2G4bdjbtGqoh9rSjuZJod95`. Live checks: 61/61 sitemap pages 200;
  www/vercel.app/legacy redirects 308; `BACKLOG.md`/`README.md`/`build.py` 404; four security
  headers; feed 24 items as `application/rss+xml`; sitemap 61; `/metrics/healthy` ok; fresh
  load sends nothing to Google or Clarity before a choice (Cloudflare beacon only). The meeting
  card was re-measured and inspected live at 390 and 1440. No real form submission, commit or push.
- **Still open:** Cloudflare 403 on AI training crawlers vs `robots.txt`; "same Adgent" FAQ
  wording; directory listings; Aida photo avatar; footer folding, blog archive covers and
  for-in-house length.

**2026-10-29, owner-requested navigation CTA removal (deployed).**

- Removed **Request a demo** from the shared header and its mobile drawer; the link duplicated
  the email-only conversion already available in the hero. Hero and lower-page forms, footer
  demo link and other navigation remain unchanged. This supersedes the navigation-CTA part
  of the 2026-10-15 decision below.
- Rebuilt all 62 pages; `build.py --check` passed. Inspected the homepage header and hero at
  390/768/1440px with light/dark preferences: no horizontal overflow or overlapping header
  controls; mobile menu targets remain 44px. Product opened and closed with Escape; the
  mobile drawer navigated to About. The hero email field still rejects empty input.
- Owner authorized publication after local verification. Synced `~/adgent-website`, backed up
  its previous contents to `~/adgent-website-backup-2026-10-29-header.tgz`, then deployed an
  isolated staging copy with CLI 65.2.0 (`--prod --skip-domain`) and promoted it.
  Production: `dpl_8jJyP2G4bdjbtGqoh9rSjuZJod95`
  (`https://adgent-website-jd7m8fpb5-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
  Rollback: promote `dpl_9Z8TKdQJ4j1WBQ28f5wfffXWGHVg`.
- Live checks: all 61 sitemap pages returned 200 without the navigation demo CTA; both
  homepage email forms remain. Visually inspected 390/768/1440px in light/dark preferences:
  no horizontal overflow; Product opens and mobile About navigation works.
  www/project/legacy redirects, private-file 404s, feed (24 items), four security headers and
  `/metrics/healthy` passed. No external form submission, commit or push.

**2026-10-26, second release authorized by the owner: homepage cover sync + raster favicons.**

- Shipped the 2026-10-25 source state (H1 "The first multiplayer AI in the marketing vertical.",
  slide-01 lede, title/meta/OG, llms files, `/favicon.ico` + `/apple-touch-icon.png`). Between
  2026-10-19 and this release production still served the 2026-10-15 "AI marketing brain" H1:
  the 2026-10-25 edit was source-only ("No publication"), which is why the live hero lagged.
- Same procedure as the cutover: `~/adgent-website` synced from this directory (`.git/`,
  `.vercel/`, `.gitignore`, `BACKLOG.md` preserved; replaced files backed up to
  `~/adgent-website-backup-2026-10-26.tgz`), isolated staging copy, CLI 65.2.0,
  `deploy --prod --skip-domain --yes`, then promote. Production is
  `dpl_9Z8TKdQJ4j1WBQ28f5wfffXWGHVg`
  (`https://adgent-website-qhhvxhcv9-nurettin-demirals-projects.vercel.app`, alias `adgent.app`).
- Probes after promotion: live H1/title updated (`last-modified` 2026-10-26 11:03 UTC); www,
  `*.vercel.app`, `/built-from-chat`, `/demo`, `/cbo-vs-abo-2026` → 308 to their targets;
  `BACKLOG.md`/`README.md`/`build.py` 404; favicon, apple-touch-icon and the homepage OG card 200;
  feed 24 items; sitemap 61 URLs; `/metrics/healthy` ok; four security headers present.
  No browser screenshot this release (relay unavailable); hero was inspected at 1440/390 on
  2026-10-25. No commit, push or form submission. Rollback: promote `dpl_GyM6VCr5FikNkmnBayzx1JK9wpjQ`.

**2026-10-19, production cutover authorized by the owner.**

- Vercel project remains `adgent-website`; no domain or project migration.
  The first release was staged with `--prod --skip-domain`, then promoted. After the repairs
  below, production is `dpl_GyM6VCr5FikNkmnBayzx1JK9wpjQ`:
  `https://adgent-website-4cf1madye-nurettin-demirals-projects.vercel.app` (alias `adgent.app`).
- CLI 44.4.1 was rejected by Vercel's upload endpoint; `npx --yes vercel@latest`
  used 64.5.0 successfully, without changing the global installation.
- `build.py --check` passed for 62 HTML pages. The running local preview returned
  200 for all 61 sitemap pages and 192 referenced resources; checked fragments resolved.
  Independent preflight found no new copy or visual blocker.
- On production, all eight lead forms passed empty-input validation, intercepted service
  failure with input preserved, retry, and intercepted success with confirmation focus.
  Native no-JavaScript POST/redirect returned to `/#sent-1` and displayed the confirmation.
  These service responses were intercepted: **no real lead was sent; inbox delivery is unverified.**
- Fresh production consent: no Google/gateway request before a choice or after Reject
  optional plus reload; Accept all from Cookie settings loaded `/metrics` and `/tagging`.
  Cloudflare's pre-consent beacon remains, as documented below. Both calculators passed
  live arithmetic/boundary scenarios.
- The independent HTTP audit returned 200 for all 61 sitemap pages and 243 referenced
  resources; 15 redirects matched their 308 targets and 23 internal/tooling paths returned
  404. Feed: 24 items. Canonicals, indexability, JSON-LD, Meta verification tag and configured
  security headers passed. Three external publishers returned bot403, not site-route failures.
- **Fixed:** Cloudflare email obfuscation sent no-JavaScript legal-email clicks to a 404.
  Its [documented `email_off` comments](https://developers.cloudflare.com/waf/tools/scrape-shield/email-address-obfuscation/)
  now protect all 11 mailto links across six legal pages. Text and destinations are unchanged;
  production no-JavaScript checks found all 11 plain addresses, no obfuscated links or overflow.
  Deployment exclusions also explicitly cover legacy `svgcheck.py`, `test-circuit.cjs` and
  `.fontcache/`, rather than relying on the live worktree's `.gitignore`.
- **Fixed:** the historical ledger's inactive Revert button on `/for-in-house` is now a link
  to the working `/change-ledger#cl-trip-t` demo. Keyboard navigation, inverse draft and
  explicit approval passed. The agency meeting chart's shared label rule now wraps within
  its grid column, retaining an 8px gap instead of colliding with the bar.
  Both repairs were visually inspected at 390/768/1440 in light/dark settings before deploy.
  The mechanical design scan retained existing mock-typography/container warnings; it did
  not establish a new blocker and was not used to justify a redesign.
- Independent live visual audits: the 16 product routes and the 19 non-article plus 24 article
  routes passed document-width, image-load, runtime-error, FAQ/ToC/tab/drawer/dropdown and
  keyboard checks at 390/1440; 24 full-page captures across four templates × 390/768/1440 ×
  light/dark were inspected. The homepage lower chat auto-approved the exclusion and the
  separate reversal with both ledger entries on production; all 12 creative examples load
  once scrolled (lazy); the Product menu's 15 links resolve and Escape closes it.
  Non-blocking polish noted: several mobile demo controls measure 32–40px, under the
  ui-loop skill's 44px preference; the change-ledger app view has spare vertical space.
- `~/adgent-website` was synchronized with backups of replaced/obsolete files at
  `~/adgent-website-pre-v2-2026-10-19`. **No commit or push was made.** The GitHub branch still
  contains the old site until an explicitly authorized commit/push; do not redeploy that branch.
- Rollback target: `dpl_5nvVpmg3R5mx55YqbPgvtyibkxJ6`,
  `https://adgent-website-82x1vyls0-nurettin-demirals-projects.vercel.app`.


**2026-10-19, pricing navigation and ledger scroll correction.**

- Sitewide inbound links and shared navigation now say **Pricing** and target `/pricing`.
  The pricing page retains its **Talk to sales** heading and form. Verified navigation
  from the homepage at 390/768/1440px in both color-scheme preferences; no horizontal overflow.
- The Change Ledger demo no longer calls `scrollIntoView` when moving between decision
  states. It retains keyboard focus with `preventScroll`. Exercised draft, defer, approve
  and replay at 390/768/1440px with normal and reduced motion. Native scroll anchoring
  still follows the ledger row's expansion; the forced jump to another control is removed.
- Closed the interaction audit across all 62 public HTML pages: 122 non-homepage
  page/width records at 390/1440px, plus the dedicated homepage audit. Revisited controls
  missed by the earlier harness, including report panes, creative details and approval branches.
  The final 17-page batch used reduced motion; the homepage and scroll corrections also
  received normal-motion checks. Pricing and ledger visuals were inspected at
  390/768/1440px in both color-scheme preferences.
- Planning's Clear selection returns focus with `preventScroll`; measured zero scroll
  delta at 390/1440px. Homepage approval/deferral retains its status without a focus jump.
  Intentional anchor navigation, native form-validation focus and document scroll anchoring
  during content expansion are not counted as unexpected navigation.
- Build and `build.py --check` passed for 62 pages. This control audit did not send an external
  form or deploy. Earlier form success/error checks used local responses, not delivery proof.


**2026-10-18, owner-requested approval feedback and automatic chat playback.**

- The hero's meeting and app cards retain **Approved** or **Deferred** after the choice.
  Removed the contextual Try again control, its reset handlers and its focus transfer.
  Both views share the decision; approval creates one ledger entry, deferral creates none.
- Creative review now shows a report request, Aida's acceptance, then the delivered report
  and working `/#creative-report` link. Acceptance appears at 600ms, delivery at 2300ms;
  reduced motion shows the finished exchange immediately. The link opens the actual
  illustrative report in this hero; loading the shared URL selects the right view/scenario.
  Existing example CTR evidence and the purchases caveat are preserved, not new customer data.
  All stages reserve their layout space: no scroll movement during delivery, and meeting/app
  heights remain equal. Verified the sequence, direct URL reload and 390/768/1440px layouts
  in both theme preferences.
- The lower Audience Network chat waits 4.5 seconds while its pending card is visible, then
  animates an example approval. The reply, ledger entry and inverse proposal arrive in order.
  The inverse has its own approval delay. These are explicitly labelled demo approvals, never
  live-account actions or an assertion that the visitor clicked.
- New messages follow downward only when needed. Playback never moves keyboard focus.
  Wheel/touch/key input stops automatic following. Offscreen cards and hidden documents do not
  auto-approve; focused chat controls pause the countdown. Pause/Play controls the automatic
  decisions. A manual deferral wins; replay clears pending timers and both decisions.
- Removed the Sample account badge, explanatory paragraph and platform-logo rows as previously
  requested. Kept the illustrative-estimates caption and equal-height meeting/app frames.
- Exercised hero approval/deferral from both views at 390/1440px with zero scroll delta and
  correct ledger counts. Exercised chat autoplay, pause/resume, deferral, offscreen suspension,
  manual inverse approval/deferral and replay. Inspected hero/app and pending/completed chat at
  390/768/1440px in light/dark preferences; no horizontal overflow or visible text overlap.
  The site intentionally retains its paper/navy palette in both preferences.
  No external form submission or deployment.

**2026-10-18, owner-requested independent scenarios and equal-height product views.**

- Replaced Last review / Work returned / Next decision with Brand memory / Creative review /
  Budget planning. Each is a complete question, answer and output: delivery-promise approval,
  a new creative test, or a Search expansion held against the quarterly cap. Existing sample
  metrics remain illustrative. No timed progression; selection persists across product views.
- Meeting and app share one intrinsic grid row. Inactive views, conversations, outputs and
  app panes retain layout space but are invisible and unavailable to keyboard/accessibility
  navigation. The frame follows the tallest content at each width, without fixed-height
  clipping or measuring it in JavaScript. The earlier per-step height figures below are historical.
- Verified all three scenarios and six app panes across 320/390/768/1024/1366/1440px in both
  theme settings: unchanged frame height while switching. At 390/768/1440px, both views measure
  939/537/529px respectively. Visually inspected all scenarios and both views at those sizes.
  Corrected a narrow creative-detail overflow; all six app panes passed bounds/overlap checks
  at 320/390/768/1440px in both settings afterward.
- Shared approval in both directions, keyboard approval, deferral without a ledger entry,
  reset, scenario persistence and reduced motion passed. The accessibility snapshot includes
  only the active view/pane. Build and `--check` passed for 62 pages; revised scenario copy
  passed humanizer/copy-lint review. No external submission or deployment.

**2026-10-18, owner-requested visual correction after rejecting the compressed hero.**

The owner rejected the 303–323px meeting treatment as too short and crowded, with a damaged
circle composition. This supersedes the previous A + A implementation and its forced
1366×768 first-viewport target. Layout quality and separation take precedence over that fit.

- The true circular navy introduction has its own reserved bottom padding, not a painted
  extension underneath subsequent content. The form sits entirely inside navy; the view
  selector is a separate grouped control on paper. The exact headline and description remain.
- The meeting is a 1040px-wide, substantial two-column scene on desktop. Larger portraits,
  participant tiles and speech bubbles restore the sense of a shared room. Its title/sample
  identity and quiet reset sit above a separate underlined review-navigation row. Mint fill
  inside the scene is reserved for approval, rather than competing review buttons.
- One active memory/brief/action output still accompanies the conversation. Phones stack
  only that output. No artificial fixed-height clipping, internal meeting scrollbar, or
  automatic approval; the existing shared app ledger remains unchanged.
- At 1440px the decision-state meeting is 544px tall, between the rejected 323px banner
  and the original 1,028px stack. The whole scene is deliberately not forced above the fold.

Verification: build and `--check` passed across 62 pages. Visually inspected the full hero
and decision scene at 390/768/1440px in light/dark settings. Exercised all three review steps
at 320/390/600/768/1024/1366/1440px in both settings: no document overflow, horizontal hero
scroll, meeting text overlap or sub-44px controls; exactly one active output. The form's
edges retain at least 40.8px of navy in this matrix, with a separate 24–28px paper gap above
the view selector. Approval, keyboard activation, deferral, ledger synchronization, outcome
restoration, view switching, reset and reduced motion passed. No JavaScript runtime error;
one unrelated video request was aborted during viewport changes. Impeccable's pre-edit
layout scan reported nested-card and FAQ-padding warnings without precise locations; these
do not replace visual review. No external form submission or deployment.

**2026-10-18, subsequent owner-directed value and approval refinement.**

- The navy hero circle extends 32px lower (`bottom: -80px`). The view switches move down
  by the same amount, keeping a 32px paper gap at 390/768/1440px; both have 44px targets.
- Homepage estimates are now explicitly illustrative: $4,950/month for the Audience Network
  exclusion in both the comparison and chat, $18,600/month across the comparison's opportunities,
  and $8,400/$6,900 in the sample app. The comparison no longer attributes these figures to the
  September 4 run. Underlying evidence ledgers and dated results elsewhere are unchanged.
- “Moves the money” ends with a two-week measurement instead of the August 18 reversal test.
  Its illustrative Google budget goes from $1,200 to $1,320/day; consecutive 14-day windows show
  spend $16,800 → $18,480, purchases 400 → 480, and CPA $42 → $38.50. The caption explicitly
  distinguishes this example from a customer result and from causal evidence.
- The lower chat follows one illustrative Audience Network change. Approval reveals its
  On → Off ledger entry and a pending inverse proposal. Restoring Off → On requires separate
  approval and creates the second entry. Either deferral leaves the current setting unchanged;
  reset clears both decisions and entries. This replaces the unrelated, pre-approved Lithuania
  reversal. The meeting/app decision remains separate and synchronized.
  Completed cards label recorded values “Before / Applied”; reset restores “Current / Proposed”.

Verification: build and `--check` passed across 62 pages. Inspected hero, comparison, measurement,
pending and completed chat captures at 390/768/1440px with light/dark preferences and theme
attributes (the site retains the same paper/navy palette). Scoped geometry found no horizontal
overflow or text overlap. Browser smoke covered apply/defer, separate restore/defer, duplicate
click protection, reset and focus, keyboard approval, reduced-motion playback, and isolation
from the meeting/app ledger. Measurement arithmetic reconciles. No JavaScript runtime error;
one video request was aborted during the viewport/tab exercise. Copy check: no vocabulary
violations in the revised homepage/controller. Impeccable's layout scan flagged nested product
cards (intentional in these product scenes) and FAQ wrapper padding (the summary supplies 22px).
No live account or form service was contacted; no deployment.

**2026-10-18, latest owner-directed homepage and conversion refinement.**

- The rejected mint meeting room is replaced with the navy product surface. The navy hero
  introduction ends in a cropped circle above the product panel, leaving paper around the panel.
  The conversation uses speaker-labelled speech bubbles, with a light reply bubble for Aida.
- Roomly's remembered constraint is now made-to-order furniture with six-week delivery, not a
  Feed ROAS target. Adgent spots a conflicting “Delivered tomorrow” ad, returns a replacement
  creative brief and proposes pausing the ad. Explicit approval, deferral and reset stay
  synchronized between meeting and app; the ledger records Active → Paused only on approval.
- The morning comparison explicitly names **Without Adgent / With Adgent**, including its
  mobile controls and slider announcements. The draggable comparison and full navigation remain.
- The lower memory example uses a fixed **quarterly** budget. Adgent finds a new Search
  opportunity and holds it because the budget is allocated, without a repeated user question.
  This supersedes the monthly-budget and remembered-Feed-target examples described below.
- Free-audit forms and promotional audit links are removed across the site. The remaining
  demo/sales forms have no Meta / Google / Both selector; former audit CTAs lead to `/pricing`.
  The adjacent agency conversation form is removed, leaving its final demo form. Editorial
  audit guides and the conversion calculator's functional platform input are unchanged.

Verification: build and `--check` passed for 62 pages; local fragment checks found no broken
targets. All eight retained lead forms passed invalid-input and success checks through a
local-only mock endpoint; the sales form also passed failure/retry with the email preserved.
No request was sent to the live form service. The hero and speech bubbles were visually checked
at 390/768/1440px with both theme attributes; all three review phases passed text-overlap and
stage-boundary checks. Meeting approval updated the app ledger; replay cleared the approval.
All 21 sales CTA blocks passed geometry checks in the same six states. Six representative CTA
layouts and five retained-form layouts were visually inspected in that matrix. The six legal
pages retain identical intro/body parsed markup and H1 text against `website/`. No deployment.


**2026-10-18, owner-approved website audit repairs.** These decisions supersede older
public-pricing, package and unresolved-audit notes below; they do not change the internal
commercial model.

- `/pricing` keeps **Talk to sales** inside the page. Its sitewide navigation and inbound links
  now say **Pricing** (owner correction, 2026-10-18). No public Adgent prices, packages,
  Standard/Premium tiers, credits or spend bands; no commercial `Offer` schema. Design-partner
  and unverified paying-customer status rows are removed.
- **Superseded by the latest owner instruction above:** the separate free-audit conversion
  and its account selector are removed. The hero and `#demo` keep demo requests.
- The homepage meeting starts with the second review: confirmed constraint, returned brief,
  next explicit decision. Agency and client participation is explained beside it. Approval,
  defer and reset remain synchronized with the sample app; playback never approves a change.
  Three existing tour panels trace source-to-output work with replay and reduced-motion support.
- `/why-adgent` explains the working mode; `/for-agencies` makes continuity visible to the
  client. No time-saving figures were added. The complete 15-link Product menu and comparison
  sliders remain. Illustrative specialist cards stay, without attributing them to a dated run.
- Email delivery, revocation/security and scene-by-scene capability language remain. All six
  legal pages preserve the old site's exact intro/body markup and H1 text.
- Reveal content stays visible when `app.js` fails. Drawer focus/inert handling, mobile comparison
  heights, hero-sketch safe regions, focus/forced-color states and calculator boundary errors
  are repaired. The FAQ parser now isolates each visible question and answer; responsive blog
  thumbnails and local media/script stamps replace stale or oversized assets.

Verification: `python3 build.py` and `python3 build.py --check` passed for 62 pages. Homepage
screenshots inspected at 390/768/1440px with both theme attributes; the palette stays fixed.
Browser smoke covered review phases, approval in both directions, duplicate suppression,
defer/reset, finite tour replay, offscreen/reduced-motion stopping, the Product menu and
comparison controls. Audit validation/failure/retry/success plus both demo forms and the sales
form were exercised using local intercepted responses, never the live submission service.
Calculator fixtures, invalid-input recovery, drawer keyboard behavior and blocked-`app.js`
reveals passed. Eight regenerated OG cards were visually inspected at 1200×630. Six legal
intro/body fragments remain byte-identical to `website/` and to the pre-edit snapshot.
The same breakpoint/theme matrix covered pricing, Why Adgent, agencies, meetings, in-house,
specialists, account memory, ground truth, features, agents, creative analysis and blog;
additional 1024px hero checks covered ground truth, planning and dashboards. No horizontal
document overflow was observed. The final stack-label contrast repair measured 5.72:1 on mint
and 5.16:1 on gray. All local page fragments resolve; scripts/styles/posters/video sources are
stamped, and software/calculator schema has no public `Offer`. Actual background-tab visibility
was not reproducible in headless Chromium; the meetings visibility handler was tested
synthetically, while offscreen and reduced-motion behavior were exercised normally.
Copy lint found no banned terms or filler in non-legal HTML; locked legal punctuation is retained.
No deployment, commit, push or external form submission.

> **2026-10-10 (owner request): the whole site is rebuilt in the settled world, and every feature
> has its own page.** Concepts came from the decision mocks in `.impeccable/mocks/decision/`
> (owner's `landing.html` plus landing-b, -c, -d, -e, -g, -i and the hero round), adapted, not
> copied. Coverage disclosure ("it says what it did not look at") is no longer sold anywhere
> (owner decision, `gtm/03-positioning-and-messaging.md:122`). `built-from-chat.html` is retired:
> it split into `/campaign-build`, `/planning`, `/dashboards` and `/agents`.
>
> **2026-10-12 (owner decisions), after a content comparison with live.** (1) The six legal pages
> carry the live text verbatim, because it is what Google and Meta were sent; `/security` is the
> live 13-section page again and its OG card says "How Adgent protects your ad data". Rules in
> `PATTERNS.md` § Hard rules, dropped v2 edits in `website/TODO.md` §0. (2) A talk-first path for
> buyers who will not connect an account before a call: `#talk` on `/pricing` and
> `/for-agencies`. (3) "Why not connect ChatGPT or Claude ourselves?" answered in the FAQ on `/`,
> `/pricing` and `/for-agencies`. (4) Store revenue comes in through a Drive file on
> `/ground-truth`, `/ecommerce` and the homepage FAQ (`gtm/03` §3.6, 2026-10-12).
>
> **2026-10-12, later the same day: the site tells the new plan, investors first** (`gtm/03` top,
> owner). Non-live work may appear under Live, Pilot or Coming labels (`PATTERNS.md`). New page
> `/meetings` puts Adgent in the team's meetings and links from the nav, `/features`, the homepage,
> `/account-memory`, `/about` and `/pricing`. Hero sub-line names the four verbs (remember, raise,
> build, act on approval). `/ai-visibility` shows the bridge from an AI answer to a paid decision.
> `/why-adgent` carries one real case start to finish. Buyers in order: network and holding-group
> agencies, then large brands ("For agencies", "For brands"). `/about` names no founders: the idea,
> four beliefs, status.
>
> **2026-10-12, hero visual treatment.** Investors see the persona and meeting workflow first.
> Under the promise, two tabs remain: **In the meeting** (default) and **In the app** (the navigable
> sample app). The latest 2026-10-14 owner correction presents both as live product surfaces,
> without an Early access qualifier.
>
> **2026-10-14, Impeccable interaction pass (owner review).** Campaign Build maps the request
> back to a keyboard-accessible field inspector and keeps approval as an explicit local preview;
> Agents opens with a selectable Outputs inbox and run-detail pane before the three wake modes.
> Account Memory has a selectable provenance inspector; Ground Truth has an explicit source desk;
> Specialists has one horizontal scroll-following rail; Planning is an interactive document;
> Dashboards switches between dashboard and report and reveals the first board without a blank wait;
> Meetings carries work from conversation through delegated approval.
> The agency page previews review → approval → ledger → measured and adds the meeting route; the
> brand page makes AI Visibility and Meetings first-class. Each industry now has its own model,
> the blog uses its article cards as the visual index, and the homepage AI Visibility section is
> half the former visible word count. The footer no longer explains sample accounts.
> The follow-up owner review keeps the homepage promise beside its story while both travel down
> the section and gives the agent handoff an explicit next-step control. Change Ledger and Platform
> Change Log now preview their interactions, then hand control back to the visitor. The Agents wake
> links land on the three wake modes and the live-account note sits with the Outputs evidence.
> Campaign Build uses compact field navigation and one recovery composition; local and mobile-app
> hero cards align with their headlines instead of floating above them.
> A same-day owner-review fix keeps the Creative analysis hero compact and contained, leaves
> Meetings and Campaign Build controls at the visitor's current scroll position, and restores the
> specialist-name rail to the top of `/specialists`.
> Product navigation now maps the account loop beside compact build cards, with detail reserved
> for Creative and AI answers; Solutions retains its team and industry split. Both use icon-led
> card grids on tablet and phone, with one mobile group open at a time.
> The All capabilities page now opens with a status-led product map, keeps four indexed capability
> groups in a sticky section rail, and uses mixed-size proof cards so live, pilot and
> coming work scan as one system on desktop, tablet and phone.
> The site-wide continuity pass keeps the header and mark in place across supported same-origin
> navigations, turns the header hairline into a reading trail, and replaces the FAQ height
> animation with compositor-only content motion. Each industry hero now pairs its evidence with a
> literal line drawing — returned parcel, contact card and clock, suitcase and luggage tag,
> storefront and shopping bag, folded street map, or phone with escaping pixels — plus a quieter
> operating trace behind it. The drawings remain visible when the hero stacks; the denser traces
> disappear below 860px. Both are decorative, enter once, respect reduced motion and stay inert to
> assistive technology.
>
> **2026-10-14, illustrated hero extension (owner review).** The same literal, token-only drawing
> language now reaches the core product, feature, audience and company pages through
> `js/hero-illustrations.js`. Each eligible hero gets one page-specific object — approval gate,
> ledger, source desk, blueprint, media plan, meeting window, creative storyboard, quote sheet or
> compass — anchored to its existing proof surface rather than replacing it. Narrow layouts reserve
> paper for the drawing instead of putting it over the headline. Every scene enters once, has only a
> small fine-pointer shift, is static under reduced motion and stays outside the accessibility tree.
> The ecommerce hero now leads with the gap between platform ROAS and retained value after returns.
> Business context arrives through a selected Drive file or facts confirmed in chat; direct
> Shopify remains planned, not live.
>
> **2026-10-14, latest owner correction: one category line and one demo CTA.** "The AI employee for
> enterprise growth teams" owns the homepage H1, metadata, structured data, the footer and the
> agency and in-house entry points. The secondary "The agent team behind your growth" line is
> removed from the homepage. A **Work email** placeholder and **Request a demo** are the sole hero
> conversion path; the shared navigation points to the same demo section. Meetings is presented as
> a live operating surface. Specialist agents remain product architecture below the promise. The
> meeting view maps four unboxed spoken statements into durable memory, an assigned account action,
> report and a scheduled agent; only the resulting work is carded. Its action state carries into the
> app sample, and Replay resets both views. Connected sources are read alongside one another; direct
> Shopify and PMS connections remain planned.

> **2026-10-15, latest owner correction: sell the work, stop repeating the guardrails.** Global
> navigation, the footer, forms and general product FAQs no longer repeat read-only, approval or
> sample-account caveats. Approval stays visible where the product applies an account change;
> security, access, consent and deletion detail stays on the dedicated pages or in a directly
> relevant answer. Dated live-account evidence keeps its source and date.
>
> **2026-10-15, Creative Analysis motion correction (owner request).** The transient detection
> rectangle around each phone element is removed; the label chip and guide-line transfer into the
> analysis cell remain. Both video cuts and the assembled-analysis poster were regenerated, and the
> homepage uses content-hash query strings so the one-week asset cache cannot retain the old cut.

> **2026-10-15, approved Impeccable homepage refinement.** At this pass, the category H1,
> Request a demo offer and settled visual identity stayed unchanged. Following the owner's name
> correction and meeting-context request, **Aida** appears with Selin (Account lead), Mert (Paid
> social) and Ece (Client team). Human profiles use initials and camera-off icons; the four
> participants form one desktop row and a two-column grid at 900px and below. The remembered
> Feed target and account judgment follow the profiles, then memory, action, report and recurring work.
>
> The lower approval story now has pending, approved and deferred states. Only approval shows
> an applied response; Reset restores the proposal and clears both reply bubbles, including
> under reduced motion. The meeting and app views continue sharing one decision and ledger,
> with Selin named consistently. The dated historical inverse-change example remains separate.
>
> Product navigation was reduced to five work-oriented destinations at this pass; the later
> owner-requested restoration below supersedes that change. Connected account/context sources
> and measured AI answers remain separate groups; planned Shopify is absent from this strip.
> `/account-memory`, `/for-agencies` and `/for-in-house` use demo forms and subjects as well as demo button labels.
>
> The memory example now uses an explicitly illustrative fixed-budget review, replacing
> the earlier agency/brand classification correction. The Google Ads trace is labelled
> verified account change and reversal, not earned return. The fixed desktop comparison introduced
> at this pass is superseded by the slider restoration below. The repeated meeting promotion and
> weekly-agent chat turn are removed. AI Visibility describes the reading Adgent does.
>
> Browser smoke covered meeting/app approval in both directions, defer without a ledger
> write, duplicate-action suppression, both resets, lower-thread keyboard approval and
> reduced-motion approval/defer/reset. Visual review covered 390/768/1440px; 320px also had
> a document-overflow scan. Forced light/dark attributes leave this fixed palette unchanged.
> No external form submission was made.
>
> **Superseded 2026-10-18:** the latest owner instruction removes `/#audit` and every free-audit form; `#demo` remains.

> **2026-10-15, later owner decision: multiplayer headline.** The homepage now leads with
> "The first multiplayer AI employee your clients can meet." The intro explicitly includes the
> team and clients. Request a demo and the visual identity remain unchanged. Title, description,
> Open Graph/Twitter metadata and the regenerated 1200x630 homepage card match this direction;
> the SERP title is shortened to fit the existing width cap. The exact primacy exception and
> YC Fall 2026 Multiplayer AI source are recorded in `gtm/03-positioning-and-messaging.md`.
> Rendered headline and intro checked at 390/768/1440px with both theme attributes; no visible
> overflow or text overlap. At 320px the heading and document also fit. Existing off-screen
> form honeypots are intentional, accessibility-hidden exclusions. Build and --check passed.

> **2026-10-15, later owner correction: memory changes the budget decision.** The homepage
> and `/account-memory` now show a spending-increase recommendation becoming an account-internal,
> budget-neutral reallocation. The next question retains the confirmed monthly limit. Both label
> the example illustrative, with no customer attribution or observation date. The separate
> 26 Aug 2026 fresh-session observation on `/account-memory` is unchanged.
> Visually checked both examples at 390/768/1440px with light/dark attributes and preferences;
> the authored palette stays fixed. No horizontal overflow or overlapping example text. The
> homepage link opened `/account-memory`; build and --check passed. New copy has no banned terms
> or rendered em dashes.

> **2026-10-15, later owner correction: restore the comparison slider and complete Product menu.**
> "The same morning, twice." again uses the original layered comparison, draggable divider,
> keyboard controls and restored secondary panels. The original Today / With Adgent toggle
> remains at 860px and below. The replacement fixed-column CSS and competing page-level
> comparison controller are removed; the existing shared `app.js` owns the interaction.
> Desktop and mobile Product navigation are restored verbatim from the pre-refinement source:
> Run the accounts, Account context, Build and automate, Creative and AI answers, and All capabilities.
> Aida, the three meeting participants, demo-state fixes, current headline and budget-memory example are unchanged.
> Browser smoke passed drag in both directions, arrows/Home/End/PageUp/PageDown, mobile toggles,
> Product keyboard opening/Escape and mobile drawer scrolling. Screenshots inspected at
> 390/768/1440px with both theme attributes/preferences; the authored palette remains fixed.
> All nine comparison pairs on eight feature/audience/pricing pages retained working mobile
> toggles and two-column desktop layouts. No publication or external form submission.
>
> **2026-10-15, latest owner messaging: multiplayer AI marketing brain.** The homepage H1 is
> "The first multiplayer AI marketing brain." The intro describes account analysis and proposed
> actions during the conversation, remembered decisions and subsequent action with approval.
> Canonical positioning, spoken pitch and deck cover match; metadata and the 1200x630 homepage
> card are updated. The exact headline is the scoped primacy exception in `gtm/03`.
> Inspected the hero at 390/768/1440px with both light/dark browser preferences and theme
> attributes: no changed-copy overflow or overlap; the authored palette remains fixed.
> Browser smoke passed meeting/app switching, approval/defer/reset, mobile comparison toggles
> and desktop Home/End, plus the complete 15-link Product menu on mobile/tablet/desktop.
> The shared navigation, comparison styles/controllers and hero demo files are byte-identical
> to their pre-copy-change snapshots. Build and --check passed. No publication or form submission.
>
> **2026-10-25, owner request: homepage copy synced to the cold-deck cover; raster favicons.**
> H1 "The first multiplayer AI / in the marketing vertical." and the slide-01 lede replace the
> 2026-10-15 headline and intro; `<title>`, meta/OG/Twitter description (SERP-width cut), the
> homepage card and the llms files follow (`gtm/03` § 2026-10-25). Icons: the live site served only
> the SVG tile, which Safari, iOS and most unfurlers ignore, so stale orange icons survived the
> cutover; `build.py` now emits `/favicon.ico` (16+32) and `/apple-touch-icon.png` (180) links in
> every generated head, both files copied from `assets/brand/`. Hero inspected at 1440/390px;
> build and --check passed. No publication, commit or form submission.


Homepage sections, in order (`index.html`):

1. Hero: "The first multiplayer AI in the marketing vertical.", a **Work email** field and **Request a demo**.
   Aida and three named participants return for a second review: last review → work returned →
   next decision, beside the four work outputs. The second tab remains the navigable app.
   A multiplayer explanation, account/context sources and measured-AI-answer group follow.
2. Find the work: "The same morning, twice." A draggable split comparison on desktop, with
   keyboard controls, a Today / With Adgent toggle on narrow screens, and the original secondary panels.
3. Carry it through: an illustrative fixed-budget memory sequence, then the manually controlled
   tour: creative analysis → verified change and reversal → recurring work → client dashboard.
   The last three panels have finite, replayable causal traces. The film caption enlarges one
   actual hook reading instead of requiring all small UI text.
4. Make the account move: an interactive approval/defer story, followed by a separately dated
   historical inverse change. Reset clears the visitor's choice and downstream replies.
5. Read the market: AI Visibility connects buyer answers to Adgent's mention/rank/source reading.
   The finite sequence retains manual WAI-ARIA tabs and reduced-motion support.
6. Doors (who it's for), 7. FAQ, 8. Demo request (`#demo`). No separate audit form.

Feature pages and their concept source: `/for-agencies` (landing.html + landing-e: headline on top,
then decisions → Change Ledger → measured effect) · `/creative-intelligence` (floating creatives
after Gusto, from `assets/creatives/`, plus the film) · `/agents` (rebuilt 2026-10-14: the Outputs
inbox as the first viewport, three wake modes, the settings sheet; the landing-g sticky graph is
retired) · `/specialists` (landing-c tabbed card) · `/planning` (landing-i week) · `/ai-visibility`
(PRD v4, stage 1) · `/dashboards` · `/campaign-build` (rebuilt 2026-10-14: chat moment, then the build
sheet with a reason under every suggested field; the pinned scroll-assembled tree is retired) ·
`/change-ledger` · `/platform-change-log` · the four core feature pages, the company pages, articles
and industries.

| Styling decision (2026-10-10, settled world) | Reason |
|---|---|
| **Paper, ink, white cards, one accent and its three tints, a dark primary field** | Taken from the owner's own design, `.impeccable/mocks/decision/landing.html`. The night studio canvas, the aura, the grain and the theme toggle are gone. |
| **Switzer 400/500/600, self-hosted** | The current face in the settled world. Face and colour are still open owner decisions, so both live in `tokens.css` only: a swap is one edit. |
| **28px blocks, 60px pills, 14px gaps** | The fluid block collage of the landing hero, reused as the site's grammar (`.collage`, `.blk`, `.r28`, `.pillr`). |
| **Ten accent territories behind a dev switch** | The lab's territories survive as `[data-accent="01…10"]`; `?accent=NN` sets and remembers one. Default 01 teal. |
| **The split compare and the mirror pair are shared components** | Landing-b's "same morning twice" stage (`.cmp`) and its today-vs-Adgent pairs (`.ps`) are in the library so any page can use them. |
| **Every text token measured for AA** | In the browser, on paper, white, t1, grey and the primary field; the table is in `PATTERNS.md`. The default primary button is 4.56:1. |
| Indexable since 2026-10-11 (`noindex` only on `404`) | The production copy was promoted to adgent.app on 2026-10-19. Before the cutover it was unhosted; the earlier noindex/disallow-all staging policy is retired. |

Design system, class vocabulary and the hard content rules: **[PATTERNS.md](PATTERNS.md)**.

## Structure

```
tokens.css        font faces, colour/type/radius/motion tokens, 10 accent territories (only raw hex)
app.css           the shared component library
app.js            top bar, dropdowns, drawer, reveal, split compare, mirror pairs, forms (Web3Forms, FormData), accent switch
site.js           consent banner + consent-gated GA4 (/metrics) and GTM (/tagging); legacy anchor forwards
consent.css       the banner and cookie settings in v2 tokens (loaded by site.js, stamped by build.py)
assets/vendor/    vanilla-cookieconsent 3.1.0 (self-hosted, same as live)
assets/og/        one 1200x630 PNG social card per public page; _cards.json, _card.html, _src/ are sources
assets/blog/      responsive 320/640/1200px WebP article thumbnails, generated from OG PNGs
assets/persona/   Aida's owner-provided meeting portrait (`aidra.webp`), shown as
                  "Aida · Adgent" without portrait animation
_partials/        header, drawer, footer, injected by build.py
css/<slug>.css    page-only styles; js/<slug>.js page-only behaviour
_kit.html         every shared component, rendered once (/_kit); _*.html is never built
build.py          chrome + stamps + generated heads + sitemap/feed/llms + the audit() gate
serve.py          local preview: clean URLs, pages rendered through build.render() per request
vercel.json       rewrites (tag gateway), host and legacy redirects, headers
.vercelignore     keeps build tooling, docs and card sources out of the deployment
robots.txt        production: every crawler and AI answer engine allowed, sitemap line
sitemap.xml feed.xml llms.txt llms-full.txt .lastmod.json   generated; never hand-edit
PATTERNS.md       the build contract
```

## The head, and what build.py generates

Hand-written in each page's `<head>`: robots, `<title>`, meta description, canonical, `og:type`,
`og:site_name`, `og:title`, `og:description`, stylesheets (and the Meta domain-verification tag on
`index.html`, which Meta reads from static HTML). Everything derivable is generated between
`<!--#seo-->` and `<!--/#seo-->`: `theme-color`, `og:locale/url/image(+size, alt)`, `article:*`
dates, `twitter:*`, the feed link, the Switzer 500/600 preloads on articles (their CLS), JSON-LD and
`site.js`. JSON-LD per page: one full `#organization` (description, `knowsAbout`; `legalName` and
`telephone` only on `/business-information`, as on live) and `#website` (with `alternateName`)
node; the full `#software` `SoftwareApplication` (feature list, no public commercial `Offer`) on
`/`, `/why-adgent`, every product page and every solution page except `/security`, whose page node
is `about` it; the page node (`BlogPosting` on articles with dates read from the visible
Published/Updated list, plus `wordCount`, and `keywords`/`about` from `ARTICLE_TOPICS`; a
`DefinedTerm` when the article shows a `<div class="ar-note"><b>Definition</b>` box,
`WebApplication` on the two calculators, `AboutPage`, `Blog`, `CollectionPage`, else `WebPage`), a
breadcrumb, and a `FAQPage` built from individual `<details>` inside `.qa`. The HTML parser
reads only each item's direct `<summary>` and `.a` children, so unrelated expandable UI cannot
become a question. The same extraction drives the LLM text, and the audit compares the FAQ
pairs. A link that is the answer's whole last sentence, and any `.go` link, is omitted.

Local CSS/JS paths are stamped wherever they live, including chart bundles under `assets/`.
Images, fonts, video sources, `poster`/`data-poster` and responsive `srcset` candidates receive
content hashes as well.

Sitemap `lastmod`: an article's is its visible Updated (else Published) date, the same as its
`dateModified`; every other page's moves only when its rendered HTML changes (`.lastmod.json`).
Set an article's Updated row only when its body materially changed.

Lead forms: every `form.qf` and `form.form` gets `method="post"`, the Web3Forms action and a
generated `<!--#w3f-->` block (access key, a demo/sales/conversation/audit subject based on the form
class, page, `form_location`, a same-domain `redirect` to `<page>#sent-N`, the honeypot), so the
lead is posted even when `app.js` never runs. `app.css` shows the form's own confirmation on
`#sent-N`. Never hand-write those fields. `app.js` sends the same fields by fetch as FormData
(no preflight) and fires `generate_lead` with `form_id: "leadForm"` and `form_location`.

`--check` runs the live site's audit checks (ported 2026-10-11) plus v2's own: (1) no hreflang or
`/tr/` links, (2) `lang="en"`, (3) self-canonical, (4) every internal link has a page, (5) no
analytics outside `site.js`, `site.js` in every head, (6) head invariants: title ≤600px and
description ≤985px in SERP pixels, unique title and description per page, `max-snippet:-1`,
og/twitter block, feed link, self-hosted fonts, no em dash, (7) `site.js` ↔ `vercel.json` gateway
rewrites, (8) www and `adgent-website.vercel.app` 308 to the apex, both `/` and `/:path*`, (9) one
`@id`'d Organization/WebSite per document, (10) one real 1200x630 PNG card per page, stamped,
unique, (11) security headers, (12) every live URL is a v2 page or a permanent redirect to one,
no redirect shadows a page, (13) only `404` is noindex, (14) articles carry a dated `BlogPosting`
and a `FAQPage` exists exactly when the page shows a FAQ, (15) `robots.txt` is the production one,
(16) every lead form has the no-JS Web3Forms POST.
A `NOTE` line (not a failure) lists page cards whose H1 changed since the card was drawn.

**Production crawl, 2026-11-04** (FreeCrawl 1.1.3 via the `website/SITE.md` § *The crawler*
command; project `~/adgent/.seo/adgent.seoproject`, the pre-v2 crawl kept as
`adgent-2026-09-09.seoproject`): 211 URLs, 61 indexable HTML pages, no 4xx/5xx; the five
redirects and one bot-blocked URL are external citations. Nothing to fix in the repo.
`schemaMissingRequired` (25) is the `SoftwareApplication` node without `offers`/`aggregateRating`/
`review`, a consequence of the 2026-10-18 no-`Offer` decision below. The 8
`metaPixelWidthTooLong` flags are FreeCrawl's estimate (991–996px against its ~990px cap); check
6's Chrome-verified table puts the same descriptions at 971–982px. `formInputUnlabeled`,
`analyticsMissing` (consent-gated `site.js`), `cspMissing` and the HSTS flags are the known items
in `website/TODO.md` §2d. FreeCrawl's MCP `query_urls` wants kebab-case categories
(`issues:schema-missing-required`); the camelCase names `top_issues` prints silently return
every row.

## OG cards

Two kinds, both in the v2 world. **Page cards** (36) are drawn by `assets/og/_card.html` from
`_cards.json` (`eyebrow`, `title` = the page's H1 unless `fixed`, `alt`): white block with the
headline, the primary field with the mark, the mint pill lockup. **Article cards** (24) are the live
site's hand-drawn illustrations, recoloured from coral to the primary field and mint, set in
Switzer, with the v2 lockup (`_src/<slug>.svg`; the Meta audit card now says 10 checks, as the
article does; on 2026-10-11 four cards lost text the product does not do: "3 accounts, read as one",
"TikTok · overnight", "read-only until you say go", "cross-platform", "+9,400/mo"). To re-render
one, with `serve.py` running, in headless Chrome:
`page.setViewport({width:1200,height:630,deviceScaleFactor:1})`, open
`/assets/og/_card.html?slug=<slug>`, wait for `body[data-ready="yes"]` and `document.fonts.ready`, then
`page.screenshot({path:'assets/og/<slug>.png', type:'png', clip:{x:0,y:0,width:1200,height:630}})`.
The private renderer bypasses consent/measurement injection, so cookie UI cannot enter a card.
Never use a display screenshot (it is a downscaled WebP); check 10 reads the PNG header. Then run
`python3 assets/og/_thumbnails.py` and `python3 build.py`: article thumbnails are refreshed and
all changed card/thumbnail URLs receive content stamps.

## Analytics and consent

`site.js` is the live site's consent module, restyled: Consent Mode defaults to denied, the banner
(bottom right at desktop, one short card on the bottom edge at phone width, clear of the hero form
at 390) offers Accept all / Reject optional / Choose, and the footer's "Cookie settings" reopens the
choices. GA4 and the GTM container load only after the matching category is accepted, from the
first-party paths `/metrics` and `/tagging` that `vercel.json` rewrites to the Google tag gateway,
and only on the host `adgent.app` (anywhere else they would 404; to test locally run
`localStorage.setItem('adgent-measure','1')`). Verified 2026-10-11 in fresh browser contexts: zero
Google or gateway requests before a choice; Reject persists across reload with no requests;
Accept (with the local flag) requests `/metrics` and `/tagging` and keeps doing so after reload.

**What loads before consent, exactly:** nothing. Until 2026-10-31 Cloudflare Web Analytics injected
a cookieless beacon (`static.cloudflareinsights.com`) at the edge; the owner removed the site from
Web Analytics that day and a fresh load now makes no third-party request before a choice. If the
beacon ever reappears, it comes from the Cloudflare dashboard, not this repo.

## Deploying (owner action)

The live site is the existing Vercel project `adgent-website`
(`prj_2nU7ei0577v9kWYbchHiikRS2zzo`, team `team_Q5dx5tq3CgvvlqXwoyF2t1YM`).
Keep its domains, tag gateway, verification settings and deployment history.

1. Final gate: run `python3 build.py` if sources changed, then `python3 build.py --check`.
   It must print two `OK` lines and exit 0. Complete the browser/UI and copy checks.
2. Synchronize `~/adgent-website` from this directory, preserving `.git/`, `.vercel/`,
   `.gitignore` and `BACKLOG.md`. Back up replaced/obsolete files before a clean cutover.
   Keep `__pycache__/` and `.fontcache/` out of a release staging directory.
   The 2026-10-19 release used an isolated staging copy with the existing Vercel project/team
   IDs in `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID`, then
   `npx --yes vercel@latest deploy --prod --skip-domain --yes` followed by
   `npx --yes vercel@latest promote <deployment-url> --yes`.
   No Git commit or push is implied by deployment authorization; obtain explicit permission.
   Do not repoint the project at the company-brain repository root.
3. Probes immediately after promotion. Do not pre-probe new paths on the production domain:
   the edge can cache a 404 before the deployment creates the route.
   - `curl -sI https://www.adgent.app/` and `https://www.adgent.app/pricing`: both `308` to
     `https://adgent.app/...`; same for `https://adgent-website.vercel.app/`.
   - `curl -sI https://adgent.app/built-from-chat`: `308` to `/campaign-build`; also
     `/media-planning` → `/planning`, `/blog-post` → `/attribution-window-day-one-data`,
     `/index-demo-lab`, `/demo` → `/`, `/cbo-vs-abo-2026` → `/cbo-vs-abo-vs-advantage-plus`.
   - `curl -sI https://adgent.app/BACKLOG.md`, `/README.md`, `/build.py`: `404`.
   - The four security headers on `https://adgent.app/`; `site.js?v=…`, `app.css?v=…` and one
     `assets/og/<slug>.png?v=…` from a page answer `200`.
   - `https://adgent.app/feed.xml` `200` with 25 items; `sitemap.xml` 62 URLs; `robots.txt` has the
     Sitemap line; `/metrics/healthy` answers `ok` (the gateway rewrite).
   - Consent silence: a fresh private window on `https://adgent.app/` makes no third-party request
     before a choice (no `googletagmanager`, `google-analytics`, `/metrics`, Clarity or Cloudflare
     beacon).
   - With explicit send authorization, submit the demo form with a real address and confirm
     receipt at osman@adgent.app, subject "Adgent demo request · home"; repeat the native
     no-JavaScript POST/return path. Intercepted success is UI proof, never delivery proof.
4. Rollback: promote the recorded pre-v2 deployment from the cutover entry above. Do not
   assume reverting a Git commit rolls back a direct CLI deployment.

Still owner actions after the deploy: resubmit `sitemap.xml` and `/feed.xml` in Search Console and
request indexing for the eight new URLs (`/agents`, `/ai-visibility`, `/campaign-build`,
`/dashboards`, `/meetings`, `/planning`, `/platform-change-log`, `/specialists`); re-check Meta domain
verification still reads the tag on `/`; decide whether the seven `/tr/*` URLs that have 404ed by
decision since 2026-08-01 should stay 404 (current choice, unchanged) or redirect.

## Known gaps

- Every live article (25, two of them merged into `/cbo-vs-abo-vs-advantage-plus` with a 301 from
  `/cbo-vs-abo-2026`), `/tools`, both calculators (outputs checked against the live versions)
  and `/business-information` are ported. Every live URL resolves on v2 (audit check 12): the six
  live-only URLs redirect, and the old `/built-from-chat#plan`, `#dashboards`, `#agents` anchors
  are forwarded to `/planning`, `/dashboards`, `/agents` by `site.js`.
- Colour: territory 03 (mint `#63B5A7` on slate `#101C22`) is the site default since 2026-10-10
  (owner decision); the logo SVGs follow it. "Example" chips were removed from product mocks at
  the owner's request; the footer's "sample accounts" sentence was removed 2026-10-14 (owner).
- Mock product UI is HTML, not screenshots.
- To confirm with Osman: custom agents reading GA4 / Search Console / Merchant Center / Drive
  (owner's brief draws them; no deploy test yet), and media planning on screen (never observed).
