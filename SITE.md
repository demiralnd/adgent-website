# The website — how it's built and how to not break it

> **Read this before editing any page.** The site is 52 static HTML pages with no framework and no
> template engine — but it **does have a build step**: `build.py` regenerates the shared header,
> nav, mobile menu and footer into every page from `_partials/`, plus `sitemap.xml`, `llms.txt` and
> `llms-full.txt`. Without it those blocks drift, because every page carries its own copy.
>
> ⚠️ **Corrected 2026-08-14.** This line previously said *"64 plain static HTML files with no build
> step"* — and then documented `build.py` four sections below it. An agent reading only the opening
> paragraph would hand-edit the nav, which is exactly what the script exists to prevent.

## The two repos

| Repo | Role |
|---|---|
| `adgent-website` | **Live.** Deployed on Vercel |
| `adgent/website` | Mirror inside the docs repo |

**Feed both on every change.** They are not linked; nothing syncs them automatically.

⚠️ **The rule was not held — measured 2026-09-03.** The mirror was a full commit behind live
(`53f6803` *"SEO/GEO: font delivery, honest lastmod, snippet limits, a 404 page"*): **61 files
differed**, all 52 pages were stale against `_partials/`, `404.html` and `.lastmod.json` were
missing entirely, and the mirror's own `build.py` was 492 lines against live's 568. Anyone
reading the docs repo was reading a pre-SEO-pass site. Resynced live → mirror on 2026-09-03,
preserving the mirror-only files (`TODO.md`, the three `_adgent-*.html` doc artifacts, the
`assets/og/*.svg` sources). Sync direction is **always live → mirror**; live is authoritative
because it is the deploy source and the only one with a remote.

**Mirror-only HTML must start with `_`.** `build.py` skips underscore-prefixed files, so the
doc artifacts stay out of the page walk, the sitemap and `llms.txt`. They were renamed on
2026-09-03: before that, `build.py --check` exited **1** in the mirror — stale sitemap plus 12
head problems — against **0** in live, for three files live does not contain. A pre-deploy gate
that is red for a reason you have to remember is not a gate.

```bash
rsync -a --exclude='.git/' --exclude='__pycache__/' --exclude='.fontcache/' \
      --exclude='BACKLOG.md' ~/adgent-website/ ~/adgent/website/
```

A hand-maintained mirror drifts by default. If this recurs, replace it with a git submodule or
a symlink rather than re-litigating the copy discipline.

## Previewing locally — use `serve.py`, not `http.server`

```bash
python3 serve.py        # http://localhost:8899
```

`vercel.json` sets **`cleanUrls: true`**, so production serves `/pricing` from
`pricing.html`. Python's plain `http.server` does not do that rewrite, so every
extensionless link in the nav 404s under it — which reads as "the whole menu is
broken" when nothing is wrong. `serve.py` mirrors the Vercel behaviour.

## build.py — the build step

```bash
python3 build.py --check   # fail if any page is stale — run before deploy
python3 build.py           # regenerate every page + sitemap.xml + llms.txt + llms-full.txt
```

**Generated artifacts — never hand-edit any of these:**

| File | Generated from |
|---|---|
| the `<!--#header-->` / `#mobile` / `#footer` blocks in every page | `_partials/*.en.html` |
| `sitemap.xml` | the files on disk, excluding any page carrying `noindex` |
| `feed.xml` | every page whose top-level JSON-LD is a `BlogPosting`, newest first |
| the `rel="alternate"` feed link in every `<head>` | `FEED_LINK`, inserted by `feed_link()` after the canonical |
| `llms.txt` | the pages, preserving the hand-written preamble at the top |
| `llms-full.txt` | the pages |

The two `llms*.txt` files are the AI-crawler surface and are covered by `--check` like everything
else, so a new page that never gets a build run is missing from them silently.

`--check` also enforces one cross-file contract: the `script.src` values in `site.js` must be
first-party paths, and `vercel.json` must rewrite each of them — both the bare path and its
`/:path*` companion — to a `*.fps.goog` tag gateway origin. Measurement has no visible symptom
when it breaks: a renamed path, a dropped rewrite or a paste back to `googletagmanager.com`
would keep serving the site perfectly while collecting nothing. This check is the only place
that notices.

⚠️ **Debugging trap, hit on 2026-09-03.** Pages link the stamped URL (`/site.js?v=<hash>`), and
`vercel.json` serves it `immutable` for a year. Cloudflare keys its cache on the full URL, so
the **unstamped** `https://adgent.app/site.js` can keep answering with a copy from before the
last deploy — it did, showing the pre-gateway `googletagmanager.com` sources hours after they
were replaced. Nothing on the site requests that URL. Always verify against the stamp the page
actually links.

**`_partials/` is the source of truth**, not any page:

```
_partials/header.en.html
_partials/mobile.en.html
_partials/footer.en.html
```

Pages carry markers instead of copies, so the block is regenerated rather than hand-maintained:

```html
<!--#header-->  ...regenerated, do not edit...  <!--/#header-->
```

`class="active"` on the current nav item is re-applied per page from its filename. Never hand-edit
it. `sitemap.xml` is generated from the files on disk and **excludes any page carrying `noindex`**.

⚠️ **This was false until 2026-09-03 and is now true.** `EXTRA_SLUGS` (subdirectory pages)
was appended to the sitemap **unconditionally**, after and outside the
`_noindex` filter, so the guarantee never covered it. Caught by a full-site Lighthouse sweep:
deployed `/demo` served `<meta name="robots" content="noindex, nofollow">` while sitting in
`sitemap.xml` at priority 0.9 — the exact contradiction this paragraph claimed was impossible.
Same code path had a second defect: `_lastmods()` globbed only root `*.html`, so every
subdirectory page fell through to `dates.get(slug, today)` and was stamped **today on every
build** — the permanent-freshness signal that function exists to prevent. Both fixed in
`build.py`. `EXTRA_SLUGS` is **empty** since 2026-09-09 (see below); the filter and the
content-hash lastmod stay, because the next subdirectory page will need both.

**Run it after** editing `_partials/`, or adding/removing a page. Then copy to the mirror.

## /demo is off the site — 2026-09-09, owner decision

The owner is not confident in the interactive demo's current state, so it comes off now and
goes back later. What was removed is every **path to it**, not the page:

| Removed | Where |
|---|---|
| the *Interactive demo* mega-menu entry | `_partials/header.en.html` |
| the mobile drawer entry | `_partials/mobile.en.html` |
| the footer Product entry | `_partials/footer.en.html` |
| `demo` from the sitemap and `llms.txt` walk | `build.py` `EXTRA_SLUGS` |
| `demo` from the sitemap priority map | `build.py` `_PRIO` |
| `demo` from the llms.txt Product group | `build.py` `_LLMS_GROUPS` |

`demo/index.html` **stays on disk** and still carries `noindex, nofollow`, so re-adding it is
those six lines and nothing else. It is now reachable only from `index-demo-lab.html`, which is
itself `noindex, nofollow` and out of the sitemap — an internal door, invisible to search.

⚠️ **The URL still answers 200 until this deploys, and after it deploys.** Unlinked plus
`noindex` removes it from the site and from search; it does not make `adgent.app/demo` stop
serving. If the page must be unreachable by URL too, that is one host-level `redirects` entry in
`vercel.json` — deliberately **not** added, because it would have to be removed again to put the
demo back, and nothing links the URL to leak it.

**Same pass, because the demo's removal made it wrong:** 26 pages still ended with a
**"Request demo"** button — 25 article `.post-foot` CTAs plus the `about.html` form submit — and
three hidden form `subject` values read *"New Adgent demo request"*. The 2026-09-07 pass (§7.5)
recorded "One CTA offer everywhere" but only covered the partials; `.post-foot` sits outside the
regenerated blocks, so it kept the old offer for two days. All 29 pages now say **"Get a free
audit"**, which is the site's one offer.

## /demo rebuilt — 2026-09-11

The page above was taken off the site because the owner was not confident in it. It has been
rebuilt from scratch. **It is still unlinked and still `noindex`** — putting it back is the
owner's call and is still the six lines in the table above.

**Why the old one could not be liked — four defects, all measured, not opinions:**

1. **It loaded none of its own fonts.** The file declared `--font-ui:"Plus Jakarta Sans"` and
   `--font-mono:"Geist Mono"` and shipped **zero `@font-face` rules** and no `<link>` to
   `tokens.min.css`. `document.fonts.size` on the deployed page was **0**: every screen of it
   rendered in `system-ui`. The brand typography was simply absent.
2. **It demoed a screen the product had deleted.** Its centrepiece was the *Daily Brief*
   newspaper sheet — removed from the product on 2026-08-26 (`adgent 148a83b`) — and an
   *Action items* route that is now `/decisions` with ten specialists
   (`product/deploy-test-status-2026-08-26.md` §2.3).
3. **Three P0 copy claims the product cannot back** were live in it: *"around the clock"*
   (`:1131`), *"undoing it is one click"* (`:662,:1201,:1447`), and a hard-coded
   *"August 18, 2026"* (`:1209`).
4. **No `<h1>`, eleven sub-44 px controls at 390 px**, and the cookie banner sat on top of the
   workspace (`TODO.md` §7.1).

**What replaced it.** One page, one account's first run, three visitor-chosen routes — no timer,
no autoplay, no fake macOS window, no freeform prompt box that only accepts a script:

| Route | Canvas | The claim it proves |
|---|---|---|
| 1 · The verdict | Decisions board | 53 decisions, 33 worth ₺43,450/mo and 13 worth ₺56,260/mo — the `sales-deck-agency.html:976` numbers, so the deck and the demo cannot drift |
| 2 · The refusal | Coverage | the rank-wall refusal, and the one lever the run greyed out with its reason |
| 3 · The undo | Change ledger | propose → approve → ledger row → **Revert with Agent** → the inverse arrives as *its own approval card* |

**Every number on the page reconciles**, which is the point — the ten specialist totals sum to
₺119,710/mo, less the ₺20,000 sitting on an experiment (which carries no saving) = ₺99,710 =
43,450 + 56,260. Per-specialist open counts sum to 53, and their class splits sum to 33/13/7.
Sources: `product/deploy-test-findings-2026-09-05.md` §B0 and the specialist sections under it.

**Two deliberate decisions to review before re-linking:**

- **No analytics, therefore no consent banner.** The page loads `tokens.min.css` and nothing
  else — no `gtag`, no cookieconsent. That is what removed the banner that used to cover the
  workspace and the CTA at 390 px. If `/demo` goes back on the nav, decide whether it needs the
  measurement snippet, and re-check the 390 px overlap if it does.
- **The account is anonymised, not invented.** Campaign and brand names are generic
  (`Generic — Search`, `Hyperlocal`, `Prospecting · Lookalike`); the findings, counts and money
  are the real first run. The page says *"Sample workspace · anonymised account"* in the header
  and again in every source popover.

**Techniques used** (all zero-dependency, all in current stable Chrome/Safari/Firefox):
`document.startViewTransition()` for tab and route changes, `color-mix(in oklab, …)` and
`rgb(from … / α)` so every tint derives from `#ff5a2c`, `@container` on the canvas column,
`popover` + `position-area`/`position-try` for the source notes, `@starting-style` +
`transition-behavior: allow-discrete` for their entrance, a `0fr → 1fr` grid accordion for the
decision cards, and `animation-timeline: view()` behind `@supports` for the stage entrance.

## What this was fixing — measured 2026-08-01

Before the script existed:

- The footer's one-line brand description existed in **18 different variants** across 63 pages —
  *"AI analist"* / *"AI analisti"* / *"yapay zeka analisti"*, *"brief"* / *"brifing"* / *"özet"*,
  *"yapılmış"* / *"bitmiş"* / *"tamamlanmış"*. Nobody had decided any of them; they were
  copy-paste drift.
- **59 of 63 pages had dead footer social icons** — `href="#"`, going nowhere. Only 4 carried the
  real Instagram link, and LinkedIn was missing everywhere despite being in the structured data.
- **24 pages were missing from `sitemap.xml`**, including the whole `tr/` tree.
- Adding one nav link meant editing 63 files by hand.

All four are fixed and `--check` now passes.

## Measured state — full-site audit 2026-09-03

Every one of the 52 sitemap URLs was audited with Lighthouse (headless Chrome, mobile,
`serve.py` so `cleanUrls` matches production):

| Category | Result |
|---|---|
| SEO | **100/100 on 52/52** |
| Accessibility | **100/100 on 52/52** |
| Best practices | **100/100 on 52/52** |

Also verified in the same pass: **zero broken internal links** and zero dead `#anchors`
across 55 routes; **no orphan pages** — every indexable page is reachable from the homepage
in ≤2 clicks; no duplicate `<title>` or duplicate meta description; every title ≤60ch and
every description ≤160ch (⚠️ **this was a prose claim, and it was false again by 2026-09-09** —
a 70ch title and a 181ch description shipped with the tool-page pass. It is `build.py`
check 6 now, so it can only be false with the build red); **all 52 production URLs return HTTP 200**; no page carries an
`hreflang` (single-locale since 2026-08-01 — the earlier note claiming every page has one
was stale). `404.html`, `blog-post.html` and `index-demo-lab.html` are the only routes not
in the sitemap, all three correctly: an error page, a `noindex` redirect stub, and a
`noindex` lab page.

**Structured data:** every page's JSON-LD parses, and **every `FAQPage` answer now matches
its visible on-page text verbatim** — 251 Q&A pairs checked. Ten had drifted after the
visible copy was edited without the schema (Google requires FAQ structured data to reflect
visible content); all ten were corrected to the visible wording. Re-check with:

```bash
python3 - <<'PY'
import re, json, html as H, glob
def strip(x): return re.sub(r"\s+"," ",H.unescape(re.sub(r"<[^>]+>"," ",x))).strip()
bad=[]
for f in sorted(glob.glob("*.html"))+["demo/index.html"]:
    h=open(f,encoding="utf-8").read(); head,_,rest=h.partition("</head>"); bt=strip(rest)
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>',head,re.S):
        for n in json.loads(m).get("@graph",[]):
            if n.get("@type")=="FAQPage":
                for q in n["mainEntity"]:
                    if strip(q["name"]) not in bt or strip(q["acceptedAnswer"]["text"]) not in bt:
                        bad.append((f,q["name"]))
print("mismatches:",len(bad),bad)
PY
```

**Colour tokens.** 35 pages failed WCAG AA contrast because the inline blog stylesheet and
`demo/index.html` still used `--accent` for small text and as a white-text background, and
dragged compliant tokens back under AA with `opacity: 0.75`. `tokens.css:43-53` already
decides this — *"Never use --accent for small text"*, `--accent-text` for text,
`--accent-fill` for any surface carrying white text below 24px. Applying the existing rule
fixed all 35. `demo/index.html` also carried a **stale copy** of the text tokens
(`--text-3:#847d72`, `--text-4:#a09889`, pre-accessibility-fix) and was missing
`--accent-fill` entirely — both corrected. It keeps its own `:root` block because it does
not link `tokens.css`; **any token change in `tokens.css` must be mirrored there by hand.**

**One HTML defect, worth knowing about:** `features.html` had an `<a>` nested inside another
`<a>` (an inline link inside a whole-row link). Nested anchors are invalid, so the parser
split the outer link and emitted an empty, focusable, unnamed one — the Creative
intelligence row was not a working link. Fixed by unwrapping the inner link. There are now
**zero nested anchors sitewide**; keep it that way when adding inline links to `.feat-row`.

### Buttons: the logo colour, with white labels — decided 2026-09-03

`2941227` (2026-09-02) fixed a real contrast failure the wrong way round. White on the
logo coral `#ff5a2c` is **3.11:1** and fails AA under 24px, so it introduced
`--accent-fill: #d1421d` and kept the label white. Contrast passed; **every button on the
site became a colour the logo does not contain.**

| Pairing | Ratio | |
|---|---|---|
| `#ffffff` on `#ff5a2c` | 3.11:1 | **what we ship** — owner decision, brand over score |
| `#1c1a17` on `#ff5a2c` | 5.58:1 | passes AA at any size; rejected on brand |
| `#ffffff` on `#d1421d` | 4.68:1 | passed, but off-brand |

There is no third option at 14px: white text needs the background luminance below 0.183 and
`#ff5a2c` is 0.288. Either the colour moves or the label does. **Neither moved, by
decision** — the fill is the logo colour and the label is white, and the site scores
**accessibility 97 instead of 100** because of it. Three spans, all the same 3.11:1 pairing.

This is a trade that was made with the number in hand, not an oversight. Do not "fix" it
back to ink without asking. The one route that recovers both: AA allows 3:1 for text at
18.66px bold or 24px, and the button label is 14px/600 today.

Done at token level (`tokens.css`), so buttons, table headers, chat bubbles, the cookie
banner and the demo shell all follow one decision — `--accent-fill` is the logo colour and
`--accent-on` is ink. `--text-inverse` was decoupled to `#ffffff` so dark bands keep white
text. `demo/index.html` keeps its own `:root` copy and was updated by hand, including the
severity colours, which were still the pre-accessibility values.

Surfacing this also exposed two selectors that had been violating `tokens.css:47` all
along — `.why-card-go` (13.5px) and `.hwb-lock-n` (12px) used raw `--accent`, and
`.src-note` dragged a compliant token under AA with `opacity: .5`. All three fixed. They
had been passing only because the reveal animation happened to hide them at capture time;
**a Lighthouse pass on animated content is not proof unless the same pages pass twice.**

### Performance — measured 2026-09-03, Slow 4G + 4× CPU, median of 3

| | Production before | Local before | Local after |
|---|---|---|---|
| FCP | **1,156 ms** | 4,520 ms | **3,884 ms** |
| Long tasks | 480 ms | 464 ms | ~450 ms |
| `will-change` elements | 58 | 58 | **23** |
| Transferred | 150 KB | 917 KB | 917 KB |

Read the columns carefully: **production is not slow on the network.** `serve.py` does not
compress, so the local figures carry 917 KB where Cloudflare ships 150 KB brotli'd — the
local numbers are only useful against each other.

Two real defects were removed:

1. **A chained render-blocking request.** `site.css:1` still had
   `@import url("/assets/vendor/cookieconsent-3.1.0.css")` — the trace shows it starting at
   95 ms because its initiator is `site.css`, which finished at 90 ms. This is the exact
   problem `53f6803` fixed for webfonts and left in place for the consent stylesheet. It is
   now loaded by `site.js` next to the module that draws the banner, and blocks nothing.
2. **58 permanently promoted compositor layers.** `[data-reveal]` set
   `will-change: opacity, transform, filter` and never released it, so every revealed
   element held its own layer plus a blur buffer for the life of the page. MDN is explicit
   that the hint must be removed once the change is done. Dropped from the base rule.

**What was not the cause:** the webfont change in `53f6803`. The request URL is byte-identical
before and after that commit — same three families, same variants. It moved them out of a
chained `@import` into a `<head>` link, which is strictly faster.

### The profile, and what it found — 2026-09-03

Traced production under Slow 4G and 4× CPU. LCP 1,321 ms, of which **1,100 ms was render
delay** — the bottleneck was the main thread, not the network, and render-blocking requests
already reported an estimated saving of **0 ms**. Two forced-reflow defects, same shape:

| Frame | Before | After |
|---|---|---|
| on-load reveal pass | **136 ms** | one layout instead of 23 |
| `placeGlyphs()` | 16 ms → **69 ms** once it was no longer hidden | **9 ms** |
| `docTop()` | 52 ms | 11 ms |

Both read `getBoundingClientRect()` and wrote a class or a style **inside the same loop**, so
every write invalidated layout for the read after it. Split into read and write phases. The
rule to keep: **measure the whole set, then mutate the whole set.** `upd()` and the chapter
seam loop still interleave, at single-digit-to-50 ms; they are the same fix when someone is
next in this file.

Where it landed, Lighthouse mobile on production: **performance 78, TBT 0 ms, CLS 0**, but
**FCP = LCP = 3.8 s**. TBT at zero says JavaScript is no longer blocking; the whole render is
now gated on first paint.

### The stylesheets are served without their comments — 2026-09-03

`build.py` emits `site.min.css` and `tokens.min.css` and `stamp_assets` points the pages at
them. The sources keep every comment; only the served copies lose them. Confirmed by
Lighthouse against production: **`site.css` 74.9 KB → 42.2 KB**, and its own
`unminified-css` opportunity fell from **28 KiB to 6 KiB**.

No dependency was added. The strip refuses to run if any string or `url()` contains a
comment marker, and asserts that every brace it removed sat inside a comment. Equivalence
was checked in the browser rather than by eye: both files parse to an **identical CSSOM —
1699 top-level and 2154 total rules either way**. Whitespace is deliberately untouched; it
buys 1.2 KB more and is where a regex over a 288 KB file would actually get dangerous.

⚠️ **Say the disappointing part plainly: Lighthouse's simulated FCP did not move.** 78
before, 76/77/78 across three warm runs after. A first run scored 68 purely because the new
filenames were cold at the edge — never report a number off a cold cache. The bytes are
genuinely gone and slow connections genuinely benefit; the lab score does not show it,
because something else dominates.

### What actually gates first paint now — measured

`render-blocking-insight`, estimated total saving **1,820 ms**:

| Resource | Size | Cost |
|---|---|---|
| `fonts.googleapis.com/css2?…` | **1.7 KB** | **995 ms** |
| `site.min.css` | 42.2 KB | 1,222 ms |
| `tokens.min.css` | 1.5 KB | 215 ms |

**A 1.7 KB file costing 995 ms is not a bandwidth problem, it is an origin problem** — DNS,
TLS and connect to `fonts.googleapis.com`, and then the same again to `fonts.gstatic.com`
before a single glyph arrives. Two extra origins in front of the first paint.

### The fonts are self-hosted now — done 2026-09-03, and it worked

| | Google-hosted | Self-hosted |
|---|---|---|
| Lighthouse performance | 76 / 77 / 78 | **87 / 85 / 83** |
| FCP | 4.2 / 4.0 / 3.9 s | **2.0 / 3.0 / 3.3 s** |
| Render-blocking estimate | 1,820 ms | **1,340 ms** |
| Third-party origins before first paint | 2 | **0** |

Ten woff2 files in `/assets/fonts/`, 419 KB on disk, **latin and latin-ext only** — the site
is English and the cyrillic and vietnamese subsets never downloaded. The `@font-face` rules
sit at the top of `tokens.css`.

**They are Google's own output for the identical request with the URLs rewritten**, so the
files are byte-identical to what the browser was already fetching and the rendering cannot
shift. All three families are OFL, which permits self-hosting.

Verified in the browser rather than by eye: zero requests to `googleapis` or `gstatic`,
`document.fonts.check` passes for Jakarta regular and italic, Geist Mono and Fraunces
italic, and `font-display` reports no failures across 52 pages.

**To regenerate** (a family or weight changes): fetch the Google CSS for the new request
with a browser user-agent, keep the `latin` and `latin-ext` blocks, download each unique
`woff2`, rewrite the URLs to `/assets/fonts/`, and replace the block at the top of
`tokens.css`. `build.py`'s audit now **fails** if a link to `fonts.googleapis.com`
reappears, which is the guard against someone quietly undoing this.

**What is left:** `site.min.css` is now the entire render-blocking path at 1,529 ms, and
**28 KiB of it is unused on the homepage**. That is critical-CSS extraction, which risks
FOUC across 52 pages — the last lever, and the one that genuinely wants daylight.

## The tool pages — the pattern, and the two traps in it

`/tools`, `/break-even-roas-calculator` and `/conversion-signal-check` (added 2026-09-07) are the
first pages with their own behaviour. They deliberately touch **neither `site.css` nor `site.js`**:
the widget CSS is one `<style>` block in the page head (the same precedent the articles set) and
the calculator is one IIFE in a `<script>` before `<!--#footer-->`. A tool that only two pages use
does not belong in a 288 KB stylesheet every page downloads.

What they must keep:

1. **The default state is rendered in the HTML, and it matches what the JS computes.** A crawler and
   an answer engine see `2.49×` and a filled results table, not zeros waiting for JavaScript — the
   defect we logged against two competitors whose animated counters serve `0` to reader mode. If you
   change a default input, recompute the printed outputs in the same edit.
2. **`WebApplication` + `FAQPage` + `BreadcrumbList` JSON-LD**, with `isAccessibleForFree: true` and
   an `Offer` at price 0. The head is scaffolded from a donor page (`newpage.py`), so the graph has
   to be swapped deliberately — a tool page carrying `SoftwareApplication` for the product is wrong.
3. **A method note with a named author, a `<time datetime>` and the source of every quoted figure.**
   No competitor in the set does this; it is the whole reason these pages are citable.
4. **`<noscript>`** naming what still works without JS (the formula and the reference table do).

⚠️ **Trap 1 — `[hidden]` loses to a class.** `.tl-f { display: block }` overrides the UA
`[hidden] { display: none }`, so `label.hidden = true` kept rendering the Google-only Bid strategy
field on the Meta branch. `.tl-f[hidden] { display: none }` is why the conditional field works;
don't delete it.

⚠️ **Trap 2 — never author these files through an IPython cell.** A line of JavaScript that reads
`x = !flag;` inside a Python string is rewritten by IPython's shell-escape transformer into
`x = __omp_shell("flag;")`, which parses fine, ships silently, and throws `ReferenceError` in the
browser on the first call. It happened on 2026-09-07 and the only symptom was a calculator whose
numbers never moved. Grep new pages for `__omp_shell` before believing them.

## The crawler — FreeCrawl, and what it found on 2026-09-09

The site's SEO work had no instrument. Lighthouse scores one URL at a time and reports nothing
about the *set* — duplicate hosts, entity consolidation, pixel-width truncation, which page links
the 404. [FreeCrawl](https://github.com/kemalai/FreeCrawl-SEO-Tool) (MIT, local, no telemetry, 167
checks) is now that instrument, and it is wired into OMP so a session can read a crawl instead of
re-deriving it with one-off Python.

```bash
# one-off headless crawl (~45 s for the whole site)
cd ~/adgent/.seo
node ~/tools/FreeCrawl-SEO-Tool/apps/cli/dist/index.js https://adgent.app/ \
     --max 300 --concurrency 5 --rps 5 --db adgent.seoproject --out adgent-crawl.json --json
```

The crawl project is `~/adgent/.seo/adgent.seoproject` and the MCP server is registered in
`adgent/.omp/mcp.json` as `freecrawl` — 101 tools over the same SQLite file, so `top_issues`,
`query_urls`, `report_sitemap_orphans` and the rest answer without another crawl. `session_create`
and `start_crawl` need the desktop app open; everything read-only does not.

**Crawl it against production, not `serve.py`.** Half of what it checks is response headers,
redirects and host behaviour, none of which `serve.py` reproduces. The consequence is that a crawl
always describes the **last deploy** — the 2026-09-09 crawl saw `/demo` linked, because the removal
above had not shipped yet.

### What it found, and what was done — 2026-09-09

**Fixed in this pass:**

| Finding | Evidence | Fix |
|---|---|---|
| `www.adgent.app` served the whole site at **200**, no redirect | `curl -sI https://www.adgent.app/` → `HTTP/2 200`, canonical `https://adgent.app/` | host-conditional 308 in `vercel.json`, gated by `audit()` check 8 |
| 103 anonymous `Organization` nodes + 20 anonymous `WebSite` nodes across 55 pages | every JSON-LD block, none with `@id` | shared `@id` `#organization` / `#website`, gated by check 9 |
| 13 heads over a SERP cap | a 70ch title and a 181ch description first; then 10 descriptions over 985px once measured properly | all rewritten, gated by check 6 — in **pixels**, see the correction below |
| 27 indexable pages shared one OG card | `assets/og/site.png` on every product, solution, tool and legal page | 27 generated per-page cards, gated by check 10 |
| no feed on a 25-article blog | `feedMissing`, 55/55 | `/feed.xml` generated by `build.py`, linked from every head, gated by check 6 |
| no security response headers | `xFrameOptionsMissing` / `xContentTypeOptionsMissing`, 55/55 | four headers in `vercel.json`, gated by check 11 |
| one internal 404 target reached from 5 pages | `/cdn-cgi/l/email-protection` from the five legal pages | *not a defect* — see below |
| a link pointing at the wrong page | `support.google.com/google-ads/answer/6259715`, linked from `cross-platform-comparability-meta-google` as "its own windows" | repointed to `…/answer/3123169` |

⚠️ **Correction on that last row: the link was never broken.** The crawl reported it 404, and so
did one `curl`, so the first version of this section called it a dead link. Re-probed with and
without a browser user-agent, `6259715` answers **200** — Google Help rate-limits and returns 404
to a crawler that asks too fast. What was actually wrong is better: `6259715` is
**"About attribution models"**, and the sentence linking it is about *conversion windows*
(*"Google Ads runs its own windows, commonly 30-day click"*). `3123169` is **"About conversion
windows"**. The swap stands on relevance, not on a status code. **Verify a reported 404 by hand
before calling a link dead** — a rate-limited host and a deleted page look identical in a crawl.

**The anonymous-`@id` one is the interesting one.** A JSON-LD node with no `@id` cannot be
referenced, so it does not merge: 55 pages each declaring `{"@type": "Organization", "name":
"Adgent"}` describe 55 companies that happen to share a name, not one company described 55 times.
That is the wrong shape to hand a search engine for a **brand** query, and it is nested as well as
top-level — the homepage's Organization is reached through `SoftwareApplication.publisher`, which
is why `audit()` walks the whole document (`_ld_nodes`) instead of just `@graph`.

**And giving them `@id`s created the next defect, which is why check 9 has a second half.** With
the same `@id` on both the `@graph` node and the nested `publisher` copy, **29 pages declared the
same entity twice** — legal JSON-LD, since identical `@id`s merge, but the shape says
copy-paste and FreeCrawl flags it as `schemaDuplicateId`. The rule now: **one full declaration
per document, every other occurrence a bare `{"@id": …}`**. The reverse failure is the one that
actually costs something, so it is checked too — a bare ref whose target is declared nowhere on
the page resolves to nothing. Both are check 9; the ref check is scoped to the two site entities
so a breadcrumb's `{"@id": "https://adgent.app/pricing"}` is not treated as a dangling node.

Re-verify the graph, and the FAQ text match, after any JSON-LD edit:

```bash
python3 - <<'PY'
import re, json, glob
IDS = ("https://adgent.app/#organization", "https://adgent.app/#website")
def nodes(v):
    if isinstance(v, list):
        for x in v: yield from nodes(x)
    elif isinstance(v, dict):
        yield v
        for x in v.values(): yield from nodes(x)
bad = dup = dangling = 0
for f in sorted(glob.glob("*.html")) + ["demo/index.html"]:
    head = open(f, encoding="utf-8").read().split("</head>")[0]
    for m in re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.S):
        try: g = json.loads(m)
        except Exception: bad += 1; continue
        full, refs = {}, set()
        for n in nodes(g):
            if n.get("@id") not in IDS: continue
            (refs.add(n["@id"]) if set(n) == {"@id"}
             else full.__setitem__(n["@id"], full.get(n["@id"], 0) + 1))
        dup += sum(1 for c in full.values() if c > 1)
        dangling += len(refs - set(full))
print("parse failures:", bad, "| duplicate declarations:", dup,
      "| dangling refs:", dangling)                     # 0 | 0 | 0
PY
```

The FAQ text match is a separate script, further up this file — run both after a JSON-LD edit;
263 pairs, 0 mismatches is the current state.

**⚠️ Correction to this section's first version — the pixel finding was wrong, and it was wrong
in our favour to overstate it.** The first pass reported *"54 of 55 descriptions render
1,146–1,528px against a ~985px cap"* straight from FreeCrawl's `metaPixelWidth`. FreeCrawl
measures **both** title and description with one **Arial 18px** table
(`packages/core/src/html-parser.ts:2202`), because 18px is the *title* font — so every
description came back ~1.29× too wide. Measured properly, with `canvas.measureText` in Chrome at
the sizes Google actually renders (**20px** titles, **14px** descriptions):

| | Cap | Before | After |
|---|---|---|---|
| titles over cap | 600px | **0 of 54** (max 568px) | 0 |
| descriptions over cap | 985px | **10 of 54** (max 1,020px) | **0** (max 984px) |

Ten descriptions, each 1–35px over — a 3-to-7-character problem, not a 54-page rewrite. All ten
were trimmed without losing a clause. **Read a third-party tool's threshold before quoting its
number**; the tool was right about the ranking and wrong about the scale.

`build.py` now measures the real thing. `serp_px()` carries Arial's advance widths in 1/1000 em —
one table, verified against Chrome's own `canvas.measureText` for all 105 characters the site
uses, at both sizes, with zero deviation over 0.6px — so titles are checked at 20px/600px and
descriptions at 14px/985px. The 160-character rule is gone; it was never the ruler Google uses.

**Also closed in the same pass:**

- **27 per-page OG cards** replaced the one shared `assets/og/site.png`. Generated, not
  hand-drawn: same chrome as the 25 hand-drawn article cards (gradient, grid, corner ticks,
  brand lockup) with the page's own line as the graphic and one word in Fraunces italic. `site.png`
  stays for `404.html` and `index-demo-lab.html`, both `noindex`. `audit()` check 10 now fails if
  two indexable pages share a card or if the file is missing.
- **`/feed.xml`** — RSS 2.0, 25 items, generated by `build.py feed()` from the pages' own
  `BlogPosting` JSON-LD and covered by `--check` like the sitemap. `feed_link()` puts the
  `rel="alternate"` in every head during render, and check 6 fails without it.
- **Four response headers** in `vercel.json` on `/(.*)`: `X-Content-Type-Options`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`. Check 11 keeps them.
  Deliberately **no CSP** — the reasoning is in `build.py` next to the check.

**Still open, and both are owner actions outside the repo:**

- **HSTS** is served by **Cloudflare**, not Vercel (`server: cloudflare`, and Vercel sets none),
  so `includeSubDomains` / `preload` is a zone setting. `www` is the only subdomain that resolves,
  so `includeSubDomains` is safe once the apex redirect ships; `preload` is effectively
  irreversible and stays an owner decision.
- **Cloudflare Email Obfuscation** hides the contact address from crawlers on the five legal
  pages — see the false positive below. Scrape Shield → Email Obfuscation.

**Three findings are false positives — do not "fix" them:**

- `imageMissingAlt` on all 55 is `assets/icon-only.svg` with `alt=""` — the brand mark, sitting
  next to the word "Adgent" in text. `alt=""` is the *correct* answer for a decorative mark; giving
  it alt text makes a screen reader say the name twice.
- `formInputUnlabeled` on 21 is implicit labelling: `<label class="lf-field"><span>Name</span>
  <input …></label>`. The label wraps the input and carries visible text. FreeCrawl only credits
  `for=`/`id`.
- `/cdn-cgi/l/email-protection` returning 404 is **Cloudflare Email Obfuscation** rewriting the
  `mailto:` on the five legal pages; the hash-less path is what a crawler sees and it legitimately
  404s. Real visitors get the decoded address from Cloudflare's JS. The cost is real but different
  from a broken link: **the contact address is invisible to crawlers and answer engines**, which is
  an E-E-A-T signal on exactly the pages that need one.

### One thing loads before consent, and it is not ours — measured 2026-09-09

With cookies and cache cleared, one navigation to `https://adgent.app/` makes **15 requests, of
which exactly one is third-party**: `static.cloudflareinsights.com/beacon.min.js`. Cloudflare Web
Analytics injects it at the edge, outside `site.js`, so **the consent gate does not cover it** —
which makes `TODO.md` §2's *"before consent, zero measurement requests"* false as written. That
check was run against Google's endpoints and is still true of them: `gtag`, the container and both
collect endpoints stay silent until the banner is answered.

The beacon is cookieless and does not fingerprint, so this is defensible — but the site sells on
the gate, so the claim has to be exact: **one cookieless edge beacon loads pre-consent; nothing
else does.** Turning it off is a Cloudflare zone toggle (Web Analytics), i.e. an owner action.

With full consent, the third-party set is small and worth knowing before anyone writes a CSP:
`clarity.ms` (script), `static.cloudflareinsights.com` (script),
`www.google-analytics.com` + `analytics.google.com` (session pings), and an ads-audience pixel from
a **country-dependent Google ccTLD** — observed `www.google.com.tr`.

### Deployed 2026-09-11 — and it exposed two things nothing local could

`b905e8a` shipped the pass above; `20722aa` fixed what shipping it revealed. Both are the same
class of bug: **correct on disk, wrong at the edge.**

**1. A cached 404 outlived the files that fixed it.** `/assets/:path*` is served
`max-age=604800`, and Cloudflare caches the *response* — 404 included. The 27 new cards were
probed on 2026-09-09 while they did not exist, so the edge held a 404 for each of them, and was
still serving it minutes after the deploy that added them:

| `https://adgent.app/assets/og/index.png` | with `?cb=<random>` |
|---|---|
| `404`, `age: 100274`, `cf-cache-status: HIT` | `200`, `image/png`, 280,643 bytes |

A social crawler would have got a blank card for up to a week, and nothing on the site would have
looked wrong. `og:image` and `twitter:image` now carry the card's own content hash (`stamp_og()`),
so a stamped URL cannot inherit a stale answer — and the next time a card's art changes, the
preview changes with it. **Never probe an asset URL on production before the deploy that creates
it**; you are teaching the edge a 404 with a week-long TTL. Check 10 requires the stamp.

**2. `/:path*` does not match the bare root.** The apex redirect shipped with one rule and half
worked: `www.adgent.app/pricing` answered `308`, `www.adgent.app/` answered **`200` with the whole
homepage** — `cf-cache-status: DYNAMIC`, so Vercel served it, not a cache. Fixed with an explicit
`"source": "/"` rule; check 8 requires both. This is the same Vercel quirk as the slashless
`/metrics` rewrite, one section up. Assume it every time, on every host-conditional rule.

**Verified on production after `20722aa`:** `www.adgent.app/`, `/pricing` and `/blog` all `308` to
the apex; every stamped card `200`; the four headers present; `/feed.xml` `200` with 25 items;
zero `href="/demo"` on the homepage; `sitemap.xml` 54 URLs, no `demo`.

## OG cards — the 25 are drawn, the 27 are generated

`assets/og/*.svg` are the **sources and they live in the mirror only** (`build.py` never reads
them; the deploy ships the `.png`). Two kinds, and they are not interchangeable:

- **The 25 article cards are hand-drawn** — each has a bespoke illustration for its argument.
  Leave them alone.
- **The 27 page cards are generated** from `assets/og/_cards.json` (mirror only): one
  `{eyebrow, title, em}` per slug, where `em` is the word set in Fraunces italic. Copy lives
  there, not in the SVG.

To add or change one, three steps — the second needs a browser because the line has to be broken
with the **real** font metrics, and Plus Jakarta Sans is not a font Python can measure:

1. Edit `assets/og/_cards.json`.
2. In headless Chrome against `serve.py`, measure and wrap: try `76 → 50px`, take the first size
   that fits **≤3 lines within 1056px**, then bump a 1-line result up to 104px and a 2-line result
   to 88px. Write the SVG with the eyebrow at `72,98`, the title lines centred on `y=345` at
   `1.14×` leading, and the brand lockup at `translate(1020,552)` — copy the chrome verbatim from
   any existing card.
3. Rasterize at **exactly 1200×630**: `page.setViewport({width:1200,height:630,deviceScaleFactor:1})`
   then `page.screenshot({path, type:'png', clip:{x:0,y:0,width:1200,height:630}})`.

⚠️ **Do not rasterize with the browser tool's `tab.screenshot()`.** It returns a **WebP**
downscaled to 1024×538 for display. Written to a `.png` filename that is a file whose bytes say
`RIFF…WEBP` while `og:image:width` claims 1200 — it happened on the first attempt here. Check the
magic bytes and the IHDR before believing a card: `head -c8 x.png | xxd` must start `89504e47`.

## Rules

1. **Never hand-edit the nav or footer in a single page.** Edit `_partials/`, then run the script.
2. **Never hand-edit `sitemap.xml`.** It is generated.
3. **Both repos, every time.**
4. `class="active"` is per-page and the script keeps it — do not strip it.
5. New page → create it, run the script, copy to the mirror.

## Search Console

Verification is by **DNS TXT record** (`google-site-verification=2PYObJ...` on `adgent.app`), so
nothing in the HTML affects it — a broken header cannot un-verify the property.

What *did* affect indexing: **24 pages were missing from the sitemap**, and the sitemap listed 21
`noindex` pages, telling Google to crawl pages it was simultaneously told not to index. Both are
fixed — the sitemap is generated and skips `noindex` pages.

**robots.txt — decided and applied 2026-09-03.** `LLM-Content:` and `LLM-Full-Content:` are not
robots.txt directives (RFC 9309). GSC flagged them as two errors on 2026-08-04 and Lighthouse
scored the homepage SEO **92/100** for the same single reason. They are now **comments**: both
errors clear, the pointer stays readable, nothing is lost — `llms.txt` works by root-path
convention and never needed a robots.txt pointer. Verified against `serve.py` locally, Lighthouse
`robots-txt` audit: **valid, 0 errors**. Do not re-add them as live lines. *(Separately: no AI
system is known to consume `llms.txt` at all — `research-output/geo-measurement-stack-r11.md:193`.
The files cost nothing to generate; do not treat them as a GEO lever.)*

### Searching "adgent" returned `/about`, and clicking it landed near the page bottom

Reported by the owner 2026-09-09. Two separate things, and only one of them is ours.

**The landing position is Google's, not a site defect.** Google appends a scroll-to-text
fragment (`#:~:text=…`) to a result when passage ranking picks a specific passage, and the
browser then scrolls there on load. Nothing on the site scrolls: the only scroll handler in
`site.js` is `nav.classList.toggle('scrolled', window.scrollY > 8)` at `site.js:407`, there is no
`autofocus` anywhere, and `about.html` carries five `id`s — `main`, `lead`, `leadCard`,
`leadForm`, `leadNote` — none of them linked from a SERP-visible URL. The fix for a text fragment
is not a redirect; it is giving the query a better answer near the top of the right page.

**`/about` outranking `/` for the brand name is ours, and it has three named causes:**

1. **Two hosts served the site.** `www.adgent.app` answered 200 with identical bytes. Fixed above.
2. **The brand entity was 55 anonymous `Organization` nodes.** Fixed above with a shared `@id`.
   Note that `/about` was the more *specific* entity page — `AboutPage` + `Organization` — while
   the homepage led with `SoftwareApplication`. With one merged entity, that asymmetry stops
   mattering.
3. **Coverage.** 46 of 52 pages were "URL is unknown to Google" on 2026-09-03 and the sitemap
   Google held was 39 days stale (`TODO.md` §3). On a domain with almost no authority, a brand
   query returns whichever page Google has actually crawled and understood. Measuring this needs
   Search Console — see *The GSC server* below; it is built, and it wants one key.

⚠️ **1 and 2 shipped 2026-09-11.** Neither changes a SERP until Google recrawls, which is weeks
for a low-authority domain. Do not re-diagnose this next week and conclude the fixes did not work.

### Measured on an index we can actually read — 2026-09-12

GSC stayed blocked, so the diagnosis above was reasoning. DuckDuckGo (Bing's index) is reachable
and it corroborates the report, plus two things the reasoning missed.

`site:adgent.app` returns **10 pages** — `/about`, `/built-from-chat`, `/ecommerce`, `/features`,
`/for-agencies`, `/for-in-house`, `/mobile-apps`, `/tools`, `/travel-hospitality`, `/why-adgent`.
**The homepage is not among them.** A different index, the same shape: `/about` is the strongest
page and `/` is not competitive. That is corroboration, not proof about Google — but it kills the
idea that the owner mis-read one SERP.

A bare **"adgent"** query, top ten:

| # | Result | |
|---|---|---|
| 1–4 | `adgent.ai`, `app.adgent.ai`, `preview.adgent.com`, `adg-ent.com` | four other companies |
| **5** | **`adgent.app/about`** | our best-ranked page |
| 6 | `adgent.org` — "Premium Smart TV Ad Network" | a fifth |
| 7 | `adgent.app/ecommerce` | |
| **8** | **`adgent-website.vercel.app`** — *"Adgent — The senior analyst you can talk to"* | **ours, and it should not be there** |
| 9–10 | `linkedin.com/company/adgent-ltd`, `adgentapp.com` | a sixth and a seventh |

**Two findings, and the second is a defect I had missed.**

**4. The brand name is contested.** Seven other entities rank for "adgent" — `.ai`, `.com`,
`.org`, `adg-ent.com`, `adgentapp.com`, a different *Adgent Ltd* on LinkedIn. So this was never
purely a coverage problem: the homepage is competing in a crowded namespace against older
domains, which is an argument for the entity `@id` work and against expecting a quick win.

**5. `adgent-website.vercel.app` was serving the whole site at 200 and is indexed.** Vercel sends
`X-Robots-Tag: noindex` on *preview* deployments and **not** on the production `*.vercel.app`
alias, so the alias is a crawlable duplicate of production by default — `robots.txt` there allows
everything, and the canonical to the apex is only a hint. The indexed title is *stale* ("The
senior analyst you can talk to"), so it has been crawlable for a while. Same defect class as
`www`, same fix: a host-conditional 308, both rules, now in check 8. The project-scoped aliases
(`adgent-website-*-nurettin-demirals-projects.vercel.app`) are SSO-gated and need no rule;
`adgent.vercel.app` belongs to somebody else entirely.

### The GSC server — built 2026-09-12, and why it does not use `gcloud`

`TODO.md` §3 has blocked on the same sentence three times: *"an owner-interactive
`gcloud auth login` is the unblock."* It keeps recurring because it is not a bug — a Google
Workspace reauth policy is a human-presence requirement, and both credentialed accounts prove it:

| Credential | Result |
|---|---|
| `gcloud auth print-access-token` (`osman@adgent.app`) | `Reauthentication failed. cannot prompt during non-interactive execution` |
| same, `--account=nurettin@vespersocial.com` | identical |
| the ADC refresh token, exchanged directly | `invalid_grant`, `error_subtype: invalid_rapt` |
| `~/.config/adgent/seo-reader.json` | **0 bytes** — created 2026-09-03 as a placeholder, never filled |

Anything built on a user credential re-breaks on the reauth schedule. So `.omp/tools/gsc-mcp.py`
prefers a **service-account key**, which has no reauth policy and no expiry, and falls back to
gcloud impersonation only when no key is present. Six tools: `gsc_sites`, `gsc_inspect`,
`gsc_coverage_sweep` (the §3 question — inspect every sitemap URL, return the verdict histogram),
`gsc_query`, `gsc_sitemaps`, `gsc_sitemap_submit`. Registered in `adgent/.omp/mcp.json` as `gsc`;
`python3 .omp/tools/gsc-mcp.py --selftest` reports the credential state without an MCP client.

**Two owner steps, once, and then it works from a cold shell forever:**

1. Cloud Console → IAM & Admin → Service Accounts → `adgent-seo-reader@adgent-503512…` → Keys →
   Add key → JSON. Save it as `~/.config/adgent/seo-reader.json`, `chmod 600`. The path already
   exists, empty.
2. Search Console → Settings → Users and permissions → Add user →
   `adgent-seo-reader@adgent-503512.iam.gserviceaccount.com`. **Restricted is enough** for
   everything except `gsc_sitemap_submit`, which needs Full.

Then `gsc_sites` is the one call that proves both steps landed.

**What is already proven, so a failure after those steps is not this file's fault:**

| Link | Evidence |
|---|---|
| RS256 signing (`openssl` CLI, no pip dependency) | a signature over a throwaway 2048-bit key verifies: `openssl dgst -verify` → `Verified OK` |
| JWT assembly + the live JWT-bearer grant | Google answered `invalid_grant: Invalid grant: account not found` — it **parsed** the assertion and rejected only the nonexistent account |
| MCP transport | `initialize` → `serverInfo {name: gsc}`, `tools/list` → 6, unknown tool → `-32601`, tool error → `isError: true` with the fix in the text |
| the sitemap fetch the sweep depends on | 200, 8,251 bytes, 54 `<loc>` entries |

⚠️ **Two traps this cost, both worth keeping.** The python.org 3.14 framework build ships
`ssl.create_default_context()` with **zero** trust anchors — `cert_store_stats()` returned
`{'x509_ca': 0}`, so every `urllib` HTTPS call died with `CERTIFICATE_VERIFY_FAILED` while `curl`
beside it worked, because curl carries its own bundle. That reads exactly like a rejected
credential. `_tls()` loads a real bundle (119 anchors) and never disables verification. And
Cloudflare **403s** `Python-urllib/3.14`, so the sitemap fetch sends a browser-shaped UA.

## The Turkish locale was removed — 2026-08-01

The site is **English-only**. The `/tr/` tree (28 pages), the `.tr.html` partials and the language
switcher are gone; `build.py` is single-locale and no page emits `hreflang` any more.

**7 URLs were indexed when this happened** — `/tr/`, `/tr/pricing`, `/tr/about`, `/tr/privacy`,
`/tr/terms`, `/tr/security`, `/tr/data-use` — and they now **404 by decision**, with no redirects.
Expect them in Search Console's "Not found (404)" report until Google drops them; that is the
expected outcome, not a regression. If they should instead point at the English pages, add
`redirects` to `vercel.json` — every one of the seven has an English twin at the same slug.

`build.py audit()` now fails the build if any page reintroduces an `hreflang` alternate or links
to `/tr/`.
