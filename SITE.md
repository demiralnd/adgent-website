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
