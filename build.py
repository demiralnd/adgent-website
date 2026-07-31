#!/usr/bin/env python3
"""
build.py — the site's build step.

64 static HTML pages, no framework. Without this, every page carries its own copy of the header,
mobile menu and footer, and the copies drift: on 2026-08-01 the footer brand line existed in 18
variants and 59 of 63 pages had dead social links.

One source of truth per block, in _partials/:
    header.en.html  header.tr.html
    mobile.en.html  mobile.tr.html
    footer.en.html  footer.tr.html

Pages carry markers instead of copies:
    <!--#header-->  (regenerated)  <!--/#header-->

    python3 build.py --check   # fail if any page is stale — run before deploy
    python3 build.py           # regenerate every page + sitemap.xml

class="active" is re-applied per page from its filename. Never hand-edit it, and never
hand-edit the nav or footer inside a page — edit _partials/ and rebuild.
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
partial = lambda b, l: read(os.path.join(PARTIALS, f"{b}.{l}.html")).rstrip()


def with_active(html, slug, lang):
    if slug in SKIP or (slug != "index" and slug not in NAV_SLUGS):
        return html
    href = ("/tr/" if lang == "tr" else "/") if slug == "index" else \
           (f"/tr/{slug}" if lang == "tr" else f"/{slug}")
    return re.sub(r'(<a href="%s")(?![^>]*class=)' % re.escape(href),
                  r'\1 class="active"', html, count=1)


def render(html, slug, lang):
    for block in BLOCKS:
        body = with_active(partial(block, lang), slug, lang)
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
        yield p, os.path.basename(p)[:-5], "en"
    for p in sorted(glob.glob(os.path.join(ROOT, "tr", "*.html"))):
        yield p, os.path.basename(p)[:-5], "tr"


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
    en = [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))
          if not _noindex(p)]
    en = [s for s in en if s not in SKIP]
    tr = {os.path.basename(p)[:-5] for p in glob.glob(os.path.join(ROOT, "tr", "*.html"))
          if not _noindex(p)}
    rows = []
    for slug in ["index"] + [s for s in en if s != "index"]:
        path = "" if slug == "index" else slug
        loc = f"{base}/{path}"
        alt = [f'<xhtml:link rel="alternate" hreflang="en" href="{loc}"/>']
        if slug in tr:
            alt.append('<xhtml:link rel="alternate" hreflang="tr" href="%s"/>' %
                       (f"{base}/tr/" if slug == "index" else f"{base}/tr/{slug}"))
        alt.append(f'<xhtml:link rel="alternate" hreflang="x-default" href="{loc}"/>')
        rows.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod><changefreq>{_freq(path)}"
                    f"</changefreq><priority>{_PRIO.get(path,'0.7')}</priority>" + "".join(alt) + "</url>")
    for slug in sorted(tr):
        loc = f"{base}/tr/" if slug == "index" else f"{base}/tr/{slug}"
        en_loc = f"{base}/" if slug == "index" else f"{base}/{slug}"
        alt = [f'<xhtml:link rel="alternate" hreflang="tr" href="{loc}"/>']
        if slug in en:
            alt += [f'<xhtml:link rel="alternate" hreflang="en" href="{en_loc}"/>',
                    f'<xhtml:link rel="alternate" hreflang="x-default" href="{en_loc}"/>']
        rows.append(f"  <url><loc>{loc}</loc><lastmod>{today}</lastmod><changefreq>{_freq(slug)}"
                    f"</changefreq><priority>{_PRIO.get(slug,'0.7')}</priority>" + "".join(alt) + "</url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
           'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(rows) + "\n</urlset>\n")
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


def main():
    check = "--check" in sys.argv
    stale, wrote = [], 0
    for path, slug, lang in pages():
        src = read(path)
        out = render(src, slug, lang)
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
        if rc == 0:
            print("OK — sitemap current.")
    else:
        print("built %d page(s)" % wrote)
        sitemap()
    return rc


if __name__ == "__main__":
    sys.exit(main())
