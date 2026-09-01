# Backlog — deferred on purpose

Everything here was found during the 2026-09-02 UI + SEO/GEO pass, measured, and
**left undone deliberately**. Each item says why it was deferred and what "done"
looks like, so picking it up does not start with re-diagnosing it.

Anything already fixed is in the git log, not here.

---

## 1. Ship minified CSS/JS

**Measured:** `site.css` 282 KB, `site.js` 50 KB, both served raw. Brotli on
Vercel takes the transfer cost down to roughly 35 KB, so the remaining cost is
parse + style recalculation on mid-range phones, not bandwidth.

**Why deferred:** a naive minifier on 5,500 lines of CSS that leans on
`color-mix()`, `clamp()`, `oklab()` and layered `!important` overrides will
break something quietly, and the current build has no visual regression test to
catch it.

**Done looks like:** `build.py` emits `site.min.css` / `site.min.js`, pages link
the minified files, `--check` fails when the minified output is older than the
source, and the six-state ui-loop screenshots match the unminified build.

**Cheaper first step:** the CSS has visible dead weight — duplicate `.faq`
blocks (lines ~1208 and ~2152), duplicate `.creative-card` background rules,
and several rules that lost their cascade fight. Deleting those is safe in a way
that a minifier is not.

---

## 2. `dateModified` never moves

**Measured:** all 25 `BlogPosting` blocks have `dateModified == datePublished`.
Oldest 2026-02-26, newest 2026-07-25.

**Why deferred:** bumping the date without touching the content is a spam
signal, not a freshness signal. This one needs an editorial pass, not a script.

**Done looks like:** when a post is actually revised, `dateModified` moves and
the change is visible in the copy. Optionally `build.py` warns when a post's
body hash changed but `dateModified` did not — the same trick `.lastmod.json`
now uses for the sitemap.

---

## 3. Thin internal linking into some blog posts

**Measured inbound internal links:**

| Page | Inbound |
|---|---|
| `/ai-media-buyer-for-agencies` | 1 |
| `/can-ai-audit-your-ad-accounts` | 1 |
| `/google-ads-account-structure-2026` | 1 |
| `/meta-vs-google-ads-which-first` | 2 |
| `/how-much-ad-spend-is-wasted` | 2 |
| `/how-to-choose-an-ai-media-buying-tool` | 2 |

Everything else on the site is reachable from at least three places; only
`/blog-post` has zero, and that is the `noindex` redirect stub, correctly so.

**Why deferred:** which post should link to which is an editorial judgement, and
a "related posts" block bolted onto every article is the lazy version that
usually reads as filler.

**Done looks like:** each of the six gets two or three contextual links from
posts that genuinely lead into it, placed in the prose rather than in a footer
widget.

---

## 4. No `BreadcrumbList` on product and solution pages

**Measured:** blog posts and legal pages carry `BreadcrumbList`; the 22
`SoftwareApplication` pages (features, the seven capability pages, the industry
pages) do not.

**Why deferred:** the site is one level deep, so the breadcrumb is
`Home > Page` — real but marginal. It matters mostly for SERP breadcrumb display
and for answer engines resolving where a page sits in the site.

**Done looks like:** the same `@graph` addition the blog pages already use,
applied to the product/solution set. Mechanical, roughly one script.

---

## Not doing, and why

- **`twitter:site`** — there is no X account in `Organization.sameAs` (LinkedIn
  and Instagram only). The tag without an account is noise.
- **Merging `#ground-truth` into `#trust-gate`** on the homepage — proposed
  during the density pass, rejected: it is a narrative rewrite with a costly
  undo, and the length target was met without it.
- **Currency consistency** — the homepage mixes `$22.10`, `€500/day` and
  `₺400K` across demo figures. Left alone at the owner's request.
