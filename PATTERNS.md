# website-v2: the build contract

Local rebuild of the Adgent marketing site in the settled world of
`.impeccable/mocks/decision/landing.html`. **Nothing here deploys.** Preview with
`python3 serve.py 8900` (chrome rendered in memory); `python3 build.py` writes the chrome into
the files on disk and is run once, at the end, by the integrator. Every shared component is
rendered at **`/_kit`**: look there before writing markup.

Content rules (product truth, banned words, what is not built, no em dash in visible copy,
no coverage-disclosure selling point): **`local://site-brief.md`** and the claim ledger
`local://facts.md`. Buyer copy follows `gtm/03-positioning-and-messaging.md` and is linted later.

## Files and ownership

| File | Role | Owner |
|---|---|---|
| `tokens.css` | font faces, every colour, type, radius, shadow, ease token, the 10 accent territories. **Only file with raw hex.** | Foundation |
| `app.css` | the shared component library below | Foundation |
| `app.js` | top bar + reading trail, dropdowns, drawer, reveal, counters, split compare, mirror pairs, decision-card buttons, lead forms, accent switch | Foundation |
| `_partials/{header,drawer,footer}.html` | shared chrome, injected into the markers | Foundation |
| `build.py` / `serve.py` | chrome injection, asset hashing, nav active state / local preview | Foundation |
| `css/<slug>.css`, `js/<slug>.js` | everything one page needs beyond the library | that page's builder |
| `assets/video/`, `assets/creatives/` (+ `manifest.json`) | creative-analysis video, example ad creatives | media builders |
| `_kit.html`, `css/_kit.css` | the gallery; `_*.html` is never built | Foundation |

`assets/adgent-ui.css` at the repo root is the same token set and the portable components
(no chrome, no split compare, no mirror pair), for every artifact outside this site; its kit is
`assets/adgent-ui-kit.html`. A shared token or component changes there and in `tokens.css` /
`app.css` in the same edit.

## Page skeleton: copy this exactly

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex, nofollow"/>
<title>≤60 characters, unique per page</title>
<meta name="description" content="≤160 characters, unique per page"/>
<link rel="canonical" href="https://adgent.app/SLUG"/>
<meta property="og:type" content="website"/>   <!-- "article" on blog posts: lights up Blog in the nav -->
<meta property="og:site_name" content="Adgent"/>
<meta property="og:title" content="…"/>
<meta property="og:description" content="…"/>
<link rel="icon" type="image/svg+xml" href="/assets/logo-app.svg"/>
<link rel="preload" href="/assets/fonts/switzer-400.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="stylesheet" href="/tokens.css"/>
<link rel="stylesheet" href="/app.css"/>
<link rel="stylesheet" href="/css/SLUG.css"/>      <!-- only if the page has one -->
</head>
<body>
<!--#header--><!--/#header-->
<!--#drawer--><!--/#drawer-->
<main id="main" tabindex="-1">
  …sections…
</main>
<!--#footer--><!--/#footer-->
<script src="/app.js" defer></script>
<script src="/js/SLUG.js" defer></script>          <!-- only if the page has one -->
</body>
</html>
```

- No `data-theme`, no `theme-color`, no `.grain`: the night studio and its toggle are gone.
- Leave the markers empty; `build.py` fills them and adds `?v=<hash>` to `/tokens.css`,
  `/app.css`, `/app.js`, `/css/*.css`, `/js/*.js`. Nav `.active` is set for you.
- `noindex, nofollow` on every page: a parallel copy must never be crawled.
- Conversion targets: `/pricing` with the label **Pricing**; **Talk to sales** stays inside that page. Use `/#demo` for the homepage demo. No free-audit form.

## Tokens you may use (never a raw colour)

`--paper --white --card --grey --ink --ink-2 --ink-3 --mute --line --line-2 --accent --t1 --t2
--t3 --primary --on-primary --on-primary-2 --on-primary-3 --on-accent --accent-ink --warn
--warn-ink --warn-t` · `--sans` · `--fs-display --fs-h1 --fs-h2 --fs-h3 --fs-lede --fs-body
--fs-sm --fs-xs` · `--r-blk (28) --r-pillr (60) --r-card (18) --r-row --r-ctl --r-btn --r-pill`
· `--gap (14px) --maxw --gutter` · `--shadow --shadow-ui` · `--ease --ease-out`.

Contrast, measured in the browser (AA = 4.5 body):

| Text | paper | white | t1 | grey | primary |
|---|---|---|---|---|---|
| `--ink` | 16.0 | 17.4 | 13.9 | 13.4 | |
| `--ink-2` | 6.18 | 6.72 | 5.35 | 5.16 | |
| `--ink-3` | 4.74 | 5.16 | **4.10 ✗** | **3.96 ✗** | |
| `--warn-ink` | 5.71 | 6.21 | 4.94 | 4.77 | |
| `--on-primary` / `--on-primary-2` / `--t2` | | | | | 11.26 / 6.64 / 7.81 |
| primary button `--on-accent` on `--accent` | 7.22 (territory 03, default) | | | | |

Rules that follow: `--ink-3` only on paper or white. `--accent` is a fill, line or dot, never
text (2.22 on paper in territory 03); accent-coloured text is `--accent-ink`. On `--t2`/`--t3` use `--ink` only.
`--mute` and `--warn` are non-text. Territories 02 (4.32) and 05 (4.48) fail AA on the
primary button; it is the owner's colour call, recorded in `tokens.css`.

## Class vocabulary

Use these; do not invent shared names. Page-only classes go in `css/<slug>.css`, prefixed with
the slug (`.fa-` for for-agencies, …). Need something reusable? Say so in your report.

**Layout** `.wrap` `.wrap-narrow` · `.sec` (128px) `.sec-sm` (84px) `.sec-flush` `.white` ·
`.cols` + `.cols-2/3/4` · `.split-57` `.split-75` · `.stack` · `.center`

**Type** `.display` (hero h1) · `h1/.h1` `h2/.h2` `h3/.h3` `.h4` · `.lede` `.sub` `.small` `.src`
(source line, required under any number) · `.kick` (eyebrow; craft floor says use it rarely) ·
`.tnum` `.num` (large light numerals) · `.go` (text link + 16px arrow svg) · `.prose` (articles)

**Buttons** `.btn` + `.btn-ink` `.btn-line` `.btn-text` `.btn-acc` (the accent pill, the only
offer button) · `.btn-sm` · `.btns` (row)

**Pills, tags, status** `.pill` `.pill.line` `.pill.acc` (in-product actions; on touch screens the
hit area grows to 44px without changing the drawn size) · `.tag` + `.grey .line .warn .dark .dot` ·
**status vocabulary:** Live `.tag.dot` (available now) · Pilot `.tag.pilot` (built, in early use) ·
Coming `.tag.grey` (on the plan, not built). The site may show what is not live; it never shows it
without one of these labels ·
`.cls` + `.fix .opp .exp .watch .meas` (dot + label) · `.live` (a static dot with a soft ring: the
sample views are not live, so nothing pulses; the `pulse` keyframes are only for a step that is
actually in progress in a scripted demo)

**Blocks** `.blk` (28px block, 30/32 padding) · `.r28` `.pillr` · `.bg-paper .bg-white .bg-line
.bg-ghost .bg-grey .bg-t1 .bg-t2 .bg-t3 .bg-primary` · `.lift` · `.blk-t` (b + span) `.blk-big` ·
`.collage` (12 columns × 104px rows; place children with `style="--c:4/10;--r:1/3"`), `.blk-lead`
(goes first on mobile), `.is-deco` (hidden on mobile)

**Section head** `.sec-head` (+ `.c` centred, `.row` heading left / sub right)

**Product UI** `.uc .uc-h .uc-t` · `.ui-row` (`.cls .t .e`) · `.vtop` (verdict head on the
dark field: `.k b .m`) · **decision card** `.dc` → `.dc-h` (`.cls` + `.dc-k`) `.dc-v` `.dc-m`
`.dc-diff` `.dc-why` `.dc-act` (buttons carry `data-act="approve|skip"`, local state only; a page
that scripts its own cards puts `data-own` on the `.dc` to opt out of the shared handler) ·
**ledger** `.lg` → `.lg-hd`, `.lg-row` (`.lg-t .lg-a .lg-c .lg-d .lg-x`), `.lg-row.ext` for
platform-side edits (recorded, no revert button), `.lg-note` · **chat** `.chat` (`.on-white`) →
`.bub.me` (visitor, ink) `.bub.ai` (Adgent, white; `.dc`/`.lg` nest inside) `.who-ai` `.sugg`
`.chat-in`. Chat is static: fully composed, no click-to-reveal.

**Split compare** (landing-b hero; markup in `/_kit`): `.cmp-tog` (sibling right before) ·
`.cmp` → `.cmp-ly.cmp-today` + `.cmp-ly.cmp-lit`, each two `.cmp-z` (the secondary zone gets
`.cmp-z2`, hidden on mobile), then `.cmp-h[role=slider]` > `.cmp-knob` · `.cmp-cap` ·
helpers `.cmp-lh` (`.clock .dot .meta`) `.cmp-tools .cmp-tl .cmp-q .cmp-ghost`. Today is
greyscale with a hairline; the lit layer is white and clipped at `--cmp-x` (the mirror pair
wipes on `--ps-w`; both are registered in tokens.css, so never reuse those names). Drag, arrows,
PageUp/Down, Home/End; mobile snaps via the toggle.

**Mirror pair** `section.ps` (`.end` on the last) → `.ps-h` (h2 + `.sub`) · `.ps-tog` ·
`.ps-pair` → `.ps-today` + `.ps-lw` (`.ps-seam` + `.ps-lit`) · `.ps-hd` `.ps-rows` `.ps-note`.
The lit half wipes in once on entry. Use it now and then, not on every section.

**Proof and trust** `.stats` > `.stat` (`b` + `span`; `data-count` counts up) followed by
`.src` · `.trust` (+ `.c`, `.pills`, `.band` with `.trust-t`) · never a logo wall

**FAQ** `.faq` (head + `.qa`) · `.qa > details > summary` (text + `<i aria-hidden="true">`) + `.a`

**Sales/demo CTA** `section.cta` > `.cta-b` (`.cta-mark` svg, text, optional `.steps`,
then a link to `/pricing` or one demo form). Never stack a second email request below it.
`form.form` → `.fld` (label > span + input) `.err` `.btn-acc` `.fine` `.done-msg` ·
`form.qf` one-line email (`.c`, `.qf-row`, `.err`, `.fine`, `.ok-msg`) · `.inline-cta`.
Use `.sales` on the `/pricing` form and `.demo` for demo requests. Do not add a platform selector.
`build.py` makes each form a plain `method="post"` form to Web3Forms with a generated
`<!--#w3f-->` block (access key, subject "Adgent sales request · <page>" or
"Adgent demo request · <page>", page, `form_location`, a same-domain
`redirect` to `#sent-N` whose `:target` shows the form's own confirmation, the `botcheck`
honeypot), so the lead goes through without JavaScript. `app.js` validates, then sends the same
fields by fetch as FormData (no preflight, no `redirect`), ties `.err`
to the fields with `aria-describedby` (and creates `.err` if missing), and on success fires
`generate_lead` with `form_id: "leadForm"` and `form_location`. While sending the button is
disabled and reads "Sending…"; `.sent` (the confirmation) only follows a `success:true` reply; any
failure keeps the form, writes the error with the team's email into `.err` and relabels the button
"Try again". No page markup is needed beyond the above; never hand-write the hidden fields. Test
with the request intercepted, never by submitting.

**Focus** one ring for every control, `2px` in `var(--focus)`. Dark surfaces (`.bg-primary`,
`.on-primary`, `.cta-b`) set `--focus` to `--on-primary`; light islands inside them (`.form`,
`.qf-row`, `.menu`) set it back to `--ink`. A page with its own dark surface sets `--focus` on it
instead of overriding `outline-color`. Selection is `--t2` behind `--ink` text, readable on every
surface.

**Motion** `.rv` on a block (`style="--d:1"` staggers by 90ms) reveals once on scroll,
transform + opacity only, off under reduced motion. One authored moment per page; do not put
`.rv` on everything. Page-specific controls and product motion live in `js/<slug>.js` and check
`prefers-reduced-motion`.

Cross-document navigation uses the browser's View Transition API when available: header and mark
stay continuous while `main` enters on the paper plane. The top-bar hairline is also the page's
reading trail (`--read-progress`); both degrade to ordinary navigation and a static line under
reduced motion. Industry pages use `js/industry.js` for one literal, token-only line drawing
(parcel, contact, suitcase, shop, map or phone) staged above the existing hero evidence at every
breakpoint. A quieter operating trace sits behind it on widths above 860px. The scene enters once;
fine pointers shift its two layers by at most 14px, and neither layer enters the accessibility tree.

Core product, feature, audience and company heroes use the same `.sketch-art` grammar through
`js/hero-illustrations.js`: one route-specific object, mounted against an existing proof surface.
Examples include an approval gate, open ledger, source desk, blueprint, meeting window, quote
sheet and compass. The drawing may occupy reserved paper beside or below the proof; it must not
cover the headline, imitate product UI or create a second evidence claim. It enters once, moves by
at most 6px on a fine pointer, becomes static under reduced motion and remains `aria-hidden`.

## Icons and the mark

Icons are inline SVG, 1.5–2px stroke, `currentColor`, round caps (see `/_kit`). No emoji or
unicode glyphs as icons. The logo mark (two chevrons over a baseline) is inline SVG with
`fill="currentColor"`; it takes `--accent` in the header and `--primary` on product UI.

## Dev accent switch

`?accent=01`…`?accent=10` sets `data-accent` on `<html>` and remembers it in localStorage;
`?accent=off` clears it. Local preview only (`localhost`/`127.0.0.1`); production ignores the
parameter and removes a stored key. Default is territory 03 (mint `#63B5A7` / slate primary `#101C22`, owner
decision 2026-10-10). Swapping the
committed colour or face later is an edit to `tokens.css` only.

## Hard rules

1. No raw colour outside `tokens.css`. Inline `style` only for `var(--…)`, collage placement
   (`--c`, `--r`, `--d`) and one-off spacing.
2. Homepage forms retain **Request a demo**. No demo CTA in the shared header or mobile drawer
   (owner decision 2026-10-29); the footer demo link remains.
3. One `<h1>` per page, no skipped heading levels, every control keyboard-reachable, every
   `<img>` has `alt`, no nested `<a>`, touch targets ≥ 44px on mobile.
4. Real numbers name their account and date in a short `.src` line. Sample product views carry no
   "Example" chip and the footer says nothing about them (owner decisions 2026-10-10 and 2026-10-14).
5. Do not edit files you do not own (table above). `build.py` is run once by the integrator.
6. Everything on this site is English, including text baked into images (owner decision
   2026-10-10; a Turkish site, if it comes, is a separate build). Sample amounts are USD. Two
   exceptions only: a real cited account may show its original TRY next to USD, and legal
   identity strings (legal business name, Türkiye, KVKK) stay as registered.

**Legal pages are the live site's text, verbatim** (owner decision 2026-10-12; they were submitted
to Google and Meta). Inside `<main>` of `/privacy`, `/terms`, `/data-use`, `/data-deletion`,
`/security` and `/business-information` the hero H1 and date, the contents labels and everything
in `.legal-intro` and `.legal-body` are copied byte for byte from `website/`, em dashes included;
`css/legal.css` and `js/legal.js` only restyle and annotate that markup. Never edit the text here:
change it on live first (`website/TODO.md` §0), then copy it across.

## Verify before you report

- `python3 serve.py 8901` and open your page: header, drawer and footer render.
- 1440 and 390: no horizontal scroll, nothing past the right edge, real copy at each width.
- Keyboard through the page once; reduced motion on, page still complete.
