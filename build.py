#!/usr/bin/env python3
"""Adgent v2 · the build step.

Pages carry markers; the shared chrome is regenerated into them from
`_partials/`, the derived part of every <head> is generated from the page's
own hand-written head and body, and the crawler surfaces are generated from
the pages. Nothing here talks to a network and nothing deploys.

    python3 build.py            # regenerate every page + sitemap, feed, llms
    python3 build.py --check    # exit 1 if anything is stale or audit() fails

What a page owns, and what the build owns
-----------------------------------------
Hand-written in each page's <head> (edit it there):
    <meta name="robots">, <title>, <meta name="description">, canonical,
    og:type, og:site_name, og:title, og:description, stylesheets.
Generated into `<!--#seo-->…<!--/#seo-->` (never edit inside the markers):
    og:locale/url/image(+size, alt), article:* dates, twitter:*, the feed
    link, JSON-LD (Organization + WebSite once each, the page node, the
    breadcrumb, a FAQPage built from the page's own visible FAQ), and the
    consent/measurement script `site.js`.
Generated files: sitemap.xml, feed.xml, llms.txt (the preamble above the
first "## " is hand-written and kept), llms-full.txt, .lastmod.json.

Ported from the live site's build.py (adgent-website, 2026-10-03) on
2026-10-11: the generators and the audit() gate keep live's numbered checks
and add v2's own (13-17). Pages whose file name starts with `_` (the
component kit) are never built; `serve.py` renders them in memory.
"""
import datetime
import glob
import hashlib
import html as H
import io
import json
import os
import re
import struct
import sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.abspath(__file__))
PARTIALS = os.path.join(ROOT, "_partials")
BASE = "https://adgent.app"
BLOCKS = ("header", "drawer", "footer")
# active state is marked in these partials only (the footer stays neutral)
NAV_BLOCKS = ("header", "drawer")

PRODUCT = (
    "daily-verdict", "trust-gate", "change-ledger", "platform-change-log",
    "account-memory", "ground-truth", "agents", "specialists", "campaign-build",
    "planning", "dashboards", "meetings", "creative-intelligence", "ai-visibility", "features",
)
SOLUTIONS = (
    "for-agencies", "for-in-house", "ecommerce", "lead-generation",
    "travel-hospitality", "marketplaces", "local-multi-location", "mobile-apps",
    "security",
)
TOP = ("pricing", "blog", "about")

# slug -> (href to mark active, dropdown parent or None)
NAV = {s: ("/" + s, "product") for s in PRODUCT}
NAV.update({s: ("/" + s, "solutions") for s in SOLUTIONS})
NAV.update({s: ("/" + s, None) for s in TOP})

# The only page allowed to tell robots to stay away. Every other built page is
# production and must be indexable (audit check 13).
NOINDEX_OK = {"404"}

read = lambda p: io.open(p, encoding="utf-8").read()
write = lambda p, s: io.open(p, "w", encoding="utf-8").write(s)


def partial(name):
    return read(os.path.join(PARTIALS, name + ".html")).rstrip()


def is_article(html):
    return re.search(r'<meta property="og:type" content="article"', html) is not None


def nav_for(slug, html):
    """Blog articles light up Blog; everything else uses NAV."""
    if slug in NAV:
        return NAV[slug]
    if is_article(html):
        return ("/blog", None)
    return None


def mark_active(body, nav):
    if not nav:
        return body
    href, parent = nav
    body = re.sub(r'<a href="' + re.escape(href) + r'"(?=[ >])',
                  '<a href="' + href + '" class="active" aria-current="page"', body)
    if parent:
        body = body.replace('class="drop-t" data-drop="' + parent + '"',
                            'class="drop-t active" data-drop="' + parent + '"')
    return body


def digest(rel):
    """First 8 hex of the file's sha256, or None when the file does not exist."""
    path = os.path.join(ROOT, rel.lstrip("/"))
    if not os.path.exists(path):
        return None
    return hashlib.sha256(io.open(path, "rb").read()).hexdigest()[:8]


ASSET = re.compile(r'((?:href|src|poster)=")(/[^"?#]+\.(?:css|js|png|jpe?g|webp|avif|svg|gif|mp4|webm|woff2?))(\?v=[0-9a-f]+)?(")')
SRCSET = re.compile(r'(\bsrcset=")([^"]*)(")')


def stamp(html):
    """Content-stamp local code, media and responsive image candidates. Fonts
    are the exception: tokens.css names them unstamped in @font-face url(), and
    a preload only counts when its URL is byte-identical to the one the CSS
    requests, so a stamped preload made every page fetch each face twice.
    Faces are versioned by file name and sit under /assets (7d + SWR)."""
    def repl(m):
        h = None if m.group(2).endswith((".woff", ".woff2")) else digest(m.group(2))
        if not h:
            return m.group(1) + m.group(2) + m.group(4)
        return m.group(1) + m.group(2) + "?v=" + h + m.group(4)
    html = ASSET.sub(repl, html)

    def candidates(m):
        items = []
        for candidate in m.group(2).split(","):
            parts = candidate.strip().split()
            if parts and parts[0].startswith("/"):
                path = re.sub(r"\?v=[0-9a-f]+$", "", parts[0])
                h = digest(path)
                parts[0] = path + ("?v=" + h if h else "")
            items.append(" ".join(parts))
        return m.group(1) + ", ".join(items) + m.group(3)
    return SRCSET.sub(candidates, html)


# ------------------------------------------------------------ the derived head
# The live site's heads drifted because a <head> has no owner: on 2026-09-02
# half of them lacked og:locale, a feed link or an @id'd Organization. Here the
# hand-written part is the copy (title, description, og:title/description) and
# everything derivable from it is generated, so a new page inherits it.
SEO = re.compile(r"\n?<!--#seo-->.*?<!--/#seo-->", re.S)
FEED_TITLE = "The Adgent blog"
FEED_LINK = '<link rel="alternate" type="application/rss+xml" title="%s" href="/feed.xml"/>' % FEED_TITLE
# llms.txt is otherwise unreferenced from HTML (robots.txt only mentions it in a comment).
LLMS_LINK = '<link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt"/>'
CARDS = os.path.join(ROOT, "assets", "og", "_cards.json")

# The brand description is the owner's category decision (gtm/03 2026-10-14), cut to current scope.
ORG_DESCRIPTION = ("Adgent is the AI employee for enterprise growth teams. It carries confirmed "
                   "brand context, connected data, past decisions, reasoning and outcomes into each "
                   "analysis, report, dashboard and account move.")
ORGANIZATION = {
    "@type": "Organization",
    "@id": BASE + "/#organization",
    "name": "Adgent",
    "url": BASE,
    "logo": {"@type": "ImageObject", "url": BASE + "/assets/logo.svg"},
    "description": ORG_DESCRIPTION,
    "knowsAbout": ["AI media buying", "Meta Ads", "Google Ads", "ad account audits",
                   "performance marketing", "creative analysis", "AI search visibility"],
    "sameAs": ["https://www.linkedin.com/company/adgentapp/",
               "https://www.instagram.com/adgentapp/",
               "https://x.com/adgentapp",
               "https://www.youtube.com/@adgentapp"],
    "areaServed": ["TR", "Worldwide"],
    "email": "osman@adgent.app",
    "address": {"@type": "PostalAddress", "addressCountry": "TR"},
}
# The operator's legal name and phone belong to the page that states them (as on live), not to
# every page: they are the sole proprietor's own (the address stays unpublished by decision).
ORGANIZATION_LEGAL = {"business-information": {"legalName": "Osman Tıkna",
                                               "telephone": "+905309189544"}}
WEBSITE = {
    "@type": "WebSite",
    "@id": BASE + "/#website",
    "name": "Adgent",
    "alternateName": ["adgent.app", "Adgent: the AI employee for enterprise growth teams"],
    "url": BASE + "/",
    "inLanguage": "en",
    "publisher": {"@id": BASE + "/#organization"},
}
# One product entity, declared in full on the home, product and solution pages (live carried it on
# 16 of them). Every feature named here has its own page on the site and is live.
SOFTWARE = {
    "@type": "SoftwareApplication",
    "@id": BASE + "/#software",
    "name": "Adgent",
    "url": BASE + "/",
    "applicationCategory": "BusinessApplication",
    "applicationSubCategory": "Marketing",
    "operatingSystem": "Web",
    "description": ORG_DESCRIPTION,
    "image": BASE + "/assets/og/index.png",
    "featureList": [
        "Decisions across Meta and Google Ads, ranked by what each is worth, with the evidence under it",
        "Account moves prepared with supporting evidence and recorded in the Change Ledger",
        "Change Ledger: every applied change with the value it replaced",
        "Platform change log: edits made directly in Meta or Google Ads, recorded",
        "Account memory: the brand's rules and exceptions, explained once",
        "Read-only context from GA4, Search Console, Merchant Center and Google Drive",
        "Agents described in a sentence, run on a condition, an event or a schedule",
        "Ten built-in specialists, one lever each",
        "Campaign builds, plans and dashboards drafted end to end from one sentence",
        "Creative analysis: the hook, concept, format and angle of running ads",
        "AI Visibility: whether ChatGPT, Gemini, Google AI Mode and AI Overviews name a brand",
    ],
    "publisher": {"@id": BASE + "/#organization"},
}
SOFTWARE_PAGES = {"index", "why-adgent"} | set(PRODUCT) | (set(SOLUTIONS) - {"security"})
PAGE_TYPE = {
    "about": "AboutPage", "blog": "Blog", "tools": "CollectionPage",
    "break-even-roas-calculator": "WebApplication",
    "conversion-signal-check": "WebApplication",
}
# BlogPosting keywords + about, carried over from the live articles' JSON-LD (2026-10-11).
ARTICLE_TOPICS = {
    "11-11-vs-black-friday-turkey": ("11.11 vs Black Friday in Turkey, Singles Day Türkiye, November ecommerce statistics, Google Trends product searches, marketplace transactions", "11.11 and Black Friday in Türkiye"),
    "ai-media-buyer-for-agencies": ("ai tool for media buying agencies, ai media buyer agency, ai for ad agencies, agency reporting automation", "AI media buying for agencies"),
    "ai-media-buyer-vs-performance-max-vs-dashboard": ("ai media buyer vs performance max, performance max vs dashboard, ai media buyer comparison, platform ai vs ai media buyer", "AI media buying"),
    "attribution-window-day-one-data": ("meta ads attribution window, 7-day click attribution, day one ROAS, attribution lag, when to pause a campaign", "Ad platform attribution"),
    "can-ai-audit-your-ad-accounts": ("is there an ai that audits ad accounts, ai ad account audit, ai audit google ads, ai audit meta ads", "AI ad account audit"),
    "can-ai-run-your-ad-account": ("can ai manage google ads, can ai run ads, ai run ad account, ai manage meta ads", "AI ad account management"),
    "cbo-vs-abo-vs-advantage-plus": ("cbo vs abo, campaign budget optimization, ad set budget optimization, advantage plus vs manual, meta budget optimization 2026", "Meta budget optimization"),
    "cpm-is-the-early-creative-fatigue-signal": ("creative fatigue meta ads, ad frequency, CPM rising, when to refresh creative, ad fatigue signals", "Creative fatigue"),
    "cross-platform-comparability-meta-google": ("meta vs google ROAS, comparing ad platforms, attribution model differences, budget allocation across channels", "Comparing Meta and Google Ads results"),
    "google-ads-account-structure-2026": ("google ads account structure 2026, google ads campaign structure, single theme ad groups, how to structure google ads", "Google Ads account structure"),
    "google-ads-target-cpa-roas-change-2026": ("google ads target cpa change 2026, target roas change 2026, google ads bidding change, cpa rising google ads", "Google Ads Target CPA bidding change"),
    "how-much-ad-spend-is-wasted": ("wasted ad spend, reduce wasted ad spend, how much ad spend is wasted, recoverable ad spend, google ads waste", "Wasted ad spend"),
    "how-to-audit-a-google-ads-account": ("google ads account audit, ad account audit, audit google ads account, ppc audit checklist", "Google Ads account audit"),
    "how-to-audit-performance-max": ("performance max audit, pmax audit, performance max not converting, audit performance max campaign", "Performance Max audit"),
    "how-to-choose-an-ai-media-buying-tool": ("best ai media buyer tool, ai tools for performance marketers, ai tool for a media buying agency, ai media buying software", "AI media buying tools"),
    "meta-ads-account-audit-checklist": ("meta ads audit, facebook ads audit checklist, meta ads account audit, how to audit facebook ads", "Meta Ads account audit"),
    "meta-vs-google-ads-which-first": ("meta vs google ads, facebook vs google ads, which is better meta or google, meta or google ads first", "Meta Ads vs Google Ads"),
    "performance-max-brand-cannibalization": ("performance max brand cannibalization, pmax branded search, exclude brand performance max", "Performance Max brand cannibalization"),
    "performance-max-not-spending-budget": ("performance max not spending budget, pmax not spending, performance max low traffic, pmax budget not spent", "Performance Max budget pacing"),
    "placement-drift-the-leak-in-the-average": ("placement drift, advantage plus placements, blended ROAS, audience network performance, meta ads placement breakdown", "Meta Ads placements"),
    "scale-a-winner-without-breaking-it": ("scaling meta ads, learning phase reset, budget increase meta ads, horizontal vs vertical scaling", "Scaling Meta Ads"),
    "what-is-an-ai-media-buyer": ("ai media buyer, ai media buying, ai ad account audit, ai marketing agent for ad accounts", "AI media buying"),
    "why-adgent-leads-with-the-verdict": ("conclusion first reporting, marketing dashboard problem, ad reporting design, decision-ready reporting", "Decision-first ad reporting"),
    "why-did-my-cpa-jump": ("cpa suddenly increased, cpa spike, why did my cpa go up, cost per acquisition jumped", "Cost per acquisition"),
    "why-is-my-meta-roas-dropping": ("why is my meta roas dropping, meta ads roas drop, roas dropping when scaling, meta roas diagnosis", "Meta ROAS diagnosis"),
}


def head_of(html):
    return html.split("</head>", 1)[0]


def head_meta(head, name):
    """Text of a hand-written head field, unescaped. `name` is title|description|og:*."""
    if name == "title":
        m = re.search(r"<title>(.*?)</title>", head, re.S)
    elif name.startswith("og:"):
        m = re.search(r'<meta property="%s" content="([^"]*)"' % re.escape(name), head)
    else:
        m = re.search(r'<meta name="%s" content="([^"]*)"' % re.escape(name), head)
    return H.unescape(re.sub(r"\s+", " ", m.group(1)).strip()) if m else ""


def esc(s):
    """Attribute-safe: every value sits in double quotes, so apostrophes stay readable."""
    return H.escape(s, quote=False).replace('"', "&quot;")


def canonical(slug):
    return BASE + "/" if slug == "index" else BASE + "/" + slug


def cards():
    try:
        return json.loads(read(CARDS))
    except (OSError, ValueError):
        return {}


def text_of(fragment):
    t = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", H.unescape(t)).strip()


def main_of(html):
    m = re.search(r"<main\b[^>]*>(.*?)</main>", html, re.S)
    return m.group(1) if m else ""


class FAQParser(HTMLParser):
    """Extract fields inside one details item in the site's .qa container."""
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input",
            "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self, source):
        super().__init__(convert_charrefs=False)
        self.source = source
        self.offsets = [0]
        for line in source.splitlines(keepends=True):
            self.offsets.append(self.offsets[-1] + len(line))
        self.stack = []
        self.item = None
        self.field = None
        self.pairs = []
        self.spans = []

    def source_position(self):
        line, column = self.getpos()
        return self.offsets[line - 1] + column

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in self.VOID:
            return
        classes = set(attrs.get("class", "").split())
        in_qa = any("qa" in entry[1] for entry in self.stack)
        self.stack.append((tag, classes))
        depth = len(self.stack)
        if tag == "details" and in_qa and self.item is None:
            self.item = {"depth": depth, "start": self.source_position(), "q": "", "a": ""}
        elif self.item and depth == self.item["depth"] + 1:
            field = "q" if tag == "summary" else "a" if "a" in classes else None
            if field:
                self.field = (field, depth, self.source_position() + len(self.get_starttag_text()))

    def handle_startendtag(self, tag, attrs):
        if tag not in self.VOID:
            self.handle_starttag(tag, attrs)
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if not self.stack or tag != self.stack[-1][0]:
            return
        depth = len(self.stack)
        if self.field and self.field[1] == depth:
            key, _, start = self.field
            self.item[key] = self.source[start:self.source_position()]
            self.field = None
        if self.item and self.item["depth"] == depth:
            q, a = self.item["q"], self.item["a"]
            if q and a:
                self.pairs.append((q, a))
                self.spans.append((self.item["start"], self.source_position() + len("</details>")))
            self.item = None
        self.stack.pop()


# A link that is the whole last sentence of an answer ("... you approve first. Trust Gate") is a
# signpost for the reader, not part of the answer; quoted verbatim by an answer engine it reads as
# a stray label. The `.go` arrow links are signposts wherever they sit.
GO_LINK = re.compile(r'<a\b[^>]*\bclass="[^"]*\bgo\b[^"]*"[^>]*>.*?</a>', re.S)
TRAILING_LINK = re.compile(r'(?<=[.?!])\s*<a\b[^>]*>(?:(?!</a>).)*</a>\s*\.?\s*$', re.S)


def faq(html):
    """(question, answer) pairs from the page's own visible FAQ, so the
    structured data can never claim an answer the page does not show."""
    parser = FAQParser(main_of(html))
    parser.feed(parser.source)
    return [(text_of(q), text_of(TRAILING_LINK.sub("", GO_LINK.sub(" ", a)).strip()))
            for q, a in parser.pairs]


def _date(text):
    for fmt in ("%d %B %Y", "%d %b %Y"):
        try:
            return datetime.datetime.strptime(text.strip(), fmt).date().isoformat()
        except ValueError:
            pass
    return None


def article_meta(html):
    """Published / Updated / Topic from the article's visible meta list."""
    def dd(label):
        m = re.search(r"<dt>%s</dt>\s*<dd>(.*?)</dd>" % label, html, re.S)
        return text_of(m.group(1)) if m else ""
    published = _date(dd("Published") or "")
    updated = _date(dd("Updated") or "") or published
    return published, updated, dd("Topic")


def short_name(head):
    """og:title without the brand, for breadcrumbs and JSON-LD names."""
    t = head_meta(head, "og:title") or head_meta(head, "title")
    return re.sub(r"^Adgent · |\s*· Adgent$", "", t)


def card_url(slug):
    rel = "/assets/og/%s.png" % slug
    h = digest(rel)
    return BASE + rel + ("?v=" + h if h else ""), h is not None


def defined_term(html):
    """The article's own visible definition box (<div class="ar-note"><b>Definition</b> An
    <strong>term</strong> is ...</div>), as a DefinedTerm; None when the page has none."""
    m = re.search(r'<div class="ar-note">\s*<b>Definition</b>(.*?)</div>', main_of(html), re.S)
    if not m:
        return None
    term = re.search(r"<strong>(.*?)</strong>", m.group(1), re.S)
    if not term:
        return None
    return text_of(term.group(1)), text_of(m.group(1))


def structured_data(slug, html, head):
    url = canonical(slug)
    desc = head_meta(head, "description")
    name = short_name(head)
    image = card_url(slug)[0].split("?", 1)[0]
    org, site = {"@id": BASE + "/#organization"}, {"@id": BASE + "/#website"}
    software = {"@id": BASE + "/#software"}
    graph = []
    if slug in SOFTWARE_PAGES:
        graph.append(SOFTWARE)
    if slug == "index":
        graph.append({"@type": "WebPage", "@id": url, "url": url,
                      "name": head_meta(head, "title"), "description": desc,
                      "isPartOf": site, "about": software, "inLanguage": "en"})
    elif is_article(html):
        published, updated, section = article_meta(html)
        node = {"@type": "BlogPosting", "headline": name, "description": desc,
                "image": [image], "url": url, "mainEntityOfPage": {"@type": "WebPage", "@id": url},
                "author": org, "publisher": org, "isPartOf": site, "inLanguage": "en",
                "wordCount": len(page_text(html).split())}
        if published:
            node["datePublished"] = published
            node["dateModified"] = updated
        if section:
            node["articleSection"] = section
        if slug in ARTICLE_TOPICS:
            keywords, about = ARTICLE_TOPICS[slug]
            node["keywords"] = keywords
            node["about"] = {"@type": "Thing", "name": about}
        graph.append(node)
        term = defined_term(html)
        if term:
            graph.append({"@type": "DefinedTerm", "@id": url + "#definition", "name": term[0],
                          "description": term[1], "url": url,
                          "inDefinedTermSet": {"@type": "DefinedTermSet",
                                               "name": "Performance marketing glossary"}})
    else:
        kind = PAGE_TYPE.get(slug, "WebPage")
        node = {"@type": kind, "@id": url, "url": url, "name": name,
                "description": desc, "isPartOf": site, "inLanguage": "en"}
        if kind == "AboutPage":
            node["about"] = org
        elif kind == "WebApplication":
            node.update({"applicationCategory": "BusinessApplication",
                         "operatingSystem": "Web",
                         "browserRequirements": "Requires JavaScript",
                         "isAccessibleForFree": True,
                         "publisher": org})
        else:
            node["publisher"] = org
            if slug in SOFTWARE_PAGES:
                node["about"] = software
        graph.append(node)
    if slug != "index":
        crumbs = [("Home", BASE + "/")]
        if is_article(html):
            crumbs.append(("Blog", BASE + "/blog"))
        crumbs.append((name, url))
        graph.append({"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": u}
            for i, (n, u) in enumerate(crumbs)]})
    qa = faq(html)
    if qa:
        graph.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in qa]})
    graph += [dict(ORGANIZATION, **ORGANIZATION_LEGAL.get(slug, {})), WEBSITE]
    doc = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    # never let page text close the script element early
    return doc.replace("</", "<\\/")


THEME_COLOR = '<meta name="theme-color" content="#F6F5F4"/>'  # --paper, the top bar once scrolled
# Raster fallbacks for the SVG favicon each page links by hand: Safari, iOS home screens and
# most link unfurlers ignore SVG icons and probe /favicon.ico or /apple-touch-icon.png. Both
# files are the brand tile (`assets/brand/favicon-*.png`, `apple-touch-icon-180.png`).
ICON_LINKS = "\n".join([
    '<link rel="icon" href="/favicon.ico" sizes="32x32"/>',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png"/>',
])
# Articles set their body in Switzer 500 (headings) and 600 (<strong>) as well as 400: without
# these the late swap reflows the column (CLS 0.087 measured on 2026-10-11, culprit div.ar-col).
ARTICLE_FONTS = "\n".join(
    '<link rel="preload" href="/assets/fonts/switzer-%s.woff2" as="font" type="font/woff2" crossorigin/>' % w
    for w in ("500", "600"))


def seo_block(slug, html):
    head = head_of(html)
    site_js = '<script src="/site.js" defer></script>'
    if "noindex" in head:
        return "<!--#seo-->\n" + THEME_COLOR + "\n" + ICON_LINKS + "\n" + site_js + "\n<!--/#seo-->"
    og_title, og_desc = head_meta(head, "og:title"), head_meta(head, "og:description")
    img, _ = card_url(slug)
    alt = cards().get(slug, {}).get("alt") or og_title
    rows = [
        THEME_COLOR,
        ICON_LINKS,
        '<meta property="og:locale" content="en_US"/>',
        '<meta property="og:url" content="%s"/>' % canonical(slug),
        '<meta property="og:image" content="%s"/>' % img,
        '<meta property="og:image:width" content="1200"/>',
        '<meta property="og:image:height" content="630"/>',
        '<meta property="og:image:alt" content="%s"/>' % esc(alt),
    ]
    if is_article(html):
        published, updated, section = article_meta(html)
        if published:
            rows.append('<meta property="article:published_time" content="%s"/>' % published)
            rows.append('<meta property="article:modified_time" content="%s"/>' % updated)
        if section:
            rows.append('<meta property="article:section" content="%s"/>' % esc(section))
    rows += [
        '<meta name="twitter:card" content="summary_large_image"/>',
        '<meta name="twitter:title" content="%s"/>' % esc(og_title),
        '<meta name="twitter:description" content="%s"/>' % esc(og_desc),
        '<meta name="twitter:image" content="%s"/>' % img,
        FEED_LINK,
        LLMS_LINK,
    ]
    if is_article(html):
        rows.append(ARTICLE_FONTS)
    rows += [
        '<script type="application/ld+json">%s</script>' % structured_data(slug, html, head),
        site_js,
    ]
    return "<!--#seo-->\n" + "\n".join(rows) + "\n<!--/#seo-->"


def with_seo(slug, html):
    head_end = html.find("</head>")
    if head_end == -1:
        return html
    html = SEO.sub("", html[:head_end]) + html[head_end:]
    block = seo_block(slug, html)
    head_end = html.find("</head>")
    # beside the hand-written og:* it derives from; else at the end of the head
    anchor = re.search(r'<meta property="og:description"[^>]*/?>', html[:head_end])
    if anchor:
        return html[:anchor.end()] + "\n" + block + html[anchor.end():]
    return html[:head_end] + block + "\n" + html[head_end:]


def render(path):
    html = read(path)
    slug = os.path.basename(path)[:-5]
    # The preview server also routes the artwork template here. Never inject
    # website consent/measurement into a screenshot source.
    if os.path.abspath(path) == os.path.join(ROOT, "assets", "og", "_card.html"):
        return stamp(html)
    nav = nav_for(slug, html)
    for b in BLOCKS:
        body = partial(b)
        if b in NAV_BLOCKS:
            body = mark_active(body, nav)
        pat = r"<!--#" + b + r"-->.*?<!--/#" + b + r"-->"
        repl = "<!--#" + b + "-->" + body + "<!--/#" + b + "-->"
        if re.search(pat, html, re.S):
            html = re.sub(pat, lambda _m: repl, html, flags=re.S)
    return stamp(with_seo(slug, with_forms(slug, html)))


# ------------------------------------------------------------ lead forms: the no-JS path
# Every lead form (form.qf, form.form) is a plain HTML POST to Web3Forms before app.js touches it:
# if the script fails or has not run yet, the browser posts the lead instead of putting the email
# into a GET URL. Web3Forms redirects back (same domain, allowed on the free plan) to #sent-N, and
# app.css shows the form's own confirmation through :target. app.js enhances the same fields into
# a fetch (FormData, no preflight) and drops `redirect`.
W3F_POST = "https://api.web3forms.com/submit"
W3F_KEY = "50ac3d40-6932-476d-9d23-b6ee1b94f91f"
FORM_OPEN = re.compile(r'<form\b([^>]*)>(\s*<!--#w3f-->.*?<!--/#w3f-->)?', re.S)


def audit_form(attrs):
    m = re.search(r'\bclass="([^"]*)"', attrs)
    kinds = set(m.group(1).split()) & {"qf", "form"} if m else set()
    return sorted(kinds)[0] if kinds else None


def with_forms(slug, html):
    n = [0]
    page = canonical(slug)

    def repl(m):
        kind = audit_form(m.group(1))
        if not kind:
            return m.group(0)
        n[0] += 1
        attrs = re.sub(r'\s(?:method|action)="[^"]*"', "", m.group(1))
        talk = re.search(r'\bclass="[^"]*\btalk\b', attrs)
        demo = re.search(r'\bclass="[^"]*\bdemo\b', attrs)
        sales = re.search(r'\bclass="[^"]*\bsales\b', attrs)
        subject = "Adgent sales request · " if sales else (
            "Adgent conversation request · " if talk else (
                "Adgent demo request · " if demo else "Adgent sales request · "))
        hidden = [("access_key", W3F_KEY),
                  ("subject", subject + ("home" if slug == "index" else slug)),
                  ("from_name", "Adgent website"),
                  ("page", page),
                  ("form_location", "%s/%s-%d" % (slug, kind, n[0])),
                  ("redirect", "%s#sent-%d" % (page, n[0]))]
        block = ('<!--#w3f--><span class="w3f-sent" id="sent-%d"></span>' % n[0]
                 + "".join('<input type="hidden" name="%s" value="%s"/>' % (k, esc(v)) for k, v in hidden)
                 + '<span class="hp" aria-hidden="true"><input type="checkbox" name="botcheck" '
                   'tabindex="-1" autocomplete="off"/></span><!--/#w3f-->')
        return '<form%s method="post" action="%s">%s' % (attrs, W3F_POST, block)
    return FORM_OPEN.sub(repl, html)


def pages():
    for p in sorted(glob.glob(os.path.join(ROOT, "*.html"))):
        if not os.path.basename(p).startswith("_"):
            yield p


def slug_of(path):
    return os.path.basename(path)[:-5]


# ------------------------------------------------------------ site.js -> consent.css
SITE_JS = os.path.join(ROOT, "site.js")
CONSENT_REF = re.compile(r"(['\"]/consent\.css)(\?v=[0-9a-f]+)?(['\"])")


def stamp_site_js(check_only=False):
    """site.js loads /consent.css itself; stamp that URL with the stylesheet's
    hash so a changed theme is a changed URL (and therefore a changed site.js,
    whose own stamp every page carries)."""
    if not os.path.exists(SITE_JS):
        return 0
    src = read(SITE_JS)
    h = digest("/consent.css")
    out = CONSENT_REF.sub(lambda m: m.group(1) + ("?v=" + h if h else "") + m.group(3), src)
    if out == src:
        return 0
    if check_only:
        print("SITE.JS STALE: the /consent.css stamp is out of date")
        return 1
    write(SITE_JS, out)
    return 0


# ------------------------------------------------------------ sitemap.xml
_PRIO = {"": "1.0", "features": "0.9", "pricing": "0.8", "blog": "0.8",
         "for-agencies": "0.8", "for-in-house": "0.8", "why-adgent": "0.8",
         "tools": "0.8", "break-even-roas-calculator": "0.8",
         "conversion-signal-check": "0.8", "about": "0.6", "security": "0.4",
         "data-use": "0.4", "data-deletion": "0.3", "business-information": "0.3",
         "privacy": "0.3", "terms": "0.3"}
_PRIO.update({s: "0.9" for s in PRODUCT if s != "features"})
_freq = lambda s: "weekly" if s in ("", "blog") else \
    ("yearly" if s in ("privacy", "terms", "security", "data-use", "data-deletion",
                       "business-information") else "monthly")


def indexable(html):
    return "noindex" not in head_of(html).lower()


def _lastmods(rendered, persist=True):
    """Per-page lastmod that only moves when the page's own content changes.
    Only <main> is hashed, with asset stamps stripped: a CSS edit, a header or
    footer change or a schema change is not a content change, and a blanket
    bump teaches crawlers to ignore the signal. An article's lastmod is its own
    visible Updated (else Published) date, the same one its dateModified carries.
    State is .lastmod.json {slug: {"main": sha1, "date": iso}}. Entries from the
    whole-document era carry "sha" instead of "main": their date is kept and the
    hash is re-recorded, so the scope change itself bumps nothing."""
    state_path = os.path.join(ROOT, ".lastmod.json")
    try:
        state = json.loads(read(state_path))
    except (OSError, ValueError):
        state = {}
    today = datetime.date.today().isoformat()
    out, dirty = {}, False
    for slug, html in rendered.items():
        if is_article(html) and article_meta(html)[1]:
            out[slug] = article_meta(html)[1]
            continue
        body = re.sub(r"\?v=[0-9a-f]+", "", main_of(html))
        sha = hashlib.sha1(body.encode("utf-8")).hexdigest()
        prev = state.get(slug) or {}
        if prev.get("main") == sha:
            out[slug] = prev["date"]
            continue
        out[slug] = prev["date"] if "sha" in prev and prev.get("date") else today
        state[slug] = {"main": sha, "date": out[slug]}
        dirty = True
    if dirty and persist:
        write(state_path, json.dumps(state, indent=1, sort_keys=True) + "\n")
    return out


def public(rendered):
    """Slugs that belong on the crawler surfaces: indexable, index first."""
    slugs = [s for s, h in rendered.items() if indexable(h)]
    return ["index"] + sorted(s for s in slugs if s != "index") if "index" in slugs else sorted(slugs)


def sitemap_xml(rendered, persist):
    dates = _lastmods(rendered, persist)
    rows = []
    for slug in public(rendered):
        path = "" if slug == "index" else slug
        rows.append("  <url><loc>%s/%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq>"
                    "<priority>%s</priority></url>"
                    % (BASE, path, dates[slug], _freq(path), _PRIO.get(path, "0.7")))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
            + "\n".join(rows) + "\n</urlset>\n")


# ------------------------------------------------------------ feed.xml
def ld_graph(html):
    out = []
    for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>',
                            head_of(html), re.S):
        doc = json.loads(block)
        out += doc.get("@graph", [doc])
    return out


def articles(rendered):
    """(slug, title, description, datePublished, dateModified) for every BlogPosting,
    most recently modified first. Top-level @graph nodes only: a nested node
    describes something else."""
    out = []
    for slug, html in rendered.items():
        if not indexable(html):
            continue
        for node in ld_graph(html):
            if node.get("@type") == "BlogPosting" and node.get("datePublished"):
                out.append((slug, node["headline"], node["description"], node["datePublished"],
                            node.get("dateModified") or node["datePublished"]))
                break
    return sorted(out, key=lambda r: (r[4], r[3], r[0]), reverse=True)


def feed_xml(rendered):
    x = lambda s: s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    rfc = lambda d: datetime.datetime.strptime(d, "%Y-%m-%d").strftime("%a, %d %b %Y 12:00:00 +0000")
    items = articles(rendered)
    rows = ["    <item>\n"
            "      <title>%s</title>\n"
            "      <link>%s/%s</link>\n"
            '      <guid isPermaLink="true">%s/%s</guid>\n'
            "      <pubDate>%s</pubDate>\n"
            "      <description>%s</description>\n"
            "    </item>" % (x(t), BASE, s, BASE, s, rfc(d), x(desc))
            for s, t, desc, d, _ in items]
    newest = max(r[4] for r in items) if items else datetime.date.today().isoformat()
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n'
            "  <channel>\n"
            "    <title>%s</title>\n"
            "    <link>%s/blog</link>\n"
            "    <description>Field notes on Meta and Google Ads: diagnostics, audits and honest "
            "reads on what the numbers mean.</description>\n"
            "    <language>en-us</language>\n"
            "    <lastBuildDate>%s</lastBuildDate>\n"
            '    <atom:link href="%s/feed.xml" rel="self" type="application/rss+xml"/>\n'
            "%s\n"
            "  </channel>\n</rss>\n") % (FEED_TITLE, BASE, rfc(newest), BASE, "\n".join(rows))


# ------------------------------------------------------------ llms.txt / llms-full.txt
LLMS_GROUPS = [
    ("Product", ["index", "features", "why-adgent", "pricing"]),
    ("Run the accounts", ["daily-verdict", "trust-gate", "change-ledger",
                          "platform-change-log", "account-memory", "ground-truth"]),
    ("Build and automate", ["agents", "specialists", "campaign-build", "planning",
                            "dashboards", "meetings", "creative-intelligence", "ai-visibility"]),
    ("By team", ["for-agencies", "for-in-house"]),
    ("By industry", ["ecommerce", "lead-generation", "travel-hospitality",
                     "marketplaces", "local-multi-location", "mobile-apps"]),
    ("Free tools", ["tools", "break-even-roas-calculator", "conversion-signal-check"]),
    ("Company", ["about", "blog", "security", "data-use", "data-deletion",
                 "business-information", "privacy", "terms"]),
]


def llms_order(rendered):
    """Grouped slugs first, then every other public page under Articles."""
    pub = public(rendered)
    groups, seen = [], set()
    for heading, slugs in LLMS_GROUPS:
        rows = [s for s in slugs if s in pub]
        seen.update(rows)
        if rows:
            groups.append((heading, rows))
    rest = sorted(s for s in pub if s not in seen)
    if rest:
        groups.append(("Articles", rest))
    return groups


def llms_txt(rendered):
    path = os.path.join(ROOT, "llms.txt")
    cur = read(path) if os.path.exists(path) else "# Adgent\n"
    preamble = cur.split("\n## ", 1)[0].rstrip()
    out = [preamble, ""]
    for heading, slugs in llms_order(rendered):
        out += ["## " + heading, ""]
        for s in slugs:
            head = head_of(rendered[s])
            out.append("- [%s](%s): %s" % (head_meta(head, "title"), canonical(s),
                                            head_meta(head, "description")))
        out.append("")
    return "\n".join(out).rstrip() + "\n"


def page_text(html):
    body = main_of(html) or html
    body = re.sub(r"<(script|style|svg|template)\b.*?</\1>", " ", body, flags=re.S | re.I)
    # a visible FAQ reads as question and answer
    parser = FAQParser(body)
    parser.feed(body)
    for (start, end), (q, a) in reversed(list(zip(parser.spans, parser.pairs))):
        body = body[:start] + "<p>Q: %s</p><p>A: %s</p>" % (q, a) + body[end:]
    # elements with no text (icons, drawn letters) vanish without leaving a space, as in the DOM's
    # text: "a<span class=dd aria-hidden=true><span class=d></span></span>gent" reads "agent"
    n = 1
    while n:
        body, n = re.subn(r"<(span|i|b|em|s|small|strong)\b[^>]*>\s*</\1>", "", body)
    body = re.sub(r"<[^>]*\baria-hidden=\"true\"[^>]*>\s*</[a-z]+>", "", body)
    body = re.sub(r"</(p|li|h[1-6]|div|section|tr|dd|dt|summary|figcaption|blockquote)>", "\n", body, flags=re.I)
    body = re.sub(r"<br\s*/?>", "\n", body, flags=re.I)
    body = H.unescape(re.sub(r"<[^>]+>", " ", body))
    lines = [re.sub(r"[ \t\u00a0]+", " ", l).strip() for l in body.split("\n")]
    return "\n".join(l for l in lines if l)


def llms_full_txt(rendered):
    out = ["# Adgent: full text", "",
           "> Every public page of adgent.app as plain text, generated at build time so it",
           "> cannot drift from the site. Source of truth is the HTML.", ""]
    for _, slugs in llms_order(rendered):
        for s in slugs:
            out += ["", "---", "", "# %s" % head_meta(head_of(rendered[s]), "title"),
                    "URL: %s" % canonical(s), "", page_text(rendered[s])]
    return "\n".join(out).rstrip() + "\n"


# ------------------------------------------------------------ audit()
def _ld_nodes(value):
    """Every dict in a JSON-LD document, nested ones included."""
    if isinstance(value, list):
        for item in value:
            yield from _ld_nodes(item)
    elif isinstance(value, dict):
        yield value
        for item in value.values():
            yield from _ld_nodes(item)


# Arial advance widths in 1/1000 em (live build.py, verified against Chrome's
# canvas.measureText). Google truncates SERP titles (~20px Arial) and
# descriptions (~14px) on width, not on character count.
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
    return round(sum(_ADVANCE.get(ch, 556) for ch in text) * size / 1000)


def png_size(path):
    """(width, height) from a PNG's IHDR, or None when the bytes are not a PNG.
    The browser tool's screenshot is a downscaled WebP; written to a .png name
    it passes every check but this one (live SITE.md, OG cards)."""
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n" or head[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", head[16:24])


# Every URL the live site (adgent.app, deployed from adgent-website @ ea1961a)
# serves or has served as a page: its sitemap on 2026-10-03, plus the pages it
# kept out of the sitemap and the redirect it already had. Each must answer on
# v2 as a page or as a redirect to one (check 12). /tr/* is deliberately
# absent: it has 404ed by decision since 2026-08-01 (live SITE.md).
LIVE_URLS = (
    "/", "/about", "/account-memory", "/ai-media-buyer-for-agencies",
    "/ai-media-buyer-vs-performance-max-vs-dashboard", "/attribution-window-day-one-data",
    "/blog", "/break-even-roas-calculator", "/built-from-chat", "/business-information",
    "/can-ai-audit-your-ad-accounts", "/can-ai-run-your-ad-account", "/cbo-vs-abo-2026",
    "/cbo-vs-abo-vs-advantage-plus", "/change-ledger", "/conversion-signal-check",
    "/cpm-is-the-early-creative-fatigue-signal", "/creative-intelligence",
    "/cross-platform-comparability-meta-google", "/daily-verdict", "/data-deletion",
    "/data-use", "/ecommerce", "/features", "/for-agencies", "/for-in-house",
    "/google-ads-account-structure-2026", "/google-ads-target-cpa-roas-change-2026",
    "/ground-truth", "/how-much-ad-spend-is-wasted", "/how-to-audit-a-google-ads-account",
    "/how-to-audit-performance-max", "/how-to-choose-an-ai-media-buying-tool",
    "/lead-generation", "/local-multi-location", "/marketplaces",
    "/meta-ads-account-audit-checklist", "/meta-vs-google-ads-which-first", "/mobile-apps",
    "/performance-max-brand-cannibalization", "/performance-max-not-spending-budget",
    "/placement-drift-the-leak-in-the-average", "/pricing", "/privacy",
    "/scale-a-winner-without-breaking-it", "/security", "/terms", "/tools",
    "/travel-hospitality", "/trust-gate", "/what-is-an-ai-media-buyer",
    "/why-adgent-leads-with-the-verdict", "/why-adgent", "/why-did-my-cpa-jump",
    "/why-is-my-meta-roas-dropping",
    # live, outside the sitemap
    "/blog-post", "/index-demo-lab", "/demo", "/media-planning",
)


def audit(rendered):
    """Invariants the partials can't enforce, run on the rendered pages."""
    problems = []
    vercel = json.loads(read(os.path.join(ROOT, "vercel.json")))
    site_js = read(SITE_JS) if os.path.exists(SITE_JS) else ""
    titles, descs, seen_cards = {}, {}, {}
    page_slugs = set(rendered)

    for slug, html in rendered.items():
        rel = slug + ".html"
        head = head_of(html)
        index_ok = indexable(html)

        # 1. single-locale site: nothing should advertise a translation
        if re.search(r'<link rel="alternate"[^>]*hreflang=', head):
            problems.append(f"{rel}: hreflang alternate on a single-locale site")
        if 'href="/tr/' in html or 'href="/tr"' in html:
            problems.append(f"{rel}: links to /tr/, which no longer exists")

        # 2. the page's language must be English
        m = re.search(r'<html lang="([a-z-]+)"', html)
        if not m or m.group(1) != "en":
            problems.append(f"{rel}: <html lang> is not en")

        # 3. canonical must be self-referencing
        m = re.search(r'<link rel="canonical" href="([^"]+)"', head)
        if index_ok and (not m or m.group(1) != canonical(slug)):
            problems.append(f"{rel}: canonical {m.group(1) if m else 'missing'}, expected {canonical(slug)}")

        # 4. an internal link must point at a page that exists (extension-less paths only)
        for href in set(re.findall(r'href="(/[^"#?.]*)"', html)):
            target = "index" if href == "/" else href.strip("/")
            if target not in page_slugs:
                problems.append(f"{rel}: links to {href}, which has no page")

        # 5. measurement is owned by site.js and must never appear in page HTML
        if "googletagmanager.com" in html or "gtag(" in html or "google-analytics.com" in html:
            problems.append(f"{rel}: analytics bypasses the consent gate")
        if not re.search(r'<script src="/site\.js\?v=[0-9a-f]+" defer></script>', head):
            problems.append(f"{rel}: site.js (consent + measurement) not loaded from <head>")

        # 6. SEO/GEO head invariants, measured the way Google truncates
        if index_ok:
            title, desc = head_meta(head, "title"), head_meta(head, "description")
            if not desc:
                problems.append(f"{rel}: no meta description")
            if "max-snippet:-1" not in head:
                problems.append(f"{rel}: robots meta without max-snippet:-1")
            for need in ("og:type", "og:title", "og:description"):
                if not head_meta(head, need):
                    problems.append(f"{rel}: no {need}")
            if "og:image:alt" not in head or "og:locale" not in head or "twitter:card" not in head:
                problems.append(f"{rel}: generated <!--#seo--> block missing")
            w = serp_px(title, 20)
            if w > 600:
                problems.append(f"{rel}: title is {w}px, over the 600px SERP cap")
            w = serp_px(desc, 14)
            if w > 985:
                problems.append(f"{rel}: meta description is {w}px, over the 985px cap")
            if 'href="/feed.xml"' not in head:
                problems.append(f"{rel}: no rel=alternate link to /feed.xml")
            # unique copy per page (v2)
            if title in titles:
                problems.append(f"{rel}: title duplicates {titles[title]}")
            if desc in descs:
                problems.append(f"{rel}: description duplicates {descs[desc]}")
            titles.setdefault(title, rel)
            descs.setdefault(desc, rel)
        if "fonts.googleapis.com" in head or "fonts.gstatic.com" in head:
            problems.append(f"{rel}: webfont loaded from a third-party origin")
        if "/tokens.css" not in head:
            problems.append(f"{rel}: tokens stylesheet not linked from <head>")
        # no em dash in anything the head says (owner ban, 2026-10)
        if "\u2014" in H.unescape(SEO.sub("", head)) or "&mdash;" in head:
            problems.append(f"{rel}: em dash in the <head>")

        # 9. one brand entity: @id on Organization/WebSite, declared once per document
        for block in re.findall(r'<script type="application/ld\+json">(.*?)</script>', head, re.S):
            try:
                doc = json.loads(block)
            except ValueError as e:
                problems.append(f"{rel}: JSON-LD does not parse ({e})")
                continue
            ents = (BASE + "/#organization", BASE + "/#website")
            full, refs = {}, set()
            for node in _ld_nodes(doc):
                t = node.get("@type")
                want = BASE + "/#organization" if t == "Organization" and str(
                    node.get("url", BASE)).rstrip("/") == BASE else \
                    BASE + "/#website" if t == "WebSite" else None
                if want and node.get("@id") != want:
                    problems.append(f"{rel}: {t} node without @id {want}")
                nid = node.get("@id")
                if nid in ents:
                    if set(node) == {"@id"}:
                        refs.add(nid)
                    else:
                        full[nid] = full.get(nid, 0) + 1
            for nid, count in sorted(full.items()):
                if count > 1:
                    problems.append(f"{rel}: {nid} declared {count}x")
            for nid in sorted(refs - set(full)):
                problems.append(f"{rel}: bare @id ref {nid} is declared nowhere on the page")

        # 10. one social card per page: exists, real 1200x630 PNG, stamped, unique
        if index_ok:
            m = re.search(r'<meta property="og:image" content="https://adgent\.app(/[^"?]+)(\?v=[0-9a-f]+)?"', head)
            if not m:
                problems.append(f"{rel}: no og:image")
            else:
                card, path = m.group(1), os.path.join(ROOT, m.group(1).lstrip("/"))
                if not os.path.exists(path):
                    problems.append(f"{rel}: og:image {card} does not exist")
                else:
                    if not m.group(2):
                        problems.append(f"{rel}: og:image {card} is unstamped")
                    if png_size(path) != (1200, 630):
                        problems.append(f"{rel}: og:image {card} is not a 1200x630 PNG")
                if card in seen_cards:
                    problems.append(f"{rel}: og:image {card} is already used by {seen_cards[card]}")
                seen_cards[card] = rel

        # 13. production pages are indexable; only the 404 stays out
        if index_ok and slug in NOINDEX_OK:
            problems.append(f"{rel}: must be noindex")
        if not index_ok and slug not in NOINDEX_OK:
            problems.append(f"{rel}: noindex on a production page")

        # 14. structured data matches the page: articles carry a dated
        #     BlogPosting; a FAQPage exists exactly when the page shows a FAQ
        if index_ok:
            nodes = ld_graph(html)
            if is_article(html) and not any(
                    n.get("@type") == "BlogPosting" and n.get("datePublished") for n in nodes):
                problems.append(f"{rel}: article without a dated BlogPosting (Published date not found)")
            visible_faq = faq(html)
            faq_nodes = [n for n in nodes if n.get("@type") == "FAQPage"]
            schema_faq = [(q.get("name"), q.get("acceptedAnswer", {}).get("text"))
                          for node in faq_nodes for q in node.get("mainEntity", [])]
            if schema_faq != visible_faq or len(faq_nodes) != bool(visible_faq):
                problems.append(f"{rel}: FAQPage question/answer pairs do not match the visible FAQ")

        # 16. every lead form posts to Web3Forms without JS (never a GET with the email in the URL)
        for attrs, block in FORM_OPEN.findall(html):
            if audit_form(attrs) and ('method="post"' not in attrs or W3F_POST not in attrs
                                      or 'name="access_key"' not in block):
                problems.append(f"{rel}: lead form without the no-JS Web3Forms POST")

    # the homepage carries Meta's domain verification in its static head
    if 'name="facebook-domain-verification"' not in head_of(rendered.get("index", "")):
        problems.append("index.html: facebook-domain-verification meta is missing")

    # 7. measurement paths wired end to end: site.js <-> vercel.json rewrites
    rewrites = {r["source"]: r["destination"] for r in vercel.get("rewrites", [])}
    sources = re.findall(r"script\.src = '([^']+)'", site_js)
    if not sources:
        problems.append("site.js: no measurement script source at all")
    for src in sources:
        if not src.startswith("/"):
            problems.append(f"site.js: {src} is not a first-party path")
            continue
        if not re.fullmatch(r"https://[a-z0-9-]+\.fps\.goog/[a-z]+/", rewrites.get(src, "")):
            problems.append(f"vercel.json: {src} does not rewrite to a gateway origin")
        if ".fps.goog" not in rewrites.get(f"{src}/:path*", ""):
            problems.append(f"vercel.json: no {src}/:path* rule, so the hits 404")

    # 8. one host: www and the production *.vercel.app alias 308 to the apex,
    #    with an explicit "/" rule because "/:path*" does not match the bare root
    redirects = vercel.get("redirects", [])
    for host in ("www.adgent.app", "adgent-website.vercel.app"):
        covered = {r.get("source") for r in redirects
                   if r.get("destination", "").startswith(BASE + "/")
                   and any(h.get("type") == "host" and h.get("value") == host
                           for h in r.get("has", []))}
        for source in ("/", "/:path*"):
            if source not in covered:
                problems.append(f"vercel.json: no {host} -> apex redirect for {source!r}")

    # 11. response headers with no behavioural cost (no CSP: see live build.py)
    want_headers = {"X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
                    "Permissions-Policy"}
    have = {h["key"] for rule in vercel.get("headers", []) if rule.get("source") == "/(.*)"
            for h in rule.get("headers", [])}
    for missing in sorted(want_headers - have):
        problems.append(f"vercel.json: no site-wide {missing} header")

    # 12. every live URL answers on v2: a page, or a permanent redirect to one;
    #     no redirect shadows a page or lands on a missing one
    plain = {r["source"]: r for r in redirects if not r.get("has")}
    exists = lambda p: ("index" if p == "/" else p.strip("/")) in page_slugs
    for src, r in plain.items():
        dest = r.get("destination", "").split("#", 1)[0]
        if not r.get("permanent"):
            problems.append(f"vercel.json: redirect {src} is not permanent")
        if not dest.startswith("/") or not exists(dest):
            problems.append(f"vercel.json: redirect {src} -> {dest}, which has no page")
        if ":" not in src and exists(src):
            problems.append(f"vercel.json: redirect {src} shadows an existing page")
    for url in LIVE_URLS:
        if not exists(url) and url not in plain:
            problems.append(f"live URL {url} has neither a v2 page nor a redirect")

    # 15. the crawler gate is open in production, and points at the sitemap
    robots = read(os.path.join(ROOT, "robots.txt")) if os.path.exists(os.path.join(ROOT, "robots.txt")) else ""
    if re.search(r"^\s*Disallow:\s*/\s*$", robots, re.M) or "Sitemap: %s/sitemap.xml" % BASE not in robots:
        problems.append("robots.txt: not the production version (Disallow: / or no Sitemap line)")
    return problems


# ------------------------------------------------------------ main
def generated(rendered, persist):
    return {
        "sitemap.xml": sitemap_xml(rendered, persist),
        "feed.xml": feed_xml(rendered),
        "llms.txt": llms_txt(rendered),
        "llms-full.txt": llms_full_txt(rendered),
    }


def card_drift(rendered):
    """Page cards whose headline no longer matches the page's H1. Not a failure
    (the old card is still a valid image); a note that it should be re-rendered."""
    out = []
    for slug, c in cards().items():
        if c.get("kind") != "page" or c.get("fixed") or slug not in rendered:
            continue
        m = re.search(r"<h1\b[^>]*>(.*?)</h1>", main_of(rendered[slug]), re.S)
        if m and text_of(m.group(1)) != c.get("title"):
            out.append(slug)
    return out


def main():
    check = "--check" in sys.argv
    rc = stamp_site_js(check_only=check)
    stale, built, rendered = [], 0, {}
    for p in pages():
        out = render(p)
        rendered[slug_of(p)] = out
        if out != read(p):
            stale.append(os.path.relpath(p, ROOT))
            if not check:
                write(p, out)
                built += 1
    for name, text in generated(rendered, persist=not check).items():
        path = os.path.join(ROOT, name)
        cur = read(path) if os.path.exists(path) else ""
        if cur != text:
            if check:
                print("STALE: %s (run python3 build.py)" % name)
                rc = 1
            else:
                write(path, text)
    if check:
        if stale:
            print("STALE: " + ", ".join(stale))
            rc = 1
        else:
            print("OK  pages in sync with _partials/ and their generated heads (%d)" % len(rendered))
    else:
        print("OK  rebuilt %d of %d pages; sitemap %d urls, feed %d items"
              % (built, len(rendered), len(public(rendered)), len(articles(rendered))))
    bad = audit(rendered)
    if bad:
        print("AUDIT PROBLEMS: %d" % len(bad))
        for b in bad:
            print("    " + b)
        rc = 1
    elif rc == 0:
        print("OK  audit clean: heads, cards, structured data, redirects, measurement wiring")
    drift = card_drift(rendered)
    if drift:
        print("NOTE  re-render the OG card (H1 changed): " + ", ".join(drift))
    return rc


if __name__ == "__main__":
    sys.exit(main())
