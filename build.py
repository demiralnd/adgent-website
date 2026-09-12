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
import re, sys, os, glob, io, json, hashlib, datetime, html as H

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS = os.path.join(ROOT, "_partials")
SKIP = {"blog-post"}
# Pages that live in a subdirectory, so the root glob never sees them.
# `demo` was pulled from the site on 2026-09-09 — the page still exists on disk
# but nothing links it and it is out of the sitemap and llms.txt. Re-adding it
# is this list, _PRIO, _LLMS_GROUPS and the three _partials entries.
EXTRA_SLUGS = []
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


def stamp_og(html):
    """Stamp og:image / twitter:image with the card's own content hash.

    Same reason as asset_stamp, one layer meaner. `/assets/:path*` is served
    `max-age=604800`, and Cloudflare caches the **response**, including a 404.
    The 27 new cards were probed on 2026-09-09 while they did not exist yet, so
    the edge held a 404 for each of them — and it was still serving that 404
    minutes after the deploy that added the files (`age: 100274`,
    `cf-cache-status: HIT`, while the same URL with a query string answered 200
    and 280 KB of PNG). A social crawler would have got a blank card for a week.

    A stamped URL is a different cache key, so it cannot inherit a stale answer,
    and the next time a card's art changes the preview changes with it instead of
    a week later. There is no purge in this repo: we do not hold a Cloudflare
    token, and the fix should not need one.
    """
    def stamp(m):
        head, path = m.group(1), m.group(2)
        if not os.path.exists(os.path.join(ROOT, path.lstrip("/"))):
            return m.group(0)
        return f'{head}https://adgent.app{path}{asset_stamp(path.lstrip("/"))}"'

    return re.sub(
        r'(<meta (?:property="og:image"|name="twitter:image") content=")'
        r'https://adgent\.app(/assets/og/[^"?]+)"', stamp, html)


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


def feed_link(html):
    """Advertise /feed.xml from every page's <head>.

    Site-wide rather than blog-only on purpose: `rel="alternate"` is how a
    reader, an aggregator or an answer engine discovers the feed from whatever
    page it happens to land on, and putting it in one place makes it one more
    head that drifts. Anchored after the canonical, which every page has and
    `audit()` check 3 keeps self-referencing.
    """
    head_end = html.find("</head>")
    if head_end == -1 or 'type="application/rss+xml"' in html[:head_end]:
        return html
    anchor = re.search(r'<link rel="canonical"[^>]*/?>', html[:head_end])
    at = anchor.end() if anchor else head_end
    return html[:at] + "\n" + FEED_LINK + html[at:]


def stamp_assets(html):
    #  tokens.css is stamped too: site.css now reads variables that only exist
    #  in the newer tokens.css (--accent-fill), and an unstamped tokens.css can
    #  be served from cache next to a fresh site.css — which resolves those
    #  vars to nothing and paints buttons transparent.
    for name in ("tokens.css", "site.css", "site.js"):
        # the stylesheets are served from their comment-stripped copies; the URL
        # in the page never changes, only what it points at
        served = name[:-4] + ".min.css" if name in SERVED_CSS and \
            os.path.exists(os.path.join(ROOT, name[:-4] + ".min.css")) else name
        v = asset_stamp(served)
        if not v:
            continue
        # rewrite whether it is bare or already stamped, so re-running is safe
        html = re.sub(r'(["\'])/(?:%s|%s)(\?v=[a-f0-9]+)?\1'
                      % (re.escape(name), re.escape(served)),
                      lambda m: m.group(1) + "/" + served + v + m.group(1), html)
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
    html = twitter_card(mark_figures(main_landmark(html)))
    return stamp_assets(stamp_og(feed_link(html)))


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        name = os.path.basename(p)
        # A leading underscore means "not a deployed page": the scratch harness
        # here, and in the docs mirror the standalone HTML artifacts that live
        # beside the site but are never served. Without it the mirror's own
        # `--check` failed on three files live does not even have.
        if name.startswith("_"):
            continue
        yield p, name[:-5]


_PRIO = {"": "1.0", "features": "0.9", "pricing": "0.8", "blog": "0.8",
         "for-agencies": "0.8", "for-in-house": "0.8", "why-adgent": "0.8",
         "tools": "0.8", "break-even-roas-calculator": "0.8",
         "conversion-signal-check": "0.8",
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


# ---------------------------------------------------------------- feed.xml
# A 25-article blog with no feed: `feedMissing` on all 55 pages in the
# 2026-09-09 crawl. A feed is the only pull surface on the site — everything
# else waits for a crawler to come back. Derived from the pages for the same
# reason the sitemap is: a hand-maintained list of 25 posts goes stale on the
# 26th.
FEED_PATH = "feed.xml"
FEED_LINK = ('<link rel="alternate" type="application/rss+xml" '
             'title="Adgent — the blog" href="/feed.xml"/>')


def _articles():
    """(slug, title, description, date) for every BlogPosting, newest first.

    Keyed on the JSON-LD `@type`, not on a slug list: the two tool pages carry a
    `datePublished` as well and are not blog posts, and the next page that gets
    one should not silently join the feed either.

    ⚠️ **Top-level `@graph` nodes only** — deliberately not `_ld_nodes()`.
    `blog.html` is a `Blog` whose `blogPost[]` nests a stub for each article, so
    a recursive walk put the listing page in the feed under its own title. A
    nested node describes something else; only the top-level one describes *this
    page*.
    """
    out = []
    for path, slug in pages():
        if slug in SKIP:
            continue
        head = read(path).split("</head>", 1)[0]
        if "noindex" in head:
            continue
        for block in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', head, re.S):
            for node in json.loads(block).get("@graph", []):
                if node.get("@type") == "BlogPosting" and node.get("datePublished"):
                    title, desc = _page_meta(slug)
                    # the brand suffix is for a SERP, not for a reader's list
                    out.append((slug, re.sub(r"\s*—\s*Adgent$", "", title),
                                desc, node["datePublished"]))
                    break
    return sorted(out, key=lambda r: (r[3], r[0]), reverse=True)


def feed(check_only=False):
    base = "https://adgent.app"
    items = _articles()
    esc = lambda s: (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))
    rows = []
    for slug, title, desc, date in items:
        # RFC 822 date at noon UTC: the pages carry a day, not a time, and
        # inventing 00:00 makes a post look a day older in some readers.
        stamp = datetime.datetime.strptime(date, "%Y-%m-%d").strftime(
            "%a, %d %b %Y 12:00:00 +0000")
        rows.append(
            f"    <item>\n"
            f"      <title>{esc(title)}</title>\n"
            f"      <link>{base}/{slug}</link>\n"
            f"      <guid isPermaLink=\"true\">{base}/{slug}</guid>\n"
            f"      <pubDate>{stamp}</pubDate>\n"
            f"      <description>{esc(desc)}</description>\n"
            f"    </item>")
    newest = items[0][3] if items else datetime.date.today().isoformat()
    built = datetime.datetime.strptime(newest, "%Y-%m-%d").strftime(
        "%a, %d %b %Y 12:00:00 +0000")
    xml = ('<?xml version="1.0" encoding="UTF-8"?>\n'
           '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
           '  <channel>\n'
           '    <title>Adgent — the blog</title>\n'
           f'    <link>{base}/blog</link>\n'
           '    <description>Diagnostics, audits and honest reads on Meta and '
           'Google Ads accounts.</description>\n'
           '    <language>en-us</language>\n'
           f'    <lastBuildDate>{built}</lastBuildDate>\n'
           f'    <atom:link href="{base}/{FEED_PATH}" rel="self" '
           'type="application/rss+xml"/>\n'
           + "\n".join(rows) + "\n"
           '  </channel>\n</rss>\n')
    p = os.path.join(ROOT, FEED_PATH)
    if check_only:
        cur = read(p) if os.path.exists(p) else ""
        if cur.strip() != xml.strip():
            print("FEED STALE — regenerate with build.py (%d items)" % len(rows))
            return 1
        return 0
    write(p, xml)
    print("feed.xml: %d items" % len(rows))
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
    ("Free tools", ["tools", "break-even-roas-calculator", "conversion-signal-check"]),
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


def _ld_nodes(value):
    """Every dict in a JSON-LD document, nested ones included.

    Nesting matters here: the homepage's Organization is reached through
    SoftwareApplication.publisher, not from @graph, so a top-level-only walk
    misses most of them.
    """
    if isinstance(value, list):
        for item in value:
            yield from _ld_nodes(item)
    elif isinstance(value, dict):
        yield value
        for item in value.values():
            yield from _ld_nodes(item)


# Arial advance widths in 1/1000 em, grouped by width so the table stays readable.
# Google renders SERP titles in ~20px Arial and descriptions in ~14px, and truncates
# on width, not on character count. These are the real advances: verified against
# Chrome's own `canvas.measureText` for all 105 characters the site uses, at both
# sizes, with **zero** deviation over 0.6px — one table in font units reproduces
# every size, which is why this is not a per-size lookup.
_ARIAL = {
    191: "'",           222: "ijl\u2019",  260: "|",
    278: " !,./:;I[\\]ft",
    333: "()-`r\u00b7\u2011\u201c\u201d",
    334: "{}",           355: '"',          389: "*",   469: "^",
    500: "Jcksvxyz",
    556: "#$0123456789?L_abdeghnopqu\u2013\u20ba",
    584: "+<=>~\u00d7",  611: "FTZ",
    667: "&ABEKPSVXY",   722: "CDHNRUw",    778: "GOQ",
    833: "Mm",           889: "%",          944: "W",
    1000: "\u2014\u2026", 1015: "@",
}
_ADVANCE = {ch: units for units, chars in _ARIAL.items() for ch in chars}


def serp_px(text, size):
    """Rendered width of `text` in Arial at `size` px, rounded.

    Unknown characters fall back to 556 (the lowercase average), which is the
    honest default: a wrong guess on one glyph moves the total by single-digit
    pixels, and the alternative is a table nobody maintains.
    """
    return round(sum(_ADVANCE.get(ch, 556) for ch in text) * size / 1000)


def audit():
    """Invariants the partials can't enforce: per-page <head>, plus the one
    cross-file contract (site.js ↔ vercel.json) that measurement depends on.

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
            #    SERP caps, measured the way Google truncates: in pixels, not
            #    characters. SITE.md claimed "every title ≤60ch and every
            #    description ≤160ch" from 2026-09-03 and it was already false two
            #    days later. Characters are the wrong ruler anyway — 160 characters
            #    of "Illinois" and 160 of "MMMMMMMM" are 400 px apart — so this
            #    measures the real thing. See serp_px().
            t = re.search(r"<title>(.*?)</title>", head, re.S)
            if t:
                w = serp_px(H.unescape(t.group(1)), 20)
                if w > 600:
                    problems.append(f"{rel}: title is {w}px, over the 600px SERP cap")
            d = re.search(r'<meta name="description" content="(.*?)"', head, re.S)
            if d:
                w = serp_px(H.unescape(d.group(1)), 14)
                if w > 985:
                    problems.append(f"{rel}: meta description is {w}px, over the 985px cap")
            #    The feed is a pull surface: if no page advertises it, only
            #    somebody who already guessed the URL will ever find it.
            if 'href="/feed.xml"' not in head:
                problems.append(f"{rel}: no rel=alternate link to /feed.xml")
        #    Fonts must be discovered in the head. They started as an @import
        #    inside tokens.css — two stylesheet round-trips deep — then moved to
        #    a <link> to fonts.googleapis.com, which was better but still put two
        #    third-party origins in front of first paint for a 1.7 KB file.
        #    They are now @font-face rules at the top of tokens.css itself, served
        #    from our own origin, so the check is that nothing has crept back.
        if "fonts.googleapis.com" in head or "fonts.gstatic.com" in head:
            problems.append(f"{rel}: webfont loaded from a third-party origin")
        if "/tokens" not in head:
            problems.append(f"{rel}: tokens stylesheet not linked from <head>")

    # 7. The measurement paths must stay wired end to end. site.js loads the tag
    #    and the container from first-party paths; vercel.json rewrites those
    #    paths to the Google tag gateway origins. If the two ever disagree —
    #    a renamed path, a dropped rewrite, a copy-paste back to
    #    googletagmanager.com — measurement 404s or quietly leaves our domain,
    #    and no page shows a symptom. This is the only place that can notice.
    site_js = read(os.path.join(ROOT, "site.js"))
    rewrites = {r["source"]: r["destination"]
                for r in json.loads(read(os.path.join(ROOT, "vercel.json")))
                .get("rewrites", [])}
    sources = re.findall(r"script\.src = '([^']+)'", site_js)
    if not sources:
        problems.append("site.js: no measurement script source at all")
    for src in sources:
        if not src.startswith("/"):
            problems.append(f"site.js: {src} is not a first-party path")
            continue
        if not re.fullmatch(r"https://[a-z0-9-]+\.fps\.goog/[a-z]+/",
                            rewrites.get(src, "")):
            problems.append(f"vercel.json: {src} does not rewrite to a gateway origin")
        if ".fps.goog" not in rewrites.get(f"{src}/:path*", ""):
            problems.append(f"vercel.json: no {src}/:path* rule, so the hits 404")

    # 8. One host, one set of URLs. Two hosts have served the whole site at 200
    #    with nothing but a canonical tag pointing home, and a canonical tag is
    #    a hint:
    #
    #      www.adgent.app            found 2026-09-09
    #      adgent-website.vercel.app found 2026-09-12 — and it was *indexed*:
    #        it came back rank 8 on a `site:`-free "adgent" query under the
    #        stale title "Adgent — The senior analyst you can talk to", while
    #        the real homepage was not in the top ten at all. Vercel sends
    #        `X-Robots-Tag: noindex` on *preview* deployments and **not** on the
    #        production `*.vercel.app` alias, so the alias is a crawlable
    #        duplicate of production by default. The project-scoped aliases are
    #        SSO-gated (302 to vercel.com/sso-api) and need no rule.
    #
    #    ⚠️ **Two rules per host, and the second is not redundant.** Deployed
    #    2026-09-11 with only `/:path*`: `www.adgent.app/pricing` answered 308
    #    and `www.adgent.app/` answered **200** with the whole homepage
    #    (`cf-cache-status: DYNAMIC`, so it was Vercel, not a cached copy).
    #    `:path*` does not match the bare root here. Same shape as the slashless
    #    `/metrics` rewrite, same reason.
    redirects = json.loads(read(os.path.join(ROOT, "vercel.json"))).get("redirects", [])
    for host in ("www.adgent.app", "adgent-website.vercel.app"):
        covered = {r.get("source") for r in redirects
                   if r.get("destination", "").startswith("https://adgent.app/")
                   and any(h.get("type") == "host" and h.get("value") == host
                           for h in r.get("has", []))}
        for source in ("/", "/:path*"):
            if source not in covered:
                problems.append(
                    f"vercel.json: no {host} -> apex redirect for {source!r}")

    # 9. One brand entity, not thirty. Organization appeared as a top-level or
    #    nested node 103 times across 55 pages on 2026-09-09, and WebSite 20
    #    times, every one of them anonymous — no @id. Anonymous nodes do not
    #    merge: a search engine reading the site sees a hundred separate
    #    companies that happen to share a name, which is the wrong answer to
    #    give for a brand query. The shared @id is what makes them one node.
    for path, slug in pages():
        if slug in SKIP:
            continue
        rel, head = os.path.relpath(path, ROOT), read(path).split("</head>", 1)[0]
        for block in re.findall(
                r'<script type="application/ld\+json">(.*?)</script>', head, re.S):
            for node in _ld_nodes(json.loads(block)):
                t, want = node.get("@type"), None
                if t == "Organization" and str(
                        node.get("url", "https://adgent.app")).rstrip("/") == "https://adgent.app":
                    want = "https://adgent.app/#organization"
                elif t == "WebSite":
                    want = "https://adgent.app/#website"
                if want and node.get("@id") != want:
                    problems.append(f"{rel}: {t} node without @id {want}")

            #    …and declared exactly once per document. Two nodes carrying the
            #    same @id and the same properties is legal JSON-LD — they merge —
            #    but it is the shape that says "copy-pasted", and 28 pages had it
            #    the moment the @ids went in: a full Organization at @graph level
            #    *and* a full copy under publisher. One full declaration, every
            #    other occurrence a bare {"@id": …}. The reverse failure matters
            #    more: a bare ref whose target is declared nowhere in the document
            #    resolves to nothing at all.
            #    Scoped to the two site entities on purpose: a breadcrumb may
            #    legitimately carry {"@id": "https://adgent.app/pricing"} for a
            #    node it does not describe, and flagging that would be noise.
            ENTITIES = ("https://adgent.app/#organization",
                        "https://adgent.app/#website")
            full, refs = {}, set()
            for node in _ld_nodes(json.loads(block)):
                nid = node.get("@id")
                if nid not in ENTITIES:
                    continue
                if set(node) == {"@id"}:
                    refs.add(nid)
                else:
                    full[nid] = full.get(nid, 0) + 1
            for nid, count in sorted(full.items()):
                if count > 1:
                    problems.append(f"{rel}: {nid} declared {count}x — one, then bare refs")
            for nid in sorted(refs - set(full)):
                problems.append(f"{rel}: bare @id ref {nid} is declared nowhere on the page")

    # 10. One social card per page. 27 indexable pages shared assets/og/site.png
    #    until 2026-09-09, so every link to a solution, capability or legal page
    #    looked identical in a feed, a DM and an LLM's link preview. Nothing on
    #    the page shows the defect, and the fix decays back the moment somebody
    #    scaffolds a new page from a donor head — which is exactly how it spread.
    #    Also checks the file exists, and that the URL is stamped: an og:image
    #    404 is a blank card, and an unstamped one can inherit a cached 404 from
    #    before the deploy that created it — see stamp_og().
    seen = {}
    for path, slug in pages():
        if slug in SKIP:
            continue
        rel, html = os.path.relpath(path, ROOT), read(path)
        head = html.split("</head>", 1)[0]
        if "noindex" in head:
            continue
        m = re.search(r'<meta property="og:image" content="https://adgent\.app(/[^"?]+)(\?v=[0-9a-f]+)?"',
                      head)
        if not m:
            problems.append(f"{rel}: no og:image")
            continue
        card = m.group(1)
        if not os.path.exists(os.path.join(ROOT, card.lstrip("/"))):
            problems.append(f"{rel}: og:image {card} does not exist")
        elif not m.group(2):
            problems.append(f"{rel}: og:image {card} is unstamped")
        if card in seen:
            problems.append(f"{rel}: og:image {card} is already used by {seen[card]}")
        seen[card] = rel

    # 11. Response headers. The 2026-09-09 crawl found none of these on any of
    #     the 55 pages. They are the four with no behavioural cost on this site:
    #     nothing embeds us in a frame except the noindex lab page (SAMEORIGIN
    #     covers it), nothing reads a cross-origin referrer path, and nothing
    #     asks for a camera. Deleting a header has no symptom, which is the
    #     whole reason it is a check.
    #
    #     ⛔ No CSP, and that is a decision with a measurement behind it: with
    #     full consent the site loads scripts from clarity.ms and
    #     static.cloudflareinsights.com, an ads-audience pixel from a Google
    #     ccTLD chosen by the visitor's country (observed: www.google.com.tr, so
    #     img-src would need ~190 hosts or a bare `https:`), and 31 pages carry
    #     an inline <style>. A policy with 'unsafe-inline' on script-src is not
    #     an XSS control, and a wrong one kills measurement with no symptom —
    #     the exact failure mode check 7 exists for. Do it properly or not at
    #     all: build-step nonces plus a report-only rollout.
    want_headers = {"X-Content-Type-Options", "X-Frame-Options",
                    "Referrer-Policy", "Permissions-Policy"}
    have = {h["key"] for rule in json.loads(read(os.path.join(ROOT, "vercel.json")))
            .get("headers", []) if rule.get("source") == "/(.*)"
            for h in rule.get("headers", [])}
    for missing in sorted(want_headers - have):
        problems.append(f"vercel.json: no site-wide {missing} header")
    return problems


SERVED_CSS = ("tokens.css", "site.css")


def strip_css_comments(name, check_only=False):
    """Serve the stylesheets without their comments.

    The sources keep every comment — they are the only record of why half of
    these rules exist — but the browser pays for them on the render-blocking
    path, and site.css is the largest thing standing in front of first paint.
    Measured on the real file: 71.3 KB -> 37.6 KB gzipped, a 47% cut. Collapsing
    whitespace on top of that buys a further 1.2 KB, which is not worth touching
    a single space of a 288 KB stylesheet for, so it is not done.

    Stripping comments with a regex is only safe while no string or url() in the
    file contains a comment marker. That is asserted, not assumed, and the build
    refuses rather than shipping a mangled stylesheet.
    """
    src_path = os.path.join(ROOT, name)
    out_path = os.path.join(ROOT, name[:-4] + ".min.css")
    if not os.path.exists(src_path):
        return 0
    src = read(src_path)
    for m in re.finditer(r'"[^"\n]*"|\'[^\'\n]*\'|url\([^)]*\)', src):
        if "/*" in m.group(0) or "*/" in m.group(0):
            print("CSS STRIP REFUSED — %s: comment marker inside %s"
                  % (name, m.group(0)[:60]))
            return 1
    comments = re.findall(r"/\*.*?\*/", src, flags=re.S)
    out = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    # every brace that disappeared must be one that sat inside a comment
    expected = src.count("{") - sum(c.count("{") for c in comments)
    if out.count("{") != expected or out.count("{") != out.count("}"):
        print("CSS STRIP REFUSED — %s: brace count moved unexpectedly" % name)
        return 1
    cur = read(out_path) if os.path.exists(out_path) else None
    if cur == out:
        return 0
    if check_only:
        print("CSS STALE — %s is not current" % os.path.basename(out_path))
        return 1
    write(out_path, out)
    return 0


def main():
    check = "--check" in sys.argv
    css_rc = 0
    for _css in SERVED_CSS:
        css_rc |= strip_css_comments(_css, check_only=check)
    stale, wrote = [], 0
    for path, slug in pages():
        src = read(path)
        out = render(src, slug)
        if out != src:
            stale.append(os.path.relpath(path, ROOT))
            if not check:
                write(path, out); wrote += 1
    rc = css_rc
    if check:
        if stale:
            print("STALE — %d page(s) differ from _partials/:" % len(stale))
            for f in stale[:20]:
                print("   ", f)
            rc = 1
        else:
            print("OK — every page matches _partials/.")
        rc |= sitemap(check_only=True)
        rc |= feed(check_only=True)
        rc |= llms(check_only=True)
        rc |= llms_full(check_only=True)
    else:
        print("built %d page(s)" % wrote)
        sitemap()
        feed()
        llms()
        llms_full()
    bad = audit()
    if bad:
        print("AUDIT PROBLEMS — %d:" % len(bad))
        for b in bad[:20]:
            print("   ", b)
        rc = 1
    elif check and rc == 0:
        print("OK — sitemap and feed current.")
        print("OK — heads consistent, measurement wired first-party.")
    return rc


if __name__ == "__main__":
    sys.exit(main())
