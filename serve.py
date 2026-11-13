#!/usr/bin/env python3
"""Local preview with clean URLs; chrome rendered at request time.

    python3 serve.py [port]      # default 8900

`/pricing` serves `pricing.html`, `/_kit` serves the component kit. Every HTML
page goes through `build.render()` in memory, so the header, drawer and footer
are always current without running build.py (which rewrites the files on disk).
Local only; this file never runs anywhere but a laptop.
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import build

ROOT = build.ROOT


class Handler(SimpleHTTPRequestHandler):
    extensions_map = dict(SimpleHTTPRequestHandler.extensions_map, **{
        ".woff2": "font/woff2", ".mp4": "video/mp4", ".webm": "video/webm",
        ".webp": "image/webp", ".avif": "image/avif", ".svg": "image/svg+xml",
        ".json": "application/json", ".js": "text/javascript",
    })

    def translate_path(self, path):
        p = super().translate_path(path)
        if os.path.isdir(p):
            idx = os.path.join(p, "index.html")
            if os.path.exists(idx):
                return idx
        if not os.path.exists(p) and not os.path.splitext(p)[1]:
            html = p + ".html"
            if os.path.exists(html):
                return html
        return p

    def _html(self, path, code=200):
        body = build.render(path).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _serve(self):
        path = self.translate_path(self.path)
        if path.endswith(".html") and os.path.isfile(path):
            self._html(path)
            return True
        if not os.path.exists(path):
            nf = os.path.join(ROOT, "404.html")
            if os.path.exists(nf):
                self._html(nf, 404)
                return True
        return False

    def do_GET(self):
        if not self._serve():
            super().do_GET()

    def do_HEAD(self):
        if not self._serve():
            super().do_HEAD()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8900
    handler = partial(Handler, directory=ROOT)
    srv = ThreadingHTTPServer(("127.0.0.1", port), handler)
    print("serving %s on http://127.0.0.1:%d" % (ROOT, port))
    srv.serve_forever()


if __name__ == "__main__":
    main()
