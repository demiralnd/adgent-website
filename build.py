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
FEATURE_SLUGS = ["daily-verdict", "ground-truth", "trust-gate", "creative-intelligence",
                 "change-ledger", "account-memory", "built-from-chat", "media-planning"]
NAV_SLUGS = ({"", "features", "why-adgent", "security", "data-use",
              "for-agencies", "for-in-house", "pricing", "about", "blog"}
             | set(FEATURE_SLUGS))
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


def main_landmark(html):
    """Wrap the page body in <main id="main">.

    Everything between the mobile menu and the footer IS the page content, so
    the wrapper can be derived rather than hand-maintained — which also means
    new pages get it for free. Without it a screen-reader user has to walk the
    whole nav on every page, and the skip link has nothing to skip to.
    """
    start = html.find("<!--/#mobile-->")
    end = html.find("<!--#footer-->")
    if start == -1 or end == -1 or end < start:
        return html                      # unusual page shape — leave it alone
    start += len("<!--/#mobile-->")
    inner = html[start:end]
    if "<main" in inner:                 # already wrapped: refresh nothing
        return html
    # tabindex="-1" so the skip link actually moves focus, not just the
    # scroll position — without it the next Tab returns to the nav.
    return (html[:start] + '<main id="main" tabindex="-1">' + inner.rstrip()
            + "\n</main>\n" + html[end:])


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
    return main_landmark(html)


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(p)
        if name.startswith("_"):        # scratch harness, not a page
            continue
        yield p, name[:-5]


_PRIO = {"": "1.0", "features": "0.9", "pricing": "0.8", "blog": "0.8",
         "for-agencies": "0.8", "for-in-house": "0.8", "why-adgent": "0.8",
         "about": "0.6", "security": "0.4",
         "data-use": "0.4", "privacy": "0.3", "terms": "0.3"}
_PRIO.update({s: "0.9" for s in FEATURE_SLUGS})
_freq = lambda s: "weekly" if s in ("", "blog") else \
                  ("yearly" if s in ("privacy", "terms", "security", "data-use") else "monthly")


def _noindex(path):
    """A page that tells robots not to index it must not be in the sitemap."""
    return "noindex" in read(path).lower()


def sitemap(check_only=False):
    base, today = "https://adgent.app", datetime.date.today().isoformat()
    slugs = [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))
             if not _noindex(p) and not os.path.basename(p).startswith("_")]
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



# ---------------------------------------------------------------- llms.txt
# Hand-maintained, it went stale immediately: 20 real pages missing and a
# platform list that contradicted the site. Derive it from the pages instead.
_LLMS_GROUPS = [
    ("Product", ["", "features", "why-adgent", "pricing"]),
    ("Capabilities", FEATURE_SLUGS),
    ("By industry", ["ecommerce", "lead-generation", "travel-hospitality",
                     "marketplaces", "local-multi-location", "mobile-apps"]),
    ("By team", ["for-agencies", "for-in-house"]),
    ("Company", ["about", "blog", "security", "data-use", "privacy", "terms"]),
]


def _page_meta(slug):
    """(title, description) straight from the page's own head."""
    path = os.path.join(ROOT, ("index" if slug == "" else slug) + ".html")
    if not os.path.exists(path):
        return None
    head = read(path).split("</head>", 1)[0]
    t = re.search(r"<title>(.*?)</title>", head, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', head, re.S)
    if not (t and d):
        return None
    clean = lambda x: re.sub(r"\s+", " ", x).replace("&amp;", "&").replace("&#8217;", "'").strip()
    return clean(t.group(1)), clean(d.group(1))


def llms(check_only=False):
    """Regenerate llms.txt from the pages, preserving the hand-written preamble."""
    path = os.path.join(ROOT, "llms.txt")
    cur = read(path) if os.path.exists(path) else ""
    # keep everything the author wrote above the first "## " section
    preamble = cur.split("\n## ", 1)[0].rstrip() if "\n## " in cur else cur.rstrip()
    out = [preamble, ""]
    listed = 0
    for heading, slugs in _LLMS_GROUPS:
        rows = []
        for slug in slugs:
            m = _page_meta(slug)
            if not m:
                continue
            title, desc = m
            rows.append("- [%s](https://adgent.app/%s): %s" % (title, slug, desc))
            listed += 1
        if rows:
            out += ["## " + heading, ""] + rows + [""]
    # every remaining indexable page, so nothing is silently absent
    grouped = {s for _, ss in _LLMS_GROUPS for s in ss}
    rest = []
    for path_, slug in pages():
        if slug in SKIP or slug in grouped or slug == "index" or _noindex(path_):
            continue
        m = _page_meta(slug)
        if m:
            rest.append("- [%s](https://adgent.app/%s): %s" % (m[0], slug, m[1]))
            listed += 1
    if rest:
        out += ["## Articles", ""] + sorted(rest) + [""]
    text = "\n".join(out) + "\n"
    if check_only:
        if cur.strip() != text.strip():
            print("LLMS.TXT STALE — regenerate with build.py")
            return 1
        return 0
    write(path, text)
    print("llms.txt: %d pages" % listed)
    return 0



def _page_text(slug):
    """Readable body text of a page, for the full-text LLM feed."""
    path = os.path.join(ROOT, ("index" if slug == "" else slug) + ".html")
    if not os.path.exists(path):
        return None
    html = read(path)
    body = html.split("<main", 1)[-1].split("</main>", 1)[0] if "<main" in html else html
    body = re.sub(r"<(script|style|svg)\b.*?</\1>", " ", body, flags=re.S | re.I)
    # keep block boundaries so sentences do not run together
    body = re.sub(r"</(p|li|h[1-6]|div|section|tr)>", "\n", body, flags=re.I)
    body = re.sub(r"<[^>]+>", " ", body)
    for a, b in [("&amp;", "&"), ("&mdash;", "—"), ("&#8212;", "—"), ("&#8217;", "'"),
                 ("&#8216;", "'"), ("&#8220;", '"'), ("&#8221;", '"'), ("&nbsp;", " "),
                 ("&times;", "×"), ("&#215;", "×"), ("&lt;", "<"), ("&gt;", ">"),
                 ("&#8211;", "–"), ("&#8378;", "₺"), ("&euro;", "€"), ("&pound;", "£")]:
        body = body.replace(a, b)
    lines = [re.sub(r"[ \t]+", " ", l).strip() for l in body.split("\n")]
    return "\n".join(l for l in lines if l)


def llms_full(check_only=False):
    """Full-text feed, regenerated from the pages.

    Hand-maintained it drifted badly: 4,286 lines that predated thirteen pages
    and still sold a platform the product does not connect to."""
    path = os.path.join(ROOT, "llms-full.txt")
    order = [s for _, ss in _LLMS_GROUPS for s in ss]
    seen, slugs = set(), []
    for s_ in order:
        if s_ not in seen:
            seen.add(s_); slugs.append(s_)
    for path_, slug in pages():
        if slug in SKIP or slug in seen or _noindex(path_):
            continue
        seen.add(slug); slugs.append(slug)
    out = ["# Adgent — full text", "",
           "> Every page of adgent.app as plain text, generated at build time so it",
           "> cannot drift from the site. Source of truth is the HTML.", ""]
    for slug in slugs:
        meta = _page_meta(slug)
        text = _page_text(slug)
        if not (meta and text):
            continue
        out += ["", "---", "",
                "# %s" % meta[0],
                "URL: https://adgent.app/%s" % slug, "", text]
    body = "\n".join(out).rstrip() + "\n"
    cur = read(path) if os.path.exists(path) else ""
    if check_only:
        if cur.strip() != body.strip():
            print("LLMS-FULL.TXT STALE — regenerate with build.py")
            return 1
        return 0
    write(path, body)
    print("llms-full.txt: %d pages" % sum(1 for s_ in slugs if _page_meta(s_)))
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

        # 4. an internal link must point at a page that exists. Adding a nav
        #    entry before its page is written ships a dead link to production —
        #    it did, on the seven feature pages.
        #    Extension-less paths only — anything with a dot is an asset, and
        #    assets are not pages.
        for href in set(re.findall(r'href="(/[^"#?.]*)"', html)):
            target = "index" if href == "/" else href.strip("/")
            if not os.path.exists(os.path.join(ROOT, target + ".html")):
                problems.append(f"{rel}: links to {href}, which has no page")

        # 5. a find-and-replace once ate the parens off these calls, which is a
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
        rc |= llms(check_only=True)
        rc |= llms_full(check_only=True)
    else:
        print("built %d page(s)" % wrote)
        sitemap()
        llms()
        llms_full()
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
