#!/usr/bin/env python3
"""
build.py — the site's build step.

Static HTML, no framework. Without this, every page carries its own copy of the header,
mobile menu and footer, and the copies drift: on 2026-08-01 the footer brand line existed in 18
variants and 59 of 63 pages had dead social links.

One source of truth per block, in _partials/:
    header.en.html  mobile.en.html  footer.en.html

Pages carry markers instead of copies:
    <!--#header-->  (regenerated)  <!--/#header-->

    python3 build.py --check   # fail if any page is stale — run before deploy
    python3 build.py           # regenerate every page + sitemap.xml

class="active" is re-applied per page from its filename. Never hand-edit it, and never
hand-edit the nav or footer inside a page — edit _partials/ and rebuild.

The site is English-only. The Turkish locale was removed on 2026-08-01; audit() still
guards against a stray hreflang reappearing.
"""
import re, sys, os, glob, io, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS = os.path.join(ROOT, "_partials")
SKIP = {"blog-post"}
NAV_SLUGS = {"", "for-agencies", "for-in-house", "pricing", "about", "blog"}
BLOCKS = ["header", "mobile", "footer"]
LEGACY = {"header": r"<header.*?</header>",
          "mobile": r'<div class="mobile-menu">.*?</div>\s*(?=<!--|\s*<section|\s*<article|\s*<main)',
          "footer": r'<footer class="footer">.*?</footer>'}

read  = lambda p: io.open(p, encoding="utf-8").read()
write = lambda p, s: io.open(p, "w", encoding="utf-8").write(s)
partial = lambda b: read(os.path.join(PARTIALS, f"{b}.en.html")).rstrip()


def with_active(html, slug):
    if slug in SKIP or (slug != "index" and slug not in NAV_SLUGS):
        return html
    href = "/" if slug == "index" else f"/{slug}"
    return re.sub(r'(<a href="%s")(?![^>]*class=)' % re.escape(href),
                  r'\1 class="active"', html, count=1)


def render(html, slug):
    for block in BLOCKS:
        body = with_active(partial(block), slug)
        repl = f"<!--#{block}-->{body}<!--/#{block}-->"
        marked = re.compile(r"<!--#%s-->.*?<!--/#%s-->" % (block, block), re.S)
        if marked.search(html):
            html = marked.sub(lambda _: repl, html, count=1)
        else:
            m = re.search(LEGACY[block], html, re.S)
            if m:
                html = html[:m.start()] + repl + html[m.end():]
    return html


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        yield p, os.path.basename(p)[:-5]


_PRIO = {"": "1.0", "pricing": "0.8", "blog": "0.8", "for-agencies": "0.8",
         "for-in-house": "0.8", "about": "0.6", "security": "0.4",
         "data-use": "0.4", "privacy": "0.3", "terms": "0.3"}
_freq = lambda s: "weekly" if s in ("", "blog") else \
                  ("yearly" if s in ("privacy", "terms", "security", "data-use") else "monthly")


def _noindex(path):
    """A page that tells robots not to index it must not be in the sitemap."""
    return "noindex" in read(path).lower()


def sitemap(check_only=False):
    base, today = "https://adgent.app", datetime.date.today().isoformat()
    slugs = [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))
             if not _noindex(p)]
    slugs = [s for s in slugs if s not in SKIP]
    rows = []
    for slug in ["index"] + [s for s in slugs if s != "index"]:
        path = "" if slug == "index" else slug
        loc = f"{base}/{path}"
        rows.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod><changefreq>{_freq(path)}"
                    f"</changefreq><priority>{_PRIO.get(path,'0.7')}</priority></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    p = os.path.join(ROOT, "sitemap.xml")
    if check_only:
        cur = read(p) if os.path.exists(p) else ""
        if cur.count("<url>") != len(rows):
            print("SITEMAP STALE — %d urls on disk, %d pages" % (cur.count("<url>"), len(rows)))
            return 1
        return 0
    write(p, xml)
    print("sitemap: %d urls" % len(rows))
    return 0


def audit():
    """Head-level invariants the partials can't enforce.

    render() owns the header/mobile/footer; <head> is per-page and therefore
    drifts. These all shipped to production at least once.
    """
    problems = []
    for path, slug in pages():
        if slug in SKIP:
            continue
        rel, html = os.path.relpath(path, ROOT), read(path)
        head = html.split("</head>", 1)[0]

        # 1. single-locale site: nothing should advertise a translation
        if re.search(r'<link rel="alternate"[^>]*hreflang=', head):
            problems.append(f"{rel}: hreflang alternate on a single-locale site")
        if "/tr/" in html:
            problems.append(f"{rel}: links to /tr/, which no longer exists")

        # 2. the page's language must be English
        m = re.search(r'<html lang="([a-z-]+)"', html)
        if m and m.group(1) != "en":
            problems.append(f'{rel}: <html lang="{m.group(1)}"> on an English page')

        # 3. canonical must be self-referencing, not another page
        want = "https://adgent.app/" if slug == "index" else f"https://adgent.app/{slug}"
        m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
        if m and m.group(1) != want:
            problems.append(f"{rel}: canonical -> {m.group(1)}, expected {want}")

        # 4. a find-and-replace once ate the parens off these calls, which is a
        #    syntax error — the whole inline block throws and analytics records
        #    nothing. It shipped twice: 21 TR pages, then the EN homepage.
        for broken in ("function gtag{", "new Date.getTime", "new Date)", "new Date;"):
            if broken in html:
                problems.append(f"{rel}: broken analytics JS — {broken!r}")
    return problems


def main():
    check = "--check" in sys.argv
    stale, wrote = [], 0
    for path, slug in pages():
        src = read(path)
        out = render(src, slug)
        if out != src:
            stale.append(os.path.relpath(path, ROOT))
            if not check:
                write(path, out); wrote += 1
    rc = 0
    if check:
        if stale:
            print("STALE — %d page(s) differ from _partials/:" % len(stale))
            for f in stale[:20]:
                print("   ", f)
            rc = 1
        else:
            print("OK — every page matches _partials/.")
        rc |= sitemap(check_only=True)
    else:
        print("built %d page(s)" % wrote)
        sitemap()
    bad = audit()
    if bad:
        print("HEAD PROBLEMS — %d:" % len(bad))
        for b in bad[:20]:
            print("   ", b)
        rc = 1
    elif check and rc == 0:
        print("OK — sitemap current.")
        print("OK — heads consistent (lang, canonical, no stray hreflang).")
    return rc


if __name__ == "__main__":
    sys.exit(main())
