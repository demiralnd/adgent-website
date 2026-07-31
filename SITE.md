# The website — how it's built and how to not break it

> **Read this before editing any page.** The site is 64 plain static HTML files with no build
> step, no framework and no template engine. That means **every page carries its own copy of the
> header, nav, mobile menu and footer** — and copies drift unless something forces them not to.

## The two repos

| Repo | Role |
|---|---|
| `adgent-website` | **Live.** Deployed on Vercel |
| `adgent/website` | Mirror inside the docs repo |

**Feed both on every change.** They are not linked; nothing syncs them automatically.

## build.py — the build step

```bash
python3 build.py --check   # fail if any page is stale — run before deploy
python3 build.py           # regenerate every page + sitemap.xml
```

**`_partials/` is the source of truth**, not any page:

```
_partials/header.en.html   _partials/header.tr.html
_partials/mobile.en.html   _partials/mobile.tr.html
_partials/footer.en.html   _partials/footer.tr.html
```

Pages carry markers instead of copies, so the block is regenerated rather than hand-maintained:

```html
<!--#header-->  ...regenerated, do not edit...  <!--/#header-->
```

`class="active"` on the current nav item is re-applied per page from its filename. Never hand-edit
it. `sitemap.xml` is generated from the files on disk and **excludes any page carrying `noindex`**,
so it can never contradict the robots meta tag.

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

## What is genuinely fine

Checked in the same pass, no action needed: **zero broken internal links**; every page has a
title, meta description, canonical, og:image, `lang`, viewport, hreflang and exactly one `<h1>`;
all images have `alt`. The only page failing those checks is `blog-post.html`, which is a
redirect stub and correctly `noindex`.

## Rules

1. **Never hand-edit the nav or footer in a single page.** Edit `index.html` (or `tr/index.html`),
   then run the script.
2. **Never hand-edit `sitemap.xml`.** It is generated.
3. **Both repos, every time.**
4. `class="active"` is per-page and the script keeps it — do not strip it.
5. New page → create it, run the script, copy to the mirror.

## Search Console

Verification is by **DNS TXT record** (`google-site-verification=2PYObJ...` on `adgent.app`), so
nothing in the HTML affects it — a broken header cannot un-verify the property.

What *did* affect indexing: **24 pages were missing from the sitemap**, and the sitemap listed 21
`noindex` TR pages, telling Google to crawl pages it was simultaneously told not to index. Both
are fixed — the sitemap is generated and skips `noindex` pages. It went 39 → 63 → **42 urls**, the
last drop being the `noindex` exclusion.

**TR indexing is deliberate:** `tr/index`, `about`, `pricing`, `privacy`, `terms`, `security` and
`data-use` are indexed; the translated blog/SEO articles carry `noindex, nofollow`. If that should
change, remove the meta tag and rebuild — the sitemap follows automatically.
