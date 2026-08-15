#!/usr/bin/env python3
"""
newpage.py — scaffold a page with the shared <head> instead of copy-pasting it.

The <head> is ~7.5KB per page and 5.2KB of that (the JSON-LD graph) is identical
everywhere. Hand-copying it is how the footer ended up in 18 variants; this keeps
the six per-page fields as the only thing anyone types.

    python3 newpage.py <slug> "<title>" "<description>"

Writes <slug>.html with header/mobile/footer markers already in place, so
build.py fills them on the next run. Refuses to overwrite an existing page.
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
TEMPLATE = os.path.join(ROOT, "for-agencies.html")   # any built page works as the head donor

read = lambda p: io.open(p, encoding="utf-8").read()


def head_for(slug, title, desc):
    """Take the donor page's head and swap the six fields that are per-page."""
    head = read(TEMPLATE).split("</head>", 1)[0]
    url = "https://adgent.app/" if slug == "index" else f"https://adgent.app/{slug}"
    t, d = (s.replace("&", "&amp;").replace('"', "&quot;") for s in (title, desc))
    subs = [
        (r"<title>.*?</title>", f"<title>{t}</title>"),
        (r'<meta name="description" content=".*?"/>', f'<meta name="description" content="{d}"/>'),
        (r'<link rel="canonical" href=".*?"/>', f'<link rel="canonical" href="{url}"/>'),
        (r'<meta property="og:title" content=".*?"/>', f'<meta property="og:title" content="{t}"/>'),
        (r'<meta property="og:description" content=".*?"/>',
         f'<meta property="og:description" content="{d}"/>'),
        (r'<meta property="og:url" content=".*?"/>', f'<meta property="og:url" content="{url}"/>'),
    ]
    for pat, rep in subs:
        head, n = re.subn(pat, lambda _: rep, head, count=1, flags=re.S)
        if not n:
            raise SystemExit(f"template lost its {pat!r} — fix newpage.py before scaffolding")
    return head


def scaffold(slug, title, desc, body=""):
    path = os.path.join(ROOT, f"{slug}.html")
    if os.path.exists(path):
        raise SystemExit(f"{slug}.html already exists — edit it, don't scaffold over it")
    html = (head_for(slug, title, desc) + "</head>\n<body>\n"
            '<!-- Google Tag Manager (noscript) -->\n'
            '<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MWR4PVRF"\n'
            'height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>\n'
            '<!-- End Google Tag Manager (noscript) -->\n\n'
            "<!--#header--><!--/#header-->\n<!--#mobile--><!--/#mobile-->\n\n"
            + body +
            "\n<!--#footer--><!--/#footer-->\n"
            '<script src="/site.js"></script>\n</body>\n</html>\n')
    io.open(path, "w", encoding="utf-8").write(html)
    print(f"wrote {slug}.html — now run build.py")
    return path


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit(__doc__)
    scaffold(sys.argv[1], sys.argv[2], sys.argv[3])
