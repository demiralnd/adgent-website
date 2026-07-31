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

## sync-chrome.py — the fix for the duplication

```bash
python3 sync-chrome.py --check   # report drift, change nothing
python3 sync-chrome.py           # rewrite every page from index.html, regenerate sitemap.xml
```

`index.html` and `tr/index.html` are the **source of truth** for the shared blocks. The script
copies their nav, mobile menu and footer into every other page, and preserves each page's own
`class="active"` on the current nav item — that part *should* differ.

It also **generates `sitemap.xml` from the files on disk**, so a new page can never be left out.
`blog-post.html` is skipped: it is a deliberate `noindex` redirect stub.

**Run it after** touching the nav, the footer, the brand line, or adding/removing a page. Then
copy the whole site to the mirror.

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

## If the site ever gets a build step

The right long-term fix is a template engine or a static-site generator, which removes the
duplication instead of policing it. Until then this script is the guard rail — it is not a
substitute for one.
