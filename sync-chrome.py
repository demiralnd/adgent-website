#!/usr/bin/env python3
"""
sync-chrome.py — keep the shared header/footer identical across every page.

The site is plain static HTML with no build step and no template engine, so
every one of the ~64 pages carries its own copy of the nav and footer. That
drifts: on 2026-08-01 the footer's one-line brand description existed in
EIGHTEEN different variants, and nobody had decided any of them.

This script makes index.html (and tr/index.html) the single source of truth
and rewrites the shared blocks everywhere else. Per-page `class="active"` on
the current nav item is preserved — that part SHOULD differ.

    python3 sync-chrome.py --check    # report drift, change nothing (use in CI)
    python3 sync-chrome.py            # rewrite every page from index.html

Run it after touching the nav, the footer, or the brand line. Then copy the
whole site to the mirror repo — both repos ship.
"""
import re, sys, glob, os, io

ROOT = os.path.dirname(os.path.abspath(__file__))
BLOCKS = [
    ("nav",    r'<nav class="nav-links">.*?</nav>'),
    ("mobile", r'<div class="mobile-menu">.*?</div>\s*(?=<!--|\s*<section|\s*<article|\s*<main)'),
    ("footer", r'<footer class="footer">.*?</footer>'),
]

def read(p):  return io.open(p, encoding="utf-8").read()
def write(p, s): io.open(p, "w", encoding="utf-8").write(s)

def extract(src, pat):
    m = re.search(pat, src, re.S)
    return m.group(0) if m else None

def strip_active(block):
    """Remove per-page active state so blocks compare equal across pages."""
    return re.sub(r'\s*class="active"', '', block)

def restore_active(new_block, old_block):
    """Carry this page's own active link into the canonical block."""
    m = re.search(r'<a href="([^"]+)"[^>]*class="active"', old_block or "")
    if not m:
        return new_block
    href = m.group(1)
    return re.sub(r'(<a href="%s")' % re.escape(href), r'\1 class="active"', new_block, count=1)

def sync(check_only=False):
    changed, drifted = 0, []
    for scope, source in (("", "index.html"), ("tr", os.path.join("tr", "index.html"))):
        src_path = os.path.join(ROOT, source)
        if not os.path.exists(src_path):
            continue
        src = read(src_path)
        canon = {name: extract(src, pat) for name, pat in BLOCKS}
        pages = glob.glob(os.path.join(ROOT, scope, "*.html")) if scope else \
                [p for p in glob.glob(os.path.join(ROOT, "*.html"))]
        for page in sorted(pages):
            if os.path.abspath(page) == os.path.abspath(src_path):
                continue
            s = orig = read(page)
            for name, pat in BLOCKS:
                if not canon[name]:
                    continue
                cur = extract(s, pat)
                if cur is None:
                    continue
                if strip_active(cur) == strip_active(canon[name]):
                    continue
                drifted.append((os.path.relpath(page, ROOT), name))
                s = s.replace(cur, restore_active(canon[name], cur), 1)
            if s != orig:
                changed += 1
                if not check_only:
                    write(page, s)
    if check_only:
        if drifted:
            print("DRIFT — %d block(s) differ from index.html:" % len(drifted))
            for f, b in drifted:
                print("  %-52s %s" % (f, b))
            return 1
        print("OK — header/footer identical across all pages.")
        return 0
    print("synced %d page(s)" % changed)
    return 0



# ── sitemap ──────────────────────────────────────────────────────────────────
# Generated from the files on disk, so a new page can never be forgotten.
# EN pages get an hreflang alternate when the matching tr/ page exists.

SKIP = {"blog-post"}  # deliberate redirect stub, noindex

def _priority(slug):
    if slug in ("", "tr"):                       return "1.0"
    if slug in ("pricing", "blog", "for-agencies", "for-in-house"): return "0.8"
    if slug in ("about",):                        return "0.6"
    if slug in ("security", "data-use"):          return "0.4"
    if slug in ("privacy", "terms"):              return "0.3"
    return "0.7"

def _freq(slug):
    if slug in ("", "tr", "blog"):                return "weekly"
    if slug in ("privacy", "terms", "security", "data-use"): return "yearly"
    return "monthly"

def build_sitemap(check_only=False):
    import datetime
    base = "https://adgent.app"
    en = sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ROOT, "*.html")))
    tr = {os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ROOT, "tr", "*.html"))}
    en = [s for s in en if s not in SKIP]
    today = datetime.date.today().isoformat()

    rows = []
    for slug in ["index"] + [s for s in en if s != "index"]:
        path = "" if slug == "index" else slug
        loc = f"{base}/{path}"
        alts = [f'<xhtml:link rel="alternate" hreflang="en" href="{loc}"/>']
        if slug in tr:
            tr_loc = f"{base}/tr/" if slug == "index" else f"{base}/tr/{slug}"
            alts.append(f'<xhtml:link rel="alternate" hreflang="tr" href="{tr_loc}"/>')
        alts.append(f'<xhtml:link rel="alternate" hreflang="x-default" href="{loc}"/>')
        rows.append(f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod>'
                    f'<changefreq>{_freq(path)}</changefreq><priority>{_priority(path)}</priority>'
                    + "".join(alts) + "</url>")
    for slug in sorted(tr):
        loc = f"{base}/tr/" if slug == "index" else f"{base}/tr/{slug}"
        en_loc = f"{base}/" if slug == "index" else f"{base}/{slug}"
        alts = [f'<xhtml:link rel="alternate" hreflang="tr" href="{loc}"/>']
        if slug in en:
            alts.append(f'<xhtml:link rel="alternate" hreflang="en" href="{en_loc}"/>')
            alts.append(f'<xhtml:link rel="alternate" hreflang="x-default" href="{en_loc}"/>')
        rows.append(f'  <url><loc>{loc}</loc><lastmod>{today}</lastmod>'
                    f'<changefreq>{_freq(slug)}</changefreq><priority>{_priority(slug)}</priority>'
                    + "".join(alts) + "</url>")

    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
           + "\n".join(rows) + "\n</urlset>\n")

    p = os.path.join(ROOT, "sitemap.xml")
    old = read(p) if os.path.exists(p) else ""
    n_old = old.count("<url>")
    if check_only:
        if n_old != len(rows):
            print("SITEMAP DRIFT — %d urls on disk, %d pages exist" % (n_old, len(rows)))
            return 1
        print("OK — sitemap covers all %d pages." % len(rows))
        return 0
    write(p, xml)
    print("sitemap: %d urls (was %d)" % (len(rows), n_old))
    return 0

if __name__ == "__main__":
    check = "--check" in sys.argv
    rc = sync(check_only=check)
    rc |= build_sitemap(check_only=check)
    sys.exit(rc)
