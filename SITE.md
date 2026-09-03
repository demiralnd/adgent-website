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
| `llms.txt` | the pages, preserving the hand-written preamble at the top |
| `llms-full.txt` | the pages |

The two `llms*.txt` files are the AI-crawler surface and are covered by `--check` like everything
else, so a new page that never gets a build run is missing from them silently.

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

⚠️ **This was false until 2026-09-03 and is now true.** `EXTRA_SLUGS` (subdirectory pages —
today just `demo`) was appended to the sitemap **unconditionally**, after and outside the
`_noindex` filter, so the guarantee never covered it. Caught by a full-site Lighthouse sweep:
deployed `/demo` served `<meta name="robots" content="noindex, nofollow">` while sitting in
`sitemap.xml` at priority 0.9 — the exact contradiction this paragraph claimed was impossible.
Same code path had a second defect: `_lastmods()` globbed only root `*.html`, so every
subdirectory page fell through to `dates.get(slug, today)` and was stamped **today on every
build** — the permanent-freshness signal that function exists to prevent. Both fixed in
`build.py`; `demo` now carries a real content hash in `.lastmod.json`.

**Run it after** editing `_partials/`, or adding/removing a page. Then copy to the mirror.

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
every description ≤160ch; **all 52 production URLs return HTTP 200**; no page carries an
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
