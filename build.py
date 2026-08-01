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


def with_lang_switch(html, slug, lang):
    """Point EN<->TR at the same page, not always at the homepage.

    The switch lives in the shared header/mobile partials, so it used to be a
    hardcoded "/" and "/tr/": on /pricing, clicking TR dropped you on the
    Turkish homepage. Here we know the slug, so we can aim at the twin — but
    only when the twin actually exists on disk, otherwise the homepage is
    still the honest fallback.
    """
    en = "/" if slug == "index" else f"/{slug}"
    tr = "/tr/" if slug == "index" else f"/tr/{slug}"
    if not os.path.exists(os.path.join(ROOT, "index.html" if slug == "index" else f"{slug}.html")):
        en = "/"
    if not os.path.exists(os.path.join(ROOT, "tr", f"{slug}.html")):
        tr = "/tr/"
    on_en, on_tr = (' class="on"', "") if lang == "en" else ("", ' class="on"')
    hre_en = "" if lang == "en" else ' hreflang="en"'
    hre_tr = ' hreflang="tr"' if lang == "en" else ""
    return re.sub(
        r'<div class="lang-switch">.*?</div>',
        '<div class="lang-switch"><a href="%s"%s%s>EN</a><span class="sep"></span>'
        '<a href="%s"%s%s>TR</a></div>' % (en, on_en, hre_en, tr, on_tr, hre_tr),
        html, flags=re.S)


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
        body = with_lang_switch(body, slug, lang)
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


def audit():
    """Head-level invariants the partials can't enforce.

    render() owns the header/mobile/footer; <head> is per-page and therefore
    drifts. These three all shipped to production at least once.
    """
    problems = []
    for path, slug, lang in pages():
        if slug in SKIP:
            continue
        rel, html = os.path.relpath(path, ROOT), read(path)
        twin = os.path.join(ROOT, "tr", f"{slug}.html") if lang == "en" else \
               os.path.join(ROOT, f"{slug}.html")
        # only <head> counts — the nav's lang-switch <a hreflang="tr"> is a link
        # hint, not a declaration that a translation exists
        head = html.split("</head>", 1)[0]

        # 1. an English-only page must not claim a Turkish translation
        if lang == "en" and not os.path.exists(twin) and \
                re.search(r'<link rel="alternate"[^>]*hreflang="tr"', head):
            problems.append(f"{rel}: claims hreflang=tr but tr/{slug}.html does not exist")

        # 2. the page's own language must match its <html lang>
        m = re.search(r'<html lang="([a-z-]+)"', html)
        if m and m.group(1) != lang:
            problems.append(f'{rel}: <html lang="{m.group(1)}"> on a {lang} page')

        # 3. canonical must be self-referencing, not another page
        want = ("https://adgent.app/" if lang == "en" else "https://adgent.app/tr/") if slug == "index" \
               else (f"https://adgent.app/{slug}" if lang == "en" else f"https://adgent.app/tr/{slug}")
        m = re.search(r'<link rel="canonical" href="([^"]+)"', html)
        if m and m.group(1) != want:
            problems.append(f"{rel}: canonical -> {m.group(1)}, expected {want}")
    return problems


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
        print("OK — heads consistent (lang, canonical, hreflang).")
    return rc


if __name__ == "__main__":
    sys.exit(main())
