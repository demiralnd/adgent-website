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
import re, sys, os, glob, io, json, hashlib, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS = os.path.join(ROOT, "_partials")
SKIP = {"blog-post"}
# Pages that live in a subdirectory, so the root glob never sees them.
EXTRA_SLUGS = ["demo"]
# media-planning folded into built-from-chat on 2026-08-16 — the old URL 301s
# in vercel.json, so it must not reappear here or the nav will link to a redirect.
FEATURE_SLUGS = ["daily-verdict", "ground-truth", "trust-gate", "creative-intelligence",
                 "change-ledger", "account-memory", "built-from-chat"]
NAV_SLUGS = ({"", "features", "why-adgent", "security", "data-use", "data-deletion",
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


def asset_stamp(name):
    """Content hash for /site.css and /site.js.

    Both are served with `max-age=14400`, so a visitor who loaded the site in
    the last four hours keeps the old stylesheet after a deploy — which shows
    up as a layout that is broken for them and fine for everyone else, and is
    impossible to reproduce. Stamping the URL with the file's own hash means a
    changed file is a changed URL, and the cached copy is never the wrong one.
    """
    path = os.path.join(ROOT, name)
    if not os.path.exists(path):
        return ""
    import hashlib
    h = hashlib.sha256(io.open(path, "rb").read()).hexdigest()[:8]
    return "?v=" + h


def twitter_card(html):
    """Mirror og:title / og:description into twitter:* when they are missing.

    Twenty-five pages declared twitter:card and twitter:image but neither text
    tag. X falls back to og:*, but Slack, LinkedIn and Discord are less reliable
    about it — and on the pages where og:description is deliberately shorter
    than the meta description, the fallback is not the copy anyone chose. The
    articles already do this correctly; deriving it here closes the gap without
    touching 25 heads by hand, and a new page inherits it.
    """
    head_end = html.find("</head>")
    if head_end == -1 or "twitter:card" not in html[:head_end]:
        return html
    head = html[:head_end]
    if "twitter:title" in head and "twitter:description" in head:
        return html

    def og(prop):
        m = re.search(r'<meta property="og:%s" content="([^"]*)"' % prop, head)
        return m.group(1) if m else None

    add = []
    if "twitter:title" not in head and og("title"):
        add.append('<meta name="twitter:title" content="%s"/>' % og("title"))
    if "twitter:description" not in head and og("description"):
        add.append('<meta name="twitter:description" content="%s"/>' % og("description"))
    if not add:
        return html
    # sit them beside the card/image tags they belong with
    anchor = re.search(r'<meta name="twitter:card"[^>]*/?>', head)
    at = anchor.end() if anchor else head_end
    return html[:at] + "\n" + "\n".join(add) + html[at:]


def stamp_assets(html):
    #  tokens.css is stamped too: site.css now reads variables that only exist
    #  in the newer tokens.css (--accent-fill), and an unstamped tokens.css can
    #  be served from cache next to a fresh site.css — which resolves those
    #  vars to nothing and paints buttons transparent.
    for name in ("tokens.css", "site.css", "site.js"):
        v = asset_stamp(name)
        if not v:
            continue
        # rewrite whether it is bare or already stamped, so re-running is safe
        html = re.sub(r'(["\'])/%s(\?v=[a-f0-9]+)?\1' % re.escape(name),
                      lambda m: m.group(1) + "/" + name + v + m.group(1), html)
    return html


def gate_analytics(html):
    """Remove legacy tags; site.js loads measurement only after consent."""
    html = re.sub(
        r'\s*<!-- Google tag \(gtag\.js\) -->.*?<!-- End Google Tag Manager -->\s*',
        '\n', html, flags=re.S)
    return re.sub(
        r'\s*<!-- Google Tag Manager \(noscript\) -->.*?'
        r'<!-- End Google Tag Manager \(noscript\) -->\s*',
        '\n', html, flags=re.S)


def mark_figures(html):
    """Stamp data-anim on every content figure, so it inherits entry motion.

    The animation lives entirely in site.css under `[data-anim] … [data-anim].in`,
    keyed off the class the existing reveal observer already adds. Marking the
    figures here rather than by hand means a new page — or a new chart on an old
    page — animates for free, and nobody has to remember the attribute.

    Deliberately skipped: the nav/footer blocks (regenerated above, and their
    little glyphs are decoration, not argument) and pure icons, which have no
    internal order worth revealing. A figure already carrying data-anim is left
    as it is, so a hand-tuned exception survives a rebuild.
    """
    start = html.find('<!--/#mobile-->')
    end = html.find('<!--#footer-->')
    if start == -1 or end == -1 or end < start:
        return html
    head, body, tail = html[:start], html[start:end], html[end:]

    ICON_BOXES = ('0 0 24 24', '0 0 20 20', '0 0 16 16', '0 0 12 8')

    def stamp(m):
        tag = m.group(0)
        if 'data-anim' in tag:
            return tag
        vb = re.search(r'viewBox="([^"]+)"', tag)
        if not vb or vb.group(1).strip() in ICON_BOXES:
            return tag
        # an ornament (a caret, a tick, a 18x8 arrow) has no internal order to
        # reveal; animating it just makes small marks flicker on scroll
        try:
            _, _, vw, vh = [float(v) for v in vb.group(1).split()]
        except ValueError:
            return tag
        if vw < 60 or vh < 40:
            return tag
        return tag[:-1].rstrip() + ' data-anim>'

    # only the opening <svg …> tag of each figure
    body = re.sub(r'<svg\b[^>]*>', stamp, body)
    return head + body + tail


def render(html, slug):
    html = gate_analytics(html)
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
    return stamp_assets(twitter_card(mark_figures(main_landmark(html))))


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(p)
        if name.startswith("_"):        # scratch harness, not a page
            continue
        yield p, name[:-5]


_PRIO = {"": "1.0", "features": "0.9", "demo": "0.9", "pricing": "0.8", "blog": "0.8",
         "for-agencies": "0.8", "for-in-house": "0.8", "why-adgent": "0.8",
         "about": "0.6", "security": "0.4",
         "data-use": "0.4", "privacy": "0.3", "terms": "0.3"}
_PRIO.update({s: "0.9" for s in FEATURE_SLUGS})
_freq = lambda s: "weekly" if s in ("", "blog") else \
                  ("yearly" if s in ("privacy", "terms", "security", "data-use") else "monthly")


def _noindex(path):
    """A page that tells robots not to index it must not be in the sitemap."""
    return "noindex" in read(path).lower()


def _lastmods(persist=True):
    """Per-page lastmod that only moves when the page actually changes.

    It used to stamp today's date on all 52 URLs on every build, so a CSS-only
    change told Google the whole site was rewritten. A signal that is always
    "today" is a signal Google learns to ignore.

    The cache-bust query on the stylesheets changes in every page on every CSS
    edit, so it is stripped before hashing — otherwise nothing would be stable.
    """
    state_path = os.path.join(ROOT, ".lastmod.json")
    try:
        state = json.loads(read(state_path))
    except Exception:
        state = {}
    today = datetime.date.today().isoformat()
    out, dirty = {}, False
    pages = [(os.path.basename(p)[:-5], p)
             for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))]
    # Subdirectory pages (EXTRA_SLUGS) are invisible to the root glob, so their
    # lastmod fell back to today() on every build — a permanent "just changed"
    # signal, the exact failure this function exists to remove.
    pages += [(s, _page_path(s)) for s in EXTRA_SLUGS]
    for slug, path in pages:
        if not os.path.exists(path):
            continue
        body = re.sub(r'(site\.css|site\.js|tokens\.css)\?v=[0-9a-f]+', r"\1", read(path))
        digest = hashlib.sha1(body.encode("utf-8")).hexdigest()
        prev = state.get(slug)
        if prev and prev.get("sha") == digest:
            out[slug] = prev["date"]
        else:
            out[slug] = today
            state[slug] = {"sha": digest, "date": today}
            dirty = True
    if dirty and persist:
        write(state_path, json.dumps(state, indent=1, sort_keys=True) + "\n")
    return out


def sitemap(check_only=False):
    base, today = "https://adgent.app", datetime.date.today().isoformat()
    dates = _lastmods(persist=not check_only)
    slugs = [os.path.basename(p)[:-5] for p in sorted(glob.glob(os.path.join(ROOT, "*.html")))
             if not _noindex(p) and not os.path.basename(p).startswith("_")]
    # EXTRA_SLUGS used to be appended unconditionally, bypassing the _noindex filter
    # above — so a noindex subdirectory page sat in the sitemap while its own meta
    # tag told Google not to index it. That is the contradiction this file claims to
    # make impossible; it is now actually impossible.
    slugs = [s for s in slugs if s not in SKIP] + [
        s for s in EXTRA_SLUGS
        if os.path.exists(_page_path(s)) and not _noindex(_page_path(s))]
    rows = []
    for slug in ["index"] + [s for s in slugs if s != "index"]:
        path = "" if slug == "index" else slug
        loc = f"{base}/{path}"
        rows.append(f"  <url><loc>{loc}</loc><lastmod>{dates.get(slug, today)}</lastmod>"
                    f"<changefreq>{_freq(path)}"
                    f"</changefreq><priority>{_PRIO.get(path,'0.7')}</priority></url>")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<?xml-stylesheet type="text/xsl" href="/sitemap.xsl"?>\n'
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
           + "\n".join(rows) + "\n</urlset>\n")
    p = os.path.join(ROOT, "sitemap.xml")
    if check_only:
        cur = read(p) if os.path.exists(p) else ""
        if cur.strip() != xml.strip():
            if cur.count("<url>") != len(rows):
                print("SITEMAP STALE — %d urls on disk, %d pages" % (cur.count("<url>"), len(rows)))
            else:
                print("SITEMAP STALE — a page changed since the last build (lastmod)")
            return 1
        return 0
    write(p, xml)
    print("sitemap: %d urls" % len(rows))
    return 0



# ---------------------------------------------------------------- llms.txt
# Hand-maintained, it went stale immediately: 20 real pages missing and a
# platform list that contradicted the site. Derive it from the pages instead.
_LLMS_GROUPS = [
    ("Product", ["", "features", "why-adgent", "pricing", "demo"]),
    ("Capabilities", FEATURE_SLUGS),
    ("By industry", ["ecommerce", "lead-generation", "travel-hospitality",
                     "marketplaces", "local-multi-location", "mobile-apps"]),
    ("By team", ["for-agencies", "for-in-house"]),
    ("Company", ["about", "blog", "security", "data-use", "privacy", "terms"]),
]


def _page_path(slug):
    """Slug -> file. Subdirectory pages (demo) live at <slug>/index.html."""
    path = os.path.join(ROOT, ("index" if slug == "" else slug) + ".html")
    return path if os.path.exists(path) else os.path.join(ROOT, slug, "index.html")


def _page_meta(slug):
    """(title, description) straight from the page's own head."""
    path = _page_path(slug)
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
            # _LLMS_GROUPS is a hand-written list, so it bypassed the _noindex filter
            # the loop below applies — the same hole EXTRA_SLUGS had in sitemap().
            # A noindex page must not be advertised on the AI-crawler surface either.
            p_ = _page_path(slug)
            if not os.path.exists(p_) or _noindex(p_):
                continue
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
    path = _page_path(slug)
    if not os.path.exists(path):
        return None
    html = read(path)
    # Split past the WHOLE opening tag. Splitting on "<main" alone left the
    # rest of it (`id="main" tabindex="-1">`) at the head of the text, and the
    # tag-stripper below could not remove it because it no longer began with
    # "<" — so every one of the 51 entries in llms-full.txt opened with markup,
    # in the file robots.txt points AI crawlers at.
    if "<main" in html:
        after = html.split("<main", 1)[1]
        body = after.split(">", 1)[1] if ">" in after else after
        body = body.split("</main>", 1)[0]
    else:
        body = html
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
        # same hand-written list, same noindex hole as in llms() and sitemap()
        p_ = _page_path(s_)
        if s_ in seen or not os.path.exists(p_) or _noindex(p_):
            continue
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
            page = os.path.join(ROOT, target + ".html")
            directory_page = os.path.join(ROOT, target, "index.html")
            if not os.path.exists(page) and not os.path.exists(directory_page):
                problems.append(f"{rel}: links to {href}, which has no page")

        # 5. Measurement is owned by site.js and must never appear in page HTML:
        #    page-level tags execute before the visitor can choose.
        if "googletagmanager.com" in html or "gtag(" in html:
            problems.append(f"{rel}: analytics bypasses the consent gate")

        # 6. SEO/GEO head invariants. Every one of these was missing on at
        #    least half the site on 2026-09-02, and a <head> has no owner, so
        #    nothing but this check keeps them from drifting back out.
        indexable = "noindex" not in head
        if indexable:
            if not re.search(r'<meta name="description" content="\S', head):
                problems.append(f"{rel}: no meta description")
            #    Without max-snippet:-1 Google caps the text it may quote, which
            #    also caps what an answer engine can lift from the page.
            if "max-snippet:-1" not in head:
                problems.append(f"{rel}: robots meta without max-snippet:-1")
            if "og:image" in head and "og:image:alt" not in head:
                problems.append(f"{rel}: og:image without og:image:alt")
            if "og:locale" not in head:
                problems.append(f"{rel}: no og:locale")
        #    Fonts must be discovered in the head. As an @import inside
        #    tokens.css they were two stylesheet round-trips deep, which is
        #    LCP paid for nothing.
        if "fonts.googleapis.com" not in head:
            problems.append(f"{rel}: webfonts not linked from <head>")
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
